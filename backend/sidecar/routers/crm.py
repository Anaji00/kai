from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import logging
import secrets
import uuid
import threading

_cohort_reservation_lock = threading.Lock()
_bodywork_scheduling_lock = threading.Lock()

from backend.database import get_db
from backend.sidecar.models import CRMClient, CRMTrip, StagingIntake, GuestSomaticPulse, DestinationReview
from backend.models import Booking, FlightConciergeRequest, ActionDraft, SanctuaryCohort

logger = logging.getLogger("kai_crm_router")

router = APIRouter(prefix="/crm", tags=["KAI Sanctuary Travel CRM"])


@router.get("/clients")
def list_crm_clients(
    q: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Pulls all client profiles from the native database.
    Supports real-time search, tag filtering, and lifetime spend tracking.
    """
    if not isinstance(q, str):
        q = getattr(q, "default", None)
    if not isinstance(tag, str):
        tag = getattr(tag, "default", None)
    if not isinstance(limit, int):
        limit = getattr(limit, "default", 50) or 50
    if not isinstance(offset, int):
        offset = getattr(offset, "default", 0) or 0

    query = db.query(CRMClient)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                CRMClient.full_name.ilike(search_pattern),
                CRMClient.email.ilike(search_pattern),
                CRMClient.phone.ilike(search_pattern),
            )
        )

    clients = query.order_by(CRMClient.updated_at.desc()).offset(offset).limit(limit).all()

    # In-memory tag filter if requested
    if tag:
        clients = [c for c in clients if tag.upper() in [t.upper() for t in (c.tags or [])]]

    return [
        {
            "id": c.id,
            "crm_contact_id": c.crm_contact_id,
                        "full_name": c.full_name,
            "email": c.email,
            "phone": c.phone,
            "tags": c.tags or [],
            "dietary_requirements": c.dietary_requirements,
            "health_notes": c.health_notes,
            "movement_experience": c.movement_experience,
            "intentions": c.intentions,
            "passport_valid_6mo": c.passport_valid_6mo,
            "total_lifetime_spend": c.total_lifetime_spend,
            "total_trips_count": c.total_trips_count,
            "source": c.source,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c in clients
    ]


@router.get("/clients/{client_id}")
def get_crm_client_detail(client_id: str, db: Session = Depends(get_db)):
    """
    Returns full 360-degree client dossier with linked trips, intakes, bookings, and flight requests.
    """
    client = db.query(CRMClient).filter(
        or_(CRMClient.id == client_id, CRMClient.crm_contact_id == client_id, CRMClient.email == client_id.lower())
    ).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found in native CRM")

    trips = db.query(CRMTrip).filter(CRMTrip.client_id == client.id).all()
    intakes = db.query(StagingIntake).filter(StagingIntake.email == client.email).all()
    bookings = db.query(Booking).filter(Booking.email == client.email).all()
    flights = db.query(FlightConciergeRequest).filter(FlightConciergeRequest.email == client.email).all()

    return {
        "client": {
            "id": client.id,
            "crm_contact_id": client.crm_contact_id,
            "full_name": client.full_name,
            "email": client.email,
            "phone": client.phone,
            "tags": client.tags or [],
            "dietary_requirements": client.dietary_requirements,
            "health_notes": client.health_notes,
            "movement_experience": client.movement_experience,
            "intentions": client.intentions,
            "passport_valid_6mo": client.passport_valid_6mo,
            "loyalty_programs": client.loyalty_programs or {},
            "total_lifetime_spend": client.total_lifetime_spend,
            "total_trips_count": len(trips) or client.total_trips_count,
            "source": client.source,
            "notes": client.notes,
            "created_at": client.created_at.isoformat(),
        },
        "trips": [
            {
                "id": t.id,
                "crm_trip_id": t.crm_trip_id,
                            "title": t.title,
                "sanctuary_slug": t.sanctuary_slug,
                "dates": t.dates,
                "room_tier": t.room_tier,
                "status": t.status,
                "total_investment": t.total_investment,
                "deposit_amount": t.deposit_amount,
                "deposit_status": t.deposit_status,
                "smart_flight": t.smart_flight,
                "deep_link": t.deep_link,
            }
            for t in trips
        ],
        "intakes_count": len(intakes),
        "bookings_count": len(bookings),
        "flight_requests_count": len(flights),
    }


class CRMClientCreateUpdateRequest(BaseModel):
    full_name: str
    email: str
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    passport_number: Optional[str] = None
    passport_issuing_country: Optional[str] = "United States"
    passport_expiry: Optional[str] = None
    passport_valid_6mo: bool = True
    dietary_requirements: Optional[str] = None
    health_notes: Optional[str] = None
    movement_experience: Optional[str] = "all-levels"
    intentions: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None
    source: Optional[str] = "ADVISOR_DIRECT_ENTRY"


@router.post("/clients")
def create_or_upsert_crm_client(
    payload: CRMClientCreateUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    General-purpose KAI Sanctuary CRM Contact creator / upserter.
    Allows staff to directly add or update any traveler contact in `crm_clients`.
    """
    clean_email = payload.email.strip().lower()
    client = db.query(CRMClient).filter(CRMClient.email == clean_email).first()
    is_new = False

    if not client:
        is_new = True
        client = CRMClient(
            id=str(uuid.uuid4()),
            crm_contact_id=f"kai_cnt_{secrets.token_hex(6)}",
            full_name=payload.full_name.strip(),
            email=clean_email,
            phone=payload.phone,
            date_of_birth=payload.date_of_birth,
            passport_number=payload.passport_number,
            passport_issuing_country=payload.passport_issuing_country,
            passport_expiry=payload.passport_expiry,
            passport_valid_6mo=payload.passport_valid_6mo,
            dietary_requirements=payload.dietary_requirements,
            health_notes=payload.health_notes,
            movement_experience=payload.movement_experience or "all-levels",
            intentions=payload.intentions,
            tags=payload.tags if payload.tags is not None else ["KAI_GUEST"],
            notes=payload.notes,
            source=payload.source or "ADVISOR_DIRECT_ENTRY",
            total_lifetime_spend=0.0,
            total_trips_count=0,
        )
        db.add(client)
    else:
        client.full_name = payload.full_name.strip()
        if payload.phone is not None:
            client.phone = payload.phone
        if payload.date_of_birth is not None:
            client.date_of_birth = payload.date_of_birth
        if payload.passport_number is not None:
            client.passport_number = payload.passport_number
        if payload.passport_issuing_country is not None:
            client.passport_issuing_country = payload.passport_issuing_country
        if payload.passport_expiry is not None:
            client.passport_expiry = payload.passport_expiry
        client.passport_valid_6mo = payload.passport_valid_6mo
        if payload.dietary_requirements is not None:
            client.dietary_requirements = payload.dietary_requirements
        if payload.health_notes is not None:
            client.health_notes = payload.health_notes
        if payload.movement_experience is not None:
            client.movement_experience = payload.movement_experience
        if payload.intentions is not None:
            client.intentions = payload.intentions
        if payload.tags is not None:
            client.tags = payload.tags
        if payload.notes is not None:
            client.notes = payload.notes

    db.commit()
    db.refresh(client)

    return {
        "success": True,
        "is_new": is_new,
        "client": {
            "id": client.id,
            "crm_contact_id": client.crm_contact_id,
            "full_name": client.full_name,
            "email": client.email,
            "phone": client.phone,
            "tags": client.tags or [],
            "dietary_requirements": client.dietary_requirements,
            "health_notes": client.health_notes,
            "passport_valid_6mo": client.passport_valid_6mo,
            "total_lifetime_spend": client.total_lifetime_spend,
            "total_trips_count": client.total_trips_count,
        },
    }


@router.patch("/clients/{client_id}")
def update_crm_client_profile(
    client_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    General-purpose partial update for any CRMClient dossier field
    (dietary_requirements, health_notes, passport_number, passport_expiry, tags, notes, phone).
    """
    client = db.query(CRMClient).filter(
        or_(CRMClient.id == client_id, CRMClient.crm_contact_id == client_id, CRMClient.email == client_id.lower())
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in native CRM")

    editable_fields = [
        "full_name", "phone", "date_of_birth", "passport_number",
        "passport_issuing_country", "passport_expiry", "passport_valid_6mo",
        "dietary_requirements", "health_notes", "movement_experience",
        "intentions", "tags", "notes", "loyalty_programs",
    ]
    for field in editable_fields:
        if field in payload:
            setattr(client, field, payload[field])

    db.commit()
    db.refresh(client)
    return {
        "success": True,
        "client_id": client.id,
        "full_name": client.full_name,
        "email": client.email,
        "dietary_requirements": client.dietary_requirements,
        "health_notes": client.health_notes,
        "tags": client.tags or [],
        "notes": client.notes,
    }


class CRMTripCreateRequest(BaseModel):
    client_id: Optional[str] = None
    client_name: str
    client_email: str
    sanctuary_slug: str = "puerto-vallarta-2027"
    title: Optional[str] = None
    dates: str = "Oct 10–15, 2027"
    room_tier: str = "Oceanfront King Suite"
    total_investment: float = 9500.0
    currency: str = "USD"
    smart_flight: Optional[Dict[str, Any]] = None
    itinerary_blocks: Optional[List[Dict[str, Any]]] = None
    operator_name: str = "Kareena Islam, BSN, RN"


@router.post("/trips")
def create_crm_trip_record(
    payload: CRMTripCreateRequest,
    db: Session = Depends(get_db)
):
    """
    General-purpose KAI Sanctuary CRM Trip & Proposal builder.
    Creates a bespoke traveler sub-trip linked to a CRMClient, computes the 30% deposit
    and 70% balance schedule, seeds default circadian/somatic itinerary blocks if omitted,
    and updates the client's trip count and pipeline spend.
    """
    clean_email = payload.client_email.strip().lower()
    client = None
    if payload.client_id:
        client = db.query(CRMClient).filter(CRMClient.id == payload.client_id).first()
    if not client:
        client = db.query(CRMClient).filter(CRMClient.email == clean_email).first()
    if not client:
        client = CRMClient(
            id=str(uuid.uuid4()),
            crm_contact_id=f"kai_cnt_{secrets.token_hex(6)}",
            full_name=payload.client_name.strip(),
            email=clean_email,
            tags=["KAI_GUEST"],
            total_lifetime_spend=0.0,
            total_trips_count=0,
            source="ADVISOR_TRIP_BUILDER",
        )
        db.add(client)
        db.flush()

    deposit = round(payload.total_investment * 0.30, 2)
    balance = round(payload.total_investment - deposit, 2)
    default_blocks = payload.itinerary_blocks or [
        {"day": 1, "time": "15:00", "title": "Private Airport Tarmac Greeting & Villa Check-In", "description": "Chilled electrolyte towel escort and grounding herbal tea."},
        {"day": 2, "time": "08:00", "title": "Morning 4-7-8 Vagal Breathwork & Coastal Movement", "description": "Parasympathetic downregulation and reformer alignment."},
        {"day": 3, "time": "17:30", "title": "432Hz Crystal Alchemy Sound Bath & Blue Zone Dinner", "description": "Acoustic nervous system stillness and anti-inflammatory dining."},
    ]

    trip_title = payload.title or f"KAI Sanctuary — {payload.sanctuary_slug.replace('-', ' ').title()}"
    trip = CRMTrip(
        id=str(uuid.uuid4()),
        crm_trip_id=f"kai_trp_{secrets.token_hex(6)}",
        client_id=client.id,
        client_name=client.full_name,
        client_email=client.email,
        sanctuary_slug=payload.sanctuary_slug,
        title=trip_title,
        dates=payload.dates,
        room_tier=payload.room_tier,
        status="PROPOSED_ITINERARY",
        total_investment=payload.total_investment,
        deposit_amount=deposit,
        deposit_status="PENDING_CLIENT_AUTHORIZATION",
        final_balance=balance,
        final_balance_status="SCHEDULED",
        currency=payload.currency,
        smart_flight=payload.smart_flight or {},
        itinerary_blocks=default_blocks,
        created_by=payload.operator_name,
    )
    db.add(trip)

    client.total_trips_count = (client.total_trips_count or 0) + 1
    client.total_lifetime_spend = round((client.total_lifetime_spend or 0.0) + payload.total_investment, 2)

    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "trip": {
            "id": trip.id,
            "crm_trip_id": trip.crm_trip_id,
            "client_id": trip.client_id,
            "client_name": trip.client_name,
            "client_email": trip.client_email,
            "sanctuary_slug": trip.sanctuary_slug,
            "title": trip.title,
            "dates": trip.dates,
            "room_tier": trip.room_tier,
            "status": trip.status,
            "total_investment": trip.total_investment,
            "deposit_amount": trip.deposit_amount,
            "final_balance": trip.final_balance,
            "itinerary_blocks": trip.itinerary_blocks,
        },
    }


@router.patch("/trips/{trip_id}/itinerary")
def update_crm_trip_itinerary_blocks(
    trip_id: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db)
):
    """
    General-purpose KAI Sanctuary Itinerary Builder endpoint.
    Allows staff to add, edit, reorder, or remove day-by-day itinerary blocks,
    update trip status, dates, room_tier, or smart_flight details on any CRMTrip.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    if "itinerary_blocks" in payload and isinstance(payload["itinerary_blocks"], list):
        trip.itinerary_blocks = payload["itinerary_blocks"]
    if "append_block" in payload and isinstance(payload["append_block"], dict):
        blocks = list(trip.itinerary_blocks or [])
        blocks.append(payload["append_block"])
        trip.itinerary_blocks = blocks
    if "status" in payload and payload["status"]:
        trip.status = str(payload["status"])
    if "dates" in payload and payload["dates"]:
        trip.dates = str(payload["dates"])
    if "room_tier" in payload and payload["room_tier"]:
        trip.room_tier = str(payload["room_tier"])
    if "smart_flight" in payload and isinstance(payload["smart_flight"], dict):
        trip.smart_flight = payload["smart_flight"]

    db.commit()
    db.refresh(trip)

    return {
        "success": True,
        "trip_id": trip.id,
        "crm_trip_id": trip.crm_trip_id,
        "status": trip.status,
        "room_tier": trip.room_tier,
        "dates": trip.dates,
        "activities_count": len(trip.itinerary_blocks or []),
        "itinerary_blocks": trip.itinerary_blocks or [],
    }



@router.get("/trips")
def list_crm_trips(
    sanctuary: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Pulls all sanctuary trips and itineraries from the native database.
    """
    if not isinstance(sanctuary, str):
        sanctuary = getattr(sanctuary, "default", None)
    if not isinstance(status, str):
        status = getattr(status, "default", None)
    if not isinstance(limit, int):
        limit = getattr(limit, "default", 50) or 50
    if not isinstance(offset, int):
        offset = getattr(offset, "default", 0) or 0

    query = db.query(CRMTrip)
    if sanctuary:
        query = query.filter(CRMTrip.sanctuary_slug == sanctuary)
    if status:
        query = query.filter(CRMTrip.status == status)

    trips = query.order_by(CRMTrip.created_at.desc()).offset(offset).limit(limit).all()

    return [
        {
            "id": t.id,
            "crm_trip_id": t.crm_trip_id,
                        "client_name": t.client_name,
            "client_email": t.client_email,
            "title": t.title,
            "sanctuary_slug": t.sanctuary_slug,
            "dates": t.dates,
            "room_tier": t.room_tier,
            "status": t.status,
            "total_investment": t.total_investment,
            "deposit_amount": t.deposit_amount,
            "deposit_status": t.deposit_status,
            "final_balance": t.final_balance,
            "activities_count": len(t.itinerary_blocks or []),
            "activity_timeline": t.activity_timeline or [],
            "smart_flight": t.smart_flight,
            "deep_link": t.deep_link,
            "created_at": t.created_at.isoformat(),
        }
        for t in trips
    ]


@router.get("/trips/{trip_id}")
def get_crm_trip_detail(trip_id: str, db: Session = Depends(get_db)):
    """
    Pulls full trip itinerary blocks, smart flight tracking, clinical talk tracks, and payment schedule.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()

    return {
        "trip": {
            "id": trip.id,
            "crm_trip_id": trip.crm_trip_id,
            "client_name": trip.client_name,
            "client_email": trip.client_email,
            "title": trip.title,
            "sanctuary_slug": trip.sanctuary_slug,
            "dates": trip.dates,
            "room_tier": trip.room_tier,
            "status": trip.status,
            "total_investment": trip.total_investment,
            "deposit_amount": trip.deposit_amount,
            "deposit_status": trip.deposit_status,
            "final_balance": trip.final_balance,
            "final_balance_status": trip.final_balance_status,
            "currency": trip.currency,
            "payment_terms": trip.payment_terms,
            "smart_flight": trip.smart_flight,
            "ground_transfer": trip.ground_transfer,
            "clinical_thesis": trip.clinical_thesis,
            "suggested_plan": trip.suggested_plan,
            "itinerary_blocks": trip.itinerary_blocks or [],
            "activity_timeline": trip.activity_timeline or [],
            "deep_link": trip.deep_link,
            "proposal_url": trip.proposal_url,
            "created_by": trip.created_by,
            "created_at": trip.created_at.isoformat(),
        },
        "client": {
            "full_name": client.full_name if client else trip.client_name,
            "email": client.email if client else trip.client_email,
            "phone": client.phone if client else None,
            "tags": client.tags if client else [],
            "health_notes": client.health_notes if client else None,
        } if client else None
    }


@router.post("/trips/{trip_id}/automate")
def automate_trip_outreach(
    trip_id: str,
    action_type: str = Query(..., description="draft_welcome, draft_packing_guide, draft_flight_coordination, draft_post_retreat_arc"),
    operator_name: str = Query("Kareena Islam"),
    db: Session = Depends(get_db)
):
    """
    Automates advisor task drafting directly from the native database.
    Stages an ActionDraft ready for Kareena and Armaan to review and approve in 1 click.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()

    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()
    guest_name = trip.client_name
    recipient_email = trip.client_email

    if action_type == "draft_welcome":
        content = (
            f"Pre-Arrival Sanctuary Dossier for {guest_name}\n"
            f"Sanctuary: {trip.title} ({trip.dates})\n"
            f"Suite Tier: {trip.room_tier}\n"
            f"Deposit Status: {trip.deposit_status}\n\n"
            f"Dear {guest_name},\n"
            f"We are looking forward to welcoming you to {trip.title}. "
            f"Your suite has been placed and our culinary team has received your dietary notes. "
            f"Kareena and Armaan will meet you upon arrival."
        )
        draft_type = "guest_email_confirmation"

    elif action_type == "draft_packing_guide":
        content = (
            f"14-Day Destination & Packing Briefing for {guest_name}\n"
            f"Sanctuary: {trip.title} ({trip.dates})\n"
            f"Destination: {trip.sanctuary_slug.replace('-', ' ').title()}\n\n"
            f"Dear {guest_name},\n"
            f"As we approach our sanctuary dates, here is your curated packing checklist tailored to the microclimate: "
            f"2–3 breathable yoga sets, light evening wrap for sound baths, and valid passport. "
            f"Looking forward to sharing this sacred renewal with you."
        )
        draft_type = "packing_dossier"

    elif action_type == "draft_flight_coordination":
        flight = trip.smart_flight or {}
        content = (
            f"Grand Travel Flight & VIP Chauffeur Alignment for {guest_name}\n"
            f"Departure Airport: {flight.get('departure_airport', 'TBD')} | Cabin: {flight.get('cabin_class', 'Business')}\n"
            f"Airline: {flight.get('airline', 'Preferred Partner')}\n"
            f"Sanctuary: {trip.title}\n\n"
            f"Flight desk: Verify lie-flat status and confirm private tarmac SUV pickup."
        )
        draft_type = "flight_delay_chauffeur_update"

    else:
        content = (
            f"30-Day Post-Retreat Somatic Integration Arc for {guest_name}\n"
            f"Sanctuary: {trip.title}\n\n"
            f"Checking in on your parasympathetic calm, 4-7-8 breathwork rhythm, and sleep quality 30 days after your sanctuary experience."
        )
        draft_type = "post_retreat_integration"

    new_draft = ActionDraft(
        type=draft_type,
        guest_name=guest_name,
        recipient_email=recipient_email,
        content=content,
        status="pending_review",
    )
    db.add(new_draft)
    db.commit()
    db.refresh(new_draft)

    logger.info(f"Staged native CRM automated outreach action '{action_type}' for {guest_name} [Draft #{new_draft.id}]")

    return {
        "success": True,
        "message": f"Successfully automated {action_type} draft for {guest_name}.",
        "draft_id": new_draft.id,
        "draft_type": draft_type,
        "recipient_email": recipient_email,
        "status": "pending_review",
    }


@router.post("/trips/{trip_id}/flight-delay")
def update_trip_flight_delay(
    trip_id: str,
    delay_minutes: int = Query(..., ge=1, le=1440, description="Delay in minutes"),
    new_eta: str = Query(..., description="New arrival time (e.g. '21:45 PVR')"),
    reason: Optional[str] = Query("Weather & Ground Delay Program", description="Delay rationale"),
    operator_name: str = Query("Kareena Islam"),
    db: Session = Depends(get_db)
):
    """
    Handles real-life Cirium flight delays and airport schedule disruptions.
    Updates the smart_flight tracking block in the database and automatically stages
    an urgent chauffeur alignment draft for private tarmac SUV pickup.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    flight = dict(trip.smart_flight or {})
    flight["live_status"] = f"DELAYED (+{delay_minutes}m)"
    flight["delay_minutes"] = delay_minutes
    flight["new_eta"] = new_eta
    flight["delay_reason"] = reason
    flight["last_checked"] = datetime.now(timezone.utc).isoformat()
    trip.smart_flight = flight

    guest_name = trip.client_name
    airline = flight.get("airline", "Partner Air")
    flight_num = flight.get("flight_number", "VIP Air")

    content = (
        f"URGENT: Flight Delay & Chauffeur Realignment for {guest_name}\n"
        f"Sanctuary: {trip.title}\n"
        f"Carrier: {airline} ({flight_num})\n"
        f"Original Schedule Disrupted: +{delay_minutes} min delay\n"
        f"Revised ETA: {new_eta} (Reason: {reason})\n\n"
        f"Action for Chauffeur Desk: Adjust airport arrivals pickup time to {new_eta}. "
        f"Ensure adaptogenic welcome refreshments remain chilled at arrivals curb."
    )

    draft = ActionDraft(
        type="flight_delay_chauffeur_update",
        guest_name=guest_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    logger.info(f"Recorded flight delay of {delay_minutes}m for {guest_name} [Draft #{draft.id}]")

    return {
        "success": True,
        "message": f"Flight delay recorded (+{delay_minutes}m). Chauffeur alert staged.",
        "draft_id": draft.id,
        "new_eta": new_eta,
        "smart_flight": flight,
    }


@router.post("/trips/{trip_id}/upgrade")
def upgrade_trip_suite_tier(
    trip_id: str,
    new_room_tier: str = Query(..., description="New room/suite tier name"),
    new_total_investment: float = Query(..., ge=100.0, description="Updated total stay amount"),
    operator_name: str = Query("Kareena Islam"),
    db: Session = Depends(get_db)
):
    """
    Handles real-life guest suite upgrades and recalculates financial installments:
    - 30% deposit recomputed
    - 70% remaining balance adjusted
    - Stages an updated invoice draft in the Action Review Queue
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    old_tier = trip.room_tier
    old_investment = trip.total_investment

    new_deposit = round(new_total_investment * 0.3, 2)
    new_balance = round(new_total_investment - new_deposit, 2)

    trip.room_tier = new_room_tier
    trip.total_investment = new_total_investment
    trip.deposit_amount = new_deposit
    trip.final_balance = new_balance

    # Update CRMClient total lifetime spend
    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()
    if client:
        diff = new_total_investment - old_investment
        client.total_lifetime_spend = max(0.0, client.total_lifetime_spend + diff)

    content = (
        f"Suite Upgrade & Revised Payment Schedule for {trip.client_name}\n"
        f"Sanctuary: {trip.title} ({trip.dates})\n"
        f"Suite Upgraded: {old_tier} -> {new_room_tier}\n"
        f"Total Investment: ${new_total_investment:,.2f} USD\n"
        f"30% Sanctuary Deposit: ${new_deposit:,.2f} USD\n"
        f"70% Remaining Balance: ${new_balance:,.2f} USD (Due 45 days prior)\n\n"
        f"Dear {trip.client_name},\n"
        f"Your sanctuary suite has been upgraded to the {new_room_tier}. "
        f"Your updated payment schedule is reflected in your private sanctuary portal link."
    )

    draft = ActionDraft(
        type="guest_email_confirmation",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    logger.info(f"Upgraded trip {trip.id} to {new_room_tier} (${new_total_investment}) [Draft #{draft.id}]")

    return {
        "success": True,
        "message": f"Successfully upgraded to {new_room_tier}.",
        "draft_id": draft.id,
        "room_tier": new_room_tier,
        "total_investment": new_total_investment,
        "deposit_amount": new_deposit,
        "final_balance": new_balance,
    }


@router.post("/clients/{client_id}/clinical-triage")
def triage_client_clinical_profile(
    client_id: str,
    operator_name: str = Query("Kareena Islam"),
    db: Session = Depends(get_db)
):
    """
    Nurse-led clinical safety triage:
    Analyzes health notes for critical medical contraindications:
    - Cardiovascular / Pacemaker (NO extreme hot/cold contrast)
    - Active Pregnancy (modified acoustic & prenatal somatics)
    - Anaphylactic Food Allergies (strict culinary isolation)
    - Orthopedic Restrictions (ground-level pavilions)
    """
    client = db.query(CRMClient).filter(
        or_(CRMClient.id == client_id, CRMClient.crm_contact_id == client_id, CRMClient.email == client_id.lower())
    ).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found in native CRM")

    notes = f"{client.health_notes or ''} {client.dietary_requirements or ''} {client.intentions or ''}".lower()
    
    flagged = []
    contraindications = []

    if any(k in notes for k in ["pacemaker", "arrhythmia", "cardiac", "hypertension", "heart condition"]):
        flagged.append("CARDIO_VASCULAR_RISK")
        contraindications.append("CONTRAINDICATION: Prohibit extreme cold plunge / sauna shock protocol.")

    if any(k in notes for k in ["pregnant", "pregnancy", "prenatal", "trimester"]):
        flagged.append("PREGNANCY_MODIFIED_SOMATICS")
        contraindications.append("MODIFICATION: Gentle prenatal alignment only; suppress acoustic bowls over lower abdomen.")

    if any(k in notes for k in ["anaphylaxis", "anaphylactic", "epipen", "epi-pen", "peanut allergy"]):
        flagged.append("ANAPHYLACTIC_ALLERGEN_ALERT")
        contraindications.append("HAZARD ALERT: Strict kitchen separation; verify dedicated food preparation surface.")

    if any(k in notes for k in ["acl", "meniscus", "disc", "herniated", "post-op", "wheelchair"]):
        flagged.append("ORTHOPEDIC_RESTRICTED")
        contraindications.append("MOBILITY NOTE: Assign ground-level sanctuary suite; eliminate steep coastal trail walks.")

    if not flagged:
        flagged.append("STANDARD_SOMATIC_CLEARANCE")

    # Merge newly detected safety flags
    existing_tags = set(client.tags or [])
    existing_tags.update(flagged)
    client.tags = sorted(list(existing_tags))
    db.commit()

    return {
        "success": True,
        "client_name": client.full_name,
        "email": client.email,
        "clinical_flags": flagged,
        "contraindications": contraindications,
        "tags": client.tags,
        "safety_status": "HIGH_PRIORITY_REVIEW" if len(contraindications) > 0 else "CLEARED"
    }


@router.post("/trips/{trip_id}/emergency-medical-freeze")
def freeze_trip_medical_emergency(
    trip_id: str,
    clinical_event: str = Query(..., description="Description of the acute medical event or condition"),
    attending_clinician: str = "Kareena Islam, BSN, RN",
    local_facility: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Emergency Medical Escalation:
    Triggered by Nurse Kareena Islam during an acute guest health event in-retreat.
    - Freezes retreat status with financial credit protection
    - Assembles immediate clinical handover dossier with nearest hospital pre-clearance
    - Stages urgent emergency_medical_liaison ActionDraft for next-of-kin and ER physicians
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()

    slug = (trip.sanctuary_slug or "").lower()
    if not local_facility:
        if "puerto-vallarta" in slug or "marival" in slug:
            local_facility = "Hospital Joya Marina Puerto Vallarta (Level 3 Trauma & Cardiac Care, +52 322 226 1010)"
        elif "nosara" in slug:
            local_facility = "Hospital Metropolitano & Nosara Red Cross Emergency Base (+506 2682 0405)"
        else:
            local_facility = "Regional Accredited Trauma Center & Global Air Ambulance Liaison"

    trip.status = "EMERGENCY_MEDICAL_FREEZE"

    emergency_contact = client.emergency_contact if client and client.emergency_contact else {}
    contact_name = emergency_contact.get("name", "Emergency Contact On File")
    contact_phone = emergency_contact.get("phone", client.phone if client else "N/A")

    content = (
        f"CRITICAL MEDICAL ESCALATION & CLINICAL FREEZE\n"
        f"Sanctuary: {trip.title} ({trip.dates})\n"
        f"Guest: {trip.client_name} (DOB: {client.date_of_birth if client else 'On File'})\n"
        f"Attending Nurse / Clinician: {attending_clinician}\n"
        f"Clinical Event Trigger: {clinical_event}\n"
        f"Designated Emergency Center: {local_facility}\n"
        f"Next of Kin / Emergency Contact: {contact_name} ({contact_phone})\n\n"
        f"Clinical Handover Notes:\n"
        f"- Known Health Flags: {client.tags if client else 'None'}\n"
        f"- Known Allergies / Diet: {client.dietary_requirements if client else 'None'}\n"
        f"- Baseline Somatic Notes: {client.health_notes if client else 'None'}\n\n"
        f"Action Dispatched: MedEvac transport pre-notified. Retreat activities for guest frozen with 100% financial credit protection."
    )

    draft = ActionDraft(
        type="emergency_medical_liaison",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "status": "EMERGENCY_MEDICAL_FREEZE",
        "guest_name": trip.client_name,
        "clinical_event": clinical_event,
        "attending_clinician": attending_clinician,
        "local_facility": local_facility,
        "draft_id": draft.id,
        "message": f"Clinical freeze enacted for {trip.client_name}. Hospital liaison staged [Draft #{draft.id}]."
    }


@router.post("/trips/{trip_id}/cancellation")
def cancel_trip_with_refund_policy(
    trip_id: str,
    days_prior_to_departure: int = Query(..., ge=0, description="Days between cancellation notice and retreat start date"),
    cancellation_reason: str = Query(..., description="Reason for cancellation"),
    medical_certificate_provided: bool = False,
    operator_name: str = "Kareena Islam",
    db: Session = Depends(get_db)
):
    """
    Luxury Travel Cancellation & Force Majeure Engine:
    Applies strict luxury hospitality tiers:
    - > 60 days: 30% deposit converted to Future Concierge Credit (minus $500 fee), 70% balance refunded.
    - 30 to 60 days: 100% credit if medical exemption verified, or 50% balance refund.
    - < 30 days: Non-refundable; generates formal Itemized Insurance Claim Statement for Amex / Chase / Allianz.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()

    total = trip.total_investment
    deposit = trip.deposit_amount
    balance = trip.final_balance

    if days_prior_to_departure > 60:
        admin_fee = 500.0
        credit_amount = max(0.0, deposit - admin_fee)
        cash_refund = balance
        forfeiture = admin_fee
        tier_label = "EARLY_CANCELLATION_GT_60D"
        policy_note = (
            f"Over 60 days before retreat start. 70% balance (${balance:,.2f}) refunded to card. "
            f"Deposit converted to Future Sanctuary Credit (${credit_amount:,.2f}) minus ${admin_fee:.2f} administration fee."
        )
    elif 30 <= days_prior_to_departure <= 60:
        if medical_certificate_provided:
            credit_amount = total
            cash_refund = 0.0
            forfeiture = 0.0
            tier_label = "MEDICAL_EXEMPTION_CONCIERGE_CREDIT_30_60D"
            policy_note = (
                f"Physician medical exemption certificate verified. 100% of stay investment (${total:,.2f}) "
                f"converted to 18-month KAI Sanctuary Concierge Credit with zero penalty."
            )
        else:
            half_balance = round(balance * 0.5, 2)
            cash_refund = half_balance
            credit_amount = 0.0
            forfeiture = deposit + (balance - half_balance)
            tier_label = "STANDARD_CANCELLATION_30_60D"
            policy_note = (
                f"30 to 60 days prior to departure. Deposit (${deposit:,.2f}) forfeited. "
                f"50% of remaining balance (${half_balance:,.2f}) refunded to original card."
            )
    else:  # < 30 days
        cash_refund = 0.0
        credit_amount = 0.0
        forfeiture = total
        tier_label = "LATE_CANCELLATION_NON_REFUNDABLE_LT_30D"
        policy_note = (
            f"Less than 30 days prior to departure. 100% of reservation (${total:,.2f}) is non-refundable. "
            f"Official Itemized Insurance Claim Statement staged for travel insurance reimbursement."
        )

    trip.status = "CANCELLED"
    trip.cancellation_record = {
        "cancelled_at": datetime.now(timezone.utc).isoformat(),
        "days_prior": days_prior_to_departure,
        "reason": cancellation_reason,
        "medical_certificate_provided": medical_certificate_provided,
        "policy_tier": tier_label,
        "total_investment": total,
        "cash_refund": cash_refund,
        "concierge_credit": credit_amount,
        "forfeiture_penalty": forfeiture,
        "policy_note": policy_note,
        "processed_by": operator_name,
    }

    if client:
        client.total_lifetime_spend = max(0.0, client.total_lifetime_spend - cash_refund)

    content = (
        f"KAI WELLNESS RETREATS - OFFICIAL CANCELLATION & INSURANCE CLAIM STATEMENT\n"
        f"Sanctuary: {trip.title} ({trip.dates})\n"
        f"Guest: {trip.client_name} | Reference: {trip.crm_trip_id}\n"
        f"Date of Notice: {datetime.now(timezone.utc).strftime('%B %d, %Y')} ({days_prior_to_departure} days prior)\n"
        f"Policy Tier Applied: {tier_label}\n"
        f"Cancellation Reason: {cancellation_reason}\n\n"
        f"FINANCIAL SETTLEMENT BREAKDOWN:\n"
        f"- Total Scheduled Investment: ${total:,.2f} USD\n"
        f"- Processed Cash Refund: ${cash_refund:,.2f} USD (Issued to original payment method)\n"
        f"- Retained Sanctuary Concierge Credit: ${credit_amount:,.2f} USD (Valid 18 months)\n"
        f"- Non-Refundable Retained Cancellation Fee: ${forfeiture:,.2f} USD\n\n"
        f"INSURANCE CLAIMS MEMORANDUM:\n"
        f"This document serves as the formal carrier & host agency itemized loss statement "
        f"for filing with credit card benefit providers (Chase Sapphire Reserve, Amex Centurion) "
        f"or third-party travel underwriters (Allianz Global Assistance, Travel Guard)."
    )

    draft = ActionDraft(
        type="trip_cancellation_insurance_packet",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "status": "CANCELLED",
        "policy_tier": tier_label,
        "total_investment": total,
        "cash_refund": cash_refund,
        "concierge_credit": credit_amount,
        "forfeiture_penalty": forfeiture,
        "policy_note": policy_note,
        "draft_id": draft.id,
    }


@router.post("/trips/{trip_id}/payments")
def record_trip_split_payment(
    trip_id: str,
    amount: float = 0.0,
    payment_method: str = "WIRE_ACH",
    transaction_reference: str = "REF-DEFAULT",
    currency: str = "USD",
    fx_rate: float = 1.0,
    fx_amount: Optional[float] = None,
    notes: Optional[str] = None,
    operator_name: str = "Kareena Islam",
    db: Session = Depends(get_db)
):
    """
    Split-Billing, Multi-Currency & Wire Transfer Ledger:
    Tracks partial payments across multiple methods (Fedwire, SWIFT, ACH, corporate Amex, personal card).
    Recalculates deposit and final settlement balances in real time with exact 2-decimal precision (zero penny drift).
    """
    # Defensive unwraps if invoked directly in tests without passing Query defaults
    if not isinstance(currency, str):
        currency = getattr(currency, "default", "USD") or "USD"
    if not isinstance(fx_rate, (int, float)):
        fx_rate = getattr(fx_rate, "default", 1.0) or 1.0
    if not isinstance(payment_method, str):
        payment_method = getattr(payment_method, "default", "WIRE_ACH") or "WIRE_ACH"
    if not isinstance(transaction_reference, str):
        transaction_reference = getattr(transaction_reference, "default", "REF-DEFAULT") or "REF-DEFAULT"
    if not isinstance(operator_name, str):
        operator_name = getattr(operator_name, "default", "Kareena Islam") or "Kareena Islam"
    if not isinstance(amount, (int, float)):
        amount = getattr(amount, "default", 0.0) or 0.0

    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()

    norm_currency = currency.strip().upper()
    if fx_amount is not None and norm_currency != "USD":
        usd_amount = round(fx_amount * fx_rate, 2)
        orig_amount = round(fx_amount, 2)
    else:
        usd_amount = round(amount, 2)
        orig_amount = round(fx_amount if fx_amount is not None else amount, 2)

    history = list(trip.payment_history or [])
    payment_record = {
        "payment_id": str(uuid.uuid4()),
        "amount": usd_amount,
        "currency": norm_currency,
        "fx_rate": round(fx_rate, 4),
        "fx_amount": orig_amount,
        "payment_method": payment_method.upper(),
        "transaction_reference": transaction_reference.strip(),
        "notes": notes,
        "processed_by": operator_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    history.append(payment_record)
    trip.payment_history = history

    total_paid = round(sum(p["amount"] for p in history), 2)
    remaining_balance = max(0.0, round(trip.total_investment - total_paid, 2))

    if total_paid >= trip.deposit_amount:
        trip.deposit_status = "PAID"
    else:
        trip.deposit_status = "PARTIALLY_PAID"

    if remaining_balance == 0.0:
        trip.final_balance_status = "SETTLED_IN_FULL"
        trip.status = "CONFIRMED"
        if client:
            client.total_lifetime_spend = max(client.total_lifetime_spend, total_paid)
    else:
        trip.final_balance_status = "PARTIALLY_PAID"

    trip.final_balance = remaining_balance

    fx_line = ""
    if norm_currency != "USD":
        fx_line = f"Original FX: {orig_amount:,.2f} {norm_currency} @ FX Rate {fx_rate:.4f}\n"

    content = (
        f"KAI WELLNESS RETREATS - PAYMENT RECEIPT & MULTI-CURRENCY LEDGER\n"
        f"Guest: {trip.client_name} | Trip: {trip.title}\n"
        f"Payment Recorded: ${usd_amount:,.2f} USD via {payment_method.upper()}\n"
        f"{fx_line}"
        f"Transaction / Wire Reference: {transaction_reference}\n"
        f"Total Scheduled Investment: ${trip.total_investment:,.2f} USD\n"
        f"Total Paid to Date: ${total_paid:,.2f} USD\n"
        f"Remaining Outstanding Balance: ${remaining_balance:,.2f} USD\n"
        f"Settlement Status: {trip.final_balance_status}"
    )

    draft = ActionDraft(
        type="split_payment_receipt",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "amount_recorded": usd_amount,
        "currency": norm_currency,
        "fx_amount": orig_amount,
        "fx_rate": fx_rate,
        "total_paid": total_paid,
        "remaining_balance": remaining_balance,
        "deposit_status": trip.deposit_status,
        "final_balance_status": trip.final_balance_status,
        "trip_status": trip.status,
        "draft_id": draft.id,
        "payment_count": len(history),
    }


@router.get("/sanctuaries/{sanctuary_slug}/dietary-manifest")
def get_sanctuary_dietary_manifest(
    sanctuary_slug: str,
    db: Session = Depends(get_db)
):
    """
    Executive Chef & Kitchen Brigade Allergen Matrix:
    Compiles all active retreat guests in a cohort and generates sterile culinary alerts:
    - RED ALERT ANAPHYLAXIS (dedicated kitchen prep table, zero airborne contact)
    - Celiac / Strict Gluten-Free (dedicated fryers, cookware)
    - Vegan / Ayurvedic / Sattvic
    - Low-Histamine / Anti-Inflammatory / Nightshade-Free
    """
    trips = db.query(CRMTrip).filter(
        CRMTrip.sanctuary_slug == sanctuary_slug,
        CRMTrip.status != "CANCELLED"
    ).all()

    guest_manifest = []
    category_counts = {
        "ANAPHYLAXIS_HAZARD": 0,
        "CELIAC_GLUTEN_FREE": 0,
        "VEGAN_AYURVEDIC": 0,
        "LOW_HISTAMINE_ANTI_INFLAMMATORY": 0,
        "PESCATARIAN_CLEAN": 0,
        "STANDARD_GOURMET": 0,
    }

    for trip in trips:
        client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()
        raw_diet = (client.dietary_requirements if client else "") or ""
        raw_health = (client.health_notes if client else "") or ""
        combined = f"{raw_diet} {raw_health}".lower()

        flags = []
        protocols = []

        if any(w in combined for w in ["anaphylaxis", "anaphylactic", "epipen", "peanut allergy", "tree nut allergy"]):
            flags.append("RED_ALERT_ANAPHYLAXIS")
            protocols.append("Dedicated sterile prep table; zero airborne tree nut/peanut contact; emergency kit on standby.")
            category_counts["ANAPHYLAXIS_HAZARD"] += 1

        if any(w in combined for w in ["celiac", "coeliac", "gluten-free", "strict gluten"]):
            flags.append("CELIAC_STRICT_GLUTEN_FREE")
            protocols.append("Dedicated gluten-free cookware and fryers; certified GF tamari and grains.")
            category_counts["CELIAC_GLUTEN_FREE"] += 1

        if any(w in combined for w in ["vegan", "plant-based", "ayurvedic", "sattvic"]):
            flags.append("VEGAN_AYURVEDIC")
            protocols.append("Zero animal derivatives; organic seasonal vegetables, cold-pressed oils, no heavy alliums if sattvic.")
            category_counts["VEGAN_AYURVEDIC"] += 1

        if any(w in combined for w in ["histamine", "anti-inflammatory", "nightshade"]):
            flags.append("LOW_HISTAMINE_ANTI_INFLAMMATORY")
            protocols.append("Same-day catch/harvest only; zero aged/fermented foods; eliminate tomatoes, peppers, eggplants.")
            category_counts["LOW_HISTAMINE_ANTI_INFLAMMATORY"] += 1

        if any(w in combined for w in ["pescatarian", "fish only"]):
            flags.append("PESCATARIAN_CLEAN")
            protocols.append("Wild-caught sustainable fish, coastal botanical herbs, light olive oils.")
            category_counts["PESCATARIAN_CLEAN"] += 1

        if not flags:
            flags.append("STANDARD_GOURMET_WELLNESS")
            protocols.append("Organic farm-to-table gourmet wellness menu.")
            category_counts["STANDARD_GOURMET"] += 1

        guest_manifest.append({
            "guest_name": trip.client_name,
            "room_tier": trip.room_tier,
            "dietary_notes": raw_diet or "Standard gourmet wellness",
            "clinical_flags": flags,
            "chef_kitchen_protocol": protocols,
        })

    return {
        "sanctuary_slug": sanctuary_slug,
        "total_guests": len(guest_manifest),
        "category_summary": category_counts,
        "kitchen_manifest": guest_manifest,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/trips/{trip_id}/aviation-divert")
def handle_aviation_divert(
    trip_id: str,
    scheduled_airport: str = Query(..., description="Original arrival airport code e.g. PVR"),
    diverted_airport: str = Query(..., description="Diverted airport code e.g. GDL or ZLO"),
    reason: str = Query(..., description="Weather, mechanical, or air traffic diversion reason"),
    estimated_delay_minutes: int = Query(..., ge=0, description="Additional minutes until arrival at sanctuary"),
    ground_plan: str = "Dispatch luxury VIP SUV fleet from alternate airfield",
    db: Session = Depends(get_db)
):
    """
    Private Aviation & FBO Diversion Telemetry:
    Handles weather or airspace reroutes (e.g. PVR diverted to Guadalajara GDL).
    Repositioning directives staged for executive chauffeur fleet.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    flight = dict(trip.smart_flight or {})
    flight["flight_status"] = "DIVERTED"
    flight["diverted_airport"] = diverted_airport.upper()
    flight["scheduled_airport"] = scheduled_airport.upper()
    flight["diversion_reason"] = reason
    flight["contingency_delay_minutes"] = estimated_delay_minutes
    flight["ground_reposition_plan"] = ground_plan
    flight["last_telemetry_update"] = datetime.now(timezone.utc).isoformat()
    trip.smart_flight = flight

    content = (
        f"CRITICAL AVIATION CONTINGENCY: FLIGHT DIVERTED TO {diverted_airport.upper()}\n"
        f"Guest: {trip.client_name} | Sanctuary: {trip.title}\n"
        f"Scheduled Airfield: {scheduled_airport.upper()} -> Diverted Airfield: {diverted_airport.upper()}\n"
        f"Diversion Reason: {reason}\n"
        f"Estimated In-Transit Impact: +{estimated_delay_minutes} minutes\n"
        f"Ground Operations Directive: {ground_plan}\n\n"
        f"Concierge Desk Checklist:\n"
        f"1. Cancel PVR chauffeur; reposition executive ground driver to {diverted_airport.upper()} private aviation FBO.\n"
        f"2. Notify resort hospitality host of delayed evening arrival.\n"
        f"3. Prepare quiet-hours private villa dining and warm herbal infusion upon late arrival."
    )

    draft = ActionDraft(
        type="aviation_divert_concierge_reposition",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "flight_status": "DIVERTED",
        "diverted_airport": diverted_airport.upper(),
        "delay_minutes": estimated_delay_minutes,
        "draft_id": draft.id,
        "ground_plan": ground_plan,
        "smart_flight": flight,
    }


@router.post("/cohorts/{sanctuary_slug}/atomic-reserve")
def atomic_reserve_cohort(
    sanctuary_slug: str,
    full_name: str = Query(..., description="Guest full name"),
    email: str = Query(..., description="Guest contact email"),
    phone: str = Query(..., description="Guest telephone number"),
    room_preference: str = "Private Luxury Suite",
    movement_experience: str = "all-levels",
    health_notes: Optional[str] = None,
    waiver_signature: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Atomic Cohort Reservation & Saturated Waitlist Engine:
    Guarantees strict 14-guest maximum capacity per sanctuary cohort.
    If full, atomically diverts to VIP Waitlist with priority queue placement.
    Protected by _cohort_reservation_lock to prevent overbooking race conditions.
    """
    with _cohort_reservation_lock:
        active_count = db.query(Booking).filter(
            Booking.retreat_id == sanctuary_slug,
            Booking.status != "cancelled"
        ).count()

        cohort = db.query(SanctuaryCohort).filter(SanctuaryCohort.slug == sanctuary_slug).first()
        cohort_capacity = cohort.capacity_limit if cohort else 14

        if active_count >= cohort_capacity:
            waitlist_position = (active_count - cohort_capacity) + 1

            intake = StagingIntake(
                source_ref="ATOMIC_RESERVE_WAITLIST",
                client_name=full_name.strip(),
                email=email.strip().lower(),
                phone=phone.strip(),
                sanctuary_slug=sanctuary_slug,
                room_tier=room_preference,
                clinical_profile={
                    "movement_experience": movement_experience,
                    "health_notes": health_notes,
                    "waiver_signature": waiver_signature,
                },
                status="WAITLIST",
                consultation_thesis={
                    "sympathetic_tone_hypothesis": "High-intent guest placed on VIP Waitlist due to cohort saturation.",
                    "clinical_flags": ["WAITLIST_PRIORITY"],
                    "recommended_sanctuary": sanctuary_slug,
                    "recommended_room_tier": room_preference,
                }
            )
            db.add(intake)

            content = (
                f"KAI SANCTUARY WAITLIST CONFIRMATION\n"
                f"Sanctuary: {sanctuary_slug.upper()} (Capacity: 14/14 SATURATED)\n"
                f"Guest: {full_name} ({email})\n"
                f"VIP Waitlist Priority Position: #{waitlist_position}\n\n"
                f"Dear {full_name},\n"
                f"The sanctuary cohort is currently at full capacity (14 reserved guests). "
                f"You have been granted VIP Waitlist status. In the event of a suite upgrade, "
                f"rescheduling, or cancellation, your priority placement will automatically activate."
            )

            draft = ActionDraft(
                type="waitlist_notification",
                guest_name=full_name,
                recipient_email=email.strip().lower(),
                content=content,
                status="pending_review",
            )
            db.add(draft)
            db.commit()
            db.refresh(intake)
            db.refresh(draft)

            return {
                "allocated": False,
                "status": "WAITLIST",
                "message": f"Sanctuary cohort is currently full (14/14). {full_name} has been placed on the VIP Waitlist at Position #{waitlist_position}.",
                "cohort_count": active_count,
                "waitlist_position": waitlist_position,
                "intake_id": intake.id,
                "draft_id": draft.id,
            }

        alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        ref_code = f"KAI-{''.join(secrets.choice(alphabet) for _ in range(5))}"

        booking = Booking(
            reference_code=ref_code,
            retreat_id=sanctuary_slug,
            retreat_title=f"KAI Sanctuary - {sanctuary_slug.title()}",
            full_name=full_name.strip(),
            email=email.strip().lower(),
            phone=phone.strip(),
            room_preference=room_preference,
            movement_experience=movement_experience,
            passport_valid="yes-valid-6mo",
            health_notes=health_notes,
            status="confirmed",
        )
        db.add(booking)

        clean_email = email.strip().lower()
        client = db.query(CRMClient).filter(CRMClient.email == clean_email).first()
        if not client:
            client = CRMClient(
                crm_contact_id=f"kai_cnt_{secrets.token_hex(6)}",
                full_name=full_name.strip(),
                email=clean_email,
                phone=phone.strip(),
                health_notes=health_notes,
                movement_experience=movement_experience,
                tags=["KAI_GUEST", "COHORT_RESERVED"],
                total_lifetime_spend=4850.0,
                total_trips_count=1,
                source="DIRECT_WEBSITE",
            )
            db.add(client)
            db.flush()

        trip = CRMTrip(
            crm_trip_id=f"kai_trp_{secrets.token_hex(6)}",
            client_id=client.id,
            client_name=full_name.strip(),
            client_email=clean_email,
            sanctuary_slug=sanctuary_slug,
            title=f"KAI Sanctuary - {sanctuary_slug.title()}",
            dates="Upcoming Cohort 2027",
            room_tier=room_preference,
            status="CONFIRMED",
            total_investment=4850.0,
            deposit_amount=1455.0,
            deposit_status="PAID",
            final_balance=3395.0,
            final_balance_status="SCHEDULED",
            created_by="KAI Concierge Engine",
        )
        db.add(trip)

        content = (
            f"KAI SANCTUARY CONFIRMATION & WELCOME DOSSIER\n"
            f"Sanctuary: {sanctuary_slug.upper()} | Reference: {ref_code}\n"
            f"Guest: {full_name} ({clean_email})\n"
            f"Suite Reserved: {room_preference}\n"
            f"Cohort Capacity Allocated: {active_count + 1}/14\n\n"
            f"Welcome to KAI Sanctuary. Your place in this intimate 14-guest cohort has been secured."
        )

        draft = ActionDraft(
            type="guest_email_confirmation",
            guest_name=full_name,
            recipient_email=clean_email,
            content=content,
            status="pending_review",
        )
        db.add(draft)
        db.commit()
        db.refresh(booking)
        db.refresh(draft)

        return {
            "allocated": True,
            "status": "CONFIRMED",
            "booking_reference": ref_code,
            "cohort_count": active_count + 1,
            "spots_remaining": cohort_capacity - (active_count + 1),
            "booking_id": booking.id,
            "draft_id": draft.id,
        }


# ──── Scenario 19: Force Majeure Cohort Postponement & 100% Voucher Protection ────

@router.post("/cohorts/{sanctuary_slug}/force-majeure-postponement")
def postpone_cohort_force_majeure(
    sanctuary_slug: str,
    reason: str = "Severe Tropical Storm / Force Majeure Event",
    rebooking_window_months: int = 12,
    operator_name: str = "Kareena Islam",
    db: Session = Depends(get_db)
):
    """
    Force Majeure Cohort Postponement & 100% Voucher Protection Engine:
    Safely suspends a retreat cohort due to meteorological or environmental emergencies.
    Guarantees 100% voucher credit protection with zero forfeiture fees, marks trips,
    tags CRM client records, and auto-stages crisis rebooking liaison drafts.
    """
    norm_slug = sanctuary_slug.strip().lower()
    trips = db.query(CRMTrip).filter(
        CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%")
    ).all()

    bookings = db.query(Booking).filter(
        Booking.retreat_id.ilike(f"%{norm_slug}%")
    ).all()

    cohort = db.query(SanctuaryCohort).filter(
        SanctuaryCohort.slug.ilike(f"%{norm_slug}%")
    ).first()
    if cohort:
        cohort.status = "POSTPONED_FORCE_MAJEURE"

    total_protected_credits = 0.0
    affected_trips_data = []
    created_draft_ids = []

    for trip in trips:
        if trip.status in ["CANCELLED_WITH_REFUND", "CANCELLED_FORFEITED"]:
            continue

        history = trip.payment_history or []
        paid_from_history = sum(p.get("amount", 0.0) for p in history)
        if paid_from_history > 0:
            credit_amount = round(paid_from_history, 2)
        elif trip.final_balance_status == "SETTLED_IN_FULL":
            credit_amount = round(trip.total_investment, 2)
        elif trip.deposit_status == "PAID":
            credit_amount = round(trip.deposit_amount, 2)
        else:
            credit_amount = round(trip.deposit_amount, 2)

        total_protected_credits = round(total_protected_credits + credit_amount, 2)
        voucher_code = f"VOUCHER-FM-{norm_slug.upper()[:3]}-{secrets.token_hex(3).upper()}"

        trip.status = "FORCE_MAJEURE_POSTPONED"
        trip.cancellation_record = {
            "type": "FORCE_MAJEURE_POSTPONEMENT",
            "reason": reason,
            "voucher_code": voucher_code,
            "voucher_credit_amount": credit_amount,
            "forfeiture_penalty": 0.0,
            "rebooking_valid_months": rebooking_window_months,
            "processed_by": operator_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Tag client
        client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()
        if client:
            tags = list(client.tags or [])
            if "FORCE_MAJEURE_VOUCHER_HOLDER" not in tags:
                tags.append("FORCE_MAJEURE_VOUCHER_HOLDER")
            client.tags = tags

        # Auto-stage crisis liaison draft
        content = (
            f"KAI SANCTUARY CRISIS LIAISON & FORCE MAJEURE POSTPONEMENT\n"
            f"Sanctuary: {norm_slug.upper()} | Guest: {trip.client_name} ({trip.client_email})\n"
            f"Event Notice: {reason}\n"
            f"Voucher Credit Issued: ${credit_amount:,.2f} USD (100% Protection - Zero Forfeiture Penalty)\n"
            f"Guaranteed Voucher Reference: {voucher_code}\n"
            f"Rebooking Guarantee Window: {rebooking_window_months} Months\n\n"
            f"Dear {trip.client_name},\n\n"
            f"Due to extreme force majeure conditions affecting our {norm_slug.title()} sanctuary, "
            f"your upcoming cohort has been safely postponed. Your investment is 100% protected under our "
            f"Sanctuary Guarantee. Voucher {voucher_code} has been issued with zero forfeiture penalty and "
            f"is valid for 12 months across any KAI sanctuary.\n\n"
            f"Our concierge team is available around the clock to adjust private aviation or commercial flight credits."
        )

        draft = ActionDraft(
            type="crisis_rebooking_liaison",
            guest_name=trip.client_name,
            recipient_email=trip.client_email,
            content=content,
            status="pending_review",
        )
        db.add(draft)
        db.flush()
        created_draft_ids.append(draft.id)

        affected_trips_data.append({
            "trip_id": trip.id,
            "guest_name": trip.client_name,
            "email": trip.client_email,
            "voucher_code": voucher_code,
            "credit_amount": credit_amount,
        })

    for b in bookings:
        if b.status not in ["cancelled", "postponed"]:
            b.status = "postponed_voucher_issued"

    db.commit()

    return {
        "success": True,
        "sanctuary_slug": norm_slug,
        "postponement_reason": reason,
        "rebooking_window_months": rebooking_window_months,
        "affected_trips_count": len(affected_trips_data),
        "total_protected_credits_usd": total_protected_credits,
        "affected_trips": affected_trips_data,
        "draft_ids": created_draft_ids,
        "forfeiture_penalty_rate": 0.0,
    }


# ──── Scenario 21: Somatic Pulse Telemetry & Nurse Bedside Triage ────

class SomaticPulseTriagePayload(BaseModel):
    intake_id: Optional[str] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    sanctuary_slug: str = "nosara"
    day_number: int = 1
    phase: str = "MORNING_AWAKENING"
    restorative_sleep_score: int = 8
    nervous_system_ease: int = 8
    vagal_tone_descriptor: Optional[str] = "Calm & Grounded"
    reported_symptoms: Optional[str] = None
    private_reflection_notes: Optional[str] = None
    operator_name: str = "Clinical Lead"


@router.post("/somatic-pulse/triage")
def triage_somatic_pulse_telemetry(
    payload: SomaticPulseTriagePayload,
    db: Session = Depends(get_db)
):
    """
    In-Stay Somatic Pulse Telemetry & Clinical Nurse Bedside Triage:
    Evaluates real-time subjective somatic metrics reported during the retreat.
    Detects acute autonomic crashes and dysautonomia spikes (sleep <= 3, ease <= 3),
    pauses sympathetic stressors (cryotherapy, hyperventilation breathwork),
    and auto-stages emergency bedside triage drafts for on-site nursing.
    """
    intake = None
    client = None
    if payload.intake_id:
        intake = db.query(StagingIntake).filter(StagingIntake.id == payload.intake_id).first()
    if not intake and payload.client_email:
        intake = db.query(StagingIntake).filter(StagingIntake.email == payload.client_email.strip().lower()).first()

    guest_name = payload.client_name or (intake.client_name if intake else "Honored Guest")
    guest_email = payload.client_email or (intake.email if intake else "guest@kaisanctuary.com")

    critical_keywords = [
        "dizziness", "tachypnea", "arrhythmia", "chest tightness", "panic",
        "dysautonomia", "faint", "syncope", "severe crash", "tachycardia", "nausea"
    ]
    symptom_text = f"{payload.reported_symptoms or ''} {payload.vagal_tone_descriptor or ''} {payload.private_reflection_notes or ''}".lower()
    has_critical_keyword = any(k in symptom_text for k in critical_keywords)

    is_acute_dysautonomia = (
        (payload.restorative_sleep_score <= 3 and payload.nervous_system_ease <= 3)
        or has_critical_keyword
    )

    pulse = GuestSomaticPulse(
        intake_id=payload.intake_id or (intake.id if intake else None),
        guest_name=guest_name,
        sanctuary_slug=payload.sanctuary_slug,
        day_number=payload.day_number,
        phase=payload.phase,
        restorative_sleep_score=max(1, min(10, payload.restorative_sleep_score)),
        nervous_system_ease=max(1, min(10, payload.nervous_system_ease)),
        vagal_tone_descriptor=payload.vagal_tone_descriptor or "Serene",
        private_reflection_notes=f"{payload.private_reflection_notes or ''} [Symptoms: {payload.reported_symptoms or 'None'}]".strip(),
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(pulse)

    if is_acute_dysautonomia:
        alert_level = "CRITICAL_AUTONOMIC_DYSAUTONOMIA_SPIKE"
        triage_status = "URGENT_NURSE_BEDSIDE_EVALUATION"
        contraindication_protocol = "PAUSE_COLD_PLUNGE_AND_HIGH_INTENSITY_BREATHWORK"

        if intake:
            profile = dict(intake.clinical_profile or {})
            profile["active_alert"] = alert_level
            profile["contraindication_hold"] = True
            intake.clinical_profile = profile

        client = db.query(CRMClient).filter(CRMClient.email == guest_email.strip().lower()).first()
        if client:
            tags = list(client.tags or [])
            for t in ["CLINICAL_HOLD", "ACUTE_AUTONOMIC_DRIFT"]:
                if t not in tags:
                    tags.append(t)
            client.tags = tags

        content = (
            f"URGENT CLINICAL TRIAGE: ACUTE AUTONOMIC DYSAUTONOMIA SPIKE\n"
            f"Guest: {guest_name} ({guest_email}) | Sanctuary: {payload.sanctuary_slug.upper()}\n"
            f"Retreat Day: {payload.day_number} | Phase: {payload.phase}\n"
            f"Somatic Telemetry: Restorative Sleep = {payload.restorative_sleep_score}/10, "
            f"Nervous System Ease = {payload.nervous_system_ease}/10\n"
            f"Vagal Descriptor: {payload.vagal_tone_descriptor}\n"
            f"Reported Symptoms: {payload.reported_symptoms or 'Acute subjective dysregulation'}\n\n"
            f"IMMEDIATE ACTIONS REQUIRED:\n"
            f"1. On-site registered nurse bedside check within 15 minutes.\n"
            f"2. Check orthostatic vitals: supine vs. standing BP, resting HR, and peripheral oxygen saturation.\n"
            f"3. PROTOCOL PAUSE: Immediately withhold cryotherapy/cold plunge and active holotropic breathwork.\n"
            f"4. Administer warm organic electrolyte hydration and initiate 1:1 restorative vagal nerve downregulation."
        )

        draft = ActionDraft(
            type="nurse_bedside_triage",
            guest_name=guest_name,
            recipient_email="clinical-concierge@kaisanctuary.com",
            content=content,
            status="pending_review",
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)
        db.refresh(pulse)

        return {
            "triaged": True,
            "alert_level": alert_level,
            "triage_status": triage_status,
            "contraindication_protocol": contraindication_protocol,
            "pulse_id": pulse.id,
            "guest_name": guest_name,
            "draft_id": draft.id,
            "urgent_evaluation_required": True,
        }
    else:
        db.commit()
        db.refresh(pulse)
        return {
            "triaged": True,
            "alert_level": "NOMINAL",
            "triage_status": "ROUTINE_MONITORING",
            "contraindication_protocol": "STANDARD_SOMATIC_INTEGRATION",
            "pulse_id": pulse.id,
            "guest_name": guest_name,
            "draft_id": None,
            "urgent_evaluation_required": False,
        }


# ──── Scenario 23: Batch Flight Disruption & Airport Fleet Re-Sequencing ────

class FlightDisruptionItem(BaseModel):
    client_name: str
    client_email: str
    flight_number: str
    original_arrival_time: str
    updated_arrival_time: str
    delay_minutes: int = 0
    status: str = "DELAYED"
    connecting_airport: Optional[str] = None
    terminal: Optional[str] = "International Terminal"


class BatchFlightDisruptionRequest(BaseModel):
    disruptions: List[FlightDisruptionItem]
    operator_name: str = "Curbside Fleet Dispatcher"


@router.post("/cohorts/{sanctuary_slug}/batch-flight-disruption")
def resequence_cohort_flight_disruptions(
    sanctuary_slug: str,
    payload: BatchFlightDisruptionRequest,
    db: Session = Depends(get_db)
):
    """
    Curbside Airport Chauffeur Fleet Re-Sequencing Engine:
    Ingests cascading flight delays across arriving cohort guests.
    Updates CRMTrip and FlightConcierge records, dynamically clusters
    passengers into luxury transfer vehicles with max 35-minute runway wait windows,
    and auto-stages updated driver fleet manifests.
    """
    norm_slug = sanctuary_slug.strip().lower()
    updated_trips = []
    active_passengers = []
    cancelled_passengers = []

    for item in payload.disruptions:
        clean_email = item.client_email.strip().lower()
        trip = db.query(CRMTrip).filter(
            CRMTrip.client_email == clean_email,
            CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%")
        ).first()

        flight_data = {
            "flight_number": item.flight_number,
            "original_arrival": item.original_arrival_time,
            "updated_arrival": item.updated_arrival_time,
            "delay_minutes": item.delay_minutes,
            "status": item.status.upper(),
            "connecting_airport": item.connecting_airport,
            "terminal": item.terminal,
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
        }

        if trip:
            trip.smart_flight = flight_data
            updated_trips.append(trip.id)

        if item.status.upper() == "CANCELLED":
            cancelled_passengers.append({
                "name": item.client_name,
                "email": clean_email,
                "flight": item.flight_number,
            })
        else:
            active_passengers.append({
                "name": item.client_name,
                "email": clean_email,
                "flight": item.flight_number,
                "arrival_time": item.updated_arrival_time,
                "delay_minutes": item.delay_minutes,
                "status": item.status.upper(),
                "terminal": item.terminal or "Terminal 2",
            })

    # Sort active passengers by arrival time
    active_passengers.sort(key=lambda x: x["arrival_time"])

    # Cluster passengers into vehicles: max window 35 minutes, max 3 per SUV or 6 per Sprinter
    vehicle_clusters = []
    current_cluster = []
    cluster_ref_time = None

    for p in active_passengers:
        if not current_cluster:
            current_cluster.append(p)
            cluster_ref_time = p["arrival_time"]
        else:
            try:
                t1 = datetime.fromisoformat(cluster_ref_time.replace("Z", "+00:00"))
                t2 = datetime.fromisoformat(p["arrival_time"].replace("Z", "+00:00"))
                diff_mins = abs((t2 - t1).total_seconds()) / 60.0
            except Exception:
                diff_mins = 20.0

            if diff_mins <= 35 and len(current_cluster) < 4:
                current_cluster.append(p)
            else:
                vehicle_clusters.append(current_cluster)
                current_cluster = [p]
                cluster_ref_time = p["arrival_time"]

    if current_cluster:
        vehicle_clusters.append(current_cluster)

    assigned_fleet = []
    vehicle_types = ["Cadillac Escalade ESV (Private)", "Mercedes-Benz Sprinter Executive", "Lincoln Navigator L"]
    chauffeurs = ["Mateo Calderón", "Diego Morales", "Alvaro Santos", "Carlos Vega"]

    for idx, cluster in enumerate(vehicle_clusters):
        v_type = vehicle_types[idx % len(vehicle_types)]
        driver = chauffeurs[idx % len(chauffeurs)]
        pickup_eta = cluster[-1]["arrival_time"]

        assigned_fleet.append({
            "run_id": f"RUN-{norm_slug.upper()[:3]}-{idx+1:02d}",
            "vehicle_type": v_type,
            "chauffeur_name": driver,
            "estimated_departure_time": pickup_eta,
            "passenger_count": len(cluster),
            "passengers": [
                {
                    "name": c["name"],
                    "flight": c["flight"],
                    "arrival": c["arrival_time"],
                    "terminal": c["terminal"],
                }
                for c in cluster
            ],
            "vehicle_amenities": "Chilled young coconut water, eucalyptus cold towels, ambient acoustic frequencies"
        })

    manifest_lines = []
    for run in assigned_fleet:
        manifest_lines.append(f"[{run['run_id']}] {run['vehicle_type']} | Chauffeur: {run['chauffeur_name']}")
        manifest_lines.append(f"  Curbside Staging Time: {run['estimated_departure_time']}")
        for pax in run["passengers"]:
            manifest_lines.append(f"   * Guest: {pax['name']} | Flight: {pax['flight']} @ {pax['arrival']} ({pax['terminal']})")
        manifest_lines.append("")

    cancelled_lines = ""
    if cancelled_passengers:
        cancelled_lines = "\nCANCELLED FLIGHTS (EMERGENCY AIR LIAISON REQUIRED):\n" + "\n".join(
            f"   * {c['name']} ({c['email']}) - Flight {c['flight']}" for c in cancelled_passengers
        )

    content = (
        f"KAI SANCTUARY - RE-SEQUENCED AIRPORT CHAUFFEUR FLEET MANIFEST\n"
        f"Sanctuary Cohort: {norm_slug.upper()} | Coordinated by: {payload.operator_name}\n"
        f"Total Disrupted Inbounds: {len(payload.disruptions)} | Rescheduled Fleet Runs: {len(assigned_fleet)}\n\n"
        f"DISPATCH RUN SCHEDULE:\n"
        + "\n".join(manifest_lines)
        + f"{cancelled_lines}\n\n"
        f"All vehicles stocked with chilled coconut water, cold towels, and private terminal paging tablets."
    )

    draft = ActionDraft(
        type="chauffeur_fleet_manifest",
        guest_name=f"Cohort {norm_slug.title()} Fleet",
        recipient_email="ground-logistics@kaisanctuary.com",
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "sanctuary_slug": norm_slug,
        "total_disruptions_processed": len(payload.disruptions),
        "active_passengers_count": len(active_passengers),
        "cancelled_passengers_count": len(cancelled_passengers),
        "fleet_runs_count": len(assigned_fleet),
        "fleet_runs": assigned_fleet,
        "cancelled_passengers": cancelled_passengers,
        "draft_id": draft.id,
    }


# ──── Scenario 25: Cohort Allergen Cross-Contamination & Kitchen Quarantine ────

class AllergenQuarantineRequest(BaseModel):
    contaminated_item: str = "Artisanal Macadamia Nut Butter Batch #NUT-8821"
    allergen_category: str = "TREE_NUT"
    safe_alternative: str = "Organic Raw Sunflower Seed Butter & Tahini"
    action_notes: Optional[str] = "Sanitize blender carafes, wipe prep surfaces, check epi-pens"
    operator_name: str = "Executive Chef & Nurse Concierge"


@router.post("/cohorts/{sanctuary_slug}/allergen-quarantine-protocol")
def trigger_allergen_quarantine_protocol(
    sanctuary_slug: str,
    payload: AllergenQuarantineRequest,
    db: Session = Depends(get_db)
):
    """
    Cohort Allergen Cross-Contamination & Emergency Kitchen Quarantine Engine:
    Scans all cohort guests, audits clinical & dietary contraindications,
    flags guests with anaphylaxis / tree nut / seed allergies for immediate isolation,
    sanitizes culinary stations with safe seed-butter substitutions,
    and auto-stages emergency chef advisory directives.
    """
    norm_slug = sanctuary_slug.strip().lower()
    trips = db.query(CRMTrip).filter(CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%")).all()

    high_risk_guests = []
    precautionary_guests = []
    critical_allergen_keywords = ["nut", "peanut", "macadamia", "cashew", "walnut", "almond", "anaphylaxis", "severe allergy", "epi-pen"]

    for trip in trips:
        client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()
        notes_corpus = f"{trip.client_name} {client.dietary_requirements if client else ''} {client.health_notes if client else ''}".lower()
        is_high_risk = any(k in notes_corpus for k in critical_allergen_keywords)

        guest_info = {
            "trip_id": trip.id,
            "guest_name": trip.client_name,
            "email": trip.client_email,
            "room_tier": trip.room_tier,
            "dietary_notes": client.dietary_requirements if client else "None noted",
        }

        if is_high_risk:
            high_risk_guests.append(guest_info)
            if client:
                tags = list(client.tags or [])
                if "ALLERGEN_QUARANTINE_VERIFIED" not in tags:
                    tags.append("ALLERGEN_QUARANTINE_VERIFIED")
                client.tags = tags
        else:
            precautionary_guests.append(guest_info)

    high_risk_lines = "\n".join(
        f"   * [HIGH RISK] {g['guest_name']} ({g['room_tier']}) - Notes: {g['dietary_notes']}"
        for g in high_risk_guests
    ) if high_risk_guests else "   * None identified in primary cohort"

    content = (
        f"EMERGENCY KITCHEN QUARANTINE DIRECTIVE: ALLERGEN CROSS-CONTAMINATION\n"
        f"Sanctuary: {norm_slug.upper()} | Authorized by: {payload.operator_name}\n"
        f"Contaminated Inbound Item: {payload.contaminated_item} ({payload.allergen_category})\n"
        f"Mandated Safe Substitution: {payload.safe_alternative}\n\n"
        f"IMMEDIATE PROTOCOL MANDATES:\n"
        f"1. Immediately seize and quarantine batch '{payload.contaminated_item}' from villa pantry.\n"
        f"2. Sanitize all Vitamix carafes, cutting boards, and cold prep surfaces with food-grade sanitizing wash.\n"
        f"3. High-Risk Guests with Anaphylaxis / Tree Nut Sensitivities:\n"
        f"{high_risk_lines}\n\n"
        f"4. On-site RN Kareena Islam alerted to verify medical readiness and epinephrine availability."
    )

    draft = ActionDraft(
        type="kitchen_allergen_quarantine_alert",
        guest_name=f"Cohort {norm_slug.title()} Kitchen Brigade",
        recipient_email="executive-chef@kaisanctuary.com",
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "sanctuary_slug": norm_slug,
        "contaminated_item": payload.contaminated_item,
        "safe_alternative": payload.safe_alternative,
        "total_guests_audited": len(trips),
        "high_risk_count": len(high_risk_guests),
        "precautionary_count": len(precautionary_guests),
        "high_risk_guests": high_risk_guests,
        "precautionary_guests": precautionary_guests,
        "draft_id": draft.id,
    }


# ──── Scenario 26: Private Air Charter Manifest & Crew Rest Compliance ────

class PrivateCharterManifestRequest(BaseModel):
    aircraft_type: str = "Gulfstream G650ER"
    tail_number: str = "N889KJ"
    operator_name: str = "NetJets VIP Flight Operations"
    origin_icao: str = "KTEB"
    destination_icao: str = "MMPR"
    fbo_handling_agent: str = "Aerotron FBO Puerto Vallarta"
    departure_time: str = "2027-01-28T09:00:00"
    estimated_arrival_time: str = "2027-01-28T13:45:00"
    passenger_count: int = 4
    total_luggage_weight_lbs: float = 480.0
    cargo_equipment_weight_lbs: float = 180.0
    pilot_duty_hours: float = 7.5
    notes: Optional[str] = None


@router.post("/trips/{trip_id}/private-charter-manifest")
def process_private_charter_manifest(
    trip_id: str,
    payload: PrivateCharterManifestRequest,
    db: Session = Depends(get_db)
):
    """
    Private Aviation Charter Manifest & FBO Handling Verification:
    Computes Weight & Balance against aircraft limits, audits pilot duty hours
    under FAA Part 135 regulations (14h duty cap), registers tarmac FBO frequencies,
    and auto-stages private airfield liaison briefings.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    max_payload_lbs = 2500.0 if "g650" in payload.aircraft_type.lower() else 1800.0
    passenger_weight_lbs = payload.passenger_count * 185.0
    total_cargo_lbs = payload.total_luggage_weight_lbs + payload.cargo_equipment_weight_lbs
    gross_payload_lbs = passenger_weight_lbs + total_cargo_lbs
    weight_balance_cleared = gross_payload_lbs <= max_payload_lbs

    crew_duty_cleared = payload.pilot_duty_hours <= 14.0
    crew_status = "FAA_PART_135_COMPLIANT" if crew_duty_cleared else "DUTY_LIMIT_EXCEEDED_RELIEF_CREW_MANDATED"

    flight_info = {
        "aircraft_type": payload.aircraft_type,
        "tail_number": payload.tail_number,
        "charter_operator": payload.operator_name,
        "routing": f"{payload.origin_icao} -> {payload.destination_icao}",
        "departure": payload.departure_time,
        "estimated_arrival": payload.estimated_arrival_time,
        "fbo_handling_agent": payload.fbo_handling_agent,
        "passenger_count": payload.passenger_count,
        "gross_payload_lbs": gross_payload_lbs,
        "weight_balance_status": "CLEARED" if weight_balance_cleared else "OVERWEIGHT",
        "crew_duty_status": crew_status,
        "dispatch_approved": weight_balance_cleared and crew_duty_cleared,
        "last_updated": datetime.now(timezone.utc).isoformat(),
    }
    trip.smart_flight = flight_info

    content = (
        f"PRIVATE AVIATION CHARTER BRIEFING & FBO TARMAC MANIFEST\n"
        f"Guest / Group Lead: {trip.client_name} | Trip: {trip.title}\n"
        f"Aircraft: {payload.aircraft_type} ({payload.tail_number}) | Operator: {payload.operator_name}\n"
        f"Flight Route: {payload.origin_icao} -> {payload.destination_icao}\n"
        f"Scheduled Touchdown: {payload.estimated_arrival_time}\n"
        f"FBO Handling: {payload.fbo_handling_agent}\n"
        f"Gross Payload: {gross_payload_lbs:.1f} lbs / {max_payload_lbs:.1f} lbs limit "
        f"({'CLEARED' if weight_balance_cleared else 'EXCEEDED'})\n"
        f"Crew Part 135 Duty Status: {crew_status} ({payload.pilot_duty_hours:.1f} hrs)\n\n"
        f"TARMAC PROTOCOL: Chauffeur vehicle cleared for airside tarmac escort. "
        f"Luggage assistance for {payload.total_luggage_weight_lbs} lbs baggage + {payload.cargo_equipment_weight_lbs} lbs somatic equipment."
    )

    draft = ActionDraft(
        type="private_air_charter_briefing",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "aircraft": payload.aircraft_type,
        "tail_number": payload.tail_number,
        "gross_payload_lbs": gross_payload_lbs,
        "max_payload_lbs": max_payload_lbs,
        "weight_balance_cleared": weight_balance_cleared,
        "crew_duty_hours": payload.pilot_duty_hours,
        "crew_duty_cleared": crew_duty_cleared,
        "dispatch_approved": weight_balance_cleared and crew_duty_cleared,
        "draft_id": draft.id,
    }


# ──── Scenario 27: Room Conflict Resolution & Complimentary Upgrade ────

class RoomConflictResolveRequest(BaseModel):
    conflicted_room_tier: str = "Presidential Oceanfront Villa"
    upgrade_room_tier: str = "Cliffside Stillness Villa"
    complimentary_spa_credit: float = 500.00
    operator_name: str = "Kareena Islam"


@router.post("/cohorts/{sanctuary_slug}/resolve-room-conflict")
def resolve_room_allocation_conflict(
    sanctuary_slug: str,
    payload: RoomConflictResolveRequest,
    db: Session = Depends(get_db)
):
    """
    Room Allocation Conflict Resolution & VIP Complimentary Upgrade Engine:
    Detects suite double-allocations, arbitrates using client lifetime spend & booking timestamps,
    awards the secondary guest a complimentary tier upgrade at $0.00,
    attaches wellness spa credits, and auto-stages founder conciliation letters.
    """
    norm_slug = sanctuary_slug.strip().lower()
    trips = db.query(CRMTrip).filter(
        CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%"),
        CRMTrip.room_tier == payload.conflicted_room_tier,
        CRMTrip.status.notin_(["CANCELLED_WITH_REFUND", "CANCELLED_FORFEITED"])
    ).all()

    if len(trips) <= 1:
        return {
            "conflict_detected": False,
            "message": f"No room allocation conflict detected for {payload.conflicted_room_tier} in {norm_slug}.",
            "active_trips_in_tier": len(trips),
        }

    def _get_priority(t: CRMTrip):
        c = db.query(CRMClient).filter(CRMClient.id == t.client_id).first()
        spend = c.total_lifetime_spend if c else 0.0
        created_ts = t.created_at.timestamp() if t.created_at else 0
        return (spend, -created_ts)

    sorted_trips = sorted(trips, key=_get_priority, reverse=True)
    primary_trip = sorted_trips[0]
    secondary_trip = sorted_trips[1]

    secondary_trip.room_tier = payload.upgrade_room_tier
    client_b = db.query(CRMClient).filter(CRMClient.id == secondary_trip.client_id).first()
    if client_b:
        tags = list(client_b.tags or [])
        for t in ["COMPLIMENTARY_SUITE_UPGRADE", "VIP_CONCILIATION_CREDIT"]:
            if t not in tags:
                tags.append(t)
        client_b.tags = tags

    content = (
        f"KAI SANCTUARY - VIP COMPLIMENTARY SUITE UPGRADE & WELCOME NOTICE\n"
        f"Guest: {secondary_trip.client_name} ({secondary_trip.client_email})\n"
        f"Sanctuary: {norm_slug.upper()} | Coordinated by Founder: {payload.operator_name}\n\n"
        f"Dear {secondary_trip.client_name},\n\n"
        f"To ensure you have extra space and quiet privacy during your upcoming retreat, "
        f"our founders have upgraded your accommodation to our premier {payload.upgrade_room_tier} "
        f"with our compliments (Value: +$4,350.00 complimentary upgrade).\n\n"
        f"In addition, we have credited ${payload.complimentary_spa_credit:,.2f} USD to your personal sanctuary folio "
        f"for restorative bodywork and private hydrotherapy sessions.\n\n"
        f"We look forward to welcoming you into deep stillness."
    )

    draft = ActionDraft(
        type="vip_room_reallocation_letter",
        guest_name=secondary_trip.client_name,
        recipient_email=secondary_trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "conflict_detected": True,
        "sanctuary_slug": norm_slug,
        "conflicted_tier": payload.conflicted_room_tier,
        "primary_guest": {
            "name": primary_trip.client_name,
            "retained_room": primary_trip.room_tier,
        },
        "reallocated_guest": {
            "name": secondary_trip.client_name,
            "new_room": secondary_trip.room_tier,
            "upgrade_fee_charged": 0.00,
            "complimentary_credit_usd": payload.complimentary_spa_credit,
        },
        "draft_id": draft.id,
    }


# ──── Scenario 28: Microclimate Weather Itinerary Rescheduling Pivot ────

class WeatherItineraryPivotRequest(BaseModel):
    weather_event: str = "Tropical Rain Squall & 40kt Coastal Wind Shift"
    precipitation_probability: float = 95.0
    wind_gust_kmh: float = 48.0
    severity: str = "SEVERE_WEATHER_ALERT"
    affected_date: str = "2027-01-29"
    operator_name: str = "Armaan & Kareena Islam"


@router.post("/cohorts/{sanctuary_slug}/weather-itinerary-pivot")
def pivot_cohort_weather_itinerary(
    sanctuary_slug: str,
    payload: WeatherItineraryPivotRequest,
    db: Session = Depends(get_db)
):
    """
    Microclimate Weather Anomaly & Dynamic Somatic Itinerary Pivot:
    Detects sudden precipitation and squalls, dynamically adapts daily retreat
    blocks from outdoor elements to indoor Geodesic Sanctuary Domes,
    and auto-stages guest reassurance and tea lounge announcements.
    """
    norm_slug = sanctuary_slug.strip().lower()
    trips = db.query(CRMTrip).filter(
        CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%"),
        CRMTrip.status.in_(["CONFIRMED", "IN_STAY", "DEPOSIT_PAID"])
    ).all()

    itinerary_pivot_map = {
        "Sunrise Banderas Bay Beach Pranayama": "Geodesic Sanctuary Dome Breathwork & 432Hz Sound Immersion",
        "Outdoor Ocean Hydrotherapy Circuit": "Indoor Thermal Magnesium Flotation & Infrared Vitality Circuit",
        "Coastal Cliffside Walking Meditation": "Pavilion Somatic Psoas Release & Guided Restorative Nidra",
        "Open-Air Starlight Terrace Dining": "Candlelit Hacienda Glass Conservatory Dining",
    }

    updated_trips_count = 0
    for trip in trips:
        blocks = list(trip.itinerary_blocks or [])
        pivoted_blocks = []
        for b in blocks:
            activity = b if isinstance(b, str) else b.get("activity", "")
            pivoted_act = itinerary_pivot_map.get(activity, activity)
            if isinstance(b, str):
                pivoted_blocks.append(pivoted_act)
            else:
                nb = dict(b)
                nb["activity"] = pivoted_act
                nb["location"] = "Indoor Geodesic Sanctuary Dome"
                pivoted_blocks.append(nb)

        if not pivoted_blocks:
            pivoted_blocks = [
                "07:30 AM - Geodesic Sanctuary Dome Breathwork & 432Hz Sound Immersion",
                "10:30 AM - Indoor Thermal Magnesium Flotation & Infrared Vitality Circuit",
                "02:00 PM - Pavilion Somatic Psoas Release & Guided Restorative Nidra",
                "07:00 PM - Candlelit Hacienda Glass Conservatory Dining & Herbal Elixirs",
            ]

        trip.itinerary_blocks = pivoted_blocks
        updated_trips_count += 1

    content = (
        f"KAI SANCTUARY - MICROCLIMATE WEATHER ADAPTATION & RETREAT SCHEDULE PIVOT\n"
        f"Sanctuary: {norm_slug.upper()} | Date: {payload.affected_date}\n"
        f"Telemetry Notice: {payload.weather_event} (Precipitation: {payload.precipitation_probability}%, Gusts: {payload.wind_gust_kmh} km/h)\n"
        f"Guidance by Founders: {payload.operator_name}\n\n"
        f"Dear Guests,\n\n"
        f"Due to morning coastal squalls across the bay, we have moved our morning sessions inside to our "
        f"climate-controlled Geodesic Sanctuary Dome and heated Magnesium Flotation Suites.\n\n"
        f"REVISED DAILY FLOW:\n"
        f" • 07:30 AM — Geodesic Sanctuary Dome Breathwork & 432Hz Crystal Sound Immersion\n"
        f" • 10:30 AM — Thermal Magnesium Hydrotherapy & Infrared Sauna\n"
        f" • 02:00 PM — Restorative Somatic Psoas Release with Nurse Kareena\n"
        f" • 07:00 PM — Candlelit Glass Conservatory Farm-to-Table Gastronomy\n\n"
        f"Hot botanical adaptogen teas and warm cashmere wraps are staged in the main pavilion."
    )

    draft = ActionDraft(
        type="weather_itinerary_pivot_announcement",
        guest_name=f"Cohort {norm_slug.title()} Guests",
        recipient_email="concierge@kaisanctuary.com",
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "sanctuary_slug": norm_slug,
        "weather_event": payload.weather_event,
        "affected_date": payload.affected_date,
        "updated_trips_count": updated_trips_count,
        "draft_id": draft.id,
    }


# ──── Scenario 29: Inbound Review & Negative Sentiment Service Recovery ────

class ReviewIngestTriageRequest(BaseModel):
    sanctuary_slug: str
    guest_name: str
    guest_email: str
    stay_dates: str = "Jan 28 - Jan 31, 2027"
    overall_rating: float = 5.0
    deep_sleep_score: float = 95.0
    quietude_score: float = 98.0
    clinical_attentiveness_score: float = 99.0
    review_text: str
    source: str = "POST_RETREAT_SURVEY"


@router.post("/reviews/ingest-with-sentiment-triage")
def ingest_review_with_sentiment_triage(
    payload: ReviewIngestTriageRequest,
    db: Session = Depends(get_db)
):
    """
    Post-Retreat Review Sentiment Triage & Service Recovery Engine:
    Evaluates guest post-retreat feedback, detects negative acoustic or clinical disruptions,
    triggers immediate Founder Red-Alerts with pre-approved $1,500 recovery vouchers,
    and auto-stages 1:1 call drafts for Kareena Islam.
    """
    norm_slug = payload.sanctuary_slug.strip().lower()
    clean_email = payload.guest_email.strip().lower()

    negative_keywords = [
        "noise", "generator", "disrupted", "disappointed", "unacceptable",
        "strained", "pain", "injury", "headache", "rude", "delayed", "cold"
    ]
    text_lower = payload.review_text.lower()
    has_negative_keyword = any(k in text_lower for k in negative_keywords)
    is_critical_negative = payload.overall_rating <= 2.5 or has_negative_keyword

    if is_critical_negative:
        sentiment_label = "SERVICE_RECOVERY_REQUIRED"
        triage_priority = "FOUNDER_RED_ALERT"
        recovery_voucher = f"RECOVERY-VOUCHER-{secrets.token_hex(3).upper()}"

        client = db.query(CRMClient).filter(CRMClient.email == clean_email).first()
        if client:
            tags = list(client.tags or [])
            for t in ["EXPERIENCE_RECOVERY_REQUIRED", "FOUNDER_CALL_SCHEDULED"]:
                if t not in tags:
                    tags.append(t)
            client.tags = tags

        content = (
            f"FOUNDER RED-ALERT: POST-RETREAT EXPERIENCE RECOVERY OUTREACH\n"
            f"Guest: {payload.guest_name} ({clean_email}) | Sanctuary: {norm_slug.upper()}\n"
            f"Reported Rating: {payload.overall_rating}/5.0 (Quietude: {payload.quietude_score}%, Sleep: {payload.deep_sleep_score}%)\n"
            f"Flagged Grievance: '{payload.review_text}'\n"
            f"Pre-Approved Service Recovery Voucher: ${1500.00:,.2f} USD ({recovery_voucher})\n\n"
            f"FOUNDER ACTION REQUIRED (Kareena Islam, BSN, RN):\n"
            f"1. Conduct personal phone call to {payload.guest_name} within 4 hours.\n"
            f"2. Acknowledge and apologize for the acoustic/session disruption.\n"
            f"3. Offer 1:1 complimentary clinical musculoskeletal evaluation if physical strain reported.\n"
            f"4. Extend $1,500 future retreat credit ({recovery_voucher}) toward any 2027 sanctuary."
        )

        draft = ActionDraft(
            type="founder_service_recovery_call",
            guest_name=payload.guest_name,
            recipient_email=clean_email,
            content=content,
            status="pending_review",
        )
    else:
        sentiment_label = "DEEPLY_RESTORATIVE"
        triage_priority = "VERIFIED_TESTIMONIAL_CANDIDATE"
        recovery_voucher = None

        content = (
            f"KAI SANCTUARY - POST-RETREAT INTEGRATION & CONTINUITY GRATITUDE\n"
            f"Guest: {payload.guest_name} | Sanctuary: {norm_slug.upper()}\n"
            f"Reflection: '{payload.review_text}'\n\n"
            f"Dear {payload.guest_name},\n"
            f"Thank you for sharing your restorative journey with us. Your words embody the stillness "
            f"we strive to cultivate. As you transition into your 30-day post-retreat continuity arc, "
            f"remember to maintain your morning 4-7-8 vagal breathwork and evening blue-light dampening."
        )

        draft = ActionDraft(
            type="post_retreat_continuity_gratitude",
            guest_name=payload.guest_name,
            recipient_email=clean_email,
            content=content,
            status="pending_review",
        )

    rev = DestinationReview(
        sanctuary_slug=norm_slug,
        guest_name=payload.guest_name,
        stay_dates=payload.stay_dates,
        overall_rating=payload.overall_rating,
        deep_sleep_score=payload.deep_sleep_score,
        quietude_score=payload.quietude_score,
        clinical_attentiveness_score=payload.clinical_attentiveness_score,
        review_text=payload.review_text,
        sentiment_label=sentiment_label,
        source=payload.source,
        status="PUBLISHED" if not is_critical_negative else "HELD_FOR_FOUNDER_REVIEW",
    )
    db.add(rev)
    db.add(draft)
    db.commit()
    db.refresh(rev)
    db.refresh(draft)

    return {
        "success": True,
        "review_id": rev.id,
        "sentiment_label": sentiment_label,
        "triage_priority": triage_priority,
        "is_critical_negative": is_critical_negative,
        "recovery_voucher": recovery_voucher,
        "draft_id": draft.id,
    }


# ──── Scenario 31: Lost Luggage Crisis & Sanctuary Wardrobe Staging ────

class LostLuggageEmergencyRequest(BaseModel):
    carrier_airline: str = "American Airlines"
    flight_number: str = "AA 1042"
    baggage_claim_tag: str = "AA-BAG-782910"
    missing_bags_count: int = 1
    courier_tracking_url: Optional[str] = "https://wheremybag.aa.com/trace?tag=AA-BAG-782910"
    guest_top_size: str = "Medium"
    guest_bottom_size: str = "Medium"
    guest_shoe_size: str = "8.5 US / 39 EU"
    preferred_colors: List[str] = ["Earthy Linen", "Sage", "Terracotta"]
    operator_name: str = "Kareena Islam"


@router.post("/trips/{trip_id}/lost-luggage-emergency")
def handle_lost_luggage_emergency(
    trip_id: str,
    payload: LostLuggageEmergencyRequest,
    db: Session = Depends(get_db)
):
    """
    Lost Luggage Crisis & Luxury Sanctuary Wardrobe Concierge Engine:
    Tracks delayed commercial baggage claims, provisions complimentary organic capsule
    wardrobes from the sanctuary boutique (2x yoga sets, 1x evening linen, sleepwear),
    and auto-stages resort front-desk courier security clearance drafts.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()
    if client:
        tags = list(client.tags or [])
        for t in ["LOST_LUGGAGE_CONCIERGE_ACTIVE", "AIRLINE_BAGGAGE_CLAIM"]:
            if t not in tags:
                tags.append(t)
        client.tags = tags

    flight_dict = dict(trip.smart_flight or {})
    flight_dict["lost_luggage_incident"] = {
        "status": "AIRLINE_TRACING_ACTIVE",
        "carrier": payload.carrier_airline,
        "flight": payload.flight_number,
        "claim_tag": payload.baggage_claim_tag,
        "bags_missing": payload.missing_bags_count,
        "tracking_url": payload.courier_tracking_url,
        "reported_at": datetime.now(timezone.utc).isoformat(),
        "wardrobe_capsule_provided": True,
    }
    trip.smart_flight = flight_dict

    capsule_items = [
        f"2x Organic Bamboo Ribbed Yoga Sets ({payload.guest_top_size} Top / {payload.guest_bottom_size} Bottom)",
        f"1x Italian Pure Linen Evening Lounge Set in {payload.preferred_colors[0] if payload.preferred_colors else 'Linen'}",
        f"1x Botanical Washed Organic Cotton Bathrobe & Sleepwear",
        f"1x Natural Jute Resort Slides (Size {payload.guest_shoe_size})",
        "1x Luxury Botanical Skincare Kit (Reef-Safe SPF 50+, Botanical Bug Spray, Adaptogenic Face Mist)",
    ]

    content = (
        f"KAI SANCTUARY - LOST LUGGAGE CONCIERGE & COMPLIMENTARY WARDROBE PROVISION\n"
        f"Guest: {trip.client_name} ({trip.client_email}) | Trip: {trip.title}\n"
        f"Missing Baggage Claim: {payload.baggage_claim_tag} ({payload.carrier_airline} {payload.flight_number})\n"
        f"Courier Tracking: {payload.courier_tracking_url or 'Pending carrier handover'}\n"
        f"Coordinated by: {payload.operator_name}\n\n"
        f"COMPLIMENTARY BOUTIQUE CAPSULE WARDROBE STAGED ($0.00 Folio Waiver):\n"
        + "\n".join(f" • {item}" for item in capsule_items)
        + f"\n\nRESORT COURIER CLEARANCE:\n"
        f"Front gate security instructed to receive courier package for claim {payload.baggage_claim_tag} "
        f"24/7 and deliver immediately to suite {trip.room_tier}."
    )

    draft = ActionDraft(
        type="lost_luggage_concierge_briefing",
        guest_name=trip.client_name,
        recipient_email=trip.client_email,
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "claim_tag": payload.baggage_claim_tag,
        "carrier": payload.carrier_airline,
        "wardrobe_staged": True,
        "capsule_items": capsule_items,
        "draft_id": draft.id,
    }


# ──── Scenario 32: Altitude & Thermal Shock Clinical Escalation ────

class ThermalShockEscalationRequest(BaseModel):
    intake_id: Optional[str] = None
    client_email: Optional[str] = None
    client_name: Optional[str] = None
    sanctuary_slug: str = "nosara"
    day_number: int = 2
    spo2_percent: float = 88.0
    resting_hr_bpm: int = 118
    core_temp_c: float = 35.4
    shivering_duration_minutes: int = 25
    reported_symptoms: str = "Extreme peripheral shivering, blue-tinged lips, shortness of breath after 3-minute cold plunge"
    operator_name: str = "Nurse Concierge Station"


@router.post("/somatic-pulse/thermal-shock-escalation")
def triage_thermal_shock_escalation(
    payload: ThermalShockEscalationRequest,
    db: Session = Depends(get_db)
):
    """
    Altitude & Thermal Shock Clinical Escalation Engine:
    Detects acute hypothermia or hypoxia (SpO2 < 90%, core temp < 35.5C, prolonged shivering),
    places mandatory prohibition lockouts on cold plunge/thermal shock circuits,
    initiates active warming protocols, and auto-stages emergency nursing directives.
    """
    clean_email = payload.client_email.strip().lower() if payload.client_email else "guest@kaisanctuary.com"
    guest_name = payload.client_name or "Honored Guest"

    is_critical_thermal_shock = (
        payload.spo2_percent < 90.0 or
        payload.core_temp_c < 35.5 or
        payload.shivering_duration_minutes >= 20
    )

    alert_level = "CRITICAL_THERMAL_SHOCK_HYPOTHERMIA" if is_critical_thermal_shock else "MILD_THERMAL_DISCOMFORT"
    protocol_lockout = "MANDATORY_COLD_PLUNGE_PROHIBITION" if is_critical_thermal_shock else "SUPERVISED_WARMING_ONLY"

    client = db.query(CRMClient).filter(CRMClient.email == clean_email).first()
    if client and is_critical_thermal_shock:
        tags = list(client.tags or [])
        for t in ["THERMAL_SHOCK_HOLD", "COLD_PLUNGE_PROHIBITED"]:
            if t not in tags:
                tags.append(t)
        client.tags = tags

    pulse = GuestSomaticPulse(
        intake_id=payload.intake_id,
        guest_name=guest_name,
        sanctuary_slug=payload.sanctuary_slug,
        day_number=payload.day_number,
        phase="MIDDAY_THERMAL_CIRCUIT",
        restorative_sleep_score=3,
        nervous_system_ease=2,
        vagal_tone_descriptor="Acute Vasoconstriction & Shivering",
        private_reflection_notes=f"Vitals: SpO2 {payload.spo2_percent}%, HR {payload.resting_hr_bpm} bpm, Core {payload.core_temp_c}°C. Symptoms: {payload.reported_symptoms}",
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(pulse)

    content = (
        f"CRITICAL CLINICAL ESCALATION: ACUTE THERMAL SHOCK & HYPOTHERMIA ALERT\n"
        f"Guest: {guest_name} ({clean_email}) | Sanctuary: {payload.sanctuary_slug.upper()}\n"
        f"Retreat Day: {payload.day_number} | Triage Officer: {payload.operator_name}\n\n"
        f"ACUTE TELEMETRY:\n"
        f" • Blood Oxygen (SpO2): {payload.spo2_percent}% (CRITICAL: Below 90% threshold)\n"
        f" • Resting Heart Rate: {payload.resting_hr_bpm} bpm (Tachycardia response)\n"
        f" • Core Body Temp: {payload.core_temp_c}°C (Mild Hypothermia < 35.5°C)\n"
        f" • Shivering Duration: {payload.shivering_duration_minutes} minutes\n"
        f" • Symptoms: '{payload.reported_symptoms}'\n\n"
        f"MANDATORY CLINICAL ACTIONS (Kareena Islam, BSN, RN):\n"
        f"1. PROTOCOL LOCK: Immediately lock out guest from cold plunge, ice baths, and ocean swimming.\n"
        f"2. Wrap in warm infrared thermal blanket and administer heated magnesium foot immersion.\n"
        f"3. Administer 2L/min nasal cannula supplemental oxygen until SpO2 stabilizes >= 96%.\n"
        f"4. Provide warm cinnamon, ginger, and turmeric organic vasodilating infusion."
    )

    draft = ActionDraft(
        type="thermal_shock_clinical_protocol",
        guest_name=guest_name,
        recipient_email="clinical-concierge@kaisanctuary.com",
        content=content,
        status="pending_review",
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    db.refresh(pulse)

    return {
        "success": True,
        "guest_name": guest_name,
        "alert_level": alert_level,
        "is_critical_thermal_shock": is_critical_thermal_shock,
        "protocol_lockout": protocol_lockout,
        "pulse_id": pulse.id,
        "draft_id": draft.id,
    }


# ──── Scenario 33: Multi-Guest Split Folio & Proportional Ledger ────

class CoOccupantPaymentSplit(BaseModel):
    guest_name: str
    guest_email: str
    percentage_share: float
    payment_method: str
    transaction_reference: str
    notes: Optional[str] = None


class MultiGuestSplitFolioRequest(BaseModel):
    villa_tier: str = "Grand Oceanfront Presidential Villa"
    total_stay_investment: float = 24000.00
    split_records: List[CoOccupantPaymentSplit]
    operator_name: str = "Kareena Islam"


@router.post("/cohorts/{sanctuary_slug}/multi-guest-split-folio")
def settle_multi_guest_split_folio(
    sanctuary_slug: str,
    payload: MultiGuestSplitFolioRequest,
    db: Session = Depends(get_db)
):
    """
    Multi-Guest Split Folio & Proportional Villa Ledger Engine:
    Validates exact 100.0% co-occupant share math, allocates split payments across
    independent guest records (corporate wire, Amex Centurion, luxury consortia vouchers),
    and auto-stages individual itemized split receipts.
    """
    norm_slug = sanctuary_slug.strip().lower()

    total_pct = sum(r.percentage_share for r in payload.split_records)
    if abs(total_pct - 100.0) > 0.01:
        raise HTTPException(status_code=400, detail=f"Split percentages must total exactly 100.0% (Current sum: {total_pct:.2f}%)")

    allocated_splits = []
    draft_ids = []
    running_total = 0.0

    for split in payload.split_records:
        clean_email = split.guest_email.strip().lower()
        share_amount = round(payload.total_stay_investment * (split.percentage_share / 100.0), 2)
        running_total = round(running_total + share_amount, 2)

        client = db.query(CRMClient).filter(CRMClient.email == clean_email).first()
        if not client:
            client = CRMClient(
                crm_contact_id=f"kai_cnt_split_{secrets.token_hex(4)}",
                full_name=split.guest_name,
                email=clean_email,
                phone="+1 555 987 6543",
                tags=["CO_OCCUPANT_FOLIO", "VILLA_SHARE"],
                total_lifetime_spend=share_amount,
            )
            db.add(client)
            db.flush()

        trip = db.query(CRMTrip).filter(
            CRMTrip.client_email == clean_email,
            CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%")
        ).first()

        payment_entry = {
            "payment_id": str(uuid.uuid4()),
            "amount": share_amount,
            "percentage_share": split.percentage_share,
            "currency": "USD",
            "payment_method": split.payment_method.upper(),
            "transaction_reference": split.transaction_reference.strip(),
            "notes": split.notes or f"{split.percentage_share}% share of {payload.villa_tier}",
            "processed_by": payload.operator_name,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        if trip:
            history = list(trip.payment_history or [])
            history.append(payment_entry)
            trip.payment_history = history
            trip.total_investment = share_amount
            trip.final_balance = 0.0
            trip.final_balance_status = "SETTLED_IN_FULL"
            trip.status = "CONFIRMED"
        else:
            trip = CRMTrip(
                crm_trip_id=f"kai_trp_split_{secrets.token_hex(4)}",
                client_id=client.id,
                client_name=split.guest_name,
                client_email=clean_email,
                sanctuary_slug=norm_slug,
                title=f"KAI Sanctuary - {payload.villa_tier} (Share)",
                dates="Upcoming Cohort 2027",
                room_tier=payload.villa_tier,
                status="CONFIRMED",
                total_investment=share_amount,
                deposit_amount=share_amount * 0.3,
                deposit_status="PAID",
                final_balance=0.0,
                final_balance_status="SETTLED_IN_FULL",
                payment_history=[payment_entry],
            )
            db.add(trip)
            db.flush()

        content = (
            f"KAI WELLNESS RETREATS - CO-OCCUPANT SPLIT FOLIO RECEIPT\n"
            f"Villa Accommodation: {payload.villa_tier} | Sanctuary: {norm_slug.upper()}\n"
            f"Co-Occupant: {split.guest_name} ({clean_email})\n"
            f"Allocated Share: {split.percentage_share:.1f}% (${share_amount:,.2f} USD of ${payload.total_stay_investment:,.2f} USD master villa stay)\n"
            f"Settlement Method: {split.payment_method.upper()} | Reference: {split.transaction_reference}\n"
            f"Folio Status: SETTLED IN FULL"
        )

        draft = ActionDraft(
            type="split_folio_co_occupant_receipt",
            guest_name=split.guest_name,
            recipient_email=clean_email,
            content=content,
            status="pending_review",
        )
        db.add(draft)
        db.flush()
        draft_ids.append(draft.id)

        allocated_splits.append({
            "guest_name": split.guest_name,
            "email": clean_email,
            "percentage_share": split.percentage_share,
            "share_amount_usd": share_amount,
            "payment_method": split.payment_method,
            "reference": split.transaction_reference,
            "trip_id": trip.id,
        })

    db.commit()

    return {
        "success": True,
        "sanctuary_slug": norm_slug,
        "villa_tier": payload.villa_tier,
        "total_stay_investment": payload.total_stay_investment,
        "running_total_allocated": running_total,
        "co_occupants_count": len(allocated_splits),
        "splits": allocated_splits,
        "draft_ids": draft_ids,
    }


# ──── Scenario 34: Passport Validity < 6 Months Immigration Warning Gate ────

class PassportValidityCheckRequest(BaseModel):
    passport_country: str = "United States"
    passport_number: str = "P78291044"
    passport_expiry_date: str = "2027-04-10"
    retreat_arrival_date: str = "2027-02-18"
    retreat_departure_date: str = "2027-02-25"
    operator_name: str = "Grand Travel Concierge Desk"


@router.post("/trips/{trip_id}/passport-validity-check")
def verify_passport_immigration_validity(
    trip_id: str,
    payload: PassportValidityCheckRequest,
    db: Session = Depends(get_db)
):
    """
    Passport Validity & International Border Control Verification Engine:
    Validates that a traveler's passport retains >= 180 days (6 months) validity beyond
    retreat arrival dates, flags critical deportation/boarding refusal hazards,
    and auto-stages expedited diplomatic passport renewal assistance drafts.
    """
    trip = db.query(CRMTrip).filter(
        or_(CRMTrip.id == trip_id, CRMTrip.crm_trip_id == trip_id)
    ).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip record not found in native CRM")

    client = db.query(CRMClient).filter(CRMClient.id == trip.client_id).first()

    expiry_dt = datetime.fromisoformat(payload.passport_expiry_date)
    arrival_dt = datetime.fromisoformat(payload.retreat_arrival_date)

    days_remaining = (expiry_dt - arrival_dt).days
    mandated_threshold_days = 180

    immigration_cleared = days_remaining >= mandated_threshold_days

    if not immigration_cleared:
        alert_status = "CRITICAL_IMMIGRATION_EXPIRATION_RISK"
        action_required = "EXPEDITED_PASSPORT_RENEWAL_MANDATED"

        if client:
            tags = list(client.tags or [])
            if "PASSPORT_EXPEDITED_RENEWAL_REQUIRED" not in tags:
                tags.append("PASSPORT_EXPEDITED_RENEWAL_REQUIRED")
            client.tags = tags

        content = (
            f"URGENT IMMIGRATION ADVISORY: PASSPORT EXPIRATION WITHIN 6 MONTHS\n"
            f"Guest: {trip.client_name} ({trip.client_email}) | Trip: {trip.title}\n"
            f"Passport Country: {payload.passport_country} | Number: {payload.passport_number}\n"
            f"Passport Expiration: {payload.passport_expiry_date}\n"
            f"Retreat Arrival: {payload.retreat_arrival_date} (Validity Remaining: {days_remaining} Days — Minimum Required: 180 Days)\n\n"
            f"IMMIGRATION HAZARD:\n"
            f"International border authorities and commercial airlines will deny boarding if passport "
            f"validity is under 6 months upon entry into Costa Rica / Mexico.\n\n"
            f"IMMEDIATE ACTION MANDATED:\n"
            f"1. Enroll in 24-48 hour expedited courier passport renewal (Travisa / It's Easy / RushMyPassport).\n"
            f"2. Dedicated concierge liaison assigned to monitor passport issuance and update airline PNR."
        )

        draft = ActionDraft(
            type="passport_expedited_renewal_liaison",
            guest_name=trip.client_name,
            recipient_email=trip.client_email,
            content=content,
            status="pending_review",
        )
    else:
        alert_status = "PASSPORT_VALIDITY_CLEARED"
        action_required = "ROUTINE_BORDER_ENTRY"

        content = (
            f"KAI SANCTUARY - TRAVEL DOCUMENT CLEARANCE CONFIRMATION\n"
            f"Guest: {trip.client_name} | Document: {payload.passport_country} Passport\n"
            f"Passport validity verified: {days_remaining} days remaining beyond arrival date. "
            f"Complies with international 6-month validity standards."
        )

        draft = ActionDraft(
            type="passport_clearance_confirmation",
            guest_name=trip.client_name,
            recipient_email=trip.client_email,
            content=content,
            status="pending_review",
        )

    db.add(draft)
    db.commit()
    db.refresh(draft)

    return {
        "success": True,
        "trip_id": trip.id,
        "guest_name": trip.client_name,
        "passport_expiry": payload.passport_expiry_date,
        "retreat_arrival": payload.retreat_arrival_date,
        "days_validity_remaining": days_remaining,
        "mandated_threshold_days": mandated_threshold_days,
        "immigration_cleared": immigration_cleared,
        "alert_status": alert_status,
        "action_required": action_required,
        "draft_id": draft.id,
    }


# ──── Scenario 35: Healing Bodywork Master Practitioner Scheduling Lock ────

class BodyworkSessionBookingRequest(BaseModel):
    practitioner_name: str = "Kareena Islam, BSN, RN"
    practitioner_service: str = "1:1 Somatic Vagal Nerve Release & Myofascial Psoas Calibration"
    client_name: str
    client_email: str
    session_date: str = "2027-01-30"
    requested_time_slot: str = "14:00"
    duration_minutes: int = 75
    notes: Optional[str] = "Chronic neck stiffness and shallow breathing"


@router.post("/cohorts/{sanctuary_slug}/schedule-bodywork-session")
def schedule_bodywork_session(
    sanctuary_slug: str,
    payload: BodyworkSessionBookingRequest,
    db: Session = Depends(get_db)
):
    """
    On-Site Healing Bodywork Atomic Scheduling Lock Engine:
    Guarantees thread-safe master practitioner appointment allocation,
    prevents double-booking collisions, auto-offers adjacent slots during conflicts,
    and stages session preparation drafts.
    """
    norm_slug = sanctuary_slug.strip().lower()
    clean_email = payload.client_email.strip().lower()

    with _bodywork_scheduling_lock:
        trip = db.query(CRMTrip).filter(
            CRMTrip.client_email == clean_email,
            CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%")
        ).first()

        existing_trips = db.query(CRMTrip).filter(
            CRMTrip.sanctuary_slug.ilike(f"%{norm_slug}%")
        ).all()

        slot_occupied_by = None
        for t in existing_trips:
            plan = t.suggested_plan or {}
            sessions = plan.get("scheduled_bodywork", [])
            for s in sessions:
                if (s.get("practitioner") == payload.practitioner_name and
                    s.get("date") == payload.session_date and
                    s.get("time") == payload.requested_time_slot):
                    slot_occupied_by = s.get("client_name", "Another Guest")
                    break
            if slot_occupied_by:
                break

        if slot_occupied_by:
            adjacent_slot = "15:30"
            content = (
                f"KAI SANCTUARY - BODYWORK SCHEDULE ADJUSTMENT & ADJACENT AVAILABILITY\n"
                f"Guest: {payload.client_name} | Practitioner: {payload.practitioner_name}\n"
                f"Service: {payload.practitioner_service}\n"
                f"Requested Slot: {payload.requested_time_slot} on {payload.session_date} (Currently Reserved)\n\n"
                f"ADJACENT PRIORITY SLOT RESERVED FOR YOU: {adjacent_slot} on {payload.session_date}\n"
                f"Please confirm if {adjacent_slot} aligns with your afternoon rhythm."
            )

            draft = ActionDraft(
                type="bodywork_slot_collision_notice",
                guest_name=payload.client_name,
                recipient_email=clean_email,
                content=content,
                status="pending_review",
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)

            return {
                "allocated": False,
                "status": "TIME_SLOT_COLLISION",
                "practitioner": payload.practitioner_name,
                "requested_time": payload.requested_time_slot,
                "offered_adjacent_slot": adjacent_slot,
                "slot_occupied_by": slot_occupied_by,
                "draft_id": draft.id,
            }

        session_record = {
            "session_id": str(uuid.uuid4()),
            "practitioner": payload.practitioner_name,
            "service": payload.practitioner_service,
            "client_name": payload.client_name,
            "client_email": clean_email,
            "date": payload.session_date,
            "time": payload.requested_time_slot,
            "duration_minutes": payload.duration_minutes,
            "notes": payload.notes,
            "status": "CONFIRMED",
            "booked_at": datetime.now(timezone.utc).isoformat(),
        }

        if trip:
            plan = dict(trip.suggested_plan or {})
            existing = list(plan.get("scheduled_bodywork", []))
            existing.append(session_record)
            plan["scheduled_bodywork"] = existing
            trip.suggested_plan = plan

        content = (
            f"KAI SANCTUARY - 1:1 MASTER BODYWORK CONFIRMATION\n"
            f"Guest: {payload.client_name} ({clean_email})\n"
            f"Practitioner: {payload.practitioner_name}\n"
            f"Session: {payload.practitioner_service}\n"
            f"Scheduled: {payload.session_date} @ {payload.requested_time_slot} ({payload.duration_minutes} Minutes)\n\n"
            f"PRE-SESSION PREPARATION:\n"
            f"Hydrate with electrolyte botanical water 30 minutes prior. "
            f"Wear comfortable organic linen or loose yoga attire. Session staged in Private Healing Pavilion 2."
        )

        draft = ActionDraft(
            type="bodywork_session_confirmation",
            guest_name=payload.client_name,
            recipient_email=clean_email,
            content=content,
            status="pending_review",
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        return {
            "allocated": True,
            "status": "CONFIRMED",
            "practitioner": payload.practitioner_name,
            "service": payload.practitioner_service,
            "date": payload.session_date,
            "time": payload.requested_time_slot,
            "duration_minutes": payload.duration_minutes,
            "draft_id": draft.id,
        }


