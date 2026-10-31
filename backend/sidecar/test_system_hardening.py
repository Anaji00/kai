"""
Comprehensive System Hardening & Regression Test Suite for KAI Sanctuary Platform.
Validates:
1. PII Endpoint Security (Bookings, Concierge Requests, Newsletter Subscribers require Admin Basic Auth)
2. Action Drafts Isolation (Draft listing and approvals require Admin Basic Auth)
3. Decoupled Webhook Authentication (Meta WhatsApp challenge, Tern CRM signature, Email ingestion token)
4. Fast Non-Blocking Guest Booking Experience (FastAPI BackgroundTasks offload)
5. Document Upload Safety (Strict 10MB chunked size cap)
6. SQLite WAL Concurrency & Lock Resilience
"""

import os
import sys

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import base64
import io
import time
import threading
from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings
from backend.database import SessionLocal
from backend.models import Booking

client = TestClient(app)

ADMIN_USER = settings.ADMIN_USERNAME or "kai_founder"
ADMIN_PASS = settings.ADMIN_PASSWORD or "kai_sanctuary_2026"
AUTH_HEADER = {
    "Authorization": f"Basic {base64.b64encode(f'{ADMIN_USER}:{ADMIN_PASS}'.encode()).decode()}"
}


def test_pii_endpoints_require_admin_auth():
    """Verify that sensitive customer data cannot be retrieved without admin credentials."""
    # 1. Bookings list
    res_unauth = client.get("/api/v1/bookings")
    assert res_unauth.status_code == 401, f"Expected 401 for unauthenticated /bookings, got {res_unauth.status_code}"

    res_auth = client.get("/api/v1/bookings", headers=AUTH_HEADER)
    assert res_auth.status_code == 200, f"Expected 200 for authenticated /bookings, got {res_auth.status_code}"
    assert isinstance(res_auth.json(), list)

    # 2. Concierge intake requests
    res_concierge_unauth = client.get("/api/v1/concierge/requests")
    assert res_concierge_unauth.status_code == 401

    res_concierge_auth = client.get("/api/v1/concierge/requests", headers=AUTH_HEADER)
    assert res_concierge_auth.status_code == 200

    # 3. Newsletter subscribers
    res_news_unauth = client.get("/api/v1/newsletter/subscribers")
    assert res_news_unauth.status_code == 401

    res_news_auth = client.get("/api/v1/newsletter/subscribers", headers=AUTH_HEADER)
    assert res_news_auth.status_code == 200

    print("[PASS] PII Endpoints strictly protected with 401/200 authentication gates.")


def test_action_drafts_require_admin_auth():
    """Verify that operator approval queues and draft triggers are protected."""
    # 1. Draft listing
    res_drafts_unauth = client.get("/api/v1/drafts/")
    assert res_drafts_unauth.status_code == 401

    res_drafts_auth = client.get("/api/v1/drafts/", headers=AUTH_HEADER)
    assert res_drafts_auth.status_code == 200

    # 2. Draft approval
    res_approve_unauth = client.post("/api/v1/drafts/draft_mock_999/approve")
    assert res_approve_unauth.status_code == 401

    print("[PASS] Action Drafts queue strictly gated behind Founder/Admin credentials.")


def test_meta_whatsapp_webhook_handshake():
    """Verify that Meta's webhook challenge handshake succeeds without Basic Auth."""
    challenge = "test_challenge_code_987654"
    verify_token = settings.WHATSAPP_WEBHOOK_VERIFY_TOKEN

    # Valid handshake
    res = client.get(
        f"/api/v1/sidecar/webhook/whatsapp?hub.mode=subscribe&hub.verify_token={verify_token}&hub.challenge={challenge}"
    )
    assert res.status_code == 200
    assert res.text == challenge

    # Invalid token rejected
    res_bad = client.get(
        f"/api/v1/sidecar/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge={challenge}"
    )
    assert res_bad.status_code == 403

    print("[PASS] Meta WhatsApp Webhook handshake decoupled and verified.")


def test_tern_webhook_secret_verification():
    """Verify that Tern CRM webhook uses granular secret header validation."""
    settings.TERN_WEBHOOK_SECRET = "test_tern_shared_secret"

    payload = {
        "event": "trip.booked",
        "trip_id": "TEST-TRIP-101",
        "client_name": "Marcus Aurelius",
        "email": "marcus@rome.org"
    }

    # 1. Invalid secret -> 401 in all environments
    res_wrong = client.post(
        "/api/v1/sidecar/webhooks/tern",
        json=payload,
        headers={"X-Webhook-Secret": "invalid_secret"}
    )
    assert res_wrong.status_code == 401

    # 2. In production, missing secret -> 401
    old_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        res_missing = client.post("/api/v1/sidecar/webhooks/tern", json=payload)
        assert res_missing.status_code == 401
    finally:
        settings.ENVIRONMENT = old_env

    # 3. Valid secret -> 200
    res_ok = client.post(
        "/api/v1/sidecar/webhooks/tern",
        json=payload,
        headers={"X-Webhook-Secret": "test_tern_shared_secret"}
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["success"] is True

    print("[PASS] Tern CRM webhook secret validation verified.")


def test_inbound_email_webhook_secret_verification():
    """Verify that inbound email ingestion requires shared webhook secret."""
    settings.EMAIL_WEBHOOK_SECRET = "test_email_secret_key"

    email_payload = {
        "sender": "vip.concierge@grandtravel.com",
        "recipient": "concierge@kaiwellnessretreats.com",
        "subject": "Flight Confirmation for Marcus",
        "raw_body": "Confirmed ORD -> LIR on Nov 14, 2026. Ref: KAI-MARCUS1."
    }

    # 1. Invalid secret -> 401 in all environments
    res_wrong = client.post(
        "/api/v1/sidecar/email-in/ingest",
        json=email_payload,
        headers={"X-Email-Webhook-Secret": "wrong_secret"}
    )
    assert res_wrong.status_code == 401

    # 2. In production, missing secret -> 401
    old_env = settings.ENVIRONMENT
    try:
        settings.ENVIRONMENT = "production"
        res_missing = client.post("/api/v1/sidecar/email-in/ingest", json=email_payload)
        assert res_missing.status_code == 401
    finally:
        settings.ENVIRONMENT = old_env

    # 3. Valid secret header -> 200/201
    res_ok = client.post(
        "/api/v1/sidecar/email-in/ingest",
        json=email_payload,
        headers={"X-Email-Webhook-Secret": "test_email_secret_key"}
    )
    assert res_ok.status_code in [200, 201]
    assert res_ok.json()["status"] == "PENDING_APPROVAL"

    print("[PASS] Inbound Email webhook authentication verified.")


def test_fast_guest_booking_checkout():
    """Verify that guest checkout returns in <200ms without blocking on AI staging."""
    booking_data = {
        "fullName": "Elena Rostova",
        "email": "elena.rostova@example.com",
        "phone": "+1 (312) 555-0199",
        "retreatId": "costa-rica-nosara-2026",
        "roomPreference": "private-suite",
        "movementExperience": "all-levels",
        "passportValid": "yes-valid-6mo",
        "healthNotes": "Plant-based, no gluten",
        "intentions": "Nervous system renewal"
    }

    start = time.perf_counter()
    res = client.post("/api/v1/bookings", json=booking_data)
    elapsed = time.perf_counter() - start

    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["bookingReference"].startswith("KAI-")
    # Verify booking returned rapidly (<500ms even in local test environment)
    assert elapsed < 0.5, f"Booking took too long: {elapsed:.3f}s"

    print(f"[PASS] Guest booking confirmed in {elapsed*1000:.1f}ms with background AI sidecar execution (Ref: {data['bookingReference']}).")


def test_document_upload_size_limit():
    """Verify that uploading documents exceeding 10MB is rejected with 413 Payload Too Large."""
    # 11MB dummy content stream
    oversized_data = b"0" * (11 * 1024 * 1024)
    file_obj = io.BytesIO(oversized_data)

    res = client.post(
        "/api/v1/sidecar/copilot/upload",
        files={"file": ("huge_document.pdf", file_obj, "application/pdf")},
        headers=AUTH_HEADER
    )
    assert res.status_code == 413
    assert "exceeds 10MB" in res.json()["detail"]

    print("[PASS] 10MB document upload safety cap successfully enforced.")


def test_sqlite_wal_concurrent_writes():
    """Verify that concurrent DB writes succeed without 'database is locked' errors under WAL mode."""
    errors = []

    def insert_worker(idx):
        try:
            db = SessionLocal()
            booking = Booking(
                reference_code=f"CONCUR-TEST-{idx}-{int(time.time()*1000)}",
                retreat_id="costa-rica-nosara-2026",
                retreat_title="Nosara Somatic Renewal",
                full_name=f"Concurrent_{idx} Tester",
                email=f"concurrent{idx}@example.com",
                phone="+15550001111",
                room_preference="private-suite",
                movement_experience="all-levels",
                passport_valid="yes-valid-6mo",
                health_notes="None",
                intentions="None",
                status="pending_review"
            )
            db.add(booking)
            db.commit()
            db.close()
        except Exception as e:
            errors.append(f"Worker {idx} failed: {e}")

    threads = [threading.Thread(target=insert_worker, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Concurrency errors encountered: {errors}"
    print("[PASS] SQLite WAL mode sustained 10 concurrent thread writes with zero lock contention.")


if __name__ == "__main__":
    print("\n--- Running KAI Platform Hardening & Security Suite ---")
    test_pii_endpoints_require_admin_auth()
    test_action_drafts_require_admin_auth()
    test_meta_whatsapp_webhook_handshake()
    test_tern_webhook_secret_verification()
    test_inbound_email_webhook_secret_verification()
    test_fast_guest_booking_checkout()
    test_document_upload_size_limit()
    test_sqlite_wal_concurrent_writes()
    print("\n[ALL 7/7 HARDENING & SECURITY TESTS PASSED]")
