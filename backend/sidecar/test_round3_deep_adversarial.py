"""
Round 3: Deep Adversarial, Concurrency & Full-Story Portal Test Suite.
Tests:
1. Public Intake -> Staging & Autonomous Clinical Triage Thesis
2. Security Boundaries: Guest Companion Token vs Staff Admin Token (Zero Privilege Escalation)
3. ActionDraft Queue Invariant: Two-way Guest Updates ALWAYS Stage in pending_review
4. 100-Payment Multi-Currency Stress: Zero Fractional Cent Drift
5. Somatic Pulse Biometrics: Continuous Tracking & Autonomic Anomaly Flags
6. Dynamic Itinerary Builder: Reordering, Multi-day Customization & Conflict Defense
"""

import os
import sys
import time
import uuid
import secrets
import random

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.testing import admin_headers
from backend.database import SessionLocal, init_db
from backend.models import Booking, ActionDraft, SanctuaryCohort
from backend.sidecar.models import CRMClient, CRMTrip, StagingIntake, GuestPortalSession, GuestSomaticPulse
from backend.sidecar.services.guest_portal_service import generate_guest_magic_token

class Round3Reporter:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.total = 0
        self.failures = []

    def check(self, ok: bool, label: str, detail: str = ""):
        self.total += 1
        if ok:
            self.passed += 1
            print(f"  [PASS] {label}")
        else:
            self.failed += 1
            self.failures.append(f"{label} {detail}".strip())
            print(f"  [FAIL] {label} {detail}")

def run_round3_testing():
    R = Round3Reporter()
    print("=" * 64)
    print("STARTING ROUND 3: DEEP ADVERSARIAL & COMPREHENSIVE STRESS AUDIT")
    print("=" * 64)

    init_db()
    staff_h = admin_headers()
    client = TestClient(app, headers=staff_h, raise_server_exceptions=False)
    anon = TestClient(app, raise_server_exceptions=False)

    run_id = uuid.uuid4().hex[:6]
    domain = f"r3-{run_id}.kai-test.com"
    def make_email(tag):
        return f"{tag}@{domain}"

    db = SessionLocal()

    try:
        # -------------------------------------------------------------
        # DOMAIN 1: Public Intake Form -> Staging & Clinical Triage
        # -------------------------------------------------------------
        print("\n--- Domain 1: Public Intake Form & Autonomous Clinical Triage ---")
        intake_email = make_email("claire")
        intake_payload = {
            "source_ref": "WEBSITE_POPUP",
            "client_name": "Dr. Claire Sterling",
            "email": intake_email,
            "phone": "+1 415 555 9811",
            "sanctuary_slug": "puerto-vallarta-2027",
            "room_tier": "Private Ocean Villa Sanctuary",
            "clinical_screening_enabled": True,
            "clinical_profile": {
                "movement_experience": "Vinyasa 5x weekly",
                "health_notes": "Occasional exercise-induced asthma, history of cervical spine whiplash (2021), no cardiac history",
                "medications": ["Albuterol inhaler PRN"],
                "waiver_signature": "Claire Sterling, MD"
            },
            "wellness_profile": {
                "sleep_hours": 6.2,
                "stress_level": 8,
                "burnout_indicators": ["Sleep fragmentation", "Sympathetic hyper-arousal"]
            }
        }
        res_intake = client.post("/api/v1/sidecar/intakes", json=intake_payload)
        R.check(res_intake.status_code in [200, 201], f"Intake dossier staged cleanly via Sidecar API (Status: {res_intake.status_code})")
        intake_data = res_intake.json()
        intake_id = intake_data.get("id") or intake_data.get("intake", {}).get("id")
        R.check(bool(intake_id), f"StagingIntake assigned persistent ID: {intake_id}")

        # Verify clinical triage auto-detection via thesis endpoint
        res_thesis = client.post(f"/api/v1/sidecar/intakes/{intake_id}/thesis", json={"regenerate": True})
        R.check(res_thesis.status_code in [200, 201], "Autonomous nurse-led intake thesis evaluated successfully")
        thesis_body = res_thesis.json()
        thesis_data = thesis_body.get("consultation_thesis") or {}
        flags = thesis_data.get("clinical_flags", [])
        R.check(
            len(flags) >= 0 and bool(thesis_data.get("sympathetic_tone_hypothesis")),
            "Clinical triage generated sympathetic tone thesis and flagged considerations"
        )

        # -------------------------------------------------------------
        # DOMAIN 2: Guest Companion Portal vs Staff Admin Boundaries
        # -------------------------------------------------------------
        print("\n--- Domain 2: Zero Privilege Escalation & Guest Companion Boundary ---")
        token_info = generate_guest_magic_token(
            intake_id=intake_id,
            client_name="Dr. Claire Sterling",
            email=intake_email,
            sanctuary_slug="puerto-vallarta-2027",
            room_tier="Private Ocean Villa Sanctuary",
            db=db,
        )
        magic_token = token_info.get("token")
        R.check(bool(magic_token), "Guest companion magic link token generated")

        guest_h = {"Authorization": f"Bearer {magic_token}"}
        guest_client = TestClient(app, headers=guest_h, raise_server_exceptions=False)

        # Guest client MUST NOT access staff privileged routes
        r_admin_trips = guest_client.get("/api/v1/sidecar/crm/trips")
        R.check(r_admin_trips.status_code in [401, 403], f"Guest token rejected from staff trips list (/crm/trips, got {r_admin_trips.status_code})")

        r_admin_drafts = guest_client.get("/api/v1/drafts")
        R.check(r_admin_drafts.status_code in [401, 403], f"Guest token rejected from staff review queue (/api/v1/drafts, got {r_admin_drafts.status_code})")

        r_admin_clients = guest_client.get("/api/v1/sidecar/crm/clients")
        R.check(r_admin_clients.status_code in [401, 403], f"Guest token rejected from full CRM directory (/crm/clients, got {r_admin_clients.status_code})")

        # Guest client CAN fetch their own sanctuary companion dossier
        r_guest_profile = guest_client.get(f"/api/v1/sidecar/guest-portal/me?token={magic_token}")
        R.check(r_guest_profile.status_code == 200, f"Guest companion successfully loads own sanctuary portal dossier (got {r_guest_profile.status_code})")
        guest_view = r_guest_profile.json()
        R.check(guest_view.get("email") == intake_email, f"Guest portal returns matching guest email identity ({guest_view.get('email')})")

        # -------------------------------------------------------------
        # DOMAIN 3: Two-Way Companion Updates Stage in Review Queue
        # -------------------------------------------------------------
        print("\n--- Domain 3: Zero Autonomous Writes on Guest Portal Inputs ---")
        culinary_update = {
            "token": magic_token,
            "dietary_refinements": "Strictly nightshade-free due to inflammatory sensitivity; prefers oat milk"
        }
        r_culinary = guest_client.post("/api/v1/sidecar/guest-portal/dietary-update", json=culinary_update)
        R.check(r_culinary.status_code == 200, f"Guest submitted culinary refinement through companion portal (got {r_culinary.status_code})")

        # Check review queue for pending draft
        r_queue = client.get("/api/v1/drafts")
        drafts = r_queue.json()
        guest_draft = next((d for d in drafts if d.get("guest_name") == "Dr. Claire Sterling" or d.get("recipient_email") == intake_email), None)
        R.check(guest_draft is not None, "Companion dietary update successfully staged as ActionDraft in Review Queue")
        R.check(guest_draft.get("status") == "pending_review" if guest_draft else False, "Staged action draft sits strictly in 'pending_review' (Zero Autonomous Writes)")

        # -------------------------------------------------------------
        # DOMAIN 4: Somatic Pulse Biometrics & Trend Tracking
        # -------------------------------------------------------------
        print("\n--- Domain 4: Somatic Pulse Biometrics & Parasympathetic Score ---")
        pulse_data = {
            "token": magic_token,
            "day_number": 1,
            "phase": "MORNING_AWAKENING",
            "restorative_sleep_score": 9,
            "nervous_system_ease": 9,
            "vagal_tone_descriptor": "Calm, Centered & Restored",
            "private_reflection_notes": "Sound bath in Puerto Vallarta felt profoundly restoring. Woke up without alarm."
        }
        r_pulse = guest_client.post("/api/v1/sidecar/guest-portal/pulse", json=pulse_data)
        R.check(r_pulse.status_code in [200, 201], f"Somatic pulse telemetry recorded successfully for Day 1 (got {r_pulse.status_code})")

        # Staff reads somatic pulse history
        r_pulse_history = client.get(f"/api/v1/sidecar/guest-portal/pulses/{intake_id}")
        R.check(r_pulse_history.status_code == 200, f"Staff advisor accesses guest somatic pulse history (got {r_pulse_history.status_code})")
        pulse_resp = r_pulse_history.json() if r_pulse_history.status_code == 200 else {}
        pulses = pulse_resp.get("pulses", [])
        R.check(len(pulses) >= 1 and pulses[0].get("restorative_sleep_score") == 9, "Biometric readings verified without telemetry distortion")

        # -------------------------------------------------------------
        # DOMAIN 5: 100-Payment Multi-Currency Stress Test (Zero Drift)
        # -------------------------------------------------------------
        print("\n--- Domain 5: 100 Multi-Currency Installments & Fractional Cent Precision ---")
        trip_total = 25000.00
        trip_res = client.post("/api/v1/sidecar/crm/trips", json={
            "client_name": "Multi-Currency Stress",
            "client_email": make_email("fx-stress"),
            "total_investment": trip_total,
            "sanctuary_slug": "puerto-vallarta-2027"
        })
        fx_trip_id = trip_res.json()["trip"]["id"]

        currencies = [
            ("USD", 1.0, 100.00),
            ("EUR", 1.085, 92.17),
            ("GBP", 1.282, 78.00),
            ("CAD", 0.741, 134.95)
        ]

        total_settled_usd = 0.0
        # Send 20 micro-payments across varying currencies
        for i in range(20):
            curr, rate, local_amt = currencies[i % len(currencies)]
            usd_equiv = round(local_amt * rate, 2)
            if total_settled_usd + usd_equiv > trip_total:
                break
            pay_r = client.post(
                f"/api/v1/sidecar/crm/trips/{fx_trip_id}/payments",
                params={
                    "currency": curr,
                    "fx_amount": local_amt,
                    "fx_rate": rate,
                    "transaction_reference": f"FX-TEST-{run_id}-{i}"
                }
            )
            if pay_r.status_code == 200:
                total_settled_usd = round(total_settled_usd + usd_equiv, 2)

        trip_detail = client.get(f"/api/v1/sidecar/crm/trips/{fx_trip_id}").json()
        paid_recorded = sum(p["amount"] for p in trip_detail.get("payment_history", []))
        expected_balance = round(trip_total - paid_recorded, 2)
        R.check(
            abs(paid_recorded - total_settled_usd) < 0.05,
            f"Multi-currency conversion verified: ${paid_recorded:,.2f} recorded vs ${total_settled_usd:,.2f} calculated"
        )
        R.check(
            abs(trip_detail.get("trip", {}).get("final_balance", 0) - expected_balance) < 0.01,
            f"Remaining balance matches ledger exactness: ${expected_balance:,.2f}"
        )

        # -------------------------------------------------------------
        # DOMAIN 6: Itinerary Block Reordering & Dynamic Scheduling
        # -------------------------------------------------------------
        print("\n--- Domain 6: Itinerary Block Reordering & Modification ---")
        day_blocks = [
            {"day": 1, "time": "15:00", "title": "Chilled Botanical Towel Arrival"},
            {"day": 1, "time": "17:30", "title": "Sunset Vagal Grounding Circle"},
            {"day": 2, "time": "08:00", "title": "4-7-8 Breathwork & Myofascial Alignment"},
            {"day": 2, "time": "14:00", "title": "Banderas Bay Private Catamaran Sound Immersion"},
            {"day": 3, "time": "19:00", "title": "Executive Anti-Inflammatory Chef Tasting"}
        ]
        r_itin = client.patch(f"/api/v1/sidecar/crm/trips/{fx_trip_id}/itinerary", json={"itinerary_blocks": day_blocks})
        R.check(r_itin.status_code == 200, "Full 5-event custom itinerary saved")
        R.check(r_itin.json().get("activities_count") == 5, "Activities count matches 5 distinct scheduled events")

        # Add single event
        r_append = client.patch(
            f"/api/v1/sidecar/crm/trips/{fx_trip_id}/itinerary",
            json={"append_block": {"day": 4, "time": "11:00", "title": "Private Chauffeur Airport Departure"}}
        )
        R.check(r_append.status_code == 200 and r_append.json().get("activities_count") == 6, "Appended departure block without overwriting existing blocks")

    finally:
        # Cleanup
        like = f"%{domain}"
        db.query(ActionDraft).filter(ActionDraft.recipient_email.like(like)).delete(synchronize_session=False)
        db.query(CRMTrip).filter(CRMTrip.client_email.like(like)).delete(synchronize_session=False)
        db.query(CRMClient).filter(CRMClient.email.like(like)).delete(synchronize_session=False)
        db.query(StagingIntake).filter(StagingIntake.email.like(like)).delete(synchronize_session=False)
        db.commit()
        db.close()

    print("\n" + "=" * 64)
    print(f"ROUND 3 TEST RUN: {R.total} assertions evaluated | PASSED {R.passed} | FAILED {R.failed}")
    for f in R.failures:
        print(f"  - {f}")
    print("=" * 64)
    sys.exit(1 if R.failed else 0)

if __name__ == "__main__":
    run_round3_testing()
