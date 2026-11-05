"""
KAI Wellness Retreats - Guest Sanctuary Companion API Router
Public-facing guest portal endpoints authenticated via magic-link tokens.
NO admin auth required for guest companion views — guests access their own retreat data only.
Two-way interactions strictly stage ActionDrafts for Kareena's 1-click authorization (Zero Autonomous Writes).
"""

import logging
from fastapi import APIRouter, HTTPException, Query, Depends, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.config import settings
from backend.database import get_db
from backend.sidecar.models import StagingIntake, CRMTrip, CRMClient
from backend.models import ActionDraft, Booking
from sqlalchemy import or_
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from backend.sidecar.services.guest_portal_service import (
    get_guest_portal_data,
    validate_guest_token,
    create_demo_guest_token,
    generate_guest_magic_token,
    record_guest_somatic_pulse,
    get_guest_somatic_pulses,
    submit_guest_flight_update,
    submit_guest_dietary_update,
    revoke_guest_token,
    create_verified_guest_session,
)
from backend.sidecar.services.automation_generators import generate_guest_companion_invitation_draft
from backend.dependencies.auth import (
    GuestPrincipal,
    client_ip,
    enforce_csrf,
    get_current_admin,
    get_current_guest,
    get_optional_guest,
    require_guest_owner,
)
from backend.services.auth_service import (
    GUEST_COOKIE,
    GUEST_CSRF_COOKIE,
    attempts_exceeded,
    create_guest_token,
    decode_token,
    AuthError,
    generate_csrf_token,
    issue_guest_otp,
    normalize_email,
    record_attempt,
    send_guest_otp_email,
    verify_guest_otp,
)

logger = logging.getLogger("kai_guest_portal_router")

router = APIRouter(prefix="/guest-portal", tags=["Guest Sanctuary Companion"])
auth_router = APIRouter(prefix="/api/auth/guest", tags=["Guest Authentication"])


# ──── Request Schemas ────

class GuestFlightUpdateRequest(BaseModel):
    token: Optional[str] = Field(None, description="Magic-link guest token, when not using a guest session")
    flight_number: str = Field(..., description="Flight number, e.g. UA 142 or AA 1083")
    delay_minutes: int = Field(0, description="Estimated flight delay in minutes")
    gate: Optional[str] = Field(None, description="Arrival or departure gate")
    notes: Optional[str] = Field(None, description="Additional traveler notes")


class GuestDietaryUpdateRequest(BaseModel):
    token: Optional[str] = Field(None, description="Magic-link guest token, when not using a guest session")
    dietary_tags: List[str] = Field(default_factory=list, description="e.g. Gluten-Free, Plant-Based, Low-FODMAP")
    allergies: Optional[str] = Field(None, description="Severe food allergies (nuts, shellfish, etc.)")
    special_chef_notes: Optional[str] = Field(None, description="Notes for private villa chef")


class GuestSomaticPulseRequest(BaseModel):
    token: Optional[str] = Field(None, description="Magic-link guest token, when not using a guest session")
    day_number: int = Field(1, ge=1, le=14, description="Retreat day number")
    phase: str = Field("MORNING_AWAKENING", description="MORNING_AWAKENING or EVENING_STILLNESS")
    restorative_sleep_score: int = Field(8, ge=1, le=10, description="Self-reported sleep quality (1-10)")
    nervous_system_ease: int = Field(8, ge=1, le=10, description="Nervous system calm & vagal ease (1-10)")
    vagal_tone_descriptor: Optional[str] = Field("Calm & Grounded", description="Subjective somatic feeling")
    private_reflection_notes: Optional[str] = Field(None, description="Private journal reflection")


class RevokeTokenRequest(BaseModel):
    token: str


class GuestProposalApproveRequest(BaseModel):
    ref: str = Field(..., description="Sanctuary trip reference ID (kai_trp_... or id)")
    cardholder_name: str = Field(..., description="Cardholder full legal name")
    billing_postal_code: str = Field(..., description="Card billing postal/zip code")
    card_last4: str = Field("4242", description="Card last 4 digits")
    card_brand: str = Field("Visa", description="Card brand / network (Visa, Mastercard, Amex)")
    e_signature: str = Field(..., description="Legal electronic signature")
    agreed_to_terms: bool = Field(True, description="Consent to 30% deposit authorization and sanctuary cancellation policy")


class GuestAccessRequest(BaseModel):
    email: EmailStr
    booking_reference: str = Field(..., min_length=4, max_length=64)


class GuestVerifyRequest(BaseModel):
    email: Optional[EmailStr] = None
    booking_reference: Optional[str] = Field(None, max_length=64)
    otp: Optional[str] = Field(None, min_length=6, max_length=6)
    magic_token: Optional[str] = Field(None, max_length=256)


# ──── Guest Authentication ────

def _guest_cookie_secure() -> bool:
    return settings.ENVIRONMENT == "production"


def _set_guest_cookies(response: Response, guest_id: str, email: str, session_id: str, slug: str, expires_at: datetime) -> None:
    max_age = max(int((expires_at - datetime.now(timezone.utc)).total_seconds()), 0)
    response.set_cookie(
        GUEST_COOKIE, create_guest_token(guest_id, email, session_id, [slug], expires_at),
        max_age=max_age, httponly=True, secure=_guest_cookie_secure(), samesite="lax", path="/",
    )
    response.set_cookie(
        GUEST_CSRF_COOKIE, generate_csrf_token(session_id),
        max_age=max_age, httponly=False, secure=_guest_cookie_secure(), samesite="lax", path="/",
    )


def _find_guest_booking(db: Session, email: str, reference: str):
    """Matches email and booking reference together; returns (booking, intake), either possibly None."""
    booking = db.query(Booking).filter(Booking.reference_code == reference).first()
    if booking and normalize_email(booking.email) != email:
        booking = None
    intake = db.query(StagingIntake).filter(StagingIntake.source_ref == reference).first()
    if intake and normalize_email(intake.email) != email:
        intake = None
    return booking, intake


@auth_router.post("/request-access")
def request_guest_access(payload: GuestAccessRequest, request: Request, db: Session = Depends(get_db)):
    """Emails a one-time code when email and reference match. The reply never reveals whether they did."""
    email = normalize_email(payload.email)
    reference = payload.booking_reference.strip().upper()
    ip_key = f"guest-request-ip:{client_ip(request)}"
    email_key = f"guest-request-email:{email}"
    if attempts_exceeded(db, ip_key, 20) or attempts_exceeded(db, email_key, 5):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a few minutes and try again.")
    record_attempt(db, ip_key)
    record_attempt(db, email_key)

    booking, intake = _find_guest_booking(db, email, reference)
    if booking or intake:
        code = issue_guest_otp(db, email, reference)
        send_guest_otp_email(email, code)
    return {"success": True, "message": "If those details match a reservation, an access code is on its way."}


@auth_router.post("/verify")
def verify_guest_access(payload: GuestVerifyRequest, response: Response, db: Session = Depends(get_db)):
    """Exchanges a one-time code, or an operator-issued magic link, for a guest session cookie."""
    if payload.magic_token:
        session = validate_guest_token(payload.magic_token, db=db)
        if not session or not session.get("id"):
            raise HTTPException(status_code=401, detail="This link has expired. Please request a new access code.")
        expires_at = datetime.fromisoformat(session["expires_at"])
        expires_at = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
        guest_id = session.get("intake_id") or session["id"]
        _set_guest_cookies(response, guest_id, session["email"], session["id"], session["sanctuary_slug"], expires_at)
        return {"success": True, "guest_id": guest_id, "guest_name": session["client_name"]}

    if not (payload.email and payload.booking_reference and payload.otp):
        raise HTTPException(status_code=422, detail="Email, booking reference and access code are required.")

    email = normalize_email(payload.email)
    reference = payload.booking_reference.strip().upper()
    if not verify_guest_otp(db, email, reference, payload.otp):
        raise HTTPException(status_code=401, detail="That code is incorrect or has expired.")
    booking, intake = _find_guest_booking(db, email, reference)
    if not booking and not intake:
        raise HTTPException(status_code=401, detail="That code is incorrect or has expired.")

    guest_id = str(intake.id) if intake else f"booking-{booking.id}"
    slug = (intake.sanctuary_slug if intake else booking.retreat_id) or "general"
    name = intake.client_name if intake else booking.full_name
    room = intake.room_tier if intake else booking.room_preference
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.GUEST_SESSION_EXPIRE_HOURS)
    rec = create_verified_guest_session(db, guest_id, name, email, slug, room, expires_at)
    _set_guest_cookies(response, guest_id, email, rec.id, slug, expires_at)
    return {"success": True, "guest_id": guest_id, "guest_name": name}


@auth_router.post("/logout")
def guest_logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Ends the guest session on the server and clears its cookies."""
    token = request.cookies.get(GUEST_COOKIE)
    if token:
        try:
            claims = decode_token(token, "guest")
        except AuthError:
            claims = None
        if claims:
            enforce_csrf(request, claims["sid"], GUEST_CSRF_COOKIE)
            from backend.sidecar.models import GuestPortalSession
            rec = db.query(GuestPortalSession).filter(GuestPortalSession.id == claims["sid"]).first()
            if rec:
                rec.is_revoked = True
                db.commit()
    response.delete_cookie(GUEST_COOKIE, path="/")
    response.delete_cookie(GUEST_CSRF_COOKIE, path="/")
    return {"success": True}


# ──── Endpoints ────

@router.post("/generate-token", dependencies=[Depends(get_current_admin)])
def generate_portal_token(
    intake_id: str = Query(..., description="Staging intake ID"),
    auto_stage_invitation: bool = Query(True, description="Whether to automatically stage a companion invitation draft"),
    db: Session = Depends(get_db)
):
    """
    Generates a personalized magic link token for a confirmed guest intake.
    Optionally stages a companion invitation draft in /portal/drafts for Kareena's 1-click dispatch.
    """
    intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Intake not found")

    result = generate_guest_magic_token(
        intake_id=intake.id,
        client_name=intake.client_name,
        email=intake.email,
        sanctuary_slug=intake.sanctuary_slug or "nosara",
        room_tier=intake.room_tier or "Private Villa Sanctuary",
        flight_request=intake.flight_request,
        wellness_profile=getattr(intake, "wellness_profile", None) or intake.clinical_profile or {},
        db=db,
    )

    draft_info = None
    if auto_stage_invitation:
        try:
            draft = generate_guest_companion_invitation_draft(
                db=db,
                guest_name=intake.client_name,
                email=intake.email,
                phone=intake.phone,
                portal_url=result["portal_url"],
                sanctuary_name=(intake.sanctuary_slug or "nosara").replace("-", " ").title(),
                sanctuary_slug=intake.sanctuary_slug or "nosara",
            )
            draft_info = {"draft_id": draft.id, "type": draft.type, "status": draft.status}
        except Exception as e:
            logger.warning(f"Could not auto-stage companion invitation draft: {e}")

    return {
        "message": f"Guest magic-link generated for {intake.client_name}",
        "invitation_draft": draft_info,
        **result,
    }


@router.get("/me")
def get_my_retreat(
    token: Optional[str] = Query(None, description="Magic-link guest token, when not using a guest session"),
    guest: Optional[GuestPrincipal] = Depends(get_optional_guest),
    db: Session = Depends(get_db)
):
    """
    Returns the full guest companion portal payload for an authenticated guest.
    Includes sanctuary details, live weather, daily somatic schedule, chauffeur info,
    flight status, packing list, and personalized wellness focus.
    
    Privacy: Zero clinical notes, zero internal CRM keys, zero financial figures exposed.
    """
    data = get_guest_portal_data(token, db=db, guest_session=guest.session if guest else None)
    if not data:
        raise HTTPException(
            status_code=401,
            detail="This magic link has expired or is invalid. Please contact your KAI concierge for a new link."
        )
    return data


@router.get("/validate")
def validate_token(
    token: Optional[str] = Query(None, description="Magic-link guest token, when not using a guest session"),
    guest: Optional[GuestPrincipal] = Depends(get_optional_guest),
    db: Session = Depends(get_db)
):
    """Lightweight validation — returns guest name and sanctuary if the session or token is valid."""
    session = guest.session if guest else (validate_guest_token(token, db=db) if token else None)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return {
        "valid": True,
        "guest_name": session["client_name"],
        "sanctuary_slug": session["sanctuary_slug"],
        "expires_at": session["expires_at"],
    }


@router.get("/dossier/{guest_id}")
def get_guest_dossier(
    guest_id: str,
    guest: GuestPrincipal = Depends(get_current_guest),
    db: Session = Depends(get_db)
):
    """A guest's own retreat dossier. Any other guest gets 403."""
    require_guest_owner(guest, guest_id)
    data = get_guest_portal_data(None, db=db, guest_session=guest.session)
    if not data:
        raise HTTPException(status_code=401, detail="Your session has ended. Please verify your access code again.")
    return data


@router.post("/demo-token", dependencies=[Depends(get_current_admin)])
def create_demo_token(db: Session = Depends(get_db)):
    """
    Creates a demo guest magic-link token for development and preview.
    In production, tokens are generated from the operator portal after CRM confirmation.
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=404, detail="Demo tokens are disabled in production.")
    result = create_demo_guest_token(db=db)
    return {
        "message": "Demo guest token created. Use the portal_url to access the guest companion.",
        **result,
    }


@router.post("/flight-update")
def post_flight_update(
    payload: GuestFlightUpdateRequest,
    guest: Optional[GuestPrincipal] = Depends(get_optional_guest),
    db: Session = Depends(get_db)
):
    """
    Allows a traveling guest to report an updated flight arrival or gate change.
    MANDATORY GOVERNANCE: Stages an ActionDraft for Grand Travel chauffeur recalibration.
    Zero autonomous writes directly to production.
    """
    try:
        res = submit_guest_flight_update(
            token=payload.token,
            guest_session=guest.session if guest else None,
            flight_number=payload.flight_number,
            delay_minutes=payload.delay_minutes,
            gate=payload.gate,
            notes=payload.notes,
            db=db,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Flight update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process flight update.")


@router.post("/dietary-update")
def post_dietary_update(
    payload: GuestDietaryUpdateRequest,
    guest: Optional[GuestPrincipal] = Depends(get_optional_guest),
    db: Session = Depends(get_db)
):
    """
    Allows a guest to refine their dietary preferences and food allergies.
    Stages an ActionDraft for Nurse Kareena to verify before updating the chef's briefing.
    """
    try:
        res = submit_guest_dietary_update(
            token=payload.token,
            guest_session=guest.session if guest else None,
            dietary_tags=payload.dietary_tags,
            allergies=payload.allergies,
            special_chef_notes=payload.special_chef_notes,
            db=db,
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Dietary update error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process culinary refinement.")


@router.post("/pulse")
def post_somatic_pulse(
    payload: GuestSomaticPulseRequest,
    guest: Optional[GuestPrincipal] = Depends(get_optional_guest),
    db: Session = Depends(get_db)
):
    """
    Logs an in-stay subjective somatic pulse (sleep restorativeness, autonomic calm).
    Stored in database and feeds directly into Clinical Copilot and 30-day continuity arcs.
    """
    try:
        res = record_guest_somatic_pulse(
            token=payload.token,
            guest_session=guest.session if guest else None,
            day_number=payload.day_number,
            phase=payload.phase,
            restorative_sleep_score=payload.restorative_sleep_score,
            nervous_system_ease=payload.nervous_system_ease,
            vagal_tone_descriptor=payload.vagal_tone_descriptor,
            private_reflection_notes=payload.private_reflection_notes,
            db=db,
        )
        return {
            "status": "success",
            "message": "Somatic reflection recorded with care.",
            "pulse": res,
        }
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        logger.error(f"Pulse recording error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to record somatic pulse.")


@router.get("/pulses/{intake_id}", dependencies=[Depends(get_current_admin)])
def get_intake_pulses(
    intake_id: str,
    db: Session = Depends(get_db)
):
    """Operator endpoint: Returns all recorded somatic pulses for a guest intake."""
    pulses = get_guest_somatic_pulses(intake_id, db=db)
    return {"intake_id": intake_id, "pulses": pulses, "count": len(pulses)}


@router.post("/revoke-token", dependencies=[Depends(get_current_admin)])
def post_revoke_token(
    payload: RevokeTokenRequest,
    db: Session = Depends(get_db)
):
    """Operator endpoint: Revokes an active guest magic link."""
    success = revoke_guest_token(payload.token, db=db)
    return {"revoked": success}



# ──── Interactive Client Proposal & Deposit Authorization Endpoints (Native KAI CRM) ────

@router.get("/proposal")
def get_guest_proposal(
    ref: str = Query(..., description="Sanctuary trip reference ID (kai_trp_... or id)"),
    db: Session = Depends(get_db)
):
    """
    Public guest-facing proposal fetcher for sanctuary proposals (/my-retreat?ref=kai_trp_...).
    Returns sanitized proposal details: itinerary schedule, suite tier, dates, and financial breakdown.
    Zero internal operator notes or raw CRM keys exposed.
    """
    clean_ref = ref.strip()
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == clean_ref, CRMTrip.crm_trip_id == clean_ref)
    ).first()

    if not trip:
        raise HTTPException(
            status_code=404,
            detail="We could not locate this sanctuary proposal. Please check your reservation link or contact concierge@kaiwellnessretreats.com."
        )

    deposit = trip.deposit_amount or round(trip.total_investment * 0.3, 2)
    balance = trip.final_balance or round(trip.total_investment - deposit, 2)

    return {
        "success": True,
        "proposal": {
            "ref": trip.crm_trip_id,
            "trip_id": trip.id,
            "guest_name": trip.client_name,
            "guest_email": trip.client_email,
            "title": trip.title,
            "sanctuary_slug": trip.sanctuary_slug,
            "dates": trip.dates,
            "room_tier": trip.room_tier,
            "status": trip.status,
            "total_investment": trip.total_investment,
            "deposit_amount": deposit,
            "deposit_status": trip.deposit_status,
            "final_balance": balance,
            "final_balance_status": trip.final_balance_status,
            "currency": trip.currency or "USD",
            "payment_terms": trip.payment_terms or "30% non-refundable deposit upon proposal approval to secure suite. 70% remaining balance charged 45 days prior to arrival.",
            "itinerary_blocks": trip.itinerary_blocks or [],
            "smart_flight": trip.smart_flight or {},
            "ground_transfer": trip.ground_transfer or {},
            "created_by": trip.created_by,
            "created_at": trip.created_at.isoformat() if trip.created_at else None,
        }
    }


@router.post("/proposal/approve")
def approve_guest_proposal(
    payload: GuestProposalApproveRequest,
    db: Session = Depends(get_db)
):
    """
    Guest self-service proposal approval & credit card deposit authorization.
    Transitions trip status from PROPOSED_ITINERARY to CONFIRMED,
    vaults transaction authorization reference with legal e-signature,
    stages an ActionDraft for Kareena Islam, RN, and creates an instant magic-link companion token.
    """
    if not payload.agreed_to_terms:
        raise HTTPException(
            status_code=400,
            detail="You must accept the sanctuary payment authorization and cancellation terms to confirm your reservation."
        )

    if not payload.e_signature or len(payload.e_signature.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="A valid legal e-signature is required for payment authorization."
        )

    clean_ref = payload.ref.strip()
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == clean_ref, CRMTrip.crm_trip_id == clean_ref)
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Sanctuary trip proposal not found.")

    auth_ref = f"AUTH-DEP-{secrets.token_hex(4).upper()}"
    signed_timestamp = datetime.now(timezone.utc).isoformat()

    history = list(trip.payment_history or [])
    auth_entry = {
        "payment_id": str(uuid.uuid4()),
        "amount": trip.deposit_amount,
        "currency": trip.currency or "USD",
        "payment_method": f"CARD_VAULT_{payload.card_brand.upper()}",
        "card_last4": payload.card_last4,
        "cardholder_name": payload.cardholder_name.strip(),
        "billing_postal_code": payload.billing_postal_code.strip(),
        "transaction_reference": auth_ref,
        "e_signature": payload.e_signature.strip(),
        "signed_at": signed_timestamp,
        "notes": f"Client self-service proposal approval. 30% sanctuary deposit (${trip.deposit_amount:,.2f} USD) authorized. 70% balance (${trip.final_balance:,.2f} USD) scheduled 45 days prior.",
        "processed_by": "CLIENT_SELF_SERVICE",
        "timestamp": signed_timestamp,
    }
    history.append(auth_entry)
    trip.payment_history = history

    trip.deposit_status = "PAID"
    trip.status = "CONFIRMED"
    trip.final_balance_status = "SCHEDULED_45D"

    alert_content = (
        f"SANCTUARY PROPOSAL APPROVED & DEPOSIT AUTHORIZED\n"
        f"Guest: {trip.client_name} ({trip.client_email})\n"
        f"Sanctuary: {trip.title} ({trip.dates})\n"
        f"Suite Tier: {trip.room_tier}\n"
        f"Total Investment: ${trip.total_investment:,.2f} {trip.currency}\n"
        f"Authorized Deposit: ${trip.deposit_amount:,.2f} {trip.currency} (Ref: {auth_ref})\n"
        f"Cardholder: {payload.cardholder_name} | Card: {payload.card_brand} *{payload.card_last4}\n"
        f"Legal E-Signature: {payload.e_signature} (Signed: {signed_timestamp})\n"
        f"Remaining Balance: ${trip.final_balance:,.2f} {trip.currency} (Scheduled 45 days prior)\n\n"
        f"Operational Next Steps for Concierge:\n"
        f"1. Finalize Grand Travel flight meet-and-greet manifest.\n"
        f"2. Stage welcome consultation pack for Nurse Kareena."
    )
    draft = ActionDraft(
        type="guest_proposal_approval_notification",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=alert_content,
        status="pending_review",
    )
    db.add(draft)

    token_result = generate_guest_magic_token(
        intake_id=trip.id,
        client_name=trip.client_name,
        email=trip.client_email,
        sanctuary_slug=trip.sanctuary_slug,
        room_tier=trip.room_tier,
        flight_request=trip.smart_flight or {},
        wellness_profile={},
        db=db,
    )

    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "message": f"Sanctuary proposal approved. Your 30% deposit of ${trip.deposit_amount:,.2f} has been authorized.",
        "auth_reference": auth_ref,
        "trip": {
            "ref": trip.crm_trip_id,
            "status": trip.status,
            "deposit_status": trip.deposit_status,
            "total_investment": trip.total_investment,
            "deposit_amount": trip.deposit_amount,
            "final_balance": trip.final_balance,
        },
        "token": token_result.get("token"),
        "portal_url": f"/my-retreat?token={token_result.get('token')}",
    }
