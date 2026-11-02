from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.sidecar.models import DestinationGuide, generate_uuid_str


def normalize_sanctuary_slug(slug: Optional[str]) -> str:
    if not slug:
        return "puerto-vallarta"
    s = slug.lower().strip().replace("_", "-")
    if "puerto" in s or "vallarta" in s or "marival" in s:
        return "puerto-vallarta"
    if "nosara" in s:
        return "nosara"
    if "amalfi" in s:
        return "amalfi"
    if "bali" in s or "ubud" in s:
        return "bali"
    if "riviera" in s or "maya" in s:
        return "riviera-maya"
    return s


def get_destination_guide(db: Session, sanctuary_slug: str = "puerto-vallarta") -> Optional[DestinationGuide]:
    """
    Retrieves destination and travel logistics guide for a sanctuary.
    Supports normalized and exact slug matches.
    """
    norm = normalize_sanctuary_slug(sanctuary_slug)
    guide = db.query(DestinationGuide).filter(DestinationGuide.sanctuary_slug == norm).first()
    if not guide and sanctuary_slug:
        guide = db.query(DestinationGuide).filter(DestinationGuide.sanctuary_slug == sanctuary_slug.lower()).first()
    return guide


def update_destination_guide(db: Session, sanctuary_slug: str, data: Dict[str, Any]) -> DestinationGuide:
    """
    Updates or creates destination guide intelligence.
    """
    guide = get_destination_guide(db, sanctuary_slug)
    if not guide:
        guide = DestinationGuide(
            id=generate_uuid_str(),
            sanctuary_slug=sanctuary_slug.lower(),
            country=data.get("country", "Costa Rica"),
            visa_requirements=data.get("visa_requirements", "No visa required for US/EU/UK citizens for up to 90 days."),
            passport_validity=data.get("passport_validity", "Passport must be valid for at least 6 months beyond return date."),
            temple_customs=data.get("temple_customs", "Sanctuary grounds honor quiet speech, no shoes indoors, and respectful mindfulness."),
            circadian_timezone_offset=data.get("circadian_timezone_offset", -6),
            packing_checklist=data.get("packing_checklist", []),
            emergency_clinic_distance=data.get("emergency_clinic_distance", "15 minutes to bilingual private clinic"),
            local_concierge_phone=data.get("local_concierge_phone", "+506-2682-0100")
        )
        db.add(guide)
    else:
        for key, val in data.items():
            if hasattr(guide, key) and val is not None:
                setattr(guide, key, val)

    db.commit()
    db.refresh(guide)
    return guide


def seed_default_destination_guides_if_empty(db: Session) -> None:
    """
    Seeds baseline welcoming destination guides for all sanctuaries.
    Ensures Puerto Vallarta (2027 flagship) is always present even if other guides exist.
    """
    existing_slugs = set(g.sanctuary_slug for g in db.query(DestinationGuide).all())
    default_guides = [
        DestinationGuide(
            id=generate_uuid_str(),
            sanctuary_slug="puerto-vallarta",
            country="Mexico (Banderas Bay / Punta de Mita • Marival Harmony)",
            visa_requirements="No visa required for US, Canadian, and EU passport holders for stays up to 180 days.",
            passport_validity="Must be valid for at least 6 months beyond January 31, 2027.",
            temple_customs="At Marival Harmony and during Wixárika (Huichol) artisan circles & cacao ceremonies, we honor quiet presence, cultural reverence, and device-free oceanfront sound baths.",
            circadian_timezone_offset=-6,
            packing_checklist=[
                "2–3 sets of breathable yoga & somatic movement attire (64°F sunrise / 81°F daytime)",
                "1 light cashmere wrap, cardigan, or linen jacket for 63°F oceanfront evening sound baths",
                "2 swimsuits for Marival Harmony infinity pools, Melange Spa hydrotherapy & Banderas Bay",
                "Reef-safe mineral sunscreen (SPF 30+), polarized sunglasses, and wide-brim sun hat",
                "Supportive walking sandals and slip-on beach footwear",
                "Valid passport and reusable insulated water bottle"
            ],
            emergency_clinic_distance="12 minutes to Hospital CMQ Riviera Nayarit / Punta de Mita (Bilingual 24/7 private hospital) with Nurse Kareena Islam, BSN, RN on-site",
            local_concierge_phone="+52-322-226-8200"
        ),
        DestinationGuide(
            id=generate_uuid_str(),
            sanctuary_slug="nosara",
            country="Costa Rica (Nicoya Peninsula Blue Zone)",
            visa_requirements="US, Canadian, and EU travelers receive an automatic 90-day tourist visa upon arrival with return ticket proof.",
            passport_validity="Must be valid for at least 6 months from your scheduled retreat departure date.",
            temple_customs="Nosara celebrates quiet nature and deep rest. In the open-air movement shala and dining pavilion, we honor soft speech, barefoot living, and device-free presence during twilight sound baths.",
            circadian_timezone_offset=-6,  # Central Standard Time (no daylight savings)
            packing_checklist=[
                "Lightweight breathable linen or organic cotton attire",
                "Reef-safe mineral sunscreen (non-nano zinc oxide)",
                "Slip-on sandals for beach trails and wooden pavilion walkways",
                "Refillable insulated water bottle (electrolyte water provided freely)",
                "Comfortable light rain shell for morning rainforest walks",
                "Any prescribed personal supplements or vitamins in original labeled containers"
            ],
            emergency_clinic_distance="12 minutes to Paradise Medical Center (Bilingual 24/7 private clinic) with Nurse Kareena RN on-site",
            local_concierge_phone="+506-2682-0450"
        ),
        DestinationGuide(
            id=generate_uuid_str(),
            sanctuary_slug="amalfi",
            country="Italy (Campania Region)",
            visa_requirements="Schengen visa waiver for US/UK/Canada citizens up to 90 days. Valid passport required.",
            passport_validity="Must be valid for at least 3 months beyond intended departure from Schengen area.",
            temple_customs="When entering historic coastal chapels and cathedral cloisters, shoulders and knees should be gently covered with lightweight linen shawls.",
            circadian_timezone_offset=1,  # Central European Time
            packing_checklist=[
                "Sturdy rubber-soled walking shoes for stone stairways and cliff paths",
                "Flowing linen layers for coastal sun and evening Mediterranean breezes",
                "UV-protective sunglasses and broad-brimmed sun hat",
                "Swimwear for private cliffside saltwater pool and boat grottos"
            ],
            emergency_clinic_distance="20 minutes to Amalfi Coast Emergency Care (Presidio Ospedaliero di Castiglione)",
            local_concierge_phone="+39-089-871-200"
        ),
        DestinationGuide(
            id=generate_uuid_str(),
            sanctuary_slug="bali",
            country="Indonesia (Bali Highlands / Ubud)",
            visa_requirements="Visa on Arrival (VoA) available for $35 USD or e-VoA online prior to departure for 30 days.",
            passport_validity="Strict 6 months validity from entry date and at least two blank pages.",
            temple_customs="Traditional sarongs and sashes are provided before entering sacred water springs. Mindful presence is requested during Melukat cleansing ceremonies.",
            circadian_timezone_offset=8,  # Central Indonesia Time
            packing_checklist=[
                "Modest, cool cotton attire covering knees and shoulders",
                "Natural organic insect repellent (lemongrass and citronella provided at sanctuary)",
                "Slip-on shoes easily removed at temple gates and villa steps",
                "Journal for personal reflection during silent morning tea"
            ],
            emergency_clinic_distance="15 minutes to BIMC Hospital Ubud (International standard medical center)",
            local_concierge_phone="+62-361-975-400"
        ),
        DestinationGuide(
            id=generate_uuid_str(),
            sanctuary_slug="riviera-maya",
            country="Mexico (Quintana Roo)",
            visa_requirements="No visa needed for tourism under 180 days for US, Canadian, and European passports.",
            passport_validity="Must be valid for the full duration of your stay.",
            temple_customs="Only biodegradable mineral sunscreen is permitted in sacred freshwater cenotes to protect delicate underground aquatic ecosystems.",
            circadian_timezone_offset=-5,  # Eastern Standard Time
            packing_checklist=[
                "Biodegradable zinc sunscreen for cenote swims",
                "Water shoes with rubber grips for limestone cenote platforms",
                "Light evening wrap for jungle breezes during candlelight dinner",
                "Loose linen yoga wear"
            ],
            emergency_clinic_distance="10 minutes to Costamed Tulum International Hospital",
            local_concierge_phone="+52-984-871-300"
        )
    ]
    to_add = [g for g in default_guides if g.sanctuary_slug not in existing_slugs]
    if to_add:
        db.add_all(to_add)
        db.commit()
