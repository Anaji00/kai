"""
Pytest Integration Suite: Expanded Real-World Operational & Clinical Use Cases
=============================================================================
Platform: KAI Sanctuary Platform (Founder: Kareena Islam, BSN, RN)

This suite packages the 10 ultra-expanded operational domains into standard
pytest test functions for automated CI/CD and regression testing:
 1. test_vip_family_office_buyout_and_subtrip_manifest
 2. test_clinical_contraindication_escalation_interceptor
 3. test_inbound_multichannel_telemetry_storm_wal_concurrency
 4. test_autonomous_tarmac_chauffeur_rerouting
 5. test_somatic_continuity_4_phase_journey
 6. test_noisy_voice_dictation_consultation_staging
 7. test_b2b_wellness_studio_syndicate_and_commission
 8. test_restorative_isolation_12_to_14_guest_ceiling
 9. test_multi_cohort_reflection_sentiment_vagal_telemetry
 10. test_action_drafts_complete_lifecycle_and_audit_provenance
"""

import os
import sys
import time
import json
import base64
import threading
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app
from backend.database import SessionLocal, init_db
from backend.config import settings
from backend.models import Booking, FlightConciergeRequest, CustomGroupInquiry, ActionDraft
from backend.sidecar.models import (
    StagingIntake,
    StagedLead,
    SmsDispatch,
    WebhookEventLog,
    SanctuaryRoute,
    SomaticPointOfInterest,
    GroundTransferRecord,
    CuratedDiningSpot,
    DestinationReview,
    DestinationGuide,
    VendorSupplierRecord,
    CalendarEvent,
)
from backend.sidecar.services.geo_routing_service import compute_custom_route
from backend.sidecar.services.voice_transcriber import extract_entities_from_transcript
from backend.sidecar.services.continuity_service import generate_continuity_milestones
from backend.sidecar.services.lead_gen import discover_and_stage_leads

ADMIN_USER = settings.ADMIN_USERNAME or "kai_founder"
ADMIN_PASS = settings.ADMIN_PASSWORD or "kai_sanctuary_2026"
AUTH_HEADER = {
    "Authorization": f"Basic {base64.b64encode(f'{ADMIN_USER}:{ADMIN_PASS}'.encode()).decode()}"
}

client = TestClient(app, headers=AUTH_HEADER)


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Initializes the database and cleans up any conflicting records."""
    init_db()
    with SessionLocal() as db:
        db.query(StagingIntake).filter(
            StagingIntake.email.in_([
                "a.rothschild.fo@genevacapital.ch",
                "h.montgomery.vip@oxfordholdings.co.uk",
                "dr.elena.marquardt@berlinneuro.de"
            ])
        ).delete(synchronize_session=False)
        db.query(CustomGroupInquiry).filter(
            CustomGroupInquiry.email == "a.rothschild.fo@genevacapital.ch"
        ).delete(synchronize_session=False)
        db.query(VendorSupplierRecord).filter(
            VendorSupplierRecord.name == "Mayfair Somatic & Reformer Institute"
        ).delete(synchronize_session=False)
        db.commit()


def test_vip_family_office_buyout_and_subtrip_manifest():
    """Validates full family office buyout staging and sub-trip flight manifests."""
    buyout_payload = {
        "organizerName": "Alexander von Rothschild",
        "email": "a.rothschild.fo@genevacapital.ch",
        "phone": "+41 22 819 0400",
        "groupSize": 10,
        "targetDestination": "nosara",
        "targetDates": "November 14 - 21, 2026",
        "somaticGoals": "High-impact family succession decompression, vagal grounding, private ocean sound architecture.",
        "dietaryRequirements": "4 guests strict Ayurvedic Pitta-pacifying; 2 Celiac gluten-free; 4 vegan raw organic.",
        "villaPreferences": "Exclusive Buyout of All 6 Sacred Canopy Villas.",
        "flightManifest": "3 guests Geneva (GVA -> LIR), 4 guests London Heathrow (LHR -> LIR), 3 guests New York (JFK -> LIR).",
        "requiresSecurityDetail": True,
        "operatorNotes": "Single billing entity: Geneva Family Office SA. Dedicated tarmac handling required."
    }

    res_buyout = client.post("/api/v1/retreats/custom-group", json=buyout_payload)
    assert res_buyout.status_code in [200, 201], f"Custom group buyout failed: {res_buyout.text}"
    buyout_data = res_buyout.json()
    assert buyout_data["success"] is True
    assert "inquiryId" in buyout_data

    intake_payload = {
        "client_name": "Alexander von Rothschild (Family Principal)",
        "email": "a.rothschild.fo@genevacapital.ch",
        "phone": "+41 22 819 0400",
        "sanctuary_slug": "nosara",
        "room_tier": "Bespoke Private Sanctuary Buyout",
        "wellness_profile": {
            "primary_focus": "Family office burnout decompression & vagal stillness",
            "dietary_style": "Ayurvedic Pitta-pacifying / Organic",
            "contraindications": "None reported. Requesting morning private pranayama.",
            "preferred_practitioner_gender": "No preference"
        },
        "flight_request": {
            "departure_airport": "GVA",
            "cabin_class": "first",
            "special_assistance": "Direct tarmac chauffeur transfer"
        }
    }

    res_intake = client.post("/api/v1/sidecar/intakes", json=intake_payload)
    assert res_intake.status_code in [200, 201]
    intake_data = res_intake.json()
    assert intake_data["status"] == "PENDING_APPROVAL"

    with SessionLocal() as db:
        sms = db.query(SmsDispatch).filter(
            SmsDispatch.message_body.like("%Alexander von Rothschild%")
        ).first()
        if sms:
            assert sms.status in ["PENDING_REVIEW", "PENDING_APPROVAL"]


def test_clinical_contraindication_escalation_interceptor():
    """Validates clinical screening escalation for high-risk modalities."""
    complex_intake = {
        "client_name": "Helena Montgomery",
        "email": "h.montgomery.vip@oxfordholdings.co.uk",
        "phone": "+44 20 7946 0192",
        "sanctuary_slug": "amalfi",
        "room_tier": "Cliffside Stillness Suite",
        "clinical_profile": {
            "health_notes": (
                "History of mild transient ischemic attack (TIA) 18 months ago on anticoagulants, implanted cardiac pacemaker, "
                "currently 9 weeks pregnant (Trimester 1), and previous cervical spine C5-C6 fusion."
            ),
            "intentions": "Profound mental decompression and gentle coastal quietude without acute physical stressors.",
            "movement_experience": "Gentle restorative only",
            "passport_valid": "yes-valid-6mo",
            "nights": 7
        },
        "flight_request": {
            "departure_airport": "LHR",
            "cabin_class": "business",
            "preferred_airline": "British Airways"
        }
    }

    res = client.post("/api/v1/sidecar/intakes", json=complex_intake)
    assert res.status_code in [200, 201]
    data = res.json()
    assert data["status"] == "PENDING_APPROVAL"
    assert data["clinical_screening_enabled"] is True

    with SessionLocal() as db:
        intake_rec = db.query(StagingIntake).filter(StagingIntake.email == "h.montgomery.vip@oxfordholdings.co.uk").first()
        assert intake_rec is not None
        assert intake_rec.clinical_screening_enabled is True


def test_inbound_multichannel_telemetry_storm_wal_concurrency():
    """Validates 20 concurrent inbound webhook writes under SQLite WAL."""
    thread_results = []
    concurrency_count = 20

    def simulate_telemetry_ping(idx: int):
        thread_client = TestClient(app, headers=AUTH_HEADER)
        providers = ["CIRIUM_FLIGHT_RADAR", "EXPEDIA_PMS", "WHATSAPP_GUEST_GATEWAY", "SANCTUARY_CARD_VAULT"]
        provider = providers[idx % len(providers)]

        payload = {
            "provider": provider,
            "event_type": f"telemetry.ping.{idx}",
            "payload": {
                "ping_id": f"ping-burst-{idx}-{time.time()}",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "telemetry_metrics": {
                    "vagal_coherence": 0.82 + (idx * 0.005),
                    "flight_status": "ON_TIME" if idx % 2 == 0 else "EN_ROUTE",
                    "tarmac_sensor": "GATE_A4"
                }
            }
        }
        try:
            r = thread_client.post("/api/v1/sidecar/webhooks/simulate", json=payload)
            thread_results.append((r.status_code, r.json()))
        except Exception as ex:
            thread_results.append((500, str(ex)))

    threads = [threading.Thread(target=simulate_telemetry_ping, args=(i,)) for i in range(concurrency_count)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(thread_results) == concurrency_count
    for status_code, body in thread_results:
        assert status_code == 200, f"Thread failed with status {status_code}: {body}"
        assert body["status"] == "PROCESSED"


def test_autonomous_tarmac_chauffeur_rerouting():
    """Validates geodesic routing bypass calculation and chauffeur dispatch staging."""
    route_calc_payload = {
        "origin_name": "Liberia Daniel Oduber Quiros Airport (LIR)",
        "origin_lat": 10.5933,
        "origin_lon": -85.5444,
        "destination_name": "KAI Nosara Ocean Sanctuary (via Santa Cruz Ridge Bypass)",
        "destination_lat": 9.9806,
        "destination_lon": -85.6667,
        "sanctuary_slug": "nosara",
        "terrain_type": "JUNGLE"
    }

    res_route = client.post("/api/v1/sidecar/travel/routes/calculate", json=route_calc_payload)
    assert res_route.status_code == 200
    route_data = res_route.json()
    assert route_data["distance_km"] > 0
    assert route_data["estimated_minutes"] > 0
    assert "recommended_vehicle" in route_data

    transfers_res = client.get("/api/v1/sidecar/travel/transfers?sanctuary_slug=nosara")
    assert transfers_res.status_code == 200
    transfers = transfers_res.json()
    assert len(transfers) >= 1
    transfer_id = transfers[0]["id"]

    webhook_payload = {
        "transfer_id": transfer_id,
        "status": "DELAYED",
        "chauffeur_notes": "Route 160 flooded at Rio Montaña. Executing Santa Cruz ridge detour (+35 mins). Guest resting comfortably with Wi-Fi and chilled water."
    }
    res_transfer = client.post("/api/v1/sidecar/travel/transfers/webhook", json=webhook_payload)
    assert res_transfer.status_code == 200
    assert res_transfer.json()["new_status"] == "DELAYED"


def test_somatic_continuity_4_phase_journey():
    """Validates generation of 4-phase longitudinal post-retreat milestones."""
    with SessionLocal() as db:
        test_intake = StagingIntake(
            client_name="Dr. Jonathan Hayes",
            email="j.hayes.neuro@oxford.edu",
            sanctuary_slug="nosara",
            room_tier="Sacred Canopy Pavilion",
            status="COMPLETED"
        )
        db.add(test_intake)
        db.commit()
        db.refresh(test_intake)
        intake_id = test_intake.id

    continuity_payload = {
        "intake_id": intake_id,
        "departure_date": "2026-11-20"
    }
    res_cont = client.post("/api/v1/sidecar/continuity/generate-arc", json=continuity_payload)
    assert res_cont.status_code == 200
    arc_data = res_cont.json()
    assert len(arc_data["milestones"]) == 4

    days = [m["day"] for m in arc_data["milestones"]]
    assert 3 in days
    assert 7 in days
    assert 14 in days
    assert 28 in days

    staged_ids = [m["draft_id"] for m in arc_data["milestones"]]
    assert len(staged_ids) == 4

    with SessionLocal() as db:
        staged_drafts = db.query(ActionDraft).filter(
            ActionDraft.id.in_(staged_ids)
        ).all()
        assert len(staged_drafts) == 4
        for d in staged_drafts:
            assert d.status == "pending_review"


def test_noisy_voice_dictation_consultation_staging():
    """Validates entity extraction from unstructured spoken voice transcript."""
    noisy_transcript = (
        "Good afternoon team, just wrapped up a long alignment call with Dr. Elena Marquardt. "
        "She's a neurologist flying in from Berlin, so route her through FRA Frankfurt into Naples NAP. "
        "She was originally looking at Bali, but we agreed the Amalfi Coast sanctuary would be far better "
        "for her sensory stillness. Let's place her in the Cliffside Stillness Suite. "
        "Her main focus is deep executive burnout recovery, circadian reset, and parasympathetic decompression. "
        "Dietary-wise, she is strictly gluten-free and avoids refined sugars. "
        "No acute medical contraindications were mentioned during the call. "
        "Please stage her intake so I can do a final clinical review tomorrow morning."
    )

    extracted = extract_entities_from_transcript(noisy_transcript)
    assert "Elena" in extracted["client_name"] or "Marquardt" in extracted["client_name"]
    assert extracted["sanctuary_slug"] == "amalfi"
    assert "Cliffside" in extracted["room_tier"] or "Stillness" in extracted["room_tier"]
    assert extracted["clinical_screening_enabled"] is False

    voice_payload = {
        "raw_transcript": noisy_transcript,
        "operator_name": "Kareena Islam"
    }
    res_voice = client.post("/api/v1/sidecar/intakes/voice-memo", json=voice_payload)
    assert res_voice.status_code == 200
    voice_res_data = res_voice.json()
    assert voice_res_data["success"] is True
    assert voice_res_data["status"] == "PENDING_APPROVAL"


def test_b2b_wellness_studio_syndicate_and_commission():
    """Validates discovery of B2B partners, collaboration theses, and preferred vendor registry."""
    with SessionLocal() as db:
        staged_leads = discover_and_stage_leads(db, city="Houston, TX")
        assert len(staged_leads) >= 1
        lead = staged_leads[0]
        assert lead.status in ["PENDING_APPROVAL", "OUTREACH_STAGED", "APPROVED", "OUTREACH_DISPATCHED"]
        assert len(lead.outreach_thesis) > 40

        partner_supplier = VendorSupplierRecord(
            name="Mayfair Somatic & Reformer Institute",
            category="WELLNESS_STUDIO_PARTNER",
            sanctuary_slug="amalfi",
            contact_name="Lady Victoria Sterling",
            email="v.sterling@mayfairsomatics.co.uk",
            phone="+44 20 7946 0881",
            commission_rate=15.0,
            commission_type="PERCENTAGE",
            payment_terms="Sanctuary Native Client Card Auth",
            preferred_tier="PREFERRED_PARTNER",
            service_description="Exclusive Mayfair private reformer studio referring HNW clientele for European retreats.",
            clinical_relevance="Specializes in postural myofascial release and parasympathetic vagus nerve stimulation."
        )
        db.add(partner_supplier)
        db.commit()
        db.refresh(partner_supplier)
        supplier_id = partner_supplier.id

    res_vendor = client.get(f"/api/v1/sidecar/vendors/{supplier_id}")
    assert res_vendor.status_code == 200
    vendor_data = res_vendor.json()
    assert vendor_data["commission_rate"] == 15.0
    assert vendor_data["preferred_tier"] == "PREFERRED_PARTNER"


def test_restorative_isolation_12_to_14_guest_ceiling():
    """Enforces the strict 12-14 guest restorative ceiling on incoming manifests."""
    over_capacity_manifest = {
        "sanctuary_slug": "nosara",
        "document_name": "Q4_Executive_Offsite_Group_Manifest.csv",
        "external_guest_records": [
            {"guest_name": f"Guest {i}", "room_tier": "Private Ocean Villa", "dates": "Nov 1-7, 2026"}
            for i in range(1, 17)
        ]
    }

    res_diff = client.post("/api/v1/sidecar/reconciliation/manifest-diff", json=over_capacity_manifest)
    assert res_diff.status_code == 200
    diff_data = res_diff.json()

    assert diff_data["over_capacity"] == "YES"
    assert diff_data["external_count"] == 16
    assert diff_data["cohort_cap"] == 14
    assert diff_data["status"] == "PENDING_APPROVAL"
    assert any("exceeds" in d.get("message", "").lower() or "limit" in d.get("message", "").lower() for d in diff_data["discrepancies"])


def test_multi_cohort_reflection_sentiment_vagal_telemetry():
    """Validates reflection telemetry scoring: deep sleep, quietude, and sentiment labels."""
    reflections = [
        {
            "sanctuary_slug": "amalfi",
            "guest_name": "Julian Thorne",
            "stay_dates": "May 2026 Cohort",
            "rating": 5.0,
            "comment": (
                "The quietude of the cliffside terrace at night was unlike anything I have felt in 20 years on Wall Street. "
                "The acoustic 432Hz sound bath and Nurse Kareena's guided prana breathwork reset my nervous system completely. "
                "I slept 8 uninterrupted hours for six consecutive nights."
            )
        },
        {
            "sanctuary_slug": "bali",
            "guest_name": "Camille Laurent",
            "stay_dates": "July 2026 Cohort",
            "rating": 5.0,
            "comment": (
                "Sacred water cleansing and silence in the jungle canopy allowed me to decompress from acute creative burnout. "
                "Clinical attentiveness was impeccable, gentle, and profoundly respectful of my solitude."
            )
        }
    ]

    for ref in reflections:
        res_rev = client.post("/api/v1/sidecar/travel/reviews/webhook", json={
            "provider": "POST_RETREAT_SURVEY",
            **ref
        })
        assert res_rev.status_code == 200
        rev_data = res_rev.json()
        assert rev_data["deep_sleep_score"] >= 90.0
        assert rev_data["quietude_score"] >= 90.0
        assert rev_data["sentiment_label"] in ["DEEPLY_RESTORATIVE", "HELD_WITH_CARE", "PEACEFUL_RENEWAL", "PEACEFUL", "RENEWING"]


def test_action_drafts_complete_lifecycle_and_audit_provenance():
    """Verifies complete ActionDrafts lifecycle: 1-click approvals, discards, batch approvals, and audit trails."""
    res_stats = client.get("/api/v1/drafts/stats")
    assert res_stats.status_code == 200

    with SessionLocal() as db:
        test_draft = ActionDraft(
            type="sms_broadcast",
            guest_name="Helena Montgomery",
            content="Chauffeur confirmed at NAP Airport.",
            status="pending_review"
        )
        db.add(test_draft)
        db.commit()
        db.refresh(test_draft)
        draft_to_approve = test_draft.id

        test_draft_discard = ActionDraft(
            type="email_reply",
            guest_name="Duplicate Inquirer",
            content="Duplicate inquiry response draft.",
            status="pending_review"
        )
        db.add(test_draft_discard)
        db.commit()
        db.refresh(test_draft_discard)
        draft_to_discard = test_draft_discard.id

    res_appr = client.post(f"/api/v1/drafts/{draft_to_approve}/approve")
    assert res_appr.status_code == 200
    assert res_appr.json()["status"] == "approved"

    res_disc = client.post(f"/api/v1/drafts/{draft_to_discard}/discard")
    assert res_disc.status_code == 200
    assert res_disc.json()["status"] == "success"

    res_batch = client.post("/api/v1/drafts/batch-approve", json={"category": "routine"})
    assert res_batch.status_code == 200

    with SessionLocal() as db:
        d1 = db.query(ActionDraft).filter(ActionDraft.id == draft_to_approve).first()
        assert d1.status == "approved"
        d2 = db.query(ActionDraft).filter(ActionDraft.id == draft_to_discard).first()
        assert d2.status == "discarded"
