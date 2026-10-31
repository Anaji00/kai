from fastapi.testclient import TestClient

from backend.main import app
from backend.sidecar.routers.webhooks import PORTAL_SESSION_COOKIE, portal_session_token

client = TestClient(app)


def test_portal_session_cookie_grants_admin_access():
    """The HttpOnly cookie proxy.ts sets after the /portal login authenticates admin API calls."""
    client.cookies.set(PORTAL_SESSION_COOKIE, portal_session_token())
    try:
        assert client.get("/api/v1/drafts/stats").status_code == 200
    finally:
        client.cookies.clear()


def test_forged_portal_session_cookie_is_rejected():
    client.cookies.set(PORTAL_SESSION_COOKIE, "0" * 64)
    try:
        assert client.get("/api/v1/drafts/stats").status_code == 401
    finally:
        client.cookies.clear()


def test_wrong_basic_credentials_are_rejected_even_with_cookie_absent():
    assert client.get("/api/v1/drafts/stats", auth=("admin", "wrong")).status_code == 401
