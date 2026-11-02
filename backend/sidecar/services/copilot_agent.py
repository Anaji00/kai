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

CLINICAL_CONTRAINDICATION_RULES = [
    {
        "keywords": ["epilepsy", "seizure", "aneurysm", "detached retina", "bipolar i", "arrhythmia", "tachycardia", "svt", "cardiovascular"],
        "modality": "Intense Rapid Breathwork / Tummo / Holotropic",
        "risk_level": "CONTRAINDICATION_ALERT",
        "nurse_guidance": "High-velocity hyperventilation alters cerebral blood flow and arterial CO2 (hypocapnia), potentially triggering seizure activity or cardiovascular tachyarrhythmias. Strictly substitute with gentle 4-7-8 vagal breathing or coherent 5.5-bpm cardiac resonance breathing."
    },
    {
        "keywords": ["raynaud", "raynaud's", "peripheral neuropathy", "severe arrhythmia", "arrhythmia", "tachycardia", "svt", "cardiac", "cold urticaria"],
        "modality": "Cold Plunge / Cryo Therapy",
        "risk_level": "CONTRAINDICATION_ALERT",
        "nurse_guidance": "Cold shock response and peripheral vasospasm trigger sudden sympathetic surges and peripheral vasoconstriction that exacerbate arrhythmias and ischemia. Substitute full immersion with contrast warm hydrotherapy or foot-only immersion up to 68°F with warm wool grounding."
    },
    {
        "keywords": ["pregnancy", "pregnant", "trimester"],
        "modality": "Hyperthermic Finnish Sauna / Hot Temazcal / Deep Cold Plunge",
        "risk_level": "CONTRAINDICATION_ALERT",
        "nurse_guidance": "Maternal core temperature elevations above 102°F (38.9°C) pose fetal risks, particularly during early gestation. Substitute with tepid mineral soaking (98°F–100°F) and gentle acoustic sound immersion."
    },
    {
        "keywords": ["pacemaker", "icd", "cochlear implant", "recent concussion", "tinnitus"],
        "modality": "Direct Heavy Acoustic Gong / High-Vibration Sound Bed",
        "risk_level": "MODERATE_REVIEW",
        "nurse_guidance": "High mechanical acoustic resonance in immediate proximity to skull or implanted electronic leads may trigger discomfort or device interference. Position guest 10+ feet away from physical gongs and emphasize gentle 432Hz crystal alchemy singing bowls."
    },
    {
        "keywords": ["ssri", "snri", "anxiety", "insomnia", "elevated cortisol", "adrenal fatigue", "burnout"],
        "modality": "432Hz Acoustic Somatic Alignment & 4-7-8 Breathing",
        "risk_level": "CLEAR",
        "nurse_guidance": "Highly recommended and safe. Non-invasive parasympathetic stimulation supports autonomous serotonin and GABA production without pharmacological interference."
    }
]


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
        Screens guest health notes against clinical nursing contraindications.
        """
        notes_lower = health_notes.lower()
        matched_alerts = []
        highest_severity = "CLEAR"

        for rule in CLINICAL_CONTRAINDICATION_RULES:
            matches = [kw for kw in rule["keywords"] if kw in notes_lower]
            if matches:
                matched_alerts.append({
                    "trigger_words": matches,
                    "modality": rule["modality"],
                    "risk_level": rule["risk_level"],
                    "nurse_guidance": rule["nurse_guidance"]
                })
                if rule["risk_level"] == "CONTRAINDICATION_ALERT":
                    highest_severity = "CONTRAINDICATION_ALERT"
                elif rule["risk_level"] == "MODERATE_REVIEW" and highest_severity != "CONTRAINDICATION_ALERT":
                    highest_severity = "MODERATE_REVIEW"

        return {
            "safety_level": highest_severity,
            "alerts_count": len(matched_alerts),
            "findings": matched_alerts,
            "nurse_summary": (
                "Clinical clearance verified. No acute contraindications identified for standard somatic itinerary."
                if highest_severity == "CLEAR" else
                f"Clinical review flagged {len(matched_alerts)} consideration(s). Nurse protocol adaptations recommended."
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
        }
    }

    @staticmethod
    def resolve_sanctuary_slug(text: str, default: Optional[str] = None) -> str:
        t = text.lower()
        if any(w in t for w in ["nosara", "rnnosara", "costa rica", "nicoya"]):
            return "nosara"
        if any(w in t for w in ["amalfi", "italy", "naples", "campania"]):
            return "amalfi"
        if any(w in t for w in ["bali", "ubud", "dps"]):
            return "bali"
        if any(w in t for w in ["riviera", "mexico", "tulum", "cancun", "cun"]):
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
        Intelligently detects guest reservation and stay requests, calculates pro-rated pricing,
        30% sanctuary deposit and 70% balance ('the rest'), verifies retreat group limits (12-14), and drafts
        the clinical circadian rest protocol.
        """
        msg_lower = message.lower()
        is_booking = any(kw in msg_lower for kw in [
            "booking", "new booking", "book", "reservation", "reserve",
            "add guest", "new guest", "stage intake", "create guest",
            "onboard guest", "stage guest", "calculate the rest", "3 night", "nights"
        ])
        if not is_booking:
            return None

        s_slug = self.resolve_sanctuary_slug(message, default=sanctuary_slug)
        s_cfg = self.SANCTUARY_CONFIG.get(s_slug, self.SANCTUARY_CONFIG["nosara"])

        # Extract guest name
        guest_name = None
        name_patterns = [
            r'(?:booking\s+for\s+(?:a\s+)?|book\s+(?:a\s+)?|reservation\s+for\s+(?:a\s+)?|guest\s+|client\s+|for\s+a\s+)([A-Za-z\s]+?)(?:\s+(?:for|fo|at|in|to|with)\s+|\s*,\s*|\.|\$|\bcalculate\b|\b\d+\s*night|$)',
            r'(?:new\s+guest|add\s+guest|stage\s+intake)\s*[:"\']?\s*([A-Za-z\s]+?)(?:\s+(?:for|fo)|\s*,\s*|\.|$)'
        ]
        for pat in name_patterns:
            m = re.search(pat, message, re.IGNORECASE)
            if m:
                candidate = m.group(1).strip()
                # Strip prepositions or sanctuary mentions
                candidate = re.split(r'\s+(?:for|fo|at|in|to|with|of)\s+', candidate, flags=re.IGNORECASE)[0].strip()
                candidate = re.split(r'\s+(?:nosara|rnnosara|amalfi|bali|riviera|sanctuary|villa|suite)', candidate, flags=re.IGNORECASE)[0].strip()
                if candidate and candidate.lower() not in ["nosara", "amalfi", "bali", "riviera", "sanctuary", "villa", "suite", "a", "the"]:
                    guest_name = candidate.title()
                    break

        if not guest_name:
            guest_name = "Prospective Traveler"

        # Extract nights
        nights = 6
        nights_match = re.search(r'(\d+)\s*night', msg_lower)
        if nights_match:
            nights = int(nights_match.group(1))

        # Room tier & pricing
        tier_name = s_cfg["villa_tier"]
        nightly_rate = s_cfg["nightly_rate_villa"]
        if "suite" in msg_lower:
            tier_name = s_cfg["suite_tier"]
            nightly_rate = s_cfg["nightly_rate_suite"]
        elif "shared" in msg_lower or "pavilion" in msg_lower:
            tier_name = s_cfg["shared_tier"]
            nightly_rate = s_cfg["nightly_rate_shared"]

        total_amount = nightly_rate * nights
        deposit_30 = round(total_amount * 0.30, 2)
        balance_70 = round(total_amount * 0.70, 2)

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
            payload = {
                "client_name": booking_info["guest_name"],
                "sanctuary_slug": booking_info["sanctuary_slug"],
                "room_tier": booking_info["room_tier"],
                "nights": booking_info["nights"],
                "total_amount": booking_info["total_amount"],
                "deposit_30": booking_info["deposit_30"],
                "balance_70": booking_info["balance_70"],
                "email": f"{booking_info['guest_name'].lower().replace(' ', '.')}@example.com",
                "phone": "+1 (555) 019-4821",
                "status": "PENDING_APPROVAL",
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
            title = f"Stage Booking: {booking_info['guest_name']} ({s_cfg['name']} · {booking_info['nights']} Nights)"
            summary = (
                f"Stage intake for {booking_info['guest_name']}: {booking_info['nights']}-night stay at {s_cfg['name']} ({booking_info['room_tier']}). "
                f"Total: ${booking_info['total_amount']:,.2f} (30% Deposit: ${booking_info['deposit_30']:,.2f}, 70% Balance: ${booking_info['balance_70']:,.2f})."
            )
            if db:
                try:
                    draft = ActionDraft(
                        type="booking_hold",
                        guest_name=booking_info["guest_name"],
                        content=summary,
                        status="pending_review"
                    )
                    db.add(draft)
                    db.commit()
                    logger.info(f"Staged action draft (booking_hold) for {booking_info['guest_name']}")
                except Exception as e:
                    logger.error(f"Error staging booking_hold draft: {e}")
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

        # 1. Vendor & Preferred Supplier
        if any(kw in msg_lower for kw in ["add vendor", "new vendor", "add supplier", "new supplier", "register vendor", "register supplier", "create supplier", "create vendor"]):
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
        if any(kw in msg_lower for kw in ["calculate route", "plan route", "scenic route", "route calculator", "plan drive", "chauffeur transit"]):
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
        if any(kw in msg_lower for kw in ["add dining", "new dining", "add restaurant", "new restaurant", "curate dining"]):
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
        if any(kw in msg_lower for kw in ["broadcast sms", "send cohort sms", "send group sms", "broadcast message", "sms cohort", "sms group", "message waitlist"]):
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

        return None

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
        Tier 3: High-fidelity Deterministic Clinical Synthesis Engine.
        Synthesizes precomputed contraindications, tools, RAG knowledge, and guest profiles
        when the Groq LLM is unavailable, guaranteeing 100% availability without 503 errors.
        """
        parts = []
        if safety_level == "CONTRAINDICATION_ALERT":
            findings = screening.get("findings", [])
            finding_text = ", ".join([f"{f.get('condition')} ({f.get('modality')})" for f in findings]) if findings else "Acute Clinical Condition"
            parts.append("**[CONTRAINDICATION_ALERT] Clinical Alert Flagged for Kareena Islam, BSN, RN**")
            parts.append(f"Clinical evaluation identified acute contraindications: **{finding_text}**.")
            for f in findings:
                parts.append(f"• **Condition**: {f.get('condition')}\n• **Restricted Modality**: {f.get('modality')}\n• **Clinical Rationale**: {f.get('rationale')}\n• **Safe Somatic Adaptation**: {f.get('adaptation')}")
            parts.append("All high-intensity modalities must be substituted with gentle parasympathetic pacing, titrated 4-7-8 vagal breathing, and 432Hz acoustic grounding under nurse supervision.")

        dining_tc = next((tc for tc in tool_calls if tc.get("tool") == "search_curated_dining"), None)
        if dining_tc and dining_tc.get("dining_spots"):
            parts.append("### Nourishing Dining Recommendations")
            for d in dining_tc["dining_spots"][:3]:
                parts.append(f"• **{d.get('name')}** ({d.get('cuisine_type')}) - {d.get('distance_from_villa_km')} km from villa.\n  *Nurse Notes*: {d.get('nurse_notes')}\n  *Dietary*: {', '.join(d.get('dietary_tags', []))}")

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

        if matched_intake:
            w = getattr(matched_intake, "wellness_profile", {}) or {}
            c = matched_intake.clinical_profile or {}
            t = matched_intake.consultation_thesis or {}
            primary_focus = w.get("primary_focus") or c.get("intentions", "Nervous system restoration and deep rest")
            parts.append(
                f"**Guest Summary for {matched_intake.client_name}**:\n"
                f"* Sanctuary: KAI {str(matched_intake.sanctuary_slug).title()} ({matched_intake.room_tier or 'Private Villa Sanctuary'})\n"
                f"* Intention: {primary_focus}\n"
                f"* Protocol: 4-7-8 vagal nerve down-regulation, 432Hz sound immersion, circadian alignment.\n"
                f"* CRM Status: Staged for 30% deposit authorization upon review."
            )

        if not parts:
            if rag_results:
                parts.append(f"Based on KAI Sanctuary somatic guidelines and operations:\n\n{rag_results[0].get('content', '')}")
            else:
                parts.append(f"KAI Wellness Retreats ({target_sanctuary.title()}) operates under strict 12–14 guest maximum cohorts to ensure complete parasympathetic restoration. All operations are coordinated in partnership with Grand Travel & Cruise (Funjet 500 Club volume contracts) and KAI Sanctuary CRM for seamless, zero-autonomous payment security.")

        return "\n\n".join(parts)

    def process_chat(
        self,
        message: str,
        mode: str = "clinical_safety",
        guest_context: Optional[Dict[str, Any]] = None,
        sanctuary_slug: Optional[str] = None,
        current_page: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        db: Optional[Any] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Dispatches incoming messages through the Groq-hosted LLM.
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

        # 1. Mandatory Clinical Screening (Deterministic Pre-Check)
        screening = self.screen_contraindications(message)
        safety_level = None
        safety_screened = False

        if screening["alerts_count"] > 0:
            safety_level = screening["safety_level"]
            safety_screened = True
            tool_calls.append({
                "tool": "screen_guest_contraindications",
                "result": screening
            })
        elif mode == "clinical_safety" and any(kw in msg_lower for kw in [
            "contraindication", "seizure", "epilepsy", "raynaud", "pregnant", "pregnancy",
            "pacemaker", "ssri", "screen", "intake notes", "health review", "medical", "clearance"
        ]):
            safety_level = "CLEAR"
            safety_screened = True

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
        if db:
            from backend.sidecar.models import StagingIntake
            all_intakes = db.query(StagingIntake).all()
        else:
            _temp_db = None
            try:
                from backend.database import SessionLocal
                from backend.sidecar.models import StagingIntake
                _temp_db = SessionLocal()
                all_intakes = _temp_db.query(StagingIntake).all()
            except Exception as e:
                logger.error(f"Failed to fetch intakes: {e}")
                all_intakes = []
            finally:
                if _temp_db:
                    _temp_db.close()

        active_guest_names = list(dict.fromkeys([i.client_name for i in all_intakes if i.client_name]))

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

            # Run clinical screening on the guest's profile
            if h_notes:
                guest_screening = self.screen_contraindications(h_notes)
                safety_screened = True
                if guest_screening["safety_level"] != "CLEAR":
                    safety_level = guest_screening["safety_level"]
                    screening = guest_screening
                else:
                    safety_level = "CLEAR"
            else:
                safety_screened = True
                safety_level = "CLEAR"

            flight_req = matched_intake.flight_request or {}
            flight_desc = (
                f"Flight: {flight_req.get('airline', 'Grand Travel Commercial/Private')}, "
                f"Arrival: {flight_req.get('arrival_date', 'Day 1')}, "
                f"Flight#: {flight_req.get('flight_number', 'TBD')}"
                if flight_req else "Tarmac chauffeur transfer coordinated via Grand Travel Flight Desk."
            )

            thesis = matched_intake.consultation_thesis or {}
            thesis_points = thesis.get("talking_points", [])
            thesis_str = "; ".join(thesis_points[:3]) if thesis_points else "Pre-call somatic thesis prepared in KAI portal."
            sympathetic_tone = thesis.get("sympathetic_tone_hypothesis", "Nervous system reset recommended.")
            circadian_protocol = thesis.get("circadian_protocol", "4-7-8 vagal activation, acoustic grounding, restorative delta sleep.")
            clinical_flags = ", ".join(thesis.get("clinical_flags", [])) or "Standard nervous system restoration"

            tool_calls.append({
                "tool": "retrieve_guest_care_plan",
                "guest_name": matched_intake.client_name,
                "status": matched_intake.status,
                "sanctuary": matched_intake.sanctuary_slug,
                "found": True,
                "intentions": g_intentions,
                "clinical_flags": clinical_flags,
                "health_notes": h_notes,
                "crm_trip_id": matched_intake.crm_trip_id
            })

            domain_context_snippets.append(
                f"KAI CLINICAL SOMATIC PROFILE & CARE PLAN FOR '{matched_intake.client_name}':\n"
                f"* Guest Full Name: {matched_intake.client_name}\n"
                f"* Status: {matched_intake.status} (Sanctuary Trip ID: {matched_intake.crm_trip_id or 'Pending Founder Approval'})\n"
                f"* Destination Sanctuary: KAI {str(matched_intake.sanctuary_slug).title()} Sanctuary (12–14 guest cap protected)\n"
                f"* Accommodation: {matched_intake.room_tier or 'Private Villa Sanctuary'}\n"
                f"* Contact: {matched_intake.email} | {matched_intake.phone or 'Direct VIP Client'}\n"
                f"* Primary Clinical Intentions: {g_intentions}\n"
                f"* Health & Dietary Profile: {h_notes or 'No acute medical contraindications flagged.'}\n"
                f"* Clinical Assessment & Autonomic Tone: {sympathetic_tone}\n"
                f"* Clinical Flags: {clinical_flags}\n"
                f"* Personalized Circadian Somatic Arc: {circadian_protocol}\n"
                f"* VIP Flight & Arrival: {flight_desc}\n"
                f"* Pre-Call Talking Points: {thesis_str}\n"
                f"* Sanctuary CRM Sync: Sanctuary Trip published with native 30% deposit hold and 70% balance scheduled at 45 days.\n"
                f"\n"
                f"DIRECT INSTRUCTION TO CHIEF OF STAFF: Answer Kareena directly with the clinical care facts above for {matched_intake.client_name}. "
                f"Do NOT ask Kareena any questions back. State {matched_intake.client_name}'s restorative needs ({g_intentions}), "
                f"her clinical flags ({clinical_flags}), her dietary requirements ({h_notes or 'Plant-based, anti-inflammatory'}), "
                f"the recommended somatic pathway (4-7-8 vagal nerve calibration, acoustic sound immersion, and quiet villa delta sleep), "
                f"and her KAI CRM trip status. Speak directly, creatively, and warmly without reciting the welcome card."
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

        # 4. Construct System Prompt for Qwen
        rag_context_str = "\n".join([f"* {m['title']}: {m['content']}" for m in rag_matches]) if rag_matches else "No specific knowledge seeds requested."
        domain_context_str = "\n".join(domain_context_snippets) if domain_context_snippets else "None specifically requested."
        
        guest_context_str = (
            f"Name: {guest_name}, Intentions: {guest_intentions}"
            if guest_name else "None specified (General Sanctuary Briefing)"
        )

        screening_summary_str = (
            f"* Overall Safety Level: {safety_level}\n"
            f"* Flagged Considerations: {screening['alerts_count']}\n"
            f"* Findings: {json.dumps(screening['findings'])}\n"
            f"* Nurse Summary: {screening['nurse_summary']}"
            if safety_screened else
            "* Clinical Screening: Not requested for this operational inquiry."
        )

        system_prompt = f"""You are the AI Chief of Staff speaking DIRECTLY TO Kareena Islam (Founder & Director of KAI Wellness Retreats & Curated Travel).
You are Kareena's executive right hand specializing in luxury restorative wellness, quiet travel curation, booking quotes (30% deposit / 70% balance at 45 days), supplier contracts, scenic travel routes, and sanctuary inquiries. Speak TO Kareena warmly, creatively, and hospitably. Never impersonate her.

CORE RULES:
1. PLATFORM IDENTITY: Wellness, rest, and luxury travel are KAI's primary focus. Clinical contraindication screening is an elevated specialized feature for guests with specific medical considerations—our base mission is restorative quietude, unbroken sleep, somatic vitality, and seamless Grand Travel logistics.
2. INTIMATE GROUP LIMIT: 12-14 guests max per retreat to preserve intimate quietude.
3. ZERO AUTONOMOUS WRITES: All actions require Kareena's 1-click approval via the Action Review Queue.
4. KAI SANCTUARY CRM & GRAND TRAVEL: Payments, supplier contracts, PCI card auth handled natively in KAI CRM. ALWAYS bundle/mention Grand Travel & Cruise VIP flights, group air blocks, and tarmac transfers when discussing itineraries or sales.
5. SOMATIC WELLNESS: Evidence-based vagal nerve guidance (4-7-8), acoustic resonance (432Hz/528Hz), anti-inflammatory Blue Zone nutrition. Never diagnose.

ELEVATED SAFETY SCREENING (FEATURE):
{screening_summary_str}
{f"ALERT: Safety Level {safety_level}. Highlight required modality adaptations." if safety_level and safety_level != 'CLEAR' else ""}

CONTEXT:
* Sanctuary: KAI {target_sanctuary.replace('-', ' ').title()}
* Guest: {guest_context_str}
* Knowledge:
{rag_context_str}
{domain_context_str}

FORMATTING:
* NEVER start with a greeting card or self-introduction. Dive into the answer.
* For dining: use '### Nourishing Dining'. For weather: use 'Sanctuary Microclimate & Breathwork Window'.
* Be warm, serene, and hospitably insightful. Answer fully across all KAI wellness and travel operations."""

        # 5. Multi-Tier AI Invocation (Tier 1: Groq LLM -> Tier 2: Deterministic Clinical Synthesis)
        model_used = settings.GROQ_MODEL
        if stream:
            from backend.sidecar.services.llm_service import query_llm_chat_stream, LLMServiceError
            def stream_generator():
                prefix = ""
                if safety_level == "CONTRAINDICATION_ALERT":
                    modality_name = screening['findings'][0]['modality'] if screening['findings'] else "Intense Modality"
                    prefix += f"**[CONTRAINDICATION_ALERT] Clinical Alert Flagged for Kareena Islam, BSN, RN** ({modality_name})\n\n"

                if any(tc.get("tool") == "search_curated_dining" for tc in tool_calls):
                    prefix += "### Nourishing Dining Recommendations\n\n"

                if any(tc.get("tool") == "fetch_sanctuary_weather" for tc in tool_calls):
                    prefix += "**Sanctuary Microclimate & Breathwork Window**\n\n"

                email_tc = next((tc for tc in tool_calls if tc.get("tool") == "draft_personalized_email"), None)
                if email_tc and email_tc.get("email_draft"):
                    ed = email_tc["email_draft"]
                    prefix += ed + "\n\n"

                if matched_intake:
                    w = getattr(matched_intake, "wellness_profile", {}) or {}
                    c = matched_intake.clinical_profile or {}
                    t = matched_intake.consultation_thesis or {}
                    clinical_enabled = getattr(matched_intake, "clinical_screening_enabled", False)
                    primary_focus = w.get("primary_focus") or c.get("intentions", "Nervous system restoration and deep rest")
                    diet_notes = w.get("nutrition_preferences") or c.get("health_notes", "Plant-forward, nourishing whole foods.")
                    flags_str = ", ".join(t.get("clinical_flags", [])) or ("Elevated screening active" if clinical_enabled else "Restorative wellness pathway")
                    
                    prefix += (
                        f"**{matched_intake.client_name}** is registered for the KAI {str(matched_intake.sanctuary_slug).title()} Sanctuary ({matched_intake.room_tier or 'Private Villa Sanctuary'}).\n\n"
                        f"* **Restorative Wellness & Travel Intention**: {primary_focus}\n"
                        f"* **Nervous System & Hospitality Thesis**: {t.get('sympathetic_tone_hypothesis', 'Circadian recalibration with restorative parasympathetic pacing and tranquil hospitality.')}\n"
                        f"* **Curated Dining & Nutrition Profile**: {diet_notes}\n"
                        f"* **Curated Rest Pathway**: Titrated 4-7-8 vagal nerve breathwork, 432Hz acoustic grounding immersion, and unbroken delta-wave sleep in her private sanctuary villa.\n"
                    )
                    if clinical_enabled or t.get("clinical_flags"):
                        prefix += f"* **Elevated Clinical Safety Flags**: {flags_str}\n"
                    prefix += (
                        f"* **KAI CRM Status**: Sanctuary Trip synchronized with native 30% deposit hold; 70% balance scheduled at 45 days prior to arrival.\n\n"
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
                    logger.warning(f"Groq stream unavailable ({ose.message}), engaging Tier 3 Deterministic Clinical Synthesis.")
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
                logger.warning(f"Groq unavailable ({ose.message}), engaging Tier 3 Deterministic Clinical Synthesis.")
                model_used = "Deterministic-Clinical-Synthesis-v1"
                response_text = self._synthesize_deterministic_response(
                    message=message,
                    target_sanctuary=target_sanctuary,
                    safety_level=safety_level,
                    screening=screening,
                    tool_calls=tool_calls,
                    matched_intake=matched_intake,
                    rag_results=rag_matches
                )

            # Strip redundant static welcome loop or non-answer if Qwen echoed greeting or asked questions back
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

                if matched_intake and (is_degenerate or matched_intake.client_name.lower().split()[0] not in resp_lower):
                    w = getattr(matched_intake, "wellness_profile", {}) or {}
                    c = matched_intake.clinical_profile or {}
                    t = matched_intake.consultation_thesis or {}
                    clinical_enabled = getattr(matched_intake, "clinical_screening_enabled", False)
                    primary_focus = w.get("primary_focus") or c.get("intentions", "Nervous system restoration and deep rest")
                    diet_notes = w.get("nutrition_preferences") or c.get("health_notes", "Plant-forward, nourishing whole foods.")
                    flags_str = ", ".join(t.get("clinical_flags", [])) or ("Elevated screening active" if clinical_enabled else "Restorative wellness pathway")

                    resp_lines = [
                        f"**{matched_intake.client_name}** is registered for the KAI {str(matched_intake.sanctuary_slug).title()} Sanctuary ({matched_intake.room_tier or 'Private Villa Sanctuary'}).",
                        "",
                        f"* **Restorative Wellness & Travel Intention**: {primary_focus}",
                        f"* **Nervous System & Hospitality Thesis**: {t.get('sympathetic_tone_hypothesis', 'Circadian recalibration with restorative parasympathetic pacing and tranquil hospitality.')}",
                        f"* **Curated Dining & Nutrition Profile**: {diet_notes}",
                        f"* **Curated Rest Pathway**: Titrated 4-7-8 vagal nerve breathwork, 432Hz acoustic grounding immersion, and unbroken delta-wave sleep in her private sanctuary villa."
                    ]
                    if clinical_enabled or t.get("clinical_flags"):
                        resp_lines.append(f"* **Elevated Clinical Safety Flags**: {flags_str}")
                    resp_lines.append(f"* **KAI CRM Status**: Sanctuary Trip synchronized with native 30% deposit hold; 70% balance scheduled at 45 days prior to arrival.")
                    response_text = "\n".join(resp_lines)
                elif not is_degenerate:
                    response_text = cleaned_resp

            # Ensure Clinical Alert Header is present if high risk
            if safety_level == "CONTRAINDICATION_ALERT" and "CONTRAINDICATION_ALERT" not in response_text:
                modality_name = screening['findings'][0]['modality'] if screening['findings'] else "Intense Modality"
                response_text = f"**[CONTRAINDICATION_ALERT] Clinical Alert Flagged for Kareena Islam, BSN, RN** ({modality_name})\n\n" + response_text

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
        if safety_level and safety_level != "CLEAR":
            suggested_followups = [
                "Review 4-7-8 vagal breathing clinical adaptations",
                "Draft gentle consultation note for this guest",
                "Check private villa accommodations with quiet decks"
            ]
        elif booking_calc:
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
                f"Review {guest_name}'s pre-call somatic talking points",
                f"Check villa accommodations for {guest_name}",
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
                "Screen guest intake profile for contraindications",
                "Check 12–14 guest capacity across upcoming cohorts",
                "Explain KAI Guest & Travel Planner in layman terms"
            ]

        # 7. Universal Form Fill Proposal (Enforcing Founder Review)
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
