"""
KAI Wellness Retreats — Rounds 7–9 Extreme Edge-Case & CRM Usefulness Audit Suite
==================================================================================
Round 7: Draft Governance/Idempotency, Bidirectional Reconciliation, Force Majeure & Bodywork Intervals
Round 8: RFC 5545 iCal CRLF Injection, Calendar Bounds, Flight Merge & Geospatial Validation
Round 9: Review Sentiment False-Positive Immunity & Booking->Draft Sanctuary Fidelity
"""

import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient

from backend.database import init_db
from backend.main import app
from backend.sidecar.services.geo_routing_service import calculate_haversine_distance
from backend.testing import admin_headers

init_db()
client = TestClient(app)


# ==============================================================================
# ROUND 7: DRAFT IDEMPOTENCY, RECONCILIATION, FORCE MAJEURE & BODYWORK INTERVALS
# ==============================================================================


class TestRound7DraftsReconciliationAndCrisisOps:
    def test_r7_01_draft_approval_idempotent_with_crm_commit_and_blocks_discard_of_approved(self):
        hdrs = admin_headers()
        email = f"draftidem.{uuid.uuid4().hex[:6]}@example.com"
        ref = f"KAI-{uuid.uuid4().hex[:6].upper()}"

        # 1. Public booking stages both a StagingIntake and a booking_hold ActionDraft
        bk = client.post(
            "/api/v1/bookings",
            json={
                "clientReference": ref,
                "fullName": "Nora Idempotent Guest",
                "email": email,
                "phone": "+1 713-555-0197",
                "retreatId": "puerto-vallarta-2027",
                "roomPreference": "private-suite",
                "movementExperience": "all-levels",
                "passportValid": "yes-valid-6mo",
                "waiverAccepted": True,
                "electronicSignature": "Nora Idempotent Guest",
            },
        )
        assert bk.status_code == 201, bk.text

        intakes = client.get("/api/v1/sidecar/intakes", headers=hdrs).json()
        staged = next(i for i in intakes if i["email"] == email)

        # 2. Advisor commits via 1-Click CRM Commit FIRST
        c1 = client.post(
            f"/api/v1/sidecar/intakes/{staged['id']}/crm-commit",
            headers=hdrs,
            json={"operator_name": "Kareena Islam"},
        )
        assert c1.status_code == 200, c1.text

        # 3. Advisor later approves the pending booking_hold draft -> MUST NOT create a second CRMTrip!
        drafts = client.get("/api/v1/drafts?status=pending_review", headers=hdrs).json()
        hold_draft = next(
            d for d in drafts
            if d["type"] == "booking_hold" and d.get("target_entity_id") == str(staged["id"])
        )
        app_res = client.post(f"/api/v1/drafts/{hold_draft['id']}/approve", headers=hdrs)
        assert app_res.status_code == 200, app_res.text

        trips = [t for t in client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json() if t["client_email"] == email]
        assert len(trips) == 1, f"Expected 1 CRMTrip after commit+draft approve, got {len(trips)}"

        # 4. Discarding an already-approved draft MUST fail 409
        bad_discard = client.post(f"/api/v1/drafts/{hold_draft['id']}/discard", headers=hdrs)
        assert bad_discard.status_code == 409

        # 5. PATCH draft with arbitrary invalid status MUST fail 422
        pending_sms = next((d for d in drafts if d["id"] != hold_draft["id"]), None)
        if pending_sms:
            bad_patch = client.patch(
                f"/api/v1/drafts/{pending_sms['id']}",
                headers=hdrs,
                json={"status": "ARBITRARY_BOGUS_STATE", "content": "test"},
            )
            assert bad_patch.status_code == 422

    def test_r7_02_manifest_reconciliation_bidirectional_missing_guest_and_voucher_ref(self):
        hdrs = admin_headers()
        slug = f"recon-sanctuary-{uuid.uuid4().hex[:5]}"
        email = f"missing.hotel.{uuid.uuid4().hex[:5]}@example.com"

        # Active CRMTrip guest who will be OMITTED by the external hotel manifest
        client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Celeste Omitted Guest",
                "client_email": email,
                "sanctuary_slug": slug,
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
            },
        )

        # External manifest has ONLY an unregistered stranger (omitting Celeste!)
        diff_res = client.post(
            "/api/v1/sidecar/reconciliation/manifest-diff",
            headers=hdrs,
            json={
                "sanctuary_slug": slug,
                "diff_document_name": "hotel_rooming_sheet.csv",
                "external_guest_records": [
                    {"name": "Unregistered Stranger", "room": "Garden Suite"}
                ],
            },
        )
        assert diff_res.status_code == 200, diff_res.text
        types = {d["type"] for d in diff_res.json()["discrepancies"]}
        assert "UNREGISTERED_MANIFEST_GUEST" in types
        assert "MISSING_FROM_EXTERNAL_MANIFEST" in types

        # Voucher parser must NOT capture English word "NUMBER" as voucher_ref!
        parse_res = client.post(
            "/api/v1/sidecar/reconciliation/parse-voucher",
            headers=hdrs,
            json={
                "sanctuary_slug": slug,
                "document_name": "vax_voucher.txt",
                "document_text": "VAX VacationAccess Confirmation Number: VAX-998812 | Check-in Jan 28, 2027 | Rate $6,480.00",
            },
        )
        assert parse_res.status_code == 200, parse_res.text
        assert parse_res.json()["parsed_data"]["voucher_ref"] == "VAX-998812"

    def test_r7_03_force_majeure_skips_cancelled_and_never_gives_free_credit_to_unpaid_proposals(self):
        hdrs = admin_headers()
        slug = f"fm-cohort-{uuid.uuid4().hex[:6]}"

        # 1. Paid $3,000 deposit trip
        client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Paid Storm Guest",
                "client_email": f"paid.fm.{uuid.uuid4().hex[:5]}@example.com",
                "sanctuary_slug": slug,
                "dates": "Sep 10 – Sep 15, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 10000.0,
                "deposit_amount": 3000.0,
                "deposit_paid": True,
            },
        )
        # 2. Unpaid $9,000 proposal ($0 collected) -> MUST get $0 credit, NOT $2,700 free credit!
        client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Unpaid Storm Proposal",
                "client_email": f"unpaid.fm.{uuid.uuid4().hex[:5]}@example.com",
                "sanctuary_slug": slug,
                "dates": "Sep 10 – Sep 15, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9000.0,
            },
        )
        # 3. Already CANCELLED trip -> MUST be skipped and stay CANCELLED!
        c_tr = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Already Cancelled Guest",
                "client_email": f"cancel.fm.{uuid.uuid4().hex[:5]}@example.com",
                "sanctuary_slug": slug,
                "dates": "Sep 10 – Sep 15, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 8000.0,
            },
        ).json()
        client.post(
            f"/api/v1/sidecar/crm/trips/{c_tr['id']}/cancellation",
            headers=hdrs,
            params={"days_prior_to_departure": 90, "cancellation_reason": "Personal"},
        )

        fm = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/force-majeure-postponement",
            headers=hdrs,
            params={"reason": "Category 4 Hurricane"},
        )
        assert fm.status_code == 200, fm.text
        data = fm.json()
        assert data["total_protected_credits_usd"] == 3000.0
        assert data["affected_trips_count"] == 2
        c_after = client.get(f"/api/v1/sidecar/crm/trips/{c_tr['id']}", headers=hdrs).json()["trip"]
        assert c_after["status"] == "CANCELLED"

    def test_r7_04_bodywork_interval_overlap_collision_and_free_slot_stepping(self):
        hdrs = admin_headers()
        slug = f"bw-cohort-{uuid.uuid4().hex[:6]}"
        e1 = f"bw1.{uuid.uuid4().hex[:5]}@example.com"
        e2 = f"bw2.{uuid.uuid4().hex[:5]}@example.com"
        e3 = f"bw3.{uuid.uuid4().hex[:5]}@example.com"

        for name, em in [("Guest One", e1), ("Guest Two", e2), ("Guest Three", e3)]:
            client.post(
                "/api/v1/sidecar/crm/trips",
                headers=hdrs,
                json={
                    "client_name": name,
                    "client_email": em,
                    "sanctuary_slug": slug,
                    "dates": "Jan 28 – Jan 31, 2027",
                    "room_tier": "Oceanfront King Suite",
                    "total_investment": 9500.0,
                },
            )

        # Invalid HH:MM & out-of-range duration rejected (422)
        bad_time = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/schedule-bodywork-session",
            headers=hdrs,
            json={"client_name": "Guest One", "client_email": e1, "session_date": "2027-01-30", "requested_time_slot": "25:99", "duration_minutes": 60},
        )
        assert bad_time.status_code == 422

        bad_dur = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/schedule-bodywork-session",
            headers=hdrs,
            json={"client_name": "Guest One", "client_email": e1, "session_date": "2027-01-30", "requested_time_slot": "14:00", "duration_minutes": 5},
        )
        assert bad_dur.status_code == 422

        # Slot 1: 14:00 for 75 min (14:00 - 15:15)
        b1 = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/schedule-bodywork-session",
            headers=hdrs,
            json={"client_name": "Guest One", "client_email": e1, "session_date": "2027-01-30", "requested_time_slot": "14:00", "duration_minutes": 75},
        )
        assert b1.status_code == 200 and b1.json()["allocated"] is True

        # Slot 2: 15:30 for 60 min (15:30 - 16:30)
        b2 = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/schedule-bodywork-session",
            headers=hdrs,
            json={"client_name": "Guest Two", "client_email": e2, "session_date": "2027-01-30", "requested_time_slot": "15:30", "duration_minutes": 60},
        )
        assert b2.status_code == 200 and b2.json()["allocated"] is True

        # Slot 3: 14:30 midpoint overlap! MUST collide AND skip already-booked 15:30 to offer 16:45!
        b3 = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/schedule-bodywork-session",
            headers=hdrs,
            json={"client_name": "Guest Three", "client_email": e3, "session_date": "2027-01-30", "requested_time_slot": "14:30", "duration_minutes": 60},
        )
        assert b3.status_code == 200
        assert b3.json()["allocated"] is False
        assert b3.json()["status"] == "TIME_SLOT_COLLISION"
        assert b3.json()["offered_adjacent_slot"] == "16:45"


# ==============================================================================
# ROUND 8: RFC 5545 ICAL INJECTION, FLIGHT MERGE & GEOSPATIAL BOUNDS
# ==============================================================================


class TestRound8CalendarFlightMergeAndGeoBounds:
    def test_r8_01_calendar_rejects_inverted_times_and_neutralizes_ical_crlf_injection(self):
        hdrs = admin_headers()

        # Inverted end_time <= start_time rejected (422)
        bad_range = client.post(
            "/api/v1/sidecar/calendar/events",
            headers=hdrs,
            json={
                "title": "Backwards Call",
                "category": "CONSULTATION",
                "start_time": "2027-02-10T16:00:00Z",
                "end_time": "2027-02-10T15:00:00Z",
                "sanctuary_slug": "puerto-vallarta-2027",
            },
        )
        assert bad_range.status_code == 422

        # Blank title rejected (422)
        bad_title = client.post(
            "/api/v1/sidecar/calendar/events",
            headers=hdrs,
            json={
                "title": "   ",
                "category": "CONSULTATION",
                "start_time": "2027-02-10T15:00:00Z",
                "end_time": "2027-02-10T15:30:00Z",
            },
        )
        assert bad_title.status_code == 422

        # CRLF iCal injection attempt in title & location must be neutralized in /feed.ics
        inj = client.post(
            "/api/v1/sidecar/calendar/events",
            headers=hdrs,
            json={
                "title": "Call\r\nBEGIN:VEVENT\r\nSUMMARY:FORGED_PHISHING_EVENT",
                "category": "CONSULTATION",
                "start_time": "2027-02-11T15:00:00Z",
                "end_time": "2027-02-11T15:30:00Z",
                "location": "Zoom\r\nURL:https://evil.example",
                "sanctuary_slug": "puerto-vallarta-2027",
            },
        )
        assert inj.status_code == 200, inj.text

        ics = client.get("/api/v1/sidecar/calendar/feed.ics", headers=hdrs)
        assert ics.status_code == 200
        ics_lines = ics.text.splitlines()
        assert "SUMMARY:FORGED_PHISHING_EVENT" not in ics_lines
        assert "URL:https://evil.example" not in ics_lines

        # Flagship Puerto Vallarta 2027 cohort appears in calendar events
        evts = client.get("/api/v1/sidecar/calendar/events?sanctuary_slug=puerto-vallarta-2027", headers=hdrs).json()
        assert any(e["id"] == "cohort_pv_2027" for e in evts)

    def test_r8_02_batch_flight_disruption_preserves_airline_and_skips_cancelled_trips(self):
        hdrs = admin_headers()
        slug = f"flt-cohort-{uuid.uuid4().hex[:6]}"
        e_active = f"flt.act.{uuid.uuid4().hex[:5]}@example.com"
        e_cancel = f"flt.can.{uuid.uuid4().hex[:5]}@example.com"

        tr_act = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Active Flyer",
                "client_email": e_active,
                "sanctuary_slug": slug,
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
                "smart_flight": {
                    "airline": "United Airlines",
                    "departure_airport": "IAH",
                    "cabin_class": "Polaris Business",
                    "flight_number": "UA-1582",
                },
            },
        ).json()
        tr_can = client.post(
            "/api/v1/sidecar/crm/trips",
            headers=hdrs,
            json={
                "client_name": "Cancelled Flyer",
                "client_email": e_cancel,
                "sanctuary_slug": slug,
                "dates": "Jan 28 – Jan 31, 2027",
                "room_tier": "Oceanfront King Suite",
                "total_investment": 9500.0,
            },
        ).json()
        client.post(
            f"/api/v1/sidecar/crm/trips/{tr_can['id']}/cancellation",
            headers=hdrs,
            params={"days_prior_to_departure": 75, "cancellation_reason": "Cancelled"},
        )

        # Negative delay rejected (422)
        bad_delay = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/batch-flight-disruption",
            headers=hdrs,
            json={
                "disruptions": [{
                    "client_name": "Active Flyer",
                    "client_email": e_active,
                    "flight_number": "UA-1582",
                    "original_arrival_time": "2027-01-28T14:00:00Z",
                    "updated_arrival_time": "2027-01-28T15:30:00Z",
                    "delay_minutes": -15,
                }]
            },
        )
        assert bad_delay.status_code == 422

        # Valid disruption merges into active trip without wiping airline/cabin and ignores cancelled trip
        res = client.post(
            f"/api/v1/sidecar/crm/cohorts/{slug}/batch-flight-disruption",
            headers=hdrs,
            json={
                "disruptions": [
                    {
                        "client_name": "Active Flyer",
                        "client_email": e_active,
                        "flight_number": "UA-1582",
                        "original_arrival_time": "2027-01-28T14:00:00Z",
                        "updated_arrival_time": "2027-01-28T15:30:00Z",
                        "delay_minutes": 90,
                    },
                    {
                        "client_name": "Cancelled Flyer",
                        "client_email": e_cancel,
                        "flight_number": "AA-400",
                        "original_arrival_time": "2027-01-28T14:15:00Z",
                        "updated_arrival_time": "2027-01-28T15:45:00Z",
                        "delay_minutes": 90,
                    },
                ]
            },
        )
        assert res.status_code == 200, res.text
        act_detail = client.get(f"/api/v1/sidecar/crm/trips/{tr_act['id']}", headers=hdrs).json()["trip"]
        assert act_detail["smart_flight"]["airline"] == "United Airlines"
        assert act_detail["smart_flight"]["cabin_class"] == "Polaris Business"
        assert act_detail["smart_flight"]["delay_minutes"] == 90

        can_detail = client.get(f"/api/v1/sidecar/crm/trips/{tr_can['id']}", headers=hdrs).json()["trip"]
        assert not (can_detail["smart_flight"] or {}).get("delay_minutes")

    def test_r8_03_geospatial_route_and_weather_reject_out_of_bounds_coordinates(self):
        hdrs = admin_headers()
        bad_route = client.post(
            "/api/v1/sidecar/travel/routes/calculate",
            headers=hdrs,
            json={
                "origin_name": "Mars",
                "origin_lat": 95.5,
                "origin_lon": -200.0,
                "destination_name": "PVR",
                "destination_lat": 20.68,
                "destination_lon": -105.25,
                "sanctuary_slug": "puerto-vallarta",
            },
        )
        assert bad_route.status_code == 422

        bad_weather = client.get("/api/v1/sidecar/travel/weather?lat=120&lon=10", headers=hdrs)
        assert bad_weather.status_code == 422

        # Antipodal coordinates must never raise math domain error
        dist = calculate_haversine_distance(0.0, 0.0, 0.0, 180.0)
        assert 20000.0 <= dist <= 20030.0


# ==============================================================================
# ROUND 9: REVIEW SENTIMENT FALSE-POSITIVE IMMUNITY & SANCTUARY FIDELITY
# ==============================================================================


class TestRound9SentimentFidelityAndEndToEnd:
    def test_r9_01_review_sentiment_triage_bounds_and_no_false_red_alert_on_cold_plunge_rave(self):
        hdrs = admin_headers()

        # Out-of-bounds rating rejected (422)
        bad_rating = client.post(
            "/api/v1/sidecar/crm/reviews/ingest-with-sentiment-triage",
            headers=hdrs,
            json={
                "sanctuary_slug": "puerto-vallarta-2027",
                "guest_name": "Bad Rating",
                "guest_email": "bad.rating@example.com",
                "overall_rating": 9.5,
                "review_text": "Amazing",
            },
        )
        assert bad_rating.status_code == 422

        # Glowing 5-star review mentioning "cold plunge", "pain relief", "zero noise" -> MUST NOT fire Red Alert!
        rave = client.post(
            "/api/v1/sidecar/crm/reviews/ingest-with-sentiment-triage",
            headers=hdrs,
            json={
                "sanctuary_slug": "puerto-vallarta-2027",
                "guest_name": "Rave Reviewer",
                "guest_email": f"rave.{uuid.uuid4().hex[:5]}@example.com",
                "overall_rating": 5.0,
                "review_text": "Loved the cold plunge, instant pain relief after somatic yoga, and zero noise at night!",
            },
        )
        assert rave.status_code == 200, rave.text
        assert rave.json()["triage_priority"] != "FOUNDER_RED_ALERT"

        # Genuine 2-star complaint -> MUST fire FOUNDER_RED_ALERT!
        complaint = client.post(
            "/api/v1/sidecar/crm/reviews/ingest-with-sentiment-triage",
            headers=hdrs,
            json={
                "sanctuary_slug": "puerto-vallarta-2027",
                "guest_name": "Unhappy Guest",
                "guest_email": f"unhappy.{uuid.uuid4().hex[:5]}@example.com",
                "overall_rating": 2.0,
                "review_text": "The backup generator noise disrupted our sleep every night.",
            },
        )
        assert complaint.status_code == 200, complaint.text
        assert complaint.json()["triage_priority"] == "FOUNDER_RED_ALERT"

    def test_r9_02_booking_to_draft_approval_preserves_sanctuary_without_duplicate(self):
        hdrs = admin_headers()
        email = f"fidelity.{uuid.uuid4().hex[:6]}@example.com"
        ref = f"KAI-{uuid.uuid4().hex[:6].upper()}"

        bk = client.post(
            "/api/v1/bookings",
            json={
                "clientReference": ref,
                "fullName": "Amina Fidelity Guest",
                "email": email,
                "phone": "+1 713-555-0177",
                "retreatId": "puerto-vallarta-2027",
                "roomPreference": "private-suite",
                "movementExperience": "all-levels",
                "passportValid": "yes-valid-6mo",
                "waiverAccepted": True,
                "electronicSignature": "Amina Fidelity Guest",
            },
        )
        assert bk.status_code == 201, bk.text

        drafts = client.get("/api/v1/drafts?status=pending_review", headers=hdrs).json()
        hold_draft = next(d for d in drafts if d["type"] == "booking_hold" and d["guest_name"] == "Amina Fidelity Guest")

        approved = client.post(f"/api/v1/drafts/{hold_draft['id']}/approve", headers=hdrs)
        assert approved.status_code == 200, approved.text

        trips = [t for t in client.get("/api/v1/sidecar/crm/trips", headers=hdrs).json() if t["client_email"] == email]
        assert len(trips) == 1
        assert trips[0]["sanctuary_slug"] == "puerto-vallarta-2027"
        assert trips[0]["paid_amount"] == 0.0
        assert trips[0]["proposal_url"].startswith("/my-retreat?ref=")
