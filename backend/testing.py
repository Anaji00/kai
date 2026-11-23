"""Authentication helpers for the test suite and local use-case scripts. Not deployed."""
import hashlib
import hmac
import json
import time
from typing import Any, Dict, Optional

TEST_ADMIN_EMAIL = "test.admin@kaiwellnessretreats.com"
TEST_ADMIN_PASSWORD = "correct-horse-battery-staple"

_cached_headers: Optional[Dict[str, str]] = None


def ensure_test_admin(db):
    from backend.models import OperatorUser
    from backend.services.auth_service import create_operator

    user = db.query(OperatorUser).filter(OperatorUser.email == TEST_ADMIN_EMAIL).first()
    return user or create_operator(db, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, "Kareena Islam")


def admin_headers() -> Dict[str, str]:
    """Bearer headers for a real test operator session (re-issues if an earlier test revoked sessions)."""
    global _cached_headers
    from backend.database import SessionLocal, init_db
    from backend.models import OperatorUser, PortalSession
    from backend.services.auth_service import create_operator_session, decode_token

    init_db()
    if _cached_headers is not None:
        try:
            token = _cached_headers["Authorization"].split(" ", 1)[1]
            claims = decode_token(token, "access")
            sid = claims.get("sid")
            with SessionLocal() as db:
                session = db.query(PortalSession).filter(PortalSession.session_id == sid).first()
                user = db.query(OperatorUser).filter(OperatorUser.id == claims.get("sub")).first()
                if (
                    session is None
                    or session.revoked_at is not None
                    or user is None
                    or not user.is_active
                    or user.token_version != claims.get("ver")
                ):
                    _cached_headers = None
        except Exception:
            _cached_headers = None

    if _cached_headers is None:
        with SessionLocal() as db:
            tokens = create_operator_session(db, ensure_test_admin(db), "127.0.0.1", "pytest")
            _cached_headers = {"Authorization": f"Bearer {tokens.access_token}"}
    return dict(_cached_headers)


def signed_webhook_request(payload: Any, timestamp: Optional[int] = None, secret: Optional[str] = None) -> Dict[str, Any]:
    """TestClient kwargs (content + headers) for a correctly signed webhook delivery."""
    from backend.config import settings

    body = json.dumps(payload).encode("utf-8")
    sent_at = str(timestamp if timestamp is not None else int(time.time()))
    digest = hmac.new(
        (secret or settings.WEBHOOK_HMAC_SECRET).encode("utf-8"),
        f"{sent_at}.".encode("utf-8") + body,
        hashlib.sha256,
    ).hexdigest()
    return {
        "content": body,
        "headers": {
            "Content-Type": "application/json",
            "X-KAI-Timestamp": sent_at,
            "X-KAI-Signature-256": f"sha256={digest}",
        },
    }
