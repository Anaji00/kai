"""Password reset, staff invitations and deactivation."""
import uuid
from datetime import timedelta
from unittest import mock

import pytest
from fastapi.testclient import TestClient

from backend.database import SessionLocal
from backend.main import app
from backend.models import AuditEvent, AuthAttempt, OperatorUser, PasswordResetToken
from backend.services import auth_service

PASSWORD = "a-genuine-staff-password"


def anon():
    return TestClient(app)


@pytest.fixture(autouse=True)
def clear_throttles():
    with SessionLocal() as db:
        db.query(AuthAttempt).filter(AuthAttempt.key.like("password-reset%")).delete(synchronize_session=False)
        db.commit()


@pytest.fixture
def outbox():
    """Captures access emails, with delivery succeeding."""
    with mock.patch("backend.routers.staff.send_access_email", return_value=True) as sender:
        with mock.patch("backend.routers.staff.send_password_changed_email"):
            yield sender


def token_from(sender):
    link = sender.call_args.args[2]
    return link.split("#token=")[1].split("&")[0]


def invite(admin_client, outbox):
    email = f"staff.{uuid.uuid4().hex[:8]}@example.com"
    res = admin_client.post("/api/auth/staff", json={"email": email, "full_name": "Test Staff"})
    assert res.status_code == 201, res.text
    return email, res.json()["staff"]["id"], token_from(outbox)


def activate(admin_client, outbox):
    email, user_id, token = invite(admin_client, outbox)
    assert anon().post("/api/auth/operator/password-reset/confirm", json={"token": token, "password": PASSWORD}).status_code == 200
    client = anon()
    assert client.post("/api/auth/operator/login", json={"email": email, "password": PASSWORD}).status_code == 200
    return email, user_id, client


def test_invited_staff_sets_password_and_signs_in(admin_client, outbox):
    email, user_id, client = activate(admin_client, outbox)
    assert client.get("/api/auth/me").json()["email"] == email
    staff = {row["id"]: row for row in admin_client.get("/api/auth/staff").json()}
    assert staff[user_id]["status"] == "active"
    assert "password_hash" not in staff[user_id]


def test_invited_account_cannot_sign_in_before_setting_a_password(admin_client, outbox):
    email, user_id, _ = invite(admin_client, outbox)
    assert anon().post("/api/auth/operator/login", json={"email": email, "password": PASSWORD}).status_code == 401
    staff = {row["id"]: row for row in admin_client.get("/api/auth/staff").json()}
    assert staff[user_id]["status"] == "invited"


def test_reset_answers_identically_for_unknown_and_known_email(admin_client, outbox):
    email, _, _ = activate(admin_client, outbox)
    outbox.reset_mock()
    known = anon().post("/api/auth/operator/password-reset/request", json={"email": email})
    unknown = anon().post("/api/auth/operator/password-reset/request", json={"email": "nobody@example.com"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
    assert outbox.call_count == 1


def test_reset_changes_password_ends_sessions_and_link_is_single_use(admin_client, outbox):
    email, _, client = activate(admin_client, outbox)
    anon().post("/api/auth/operator/password-reset/request", json={"email": email})
    token = token_from(outbox)
    new_password = "another-genuine-password"

    assert anon().post("/api/auth/operator/password-reset/confirm", json={"token": token, "password": new_password}).status_code == 200
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/operator/refresh", headers={"X-KAI-CSRF-Token": client.cookies["kai_csrf_token"]}).status_code == 401
    assert anon().post("/api/auth/operator/login", json={"email": email, "password": PASSWORD}).status_code == 401
    assert anon().post("/api/auth/operator/login", json={"email": email, "password": new_password}).status_code == 200
    assert anon().post("/api/auth/operator/password-reset/confirm", json={"token": token, "password": "yet-another-password"}).status_code == 400


def test_new_link_cancels_the_earlier_one(admin_client, outbox):
    email, _, _ = activate(admin_client, outbox)
    anon().post("/api/auth/operator/password-reset/request", json={"email": email})
    first = token_from(outbox)
    anon().post("/api/auth/operator/password-reset/request", json={"email": email})
    assert anon().post("/api/auth/operator/password-reset/confirm", json={"token": first, "password": PASSWORD + "x"}).status_code == 400


def test_expired_link_and_short_password_are_rejected(admin_client, outbox):
    _, _, token = invite(admin_client, outbox)
    assert anon().post("/api/auth/operator/password-reset/confirm", json={"token": token, "password": "short"}).status_code == 422
    with SessionLocal() as db:
        row = db.query(PasswordResetToken).filter(PasswordResetToken.token_sha256 == auth_service.sha256_hex(token)).one()
        row.expires_at = auth_service.utc_now() - timedelta(minutes=1)
        db.commit()
    assert anon().post("/api/auth/operator/password-reset/confirm", json={"token": token, "password": PASSWORD}).status_code == 400


def test_database_stores_only_the_token_digest(admin_client, outbox):
    _, user_id, token = invite(admin_client, outbox)
    with SessionLocal() as db:
        rows = db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).all()
        assert rows and all(row.token_sha256 != token for row in rows)


def test_deactivation_blocks_access_immediately_and_is_audited(admin_client, outbox):
    email, user_id, client = activate(admin_client, outbox)
    assert admin_client.post(f"/api/auth/staff/{user_id}/deactivate").json()["status"] == "deactivated"
    assert client.get("/api/auth/me").status_code == 401
    assert anon().post("/api/auth/operator/login", json={"email": email, "password": PASSWORD}).status_code == 401

    outbox.reset_mock()
    anon().post("/api/auth/operator/password-reset/request", json={"email": email})
    assert outbox.call_count == 0
    with SessionLocal() as db:
        assert db.query(AuditEvent).filter(AuditEvent.action == "staff.deactivated", AuditEvent.entity_id == user_id).count() == 1

    assert admin_client.post(f"/api/auth/staff/{user_id}/reactivate").json()["status"] == "active"
    assert anon().post("/api/auth/operator/login", json={"email": email, "password": PASSWORD}).status_code == 200


def test_cannot_deactivate_yourself(admin_client):
    me = admin_client.get("/api/auth/me").json()["id"]
    assert admin_client.post(f"/api/auth/staff/{me}/deactivate").status_code == 409
    with SessionLocal() as db:
        assert db.query(OperatorUser).filter(OperatorUser.id == me).one().is_active


def test_duplicate_invitation_is_refused(admin_client, outbox):
    email, _, _ = invite(admin_client, outbox)
    assert admin_client.post("/api/auth/staff", json={"email": email.upper(), "full_name": "Again"}).status_code == 409


def test_staff_routes_require_an_admin_session_and_csrf(admin_client, outbox):
    assert anon().get("/api/auth/staff").status_code == 401
    assert anon().post("/api/auth/staff", json={"email": "x@example.com", "full_name": "X"}).status_code == 401
    no_csrf = TestClient(app, cookies=dict(admin_client.cookies))
    assert no_csrf.post("/api/auth/staff", json={"email": "y@example.com", "full_name": "Y"}).status_code == 403


def test_failed_email_gives_the_admin_the_link_to_pass_on(admin_client):
    email = f"staff.{uuid.uuid4().hex[:8]}@example.com"
    with mock.patch("backend.routers.staff.send_access_email", return_value=False):
        body = admin_client.post("/api/auth/staff", json={"email": email, "full_name": "No Mail"}).json()
    assert body["email_sent"] is False
    assert "/portal/reset-password#token=" in body["access_link"]


def test_reset_requests_are_throttled_per_ip():
    statuses = [anon().post("/api/auth/operator/password-reset/request", json={"email": "t@example.com"}).status_code for _ in range(11)]
    assert statuses[:10] == [200] * 10 and statuses[10] == 429
