import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.sidecar.services.synthetic_data_seeder import seed_all_synthetic_data

logger = logging.getLogger("kai_system_router")

router = APIRouter(prefix="/system", tags=["System & Synthetic Testing"])


@router.post("/seed-synthetic-data")
def trigger_seed_synthetic_data(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Seeds comprehensive synthetic data for testing:
    - Guest Intakes (Frank Lucas, Eleanor Vance, Sarah Jenkins, Dr. Marcus Reed, etc.)
    - Preferred Luxury Vendors & Suppliers (Chauffeurs, Air Charters, Organic Chefs, Emergency Clinics)
    - Partner Leads (Longevity clinics, yoga studios)
    - Calendar Events (Cohorts, 20-min consults, flight arrivals)
    - Curated Dining & Somatic POIs
    """
    try:
        result = seed_all_synthetic_data(db)
        return result
    except Exception as e:
        logger.error(f"Failed to seed synthetic test data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to seed synthetic test data: {str(e)}")
