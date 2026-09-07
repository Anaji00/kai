from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import random
import string
from backend.database import get_db
from backend.models import Booking
from backend.schemas import BookingCreate, BookingResponse, BookingLookupResponse
from backend.services.retreats_service import get_retreat_by_slug_or_id
from backend.services.email_service import send_booking_confirmation

router = APIRouter(prefix="/bookings", tags=["Bookings & Sanctuary Reservations"])


def generate_reference() -> str:
    chars = "".join(random.choices(string.ascii_uppercase + string.digits, k=5))
    return f"KAI-{chars}"


@router.post("", response_model=BookingResponse, status_code=201)
def create_booking(data: BookingCreate, db: Session = Depends(get_db)):
    """
    Submits a sanctuary reservation inquiry with clinical and concierge validation.
    Generates reference code and sends dual email notifications.
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

    # Mirror into Sidecar Staging Intakes with Pre-Call Thesis RAG
    # MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES TO TERN CRM
    try:
        from backend.sidecar.models import StagingIntake
        from backend.sidecar.services.thesis_rag import generate_pre_call_thesis
        from backend.sidecar.services.messaging import stage_operational_alert
        from backend.config import settings

        clinical_dict = {
            "movement_experience": data.movementExperience,
            "passport_valid": data.passportValid,
            "health_notes": data.healthNotes,
            "intentions": data.intentions,
        }
        thesis = generate_pre_call_thesis(
            client_name=data.fullName,
            sanctuary_slug=data.retreatId,
            room_tier=data.roomPreference,
            clinical_profile=clinical_dict
        )

        staging_rec = StagingIntake(
            source_ref=ref_code,
            client_name=data.fullName,
            email=str(data.email),
            phone=data.phone,
            sanctuary_slug=data.retreatId,
            room_tier=data.roomPreference,
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
            message_body=f"KAI Intake Alert: {data.fullName} reserved for {retreat_title}. Pre-call clinical thesis generated in staging portal.",
            dispatch_type="OPERATIONAL_ALERT"
        )
    except Exception as e:
        # Resilient logging - do not fail the guest booking if staging mirror encounters a soft exception
        import logging
        logging.getLogger("kai_api").error(f"Error mirroring intake to sidecar staging: {e}")

    # Dispatch email alerts
    booking_dict = {
        "reference_code": ref_code,
        "retreat_id": data.retreatId,
        "full_name": data.fullName,
        "email": str(data.email),
        "phone": data.phone,
        "room_preference": data.roomPreference,
        "movement_experience": data.movementExperience,
        "passport_valid": data.passportValid,
        "health_notes": data.healthNotes,
        "intentions": data.intentions,
    }
    retreat_info = retreat if retreat else {"title": retreat_title, "dates": "2026–2027 Season"}
    send_booking_confirmation(booking_dict, retreat_info)

    return BookingResponse(
        success=True,
        message=f"Your reservation inquiry for {retreat_title} has been received. Kareena personally curates each intimate cohort and will be in touch within 24–48 hours.",
        bookingReference=ref_code,
        retreatTitle=retreat_title,
        status="pending_review",
        createdAt=new_booking.created_at
    )


@router.get("/{reference_code}", response_model=BookingLookupResponse)
def get_booking_by_reference(reference_code: str, db: Session = Depends(get_db)):
    """Lookup reservation details and cohort status by reference code."""
    booking = db.query(Booking).filter(Booking.reference_code == reference_code.upper()).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Reservation reference code not found")

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


@router.get("", response_model=List[BookingLookupResponse])
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
