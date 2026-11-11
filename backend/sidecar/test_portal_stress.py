"""
Staff portal stress test: end-to-end CRM flows plus adversarial edge cases.

Each check states the behaviour the portal SHOULD have. A failure means a real defect,
not a flaky test. Run from the repo root:

    python -u backend/sidecar/test_portal_stress.py

Note: Starlette's TestClient opens a loopback socket pair for its event loop, so this
script cannot run inside a sandbox that blocks local sockets.
"""

import os
import sys
import time
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient  # noqa: E402
from backend.main import app  # noqa: E402
from backend.testing import admin_headers  # noqa: E402
from backend.database import SessionLocal, init_db  # noqa: E402
from backend.models import Booking, ActionDraft  # noqa: E402
from backend.sidecar.models import CRMClient, CRMTrip, StagingIntake  # noqa: E402

API = "/api/v1/sidecar/crm"
RUN = uuid.uuid4().hex[:8]
TEST_DOMAIN = f"stress-{RUN}.kai-test.invalid"


class Report:
    def __init__(self):
        self.passed, self.failed, self.failures = 0, 0, []

    def check(self, ok, label, detail=""):
        if ok:
            self.passed += 1
            print(f"  [PASS] {label}")
        else:
            self.failed += 1
            self.failures.append(f"{label} {detail}".strip())
            print(f"  [FAIL] {label} {detail}")


R = Report()
init_db()
H = admin_headers()
# A server crash must show up as a 500 failure, not abort the whole run.
c = TestClient(app, headers=H, raise_server_exceptions=False)
anon = TestClient(app, raise_server_exceptions=False)


def email(tag):
    return f"{tag}@{TEST_DOMAIN}"


def new_trip(total=10000.0, tag=None):
    tag = tag or uuid.uuid4().hex[:6]
    r = c.post(f"{API}/trips", json={"client_name": f"Stress {tag}", "client_email": email(tag), "total_investment": total})
    return r


def section(name):
    print(f"\n--- {name} ---")


# 1. Authentication & authorization ------------------------------------------------------
section("1. Authentication")
for method, path in [("get", f"{API}/clients"), ("post", f"{API}/trips"), ("get", "/api/v1/drafts"),
                     ("get", "/api/v1/sidecar/intakes/telemetry/cohorts")]:
    r = getattr(anon, method)(path)
    R.check(r.status_code in (401, 403), f"Anonymous {method.upper()} {path} is rejected", f"(got {r.status_code})")
r = anon.get(f"{API}/clients", headers={"Authorization": "Bearer not-a-real-token"})
R.check(r.status_code in (401, 403), "Forged bearer token is rejected", f"(got {r.status_code})")
r = anon.get(f"{API}/clients", headers={"Authorization": H["Authorization"][:-4] + "AAAA"})
R.check(r.status_code in (401, 403), "Tampered token signature is rejected", f"(got {r.status_code})")

# 2. Client ingestion & validation --------------------------------------------------------
section("2. Client ingestion & validation")
base = {"full_name": "Amara Okafor", "email": email("amara"), "dietary_requirements": "Celiac", "passport_valid_6mo": False}
r1 = c.post(f"{API}/clients", json=base)
R.check(r1.status_code == 200 and r1.json().get("is_new") is True, "New client created")
cid = r1.json()["client"]["id"] if r1.status_code == 200 else None
r2 = c.post(f"{API}/clients", json={**base, "email": "  " + base["email"].upper() + "  "})
R.check(r2.status_code == 200 and r2.json()["client"]["id"] == cid, "Upsert dedupes on case/whitespace-insensitive email")
r3 = c.post(f"{API}/clients", json={"full_name": "Amara Okafor", "email": base["email"], "phone": "+1 555 0100"})
R.check(r3.status_code == 200 and r3.json()["client"]["passport_valid_6mo"] is False,
        "Partial upsert does not silently reset a flagged passport to valid",
        f"(passport_valid_6mo={r3.json()['client'].get('passport_valid_6mo') if r3.status_code == 200 else '?'})")
r = c.post(f"{API}/clients", json={"full_name": "No Email", "email": "not-an-email"})
R.check(r.status_code == 422, "Malformed email is rejected", f"(got {r.status_code})")
r = c.post(f"{API}/clients", json={"full_name": "   ", "email": email("blankname")})
R.check(r.status_code == 422, "Blank full name is rejected", f"(got {r.status_code})")
r = c.post(f"{API}/clients", json={"email": email("noname")})
R.check(r.status_code == 422, "Missing full name is rejected", f"(got {r.status_code})")
inj = "Robert'); DROP TABLE crm_clients;-- <script>alert(1)</script>"
r = c.post(f"{API}/clients", json={"full_name": inj, "email": email("bobby"), "notes": inj})
R.check(r.status_code == 200 and r.json()["client"]["full_name"] == inj, "SQL/XSS payload stored verbatim as data, not executed")
R.check(c.get(f"{API}/clients").status_code == 200, "crm_clients table survives injection attempt")
uni = "Zoë Ñúñez-李小龍 🌺 ﷽"
r = c.post(f"{API}/clients", json={"full_name": uni, "email": email("unicode")})
R.check(r.status_code == 200 and r.json()["client"]["full_name"] == uni, "Unicode/emoji/RTL names round-trip intact")
r = c.post(f"{API}/clients", json={"full_name": "Huge Notes", "email": email("huge"), "notes": "x" * 200_000})
R.check(r.status_code in (200, 413, 422), "200KB notes payload handled without a 500", f"(got {r.status_code})")
r = c.get(f"{API}/clients", params={"q": "%' OR '1'='1"})
R.check(r.status_code == 200 and all(TEST_DOMAIN not in x["email"] or "'" in x["full_name"] or True for x in r.json()),
        "Search with SQL wildcard payload returns safely")
r = c.get(f"{API}/clients", params={"limit": -1})
R.check(r.status_code in (200, 422), "Negative page limit does not crash", f"(got {r.status_code})")
r = c.get(f"{API}/clients", params={"limit": 10_000_000})
R.check(r.status_code in (200, 422), "Absurd page limit does not crash", f"(got {r.status_code})")
r = c.get(f"{API}/clients/{uuid.uuid4()}")
R.check(r.status_code == 404, "Unknown client id returns 404", f"(got {r.status_code})")
r = c.patch(f"{API}/clients/{uuid.uuid4()}", json={"notes": "x"})
R.check(r.status_code == 404, "PATCH unknown client returns 404", f"(got {r.status_code})")
r = c.patch(f"{API}/clients/{cid}", json={"id": "hijacked", "email": "evil@x.com", "total_lifetime_spend": 1e9, "notes": "ok"})
d = c.get(f"{API}/clients/{cid}").json() if cid else {}
R.check(r.status_code == 200 and d.get("email", base["email"]) == base["email"] and (d.get("total_lifetime_spend") or 0) < 1e9,
        "PATCH ignores protected fields (id, email, lifetime spend)")

# 3. Trip proposals & money math ----------------------------------------------------------
section("3. Trip proposals & money math")
r = new_trip(14500.0, "pv")
R.check(r.status_code == 200, "Trip proposal created")
trip = r.json()["trip"] if r.status_code == 200 else {}
tid = trip.get("id")
R.check(abs(trip.get("deposit_amount", 0) + trip.get("final_balance", 0) - 14500.0) < 0.005, "Deposit + balance == total (no penny drift)")
R.check(trip.get("deposit_amount") == 4350.0, "Deposit is exactly 30%")
r = new_trip(1000.01, "odd")
t = r.json()["trip"] if r.status_code == 200 else {}
R.check(abs(t.get("deposit_amount", 0) + t.get("final_balance", 0) - 1000.01) < 0.005, "Odd-cent totals still reconcile")
for bad in (-5000.0, 0.0):
    r = new_trip(bad)
    R.check(r.status_code == 422, f"Trip with total_investment={bad} is rejected", f"(got {r.status_code})")
r = c.post(f"{API}/trips", json={"client_name": "X", "client_email": "nope", "total_investment": 100})
R.check(r.status_code == 422, "Trip with malformed email is rejected", f"(got {r.status_code})")
r = c.post(f"{API}/trips", json={"client_name": "X", "client_email": email("nan"), "total_investment": "NaN"})
R.check(r.status_code == 422, "Trip with NaN total is rejected", f"(got {r.status_code})")

# 4. Itinerary editing --------------------------------------------------------------------
section("4. Itinerary editing")
blocks = [{"day": d, "time": "08:00", "title": f"Day {d}"} for d in range(1, 8)]
r = c.patch(f"{API}/trips/{tid}/itinerary", json={"itinerary_blocks": blocks})
R.check(r.status_code == 200 and r.json()["activities_count"] == 7, "Full 7-day itinerary replaced")
r = c.patch(f"{API}/trips/{tid}/itinerary", json={"append_block": {"day": 8, "title": "Departure"}})
R.check(r.status_code == 200 and r.json()["activities_count"] == 8, "Block appended")
r = c.patch(f"{API}/trips/{tid}/itinerary", json={"itinerary_blocks": "not-a-list"})
R.check(r.status_code in (200, 422) and c.get(f"{API}/trips/{tid}").json().get("itinerary_blocks") is not None,
        "Non-list itinerary payload does not wipe existing blocks")
r = c.patch(f"{API}/trips/{tid}/itinerary", json={"status": "TOTALLY_MADE_UP_STATUS"})
R.check(r.status_code == 422, "Unknown trip status value is rejected", f"(got {r.status_code}, status={r.json().get('status') if r.status_code == 200 else ''})")
c.patch(f"{API}/trips/{tid}/itinerary", json={"status": "PROPOSED_ITINERARY"})
r = c.patch(f"{API}/trips/{uuid.uuid4()}/itinerary", json={"status": "CONFIRMED"})
R.check(r.status_code == 404, "Itinerary PATCH on unknown trip returns 404")

# 5. Payments ledger ----------------------------------------------------------------------
section("5. Payments ledger")
P = f"{API}/trips/{tid}/payments"
r = c.post(P, params={"amount": 2000, "transaction_reference": f"WIRE-{RUN}-1"})
R.check(r.status_code == 200 and r.json()["deposit_status"] == "PARTIALLY_PAID", "Partial deposit recorded as PARTIALLY_PAID")
r = c.post(P, params={"amount": 2350, "transaction_reference": f"WIRE-{RUN}-2"})
R.check(r.status_code == 200 and r.json()["deposit_status"] == "PAID" and r.json()["remaining_balance"] == 10150.0,
        "Deposit cleared at exactly 30%; balance $10,150.00")
r = c.post(P, params={"amount": 2350, "transaction_reference": f"WIRE-{RUN}-2"})
R.check(r.status_code in (200, 409) and (r.status_code == 409 or r.json().get("total_paid") == 4350.0),
        "Replaying the same transaction reference is not double-counted",
        f"(got {r.status_code}, total_paid={r.json().get('total_paid')})")
r = c.post(P, params={"amount": -1000, "transaction_reference": f"NEG-{RUN}"})
R.check(r.status_code == 422, "Negative payment amount is rejected", f"(got {r.status_code})")
r = c.post(P, params={"amount": 0, "transaction_reference": f"ZERO-{RUN}"})
R.check(r.status_code == 422, "Zero payment amount is rejected", f"(got {r.status_code})")
r = c.post(P, params={"currency": "EUR", "fx_amount": 100, "fx_rate": -2, "transaction_reference": f"FX-{RUN}"})
R.check(r.status_code == 422, "Negative FX rate is rejected", f"(got {r.status_code})")
ot = new_trip(5000.0, "over").json()["trip"]["id"]
r = c.post(f"{API}/trips/{ot}/payments", params={"amount": 9000, "transaction_reference": f"OVER-{RUN}"})
R.check(r.status_code in (409, 422) or (r.status_code == 200 and r.json().get("remaining_balance") == 0 and r.json().get("total_paid") <= 5000),
        "Overpayment beyond trip total is refused rather than silently absorbed",
        f"(got {r.status_code}, total_paid={r.json().get('total_paid') if r.status_code == 200 else ''})")
r = c.post(f"{API}/trips/{uuid.uuid4()}/payments", params={"amount": 10})
R.check(r.status_code == 404, "Payment on unknown trip returns 404")

# Concurrent payments: 20 parallel $100 payments must all land exactly once.
ct = new_trip(10000.0, "conc").json()["trip"]["id"]
def pay(i):
    return c.post(f"{API}/trips/{ct}/payments", params={"amount": 100, "transaction_reference": f"CONC-{RUN}-{i}"}).status_code
with ThreadPoolExecutor(max_workers=10) as ex:
    codes = list(ex.map(pay, range(20)))
detail = c.get(f"{API}/trips/{ct}").json()
paid = round(sum(p["amount"] for p in (detail.get("payment_history") or [])), 2)
R.check(all(x == 200 for x in codes) and paid == 2000.0, "20 concurrent payments all recorded exactly once (no lost updates)",
        f"(codes ok={sum(x == 200 for x in codes)}/20, ledger total=${paid})")

# 6. Flight / upgrade / cancellation guards -----------------------------------------------
section("6. Operational guards")
r = c.post(f"{API}/trips/{tid}/flight-delay", params={"delay_minutes": 0, "new_eta": "21:00 PVR"})
R.check(r.status_code == 422, "Flight delay of 0 minutes rejected")
r = c.post(f"{API}/trips/{tid}/flight-delay", params={"delay_minutes": 5000, "new_eta": "21:00 PVR"})
R.check(r.status_code == 422, "Flight delay > 24h rejected")
r = c.post(f"{API}/trips/{tid}/flight-delay", params={"delay_minutes": 95, "new_eta": "21:45 PVR"})
R.check(r.status_code == 200, "Valid 95-minute delay accepted")
r = c.post(f"{API}/trips/{tid}/upgrade", params={"new_room_tier": "Villa", "new_total_investment": 50})
R.check(r.status_code == 422, "Upgrade below minimum amount rejected")
r = c.post(f"{API}/trips/{tid}/upgrade", params={"new_room_tier": "Villa", "new_total_investment": 1000})
R.check(r.status_code in (400, 409, 422), "Upgrade to a total below what the guest already paid is refused",
        f"(got {r.status_code})")
r = c.post(f"{API}/trips/{tid}/cancellation", params={"days_prior_to_departure": -3, "cancellation_reason": "x"})
R.check(r.status_code == 422, "Negative days-prior cancellation rejected")
r = c.post(f"{API}/trips/{tid}/automate", params={"action_type": "draft_rm_rf"})
R.check(r.status_code in (400, 422), "Unknown automation action rejected", f"(got {r.status_code})")
r = c.get(f"{API}/sanctuaries/does-not-exist/dietary-manifest")
R.check(r.status_code in (200, 404), "Dietary manifest for unknown sanctuary handled", f"(got {r.status_code})")
r = c.get(f"{API}/sanctuaries/puerto-vallarta-2027/dietary-manifest")
R.check(r.status_code == 200, "Dietary manifest for live sanctuary generated")

# 7. Cohort capacity under contention -----------------------------------------------------
section("7. Cohort capacity")
slug = f"stress-cohort-{RUN}"
def reserve(i):
    return c.post(f"{API}/cohorts/{slug}/atomic-reserve",
                  params={"full_name": f"Guest {i}", "email": email(f"g{i}"), "phone": "+1 555 0000"}).json()
with ThreadPoolExecutor(max_workers=12) as ex:
    results = list(ex.map(reserve, range(30)))
allocated = sum(1 for x in results if x.get("allocated"))
with SessionLocal() as db:
    seats = db.query(Booking).filter(Booking.retreat_id == slug, Booking.status != "cancelled").count()
R.check(allocated == 14 and seats == 14, "30 parallel reservations never exceed 14-seat cap", f"(allocated={allocated}, seats={seats})")
r = c.post(f"{API}/cohorts/stress-dupe-{RUN}/atomic-reserve", params={"full_name": "Dupe", "email": email("dupe"), "phone": "1"})
r2 = c.post(f"{API}/cohorts/stress-dupe-{RUN}/atomic-reserve", params={"full_name": "Dupe", "email": email("dupe"), "phone": "1"})
with SessionLocal() as db:
    dupes = db.query(Booking).filter(Booking.retreat_id == f"stress-dupe-{RUN}").count()
R.check(dupes == 1, "Same guest reserving twice holds only one seat", f"(seats held={dupes})")
r = c.get("/api/v1/sidecar/intakes/telemetry/cohorts")
R.check(r.status_code == 200 and len(r.json()) >= 1, "Cohort telemetry endpoint returns 200")

# 8. Review queue invariant ---------------------------------------------------------------
section("8. Human review queue")
with SessionLocal() as db:
    leaked = db.query(ActionDraft).filter(ActionDraft.recipient_email.like(f"%{TEST_DOMAIN}"),
                                          ActionDraft.status != "pending_review").count()
    staged = db.query(ActionDraft).filter(ActionDraft.recipient_email.like(f"%{TEST_DOMAIN}")).count()
R.check(staged > 0 and leaked == 0, f"All {staged} generated messages wait in pending_review (zero autonomous sends)")
r = c.post("/api/v1/drafts/999999999/approve")
R.check(r.status_code == 404, "Approving a non-existent draft returns 404", f"(got {r.status_code})")
r = c.post("/api/v1/drafts/not-a-number/approve")
R.check(r.status_code in (404, 422), "Approving a malformed draft id is rejected", f"(got {r.status_code})")

# 9. Throughput -------------------------------------------------------------------------
section("9. Throughput")
t0 = time.time()
with ThreadPoolExecutor(max_workers=16) as ex:
    codes = list(ex.map(lambda _: c.get(f"{API}/clients", params={"limit": 50}).status_code, range(200)))
dt = time.time() - t0
R.check(all(x == 200 for x in codes), f"200 concurrent client-list reads all succeed ({dt:.2f}s, {200 / dt:.0f} req/s)")

# Cleanup ---------------------------------------------------------------------------------
with SessionLocal() as db:
    like = f"%{TEST_DOMAIN}"
    db.query(ActionDraft).filter(ActionDraft.recipient_email.like(like)).delete(synchronize_session=False)
    db.query(CRMTrip).filter(CRMTrip.client_email.like(like)).delete(synchronize_session=False)
    db.query(CRMClient).filter(CRMClient.email.like(like)).delete(synchronize_session=False)
    db.query(Booking).filter(Booking.email.like(like)).delete(synchronize_session=False)
    db.query(StagingIntake).filter(StagingIntake.email.like(like)).delete(synchronize_session=False)
    db.commit()

print("\n" + "=" * 64)
print(f"PORTAL STRESS TEST: {R.passed + R.failed} checks | PASSED {R.passed} | FAILED {R.failed}")
for f in R.failures:
    print(f"  - {f}")
print("=" * 64)
sys.exit(1 if R.failed else 0)
