"""Security regression tests for operator sessions, guest isolation, webhooks and audit attribution."""
import time
import uuid
from datetime import timedelta
from unittest import mock

import jwt
import pytest
from fastapi.testclient import TestClient

from backend.config import settings
from backend.conftest import make_guest_client
from backend.database import SessionLocal
from backend.main import app
from backend.models import ActionDraft, AuditEvent, OperatorUser, PortalSession
from backend.services import auth_service
from backend.sidecar.models import StagingIntake
from backend.testing import TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD, ensure_test_admin, signed_webhook_request


def anon():
    return TestClient(app)


# ---------------------------------------------------------------- passwords

def test_argon2id_hash_and_verify():
    hashed = auth_service.hash_password("a-long-enough-passphrase")
    assert hashed.startswith("$argon2id$")
    assert auth_service.verify_password("a-long-enough-passphrase", hashed)
    assert not auth_service.verify_password("wrong", hashed)
    assert not auth_service.verify_password("anything", "not-a-valid-hash")


def test_database_stores_only_token_digests(admin_client):
    raw_refresh = admin_client.cookies["kai_refresh_token"]
    with SessionLocal() as db:
        session = auth_service.find_session_by_refresh_token(db, raw_refresh)
        assert session is not None
        assert session.refresh_token_sha256 != raw_refresh
        assert len(session.refresh_token_sha256) == 64


# ---------------------------------------------------------------- login

def test_login_sets_hardened_cookies_and_me_returns_admin(admin_client):
    me = admin_client.get("/api/auth/me")
    assert me.status_code == 200
    body = me.json()
    assert body["role"] == "ADMIN"
    assert body["email"] == TEST_ADMIN_EMAIL
    assert body["csrf_token"]


def test_cookie_flags():
    with SessionLocal() as db:
        ensure_test_admin(db)
    res = anon().post("/api/auth/operator/login", json={"email": TEST_ADMIN_EMAIL, "password": TEST_ADMIN_PASSWORD})
    cookies = res.headers.get_list("set-cookie")
    by_name = {c.split("=", 1)[0]: c.lower() for c in cookies}
    assert "httponly" in by_name["kai_access_token"]
    assert "httponly" in by_name["kai_refresh_token"]
    assert "httponly" not in by_name["kai_csrf_token"]
    assert all("samesite=lax" in c for c in by_name.values())


def test_wrong_password_is_rejected_with_a_generic_message():
    with SessionLocal() as db:
        ensure_test_admin(db)
    wrong = anon().post("/api/auth/operator/login", json={"email": TEST_ADMIN_EMAIL, "password": "nope"})
    unknown = anon().post("/api/auth/operator/login", json={"email": "nobody@example.com", "password": "nope"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json()["detail"] == unknown.json()["detail"]
    with SessionLocal() as db:
        auth_service.clear_attempts(db, "operator-login-ip:testclient")
        user = db.query(OperatorUser).filter(OperatorUser.email == TEST_ADMIN_EMAIL).first()
        user.failed_login_count = 0
        db.commit()


def test_account_locks_after_repeated_failures():
    email = f"lock.{uuid.uuid4().hex[:8]}@example.com"
    with SessionLocal() as db:
        auth_service.create_operator(db, email, "the-real-password", "Lock Test")
    client = anon()
    for _ in range(auth_service.MAX_FAILED_LOGINS):
        assert client.post("/api/auth/operator/login", json={"email": email, "password": "bad"}).status_code == 401
    locked = client.post("/api/auth/operator/login", json={"email": email, "password": "the-real-password"})
    assert locked.status_code == 429
    with SessionLocal() as db:
        auth_service.clear_attempts(db, "operator-login-ip:testclient")


def test_ip_throttle_blocks_password_spraying():
    with SessionLocal() as db:
        for _ in range(auth_service.MAX_LOGINS_PER_IP):
            db.add(auth_service.AuthAttempt(key="operator-login-ip:testclient"))
        db.commit()
    res = anon().post("/api/auth/operator/login", json={"email": "a@example.com", "password": "x"})
    assert res.status_code == 429
    with SessionLocal() as db:
        auth_service.clear_attempts(db, "operator-login-ip:testclient")


def test_demo_login_is_disabled_in_production():
    with mock.patch.object(settings, "ENVIRONMENT", "production"):
        assert anon().post("/api/auth/operator/demo-login").status_code == 404


# ---------------------------------------------------------------- access tokens

def test_anonymous_and_forged_tokens_are_rejected():
    assert anon().get("/api/v1/drafts/stats").status_code == 401
    forged = jwt.encode({"typ": "access", "sub": "x", "role": "ADMIN", "jti": "j", "iat": 1, "exp": 9999999999}, "wrong-key" * 6, algorithm="HS256")
    assert anon().get("/api/v1/drafts/stats", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_http_basic_no_longer_authenticates():
    assert anon().get("/api/v1/drafts/stats", auth=("admin", "kai_admin_2026")).status_code == 401


def test_expired_access_token_is_rejected(admin_client):
    claims = jwt.decode(admin_client.cookies["kai_access_token"], options={"verify_signature": False})
    claims["exp"] = int(time.time()) - 5
    expired = jwt.encode(claims, settings.AUTH_SECRET_KEY, algorithm="HS256")
    assert anon().get("/api/v1/drafts/stats", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_guest_token_cannot_reach_admin_routes(guest_client):
    token = guest_client.cookies["kai_guest_session"]
    assert anon().get("/api/v1/drafts/stats", headers={"Authorization": f"Bearer {token}"}).status_code == 401


# ---------------------------------------------------------------- refresh rotation

def test_refresh_rotates_token_and_old_access_session_stays_usable(admin_client):
    old_refresh = admin_client.cookies["kai_refresh_token"]
    res = admin_client.post("/api/auth/operator/refresh")
    assert res.status_code == 200, res.text
    assert admin_client.cookies["kai_refresh_token"] != old_refresh
    admin_client.headers["X-KAI-CSRF-Token"] = admin_client.cookies["kai_csrf_token"]
    assert admin_client.get("/api/auth/me").status_code == 200


def test_stolen_refresh_token_reuse_revokes_whole_family(admin_client):
    stolen = admin_client.cookies["kai_refresh_token"]
    assert admin_client.post("/api/auth/operator/refresh").status_code == 200
    legitimate_access = admin_client.cookies["kai_access_token"]

    with SessionLocal() as db:
        with pytest.raises(auth_service.RefreshReplayError):
            auth_service.rotate_refresh_token(db, stolen, "203.0.113.9", "attacker")

    # The session is dead for the legitimate holder too.
    assert anon().get("/api/v1/drafts/stats", headers={"Authorization": f"Bearer {legitimate_access}"}).status_code == 401
    current = admin_client.cookies["kai_refresh_token"]
    with SessionLocal() as db:
        with pytest.raises(auth_service.AuthError):
            auth_service.rotate_refresh_token(db, current, "127.0.0.1", "pytest")


def test_refresh_replay_through_the_route_returns_401_and_clears_cookies(admin_client):
    stolen = admin_client.cookies["kai_refresh_token"]
    csrf = admin_client.cookies["kai_csrf_token"]
    assert admin_client.post("/api/auth/operator/refresh").status_code == 200
    attacker = anon()
    attacker.cookies.set("kai_refresh_token", stolen)
    attacker.cookies.set("kai_csrf_token", csrf)
    res = attacker.post("/api/auth/operator/refresh", headers={"X-KAI-CSRF-Token": csrf})
    assert res.status_code == 401
    assert any(c.startswith("kai_refresh_token=") for c in res.headers.get_list("set-cookie"))


def test_refresh_requires_csrf(admin_client):
    del admin_client.headers["X-KAI-CSRF-Token"]
    assert admin_client.post("/api/auth/operator/refresh").status_code == 403


def test_expired_session_cannot_refresh(admin_client):
    raw = admin_client.cookies["kai_refresh_token"]
    with SessionLocal() as db:
        session = auth_service.find_session_by_refresh_token(db, raw)
        session.expires_at = auth_service.utc_now() - timedelta(minutes=1)
        db.commit()
    assert admin_client.post("/api/auth/operator/refresh").status_code == 401


def test_logout_revokes_server_side_session(admin_client):
    access = admin_client.cookies["kai_access_token"]
    assert admin_client.post("/api/auth/operator/logout").status_code == 200
    assert anon().get("/api/auth/me", headers={"Authorization": f"Bearer {access}"}).status_code == 401


def test_token_version_bump_ends_existing_sessions(admin_client):
    access = admin_client.cookies["kai_access_token"]
    with SessionLocal() as db:
        user = db.query(OperatorUser).filter(OperatorUser.email == TEST_ADMIN_EMAIL).first()
        user.token_version += 1
        db.commit()
    assert anon().get("/api/auth/me", headers={"Authorization": f"Bearer {access}"}).status_code == 401


# ---------------------------------------------------------------- CSRF + admin access

def test_cookie_mutation_requires_matching_csrf(admin_client):
    with SessionLocal() as db:
        draft = ActionDraft(type="outreach", guest_name="CSRF Test", content="x", status="pending_review")
        db.add(draft)
        db.commit()
        draft_id = draft.id
    token = admin_client.headers.pop("X-KAI-CSRF-Token")
    assert admin_client.post(f"/api/v1/drafts/{draft_id}/discard").status_code == 403
    assert admin_client.post(f"/api/v1/drafts/{draft_id}/discard", headers={"X-KAI-CSRF-Token": "wrong"}).status_code == 403
    assert admin_client.post(f"/api/v1/drafts/{draft_id}/discard", headers={"X-KAI-CSRF-Token": token}).status_code == 200


def test_unsigned_csrf_cookie_is_rejected(admin_client):
    admin_client.cookies.set("kai_csrf_token", "planted.value")
    assert admin_client.post("/api/v1/drafts/batch-approve", headers={"X-KAI-CSRF-Token": "planted.value"}).status_code == 403


def test_admin_runs_privileged_crm_draft_and_intake_endpoints(admin_client):
    assert admin_client.get("/api/v1/drafts/stats").status_code == 200
    assert admin_client.get("/api/v1/sidecar/intakes").status_code == 200
    assert admin_client.get("/api/v1/bookings").status_code == 200
    assert admin_client.get("/api/v1/sidecar/webhooks/providers").status_code == 200


# ---------------------------------------------------------------- audit

def test_draft_decisions_are_attributed_to_the_authenticated_operator(admin_client):
    with SessionLocal() as db:
        draft = ActionDraft(type="concierge_guest_ping", guest_name="Audit Test", content="x", status="pending_review")
        db.add(draft)
        db.commit()
        draft_id = draft.id
        operator_id = db.query(OperatorUser).filter(OperatorUser.email == TEST_ADMIN_EMAIL).first().id

    # A spoofed name in the body must not change attribution.
    res = admin_client.post(f"/api/v1/drafts/{draft_id}/approve", json={"operator_name": "Somebody Else"})
    assert res.status_code == 200, res.text
    with SessionLocal() as db:
        draft = db.get(ActionDraft, draft_id)
        assert draft.dispatched_by == TEST_ADMIN_EMAIL
        assert draft.reviewed_by_operator_id == operator_id
        assert draft.reviewed_at is not None
        event = db.query(AuditEvent).filter(AuditEvent.action == "draft.approved", AuditEvent.entity_id == str(draft_id)).first()
        assert event.operator_id == operator_id


def test_clinical_hold_blocks_commit_until_nurse_clearance_is_audited(admin_client):
    res = admin_client.post("/api/v1/sidecar/intakes", json={
        "client_name": "Hold Test Guest",
        "email": f"hold.{uuid.uuid4().hex[:8]}@example.com",
        "phone": "+15550100",
        "sanctuary_slug": "nosara",
        "room_tier": "Suite",
        "clinical_profile": {"health_notes": "I have epilepsy."},
    })
    assert res.status_code == 200, res.text
    intake_id = res.json()["id"]
    with SessionLocal() as db:
        draft = db.query(ActionDraft).filter(ActionDraft.target_entity_id == intake_id).first()
        draft_id = draft.id
        assert draft.content.startswith("[CLINICAL HOLD]")

    blocked = admin_client.post(f"/api/v1/drafts/{draft_id}/approve", json={})
    assert blocked.status_code == 409
    assert blocked.json()["detail"]["error_code"] == "CLINICAL_HOLD_ACTIVE"
    batch = admin_client.post("/api/v1/drafts/batch-approve", json={"draft_ids": [draft_id]})
    assert batch.json()["failed_count"] == 1

    cleared = admin_client.post(f"/api/v1/sidecar/intakes/{intake_id}/clinical-hold/override", json={"reason": "Reviewed with neurologist; breathwork removed from plan."})
    assert cleared.status_code == 200, cleared.text
    with SessionLocal() as db:
        assert db.query(AuditEvent).filter(AuditEvent.action == "clinical_hold.override", AuditEvent.entity_id == intake_id).count() == 1
    assert admin_client.post(f"/api/v1/drafts/{draft_id}/approve", json={}).status_code == 200


# ---------------------------------------------------------------- guest isolation

def test_guest_a_gets_403_on_guest_b_dossier():
    a = make_guest_client(f"a.{uuid.uuid4().hex[:6]}@example.com", f"KAI-A{uuid.uuid4().hex[:6].upper()}")
    b = make_guest_client(f"b.{uuid.uuid4().hex[:6]}@example.com", f"KAI-B{uuid.uuid4().hex[:6].upper()}")
    assert a.get(f"/api/v1/sidecar/guest-portal/dossier/{a.guest_id}").status_code == 200
    assert a.get(f"/api/v1/sidecar/guest-portal/dossier/{b.guest_id}").status_code == 403
    assert anon().get(f"/api/v1/sidecar/guest-portal/dossier/{a.guest_id}").status_code == 401


def test_guest_sees_their_own_retreat_not_a_default():
    guest = make_guest_client(f"pv.{uuid.uuid4().hex[:6]}@example.com", f"KAI-P{uuid.uuid4().hex[:6].upper()}")
    data = guest.get("/api/v1/sidecar/guest-portal/me").json()
    assert data["sanctuary"]["dates"] == "January 28 – 31, 2027"
    assert "Puerto Vallarta" in data["sanctuary"]["destination"]
    assert data["weather"]["temperature_celsius"] is not None
    assert data["weather"]["humidity_percent"] is not None

    bespoke = make_guest_client(f"be.{uuid.uuid4().hex[:6]}@example.com", f"KAI-C{uuid.uuid4().hex[:6].upper()}", sanctuary_slug="custom")
    assert "Nosara" not in bespoke.get("/api/v1/sidecar/guest-portal/me").text


def test_guest_mutation_acts_only_on_own_record_and_requires_csrf(guest_client):
    payload = {"flight_number": "UA 142", "delay_minutes": 10}
    csrf = guest_client.headers.pop("X-KAI-CSRF-Token")
    assert guest_client.post("/api/v1/sidecar/guest-portal/flight-update", json=payload).status_code in (401, 403)
    res = guest_client.post("/api/v1/sidecar/guest-portal/flight-update", json=payload, headers={"X-KAI-CSRF-Token": csrf})
    assert res.status_code == 200, res.text


def test_guest_sign_in_does_not_break_operator_session_in_same_browser(admin_client):
    operator_csrf = admin_client.cookies["kai_csrf_token"]
    email, reference = f"both.{uuid.uuid4().hex[:6]}@example.com", f"KAI-B{uuid.uuid4().hex[:6].upper()}"
    guest = make_guest_client(email, reference)
    # The same browser now holds both sessions.
    admin_client.cookies.set("kai_guest_session", guest.cookies["kai_guest_session"])
    admin_client.cookies.set("kai_guest_csrf_token", guest.cookies["kai_guest_csrf_token"])
    assert admin_client.cookies["kai_csrf_token"] == operator_csrf
    assert admin_client.post("/api/v1/drafts/batch-approve", json={"draft_ids": []}).status_code == 200


def test_guest_otp_requires_matching_details_and_is_single_use():
    email = f"otp.{uuid.uuid4().hex[:6]}@example.com"
    reference = f"KAI-O{uuid.uuid4().hex[:6].upper()}"
    make_guest_client(email, reference)
    with SessionLocal() as db:
        code = auth_service.issue_guest_otp(db, email, reference)
    client = anon()
    assert client.post("/api/auth/guest/verify", json={"email": "other@example.com", "booking_reference": reference, "otp": code}).status_code == 401
    assert client.post("/api/auth/guest/verify", json={"email": email, "booking_reference": reference, "otp": code}).status_code == 200
    assert anon().post("/api/auth/guest/verify", json={"email": email, "booking_reference": reference, "otp": code}).status_code == 401


def test_guest_otp_burns_after_too_many_wrong_guesses():
    email = f"burn.{uuid.uuid4().hex[:6]}@example.com"
    reference = f"KAI-U{uuid.uuid4().hex[:6].upper()}"
    make_guest_client(email, reference)
    with SessionLocal() as db:
        code = auth_service.issue_guest_otp(db, email, reference)
    wrong = "000000" if code != "000000" else "111111"
    client = anon()
    for _ in range(auth_service.MAX_OTP_ATTEMPTS):
        client.post("/api/auth/guest/verify", json={"email": email, "booking_reference": reference, "otp": wrong})
    assert client.post("/api/auth/guest/verify", json={"email": email, "booking_reference": reference, "otp": code}).status_code == 401


def test_request_access_does_not_reveal_whether_a_booking_exists():
    res = anon().post("/api/auth/guest/request-access", json={"email": f"x{uuid.uuid4().hex[:6]}@example.com", "booking_reference": "KAI-NOPE1"})
    assert res.status_code == 200
    assert "If those details match" in res.json()["message"]


def test_revoked_guest_session_stops_working(guest_client):
    assert guest_client.post("/api/auth/guest/logout").status_code == 200
    assert guest_client.get("/api/v1/sidecar/guest-portal/validate").status_code == 401


# ---------------------------------------------------------------- webhooks

FLIGHT_EVENT = {"event_type": "flight.status_update", "flight": "AA 1"}


def test_webhook_valid_signature_is_accepted():
    res = anon().post("/api/v1/sidecar/webhooks/flight-desk", **signed_webhook_request({**FLIGHT_EVENT, "event_id": uuid.uuid4().hex}))
    assert res.status_code == 200, res.text


@pytest.mark.parametrize("path", [
    "/api/v1/sidecar/webhooks/flight-desk",
    "/api/v1/sidecar/webhooks/hospitality",
    "/api/v1/sidecar/webhook/whatsapp",
    "/api/v1/sidecar/email-in/ingest",
])
def test_webhook_missing_or_tampered_signature_is_rejected(path):
    assert anon().post(path, json=FLIGHT_EVENT).status_code == 401
    wrong_key = signed_webhook_request(FLIGHT_EVENT, secret="not-the-real-secret")
    assert anon().post(path, **wrong_key).status_code == 401
    tampered = signed_webhook_request(FLIGHT_EVENT)
    tampered["content"] = tampered["content"].replace(b"AA 1", b"AA 2")
    assert anon().post(path, **tampered).status_code == 401


def test_webhook_stale_timestamp_is_rejected():
    stale = signed_webhook_request(FLIGHT_EVENT, timestamp=int(time.time()) - 301)
    assert anon().post("/api/v1/sidecar/webhooks/flight-desk", **stale).status_code == 401


def test_webhook_cannot_refresh_timestamp_on_a_captured_signature():
    old = signed_webhook_request(FLIGHT_EVENT, timestamp=int(time.time()) - 400)
    old["headers"]["X-KAI-Timestamp"] = str(int(time.time()))
    assert anon().post("/api/v1/sidecar/webhooks/flight-desk", **old).status_code == 401


# ---------------------------------------------------------------- production configuration

def test_production_rejects_default_and_weak_secrets():
    with mock.patch.object(settings, "AUTH_SECRET_KEY", "short"):
        assert "AUTH_SECRET_KEY" in settings.insecure_default_secrets()
    with mock.patch.object(settings, "AUTH_SECRET_KEY", "kai_dev_only_auth_secret_do_not_use_in_production"):
        assert "AUTH_SECRET_KEY" in settings.insecure_default_secrets()
    with mock.patch.object(settings, "AUTH_SECRET_KEY", "x" * 48):
        assert "AUTH_SECRET_KEY" not in settings.insecure_default_secrets()
