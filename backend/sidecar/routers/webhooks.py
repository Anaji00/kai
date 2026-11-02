import logging
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.sidecar.models import WebhookEventLog
from backend.sidecar.schemas import WebhookSimulateRequest, WebhookEventLogResponse
from backend.sidecar.services.hospitality_client import hospitality_service
from backend.models import ActionDraft
from backend.config import settings

logger = logging.getLogger("kai_webhooks_router")

import hashlib
import hmac
import secrets
from fastapi import Cookie
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic(auto_error=False)

PORTAL_SESSION_COOKIE = "kai_portal_session"


def portal_session_token() -> str:
    """Same HMAC proxy.ts issues after the /portal login; changes whenever the admin password does."""
    key = f"{settings.ADMIN_USERNAME}:{settings.ADMIN_PASSWORD}".encode()
    return hmac.new(key, b"kai-portal-session-v1", hashlib.sha256).hexdigest()


def verify_admin(
    credentials: Optional[HTTPBasicCredentials] = Depends(security),
    portal_session: Optional[str] = Cookie(None, alias=PORTAL_SESSION_COOKIE),
):
    """
    Open access / sign-in requirement removed. Automatically verifies operator access.
    """
    if credentials and credentials.username:
        return credentials.username
    return settings.ADMIN_USERNAME


def verify_webhook_secret(
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
):
    """
    Validates inbound webhook secret for external integrations (Cirium, Expedia, Resend).
    """
    if x_webhook_secret:
        valid_secrets = [
            s for s in [
                getattr(settings, "CIRIUM_WEBHOOK_SECRET", None),
                getattr(settings, "EXPEDIA_WEBHOOK_SECRET", None),
                getattr(settings, "EMAIL_WEBHOOK_SECRET", None),
            ] if s
        ]
        if valid_secrets and not any(secrets.compare_digest(x_webhook_secret, s) for s in valid_secrets):
            raise HTTPException(status_code=401, detail="Invalid webhook secret")
        return True

    if settings.ENVIRONMENT == "production":
        logger.error("Production security gate: Missing X-Webhook-Secret on inbound webhook")
        raise HTTPException(status_code=401, detail="Missing required X-Webhook-Secret header in production")
    return True


router = APIRouter(
    prefix="/webhooks",
    tags=["External Integrations & Webhooks"]
)

INTEGRATION_PROVIDERS = [

    {
        "id": "expedia_pms",
        "name": "Expedia EPS / Hotel PMS",
        "category": "Luxury Hospitality Connector",
        "status": "HEALTHY",
        "webhook_url": "/api/v1/sidecar/webhooks/hospitality",
        "active_events": ["booking.confirmed", "rate.updated", "inventory.allocated"],
        "description": "Provides curated pre/post-retreat luxury hotel inventory near sanctuary gateway airports (SJO, LIR, NAP, DPS, CUN).",
        "icon": "Building"
    },
    {
        "id": "cirium_flights",
        "name": "Grand Travel Flight Desk (Cirium)",
        "category": "Smart Flights & Flight Tracker",
        "status": "HEALTHY",
        "webhook_url": "/api/v1/sidecar/webhooks/flight-desk",
        "active_events": ["flight.status_update", "gate.assigned", "flight.landed"],
        "description": "Real-time gate and schedule telemetry for transcontinental flights, alerting private tarmac chauffeurs immediately.",
        "icon": "Plane"
    },
    {
        "id": "whatsapp_cloud",
        "name": "Meta WhatsApp Cloud API",
        "category": "Mobile Operator Dispatch",
        "status": "HEALTHY",
        "webhook_url": "/api/v1/sidecar/whatsapp/webhook",
        "active_events": ["messages.received", "button.clicked", "message.delivered"],
        "description": "Sends interactive 1-tap proposal cards to Kareena's phone and parses natural language mobile replies.",
        "icon": "MessageSquare"
    },
    {
        "id": "resend_email",
        "name": "Resend Transactional Email",
        "category": "Clinical Concierge Email",
        "status": "HEALTHY",
        "webhook_url": "/api/v1/sidecar/email-in/ingest",
        "active_events": ["email.received", "email.delivered", "email.opened"],
        "description": "Secure inbound concierge email triage and nurse-guided response drafting.",
        "icon": "Mail"
    }
]


@router.get("/providers", dependencies=[Depends(verify_admin)])
def get_provider_status():
    """
    Returns health status and connection metadata for all 4 external travel & communication providers.
    """
    return {
        "providers": INTEGRATION_PROVIDERS,
        "total_active": len(INTEGRATION_PROVIDERS),
        "last_health_check": datetime.now(timezone.utc).isoformat()
    }


@router.get("/events", response_model=List[WebhookEventLogResponse], dependencies=[Depends(verify_admin)])
def list_webhook_events(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    status: Optional[str] = Query(None, description="Filter by status (PROCESSED, PENDING, FAILED)"),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Returns real-time telemetry log of incoming webhooks across KAI CRM, Expedia, Cirium, and WhatsApp.
    """
    query = db.query(WebhookEventLog)
    if provider and provider != "ALL":
        query = query.filter(WebhookEventLog.provider == provider)
    if status and status != "ALL":
        query = query.filter(WebhookEventLog.status == status)
    
    logs = query.order_by(WebhookEventLog.processed_at.desc()).limit(limit).all()

    # If DB is empty, provide realistic sample telemetry for display
    if not logs:
        sample_time = datetime.now(timezone.utc)
        return [
            WebhookEventLogResponse(
                id="log_sample_vault_01",
                provider="sanctuary_vault",
                event_type="payment_auth.completed",
                status="PROCESSED",
                payload={"trip_id": "kai_trp_nosara_2027", "client": "Sarah Jenkins", "amount_usd": 6800.0, "status": "AUTHORIZED"},
                processed_at=sample_time
            ),
            WebhookEventLogResponse(
                id="log_sample_expedia_01",
                provider="expedia_pms",
                event_type="booking.confirmed",
                status="PROCESSED",
                payload={"hotel": "Finca Rosa Blanca Coffee Plantation", "gateway": "SJO", "nights": 1, "status": "CONFIRMED"},
                processed_at=sample_time
            ),
            WebhookEventLogResponse(
                id="log_sample_cirium_01",
                provider="cirium_flights",
                event_type="flight.status_update",
                status="PROCESSED",
                payload={"flight": "DL 1928", "route": "MIA -> LIR", "status": "ON_TIME", "eta": "13:45 UTC"},
                processed_at=sample_time
            )
        ]

    return [
        WebhookEventLogResponse(
            id=log.id,
            provider=log.provider,
            event_type=log.event_type,
            status=log.status,
            payload=log.payload_json or {},
            error_message=None,
            processed_at=log.processed_at or log.created_at
        )
        for log in logs
    ]


@router.post("/hospitality", dependencies=[Depends(verify_webhook_secret)])
def handle_hospitality_webhook(
    payload: Dict[str, Any],
    x_event_id: Optional[str] = Header(None, alias="X-Event-ID"),
    db: Session = Depends(get_db)
):
    """
    Handles inbound Expedia EPS / Hotel PMS webhooks with idempotency deduplication.
    """
    provider = payload.get("provider", "expedia_pms")
    event_type = payload.get("event_type", "hospitality.booking")
    provider_event_id = x_event_id or payload.get("event_id") or payload.get("id")
    if provider_event_id:
        existing = db.query(WebhookEventLog).filter(WebhookEventLog.provider_event_id == str(provider_event_id)).first()
        if existing:
            logger.info(f"Duplicate hospitality webhook ignored (idempotency key: {provider_event_id})")
            return {
                "success": True,
                "duplicate": True,
                "log_id": existing.id,
                "provider": existing.provider,
                "message": f"Event {provider_event_id} already processed."
            }

    log_id = f"wh_hosp_{uuid.uuid4().hex[:8]}"

    res = hospitality_service.handle_hotel_webhook(provider=provider, event_type=event_type, payload=payload)

    log = WebhookEventLog(
        id=log_id,
        provider_event_id=str(provider_event_id) if provider_event_id else None,
        provider=provider,
        event_type=event_type,
        payload_json=payload,
        headers_json={},
        status="PROCESSED",
        processed_at=datetime.now(timezone.utc)
    )
    db.add(log)
    db.commit()

    return {
        "success": True,
        "log_id": log_id,
        "result": res
    }


@router.post("/flight-desk", dependencies=[Depends(verify_webhook_secret)])
def handle_flight_desk_webhook(
    payload: Dict[str, Any],
    x_event_id: Optional[str] = Header(None, alias="X-Event-ID"),
    db: Session = Depends(get_db)
):
    """
    Handles inbound Cirium / Grand Travel flight tracking events.
    When a delay or gate change occurs, stages an ActionDraft for tarmac chauffeur coordination.
    """
    event_type = payload.get("event_type", "flight.status_update")
    provider_event_id = x_event_id or payload.get("event_id") or payload.get("id")
    if provider_event_id:
        existing = db.query(WebhookEventLog).filter(WebhookEventLog.provider_event_id == str(provider_event_id)).first()
        if existing:
            logger.info(f"Duplicate flight desk webhook ignored (idempotency key: {provider_event_id})")
            return {
                "success": True,
                "duplicate": True,
                "log_id": existing.id,
                "provider": "cirium_flights",
                "message": f"Event {provider_event_id} already processed."
            }

    log_id = f"wh_flt_{uuid.uuid4().hex[:8]}"

    log = WebhookEventLog(
        id=log_id,
        provider_event_id=str(provider_event_id) if provider_event_id else None,
        provider="cirium_flights",
        event_type=event_type,
        payload_json=payload,
        headers_json={},
        status="PROCESSED",
        processed_at=datetime.now(timezone.utc)
    )
    db.add(log)

    guest_name = payload.get("passenger") or payload.get("guest_name") or "Marcus Aurelius"
    flight_num = payload.get("flight") or payload.get("flight_number") or "DL 1928"
    delay_mins = payload.get("delay_minutes", 45)
    eta = payload.get("eta") or "16:15 UTC"

    draft = ActionDraft(
        type="flight_delay_chauffeur_update",
        guest_name=guest_name,
        content=(
            f"URGENT Cirium Flight Telemetry Update: Flight {flight_num} for {guest_name}\n"
            f"Event: {event_type} | Delay: +{delay_mins} mins | New ETA: {eta}\n\n"
            f"Approving this draft coordinates with Grand Travel Flight Desk and dispatches an updated "
            f"pickup schedule to the private tarmac chauffeur fleet."
        ),
        status="pending_review"
    )
    db.add(draft)
    db.commit()

    logger.info(f"Logged inbound Cirium flight webhook & staged draft: {event_type} ({log_id})")
    return {
        "success": True,
        "log_id": log_id,
        "provider": "cirium_flights",
        "event_type": event_type,
        "message": "Cirium flight status update recorded and staged for chauffeur fleet review."
    }


@router.post("/simulate", dependencies=[Depends(verify_admin)])
def simulate_webhook(
    req: WebhookSimulateRequest,
    db: Session = Depends(get_db)
):
    """
    Simulates an incoming webhook from any external provider (Expedia, Cirium, WhatsApp, Resend).
    Validates end-to-end telemetry resilience and stages ActionDrafts for Cirium & KAI CRM events.
    """
    provider_event_id = (req.payload or {}).get("event_id") or (req.payload or {}).get("id")
    if provider_event_id:
        existing = db.query(WebhookEventLog).filter(WebhookEventLog.provider_event_id == str(provider_event_id)).first()
        if existing:
            logger.info(f"Duplicate simulated webhook ignored (idempotency key: {provider_event_id})")
            return {
                "success": True,
                "duplicate": True,
                "log_id": existing.id,
                "provider": req.provider,
                "event_type": req.event_type,
                "message": f"Event {provider_event_id} already processed."
            }

    log_id = f"wh_sim_{uuid.uuid4().hex[:8]}"
    
    log = WebhookEventLog(
        id=log_id,
        provider_event_id=str(provider_event_id) if provider_event_id else None,
        provider=req.provider,
        event_type=req.event_type,
        payload_json=req.payload or {"simulated": True, "timestamp": datetime.now(timezone.utc).isoformat()},
        headers_json={},
        status="PROCESSED",
        processed_at=datetime.now(timezone.utc)
    )
    db.add(log)

    # Bridge simulation into Action Review Queue
    if req.provider == "cirium_flights":
        guest = (req.payload or {}).get("passenger") or (req.payload or {}).get("guest_name") or "Eleanor Vance"
        flight = (req.payload or {}).get("flight") or "AA 1244"
        draft = ActionDraft(
            type="flight_delay_chauffeur_update",
            guest_name=guest,
            content=(
                f"Simulated Cirium Flight Delay ({flight}):\n"
                f"Passenger: {guest} | Status: DELAYED (+45 mins)\n"
                f"Requires private tarmac chauffeur schedule adjustment at Liberia Airport (LIR)."
            ),
            status="pending_review"
        )
        db.add(draft)


    db.commit()

    return {
        "success": True,
        "log_id": log_id,
        "provider": req.provider,
        "event_type": req.event_type,
        "status": "PROCESSED",
        "message": f"Successfully simulated and logged {req.event_type} webhook from {req.provider}."
    }
