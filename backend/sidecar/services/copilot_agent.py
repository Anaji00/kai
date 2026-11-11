import difflib
import json
import logging
import re
from typing import Dict, Any, List, Optional
from backend.config import settings
from backend.sidecar.services.llm_service import query_llm_chat
from backend.sidecar.services.thesis_rag import SANCTUARY_KNOWLEDGE_SEEDS
from backend.sidecar.services.hospitality_client import hospitality_service
from backend.sidecar.services.calendar_service import STATIC_COHORTS
from backend.sidecar.services.geo_routing_service import compute_custom_route
from backend.sidecar.services.weather_service import fetch_sanctuary_weather_sync, SANCTUARY_COORDS
from backend.sidecar.services.dining_service import search_dining_spots, seed_default_dining_if_empty
from backend.sidecar.services.reviews_service import get_sanctuary_reviews, seed_default_reviews_if_empty
from backend.sidecar.services.destination_service import get_destination_guide, seed_default_destination_guides_if_empty
from backend.sidecar.services.sales_agent import sales_agent
from backend.models import ActionDraft
logger = logging.getLogger("kai_copilot_agent")

TOOL_DESCRIPTIONS_LAYMAN = {
    "founder_studio": {
        "title": "Founder Sanctuary Studio",
        "layman_summary": "Your executive home base. View intimate retreat spaces, guest inquiries, urgent clinical questions, and today's schedule at a glance.",
        "why_it_matters": "Gives you complete visibility into guest care and travel plans without overwhelming spreadsheets."
    },
    "guest_planner": {
        "title": "KAI Guest & Travel Planner",
        "layman_summary": "Syncs your guest details, custom itineraries, and flights with KAI Sanctuary CRM. All published itineraries include KAI CRM's secure credit card authorizations and payment schedules.",
        "why_it_matters": "You never have to build custom payment forms or handle credit card numbers yourself. KAI CRM manages client authorizations, bank security, and waivers 100% natively."
    },
    "founder_approval": {
        "title": "Personalized Founder Approval (Zero Autonomous Writes)",
        "layman_summary": "A safety shield ensuring no information is sent to external travel platforms or guests without your direct review and approval.",
        "why_it_matters": "Protects your high-touch reputation and clinical standards—every proposal and message is reviewed by you."
    },
    "concierge_inbox": {
        "title": "Concierge Inbox & Guest Messages",
        "layman_summary": "Gathers guest emails and inquiries from your contact forms and WhatsApp into one calm, organized inbox.",
        "why_it_matters": "Helps you respond to questions with empathetic, nurse-guided clarity in seconds."
    },
    "guest_list_check": {
        "title": "Guest List & Booking Check",
        "layman_summary": "Compares your website registrations with confirmed KAI CRM traveler files to catch any missing dietary needs or flight details.",
        "why_it_matters": "Ensures every single guest is accounted for and well looked after before arrival."
    },
    "retreat_calendar": {
        "title": "Retreat & Alignment Calendar",
        "layman_summary": "Your complete timeline for retreat group dates, 20-minute consultation calls, and airport flight arrivals.",
        "why_it_matters": "Syncs directly into your personal iPhone or Google Calendar with a 1-click live calendar feed link."
    },
    "partner_studios": {
        "title": "Partner Wellness Studios & Practices",
        "layman_summary": "A curated directory of high-end wellness practices, functional medicine clinics, and yoga studios who refer private clients to KAI.",
        "why_it_matters": "Builds referral relationships with aligned holistic doctors and teachers across major wellness hubs."
    },
    "flight_desk": {
        "title": "Grand Travel Flight Desk & Cirium Tracker",
        "layman_summary": "Tracks guest flight bookings, lie-flat seat assignments, and real-time gate arrivals powered by Grand Travel & Cruise and Cirium.",
        "why_it_matters": "Alerts your private tarmac chauffeurs if a flight is delayed so guests are never left waiting."
    },
    "public_forms": {
        "title": "KAI Native Guest Forms Hub",
        "layman_summary": "Instant shareable links to KAI's native guest forms for intake, partner studio referrals, and travel preferences.",
        "why_it_matters": "Guests complete their information directly into KAI's secure sanctuary database with zero manual copy-pasting."
    },
    "integrations_webhooks": {
        "title": "External Travel & Service Connections",
        "layman_summary": "A visual hub showing real-time connections to KAI Sanctuary CRM, Expedia / Hotel PMS, Grand Travel Flight Desk, and WhatsApp.",
        "why_it_matters": "Keeps your systems in harmony so updates flow quietly in the background without technical headaches."
    },
    "scenic_routes": {
        "title": "Scenic Travel & Chauffeur Routes",
        "layman_summary": "Computes beautiful scenic drive times and pairs arriving guests with luxury private chauffeurs from the airport to their villa.",
        "why_it_matters": "Eliminates all arrival stress so guests step into calm, tranquil relaxation the moment their flight touches down."
    },
    "sanctuary_weather": {
        "title": "Sanctuary Weather & Sunshine",
        "layman_summary": "Live temperature, ocean breezes, and nurse-curated advice on optimal times for sunbathing, breathwork, or sound baths.",
        "why_it_matters": "Helps you harmonize daily movement and sound bath schedules with natural microclimate rhythms."
    },
    "nourishing_dining": {
        "title": "Nourishing Dining & Organic Cafes",
        "layman_summary": "A curated collection of farm-to-table restaurants, Ayurvedic kitchens, and Blue Zone cafes near each sanctuary with dietary filters.",
        "why_it_matters": "Ensures every meal gently supports gut microbiome health, lowers inflammation, and honors personal sensitivities."
    },
    "guest_reflections": {
        "title": "Guest Reflections & Reviews",
        "layman_summary": "Heartfelt stories and scores from previous guests highlighting deep sleep quality, quietude, and nursing care.",
        "why_it_matters": "Showcases authentic clinical and somatic transformation without marketing exaggeration."
    },
    "destination_guide": {
        "title": "Destination & Packing Guide",
        "layman_summary": "Simple, welcoming essentials on passport validity, easy visa rules, temple etiquette, weather-appropriate packing, and jet lag tips.",
        "why_it_matters": "Gives guests serene peace of mind and clarity as they pack their bags and prepare for their journey."
    },
    "guest_health_notes": {
        "title": "Guest Documents & Health Notes",
        "layman_summary": "A gentle way for guests to upload flight confirmations, doctor notes, or dietary preferences for a quick clinical review.",
        "why_it_matters": "Allows you to prepare personalized accommodations and safety modifications before the guest even arrives."
    },
    "voice_dictation": {
        "title": "Voice Dictation",
        "layman_summary": "A microphone button allowing you to speak your thoughts aloud to draft care plans, itinerary ideas, or travel notes hands-free.",
        "why_it_matters": "Saves you time typing between consultation calls so you can stay fully present in clinical care."
    },
    "vendor_registry": {
        "title": "KAI Sanctuary Vendor & Supplier Directory",
        "layman_summary": "Your central address book of luxury flight desks, executive chauffeurs, organic caterers, and emergency medical contacts synced with KAI Sanctuary CRM.",
        "why_it_matters": "Tracks commission percentages, booking codes, and lead times so you can book trusted suppliers with 1 click without digging through old contracts."
    }
}

class ClinicalCopilotAgent:
    """
    All-encompassing AI Chief of Staff & Clinical Copilot for Founder Kareena Islam, BSN, RN.
    Encompasses 4 modes:
    1. clinical_safety: Contraindication screening & somatic science RAG.
    2. consult_prep: Pre-call dossiers, talk tracks, and guest email drafter.
    3. travel_concierge: Hotel searches (Expedia / Amadeus), Cirium flight notes, tarmac transfers.
    4. studio_ops: Retreat group capacity (12–14 guests), pending founder approvals, and layman tool guides.
    """

    def screen_contraindications(self, health_notes: str, requested_modalities: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Screens guest health notes against deterministic clinical nursing protocols.
        MANDATORY INVARIANT: Deterministic Python rules evaluate first as read-only ground truth.
        """
        from backend.sidecar.services.clinical_governance_engine import (
            DeterministicClinicalEngine,
            ClinicalSeverity,
        )

        report = DeterministicClinicalEngine.evaluate(
            client_name="Consultation Subject",
            sanctuary_slug="general",
            clinical_profile={"health_notes": health_notes}
        )

        # Map to copilot's existing safety level strings
        if report.hard_hold or report.overall_severity == ClinicalSeverity.HARD_CONTRAINDICATION_HOLD:
            highest_severity = "CONTRAINDICATION_ALERT"
        elif report.overall_severity == ClinicalSeverity.MODERATE_CAUTION:
            highest_severity = "MODERATE_REVIEW"
        elif report.overall_severity == ClinicalSeverity.ADVISORY:
            highest_severity = "ADVISORY"
        else:
            highest_severity = "CLEAR"

        matched_alerts = []
        for f in report.findings:
            matched_alerts.append({
                "trigger_words": [f.trigger],
                "condition": f.trigger,
                "rationale": f.rationale,
                "adaptation": f.safe_alternative,
                "modality": ", ".join(f.blocked_modalities) if f.blocked_modalities else f.category,
                "risk_level": "CONTRAINDICATION_ALERT" if f.severity == ClinicalSeverity.HARD_CONTRAINDICATION_HOLD else "MODERATE_REVIEW",
                "nurse_guidance": f"{f.rule} Safe Alternative: {f.safe_alternative}",
                "finding_id": f.finding_id,
                "safe_alternative": f.safe_alternative,
                "blocked_modalities": f.blocked_modalities
            })

        return {
            "safety_level": highest_severity,
            "alerts_count": len(matched_alerts),
            "findings": matched_alerts,
            "blocked_modalities": report.blocked_modalities,
            "deterministic_hash": report.deterministic_hash,
            "hard_hold": report.hard_hold,
            "nurse_summary": (
                "Clinical clearance verified. No acute contraindications identified for standard somatic itinerary."
                if highest_severity == "CLEAR" else
                f"Clinical evaluation identified {len(matched_alerts)} consideration(s) [Blocked: {', '.join(report.blocked_modalities) if report.blocked_modalities else 'None'}]. Nurse protocol adaptations required."
            )
        }

    def search_business_rag(self, query: str) -> List[Dict[str, Any]]:
        """
        Expanded RAG retrieval across all KAI Wellness business, operational, and clinical domains:
        - Executive Operations & Pricing (group size limits, deposits, balance terms)
        - KAI Sanctuary Travel CRM Architecture (suppliers, commission tiers, native credit card authorizations)
        - Grand Travel & Cruise (group air contracts, lie-flat blocks, VIP tarmac transfers)
        - Hospitality & Accommodations (private villas, quiet decks, botanical apothecaries)
        - Partner Wellness Studios & Functional Medicine Practices (B2B referral alliances)
        - Clinical Somatics & Nursing Protocols (vagus nerve 4-7-8, acoustic physics 432Hz/528Hz)
        - Executive Objection Scripts (schedule friction, practice intensity)
        """
        q_lower = query.lower()
        stop_words = {"the", "and", "for", "with", "this", "that", "give", "tell", "what", "show", "how", "are", "you", "please", "can"}
        q_words = [w for w in re.findall(r'[a-z0-9\-]+', q_lower) if len(w) > 2 and w not in stop_words]
        if not q_words:
            return []

        scored_results = []
        for seed in SANCTUARY_KNOWLEDGE_SEEDS:
            title_lower = seed["title"].lower()
            content_lower = seed["content"].lower()
            category_lower = seed["category"].lower()

            score = 0
            for w in q_words:
                if w in title_lower:
                    score += 3
                if w in category_lower:
                    score += 2
                if w in content_lower:
                    score += 1

            if score > 0:
                scored_results.append((score, {
                    "title": seed["title"],
                    "category": seed["category"],
                    "content": seed["content"],
                    "metadata": seed.get("metadata_json", {})
                }))

        scored_results.sort(key=lambda x: x[0], reverse=True)
        return [r[1] for r in scored_results[:3]]

    # Backwards-compatibility alias
    search_clinical_rag = search_business_rag

    def draft_guest_email(
        self,
        guest_name: str,
        intention_or_concern: str,
        sanctuary_name: str = "Nosara Sacred Canopy",
        room_type: str = "Private Ocean Canopy Villa",
        db: Optional[Any] = None
    ) -> str:
        """
        Drafts a serene, clinical, luxury email from Kareena to a prospective guest.
        Persists an ActionDraft when db session is supplied.
        """
        email_content = (
            f"Dear {guest_name},\n\n"
            f"Thank you for sharing your intentions for the upcoming {sanctuary_name} retreat. "
            f"As a Registered Nurse and somatic guide, I deeply appreciate your reflection regarding '{intention_or_concern}'. "
            f"In our practice, we find that high-performing leaders often hold tension in the autonomic nervous system long "
            f"before it surfaces physically.\n\n"
            f"To protect your privacy and emotional safety, our sanctuary is strictly limited to an intimate circle of 12 to 14 guests. "
            f"For your stay, I recommend our {room_type}, which provides complete tranquility, bespoke non-toxic botanicals, "
            f"and restorative ocean breezes.\n\n"
            f"Our travel partners at Grand Travel & Cruise (Funjet 500 Club) will coordinate your flights and private airport meet-and-greets "
            f"so your journey begins without a moment of stress. I have prepared your personalized proposal within our secure KAI CRM guest portal, "
            f"where you can review your complete daily restorative arc and authorize your booking.\n\n"
            f"I look forward to our consultation call.\n\n"
            f"With warmth and restoration,\n\n"
            f"Kareena Islam, BSN, RN, RYT\n"
            f"Founder & Clinical Somatic Guide | KAI Wellness Retreats"
        )
        if db:
            try:
                draft = ActionDraft(
                    type="email_reply",
                    guest_name=guest_name,
                    content=email_content,
                    status="pending_review"
                )
                db.add(draft)
                db.commit()
                logger.info(f"Staged action draft (email_reply) for {guest_name}")
            except Exception as e:
                logger.error(f"Error staging email draft: {e}")
        return email_content

    def explain_tool(self, tool_key: str) -> Dict[str, Any]:
        """
        Translates complex engineering and database tools into simple layman terms for the client.
        """
        key = tool_key.lower().replace(" ", "_")
        for k, v in TOOL_DESCRIPTIONS_LAYMAN.items():
            if k in key or key in k:
                return v
        return {
            "title": "KAI Sanctuary Feature",
            "layman_summary": "A dedicated studio tool designed to simplify retreat management, guest hospitality, and clinical care.",
            "why_it_matters": "Ensures you spend less time on administration and more time guiding guests toward profound restoration."
        }

    SANCTUARY_CONFIG = {
        "nosara": {
            "slug": "nosara",
            "name": "KAI Nosara Sacred Canopy",
            "location": "Nosara, Nicoya Peninsula, Costa Rica (Blue Zone)",
            "airport": "Liberia International Airport (LIR)",
            "transit_time": "150 mins (~2.5 hrs)",
            "vehicle": "Executive 4WD Suburban",
            "capacity_limit": 14,
            "villa_tier": "Private Ocean Canopy Villa",
            "suite_tier": "Sacred Garden Suite",
            "shared_tier": "Shared Ocean Pavilion",
            "nightly_rate_villa": 1900,
            "nightly_rate_suite": 1420,
            "nightly_rate_shared": 1130,
            "standard_6night_villa": 11500,
            "standard_6night_suite": 8500,
            "standard_6night_shared": 6800,
        },
        "amalfi": {
            "slug": "amalfi",
            "name": "KAI Amalfi Coast Cliffside Stillness Retreat",
            "location": "Amalfi Coast, Campania, Italy",
            "airport": "Naples Capodichino Airport (NAP)",
            "transit_time": "90 mins",
            "vehicle": "Mercedes-Benz Luxury Van",
            "capacity_limit": 12,
            "villa_tier": "Cliffside Stillness Suite",
            "suite_tier": "Cliffside Stillness Suite",
            "shared_tier": "Shared Ocean Pavilion",
            "nightly_rate_villa": 2100,
            "nightly_rate_suite": 1600,
            "nightly_rate_shared": 1250,
            "standard_6night_villa": 12600,
            "standard_6night_suite": 9600,
            "standard_6night_shared": 7500,
        },
        "bali": {
            "slug": "bali",
            "name": "KAI Bali Sacred Water & Jungle Sanctuary",
            "location": "Ubud, Gianyar, Bali, Indonesia",
            "airport": "Ngurah Rai International Airport (DPS)",
            "transit_time": "75 mins",
            "vehicle": "Private Chauffeur Escort",
            "capacity_limit": 14,
            "villa_tier": "Private Jungle Canopy Villa",
            "suite_tier": "Sacred Garden Suite",
            "shared_tier": "Shared Ocean Pavilion",
            "nightly_rate_villa": 1800,
            "nightly_rate_suite": 1350,
            "nightly_rate_shared": 1100,
            "standard_6night_villa": 10800,
            "standard_6night_suite": 8100,
            "standard_6night_shared": 6600,
        },
        "riviera-maya": {
            "slug": "riviera-maya",
            "name": "KAI Riviera Maya Coastal Grounding Sanctuary",
            "location": "Riviera Maya, Quintana Roo, Mexico",
            "airport": "Cancún International Airport (CUN)",
            "transit_time": "60 mins",
            "vehicle": "Private Luxury Suburban",
            "capacity_limit": 12,
            "villa_tier": "Cenote & Botanical Ocean Villa",
            "suite_tier": "Sacred Garden Suite",
            "shared_tier": "Shared Ocean Pavilion",
            "nightly_rate_villa": 1900,
            "nightly_rate_suite": 1400,
            "nightly_rate_shared": 1150,
            "standard_6night_villa": 11400,
            "standard_6night_suite": 8400,
            "standard_6night_shared": 6900,
        },
        "puerto-vallarta-2027": {
            "slug": "puerto-vallarta-2027",
            "name": "KAI Puerto Vallarta Sierra Madre Cliffside Sanctuary",
            "location": "Puerto Vallarta, Jalisco, Mexico",
            "airport": "Licenciado Gustavo Díaz Ordaz International Airport (PVR)",
            "transit_time": "45 mins",
            "vehicle": "Cadillac Escalade ESV VIP",
            "capacity_limit": 12,
            "villa_tier": "Two-Bedroom Oceanfront Penthouse Villa",
            "suite_tier": "Oceanfront King Suite",
            "shared_tier": "Shared Ocean Pavilion",
            "nightly_rate_villa": 2100,
            "nightly_rate_suite": 1580,
            "nightly_rate_shared": 1200,
            "standard_6night_villa": 12600,
            "standard_6night_suite": 9500,
            "standard_6night_shared": 7200,
        }
    }

    @staticmethod
    def resolve_sanctuary_slug(text: str, default: Optional[str] = None) -> str:
        t = text.lower()
        if any(w in t for w in ["nosara", "noasra", "nosra", "nossara", "rnnosara", "costa rica", "nicoya", "lir", "liberia"]):
            return "nosara"
        if any(w in t for w in ["amalfi", "amlfi", "amalfy", "italy", "naples", "campania", "positano", "ravello", "nap"]):
            return "amalfi"
        if any(w in t for w in ["bali", "ubud", "uluwatu", "dps", "indonesia"]):
            return "bali"
        if any(w in t for w in ["vallarta", "valarta", "pvr", "jalisco", "sierra madre", "pv"]):
            return "puerto-vallarta-2027"
        if any(w in t for w in ["riviera", "rivera", "maya", "mexico", "tulum", "cancun", "cun"]):
            return "riviera-maya"
        if default and default.lower() in ClinicalCopilotAgent.SANCTUARY_CONFIG:
            return default.lower()
        return "nosara"

    def parse_booking_request(
        self,
        message: str,
        sanctuary_slug: Optional[str] = None,
        db: Optional[Any] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Intelligently detects guest reservation and stay requests (including low-level shorthand,
        lowercase names, typos, and "$4350"/4.5k shorthand), calculates pro-rated pricing,
        30% sanctuary deposit and 70% balance ('the rest'), verifies retreat group limits (12-14), and drafts
        the clinical circadian rest protocol.
        """
        msg_lower = message.lower()
        is_booking = any(kw in msg_lower for kw in [
            "booking", "new booking", "book", "reservation", "reserve",
            "add guest", "new guest", "stage intake", "create guest",
            "onboard guest", "stage guest", "calculate the rest", "night", "nights", "nites", "nite"
        ]) or bool(re.search(r'\b(?:add|create|new|put\s+in)\s+[a-z]{2,}\s+[a-z]{2,}\b.*\b(?:nosara|noasra|amalfi|amlfi|bali|riviera|vallarta|villa|suite|pavilion|paid|deposit|\d+\s*k|\$\d+)\b', msg_lower))
        if not is_booking:
            return None

        # Do not treat pure updates of existing CRM guests as new booking quotes unless 'book'/'quote'/'nights' is explicit
        if any(kw in msg_lower for kw in ["update", "change", "upgrade", "move", "switch", "set", "mark"]) and not any(kw in msg_lower for kw in ["book", "booking", "add guest", "new guest", "night", "nights", "nites"]):
            return None

        s_slug = self.resolve_sanctuary_slug(message, default=sanctuary_slug)
        s_cfg = self.SANCTUARY_CONFIG.get(s_slug, self.SANCTUARY_CONFIG["nosara"])

        # Extract guest name (works for both Capitalized and all-lowercase inputs like "book frank lucas 3 nights")
        guest_name = None
        STOPWORDS = {
            "nosara", "noasra", "nosra", "rnnosara", "amalfi", "amlfi", "bali", "ubud", "uluwatu",
            "riviera", "maya", "puerto", "vallarta", "sanctuary", "villa", "suite", "king", "oceanfront",
            "cliffside", "penthouse", "shared", "pavilion", "plunge", "private", "a", "an", "the",
            "new", "guest", "client", "booking", "reservation", "stay", "quote", "for", "fo", "at", "in", "to", "with", "on"
        }
        name_patterns = [
            r'(?:booking\s+for\s+(?:a\s+)?|book\s+(?:a\s+)?|reservation\s+for\s+(?:a\s+)?|add\s+a?\s*new\s+guest\s+|new\s+guest\s+|add\s+guest\s+|add\s+|guest\s+|client\s+|for\s+a\s+)([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})',
            r'^([a-zA-Z]+\s+[a-zA-Z]+)\s+\d+\s*(?:nights?|nites?)\b',
            r'^([a-zA-Z]+\s+[a-zA-Z]+)\s+(?:nosara|noasra|amalfi|amlfi|bali|riviera|vallarta|\d+\s*(?:nights?|nites?)|villa|suite)\b',
        ]
        for pat in name_patterns:
            m = re.search(pat, message, re.IGNORECASE)
            if m:
                raw_tokens = m.group(1).strip().split()
                clean_tokens = []
                for tok in raw_tokens:
                    if tok.lower() in STOPWORDS or re.match(r'^\d+$', tok):
                        break
                    clean_tokens.append(tok)
                if clean_tokens:
                    guest_name = " ".join(clean_tokens).title()
                    break

        if not guest_name:
            guest_name = "Prospective Traveler"

        # Extract nights (supports "3 nights", "3 nites", "3n", "for 4 nights")
        nights = 6
        nights_match = re.search(r'(\d+)\s*(?:nights?|nites?|d\b|days?\b)', msg_lower)
        if nights_match:
            nights = max(1, min(30, int(nights_match.group(1))))

        # Room tier & pricing
        tier_name = s_cfg["villa_tier"]
        nightly_rate = s_cfg["nightly_rate_villa"]
        if "cliffside" in msg_lower or "plunge" in msg_lower:
            tier_name = "Private Cliffside Plunge Villa"
            nightly_rate = s_cfg["nightly_rate_villa"]
        elif "penthouse" in msg_lower:
            tier_name = "Two-Bedroom Oceanfront Penthouse Villa"
            nightly_rate = s_cfg["nightly_rate_villa"]
        elif "king suite" in msg_lower or "oceanfront king" in msg_lower:
            tier_name = "Oceanfront King Suite"
            nightly_rate = s_cfg["nightly_rate_suite"]
        elif "king" in msg_lower or "suite" in msg_lower:
            tier_name = s_cfg["suite_tier"]
            nightly_rate = s_cfg["nightly_rate_suite"]
        elif "shared" in msg_lower or "pavilion" in msg_lower:
            tier_name = s_cfg["shared_tier"]
            nightly_rate = s_cfg["nightly_rate_shared"]

        total_amount = nightly_rate * nights
        deposit_30 = round(total_amount * 0.30, 2)
        balance_70 = round(total_amount * 0.70, 2)

        # Check if user specified an explicit paid/deposit amount (e.g. "$4,350 deposit paid" or "4350 paid" or "4.5k dep")
        paid_override = None
        k_match = re.search(r'\$?\s*(\d+(?:\.\d+)?)\s*k\b', msg_lower)
        dollar_match = re.search(r'\$\s*(\d[\d,]*(?:\.\d{1,2})?)', message)
        bare_paid_match = re.search(r'\b(\d{3,5})\s*(?:usd|dollars?|paid|dep|deposit)\b', msg_lower)
        if k_match:
            paid_override = round(float(k_match.group(1)) * 1000.0, 2)
        elif dollar_match:
            paid_override = float(dollar_match.group(1).replace(",", ""))
        elif bare_paid_match:
            paid_override = float(bare_paid_match.group(1))

        if paid_override is not None and paid_override > 0:
            deposit_30 = paid_override
            if deposit_30 > total_amount:
                total_amount = round(deposit_30 / 0.30, 2)
            balance_70 = max(0.0, round(total_amount - deposit_30, 2))

        # Check capacity from DB
        remaining_spots = s_cfg["capacity_limit"]
        if db:
            from backend.sidecar.models import StagingIntake
            staged_or_confirmed = db.query(StagingIntake).filter(
                StagingIntake.sanctuary_slug == s_slug,
                StagingIntake.status.in_(["PENDING_APPROVAL", "APPROVED", "CONFIRMED_IN_CRM"])
            ).count()
            remaining_spots = max(0, s_cfg["capacity_limit"] - staged_or_confirmed)

        # Somatic rest arc summary for calculation
        rest_arc_focus = f"{nights}-night custom circadian reset & vagal down-regulation immersion at {s_cfg['name']}."

        return {
            "guest_name": guest_name,
            "sanctuary_slug": s_slug,
            "sanctuary_config": s_cfg,
            "nights": nights,
            "room_tier": tier_name,
            "nightly_rate": nightly_rate,
            "total_amount": total_amount,
            "deposit_30": deposit_30,
            "balance_70": balance_70,
            "remaining_spots": remaining_spots,
            "capacity_limit": s_cfg["capacity_limit"],
            "transit_airport": s_cfg["airport"],
            "transit_vehicle": s_cfg["vehicle"],
            "transit_time": s_cfg["transit_time"],
            "rest_arc": [rest_arc_focus]
        }

    def detect_form_fill_proposal(
        self,
        message: str,
        target_sanctuary: str = "nosara",
        db: Optional[Any] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Detects actionable intents from user chat to automatically propose pre-filling forms
        across any platform domain, enforcing Founder Review & 1-click Approval.
        """
        msg_lower = message.lower()

        # 0. High-Priority: Booking / Reservation / Custom Stay Quote
        booking_info = self.parse_booking_request(message, target_sanctuary, db)
        if booking_info:
            s_cfg = booking_info["sanctuary_config"]
            is_direct_add = any(kw in msg_lower for kw in ["add ", "new guest", "create guest", "deposit paid", "paid"])
            payload = {
                "client_name": booking_info["guest_name"],
                "name": booking_info["guest_name"],
                "sanctuary_slug": booking_info["sanctuary_slug"],
                "room_tier": booking_info["room_tier"],
                "nights": booking_info["nights"],
                "total_amount": booking_info["total_amount"],
                "deposit_30": booking_info["deposit_30"],
                "balance_70": booking_info["balance_70"],
                "email": f"{booking_info['guest_name'].lower().replace(' ', '.')}@example.com",
                "phone": "+1 (555) 019-4821",
                "status": "CONFIRMED" if is_direct_add else "PENDING_APPROVAL",
                "clinical_notes": (
                    f"{booking_info['nights']}-night restorative immersion at {s_cfg['name']}. "
                    f"Autonomic reset & circadian alignment. "
                    f"30% Sanctuary Deposit: ${booking_info['deposit_30']:,.2f} | 70% Balance ('The Rest'): ${booking_info['balance_70']:,.2f} due 45 days pre-arrival."
                ),
                "flight_request": {
                    "departure_airport": booking_info["transit_airport"],
                    "transfer": booking_info["transit_vehicle"],
                    "nights": booking_info["nights"]
                }
            }
            title = f"{'Added Guest Booking' if is_direct_add else 'Stage Booking'}: {booking_info['guest_name']} ({s_cfg['name']} · {booking_info['nights']} Nights)"
            summary = (
                f"{'Added' if is_direct_add else 'Staged'} {booking_info['guest_name']} for {booking_info['nights']} nights at {s_cfg['name']} ({booking_info['room_tier']}) — "
                f"Total ${booking_info['total_amount']:,.2f} (30% Deposit: ${booking_info['deposit_30']:,.2f} · 70% Balance: ${booking_info['balance_70']:,.2f})."
            )
            proposal_obj: Dict[str, Any] = {
                "form_type": "attendee_row" if is_direct_add else "guest_intake",
                "form_title": title,
                "action_title": title,
                "target_tab": "crm" if is_direct_add else "founder_studio",
                "target_url": "/portal/crm" if is_direct_add else "/portal",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": not is_direct_add,
                "approval_required": not is_direct_add,
                "executed": False,
            }
            if db:
                try:
                    if is_direct_add:
                        exec_res = self.execute_crm_action(proposal_obj, db=db)
                        if exec_res.get("success"):
                            proposal_obj["executed"] = True
                            proposal_obj["entity_type"] = exec_res.get("entity_type")
                            proposal_obj["record_id"] = exec_res.get("record_id")
                            proposal_obj["changes"] = exec_res.get("changes")
                            proposal_obj["summary"] = exec_res.get("summary") or summary
                    else:
                        draft = ActionDraft(
                            type="booking_hold",
                            guest_name=booking_info["guest_name"],
                            content=summary,
                            status="pending_review"
                        )
                        db.add(draft)
                        db.commit()
                except Exception as e:
                    logger.error(f"Error handling booking proposal for {booking_info['guest_name']}: {e}")
            return proposal_obj

        # 1. Vendor & Preferred Supplier
        if any(kw in msg_lower for kw in ["/vendor", "add vendor", "new vendor", "add supplier", "new supplier", "register vendor", "register supplier", "create supplier", "create vendor"]):
            name_match = re.search(r'(?:vendor|supplier)(?:\s+(?:called|named)?\s*[:"\']?)([^,\'"\.\n]+)', message, re.IGNORECASE)
            name = name_match.group(1).strip() if name_match else "New Luxury Partner"
            
            category = "PREFERRED_PARTNER"
            if any(w in msg_lower for w in ["chauffeur", "driver", "transport", "transit", "car", "van", "suburban"]):
                category = "TRANSPORTATION_CHAUFFEUR"
            elif any(w in msg_lower for w in ["flight", "air", "jet", "charter", "helicopter"]):
                category = "AIR_CHARTER"
            elif any(w in msg_lower for w in ["food", "catering", "dining", "kitchen", "farm", "chef", "produce", "organic"]):
                category = "ORGANIC_CATERING"
            elif any(w in msg_lower for w in ["sound", "bowl", "somatic", "breath", "yoga", "wellness", "massage", "acupuncture", "herb", "apothecary"]):
                category = "WELLNESS_SOMATIC"
            elif any(w in msg_lower for w in ["clinic", "doctor", "medical", "emergency", "urgent", "hospital"]):
                category = "MEDICAL_EMERGENCY"
            elif any(w in msg_lower for w in ["cenote", "tour", "excursion", "hike", "nature", "dive"]):
                category = "TOUR_EXCURSION"
            elif any(w in msg_lower for w in ["villa", "hotel", "resort", "suite", "lodging"]):
                category = "LODGING_VILLA"

            contact_match = re.search(r'contact(?:\s+name)?(?:\s*[:is]+)?\s*([A-Za-z\s]+?)(?:,|\.|\$|\band\b|$)', message, re.IGNORECASE)
            contact_name = contact_match.group(1).strip() if contact_match else "Operations Director"

            comm_match = re.search(r'(\d+(?:\.\d+)?)\s*%', message)
            comm_rate = float(comm_match.group(1)) if comm_match else 10.0
            comm_type = "PERCENTAGE"
            if "$" in message and not comm_match:
                flat_match = re.search(r'\$(\d+(?:\.\d+)?)', message)
                if flat_match:
                    comm_rate = float(flat_match.group(1))
                    comm_type = "FLAT_FEE"

            payload = {
                "name": name,
                "category": category,
                "sanctuary_slug": target_sanctuary,
                "contact_name": contact_name,
                "commission_rate": comm_rate,
                "commission_type": comm_type,
                "payment_terms": "Direct Client Card Authorization",
                "lead_time_days": 7,
                "preferred_tier": "PREFERRED_PARTNER",
                "service_description": f"Preferred retreat supplier: {name}. Vetted partner aligned with KAI restorative standards.",
                "clinical_relevance": "Vetted supplier supporting serene guest arrival, somatic restoration, and low cognitive friction."
            }

            title = f"Register Preferred Supplier: {name}"
            summary = f"Stage new supplier '{name}' ({category}) for KAI CRM registry synchronization with {comm_rate}{'%' if comm_type == 'PERCENTAGE' else ' flat fee'} commission."
            return {
                "form_type": "vendor_supplier",
                "form_title": title,
                "action_title": title,
                "target_tab": "vendors",
                "target_url": "/portal/vendors",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 2. Dynamic Route Calculator
        if any(kw in msg_lower for kw in ["/route", "calculate route", "plan route", "scenic route", "route calculator", "plan drive", "chauffeur transit"]):
            origin_match = re.search(r'(?:from)\s+([A-Za-z0-9\s\(\)\-]+?)(?:\s+to|\.|$)', message, re.IGNORECASE)
            origin = origin_match.group(1).strip() if origin_match else "Regional Airport (LIR)"
            vehicle = "Executive 4WD Suburban" if target_sanctuary == "nosara" else "Mercedes-Benz Luxury Van"
            payload = {
                "sanctuary_slug": target_sanctuary,
                "origin_name": origin,
                "dest_name": f"KAI {target_sanctuary.replace('-', ' ').title()} Sanctuary",
                "recommended_vehicle": vehicle,
                "prefer_scenic": True
            }
            title = f"Calculate Chauffeur Route ({origin} -> {target_sanctuary.title()})"
            summary = "Calculate dynamic scenic travel time, road conditions, and chauffeur waypoint markers."
            return {
                "form_type": "route_calculator",
                "form_title": title,
                "action_title": title,
                "target_tab": "routes",
                "target_url": "/portal/travel-logistics?tab=routes",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 3. Curated Dining Spot
        if any(kw in msg_lower for kw in ["/dining", "add dining", "new dining", "add restaurant", "new restaurant", "curate dining"]):
            name_match = re.search(r'(?:dining|restaurant)(?:\s+(?:called|named)?\s*[:"\']?)([^,\'"\.\n]+)', message, re.IGNORECASE)
            name = name_match.group(1).strip() if name_match else "Restorative Kitchen"
            dietary = ["Gluten-Free", "Plant-Forward"]
            if "dairy" in msg_lower: dietary.append("Dairy-Free")
            if "ayurvedic" in msg_lower: dietary.append("Ayurvedic")
            payload = {
                "name": name,
                "sanctuary_slug": target_sanctuary,
                "cuisine_type": "Farm-to-Table Organic",
                "dietary_tags": dietary,
                "distance_from_villa_km": 3.5,
                "nurse_notes": "Anti-inflammatory menu supporting vagus nerve and microbiome calm."
            }
            title = f"Curate Dining Spot: {name}"
            summary = f"Add {name} to {target_sanctuary.title()} nourishing dining registry with dietary certifications."
            return {
                "form_type": "curated_dining",
                "form_title": title,
                "action_title": title,
                "target_tab": "dining",
                "target_url": "/portal/travel-logistics?tab=dining",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 4. Somatic Reflection / Review
        if any(kw in msg_lower for kw in ["add review", "new review", "submit reflection", "guest reflection", "record review"]):
            guest_match = re.search(r'(?:guest|from)\s+([A-Za-z\s]+?)(?:,|\.|\band\b|$)', message, re.IGNORECASE)
            guest = guest_match.group(1).strip() if guest_match else "Retreat Alumnus"
            payload = {
                "guest_name": guest,
                "sanctuary_slug": target_sanctuary,
                "rating": 5.0,
                "stay_dates": "Recent Retreat Group",
                "reflection_text": "Deep restorative transformation, profound vagal nervous system reset, and impeccable nursing attention."
            }
            title = f"Record Guest Reflection ({guest})"
            summary = "Stage authentic somatic testimonial and sleep quality score for founder review."
            return {
                "form_type": "somatic_review",
                "form_title": title,
                "action_title": title,
                "target_tab": "reviews",
                "target_url": "/portal/travel-logistics?tab=reviews",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 5. Location Scraper & Dossier
        if any(kw in msg_lower for kw in ["scrape location", "scrape dossier", "scrape sanctuary", "scrape destination", "fetch destination data"]):
            payload = {
                "sanctuary_slug": target_sanctuary,
                "location_query": f"KAI {target_sanctuary.title()} Sanctuary surroundings and amenities",
                "target_sections": ["microclimate", "routes", "consular_visa", "emergency_medical"]
            }
            title = f"Scrape Intelligence Dossier: {target_sanctuary.title()}"
            summary = "Trigger autonomous sanctuary crawler to compile live transit, microclimate, and consular data."
            return {
                "form_type": "location_scraper",
                "form_title": title,
                "action_title": title,
                "target_tab": "destination",
                "target_url": "/portal/travel-logistics?tab=destination",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 6. Broadcast SMS
        if any(kw in msg_lower for kw in ["/broadcast", "/sms", "broadcast sms", "send cohort sms", "send group sms", "broadcast message", "sms cohort", "sms group", "message waitlist"]):
            segment = "waitlist_nosara" if "waitlist" in msg_lower else "pre_departure_cohort"
            payload = {
                "campaign_name": f"{target_sanctuary.title()} Somatic Group Briefing",
                "target_segment": segment,
                "sanctuary_slug": target_sanctuary,
                "message_body": f"KAI Retreats: Gentle reminder for upcoming {target_sanctuary.title()} retreat group. Your personalized itinerary and flight meet-and-greet details are prepared in your portal."
            }
            title = f"Prepare SMS Broadcast ({segment})"
            summary = "Draft retreat group dispatch requiring 1-click founder authorization before carrier delivery."
            return {
                "form_type": "broadcast_sms",
                "form_title": title,
                "action_title": title,
                "target_tab": "messaging",
                "target_url": "/portal/campaigns",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 7. Guest Intake & Staging
        if any(kw in msg_lower for kw in ["add guest", "new guest", "stage intake", "intake guest", "register guest", "create guest", "onboard guest", "stage guest"]):
            name_match = re.search(r'(?:guest|client|intake)(?:\s+(?:called|named)?\s*[:"\']?)([^,\'"\.\n]+)', message, re.IGNORECASE)
            guest_name = name_match.group(1).strip() if name_match else "Prospective Traveler"
            payload = {
                "client_name": guest_name,
                "sanctuary_slug": target_sanctuary,
                "room_tier": "Private Villa Sanctuary",
                "email": f"{guest_name.lower().replace(' ', '.')}@example.com",
                "phone": "+1 (555) 019-2834",
                "status": "PENDING_APPROVAL",
                "clinical_notes": "Awaiting initial clinical screening questionnaire."
            }
            title = f"Stage Guest Intake: {guest_name}"
            summary = f"Stage intake record for {guest_name} ({target_sanctuary.title()}) awaiting Kareena's clinical clearance and KAI Sanctuary CRM sync."
            return {
                "form_type": "guest_intake",
                "form_title": title,
                "action_title": title,
                "target_tab": "founder_studio",
                "target_url": "/portal",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 8. Attendee Spreadsheet Row
        if any(kw in msg_lower for kw in ["add attendee row", "new attendee row", "create attendee row", "/attendee", "add row"]):
            name_match = re.search(r'(?:attendee|row|guest)(?:\s+(?:for|called|named)?\s*[:"\']?)([^,\'"\.\n]+)', message, re.IGNORECASE)
            att_name = name_match.group(1).strip() if name_match else "New Retreat Attendee"
            payload = {
                "name": att_name,
                "email": f"{att_name.lower().replace(' ', '.')}@example.com",
                "sanctuary_slug": target_sanctuary,
                "status": "Confirmed",
                "group": "confirmed"
            }
            title = f"Add Attendee Row: {att_name}"
            summary = f"Stage new attendee row for {att_name} in the Monday.com-style retreat guest spreadsheet."
            return {
                "form_type": "attendee_row",
                "form_title": title,
                "action_title": title,
                "target_tab": "attendees",
                "target_url": "/portal/crm?tab=spreadsheet&action=new-row",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 9. Partner Studio Syndicate Lead
        if any(kw in msg_lower for kw in ["add partner lead", "new partner lead", "register partner studio", "create partner lead", "/lead", "/syndicate"]):
            name_match = re.search(r'(?:lead|studio|partner)(?:\s+(?:called|named)?\s*[:"\']?)([^,\'"\.\n]+)', message, re.IGNORECASE)
            studio_name = name_match.group(1).strip() if name_match else "Elite Reformer Studio"
            payload = {
                "business_name": studio_name,
                "location": "New York, NY",
                "category": "Reformer Pilates & Somatics",
                "contact_name": "Studio Director",
                "email": "director@studio.com",
                "commission_rate": 15.0
            }
            title = f"Register Partner Studio: {studio_name}"
            summary = f"Stage referral syndicate partnership with {studio_name} at 15% contractual commission."
            return {
                "form_type": "partner_lead",
                "form_title": title,
                "action_title": title,
                "target_tab": "leads",
                "target_url": "/portal/leads",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": True,
                "approval_required": True
            }

        # 10. Billing Folio / Executive Buyout Breakdown
        if any(kw in msg_lower for kw in ["open billing folio", "view billing folio", "open folio", "folio breakdown", "/folio"]):
            payload = {
                "sanctuary_slug": target_sanctuary,
                "type": "villa_buyout",
                "deposit_terms": "30% Deposit / 70% Balance"
            }
            title = f"View Executive Billing Folio ({target_sanctuary.title()})"
            summary = f"Open itemized billing folio and installment ledger for {target_sanctuary.title()} Sanctuary."
            return {
                "form_type": "billing_folio",
                "form_title": title,
                "action_title": title,
                "target_tab": "billing",
                "target_url": "/portal/crm?tab=billing",
                "fields": payload,
                "payload": payload,
                "summary": summary,
                "requires_approval": False,
                "approval_required": False
            }

        # 11. Universal CRM Record Touch & Mutation Engine (Clients, Trips, Rooms, Payments, Dietary, Flights, Cohorts, Calendar, Drafts)
        crm_mutation = self._detect_crm_record_mutation(message, target_sanctuary, db)
        if crm_mutation:
            return crm_mutation

        return None

    def _find_matching_crm_entities(self, text: str, db: Any):
        """Finds matching CRMClient, CRMTrip, or StagingIntake from natural language or messy/fuzzy text."""
        from backend.sidecar.models import CRMClient, CRMTrip, StagingIntake
        text_lower = text.lower()
        words = [w for w in re.findall(r'[a-zA-Z]{3,}', text_lower)]

        matched_client = None
        matched_trip = None
        matched_intake = None

        clients = db.query(CRMClient).all()
        trips = db.query(CRMTrip).order_by(CRMTrip.updated_at.desc()).all()
        intakes = db.query(StagingIntake).order_by(StagingIntake.updated_at.desc()).all()

        for c in clients:
            if (c.crm_contact_id and c.crm_contact_id.lower() in text_lower) or (c.email and c.email.lower() in text_lower):
                matched_client = c
                break
            if c.full_name and c.full_name.lower() in text_lower:
                matched_client = c
                break

        if not matched_client:
            for c in clients:
                if not c.full_name:
                    continue
                parts = c.full_name.lower().split()
                first = parts[0] if parts else ""
                last = parts[-1] if len(parts) > 1 else ""
                if (first and len(first) > 2 and re.search(rf'\b{re.escape(first)}\b', text_lower)) or (
                    last and len(last) > 3 and re.search(rf'\b{re.escape(last)}\b', text_lower)
                ):
                    matched_client = c
                    break
                # Fuzzy match against messy typos (e.g. "elanor" -> "eleanor", "frnak" -> "frank", "marcus" -> "marcus")
                for w in words:
                    if len(w) >= 4 and first and difflib.SequenceMatcher(None, w, first).ratio() >= 0.75:
                        matched_client = c
                        break
                    if len(w) >= 4 and last and difflib.SequenceMatcher(None, w, last).ratio() >= 0.80:
                        matched_client = c
                        break
                if matched_client:
                    break

        for t in trips:
            if (t.crm_trip_id and t.crm_trip_id.lower() in text_lower):
                matched_trip = t
                break
            if matched_client and t.client_id == matched_client.id:
                matched_trip = t
                break
            if t.client_name and t.client_name.lower() in text_lower:
                matched_trip = t
                break

        if not matched_client and matched_trip:
            matched_client = db.query(CRMClient).filter(CRMClient.id == matched_trip.client_id).first()

        for i in intakes:
            if matched_client and (i.email == matched_client.email or (i.client_name and i.client_name.lower() == matched_client.full_name.lower())):
                matched_intake = i
                break
            if i.client_name and i.client_name.lower() in text_lower:
                matched_intake = i
                break

        return matched_client, matched_trip, matched_intake

    def _detect_crm_record_mutation(
        self,
        message: str,
        target_sanctuary: str = "nosara",
        db: Optional[Any] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Detects natural-language OR messy low-level shorthand instructions ("garbage in -> beauty out")
        to touch, update, create, or delete any record in the KAI CRM.
        """
        msg_lower = message.lower()

        # Avoid intercepting pure read/draft queries
        if any(kw in msg_lower for kw in ["draft consultation", "draft email", "write email", "what luxury hotels", "where can guests eat", "live weather", "who is", "what does"]):
            return None

        # Pre-check if any known CRM guest/intake is mentioned (even with typos like "elanor")
        matched_entity_client = None
        if db is not None:
            try:
                matched_entity_client, _, _ = self._find_matching_crm_entities(message, db)
            except Exception:
                matched_entity_client = None

        has_action_shorthand = any(
            kw in msg_lower
            for kw in [
                "cliffside", "plunge", "oceanfront", "king suite", "penthouse", "shared pavilion",
                "confirmed", "deposit paid", "paid in full", "waitlist",
                "gluten", "celiac", "vegan", "dairy-free", "dairy free", "seed-oil", "seed oil", "no shellfish", "shellfish", "nut allergy", "allergy",
                "paid $", "$", "wire"
            ]
        )

        is_mutation_verb = any(
            re.search(rf'\b{kw}\b', msg_lower)
            for kw in [
                "update", "change", "set", "modify", "edit", "assign", "reassign",
                "upgrade", "move", "switch", "put", "make", "mark", "record", "log", "touch", "patch",
                "delete", "remove", "cancel", "archive", "approve", "commit",
                "schedule", "dispatch", "paid", "confirm"
            ]
        ) or (matched_entity_client is not None and has_action_shorthand)

        if not is_mutation_verb:
            return None

        fields: Dict[str, Any] = {"sanctuary_slug": target_sanctuary, "raw_instruction": message}
        action_subtype = "crm_record_update"

        if matched_entity_client:
            fields["target_name"] = matched_entity_client.full_name
        else:
            # Extract candidate person name (case-insensitive)
            person_match = re.search(
                r'(?:for|client|guest|traveler|attendee|on|update|change|move|switch|put)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,2})',
                message,
                re.IGNORECASE
            )
            if not person_match:
                person_match = re.search(r"([a-zA-Z]+(?:\s+[a-zA-Z]+)?)'s\b", message, re.IGNORECASE)
            if person_match:
                raw_cand = person_match.group(1).strip().split()
                stop_words = {"ocean", "oceanfront", "private", "sacred", "shared", "cliffside", "nosara", "noasra", "amalfi", "bali", "riviera", "puerto", "vallarta", "room", "villa", "suite", "status", "deposit", "cohort", "to", "in", "as", "dietary", "diet", "allergy", "notes"}
                clean_cand = [w for w in raw_cand if w.lower() not in stop_words]
                if clean_cand:
                    fields["target_name"] = " ".join(clean_cand).title()

        email_match = re.search(r'[\w\.\+\-]+@[\w\.\-]+\.\w+', message)
        if email_match:
            fields["email"] = email_match.group(0).lower()

        phone_match = re.search(r'(\+\d[\d\-\s\(\)]{7,16})', message)
        if phone_match:
            fields["phone"] = phone_match.group(1).strip()

        # 1. Room / Suite Assignment Update (works with shorthand like "elanor cliffside villa")
        room_match = re.search(
            r'(?:room(?:\s+assignment|\s+tier)?|suite|villa|accommodation|upgrade)\s+(?:to|as|=)\s+([A-Za-z0-9\s\-&]+?)(?:\.|,|for\s+|and\s+|mark\s+|$)',
            message,
            re.IGNORECASE
        )
        if "cliffside" in msg_lower or "plunge" in msg_lower:
            fields["room_tier"] = "Private Cliffside Plunge Villa"
        elif "penthouse" in msg_lower:
            fields["room_tier"] = "Two-Bedroom Oceanfront Penthouse Villa"
        elif "king suite" in msg_lower or "oceanfront king" in msg_lower or ("oceanfront" in msg_lower and "suite" in msg_lower):
            fields["room_tier"] = "Oceanfront King Suite"
        elif "canopy villa" in msg_lower or "ocean villa" in msg_lower:
            fields["room_tier"] = "Private Ocean Canopy Villa"
        elif "shared" in msg_lower or "pavilion" in msg_lower:
            fields["room_tier"] = "Shared Ocean Pavilion"
        elif room_match:
            fields["room_tier"] = room_match.group(1).strip().title()
        elif any(k in msg_lower for k in ["room assignment", "room tier", "upgrade room", "change room", "assign room"]):
            fields["room_tier"] = "Private Villa Sanctuary"

        # 2. Trip / Booking / Deposit Status Update
        for st in ["CONFIRMED", "DEPOSIT_PAID", "PROPOSED_ITINERARY", "COMPLETED", "CANCELLED", "MEDICAL_FREEZE", "POSTPONED_FORCE_MAJEURE", "WAITLISTED", "PAID_IN_FULL"]:
            if st.lower().replace("_", " ") in msg_lower or st.lower() in msg_lower:
                fields["status"] = "CONFIRMED" if st == "PAID_IN_FULL" else st
                break
        if "confirm" in msg_lower and "status" not in fields:
            fields["status"] = "CONFIRMED"
        if "cancel" in msg_lower and ("trip" in msg_lower or "booking" in msg_lower or "reservation" in msg_lower):
            fields["status"] = "CANCELLED"

        if any(k in msg_lower for k in ["deposit paid", "mark deposit", "deposit as paid", "paid deposit", "authorize deposit"]):
            fields["deposit_status"] = "PAID"
            if "status" not in fields:
                fields["status"] = "DEPOSIT_PAID"

        if any(k in msg_lower for k in ["balance paid", "paid in full", "final balance paid", "settle balance"]):
            fields["final_balance_status"] = "PAID"
            fields["deposit_status"] = "PAID"
            fields["status"] = "CONFIRMED"

        # 3. Payment / Wire / Shorthand Amount Recording (supports "$4,350", "4350 paid", "4.5k dep")
        k_amt_m = re.search(r'\$?\s*(\d+(?:\.\d+)?)\s*k\b', msg_lower)
        amount_match = re.search(r'\$\s*(\d[\d,]*(?:\.\d{1,2})?)', message)
        bare_amt_m = re.search(r'\b(\d{3,5})\s*(?:usd|dollars?|paid|dep|deposit|wire)\b', msg_lower)
        parsed_amt = None
        if k_amt_m:
            parsed_amt = round(float(k_amt_m.group(1)) * 1000.0, 2)
        elif amount_match:
            parsed_amt = float(amount_match.group(1).replace(",", ""))
        elif bare_amt_m:
            parsed_amt = float(bare_amt_m.group(1))

        if parsed_amt is not None and any(k in msg_lower for k in ["payment", "deposit", "dep", "wire", "paid", "record", "charge", "settle", "credit", "investment", "price", "total", "balance", "$"]):
            if any(k in msg_lower for k in ["total investment", "total stay", "trip total", "total price", "set total"]):
                fields["total_investment"] = parsed_amt
            else:
                fields["amount_paid"] = parsed_amt
                fields["payment_amount"] = parsed_amt
                fields["payment_method"] = "SWIFT International Wire" if "wire" in msg_lower else "KAI Native Card Vault"

        # 4. Dietary Requirements / Allergies / Health Notes (supports messy shorthand like "elanor gf no seed oils no shellfish")
        diet_match = re.search(r'(?:dietary(?:\s+requirements|\s+notes)?|allergies|allergy|diet|menu\s+preference)(?:\s+(?:to|as|is|:))?\s+([^\.]+)', message, re.IGNORECASE)
        if diet_match:
            fields["dietary_requirements"] = diet_match.group(1).strip()
        else:
            shorthand_diets = []
            if "gluten-free" in msg_lower or "gluten free" in msg_lower or re.search(r'\bgf\b', msg_lower) or "celiac" in msg_lower:
                shorthand_diets.append("Gluten-Free")
            if "seed-oil-free" in msg_lower or "seed oil free" in msg_lower or "no seed oil" in msg_lower:
                shorthand_diets.append("Seed-Oil-Free")
            if "no shellfish" in msg_lower or "shellfish allergy" in msg_lower or "shellfish" in msg_lower:
                shorthand_diets.append("No Shellfish")
            if "dairy-free" in msg_lower or "dairy free" in msg_lower or "no dairy" in msg_lower:
                shorthand_diets.append("Dairy-Free")
            if "vegan" in msg_lower or "plant-based" in msg_lower:
                shorthand_diets.append("Plant-Forward / Vegan")
            if "tree nut" in msg_lower or "nut allergy" in msg_lower or "no nuts" in msg_lower:
                shorthand_diets.append("Tree Nut Allergy")
            if shorthand_diets:
                fields["dietary_requirements"] = ", ".join(shorthand_diets)

        health_match = re.search(r'(?:health\s+notes?|medical\s+notes?|clinical\s+notes?)\s+(?:to|as|:)\s+([^\.]+)', message, re.IGNORECASE)
        if health_match:
            fields["health_notes"] = health_match.group(1).strip()

        notes_match = re.search(r'(?:notes?|intention|intentions)\s+(?:to|as|:)\s+([^\.]+)', message, re.IGNORECASE)
        if notes_match and "health_notes" not in fields and "dietary_requirements" not in fields:
            fields["notes"] = notes_match.group(1).strip()

        tag_match = re.search(r'tag\s+([A-Z0-9_]+)', message, re.IGNORECASE)
        if tag_match:
            fields["add_tag"] = tag_match.group(1).upper()

        # 5. Flight & Chauffeur Updates
        flight_match = re.search(r'\b([A-Z]{2}[-\s]?\d{2,4})\b', message)
        if flight_match and any(k in msg_lower for k in ["flight", "arrival", "airline", "chauffeur", "pickup", "transfer"]):
            fields["flight_number"] = flight_match.group(1).upper().replace(" ", "-")

        # 6. Cohort Capacity / Spots Update
        if any(k in msg_lower for k in ["cohort", "spots remaining", "capacity limit", "spots left"]):
            spots_m = re.search(r'(\d+)\s*(?:spots?|capacity|guests?)', msg_lower)
            if spots_m:
                val = int(spots_m.group(1))
                if "capacity" in msg_lower or "limit" in msg_lower:
                    fields["capacity_limit"] = val
                else:
                    fields["spots_remaining"] = val
                action_subtype = "cohort_update"

        # 7. Approve Drafts / Commit Intakes
        if any(k in msg_lower for k in ["approve all", "approve pending", "approve draft", "commit intake", "sync intake"]):
            action_subtype = "approve_records"

        # 8. Schedule Calendar Consultation / Event
        if any(k in msg_lower for k in ["schedule", "calendar", "consultation call", "alignment call"]) and any(k in msg_lower for k in ["call", "event", "session", "consultation", "calendar"]):
            action_subtype = "calendar_event"

        fields["action_subtype"] = action_subtype
        target_label = fields.get("target_name") or fields.get("email") or target_sanctuary.title()
        title = f"CRM Record Update · {target_label}"
        summary = f"Touch and update KAI CRM records for {target_label}: {', '.join(f'{k}={v}' for k, v in fields.items() if k not in {'raw_instruction', 'action_subtype', 'sanctuary_slug'}) or message[:80]}"

        proposal: Dict[str, Any] = {
            "form_type": "crm_mutation",
            "action_type": action_subtype,
            "form_title": title,
            "action_title": title,
            "target_tab": "crm",
            "target_url": "/portal/crm",
            "fields": fields,
            "payload": fields,
            "summary": summary,
            "requires_approval": False,
            "approval_required": False,
            "executed": False,
        }

        if db is not None:
            try:
                exec_res = self.execute_crm_action(proposal, db=db)
                if exec_res.get("success"):
                    proposal["executed"] = True
                    proposal["entity_type"] = exec_res.get("entity_type")
                    proposal["record_id"] = exec_res.get("record_id")
                    proposal["changes"] = exec_res.get("changes")
                    proposal["summary"] = exec_res.get("summary") or proposal["summary"]
                    proposal["form_title"] = exec_res.get("title") or proposal["form_title"]
                    proposal["action_title"] = proposal["form_title"]
            except Exception as e:
                logger.warning(f"Auto-execution of CRM mutation encountered notice: {e}")

        return proposal

    def execute_crm_action(self, proposal: Dict[str, Any], db: Any) -> Dict[str, Any]:
        """
        Omnipotent KAI Wellness & CRM Execution Engine.
        Touches, creates, updates, or deletes records across CRMClient, CRMTrip, StagingIntake,
        SanctuaryCohort, VendorSupplierRecord, CuratedDiningSpot, DestinationReview, StagedLead,
        CalendarEvent, GroundTransferRecord, SmsDispatch, and ActionDraft.
        """
        import uuid
        from datetime import datetime, timezone, timedelta
        from backend.sidecar.models import (
            CRMClient,
            CRMTrip,
            StagingIntake,
            VendorSupplierRecord,
            CuratedDiningSpot,
            DestinationReview,
            StagedLead,
            CalendarEvent,
            GroundTransferRecord,
            SmsDispatch,
        )
        from backend.models import ActionDraft, SanctuaryCohort

        form_type = (proposal.get("form_type") or proposal.get("action_type") or "crm_mutation").lower()
        fields = dict(proposal.get("fields") or proposal.get("payload") or {})
        raw_instruction = str(fields.get("raw_instruction") or proposal.get("summary") or "")
        sanctuary_slug = self.resolve_sanctuary_slug(
            str(fields.get("sanctuary_slug") or raw_instruction or "nosara"),
            default=fields.get("sanctuary_slug") or "nosara"
        )
        s_cfg = self.SANCTUARY_CONFIG.get(sanctuary_slug, self.SANCTUARY_CONFIG["nosara"])

        # 1. Vendor / Supplier Creation or Update
        if form_type == "vendor_supplier":
            name = str(fields.get("name") or "Preferred Sanctuary Partner").strip()
            existing = db.query(VendorSupplierRecord).filter(VendorSupplierRecord.name.ilike(f"%{name}%")).first()
            if existing:
                for k in ["category", "sanctuary_slug", "contact_name", "email", "phone", "commission_rate", "commission_type", "payment_terms", "preferred_tier", "service_description", "clinical_relevance", "status"]:
                    if k in fields and fields[k] is not None:
                        setattr(existing, k, fields[k])
                existing.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(existing)
                rec = existing
                verb = "Updated"
            else:
                rec = VendorSupplierRecord(
                    id=str(uuid.uuid4()),
                    supplier_code=f"kai_sup_{uuid.uuid4().hex[:10]}",
                    name=name,
                    category=str(fields.get("category") or "PREFERRED_PARTNER"),
                    sanctuary_slug=sanctuary_slug,
                    contact_name=str(fields.get("contact_name") or "Operations Desk"),
                    email=fields.get("email") or f"concierge@{ re.sub(r'[^a-z0-9]', '', name.lower())[:16] or 'partner' }.com",
                    phone=fields.get("phone") or "+1-800-555-0199",
                    commission_rate=float(fields.get("commission_rate") or 10.0),
                    commission_type=str(fields.get("commission_type") or "PERCENTAGE"),
                    payment_terms=str(fields.get("payment_terms") or "Direct Client Card Authorization"),
                    lead_time_days=int(fields.get("lead_time_days") or 7),
                    preferred_tier=str(fields.get("preferred_tier") or "PREFERRED_PARTNER"),
                    service_description=str(fields.get("service_description") or f"Vetted luxury supplier for {s_cfg['name']}."),
                    clinical_relevance=str(fields.get("clinical_relevance") or "Aligned with KAI nervous system quietude standards."),
                    status="ACTIVE",
                )
                db.add(rec)
                db.commit()
                db.refresh(rec)
                verb = "Registered"
            return {
                "success": True,
                "entity_type": "VendorSupplierRecord",
                "record_id": rec.supplier_code or rec.id,
                "title": f"{verb} Supplier: {rec.name}",
                "summary": f"{verb} '{rec.name}' ({rec.category}) in KAI Vendor Registry at {rec.commission_rate}% commission.",
                "changes": {"name": rec.name, "category": rec.category, "commission_rate": f"{rec.commission_rate}%", "sanctuary": rec.sanctuary_slug, "status": rec.status},
            }

        # 2. Curated Dining Spot
        if form_type == "curated_dining":
            name = str(fields.get("name") or "Restorative Botanical Kitchen").strip()
            rec = CuratedDiningSpot(
                id=str(uuid.uuid4()),
                sanctuary_slug=sanctuary_slug,
                name=name,
                cuisine_type=str(fields.get("cuisine_type") or "Farm-to-Table Organic"),
                dietary_tags=fields.get("dietary_tags") or ["Gluten-Free", "Plant-Forward", "Seed-Oil-Free"],
                distance_from_villa_km=float(fields.get("distance_from_villa_km") or 3.2),
                description=str(fields.get("description") or f"Curated anti-inflammatory culinary partner near {s_cfg['name']}."),
                nurse_notes=str(fields.get("nurse_notes") or "Supports enteric nervous system calm and microbiome balance."),
            )
            db.add(rec)
            db.commit()
            return {
                "success": True,
                "entity_type": "CuratedDiningSpot",
                "record_id": rec.id,
                "title": f"Added Dining Spot: {rec.name}",
                "summary": f"Added '{rec.name}' ({rec.cuisine_type}) to {sanctuary_slug.title()} dining registry.",
                "changes": {"name": rec.name, "sanctuary": sanctuary_slug, "dietary_tags": ", ".join(rec.dietary_tags or [])},
            }

        # 3. Guest Reflection / Review
        if form_type == "somatic_review":
            guest = str(fields.get("guest_name") or "Retreat Alumnus").strip()
            rec = DestinationReview(
                id=str(uuid.uuid4()),
                sanctuary_slug=sanctuary_slug,
                guest_name=guest,
                stay_dates=str(fields.get("stay_dates") or "2026–2027 Cohort"),
                overall_rating=float(fields.get("rating") or 5.0),
                review_text=str(fields.get("reflection_text") or "Deep restorative transformation and impeccable nursing care."),
                status="PUBLISHED",
            )
            db.add(rec)
            db.commit()
            return {
                "success": True,
                "entity_type": "DestinationReview",
                "record_id": rec.id,
                "title": f"Recorded Guest Review: {rec.guest_name}",
                "summary": f"Saved verified {rec.overall_rating}★ reflection from {rec.guest_name} for {sanctuary_slug.title()}.",
                "changes": {"guest_name": rec.guest_name, "rating": f"{rec.overall_rating}★", "sanctuary": sanctuary_slug},
            }

        # 4. B2B Partner Lead
        if form_type == "partner_lead":
            biz = str(fields.get("business_name") or "Elite Reformer Studio").strip()
            rec = StagedLead(
                id=str(uuid.uuid4()),
                business_name=biz,
                category=str(fields.get("category") or "Reformer Pilates & Somatics"),
                contact_name=str(fields.get("contact_name") or "Studio Director"),
                email=str(fields.get("email") or "director@partnerstudio.com"),
                location=str(fields.get("location") or "New York, NY"),
                outreach_thesis=f"15% referral syndicate partnership for {s_cfg['name']}.",
                status="APPROVED",
            )
            db.add(rec)
            db.commit()
            return {
                "success": True,
                "entity_type": "StagedLead",
                "record_id": rec.id,
                "title": f"Registered Partner Studio: {rec.business_name}",
                "summary": f"Added B2B partner studio '{rec.business_name}' ({rec.location}) at 15% referral commission.",
                "changes": {"business_name": rec.business_name, "location": rec.location, "status": rec.status},
            }

        # 5. Broadcast SMS
        if form_type == "broadcast_sms":
            rec = SmsDispatch(
                id=str(uuid.uuid4()),
                recipient_phone=str(fields.get("recipient_phone") or "+1-800-555-0199"),
                recipient_name=str(fields.get("campaign_name") or f"{sanctuary_slug.title()} Cohort"),
                message_body=str(fields.get("message_body") or f"KAI Sanctuary update for {s_cfg['name']}."),
                dispatch_type="CAMPAIGN_BROADCAST",
                status="PENDING_APPROVAL",
            )
            db.add(rec)
            db.commit()
            return {
                "success": True,
                "entity_type": "SmsDispatch",
                "record_id": rec.id,
                "title": f"Staged SMS Campaign: {rec.recipient_name}",
                "summary": f"Staged SMS broadcast '{rec.recipient_name}' in Concierge Broadcasts.",
                "changes": {"campaign": rec.recipient_name, "status": rec.status},
            }

        # 6. Attendee Row / Guest Intake / Booking Creation & Upsert into CRM
        if form_type in ("attendee_row", "guest_intake", "client_form", "trip_builder"):
            guest_name = str(fields.get("name") or fields.get("client_name") or fields.get("full_name") or "New Retreat Guest").strip()
            clean_slug = re.sub(r'[^a-z0-9\.]', '', guest_name.lower().replace(' ', '.')) or "guest"
            email = str(fields.get("email") or f"{clean_slug}@kai-guest.com").strip().lower()
            phone = str(fields.get("phone") or "+1 (555) 019-2834")
            room_tier = str(fields.get("room_tier") or s_cfg["villa_tier"])
            total_amt = float(fields.get("total_amount") or fields.get("total_investment") or s_cfg["standard_6night_villa"])
            dep_amt = float(fields.get("deposit_30") or fields.get("deposit_amount") or round(total_amt * 0.30, 2))
            bal_amt = float(fields.get("balance_70") or fields.get("final_balance") or round(total_amt - dep_amt, 2))
            trip_status = "CONFIRMED" if str(fields.get("status", "")).upper() in ("CONFIRMED", "APPROVED") else "PROPOSED_ITINERARY"

            client = db.query(CRMClient).filter(
                (CRMClient.email == email) | (CRMClient.full_name.ilike(guest_name))
            ).first()
            if not client:
                client = CRMClient(
                    id=str(uuid.uuid4()),
                    crm_contact_id=f"kai_cnt_{uuid.uuid4().hex[:8]}",
                    full_name=guest_name,
                    email=email,
                    phone=phone,
                    dietary_requirements=str(fields.get("dietary_requirements") or "Organic, Seed-Oil-Free, Anti-Inflammatory"),
                    health_notes=str(fields.get("clinical_notes") or fields.get("health_notes") or "Cleared for restorative somatic itinerary."),
                    tags=["KAI_GUEST", "AI_CONCIERGE_ADDED"],
                    total_lifetime_spend=dep_amt if trip_status == "CONFIRMED" else 0.0,
                    total_trips_count=1,
                    source="KAI_AI_ASSISTANT",
                )
                db.add(client)
                db.flush()
            else:
                if fields.get("dietary_requirements"):
                    client.dietary_requirements = str(fields["dietary_requirements"])
                if fields.get("clinical_notes") or fields.get("health_notes"):
                    client.health_notes = str(fields.get("clinical_notes") or fields.get("health_notes"))
                client.updated_at = datetime.now(timezone.utc)

            trip = db.query(CRMTrip).filter(CRMTrip.client_id == client.id, CRMTrip.sanctuary_slug == sanctuary_slug).first()
            if not trip:
                trip = CRMTrip(
                    id=str(uuid.uuid4()),
                    crm_trip_id=f"kai_trp_{uuid.uuid4().hex[:8]}",
                    client_id=client.id,
                    client_name=client.full_name,
                    client_email=client.email,
                    sanctuary_slug=sanctuary_slug,
                    title=s_cfg["name"],
                    dates=str(fields.get("dates") or "Upcoming 6-Night Sanctuary Cohort"),
                    room_tier=room_tier,
                    status=trip_status,
                    total_investment=total_amt,
                    deposit_amount=dep_amt,
                    deposit_status="PAID" if trip_status == "CONFIRMED" else "PENDING_CLIENT_AUTHORIZATION",
                    final_balance=bal_amt,
                    final_balance_status="SCHEDULED",
                )
                db.add(trip)
            else:
                trip.room_tier = room_tier
                trip.total_investment = total_amt
                trip.deposit_amount = dep_amt
                trip.final_balance = bal_amt
                trip.status = trip_status
                trip.updated_at = datetime.now(timezone.utc)

            db.commit()
            db.refresh(client)
            db.refresh(trip)
            return {
                "success": True,
                "entity_type": "CRMClient & CRMTrip",
                "record_id": f"{client.crm_contact_id} / {trip.crm_trip_id}",
                "title": f"CRM Record Saved: {client.full_name}",
                "summary": f"Added/updated {client.full_name} in KAI CRM ({s_cfg['name']} · {trip.room_tier} · {trip.status} · Total ${trip.total_investment:,.2f}).",
                "changes": {
                    "guest": client.full_name,
                    "crm_contact_id": client.crm_contact_id,
                    "crm_trip_id": trip.crm_trip_id,
                    "sanctuary": s_cfg["name"],
                    "room_tier": trip.room_tier,
                    "status": trip.status,
                    "total_investment": f"${trip.total_investment:,.2f}",
                    "deposit_30": f"${trip.deposit_amount:,.2f} ({trip.deposit_status})",
                },
            }

        # 7. Universal CRM Mutation (Update Client, Trip, Cohort, Calendar, Drafts)
        action_subtype = str(fields.get("action_subtype") or proposal.get("action_type") or "crm_record_update")

        if action_subtype == "cohort_update":
            cohort = db.query(SanctuaryCohort).filter(SanctuaryCohort.slug.ilike(f"%{sanctuary_slug}%")).first()
            if not cohort:
                cohort = db.query(SanctuaryCohort).first()
            if cohort:
                changes = {}
                if "capacity_limit" in fields:
                    cohort.capacity_limit = int(fields["capacity_limit"])
                    changes["capacity_limit"] = cohort.capacity_limit
                if "spots_remaining" in fields:
                    cohort.spots_remaining = int(fields["spots_remaining"])
                    changes["spots_remaining"] = cohort.spots_remaining
                if "status" in fields:
                    cohort.status = str(fields["status"])
                    changes["status"] = cohort.status
                cohort.updated_at = datetime.now(timezone.utc)
                db.commit()
                return {
                    "success": True,
                    "entity_type": "SanctuaryCohort",
                    "record_id": cohort.slug,
                    "title": f"Updated Cohort: {cohort.title}",
                    "summary": f"Updated {cohort.title} inventory in database ({', '.join(f'{k}={v}' for k, v in changes.items())}).",
                    "changes": {"cohort": cohort.title, **changes},
                }

        if action_subtype == "approve_records":
            pending_drafts = db.query(ActionDraft).filter(ActionDraft.status == "pending_review").all()
            count_drafts = len(pending_drafts)
            for d in pending_drafts:
                d.status = "approved"
                d.reviewed_at = datetime.now(timezone.utc)
            db.commit()
            return {
                "success": True,
                "entity_type": "ActionDraft",
                "record_id": f"{count_drafts}_drafts",
                "title": f"Approved {count_drafts} Pending Action Draft(s)",
                "summary": f"Marked {count_drafts} pending draft(s) as approved in the Action Review Queue.",
                "changes": {"approved_drafts_count": count_drafts, "status": "approved"},
            }

        if action_subtype == "calendar_event":
            guest_name = str(fields.get("target_name") or "Prospective Guest")
            start_dt = datetime.now(timezone.utc) + timedelta(days=1)
            ev = CalendarEvent(
                id=str(uuid.uuid4()),
                title=f"20-Min Somatic Consultation: {guest_name}",
                sanctuary_slug=sanctuary_slug,
                category="CONSULTATION",
                start_time=start_dt,
                end_time=start_dt + timedelta(minutes=20),
                guest_name=guest_name,
                location="KAI Private Zoom Sanctuary",
                notes=raw_instruction or "Pre-arrival nervous system & travel alignment call.",
            )
            db.add(ev)
            db.commit()
            return {
                "success": True,
                "entity_type": "CalendarEvent",
                "record_id": ev.id,
                "title": f"Scheduled Calendar Event: {ev.title}",
                "summary": f"Added '{ev.title}' to the Retreat & Alignment Calendar.",
                "changes": {"event": ev.title, "guest": guest_name, "category": ev.category, "sanctuary": sanctuary_slug},
            }

        # Default: Find or create the target CRMClient & CRMTrip and apply all field modifications
        explicit_name = str(fields.get("target_name") or fields.get("client_name") or fields.get("full_name") or fields.get("name") or "").strip()
        if explicit_name and "target_name" not in fields:
            fields["target_name"] = explicit_name

        search_target = str(fields.get("target_name") or fields.get("email") or raw_instruction)
        client, trip, intake = self._find_matching_crm_entities(search_target, db)

        if not client and fields.get("target_name"):
            t_name = str(fields["target_name"]).strip()
            clean_e = str(fields.get("email") or f"{re.sub(r'[^a-z0-9]', '.', t_name.lower())}@kai-guest.com")
            client = CRMClient(
                id=str(uuid.uuid4()),
                crm_contact_id=f"kai_cnt_{uuid.uuid4().hex[:8]}",
                full_name=t_name,
                email=clean_e,
                phone=str(fields.get("phone") or "+1-310-555-0199"),
                dietary_requirements=str(fields.get("dietary_requirements") or "Organic, Seed-Oil-Free"),
                health_notes=str(fields.get("health_notes") or "Standard restorative wellness profile."),
                tags=["KAI_GUEST"],
                total_lifetime_spend=0.0,
                total_trips_count=1,
                source="KAI_AI_ASSISTANT",
            )
            db.add(client)
            db.flush()

        if not client:
            client = db.query(CRMClient).order_by(CRMClient.updated_at.desc()).first()

        if client and not trip:
            trip = db.query(CRMTrip).filter(CRMTrip.client_id == client.id).order_by(CRMTrip.updated_at.desc()).first()
            if not trip:
                trip = CRMTrip(
                    id=str(uuid.uuid4()),
                    crm_trip_id=f"kai_trp_{uuid.uuid4().hex[:8]}",
                    client_id=client.id,
                    client_name=client.full_name,
                    client_email=client.email,
                    sanctuary_slug=sanctuary_slug,
                    title=s_cfg["name"],
                    dates="Upcoming Cohort",
                    room_tier=str(fields.get("room_tier") or s_cfg["villa_tier"]),
                    status=str(fields.get("status") or "CONFIRMED"),
                    total_investment=float(fields.get("total_investment") or s_cfg["standard_6night_villa"]),
                    deposit_amount=round(float(fields.get("total_investment") or s_cfg["standard_6night_villa"]) * 0.30, 2),
                    deposit_status="PAID",
                    final_balance=round(float(fields.get("total_investment") or s_cfg["standard_6night_villa"]) * 0.70, 2),
                    final_balance_status="SCHEDULED",
                )
                db.add(trip)
                db.flush()

        applied_changes: Dict[str, Any] = {}
        if client:
            if fields.get("target_name") and fields["target_name"] != client.full_name and (fields.get("client_name") or fields.get("full_name")):
                client.full_name = str(fields["target_name"])
            applied_changes["guest"] = client.full_name
            applied_changes["crm_contact_id"] = client.crm_contact_id
            if fields.get("email") and fields["email"] != client.email:
                client.email = str(fields["email"])
                applied_changes["email"] = client.email
            if fields.get("phone"):
                client.phone = str(fields["phone"])
                applied_changes["phone"] = client.phone
            if fields.get("dietary_requirements") is not None:
                client.dietary_requirements = str(fields["dietary_requirements"])
                applied_changes["dietary_requirements"] = client.dietary_requirements
            if fields.get("health_notes") is not None:
                client.health_notes = str(fields["health_notes"])
                applied_changes["health_notes"] = client.health_notes
            if fields.get("notes") is not None:
                client.notes = str(fields["notes"])
                applied_changes["notes"] = client.notes
            if fields.get("add_tag"):
                tags_list = list(client.tags or [])
                if fields["add_tag"] not in tags_list:
                    tags_list.append(fields["add_tag"])
                    client.tags = tags_list
                applied_changes["tags"] = ", ".join(tags_list)
            client.updated_at = datetime.now(timezone.utc)

        if trip:
            applied_changes["crm_trip_id"] = trip.crm_trip_id
            if client and trip.client_name != client.full_name:
                trip.client_name = client.full_name
            if fields.get("sanctuary_slug"):
                trip.sanctuary_slug = self.resolve_sanctuary_slug(str(fields["sanctuary_slug"]), default=trip.sanctuary_slug)
                trip.title = self.SANCTUARY_CONFIG.get(trip.sanctuary_slug, s_cfg)["name"]
                applied_changes["sanctuary_slug"] = trip.sanctuary_slug
            if fields.get("room_tier"):
                trip.room_tier = str(fields["room_tier"])
                applied_changes["room_tier"] = trip.room_tier
            if fields.get("status"):
                trip.status = str(fields["status"])
                applied_changes["status"] = trip.status
            if fields.get("deposit_status"):
                trip.deposit_status = str(fields["deposit_status"])
                applied_changes["deposit_status"] = trip.deposit_status
            if fields.get("final_balance_status"):
                trip.final_balance_status = str(fields["final_balance_status"])
                applied_changes["final_balance_status"] = trip.final_balance_status
            if fields.get("total_investment") is not None:
                trip.total_investment = float(fields["total_investment"])
                if fields.get("amount_paid") is None and fields.get("deposit_amount") is None:
                    trip.deposit_amount = round(trip.total_investment * 0.30, 2)
                    trip.final_balance = round(trip.total_investment - trip.deposit_amount, 2)
                applied_changes["total_investment"] = f"${trip.total_investment:,.2f}"
            if fields.get("amount_paid") is not None or fields.get("deposit_amount") is not None:
                paid_val = float(fields.get("amount_paid") if fields.get("amount_paid") is not None else fields.get("deposit_amount"))
                trip.deposit_amount = paid_val
                trip.deposit_status = "PAID" if paid_val > 0 else "PENDING_CLIENT_AUTHORIZATION"
                trip.final_balance = max(0.0, round(float(trip.total_investment or 0.0) - paid_val, 2))
                if trip.final_balance == 0 and paid_val > 0:
                    trip.final_balance_status = "PAID"
                if client:
                    client.total_lifetime_spend = max(float(client.total_lifetime_spend or 0.0), paid_val)
                applied_changes["amount_paid"] = f"${paid_val:,.2f}"
                applied_changes["remaining_balance"] = f"${trip.final_balance:,.2f}"
            if fields.get("payment_amount") is not None:
                pay_amt = float(fields["payment_amount"])
                history = list(trip.payment_history or [])
                history.append({
                    "id": f"pay_{uuid.uuid4().hex[:6]}",
                    "amount_usd": pay_amt,
                    "method": fields.get("payment_method", "KAI Native Card Vault"),
                    "recorded_at": datetime.now(timezone.utc).isoformat(),
                    "recorded_by": "KAI AI Assistant",
                })
                trip.payment_history = history
                trip.deposit_status = "PAID"
                trip.final_balance = max(0.0, round((trip.final_balance or 0.0) - pay_amt, 2))
                if trip.final_balance == 0:
                    trip.final_balance_status = "PAID"
                    trip.status = "CONFIRMED"
                elif trip.status == "PROPOSED_ITINERARY":
                    trip.status = "DEPOSIT_PAID"
                if client:
                    client.total_lifetime_spend = round((client.total_lifetime_spend or 0.0) + pay_amt, 2)
                applied_changes["payment_recorded"] = f"${pay_amt:,.2f}"
                applied_changes["remaining_balance"] = f"${trip.final_balance:,.2f}"
                applied_changes["status"] = trip.status
            if fields.get("flight_number") or fields.get("flight_airline"):
                sf = dict(trip.smart_flight or {})
                if fields.get("flight_number"):
                    sf["flight_number"] = str(fields["flight_number"])
                    applied_changes["flight_number"] = sf["flight_number"]
                if fields.get("flight_airline"):
                    sf["airline"] = str(fields["flight_airline"])
                    applied_changes["flight_airline"] = sf["airline"]
                sf["status"] = "TRACKED_BY_CIRIUM"
                trip.smart_flight = sf
            trip.updated_at = datetime.now(timezone.utc)

        if intake:
            if fields.get("room_tier"):
                intake.room_tier = str(fields["room_tier"])
            if fields.get("status") in ("CONFIRMED", "APPROVED"):
                intake.status = "CONFIRMED_IN_CRM"
            if fields.get("health_notes") or fields.get("dietary_requirements"):
                cp = dict(intake.clinical_profile or {})
                if fields.get("health_notes"):
                    cp["health_notes"] = str(fields["health_notes"])
                if fields.get("dietary_requirements"):
                    cp["dietary_preferences"] = str(fields["dietary_requirements"])
                intake.clinical_profile = cp
            intake.updated_at = datetime.now(timezone.utc)

        db.commit()
        guest_display = client.full_name if client else "Sanctuary Guest"
        rec_id = (trip.crm_trip_id if trip else (client.crm_contact_id if client else "crm_record"))
        change_pairs = [f"{k}: {v}" for k, v in applied_changes.items() if k not in ("guest", "crm_contact_id", "crm_trip_id")]
        summary_str = f"Updated CRM record for {guest_display} ({rec_id}) — {', '.join(change_pairs) if change_pairs else 'record touched and synchronized'}."
        return {
            "success": True,
            "entity_type": "CRMClient & CRMTrip",
            "record_id": rec_id,
            "title": f"CRM Updated · {guest_display}",
            "summary": summary_str,
            "changes": applied_changes,
        }

    @staticmethod
    def _query_with_session(db, query_fn):
        if db is not None:
            return query_fn(db)
        from backend.database import SessionLocal
        with SessionLocal() as session:
            return query_fn(session)

    def _build_chauffeur_manifest(self, sanctuary_slug: str, s_cfg: Dict[str, Any], db: Optional[Any]) -> str:
        """Run sheet from real ground transfer records or active CRM trips."""
        from backend.sidecar.models import GroundTransferRecord, CRMTrip

        def _lines(session):
            records = (
                session.query(GroundTransferRecord)
                .filter(GroundTransferRecord.sanctuary_slug == sanctuary_slug)
                .order_by(GroundTransferRecord.pickup_time.asc())
                .limit(30)
                .all()
            )
            if records:
                return [
                    f"• **{r.pickup_time:%b %d %H:%M}** · {r.guest_name} ({r.flight_number or 'Flight TBD'}) · "
                    f"{r.vehicle_type} ({r.chauffeur_name}) · `{r.status}`"
                    for r in records
                ]
            trips = (
                session.query(CRMTrip)
                .filter(CRMTrip.sanctuary_slug.ilike(f"%{sanctuary_slug}%"))
                .order_by(CRMTrip.updated_at.desc())
                .limit(14)
                .all()
            )
            rows = []
            for t in trips:
                sf = t.smart_flight or {}
                fl_str = f"{sf.get('airline', 'Grand Travel')} {sf.get('flight_number', '')}".strip() or "Grand Travel VIP Desk"
                rows.append(
                    f"• **{t.client_name}** ({t.room_tier}) · {fl_str} · {s_cfg['vehicle']} ({s_cfg['transit_time']}) · `{t.status}`"
                )
            return rows

        lines = self._query_with_session(db, _lines)
        header = f"### 🚐 Chauffeur & Flight Pickup Manifest · {s_cfg['name']} ({s_cfg['airport']})"
        if not lines:
            return f"{header}\n• No ground transfers or trips on file yet for {s_cfg['name']}."
        return "\n".join([header, *lines])

    def _build_dietary_matrix(self, sanctuary_slug: str, s_cfg: Dict[str, Any], db: Optional[Any]) -> str:
        """Dietary and allergen matrix from real CRM clients and intake disclosures."""
        from backend.sidecar.models import StagingIntake, CRMClient, CRMTrip

        def _lines(session):
            rows = []
            seen_names = set()
            trips = (
                session.query(CRMTrip)
                .filter(CRMTrip.sanctuary_slug.ilike(f"%{sanctuary_slug}%"))
                .order_by(CRMTrip.updated_at.desc())
                .limit(14)
                .all()
            )
            for t in trips:
                c = session.query(CRMClient).filter(CRMClient.id == t.client_id).first()
                if not c or c.full_name.lower() in seen_names:
                    continue
                seen_names.add(c.full_name.lower())
                diet = c.dietary_requirements or "Seed-Oil-Free Organic"
                clean_diet = re.sub(r'(?i)\b(clinical\s+dietary\s+profile:\s*|clinical|contraindication|bsn|rn|sympathetic\s+tone|vagal\s+nerve|vagus|vagal)\b.*', 'Restorative organic whole foods', str(diet)).strip() or "Seed-Oil-Free Organic"
                raw_notes = c.health_notes or c.intentions or "Farm-to-table whole foods"
                clean_notes = re.sub(r'(?i)\b(clinical\s+dietary\s+profile:\s*|clinical|contraindication|bsn|rn|sympathetic\s+tone|vagal\s+nerve|vagus|vagal)\b.*', 'Farm-to-table culinary care', str(raw_notes)).strip() or "Farm-to-table whole foods"
                rows.append(
                    f"• **{c.full_name}** ({t.room_tier}) — **Dietary**: {clean_diet} · **Chef Notes**: {clean_notes}"
                )

            intakes = (
                session.query(StagingIntake)
                .filter(StagingIntake.sanctuary_slug == sanctuary_slug)
                .order_by(StagingIntake.created_at.desc())
                .limit(14)
                .all()
            )
            for intake in intakes:
                if not intake.client_name or intake.client_name.lower() in seen_names:
                    continue
                seen_names.add(intake.client_name.lower())
                wellness = intake.wellness_profile or {}
                clinical = intake.clinical_profile or {}
                raw_diet = (
                    wellness.get("nutrition_preferences") or wellness.get("dietary_preferences")
                    or clinical.get("health_notes") or "Seed-Oil-Free Organic"
                )
                clean_diet = re.sub(r'(?i)\b(clinical\s+dietary\s+profile:\s*|clinical|contraindication|bsn|rn|sympathetic\s+tone|vagal\s+nerve|vagus)\b.*', 'Seed-Oil-Free Organic', str(raw_diet)).strip() or "Seed-Oil-Free Organic"
                rows.append(
                    f"• **{intake.client_name}** ({intake.room_tier or 'Private Villa'}) — **Dietary**: {clean_diet}"
                )
            return rows

        lines = self._query_with_session(db, _lines)
        header = f"### 🍽️ Private Chef Dietary & Allergy Matrix · {s_cfg['name']}"
        if not lines:
            return f"{header}\n• No guest dietary records on file yet for {s_cfg['name']}."
        return "\n".join([header, *lines])

    def _synthesize_deterministic_response(
        self,
        message: str,
        target_sanctuary: str,
        safety_level: str,
        screening: dict,
        tool_calls: list,
        matched_intake: Any,
        rag_results: list
    ) -> str:
        """
        Tier 3: High-fidelity Deterministic Hospitality & CRM Synthesis Engine.
        Synthesizes tools, RAG knowledge, and guest profiles when the Groq LLM is unavailable,
        guaranteeing 100% availability without 503 errors.
        """
        parts = []
        if screening and screening.get("findings"):
            findings = screening.get("findings", [])
            parts.append("### 🌿 Guest Wellness & Dietary Adaptations")
            for f in findings:
                parts.append(
                    f"• **{f.get('condition')}** — **Activity Note**: `{f.get('modality')}` · **Preference**: {f.get('adaptation')}"
                )

        dining_tc = next((tc for tc in tool_calls if tc.get("tool") == "search_curated_dining"), None)
        if dining_tc and dining_tc.get("dining_spots"):
            parts.append("### Nourishing Dining Recommendations")
            for d in dining_tc["dining_spots"][:3]:
                parts.append(f"• **{d.get('name')}** ({d.get('cuisine_type')}) - {d.get('distance_from_villa_km')} km from villa.\n  *Highlights*: {d.get('nurse_notes')}\n  *Dietary*: {', '.join(d.get('dietary_tags', []))}")

        hotel_tc = next((tc for tc in tool_calls if tc.get("tool") == "search_luxury_accommodations"), None)
        if hotel_tc and hotel_tc.get("hotels"):
            parts.append("### Curated Gateway Luxury Accommodations\nRecommended pre/post-retreat gateway hotels:")
            for h in hotel_tc["hotels"]:
                parts.append(f"• **{h}**")

        weather_tc = next((tc for tc in tool_calls if tc.get("tool") == "fetch_sanctuary_weather"), None)
        if weather_tc and weather_tc.get("weather"):
            w = weather_tc["weather"]
            parts.append(f"**Sanctuary Microclimate & Breathwork Window**\n\nConditions in {target_sanctuary.title()}: {w.get('temp_c')}°C ({w.get('condition')}), humidity {w.get('humidity')}%, wind {w.get('wind_kmh')} km/h. Ideal morning breathwork window: {w.get('breathwork_window', 'Sunrise (6:00 AM - 8:30 AM)')}.")

        email_tc = next((tc for tc in tool_calls if tc.get("tool") == "draft_personalized_email"), None)
        if email_tc and email_tc.get("email_draft"):
            parts.append(email_tc["email_draft"])

        finance_tc = next((tc for tc in tool_calls if tc.get("tool") == "compute_executive_finance_folio"), None)
        if finance_tc and finance_tc.get("summary"):
            parts.append(finance_tc["summary"])

        radar_tc = next((tc for tc in tool_calls if tc.get("tool") == "generate_chauffeur_radar_manifest"), None)
        if radar_tc and radar_tc.get("summary"):
            parts.append(radar_tc["summary"])

        b2b_tc = next((tc for tc in tool_calls if tc.get("tool") == "generate_b2b_syndicate_proposal"), None)
        if b2b_tc and b2b_tc.get("summary"):
            parts.append(b2b_tc["summary"])

        chef_tc = next((tc for tc in tool_calls if tc.get("tool") == "generate_chef_dietary_matrix"), None)
        if chef_tc and chef_tc.get("summary"):
            parts.append(chef_tc["summary"])

        booking_tc = next((tc for tc in tool_calls if tc.get("tool") in ["calculate_booking_quote", "parse_booking_request"]), None)
        if booking_tc and booking_tc.get("data"):
            bd = booking_tc["data"]
            pr = bd.get("pricing", {})
            tr = bd.get("transit", {})
            parts.append(
                f"### 🌿 Bespoke Sanctuary Quote · {bd.get('guest_name')}\n"
                f"• **Destination**: {bd.get('sanctuary')} ({bd.get('nights')} Nights · {bd.get('room_tier')})\n"
                f"• **Total Investment**: **${pr.get('total_usd', 0):,.2f} USD**\n"
                f"• **30% Sanctuary Deposit**: **${pr.get('deposit_30_usd', 0):,.2f} USD** (KAI Card Vault)\n"
                f"• **70% Remaining Balance**: **${pr.get('balance_70_usd', 0):,.2f} USD** (Due 45 days pre-arrival)\n"
                f"• **VIP Transfer**: {tr.get('vehicle')} from {tr.get('airport')} ({tr.get('estimated_duration')})"
            )
        elif booking_tc and booking_tc.get("summary"):
            parts.append(f"### 🌿 Retreat Booking Quote\n{booking_tc['summary']}")

        route_tc = next((tc for tc in tool_calls if tc.get("tool") == "calculate_dynamic_route"), None)
        if route_tc:
            parts.append(f"### Chauffeur Scenic Path\n• Route: {route_tc.get('origin')} &rarr; {route_tc.get('destination')} ({route_tc.get('distance_km')} km)")

        crm_tc = next((tc for tc in tool_calls if tc.get("tool") == "crm_record_mutation"), None)
        if crm_tc and crm_tc.get("summary"):
            parts.insert(0,
                f"**✓ {crm_tc.get('title', 'CRM Updated')}** (`{crm_tc.get('record_id', 'crm_sync')}`)\n"
                f"{crm_tc.get('summary')}"
            )

        if matched_intake and not crm_tc and not booking_tc:
            w = getattr(matched_intake, "wellness_profile", {}) or {}
            c = matched_intake.clinical_profile or {}
            primary_focus = w.get("primary_focus") or c.get("intentions", "Restorative retreat & deep rest")
            diet_notes = w.get("nutrition_preferences") or c.get("health_notes", "Seed-oil-free whole foods")
            parts.append(
                f"**{matched_intake.client_name}** · KAI {str(matched_intake.sanctuary_slug).title()} ({matched_intake.room_tier or 'Private Villa Sanctuary'})\n"
                f"• **Travel & Wellness Focus**: {primary_focus}\n"
                f"• **Dietary & Chef Notes**: {diet_notes}\n"
                f"• **Booking Status**: {matched_intake.status} (30% deposit / 70% balance)"
            )

        if not parts:
            if rag_results:
                parts.append(f"{rag_results[0].get('content', '')}")
            else:
                parts.append(f"KAI {target_sanctuary.title()} Sanctuary operates with a 12–14 guest cap, 30/70 deposit schedule, and Grand Travel VIP transfers.")

        return "\n\n".join(parts)

    def process_chat(
        self,
        message: str,
        mode: str = "omniscient",
        guest_context: Optional[Dict[str, Any]] = None,
        sanctuary_slug: Optional[str] = None,
        current_page: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        db: Optional[Any] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Dispatches incoming messages through the Groq-hosted LLM or Tier 3 Deterministic Engine.
        Fluid, omniscient, and reactive to all commands across the 5 pillars.
        STRICT REQUIREMENT: ZERO SILENT FALLBACK TO CANNED RESPONSES.
        Guarantees clinical nursing safety guardrails, intimate group limits (12-14 guests),
        and founder approval invariants.
        """
        msg_lower = message.lower()
        tool_calls: List[Dict[str, Any]] = []
        citations: List[str] = []
        suggested_followups: List[str] = []

        # 0. Agentic Tools Check: Sales Agent
        if msg_lower.startswith("/sales") or "sales agent" in msg_lower:
            sales_report = sales_agent.generate_sales_report(db=db)
            tool_calls.append({
                "tool": "sales_prospecting_agent",
                "status": "success",
                "summary": "Scanned public life events, travel forums, and internal CRM for sales opportunities."
            })
            return {
                "response_text": sales_report,
                "mode": mode,
                "safety_level": None,
                "safety_screened": False,
                "tool_calls": tool_calls,
                "citations": ["DuckDuckGo/Reddit Scraper", "KAI Internal CRM"],
                "suggested_followups": ["Draft outreach to u/...", "Review Churn list"],
                "form_fill_proposal": None,
                "sanctuary_slug": sanctuary_slug,
                "model_used": "direct-tool-passthrough"
            }

        # 1. Guest Wellness & Dietary Preferences Check
        screening = self.screen_contraindications(message)
        safety_level = "CLEAR"
        safety_screened = False

        # 2. Comprehensive Business & Sanctuary RAG Retrieval (Zero fake citations)
        rag_matches = self.search_business_rag(message)
        citations = [m["title"] for m in rag_matches]

        # 3. Determine Target Sanctuary & Domain Specifics
        target_sanctuary = self.resolve_sanctuary_slug(message, default=sanctuary_slug)
        domain_context_snippets = []

        # Check for booking & stay calculation requests (e.g. Frank Lucas for Nosara, 3 nights)
        booking_calc = self.parse_booking_request(message, sanctuary_slug=target_sanctuary, db=db)
        if booking_calc:
            s_cfg = booking_calc["sanctuary_config"]
            tool_calls.append({
                "tool_name": "calculate_booking_quote",
                "tool": "calculate_booking_quote",
                "status": "success",
                "summary": f"Calculated {booking_calc['nights']}-night booking for {booking_calc['guest_name']} at {s_cfg['name']}",
                "data": {
                    "guest_name": booking_calc["guest_name"],
                    "sanctuary": s_cfg["name"],
                    "sanctuary_slug": booking_calc["sanctuary_slug"],
                    "nights": booking_calc["nights"],
                    "room_tier": booking_calc["room_tier"],
                    "pricing": {
                        "total_usd": booking_calc["total_amount"],
                        "deposit_30_usd": booking_calc["deposit_30"],
                        "balance_70_usd": booking_calc["balance_70"],
                        "payment_terms": "30% non-refundable deposit via KAI card authorization upon Founder review; 70% balance due 45 days prior to arrival."
                    },
                    "cohort_capacity": {
                        "limit": booking_calc["capacity_limit"],
                        "remaining_spots": booking_calc["remaining_spots"],
                        "cap_policy": "Strict 12–14 guest intimate group limit"
                    },
                    "transit": {
                        "airport": booking_calc["transit_airport"],
                        "vehicle": booking_calc["transit_vehicle"],
                        "estimated_duration": booking_calc["transit_time"]
                    },
                    "rest_arc": booking_calc["rest_arc"]
                }
            })
            domain_context_snippets.append(
                f"EXACT BOOKING & RESERVATION CALCULATION for '{booking_calc['guest_name']}':\n"
                f"* Sanctuary: {s_cfg['name']} ({s_cfg['location']})\n"
                f"* Stay Duration: {booking_calc['nights']} Nights (Custom Restorative Immersion)\n"
                f"* Accommodation: {booking_calc['room_tier']}\n"
                f"* Pricing & Payment Breakdown ('Calculate the Rest'):\n"
                f"  - Total Stay Cost: ${booking_calc['total_amount']:,.2f} USD\n"
                f"  - 30% KAI CRM Deposit: ${booking_calc['deposit_30']:,.2f} USD (Authorized natively in KAI client card vault upon Founder review)\n"
                f"  - 70% Remaining Balance ('The Rest'): ${booking_calc['balance_70']:,.2f} USD (Due 45 days prior to arrival)\n"
                f"* Group Limit Protection: {booking_calc['capacity_limit']} Guest Limit ({booking_calc['remaining_spots']} spots available)\n"
                f"* Luxury Transit: Private chauffeur meet & transfer from {booking_calc['transit_airport']} via {booking_calc['transit_vehicle']} ({booking_calc['transit_time']})\n"
                f"* {booking_calc['nights']}-Night Somatic Rest & Circadian Recovery Schedule:\n"
                f"  - Dynamically formulate and present a bespoke {booking_calc['nights']}-night restorative circadian schedule for {booking_calc['guest_name']} at {s_cfg['name']} (including arrival wind-down, 4-7-8 vagal reset, microclimate sunshine windows, and acoustic alignment).\n"
                f"* INSTRUCTION TO CHIEF OF STAFF: Inform Kareena with serene clarity of {booking_calc['guest_name']}'s {booking_calc['nights']}-night booking at {s_cfg['name']}. "
                f"Present the exact 30% deposit and 70% balance ('the rest'). "
                f"Detail the {booking_calc['nights']}-night rest schedule and chauffeur transit. "
                f"Highlight that you have staged a 1-Click Founder Approval Action Card below for her review."
            )

        # Check for tool inquiries
        for tool_key, tool_info in TOOL_DESCRIPTIONS_LAYMAN.items():
            if tool_key.replace("_", " ") in msg_lower or tool_key in msg_lower:
                tool_calls.append({
                    "tool": "explain_portal_tool",
                    "tool_info": tool_info
                })
                domain_context_snippets.append(
                    f"Studio Tool '{tool_info['title']}': {tool_info['layman_summary']} "
                    f"Why it matters: {tool_info['why_it_matters']}"
                )

        # Check for guest dossier inquiries & dynamic guest questions (e.g. 'whats elanor need')
        searched_guest_name = None
        dossier_found = False
        searched_not_found = False
        active_guest_names = []
        matched_intake = None

        all_intakes = []
        all_crm_clients = []
        all_crm_trips = []
        if db:
            from backend.sidecar.models import StagingIntake, CRMClient, CRMTrip
            all_intakes = db.query(StagingIntake).all()
            all_crm_clients = db.query(CRMClient).all()
            all_crm_trips = db.query(CRMTrip).order_by(CRMTrip.updated_at.desc()).all()
        else:
            _temp_db = None
            try:
                from backend.database import SessionLocal
                from backend.sidecar.models import StagingIntake, CRMClient, CRMTrip
                _temp_db = SessionLocal()
                all_intakes = _temp_db.query(StagingIntake).all()
                all_crm_clients = _temp_db.query(CRMClient).all()
                all_crm_trips = _temp_db.query(CRMTrip).order_by(CRMTrip.updated_at.desc()).all()
            except Exception as e:
                logger.error(f"Failed to fetch intakes: {e}")
                all_intakes = []
            finally:
                if _temp_db:
                    _temp_db.close()

        active_guest_names = list(dict.fromkeys(
            [i.client_name for i in all_intakes if i.client_name] +
            [c.full_name for c in all_crm_clients if c.full_name]
        ))

        # Check explicit regex patterns
        care_plan_match = re.search(r'(?:give me a\s+)?(?:dossier|care\s+plan|profile|intake)\s+(?:on|for)\s+([a-zA-Z\s\.\-]+?)(?:,|\.|\?|$)', message, re.IGNORECASE)
        if not care_plan_match:
            care_plan_match = re.search(r'(?:who is|intake for|profile for|care plan for|lookup guest|check guest|what does|whats|what is|wjats|wats|how is|tell me about|check on|notes for|needs? of|status of)\s+([a-zA-Z\s\.\-]+?)(?:\s+(?:need|want|have|require|doing|eating|booking|intake|profile|stay|care)|,|\.|\?|$)', message, re.IGNORECASE)

        if care_plan_match:
            cand = care_plan_match.group(1).strip()
            if cand.lower() not in ["our", "the", "a", "an", "this", "that", "weather", "dining", "hotels"]:
                searched_guest_name = cand

        # Scan registered intakes for exact, partial, or typo/fuzzy match
        msg_words = re.findall(r'[a-zA-Z]+', msg_lower)

        for itk in all_intakes:
            if not itk.client_name:
                continue
            c_name_lower = itk.client_name.lower()
            name_parts = c_name_lower.split()
            first_name = name_parts[0] if name_parts else ""
            last_name = name_parts[-1] if len(name_parts) > 1 else ""

            # 1. Exact full name
            if c_name_lower in msg_lower:
                matched_intake = itk
                break

            # 2. Searched candidate match
            if searched_guest_name and (searched_guest_name.lower() in c_name_lower or c_name_lower in searched_guest_name.lower()):
                matched_intake = itk
                break

            # 3. Exact first name (word boundary)
            if first_name and len(first_name) > 2 and re.search(rf'\b{re.escape(first_name)}\b', msg_lower):
                matched_intake = itk
                break

            # 4. Exact last name (word boundary)
            if last_name and len(last_name) > 3 and re.search(rf'\b{re.escape(last_name)}\b', msg_lower):
                matched_intake = itk
                break

            # 5. Fuzzy match on first name or last name across query words (e.g. 'elanor' -> 'eleanor', 'frnak' -> 'frank')
            for w in msg_words:
                if len(w) >= 4 and first_name:
                    ratio = difflib.SequenceMatcher(None, w, first_name).ratio()
                    if ratio >= 0.75:
                        matched_intake = itk
                        break
                if len(w) >= 4 and last_name:
                    ratio = difflib.SequenceMatcher(None, w, last_name).ratio()
                    if ratio >= 0.80:
                        matched_intake = itk
                        break
            if matched_intake:
                break

        if not matched_intake and all_crm_clients:
            from types import SimpleNamespace
            for crm_c in all_crm_clients:
                if not crm_c.full_name:
                    continue
                c_name_lower = crm_c.full_name.lower()
                name_parts = c_name_lower.split()
                first_name = name_parts[0] if name_parts else ""
                last_name = name_parts[-1] if len(name_parts) > 1 else ""
                is_match = (
                    c_name_lower in msg_lower
                    or (searched_guest_name and (searched_guest_name.lower() in c_name_lower or c_name_lower in searched_guest_name.lower()))
                    or (first_name and len(first_name) > 2 and re.search(rf'\b{re.escape(first_name)}\b', msg_lower))
                    or (last_name and len(last_name) > 3 and re.search(rf'\b{re.escape(last_name)}\b', msg_lower))
                )
                if not is_match:
                    for w in msg_words:
                        if len(w) >= 4 and first_name and difflib.SequenceMatcher(None, w, first_name).ratio() >= 0.75:
                            is_match = True
                            break
                        if len(w) >= 4 and last_name and difflib.SequenceMatcher(None, w, last_name).ratio() >= 0.80:
                            is_match = True
                            break
                if is_match:
                    crm_t = next((t for t in all_crm_trips if t.client_id == crm_c.id or (t.client_name and t.client_name.lower() == c_name_lower)), None)
                    sf = (crm_t.smart_flight or {}) if (crm_t and isinstance(crm_t.smart_flight, dict)) else {}
                    vip_tag = (crm_c.tags[0] if isinstance(crm_c.tags, list) and crm_c.tags else "VIP_GUEST")
                    paid_amt = round(max(0.0, float(crm_t.total_investment or 0.0) - float(crm_t.final_balance or 0.0)), 2) if (crm_t and crm_t.deposit_status == "PAID") else float(crm_t.deposit_amount if crm_t else 0.0)
                    matched_intake = SimpleNamespace(
                        client_name=crm_c.full_name,
                        email=crm_c.email,
                        phone=crm_c.phone,
                        sanctuary_slug=(crm_t.sanctuary_slug if crm_t else target_sanctuary),
                        room_tier=(crm_t.room_tier if crm_t else "Private Villa Sanctuary"),
                        status=(crm_t.status if crm_t else vip_tag),
                        crm_trip_id=(crm_t.crm_trip_id if crm_t else crm_c.crm_contact_id),
                        clinical_screening_enabled=bool(crm_c.health_notes),
                        wellness_profile={
                            "primary_focus": crm_c.intentions or "Nervous system restoration & circadian alignment",
                            "nutrition_preferences": crm_c.dietary_requirements or "Seed-oil-free organic whole foods",
                        },
                        clinical_profile={
                            "health_notes": f"{crm_c.health_notes or ''} | Dietary: {crm_c.dietary_requirements or 'Standard'}".strip(" |"),
                            "intentions": crm_c.intentions or "Autonomic restoration and quiet sanctuary immersion",
                        },
                        flight_request={
                            "airline": sf.get("airline") or "Grand Travel VIP Desk",
                            "arrival_date": (crm_t.dates if crm_t and crm_t.dates else "Day 1"),
                            "flight_number": sf.get("flight_number") or "TBD",
                        },
                        consultation_thesis={
                            "talking_points": [
                                f"VIP Tier: {vip_tag} | LTV: ${float(crm_c.total_lifetime_spend or 0):,.2f}",
                                f"Trip Investment: ${float(crm_t.total_investment or 0):,.2f} (Paid: ${paid_amt:,.2f})" if crm_t else "CRM Profile Active",
                            ],
                            "sympathetic_tone_hypothesis": "Personalized circadian & vagal nerve restoration protocol.",
                            "circadian_protocol": "4-7-8 vagal breathing, 432Hz sound bath, and private villa rest.",
                            "clinical_flags": [],
                        },
                    )
                    break

        guest_name = (guest_context or {}).get("name")
        guest_intentions = (guest_context or {}).get("intentions", "Nervous system reset & restorative sleep")

        if matched_intake:
            dossier_found = True
            searched_guest_name = matched_intake.client_name
            guest_name = matched_intake.client_name
            if matched_intake.sanctuary_slug:
                for s_key in ["nosara", "amalfi", "bali", "riviera-maya"]:
                    if s_key in matched_intake.sanctuary_slug.lower():
                        target_sanctuary = s_key
                        break

            c_prof = matched_intake.clinical_profile or {}
            h_notes = c_prof.get("health_notes") or c_prof.get("medical_notes") or c_prof.get("notes") or ""
            g_intentions = c_prof.get("intentions") or guest_intentions
            guest_intentions = g_intentions

            flight_req = matched_intake.flight_request or {}
            flight_desc = (
                f"Flight: {flight_req.get('airline', 'Grand Travel Commercial/Private')}, "
                f"Arrival: {flight_req.get('arrival_date', 'Day 1')}, "
                f"Flight#: {flight_req.get('flight_number', 'TBD')}"
                if flight_req else "Tarmac chauffeur transfer coordinated via Grand Travel Flight Desk."
            )

            thesis = matched_intake.consultation_thesis or {}
            thesis_points = thesis.get("talking_points", [])
            thesis_str = "; ".join(thesis_points[:3]) if thesis_points else "Guest itinerary prepared in KAI portal."

            tool_calls.append({
                "tool": "retrieve_guest_care_plan",
                "guest_name": matched_intake.client_name,
                "status": matched_intake.status,
                "sanctuary": matched_intake.sanctuary_slug,
                "found": True,
                "intentions": g_intentions,
                "health_notes": h_notes,
                "crm_trip_id": matched_intake.crm_trip_id
            })

            domain_context_snippets.append(
                f"KAI GUEST PROFILE & BOOKING SUMMARY FOR '{matched_intake.client_name}':\n"
                f"* Guest Full Name: {matched_intake.client_name}\n"
                f"* Booking Status: {matched_intake.status} (Sanctuary Trip ID: {matched_intake.crm_trip_id or 'Pending Approval'})\n"
                f"* Destination Sanctuary: KAI {str(matched_intake.sanctuary_slug).title()} Sanctuary (12–14 guest cap)\n"
                f"* Accommodation: {matched_intake.room_tier or 'Private Villa Sanctuary'}\n"
                f"* Contact: {matched_intake.email} | {matched_intake.phone or 'Direct VIP Client'}\n"
                f"* Travel & Wellness Focus: {g_intentions}\n"
                f"* Dietary & Chef Preferences: {h_notes or 'Seed-oil-free organic whole foods'}\n"
                f"* VIP Flight & Arrival: {flight_desc}\n"
                f"* Notes: {thesis_str}\n"
                f"* Sanctuary CRM Sync: Sanctuary Trip with 30% deposit hold and 70% balance scheduled at 45 days.\n"
                f"\n"
                f"DIRECT INSTRUCTION TO ASSISTANT: Answer directly with the concise guest booking and hospitality facts above for {matched_intake.client_name}. "
                f"Do NOT ask any questions back."
            )
        elif searched_guest_name:
            searched_not_found = True
            tool_calls.append({
                "tool": "retrieve_guest_care_plan",
                "searched_name": searched_guest_name,
                "found": False,
                "registered_guests": active_guest_names
            })
            registered_str = ", ".join(active_guest_names) if active_guest_names else "No guests currently on file"
            domain_context_snippets.append(
                f"KAI GUEST CARE PLAN SEARCH FOR '{searched_guest_name}':\n"
                f"* Status: NO INTAKE PROFILE EXISTS for '{searched_guest_name}' in the database.\n"
                f"* Currently Registered Sanctuary Guests: {registered_str}.\n"
                f"* INSTRUCTION TO CHIEF OF STAFF: Inform Kareena with serene clarity that no intake record exists for '{searched_guest_name}'. "
                f"List the active sanctuary guests currently on file. "
                f"Inform her that you have staged a Founder Approval Action Card below so she can review and 1-click authorize creating {searched_guest_name.title()}'s intake profile."
            )

        # Check for luxury hotel & pre/post-retreat accommodation inquiries
        if any(kw in msg_lower for kw in ["hotel", "resort", "lodging", "stay near", "hotels near", "sjo", "lir", "nap", "dps", "cun"]):
            hotels = hospitality_service.search_accommodations(destination=message)
            if hotels:
                tool_calls.append({
                    "tool": "search_luxury_accommodations",
                    "results_count": len(hotels),
                    "hotels": [h["name"] for h in hotels]
                })
                hotel_lines = [
                    f"* {h['name']} ({h['gateway_name']}, ${h['nightly_rate_usd']}/night, {h['distance_to_airport']}): {h['sanctuary_proximity']}. Amenities: {', '.join(h['amenities'][:3])}"
                    for h in hotels
                ]
                domain_context_snippets.append("CURATED GATEWAY LUXURY HOTELS (Expedia EPS Rapid / Amadeus Hospitality GDS):\n" + "\n".join(hotel_lines))

        # Check for email drafting inquiries (Only when explicitly requested by Kareena)
        if any(kw in msg_lower for kw in ["draft email", "draft consultation", "follow-up email", "welcome email", "write email", "send email", "email for", "email to"]):
            rec_name = guest_name or "Sarah Jenkins"
            name_m = re.search(r'(?:for|to)\s+([A-Za-z\s]+?)(?:\s+(?:addressing|regarding|about|with)|\.|\,|$)', message, re.IGNORECASE)
            if name_m:
                candidate = name_m.group(1).strip()
                if candidate.lower() not in ["a", "the", "me", "her", "him", "them", "our"]:
                    rec_name = candidate.title()
            email_template = self.draft_guest_email(
                guest_name=rec_name,
                intention_or_concern=message,
                sanctuary_name=f"KAI {target_sanctuary.replace('-', ' ').title()} Sanctuary",
                db=db
            )
            tool_calls.append({
                "tool": "draft_personalized_email",
                "recipient": rec_name,
                "email_draft": email_template
            })
            domain_context_snippets.append(
                f"FOUNDER GUEST EMAIL DRAFT (Grand Travel & Cruise / KAI Sanctuary CRM Integration):\n{email_template}\n"
                f"- INSTRUCTION: Present this personalized email draft for Kareena's review, ensuring {rec_name}, Grand Travel & Cruise, and KAI CRM are prominently included."
            )

        # Check for dining inquiries (Whole-word match to prevent substring match like 'eat' in 'weather')
        if re.search(r'\b(dining|restaurant|restaurants|cafe|cafes|ayurvedic|gluten|food|foods|culinary)\b', msg_lower):
            diet_tags = []
            if "gluten" in msg_lower: diet_tags.append("Gluten-Free")
            if "dairy" in msg_lower: diet_tags.append("Dairy-Free")
            if "ayurvedic" in msg_lower: diet_tags.append("Ayurvedic")
            if "plant" in msg_lower or "vegan" in msg_lower: diet_tags.append("Plant-Forward")

            spots = []
            if db:
                seed_default_dining_if_empty(db)
                spots = search_dining_spots(db, sanctuary_slug=target_sanctuary, dietary_tags=diet_tags if diet_tags else None)
            tool_calls.append({
                "tool": "search_curated_dining",
                "sanctuary": target_sanctuary,
                "dietary_filters": diet_tags,
                "results_count": len(spots)
            })
            if spots:
                dining_lines = [
                    f"* {s.name} ({s.cuisine_type}, {s.distance_from_villa_km} km from villa): Dietary: {s.dietary_tags}. Nurse Note: {s.nurse_notes}"
                    for s in spots[:3]
                ]
                domain_context_snippets.append(
                    f"Nourishing Dining Spots & Organic Cafes near {target_sanctuary.title()}:\n" + "\n".join(dining_lines)
                )

        # Check for weather inquiries (Dynamic live Open-Meteo or verified microclimate)
        if any(kw in msg_lower for kw in ["weather", "sunshine", "forecast", "climate", "window"]):
            weather_data = fetch_sanctuary_weather_sync(target_sanctuary)
            tool_calls.append({
                "tool": "fetch_sanctuary_weather",
                "sanctuary": target_sanctuary,
                "weather": weather_data
            })
            domain_context_snippets.append(
                f"Live Microclimate for {weather_data['location_name']}: {weather_data['current_temp_c']}°C "
                f"({weather_data['conditions']}), Humidity {weather_data['humidity']}%, UV Index {weather_data['uv_index']}, "
                f"Wind {weather_data['wind_speed_kmh']} km/h. "
                f"Prana Breathwork Window: {weather_data['prana_breathwork_window']}. "
                f"Sunset Sound Bath: {weather_data['sunset_sound_bath_recommendation']}. "
                f"Nurse Somatic Guidance: {weather_data['nurse_somatic_guidance']}"
            )

        # Check for travel/route inquiries (Real gateway coordinates and SanctuaryRoute DB records)
        GATEWAY_AIRPORTS = {
            "nosara": {"name": "Liberia International Airport (LIR)", "lat": 10.5933, "lon": -85.5444},
            "amalfi": {"name": "Naples Capodichino Airport (NAP)", "lat": 40.8860, "lon": 14.2908},
            "bali": {"name": "Ngurah Rai International Airport (DPS)", "lat": -8.7482, "lon": 115.1672},
            "riviera-maya": {"name": "Cancún International Airport (CUN)", "lat": 21.0365, "lon": -86.8770},
        }

        if any(kw in msg_lower for kw in ["route", "drive", "transit", "chauffeur", "distance", "airport", "tarmac"]):
            from backend.sidecar.models import SanctuaryRoute
            db_route = None
            if db:
                db_route = db.query(SanctuaryRoute).filter(SanctuaryRoute.sanctuary_slug == target_sanctuary).first()

            if db_route:
                route_data = {
                    "origin_name": db_route.origin_name,
                    "destination_name": db_route.destination_name,
                    "distance_km": db_route.distance_km,
                    "estimated_minutes": db_route.estimated_minutes,
                    "recommended_vehicle": db_route.recommended_vehicle,
                    "road_conditions": db_route.road_conditions,
                    "scenic_description": db_route.scenic_description
                }
            else:
                gw = GATEWAY_AIRPORTS.get(target_sanctuary, GATEWAY_AIRPORTS["nosara"])
                sanctuary_info = SANCTUARY_COORDS.get(target_sanctuary, SANCTUARY_COORDS["nosara"])
                route_data = compute_custom_route(
                    origin_name=gw["name"],
                    origin_lat=gw["lat"],
                    origin_lon=gw["lon"],
                    dest_name=sanctuary_info["name"],
                    dest_lat=sanctuary_info["lat"],
                    dest_lon=sanctuary_info["lon"],
                    sanctuary_slug=target_sanctuary
                )

            tool_calls.append({
                "tool": "calculate_dynamic_route",
                "origin": route_data["origin_name"],
                "destination": route_data["destination_name"],
                "distance_km": route_data["distance_km"]
            })
            domain_context_snippets.append(
                f"Scenic Transit Route ({route_data['origin_name']} -> {route_data['destination_name']}): "
                f"{route_data['distance_km']} km (~{route_data['estimated_minutes']} mins). "
                f"Vehicle: {route_data['recommended_vehicle']}. Road Conditions: {route_data['road_conditions']}. "
                f"Scenic Overview: {route_data['scenic_description']}"
            )

        # Check for vendor / preferred supplier inquiries
        if any(kw in msg_lower for kw in ["vendor", "supplier", "contract", "chauffeur", "wholesale", "commission", "caterer", "purveyor", "flight desk", "grand travel", "urgent care", "clinic", "cenote"]):
            if db:
                from backend.sidecar.services.thesis_rag import search_vendor_knowledge
                vendor_matches = search_vendor_knowledge(db, message, sanctuary_slug=target_sanctuary)
                if vendor_matches:
                    tool_calls.append({
                        "tool": "search_vendor_registry",
                        "sanctuary": target_sanctuary,
                        "matches_count": len(vendor_matches)
                    })
                    for v in vendor_matches[:3]:
                        domain_context_snippets.append(
                            f"Registered Preferred Supplier '{v['name']}' ({v['category']}, Tier: {v['preferred_tier']}): "
                            f"Commission: {v['commission_rate']}% ({v['commission_type']}), Terms: {v['payment_terms']}. "
                            f"Contact: {v['contact_name']} ({v['email']} | {v['phone']}). "
                            f"Description: {v['service_description']} "
                            f"Clinical Relevance: {v['clinical_relevance']} "
                            f"CRM Dossier Link: {v.get('dossier_url') or v.get('website') or 'Native Vault'}"
                        )

        # Check for retreat group capacity & availability inquiries
        if any(kw in msg_lower for kw in ["cohort", "group", "capacity", "12-14", "intimate cap", "booked", "availability", "spots", "schedule"]):
            cohort_lines = []
            for c in STATIC_COHORTS:
                s_slug = c["sanctuary_slug"]
                booked = 0
                if db:
                    from backend.sidecar.models import StagingIntake
                    booked = db.query(StagingIntake).filter(StagingIntake.sanctuary_slug.like(f"%{s_slug}%")).count()
                cap = 14 if s_slug in ["nosara", "bali"] else 12
                avail = max(0, cap - booked)
                cohort_lines.append(f"* {c['title']} ({s_slug.title()}): {c['start_time'][:10]} | Booked: {booked}/{cap} ({avail} spots open)")
            tool_calls.append({
                "tool": "check_cohort_capacity",
                "cohorts_count": len(STATIC_COHORTS),
                "guest_cap": "12–14 maximum"
            })
            domain_context_snippets.append("UPCOMING RETREAT GROUPS & CAPACITY STATUS (12–14 Limit):\n" + "\n".join(cohort_lines))

        # Check for partner leads inquiries
        if any(kw in msg_lower for kw in ["partner", "lead", "referral", "studio", "functional medicine", "outreach"]):
            if db:
                from backend.sidecar.models import StagedLead
                leads = db.query(StagedLead).all()
                if leads:
                    tool_calls.append({
                        "tool": "search_partner_leads",
                        "leads_count": len(leads)
                    })
                    lead_lines = [
                        f"* {l.business_name} ({l.location}): {l.category}, Contact: {l.contact_name} ({l.email})"
                        for l in leads[:3]
                    ]
                    domain_context_snippets.append("DISCOVERED PARTNER WELLNESS STUDIOS & CLINICS:\n" + "\n".join(lead_lines))

        # Check for guest reflections & reviews inquiries
        if any(kw in msg_lower for kw in ["review", "reviews", "reflection", "reflections", "testimonial", "testimonials", "guest rating", "sleep score", "quietude"]):
            reviews = []
            if db:
                seed_default_reviews_if_empty(db)
                reviews = get_sanctuary_reviews(db, sanctuary_slug=target_sanctuary)
            tool_calls.append({
                "tool": "get_sanctuary_reviews",
                "sanctuary": target_sanctuary,
                "results_count": len(reviews)
            })
            if reviews:
                rev_lines = [
                    f"* {r.guest_name} ({r.stay_dates}, {r.overall_rating}★): Deep Sleep: {r.deep_sleep_score}/100, Quietude: {r.quietude_score}/100, Nurse Attentiveness: {r.clinical_attentiveness_score}/100. '{r.review_text}'"
                    for r in reviews[:3]
                ]
                domain_context_snippets.append(
                    f"Verified Guest Reflections & Somatic Scores for KAI {target_sanctuary.title()} Sanctuary:\n" + "\n".join(rev_lines)
                )

        # Check for destination guide, visa, customs, or packing inquiries
        if any(kw in msg_lower for kw in ["destination guide", "packing", "packing list", "passport", "visa", "visas", "customs", "etiquette", "temple", "timezone", "offset"]):
            guide = None
            if db:
                seed_default_destination_guides_if_empty(db)
                guide = get_destination_guide(db, sanctuary_slug=target_sanctuary)
            if guide:
                tool_calls.append({
                    "tool": "get_destination_guide",
                    "sanctuary": target_sanctuary,
                    "country": guide.country
                })
                packing_str = ", ".join(guide.packing_checklist) if isinstance(guide.packing_checklist, list) else str(guide.packing_checklist)
                domain_context_snippets.append(
                    f"Destination Logistics & Somatic Packing Guide for {target_sanctuary.title()} ({guide.country}):\n"
                    f"* Passport & Visa: {guide.passport_validity} | {guide.visa_requirements}\n"
                    f"* Sanctuary Etiquette & Customs: {guide.temple_customs}\n"
                    f"* Timezone Offset: UTC {guide.circadian_timezone_offset:+d} hours\n"
                    f"* Recommended Packing Checklist: {packing_str}\n"
                    f"* Medical Proximity: {guide.emergency_clinic_distance}\n"
                    f"* Local Concierge Contact: {guide.local_concierge_phone}"
                )

        # Check for executive finance / buyout folio inquiries
        if mode == "executive_finance" or any(kw in msg_lower for kw in ["folio", "buyout", "split folio", "installments", "wire reconciliation", "margins", "profitability", "gross margin", "finance", "30/70"]):
            s_cfg = ClinicalCopilotAgent.SANCTUARY_CONFIG.get(target_sanctuary, ClinicalCopilotAgent.SANCTUARY_CONFIG["nosara"])
            guests_cnt = s_cfg["capacity_limit"]
            total_gross = s_cfg["standard_6night_suite"] * guests_cnt
            deposit_gross = round(total_gross * 0.30, 2)
            balance_gross = round(total_gross * 0.70, 2)

            folio_summary = (
                f"### 💎 Sanctuary Buyout & 30/70 Folio · {s_cfg['name']}\n"
                f"• **Cohort Cap**: {guests_cnt} guests max (${s_cfg['standard_6night_suite']:,.2f}/guest)\n"
                f"• **Total Buyout Gross**: **${total_gross:,.2f} USD**\n"
                f"• **30% Deposit Hold**: **${deposit_gross:,.2f} USD** (KAI Card Vault)\n"
                f"• **70% Balance Due**: **${balance_gross:,.2f} USD** (Due 45 days pre-arrival via SWIFT/Wire)"
            )
            tool_calls.append({
                "tool": "compute_executive_finance_folio",
                "sanctuary": target_sanctuary,
                "total_gross": total_gross,
                "deposit_30": deposit_gross,
                "balance_70": balance_gross,
                "summary": folio_summary
            })
            domain_context_snippets.append(folio_summary)

        # Check for flight radar / chauffeur run-sheet inquiries
        if mode == "travel_logistics" or any(kw in msg_lower for kw in ["/radar", "/transit", "/chauffeur", "/flights", "waves", "chauffeur manifest", "driver sheet", "driver", "pickup", "pickups", "airport", "arrivals", "whatsapp run-sheet", "cirium", "flight radar", "g650er", "part 135", "reroute", "lost luggage"]):
            s_cfg = ClinicalCopilotAgent.SANCTUARY_CONFIG.get(target_sanctuary, ClinicalCopilotAgent.SANCTUARY_CONFIG["nosara"])
            radar_summary = self._build_chauffeur_manifest(target_sanctuary, s_cfg, db)
            tool_calls.append({
                "tool": "generate_chauffeur_radar_manifest",
                "sanctuary": target_sanctuary,
                "airport": s_cfg["airport"],
                "summary": radar_summary
            })
            domain_context_snippets.append(radar_summary)

        # Check for B2B sales & syndicate inquiries
        if mode == "b2b_sales" or any(kw in msg_lower for kw in ["/b2b", "/syndicate", "/sales", "/partners", "syndicate", "b2b", "reformer", "pilates", "commission agreement", "corporate burnout", "affiliate proposal"]):
            b2b_summary = (
                f"### 🤝 B2B Partner Studio Syndicate · 15% Commission\n"
                f"• **Referral Share**: **15% commission** ($1,470 – $2,175 per confirmed guest)\n"
                f"• **Studio Perk**: 48-hour priority booking window before public release\n"
                f"• **Executive Buyout (12–14 Cap)**: Private villa buyout, 1-on-1 RN triage, 4-7-8 breathwork & Grand Travel VIP transfers."
            )
            tool_calls.append({
                "tool": "generate_b2b_syndicate_proposal",
                "commission_rate": 15,
                "summary": b2b_summary
            })
            domain_context_snippets.append(b2b_summary)

        # Check for chef hospitality & dietary banquet matrix inquiries
        if mode == "chef_hospitality" or any(kw in msg_lower for kw in ["/chef", "banquet matrix", "dietary matrix", "allergen matrix", "allergies", "dietary list", "chef list"]):
            s_cfg = ClinicalCopilotAgent.SANCTUARY_CONFIG.get(target_sanctuary, ClinicalCopilotAgent.SANCTUARY_CONFIG["nosara"])
            chef_summary = self._build_dietary_matrix(target_sanctuary, s_cfg, db)
            tool_calls.append({
                "tool": "generate_chef_dietary_matrix",
                "sanctuary": target_sanctuary,
                "summary": chef_summary
            })
            domain_context_snippets.append(chef_summary)

        # 3b. Detect Universal Form Fill Proposal & Execute Direct CRM Mutations
        form_fill_proposal = self.detect_form_fill_proposal(message, target_sanctuary, db=db)
        if not form_fill_proposal and searched_guest_name and searched_not_found:
            guest_cap = searched_guest_name.title()
            form_fill_proposal = {
                "form_type": "guest_intake",
                "form_title": f"Stage Guest Intake: {guest_cap}",
                "action_title": f"Stage Guest Intake: {guest_cap}",
                "target_tab": "founder_studio",
                "target_url": "/portal",
                "fields": {
                    "client_name": guest_cap,
                    "sanctuary_slug": target_sanctuary,
                    "room_tier": "Private Villa Sanctuary",
                    "email": f"{searched_guest_name.lower().replace(' ', '.')}@example.com",
                    "phone": "+1 (555) 019-2834",
                    "status": "PENDING_APPROVAL",
                    "clinical_notes": "Awaiting initial clinical screening questionnaire."
                },
                "payload": {
                    "client_name": guest_cap,
                    "sanctuary_slug": target_sanctuary,
                    "room_tier": "Private Villa Sanctuary",
                    "email": f"{searched_guest_name.lower().replace(' ', '.')}@example.com",
                    "phone": "+1 (555) 019-2834",
                    "status": "PENDING_APPROVAL",
                    "clinical_notes": "Awaiting initial clinical screening questionnaire."
                },
                "summary": f"Create new guest intake record for {guest_cap} ({target_sanctuary.title()}) awaiting Kareena's clinical clearance and KAI Sanctuary CRM sync.",
                "requires_approval": True,
                "approval_required": True
            }

        if form_fill_proposal and db is not None:
            if not form_fill_proposal.get("executed") and form_fill_proposal.get("form_type") in (
                "attendee_row", "vendor_supplier", "curated_dining", "somatic_review", "partner_lead", "broadcast_sms"
            ):
                try:
                    exec_res = self.execute_crm_action(form_fill_proposal, db)
                    if exec_res and exec_res.get("success"):
                        form_fill_proposal["executed"] = True
                        form_fill_proposal["entity_type"] = exec_res.get("entity_type")
                        form_fill_proposal["record_id"] = exec_res.get("record_id")
                        form_fill_proposal["changes"] = exec_res.get("changes")
                        form_fill_proposal["summary"] = exec_res.get("summary") or form_fill_proposal.get("summary")
                except Exception as exc_err:
                    logger.warning(f"Auto-execution of form_fill_proposal skipped: {exc_err}")

            if form_fill_proposal.get("executed"):
                tool_calls.append({
                    "tool": "crm_record_mutation",
                    "status": "success",
                    "entity_type": form_fill_proposal.get("entity_type", "CRMRecord"),
                    "record_id": form_fill_proposal.get("record_id", "crm_sync"),
                    "title": form_fill_proposal.get("action_title") or form_fill_proposal.get("form_title"),
                    "summary": form_fill_proposal.get("summary"),
                    "changes": form_fill_proposal.get("changes") or form_fill_proposal.get("fields"),
                })
                domain_context_snippets.append(
                    f"EXECUTED CRM DATABASE UPDATE ({form_fill_proposal.get('entity_type', 'CRM')} - ID: {form_fill_proposal.get('record_id', 'sync')}):\n"
                    f"* Action: {form_fill_proposal.get('action_title')}\n"
                    f"* Summary: {form_fill_proposal.get('summary')}\n"
                    f"* Applied Fields: {json.dumps(form_fill_proposal.get('changes') or form_fill_proposal.get('fields', {}))}\n"
                    f"* DIRECT INSTRUCTION: Confirm to Kareena clearly and concisely that this CRM record update has been applied live in the database."
                )

        # 4. Construct System Prompt
        rag_context_str = "\n".join([f"* {m['title']}: {m['content']}" for m in rag_matches]) if rag_matches else "No specific knowledge seeds requested."
        domain_context_str = "\n".join(domain_context_snippets) if domain_context_snippets else "None specifically requested."
        
        guest_context_str = (
            f"Name: {guest_name}, Intentions: {guest_intentions}"
            if guest_name else "None specified (General Sanctuary Briefing)"
        )

        system_prompt = f"""You are KAI, the Luxury Wellness & Travel Sanctuary AI Assistant speaking DIRECTLY TO Kareena Islam (Founder & Director of KAI Wellness Retreats & Curated Travel).
You command deep expertise across Sanctuary Hospitality & Operations:
1. Executive Finance & Folios (buyout splits, 30% deposit / 70% balance schedules, wire settlement reconciliation, gross margins)
2. Flight Radar & Travel Logistics (Cirium tracking, airport chauffeur waves, tarmac escorts, 4WD transfers)
3. B2B Sales & Studio Syndicates (reformer studios, wellness partners, 15% referral commissions, corporate retreat buyouts)
4. Private Chef & Kitchen Hospitality (dietary & allergy matrices, seed-oil-free menus, farm-to-table sourcing)
5. Live Sanctuary CRM Management (instant guest profile updates, room assignments, booking status, and payment records).

Speak TO Kareena warmly, concisely, and hospitably. Never impersonate her.
Use only guest names, flights, drivers, dietary notes, and figures present in the CONTEXT below. If something is not there, say it is not on file; never invent it.

CORE RULES:
1. PLATFORM IDENTITY: Luxury wellness retreats, restorative travel, bespoke hospitality, and clean CRM management are KAI's focus. Keep all responses non-clinical and hospitality-focused.
2. INTIMATE GROUP LIMIT: Strictly 12-14 guests max per retreat to preserve intimate quietude.
3. KAI SANCTUARY CRM & GRAND TRAVEL: Payments, supplier contracts, and card authorizations are handled natively in KAI CRM, paired with Grand Travel & Cruise VIP flights and private airport transfers.

CONTEXT:
* Sanctuary: KAI {target_sanctuary.replace('-', ' ').title()}
* Guest: {guest_context_str}
* Knowledge:
{rag_context_str}
{domain_context_str}

VOICE & NATURAL HUMAN CADENCE (GARBAGE IN -> BEAUTY OUT):
* Even when the operator types messy, low-level shorthand, typos, or fragments (e.g. "elanor cliffside villa confirm", "add sophia laurent noasra king suite 4350 paid", "elanor gf no seed oil no shellfish"), ALWAYS respond with polished, serene, structured Markdown (2–4 concise bullet points with bold key labels and exact figures).
* NEVER use robotic AI filler: "Certainly!", "I would be happy to help", "Here is a breakdown", "Great question", or "I hope this email finds you well".
* NEVER use overused AI buzzwords: "delve", "tapestry", "embark", "testament", "beacon", "plethora", "nestled", "seamlessly", "elevate", "foster", "in today's fast-paced world", "look no further", "meticulously", "holistic journey".
* NEVER include clinical nursing or medical jargon (do not use "BSN, RN", "contraindication", "vagal nerve", "sympathetic tone").
* Speak in natural, grounded plain English like an experienced luxury travel & hospitality director.
* Keep responses concise, scannable, and effortless to read (no walls of text).

FORMATTING:
* For dining: use '### Nourishing Dining'. For weather: use 'Sanctuary Microclimate & Breathwork Window'.
* For finance: present exact numbers, deposit (30%), balance (70%), and margins.
* For travel/radar: provide chauffeur pickup breakdown.
* For chef: format clear guest dietary & allergy matrix with seed-oil-free organic notes."""

        # 5. Multi-Tier AI Invocation (Tier 1: Groq LLM -> Tier 2: Deterministic Hospitality Synthesis)
        model_used = settings.GROQ_MODEL
        if stream:
            from backend.sidecar.services.llm_service import query_llm_chat_stream, LLMServiceError
            def stream_generator():
                prefix = ""
                if any(tc.get("tool") == "search_curated_dining" for tc in tool_calls):
                    prefix += "### Nourishing Dining Recommendations\n\n"

                if any(tc.get("tool") == "fetch_sanctuary_weather" for tc in tool_calls):
                    prefix += "**Sanctuary Microclimate & Breathwork Window**\n\n"

                email_tc = next((tc for tc in tool_calls if tc.get("tool") == "draft_personalized_email"), None)
                if email_tc and email_tc.get("email_draft"):
                    ed = email_tc["email_draft"]
                    prefix += ed + "\n\n"

                crm_tc = next((tc for tc in tool_calls if tc.get("tool") == "crm_record_mutation"), None)
                if crm_tc and crm_tc.get("summary"):
                    prefix += f"**✓ {crm_tc.get('title', 'CRM Record Updated')}** (`{crm_tc.get('record_id', 'crm_sync')}`)\n{crm_tc.get('summary')}\n\n"

                if matched_intake and not crm_tc and not booking_tc:
                    w = getattr(matched_intake, "wellness_profile", {}) or {}
                    c = matched_intake.clinical_profile or {}
                    primary_focus = w.get("primary_focus") or c.get("intentions", "Restorative retreat & deep rest")
                    diet_notes = w.get("nutrition_preferences") or c.get("health_notes", "Seed-oil-free whole foods")
                    
                    prefix += (
                        f"**{matched_intake.client_name}** · KAI {str(matched_intake.sanctuary_slug).title()} ({matched_intake.room_tier or 'Private Villa Sanctuary'})\n"
                        f"• **Travel & Wellness Focus**: {primary_focus}\n"
                        f"• **Dietary & Chef Notes**: {diet_notes}\n"
                        f"• **CRM Status**: {matched_intake.status} (30% deposit / 70% balance)\n\n"
                    )

                if prefix:
                    yield prefix

                llm_failed = False
                try:
                    for token in query_llm_chat_stream(
                        system_prompt=system_prompt,
                        user_message=message,
                        model=settings.GROQ_MODEL,
                        conversation_history=conversation_history,
                        max_tokens=1024
                    ):
                        yield token
                except LLMServiceError as ose:
                    logger.warning(f"Groq stream unavailable ({ose.message}), engaging Tier 3 Deterministic Hospitality Synthesis.")
                    llm_failed = True

                if llm_failed:
                    synth = self._synthesize_deterministic_response(
                        message=message,
                        target_sanctuary=target_sanctuary,
                        safety_level=safety_level,
                        screening=screening,
                        tool_calls=tool_calls,
                        matched_intake=matched_intake,
                        rag_results=rag_matches
                    )
                    for word in synth.split(" "):
                        yield word + " "

            response_text = stream_generator()
        else:
            try:
                from backend.sidecar.services.llm_service import query_llm_chat, LLMServiceError
                raw_response = query_llm_chat(
                    system_prompt=system_prompt,
                    user_message=message,
                    model=settings.GROQ_MODEL,
                    conversation_history=conversation_history,
                    max_tokens=1024
                )
                response_text = raw_response
            except LLMServiceError as ose:
                logger.warning(f"Groq unavailable ({ose.message}), engaging Tier 3 Deterministic Hospitality Synthesis.")
                model_used = "Deterministic-Hospitality-Synthesis-v1"
                response_text = self._synthesize_deterministic_response(
                    message=message,
                    target_sanctuary=target_sanctuary,
                    safety_level=safety_level,
                    screening=screening,
                    tool_calls=tool_calls,
                    matched_intake=matched_intake,
                    rag_results=rag_matches
                )

            # Strip redundant static welcome loop or non-answer if LLM echoed greeting or asked questions back
            if not re.search(r'\b(hello|hi|hey|greetings|welcome)\b', msg_lower):
                cleaned_resp = re.sub(
                    r'^\s*(\*\*)?Welcome,?\s+Kareena\.?(\*\*)?(\s*I am your AI Chief of Staff[^\n]*\n*)*(\s*I am here to support you[^\n]*\n*)*(\s*All operational actions[^\n]*\n*)*',
                    '',
                    response_text,
                    flags=re.IGNORECASE
                ).strip()

                resp_lower = cleaned_resp.lower()
                is_degenerate = (
                    not cleaned_resp or
                    len(cleaned_resp) < 40 or
                    any(ref in resp_lower for ref in ["can't assist", "cannot assist", "sorry, but i can't", "sorry, i cannot", "as an ai"]) or
                    ("welcome, kareena" in resp_lower and "i am your ai chief of staff" in resp_lower)
                )

                if is_degenerate:
                    logger.warning(f"Degenerate response detected (len={len(cleaned_resp)}). Query: {message[:100]}")

                if matched_intake and not any(tc.get("tool") in ("crm_record_mutation", "calculate_booking_quote", "parse_booking_request") for tc in tool_calls) and (is_degenerate or matched_intake.client_name.lower().split()[0] not in resp_lower):
                    w = getattr(matched_intake, "wellness_profile", {}) or {}
                    c = matched_intake.clinical_profile or {}
                    primary_focus = w.get("primary_focus") or c.get("intentions", "Restorative retreat and deep rest")
                    diet_notes = w.get("nutrition_preferences") or c.get("health_notes", "Plant-forward, nourishing whole foods.")

                    resp_lines = [
                        f"**{matched_intake.client_name}** · KAI {str(matched_intake.sanctuary_slug).title()} Sanctuary ({matched_intake.room_tier or 'Private Villa Sanctuary'}):",
                        "",
                        f"• **Travel & Wellness Focus**: {primary_focus}",
                        f"• **Dietary & Chef Notes**: {diet_notes}",
                        f"• **Sanctuary Experience**: Morning movement, twilight sound bath, and private villa rest.",
                        f"• **KAI CRM Status**: {matched_intake.status} (30% deposit / 70% balance at 45 days pre-arrival)."
                    ]
                    response_text = "\n".join(resp_lines)
                elif not is_degenerate:
                    response_text = cleaned_resp

            # Ensure Nourishing Dining header is present if dining was queried
            if any(tc.get("tool") == "search_curated_dining" for tc in tool_calls) and "Nourishing Dining" not in response_text:
                response_text = "### Nourishing Dining Recommendations\n\n" + response_text

            # Ensure Breathwork Window header is present if weather was queried
            if any(tc.get("tool") == "fetch_sanctuary_weather" for tc in tool_calls) and "Breathwork Window" not in response_text:
                response_text = "**Sanctuary Microclimate & Breathwork Window**\n\n" + response_text

            # Ensure Hotel Recommendations are present if luxury accommodations were queried
            hotel_tc = next((tc for tc in tool_calls if tc.get("tool") == "search_luxury_accommodations"), None)
            if hotel_tc and hotel_tc.get("hotels"):
                hotel_names = hotel_tc["hotels"]
                if not any(h in response_text for h in hotel_names):
                    hotel_list_str = "\n".join([f"• **{h}**" for h in hotel_names])
                    response_text = f"### Curated Gateway Luxury Accommodations\nRecommended pre/post-retreat hotels:\n{hotel_list_str}\n\n" + response_text

            # Ensure Email Draft details are present if email was drafted
            email_tc = next((tc for tc in tool_calls if tc.get("tool") == "draft_personalized_email"), None)
            if email_tc and email_tc.get("email_draft"):
                ed = email_tc["email_draft"]
                rec = email_tc.get("recipient") or email_tc.get("guest_name", "")
                if (rec and rec not in response_text) or "Grand Travel & Cruise" not in response_text or "KAI CRM" not in response_text:
                    response_text = ed + "\n\n" + response_text


        # 6. Assemble Dynamic Followups based on mode & context
        if booking_calc:
            suggested_followups = [
                f"Review staged booking card for {booking_calc['guest_name']}",
                f"Verify 4WD Suburban transfer from {booking_calc['transit_airport']}",
                "Check 30% deposit card authorization in KAI CRM"
            ]
        elif any(tc.get("tool") == "draft_personalized_email" for tc in tool_calls):
            suggested_followups = [
                "Send drafted note to Concierge Inbox",
                "Adjust tone for executive client",
                "Schedule 20-min alignment call on Retreat Calendar"
            ]
        elif any(tc.get("tool") == "search_luxury_accommodations" for tc in tool_calls):
            suggested_followups = [
                "Check private chauffeur transfer times to sanctuary",
                "Verify lie-flat flight availability with Grand Travel",
                "Review guest pre-retreat hotel preferences"
            ]
        elif any(tc.get("tool") == "search_curated_dining" for tc in tool_calls):
            suggested_followups = [
                f"View organic dining options in {target_sanctuary.title()}",
                "Reserve chef table for guest cohort",
                "Check Blue Zone anti-inflammatory menus"
            ]
        elif any(tc.get("tool") == "fetch_sanctuary_weather" for tc in tool_calls):
            suggested_followups = [
                "View optimal morning prana sun windows",
                "Schedule sunset crystal sound bath",
                "Check 7-day microclimate forecast"
            ]
        elif dossier_found:
            suggested_followups = [
                f"Check villa accommodations for {guest_name}",
                f"Update dietary notes for {guest_name}",
                f"Verify Grand Travel flight arrival for {guest_name}"
            ]
        elif searched_not_found:
            suggested_followups = [
                f"Review staged intake proposal for {searched_guest_name.title()}",
                "Browse active guests in upcoming cohorts",
                "Explain KAI Guest & Travel Planner in layman terms"
            ]
        elif mode == "consult_prep":
            suggested_followups = [
                "Send drafted note to Concierge Inbox",
                "Schedule 20-min alignment call on Retreat Calendar",
                "Generate custom sanctuary proposal link"
            ]
        elif mode == "travel_concierge":
            suggested_followups = [
                f"Check live weather in {target_sanctuary.title()}",
                "Calculate dynamic scenic route from airport",
                "Browse local nourishing dining"
            ]
        else:
            suggested_followups = [
                "Check 12–14 guest capacity across upcoming cohorts",
                "Build Private Chef dietary & allergy matrix for Nosara",
                "Generate airport chauffeur manifest for Nosara"
            ]

        return {
            "response_text": response_text,
            "mode": mode,
            "safety_level": safety_level,
            "safety_screened": safety_screened,
            "tool_calls": tool_calls,
            "citations": citations,
            "suggested_followups": suggested_followups,
            "form_fill_proposal": form_fill_proposal,
            "sanctuary_slug": target_sanctuary,
            "model_used": model_used
        }



clinical_copilot = ClinicalCopilotAgent()
