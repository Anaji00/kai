import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.sidecar.schemas import CalendarEventCreate, CalendarEventResponse
from backend.sidecar.services.calendar_service import (
    get_all_calendar_events,
    create_calendar_event,
    generate_ical_feed
)

logger = logging.getLogger("kai_calendar_router")

router = APIRouter(prefix="/calendar", tags=["Retreat Calendar"])


@router.get("/events", response_model=List[CalendarEventResponse])
def list_calendar_events(
    sanctuary_slug: Optional[str] = Query(None, description="Filter by sanctuary slug or ALL"),
    category: Optional[str] = Query(None, description="Filter by event category (COHORT, CONSULTATION, FLIGHT_ARRIVAL)"),
    db: Session = Depends(get_db)
):
    """
    Returns aggregated retreat calendar events spanning:
    - 6-day intimate retreat cohort dates
    - 20-minute client alignment consultations
    - Smart Flight arrivals and tarmac transfers (Cirium)
    """
    try:
        events = get_all_calendar_events(db=db, sanctuary_slug=sanctuary_slug, category=category)
        return events
    except Exception as e:
        logger.error(f"Failed to fetch calendar events: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to load calendar: {str(e)}")


@router.post("/events", response_model=CalendarEventResponse)
def add_calendar_event(
    req: CalendarEventCreate,
    db: Session = Depends(get_db)
):
    """
    Creates a new custom calendar event (e.g. 20-minute consultation or somatic block).
    """
    try:
        start_dt = datetime.fromisoformat(req.start_time.replace("Z", "+00:00"))
        end_dt = datetime.fromisoformat(req.end_time.replace("Z", "+00:00"))

        event = create_calendar_event(
            db=db,
            title=req.title,
            category=req.category,
            start_time=start_dt,
            end_time=end_dt,
            sanctuary_slug=req.sanctuary_slug,
            guest_name=req.guest_name,
            location=req.location,
            notes=req.notes,
            intake_id=req.intake_id
        )

        return CalendarEventResponse(
            id=event.id,
            title=event.title,
            sanctuary_slug=event.sanctuary_slug,
            category=event.category,
            start_time=event.start_time.isoformat(),
            end_time=event.end_time.isoformat(),
            guest_name=event.guest_name,
            location=event.location,
            notes=event.notes,
            intake_id=event.intake_id
        )
    except Exception as e:
        logger.error(f"Failed to create calendar event: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Invalid event data: {str(e)}")


@router.get("/feed.ics")
def get_calendar_ics_feed(
    sanctuary_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    RFC 5545 compliant iCalendar feed (.ics) for 1-click subscription into Apple Calendar,
    Google Calendar, or Outlook.
    """
    events = get_all_calendar_events(db=db, sanctuary_slug=sanctuary_slug)
    ics_content = generate_ical_feed(events)
    return Response(
        content=ics_content,
        media_type="text/calendar; charset=utf-8",
        headers={"Content-Disposition": "inline; filename=kai_retreat_calendar.ics"}
    )
