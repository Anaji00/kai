"""
KAI Wellness Retreats — Rounds 4–6 Extreme Edge-Case & CRM Usefulness Audit Suite
==================================================================================
Round 4: Deep Booking Normalization, Direct-CRM OTP Auth & Guest Portal Bounds
Round 5: Suite Upgrade Cash Math, Clinical Safety Gatekeeper, Cohort Waitlist & Border/Room Ops
Round 6: Inbound HTML/VAX Email Crash Immunity, Paid-Ledger Delete Guards & 360° Dossier Math
"""

import os
import sys
import uuid
from unittest import mock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient

from backend.database import init_db
from backend.main import app
from backend.testing import admin_headers

init_db()
client = TestClient(app)


# ==============================================================================
# ROUND 4: BOOKING NORMALIZATION, DIRECT-CRM OTP AUTH & PORTAL BOUNDS
# ==============================================================================


class TestRound4DeepBookingAndPortalAuth:
    def test_r4_01_lowercase_client_ref_normalized_and_lookup_works(self):
        raw_ref = f"  kai-{uuid.uuid4().hex[:5].lower()}  "
        expected_ref = raw_ref.strip().upper()
        email = f"normref.{uuid.uuid4().hex[:6]}@example.com"

        res = client.post(
            "/api/v1/bookings",
            json={
                "clientReference": raw_ref,
                "fullName": "Camila\r\nBcc: attacker@evil.com Vega",
                "email": email,
                "phone": "+1 713-555-0141",
                "retreatId": "puerto-vallarta-2027",
                "roomPreference": "private-suite",
                "movementExperience": "all-levels",
                "passportValid": "yes-valid-6mo",
                "waiverAccepted": True,
                "electronicSignature": "Camila\nVega",
            },
        )
        assert res.status_code == 201, res.text
        body = res.json()
        assert body["bookingReference"] == expected_ref
        assert "\n" not in body["waiverSignedBy"] and "\r" not in body["waiverSignedBy"]

        # Lookup using lowercase ref MUST now succeed (previously stored lowercase and 404'd!)
        lookup = client.get(f"/api/v1/bookings/{expected_ref.lower()}?email={email.upper()}")
        assert lookup.status_code == 200, lookup.text
        assert lookup.json()["referenceCode"] == expected_ref

        # Retrying with uppercase ref + same email is idempotent 201
        retry = client.post(
            "/api/v1/bookings",
            json={
                "clientReference": expected_ref,
                "fullName": "Camila Vega",
                "email": email,
                "phone": "+1 713-555-0141",
                "retreatId": "puerto-vallarta-2027",
                "roomPreference": "private-suite",
                "movementExperience": "all-levels",
                "passportValid": "yes-valid-6mo",
                "waiverAccepted": True,
                "electronicSignature": "Camila Vega",
            },
        )
        assert retry.status_code == 201
        assert retry.json()["bookingReference"] == expected_ref

    def test_r4_02_direct_crm_proposal_guest_can_authenticate_via_otp(self):
        hdrs = admin_headers()
        email = f"crmonly.{uuid.uuid4().hex[:6]}@example.com"
        trip_res = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Mateo Direct CRM Guest",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
            },
        )
        assert trip_res.status_code == 200, trip_res.text
        crm_trip_ref = trip_res.json()["crm_trip_id"]

        # Guest with ONLY a CRMTrip (no /book Booking or StagingIntake) requests OTP at /my-retreat/login
        guest_client = TestClient(app)
        sent = {}
        with mock.patch(
            "backend.sidecar.routers.guest_portal.send_guest_otp_email",
            side_effect=lambda to, code: sent.update(to=to, code=code),
        ):
            req = guest_client.post(
                "/api/auth/guest/request-access",
                json={"email": email.upper(), "booking_reference": crm_trip_ref.upper()},
            )
        assert req.status_code == 200, req.text
        assert "code" in sent, "Direct CRM proposal guest must receive OTP email!"

        ver = guest_client.post(
            "/api/auth/guest/verify",
            json={"email": email, "booking_reference": crm_trip_ref, "otp": sent["code"]},
        )
        assert ver.status_code == 200, ver.text
        assert ver.json()["guest_name"] == "Mateo Direct CRM Guest"

        me = guest_client.get("/api/v1/sidecar/guest-portal/me")
        assert me.status_code == 200, me.text
        assert me.json()["guest_name"] == "Mateo Direct CRM Guest"

    def test_r4_03_guest_portal_flight_and_pulse_extreme_bounds_rejected(self):
        # Negative flight delay rejected (422)
        r_neg = client.post(
            "/api/v1/sidecar/guest-portal/flight-update",
            json={"token": "fake", "flight_number": "AA 100", "delay_minutes": -120},
        )
        assert r_neg.status_code == 422

        # Absurd 10-day delay rejected (422)
        r_huge = client.post(
            "/api/v1/sidecar/guest-portal/flight-update",
            json={"token": "fake", "flight_number": "AA 100", "delay_minutes": 14400},
        )
        assert r_huge.status_code == 422

        # Whitespace flight number rejected (422)
        r_blank = client.post(
            "/api/v1/sidecar/guest-portal/flight-update",
            json={"token": "fake", "flight_number": "   ", "delay_minutes": 30},
        )
        assert r_blank.status_code == 422

        # Invalid somatic pulse phase rejected (422)
        r_phase = client.post(
            "/api/v1/sidecar/guest-portal/pulse",
            json={
                "token": "fake",
                "day_number": 2,
                "phase": "MIDNIGHT_PARTY",
                "restorative_sleep_score": 8,
                "nervous_system_ease": 8,
            },
        )
        assert r_phase.status_code == 422

        # Out-of-range sleep score rejected (422)
        r_sleep = client.post(
            "/api/v1/sidecar/guest-portal/pulse",
            json={
                "token": "fake",
                "day_number": 2,
                "phase": "MORNING_AWAKENING",
                "restorative_sleep_score": 99,
                "nervous_system_ease": 8,
            },
        )
        assert r_sleep.status_code == 422


# ==============================================================================
# ROUND 5: SUITE UPGRADE MATH, CLINICAL SAFETY, WAITLIST & BORDER/ROOM OPS
# ==============================================================================


class TestRound5UpgradesClinicalWaitlistAndOps:
    def test_r5_01_paid_trip_suite_upgrade_preserves_settled_cash_and_reopens_balance(self):
        hdrs = admin_headers()
        email = f"upgrade.{uuid.uuid4().hex[:6]}@example.com"
        tr = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Isabella Upgrade Audit",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 10000.0,
            },
        ).json()
        tid = tr["id"]
        cid = tr["trip"]["client_id"]

        # Settle $10,000 in full via wire -> CONFIRMED, SETTLED_IN_FULL
        pay = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/payments",
            headers=hdrs,
            params={
                "amount": 10000.0,
                "payment_method": "Domestic Wire / ACH Transfer",
                "transaction_reference": f"WIRE-FULL-{uuid.uuid4().hex[:6]}",
            },
        )
        assert pay.status_code == 200
        assert pay.json()["trip_status"] == "CONFIRMED"

        # Upgrade to $13,200 Cliffside Plunge Villa -> remaining MUST be $3,200 (NOT $9,240!)
        upg = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/upgrade",
            headers=hdrs,
            params={
                "new_room_tier": "Private Cliffside Plunge Villa",
                "new_total_investment": 13200.0,
            },
        )
        assert upg.status_code == 200, upg.text
        u = upg.json()
        assert u["total_paid"] == 10000.0
        assert u["remaining_balance"] == 3200.0
        assert u["final_balance"] == 3200.0
        assert u["final_balance_status"] == "PARTIALLY_PAID"
        assert u["trip_status"] == "DEPOSIT_PAID"

        # Client total_lifetime_spend must remain $10,000 (not inflated by unpaid $3,200 delta!)
        dossier = client.get(f"/api/v1/sidecar/crm/clients/{cid}", headers=hdrs).json()
        assert dossier["client"]["total_lifetime_spend"] == 10000.0

        # Blank room tier rejected (422)
        bad_tier = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/upgrade",
            headers=hdrs,
            params={"new_room_tier": "   ", "new_total_investment": 14000.0},
        )
        assert bad_tier.status_code == 422

        # Freeze trip -> subsequent suite upgrade MUST be blocked (409)
        client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/emergency-medical-freeze",
            headers=hdrs,
            json={"reason": "Post-op restriction"},
        )
        frozen_upg = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/upgrade",
            headers=hdrs,
            params={"new_room_tier": "Master Penthouse Sanctuary", "new_total_investment": 15500.0},
        )
        assert frozen_upg.status_code == 409

    def test_r5_02_clinical_safety_copilot_and_triage_catch_epilepsy_raynauds_and_treenut(self):
        hdrs = admin_headers()
        # 1. Copilot clinical_safety mode MUST return CONTRAINDICATION_ALERT (previously hardcoded CLEAR!)
        chat_res = client.post(
            "/api/v1/sidecar/copilot/chat",
            headers=hdrs,
            json={
                "message": "Guest has history of epilepsy and Raynaud's syndrome. Can they do tummo breathwork and cold plunge?",
                "mode": "clinical_safety",
            },
        )
        assert chat_res.status_code == 200, chat_res.text
        data = chat_res.json()
        assert data["safety_level"] == "CONTRAINDICATION_ALERT"
        assert data["safety_screened"] is True
        assert "CONTRAINDICATION_ALERT" in data["response_text"]
        assert any(tc.get("tool") == "screen_contraindications" for tc in data["tool_calls"])

        # 2. CRM clinical triage endpoint catches Epilepsy, Raynaud's, and hyphenated tree-nut allergy
        email = f"clin.{uuid.uuid4().hex[:6]}@example.com"
        c_res = client.post(
            "/api/v1/sidecar/crm/clients",
            headers=hdrs,
            json={
                "full_name": "Dr. Hannah Clinical",
                "email": email,
                "health_notes": "History of epilepsy and Raynaud's syndrome.",
                "dietary_requirements": "Severe tree-nut allergy",
            },
        ).json()
        triage = client.post(
            f"/api/v1/sidecar/crm/clients/{c_res['id']}/clinical-triage",
            headers=hdrs,
        )
        assert triage.status_code == 200, triage.text
        flags = set(triage.json()["clinical_flags"])
        assert "NEUROLOGICAL_SEIZURE_PRECAUTION" in flags
        assert "COLD_EXPOSURE_CONTRAINDICATION" in flags
        assert "ANAPHYLACTIC_ALLERGEN_ALERT" in flags

    def test_r5_03_cohort_waitlist_sequential_positions_and_dedup(self):
        hdrs = admin_headers()
        slug = f"waitlist-cohort-{uuid.uuid4().hex[:6]}"

        # Fill all 14 spots
        for i in range(14):
            r = client.post(
                f"/api/v1/sidecar/crm/cohorts/{slug}/atomic-reserve",
                headers=hdrs,
                params={
                    "full_name": f"Guest {i + 1}",
                    "email": f"g{i + 1}.{slug}@example.com",
                    "phone": "+1 713-555-0100",
                },
            )
            assert r.status_code == 200 and r.json()["allocated"] is True

        # Guest #15 -> Waitlist Position #1
        w1 = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/atomic-reserve",
            headers=hdrs,
            params={"full_name": "Waitlist One", "email": f"w1.{slug}@example.com", "phone": "+1 713-555-0115"},
        ).json()
        assert w1["allocated"] is False and w1["status"] == "WAITLIST"
        assert w1["waitlist_position"] == 1

        # Guest #15 retrying must NOT create duplicate waitlist row
        w1_dup = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/atomic-reserve",
            headers=hdrs,
            params={"full_name": "Waitlist One", "email": f"w1.{slug}@example.com", "phone": "+1 713-555-0115"},
        ).json()
        assert w1_dup["intake_id"] == w1["intake_id"]

        # Guest #16 -> Waitlist Position #2 (previously ALSO got #1!)
        w2 = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/atomic-reserve",
            headers=hdrs,
            params={"full_name": "Waitlist Two", "email": f"w2.{slug}@example.com", "phone": "+1 713-555-0116"},
        ).json()
        assert w2["waitlist_position"] == 2

        # Guest #17 -> Waitlist Position #3
        w3 = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/atomic-reserve",
            headers=hdrs,
            params={"full_name": "Waitlist Three", "email": f"w3.{slug}@example.com", "phone": "+1 713-555-0117"},
        ).json()
        assert w3["waitlist_position"] == 3

    def test_r5_04_room_conflict_ignores_inactive_and_passport_border_edge_cases(self):
        hdrs = admin_headers()
        slug = f"room-ops-{uuid.uuid4().hex[:6]}"
        tier = "Master Penthouse Sanctuary"

        tr_active = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Active Penthouse Guest",
                "client_email": f"active.ph.{uuid.uuid4().hex[:5]}@example.com",
                "sanctuary_slug": slug,
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": tier,
                "total_investment": 15000.0,
            },
        ).json()
        tr_cancel = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Cancelled Penthouse Guest",
                "client_email": f"cancel.ph.{uuid.uuid4().hex[:5]}@example.com",
                "sanctuary_slug": slug,
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": tier,
                "total_investment": 15000.0,
            },
        ).json()
        client.post(
            f"/api/v1/sidecar/crm/trips/{tr_cancel['id']}/cancellation",
            headers=hdrs,
            params={"days_prior_to_departure": 90, "cancellation_reason": "Plans changed"},
        )

        # Cancelled trip MUST NOT trigger a room conflict!
        conflict = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/resolve-room-conflict",
            headers=hdrs,
            json={"conflicted_room_tier": tier, "upgrade_room_tier": "Royal Ocean Estate"},
        )
        assert conflict.status_code == 200, conflict.text
        assert conflict.json()["conflict_detected"] is False

        # Passport check: malformed dates & invalid leap date return clean 422 (NOT 500!)
        tid = tr_active["id"]
        cid = tr_active["trip"]["client_id"]
        bad_date = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/passport-validity-check",
            headers=hdrs,
            json={"passport_expiry_date": "2027-02-29", "retreat_arrival_date": "2027-01-28"},
        )
        assert bad_date.status_code == 422

        # TZ-aware ISO vs naive date + already expired passport -> PASSPORT_EXPIRED & client flagged
        expired = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/passport-validity-check",
            headers=hdrs,
            json={"passport_expiry_date": "2026-12-01", "retreat_arrival_date": "2027-01-28T00:00:00Z"},
        )
        assert expired.status_code == 200, expired.text
        assert expired.json()["alert_status"] == "PASSPORT_EXPIRED"
        assert expired.json()["immigration_cleared"] is False
        c_flagged = client.get(f"/api/v1/sidecar/crm/clients/{cid}", headers=hdrs).json()["client"]
        assert c_flagged["passport_valid_6mo"] is False
        assert "PASSPORT_EXPEDITED_RENEWAL_REQUIRED" in c_flagged["tags"]

        # Renewed passport (MM/DD/YYYY advisor format) clears flag & removes stale tag
        renewed = client.post(
            f"/api/v1/sidecar/crm/trips/{tid}/passport-validity-check",
            headers=hdrs,
            json={"passport_expiry_date": "08/15/2031", "retreat_arrival_date": "2027-01-28"},
        )
        assert renewed.status_code == 200, renewed.text
        assert renewed.json()["immigration_cleared"] is True
        c_cleared = client.get(f"/api/v1/sidecar/crm/clients/{cid}", headers=hdrs).json()["client"]
        assert c_cleared["passport_valid_6mo"] is True
        assert "PASSPORT_EXPEDITED_RENEWAL_REQUIRED" not in c_cleared["tags"]


# ==============================================================================
# ROUND 6: INBOUND EMAIL CRASH IMMUNITY, DELETE GUARDS & 360° DOSSIER MATH
# ==============================================================================


class TestRound6EmailCrashImmunityDeleteGuardAndDossier:
    def test_r6_01_inbound_email_agent_survives_general_corporate_and_html_vax_emails(self):
        hdrs = admin_headers()

        # 1. General inquiry (previously crashed 500 UnboundLocalError: llm_plan!)
        r_gen = client.post(
            "/api/v1/sidecar/email-in/ingest",
            headers=hdrs,
            json={
                "sender": "hello.guest@example.com",
                "recipient": "concierge@kaiwellnessretreats.com",
                "subject": "Quick question about packing",
                "raw_body": "Hi there, do I need to bring my own yoga mat?",
            },
        )
        assert r_gen.status_code == 201, r_gen.text
        assert r_gen.json()["parsed_intent"] == "GUEST_INQUIRY"

        # 2. Corporate proposal email (previously ALSO crashed 500 UnboundLocalError: llm_plan!)
        r_corp = client.post(
            "/api/v1/sidecar/email-in/ingest",
            headers=hdrs,
            json={
                "sender": "ceo@horizonventures.io",
                "recipient": "concierge@kaiwellnessretreats.com",
                "subject": "Executive leadership company retreat inquiry",
                "raw_body": "We would like a private cohort corporate wellness buyout for 12 founders.",
            },
        )
        assert r_corp.status_code == 201, r_corp.text
        assert r_corp.json()["parsed_intent"] == "CORPORATE_RETREAT_PROPOSAL"

        # 3. HTML-only forwarded VAX email skips internal founder email and extracts guest + VAX #
        html_vax = (
            "<html><body>"
            "<p>---------- Forwarded message ---------<br/>"
            "From: Kareena Islam &lt;kareena@grandtravelcruise.com&gt;<br/>"
            "Sent from: noreply@vaxvacationaccess.com</p>"
            "<div>VAX VacationAccess Booking Confirmation #84991122 (Funjet / ALGV)</div>"
            "<div>Passenger: María José O'Connor-Ruiz (maria.vax@client-org.com)</div>"
            "<div>Package Total: &#36;6,480.00 | Deposit Paid: &#36;1,944.00</div>"
            "</body></html>"
        )
        r_vax = client.post(
            "/api/v1/sidecar/email-in/ingest",
            headers=hdrs,
            json={
                "sender": "kareena@grandtravelcruise.com",
                "recipient": "concierge@kaiwellnessretreats.com",
                "subject": "Fwd: VAX Confirmation #84991122",
                "raw_body": html_vax,
            },
        )
        assert r_vax.status_code == 201, r_vax.text
        vdata = r_vax.json()
        assert vdata["parsed_intent"] == "VOUCHER_CONFIRMATION"
        assert vdata["parsed_entities"]["extracted_email"] == "maria.vax@client-org.com"
        assert vdata["parsed_entities"]["confirmation_code"] == "84991122"
        assert "María" in vdata["parsed_entities"]["extracted_name"]

    def test_r6_02_delete_crm_record_protects_paid_ledger_and_cleans_companion_links(self):
        hdrs = admin_headers()
        paid_email = f"paid.del.{uuid.uuid4().hex[:6]}@example.com"
        paid_trip = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Victoria Paid Guard",
                "client_email": paid_email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 10000.0,
                "deposit_amount": 3000.0,
                "deposit_paid": True,
            },
        ).json()
        paid_tid = paid_trip["id"]

        # 1. Chat message saying "delete Victoria Paid Guard" MUST NOT silently auto-delete!
        chat_del = client.post(
            "/api/v1/sidecar/copilot/chat",
            headers=hdrs,
            json={"message": "delete Victoria Paid Guard from CRM", "mode": "studio_ops"},
        )
        assert chat_del.status_code == 200
        assert client.get(f"/api/v1/sidecar/crm/trips/{paid_tid}", headers=hdrs).status_code == 200

        # 2. Direct delete_crm_record on paid trip MUST be refused to protect accounting ledger
        blocked_del = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "delete_crm_record",
                "action_type": "delete_crm_record",
                "target_id": paid_tid,
                "fields": {"record_id": paid_tid, "client_name": "Victoria Paid Guard"},
            },
        )
        assert blocked_del.status_code == 200
        assert blocked_del.json()["success"] is False
        assert blocked_del.json()["changes"]["blocked_reason"] == "SETTLED_PAYMENTS_ON_LEDGER"
        assert client.get(f"/api/v1/sidecar/crm/trips/{paid_tid}", headers=hdrs).status_code == 200

        # 3. Deleting nonexistent guest returns success=False (no fake "Removed")
        missing_del = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "delete_crm_record",
                "action_type": "delete_crm_record",
                "fields": {"record_id": "nonexistent-id-xyz999", "target_name": "Ghost Nonexistent"},
            },
        )
        assert missing_del.status_code == 200
        assert missing_del.json()["success"] is False

        # 4. Unpaid companion trip deletion succeeds and cleans partner's dangling companion_trip_id
        unpaid_primary = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Primary Split Delete",
                "client_email": f"prim.del.{uuid.uuid4().hex[:5]}@example.com",
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Two-Bedroom Penthouse",
                "total_investment": 12000.0,
            },
        ).json()
        split = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "split_companion_folio",
                "target_id": unpaid_primary["id"],
                "fields": {"primary_name": "Primary Split Delete", "companion_name": "Temp Companion Delete"},
            },
        )
        assert split.status_code == 200, split.text
        all_trips = client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json()
        comp_trip = next(t for t in all_trips if t["client_name"] == "Temp Companion Delete")
        del_comp = client.post(
            "/api/v1/sidecar/copilot/execute-action",
            headers=hdrs,
            json={
                "form_type": "delete_crm_record",
                "action_type": "delete_crm_record",
                "fields": {"record_id": comp_trip["id"]},
            },
        )
        assert del_comp.status_code == 200 and del_comp.json()["success"] is True

        trips_after = client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json()
        prim_after = next(t for t in trips_after if t["id"] == unpaid_primary["id"])
        assert prim_after["companion_trip_id"] is None

    def test_r6_03_client_360_dossier_reports_authoritative_paid_and_balance_totals(self):
        hdrs = admin_headers()
        email = f"dossier360.{uuid.uuid4().hex[:6]}@example.com"

        # Trip 1: $6,000 paid in full
        t1 = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Laila Multi-Trip VIP",
                "client_email": email,
                "sanctuary_slug": "puerto-vallarta-2027",
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 6000.0,
                "deposit_amount": 6000.0,
                "deposit_paid": True,
            },
        ).json()
        cid = t1["trip"]["client_id"]

        # Trip 2: $8,000 unpaid proposal
        client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_id": cid,
                "client_name": "Laila Multi-Trip VIP",
                "client_email": email,
                "sanctuary_slug": "amalfi",
                "dates": "Jun 10 – Jun 15, 2027",
                "room_tier": "Private Cliffside Plunge Villa",
                "total_investment": 8000.0,
            },
        )

        # Trip 3: $9,000 cancelled trip ($0 paid) -> must NOT count toward balance due!
        t3 = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_id": cid,
                "client_name": "Laila Multi-Trip VIP",
                "client_email": email,
                "sanctuary_slug": "nosara",
                "dates": "Nov 10 – Nov 15, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9000.0,
            },
        ).json()
        client.post(
            f"/api/v1/sidecar/crm/trips/{t3['id']}/cancellation",
            headers=hdrs,
            params={"days_prior_to_departure": 120, "cancellation_reason": "Date conflict"},
        )

        dossier = client.get(f"/api/v1/sidecar/crm/clients/{cid}", headers=hdrs)
        assert dossier.status_code == 200, dossier.text
        d = dossier.json()
        assert d["client"]["total_paid_all_trips"] == 6000.0
        assert d["client"]["total_balance_due"] == 8000.0
        assert len(d["trips"]) == 3
        for tr in d["trips"]:
            assert "paid_amount" in tr and "final_balance" in tr and tr["proposal_url"].startswith("/my-retreat?ref=")
