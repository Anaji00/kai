from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.sidecar.models import SanctuaryKnowledge

# -----------------------------------------------------------------------------
# Core Seed Knowledge Repository
# -----------------------------------------------------------------------------
SANCTUARY_KNOWLEDGE_SEEDS = [
    {
        "category": "clinical",
        "title": "4-7-8 Vagal Nerve Down-Regulation & Autonomic Balance",
        "content": (
            "Clinical mechanism: Inhaling for 4 counts, retaining for 7 counts, and audibly exhaling for 8 counts "
            "stimulates the vagus nerve (cranial nerve X), promoting acetylcholine release, reducing heart rate, "
            "elevating heart rate variability (HRV), and shifting the autonomic nervous system from sympathetic "
            "fight-or-flight overdrive into parasympathetic restorative mode."
        ),
        "metadata_json": {"protocol": "4-7-8", "target": "vagal_tone", "biomarkers": ["HRV", "cortisol", "blood_pressure"]}
    },
    {
        "category": "clinical",
        "title": "432Hz & 528Hz Acoustic Frequency Attunement",
        "content": (
            "Acoustic physics: 432Hz harmonic resonance mirrors natural biological ratios, entraining cerebral alpha and "
            "theta brainwaves for profound meditative stillness. 528Hz ('Miracle Tone' / Solfeggio frequency) supports "
            "cellular homeostasis, reduces oxidative stress markers, and deepens somatic relaxation during twilight sound baths."
        ),
        "metadata_json": {"frequencies": [432, 528], "modality": "sound_bath", "target": "brainwave_entrainment"}
    },
    {
        "category": "logistics",
        "title": "Grand Travel & Cruise Flight Desk & VIP Ground Operations",
        "content": (
            "Grand Travel & Cruise (25+ years host agency legacy, Funjet 500 Club member) negotiates preferred transcontinental "
            "airfare, guaranteed lie-flat seating blocks, and coordinates private airport meet-and-greets directly on the tarmac. "
            "Guests experience seamless luxury transfers with zero customs friction or ground logistics stress."
        ),
        "metadata_json": {"partner": "Grand Travel & Cruise", "agency_experience": 25, "tier": "Funjet 500 Club"}
    },
    {
        "category": "itinerary",
        "title": "Intimate Sanctuary Capacity & Circadian Rhythm Arc",
        "content": (
            "KAI Sanctuaries are strictly limited to 12–14 guests to protect emotional safety and individualized clinical "
            "attention. The 6-day circadian arc begins with Day 1 Decompression & Nervous System Unloading, progressing through "
            "Day 2-3 Somatic Movement & Vagal Reset, Day 4 Deep Cellular Restoration, and concluding with Day 5-6 Sustainable "
            "Integration."
        ),
        "metadata_json": {"cohort_cap_min": 12, "cohort_cap_max": 14, "duration_days": 6}
    },
    {
        "category": "objection",
        "title": "Corporate Leader & High-Performer Schedule Friction",
        "content": (
            "Objection: 'I cannot step away from my company or executive duties for 6 uninterrupted days.' "
            "Clinical response: Chronic sympathetic overdrive degrades executive cognitive acuity, strategic foresight, and sleep quality. "
            "A 6-day circadian reset is not downtime; it is high-leverage cognitive maintenance that restores autonomic equilibrium "
            "and emotional stamina. High-speed private Starlink connectivity is available for necessary morning briefings."
        ),
        "metadata_json": {"objection_type": "time_commitment", "target_audience": "executives"}
    },
    {
        "category": "objection",
        "title": "Somatic Movement & Breathwork Intensity Apprehension",
        "content": (
            "Objection: 'I am not flexible / have never done breathwork / fear intense emotional release.' "
            "Clinical response: Kareena's registered nurse foundation ensures that all somatic practices are trauma-informed, "
            "gentle, and medically supervised. Breathwork is gently adapted to your individual comfort without forced hyperventilation."
        ),
        "metadata_json": {"objection_type": "practice_intensity", "target_audience": "beginners"}
    },
    {
        "category": "business_operations",
        "title": "Retreat Group Pricing, Deposits & Financial Terms",
        "content": (
            "All KAI Retreats operate on an all-inclusive pricing structure: Private Ocean Canopy Villas ($9,800 – $14,500 "
            "per traveler depending on sanctuary season) and Shared Ocean Pavilions ($6,800 – $8,200). "
            "Payment schedules: A 30% non-refundable reservation deposit is authorized natively through Tern CRM upon Founder review, "
            "with the 70% balance due 45 days prior to retreat group arrival. Strict 12–14 guest maximum per retreat group."
        ),
        "metadata_json": {"deposit_percent": 30, "balance_due_days": 45, "pricing_tier_min": 6800, "pricing_tier_max": 14500}
    },
    {
        "category": "tern_crm",
        "title": "Tern Back Office Supplier Architecture & Native Authorizations",
        "content": (
            "Tern CRM is KAI's official operating system for agency suppliers, credit card authorizations, and traveler sync. "
            "All travel suppliers (Grand Travel & Cruise, private chauffeurs, charter airlines, organic caterers) are registered "
            "under Tern Back Office -> Suppliers with contractual commission rates (typically 10%–15% preferred partner tier). "
            "Clients authorize trip deposits natively through Tern's bank-grade PCI payment portal—no credit cards are ever handled manually."
        ),
        "metadata_json": {"system": "Tern CRM", "commission_standard": "10-15%", "payment_security": "PCI DSS Native"}
    },
    {
        "category": "hospitality_concierge",
        "title": "Villa Accommodations, Quiet Decks & Spatial Rest",
        "content": (
            "Each sanctuary features secluded luxury villas with private open-air quiet decks, non-toxic organic bedding, "
            "bespoke herbal botanical apothecaries, and direct proximity to morning prana trails. High-speed private Starlink "
            "is discreetly integrated to give executives peace of mind without disturbing collective quietude."
        ),
        "metadata_json": {"amenities": ["private_deck", "organic_bedding", "botanical_apothecary", "starlink"]}
    },
    {
        "category": "partnerships",
        "title": "Partner Wellness Studios & Functional Medicine Practices",
        "content": (
            "KAI maintains referral alliances with elite functional medicine clinics, holistic psychiatric practices, and "
            "private sound healing studios across major wellness hubs (Austin, Houston, New York, Los Angeles). Aligned practitioners "
            "receive preferred booking windows for their patients requiring intensive nervous system recovery."
        ),
        "metadata_json": {"partner_types": ["functional_medicine", "holistic_psychiatry", "sound_studios"]}
    }
]


def seed_sanctuary_knowledge(db: Session):
    """Seed initial clinical and logistical knowledge if empty."""
    count = db.query(SanctuaryKnowledge).count()
    if count == 0:
        for item in SANCTUARY_KNOWLEDGE_SEEDS:
            rec = SanctuaryKnowledge(
                category=item["category"],
                title=item["title"],
                content=item["content"],
                metadata_json=item["metadata_json"],
                embedding_json=None
            )
            db.add(rec)
        db.commit()


# -----------------------------------------------------------------------------
# Pre-Call Thesis RAG Generator
# -----------------------------------------------------------------------------
def generate_pre_call_thesis(
    client_name: str,
    sanctuary_slug: str | None,
    room_tier: str | None,
    clinical_profile: Dict[str, Any],
    flight_request: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    RAG-driven clinical hypothesis, talk tracks, objection scripts,
    and Tern-ready itinerary activities.
    """
    health_notes = str(clinical_profile.get("health_notes", "")).lower()
    intentions = str(clinical_profile.get("intentions", "")).lower()
    movement_exp = str(clinical_profile.get("movement_experience", "All Levels"))
    flight_cabin = flight_request.get("cabin_class", "") if flight_request else ""

    # Clinical flags detection
    clinical_flags = []
    if any(k in health_notes or k in intentions for k in ["burnout", "exhaust", "overwhelm", "stress", "work"]):
        clinical_flags.append("HIGH_BURNOUT_RISK")
    if any(k in health_notes or k in intentions for k in ["insomnia", "sleep", "wake", "tired", "fatigue"]):
        clinical_flags.append("CIRCADIAN_SLEEP_DISRUPTION")
    if any(k in health_notes or k in intentions for k in ["anxiety", "nervous", "panic", "heart", "chest", "racing"]):
        clinical_flags.append("SYMPATHETIC_HYPERAROUSAL")
    if any(k in health_notes or k in intentions for k in ["back", "joint", "surgery", "injury", "knee"]):
        clinical_flags.append("SOMATIC_RESTRICTION_PROTOCOL")
    if "first" in flight_cabin.lower() or "business" in flight_cabin.lower():
        clinical_flags.append("LIE_FLAT_VIP_AIR")
    
    if not clinical_flags:
        clinical_flags.append("GENERAL_NERVOUS_SYSTEM_RESET")

    # Sympathetic tone hypothesis
    hypothesis_text = (
        f"Guest displays clear markers of {', '.join(clinical_flags).lower().replace('_', ' ')}. "
        f"Primary intention states: '{clinical_profile.get('intentions', 'Deep nervous system recovery')}'. "
        f"Experience with movement/somatics: {movement_exp}. Recommended clinical pathway prioritizes "
        f"titrated vagal down-regulation (4-7-8 method), acoustic grounding (432Hz/528Hz), and anti-inflammatory "
        f"cellular nutrition."
    )

    # Sanctuary & Tier recommendation
    target_slug = sanctuary_slug or "nosara"
    sanctuary_names = {
        "nosara": "Nosara Costa Rica Blue Zone Sanctuary",
        "amalfi": "Amalfi Coast Cliffside Stillness Retreat",
        "bali": "Bali Sacred Water & Jungle Sanctuary",
        "riviera-maya": "Riviera Maya Coastal Grounding Sanctuary"
    }
    rec_sanctuary = sanctuary_names.get(target_slug, "Nosara Costa Rica Sanctuary")
    rec_room = room_tier or "Private Villa Sanctuary (Ocean View)"

    # Circadian schedule
    circadian_protocol = (
        "06:30 Sunrise Circadian Hydration & Grounding -> 07:15 Gentle Vagal Activation & Breathwork -> "
        "08:30 Organic Anti-Inflammatory Breakfast -> 11:00 Guided Somatic Release -> "
        "13:00 Nutrient-Dense Coastal Dining -> 15:30 Ocean/Thermal Mineral Therapy -> "
        "18:00 Sunset 432Hz Acoustic Immersion -> 20:30 Melatonin Support & Delta Sleep Induction"
    )

    # High-converting talk tracks for Kareena's call
    talk_tracks = [
        {
            "phase": "Opening & Empathy",
            "talking_point": f"Acknowledge {client_name}'s daily mental stress and executive demands: 'I saw your reflection on {clinical_profile.get('intentions', 'seeking calm')}. In my clinical practice, we see high achievers carrying nervous system tension long before physical symptoms appear.'"
        },
        {
            "phase": "Intimate Group Exclusivity",
            "talking_point": "Reassure small group safety: 'We strictly cap this retreat at 12 to 14 guests. This ensures you never feel like part of a crowd, and every somatic session is dialed into your personal baseline.'"
        },
        {
            "phase": "Grand Travel Logistics Ease",
            "talking_point": "Address travel friction: 'Through our partnership with Grand Travel & Cruise, our flight desk coordinates your routing directly. From private meet-and-greets at the terminal to luxury transfers, you will not have to solve a single logistical problem.'"
        }
    ]

    # Objection handling scripts
    objection_scripts = [
        {
            "objection": "Time Away / Business Demands",
            "clinical_script": "Remind guest that 6 days of parasympathetic restoration enhances strategic decision-making and protects against executive burnout. High-speed Starlink is accessible for essential early morning check-ins."
        },
        {
            "objection": "Somatic / Breathwork Apprehension",
            "clinical_script": "Reassure guest that as a Registered Nurse, Kareena gently adapts all sessions safely. There is no forced hyperventilation or extreme physical strain—everything is voluntary, gentle, and medically grounded."
        },
        {
            "objection": "Private Villa vs Shared Ocean Pavilion",
            "clinical_script": "Highlight nervous system safety: For high-stress recovery, a Private Villa guarantees unbroken delta sleep and solitude, while Shared Pavilions foster soulful connection with an intentional peer."
        }
    ]

    # Tern-compatible activities draft (LODGING, ACTIVITY, TRANSFER) with preferred supplier linkage
    supplier_chauffeur = "Carlos Mendez VIP Chauffeurs & Private Aviation Transfer"
    supplier_catering = "Harmony Organic Farm & Botanical Kitchen"
    supplier_sound = "Alchemy Sound & Crystal Bowls Institute" if "bali" in rec_sanctuary.lower() else "Ravello Ancient Herbal Apothecary" if "amalfi" in rec_sanctuary.lower() else "Alchemy Sound & Crystal Bowls Institute"

    tern_draft = [
        {
            "type": "TRANSFER",
            "day": 1,
            "title": "Private VIP Airport Meet-and-Greet & Sanctuary Transfer",
            "supplier_name": supplier_chauffeur,
            "supplier_category": "TRANSPORTATION_CHAUFFEUR",
            "description": "Curated by Grand Travel & Cruise flight desk. Executive 4WD luxury transport with chilled hydration and young coconut water."
        },
        {
            "type": "LODGING",
            "day": 1,
            "title": f"6-Night Stay in {rec_room}",
            "supplier_name": f"KAI {rec_sanctuary} Exclusive Villas",
            "supplier_category": "LODGING_VILLA",
            "description": f"Private accommodations at {rec_sanctuary}. High-thread linen, non-toxic botanicals, and bespoke sleep environment."
        },
        {
            "type": "ACTIVITY",
            "day": 1,
            "title": "Welcome Circle & Nourishing Ayurvedic Dinner",
            "supplier_name": supplier_catering,
            "supplier_category": "ORGANIC_CATERING",
            "description": "Opening twilight grounding, welcoming dinner by private chef, and 4-7-8 vagal nerve calibration."
        },
        {
            "type": "ACTIVITY",
            "day": 2,
            "title": "Morning Vagal Stimulation & Somatic Prana Flow",
            "supplier_name": "KAI Somatic Faculty",
            "supplier_category": "WELLNESS_SOMATIC",
            "description": "Breathwork titrated to parasympathetic activation followed by anti-inflammatory coastal breakfast."
        },
        {
            "type": "ACTIVITY",
            "day": 3,
            "title": "432Hz & 528Hz Acoustic Sound Immersion",
            "supplier_name": supplier_sound,
            "supplier_category": "WELLNESS_SOMATIC",
            "description": "Full-body acoustic resonance session designed to lower salivary cortisol and induce alpha/theta entrainment."
        },
        {
            "type": "TRANSFER",
            "day": 6,
            "title": "Post-Integration Departure Transfer",
            "supplier_name": supplier_chauffeur,
            "supplier_category": "TRANSPORTATION_CHAUFFEUR",
            "description": "Seamless private transfer coordinated with flight departure times, including nourishment travel package."
        }
    ]

    # Personalized follow-up consultation email
    personalized_email = (
        f"Dear {client_name},\n\n"
        f"Thank you for sharing your intentions for {rec_sanctuary}. Based on your reflection around "
        f"'{clinical_profile.get('intentions', 'nervous system rejuvenation')}', I have outlined a personalized restorative pathway for you.\n\n"
        f"At KAI, we strictly maintain an intimate circle of 12–14 guests to ensure each person receives individualized "
        f"clinical guidance. Your recommended accommodation is our {rec_room}, paired with our 4-7-8 vagal calibration "
        f"and 432Hz acoustic therapy protocols.\n\n"
        f"Our partners at Grand Travel & Cruise are also prepared to assist with your preferred flight arrangements and private transfers.\n\n"
        f"I look forward to our consultation call.\n\n"
        f"Warmly,\n"
        f"Kareena Islam, BSN, RN\n"
        f"Founder, KAI Wellness Retreats"
    )

    return {
        "sympathetic_tone_hypothesis": hypothesis_text,
        "clinical_flags": clinical_flags,
        "recommended_sanctuary": rec_sanctuary,
        "recommended_room_tier": rec_room,
        "circadian_protocol": circadian_protocol,
        "consultation_talk_tracks": talk_tracks,
        "objection_scripts": objection_scripts,
        "tern_itinerary_draft": tern_draft,
        "personalized_email_draft": personalized_email
    }


def search_vendor_knowledge(db: Session, query: str, sanctuary_slug: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Searches Tern Preferred Supplier repository for vendor intelligence matching user query.
    Used by RAG and Copilot to provide exact contact, pricing, and contract terms.
    """
    from backend.sidecar.services.vendor_service import list_vendors
    vendors = list_vendors(db=db, sanctuary_slug=sanctuary_slug)
    q_words = [w.lower() for w in query.lower().split() if len(w) > 2]

    scored_matches = []
    for v in vendors:
        v_text = f"{v.name} {v.category} {v.service_description} {v.contact_name or ''} {v.clinical_relevance or ''}".lower()
        score = sum(1 for w in q_words if w in v_text)
        if score > 0 or not q_words:
            scored_matches.append((score, {
                "name": v.name,
                "category": v.category,
                "sanctuary_slug": v.sanctuary_slug,
                "contact_name": v.contact_name,
                "email": v.email,
                "phone": v.phone,
                "commission_rate": v.commission_rate,
                "commission_type": v.commission_type,
                "payment_terms": v.payment_terms,
                "service_description": v.service_description,
                "clinical_relevance": v.clinical_relevance,
                "tern_supplier_id": v.tern_supplier_id,
                "tern_deep_link": v.tern_deep_link,
                "preferred_tier": v.preferred_tier
            }))
    scored_matches.sort(key=lambda x: x[0], reverse=True)
    return [m[1] for m in scored_matches[:5]]
