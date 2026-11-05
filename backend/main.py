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
    auth,
    staff,
    health,
    retreats,
    bookings,
    concierge,
    wellness,
    newsletter,
    testimonials,
    drafts,
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
    continuity as sidecar_continuity,
    guest_portal as sidecar_guest_portal,
    crm as sidecar_crm,
)

from fastapi import Request
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kai_api")


_startup_complete = False


def run_startup() -> None:
    """
    Secret checks, schema init and status logging. Runs once per process: from the ASGI lifespan under
    uvicorn, or at import time from api/index.py on Vercel (serverless runtimes may skip lifespan events).
    """
    global _startup_complete
    if _startup_complete:
        return

    if settings.ENVIRONMENT == "production":
        insecure = settings.insecure_default_secrets()
        if insecure:
            # Fail closed: these defaults are public in the repository, so they authenticate nothing.
            raise RuntimeError(
                f"Refusing to start in production with default or empty secrets: {', '.join(insecure)}. "
                "Set them in the environment."
            )
    else:
        logger.warning(
            f"ENVIRONMENT={settings.ENVIRONMENT}: unsigned webhooks are accepted and development default secrets are allowed. "
            "Set ENVIRONMENT=production for any deployed instance."
        )

    logger.info("Initializing KAI Sanctuary Database...")
    init_db()
    logger.info("Database initialized successfully.")

    # Live Communications & Production Delivery Status Telemetry
    email_status = "LIVE (Resend API)" if (settings.ENABLE_LIVE_EMAIL_DISPATCH and settings.RESEND_API_KEY) else "SIMULATED (Local Logs / Review Queue)"
    whatsapp_status = "LIVE (Meta Cloud API)" if (settings.ENABLE_LIVE_WHATSAPP_DISPATCH and settings.WHATSAPP_CLOUD_API_KEY) else "SIMULATED (Interactive Sandbox)"
    crm_status = "NATIVE KAI CRM (Local SQLite/PostgreSQL Database)"

    logger.info(f"KAI Communications Dispatch Mode: Email={email_status} | WhatsApp={whatsapp_status} | Sanctuary CRM={crm_status}")

    if settings.ENVIRONMENT == "production":
        if not settings.RESEND_API_KEY and settings.ENABLE_LIVE_EMAIL_DISPATCH:
            logger.warning("Configuration warning: ENABLE_LIVE_EMAIL_DISPATCH is true but RESEND_API_KEY is missing.")
        if not settings.WHATSAPP_CLOUD_API_KEY and settings.ENABLE_LIVE_WHATSAPP_DISPATCH:
            logger.warning("Configuration warning: ENABLE_LIVE_WHATSAPP_DISPATCH is true but WHATSAPP_CLOUD_API_KEY is missing.")
    _startup_complete = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_startup()
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
    # The API docs list every admin endpoint, so they exist only outside production.
    docs_url=None if settings.ENVIRONMENT == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT == "production" else "/redoc",
    openapi_url=None if settings.ENVIRONMENT == "production" else "/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.dependencies.auth import get_current_admin
from fastapi import Depends

app.include_router(auth.router)
app.include_router(staff.router)
app.include_router(sidecar_guest_portal.auth_router)

# Mount Routers under /api/v1
app.include_router(health.router, prefix=settings.API_V1_PREFIX)
app.include_router(retreats.router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings.router, prefix=settings.API_V1_PREFIX)
app.include_router(concierge.router, prefix=settings.API_V1_PREFIX)
app.include_router(wellness.router, prefix=settings.API_V1_PREFIX)
app.include_router(newsletter.router, prefix=settings.API_V1_PREFIX)
app.include_router(testimonials.router, prefix=settings.API_V1_PREFIX)
app.include_router(drafts.router, prefix=settings.API_V1_PREFIX, dependencies=[Depends(get_current_admin)])

# Mount KAI Sanctuary Travel CRM Sidecar Routers
# Note: sidecar_email_in, sidecar_whatsapp, and sidecar_webhooks contain public/webhook endpoints with their own granular auth
app.include_router(sidecar_intakes.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_leads.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_messaging.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_reconciliation.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_email_in.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_whatsapp.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_copilot.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_calendar.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_webhooks.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")
app.include_router(sidecar_travel.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_vendors.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_system.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_continuity.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])
app.include_router(sidecar_crm.router, prefix=f"{settings.API_V1_PREFIX}/sidecar", dependencies=[Depends(get_current_admin)])

# Mount Guest Sanctuary Companion (Public — magic-link token auth, no admin credentials needed)
app.include_router(sidecar_guest_portal.router, prefix=f"{settings.API_V1_PREFIX}/sidecar")


@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to KAI Wellness Retreats API",
        "founder": "Kareena Islam",
        "partner": "Grand Travel & Cruise",
        "version": settings.VERSION,
        "health": f"{settings.API_V1_PREFIX}/health"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled exception on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred.", "type": type(exc).__name__}
    )
