from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.sidecar.models import StagedEmail
from backend.sidecar.schemas import (
    StagedEmailIngest,
    StagedEmailResponse,
    EmailActionApproveRequest
)
from backend.sidecar.services.email_agent import parse_and_stage_email

router = APIRouter(prefix="/email-in", tags=["Tern Sidecar: Inbound Email Parsing Agent"])


@router.post("", response_model=StagedEmailResponse, status_code=201)
@router.post("/ingest", response_model=StagedEmailResponse, status_code=201)
def ingest_and_parse_email(
    payload: StagedEmailIngest,
    db: Session = Depends(get_db)
):
    """
    Ingests inbound emails routed to agents or flight concierge.
    AI parsing agent analyzes intent, extracts entities (dates, vouchers, flight codes),
    and stages the record with status = 'PENDING_APPROVAL'.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES.
    """
    staged = parse_and_stage_email(
        db=db,
        sender=payload.sender,
        recipient=payload.recipient,
        subject=payload.subject,
        raw_body=payload.raw_body
    )
    return staged


@router.get("", response_model=List[StagedEmailResponse])
def list_staged_emails(
    status: Optional[str] = Query(None),
    parsed_intent: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all staged inbound emails parsed by the agent awaiting operator triage."""
    query = db.query(StagedEmail)
    if status:
        query = query.filter(StagedEmail.status == status)
    if parsed_intent:
        query = query.filter(StagedEmail.parsed_intent == parsed_intent)
    
    return query.order_by(StagedEmail.created_at.desc()).all()


@router.get("/{email_id}", response_model=StagedEmailResponse)
def get_staged_email(email_id: str, db: Session = Depends(get_db)):
    """Inspect parsed entities and suggested actions for a single email."""
    rec = db.query(StagedEmail).filter(StagedEmail.id == email_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Staged email not found")
    return rec


@router.post("/{email_id}/action", response_model=StagedEmailResponse)
def approve_email_action(
    email_id: str,
    payload: EmailActionApproveRequest,
    db: Session = Depends(get_db)
):
    """
    1-Click Operator Authorization to execute the suggested action from an inbound parsed email
    (e.g., mark as reviewed, link to intake, or archive).
    """
    rec = db.query(StagedEmail).filter(StagedEmail.id == email_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Staged email not found")

    rec.status = "APPROVED"
    rec.reviewed_by = payload.operator_name
    db.commit()
    db.refresh(rec)
    return rec
