import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from backend.sidecar.models import StagedLead

logger = logging.getLogger("kai_lead_gen")

CURATED_WELLNESS_PARTNERS: List[Dict[str, Any]] = [
    {
        "business_name": "River Oaks Reformer & Somatic Lab",
        "category": "reformer_pilates",
        "contact_name": "Elena Vance",
        "email": "elena@riveroaksreformer.com",
        "phone": "+1 713-555-0142",
        "location": "Houston, TX",
        "website": "https://riveroaksreformer.com",
        "focus": "High-net-worth reformer Pilates & postural rehabilitation",
    },
    {
        "business_name": "Atelier Sound & Breathwork Austin",
        "category": "practitioner",
        "contact_name": "Marcus Sterling",
        "email": "marcus@ateliersoundaustin.com",
        "phone": "+1 512-555-0188",
        "location": "Austin, TX",
        "website": "https://ateliersoundaustin.com",
        "focus": "Acoustic frequency therapy (432Hz) & somatic emotional release",
    },
    {
        "business_name": "Preston Hollow Longevity & Hyperbaric Clinic",
        "category": "clinic",
        "contact_name": "Dr. Cynthia Cole, MD",
        "email": "drcole@prestonhollowlongevity.com",
        "phone": "+1 214-555-0199",
        "location": "Dallas, TX",
        "website": "https://prestonhollowlongevity.com",
        "focus": "Vagal tone diagnostics, cellular biomarker rejuvenation, executive health",
    },
    {
        "business_name": "SoHo Sanctuary Movement Studio",
        "category": "studio",
        "contact_name": "Chloe Dupont",
        "email": "chloe@sohomovement.com",
        "phone": "+1 212-555-0164",
        "location": "New York, NY",
        "website": "https://sohosanctuary.com",
        "focus": "Boutique Pilates, restorative yoga, corporate burnout decompression",
    },
    {
        "business_name": "Gold Coast Restorative & Sound Arts",
        "category": "practitioner",
        "contact_name": "Julian Thorne",
        "email": "julian@goldcoastrestorative.com",
        "phone": "+1 312-555-0173",
        "location": "Chicago, IL",
        "website": "https://goldcoastrestorative.com",
        "focus": "Sound architecture, bio-field entrainment, nervous system recovery",
    },
    {
        "business_name": "Brentwood Executive Health Circle",
        "category": "corporate",
        "contact_name": "Sarah Lin",
        "email": "sarah@brentwoodhealthcircle.com",
        "phone": "+1 310-555-0155",
        "location": "Los Angeles, CA",
        "website": "https://brentwoodhealthcircle.com",
        "focus": "Founders, venture partners, and leaders seeking restorative retreats",
    }
]


def discover_and_stage_leads(
    db: Session,
    city: str | None = None,
    category: str | None = None,
    limit: int = 5
) -> List[StagedLead]:
    """
    Simulates / sources high-intent wellness feeder partners and stages them
    with status = 'PENDING_APPROVAL'.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES TO EXTERNAL CRM OR OUTREACH.
    """
    logger.info(f"Triggering lead discovery worker: city={city}, category={category}, limit={limit}")

    candidates = CURATED_WELLNESS_PARTNERS
    if city:
        candidates = [c for c in candidates if city.lower() in c["location"].lower()]
    if category:
        candidates = [c for c in candidates if category.lower() in c["category"].lower()]
    
    if not candidates:
        candidates = CURATED_WELLNESS_PARTNERS

    staged_records = []
    for item in candidates[:limit]:
        # Check if already staged
        existing = db.query(StagedLead).filter(StagedLead.business_name == item["business_name"]).first()
        if existing:
            staged_records.append(existing)
            continue

        # Formulate custom B2B collaboration thesis
        outreach_thesis = (
            f"Target Partner: {item['business_name']} ({item['location']}). "
            f"Specialization: {item['focus']}. "
            f"Collaboration Thesis: Co-curate an exclusive, private 12–14 guest immersion for their top-tier clientele. "
            f"KAI provides clinical nurse oversight by Kareena Islam, 4-7-8 vagal restoration protocols, and full VIP flight "
            f"and ground logistics coordinated by Grand Travel & Cruise. Studio founder receives co-host honorarium and "
            f"customized cohort booking portal."
        )

        lead = StagedLead(
            business_name=item["business_name"],
            category=item["category"],
            contact_name=item["contact_name"],
            email=item["email"],
            phone=item["phone"],
            location=item["location"],
            website=item["website"],
            outreach_thesis=outreach_thesis,
            status="PENDING_APPROVAL"
        )
        db.add(lead)
        staged_records.append(lead)

    db.commit()
    for rec in staged_records:
        db.refresh(rec)

    return staged_records
