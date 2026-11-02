from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.sidecar.models import SmsDispatch
from backend.sidecar.schemas import (
    SmsDispatchResponse,
    SmsDispatchCreate,
    SmsAuthorizeRequest,
    SmsBroadcastCampaignRequest
)
from backend.sidecar.services.messaging import (
    stage_operational_alert,
    stage_campaign_broadcast,
    authorize_and_dispatch_sms
)

router = APIRouter(prefix="/messaging", tags=["Sanctuary Sidecar: SMS Alerts & Broadcasts"])


@router.get("/queue", response_model=List[SmsDispatchResponse])
def list_sms_queue(
    status: Optional[str] = Query(None),
    dispatch_type: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List staged SMS operational alerts and outbound campaigns.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS DISPATCHES.
    """
    query = db.query(SmsDispatch)
    if status:
        query = query.filter(SmsDispatch.status == status)
    if dispatch_type:
        query = query.filter(SmsDispatch.dispatch_type == dispatch_type)
    
    return query.order_by(SmsDispatch.created_at.desc()).all()


@router.post("/stage-alert", response_model=SmsDispatchResponse)
def stage_alert(payload: SmsDispatchCreate, db: Session = Depends(get_db)):
    """Stage an operational SMS alert for founder or flight desk."""
    sms = stage_operational_alert(
        db=db,
        recipient_phone=payload.recipient_phone,
        recipient_name=payload.recipient_name or "Operator",
        message_body=payload.message_body,
        dispatch_type=payload.dispatch_type
    )
    return sms


@router.post("/broadcast", response_model=List[SmsDispatchResponse])
def stage_broadcast_campaign(
    payload: SmsBroadcastCampaignRequest,
    db: Session = Depends(get_db)
):
    """
    Drafts and stages a multi-recipient SMS broadcast campaign
    (e.g., waitlist drop or pre-departure 4-7-8 breathwork reminder).
    TERMINATES in PENDING_APPROVAL.
    """
    dispatches = stage_campaign_broadcast(
        db=db,
        target_segment=payload.target_segment,
        message_template=payload.message_body,
        sanctuary_slug=payload.sanctuary_slug
    )
    return dispatches


@router.post("/{sms_id}/dispatch")
def dispatch_staged_sms(
    sms_id: str,
    payload: SmsAuthorizeRequest,
    db: Session = Depends(get_db)
):
    """
    1-Click Operator Authorization to dispatch a staged SMS via carrier/Twilio.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS DISPATCHES.
    """
    try:
        result = authorize_and_dispatch_sms(
            db=db,
            sms_id=sms_id,
            operator_name=payload.operator_name
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch SMS: {str(e)}")
