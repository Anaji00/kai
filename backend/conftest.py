"""
Keeps the test suite hermetic: values here override the developer's .env (pydantic-settings
prefers real environment variables over the .env file), so tests always run in development
mode on a throwaway database and never call Groq or Resend for real.
Set TEST_DATABASE_URL to point the suite at Postgres.
"""
import os
import tempfile

_scratch_dir = tempfile.mkdtemp(prefix="kai-tests-")
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{_scratch_dir}/kai_test.db"
os.environ["ENVIRONMENT"] = "development"
os.environ["ADMIN_EMAIL"] = "admin@kaiwellnessretreats.com"
os.environ["ADMIN_PASSWORD"] = "kai_admin_2026"
os.environ["AUTH_SECRET_KEY"] = "kai_test_auth_secret_with_at_least_32_characters"
os.environ["WEBHOOK_HMAC_SECRET"] = "kai_test_webhook_secret_with_at_least_32_chars"
os.environ["GROQ_API_KEY"] = ""
os.environ["RESEND_API_KEY"] = ""
os.environ["SMTP_HOST"] = ""
os.environ["ENABLE_DEMO_AUTH"] = "true"
os.environ["ENABLE_LIVE_EMAIL_DISPATCH"] = "false"
os.environ["ENABLE_LIVE_WHATSAPP_DISPATCH"] = "false"
os.environ["WHATSAPP_WEBHOOK_VERIFY_TOKEN"] = "kai_whatsapp_verify_token_2026"

import pytest  # noqa: E402


@pytest.fixture()
def admin_client():
    """TestClient signed in as an operator through the real login route (cookies + CSRF header)."""
    from fastapi.testclient import TestClient
    from backend.database import SessionLocal, init_db
    from backend.main import app
    from backend.testing import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, ensure_test_admin

    init_db()
    with SessionLocal() as db:
        ensure_test_admin(db)
    client = TestClient(app)
    res = client.post("/api/auth/operator/login", json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD})
    assert res.status_code == 200, res.text
    client.headers["X-KAI-CSRF-Token"] = client.cookies["kai_csrf_token"]
    return client


def make_guest_client(email: str, reference: str, sanctuary_slug: str = "puerto-vallarta-2027"):
    """Creates a booking and intake, then signs in through the real one-time-code flow."""
    from unittest import mock
    from fastapi.testclient import TestClient
    from backend.database import SessionLocal, init_db
    from backend.main import app
    from backend.models import Booking
    from backend.sidecar.models import StagingIntake

    init_db()
    with SessionLocal() as db:
        db.add(Booking(
            reference_code=reference, retreat_id=sanctuary_slug, retreat_title="Test Retreat",
            full_name=email.split("@")[0], email=email, phone="+15550100", room_preference="suite",
            movement_experience="all", passport_valid="yes", status="pending_review",
        ))
        intake = StagingIntake(
            source_ref=reference, client_name=email.split("@")[0], email=email, phone="+15550100",
            sanctuary_slug=sanctuary_slug, room_tier="Suite", clinical_profile={}, status="PENDING_APPROVAL",
        )
        db.add(intake)
        db.commit()
        guest_id = str(intake.id)

    client = TestClient(app)
    sent = {}
    with mock.patch("backend.sidecar.routers.guest_portal.send_guest_otp_email", side_effect=lambda to, code: sent.update(code=code)):
        res = client.post("/api/auth/guest/request-access", json={"email": email, "booking_reference": reference})
    assert res.status_code == 200, res.text
    res = client.post("/api/auth/guest/verify", json={"email": email, "booking_reference": reference, "otp": sent["code"]})
    assert res.status_code == 200, res.text
    client.headers["X-KAI-CSRF-Token"] = client.cookies["kai_guest_csrf_token"]
    client.guest_id = guest_id
    return client


@pytest.fixture()
def guest_client():
    import uuid
    suffix = uuid.uuid4().hex[:8].upper()
    return make_guest_client(f"guest.{suffix.lower()}@example.com", f"KAI-{suffix}")
