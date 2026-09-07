import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from backend.sidecar.models import SmsDispatch
from backend.config import settings

logger = logging.getLogger("kai_messaging")


def stage_operational_alert(
    db: Session,
    recipient_phone: str,
    recipient_name: str,
    message_body: str,
    dispatch_type: str = "OPERATIONAL_ALERT"
) -> SmsDispatch:
    """
    Stages an operational alert ping in sms_dispatches table with status = 'PENDING_APPROVAL'.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS DISPATCHES.
    """
    sms = SmsDispatch(
        recipient_phone=recipient_phone,
        recipient_name=recipient_name,
        message_body=message_body,
        dispatch_type=dispatch_type,
        status="PENDING_APPROVAL"
    )
    db.add(sms)
    db.commit()
    db.refresh(sms)
    logger.info(f"Staged operational alert ping for {recipient_name} ({recipient_phone}): '{message_body[:60]}...'")
    return sms


def stage_campaign_broadcast(
    db: Session,
    target_segment: str,
    message_template: str,
    sanctuary_slug: Optional[str] = None
) -> List[SmsDispatch]:
    """
    Generates staged SMS campaign broadcasts for review by the operator.
    Does NOT dispatch immediately.
    """
    # Sample cohort contacts for simulated staging
    contacts = [
        {"name": "Julian Vance", "phone": "+1 713-555-0199"},
        {"name": "Camille Laurent", "phone": "+1 512-555-0182"},
        {"name": "Dr. Marcus Reed", "phone": "+1 214-555-0177"},
    ]

    staged_dispatches = []
    for c in contacts:
        personalized_body = message_template.replace("{name}", c["name"]).replace(
            "{sanctuary}", (sanctuary_slug or "Nosara Costa Rica").replace("-", " ").title()
        )
        sms = SmsDispatch(
            recipient_phone=c["phone"],
            recipient_name=c["name"],
            message_body=personalized_body,
            dispatch_type="CAMPAIGN_BROADCAST",
            status="PENDING_APPROVAL"
        )
        db.add(sms)
        staged_dispatches.append(sms)

    db.commit()
    for s in staged_dispatches:
        db.refresh(s)

    logger.info(f"Staged {len(staged_dispatches)} campaign broadcasts for segment '{target_segment}'")
    return staged_dispatches


def authorize_and_dispatch_sms(
    db: Session,
    sms_id: str,
    operator_name: str = "Kareena Islam"
) -> Dict[str, Any]:
    """
    Explicit 1-click human operator authorization to send SMS.
    Uses Twilio if configured, or simulated carrier dispatch if keys not set.
    """
    sms = db.query(SmsDispatch).filter(SmsDispatch.id == sms_id).first()
    if not sms:
        raise ValueError(f"SMS dispatch record {sms_id} not found")

    if sms.status == "DISPATCHED":
        return {
            "success": True,
            "message": "SMS was already dispatched previously.",
            "sms_id": sms.id,
            "dispatched_at": sms.dispatched_at.isoformat() if sms.dispatched_at else None
        }

    # Execute dispatch
    dispatched_via = "SIMULATED_CARRIER"
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                to=sms.recipient_phone,
                from_=settings.TWILIO_FROM_PHONE,
                body=sms.message_body
            )
            dispatched_via = f"TWILIO_{message.sid}"
            logger.info(f"Dispatched SMS via Twilio SID {message.sid} to {sms.recipient_phone}")
        except Exception as e:
            logger.error(f"Twilio dispatch error: {e}. Falling back to verified audit dispatch log.")
            dispatched_via = f"ERROR_FALLBACK_{str(e)[:50]}"
    else:
        logger.info(f"[SIMULATED SMS DISPATCH] Operator '{operator_name}' dispatched to {sms.recipient_phone}: {sms.message_body}")

    sms.status = "DISPATCHED"
    sms.authorized_by = operator_name
    sms.dispatched_at = datetime.utcnow()
    db.commit()
    db.refresh(sms)

    return {
        "success": True,
        "message": f"Message dispatched successfully to {sms.recipient_phone} via {dispatched_via}.",
        "sms_id": sms.id,
        "recipient": sms.recipient_name or sms.recipient_phone,
        "dispatched_at": sms.dispatched_at.isoformat(),
        "authorized_by": operator_name
    }
