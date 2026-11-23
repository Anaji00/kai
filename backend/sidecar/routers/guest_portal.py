"""
KAI Wellness Retreats - Guest Sanctuary Companion API Router
Public-facing guest portal endpoints authenticated via magic-link tokens.
NO admin auth required for guest companion views — guests access their own retreat data only.
Two-way interactions strictly stage ActionDrafts for Kareena's 1-click authorization (Zero Autonomous Writes).
"""

import logging
import math
from fastapi import APIRouter, HTTPException, Query, Depends, Request, Response
from pydantic import BaseModel, EmailStr, Field, field_validator
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
    flight_number: str = Field(..., min_length=2, max_length=64, description="Flight number, e.g. UA 142 or AA 1083")
    delay_minutes: int = Field(0, ge=0, le=1440, description="Estimated flight delay in minutes (0-1440)")
    gate: Optional[str] = Field(None, max_length=32, description="Arrival or departure gate")
    notes: Optional[str] = Field(None, max_length=1000, description="Additional traveler notes")

    @field_validator("flight_number")
    @classmethod
    def validate_flight_number(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Please provide a valid flight number.")
        return cleaned


class GuestDietaryUpdateRequest(BaseModel):
    token: Optional[str] = Field(None, description="Magic-link guest token, when not using a guest session")
    dietary_tags: List[str] = Field(default_factory=list, max_length=30, description="e.g. Gluten-Free, Plant-Based, Low-FODMAP")
    allergies: Optional[str] = Field(None, max_length=500, description="Severe food allergies (nuts, shellfish, etc.)")
    special_chef_notes: Optional[str] = Field(None, max_length=1000, description="Notes for private villa chef")


class GuestSomaticPulseRequest(BaseModel):
    token: Optional[str] = Field(None, description="Magic-link guest token, when not using a guest session")
    day_number: int = Field(1, ge=1, le=14, description="Retreat day number")
    phase: str = Field("MORNING_AWAKENING", description="MORNING_AWAKENING or EVENING_STILLNESS")
    restorative_sleep_score: int = Field(8, ge=1, le=10, description="Self-reported sleep quality (1-10)")
    nervous_system_ease: int = Field(8, ge=1, le=10, description="Nervous system calm & vagal ease (1-10)")
    vagal_tone_descriptor: Optional[str] = Field("Calm & Grounded", max_length=200, description="Subjective somatic feeling")
    private_reflection_notes: Optional[str] = Field(None, max_length=2000, description="Private journal reflection")

    @field_validator("phase")
    @classmethod
    def validate_phase(cls, v: str) -> str:
        norm = v.strip().upper()
        if norm not in ("MORNING_AWAKENING", "EVENING_STILLNESS"):
            raise ValueError("Phase must be MORNING_AWAKENING or EVENING_STILLNESS.")
        return norm


class RevokeTokenRequest(BaseModel):
    token: str


class GuestProposalApproveRequest(BaseModel):
    ref: str = Field(..., description="Sanctuary trip reference ID (kai_trp_... or id)")
    guest_email: EmailStr = Field(..., description="Email on the reservation to verify guest identity")
    payment_preference: str = Field(
        "VAX_HOST_AGENCY_CALL",
        description="Preferred offline settlement method: VAX_HOST_AGENCY_CALL, BANK_WIRE_ACH, or CORPORATE_WIRE",
    )
    e_signature: str = Field(..., description="Legal electronic signature")
    agreed_to_terms: bool = Field(True, description="Consent to sanctuary booking terms and cancellation policy")
    selected_room_tier: Optional[str] = Field(None, description="Optional self-service suite tier selected by guest")
    custom_total_investment: Optional[float] = Field(None, description="Updated total investment if suite tier upgraded")
    flight_number: Optional[str] = Field(None, max_length=64, description="Optional arrival flight number for check-in")
    origin_airport: Optional[str] = Field(None, max_length=16, description="Optional departure airport code")
    dietary_notes: Optional[str] = Field(None, max_length=500, description="Optional dietary preferences or allergies")
    # Legacy optional fields kept for backwards compatibility; never used to charge or vault cards
    cardholder_name: Optional[str] = None
    billing_postal_code: Optional[str] = None
    card_last4: Optional[str] = None
    card_brand: Optional[str] = None


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
    """Matches email and booking/proposal reference together; returns (booking, intake, crm_trip)."""
    raw_ref = reference.strip()
    upper_ref = raw_ref.upper()
    lower_ref = raw_ref.lower()

    booking = db.query(Booking).filter(
        or_(Booking.reference_code == upper_ref, Booking.reference_code == raw_ref)
    ).first()
    if booking and normalize_email(booking.email) != email:
        booking = None

    intake = db.query(StagingIntake).filter(
        or_(StagingIntake.source_ref == upper_ref, StagingIntake.source_ref == raw_ref)
    ).first()
    if intake and normalize_email(intake.email) != email:
        intake = None

    crm_trip = db.query(CRMTrip).filter(
        or_(
            CRMTrip.crm_trip_id == raw_ref,
            CRMTrip.crm_trip_id == lower_ref,
            CRMTrip.id == raw_ref,
            CRMTrip.id == lower_ref,
        )
    ).first()
    if crm_trip and normalize_email(crm_trip.client_email or "") != email:
        crm_trip = None

    return booking, intake, crm_trip


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

    booking, intake, crm_trip = _find_guest_booking(db, email, payload.booking_reference)
    if booking or intake or crm_trip:
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
    booking, intake, crm_trip = _find_guest_booking(db, email, payload.booking_reference)
    if not booking and not intake and not crm_trip:
        raise HTTPException(status_code=401, detail="That code is incorrect or has expired.")

    if intake:
        guest_id = str(intake.id)
        slug = intake.sanctuary_slug or "general"
        name = intake.client_name
        room = intake.room_tier
    elif crm_trip:
        guest_id = str(crm_trip.id)
        slug = crm_trip.sanctuary_slug or "general"
        name = crm_trip.client_name
        room = crm_trip.room_tier
    else:
        guest_id = f"booking-{booking.id}"
        slug = booking.retreat_id or "general"
        name = booking.full_name
        room = booking.room_preference
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


def _mask_email(email: Optional[str]) -> str:
    """Masks an email address for public proposal display so ownership checks cannot be scraped from GET /proposal."""
    raw = (email or "").strip()
    if "@" not in raw:
        return ""
    local, domain = raw.split("@", 1)
    if len(local) <= 2:
        masked_local = local[0] + "*" * max(1, len(local) - 1) if local else "*"
    else:
        masked_local = local[0] + "***" + local[-1]
    return f"{masked_local}@{domain}"


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

    # Tern CRM Parity: Log proposal view milestone to the trip's living timeline
    now_iso = datetime.now(timezone.utc).isoformat()
    timeline = list(trip.activity_timeline or [])
    last_view = next((item for item in reversed(timeline) if item.get("event") == "PROPOSAL_VIEWED"), None)
    should_log_view = True
    if last_view and "timestamp" in last_view:
        try:
            last_ts = datetime.fromisoformat(last_view["timestamp"])
            if (datetime.now(timezone.utc) - last_ts).total_seconds() < 600:
                should_log_view = False
        except Exception:
            pass
    if should_log_view:
        timeline.append({
            "event": "PROPOSAL_VIEWED",
            "title": "Guest Opened Sanctuary Proposal",
            "description": f"Proposal {trip.crm_trip_id} opened via secure web link.",
            "timestamp": now_iso,
            "badge": "Viewed",
            "actor": "GUEST"
        })
        trip.activity_timeline = timeline
        try:
            db.commit()
        except Exception:
            db.rollback()

    return {
        "success": True,
        "proposal": {
            "ref": trip.crm_trip_id,
            "trip_id": trip.id,
            "guest_name": trip.client_name,
            "guest_email": _mask_email(trip.client_email),
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
            "activity_timeline": trip.activity_timeline or [],
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
    Guest self-service proposal acceptance, suite confirmation, waiver e-signature,
    and optional arrival check-in (flight & dietary details).

    OFFLINE VAX / WIRE SETTLEMENT GOVERNANCE:
    No card is charged or vaulted online. Signing records the guest's binding terms acceptance
    and preferred offline settlement method (VAX VacationAccess card auth via Grand Travel & Cruise
    or Bank Wire/ACH) and sets deposit_status = 'AWAITING_OFFLINE_SETTLEMENT'.
    Only an authenticated advisor in the CRM marks funds PAID once cleared in VAX or bank wire.
    """
    if not payload.agreed_to_terms:
        raise HTTPException(
            status_code=400,
            detail="You must accept the sanctuary booking terms and cancellation policy to approve your proposal."
        )

    if not payload.e_signature or len(payload.e_signature.strip()) < 2:
        raise HTTPException(
            status_code=400,
            detail="A valid legal e-signature is required to approve your proposal."
        )

    clean_ref = payload.ref.strip()
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == clean_ref, CRMTrip.crm_trip_id == clean_ref)
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Sanctuary trip proposal not found.")

    # Verify guest ownership by matching the email address on the reservation
    if normalize_email(str(payload.guest_email)) != normalize_email(trip.client_email or ""):
        raise HTTPException(
            status_code=403,
            detail="The email address entered does not match the guest email on this reservation."
        )

    trip_status_upper = (trip.status or "").upper()
    if trip_status_upper in ("CANCELLED", "MEDICAL_FREEZE"):
        raise HTTPException(
            status_code=409,
            detail="This sanctuary proposal is no longer active. Please contact concierge@kaiwellnessretreats.com for assistance.",
        )

    # Dynamic Room Option & Suite Tier selection on approval with server-side surcharge floor
    upgrade_surcharges = {
        "private cliffside plunge villa": 3200.0,
        "master penthouse sanctuary": 5500.0,
    }
    is_locked_paid = trip_status_upper == "CONFIRMED" or (trip.deposit_status or "").upper() == "PAID"
    baseline_total = round(float(trip.total_investment or 0.0), 2)
    original_tier_norm = (trip.room_tier or "").strip().lower()
    requested_tier = (payload.selected_room_tier or "").strip()
    requested_tier_norm = requested_tier.lower()
    tier_updated = False

    if requested_tier and not is_locked_paid:
        required_surcharge = 0.0
        if requested_tier_norm in upgrade_surcharges and requested_tier_norm != original_tier_norm:
            current_surcharge = upgrade_surcharges.get(original_tier_norm, 0.0)
            required_surcharge = max(0.0, upgrade_surcharges[requested_tier_norm] - current_surcharge)

        min_required_total = round(baseline_total + required_surcharge, 2)
        if required_surcharge > 0:
            if payload.custom_total_investment is None or not math.isfinite(float(payload.custom_total_investment)):
                raise HTTPException(
                    status_code=400,
                    detail=f"Upgrading to {requested_tier} requires the updated stay investment (${min_required_total:,.2f}).",
                )
            proposed_check = round(float(payload.custom_total_investment), 2)
            if proposed_check < min_required_total:
                raise HTTPException(
                    status_code=400,
                    detail=f"Selected suite upgrade ({requested_tier}) requires a minimum investment of ${min_required_total:,.2f}.",
                )
        trip.room_tier = requested_tier
        tier_updated = True

    if payload.custom_total_investment is not None and not is_locked_paid:
        raw_proposed = float(payload.custom_total_investment)
        if not math.isfinite(raw_proposed) or raw_proposed <= 0 or raw_proposed > 1_000_000:
            raise HTTPException(
                status_code=400,
                detail="Proposed total investment must be a valid finite amount up to $1,000,000.",
            )
        proposed_total = round(raw_proposed, 2)
        if proposed_total < baseline_total:
            raise HTTPException(
                status_code=400,
                detail="Total investment cannot be reduced below the curated proposal baseline.",
            )
        trip.total_investment = proposed_total
        trip.deposit_amount = round(trip.total_investment * 0.3, 2)
        trip.final_balance = round(trip.total_investment - trip.deposit_amount, 2)

    agreement_ref = f"AGR-KAI-{secrets.token_hex(4).upper()}"
    signed_timestamp = datetime.now(timezone.utc).isoformat()
    payment_pref = (payload.payment_preference or "VAX_HOST_AGENCY_CALL").strip().upper()
    pref_labels = {
        "VAX_HOST_AGENCY_CALL": "VAX VacationAccess / ALGV Card Payment via Grand Travel Advisor",
        "BANK_WIRE_ACH": "Domestic / International Bank Wire (ACH / SWIFT)",
        "CORPORATE_WIRE": "Corporate / Executive Holding Wire",
    }
    pref_label = pref_labels.get(payment_pref, payment_pref)

    # Persist optional arrival flight details directly onto smart_flight
    if payload.flight_number or payload.origin_airport:
        sf = dict(trip.smart_flight or {})
        if payload.flight_number:
            sf["flight_number"] = payload.flight_number.strip().upper()
        if payload.origin_airport:
            sf["departure_airport"] = payload.origin_airport.strip().upper()
        trip.smart_flight = sf

    # Update linked client waiver signature & optional dietary notes
    client_rec = db.query(CRMClient).filter(
        or_(CRMClient.id == trip.client_id, CRMClient.email == trip.client_email)
    ).first()
    if client_rec:
        client_rec.waiver_status = "SIGNED"
        client_rec.waiver_signed_at = datetime.now(timezone.utc)
        if payload.dietary_notes and payload.dietary_notes.strip():
            client_rec.dietary_requirements = payload.dietary_notes.strip()

    # Do NOT mark deposit PAID online — advisor confirms once VAX/wire settles
    if trip.deposit_status != "PAID":
        trip.deposit_status = "AWAITING_OFFLINE_SETTLEMENT"
    if trip.status in ("INQUIRY", "PROPOSED_ITINERARY"):
        trip.status = "PROPOSAL_SIGNED"
    if not trip.final_balance_status or trip.final_balance_status == "PENDING":
        trip.final_balance_status = "SCHEDULED_60D"

    # Append milestone events to trip's living activity timeline (NOT payment_history)
    timeline = list(trip.activity_timeline or [])
    if tier_updated:
        timeline.append({
            "event": "SUITE_SELECTED",
            "title": f"Suite Selection Locked: {trip.room_tier}",
            "description": f"Guest selected {trip.room_tier} (${trip.total_investment:,.2f} {trip.currency}).",
            "timestamp": signed_timestamp,
            "badge": "Suite Tier",
            "actor": "GUEST"
        })
    timeline.append({
        "event": "PROPOSAL_SIGNED",
        "title": "Proposal Signed · Awaiting Offline VAX / Wire Deposit",
        "description": (
            f"Agreement Ref {agreement_ref} e-signed by '{payload.e_signature.strip()}'. "
            f"Preferred settlement: {pref_label} for 30% deposit (${trip.deposit_amount:,.2f} {trip.currency})."
        ),
        "timestamp": signed_timestamp,
        "badge": "Signed",
        "actor": "GUEST"
    })
    trip.activity_timeline = timeline

    alert_content = (
        f"SANCTUARY PROPOSAL SIGNED — AWAITING OFFLINE VAX / WIRE DEPOSIT\n"
        f"Guest: {trip.client_name} ({trip.client_email})\n"
        f"Sanctuary: {trip.title} ({trip.dates})\n"
        f"Suite Tier: {trip.room_tier}\n"
        f"Total Investment: ${trip.total_investment:,.2f} {trip.currency}\n"
        f"30% Deposit Due: ${trip.deposit_amount:,.2f} {trip.currency}\n"
        f"70% Balance Due (60d Prior): ${trip.final_balance:,.2f} {trip.currency}\n"
        f"Preferred Settlement Method: {pref_label}\n"
        f"Agreement Ref: {agreement_ref}\n"
        f"Legal E-Signature: {payload.e_signature.strip()} (Signed: {signed_timestamp})\n"
        f"Arrival Flight Provided: {payload.flight_number or 'Pending'} ({payload.origin_airport or 'Origin TBD'})\n"
        f"Dietary Notes Provided: {payload.dietary_notes or 'No changes noted'}\n\n"
        f"Advisor Next Steps:\n"
        f"1. Collect 30% deposit via VAX VacationAccess or send Grand Travel wire instructions.\n"
        f"2. Log the VAX confirmation # or Wire reference in CRM -> Billing & Folios to mark PAID."
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
        "message": (
            f"Thank you! Your proposal and suite selection are signed (Ref: {agreement_ref}). "
            f"No card was charged here—Grand Travel & Cruise will follow up via {pref_label} "
            f"to process your ${trip.deposit_amount:,.2f} {trip.currency} 30% deposit."
        ),
        "auth_reference": agreement_ref,
        "agreement_reference": agreement_ref,
        "payment_preference": payment_pref,
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
