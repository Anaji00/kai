from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.sidecar.models import CuratedDiningSpot, generate_uuid_str


def search_dining_spots(
    db: Session,
    sanctuary_slug: Optional[str] = None,
    dietary_tags: Optional[List[str]] = None,
    cuisine_type: Optional[str] = None,
    max_distance_km: Optional[float] = None
) -> List[CuratedDiningSpot]:
    """
    Search curated sanctuary dining spots with multi-tag dietary filters.
    """
    query = db.query(CuratedDiningSpot)

    if sanctuary_slug and sanctuary_slug.upper() != "ALL":
        query = query.filter(CuratedDiningSpot.sanctuary_slug == sanctuary_slug.lower())

    if cuisine_type and cuisine_type.strip():
        query = query.filter(CuratedDiningSpot.cuisine_type.ilike(f"%{cuisine_type}%"))

    if max_distance_km:
        query = query.filter(CuratedDiningSpot.distance_from_villa_km <= max_distance_km)

    results = query.order_by(CuratedDiningSpot.distance_from_villa_km.asc()).all()

    # Filter in-memory for JSON dietary_tags
    if dietary_tags:
        filtered = []
        target_tags = set(t.lower() for t in dietary_tags)
        for spot in results:
            spot_tags = set(t.lower() for t in (spot.dietary_tags or []))
            if target_tags.issubset(spot_tags) or target_tags.intersection(spot_tags):
                filtered.append(spot)
        return filtered

    return results


def create_dining_spot(db: Session, data: Dict[str, Any]) -> CuratedDiningSpot:
    """
    Adds a newly discovered farm-to-table or wellness cafe to the sanctuary collection.
    """
    spot = CuratedDiningSpot(
        id=generate_uuid_str(),
        sanctuary_slug=data["sanctuary_slug"].lower(),
        name=data["name"],
        cuisine_type=data["cuisine_type"],
        dietary_tags=data.get("dietary_tags", []),
        distance_from_villa_km=data.get("distance_from_villa_km", 2.0),
        description=data["description"],
        nurse_notes=data.get("nurse_notes", "Soothing anti-inflammatory whole foods promoting gut health and deep sleep."),
        price_tier=data.get("price_tier", "$$$"),
        reservation_required=data.get("reservation_required", "CONCIERGE_HANDLED"),
        lat=data.get("lat"),
        lon=data.get("lon")
    )
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot


def seed_default_dining_if_empty(db: Session) -> None:
    """
    Seeds baseline curated dining spots across all 4 retreats if table is empty.
    """
    if db.query(CuratedDiningSpot).count() == 0:
        default_spots = [
            CuratedDiningSpot(
                id=generate_uuid_str(),
                sanctuary_slug="nosara",
                name="La Luna Oceanfront Herb Garden",
                cuisine_type="Organic Farm-to-Table & Mediterranean",
                dietary_tags=["Gluten-Free", "Dairy-Free", "Organic", "Anti-Inflammatory", "Fresh Catch"],
                distance_from_villa_km=1.8,
                description="Perched directly above the waves at Playa Pelada, offering organic produce from local Nicoya Blue Zone family farms and wild-caught sea bass.",
                nurse_notes="High in omega-3 fatty acids and polyphenol-rich olive oil; ideal for supporting cellular longevity and lowering systemic inflammation after morning yoga.",
                price_tier="$$$",
                reservation_required="CONCIERGE_HANDLED",
                lat=9.9830,
                lon=-85.6710
            ),
            CuratedDiningSpot(
                id=generate_uuid_str(),
                sanctuary_slug="nosara",
                name="LuvBurger Living Botanicals & Elixirs",
                cuisine_type="Blue Zone Plant-Forward & Adaptogen Bar",
                dietary_tags=["Gluten-Free", "Dairy-Free", "Low-FODMAP", "Plant-Forward", "Organic"],
                distance_from_villa_km=2.4,
                description="Lush garden cafe crafting raw sprouted bowls, cashew cultured cheeses, and soothing golden milk tonics infused with organic turmeric root.",
                nurse_notes="Enzyme-rich sprouted ingredients optimize digestive transit and reduce bloat without stressing the liver before evening sound baths.",
                price_tier="$$",
                reservation_required="NO",
                lat=9.9750,
                lon=-85.6620
            ),
            CuratedDiningSpot(
                id=generate_uuid_str(),
                sanctuary_slug="amalfi",
                name="Ristorante Da Gemma Lemon Grove Terrace",
                cuisine_type="Coastal Herbal Kitchen & Catch of the Day",
                dietary_tags=["Gluten-Free", "Organic", "Anti-Inflammatory", "Fresh Catch"],
                distance_from_villa_km=3.2,
                description="Historic cliffside terrace dining shaded by centenary lemon trees, featuring heirloom tomatoes and freshly harvested Tyrrhenian herbs.",
                nurse_notes="Fresh lemon bioflavonoids and antioxidant lycopene promote vascular relaxation and calm cardiovascular tone.",
                price_tier="$$$$",
                reservation_required="CONCIERGE_HANDLED",
                lat=40.6350,
                lon=14.6040
            ),
            CuratedDiningSpot(
                id=generate_uuid_str(),
                sanctuary_slug="bali",
                name="Moksa Permaculture Alchemy & Plant Kitchen",
                cuisine_type="Ayurvedic Farm-to-Table & Botanical Cuisine",
                dietary_tags=["Ayurvedic", "Gluten-Free", "Dairy-Free", "Plant-Forward", "Organic"],
                distance_from_villa_km=4.1,
                description="Set inside a working organic permaculture garden in Ubud, serving tridoshic meals prepared within hours of garden harvesting.",
                nurse_notes="Balances Vata and Pitta constitutional energies using warming digestive spices like ginger, cardamom, and fresh holy basil (tulsi).",
                price_tier="$$$",
                reservation_required="CONCIERGE_HANDLED",
                lat=-8.5020,
                lon=115.2480
            ),
            CuratedDiningSpot(
                id=generate_uuid_str(),
                sanctuary_slug="riviera-maya",
                name="Chaya Garden Mayan Herbal Sanctuary",
                cuisine_type="Ancient Mayan Plant Medicine & Organic Hearth",
                dietary_tags=["Gluten-Free", "Dairy-Free", "Organic", "Anti-Inflammatory"],
                distance_from_villa_km=3.8,
                description="Nestled in the lush jungle canopy of Tulum, crafting wood-fired dishes infused with medicinal chaya leaves, avocado leaf infusions, and stone-ground cacao.",
                nurse_notes="Chaya is revered for high iron, calcium, and chlorophyll content, replenishing vital energy reserves drained by executive fatigue.",
                price_tier="$$$",
                reservation_required="CONCIERGE_HANDLED",
                lat=20.2180,
                lon=-87.4590
            )
        ]
        db.add_all(default_spots)
        db.commit()
