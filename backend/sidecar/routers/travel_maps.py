import logging
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.sidecar.models import (
    SanctuaryRoute,
    SomaticPointOfInterest,
    GroundTransferRecord,
    DestinationReview,
    UploadedDocumentRecord,
    generate_uuid_str
)
from backend.models import ActionDraft
from backend.sidecar.schemas import (
    RouteCalculateRequest,
    SanctuaryRouteResponse,
    SomaticPointOfInterestResponse,
    WeatherForecastRequest,
    WeatherForecastResponse,
    DiningSearchRequest,
    CuratedDiningSpotResponse,
    CuratedDiningCreateRequest,
    AccommodationSearchRequest,
    DestinationReviewResponse,
    DestinationReviewCreateRequest,
    InboundReviewWebhookPayload,
    DestinationGuideResponse,
    GroundTransferResponse,
    GroundTransferDispatchWebhook,
    UploadedDocumentResponse
)
from backend.sidecar.services.geo_routing_service import (
    compute_custom_route,
    seed_default_routes_and_pois_if_empty
)
from backend.sidecar.services.weather_service import (
    fetch_sanctuary_weather,
    fetch_historical_weather_patterns,
    SANCTUARY_COORDS
)
from backend.sidecar.services.dining_service import (
    search_dining_spots,
    create_dining_spot,
    seed_default_dining_if_empty
)
from backend.sidecar.services.reviews_service import (
    get_sanctuary_reviews,
    process_inbound_review_webhook,
    seed_default_reviews_if_empty,
    analyze_somatic_sentiment
)
from backend.sidecar.services.destination_service import (
    get_destination_guide,
    update_destination_guide,
    seed_default_destination_guides_if_empty
)

logger = logging.getLogger("kai_travel_maps_router")

router = APIRouter(prefix="/travel", tags=["Travel Logistics & Dining"])


def normalize_sanctuary_slug(slug: Optional[str]) -> Optional[str]:
    """
    Normalizes catalog slugs, date suffixes, and aliases to canonical sanctuary identifiers.
    """
    if not slug or slug.upper() == "ALL":
        return None
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


# -----------------------------------------------------------------------------
# 1. Scenic Routes & Geodesic Navigation
# -----------------------------------------------------------------------------
@router.get("/routes", response_model=List[SanctuaryRouteResponse])
def get_sanctuary_routes(
    sanctuary_slug: Optional[str] = Query(None, description="Filter by sanctuary (puerto-vallarta, nosara, amalfi, bali, riviera-maya)"),
    db: Session = Depends(get_db)
):
    """
    List scenic travel routes connecting arrival airports to sanctuary villas.
    Automatically initializes defaults if empty.
    """
    seed_default_routes_and_pois_if_empty(db)
    query = db.query(SanctuaryRoute)
    norm_slug = normalize_sanctuary_slug(sanctuary_slug)
    if norm_slug:
        query = query.filter(SanctuaryRoute.sanctuary_slug == norm_slug)
    return query.all()


@router.post("/routes/calculate", response_model=SanctuaryRouteResponse)
def calculate_dynamic_route(
    req: RouteCalculateRequest,
    db: Session = Depends(get_db)
):
    """
    Computes terrain-adjusted geodesic distance, drive time, and luxury vehicle match.
    Persists newly calculated route to database.
    """
    result = compute_custom_route(
        origin_name=req.origin_name,
        origin_lat=req.origin_lat,
        origin_lon=req.origin_lon,
        dest_name=req.destination_name,
        dest_lat=req.destination_lat,
        dest_lon=req.destination_lon,
        sanctuary_slug=req.sanctuary_slug or "nosara",
        terrain=req.terrain_type or "COASTAL"
    )

    new_route = SanctuaryRoute(
        id=generate_uuid_str(),
        sanctuary_slug=result["sanctuary_slug"],
        origin_name=result["origin_name"],
        origin_lat=result["origin_lat"],
        origin_lon=result["origin_lon"],
        destination_name=result["destination_name"],
        destination_lat=result["destination_lat"],
        destination_lon=result["destination_lon"],
        distance_km=result["distance_km"],
        estimated_minutes=result["estimated_minutes"],
        scenic_description=result["scenic_description"],
        recommended_vehicle=result["recommended_vehicle"],
        road_conditions=result["road_conditions"],
        route_geometry=result.get("route_geometry", [])
    )
    db.add(new_route)
    db.commit()
    db.refresh(new_route)
    return new_route


@router.get("/points-of-interest", response_model=List[SomaticPointOfInterestResponse])
def get_points_of_interest(
    sanctuary_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List vagus nerve relaxing somatic points of interest (waterfalls, sacred springs, sunset bluffs).
    """
    seed_default_routes_and_pois_if_empty(db)
    query = db.query(SomaticPointOfInterest)
    norm_slug = normalize_sanctuary_slug(sanctuary_slug)
    if norm_slug:
        query = query.filter(SomaticPointOfInterest.sanctuary_slug == norm_slug)
    return query.all()


# -----------------------------------------------------------------------------
# 2. Live Sanctuary Weather & Microclimate
# -----------------------------------------------------------------------------
@router.get("/weather", response_model=WeatherForecastResponse)
async def get_sanctuary_weather(
    sanctuary_slug: str = Query("nosara", description="Sanctuary slug"),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None)
):
    """
    Fetches real-time microclimate weather from Open-Meteo with 15-min in-memory TTL caching.
    Provides nurse somatic guidance for sunbathing and breathwork.
    """
    slug = sanctuary_slug.lower()
    target_lat = lat
    target_lon = lon

    if target_lat is None or target_lon is None:
        coords = SANCTUARY_COORDS.get(slug, SANCTUARY_COORDS["nosara"])
        target_lat = coords["lat"]
        target_lon = coords["lon"]

    forecast = await fetch_sanctuary_weather(lat=target_lat, lon=target_lon, sanctuary_slug=slug)
    return WeatherForecastResponse(**forecast)


@router.post("/weather/forecast", response_model=WeatherForecastResponse)
async def get_sanctuary_weather_post(
    req: WeatherForecastRequest
):
    """
    POST variant for fetching real-time microclimate weather.
    """
    slug = req.sanctuary_slug.lower() if req.sanctuary_slug else "nosara"
    forecast = await fetch_sanctuary_weather(lat=req.lat, lon=req.lon, sanctuary_slug=slug)
    return WeatherForecastResponse(**forecast)


@router.get("/weather/historical")
async def get_sanctuary_historical_weather(
    sanctuary_slug: str = Query("puerto-vallarta", description="Sanctuary slug"),
    start_md: Optional[str] = Query(None, description="Start month-day e.g. 01-28"),
    end_md: Optional[str] = Query(None, description="End month-day e.g. 01-31"),
):
    """
    Fetches multi-year historical weather patterns (Open-Meteo ERA5 Reanalysis + 30-Year NOAA/ECMWF Climatology)
    for target retreat dates in the region.
    """
    return await fetch_historical_weather_patterns(
        sanctuary_slug=sanctuary_slug,
        start_md=start_md,
        end_md=end_md,
    )


# -----------------------------------------------------------------------------
# 3. Curated Organic & Blue Zone Dining
# -----------------------------------------------------------------------------
@router.get("/dining", response_model=List[CuratedDiningSpotResponse])
def get_curated_dining(
    sanctuary_slug: Optional[str] = Query(None),
    dietary_tag: Optional[List[str]] = Query(None),
    cuisine_type: Optional[str] = Query(None),
    max_distance_km: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Search farm-to-table and Ayurvedic dining spots with multi-tag dietary filters.
    """
    seed_default_dining_if_empty(db)
    return search_dining_spots(
        db=db,
        sanctuary_slug=sanctuary_slug,
        dietary_tags=dietary_tag,
        cuisine_type=cuisine_type,
        max_distance_km=max_distance_km
    )


@router.post("/dining", response_model=CuratedDiningSpotResponse)
def add_curated_dining_spot(
    req: CuratedDiningCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Registers a new organic or Blue Zone cafe into the sanctuary collection.
    """
    spot = create_dining_spot(db, req.model_dump())
    return spot


@router.post("/dining/search", response_model=List[CuratedDiningSpotResponse])
def search_dining_spots_post(
    req: DiningSearchRequest,
    db: Session = Depends(get_db)
):
    """
    POST variant to search farm-to-table dining spots with complex filters.
    """
    seed_default_dining_if_empty(db)
    return search_dining_spots(
        db=db,
        sanctuary_slug=req.sanctuary_slug,
        dietary_tags=req.dietary_tags,
        cuisine_type=req.cuisine_type,
        max_distance_km=req.max_distance_km
    )


# -----------------------------------------------------------------------------
# 4. Verified Guest Reflections & Somatic Reviews
# -----------------------------------------------------------------------------
@router.get("/reviews", response_model=List[DestinationReviewResponse])
def get_reviews(
    sanctuary_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves verified guest reviews with somatic sleep, quietude, and care scores.
    """
    seed_default_reviews_if_empty(db)
    return get_sanctuary_reviews(db=db, sanctuary_slug=sanctuary_slug)


@router.post("/reviews", response_model=DestinationReviewResponse)
def submit_review(
    req: DestinationReviewCreateRequest,
    db: Session = Depends(get_db)
):
    """
    Adds a verified review and scores deep sleep, acoustic quietude, and clinical attentiveness.
    """
    sleep_s, quiet_s, care_s, label = analyze_somatic_sentiment(req.review_text, req.overall_rating)
    rev = DestinationReview(
        id=generate_uuid_str(),
        sanctuary_slug=req.sanctuary_slug.lower(),
        guest_name=req.guest_name,
        stay_dates=req.stay_dates,
        overall_rating=req.overall_rating,
        deep_sleep_score=sleep_s,
        quietude_score=quiet_s,
        clinical_attentiveness_score=care_s,
        review_text=req.review_text,
        sentiment_label=label,
        source=req.source or "VERIFIED_GUEST",
        status="PENDING_REVIEW"
    )
    db.add(rev)

    # Stage ActionDraft for founder review before publication
    draft = ActionDraft(
        type="guest_reflection",
        guest_name=req.guest_name,
        content=(
            f"Submitted Guest Reflection ({req.sanctuary_slug.title()} Sanctuary):\n"
            f"Author: {req.guest_name} ({req.stay_dates}) | Rating: {req.overall_rating}★ ({label})\n"
            f"Scores: Deep Sleep {sleep_s}/100, Quietude {quiet_s}/100, Attentiveness {care_s}/100\n"
            f"Review: \"{req.review_text}\"\n\n"
            f"Approving this draft authorizes publishing this review to the live website."
        ),
        status="pending_review"
    )
    db.add(draft)

    db.commit()
    db.refresh(rev)
    return rev


@router.post("/reviews/webhook", response_model=DestinationReviewResponse)
def receive_review_webhook(
    payload: InboundReviewWebhookPayload,
    db: Session = Depends(get_db)
):
    """
    Inbound webhook for post-retreat survey reviews.
    """
    return process_inbound_review_webhook(db=db, payload=payload.model_dump())


@router.post("/destination-guide/{sanctuary_slug}", response_model=DestinationGuideResponse)
def update_sanctuary_guide(
    sanctuary_slug: str,
    data: dict,
    db: Session = Depends(get_db)
):
    """
    Updates the destination guide for a given sanctuary.
    """
    guide = update_destination_guide(db=db, sanctuary_slug=sanctuary_slug, data=data)
    if not guide:
        raise HTTPException(status_code=404, detail=f"Guide for {sanctuary_slug} not found.")
    return guide


# -----------------------------------------------------------------------------
# 5. Destination Dossier & Travel Compliance
# -----------------------------------------------------------------------------
@router.get("/destination-guide/{sanctuary_slug}", response_model=DestinationGuideResponse)
def get_sanctuary_guide(
    sanctuary_slug: str,
    db: Session = Depends(get_db)
):
    """
    Retrieves visa rules, temple etiquette, jet lag advice, and packing lists.
    """
    seed_default_destination_guides_if_empty(db)
    guide = get_destination_guide(db=db, sanctuary_slug=sanctuary_slug)
    if not guide:
        raise HTTPException(status_code=404, detail=f"Guide for {sanctuary_slug} not found.")
    return guide


# -----------------------------------------------------------------------------
# 6. Chauffeur Telemetry & Transfers
# -----------------------------------------------------------------------------
@router.get("/transfers", response_model=List[GroundTransferResponse])
def list_ground_transfers(
    sanctuary_slug: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    List private chauffeur tarmac meet-and-greets and villa transfers.
    """
    query = db.query(GroundTransferRecord)
    norm_slug = normalize_sanctuary_slug(sanctuary_slug)
    if norm_slug:
        query = query.filter(GroundTransferRecord.sanctuary_slug == norm_slug)
    transfers = query.order_by(GroundTransferRecord.pickup_time.asc()).all()

    # Seed an active chauffeur arrival if table has no transfers for this destination
    if not transfers:
        target_slug = norm_slug or "puerto-vallarta"
        if target_slug == "puerto-vallarta":
            mock_transfer = GroundTransferRecord(
                id=generate_uuid_str(),
                sanctuary_slug="puerto-vallarta",
                guest_name="Julian Sterling",
                pickup_location="Licenciado Gustavo Díaz Ordaz International Airport (PVR) Private FBO",
                dropoff_location="KAI Marival Harmony Sanctuary (Master Villa 1)",
                flight_number="DL 1928",
                pickup_time=datetime.now(timezone.utc),
                chauffeur_name="Mateo Morales (Grand Travel Chauffeur)",
                vehicle_type="Cadillac Escalade ESV VIP with Air-Ride Suspension",
                status="ARRIVED_AT_TARMAC",
                chilled_amenities=["Chilled Eucalyptus Towels", "Cold-Pressed Banderas Lime Elixir", "Trace-Mineral Water"]
            )
        else:
            mock_transfer = GroundTransferRecord(
                id=generate_uuid_str(),
                sanctuary_slug=target_slug,
                guest_name="Sarah Jenkins",
                pickup_location="Liberia Airport (LIR) Private Jet Terminal",
                dropoff_location="KAI Nosara Ocean Sanctuary (Villa 4)",
                flight_number="AA 1244",
                pickup_time=datetime.now(timezone.utc),
                chauffeur_name="Carlos Mendez (Lead Sanctuary Chauffeur)",
                vehicle_type="Luxury 4WD Suburban Executive",
                status="ARRIVED_AT_TARMAC",
                chilled_amenities=["Chilled Eucalyptus Towels", "Fresh Organic Young Coconut", "Air-Ride Suspension"]
            )
        db.add(mock_transfer)
        db.commit()
        db.refresh(mock_transfer)
        transfers = [mock_transfer]

    return transfers


@router.post("/transfers/webhook")
def update_transfer_status_webhook(
    payload: GroundTransferDispatchWebhook,
    db: Session = Depends(get_db)
):
    """
    Inbound webhook from ground transport partner updating chauffeur status.
    """
    transfer = db.query(GroundTransferRecord).filter(GroundTransferRecord.id == payload.transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer record not found.")

    transfer.status = payload.status
    if payload.chauffeur_notes:
        transfer.chauffeur_notes = payload.chauffeur_notes

    # If delay or route disruption is reported, stage ActionDraft for operations team
    if payload.status in ["DELAYED", "ISSUE_REPORTED"] or (payload.chauffeur_notes and any(w in payload.chauffeur_notes.lower() for w in ["delay", "traffic", "late", "flat", "detour"])):
        draft = ActionDraft(
            type="flight_delay_chauffeur_update",
            guest_name=transfer.guest_name,
            content=(
                f"Chauffeur Transfer Alert ({transfer.sanctuary_slug.title()} Fleet):\n"
                f"Guest: {transfer.guest_name} | Flight: {transfer.flight_number or 'Private Transit'}\n"
                f"Chauffeur: {transfer.chauffeur_name} ({transfer.vehicle_type})\n"
                f"Status: {payload.status} | Note: {payload.chauffeur_notes or 'Schedule adjustment flagged'}\n\n"
                f"Approving this draft alerts the sanctuary welcome desk and coordinates arrival timing adjustment."
            ),
            status="pending_review"
        )
        db.add(draft)

    db.commit()
    db.refresh(transfer)
    return {"status": "SUCCESS", "transfer_id": transfer.id, "new_status": transfer.status}


# -----------------------------------------------------------------------------
# 7. Uploaded Documents
# -----------------------------------------------------------------------------
@router.get("/documents", response_model=List[UploadedDocumentResponse])
def get_uploaded_documents(
    db: Session = Depends(get_db)
):
    """
    List parsed guest medical notes, flight confirmations, and intake documents.
    """
    return db.query(UploadedDocumentRecord).order_by(UploadedDocumentRecord.created_at.desc()).all()


# -----------------------------------------------------------------------------
# 8. Accommodations Search
# -----------------------------------------------------------------------------
@router.post("/accommodations/search")
def search_accommodations(req: AccommodationSearchRequest):
    """
    Search available sanctuary accommodations by tier and date.
    """
    return {
        "destination": req.destination or "Nosara",
        "available_tiers": [
            {"tier": "Private Ocean Canopy Villa", "price": 1900, "available": True},
            {"tier": "Sacred Garden Suite", "price": 1420, "available": True},
        ],
        "luxury_tier_requested": req.luxury_tier
    }
