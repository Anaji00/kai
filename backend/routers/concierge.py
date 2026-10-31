from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import FlightConciergeRequest, ActionDraft
from backend.schemas import FlightRequestCreate, FlightRequestResponse
from backend.services.email_service import send_flight_request_alert
from backend.sidecar.routers.webhooks import verify_admin

router = APIRouter(prefix="/concierge", tags=["Grand Travel & Cruise Flight Desk"])


@router.post("/flight-request", response_model=FlightRequestResponse, status_code=201)
def submit_flight_request(data: FlightRequestCreate, db: Session = Depends(get_db)):
    """
    Submits a VIP flight and transfer coordination request to Grand Travel & Cruise.
    Leverages Funjet 500 Club volume to negotiate preferred group air and VIP arrivals.
    """
    flight_req = FlightConciergeRequest(
        booking_reference=data.bookingReference,
        guest_name=data.guestName,
        email=str(data.email),
        phone=data.phone,
        retreat_id=data.retreatId,
        departure_airport=data.departureAirport.upper(),
        cabin_class=data.cabinClass,
        preferred_airline=data.preferredAirline,
        travel_dates_flexible=data.travelDatesFlexible,
        special_requests=data.specialRequests,
        status="inquiry_received"
    )
    db.add(flight_req)
    db.commit()
    db.refresh(flight_req)

    # Mirror into Sidecar Staging Intakes & Stage Grand Travel alert
    try:
        from backend.sidecar.models import StagingIntake
        from backend.sidecar.services.messaging import stage_operational_alert
        from backend.config import settings

        flight_dict = {
            "departure_airport": data.departureAirport.upper(),
            "cabin_class": data.cabinClass,
            "preferred_airline": data.preferredAirline,
            "travel_dates_flexible": data.travelDatesFlexible,
            "special_requests": data.specialRequests,
        }

        # Match existing staging intake by booking reference or email
        existing_intake = None
        if data.bookingReference:
            existing_intake = db.query(StagingIntake).filter(StagingIntake.source_ref == data.bookingReference).first()
        if not existing_intake and data.email:
            existing_intake = db.query(StagingIntake).filter(StagingIntake.email == str(data.email)).first()

        if existing_intake:
            existing_intake.flight_request = flight_dict
            db.commit()
        else:
            # Create a dedicated flight desk staging record
            new_intake = StagingIntake(
                source_ref=data.bookingReference or f"FLIGHT-{str(flight_req.id).zfill(4)}",
                client_name=data.guestName,
                email=str(data.email),
                phone=data.phone,
                sanctuary_slug=data.retreatId,
                room_tier="Grand Travel Flight Desk Inquiry",
                clinical_profile={"notes": "Flight & ground coordination request"},
                flight_request=flight_dict,
                status="PENDING_APPROVAL"
            )
            db.add(new_intake)
            db.commit()

        # Stage operational alert for Grand Travel Flight Desk
        stage_operational_alert(
            db=db,
            recipient_phone=settings.OPERATOR_NOTIFICATION_PHONE,
            recipient_name="Grand Travel Flight Desk",
            message_body=f"Grand Travel Flight Desk: VIP {data.cabinClass} request from {data.guestName} ({data.departureAirport.upper()}). Staged for itinerary review.",
            dispatch_type="OPERATIONAL_ALERT"
        )

        # Stage ActionDraft for Grand Travel & Cruise Flight Desk routing
        flight_draft = ActionDraft(
            type="flight_coordination",
            guest_name=data.guestName,
            content=(
                f"VIP Flight Coordination Request: {data.guestName}\n"
                f"Departure Airport: {data.departureAirport.upper()} | Cabin: {data.cabinClass}\n"
                f"Preferred Airline: {data.preferredAirline or 'Flexible / Host Agency Preferred'}\n"
                f"Booking Ref: {data.bookingReference or 'Direct Air Request'}\n"
                f"Special Requests: {data.specialRequests or 'Lie-flat seating & tarmac chauffeur meet'}\n\n"
                f"Approving this draft dispatches the flight booking request to Grand Travel & Cruise (Funjet 500 Club volume desk)."
            ),
            status="pending_review"
        )
        db.add(flight_draft)
        db.commit()
    except Exception as e:
        import logging
        logging.getLogger("kai_api").error(f"Error mirroring flight request to sidecar staging: {e}")

    send_flight_request_alert({
        "guest_name": data.guestName,
        "email": str(data.email),
        "departure_airport": data.departureAirport.upper(),
        "cabin_class": data.cabinClass,
    })

    return FlightRequestResponse(
        success=True,
        message=f"Your flight request from {data.departureAirport.upper()} has been routed to the Grand Travel & Cruise flight desk. Our concierge will contact you within 24 hours with preferred routing.",
        requestId=flight_req.id,
        departureAirport=flight_req.departure_airport,
        cabinClass=flight_req.cabin_class,
        status=flight_req.status
    )


@router.get("/requests", dependencies=[Depends(verify_admin)])
def list_flight_requests(db: Session = Depends(get_db)):
    """Admin view of all active flight desk requests."""
    return db.query(FlightConciergeRequest).order_by(FlightConciergeRequest.created_at.desc()).all()
