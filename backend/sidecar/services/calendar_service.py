import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.sidecar.models import CalendarEvent, StagingIntake
from backend.config import settings

logger = logging.getLogger("kai_calendar_service")

STATIC_COHORTS = [
    {
        "id": "cohort_nosara_2027",
        "title": "Nosara Canopy & Ocean Somatic Alignment",
        "sanctuary_slug": "nosara",
        "category": "COHORT",
        "start_time": "2027-02-18T14:00:00Z",
        "end_time": "2027-02-24T11:00:00Z",
        "location": "Playa Guiones & Sacred Jungle Canopy, Nosara, Costa Rica",
        "notes": "14 guests max. Private villa buyout with Grand Travel & Cruise VIP tarmac transfer."
    },
    {
        "id": "cohort_amalfi_2027",
        "title": "Amalfi Cliffside Stillness & Coastal Restoration",
        "sanctuary_slug": "amalfi",
        "category": "COHORT",
        "start_time": "2027-05-12T15:00:00Z",
        "end_time": "2027-05-18T10:00:00Z",
        "location": "Ravello & Positano Coastline, Italy",
        "notes": "12 guests max. Historic clifftop villa, Mediterranean botanical apothecary."
    },
    {
        "id": "cohort_bali_2027",
        "title": "Bali Sacred Water & Cellular Healing Sanctuary",
        "sanctuary_slug": "bali",
        "category": "COHORT",
        "start_time": "2027-09-08T14:00:00Z",
        "end_time": "2027-09-14T11:00:00Z",
        "location": "Ubud & Sidemen Valley, Bali",
        "notes": "14 guests max. Tirta Empul purification & rainforest sound temple."
    },
    {
        "id": "cohort_riviera_2026",
        "title": "Riviera Maya Sacred Cenote & Somatic Grounding",
        "sanctuary_slug": "riviera-maya",
        "category": "COHORT",
        "start_time": "2026-11-05T15:00:00Z",
        "end_time": "2026-11-11T11:00:00Z",
        "location": "Mayan Jungle & Private Cenote, Mexico",
        "notes": "12 guests max. Ancestral copal ceremony & acoustic water healing."
    }
]


def get_all_calendar_events(
    db: Session,
    sanctuary_slug: Optional[str] = None,
    category: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Synthesizes calendar events across cohort dates, scheduled consultations,
    flight arrivals, and circadian somatic blocks.
    """
    events: List[Dict[str, Any]] = list(STATIC_COHORTS)

    # Fetch DB custom events
    query = db.query(CalendarEvent)
    if sanctuary_slug and sanctuary_slug != "ALL":
        query = query.filter(CalendarEvent.sanctuary_slug == sanctuary_slug)
    if category and category != "ALL":
        query = query.filter(CalendarEvent.category == category)
    
    db_events = query.all()
    for e in db_events:
        events.append({
            "id": e.id,
            "title": e.title,
            "sanctuary_slug": e.sanctuary_slug,
            "category": e.category,
            "start_time": e.start_time.isoformat() if hasattr(e.start_time, "isoformat") else str(e.start_time),
            "end_time": e.end_time.isoformat() if hasattr(e.end_time, "isoformat") else str(e.end_time),
            "guest_name": e.guest_name,
            "location": e.location,
            "notes": e.notes,
            "intake_id": e.intake_id
        })

    # Add sample consultations and flight arrivals if none in DB
    if not any(ev.get("category") == "CONSULTATION" for ev in events):
        now = datetime.utcnow()
        consult_time_1 = (now + timedelta(days=1)).replace(hour=14, minute=0, second=0)
        consult_time_2 = (now + timedelta(days=2)).replace(hour=16, minute=30, second=0)
        
        events.append({
            "id": "consult_demo_01",
            "title": "20-Min Alignment Call: Sarah Jenkins",
            "sanctuary_slug": "nosara",
            "category": "CONSULTATION",
            "start_time": consult_time_1.isoformat(),
            "end_time": (consult_time_1 + timedelta(minutes=20)).isoformat(),
            "guest_name": "Sarah Jenkins",
            "location": "Google Meet / Phone (+1 713-555-0192)",
            "notes": "Review insomnia, elevated evening cortisol, and cold plunge hesitation."
        })
        events.append({
            "id": "consult_demo_02",
            "title": "20-Min Alignment Call: Eleanor Vance",
            "sanctuary_slug": "nosara",
            "category": "CONSULTATION",
            "start_time": consult_time_2.isoformat(),
            "end_time": (consult_time_2 + timedelta(minutes=20)).isoformat(),
            "guest_name": "Eleanor Vance",
            "location": "Phone (+1 415-555-0144)",
            "notes": "Discuss private villa sanctuary suite and lie-flat flight from ORD."
        })

    # Add Smart Flight arrival blocks
    if not any(ev.get("category") == "FLIGHT_ARRIVAL" for ev in events):
        arrival_time = datetime(2027, 2, 18, 13, 45)
        events.append({
            "id": "flight_arr_01",
            "title": "VIP Flight Arrival: DL 1928 (MIA -> LIR)",
            "sanctuary_slug": "nosara",
            "category": "FLIGHT_ARRIVAL",
            "start_time": arrival_time.isoformat(),
            "end_time": (arrival_time + timedelta(hours=1)).isoformat(),
            "guest_name": "Sarah Jenkins & Eleanor Vance",
            "location": "Liberia Guanacaste Airport (LIR)",
            "notes": "Grand Travel Flight Desk tracking active (Cirium). Chauffeur waiting with chilled adaptogenic elixirs."
        })

    # Filter in-memory if needed
    if sanctuary_slug and sanctuary_slug != "ALL":
        events = [e for e in events if e.get("sanctuary_slug") == sanctuary_slug]
    if category and category != "ALL":
        events = [e for e in events if e.get("category") == category]

    return events


def create_calendar_event(
    db: Session,
    title: str,
    category: str,
    start_time: datetime,
    end_time: datetime,
    sanctuary_slug: Optional[str] = None,
    guest_name: Optional[str] = None,
    location: Optional[str] = None,
    notes: Optional[str] = None,
    intake_id: Optional[str] = None
) -> CalendarEvent:
    event = CalendarEvent(
        title=title,
        sanctuary_slug=sanctuary_slug,
        category=category,
        start_time=start_time,
        end_time=end_time,
        guest_name=guest_name,
        location=location,
        notes=notes,
        intake_id=intake_id
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    logger.info(f"Created calendar event: '{title}' ({category})")
    return event


def generate_ical_feed(events: List[Dict[str, Any]]) -> str:
    """
    Generates an RFC 5545 compliant iCalendar (.ics) feed string.
    """
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//KAI Wellness Retreats//Founder Calendar 1.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:KAI Sanctuary Studio Calendar",
        "X-WR-TIMEZONE:UTC",
    ]

    for e in events:
        start_dt = datetime.fromisoformat(e["start_time"].replace("Z", "+00:00")) if isinstance(e["start_time"], str) else e["start_time"]
        end_dt = datetime.fromisoformat(e["end_time"].replace("Z", "+00:00")) if isinstance(e["end_time"], str) else e["end_time"]
        
        dtstart = start_dt.strftime("%Y%m%dT%H%M%SZ")
        dtend = end_dt.strftime("%Y%m%dT%H%M%SZ")
        summary = e.get("title", "KAI Sanctuary Event").replace(",", "\\,").replace(";", "\\;")
        description = (e.get("notes", "") or "").replace("\n", " ").replace(",", "\\,").replace(";", "\\;")
        location = (e.get("location", "") or "").replace(",", "\\,").replace(";", "\\;")

        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{e.get('id', 'event')}@kaiwellnessretreats.com",
            f"DTSTAMP:{datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')}",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            f"LOCATION:{location}",
            f"CATEGORIES:{e.get('category', 'RETREAT')}",
            "STATUS:CONFIRMED",
            "END:VEVENT"
        ])

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)
