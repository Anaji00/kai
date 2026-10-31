from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import random
import string
import logging

from backend.database import get_db, SessionLocal
from backend.models import Booking, ActionDraft
from backend.schemas import BookingCreate, BookingResponse, BookingLookupResponse
from backend.services.retreats_service import get_retreat_by_slug_or_id
from backend.services.email_service import send_booking_confirmation
from backend.sidecar.routers.webhooks import verify_admin

logger = logging.getLogger("kai_bookings_router")

router = APIRouter(prefix="/bookings", tags=["Bookings & Sanctuary Reservations"])


import secrets

def generate_reference() -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    chars = "".join(secrets.choice(alphabet) for _ in range(5))
    return f"KAI-{chars}"


def process_booking_sidecar_background(
    ref_code: str,
    retreat_id: str,
    retreat_title: str,
    data_dict: dict,
    retreat_info: dict,
):
    """
    Background worker: executes clinical thesis RAG, mirrors intake to staging,
    stages 1-click booking hold draft, and sends internal and guest alerts.
    Keeps public checkout instant (<200ms).
    """
    from backend.sidecar.models import StagingIntake
    from backend.sidecar.services.thesis_rag import generate_pre_call_thesis
    from backend.sidecar.services.messaging import stage_operational_alert
    from backend.config import settings

    db = SessionLocal()
    try:
        clinical_dict = {
            "movement_experience": data_dict.get("movementExperience"),
            "passport_valid": data_dict.get("passportValid"),
            "health_notes": data_dict.get("healthNotes"),
            "intentions": data_dict.get("intentions"),
        }
        thesis = generate_pre_call_thesis(
            client_name=data_dict["fullName"],
            sanctuary_slug=retreat_id,
            room_tier=data_dict.get("roomPreference"),
            clinical_profile=clinical_dict
        )

        staging_rec = StagingIntake(
            source_ref=ref_code,
            client_name=data_dict["fullName"],
            email=str(data_dict["email"]),
            phone=data_dict.get("phone"),
            sanctuary_slug=retreat_id,
            room_tier=data_dict.get("roomPreference"),
            clinical_profile=clinical_dict,
            consultation_thesis=thesis,
            status="PENDING_APPROVAL"
        )
        db.add(staging_rec)
        db.commit()

        # Stage operational SMS alert for Kareena Islam
        stage_operational_alert(
            db=db,
            recipient_phone=settings.OPERATOR_NOTIFICATION_PHONE,
            recipient_name="Kareena Islam",
            message_body=f"KAI Intake Alert: {data_dict['fullName']} reserved for {retreat_title}. Pre-call clinical thesis generated in staging portal.",
            dispatch_type="OPERATIONAL_ALERT"
        )

        # Stage ActionDraft for Booking Hold & Tern sync authorization
        booking_hold_draft = ActionDraft(
            type="booking_hold",
            guest_name=data_dict["fullName"],
            content=(
                f"Booking Hold Request: {data_dict['fullName']} [{ref_code}]\n"
                f"Sanctuary: {retreat_title} ({retreat_id})\n"
                f"Room Tier: {data_dict.get('roomPreference')}\n"
                f"Health Notes: {data_dict.get('healthNotes') or 'None specified'}\n"
                f"Intentions: {data_dict.get('intentions') or 'None specified'}\n\n"
                f"Approving this draft authorizes the reservation hold and initiates Tern CRM guest profile creation."
            ),
            status="pending_review"
        )
        db.add(booking_hold_draft)
        db.commit()
    except Exception as e:
        logger.error(f"Error in background intake staging: {e}")
    finally:
        db.close()

    # Dispatch email alerts
    try:
        booking_dict = {
            "reference_code": ref_code,
            "retreat_id": retreat_id,
            "full_name": data_dict["fullName"],
            "email": str(data_dict["email"]),
            "phone": data_dict.get("phone"),
            "room_preference": data_dict.get("roomPreference"),
            "movement_experience": data_dict.get("movementExperience"),
            "passport_valid": data_dict.get("passportValid"),
            "health_notes": data_dict.get("healthNotes"),
            "intentions": data_dict.get("intentions"),
        }
        send_booking_confirmation(booking_dict, retreat_info)
    except Exception as e:
        logger.error(f"Error sending booking confirmation email: {e}")


@router.post("", response_model=BookingResponse, status_code=201)
def create_booking(
    data: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submits a sanctuary reservation inquiry with clinical and concierge validation.
    Generates reference code and defers thesis generation to background tasks for instant response.
    """
    retreat = get_retreat_by_slug_or_id(data.retreatId, db=db)
    retreat_title = retreat["title"] if retreat else data.retreatId

    # Generate unique reference code
    ref_code = generate_reference()
    while db.query(Booking).filter(Booking.reference_code == ref_code).first():
        ref_code = generate_reference()

    new_booking = Booking(
        reference_code=ref_code,
        retreat_id=data.retreatId,
        retreat_title=retreat_title,
        full_name=data.fullName,
        email=str(data.email),
        phone=data.phone,
        room_preference=data.roomPreference,
        movement_experience=data.movementExperience,
        passport_valid=data.passportValid,
        health_notes=data.healthNotes,
        intentions=data.intentions,
        status="pending_review"
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)

    # Queue background clinical thesis generation and notifications
    retreat_info = retreat if retreat else {"title": retreat_title, "dates": "2026–2027 Season"}
    data_dict = data.model_dump() if hasattr(data, "model_dump") else data.dict()
    background_tasks.add_task(
        process_booking_sidecar_background,
        ref_code=ref_code,
        retreat_id=data.retreatId,
        retreat_title=retreat_title,
        data_dict=data_dict,
        retreat_info=retreat_info
    )

    return BookingResponse(
        success=True,
        message=f"Your reservation inquiry for {retreat_title} has been received. Kareena personally curates each intimate cohort and will be in touch within 24–48 hours.",
        bookingReference=ref_code,
        retreatTitle=retreat_title,
        status="pending_review",
        createdAt=new_booking.created_at
    )


@router.get("/{reference_code}", response_model=BookingLookupResponse)
def get_booking_by_reference(
    reference_code: str,
    email: str = Query(..., description="Email address on the reservation (required to prove ownership)"),
    db: Session = Depends(get_db)
):
    """Lookup reservation details and cohort status by reference code plus the guest's email."""
    booking = db.query(Booking).filter(Booking.reference_code == reference_code.upper()).first()
    # One response for unknown codes and email mismatches, so the endpoint can't be used to probe valid codes.
    if not booking or booking.email.lower() != email.strip().lower():
        raise HTTPException(status_code=404, detail="No reservation matches that reference code and email.")

    return BookingLookupResponse(
        referenceCode=booking.reference_code,
        retreatId=booking.retreat_id,
        retreatTitle=booking.retreat_title,
        fullName=booking.full_name,
        email=booking.email,
        roomPreference=booking.room_preference,
        status=booking.status,
        createdAt=booking.created_at
    )


@router.get("", response_model=List[BookingLookupResponse], dependencies=[Depends(verify_admin)])
def list_bookings(
    retreat_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Admin endpoint to list all sanctuary bookings and applications."""
    query = db.query(Booking)
    if retreat_id:
        query = query.filter(Booking.retreat_id == retreat_id)
    if status:
        query = query.filter(Booking.status == status)
    
    bookings = query.order_by(Booking.created_at.desc()).all()
    return [
        BookingLookupResponse(
            referenceCode=b.reference_code,
            retreatId=b.retreat_id,
            retreatTitle=b.retreat_title,
            fullName=b.full_name,
            email=b.email,
            roomPreference=b.room_preference,
            status=b.status,
            createdAt=b.created_at
        )
        for b in bookings
    ]
