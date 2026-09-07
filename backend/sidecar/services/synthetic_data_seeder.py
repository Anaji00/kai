import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from backend.database import SessionLocal, init_db
from backend.sidecar.models import (
    StagingIntake,
    VendorSupplierRecord,
    StagedLead,
    CalendarEvent,
    CuratedDiningSpot,
    DestinationReview,
    SanctuaryRoute,
    SomaticPointOfInterest,
    SmsDispatch,
    StagedEmail,
    SanctuaryKnowledge
)
from backend.sidecar.services.thesis_rag import seed_sanctuary_knowledge, generate_pre_call_thesis
from backend.sidecar.services.geo_routing_service import seed_default_routes_and_pois_if_empty
from backend.sidecar.services.dining_service import seed_default_dining_if_empty
from backend.sidecar.services.reviews_service import seed_default_reviews_if_empty

logger = logging.getLogger("kai_synthetic_data_seeder")


SYNTHETIC_INTAKES = [
    {
        "source_ref": "KAI-LUCAS03",
        "client_name": "Frank Lucas",
        "email": "frank.lucas@vip-capital.com",
        "phone": "+1 (212) 555-0198",
        "sanctuary_slug": "nosara",
        "room_tier": "Private Ocean Canopy Villa",
        "clinical_profile": {
            "movement_experience": "Executive Somatics / Restorative",
            "health_notes": "Sympathetic overdrive, elevated evening cortisol, irregular circadian rhythm.",
            "intentions": "3-night intensive vagal reset, unbroken delta sleep, ocean stillness, and private chauffeur transit.",
            "passport_valid": "yes-valid-6mo",
            "nights": 3,
            "total_amount": 5700.0,
            "deposit_30": 1710.0,
            "balance_70": 3990.0
        },
        "flight_request": {
            "departure_airport": "JFK",
            "cabin_class": "first",
            "preferred_airline": "Delta One / United Polaris",
            "travel_dates_flexible": False,
            "special_requests": "Direct lie-flat routing into Liberia (LIR) with private 4WD Suburban chauffeur tarmac meet"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "source_ref": "KAI-VANCE88",
        "client_name": "Eleanor Vance",
        "email": "eleanor.vance@example.com",
        "phone": "+1 (713) 555-0199",
        "sanctuary_slug": "nosara",
        "room_tier": "Private Ocean Canopy Villa",
        "clinical_profile": {
            "movement_experience": "Gentle / Beginner",
            "health_notes": "High cognitive overload, sympathetic nervous exhaustion, early morning waking / insomnia.",
            "intentions": "Nervous system decompression, restorative vagal resetting, and unbroken delta sleep.",
            "passport_valid": "yes-valid-6mo",
            "nights": 6,
            "total_amount": 11500.0,
            "deposit_30": 3450.0,
            "balance_70": 8050.0
        },
        "flight_request": {
            "departure_airport": "IAH",
            "cabin_class": "business",
            "preferred_airline": "United Airlines",
            "travel_dates_flexible": True,
            "special_requests": "Requires lie-flat seating and private ground transfer with chilled hydration"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "source_ref": "KAI-REED42",
        "client_name": "Dr. Marcus Reed",
        "email": "m.reed@chicagolongevity.org",
        "phone": "+1 (312) 555-0182",
        "sanctuary_slug": "amalfi",
        "room_tier": "Cliffside Stillness Suite",
        "clinical_profile": {
            "movement_experience": "Intermediate Somatics",
            "health_notes": "Chronic clinical fatigue from hospital leadership. History of right meniscus knee repair.",
            "intentions": "Restorative cliffside stillness, Mediterranean anti-inflammatory nutrition, and vagal down-regulation.",
            "passport_valid": "yes-valid-6mo",
            "nights": 6,
            "total_amount": 12600.0,
            "deposit_30": 3780.0,
            "balance_70": 8820.0
        },
        "flight_request": {
            "departure_airport": "ORD",
            "cabin_class": "first",
            "preferred_airline": "Lufthansa / Swiss",
            "travel_dates_flexible": False,
            "special_requests": "Direct lie-flat routing into Naples, VIP tarmac meet-and-greet"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "source_ref": "KAI-JENKINS19",
        "client_name": "Sarah Jenkins",
        "email": "sarah.jenkins@austindesign.io",
        "phone": "+1 (512) 555-0144",
        "sanctuary_slug": "nosara",
        "room_tier": "Sacred Garden Suite",
        "clinical_profile": {
            "movement_experience": "Gentle Restorative",
            "health_notes": "First trimester pregnancy (mild nausea, slight hypertension noted). Strict gluten-free and dairy-free dietary requirements.",
            "intentions": "Cellular calm, maternal relaxation, acoustic 432Hz crystal sound healing (no high heat or cold plunge).",
            "passport_valid": "yes-valid-6mo",
            "nights": 6,
            "total_amount": 8500.0,
            "deposit_30": 2550.0,
            "balance_70": 5950.0
        },
        "flight_request": {
            "departure_airport": "AUS",
            "cabin_class": "business",
            "preferred_airline": "American Airlines",
            "flight_number": "AA 1244",
            "travel_dates_flexible": False,
            "special_requests": "Arriving LIR, requires low-vibration private transit and organic botanical tea upon arrival"
        },
        "status": "PENDING_APPROVAL"
    },
    {
        "source_ref": "KAI-TAKAHASHI07",
        "client_name": "Kenji Takahashi",
        "email": "kenji@takahashi-holdings.jp",
        "phone": "+81 90-5555-0123",
        "sanctuary_slug": "bali",
        "room_tier": "Private Jungle Canopy Villa",
        "clinical_profile": {
            "movement_experience": "Advanced Breathwork & Meditation",
            "health_notes": "Travel fatigue from Tokyo executive schedule. Desires deep nervous system acoustic entrainment.",
            "intentions": "Balinese sacred water purification, 528Hz acoustic sound immersion, and tropical forest bathing.",
            "passport_valid": "yes-valid-6mo",
            "nights": 6,
            "total_amount": 10800.0,
            "deposit_30": 3240.0,
            "balance_70": 7560.0
        },
        "flight_request": {
            "departure_airport": "HND",
            "cabin_class": "first",
            "preferred_airline": "Singapore Airlines",
            "travel_dates_flexible": True,
            "special_requests": "Arriving DPS, private Lotus chauffeur escort to Ubud jungle villa"
        },
        "status": "SYNCED_TO_TERN",
        "tern_contact_id": "tern_cnt_takahashi_007",
        "tern_trip_id": "tern_trp_bali_7781"
    },
    {
        "source_ref": "KAI-ROSSI91",
        "client_name": "Sofia Rossi",
        "email": "sofia.rossi@milano-atelier.it",
        "phone": "+39 02 5555 0199",
        "sanctuary_slug": "riviera-maya",
        "room_tier": "Cenote & Botanical Ocean Villa",
        "clinical_profile": {
            "movement_experience": "Vinyasa & Yin Somatics",
            "health_notes": "Sensory overload from fashion market season. Seeking grounding parasympathetic recovery.",
            "intentions": "Cenote stillness, coastal grounding, mineral hydrotherapy, and organic plant-forward nutrition.",
            "passport_valid": "yes-valid-6mo",
            "nights": 6,
            "total_amount": 11400.0,
            "deposit_30": 3420.0,
            "balance_70": 7980.0
        },
        "flight_request": {
            "departure_airport": "MXP",
            "cabin_class": "business",
            "preferred_airline": "Air France / KLM",
            "travel_dates_flexible": False,
            "special_requests": "Arriving CUN, private luxury suburban transfer to Riviera Maya villa"
        },
        "status": "SYNCED_TO_TERN",
        "tern_contact_id": "tern_cnt_rossi_091",
        "tern_trip_id": "tern_trp_riviera_4412"
    }
]

SYNTHETIC_SUPPLIERS = [
    {
        "name": "Guanacaste Luxury Chauffeur Fleet",
        "category": "TRANSPORTATION_CHAUFFEUR",
        "sanctuary_slug": "nosara",
        "contact_name": "Carlos Morales (Operations Director)",
        "email": "dispatch@guanacaste-chauffeur.cr",
        "phone": "+506 2682-0199",
        "website": "https://guanacaste-luxury-transit.cr",
        "booking_url_or_code": "VIP-KAI-NOSARA-4WD",
        "commission_rate": 10.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Tern Native Client Card Auth",
        "lead_time_days": 3,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": "Premier executive chauffeur fleet operating late-model Chevrolet Suburbans and Mercedes Sprinters with terrain suspension, chilled hydration, and flight-monitored tarmac meet-and-greets at Liberia Airport (LIR).",
        "clinical_relevance": "Eliminates arrival stress and road vibration fatigue through professional air-suspension driving, preserving parasympathetic tone from the moment guests land.",
        "tern_sync_status": "SYNCED",
        "tern_deep_link": "https://app.tern.travel/suppliers/guanacaste-chauffeur-01"
    },
    {
        "name": "Amalfi Coast Exclusive Chauffeur & NCC Limousine",
        "category": "TRANSPORTATION_CHAUFFEUR",
        "sanctuary_slug": "amalfi",
        "contact_name": "Matteo Esposito",
        "email": "booking@amalfi-limousine-ncc.it",
        "phone": "+39 081 555-0911",
        "website": "https://amalfi-exclusive-ncc.it",
        "booking_url_or_code": "AMALFI-VIP-KAI",
        "commission_rate": 12.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Tern Native Client Card Auth",
        "lead_time_days": 5,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": "Luxury Mercedes-Benz V-Class and S-Class private chauffeur transit between Naples Airport (NAP) and Amalfi cliffside sanctuaries, including private Riva speedboat transfers from Sorrento.",
        "clinical_relevance": "Scenic coastal transit avoiding public ferry congestion, maintaining emotional calm and acoustic quietude along the Mediterranean route.",
        "tern_sync_status": "SYNCED",
        "tern_deep_link": "https://app.tern.travel/suppliers/amalfi-ncc-02"
    },
    {
        "name": "Grand Travel & Cruise VIP Air Desk & Cirium Tracker",
        "category": "AIR_CHARTER",
        "sanctuary_slug": "all",
        "contact_name": "Executive Air Desk (Funjet 500 Club)",
        "email": "airdesk@grandtravelcruise.com",
        "phone": "+1 (800) 555-GRND",
        "website": "https://grandtravelcruise.com",
        "booking_url_or_code": "GT-500CLUB-KAI",
        "commission_rate": 8.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Tern Direct Merchant Integration",
        "lead_time_days": 1,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": "25+ year host agency air desk providing negotiated lie-flat contracts on Delta One, United Polaris, Lufthansa, and Emirates, with real-time Cirium flight delay tracking and tarmac chauffeur alerts.",
        "clinical_relevance": "Guarantees lie-flat sleep architecture for long-haul guests, mitigating trans-meridian jet lag and circadian disruption.",
        "tern_sync_status": "SYNCED",
        "tern_deep_link": "https://app.tern.travel/suppliers/grand-travel-airdesk"
    },
    {
        "name": "Nosara Hearth Organic Culinary & Farm Kitchen",
        "category": "ORGANIC_CATERING",
        "sanctuary_slug": "nosara",
        "contact_name": "Chef Lucia Mendez",
        "email": "kitchen@nosara-hearth-organic.cr",
        "phone": "+506 2682-0455",
        "website": "https://nosara-hearth-organics.com",
        "booking_url_or_code": "HEARTH-KAI-COHORT",
        "commission_rate": 10.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Tern Native Client Card Auth",
        "lead_time_days": 7,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": "100% organic, regenerative Nicoya Blue Zone farm-to-table culinary curation. Dedicated allergen isolation (celiac-certified gluten-free, A2/dairy-free, anti-inflammatory prebiotics).",
        "clinical_relevance": "Nutritional medicine optimizing the gut-brain axis, stimulating natural acetylcholine release, and reducing systemic inflammatory markers during somatic down-regulation.",
        "tern_sync_status": "SYNCED",
        "tern_deep_link": "https://app.tern.travel/suppliers/nosara-hearth-03"
    },
    {
        "name": "Pacific Alchemy 432Hz Sound Bowls & Somatics",
        "category": "WELLNESS_SOMATIC",
        "sanctuary_slug": "nosara",
        "contact_name": "Aria Shen",
        "email": "aria@pacificalchemy-sound.com",
        "phone": "+506 8899-0122",
        "website": "https://pacificalchemy-sound.com",
        "booking_url_or_code": "ALCHEMY-432-KAI",
        "commission_rate": 15.0,
        "commission_type": "PERCENTAGE",
        "payment_terms": "Tern Native Client Card Auth",
        "lead_time_days": 4,
        "preferred_tier": "PREFERRED_PARTNER",
        "service_description": "Handcrafted pure quartz crystal singing bowls tuned precisely to 432Hz and 528Hz Solfeggio frequencies, providing bespoke binaural brainwave entrainment and acoustic sound baths.",
        "clinical_relevance": "Acoustic physical vibrations encourage alpha and theta brainwave synchronization, down-regulating sympathetic tone and deepening restorative non-REM sleep.",
        "tern_sync_status": "SYNCED",
        "tern_deep_link": "https://app.tern.travel/suppliers/pacific-alchemy-04"
    },
    {
        "name": "Clinica Medica de Urgencias Nosara (Paradise Medical)",
        "category": "MEDICAL_EMERGENCY",
        "sanctuary_slug": "nosara",
        "contact_name": "Dr. Alejandro Morales, MD",
        "email": "urgencias@nosaramedical.cr",
        "phone": "+506 2682-1212",
        "website": "https://nosaramedical.cr",
        "booking_url_or_code": "CLINICAL-KAI-CONCIERGE",
        "commission_rate": 0.0,
        "commission_type": "NON_COMMISSIONABLE",
        "payment_terms": "Direct Clinic Emergency Billing",
        "lead_time_days": 0,
        "preferred_tier": "VETTED_BACKUP",
        "service_description": "24/7 bilingual urgent care, diagnostic ultrasound, IV hydration, cardiac monitoring, and medical helipad evacuation protocols located 12 minutes from the KAI Nosara sanctuary.",
        "clinical_relevance": "Provides instant medical safety backing for guest peace of mind, overseen by Nurse Kareena Islam's clinical triage standards.",
        "tern_sync_status": "SYNCED",
        "tern_deep_link": "https://app.tern.travel/suppliers/nosara-medical-clinic"
    }
]

SYNTHETIC_LEADS = [
    {
        "business_name": "River Oaks Longevity & Functional Medicine",
        "category": "clinic",
        "contact_name": "Dr. Camille Vance, MD",
        "email": "dr.vance@riveroakslongevity.com",
        "phone": "+1 (713) 555-0918",
        "location": "Houston, TX",
        "website": "https://riveroakslongevity.com",
        "outreach_thesis": "Referral alliance for high-net-worth patients exhibiting executive adrenal exhaustion and sympathetic nervous burnout to KAI Nosara restorative cohorts.",
        "status": "PENDING_APPROVAL"
    },
    {
        "business_name": "South Congress Somatics & Sound Sanctuary",
        "category": "studio",
        "contact_name": "Julian Hayes",
        "email": "julian@soco-sound-atx.com",
        "phone": "+1 (512) 555-0322",
        "location": "Austin, TX",
        "website": "https://soco-sound-atx.com",
        "outreach_thesis": "Collaborative guest cohort pathway pairing Austin acoustic breathwork students with KAI intimate 12–14 guest ocean retreats.",
        "status": "PENDING_APPROVAL"
    },
    {
        "business_name": "Tribeca Restorative Neurology & Acupuncture",
        "category": "practitioner",
        "contact_name": "Elena Rostova, LAc",
        "email": "elena@tribeca-neurology.com",
        "phone": "+1 (212) 555-0844",
        "location": "New York, NY",
        "website": "https://tribeca-restorative.com",
        "outreach_thesis": "Clinical referral channel for high-stress Manhattan financial leaders requiring private villa sanctuary decompression and vagal tone restoration.",
        "status": "PENDING_APPROVAL"
    }
]

SYNTHETIC_CALENDAR_EVENTS = [
    {
        "title": "KAI Nosara Blue Zone Restorative Cohort (14 Guest Cap)",
        "sanctuary_slug": "nosara",
        "category": "COHORT",
        "start_time": datetime(2026, 11, 14, 9, 0),
        "end_time": datetime(2026, 11, 20, 18, 0),
        "location": "KAI Nosara Sacred Canopy, Costa Rica",
        "notes": "Full 6-night somatic immersion. Intimate 14-guest cap strictly enforced. Daily prana sun windows, 432Hz sound baths, and 4-7-8 vagal nerve reset."
    },
    {
        "title": "KAI Amalfi Coast Cliffside Stillness Retreat (12 Guest Cap)",
        "sanctuary_slug": "amalfi",
        "category": "COHORT",
        "start_time": datetime(2027, 5, 8, 9, 0),
        "end_time": datetime(2027, 5, 14, 18, 0),
        "location": "KAI Amalfi Coast Cliffside Sanctuary, Italy",
        "notes": "12-guest capacity. Mediterranean anti-inflammatory nutrition, coastal acoustic stillness, and private boat transfers."
    },
    {
        "title": "Pre-Call Consultation: Frank Lucas (3-Night Custom Nosara)",
        "sanctuary_slug": "nosara",
        "category": "CONSULTATION",
        "start_time": datetime.utcnow() + timedelta(days=1, hours=2),
        "end_time": datetime.utcnow() + timedelta(days=1, hours=2, minutes=20),
        "guest_name": "Frank Lucas",
        "location": "Zoom Telehealth / Tern VIP Audio Bridge",
        "notes": "Review 3-night restorative immersion, Private Ocean Canopy Villa, 30% Tern deposit ($1,710), and private tarmac transfer."
    },
    {
        "title": "Pre-Call Consultation: Eleanor Vance (Nosara Nervous System Reset)",
        "sanctuary_slug": "nosara",
        "category": "CONSULTATION",
        "start_time": datetime.utcnow() + timedelta(days=2, hours=4),
        "end_time": datetime.utcnow() + timedelta(days=2, hours=4, minutes=20),
        "guest_name": "Eleanor Vance",
        "location": "Zoom Telehealth / Tern VIP Audio Bridge",
        "notes": "Address corporate burnout, sleep restoration protocols, and private lie-flat air desk routing via Grand Travel."
    },
    {
        "title": "Flight Arrival: Sarah Jenkins (AA 1244 at LIR Airport)",
        "sanctuary_slug": "nosara",
        "category": "FLIGHT_ARRIVAL",
        "start_time": datetime(2026, 11, 14, 13, 45),
        "end_time": datetime(2026, 11, 14, 14, 30),
        "guest_name": "Sarah Jenkins",
        "location": "Liberia International Airport (LIR) VIP Tarmac",
        "notes": "Coordinated with Guanacaste Luxury Chauffeur Fleet. Chilled coconut water, gentle climate control, low-vibration 4WD route."
    }
]


def seed_all_synthetic_data(db: Session, force_reset: bool = False) -> Dict[str, Any]:
    """
    Seeds comprehensive, realistic synthetic test data across the entire KAI Sanctuary
    and Tern Sidecar database:
    - Guest Intakes (Frank Lucas, Eleanor Vance, Marcus Reed, Sarah Jenkins, etc.)
    - Preferred Vendors & Suppliers (Chauffeurs, Air Desks, Caterers, Sound Healers)
    - Partner Leads & Medical Referrals
    - Retreat Cohorts, Consultation Calls & Flight Arrivals
    - Curated Organic Dining Spots & Nature POIs
    - Somatic Guest Reflections & Reviews
    """
    logger.info("Seeding comprehensive synthetic test data into KAI database...")
    counts = {
        "intakes_created": 0,
        "suppliers_created": 0,
        "leads_created": 0,
        "calendar_events_created": 0,
        "dining_seeded": 0,
        "routes_seeded": 0,
        "reviews_seeded": 0
    }

    # 1. Base Knowledge, Routes, POIs, Dining, and Reviews
    seed_sanctuary_knowledge(db)
    seed_default_routes_and_pois_if_empty(db)
    seed_default_dining_if_empty(db)
    seed_default_reviews_if_empty(db)

    # 2. Synthetic Intakes
    for itk in SYNTHETIC_INTAKES:
        existing = db.query(StagingIntake).filter(StagingIntake.email == itk["email"]).first()
        if not existing:
            thesis = generate_pre_call_thesis(
                client_name=itk["client_name"],
                sanctuary_slug=itk["sanctuary_slug"],
                room_tier=itk["room_tier"],
                clinical_profile=itk["clinical_profile"],
                flight_request=itk.get("flight_request")
            )
            record = StagingIntake(
                source_ref=itk["source_ref"],
                client_name=itk["client_name"],
                email=itk["email"],
                phone=itk["phone"],
                sanctuary_slug=itk["sanctuary_slug"],
                room_tier=itk["room_tier"],
                clinical_profile=itk["clinical_profile"],
                flight_request=itk.get("flight_request"),
                consultation_thesis=thesis,
                status=itk["status"],
                tern_contact_id=itk.get("tern_contact_id"),
                tern_trip_id=itk.get("tern_trip_id"),
                synced_at=datetime.utcnow() if itk["status"] == "SYNCED_TO_TERN" else None
            )
            db.add(record)
            counts["intakes_created"] += 1

    # 3. Synthetic Preferred Suppliers
    for sup in SYNTHETIC_SUPPLIERS:
        existing = db.query(VendorSupplierRecord).filter(VendorSupplierRecord.name == sup["name"]).first()
        if not existing:
            record = VendorSupplierRecord(
                name=sup["name"],
                category=sup["category"],
                sanctuary_slug=sup["sanctuary_slug"],
                contact_name=sup["contact_name"],
                email=sup["email"],
                phone=sup["phone"],
                website=sup["website"],
                booking_url_or_code=sup["booking_url_or_code"],
                commission_rate=sup["commission_rate"],
                commission_type=sup["commission_type"],
                payment_terms=sup["payment_terms"],
                lead_time_days=sup["lead_time_days"],
                preferred_tier=sup["preferred_tier"],
                service_description=sup["service_description"],
                clinical_relevance=sup["clinical_relevance"],
                tern_sync_status=sup["tern_sync_status"],
                tern_deep_link=sup["tern_deep_link"]
            )
            db.add(record)
            counts["suppliers_created"] += 1

    # 4. Synthetic Partner Leads
    for lead in SYNTHETIC_LEADS:
        existing = db.query(StagedLead).filter(StagedLead.email == lead["email"]).first()
        if not existing:
            record = StagedLead(
                business_name=lead["business_name"],
                category=lead["category"],
                contact_name=lead["contact_name"],
                email=lead["email"],
                phone=lead["phone"],
                location=lead["location"],
                website=lead["website"],
                outreach_thesis=lead["outreach_thesis"],
                status=lead["status"]
            )
            db.add(record)
            counts["leads_created"] += 1

    # 5. Synthetic Calendar Events
    for ev in SYNTHETIC_CALENDAR_EVENTS:
        existing = db.query(CalendarEvent).filter(CalendarEvent.title == ev["title"]).first()
        if not existing:
            record = CalendarEvent(
                title=ev["title"],
                sanctuary_slug=ev.get("sanctuary_slug"),
                category=ev["category"],
                start_time=ev["start_time"],
                end_time=ev["end_time"],
                guest_name=ev.get("guest_name"),
                location=ev.get("location"),
                notes=ev.get("notes")
            )
            db.add(record)
            counts["calendar_events_created"] += 1

    db.commit()
    logger.info(f"Synthetic data seeding completed successfully: {counts}")
    return {
        "status": "success",
        "message": "Comprehensive synthetic test data seeded into database.",
        "counts": counts,
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    init_db()
    with SessionLocal() as session:
        res = seed_all_synthetic_data(session)
        print("SEEDING COMPLETE:", res)
