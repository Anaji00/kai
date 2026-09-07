from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.schemas import (
    RetreatDetailSchema,
    RetreatAvailabilityResponse,
    CustomGroupCreate,
    CustomGroupResponse,
)
from backend.models import CustomGroupInquiry
from backend.services.retreats_service import get_all_retreats, get_retreat_by_slug_or_id

router = APIRouter(prefix="/retreats", tags=["Retreats & Sanctuaries"])


@router.get("", response_model=List[RetreatDetailSchema])
def list_retreats(
    year: Optional[int] = Query(None, description="Filter retreats by year e.g. 2026, 2027"),
    db: Session = Depends(get_db)
):
    """Retrieve all intimate KAI sanctuaries with live spots remaining calculation."""
    retreats = get_all_retreats(db=db, year=year)
    return retreats


@router.get("/{slug_or_id}", response_model=RetreatDetailSchema)
def get_retreat(slug_or_id: str, db: Session = Depends(get_db)):
    """Retrieve comprehensive sanctuary details by slug or ID."""
    retreat = get_retreat_by_slug_or_id(slug_or_id, db=db)
    if not retreat:
        raise HTTPException(status_code=404, detail="Sanctuary not found")
    return retreat


@router.get("/{slug_or_id}/availability", response_model=RetreatAvailabilityResponse)
def get_retreat_availability(slug_or_id: str, db: Session = Depends(get_db)):
    """Check live cohort capacity and available spots."""
    retreat = get_retreat_by_slug_or_id(slug_or_id, db=db)
    if not retreat:
        raise HTTPException(status_code=404, detail="Sanctuary not found")
    
    return RetreatAvailabilityResponse(
        id=retreat["id"],
        slug=retreat["slug"],
        title=retreat["title"],
        destination=retreat["destination"],
        spotsTotal=retreat["spotsTotal"],
        spotsRemaining=retreat["spotsRemaining"],
        status=retreat["status"],
        investmentStarting=retreat["investmentStarting"]
    )


@router.post("/custom-group", response_model=CustomGroupResponse, status_code=201)
def submit_custom_group_inquiry(data: CustomGroupCreate, db: Session = Depends(get_db)):
    """Submit a bespoke inquiry for private groups or corporate executive cohorts (6–20 guests)."""
    inquiry = CustomGroupInquiry(
        organizer_name=data.organizerName,
        email=str(data.email),
        phone=data.phone,
        group_size=data.groupSize,
        target_destination=data.targetDestination,
        target_dates=data.targetDates,
        somatic_goals=data.somaticGoals,
        status="inquiry_received"
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    # Mirror into Sidecar Staging Intakes with Pre-Call Thesis RAG
    # MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES TO TERN CRM
    try:
        from backend.sidecar.models import StagingIntake
        from backend.sidecar.services.thesis_rag import generate_pre_call_thesis
        from backend.sidecar.services.messaging import stage_operational_alert
        from backend.config import settings

        clinical_dict = {
            "group_size": data.groupSize,
            "target_dates": data.targetDates,
            "somatic_goals": data.somaticGoals,
            "intentions": f"Bespoke private group ({data.groupSize} guests). Goals: {data.somaticGoals or 'Custom retreat'}",
            "movement_experience": "Custom Group",
        }
        thesis = generate_pre_call_thesis(
            client_name=data.organizerName,
            sanctuary_slug=data.targetDestination,
            room_tier="Bespoke Private Sanctuary Buyout",
            clinical_profile=clinical_dict
        )

        staging_rec = StagingIntake(
            source_ref=f"GRP-{str(inquiry.id).zfill(4)}",
            client_name=data.organizerName,
            email=str(data.email),
            phone=data.phone,
            sanctuary_slug=data.targetDestination,
            room_tier="Bespoke Private Sanctuary Buyout",
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
            message_body=f"Custom Group Alert: {data.organizerName} requested {data.groupSize} guests for {data.targetDestination}. Thesis staged for operator review.",
            dispatch_type="OPERATIONAL_ALERT"
        )
    except Exception as e:
        import logging
        logging.getLogger("kai_api").error(f"Error mirroring custom group inquiry to sidecar staging: {e}")

    return CustomGroupResponse(
        success=True,
        message="Thank you. Kareena Islam and Grand Travel & Cruise will prepare a bespoke proposal tailored to your group.",
        inquiryId=inquiry.id
    )
