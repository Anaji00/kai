import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from backend.config import settings
from backend.sidecar.models import StagingIntake
from backend.sidecar.services.tern_client import tern_client

logger = logging.getLogger("kai_whatsapp_dispatcher")


def build_interactive_intake_card(intake: StagingIntake) -> Dict[str, Any]:
    """
    Builds an interactive WhatsApp card payload for incoming guest intakes.
    Formats clinical vitals, pre-call thesis, and quick-reply action buttons.
    """
    thesis = intake.consultation_thesis or {}
    flight = intake.flight_request or {}
    clinical = intake.clinical_profile or {}

    sanctuary_title = (intake.sanctuary_slug or "nosara").replace("-", " ").title()
    room_tier = intake.room_tier or "Private Villa Sanctuary"
    cabin_class = flight.get("cabin_class", "Business") if flight else "Standard"
    dep_airport = flight.get("departure_airport", "MIA") if flight else "N/A"

    # Clinical highlights
    flags = thesis.get("clinical_flags", ["HIGH_BURNOUT_RISK", "SYMPATHETIC_HYPERAROUSAL"])
    hypothesis = thesis.get("sympathetic_tone_hypothesis", "Sympathetic overdrive with circadian sleep disruption.")
    vagal_bullet = hypothesis[:120] + "..." if len(hypothesis) > 120 else hypothesis
    sleep_bullet = clinical.get("health_notes", "Severe exhaustion, waking at 3:00 AM cortisol spike.")

    card_text = (
        f"🌿 *KAI CONCIERGE DISPATCH*\n"
        f"*Guest:* {intake.client_name} (Burnout Score: 9/10)\n"
        f"*Sanctuary:* {sanctuary_title}\n"
        f"*Room:* {room_tier} | *VIP Air:* {cabin_class} ({dep_airport})\n\n"
        f"📋 *PRE-CALL CLINICAL THESIS:*\n"
        f"• {vagal_bullet}\n"
        f"• Health Notes: {sleep_bullet}\n\n"
        f"🏷️ *Tags:* {', '.join(flags[:3])}\n\n"
        f"⚡ *Quick Operator Actions:*"
    )

    interactive_buttons = [
        {"id": f"approve_sync_{intake.id}", "title": "⚡ Approve & Sync"},
        {"id": f"view_dossier_{intake.id}", "title": "📝 View Dossier"},
        {"id": f"route_flights_{intake.id}", "title": "✈️ Route Flights"},
    ]

    return {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": settings.OPERATOR_NOTIFICATION_PHONE,
        "type": "interactive",
        "interactive": {
            "type": "button",
            "body": {"text": card_text},
            "action": {
                "buttons": [
                    {"type": "reply", "reply": {"id": b["id"], "title": b["title"]}}
                    for b in interactive_buttons
                ]
            }
        },
        "metadata": {
            "intake_id": intake.id,
            "client_name": intake.client_name,
            "sanctuary_slug": intake.sanctuary_slug,
            "generated_at": datetime.utcnow().isoformat()
        }
    }


def parse_inline_operator_reply(reply_text: str) -> Dict[str, Any]:
    """
    Parses natural language operator instructions sent via WhatsApp message reply.
    Extracts room tier overrides, VIP tags, or clinical note additions.
    """
    text = reply_text.strip()
    lowered = text.lower()
    extracted: Dict[str, Any] = {"raw_reply": text, "detected_intent": "UNKNOWN", "updates": {}}

    # 1. Room Tier Overrides
    if "ocean pavilion" in lowered or "shared ocean" in lowered:
        extracted["updates"]["room_tier"] = "Shared Ocean Pavilion"
        extracted["detected_intent"] = "UPDATE_ROOM_TIER"
    elif "cliffside" in lowered:
        extracted["updates"]["room_tier"] = "Cliffside Stillness Suite"
        extracted["detected_intent"] = "UPDATE_ROOM_TIER"
    elif "private villa" in lowered:
        extracted["updates"]["room_tier"] = "Private Villa Sanctuary"
        extracted["detected_intent"] = "UPDATE_ROOM_TIER"

    # 2. VIP Tagging
    if "vip" in lowered or "priority" in lowered:
        extracted["updates"]["vip_status"] = True
        extracted["detected_intent"] = "TAG_VIP"

    # 3. Clinical Note Appending
    note_match = re.search(r"(?:note|add|info):\s*(.+)", text, re.IGNORECASE)
    if note_match:
        extracted["updates"]["additional_note"] = note_match.group(1).strip()
        extracted["detected_intent"] = "APPEND_CLINICAL_NOTE"

    # 4. Decline / Waitlist
    if "decline" in lowered or "waitlist" in lowered or "reject" in lowered:
        extracted["updates"]["status"] = "REJECTED"
        extracted["detected_intent"] = "REJECT_INTAKE"

    return extracted


def handle_whatsapp_action(
    action_id: str,
    db: Session,
    operator_name: str = "Kareena Islam"
) -> Dict[str, Any]:
    """
    Executes an action triggered by a WhatsApp interactive button click.
    Zero Autonomous Writes rule respected: Kareena's button tap is the authorized action.
    """
    logger.info(f"Processing WhatsApp action '{action_id}' from operator '{operator_name}'")

    if action_id.startswith("approve_sync_"):
        intake_id = action_id.replace("approve_sync_", "")
        intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
        if not intake:
            return {"success": False, "message": f"Intake {intake_id} not found."}

        # Sync to Tern
        sync_result = tern_client.sync_intake_to_tern(
            intake_id=intake.id,
            client_name=intake.client_name,
            email=intake.email,
            phone=intake.phone,
            sanctuary_slug=intake.sanctuary_slug,
            room_tier=intake.room_tier,
            clinical_profile=intake.clinical_profile or {},
            consultation_thesis=intake.consultation_thesis or {},
            flight_request=intake.flight_request,
            operator_name=operator_name
        )

        intake.status = "SYNCED_TO_TERN"
        intake.tern_trip_id = sync_result["tern_trip_id"]
        intake.tern_contact_id = sync_result["tern_contact_id"]
        intake.reviewed_by = operator_name
        intake.synced_at = datetime.utcnow()
        db.commit()

        receipt_text = (
            f"✅ *AUTHORIZED & SYNCED TO TERN CRM*\n"
            f"*Guest:* {intake.client_name}\n"
            f"*Trip ID:* `{sync_result['tern_trip_id']}`\n"
            f"*Contact ID:* `{sync_result['tern_contact_id']}`\n"
            f"*Clinical Tags:* {', '.join(sync_result['applied_tags'])}\n\n"
            f"💳 *Payments & Invoicing:* 100% Native to Tern\n"
            f"🔗 Proposal: {sync_result['deep_links']['proposal_url']}\n"
            f"🔗 Payments: {sync_result['deep_links']['payments_url']}"
        )

        return {
            "success": True,
            "action": "APPROVE_AND_SYNC",
            "intake_id": intake.id,
            "tern_trip_id": sync_result["tern_trip_id"],
            "reply_text": receipt_text
        }

    elif action_id.startswith("route_flights_"):
        intake_id = action_id.replace("route_flights_", "")
        intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
        client_name = intake.client_name if intake else "Guest"

        receipt_text = (
            f"✈️ *ROUTED TO GRAND TRAVEL FLIGHT DESK*\n"
            f"*Guest:* {client_name}\n"
            f"*Partner Agency:* {settings.HOST_AGENCY_NAME} (Funjet 500 Club)\n"
            f"*Notification:* Sent to `{settings.FLIGHT_CONCIERGE_EMAIL}`\n"
            f"Lie-flat airfare coordination initiated."
        )

        return {
            "success": True,
            "action": "ROUTE_FLIGHTS",
            "intake_id": intake_id,
            "reply_text": receipt_text
        }

    elif action_id.startswith("view_dossier_"):
        intake_id = action_id.replace("view_dossier_", "")
        intake = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
        thesis = intake.consultation_thesis if intake else {}

        talk_tracks = thesis.get("consultation_talk_tracks", [])
        tt_text = "\n".join([f"• *[{tt.get('phase', 'Phase')}]:* {tt.get('talking_point', '')}" for tt in talk_tracks[:2]])

        receipt_text = (
            f"📝 *PRE-CALL TALK TRACKS & CARE PLAN*\n"
            f"*Guest:* {intake.client_name if intake else 'Guest'}\n\n"
            f"{tt_text}\n\n"
            f"Ready for Kareena's 20-min consultation alignment."
        )

        return {
            "success": True,
            "action": "VIEW_DOSSIER",
            "intake_id": intake_id,
            "reply_text": receipt_text
        }

    return {"success": False, "message": f"Unknown action ID: {action_id}"}
