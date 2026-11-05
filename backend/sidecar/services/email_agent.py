import re
import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from backend.sidecar.models import StagedEmail, StagingIntake
from backend.models import ActionDraft
from backend.sidecar.services.thesis_rag import generate_pre_call_thesis

logger = logging.getLogger("kai_email_agent")


def parse_and_stage_email(
    db: Session,
    sender: str,
    recipient: str,
    subject: str,
    raw_body: str
) -> StagedEmail:
    """
    Ingests and parses incoming emails sent to agents or concierge.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES.
    Extracts entities, determines intent, and stages with status = 'PENDING_APPROVAL'.
    """
    logger.info(f"Email agent parsing inbound message from '{sender}': '{subject}'")

    from backend.sidecar.services.clinical_governance_engine import (
        UntrustedInputSanitizer,
        assert_channel_capability,
        IngestionChannel,
    )

    # 0. Prompt-Injection Spotlighting and Control Character Sanitization
    cleaned_body = UntrustedInputSanitizer.sanitize_text(raw_body)
    has_injection, injection_markers = UntrustedInputSanitizer.detect_prompt_injection(cleaned_body)

    body_lower = cleaned_body.lower()
    subject_lower = subject.lower()

    # 1. Intent Classification
    intent = "GUEST_INQUIRY"
    if any(k in body_lower or k in subject_lower for k in ["voucher", "booking confirmation", "room block", "folio"]):
        intent = "VOUCHER_CONFIRMATION"
    elif any(k in body_lower or k in subject_lower for k in ["flight", "cabin", "pnr", "airline", "itinerary", "transfer", "airport"]):
        intent = "FLIGHT_TRANSFER_UPDATE"
    elif any(k in body_lower or k in subject_lower for k in ["corporate", "executive", "company retreat", "private cohort"]):
        intent = "CORPORATE_RETREAT_PROPOSAL"
    elif any(k in body_lower or k in subject_lower for k in ["reserve", "sanctuary", "puerto vallarta", "marival", "nosara", "amalfi", "bali", "riviera maya", "burnout", "retreat"]):
        intent = "GUEST_INTAKE_INQUIRY"

    # 2. Entity Extraction
    entities: Dict[str, Any] = {}
    entities["routed_founders"] = [
        "kareena@grandtravelcruise.com",
        "armaan@grandtravelcruise.com",
    ]

    # Email extraction
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", raw_body)
    entities["extracted_email"] = email_match.group(0) if email_match else sender

    # Phone extraction
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}", raw_body)
    if phone_match:
        entities["extracted_phone"] = phone_match.group(0).strip()

    # Sanctuary matching
    sanctuary_slug = "puerto-vallarta-2027"
    if "puerto vallarta" in body_lower or "marival" in body_lower or "vallarta" in body_lower or "harmony" in body_lower or "armony" in body_lower:
        sanctuary_slug = "puerto-vallarta-2027"
    elif "nosara" in body_lower or "costa rica" in body_lower:
        sanctuary_slug = "nosara"
    elif "amalfi" in body_lower or "italy" in body_lower:
        sanctuary_slug = "amalfi"
    elif "bali" in body_lower or "indonesia" in body_lower:
        sanctuary_slug = "bali"
    elif "riviera" in body_lower:
        sanctuary_slug = "riviera-maya"
    entities["matched_sanctuary"] = sanctuary_slug

    # Guest Name Extraction heuristic
    name_match = re.search(r"(?:name|from|guest|regards|sincerely|best,)\s*:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", raw_body)
    extracted_name = name_match.group(1) if name_match else None
    if not extracted_name and "@" in sender:
        extracted_name = sender.split("@")[0].replace(".", " ").title()
    entities["extracted_name"] = extracted_name or "Valued Guest"

    # Flight / Cabin Class extraction
    flight_match = re.search(r"\b([A-Z]{2,3}\s?\d{2,4})\b", raw_body)
    if flight_match:
        entities["flight_number"] = flight_match.group(1).upper()

    airline_match = re.search(r"\b(Delta|United|American|Lufthansa|Swiss|Singapore|Air France|Iberia|Avianca|Copa)\b", raw_body, re.IGNORECASE)
    if airline_match:
        entities["airline"] = airline_match.group(1).title()

    if any(k in body_lower for k in ["lie-flat", "business", "first class", "first-class"]):
        entities["cabin_class"] = "Lie-Flat Business / First Class"
    elif "premium" in body_lower:
        entities["cabin_class"] = "Premium Economy"
    else:
        entities["cabin_class"] = "Standard / Flexible"

    # Confirmation / PNR extraction
    pnr_match = re.search(r"(?:pnr|confirmation|ref|voucher|code)\s*#?\s*[:\-]?\s*([A-Z0-9\-_]{4,24})", raw_body, re.IGNORECASE)
    if pnr_match:
        entities["confirmation_code"] = pnr_match.group(1).upper()

    # 3. Immediate LLM Suggested Plan for Guest Inquiries
    from backend.sidecar.services.thesis_rag import generate_llm_suggested_plan

    if intent == "GUEST_INTAKE_INQUIRY":
        # Only inquiries get a plan: flight notices and vouchers should not spend free-tier model quota.
        llm_plan = generate_llm_suggested_plan(
            client_name=entities["extracted_name"],
            retreat_id=sanctuary_slug or "puerto-vallarta-2027",
            room_preference="private-suite",
            movement_experience="all-levels",
            health_notes="Inbound email inquiry",
            intentions=raw_body[:300],
        )
        entities["llm_suggested_plan"] = llm_plan
        suggested_action = (
            f"Stage new guest intake for {entities['extracted_name']} ({sanctuary_slug or 'puerto-vallarta-2027'}). "
            f"Routed to kareena@grandtravelcruise.com & armaan@grandtravelcruise.com. "
            f"Immediate LLM Suggested Plan: {llm_plan.get('summary', '')}"
        )
    elif intent == "FLIGHT_TRANSFER_UPDATE":
        flight_desc = f"Flight {entities.get('flight_number', 'TBD')} ({entities.get('airline', 'Airline')})" if 'flight_number' in entities else "Itinerary"
        suggested_action = (
            f"Route VIP flight coordination to Grand Travel & Cruise Flight Desk (kareena@grandtravelcruise.com & armaan@grandtravelcruise.com) for {entities['extracted_name']}.\n"
            f"{flight_desc} | Cabin: {entities['cabin_class']}.\n"
            f"Sync with private tarmac chauffeur and baggage service upon arrival."
        )
    elif intent == "VOUCHER_CONFIRMATION":
        suggested_action = (
            f"Reconcile voucher #{entities.get('confirmation_code', 'N/A')} against sanctuary room-block manifest. "
            f"Verify group capacity limit."
        )
    else:
        suggested_action = (
            f"Review inquiry from {entities['extracted_name']} (routed to kareena@grandtravelcruise.com & armaan@grandtravelcruise.com). "
            f"LLM Suggested Plan: {llm_plan.get('summary', '')}"
        )

    # 4. Create Staged Record (status = PENDING_APPROVAL)
    staged_email = StagedEmail(
        sender=sender,
        recipient=recipient,
        subject=subject,
        raw_body=raw_body,
        parsed_intent=intent,
        parsed_entities=entities,
        suggested_action=suggested_action,
        status="PENDING_APPROVAL"
    )
    db.add(staged_email)
    db.commit()
    db.refresh(staged_email)

    # Also stage in ActionDraft review queue with specialized routing type
    draft_type = "flight_coordination" if intent == "FLIGHT_TRANSFER_UPDATE" else "email_reply"
    # Channel capability check: ensure INBOUND_EMAIL is authorized to stage this action
    assert_channel_capability(IngestionChannel.INBOUND_EMAIL, draft_type)

    security_prefix = "[PROMPT INJECTION DETECTED - REVIEW SAFELY] " if has_injection else ""
    draft = ActionDraft(
        type=draft_type,
        guest_name=entities["extracted_name"],
        content=f"{security_prefix}PROPOSED ACTION ({draft_type.upper()}):\n{suggested_action}",
        status="pending_review"
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)

    logger.info(f"Staged email {staged_email.id} and action draft ({draft_type}) for {entities['extracted_name']}")

    # If guest inquiry, also bridge into staging_intakes in PENDING_APPROVAL
    if intent == "GUEST_INTAKE_INQUIRY":
        clinical_profile = {
            "health_notes": "Inbound email inquiry parsed by AI agent.",
            "intentions": raw_body[:250],
            "movement_experience": "Inquiry Stage"
        }
        thesis = generate_pre_call_thesis(
            client_name=entities["extracted_name"],
            sanctuary_slug=sanctuary_slug,
            room_tier="Private Villa Sanctuary",
            clinical_profile=clinical_profile
        )
        linked_intake = StagingIntake(
            source_ref=f"EMAIL-{staged_email.id[:6].upper()}",
            client_name=entities["extracted_name"],
            email=entities["extracted_email"],
            phone=entities.get("extracted_phone"),
            sanctuary_slug=sanctuary_slug,
            room_tier="Private Villa Sanctuary",
            clinical_profile=clinical_profile,
            consultation_thesis=thesis,
            status="PENDING_APPROVAL"
        )
        db.add(linked_intake)
        db.commit()
        db.refresh(linked_intake)

        staged_email.staging_intake_id = linked_intake.id
        db.commit()

    return staged_email
