import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.sidecar.models import (
    SanctuaryRoute,
    SomaticPointOfInterest,
    GroundTransferRecord,
    CuratedDiningSpot,
    DestinationReview,
    DestinationGuide,
    UploadedDocumentRecord,
    generate_uuid_str
)
from backend.sidecar.schemas import (
    RouteCalculateRequest,
    SanctuaryRouteResponse,
    SomaticPointOfInterestResponse,
    WeatherForecastResponse,
    DiningSearchRequest,
    CuratedDiningSpotResponse,
    CuratedDiningCreateRequest,
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


# -----------------------------------------------------------------------------
# 1. Scenic Routes & Geodesic Navigation
# -----------------------------------------------------------------------------
@router.get("/routes", response_model=List[SanctuaryRouteResponse])
def get_sanctuary_routes(
    sanctuary_slug: Optional[str] = Query(None, description="Filter by sanctuary (nosara, amalfi, bali, riviera-maya)"),
    db: Session = Depends(get_db)
):
    """
    List scenic travel routes connecting arrival airports to sanctuary villas.
    Automatically initializes defaults if empty.
    """
    seed_default_routes_and_pois_if_empty(db)
    query = db.query(SanctuaryRoute)
    if sanctuary_slug and sanctuary_slug.upper() != "ALL":
        query = query.filter(SanctuaryRoute.sanctuary_slug == sanctuary_slug.lower())
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
    if sanctuary_slug and sanctuary_slug.upper() != "ALL":
        query = query.filter(SomaticPointOfInterest.sanctuary_slug == sanctuary_slug.lower())
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
        status="PUBLISHED"
    )
    db.add(rev)
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
    if sanctuary_slug and sanctuary_slug.upper() != "ALL":
        query = query.filter(GroundTransferRecord.sanctuary_slug == sanctuary_slug.lower())
    transfers = query.order_by(GroundTransferRecord.pickup_time.asc()).all()

    # Seed an active chauffeur arrival if table is empty
    if not transfers:
        mock_transfer = GroundTransferRecord(
            id=generate_uuid_str(),
            sanctuary_slug="nosara",
            guest_name="Sarah Jenkins",
            pickup_location="Liberia Airport (LIR) Private Jet Terminal",
            dropoff_location="KAI Nosara Ocean Sanctuary (Villa 4)",
            flight_number="AA 1244",
            pickup_time=datetime.utcnow(),
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
        transfer.dropoff_location += f" (Note: {payload.chauffeur_notes})"
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
