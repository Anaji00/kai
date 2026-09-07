import sys
from pathlib import Path

# Ensure repository root is always in sys.path regardless of execution directory
_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from backend.config import settings
from backend.database import init_db
from backend.routers import (
    health,
    retreats,
    bookings,
    concierge,
    wellness,
    newsletter,
    testimonials,
)
from backend.sidecar.routers import (
    intakes as sidecar_intakes,
    leads as sidecar_leads,
    messaging as sidecar_messaging,
    reconciliation as sidecar_reconciliation,
    email_in as sidecar_email_in,
    whatsapp as sidecar_whatsapp,
    copilot as sidecar_copilot,
    calendar as sidecar_calendar,
    webhooks as sidecar_webhooks,
    travel_maps as sidecar_travel,
    vendors as sidecar_vendors,
    system as sidecar_system,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kai_api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing KAI Sanctuary Database...")
    init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down KAI Sanctuary API.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## KAI Wellness Retreats RESTful Engine
    Founded by **Kareena Islam** (BSN, RN, RYT, Future Leaders in Travel Honoree).
    Curated in partnership with **Grand Travel & Cruise** (25+ years host agency legacy, Funjet 500 Club).

    ### Core Capabilities:
    * **Retreats & Sanctuaries**: Live cohort inventory and dynamic spot availability
    * **Reservations & Clinical Intake**: Secure guest intake, reference code generation, and notifications
    * **Grand Travel Flight Desk**: VIP flight booking, group air contracts, and airport meet-and-greets
    * **Somatic Restorative Science**: 432Hz/528Hz acoustic parameters, 4-7-8 vagal breathing, and stress evaluation
    * **Private Priority Circle**: Confidential announcements for intimate 12–14 guest cohorts
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
)

# Mount Routers under /api/v1
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(retreats.router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings.router, prefix=settings.API_V1_PREFIX)
app.include_router(concierge.router, prefix=settings.API_V1_PREFIX)
app.include_router(wellness.router, prefix=settings.API_V1_PREFIX)
app.include_router(newsletter.router, prefix=settings.API_V1_PREFIX)
app.include_router(testimonials.router, prefix=settings.API_V1_PREFIX)

# Mount Tern CRM Intelligence Sidecar Routers
app.include_router(sidecar_intakes.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_leads.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_messaging.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_reconciliation.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_email_in.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_whatsapp.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_copilot.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_calendar.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_webhooks.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_travel.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_vendors.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_system.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to KAI Wellness Retreats API",
        "founder": "Kareena Islam",
        "partner": "Grand Travel & Cruise",
        "version": settings.VERSION,
        "docs": "/docs",
        "redoc": "/redoc",
        "health": f"{settings.API_V1_PREFIX}/health"
    }
