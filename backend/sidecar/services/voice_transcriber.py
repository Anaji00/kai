import re
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from backend.sidecar.services.llm_service import query_llm_chat, LLMServiceError
from backend.config import settings

logger = logging.getLogger("kai_voice_transcriber")

SANCTUARY_KEYWORDS = {
    "puerto-vallarta-2027": ["puerto vallarta", "vallarta", "marival", "harmony", "armony", "banderas", "pvr", "punta de mita", "january"],
    "nosara": ["nosara", "costa rica", "nicoya", "guanacaste", "canopy", "lir"],
    "amalfi": ["amalfi", "positano", "naples", "italy", "capri", "mediterranean", "nap"],
    "bali": ["bali", "ubud", "canggu", "indonesia", "dps"],
    "riviera-maya": ["riviera", "maya", "tulum", "cancun", "cenote", "cun"]
}

ROOM_TIER_KEYWORDS = {
    "Marival Harmony Oceanfront Suite": ["marival", "harmony", "armony", "banderas", "oceanfront suite"],
    "Cliffside Stillness Suite": ["cliffside", "stillness", "cliff", "suite"],
    "Shared Ocean Pavilion": ["shared", "pavilion", "shared ocean", "twin"],
    "Private Villa Sanctuary": ["private villa", "villa", "ocean villa", "master villa", "private canopy"]
}

CONTRAINDICATION_TRIGGERS = [
    "epilepsy", "seizure", "pregnant", "pregnancy", "trimester",
    "cardiovascular", "aneurysm", "pacemaker", "uncontrolled hypertension"
]


def extract_entities_from_transcript(transcript: str) -> Dict[str, Any]:
    """
    Parses natural language consultation dictation from Founder Kareena Islam.
    Extracts guest name, travel coordinates, room tier, wellness intention,
    and elevated clinical safety flags if acute contraindications are noted.
    """
    text = transcript.strip()
    text_lower = text.lower()

    # 1. Guest Name Extraction (supports Dr., Prof., Mr., Ms., Mrs. honorifics)
    client_name = "Prospective Guest"
    name_match = re.search(r'(?:with|for|spoke with|consultation with|call with|guest)\s+((?:(?:Dr\.|Dr|Prof\.|Prof|Mr\.|Mr|Ms\.|Ms|Mrs\.|Mrs)\s+)?[A-Z][a-zA-Z\'-]+(?:\s+[A-Z][a-zA-Z\'-]+)+)', text)
    if name_match:
        client_name = name_match.group(1).strip()
    else:
        # Fallback regex without strict capitalization
        name_match_soft = re.search(r'(?:with|for|guest)\s+((?:(?:Dr\.|Dr|Prof\.|Prof|Mr\.|Mr|Ms\.|Ms|Mrs\.|Mrs)\s+)?[a-zA-Z\'-]+(?:\s+[a-zA-Z\'-]+))', text, re.IGNORECASE)
        if name_match_soft:
            cand = name_match_soft.group(1).strip()
            if cand.lower() not in ["our", "the", "a", "an", "this", "that", "nosara", "amalfi", "bali"]:
                client_name = cand.title()

    # 2. Email Derivation
    sanitized_name = re.sub(r'[^a-zA-Z0-9]+', '.', client_name.lower()).strip('.')
    email = f"{sanitized_name}@vip.kai"

    # 3. Sanctuary Selection
    sanctuary_slug = "puerto-vallarta-2027"
    for slug, kws in SANCTUARY_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            sanctuary_slug = slug
            break

    # 4. Room Tier Selection
    room_tier = "Private Villa Sanctuary"
    for tier, kws in ROOM_TIER_KEYWORDS.items():
        if any(kw in text_lower for kw in kws):
            room_tier = tier
            break

    # 5. Flight & Air Desk Info
    departure_airport = "MIA"
    airport_match = re.search(r'\b(?:from|out of|airport|flying from)\s+([A-Z]{3})\b', text, re.IGNORECASE)
    if airport_match:
        departure_airport = airport_match.group(1).upper()
    elif "chicago" in text_lower or "ord" in text_lower:
        departure_airport = "ORD"
    elif "new york" in text_lower or "jfk" in text_lower or "lga" in text_lower:
        departure_airport = "JFK"
    elif "london" in text_lower or "lhr" in text_lower:
        departure_airport = "LHR"
    elif "houston" in text_lower or "iah" in text_lower:
        departure_airport = "IAH"

    flight_num_match = re.search(r'\b([A-Z]{2}\s*\d{2,4})\b', text)
    flight_number = flight_num_match.group(1).replace(" ", "") if flight_num_match else None

    # 6. Wellness & Restorative Profile (Primary Base Case)
    primary_focus = "Nervous system decompression and unbroken circadian sleep"
    if "burnout" in text_lower:
        primary_focus = "Deep executive burnout recovery and nervous system recalibration"
    elif "sleep" in text_lower or "insomnia" in text_lower:
        primary_focus = "Circadian sleep restoration and delta-wave sleep recovery"
    elif "quiet" in text_lower or "stillness" in text_lower:
        primary_focus = "Sensory stillness and restorative quietude"

    preferred_rhythm = "Gentle sunrise somatic yoga, 432Hz acoustic grounding, silent evenings"
    if "morning" in text_lower or "sunrise" in text_lower:
        preferred_rhythm = "Silent sunrise contemplation, titrated prana breathwork"

    nutrition_preferences = "Anti-inflammatory Blue Zone organic botanicals, local whole foods"
    if "plant" in text_lower or "vegan" in text_lower:
        nutrition_preferences = "Plant-forward, cold-pressed botanical oils, local organic greens"
    elif "gluten" in text_lower:
        nutrition_preferences = "Strictly gluten-free, anti-inflammatory whole foods"

    # 7. Elevated Clinical Screening (Specialized Feature Flag)
    clinical_screening_enabled = False
    clinical_flags = []
    # The clinical engine reads these notes, so they carry what was actually dictated. A summary here would
    # hide allergies and medications from it.
    clinical_notes = f"Dictated in consultation: {text}"

    for trigger in CONTRAINDICATION_TRIGGERS:
        if trigger in text_lower:
            clinical_screening_enabled = True
            flag_name = f"ELEVATED_{trigger.upper()}_ALERT"
            clinical_flags.append(flag_name)

    if clinical_screening_enabled:
        clinical_notes = f"Elevated clinical review active for {client_name}: flagged considerations regarding {', '.join(clinical_flags)}. {clinical_notes}"

    # 8. Try structured LLM parsing with Groq when configured, fallback cleanly to rule-based
    try:
        llm_prompt = f"""Voice memo transcription from founder Kareena Islam dictating guest details:
"{text}"

Extract the GUEST details (the guest being consulted, NOT the founder Kareena Islam). Return ONLY a JSON object with:
{{
  "guest_name": "string or null",
  "sanctuary_slug": "puerto-vallarta-2027 | nosara | amalfi | bali | riviera-maya or null",
  "room_tier": "string or null",
  "primary_focus": "string or null",
  "nutrition_preferences": "string or null",
  "departure_airport": "3-letter IATA code or null"
}}
"""
        raw_llm = query_llm_chat(
            system_prompt="You are an AI concierge assistant. You extract guest details from voice notes. Return ONLY valid JSON.",
            user_message=llm_prompt,
            model=settings.GROQ_MODEL,
            max_tokens=400, json_mode=True
        )
        # Attempt to parse json from LLM if present
        json_match = re.search(r'\{.*\}', raw_llm, re.DOTALL)
        if json_match:
            import json
            parsed_json = json.loads(json_match.group(0))
            cand_name = parsed_json.get("guest_name") or parsed_json.get("client_name")
            if cand_name and isinstance(cand_name, str) and len(cand_name.strip()) > 2:
                if cand_name.lower() not in ["kareena islam", "kareena", "founder", "prospective guest", "islam"]:
                    client_name = cand_name.strip()

            cand_sanctuary = parsed_json.get("sanctuary_slug")
            if isinstance(cand_sanctuary, str) and cand_sanctuary.lower() in SANCTUARY_KEYWORDS:
                sanctuary_slug = cand_sanctuary.lower()

            cand_focus = parsed_json.get("primary_focus")
            if cand_focus:
                if isinstance(cand_focus, list):
                    primary_focus = ", ".join(str(x) for x in cand_focus)
                elif isinstance(cand_focus, str):
                    primary_focus = cand_focus

            cand_nutrition = parsed_json.get("nutrition_preferences")
            if cand_nutrition:
                if isinstance(cand_nutrition, list):
                    nutrition_preferences = ", ".join(str(x) for x in cand_nutrition)
                elif isinstance(cand_nutrition, str):
                    nutrition_preferences = cand_nutrition

            cand_airport = parsed_json.get("departure_airport")
            if isinstance(cand_airport, str) and len(cand_airport.strip()) == 3:
                departure_airport = cand_airport.strip().upper()
    except Exception as e:
        logger.debug(f"LLM voice parsing fallback: {e}")

    # Ensure types are string
    if isinstance(primary_focus, list):
        primary_focus = ", ".join(str(x) for x in primary_focus)
    primary_focus = str(primary_focus)

    if isinstance(nutrition_preferences, list):
        nutrition_preferences = ", ".join(str(x) for x in nutrition_preferences)
    nutrition_preferences = str(nutrition_preferences)

    # Re-derive email based on final client_name
    sanitized_name = re.sub(r'[^a-zA-Z0-9]+', '.', client_name.lower()).strip('.')
    email = f"{sanitized_name}@vip.kai"

    # Build welcome note for Action Draft
    welcome_content = (
        f"Dearest {client_name},\n\n"
        f"Thank you for taking the time to connect during our consultation call today. "
        f"It was an honor to hear your reflections on {primary_focus.lower()}.\n\n"
        f"I have personally curated your reservation for the KAI {sanctuary_slug.replace('-', ' ').title()} Sanctuary "
        f"in our {room_tier}, ensuring complete quietude, circadian harmony, and unbroken sleep.\n\n"
        f"Our travel coordinators at Grand Travel & Cruise (Funjet 500 Club volume contract) are standing by "
        f"to manage your flight logistics from {departure_airport} "
        f"{f'(Flight {flight_number})' if flight_number else ''} with seamless private tarmac transit.\n\n"
        f"Your reservation has been staged with the KAI Sanctuary Travel CRM. Once you review and authorize the itinerary, "
        f"your 30% deposit hold will be confirmed.\n\n"
        f"With warmth and restorative stillness,\n\n"
        f"Kareena Islam\n"
        f"Founder & Restorative Curator | KAI Wellness Retreats"
    )

    return {
        "client_name": client_name,
        "email": email,
        "sanctuary_slug": sanctuary_slug,
        "room_tier": room_tier,
        "wellness_profile": {
            "primary_focus": primary_focus,
            "preferred_rhythm": preferred_rhythm,
            "nutrition_preferences": nutrition_preferences,
            "sleep_goals": "8+ hours unbroken delta-wave restorative quietude",
            "dictated_memo": text
        },
        "clinical_screening_enabled": clinical_screening_enabled,
        "clinical_profile": {
            "health_notes": clinical_notes,
            "flags": clinical_flags
        },
        "flight_request": {
            "departure_airport": departure_airport,
            "cabin_class": "Business / Lie-Flat",
            "flight_number": flight_number,
            "air_desk": "Grand Travel & Cruise (Funjet 500 Club)"
        },
        "welcome_email_draft": welcome_content,
        "automated_records_populated": [
            f"Staged Guest Intake & Clinical Profile ({client_name})",
            f"AI Suggested Retreat & Cultural Plan ({sanctuary_slug})",
            f"Welcome Email & Flight Desk Draft (routed to kareena@grandtravelcruise.com & armaan@grandtravelcruise.com)",
            f"Dietary & Somatic Kitchen Brief ({nutrition_preferences})",
            f"Grand Travel PVR/Airport Transfer Request ({departure_airport})",
        ],
        "extracted_at": datetime.now(timezone.utc).isoformat()
    }
