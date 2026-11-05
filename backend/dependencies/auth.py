"""FastAPI guards: operator access, guest ownership, and signed inbound webhooks."""
import hashlib
import hmac
import logging
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import OperatorUser, PortalSession
from backend.services.auth_service import (
    ACCESS_COOKIE,
    AdminPrincipal,
    AuthError,
    CSRF_COOKIE,
    CSRF_HEADER,
    GUEST_COOKIE,
    GUEST_CSRF_COOKIE,
    ROLE_ADMIN,
    ROLE_GUEST,
    csrf_tokens_valid,
    decode_token,
    principal_for,
    session_is_active,
)

logger = logging.getLogger("kai_auth_guards")

MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
WEBHOOK_MAX_AGE_SECONDS = 300
WEBHOOK_SIGNATURE_HEADER = "X-KAI-Signature-256"
WEBHOOK_TIMESTAMP_HEADER = "X-KAI-Timestamp"


@dataclass
class GuestPrincipal:
    guest_id: str
    email: str
    session_id: str
    cohort_ids: List[str]
    session: Dict[str, Any]


def client_ip(request: Request) -> Optional[str]:
    """Vercel sets x-real-ip itself; elsewhere uvicorn's --proxy-headers has already resolved the client."""
    if settings.ENVIRONMENT == "production" and request.headers.get("x-vercel-id"):
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
    return request.client.host if request.client else None


def _unauthorized(detail: str = "Authentication required.") -> HTTPException:
    return HTTPException(status_code=401, detail=detail, headers={"WWW-Authenticate": "Bearer"})


def _bearer_token(request: Request) -> Optional[str]:
    header = request.headers.get("authorization") or ""
    scheme, _, value = header.partition(" ")
    return value.strip() if scheme.lower() == "bearer" and value.strip() else None


def enforce_csrf(request: Request, session_id: str, cookie_name: str = CSRF_COOKIE) -> None:
    """Cookies are sent automatically by browsers, so mutating cookie-authenticated requests need proof of origin."""
    if request.method not in MUTATING_METHODS:
        return
    if not csrf_tokens_valid(request.headers.get(CSRF_HEADER), request.cookies.get(cookie_name), session_id):
        raise HTTPException(status_code=403, detail="Missing or invalid CSRF token.")


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> AdminPrincipal:
    """Requires a valid ADMIN token (cookie, or Bearer for API clients) tied to a live server-side session."""
    bearer = _bearer_token(request)
    token = bearer or request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise _unauthorized()
    try:
        claims = decode_token(token, "access")
    except AuthError:
        raise _unauthorized("Your session has expired. Please sign in again.")
    if claims.get("role") != ROLE_ADMIN:
        raise HTTPException(status_code=403, detail="Administrator access required.")

    session = db.query(PortalSession).filter(PortalSession.session_id == claims.get("sid")).first()
    if not session_is_active(session):
        raise _unauthorized("Your session has ended. Please sign in again.")
    user = db.query(OperatorUser).filter(OperatorUser.id == claims["sub"]).first()
    if not user or not user.is_active or user.token_version != claims.get("ver"):
        raise _unauthorized("Your session has ended. Please sign in again.")

    if not bearer:
        enforce_csrf(request, session.session_id)
    return principal_for(user, session.session_id)


def get_optional_guest(request: Request, db: Session = Depends(get_db)) -> Optional[GuestPrincipal]:
    """Returns the signed-in guest, or None when there is no valid guest session."""
    bearer = _bearer_token(request)
    token = bearer or request.cookies.get(GUEST_COOKIE)
    if not token:
        return None
    try:
        claims = decode_token(token, "guest")
    except AuthError:
        return None
    if claims.get("role") != ROLE_GUEST:
        return None

    from backend.sidecar.services.guest_portal_service import load_guest_session_by_id

    session = load_guest_session_by_id(claims.get("sid"), db)
    if not session:
        return None
    if not bearer:
        enforce_csrf(request, claims["sid"], GUEST_CSRF_COOKIE)
    return GuestPrincipal(
        guest_id=claims["sub"],
        email=claims.get("email") or session["email"],
        session_id=claims["sid"],
        cohort_ids=list(claims.get("scp") or []),
        session=session,
    )


def get_current_guest(guest: Optional[GuestPrincipal] = Depends(get_optional_guest)) -> GuestPrincipal:
    if not guest:
        raise _unauthorized("Please verify your access code to continue.")
    return guest


def require_guest_owner(guest: GuestPrincipal, guest_id: str) -> None:
    """Attribute-based check: a guest may only touch their own records."""
    if guest.guest_id != guest_id:
        logger.warning(f"Guest {guest.guest_id} denied access to guest {guest_id}")
        raise HTTPException(status_code=403, detail="You can only access your own retreat details.")


def _hmac_hex(secret: str, message: bytes) -> str:
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _strip_prefix(signature: str) -> str:
    return signature[len("sha256="):] if signature.startswith("sha256=") else signature


async def verify_webhook_signature(request: Request) -> bool:
    """
    Requires X-KAI-Signature-256 = HMAC-SHA256(WEBHOOK_HMAC_SECRET, "<timestamp>.<raw body>") and an
    X-KAI-Timestamp within 300 seconds. The timestamp is signed, so an old capture can't be refreshed.
    """
    signature = request.headers.get(WEBHOOK_SIGNATURE_HEADER)
    timestamp = request.headers.get(WEBHOOK_TIMESTAMP_HEADER)
    if not signature or not timestamp:
        raise HTTPException(status_code=401, detail="Missing webhook signature.")
    try:
        sent_at = int(timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid webhook timestamp.")
    if abs(time.time() - sent_at) > WEBHOOK_MAX_AGE_SECONDS:
        raise HTTPException(status_code=401, detail="Webhook timestamp is outside the allowed window.")

    body = await request.body()
    expected = _hmac_hex(settings.WEBHOOK_HMAC_SECRET, f"{timestamp}.".encode("utf-8") + body)
    if not hmac.compare_digest(_strip_prefix(signature), expected):
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    return True


async def verify_whatsapp_signature(request: Request) -> bool:
    """
    Meta signs deliveries with X-Hub-Signature-256 and the app secret and sends no timestamp,
    so it is accepted only when WHATSAPP_APP_SECRET is set. Anything else must use the KAI scheme.
    """
    meta_signature = request.headers.get("X-Hub-Signature-256")
    if meta_signature and settings.WHATSAPP_APP_SECRET:
        expected = _hmac_hex(settings.WHATSAPP_APP_SECRET, await request.body())
        if hmac.compare_digest(_strip_prefix(meta_signature), expected):
            return True
        raise HTTPException(status_code=401, detail="Invalid webhook signature.")
    return await verify_webhook_signature(request)


async def verify_webhook_signature_or_admin(request: Request, db: Session = Depends(get_db)) -> bool:
    """For endpoints fed by both signed external senders and signed-in operators."""
    if request.headers.get(WEBHOOK_SIGNATURE_HEADER):
        return await verify_webhook_signature(request)
    get_current_admin(request, db)
    return True
