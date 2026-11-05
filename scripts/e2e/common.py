"""Shared helpers for the black-box end-to-end and stress scripts. Everything goes over real HTTP."""
import hashlib
import hmac
import json
import os
import re
import subprocess
import time
import uuid
from contextlib import contextmanager

import httpx

BASE_URL = os.environ["E2E_BASE_URL"]
ADMIN_EMAIL = os.environ["E2E_ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["E2E_ADMIN_PASSWORD"]
WEBHOOK_SECRET = os.environ["E2E_WEBHOOK_SECRET"]
PG_CONTAINER = "kai-e2e-pg"
BACKEND_CONTAINER = "kai-e2e-be"


def unique(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:8]}"


def booking_payload(email=None, health_notes=None, reference=None, name=None):
    payload = {
        "fullName": name or f"Guest {unique()}",
        "email": email or f"{unique('guest.')}@example.com",
        "phone": "+1 713 555 0100",
        "retreatId": "puerto-vallarta-2027",
        "roomPreference": "private-suite",
        "movementExperience": "all-levels",
        "passportValid": "yes-valid-6mo",
        "healthNotes": health_notes,
        "intentions": "Rest and reset.",
        "waiverAccepted": True,
        "electronicSignature": name or "Test Guest",
    }
    if reference:
        payload["clientReference"] = reference
    return payload


def new_reference() -> str:
    return f"KAI-{uuid.uuid4().hex[:8].upper()}"


def sign(payload, timestamp=None, secret=None):
    """Returns (body bytes, headers) for a signed webhook delivery."""
    body = json.dumps(payload).encode()
    sent_at = str(timestamp if timestamp is not None else int(time.time()))
    digest = hmac.new((secret or WEBHOOK_SECRET).encode(), f"{sent_at}.".encode() + body, hashlib.sha256).hexdigest()
    return body, {"Content-Type": "application/json", "X-KAI-Timestamp": sent_at, "X-KAI-Signature-256": f"sha256={digest}"}


@contextmanager
def operator_client(timeout: float = 60.0):
    with httpx.Client(base_url=BASE_URL, timeout=timeout) as client:
        res = client.post("/api/auth/operator/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        res.raise_for_status()
        client.headers["X-KAI-CSRF-Token"] = client.cookies["kai_csrf_token"]
        yield client


def sql(query: str) -> str:
    """Reads the database directly, to check what really happened rather than what the API claims."""
    out = subprocess.run(
        ["docker", "exec", PG_CONTAINER, "psql", "-U", "postgres", "-d", "kai", "-tA", "-c", query],
        capture_output=True, text=True, check=True,
    )
    return out.stdout.strip()


def latest_otp(email: str, attempts: int = 20) -> str:
    """Staging logs guest codes because no email transport is configured; production never does."""
    for _ in range(attempts):
        logs = subprocess.run(["docker", "logs", BACKEND_CONTAINER], capture_output=True, text=True, encoding="utf-8", errors="replace")
        matches = re.findall(rf"Guest access code for {re.escape(email)}: (\d{{6}})", logs.stdout + logs.stderr)
        if matches:
            return matches[-1]
        time.sleep(0.5)
    raise AssertionError(f"No access code logged for {email}")


def wait_for(check, timeout: float = 20.0, interval: float = 0.25):
    """Polls until check() is truthy; bookings finish staging in a background task."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        value = check()
        if value:
            return value
        time.sleep(interval)
    raise AssertionError("Timed out waiting for background work")
