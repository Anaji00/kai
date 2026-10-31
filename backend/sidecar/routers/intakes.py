from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import re

from backend.database import get_db
from backend.sidecar.models import StagingIntake
from backend.models import ActionDraft
from backend.sidecar.schemas import (
    StagingIntakeBase,
    StagingIntakeResponse,
    StagingIntakeUpdate,
    PreCallThesisGenerateRequest,
    TernSyncRequest,
    TernSyncResponse,
    SanctuaryCohortStatus,
    VoiceMemoRequest,
    VoiceMemoResponse,
)
from backend.sidecar.services.thesis_rag import generate_pre_call_thesis, seed_sanctuary_knowledge
from backend.sidecar.services.tern_client import tern_client
from backend.sidecar.services.voice_transcriber import extract_entities_from_transcript
from backend.sidecar.services.llm_service import transcribe_audio, LLMServiceError

router = APIRouter(prefix="/intakes", tags=["Tern Sidecar: Guest Inquiries & Conversation Guides"])


@router.post("", response_model=StagingIntakeResponse)
def create_staged_intake(
    payload: StagingIntakeBase,
    db: Session = Depends(get_db)
):
    """
    Creates a new staged guest intake awaiting founder review and Tern CRM sync.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES TO TERN CRM.
    """
    target_slug = payload.sanctuary_slug or "nosara"
    existing = db.query(StagingIntake).filter(
        StagingIntake.email == str(payload.email),
        StagingIntake.sanctuary_slug == target_slug,
        StagingIntake.status == "PENDING_APPROVAL"
    ).first()
    if existing:
        return existing

    seed_sanctuary_knowledge(db)

    thesis = generate_pre_call_thesis(
        client_name=payload.client_name,
        sanctuary_slug=payload.sanctuary_slug or "nosara",
        room_tier=payload.room_tier or "Private Ocean Canopy Villa",
        clinical_profile=payload.clinical_profile or {},
        flight_request=payload.flight_request
    )

    wellness_prof = payload.wellness_profile or {}
    clin_prof = payload.clinical_profile or {}
    screening_enabled = payload.clinical_screening_enabled or bool(clin_prof)

    intake = StagingIntake(
        client_name=payload.client_name,
        email=str(payload.email),
        phone=payload.phone,
        sanctuary_slug=payload.sanctuary_slug or "nosara",
        room_tier=payload.room_tier or "Private Ocean Canopy Villa",
        wellness_profile=wellness_prof,
        clinical_screening_enabled=screening_enabled,
        clinical_profile=clin_prof,
        flight_request=payload.flight_request,
        consultation_thesis=thesis,
        status="PENDING_APPROVAL"
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)

    # Push auto task to Action Drafts review queue
    from backend.models import ActionDraft
    draft = ActionDraft(
        type="guest_intake",
        guest_name=payload.client_name,
        content=f"Restorative guest intake staged for {payload.client_name} ({payload.sanctuary_slug or 'nosara'}). Status: PENDING_APPROVAL. Awaiting founder review and Tern CRM synchronization."
    )
    db.add(draft)
    db.commit()

    return intake


MAX_VOICE_MEMO_BYTES = 20 * 1024 * 1024


@router.post("/voice-memo/transcribe")
async def transcribe_voice_memo(file: UploadFile = File(...)):
    """
    Transcribes a recorded founder voice memo with Groq Whisper.
    Returns the transcript for review; staging happens only when it is submitted to /voice-memo.
    """
    audio = await file.read()
    if not audio:
        raise HTTPException(status_code=400, detail="The recording is empty.")
    if len(audio) > MAX_VOICE_MEMO_BYTES:
        raise HTTPException(status_code=413, detail="Recording is over 20 MB. Record a shorter note.")
    try:
        transcript = transcribe_audio(
            audio,
            filename=file.filename or "voice-memo.webm",
            prompt="KAI Wellness Retreats founder voice note about a guest: names, retreat dates, rooms, flights, dietary needs.",
        )
    except LLMServiceError as e:
        raise HTTPException(status_code=502, detail=f"{e.message} {e.diagnostic_hint}")
    if not transcript:
        raise HTTPException(status_code=422, detail="No speech was detected in the recording.")
    return {"transcript": transcript}


@router.post("/voice-memo", response_model=VoiceMemoResponse)
def stage_intake_from_voice_memo(
    payload: VoiceMemoRequest,
    db: Session = Depends(get_db)
):
    """
    Founder Superpowers: Kareena's AI Voice Note-to-Dossier Transcriber.
    Parses natural language consultation dictation into structured StagingIntake,
    generates pre-call thesis, and stages a personalized pre-arrival welcome email
    in ActionDrafts with status pending_review (Zero Autonomous Writes).
    """
    if not payload.raw_transcript or not payload.raw_transcript.strip():
        raise HTTPException(status_code=400, detail="Voice transcript cannot be empty.")

    extracted = extract_entities_from_transcript(payload.raw_transcript)

    # Ensure unique email if guest exists
    existing = db.query(StagingIntake).filter(StagingIntake.email == extracted["email"]).first()
    if existing:
        import uuid
        clean_name = re.sub(r'[^a-zA-Z0-9]+', '.', extracted['client_name'].lower()).strip('.')
        extracted["email"] = f"{clean_name}.{uuid.uuid4().hex[:4]}@vip.kai"

    seed_sanctuary_knowledge(db)

    thesis = generate_pre_call_thesis(
        client_name=extracted["client_name"],
        sanctuary_slug=extracted["sanctuary_slug"],
        room_tier=extracted["room_tier"],
        clinical_profile=extracted["clinical_profile"],
        flight_request=extracted["flight_request"]
    )

    intake = StagingIntake(
        client_name=extracted["client_name"],
        email=extracted["email"],
        phone=extracted.get("phone", "+1 (312) 555-0199"),
        sanctuary_slug=extracted["sanctuary_slug"],
        room_tier=extracted["room_tier"],
        wellness_profile=extracted["wellness_profile"],
        clinical_screening_enabled=extracted["clinical_screening_enabled"],
        clinical_profile=extracted["clinical_profile"],
        flight_request=extracted["flight_request"],
        consultation_thesis=thesis,
        status="PENDING_APPROVAL"
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)

    # Zero Autonomous Writes: Stage ActionDraft for founder review
    action_draft = ActionDraft(
        type="guest_email_confirmation",
        guest_name=extracted["client_name"],
        content=extracted["welcome_email_draft"],
        status="pending_review"
    )
    db.add(action_draft)
    db.commit()
    db.refresh(action_draft)

    return VoiceMemoResponse(
        success=True,
        message=f"Voice memo transcribed and staged as StagingIntake for {extracted['client_name']}. Action draft #{action_draft.id} staged with pending_review.",
        intake_id=intake.id,
        action_draft_id=action_draft.id,
        extracted_data=extracted,
        status="PENDING_APPROVAL"
    )



@router.get("", response_model=List[StagingIntakeResponse])
def list_staged_intakes(
    status: Optional[str] = Query(None, description="Filter by status, e.g. PENDING_APPROVAL, SYNCED_TO_TERN"),
    sanctuary_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List all staged guest intakes awaiting human operator review.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES TO TERN CRM.
    """
    query = db.query(StagingIntake)
    if status:
        query = query.filter(StagingIntake.status == status)
    if sanctuary_slug:
        query = query.filter(StagingIntake.sanctuary_slug == sanctuary_slug)
    
    return query.order_by(StagingIntake.created_at.desc()).all()


@router.get("/telemetry/cohorts", response_model=List[SanctuaryCohortStatus])
def get_cohort_capacities(db: Session = Depends(get_db)):
    """
    Returns visual cohort telemetry enforcing the 12–14 guest maximum capacity.
    """
    sanctuaries = [
        {"slug": "nosara", "title": "Nosara Costa Rica Blue Zone Sanctuary", "dates": "Nov 14–20, 2026", "limit": 14},
        {"slug": "amalfi", "title": "Amalfi Coast Cliffside Stillness Retreat", "dates": "May 8–14, 2027", "limit": 12},
        {"slug": "bali", "title": "Bali Sacred Water & Jungle Sanctuary", "dates": "Sep 18–24, 2027", "limit": 14},
        {"slug": "riviera-maya", "title": "Riviera Maya Coastal Grounding Sanctuary", "dates": "Feb 6–12, 2027", "limit": 12},
    ]

    results = []
    for s in sanctuaries:
        staged_count = db.query(StagingIntake).filter(
            StagingIntake.sanctuary_slug == s["slug"],
            StagingIntake.status == "PENDING_APPROVAL"
        ).count()
        tern_synced = db.query(StagingIntake).filter(
            StagingIntake.sanctuary_slug == s["slug"],
            StagingIntake.status.in_(["APPROVED", "SYNCED_TO_TERN"])
        ).count()

        total_booked = staged_count + tern_synced
        remaining = max(0, s["limit"] - total_booked)

        status = "OPEN"
        if remaining == 0:
            status = "FULL"
        elif remaining <= 3:
            status = "NEAR_CAPACITY"

        results.append(SanctuaryCohortStatus(
            slug=s["slug"],
            title=s["title"],
            dates=s["dates"],
            capacity_limit=s["limit"],
            staged_count=staged_count,
            tern_confirmed_count=tern_synced,
            remaining_spots=remaining,
            status=status
        ))

    return results


@router.post("/seed-demo", response_model=List[StagingIntakeResponse])
def seed_demo_intakes(db: Session = Depends(get_db)):
    """
    Seeds rich demonstration intakes into staging_intakes with conversation guides,
    clinical profiles, and flight requests for operator cockpit testing.
    """
    seed_sanctuary_knowledge(db)

    demo_specs = [
        {
            "source_ref": "KAI-VANCE88",
            "client_name": "Eleanor Vance",
            "email": "eleanor.vance@example.com",
            "phone": "+1 (713) 555-0199",
            "sanctuary_slug": "nosara",
            "room_tier": "Private Villa Sanctuary",
            "clinical_profile": {
                "movement_experience": "Gentle / Beginner",
                "health_notes": "High mental burnout, chronic nervous system exhaustion, early morning waking / insomnia.",
                "intentions": "Deep nervous system decompression, peaceful restorative renewal, and unbroken sleep.",
                "passport_valid": "yes-valid-6mo"
            },
            "flight_request": {
                "departure_airport": "IAH",
                "cabin_class": "business",
                "preferred_airline": "United Airlines",
                "travel_dates_flexible": True,
                "special_requests": "Requires lie-flat seating and private ground transfer with chilled hydration"
            },
            "status": "PENDING_APPROVAL"
        },
        {
            "source_ref": "KAI-REED42",
            "client_name": "Dr. Marcus Reed",
            "email": "m.reed@chicagolongevity.org",
            "phone": "+1 (312) 555-0182",
            "sanctuary_slug": "amalfi",
            "room_tier": "Cliffside Stillness Suite",
            "clinical_profile": {
                "movement_experience": "Intermediate Somatics",
                "health_notes": "Chronic clinical fatigue from hospital leadership. History of right meniscus knee repair.",
                "intentions": "Restorative cliffside stillness, Mediterranean anti-inflammatory nutrition, and vagal down-regulation.",
                "passport_valid": "yes-valid-6mo"
            },
            "flight_request": {
                "departure_airport": "ORD",
                "cabin_class": "first",
                "preferred_airline": "Lufthansa / Swiss",
                "travel_dates_flexible": False,
                "special_requests": "Direct lie-flat routing into Naples, VIP tarmac meet-and-greet"
            },
            "status": "PENDING_APPROVAL"
        },
        {
            "source_ref": "KAI-LAUR19",
            "client_name": "Camille Laurent",
            "email": "camille@atelierdesign.fr",
            "phone": "+1 (214) 555-0177",
            "sanctuary_slug": "bali",
            "room_tier": "Shared Ocean Pavilion",
            "clinical_profile": {
                "movement_experience": "Vinyasa / Breathwork Practitioner",
                "health_notes": "Sensory overload from global art travel. Craves deep acoustic immersion (432Hz/528Hz).",
                "intentions": "Water temple somatic cleansing and acoustic brainwave entrainment.",
                "passport_valid": "yes-valid-6mo"
            },
            "flight_request": {
                "departure_airport": "DFW",
                "cabin_class": "business",
                "preferred_airline": "Singapore Airlines",
                "travel_dates_flexible": True,
                "special_requests": "Needs silent transfer and adaptogenic herbal elixir upon landing"
            },
            "status": "PENDING_APPROVAL"
        },
        {
            "source_ref": "KAI-JULIAN77",
            "client_name": "Julian Thorne",
            "email": "julian.thorne@goldcoastcapital.com",
            "phone": "+1 (312) 555-0155",
            "sanctuary_slug": "nosara",
            "room_tier": "Private Villa Sanctuary",
            "clinical_profile": {
                "movement_experience": "All Levels",
                "health_notes": "Sympathetic hyperarousal from fund management. Craves complete digital silence.",
                "intentions": "6-day circadian reset with private ocean villa.",
                "passport_valid": "yes-valid-6mo"
            },
            "flight_request": {
                "departure_airport": "ORD",
                "cabin_class": "business",
                "preferred_airline": "American Airlines",
                "travel_dates_flexible": False,
                "special_requests": "Private Grand Travel tarmac escort"
            },
            "status": "SYNCED_TO_TERN",
            "reviewed_by": "Kareena Islam",
            "tern_trip_id": "tern_trp_demo9911",
            "tern_contact_id": "tern_cnt_demo4422",
            "synced_at": datetime.now(timezone.utc)
        }
    ]

    created = []
    for spec in demo_specs:
        existing = db.query(StagingIntake).filter(StagingIntake.email == spec["email"]).first()
        if existing:
            created.append(existing)
            continue

        thesis = generate_pre_call_thesis(
            client_name=spec["client_name"],
            sanctuary_slug=spec["sanctuary_slug"],
            room_tier=spec["room_tier"],
            clinical_profile=spec["clinical_profile"],
            flight_request=spec.get("flight_request")
        )

        intake = StagingIntake(
            source_ref=spec["source_ref"],
            client_name=spec["client_name"],
            email=spec["email"],
            phone=spec.get("phone"),
            sanctuary_slug=spec["sanctuary_slug"],
            room_tier=spec["room_tier"],
            clinical_profile=spec["clinical_profile"],
            flight_request=spec.get("flight_request"),
            consultation_thesis=thesis,
            status=spec["status"],
            reviewed_by=spec.get("reviewed_by"),
            tern_trip_id=spec.get("tern_trip_id"),
            tern_contact_id=spec.get("tern_contact_id"),
            synced_at=spec.get("synced_at")
        )
        db.add(intake)
        created.append(intake)

    db.commit()
    for rec in created:
        db.refresh(rec)

    return created


@router.get("/{intake_id}", response_model=StagingIntakeResponse)
def get_staged_intake(intake_id: str, db: Session = Depends(get_db)):
    """Retrieve details for a single staged intake including pre-call thesis."""
    intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Staged intake not found")
    return intake


@router.patch("/{intake_id}", response_model=StagingIntakeResponse)
def update_staged_intake(
    intake_id: str,
    payload: StagingIntakeUpdate,
    db: Session = Depends(get_db)
):
    """
    Operator updates client details, room tiers, or clinical profile
    in the staging database before CRM synchronization.
    """
    intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Staged intake not found")

    if payload.client_name is not None:
        intake.client_name = payload.client_name
    if payload.email is not None:
        intake.email = str(payload.email)
    if payload.phone is not None:
        intake.phone = payload.phone
    if payload.sanctuary_slug is not None:
        intake.sanctuary_slug = payload.sanctuary_slug
    if payload.room_tier is not None:
        intake.room_tier = payload.room_tier
    if payload.wellness_profile is not None:
        intake.wellness_profile = payload.wellness_profile
    if payload.clinical_screening_enabled is not None:
        intake.clinical_screening_enabled = payload.clinical_screening_enabled
    if payload.clinical_profile is not None:
        intake.clinical_profile = payload.clinical_profile
    if payload.flight_request is not None:
        intake.flight_request = payload.flight_request
    if payload.consultation_thesis is not None:
        intake.consultation_thesis = payload.consultation_thesis
    if payload.status is not None:
        intake.status = payload.status

    db.commit()
    db.refresh(intake)
    return intake


@router.post("/{intake_id}/thesis", response_model=StagingIntakeResponse)
def generate_intake_thesis(
    intake_id: str,
    payload: PreCallThesisGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    Generates or regenerates a RAG-driven Pre-Call Consultation Thesis:
    - Sympathetic overdrive hypothesis
    - Vagal down-regulation & circadian alignment protocol
    - Talking points and objection scripts
    - Tern draft itinerary activities
    """
    intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Staged intake not found")

    seed_sanctuary_knowledge(db)

    thesis = generate_pre_call_thesis(
        client_name=intake.client_name,
        sanctuary_slug=intake.sanctuary_slug,
        room_tier=intake.room_tier,
        clinical_profile=intake.clinical_profile or {},
        flight_request=intake.flight_request
    )

    intake.consultation_thesis = thesis
    db.commit()
    db.refresh(intake)
    return intake


@router.post("/{intake_id}/tern-sync", response_model=TernSyncResponse)
def authorize_tern_crm_sync(
    intake_id: str,
    payload: TernSyncRequest,
    db: Session = Depends(get_db)
):
    """
    1-Click Operator Authorization to write into Tern CRM.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES.
    Only executed upon explicit human operator review.
    """
    intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail="Staged intake not found")

    # If thesis wasn't generated yet, generate now
    if not intake.consultation_thesis:
        intake.consultation_thesis = generate_pre_call_thesis(
            client_name=intake.client_name,
            sanctuary_slug=intake.sanctuary_slug,
            room_tier=payload.override_room_tier or intake.room_tier,
            clinical_profile=intake.clinical_profile or {},
            flight_request=intake.flight_request
        )

    room_tier = payload.override_room_tier or intake.room_tier

    # Push to Tern CRM via Tern client
    sync_result = tern_client.sync_intake_to_tern(
        intake_id=intake.id,
        client_name=intake.client_name,
        email=intake.email,
        phone=intake.phone,
        sanctuary_slug=intake.sanctuary_slug,
        room_tier=room_tier,
        clinical_profile=intake.clinical_profile or {},
        consultation_thesis=intake.consultation_thesis,
        flight_request=intake.flight_request,
        operator_name=payload.operator_name
    )

    # Update staging intake status to SYNCED_TO_TERN
    intake.status = "SYNCED_TO_TERN"
    intake.reviewed_by = payload.operator_name
    intake.tern_contact_id = sync_result["tern_contact_id"]
    intake.tern_trip_id = sync_result["tern_trip_id"]
    intake.synced_at = datetime.now(timezone.utc)
    if payload.override_room_tier:
        intake.room_tier = payload.override_room_tier

    db.commit()
    db.refresh(intake)

    return TernSyncResponse(
        success=True,
        message="Successfully authorized and synchronized intake into Tern CRM with clinical tags.",
        intake_id=intake.id,
        tern_contact_id=sync_result["tern_contact_id"],
        tern_trip_id=sync_result["tern_trip_id"],
        applied_tags=sync_result["applied_tags"],
        status="SYNCED_TO_TERN",
        synced_at=intake.synced_at
    )
