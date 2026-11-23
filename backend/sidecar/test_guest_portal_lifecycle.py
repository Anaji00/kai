"""
KAI Wellness Retreats - Guest Companion & Portal Lifecycle Test Suite
Verifies:
1. DB persistence of magic-link sessions across reboots (GuestPortalSession)
2. Token expiration and revocation enforcement
3. Privacy boundary verification (zero clinical notes or internal CRM IDs exposed)
4. Two-way guest flight update stages ActionDraft (Zero Autonomous Writes)
5. Two-way culinary refinement stages ActionDraft for Nurse Kareena
6. In-stay somatic pulse recording (restorative sleep and vagal tone)
7. Operator-side automated companion invitation dispatch in review queue
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.main import app
from backend.testing import admin_headers
from backend.database import SessionLocal, get_db
from backend.models import ActionDraft
from backend.sidecar.models import StagingIntake, GuestPortalSession, GuestSomaticPulse
from backend.sidecar.services.guest_portal_service import (
    generate_guest_magic_token,
    validate_guest_token,
    revoke_guest_token,
    get_guest_portal_data,
    record_guest_somatic_pulse,
    get_guest_somatic_pulses,
    submit_guest_flight_update,
    submit_guest_dietary_update,
)

client = TestClient(app)
ADMIN_HEADERS = admin_headers()


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_intake(db: Session):
    intake = StagingIntake(
        client_name="Dr. Aris Thorne",
        email="dr.thorne@hospital.org",
        phone="+15125550199",
        sanctuary_slug="nosara",
        room_tier="Private Villa Sanctuary",
        wellness_profile={
            "primary_focus": "Autonomic nervous system recovery & deep sleep",
            "intention": "Overcome severe clinical call burnout.",
            "nutrition_preferences": "Gluten-Free, Plant-Forward",
        },
        clinical_profile={
            "blood_pressure_history": "Pre-hypertension",
            "medications": ["None"],
            "confidential_internal_flags": "High sympathetic tone, physician fatigue",
        },
        flight_request={
            "departure_airport": "AUS",
            "cabin_class": "First / Business Lie-Flat",
            "preferred_airline": "Delta",
            "contact_phone": "+15125550199",
        },
        status="PENDING_APPROVAL"
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)
    return intake


class TestGuestPortalLifecycle:

    def test_01_token_generation_and_db_persistence(self, db: Session, sample_intake: StagingIntake):
        """Test token creation persists session to SQLite database with correct TTL."""
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug=sample_intake.sanctuary_slug,
            room_tier=sample_intake.room_tier,
            flight_request=sample_intake.flight_request,
            wellness_profile=sample_intake.wellness_profile,
            db=db
        )

        assert "token" in token_data
        assert "portal_url" in token_data
        assert token_data["guest_name"] == "Dr. Aris Thorne"

        # Verify record exists in DB table
        db_records = db.query(GuestPortalSession).filter(
            GuestPortalSession.client_name == "Dr. Aris Thorne"
        ).all()
        assert len(db_records) >= 1
        record = db_records[-1]
        assert record.sanctuary_slug == "nosara"
        assert record.room_tier == "Private Villa Sanctuary"
        assert record.is_revoked is False
        # SQLite strips tzinfo on roundtrip; compare naive-to-naive using utcnow()
        assert record.expires_at > datetime.utcnow()

    def test_02_token_validation_and_access_timestamp(self, db: Session, sample_intake: StagingIntake):
        """Validating token updates last_accessed_at and returns non-clinical session data."""
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug=sample_intake.sanctuary_slug,
            db=db
        )

        session = validate_guest_token(token_data["token"], db=db)
        assert session is not None
        assert session["client_name"] == "Dr. Aris Thorne"
        assert session["sanctuary_slug"] == "nosara"

    def test_03_privacy_boundary_zero_clinical_or_crm_leak(self, db: Session, sample_intake: StagingIntake):
        """Verify the /me companion payload strictly exposes zero clinical flags or internal CRM IDs."""
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug=sample_intake.sanctuary_slug,
            flight_request=sample_intake.flight_request,
            wellness_profile=sample_intake.wellness_profile,
            db=db
        )

        resp = client.get(f"/api/v1/sidecar/guest-portal/me?token={token_data['token']}")
        assert resp.status_code == 200
        payload = resp.json()

        # Check positive guest properties
        assert payload["guest_name"] == "Dr. Aris Thorne"
        assert "weather" in payload
        assert "chauffeur" in payload
        assert "daily_schedule" in payload
        assert "packing_list" in payload
        assert "wellness_focus" in payload

        # Check strict privacy firewall: No clinical flags, no internal CRM IDs
        assert "clinical_profile" not in payload
        assert "confidential_internal_flags" not in str(payload)
        assert "blood_pressure_history" not in str(payload)
        assert "crm_trip_id" not in payload
        assert "crm_contact_id" not in payload

    def test_04_guest_flight_update_stages_action_draft(self, db: Session, sample_intake: StagingIntake):
        """
        Zero Autonomous Writes: When a guest submits a flight delay from the PWA companion,
        it stages an ActionDraft for Grand Travel chauffeur recalibration rather than writing directly.
        """
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug="nosara",
            flight_request=sample_intake.flight_request,
            db=db
        )

        payload = {
            "token": token_data["token"],
            "flight_number": "DL 842",
            "delay_minutes": 60,
            "gate": "B14",
            "notes": "Severe weather over Austin, tarmac hold in Houston."
        }
        resp = client.post("/api/v1/sidecar/guest-portal/flight-update", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "staged_for_review"
        assert "draft_id" in data

        # Verify ActionDraft was created
        draft = db.query(ActionDraft).filter(ActionDraft.id == data["draft_id"]).first()
        assert draft is not None
        assert draft.type == "flight_delay_chauffeur_update"
        assert draft.guest_name == "Dr. Aris Thorne"
        assert "DL 842" in draft.content
        assert "60 minutes" in draft.content

    def test_05_guest_culinary_refinement_stages_action_draft(self, db: Session, sample_intake: StagingIntake):
        """When a guest submits culinary preferences, it stages a draft for Nurse Kareena to brief the chef."""
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug="nosara",
            db=db
        )

        payload = {
            "token": token_data["token"],
            "dietary_tags": ["Gluten-Free", "Low-Histamine", "Ayurvedic"],
            "allergies": "Pine nuts and raw mango",
            "special_chef_notes": "Warm broth preferred in the evenings."
        }
        resp = client.post("/api/v1/sidecar/guest-portal/dietary-update", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "staged_for_review"

        draft = db.query(ActionDraft).filter(ActionDraft.id == data["draft_id"]).first()
        assert draft is not None
        assert draft.type == "clinical_dietary_refinement"
        assert "Pine nuts and raw mango" in draft.content

    def test_06_in_stay_somatic_pulse_recording(self, db: Session, sample_intake: StagingIntake):
        """Guests can log daily in-stay sleep restoration and vagal tone scores into SQLite DB."""
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug="nosara",
            db=db
        )

        pulse_payload = {
            "token": token_data["token"],
            "day_number": 2,
            "phase": "MORNING_AWAKENING",
            "restorative_sleep_score": 9,
            "nervous_system_ease": 8,
            "vagal_tone_descriptor": "Deep Stillness & Renewed Vitality",
            "private_reflection_notes": "Fell asleep to 432Hz sound bath, woke up naturally without alarm."
        }
        resp = client.post("/api/v1/sidecar/guest-portal/pulse", json=pulse_payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["pulse"]["restorative_sleep_score"] == 9
        assert data["pulse"]["day_number"] == 2

        # Check operator view of pulses
        op_resp = client.get(
            f"/api/v1/sidecar/guest-portal/pulses/{sample_intake.id}",
            headers=admin_headers()
        )
        assert op_resp.status_code == 200
        pulses = op_resp.json()["pulses"]
        assert len(pulses) >= 1
        assert pulses[0]["restorative_sleep_score"] == 9

    def test_07_token_revocation_enforcement(self, db: Session, sample_intake: StagingIntake):
        """Operators can immediately revoke a guest token."""
        token_data = generate_guest_magic_token(
            intake_id=sample_intake.id,
            client_name=sample_intake.client_name,
            email=sample_intake.email,
            sanctuary_slug="nosara",
            db=db
        )

        # Before revocation: valid
        val_resp = client.get(f"/api/v1/sidecar/guest-portal/validate?token={token_data['token']}")
        assert val_resp.status_code == 200

        # Revoke
        rev_resp = client.post(
            "/api/v1/sidecar/guest-portal/revoke-token",
            json={"token": token_data["token"]},
            headers=admin_headers()
        )
        assert rev_resp.status_code == 200
        assert rev_resp.json()["revoked"] is True

        # After revocation: 401 Unauthorized
        val_resp_after = client.get(f"/api/v1/sidecar/guest-portal/validate?token={token_data['token']}")
        assert val_resp_after.status_code == 401

    def test_08_auto_staging_companion_invitation_draft(self, db: Session, sample_intake: StagingIntake):
        """Generating a token via router auto-stages a guest_companion_invitation in action_drafts."""
        resp = client.post(
            f"/api/v1/sidecar/guest-portal/generate-token?intake_id={sample_intake.id}&auto_stage_invitation=true",
            headers=admin_headers()
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "invitation_draft" in body
        assert body["invitation_draft"]["type"] == "guest_companion_invitation"

        # Approve the draft in drafts router
        draft_id = body["invitation_draft"]["draft_id"]
        approve_resp = client.post(
            f"/api/v1/drafts/{draft_id}/approve",
            json={"operator_name": "Kareena Islam"},
            headers=admin_headers()
        )
        assert approve_resp.status_code == 200
        approve_data = approve_resp.json()
        assert approve_data["status"] == "approved"
        assert approve_data["dispatch_result"]["channel"] == "GUEST_COMPANION_INVITE_DISPATCH"

    def test_09_proposal_sign_requires_email_and_keeps_offline_settlement_pending(self, db: Session):
        """
        Offline VAX / Wire Governance:
        1. Signing a proposal with a mismatched email returns 403.
        2. Signing with the matching guest email saves waiver/flight/dietary details,
           sets status='PROPOSAL_SIGNED' and deposit_status='AWAITING_OFFLINE_SETTLEMENT',
           and NEVER marks funds PAID until an advisor logs VAX/wire receipt.
        """
        from backend.sidecar.models import CRMClient, CRMTrip
        import uuid

        c_id = str(uuid.uuid4())
        t_id = str(uuid.uuid4())
        crm_trip_id = f"kai_trp_{uuid.uuid4().hex[:8]}"
        client_rec = CRMClient(
            id=c_id,
            crm_contact_id=f"kai_cnt_{uuid.uuid4().hex[:8]}",
            full_name="Maya Lin",
            email="maya.offline.test@example.com",
            waiver_status="PENDING",
            tags=["KAI_GUEST"],
        )
        trip_rec = CRMTrip(
            id=t_id,
            crm_trip_id=crm_trip_id,
            client_id=c_id,
            client_name="Maya Lin",
            client_email="maya.offline.test@example.com",
            sanctuary_slug="puerto-vallarta-2027",
            title="Marival Armony Sanctuary",
            dates="Jan 28 – Jan 31, 2027",
            room_tier="Oceanfront King Suite",
            status="PROPOSED_ITINERARY",
            total_investment=9500.0,
            deposit_amount=2850.0,
            deposit_status="PENDING_CLIENT_AUTHORIZATION",
            final_balance=6650.0,
        )
        db.add(client_rec)
        db.add(trip_rec)
        db.commit()

        # Mismatched email must be rejected
        bad_resp = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": "attacker@example.com",
                "payment_preference": "VAX_HOST_AGENCY_CALL",
                "e_signature": "Maya Lin",
                "agreed_to_terms": True,
            },
        )
        assert bad_resp.status_code == 403

        # Valid guest email signs proposal + arrival check-in without marking PAID
        ok_resp = client.post(
            "/api/v1/sidecar/guest-portal/proposal/approve",
            json={
                "ref": crm_trip_id,
                "guest_email": "maya.offline.test@example.com",
                "payment_preference": "BANK_WIRE_ACH",
                "e_signature": "Maya Lin",
                "agreed_to_terms": True,
                "flight_number": "UA-1582",
                "origin_airport": "IAH",
                "dietary_notes": "Gluten-Free, Pescatarian",
            },
        )
        assert ok_resp.status_code == 200, ok_resp.text
        body = ok_resp.json()
        assert body["trip"]["status"] == "PROPOSAL_SIGNED"
        assert body["trip"]["deposit_status"] == "AWAITING_OFFLINE_SETTLEMENT"

        db.expire_all()
        refreshed_trip = db.query(CRMTrip).filter(CRMTrip.id == t_id).first()
        refreshed_client = db.query(CRMClient).filter(CRMClient.id == c_id).first()
        assert refreshed_trip.deposit_status == "AWAITING_OFFLINE_SETTLEMENT"
        assert (refreshed_trip.payment_history or []) == []
        assert refreshed_trip.smart_flight.get("flight_number") == "UA-1582"
        assert refreshed_trip.smart_flight.get("departure_airport") == "IAH"
        assert refreshed_client.waiver_status == "SIGNED"
        assert refreshed_client.dietary_requirements == "Gluten-Free, Pescatarian"
