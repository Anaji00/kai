from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.sidecar.models import StagedLead
from backend.sidecar.schemas import (
    StagedLeadResponse,
    StagedLeadUpdate,
    LeadDiscoveryTrigger,
    LeadApproveRequest,
    EmailSendRequest
)
from backend.sidecar.services.lead_gen import discover_and_stage_leads

router = APIRouter(prefix="/leads", tags=["Tern Sidecar: B2B Studio Lead Generation"])


@router.get("", response_model=List[StagedLeadResponse])
def list_staged_leads(
    status: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List discovered B2B wellness partner targets staged for operator review.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES OR CAMPAIGNS.
    """
    query = db.query(StagedLead)
    if status:
        query = query.filter(StagedLead.status == status)
    if location:
        query = query.filter(StagedLead.location.ilike(f"%{location}%"))
    
    return query.order_by(StagedLead.created_at.desc()).all()


@router.post("/discover", response_model=List[StagedLeadResponse])
def trigger_lead_discovery(
    payload: LeadDiscoveryTrigger,
    db: Session = Depends(get_db)
):
    """
    Run studio discovery worker for high-net-worth wellness hubs (Houston, Austin, Dallas, NYC, Chicago, LA).
    Stages prospective partners with custom collaboration plans.
    """
    leads = discover_and_stage_leads(
        db=db,
        city=payload.city,
        category=payload.category,
        limit=payload.limit
    )
    return leads


@router.patch("/{lead_id}", response_model=StagedLeadResponse)
def update_staged_lead(
    lead_id: str,
    payload: StagedLeadUpdate,
    db: Session = Depends(get_db)
):
    """Operator customizes outreach thesis or contact details before outreach."""
    lead = db.query(StagedLead).filter(StagedLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Staged lead not found")

    if payload.business_name is not None:
        lead.business_name = payload.business_name
    if payload.contact_name is not None:
        lead.contact_name = payload.contact_name
    if payload.email is not None:
        lead.email = str(payload.email)
    if payload.phone is not None:
        lead.phone = payload.phone
    if payload.outreach_thesis is not None:
        lead.outreach_thesis = payload.outreach_thesis
    if payload.status is not None:
        lead.status = payload.status

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/approve", response_model=StagedLeadResponse)
def approve_staged_lead(
    lead_id: str,
    payload: LeadApproveRequest,
    db: Session = Depends(get_db)
):
    """
    1-Click Operator Approval to move lead from PENDING_APPROVAL to APPROVED.
    Authorizes partner collaboration thesis.
    """
    lead = db.query(StagedLead).filter(StagedLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Staged lead not found")

    lead.status = "APPROVED"
    lead.reviewed_by = payload.operator_name
    if payload.custom_outreach:
        lead.outreach_thesis = payload.custom_outreach

    db.commit()
    db.refresh(lead)
    return lead


@router.post("/{lead_id}/send-email")
def send_lead_email(
    lead_id: str,
    payload: EmailSendRequest,
    db: Session = Depends(get_db)
):
    """
    Sends an email to the lead using the provided subject and body.
    """
    lead = db.query(StagedLead).filter(StagedLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Staged lead not found")
        
    if not lead.email:
        raise HTTPException(status_code=400, detail="Lead has no email address")

    # Log the email (or actually send it via your email provider here)
    print(f"Sending email to {lead.email}\nSubject: {payload.subject}\nBody: {payload.body}")
    
    lead.status = "AWAITING_INFO"
    db.commit()
    db.refresh(lead)
    
    return {
        "status": "success",
        "message": f"Email sent to {lead.email}",
        "lead_id": lead.id,
        "lead_status": lead.status
    }

