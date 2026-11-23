"""
KAI Wellness Retreats — 3-Round Extreme Edge-Case & CRM Usefulness Audit Suite
==============================================================================
Round 1: Public Booking Flow, Waiver Integrity, Idempotency & Guest Proposal Security
Round 2: Offline VAX / Wire Billing Ledger, Multi-Currency FX, Split Folios & Cancellations
Round 3: Real-World Travel Advisor CRM Workflows (VAX Triple-Amount Smart Paste, Statuses, Batch Ops)
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient

from backend.database import SessionLocal, init_db
from backend.main import app
from backend.sidecar.models import CRMClient, CRMTrip
from backend.testing import admin_headers

init_db()
client = TestClient(app)


# ==============================================================================
# ROUND 1: PUBLIC BOOKING FLOW, WAIVER INTEGRITY & PROPOSAL ABUSE RESISTANCE
# ==============================================================================


class TestRound1BookingAndProposalSecurity:
    def test_r1_01_booking_rejects_unaccepted_waiver_and_blank_fields(self):
        base = {
            "fullName": "María José O'Connor-Ruiz",
            "email": "maria.jose@example.com",
            "phone": "+1 (713) 555-0199",
            "retreatId": "puerto-vallarta-2027",
            "roomPreference": "private-suite",
            "movementExperience": "all-levels",
            "passportValid": "yes-valid-6mo",
            "waiverAccepted": False,
            "electronicSignature": "María José O'Connor-Ruiz",
        }
        # Explicit waiverAccepted=False must fail 422
        r_waiver = client.post("/api/v1/bookings", json=base)
        assert r_waiver.status_code == 422, r_waiver.text

        # Whitespace-only name must fail 422
        r_name = client.post("/api/v1/bookings", json={**base, "waiverAccepted": True, "fullName": "     "})
        assert r_name.status_code == 422, r_name.text

        # Whitespace-only electronicSignature must fail 422
        r_sig = client.post(
            "/api/v1/bookings",
            json={**base, "waiverAccepted": True, "electronicSignature": "   "},
        )
        assert r_sig.status_code == 422, r_sig.text

    def test_r1_02_booking_unicode_xss_idempotency_and_reference_hijack(self):
        ref = f"KAI-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "clientReference": ref,
            "fullName": "Søren O'Brien-Álvarez <script>alert(1)</script>",
            "email": "Soren.Test@Example.COM",
            "phone": "+1 (713) 555-8821",
            "retreatId": "puerto-vallarta-2027",
            "roomPreference": "shared-luxury",
            "movementExperience": "healing-injury",
            "passportValid": "renewal-in-progress",
            "healthNotes": "Severe tree-nut allergy (EpiPen) & <img src=x onerror=alert(1)>",
            "intentions": "Burnout recovery 🌿",
            "waiverAccepted": True,
            "electronicSignature": "Søren O'Brien-Álvarez",
        }
        r1 = client.post("/api/v1/bookings", json=payload)
        assert r1.status_code == 201, r1.text
        assert r1.json()["bookingReference"] == ref

        # Same reference + same email (case-insensitive) -> idempotent 201, no duplicate
        r_retry = client.post("/api/v1/bookings", json={**payload, "email": "soren.test@example.com"})
        assert r_retry.status_code == 201
        assert r_retry.json()["bookingReference"] == ref

        # Same reference + DIFFERENT email -> 409 Conflict (blocks hijack)
        r_hijack = client.post("/api/v1/bookings", json={**payload, "email": "other.person@example.com"})
        assert r_hijack.status_code == 409

        # Lookup is case-insensitive on reference & email, rejects wrong email
        r_lookup_ok = client.get(f"/api/v1/bookings/{ref.lower()}?email=SOREN.TEST@EXAMPLE.COM")
        assert r_lookup_ok.status_code == 200
        assert client.get(f"/api/v1/bookings/{ref}?email=wrong@example.com").status_code == 404

    def test_r1_03_proposal_masks_email_and_blocks_free_penthouse_upgrade(self):
        hdrs = admin_headers()
        email = f"guest.{uuid.uuid4().hex[:6]}@private-domain.org"
        create_res = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Elena Security Test",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
            },
        )
        assert create_res.status_code == 200, create_res.text
        crm_trip_id = create_res.json()["crm_trip_id"]
        trip_id = create_res.json()["id"]

        # 1. Public GET /proposal must MASK guest_email so attackers cannot scrape it
        pub = client.get(f"/api/v1/sidecar/guest-portal/proposal?ref={crm_trip_id}")
        assert pub.status_code == 200, pub.text
        returned_email = pub.json()["proposal"]["guest_email"]
        assert returned_email != email
        assert "***" in returned_email and returned_email.endswith("@private-domain.org")

        # 2. Attempting free Penthouse upgrade without paying the $5,500 surcharge must be blocked (400)
        free_upg = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": email,
                "payment_preference": "VAX_HOST_AGENCY_CALL",
                "e_signature": "Elena Security Test",
                "agreed_to_terms": True,
                "selected_room_tier": "Master Penthouse Sanctuary",
                "custom_total_investment": 9500.0,
            },
        )
        assert free_upg.status_code == 400, free_upg.text

        # 3. Legitimate upgrade with full +$5,500 price ($15,000) succeeds & stays AWAITING_OFFLINE_SETTLEMENT
        valid_upg = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": email,
                "payment_preference": "BANK_WIRE_ACH",
                "e_signature": "Elena Security Test",
                "agreed_to_terms": True,
                "selected_room_tier": "Master Penthouse Sanctuary",
                "custom_total_investment": 15000.0,
                "flight_number": "AA-2418",
                "origin_airport": "ORD",
            },
        )
        assert valid_upg.status_code == 200, valid_upg.text
        assert valid_upg.json()["trip"]["total_investment"] == 15000.0
        assert valid_upg.json()["trip"]["deposit_status"] == "AWAITING_OFFLINE_SETTLEMENT"

        # 4. Once advisor marks trip CANCELLED, guest can no longer re-sign it (409)
        cancel_res = client.post(
            f"/api/v1/sidecar/crm/trips/{trip_id}/cancellation",
            headers=hdrs,
            params={"days_prior_to_departure": 75, "cancellation_reason": "Schedule conflict"},
        )
        assert cancel_res.status_code == 200
        # Zero cash paid -> cash_refund and credit MUST be $0.00 (never refund unpaid balance!)
        assert cancel_res.json()["cash_refund"] == 0.0
        assert cancel_res.json()["concierge_credit"] == 0.0

        resign_cancelled = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": email,
                "payment_preference": "BANK_WIRE_ACH",
                "e_signature": "Elena Security Test",
                "agreed_to_terms": True,
            },
        )
        assert resign_cancelled.status_code == 409

    def test_r1_04_paid_confirmed_proposal_locks_suite_and_price_while_allowing_checkin(self):
        hdrs = admin_headers()
        email = f"locked.{uuid.uuid4().hex[:6]}@example.com"
        tr = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Claire Locked Suite",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
                "deposit_amount": 2850.0,
                "deposit_paid": True,
            },
        ).json()
        crm_trip_id = tr["crm_trip_id"]
        trip_id = tr["id"]

        # Reject outrageous >$1M total_investment on an unpaid trip first (test on fresh trip)
        unpaid_email = f"bounds.{uuid.uuid4().hex[:6]}@example.com"
        unpaid = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Bounds Check Guest",
                "client_email": unpaid_email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
            },
        ).json()
        bad_bound = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": unpaid["crm_trip_id"],
                "guest_email": unpaid_email,
                "e_signature": "Bounds Check Guest",
                "agreed_to_terms": True,
                "custom_total_investment": 99_000_000.0,
            },
        )
        assert bad_bound.status_code == 400

        # Paid trip: attempting unsolicited tier/price mutation during arrival check-in must leave suite & price intact
        checkin = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": email,
                "e_signature": "Claire Locked Suite",
                "agreed_to_terms": True,
                "selected_room_tier": "Master Penthouse Sanctuary",
                "custom_total_investment": 100.0,
                "flight_number": "UA-902",
                "origin_airport": "IAH",
                "dietary_notes": "Pescatarian, Gluten-Free",
            },
        )
        assert checkin.status_code == 200, checkin.text
        assert checkin.json()["trip"]["total_investment"] == 9500.0
        # Flight update still persisted
        detail = client.get(f"/api/v1/sidecar/crm/trips/{trip_id}", headers=hdrs).json()["trip"]
        assert detail["room_tier"] == "Oceanfront King Suite"
        assert detail["smart_flight"]["flight_number"] == "UA-902"


# ==============================================================================
# ROUND 2: OFFLINE VAX / WIRE BILLING LEDGER, PENNY MATH & CANCELLATION SAFETY
# ==============================================================================


class TestRound2OfflineBillingAndPennyMath:
    def test_r2_01_trips_list_reports_exact_paid_amount_never_fake_deposit(self):
        hdrs = admin_headers()
        email = f"unpaid.{uuid.uuid4().hex[:6]}@example.com"
        create_res = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Unpaid Proposal Guest",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 10000.0,
            },
        )
        assert create_res.status_code == 200
        tid = create_res.json()["id"]

        # Unpaid proposal MUST report paid_amount == 0.0 and final_balance == 10000.0 in GET /trips
        listed = client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json()
        row = next(t for t in listed if t["id"] == tid)
        assert row["paid_amount"] == 0.0
        assert row["final_balance"] == 10000.0
        assert row["client_id"] is not None

        # Advisor records 30% VAX deposit ($3,000) -> status moves to DEPOSIT_PAID, paid_amount == 3000.0
        dep_ref = f"VAX-DEP-{uuid.uuid4().hex[:6]}"
        pay1 = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 3000.0,
                "payment_method": "VAX VacationAccess / ALGV Card Payment",
                "transaction_reference": dep_ref,
            },
        )
        assert pay1.status_code == 200, pay1.text
        assert pay1.json()["trip_status"] == "DEPOSIT_PAID"
        assert pay1.json()["total_paid"] == 3000.0
        assert pay1.json()["remaining_balance"] == 7000.0

        # Duplicate transaction_reference -> 409 Conflict (prevents double-click double-counting)
        dup_pay = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 3000.0,
                "payment_method": "VAX VacationAccess / ALGV Card Payment",
                "transaction_reference": dep_ref,
            },
        )
        assert dup_pay.status_code == 409

        # Overpayment ($8,000 when only $7,000 remains) -> 422 Rejected
        over_pay = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 8000.0,
                "payment_method": "Domestic Wire / ACH Transfer",
                "transaction_reference": f"WIRE-OVER-{uuid.uuid4().hex[:5]}",
            },
        )
        assert over_pay.status_code == 422

        # Exact remaining $7,000 settles trip 100% -> CONFIRMED, paid_amount == 10000.0, final_balance == 0.0
        pay2 = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 7000.0,
                "payment_method": "Domestic Wire / ACH Transfer",
                "transaction_reference": f"WIRE-BAL-{uuid.uuid4().hex[:5]}",
            },
        )
        assert pay2.status_code == 200
        assert pay2.json()["trip_status"] == "CONFIRMED"
        assert pay2.json()["remaining_balance"] == 0.0

        listed_after = client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json()
        row_after = next(t for t in listed_after if t["id"] == tid)
        assert row_after["paid_amount"] == 10000.0
        assert row_after["final_balance"] == 0.0

    def test_r2_02_vax_import_with_deposit_preserves_history_for_balance_payment(self):
        hdrs = admin_headers()
        email = f"vaxdep.{uuid.uuid4().hex[:6]}@example.com"
        # Import trip with $1,944 initial VAX deposit already paid on $6,480 package
        create_res = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Maya VAX Deposit",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Allure Oceanfront Suite",
                "total_investment": 6480.0,
                "deposit_amount": 1944.0,
                "deposit_paid": True,
            },
        )
        assert create_res.status_code == 200, create_res.text
        tid = create_res.json()["id"]

        # Paying the $4,536 remaining balance must bring total_paid to exactly $6,480 and balance to $0
        bal_res = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 4536.0,
                "payment_method": "VAX VacationAccess / ALGV Card Payment",
                "transaction_reference": f"VAX-BAL-{uuid.uuid4().hex[:6]}",
            },
        )
        assert bal_res.status_code == 200, bal_res.text
        assert bal_res.json()["total_paid"] == 6480.0
        assert bal_res.json()["remaining_balance"] == 0.0
        assert bal_res.json()["trip_status"] == "CONFIRMED"

    def test_r2_03_cancelled_trip_blocks_new_payments_and_negative_split_rejected(self):
        hdrs = admin_headers()
        email = f"cancelpay.{uuid.uuid4().hex[:6]}@example.com"
        tr = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Cancel Guard Guest",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 8000.0,
                "deposit_amount": 2400.0,
                "deposit_paid": True,
            },
        ).json()
        tid = tr["id"]

        # Cancel >60 days prior with ONLY $2,400 paid -> refund $0 cash (no unpaid $5,600 refunded!), credit $1,900
        can = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/cancellation",
            headers=hdrs,
            params={"days_prior_to_departure": 70, "cancellation_reason": "Family event"},
        )
        assert can.status_code == 200, can.text
        assert can.json()["cash_refund"] == 0.0
        assert can.json()["concierge_credit"] == 1900.0
        assert can.json()["forfeiture_penalty"] == 500.0

        # Attempting to log a payment on a CANCELLED trip must fail 409
        blocked_pay = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 1000.0,
                "payment_method": "WIRE_ACH",
                "transaction_reference": f"WIRE-DEAD-{uuid.uuid4().hex[:5]}",
            },
        )
        assert blocked_pay.status_code == 409

        # Multi-guest split folio: reject [150%, -50%] negative-share exploit
        neg_split = client.post(
            "/api/v1/sidecar/crm/cohorts/puerto-vallarta-2027/multi-guest-split-folio",
            headers=hdrs,
            json={
                "villa_tier": "Penthouse Villa",
                "total_stay_investment": 10000.0,
                "split_records": [
                    {"guest_name": "A", "guest_email": "a@example.com", "percentage_share": 150.0, "payment_method": "WIRE", "transaction_reference": "W1"},
                    {"guest_name": "B", "guest_email": "b@example.com", "percentage_share": -50.0, "payment_method": "WIRE", "transaction_reference": "W2"},
                ],
            },
        )
        assert neg_split.status_code == 422

        # 3-way odd-cent split ($10,000.01 across 33.33 / 33.33 / 33.34%) -> ZERO penny drift!
        odd_split = client.post(
            "/api/v1/sidecar/crm/cohorts/puerto-vallarta-2027/multi-guest-split-folio",
            headers=hdrs,
            json={
                "villa_tier": "Penthouse Villa",
                "total_stay_investment": 10000.01,
                "split_records": [
                    {"guest_name": "Split A", "guest_email": f"sa.{uuid.uuid4().hex[:5]}@example.com", "percentage_share": 33.33, "payment_method": "WIRE", "transaction_reference": "W-A"},
                    {"guest_name": "Split B", "guest_email": f"sb.{uuid.uuid4().hex[:5]}@example.com", "percentage_share": 33.33, "payment_method": "WIRE", "transaction_reference": "W-B"},
                    {"guest_name": "Split C", "guest_email": f"sc.{uuid.uuid4().hex[:5]}@example.com", "percentage_share": 33.34, "payment_method": "WIRE", "transaction_reference": "W-C"},
                ],
            },
        )
        assert odd_split.status_code == 200, odd_split.text
        assert odd_split.json()["running_total_allocated"] == 10000.01

    def test_r2_04_excess_deposit_rejected_fx_wire_and_medical_freeze_lock(self):
        hdrs = admin_headers()
        # Deposit exceeding total_investment must fail 422
        bad_dep = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Bad Deposit Guest",
                "client_email": f"baddep.{uuid.uuid4().hex[:6]}@example.com",
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 5000.0,
                "deposit_amount": 6500.0,
            },
        )
        assert bad_dep.status_code == 422

        # Multi-currency EUR wire settlement with FX conversion -> updates paid_amount & lifetime spend in USD
        email = f"eurwire.{uuid.uuid4().hex[:6]}@example.com"
        tr = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Amelie Wire EUR",
                "client_email": email,
                "sanctuary_slug": "amalfi",
                "dates": "Jun 10 – Jun 15, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 10000.0,
            },
        ).json()
        tid = tr["id"]
        crm_trip_id = tr["crm_trip_id"]

        fx_pay = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 2500.0,
                "currency": "EUR",
                "fx_rate": 1.1,
                "payment_method": "International Wire (SWIFT)",
                "transaction_reference": f"SWIFT-EUR-{uuid.uuid4().hex[:6]}",
            },
        )
        assert fx_pay.status_code == 200, fx_pay.text
        assert fx_pay.json()["amount_recorded"] == 2750.0
        assert fx_pay.json()["remaining_balance"] == 7250.0

        # Emergency Medical Freeze locks trip from new payments (409) & guest proposal re-sign (409)
        freeze = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/emergency-medical-freeze",
            headers=hdrs,
            json={"reason": "Acute orthopedic injury prior to departure"},
        )
        assert freeze.status_code == 200
        assert freeze.json()["status"] == "MEDICAL_FREEZE"

        blocked_pay = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 500.0,
                "payment_method": "WIRE_ACH",
                "transaction_reference": f"WIRE-FRZ-{uuid.uuid4().hex[:5]}",
            },
        )
        assert blocked_pay.status_code == 409

        blocked_sign = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": email,
                "e_signature": "Amelie Wire EUR",
                "agreed_to_terms": True,
            },
        )
        assert blocked_sign.status_code == 409


# ==============================================================================
# ROUND 3: REAL-WORLD TRAVEL ADVISOR CRM USEFULNESS & WORKFLOW STRESS TESTS
# ==============================================================================


class TestRound3AdvisorUsefulnessWorkflows:
    def test_r3_01_vax_triple_amount_email_never_confuses_balance_for_deposit(self):
        hdrs = admin_headers()
        raw_vax_email = (
            "VAX VacationAccess Confirmation #84991122 (Funjet Vacations / ALGV). "
            "Passenger: Priya Sharma (priya.sharma.vax@example.com, +1 713-555-0193) "
            "companion: Kavita Sharma. Flights: United UA-1582 IAH to PVR and AA-2418 ORD to PVR. "
            "Room: Two-Bedroom Oceanfront Penthouse Villa. "
            "Package Total: $6,480.00 | Deposit Paid: $1,944.00 | Balance Due: $4,536.00. "
            "Dietary: Vegetarian, Nut-Free."
        )
        res = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "smart_paste_extract",
                "action_type": "smart_paste_extract",
                "sanctuary_slug": "puerto-vallarta-2027",
                "fields": {"raw_text": raw_vax_email},
            },
        )
        assert res.status_code == 200, res.text
        changes = res.json()["changes"]
        assert changes["guest"] == "Priya Sharma"
        assert changes["companion"] == "Kavita Sharma"
        assert changes["total_investment"] == "$6,480.00"
        # Must extract $4,536.00 remaining balance (NOT $1,944.00 from confusing Balance Due as Deposit Paid!)
        assert changes["remaining_balance"] == "$4,536.00"

    def test_r3_02_status_dropdown_transitions_and_self_split_protection(self):
        hdrs = admin_headers()
        email = f"status.{uuid.uuid4().hex[:6]}@example.com"
        tr = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Nadia Advisor Flow",
                "client_email": email,
                "sanctuary_slug": "riviera-maya",
                "dates": "Nov 12 – Nov 16, 2026",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 7500.0,
            },
        ).json()
        tid = tr["id"]

        # Every CRM spreadsheet status dropdown value must succeed (previously DEPOSIT_PAID & WAITLIST_PRIORITY 422'd!)
        for status_val in ("INQUIRY", "PROPOSAL_SIGNED", "DEPOSIT_PAID", "WAITLIST_PRIORITY", "CONFIRMED"):
            patch = client.patch(
                f"/api/v1/sidecar/crm/trips/{tid}/itinerary",
                headers=hdrs,
                json={"status": status_val},
            )
            assert patch.status_code == 200, f"Status {status_val} failed: {patch.text}"
            assert patch.json()["status"] == status_val

        # Self-pairing 50/50 split must fail cleanly
        self_split = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "split_companion_folio",
                "target_id": tid,
                "fields": {"primary_name": "Nadia Advisor Flow", "companion_name": "Nadia Advisor Flow"},
            },
        )
        assert self_split.status_code == 500 or not self_split.json().get("success")

        # Valid 50/50 split with odd cent total ($7,500.00 -> $3,750.00 + $3,750.00), then idempotent re-split
        ok_split = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "split_companion_folio",
                "target_id": tid,
                "fields": {"primary_name": "Nadia Advisor Flow", "companion_name": "Aisha Companion"},
            },
        )
        assert ok_split.status_code == 200, ok_split.text
        assert ok_split.json()["changes"]["primary_guest"] == "Nadia Advisor Flow ($3,750.00 USD)"
        assert ok_split.json()["changes"]["companion_guest"] == "Aisha Companion ($3,750.00 USD)"

        # Idempotent re-split must NOT quarter the price to $1,875!
        resplit = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "split_companion_folio",
                "target_id": tid,
                "fields": {"primary_name": "Nadia Advisor Flow", "companion_name": "Aisha Companion"},
            },
        )
        assert resplit.status_code == 200
        assert resplit.json()["changes"]["primary_guest"] == "Nadia Advisor Flow ($3,750.00 USD)"

    def test_r3_03_batch_update_skips_inactive_and_dietary_manifest_excludes_frozen(self):
        hdrs = admin_headers()
        slug = f"audit-cohort-{uuid.uuid4().hex[:5]}"
        frozen_email = f"frozen.{uuid.uuid4().hex[:6]}@example.com"
        active_email = f"active.{uuid.uuid4().hex[:6]}@example.com"

        tr_frozen = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Frozen Guest",
                "client_email": frozen_email,
                "sanctuary_slug": slug,
                "dates": "Oct 1 – Oct 5, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 8000.0,
            },
        ).json()
        tr_active = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Active Allergy Guest",
                "client_email": active_email,
                "sanctuary_slug": slug,
                "dates": "Oct 1 – Oct 5, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 8000.0,
                "dietary_notes": "Severe tree-nut allergy",
            },
        ).json()

        # Update active client dietary_requirements to test hyphenated tree-nut Red Alert detection
        client.post(
            "/api/v1/sidecar/crm/clients",
            headers=hdrs,
            json={
                "full_name": "Active Allergy Guest",
                "email": active_email,
                "dietary_requirements": "Severe tree-nut allergy",
            },
        )
        client.post(
            f"/api/v1/sidecar/crm/trips/{tr_frozen['id']}/emergency-medical-freeze",
            headers=hdrs,
            json={"reason": "Post-op recovery"},
        )

        # Batch confirm must NOT resurrect MEDICAL_FREEZE trip!
        batch = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "batch_crm_update",
                "sanctuary_slug": slug,
                "fields": {"batch_operation": "mark all confirmed"},
            },
        )
        assert batch.status_code == 200, batch.text
        frozen_after = client.get(f"/api/v1/sidecar/crm/trips/{tr_frozen['id']}", headers=hdrs).json()["trip"]
        assert frozen_after["status"] == "MEDICAL_FREEZE"

        # Kitchen dietary manifest must exclude MEDICAL_FREEZE and flag hyphenated tree-nut allergy as RED ALERT
        manifest = client.get(f"/api/v1/sidecar/crm/sanctuaries/{slug}/dietary-manifest", headers=hdrs)
        assert manifest.status_code == 200, manifest.text
        guests = manifest.json()["guests"]
        emails_in_manifest = [g["client_email"] for g in guests]
        assert frozen_email not in emails_in_manifest
        assert active_email in emails_in_manifest
        active_entry = next(g for g in guests if g["client_email"] == active_email)
        assert "RED_ALERT_ANAPHYLAXIS" in active_entry["clinical_flags"]

    def test_r3_04_public_booking_to_staging_to_idempotent_crm_commit_funnel(self):
        hdrs = admin_headers()
        ref = f"KAI-{uuid.uuid4().hex[:6].upper()}"
        email = f"funnel.{uuid.uuid4().hex[:6]}@example.com"

        # 1. Guest submits public booking on /book
        bk = client.post(
            "/api/v1/bookings",
            json={
                "clientReference": ref,
                "fullName": "Sienna Funnel Guest",
                "email": email,
                "phone": "+1 713-555-0188",
                "retreatId": "puerto-vallarta-2027",
                "roomPreference": "private-suite",
                "movementExperience": "all-levels",
                "passportValid": "yes-valid-6mo",
                "healthNotes": "Gluten-free, prefers quiet ocean room",
                "intentions": "Deep somatic rest",
                "waiverAccepted": True,
                "electronicSignature": "Sienna Funnel Guest",
            },
        )
        assert bk.status_code == 201, bk.text

        # 2. Immediately appears in advisor CRM staging queue (synchronous, serverless-safe)
        intakes = client.get("/api/v1/sidecar/intakes", headers=hdrs).json()
        staged = next((i for i in intakes if i.get("email") == email), None)
        assert staged is not None, "Public booking must appear immediately in CRM Staging Intakes"

        # 3. Advisor commits staged intake -> creates 1 unpaid CRMTrip with public /my-retreat proposal_url
        commit1 = client.post(
            f"/api/v1/sidecar/intakes/{staged['id']}/crm-commit",
            headers=hdrs,
            json={"operator_name": "Kareena Islam"},
        )
        assert commit1.status_code == 200, commit1.text
        trip_ref = commit1.json()["crm_trip_id"]

        # 4. Double-clicking 1-Click CRM Commit must be idempotent (same crm_trip_id, no duplicate row!)
        commit2 = client.post(
            f"/api/v1/sidecar/intakes/{staged['id']}/crm-commit",
            headers=hdrs,
            json={"operator_name": "Kareena Islam"},
        )
        assert commit2.status_code == 200
        assert commit2.json()["crm_trip_id"] == trip_ref

        trips = client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json()
        matching = [t for t in trips if t.get("client_email") == email]
        assert len(matching) == 1, f"Expected exactly 1 trip, found {len(matching)}"
        assert matching[0]["paid_amount"] == 0.0
        assert matching[0]["status"] == "PROPOSED_ITINERARY"
        assert matching[0]["proposal_url"] == f"/my-retreat?ref={trip_ref}"
