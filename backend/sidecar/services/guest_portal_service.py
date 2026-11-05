"""
KAI Wellness Retreats - Guest Sanctuary Companion Service
Provides authenticated guest-facing portal data for confirmed travelers.
Magic-link token authentication: no passwords, no friction.

PRIVACY BOUNDARY: This service NEVER exposes clinical notes, internal operator
comments, internal CRM IDs, or financial calculations to the guest surface.
"""

import logging
import hashlib
import hmac
import secrets
import time
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import SessionLocal
from backend.sidecar.models import GuestPortalSession, GuestSomaticPulse, StagingIntake
from backend.sidecar.services.dining_service import normalize_sanctuary_slug
from backend.sidecar.services.weather_service import fetch_sanctuary_weather_sync
from backend.sidecar.services.automation_generators import (
    generate_guest_flight_update_draft,
    generate_culinary_refinement_draft,
)

logger = logging.getLogger("kai_guest_portal_service")

# In-memory token mirror for fast lookups
_GUEST_TOKENS: Dict[str, Dict[str, Any]] = {}

TOKEN_EXPIRY_HOURS = 72  # Magic links valid for 72 hours


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def generate_guest_magic_token(
    intake_id: str,
    client_name: str,
    email: str,
    sanctuary_slug: str,
    room_tier: str = "Private Villa Sanctuary",
    flight_request: Optional[Dict] = None,
    wellness_profile: Optional[Dict] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Generates a time-limited magic-link token for guest portal access.
    Persists session in SQLite DB (GuestPortalSession) across server reboots.
    Strict privacy boundary: zero internal clinical notes stored in session.
    """
    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)

    session_payload = {
        "intake_id": intake_id,
        "client_name": client_name,
        "email": email,
        "sanctuary_slug": sanctuary_slug,
        "room_tier": room_tier,
        "flight_request": flight_request or {},
        "wellness_profile": wellness_profile or {},
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _GUEST_TOKENS[token_hash] = session_payload

    # Persist in SQLite Database
    def _persist(s: Session):
        db_session = GuestPortalSession(
            token_hash=token_hash,
            intake_id=intake_id,
            client_name=client_name,
            email=email,
            sanctuary_slug=sanctuary_slug,
            room_tier=room_tier,
            flight_request=flight_request or {},
            wellness_profile=wellness_profile or {},
            expires_at=expires_at,
            created_at=datetime.now(timezone.utc),
        )
        s.add(db_session)
        s.commit()
        return db_session.id

    try:
        if db is not None:
            _persist(db)
        else:
            with SessionLocal() as local_db:
                _persist(local_db)
    except Exception as e:
        logger.warning(f"Database session persist note (in-memory active): {e}")

    portal_url = f"{settings.CORS_ORIGINS[0] if settings.CORS_ORIGINS else 'http://localhost:3000'}/my-retreat?token={raw_token}"

    logger.info(f"Generated guest magic token for {client_name} ({email}) — Sanctuary: {sanctuary_slug}")

    return {
        "token": raw_token,
        "portal_url": portal_url,
        "expires_at": expires_at.isoformat(),
        "guest_name": client_name,
        "sanctuary_slug": sanctuary_slug,
    }


def _guest_session_dict(rec: GuestPortalSession) -> Optional[Dict[str, Any]]:
    """Session payload for a stored row, or None when it has expired."""
    expires_at = rec.expires_at
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return None
    return {
        "id": rec.id,
        "intake_id": rec.intake_id,
        "client_name": rec.client_name,
        "email": rec.email,
        "sanctuary_slug": rec.sanctuary_slug,
        "room_tier": rec.room_tier,
        "flight_request": rec.flight_request or {},
        "wellness_profile": rec.wellness_profile or {},
        "expires_at": rec.expires_at.isoformat() if rec.expires_at else None,
    }


def load_guest_session_by_id(session_id: Optional[str], db: Session) -> Optional[Dict[str, Any]]:
    """Live, unrevoked guest session by id, used by the cookie-based guest guard."""
    if not session_id:
        return None
    rec = db.query(GuestPortalSession).filter(
        GuestPortalSession.id == session_id,
        GuestPortalSession.is_revoked == False,
    ).first()
    return _guest_session_dict(rec) if rec else None


def create_verified_guest_session(
    db: Session,
    guest_id: str,
    client_name: str,
    email: str,
    sanctuary_slug: str,
    room_tier: Optional[str],
    expires_at: datetime,
) -> GuestPortalSession:
    """Session row for a guest who proved ownership with a one-time code. Its token hash is never issued."""
    rec = GuestPortalSession(
        token_hash=_hash_token(secrets.token_urlsafe(48)),
        intake_id=guest_id,
        client_name=client_name,
        email=email,
        sanctuary_slug=sanctuary_slug,
        room_tier=room_tier or "Private Villa Sanctuary",
        flight_request={},
        wellness_profile={},
        expires_at=expires_at,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


def validate_guest_token(token: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
    """
    Validates a magic-link token and returns guest session data, or None if invalid/expired/revoked.
    Checks database first, falling back to memory mirror.
    """
    token_hash = _hash_token(token)

    def _query_db(s: Session):
        return s.query(GuestPortalSession).filter(
            GuestPortalSession.token_hash == token_hash,
            GuestPortalSession.is_revoked == False
        ).first()

    def _lookup(s: Session) -> Optional[Dict[str, Any]]:
        rec = _query_db(s)
        if not rec:
            return None
        session_data = _guest_session_dict(rec)
        if session_data:
            rec.last_accessed_at = datetime.now(timezone.utc)
            s.commit()
        return session_data

    try:
        if db is not None:
            return _lookup(db)
        with SessionLocal() as local_db:
            return _lookup(local_db)
    except Exception as e:
        # The database is authoritative; the memory mirror is only consulted when it is unreachable,
        # so a token revoked or expired in the DB can never be revived from another worker's cache.
        logger.warning(f"DB token lookup failed, using in-memory mirror: {e}")

    session = _GUEST_TOKENS.get(token_hash)
    if not session:
        return None

    expires_at = datetime.fromisoformat(session["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        del _GUEST_TOKENS[token_hash]
        return None

    return session


def revoke_guest_token(token_or_hash: str, db: Optional[Session] = None) -> bool:
    """Revokes a magic-link token immediately."""
    import re
    # SHA-256 hex hashes are exactly 64 lowercase hex characters.
    # secrets.token_urlsafe(48) also produces 64 chars but contains base64url chars (-, _)
    # which are not valid hex — use that to reliably distinguish raw tokens from hashes.
    _is_sha256_hex = len(token_or_hash) == 64 and bool(re.match(r'^[0-9a-f]{64}$', token_or_hash))
    token_hash = token_or_hash if _is_sha256_hex else _hash_token(token_or_hash)
    if token_hash in _GUEST_TOKENS:
        del _GUEST_TOKENS[token_hash]

    def _revoke(s: Session):
        rec = s.query(GuestPortalSession).filter(GuestPortalSession.token_hash == token_hash).first()
        if rec:
            rec.is_revoked = True
            s.commit()
            return True
        return False

    try:
        if db is not None:
            return _revoke(db)
        with SessionLocal() as local_db:
            return _revoke(local_db)
    except Exception as e:
        logger.warning(f"Failed to revoke token in DB: {e}")
        return False


# ──── Sanctuary Metadata (guest-safe, no internal operator data) ────

SANCTUARY_GUEST_DATA = {
    "puerto-vallarta": {
        "sanctuary_name": "Marival Harmony: Banderas Bay Somatic & Cultural Awakening",
        "destination": "Punta de Mita, Puerto Vallarta",
        "country": "Mexico",
        "dates": "January 28 – 31, 2027",
        "duration": "4 Days / 3 Nights",
        "gateway_airport": "PVR",
        "gateway_airport_name": "Puerto Vallarta International Airport",
        "transfer_vehicle": "Private coastal transfer",
        "transfer_duration": "About 45 minutes from PVR",
        "villa_name": "Marival Armony Luxury Resort & Suites, Punta de Mita",
        "check_in_time": "Confirmed in your welcome note",
        "check_out_time": "Confirmed in your welcome note",
        "emergency_clinic": "Your KAI nurse and the resort front desk will share local clinic details on arrival",
        "local_currency": "Mexican Peso (MXN) / USD widely accepted",
        "hero_image": "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1600&q=85",
        "daily_schedule": [
            {"time": "Jan 28", "activity": "Arrival, private transfer from PVR, sunset restorative Yin & cacao intention ceremony", "icon": "sunrise"},
            {"time": "Jan 29", "activity": "Sunrise vinyasa over Banderas Bay, founders seminar, Wixárika cultural integration & starlight sound bath", "icon": "yoga"},
            {"time": "Jan 30", "activity": "Coastal mobility & ocean immersion, culinary masterclass, 1-on-1 check-ins & farewell banquet", "icon": "waves"},
            {"time": "Jan 31", "activity": "Sunrise gratitude meditation, farewell brunch & private transfer to PVR", "icon": "leaf"},
        ],
        "packing_essentials": [
            "2–3 sets of breathable yoga & somatic movement attire",
            "A light cardigan, kimono, or wrap for evening sound baths & coastal breezes",
            "2 swimsuits for the pools, spa hydrotherapy & Banderas Bay immersion",
            "Reef-safe mineral sunscreen (SPF 30+), polarized sunglasses & wide-brim sun hat",
            "Supportive walking sandals and slip-on beach footwear",
            "Valid passport (6+ months validity) and a reusable insulated water bottle",
        ],
    },
    "nosara": {
        "sanctuary_name": "Canopy & Ocean Somatic Alignment",
        "destination": "Nosara, Guanacaste",
        "country": "Costa Rica",
        "dates": "Coming Soon • Dates to be confirmed",
        "duration": "7 Days / 6 Nights",
        "gateway_airport": "SJO / LIR",
        "gateway_airport_name": "Juan Santamaría International / Daniel Oduber Quirós",
        "transfer_vehicle": "Private 4WD Luxury Suburban",
        "transfer_duration": "~4.5 hours from SJO, ~2.5 hours from LIR",
        "villa_name": "KAI Canopy Estate, Playa Guiones",
        "check_in_time": "2:00 PM",
        "check_out_time": "11:00 AM",
        "emergency_clinic": "Nosara Medical Center (+506 2682-1212)",
        "local_currency": "Costa Rican Colón (CRC) / USD widely accepted",
        "hero_image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=85",
        "daily_schedule": [
            {"time": "6:15 AM", "activity": "Sunrise Pranayama on Guiones Beach", "icon": "sunrise"},
            {"time": "7:30 AM", "activity": "Organic Farm-to-Table Breakfast", "icon": "utensils"},
            {"time": "9:00 AM", "activity": "Anatomical Alignment Vinyasa with Kareena", "icon": "yoga"},
            {"time": "11:00 AM", "activity": "Clinical Wellness Workshop", "icon": "brain"},
            {"time": "12:30 PM", "activity": "Blue Zone Culinary Lunch", "icon": "leaf"},
            {"time": "2:00 PM", "activity": "Free Time: Surf Therapy / Spa / Hammock Rest", "icon": "waves"},
            {"time": "4:30 PM", "activity": "Restorative Yin & Myofascial Release", "icon": "moon"},
            {"time": "6:00 PM", "activity": "432Hz Crystal Singing Bowl Sound Bath", "icon": "music"},
            {"time": "7:30 PM", "activity": "Farm-to-Table Dinner Under the Canopy", "icon": "star"},
        ],
        "packing_essentials": [
            "Organic linen layers (light, breathable)",
            "Reef-safe mineral sunscreen (SPF 50+)",
            "Closed-toe sandals for forest trails",
            "Somatic eye pillow (provided in welcome kit)",
            "Journal & pen for reflection workshops",
            "Reusable water bottle (filtered water at villa)",
            "Rain jacket (tropical micro-showers)",
            "Swimwear for surf therapy & ocean immersion",
            "Earplugs & silk sleep mask for deep rest",
            "Comfortable movement clothes for yoga & breathwork",
        ],
    },
    "amalfi": {
        "sanctuary_name": "Mediterranean Longevity & Coastal Stillness",
        "destination": "Amalfi Coast, Campania",
        "country": "Italy",
        "dates": "Coming Soon • Dates to be confirmed",
        "duration": "7 Days / 6 Nights",
        "gateway_airport": "NAP",
        "gateway_airport_name": "Naples International Airport",
        "transfer_vehicle": "Private Mercedes S-Class",
        "transfer_duration": "~1.5 hours from Naples to Ravello",
        "villa_name": "KAI Cliffside Estate, Ravello",
        "check_in_time": "3:00 PM",
        "check_out_time": "10:00 AM",
        "emergency_clinic": "Ospedale Costa d'Amalfi (+39 089 8791)",
        "local_currency": "Euro (€)",
        "hero_image": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1600&q=85",
        "daily_schedule": [
            {"time": "7:00 AM", "activity": "Sea Breeze Pranayama on Terrace", "icon": "sunrise"},
            {"time": "8:00 AM", "activity": "Mediterranean Breakfast with Fresh Figs", "icon": "utensils"},
            {"time": "9:30 AM", "activity": "Alignment Yoga Overlooking the Tyrrhenian Sea", "icon": "yoga"},
            {"time": "11:00 AM", "activity": "Neuroplasticity & Longevity Seminar", "icon": "brain"},
            {"time": "12:30 PM", "activity": "Polyphenol-Rich Luncheon", "icon": "leaf"},
            {"time": "2:00 PM", "activity": "Free Time: Gozzo Boat / Spa / Lemon Terraces", "icon": "waves"},
            {"time": "4:30 PM", "activity": "Restorative Yin & Walking Meditation", "icon": "moon"},
            {"time": "6:00 PM", "activity": "Crystal Bowl Sound Bath at Sunset", "icon": "music"},
            {"time": "8:00 PM", "activity": "Chef's Coastal Longevity Dinner", "icon": "star"},
        ],
        "packing_essentials": [
            "Light linen trousers & breathable layers",
            "Comfortable walking shoes (cobblestone paths)",
            "Mineral sunscreen & wide-brim hat",
            "Light scarf or shawl for evening breezes",
            "Journal & pen for reflection workshops",
            "Swimwear for private boat excursion",
            "Elegant casual wear for dinners",
            "Silk sleep mask & lavender sachet",
            "Reusable water bottle",
            "EU travel adapter (Type C/F)",
        ],
    },
    "bali": {
        "sanctuary_name": "Deep Somatic Healing & Water Cleansing",
        "destination": "Ubud & Sidemen Valley",
        "country": "Indonesia",
        "dates": "Coming Soon • Dates to be confirmed",
        "duration": "9 Days / 8 Nights",
        "gateway_airport": "DPS",
        "gateway_airport_name": "Ngurah Rai International Airport, Denpasar",
        "transfer_vehicle": "Private Luxury Van with Balinese Guide",
        "transfer_duration": "~1.5 hours from DPS to Ubud",
        "villa_name": "KAI Ayung River Estate, Ubud",
        "check_in_time": "2:00 PM",
        "check_out_time": "11:00 AM",
        "emergency_clinic": "BIMC Hospital Ubud (+62 361 959911)",
        "local_currency": "Indonesian Rupiah (IDR) / USD accepted at major vendors",
        "hero_image": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=85",
        "daily_schedule": [
            {"time": "6:00 AM", "activity": "Sunrise Pranayama Facing the Ayung River", "icon": "sunrise"},
            {"time": "7:15 AM", "activity": "Tropical Organic Breakfast", "icon": "utensils"},
            {"time": "8:30 AM", "activity": "Somatic Grounding Flow with Kareena", "icon": "yoga"},
            {"time": "10:30 AM", "activity": "Sacred Water Ceremony / Clinical Workshop", "icon": "brain"},
            {"time": "12:30 PM", "activity": "Balinese Wellness Lunch", "icon": "leaf"},
            {"time": "2:00 PM", "activity": "Free Time: River Walk / Jamu Crafting / Spa", "icon": "waves"},
            {"time": "4:30 PM", "activity": "Trauma Release & Myofascial Yin", "icon": "moon"},
            {"time": "6:00 PM", "activity": "Full Chakra Sound Immersion in Bamboo Shala", "icon": "music"},
            {"time": "7:30 PM", "activity": "Plant-Based Fine Dining Under the Stars", "icon": "star"},
        ],
        "packing_essentials": [
            "Lightweight, modest clothing (for temple visits)",
            "Sarong (provided, but bring a personal one if preferred)",
            "Reef-safe sunscreen & insect repellent",
            "Comfortable closed-toe hiking sandals",
            "Rain poncho (tropical afternoon showers)",
            "Journal & pen for reflection workshops",
            "Swimwear for river & pool",
            "Silk sleep mask & somatic eye pillow",
            "Reusable water bottle (filtered water at villa)",
            "Personal medications in original packaging",
        ],
    },
    "riviera-maya": {
        "sanctuary_name": "Oceanfront Autonomic Reset",
        "destination": "Riviera Maya, Quintana Roo",
        "country": "Mexico",
        "dates": "Coming Soon • Dates to be confirmed",
        "duration": "4 Days / 3 Nights",
        "gateway_airport": "CUN",
        "gateway_airport_name": "Cancún International Airport",
        "transfer_vehicle": "Private VIP Suburban",
        "transfer_duration": "~45 minutes from CUN to El Dorado",
        "villa_name": "El Dorado Seaside Palms Luxury Suite",
        "check_in_time": "3:00 PM",
        "check_out_time": "12:00 PM",
        "emergency_clinic": "Hospiten Cancún (+52 998 881 3700)",
        "local_currency": "Mexican Peso (MXN) / USD widely accepted",
        "hero_image": "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1600&q=85",
        "daily_schedule": [
            {"time": "6:30 AM", "activity": "Sunrise Ocean Yoga on the Sand", "icon": "sunrise"},
            {"time": "7:45 AM", "activity": "Tropical Oceanfront Breakfast", "icon": "utensils"},
            {"time": "9:30 AM", "activity": "Dynamic Alignment Vinyasa", "icon": "yoga"},
            {"time": "11:00 AM", "activity": "Parasympathetic Activation Seminar", "icon": "brain"},
            {"time": "12:30 PM", "activity": "Caribbean Wellness Lunch", "icon": "leaf"},
            {"time": "2:00 PM", "activity": "Free Time: Beach / Spa / Pool", "icon": "waves"},
            {"time": "4:00 PM", "activity": "Breathwork for Anxiety Relief", "icon": "moon"},
            {"time": "5:30 PM", "activity": "Crystal Singing Bowl Sound Journey", "icon": "music"},
            {"time": "7:00 PM", "activity": "Oceanfront Sunset Dinner", "icon": "star"},
        ],
        "packing_essentials": [
            "Light resort-casual clothing",
            "Reef-safe sunscreen (SPF 50+)",
            "Comfortable sandals & beach flip-flops",
            "Swimwear (swim-up suite access)",
            "Journal & pen for reflection",
            "Silk sleep mask & earplugs",
            "Reusable water bottle",
            "Light cover-up for evening breezes",
            "Movement clothes for yoga sessions",
            "Personal medications in original packaging",
        ],
    },
}

BESPOKE_GUEST_DATA = {
    "sanctuary_name": "Your Bespoke KAI Retreat",
    "destination": "Details being finalized",
    "country": "",
    "dates": "Dates to be confirmed by your concierge",
    "duration": "",
    "gateway_airport": "your arrival airport",
    "gateway_airport_name": "To be confirmed",
    "transfer_vehicle": "Private transfer",
    "transfer_duration": "To be confirmed",
    "villa_name": "To be confirmed",
    "check_in_time": "To be confirmed",
    "check_out_time": "To be confirmed",
    "emergency_clinic": "Your KAI nurse will share local clinic details before arrival",
    "local_currency": "To be confirmed",
    "hero_image": SANCTUARY_GUEST_DATA["puerto-vallarta"]["hero_image"],
    "daily_schedule": [],
    "packing_essentials": [],
}


def get_guest_portal_data(token: Optional[str], db: Optional[Session] = None, guest_session: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    """
    Returns the full guest companion portal payload.
    Combines sanctuary metadata, live weather, flight info, and somatic schedule.
    Strips all internal/clinical/financial data.
    """
    session = guest_session or (validate_guest_token(token, db=db) if token else None)
    if not session:
        return None

    slug = normalize_sanctuary_slug(session.get("sanctuary_slug")) or ""
    # Never show one retreat's dates and logistics to a guest of another; bespoke trips get a neutral view.
    sanctuary = SANCTUARY_GUEST_DATA.get(slug) or BESPOKE_GUEST_DATA
    wellness = session.get("wellness_profile", {})
    flight = session.get("flight_request", {})

    # Fetch live weather. A bespoke trip has no confirmed location yet, so it shows none rather than another retreat's.
    weather = None
    if slug in SANCTUARY_GUEST_DATA:
        try:
            weather = fetch_sanctuary_weather_sync(slug)
            # The companion page reads these names; the weather service reports current_temp_c, humidity, conditions.
            weather = {
                **weather,
                "temperature_celsius": weather.get("current_temp_c"),
                "humidity_percent": weather.get("humidity"),
                "condition": weather.get("conditions"),
            }
        except Exception as e:
            logger.warning(f"Guest companion weather unavailable: {e}")

    # Build chauffeur info
    chauffeur = {
        "vehicle": sanctuary["transfer_vehicle"],
        "transfer_duration": sanctuary["transfer_duration"],
        "gateway_airport": sanctuary["gateway_airport"],
        "gateway_airport_name": sanctuary["gateway_airport_name"],
        "meeting_point": f"Exit arrivals at {sanctuary['gateway_airport']} — look for the KAI branded sign holder in a linen shirt.",
        "contact_note": "Your Grand Travel & Cruise concierge will send final driver details 48 hours before arrival.",
    }

    # Build flight summary (guest-safe)
    flight_summary = None
    if flight:
        flight_summary = {
            "departure_airport": flight.get("departure_airport", ""),
            "cabin_class": flight.get("cabin_class", "Business"),
            "preferred_airline": flight.get("preferred_airline", ""),
            "special_requests": flight.get("special_requests", ""),
            "status": "Your Grand Travel & Cruise Air Desk is coordinating your lie-flat seats. Final itinerary sent 72 hours before departure.",
        }

    return {
        "guest_name": session["client_name"],
        "sanctuary": sanctuary,
        "room_tier": session.get("room_tier", "Private Villa Sanctuary"),
        "weather": weather,
        "chauffeur": chauffeur,
        "flight": flight_summary,
        "packing_list": sanctuary["packing_essentials"],
        "daily_schedule": sanctuary["daily_schedule"],
        "wellness_focus": wellness.get("primary_focus", "Deep rest & nervous system recovery"),
        "wellness_intention": wellness.get("intention", "Restore circadian rhythm and parasympathetic tone."),
        "emergency_clinic": sanctuary["emergency_clinic"],
        "local_currency": sanctuary["local_currency"],
    }


def record_guest_somatic_pulse(
    token: Optional[str],
    guest_session: Optional[Dict[str, Any]] = None,
    *,
    day_number: int,
    phase: str,
    restorative_sleep_score: int,
    nervous_system_ease: int,
    vagal_tone_descriptor: Optional[str] = None,
    private_reflection_notes: Optional[str] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Records an in-stay subjective somatic pulse reported by a guest.
    Feeds directly into the Clinical Copilot briefing and 30-day continuity arcs.
    """
    session = guest_session or (validate_guest_token(token, db=db) if token else None)
    if not session:
        raise ValueError("Invalid or expired guest session token.")

    def _save_pulse(s: Session):
        pulse = GuestSomaticPulse(
            intake_id=session.get("intake_id"),
            guest_name=session.get("client_name", "Honored Guest"),
            sanctuary_slug=session.get("sanctuary_slug", "nosara"),
            day_number=day_number,
            phase=phase,
            restorative_sleep_score=max(1, min(10, restorative_sleep_score)),
            nervous_system_ease=max(1, min(10, nervous_system_ease)),
            vagal_tone_descriptor=vagal_tone_descriptor or "Serene & Receptive",
            private_reflection_notes=private_reflection_notes,
            recorded_at=datetime.now(timezone.utc),
        )
        s.add(pulse)
        s.commit()
        s.refresh(pulse)
        return {
            "id": pulse.id,
            "guest_name": pulse.guest_name,
            "day_number": pulse.day_number,
            "phase": pulse.phase,
            "restorative_sleep_score": pulse.restorative_sleep_score,
            "nervous_system_ease": pulse.nervous_system_ease,
            "vagal_tone_descriptor": pulse.vagal_tone_descriptor,
            "recorded_at": pulse.recorded_at.isoformat(),
        }

    if db is not None:
        return _save_pulse(db)
    with SessionLocal() as local_db:
        return _save_pulse(local_db)


def get_guest_somatic_pulses(intake_id: str, db: Optional[Session] = None) -> List[Dict[str, Any]]:
    """Returns all somatic pulses recorded for an intake cohort."""
    def _fetch(s: Session):
        pulses = s.query(GuestSomaticPulse).filter(GuestSomaticPulse.intake_id == intake_id).order_by(GuestSomaticPulse.day_number.asc()).all()
        return [
            {
                "id": p.id,
                "day_number": p.day_number,
                "phase": p.phase,
                "restorative_sleep_score": p.restorative_sleep_score,
                "nervous_system_ease": p.nervous_system_ease,
                "vagal_tone_descriptor": p.vagal_tone_descriptor,
                "notes": p.private_reflection_notes,
                "recorded_at": p.recorded_at.isoformat() if p.recorded_at else None,
            }
            for p in pulses
        ]

    if db is not None:
        return _fetch(db)
    with SessionLocal() as local_db:
        return _fetch(local_db)


def submit_guest_flight_update(
    token: Optional[str],
    guest_session: Optional[Dict[str, Any]] = None,
    *,
    flight_number: str,
    delay_minutes: int,
    gate: Optional[str] = None,
    notes: Optional[str] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Stages an ActionDraft for Grand Travel chauffeur recalibration when a guest reports a flight delay.
    Zero Autonomous Writes: routes strictly to review queue for Kareena's 1-click authorization.
    """
    session = guest_session or (validate_guest_token(token, db=db) if token else None)
    if not session:
        raise ValueError("Invalid or expired guest session token.")

    def _stage(s: Session):
        draft = generate_guest_flight_update_draft(
            db=s,
            guest_name=session["client_name"],
            flight_number=flight_number,
            delay_minutes=delay_minutes,
            gate=gate,
            notes=notes,
            phone=session.get("flight_request", {}).get("contact_phone"),
        )
        return {
            "status": "staged_for_review",
            "draft_id": draft.id,
            "message": f"Flight update received. Grand Travel concierge and Nurse Kareena have been notified.",
        }

    if db is not None:
        return _stage(db)
    with SessionLocal() as local_db:
        return _stage(local_db)


def submit_guest_dietary_update(
    token: Optional[str],
    guest_session: Optional[Dict[str, Any]] = None,
    *,
    dietary_tags: List[str],
    allergies: Optional[str] = None,
    special_chef_notes: Optional[str] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Stages an ActionDraft for executive chef culinary briefing.
    Zero Autonomous Writes: Nurse Kareena verifies before culinary profile is updated.
    """
    session = guest_session or (validate_guest_token(token, db=db) if token else None)
    if not session:
        raise ValueError("Invalid or expired guest session token.")

    def _stage(s: Session):
        draft = generate_culinary_refinement_draft(
            db=s,
            guest_name=session["client_name"],
            dietary_tags=dietary_tags,
            allergies=allergies,
            special_chef_notes=special_chef_notes,
        )
        return {
            "status": "staged_for_review",
            "draft_id": draft.id,
            "message": "Culinary refinements submitted. Nurse Kareena will brief the villa executive chef.",
        }

    if db is not None:
        return _stage(db)
    with SessionLocal() as local_db:
        return _stage(local_db)


def create_demo_guest_token(db: Optional[Session] = None) -> Dict[str, Any]:
    """Creates a demo token for development/preview purposes."""
    return generate_guest_magic_token(
        intake_id="demo_intake_001",
        client_name="Alexandra Chen",
        email="alexandra.chen@example.com",
        sanctuary_slug="nosara",
        room_tier="Private Villa Sanctuary",
        flight_request={
            "departure_airport": "LAX",
            "cabin_class": "Business Lie-Flat",
            "preferred_airline": "United Airlines",
            "special_requests": "Window seat, vegan meal",
        },
        wellness_profile={
            "primary_focus": "Deep nervous system rest & circadian recovery",
            "intention": "Restore sleep quality after 18 months of executive burnout.",
            "nutrition_preferences": "Plant-based, anti-inflammatory",
        },
        db=db,
    )
