from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging

from backend.database import get_db
from backend.config import settings
from backend.sidecar.models import StagingIntake
from backend.dependencies.auth import get_current_admin, verify_whatsapp_signature
from backend.sidecar.services.whatsapp_dispatcher import (
    build_interactive_intake_card,
    handle_whatsapp_action,
    parse_inline_operator_reply,
)

logger = logging.getLogger("kai_whatsapp_router")

router = APIRouter(prefix="/webhook/whatsapp", tags=["WhatsApp Mobile Operator Dispatch"])


class SimulateWhatsAppRequest(BaseModel):
    intake_id: str
    action: str  # "GET_CARD", "CLICK_BUTTON", "SEND_REPLY"
    button_id: Optional[str] = None
    reply_text: Optional[str] = None
    operator_name: str = "Kareena Islam"


@router.get("")
def verify_meta_webhook(
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
):
    """
    Meta WhatsApp Cloud API Webhook verification challenge.
    """
    if hub_mode == "subscribe" and hub_verify_token == settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        logger.info("Meta WhatsApp Cloud Webhook successfully verified.")
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Invalid verification challenge token")


@router.post("", dependencies=[Depends(verify_whatsapp_signature)])
async def receive_whatsapp_event(request: Request, db: Session = Depends(get_db)):
    """
    Receives incoming webhook events from Meta WhatsApp Cloud API.
    Processes button reply callbacks and natural language message replies.
    """
    try:
        body = await request.json()
        logger.info(f"Incoming WhatsApp webhook event: {body}")
        
        # Meta format parsing
        entry = body.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})
        messages = value.get("messages", [])

        if not messages:
            return {"status": "EVENT_RECEIVED", "message": "No actionable message"}

        message = messages[0]
        msg_type = message.get("type")

        # 1. Handle Interactive Button Reply
        if msg_type == "interactive":
            interactive = message.get("interactive", {})
            btn_reply = interactive.get("button_reply", {})
            action_id = btn_reply.get("id")
            if action_id:
                result = handle_whatsapp_action(action_id=action_id, db=db, operator_name="Kareena Islam")
                return {"status": "PROCESSED", "result": result}

        # 2. Handle Text / Natural Language Reply
        elif msg_type == "text":
            from backend.sidecar.services.clinical_governance_engine import UntrustedInputSanitizer
            raw_text = message.get("text", {}).get("body", "")
            text_body = UntrustedInputSanitizer.sanitize_text(raw_text)
            parsed = parse_inline_operator_reply(text_body)
            return {"status": "PARSED_REPLY", "parsed": parsed}

        return {"status": "IGNORED", "msg_type": msg_type}
    except Exception as e:
        logger.error(f"Error handling WhatsApp webhook: {e}")
        return {"status": "ERROR", "detail": str(e)}


@router.post("/simulate", dependencies=[Depends(get_current_admin)])
def simulate_whatsapp_interaction(
    payload: SimulateWhatsAppRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Simulates WhatsApp mobile interaction directly from the Operator Portal.
    Allows testing interactive cards, button clicks, and text replies in a mobile mockup.
    """
    intake = db.query(StagingIntake).filter(StagingIntake.id == payload.intake_id).first()
    if not intake:
        raise HTTPException(status_code=404, detail=f"Intake {payload.intake_id} not found.")

    if payload.action == "GET_CARD":
        card = build_interactive_intake_card(intake)
        return {
            "success": True,
            "card_payload": card,
            "intake_status": intake.status,
            "room_tier": intake.room_tier,
            "client_name": intake.client_name
        }

    elif payload.action == "CLICK_BUTTON":
        if not payload.button_id:
            raise HTTPException(status_code=400, detail="button_id required for CLICK_BUTTON")
        
        result = handle_whatsapp_action(
            action_id=payload.button_id,
            db=db,
            operator_name=payload.operator_name
        )
        db.refresh(intake)
        return {
            "success": result.get("success", True),
            "action_result": result,
            "updated_intake": {
                "id": intake.id,
                "status": intake.status,
                "crm_trip_id": intake.crm_trip_id,
                "crm_contact_id": intake.crm_contact_id,
                "room_tier": intake.room_tier
            }
        }

    elif payload.action == "SEND_REPLY":
        if not payload.reply_text:
            raise HTTPException(status_code=400, detail="reply_text required for SEND_REPLY")

        parsed = parse_inline_operator_reply(payload.reply_text)
        updates = parsed.get("updates", {})
        
        # Apply updates to intake if detected
        applied_changes = []
        if "room_tier" in updates:
            intake.room_tier = updates["room_tier"]
            applied_changes.append(f"Room tier set to '{updates['room_tier']}'")
        
        if "vip_status" in updates:
            profile = dict(intake.clinical_profile or {})
            profile["vip_priority"] = True
            intake.clinical_profile = profile
            applied_changes.append("VIP Priority flag applied")
            
        if "additional_note" in updates:
            profile = dict(intake.clinical_profile or {})
            existing = profile.get("health_notes", "")
            profile["health_notes"] = f"{existing} | Operator note: {updates['additional_note']}"
            intake.clinical_profile = profile
            applied_changes.append(f"Appended note: '{updates['additional_note']}'")

        if "status" in updates:
            intake.status = updates["status"]
            applied_changes.append(f"Status updated to '{updates['status']}'")

        db.commit()
        db.refresh(intake)

        reply_receipt = (
            f"📱 *KAI SYSTEM ACKNOWLEDGEMENT*\n"
            f"Parsed operator instruction: *{parsed.get('detected_intent')}*\n"
            f"Changes applied to intake:\n" +
            ("\n".join([f"• {c}" for c in applied_changes]) if applied_changes else "• No state changes detected.")
        )

        return {
            "success": True,
            "parsed": parsed,
            "applied_changes": applied_changes,
            "reply_receipt": reply_receipt,
            "updated_intake": {
                "id": intake.id,
                "status": intake.status,
                "room_tier": intake.room_tier,
                "clinical_profile": intake.clinical_profile
            }
        }

    raise HTTPException(status_code=400, detail=f"Unknown simulation action: {payload.action}")
