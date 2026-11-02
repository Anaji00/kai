import time
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.sidecar.models import VendorSupplierRecord, generate_uuid_str
from backend.sidecar.services.crm_client import crm_client

logger = logging.getLogger("kai_vendor_service")

# -----------------------------------------------------------------------------
# Tier 1: In-Memory TTL Cache (10-minute TTL)
# -----------------------------------------------------------------------------
_VENDOR_CACHE: Dict[str, Any] = {}
_VENDOR_CACHE_TIMESTAMP: float = 0
CACHE_TTL_SECONDS = 600  # 10 minutes


def invalidate_vendor_cache():
    """Invalidate in-memory vendor cache upon write/update."""
    global _VENDOR_CACHE_TIMESTAMP
    _VENDOR_CACHE.clear()
    _VENDOR_CACHE_TIMESTAMP = 0
    logger.debug("Vendor in-memory cache invalidated.")


# -----------------------------------------------------------------------------
# Pre-Seeded Preferred Luxury Suppliers (Sanctuary CRM Aligned)
# -----------------------------------------------------------------------------
DEFAULT_SANCTUARY_SUPPLIERS = [
    {
        "name": "Grand Travel & Cruise Flight Desk",
        "category": "AIR_CHARTER",
        "sanctuary_slug": "all",
        "contact_name": "VIP Desk & Cirium Operations",
        "email": "airdesk@grandtravel.com",
        "phone": "+1-800-555-0188",
        "website": "https://grandtravel.com/kai-partners",
        "booking_url_or_code": "SABRE-GTC-KAI",
        "commission_rate": 10.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Direct Client Card Authorization",
        "lead_time_days": 14,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "25+ years host agency legacy, Funjet 500 Club member. Coordinates guaranteed lie-flat seating, "
            "private air charters, preferred transcontinental contracts, and Cirium 72-hour flight tracking."
        ),
        "clinical_relevance": "Eliminates airport navigation and travel anxiety for leaders with elevated baseline sympathetic tone."
    },
    {
        "name": "Carlos Mendez VIP Chauffeurs & Private Aviation Transfer",
        "category": "TRANSPORTATION_CHAUFFEUR",
        "sanctuary_slug": "nosara",
        "contact_name": "Carlos Mendez (Lead Chauffeur)",
        "email": "transfers@nosaraprivate.cr",
        "phone": "+506-8888-0192",
        "website": "https://nosaraprivate.cr",
        "booking_url_or_code": "CR-LIR-VIP-4WD",
        "commission_rate": 12.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Direct Client Card Authorization",
        "lead_time_days": 3,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "Private tarmac meet-and-greets at Liberia International Airport (LIR). Executive 4WD Suburbans "
            "equipped with air-ride suspension, chilled organic eucalyptus towels, and fresh young coconut water."
        ),
        "clinical_relevance": "Prevents vestibular fatigue and bumpy road nausea over coastal unpaved terrain; immediate vagal soothing on tarmac."
    },
    {
        "name": "Harmony Organic Farm & Botanical Kitchen",
        "category": "ORGANIC_CATERING",
        "sanctuary_slug": "nosara",
        "contact_name": "Chef Maria Solano",
        "email": "kitchen@harmonynosara.com",
        "phone": "+506-8777-0144",
        "website": "https://harmonynosara.com",
        "booking_url_or_code": "HARMONY-CHEF-TABLE",
        "commission_rate": 8.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Direct Client Card Authorization",
        "lead_time_days": 5,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "Biodynamic farm-to-table culinary team specializing in Ayurvedic digestive fire (Agni) support, "
            "low-histamine preparations, fresh cold-pressed turmeric elixirs, and strictly organic gluten/dairy-free menus."
        ),
        "clinical_relevance": "Reduces gut microbiome inflammation and supports autonomous serotonin synthesis through nutrient-dense enteric meals."
    },
    {
        "name": "Alchemy Sound & Crystal Bowls Institute",
        "category": "WELLNESS_SOMATIC",
        "sanctuary_slug": "bali",
        "contact_name": "Wayan Putra & Somatic Sound Masters",
        "email": "sacredsound@ubudalchemy.id",
        "phone": "+62-361-9988-02",
        "website": "https://ubudalchemy.id",
        "booking_url_or_code": "ALCH-432HZ-BALI",
        "commission_rate": 15.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Direct Client Card Authorization",
        "lead_time_days": 7,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "Masters of 432Hz harmonic acoustic attunement and 528Hz Solfeggio sound baths. Custom platinum and rose quartz "
            "singing bowls positioned to entrain theta brainwave states during twilight somatic restorative sessions."
        ),
        "clinical_relevance": "Acoustic entrainment down-regulates sympathetic hyperarousal and induces deep REM sleep in high-stress executives."
    },
    {
        "name": "Ravello Ancient Herbal Apothecary",
        "category": "WELLNESS_SOMATIC",
        "sanctuary_slug": "amalfi",
        "contact_name": "Dott.ssa Beatrice Rossi",
        "email": "farmacia@ravelloherbal.it",
        "phone": "+39-089-857-011",
        "website": "https://ravelloherbal.it",
        "booking_url_or_code": "AMALFI-BIO-APOTH",
        "commission_rate": 10.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Direct Net 30",
        "lead_time_days": 10,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "Organic biodynamic cliffside botanical garden preparing custom soothing tisanes, wild Roman chamomile, "
            "cold-pressed lemon blossom mists, and non-toxic somatic oils for evening nervous system unloading."
        ),
        "clinical_relevance": "Aromatherapeutic terpenes stimulate olfactory-limbic pathways to lower baseline cortisol and accelerate melatonin onset."
    },
    {
        "name": "Clinica Nosara Medical Response & Urgent Care",
        "category": "MEDICAL_EMERGENCY",
        "sanctuary_slug": "nosara",
        "contact_name": "Dr. Fernando Gutierrez, MD",
        "email": "clinicaldirector@clinicanosara.cr",
        "phone": "+506-2682-0199",
        "website": "https://clinicanosara.cr",
        "booking_url_or_code": "EMERGENCY-KAI-RN-PRIORITY",
        "commission_rate": 0.0,
        "commission_type": "NON_COMMISSIONABLE",
        "payment_terms": "Direct Net 30",
        "lead_time_days": 0,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "24/7 bilingual emergency medical facility located 12 minutes from villa. Advanced cardiac monitoring, "
            "minor trauma care, IV hydration protocols, and direct medevac helicopter transfer coordination to San José."
        ),
        "clinical_relevance": "Provides Nurse Kareena and retreat guests absolute peace of mind with vetted acute clinical escalation capabilities."
    },
    {
        "name": "Riviera Maya Cenote Biological Guides",
        "category": "TOUR_EXCURSION",
        "sanctuary_slug": "riviera-maya",
        "contact_name": "Mateo Canche (Lead Naturalist)",
        "email": "tulum@cenotebiological.mx",
        "phone": "+52-984-888-0233",
        "website": "https://cenotebiological.mx",
        "booking_url_or_code": "CENOTE-PRIVATE-SACRED",
        "commission_rate": 15.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Direct Client Card Authorization",
        "lead_time_days": 5,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": (
            "Private access to sacred subterranean limestone cenotes with certified cavern biologsts. High mineral "
            "freshwater floating and sensory depravation immersion free from commercial tourist crowds."
        ),
        "clinical_relevance": "Hydrostatic pressure and cool mineral immersion provide gentle vagal nerve stimulation and proprioceptive unloading."
    }
]


def seed_default_vendors_if_empty(db: Session) -> None:
    """Seed default luxury suppliers into SQLite if table is empty."""
    count = db.query(VendorSupplierRecord).count()
    if count == 0:
        for s in DEFAULT_SANCTUARY_SUPPLIERS:
            # Register in Native CRM
            sync_res = crm_client.sync_supplier_to_crm(
                name=s["name"],
                category=s["category"],
                sanctuary_slug=s["sanctuary_slug"],
                contact_name=s.get("contact_name"),
                email=s.get("email"),
                phone=s.get("phone"),
                website=s.get("website"),
                commission_rate=s.get("commission_rate", 10.0),
                commission_type=s.get("commission_type", "PERCENTAGE"),
                payment_terms=s.get("payment_terms", "Direct Client Card Authorization"),
                lead_time_days=s.get("lead_time_days", 7),
                preferred_tier=s.get("preferred_tier", "PREFERRED_PARTNER"),
                service_description=s["service_description"],
                clinical_relevance=s.get("clinical_relevance"),
                operator_name="Kareena Islam"
            )

            rec = VendorSupplierRecord(
                id=generate_uuid_str(),
                supplier_code=sync_res.get("supplier_code"),
                name=s["name"],
                category=s["category"],
                sanctuary_slug=s["sanctuary_slug"],
                contact_name=s.get("contact_name"),
                email=s.get("email"),
                phone=s.get("phone"),
                website=s.get("website"),
                booking_url_or_code=s.get("booking_url_or_code"),
                commission_rate=s.get("commission_rate", 10.0),
                commission_type=s.get("commission_type", "PERCENTAGE"),
                payment_terms=s.get("payment_terms", "Direct Client Card Authorization"),
                lead_time_days=s.get("lead_time_days", 7),
                preferred_tier=s.get("preferred_tier", "PREFERRED_PARTNER"),
                service_description=s["service_description"],
                clinical_relevance=s.get("clinical_relevance"),
                dossier_url=sync_res.get("dossier_url"),
                
                last_synced_at=datetime.now(timezone.utc),
                status="ACTIVE"
            )
            db.add(rec)
        db.commit()
        invalidate_vendor_cache()
        logger.info(f"Seeded {len(DEFAULT_SANCTUARY_SUPPLIERS)} preferred suppliers into SQLite and registered in KAI CRM.")


def list_vendors(
    db: Session,
    sanctuary_slug: Optional[str] = None,
    category: Optional[str] = None
) -> List[VendorSupplierRecord]:
    """
    Retrieves vendors using tiered caching:
    Checks in-memory cache first; falls back to SQLite dual-storage persistent cache.
    """
    global _VENDOR_CACHE_TIMESTAMP
    seed_default_vendors_if_empty(db)

    cache_key = f"{sanctuary_slug or 'all'}:{category or 'all'}"
    now = time.time()

    if now - _VENDOR_CACHE_TIMESTAMP < CACHE_TTL_SECONDS and cache_key in _VENDOR_CACHE:
        logger.debug(f"Returning {len(_VENDOR_CACHE[cache_key])} vendors from in-memory cache ({cache_key})")
        return _VENDOR_CACHE[cache_key]

    query = db.query(VendorSupplierRecord).filter(VendorSupplierRecord.status == "ACTIVE")
    if sanctuary_slug and sanctuary_slug.lower() != "all":
        query = query.filter(
            (VendorSupplierRecord.sanctuary_slug == sanctuary_slug.lower()) |
            (VendorSupplierRecord.sanctuary_slug == "all")
        )
    if category and category.upper() != "ALL":
        query = query.filter(VendorSupplierRecord.category == category.upper())

    results = query.order_by(VendorSupplierRecord.preferred_tier.asc(), VendorSupplierRecord.name.asc()).all()

    # Update cache
    _VENDOR_CACHE[cache_key] = results
    _VENDOR_CACHE_TIMESTAMP = now
    return results


def get_vendor(db: Session, vendor_id: str) -> Optional[VendorSupplierRecord]:
    """Fetch single vendor by UUID."""
    return db.query(VendorSupplierRecord).filter(VendorSupplierRecord.id == vendor_id).first()


def create_vendor(db: Session, data: Dict[str, Any]) -> VendorSupplierRecord:
    """
    Creates vendor in SQLite local persistent storage AND syncs to KAI Sanctuary CRM Registry.
    """
    name = data["name"]
    category = data["category"]
    sanctuary_slug = data.get("sanctuary_slug", "all").lower()

    # 1. Register in Native CRM
    sync_res = crm_client.sync_supplier_to_crm(
        name=name,
        category=category,
        sanctuary_slug=sanctuary_slug,
        contact_name=data.get("contact_name"),
        email=data.get("email"),
        phone=data.get("phone"),
        website=data.get("website"),
        commission_rate=data.get("commission_rate", 10.0),
        commission_type=data.get("commission_type", "PERCENTAGE"),
        payment_terms=data.get("payment_terms", "Direct Client Card Authorization"),
        lead_time_days=data.get("lead_time_days", 7),
        preferred_tier=data.get("preferred_tier", "PREFERRED_PARTNER"),
        service_description=data["service_description"],
        clinical_relevance=data.get("clinical_relevance"),
        operator_name="Kareena Islam"
    )

    # 2. Persist to local SQLite
    rec = VendorSupplierRecord(
        id=generate_uuid_str(),
        supplier_code=sync_res.get("supplier_code"),
        name=name,
        category=category,
        sanctuary_slug=sanctuary_slug,
        contact_name=data.get("contact_name"),
        email=data.get("email"),
        phone=data.get("phone"),
        website=data.get("website"),
        booking_url_or_code=data.get("booking_url_or_code"),
        commission_rate=data.get("commission_rate", 10.0),
        commission_type=data.get("commission_type", "PERCENTAGE"),
        payment_terms=data.get("payment_terms", "Direct Client Card Authorization"),
        lead_time_days=data.get("lead_time_days", 7),
        preferred_tier=data.get("preferred_tier", "PREFERRED_PARTNER"),
        service_description=data["service_description"],
        clinical_relevance=data.get("clinical_relevance"),
        dossier_url=sync_res.get("dossier_url"),
        
        last_synced_at=datetime.now(timezone.utc),
        status="ACTIVE"
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    invalidate_vendor_cache()
    return rec


def update_vendor(db: Session, vendor_id: str, data: Dict[str, Any]) -> Optional[VendorSupplierRecord]:
    """Updates vendor record and invalidates cache."""
    rec = get_vendor(db, vendor_id)
    if not rec:
        return None

    for k, v in data.items():
        if hasattr(rec, k) and v is not None:
            setattr(rec, k, v)

    rec.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(rec)
    invalidate_vendor_cache()
    return rec


def delete_vendor(db: Session, vendor_id: str) -> bool:
    """Soft-deletes/archives vendor."""
    rec = get_vendor(db, vendor_id)
    if not rec:
        return False
    rec.status = "INACTIVE"
    rec.updated_at = datetime.now(timezone.utc)
    db.commit()
    invalidate_vendor_cache()
    return True
