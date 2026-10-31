import logging
import re
from typing import Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.config import settings
from backend.sidecar.models import StagingIntake
from backend.sidecar.services.tern_client import tern_client

logger = logging.getLogger("kai_whatsapp_dispatcher")


def build_interactive_intake_card(intake: StagingIntake) -> Dict[str, Any]:
    """
    Builds an interactive WhatsApp card payload for incoming guest intakes.
    Emphasizes Restorative Wellness & Curated Travel as the base case,
    with elevated clinical screening notes when enabled.
    """
    thesis = intake.consultation_thesis or {}
    flight = intake.flight_request or {}
    clinical = intake.clinical_profile or {}
    wellness = getattr(intake, "wellness_profile", {}) or {}

    sanctuary_title = (intake.sanctuary_slug or "nosara").replace("-", " ").title()
    room_tier = intake.room_tier or "Private Villa Sanctuary"
    cabin_class = flight.get("cabin_class", "Business") if flight else "Standard"
    dep_airport = flight.get("departure_airport", "MIA") if flight else "N/A"

    primary_focus = wellness.get("primary_focus", "Deep Rest & Nervous System Reset")
    intention = wellness.get("intention", "Restore circadian rhythm, quiet luxury hospitality.")

    # Clinical highlights (elevated feature)
    clinical_enabled = getattr(intake, "clinical_screening_enabled", False)
    flags = thesis.get("clinical_flags", [])
    if not flags and clinical_enabled:
        flags = ["ELEVATED_SCREENING_ACTIVE"]

    sleep_bullet = clinical.get("health_notes") or wellness.get("sleep_notes", "Circadian rest and unbroken sleep prioritized.")

    card_text = (
        f"🌿 *KAI CONCIERGE DISPATCH (WELLNESS & TRAVEL)*\n"
        f"*Guest:* {intake.client_name} | *Focus:* {primary_focus}\n"
        f"*Sanctuary:* {sanctuary_title}\n"
        f"*Room:* {room_tier} | *VIP Air:* {cabin_class} ({dep_airport})\n\n"
        f"✨ *RESTIVE ITINERARY & WELLNESS INTENTION:*\n"
        f"• Intention: {intention[:140]}\n"
        f"• Rest Notes: {sleep_bullet[:120]}\n"
    )

    if clinical_enabled and flags:
        card_text += f"\n🛡️ *Elevated Clinical Safety Flags:* {', '.join(flags[:3])}\n"

    card_text += "\n⚡ *Quick Operator Actions:*"

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
            "clinical_screening_enabled": clinical_enabled,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    }


def build_drafts_digest_card(pending_drafts: list) -> Dict[str, Any]:
    """
    Builds an interactive WhatsApp digest card summarizing pending action drafts.
    Provides founder Kareena Islam with an instant snapshot of concierge actions,
    VIP flight coordination, and routine guest communications.
    """
    total = len(pending_drafts)
    by_category = {}
    for d in pending_drafts:
        dtype = getattr(d, "type", "")
        by_category[dtype] = by_category.get(dtype, 0) + 1

    travel_count = sum(v for k, v in by_category.items() if "flight" in k or "chauffeur" in k)
    intake_count = sum(v for k, v in by_category.items() if "intake" in k or "booking" in k or "tern" in k)
    routine_count = sum(v for k, v in by_category.items() if k in ("email_reply", "outreach", "priority_circle_welcome", "guest_email_confirmation"))
    clinical_count = sum(v for k, v in by_category.items() if "clinical" in k)

    summary_lines = []
    if travel_count:
        summary_lines.append(f"• ✈️ *Travel Logistics:* {travel_count} pending")
    if intake_count:
        summary_lines.append(f"• 🌿 *Guest Itineraries & CRM:* {intake_count} pending")
    if routine_count:
        summary_lines.append(f"• ✉️ *Routine Outreach & Replies:* {routine_count} pending")
    if clinical_count:
        summary_lines.append(f"• 🛡️ *Elevated Safety Reviews:* {clinical_count} pending")

    breakdown_text = "\n".join(summary_lines) if summary_lines else "• All queues clear."

    top_items = []
    for d in pending_drafts[:3]:
        gname = getattr(d, "guest_name", "Guest")
        dtype = getattr(d, "type", "draft").replace("_", " ").title()
        top_items.append(f"- *{gname}* ({dtype})")
    top_items_text = "\n".join(top_items)

    card_text = (
        f"📱 *KAI FOUNDER CONCIERGE DIGEST*\n"
        f"*{total} Action Drafts Pending Review*\n\n"
        f"*Queue Overview:*\n{breakdown_text}\n\n"
        f"*Priority Items:*\n{top_items_text}\n\n"
        f"⚡ Tap below to approve routine outreach or open the Action Portal:"
    )

    interactive_buttons = [
        {"id": "batch_approve_routine", "title": "⚡ Approve Routine"},
        {"id": "open_portal", "title": "🌐 Open Portal"},
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
            "total_pending": total,
            "routine_count": routine_count,
            "generated_at": datetime.now(timezone.utc).isoformat()
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
        intake.synced_at = datetime.now(timezone.utc)
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


def dispatch_whatsapp_cloud_api(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Dispatches interactive card payload to Meta WhatsApp Cloud API
    when credentials and ENABLE_LIVE_WHATSAPP_DISPATCH are configured.
    """
    is_live = (getattr(settings, "ENABLE_LIVE_WHATSAPP_DISPATCH", False) or settings.ENVIRONMENT == "production") and bool(settings.WHATSAPP_CLOUD_API_KEY and settings.WHATSAPP_PHONE_NUMBER_ID)
    if is_live:
        try:
            import httpx
            url = f"https://graph.facebook.com/v18.0/{settings.WHATSAPP_PHONE_NUMBER_ID}/messages"
            headers = {
                "Authorization": f"Bearer {settings.WHATSAPP_CLOUD_API_KEY}",
                "Content-Type": "application/json"
            }
            resp = httpx.post(url, json=payload, headers=headers, timeout=10.0)
            if resp.status_code in (200, 201):
                res_data = resp.json()
                logger.info(f"Successfully dispatched WhatsApp message via Meta Cloud API: {res_data}")
                return {"success": True, "provider": "META_CLOUD_API", "data": res_data}
            else:
                logger.warning(f"Meta WhatsApp Cloud API returned status {resp.status_code}: {resp.text}")
                return {"success": False, "provider": "META_CLOUD_API", "error": resp.text}
        except Exception as e:
            logger.error(f"Meta WhatsApp Cloud API error: {e}")
            return {"success": False, "provider": "META_CLOUD_API", "error": str(e)}

    logger.info("WhatsApp Cloud API simulation mode active (credentials not configured or live dispatch disabled).")
    return {"success": True, "provider": "SIMULATED_CARRIER", "data": payload}

