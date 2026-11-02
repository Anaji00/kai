import math
import logging
import httpx
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.config import settings
from backend.sidecar.models import SanctuaryRoute, SomaticPointOfInterest, generate_uuid_str

logger = logging.getLogger("kai_geo_routing_service")


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate geodesic surface distance in kilometers using the Haversine formula.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def estimate_transit_time_and_vehicle(distance_km: float, terrain: str = "COASTAL") -> Dict[str, Any]:
    """
    Computes terrain-adjusted scenic drive time and matches luxury chauffeur transport.
    Language is tailored for serene luxury hospitality.
    """
    terrain_speeds = {
        "COASTAL": 55.0,   # Winding coastal roads
        "MOUNTAIN": 38.0,  # Cliffside curves & switchbacks
        "JUNGLE": 26.0,    # Unpaved rainforest canopy tracks
    }
    speed = terrain_speeds.get(terrain.upper(), 50.0)
    hours = distance_km / speed
    minutes = max(15, int(round(hours * 60)))

    if distance_km > 180:
        vehicle = "Private Cessna Caravan Charter (35-min aerial flight directly to sanctuary airstrip)"
        road_cond = "Private Aerial Airspace"
        scenic_desc = f"Direct private air charter soaring over ocean coastlines and jungle canopies, landing gently at the sanctuary strip ({minutes} min ground equivalent)."
    elif distance_km > 75:
        vehicle = "Luxury 4WD Suburban Executive (Active air-ride suspension, privacy glass, Wi-Fi)"
        road_cond = "Scenic Coastal & Jungle Highway"
        scenic_desc = f"Serene {minutes}-minute scenic drive through native canopy trees and ocean vistas with chilled eucalyptus towels and fresh coconut water on board."
    else:
        vehicle = "Mercedes-Benz Sprinter VIP Lounge (Reclining captain chairs, ambient acoustic sound bath)"
        road_cond = "Paved Sanctuary Byway"
        scenic_desc = f"Relaxing {minutes}-minute chauffeured ride through quiet coastal villages, setting a peaceful tone before arriving at your villa."

    return {
        "distance_km": distance_km,
        "estimated_minutes": minutes,
        "recommended_vehicle": vehicle,
        "road_conditions": road_cond,
        "scenic_description": scenic_desc
    }


def fetch_dynamic_road_route(
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    terrain: str = "COASTAL"
) -> Dict[str, Any]:
    """
    Queries official dynamic mapping APIs (OSRM, OpenRouteService, Mapbox, or Google)
    to calculate real turn-by-turn road distance, actual travel duration, and polyline coordinates.
    Falls back gracefully to geodesic calculation on network error.
    """
    provider = getattr(settings, "MAP_PROVIDER", "osrm").lower()
    geometry: List[List[float]] = []
    real_distance_km: Optional[float] = None
    real_minutes: Optional[int] = None

    # 1. Mapbox Directions API (if configured)
    if provider == "mapbox" and getattr(settings, "MAPBOX_ACCESS_TOKEN", ""):
        try:
            token = settings.MAPBOX_ACCESS_TOKEN
            url = (
                f"https://api.mapbox.com/directions/v5/mapbox/driving/"
                f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
                f"?geometries=geojson&overview=full&access_token={token}"
            )
            with httpx.Client(timeout=4.0) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    route = data["routes"][0]
                    real_distance_km = round(route["distance"] / 1000.0, 1)
                    real_minutes = max(15, int(round(route["duration"] / 60.0)))
                    # Mapbox returns [lon, lat] -> convert to [lat, lon] for Leaflet
                    geometry = [[pt[1], pt[0]] for pt in route["geometry"]["coordinates"]]
                    logger.info(f"Fetched Mapbox route: {real_distance_km} km, {real_minutes} min")
        except Exception as e:
            logger.warning(f"Mapbox API failed, falling back: {e}")

    # 2. OpenRouteService API (if configured)
    elif provider == "openrouteservice" and getattr(settings, "OPENROUTESERVICE_API_KEY", ""):
        try:
            headers = {"Authorization": settings.OPENROUTESERVICE_API_KEY}
            url = (
                f"https://api.openrouteservice.org/v2/directions/driving-car"
                f"?start={origin_lon},{origin_lat}&end={dest_lon},{dest_lat}"
            )
            with httpx.Client(timeout=4.0) as client:
                res = client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    feat = data["features"][0]
                    summary = feat["properties"]["summary"]
                    real_distance_km = round(summary["distance"] / 1000.0, 1)
                    real_minutes = max(15, int(round(summary["duration"] / 60.0)))
                    geometry = [[pt[1], pt[0]] for pt in feat["geometry"]["coordinates"]]
                    logger.info(f"Fetched ORS route: {real_distance_km} km, {real_minutes} min")
        except Exception as e:
            logger.warning(f"OpenRouteService API failed, falling back: {e}")

    # 3. Default: Official Public OSRM (Open Source Routing Machine)
    if real_distance_km is None:
        try:
            # OSRM public server: http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
            url = (
                f"https://router.project-osrm.org/route/v1/driving/"
                f"{origin_lon},{origin_lat};{dest_lon},{dest_lat}"
                f"?overview=full&geometries=geojson"
            )
            with httpx.Client(timeout=4.5) as client:
                res = client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if data.get("code") == "Ok" and data.get("routes"):
                        route = data["routes"][0]
                        real_distance_km = round(route["distance"] / 1000.0, 1)
                        real_minutes = max(15, int(round(route["duration"] / 60.0)))
                        geometry = [[round(pt[1], 5), round(pt[0], 5)] for pt in route["geometry"]["coordinates"]]
                        logger.info(f"Fetched OSRM road route: {real_distance_km} km, {real_minutes} min, {len(geometry)} points")
        except Exception as e:
            logger.warning(f"OSRM routing failed or timed out: {e}")

    # Fallback to geodesic Haversine calculation if offline or API unavailable
    if real_distance_km is None:
        dist_km = calculate_haversine_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        transit = estimate_transit_time_and_vehicle(dist_km, terrain)
        real_distance_km = transit["distance_km"]
        real_minutes = transit["estimated_minutes"]
        # Approximate 5-step interpolated line
        geometry = [
            [round(origin_lat + (dest_lat - origin_lat) * (i / 4.0), 5),
             round(origin_lon + (dest_lon - origin_lon) * (i / 4.0), 5)]
            for i in range(5)
        ]
        recommended_vehicle = transit["recommended_vehicle"]
        road_conditions = transit["road_conditions"]
        scenic_description = transit["scenic_description"]
    else:
        transit = estimate_transit_time_and_vehicle(real_distance_km, terrain)
        recommended_vehicle = transit["recommended_vehicle"]
        road_conditions = transit["road_conditions"]
        scenic_description = (
            f"Official road route ({real_distance_km} km &middot; ~{real_minutes} peaceful minutes). "
            f"{transit['scenic_description']}"
        )

    return {
        "distance_km": real_distance_km,
        "estimated_minutes": real_minutes,
        "route_geometry": geometry,
        "recommended_vehicle": recommended_vehicle,
        "road_conditions": road_conditions,
        "scenic_description": scenic_description
    }


def compute_custom_route(
    origin_name: str,
    origin_lat: float,
    origin_lon: float,
    dest_name: str,
    dest_lat: float,
    dest_lon: float,
    sanctuary_slug: str = "nosara",
    terrain: str = "COASTAL"
) -> Dict[str, Any]:
    """
    Computes dynamic road route between two points and returns client-friendly scenic travel details.
    """
    route_details = fetch_dynamic_road_route(
        origin_lat=origin_lat,
        origin_lon=origin_lon,
        dest_lat=dest_lat,
        dest_lon=dest_lon,
        terrain=terrain
    )
    return {
        "sanctuary_slug": sanctuary_slug,
        "origin_name": origin_name,
        "origin_lat": origin_lat,
        "origin_lon": origin_lon,
        "destination_name": dest_name,
        "destination_lat": dest_lat,
        "destination_lon": dest_lon,
        "distance_km": route_details["distance_km"],
        "estimated_minutes": route_details["estimated_minutes"],
        "route_geometry": route_details["route_geometry"],
        "scenic_description": route_details["scenic_description"],
        "recommended_vehicle": route_details["recommended_vehicle"],
        "road_conditions": route_details["road_conditions"]
    }


def seed_default_routes_and_pois_if_empty(db: Session) -> None:
    """
    Seeds baseline sanctuary routes and somatic nature points of interest across all retreats.
    Ensures Puerto Vallarta (2027 flagship) is always seeded even if other retreats exist.
    """
    existing_slugs = set(r.sanctuary_slug for r in db.query(SanctuaryRoute).all())
    
    routes_to_add = []
    if "puerto-vallarta" not in existing_slugs and "puerto-vallarta-2027" not in existing_slugs:
        routes_to_add.append(
            SanctuaryRoute(
                id=generate_uuid_str(),
                sanctuary_slug="puerto-vallarta",
                origin_name="Licenciado Gustavo Díaz Ordaz International Airport (PVR)",
                origin_lat=20.6801,
                origin_lon=-105.2542,
                destination_name="KAI Marival Harmony Sanctuary, Banderas Bay",
                destination_lat=20.7356,
                destination_lon=-105.3887,
                distance_km=28.4,
                estimated_minutes=35,
                scenic_description="Serene 35-minute coastal drive skirting Banderas Bay into Punta de Mita with panoramic Pacific ocean vistas, private tarmac greeting, and chilled coconut water on board.",
                recommended_vehicle="Mercedes-Benz Sprinter VIP Lounge or Luxury Suburban with Chilled Eucalyptus Towels",
                road_conditions="Paved Federal Coastal Highway",
                route_geometry=[
                    [20.6801, -105.2542],
                    [20.7010, -105.2950],
                    [20.7250, -105.3400],
                    [20.7356, -105.3887]
                ]
            )
        )
    if "nosara" not in existing_slugs:
        routes_to_add.append(
            SanctuaryRoute(
                id=generate_uuid_str(),
                sanctuary_slug="nosara",
                origin_name="Liberia International Airport (LIR)",
                origin_lat=10.5933,
                origin_lon=-85.5444,
                destination_name="KAI Nosara Ocean Sanctuary",
                destination_lat=9.9806,
                destination_lon=-85.6667,
                distance_km=114.8,
                estimated_minutes=135,
                scenic_description="Scenic 2-hour coastal drive through Guanacaste dry-forest hills and lush Nicoya Peninsula Blue Zone landscapes, concluding with an unpaved ocean canopy lane.",
                recommended_vehicle="Luxury 4WD Suburban Executive (Active air-ride suspension & chilled towels)",
                road_conditions="Paved Highway & Coastal Canopy Road",
                route_geometry=[
                    [10.5933, -85.5444],
                    [10.4500, -85.5200],
                    [10.3100, -85.5800],
                    [10.1500, -85.6200],
                    [9.9806, -85.6667]
                ]
            )
        )
    if "amalfi" not in existing_slugs:
        routes_to_add.append(
            SanctuaryRoute(
                id=generate_uuid_str(),
                sanctuary_slug="amalfi",
                origin_name="Naples Capodichino Airport (NAP)",
                origin_lat=40.8860,
                origin_lon=14.2908,
                destination_name="KAI Amalfi Cliffside Sanctuary",
                destination_lat=40.6340,
                destination_lon=14.6027,
                distance_km=62.4,
                estimated_minutes=75,
                scenic_description="Breathtaking 75-minute Mediterranean journey along the UNESCO World Heritage Amalfi Drive with panoramic Tyrrhenian sea vistas, or private Riva speedboat transfer.",
                recommended_vehicle="Mercedes-Benz Sprinter VIP Lounge or Private Twin-Engine Riva Speedboat",
                road_conditions="Paved Cliffside Coastal Highway",
                route_geometry=[
                    [40.8860, 14.2908],
                    [40.8200, 14.3800],
                    [40.7300, 14.4900],
                    [40.6340, 14.6027]
                ]
            )
        )
    if "bali" not in existing_slugs:
        routes_to_add.append(
            SanctuaryRoute(
                id=generate_uuid_str(),
                sanctuary_slug="bali",
                origin_name="Ngurah Rai International Airport (DPS)",
                origin_lat=-8.7482,
                origin_lon=115.1672,
                destination_name="KAI Bali Sacred Water Sanctuary",
                destination_lat=-8.5069,
                destination_lon=115.2625,
                distance_km=42.1,
                estimated_minutes=70,
                scenic_description="Relaxing 70-minute cultural drive ascending through sacred banyan groves, traditional artisan hamlets, and lush terraced rice fields in Ubud's healing highlands.",
                recommended_vehicle="Mercedes-Benz Executive Chauffeur with Cold Lemon Grass Mist",
                road_conditions="Paved Highland Byway",
                route_geometry=[
                    [-8.7482, 115.1672],
                    [-8.6800, 115.2100],
                    [-8.5800, 115.2400],
                    [-8.5069, 115.2625]
                ]
            )
        )
    if "riviera-maya" not in existing_slugs and "riviera_maya" not in existing_slugs:
        routes_to_add.append(
            SanctuaryRoute(
                id=generate_uuid_str(),
                sanctuary_slug="riviera-maya",
                origin_name="Cancún International Airport (CUN)",
                origin_lat=21.0365,
                origin_lon=-86.8770,
                destination_name="KAI Riviera Maya Jungle Sanctuary",
                destination_lat=20.2114,
                destination_lon=-87.4654,
                distance_km=118.0,
                estimated_minutes=85,
                scenic_description="Effortless 85-minute smooth highway transit beneath Caribbean palm lines to an exclusive jungle retreat bordering private sacred cenotes.",
                recommended_vehicle="Luxury 4WD Suburban Executive with Chilled Chlorophyll Elixirs",
                road_conditions="Paved Federal Highway",
                route_geometry=[
                    [21.0365, -86.8770],
                    [20.7500, -87.0500],
                    [20.4500, -87.2500],
                    [20.2114, -87.4654]
                ]
            )
        )
    if routes_to_add:
        db.add_all(routes_to_add)
        db.commit()

    # Seed POIs ensuring Puerto Vallarta is represented
    existing_poi_slugs = set(p.sanctuary_slug for p in db.query(SomaticPointOfInterest).all())
    pois_to_add = []
    if "puerto-vallarta" not in existing_poi_slugs and "puerto-vallarta-2027" not in existing_poi_slugs:
        pois_to_add.extend([
            SomaticPointOfInterest(
                id=generate_uuid_str(),
                sanctuary_slug="puerto-vallarta",
                name="Marival Harmony Melange Spa Hydrotherapy Circuit",
                category="HOT_SPRINGS",
                lat=20.7356,
                lon=-105.3887,
                description="Thermal hydrotherapy contrast circuit with vitality vitality pools, steam grotto, and oceanview acoustic serenity.",
                vagus_nerve_benefit="Vagus nerve stimulation: Alternating thermal and ocean-mineral immersion stimulates autonomic tone and accelerates post-flight cellular decompression.",
                ideal_visiting_time="Afternoon (2:00 PM – 4:30 PM)"
            ),
            SomaticPointOfInterest(
                id=generate_uuid_str(),
                sanctuary_slug="puerto-vallarta",
                name="Banderas Bay Humpback Whale Observation Bluff",
                category="SUNSET_BLUFF",
                lat=20.7310,
                lon=-105.3920,
                description="Quiet elevated coastal headland overlooking Banderas Bay with migrating humpback whale pods in late January.",
                vagus_nerve_benefit="Vagus nerve stimulation: Expansive natural horizon viewing down-regulates visual stress and initiates pineal melatonin release at twilight.",
                ideal_visiting_time="Twilight Golden Hour (5:15 PM – 6:15 PM)"
            ),
            SomaticPointOfInterest(
                id=generate_uuid_str(),
                sanctuary_slug="puerto-vallarta",
                name="Wixárika (Huichol) Ancestral Cacao & Copal Circle",
                category="SACRED_WATER",
                lat=20.7380,
                lon=-105.3850,
                description="Indigenous ceremonial pavilion under native parota trees, honoring ancestral Jalisco storytelling and raw ceremonial cacao.",
                vagus_nerve_benefit="Vagus nerve stimulation: Copal resin aromatherapeutics and communal somatic chanting stimulate the ventral vagal social engagement system.",
                ideal_visiting_time="Morning Awakening (7:00 AM – 8:30 AM)"
            )
        ])
    if "nosara" not in existing_poi_slugs:
        pois_to_add.extend([
            SomaticPointOfInterest(
                id=generate_uuid_str(),
                sanctuary_slug="nosara",
                name="Mala Noche Secret Waterfall",
                category="WATERFALL",
                lat=9.9880,
                lon=-85.6420,
                description="Secluded freshwater basin enveloped by virgin jungle canopy and singing cicadas.",
                vagus_nerve_benefit="Vagus nerve stimulation: Stimulates vagus nerve activation via the mammalian dive reflex, immediately lowering heart rate and down-regulating sympathetic overdrive.",
                ideal_visiting_time="Early Morning (Gentle Sun & High Negative Ions)"
            ),
            SomaticPointOfInterest(
                id=generate_uuid_str(),
                sanctuary_slug="nosara",
                name="Playa Pelada Sunset Meditation Bluff",
                category="SUNSET_BLUFF",
                lat=9.9833,
                lon=-85.6720,
                description="Gentle coastal promontory offering 180-degree unobstructed Pacific horizon views.",
                vagus_nerve_benefit="Vagus nerve stimulation: Activates vagus nerve parasympathetic pathways; viewing natural sunset amber wavelengths signals pineal melatonin production, restoring disrupted circadian sleep rhythms.",
                ideal_visiting_time="Twilight (5:15 PM - 6:00 PM)"
            )
        ])
    if pois_to_add:
        db.add_all(pois_to_add)
        db.commit()

    # Ensure all POIs contain vagus nerve keyword
    for poi in db.query(SomaticPointOfInterest).all():
        if "vagus" not in poi.vagus_nerve_benefit.lower():
            poi.vagus_nerve_benefit = f"Vagus nerve stimulation: {poi.vagus_nerve_benefit}"
    db.commit()
