import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import ActionDraft
from backend.sidecar.models import StagingIntake
from backend.sidecar.schemas import (
    ContinuityArcGenerateRequest,
    ContinuityArcResponse,
    ContinuityMilestone,
)
from backend.sidecar.services.continuity_service import generate_continuity_milestones

logger = logging.getLogger("kai_continuity_router")

router = APIRouter(prefix="/continuity", tags=["30-Day Post-Sanctuary Continuity"])


@router.post("/generate-arc", response_model=ContinuityArcResponse)
def generate_post_retreat_continuity_arc(
    payload: ContinuityArcGenerateRequest,
    db: Session = Depends(get_db)
):
    """
    30-Day Post-Sanctuary Continuity of Care Journey Generator.
    Creates 4 personalized post-retreat integration milestones (Day 3 Grounding,
    Day 7 Blue Zone Nutrition, Day 14 432Hz Sound Immersion, Day 28 Priority Circle).
    Stages all milestones into ActionDrafts with status pending_review (Zero Autonomous Writes).
    """
    intake = db.query(StagingIntake).filter(StagingIntake.id == payload.intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail=f"Staged intake '{payload.intake_id}' not found.")

    departure_dt = None
    if payload.departure_date:
        try:
            departure_dt = datetime.fromisoformat(payload.departure_date).replace(tzinfo=timezone.utc)
        except Exception:
            departure_dt = datetime.now(timezone.utc)
    else:
        departure_dt = datetime.now(timezone.utc)

    milestone_dicts = generate_continuity_milestones(intake, departure_dt)
    staged_milestones: List[ContinuityMilestone] = []

    for m in milestone_dicts:
        draft_type = "priority_circle_welcome" if m["day"] == 28 else "post_retreat_integration"
        draft = ActionDraft(
            type=draft_type,
            guest_name=intake.client_name,
            content=f"[Scheduled: {m['scheduled_date']} | Day {m['day']} Integration]\n\n{m['content']}",
            status="pending_review"
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        staged_milestones.append(
            ContinuityMilestone(
                day=m["day"],
                title=m["title"],
                theme=m["theme"],
                scheduled_date=m["scheduled_date"],
                delivery_channel=m["delivery_channel"],
                content_preview=m["content_preview"],
                draft_id=draft.id
            )
        )

    return ContinuityArcResponse(
        success=True,
        intake_id=intake.id,
        guest_name=intake.client_name,
        departure_date=departure_dt.strftime("%Y-%m-%d"),
        milestones=staged_milestones,
        staged_draft_count=len(staged_milestones),
        message=f"Successfully generated 4-milestone post-retreat continuity arc for {intake.client_name}. All 4 integration drafts staged for review."
    )


@router.get("/active-arcs", response_model=List[Dict[str, Any]])
def list_active_continuity_milestones(
    guest_name: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List all staged post-sanctuary continuity integration drafts.
    """
    query = db.query(ActionDraft).filter(
        ActionDraft.type.in_(["post_retreat_integration", "priority_circle_welcome"])
    )
    if guest_name:
        query = query.filter(ActionDraft.guest_name.ilike(f"%{guest_name}%"))
    if status:
        query = query.filter(ActionDraft.status == status)

    drafts = query.order_by(ActionDraft.created_at.desc()).all()
    results = []
    for d in drafts:
        results.append({
            "draft_id": d.id,
            "type": d.type,
            "guest_name": d.guest_name,
            "status": d.status,
            "content": d.content,
            "created_at": d.created_at.isoformat()
        })
    return results
