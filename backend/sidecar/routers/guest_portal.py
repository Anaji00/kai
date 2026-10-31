"""
KAI Wellness Retreats - Guest Sanctuary Companion API Router
Public-facing guest portal endpoints authenticated via magic-link tokens.
NO admin auth required for guest companion views — guests access their own retreat data only.
Two-way interactions strictly stage ActionDrafts for Kareena's 1-click authorization (Zero Autonomous Writes).
"""

import logging
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from backend.config import settings
from backend.database import get_db
from backend.sidecar.models import StagingIntake
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
)
from backend.sidecar.services.automation_generators import generate_guest_companion_invitation_draft
from backend.sidecar.routers.webhooks import verify_admin

logger = logging.getLogger("kai_guest_portal_router")

router = APIRouter(prefix="/guest-portal", tags=["Guest Sanctuary Companion"])


# ──── Request Schemas ────

class GuestFlightUpdateRequest(BaseModel):
    token: str = Field(..., description="Magic-link guest token")
    flight_number: str = Field(..., description="Flight number, e.g. UA 142 or AA 1083")
    delay_minutes: int = Field(0, description="Estimated flight delay in minutes")
    gate: Optional[str] = Field(None, description="Arrival or departure gate")
    notes: Optional[str] = Field(None, description="Additional traveler notes")


class GuestDietaryUpdateRequest(BaseModel):
    token: str = Field(..., description="Magic-link guest token")
    dietary_tags: List[str] = Field(default_factory=list, description="e.g. Gluten-Free, Plant-Based, Low-FODMAP")
    allergies: Optional[str] = Field(None, description="Severe food allergies (nuts, shellfish, etc.)")
    special_chef_notes: Optional[str] = Field(None, description="Notes for private villa chef")


class GuestSomaticPulseRequest(BaseModel):
    token: str = Field(..., description="Magic-link guest token")
    day_number: int = Field(1, ge=1, le=14, description="Retreat day number")
    phase: str = Field("MORNING_AWAKENING", description="MORNING_AWAKENING or EVENING_STILLNESS")
    restorative_sleep_score: int = Field(8, ge=1, le=10, description="Self-reported sleep quality (1-10)")
    nervous_system_ease: int = Field(8, ge=1, le=10, description="Nervous system calm & vagal ease (1-10)")
    vagal_tone_descriptor: Optional[str] = Field("Calm & Grounded", description="Subjective somatic feeling")
    private_reflection_notes: Optional[str] = Field(None, description="Private journal reflection")


class RevokeTokenRequest(BaseModel):
    token: str


# ──── Endpoints ────

@router.post("/generate-token", dependencies=[Depends(verify_admin)])
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
    token: str = Query(..., description="Magic-link guest token"),
    db: Session = Depends(get_db)
):
    """
    Returns the full guest companion portal payload for an authenticated guest.
    Includes sanctuary details, live weather, daily somatic schedule, chauffeur info,
    flight status, packing list, and personalized wellness focus.
    
    Privacy: Zero clinical notes, zero Tern IDs, zero financial figures exposed.
    """
    data = get_guest_portal_data(token, db=db)
    if not data:
        raise HTTPException(
            status_code=401,
            detail="This magic link has expired or is invalid. Please contact your KAI concierge for a new link."
        )
    return data


@router.get("/validate")
def validate_token(
    token: str = Query(..., description="Magic-link guest token"),
    db: Session = Depends(get_db)
):
    """Lightweight token validation — returns guest name and sanctuary if valid."""
    session = validate_guest_token(token, db=db)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return {
        "valid": True,
        "guest_name": session["client_name"],
        "sanctuary_slug": session["sanctuary_slug"],
        "expires_at": session["expires_at"],
    }


@router.post("/demo-token", dependencies=[Depends(verify_admin)])
def create_demo_token(db: Session = Depends(get_db)):
    """
    Creates a demo guest magic-link token for development and preview.
    In production, tokens are generated from the operator portal after Tern sync.
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
    db: Session = Depends(get_db)
):
    """
    Allows a guest to refine their dietary preferences and food allergies.
    Stages an ActionDraft for Nurse Kareena to verify before updating the chef's briefing.
    """
    try:
        res = submit_guest_dietary_update(
            token=payload.token,
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
    db: Session = Depends(get_db)
):
    """
    Logs an in-stay subjective somatic pulse (sleep restorativeness, autonomic calm).
    Stored in database and feeds directly into Clinical Copilot and 30-day continuity arcs.
    """
    try:
        res = record_guest_somatic_pulse(
            token=payload.token,
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


@router.get("/pulses/{intake_id}", dependencies=[Depends(verify_admin)])
def get_intake_pulses(
    intake_id: str,
    db: Session = Depends(get_db)
):
    """Operator endpoint: Returns all recorded somatic pulses for a guest intake."""
    pulses = get_guest_somatic_pulses(intake_id, db=db)
    return {"intake_id": intake_id, "pulses": pulses, "count": len(pulses)}


@router.post("/revoke-token", dependencies=[Depends(verify_admin)])
def post_revoke_token(
    payload: RevokeTokenRequest,
    db: Session = Depends(get_db)
):
    """Operator endpoint: Revokes an active guest magic link."""
    success = revoke_guest_token(payload.token, db=db)
    return {"revoked": success}
