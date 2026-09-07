from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from backend.database import get_db
from backend.schemas import HealthResponse
from backend.config import settings
from backend.services.retreats_service import RETREATS_CATALOG

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.get("", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(text("SELECT 1"))
        db_connected = True
    except Exception:
        db_connected = False

    return HealthResponse(
        status="healthy" if db_connected else "degraded",
        version=settings.VERSION,
        databaseConnected=db_connected,
        totalRetreats=len(RETREATS_CATALOG),
        hostAgency=f"{settings.HOST_AGENCY_NAME} ({settings.HOST_AGENCY_STATUS})"
    )
