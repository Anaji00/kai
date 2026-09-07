import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger("kai_hospitality_client")

# Curated pre/post-retreat luxury hospitality inventory near sanctuary gateways
CURATED_GATEWAY_HOTELS = [
    {
        "id": "hotel_sjo_01",
        "gateway": "sjo",
        "gateway_name": "San Jose, Costa Rica (SJO)",
        "name": "Finca Rosa Blanca Coffee Plantation Resort & Inn",
        "stars": 5,
        "luxury_tier": "Boutique Eco-Luxury",
        "nightly_rate_usd": 395,
        "distance_to_airport": "15 mins to SJO",
        "sanctuary_proximity": "Ideal for overnight before private morning transfer to Nosara",
        "amenities": ["Organic Coffee Farm", "Chemical-free Springfed Pool", "Farm-to-Table Dining", "Spa Treatments"],
        "hero_image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
        "provider": "Expedia EPS Rapid",
        "affiliate_url": "https://www.expedia.com/San-Jose-Hotels-Finca-Rosa-Blanca.h12345"
    },
    {
        "id": "hotel_lir_01",
        "gateway": "lir",
        "gateway_name": "Liberia Guanacaste (LIR)",
        "name": "Andaz Costa Rica Resort at Peninsula Papagayo",
        "stars": 5,
        "luxury_tier": "Ultra-Luxury Waterfront",
        "nightly_rate_usd": 750,
        "distance_to_airport": "30 mins to LIR",
        "sanctuary_proximity": "Direct scenic coastal drive to Nosara / Guiones",
        "amenities": ["Onda Spa", "Adults-Only Saltwater Pool", "Private Beach House", "Mixology & Ceviche Bar"],
        "hero_image": "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80",
        "provider": "Expedia EPS Rapid",
        "affiliate_url": "https://www.expedia.com/Liberia-Hotels-Andaz-Peninsula-Papagayo.h23456"
    },
    {
        "id": "hotel_nap_01",
        "gateway": "nap",
        "gateway_name": "Naples / Sorrento, Italy (NAP)",
        "name": "Grand Hotel Excelsior Vittoria (Sorrento)",
        "stars": 5,
        "luxury_tier": "Historic Cliffside Luxury",
        "nightly_rate_usd": 920,
        "distance_to_airport": "55 mins to NAP",
        "sanctuary_proximity": "Direct hydrofoil & private car gateway to Amalfi Sanctuary",
        "amenities": ["Michelin-Starred Dining", "Citrus Grove Pool", "Boutique Wellness Spa", "Panoramic Bay Views"],
        "hero_image": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=80",
        "provider": "Amadeus Hospitality GDS",
        "affiliate_url": "https://www.expedia.com/Sorrento-Hotels-Grand-Hotel-Excelsior-Vittoria.h34567"
    },
    {
        "id": "hotel_dps_01",
        "gateway": "dps",
        "gateway_name": "Denpasar / Seminyak, Bali (DPS)",
        "name": "The Legian Seminyak Bali",
        "stars": 5,
        "luxury_tier": "Oceanfront Sanctuary Suites",
        "nightly_rate_usd": 580,
        "distance_to_airport": "25 mins to DPS",
        "sanctuary_proximity": "Ideal 1-night acclimation before private ascent to Ubud & Sidemen",
        "amenities": ["Three-Tiered Infinity Pool", "Holistic Wellness Spa", "Sunset Beachfront Lounge", "Butler Service"],
        "hero_image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80",
        "provider": "Expedia EPS Rapid",
        "affiliate_url": "https://www.expedia.com/Bali-Hotels-The-Legian.h45678"
    },
    {
        "id": "hotel_cun_01",
        "gateway": "cun",
        "gateway_name": "Cancun / Riviera Maya, Mexico (CUN)",
        "name": "Banyan Tree Mayakoba",
        "stars": 5,
        "luxury_tier": "Private Lagoon Pool Villas",
        "nightly_rate_usd": 850,
        "distance_to_airport": "35 mins to CUN",
        "sanctuary_proximity": "Adjacent to KAI Riviera Maya Sacred Cenote sanctuary",
        "amenities": ["Hydrothermal Rainforest Spa", "Private Heated Plunge Pools", "Saffron Thai Overwater Dining", "Eco-Boats"],
        "hero_image": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
        "provider": "Expedia EPS Rapid",
        "affiliate_url": "https://www.expedia.com/Riviera-Maya-Hotels-Banyan-Tree-Mayakoba.h56789"
    }
]


class HospitalityConnectorService:
    """
    Connector service for external hotel & accommodation inventory.
    Provides pre/post-retreat hotel searches and handles external property webhooks.
    """

    def search_accommodations(
        self,
        destination: Optional[str] = None,
        check_in: Optional[str] = None,
        check_out: Optional[str] = None,
        luxury_tier: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Searches curated luxury pre/post-retreat hotels near sanctuary gateways.
        """
        results = list(CURATED_GATEWAY_HOTELS)

        if destination:
            dest_lower = destination.lower()
            results = [
                h for h in results
                if dest_lower in h["gateway"].lower()
                or dest_lower in h["gateway_name"].lower()
                or dest_lower in h["name"].lower()
                or ("costa rica" in dest_lower and h["gateway"] in ["sjo", "lir"])
                or ("nosara" in dest_lower and h["gateway"] in ["sjo", "lir"])
                or ("amalfi" in dest_lower and h["gateway"] == "nap")
                or ("bali" in dest_lower and h["gateway"] == "dps")
                or ("riviera" in dest_lower and h["gateway"] == "cun")
            ]

        logger.info(f"Hospitality search for '{destination}': found {len(results)} luxury properties.")
        return results

    def handle_hotel_webhook(
        self,
        provider: str,
        event_type: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes inbound webhooks from Expedia, Hotelbeds, or Property PMS systems.
        """
        logger.info(f"Received hotel webhook from '{provider}': event={event_type}")

        return {
            "success": True,
            "provider": provider,
            "event_type": event_type,
            "processed_at": datetime.utcnow().isoformat(),
            "notification": f"Hotel webhook {event_type} from {provider} successfully logged."
        }


hospitality_service = HospitalityConnectorService()
