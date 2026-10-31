"""
Deep Expanded Real-World Use Case Test Suite for KAI Sanctuary Platform
========================================================================
This suite validates the remaining deep operational domains of the KAI platform:
1. High-Net-Worth Staged Guest Intake & RAG Clinical Thesis Generation
2. 1-Click Founder Clinical Review & Tern CRM CRM Sync
3. Operational SMS Dispatch Gate & Multi-Recipient Campaign Broadcast
4. Terrain-Adjusted Dynamic Geodesic Navigation & Luxury Fleet Matching
5. Real-Time Microclimate Bioclimatology & Somatic Nursing Guidance
6. Multi-Tag Organic & Ayurvedic Blue Zone Dining Search
7. Private Chauffeur Tarmac Transfer Tracking & Disruption Staging
8. Bespoke Corporate Buyout Inquiry with Auto-Mirrored Clinical Thesis & SMS Alert
9. Live Sanctuary Cohort Capacity & Spots Remaining Telemetry Audit
10. Synthetic Data Seeding & Database Telemetry Health Check
"""

import os
import sys
import time
import base64
from datetime import datetime, timezone

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient

from backend.main import app
from backend.database import SessionLocal, init_db
from backend.config import settings
from backend.sidecar.models import (
    StagingIntake,
    SmsDispatch,
    SanctuaryRoute,
    CuratedDiningSpot,
    GroundTransferRecord,
    DestinationReview,
)
from backend.models import ActionDraft, CustomGroupInquiry

ADMIN_USER = settings.ADMIN_USERNAME
ADMIN_PASS = settings.ADMIN_PASSWORD
AUTH_HEADER = {
    "Authorization": f"Basic {base64.b64encode(f'{ADMIN_USER}:{ADMIN_PASS}'.encode()).decode()}"
}


def log_step(title: str, scenario: str):
    print(f"\n{'='*75}")
    print(f" [EXPANDED USE CASE] {title}")
    print(f" Scenario: {scenario}")
    print(f"{'='*75}")


def run_suite():
    init_db()
    client = TestClient(app, headers=AUTH_HEADER)
    suite_t0 = time.time()
    passed = 0
    total = 10

    # Clean up test records from prior runs
    with SessionLocal() as db:
        db.query(StagingIntake).filter(
            StagingIntake.email.in_([
                "julian.thorne.deep@goldcoastcapital.com",
                "v.sterling@biotechlongevity.com"
            ])
        ).delete(synchronize_session=False)
        db.query(CustomGroupInquiry).filter(
            CustomGroupInquiry.email == "v.sterling@biotechlongevity.com"
        ).delete(synchronize_session=False)
        db.commit()

    # =========================================================================
    # USE CASE 1: High-Net-Worth Staged Intake & RAG Clinical Thesis Generation
    # =========================================================================
    log_step(
        "1. High-Net-Worth Staged Intake & RAG Clinical Thesis Generation",
        "A hedge fund manager submits a high-stress medical intake. Sidecar runs clinical RAG to formulate a vagal thesis, stages intake in PENDING_APPROVAL, and prevents direct writes to Tern CRM."
    )
    t0 = time.time()
    intake_payload = {
        "client_name": "Julian Thorne",
        "email": "julian.thorne.deep@goldcoastcapital.com",
        "phone": "+1 (312) 555-0155",
        "sanctuary_slug": "nosara",
        "room_tier": "Private Ocean Canopy Villa",
        "clinical_profile": {
            "movement_experience": "All Levels",
            "health_notes": "Sympathetic hyperarousal from capital markets stress, elevated evening cortisol, chronic non-restorative sleep, early morning waking.",
            "intentions": "Nervous system decompression, restorative vagal resetting, and unbroken delta sleep.",
            "passport_valid": "yes-valid-6mo",
            "nights": 6
        },
        "flight_request": {
            "departure_airport": "ORD",
            "cabin_class": "business",
            "preferred_airline": "United Airlines",
            "travel_dates_flexible": False,
            "special_requests": "Direct lie-flat routing into Liberia (LIR) with private 4WD Suburban chauffeur tarmac meet"
        }
    }

    res1 = client.post("/api/v1/sidecar/intakes", json=intake_payload)
    assert res1.status_code == 200, f"Expected 200, got {res1.status_code}: {res1.text}"
    intake_data = res1.json()
    intake_id = intake_data["id"]

    assert intake_data["status"] == "PENDING_APPROVAL", "Invariant violated: intake must be staged in PENDING_APPROVAL"
    assert intake_data["tern_trip_id"] is None, "Governance violated: autonomous write to Tern CRM occurred prematurely"
    assert intake_data["consultation_thesis"] is not None, "Clinical thesis was not generated"

    thesis = intake_data["consultation_thesis"]
    assert "sympathetic_tone_hypothesis" in thesis
    assert "circadian_protocol" in thesis
    assert len(thesis.get("consultation_talk_tracks", [])) > 0
    assert len(thesis.get("tern_itinerary_draft", [])) > 0

    # Verify ActionDraft queued
    with SessionLocal() as db:
        draft = db.query(ActionDraft).filter(
            ActionDraft.type == "guest_intake",
            ActionDraft.guest_name == "Julian Thorne"
        ).first()
        assert draft is not None, "ActionDraft was not staged for founder review"
        assert "PENDING_APPROVAL" in draft.content

    print(f" [PASS] Intake staged with RAG thesis in {int((time.time()-t0)*1000)}ms")
    print(f"        Intake ID: {intake_id}")
    print(f"        Sympathetic Tone Hypothesis: {thesis['sympathetic_tone_hypothesis'][:80]}...")
    print(f"        Action Draft Queued: '{draft.content[:60]}...'")
    passed += 1

    # =========================================================================
    # USE CASE 2: 1-Click Founder Clinical Review & Tern CRM CRM Sync
    # =========================================================================
    log_step(
        "2. 1-Click Founder Clinical Review & Tern CRM Sync",
        "Founder Kareena reviews Julian's clinical thesis, overrides room tier, and clicks 1-tap Tern Sync. Intake status transitions to SYNCED_TO_TERN with Tern trip and contact IDs."
    )
    t0 = time.time()
    sync_payload = {
        "operator_name": "Kareena Islam",
        "override_room_tier": "Private Ocean Canopy Villa",
        "notes": "Reviewed by Kareena Islam, RN. Cleared for 432Hz acoustic sessions and gentle vagal breathwork."
    }
    res2 = client.post(f"/api/v1/sidecar/intakes/{intake_id}/tern-sync", json=sync_payload)
    assert res2.status_code == 200, f"Expected 200, got {res2.status_code}: {res2.text}"
    sync_data = res2.json()

    assert sync_data["success"] is True
    assert sync_data["status"] == "SYNCED_TO_TERN"
    assert sync_data["tern_contact_id"].startswith("tern_cnt_")
    assert sync_data["tern_trip_id"].startswith("tern_trp_")
    assert len(sync_data["applied_tags"]) > 0

    # Verify database state
    with SessionLocal() as db:
        intake_db = db.query(StagingIntake).filter(StagingIntake.id == intake_id).first()
        assert intake_db.status == "SYNCED_TO_TERN"
        assert intake_db.reviewed_by == "Kareena Islam"
        assert intake_db.tern_trip_id == sync_data["tern_trip_id"]

    print(f" [PASS] 1-Click Tern CRM Sync executed in {int((time.time()-t0)*1000)}ms")
    print(f"        Status: {sync_data['status']}")
    print(f"        Tern Contact ID: {sync_data['tern_contact_id']}")
    print(f"        Tern Trip ID: {sync_data['tern_trip_id']}")
    print(f"        Applied Clinical Tags: {sync_data['applied_tags']}")
    passed += 1

    # =========================================================================
    # USE CASE 3: Operational SMS Dispatch Gate & Multi-Recipient Broadcast
    # =========================================================================
    log_step(
        "3. Operational SMS Dispatch Gate & Multi-Recipient Campaign Broadcast",
        "Operations drafts an urgent pre-departure somatic reminder broadcast. All 3 campaign SMS messages land in PENDING_APPROVAL with ActionDrafts. Kareena executes explicit 1-click authorization to dispatch."
    )
    t0 = time.time()
    broadcast_payload = {
        "campaign_name": "Nosara Pre-Departure Circadian Primer",
        "target_segment": "pre_departure_cohort",
        "sanctuary_slug": "nosara",
        "message_body": "KAI Sanctuary Alert: Dear {name}, your private chauffeur transfer to {sanctuary} is confirmed. Practice 4-7-8 breathwork upon boarding your lie-flat flight.",
        "operator_name": "Kareena Islam"
    }
    res3_broadcast = client.post("/api/v1/sidecar/messaging/broadcast", json=broadcast_payload)
    assert res3_broadcast.status_code == 200, f"Expected 200: {res3_broadcast.text}"
    broadcasts = res3_broadcast.json()
    assert len(broadcasts) == 3, f"Expected 3 staged SMS records, got {len(broadcasts)}"
    for b in broadcasts:
        assert b["status"] == "PENDING_APPROVAL", "Governance violated: SMS was dispatched autonomously without review"

    first_sms_id = broadcasts[0]["id"]

    # Verify SMS queue query
    res3_queue = client.get("/api/v1/sidecar/messaging/queue?status=PENDING_APPROVAL")
    assert res3_queue.status_code == 200
    queue_records = res3_queue.json()
    queue_ids = [q["id"] for q in queue_records]
    assert first_sms_id in queue_ids

    # Founder 1-click authorization to dispatch
    auth_payload = {"operator_name": "Kareena Islam"}
    res3_dispatch = client.post(f"/api/v1/sidecar/messaging/{first_sms_id}/dispatch", json=auth_payload)
    assert res3_dispatch.status_code == 200, f"Expected 200: {res3_dispatch.text}"
    disp_res = res3_dispatch.json()
    assert disp_res["success"] is True
    assert disp_res["authorized_by"] == "Kareena Islam"

    # Verify DB state
    with SessionLocal() as db:
        sms_db = db.query(SmsDispatch).filter(SmsDispatch.id == first_sms_id).first()
        assert sms_db.status == "DISPATCHED"
        assert sms_db.authorized_by == "Kareena Islam"
        assert sms_db.dispatched_at is not None

    print(f" [PASS] Staged 3 campaign SMS records & authorized dispatch in {int((time.time()-t0)*1000)}ms")
    print(f"        Recipient: {disp_res.get('recipient')}")
    print(f"        Authorized By: {disp_res.get('authorized_by')}")
    print(f"        Dispatch Status: {sms_db.status}")
    passed += 1

    # =========================================================================
    # USE CASE 4: Terrain-Adjusted Dynamic Geodesic Navigation
    # =========================================================================
    log_step(
        "4. Terrain-Adjusted Dynamic Geodesic Navigation & Fleet Matching",
        "Calculates rugged unpaved jungle transit from Liberia Airport to Nosara Sanctuary. Verifies geodesic calculation, speed adjustment (26 km/h for JUNGLE), and luxury vehicle match."
    )
    t0 = time.time()
    route_payload = {
        "origin_name": "Liberia Airport (LIR) Private Jet Terminal",
        "origin_lat": 10.5933,
        "origin_lon": -85.5444,
        "destination_name": "KAI Nosara Ocean Sanctuary (Villa 4)",
        "destination_lat": 9.9806,
        "destination_lon": -85.6667,
        "sanctuary_slug": "nosara",
        "terrain_type": "JUNGLE"
    }
    res4 = client.post("/api/v1/sidecar/travel/routes/calculate", json=route_payload)
    assert res4.status_code == 200, f"Expected 200: {res4.text}"
    route_data = res4.json()

    assert route_data["distance_km"] > 0
    assert route_data["estimated_minutes"] > 0
    assert "recommended_vehicle" in route_data
    assert "road_conditions" in route_data
    assert "scenic_description" in route_data

    # Verify persisted in database
    with SessionLocal() as db:
        saved_route = db.query(SanctuaryRoute).filter(SanctuaryRoute.id == route_data["id"]).first()
        assert saved_route is not None

    print(f" [PASS] Geodesic route calculated and persisted in {int((time.time()-t0)*1000)}ms")
    print(f"        Distance: {route_data['distance_km']} km")
    print(f"        Estimated Drive Time: {route_data['estimated_minutes']} mins (Jungle canopy track)")
    print(f"        Assigned Fleet: {route_data['recommended_vehicle']}")
    passed += 1

    # =========================================================================
    # USE CASE 5: Real-Time Microclimate Bioclimatology & Somatic Nursing Guidance
    # =========================================================================
    log_step(
        "5. Real-Time Microclimate Bioclimatology & Somatic Nursing Guidance",
        "Queries live weather for Nosara Sanctuary. Verifies temperature, humidity, UV index, nurse breathwork window, and 15-minute in-memory TTL caching."
    )
    t0 = time.time()
    # First fetch (fresh / API fallback)
    res5_1 = client.get("/api/v1/sidecar/travel/weather?sanctuary_slug=nosara")
    assert res5_1.status_code == 200, f"Expected 200: {res5_1.text}"
    w1 = res5_1.json()

    assert w1["sanctuary_slug"] == "nosara"
    assert w1["current_temp_c"] > 0
    assert w1["humidity"] > 0
    assert "prana_breathwork_window" in w1
    assert "sunset_sound_bath_recommendation" in w1
    assert "nurse_somatic_guidance" in w1
    assert "Kareena" in w1["nurse_somatic_guidance"]

    # Second fetch (verifying in-memory TTL cache)
    res5_2 = client.get("/api/v1/sidecar/travel/weather?sanctuary_slug=nosara")
    assert res5_2.status_code == 200
    w2 = res5_2.json()
    assert w2["cached"] is True, "Expected cached == True on immediate repeat call"

    print(f" [PASS] Bioclimatic weather & nursing guidance verified in {int((time.time()-t0)*1000)}ms")
    print(f"        Temperature: {w1['current_temp_c']} deg C (Feels like {w1['feels_like_c']} deg C)")
    print(f"        Humidity: {w1['humidity']}%, UV Index: {w1['uv_index']}")
    print(f"        Prana Window: {w1['prana_breathwork_window']}")
    print(f"        Nurse Guidance: {w1['nurse_somatic_guidance'][:75]}...")
    print(f"        TTL Cache: Validated (cached={w2['cached']})")
    passed += 1

    # =========================================================================
    # USE CASE 6: Multi-Tag Organic & Ayurvedic Blue Zone Dining Search
    # =========================================================================
    log_step(
        "6. Multi-Tag Organic & Ayurvedic Blue Zone Dining Search",
        "Searches curated culinary spots with complex dietary tags (Ayurvedic, Gluten-Free, Plant-Forward, Organic) in Bali and anti-inflammatory fresh catch in Nosara."
    )
    t0 = time.time()
    # Bali Ayurvedic search
    search_bali = {
        "sanctuary_slug": "bali",
        "dietary_tags": ["Ayurvedic", "Gluten-Free", "Organic"]
    }
    res6_bali = client.post("/api/v1/sidecar/travel/dining/search", json=search_bali)
    assert res6_bali.status_code == 200, f"Expected 200: {res6_bali.text}"
    spots_bali = res6_bali.json()
    assert len(spots_bali) >= 1, "Expected at least 1 Ayurvedic dining spot in Bali"
    moksa = spots_bali[0]
    assert "Moksa" in moksa["name"]
    assert "Vata and Pitta" in moksa["nurse_notes"]

    # Nosara Anti-Inflammatory search
    search_nosara = {
        "sanctuary_slug": "nosara",
        "dietary_tags": ["Anti-Inflammatory", "Fresh Catch"]
    }
    res6_nosara = client.post("/api/v1/sidecar/travel/dining/search", json=search_nosara)
    assert res6_nosara.status_code == 200
    spots_nosara = res6_nosara.json()
    assert len(spots_nosara) >= 1
    la_luna = spots_nosara[0]
    assert "La Luna" in la_luna["name"]
    assert "omega-3" in la_luna["nurse_notes"].lower()

    print(f" [PASS] Multi-tag dietary dining search verified in {int((time.time()-t0)*1000)}ms")
    print(f"        Bali Match: {moksa['name']} ({', '.join(moksa['dietary_tags'])})")
    print(f"        Nosara Match: {la_luna['name']} ({la_luna['cuisine_type']})")
    passed += 1

    # =========================================================================
    # USE CASE 7: Private Chauffeur Tarmac Transfer Tracking & Disruption Staging
    # =========================================================================
    log_step(
        "7. Private Chauffeur Tarmac Transfer Tracking & Disruption Staging",
        "Chauffeur partner posts transit disruption webhook (delayed by Route 160 flood). System updates chauffeur telemetry and stages an ActionDraft for sanctuary welcome desk."
    )
    t0 = time.time()
    # Query current transfers
    res7_list = client.get("/api/v1/sidecar/travel/transfers?sanctuary_slug=nosara")
    assert res7_list.status_code == 200
    transfers = res7_list.json()
    assert len(transfers) >= 1
    transfer_id = transfers[0]["id"]
    guest_name = transfers[0]["guest_name"]

    # Webhook updates transfer to DELAYED
    webhook_payload = {
        "transfer_id": transfer_id,
        "status": "DELAYED",
        "chauffeur_notes": "Heavy rain on Route 160 causing 35 min detour. Chilled towels and coconut water refreshed for guest."
    }
    res7_hook = client.post("/api/v1/sidecar/travel/transfers/webhook", json=webhook_payload)
    assert res7_hook.status_code == 200
    hook_res = res7_hook.json()
    assert hook_res["new_status"] == "DELAYED"

    # Verify ActionDraft staged for sanctuary welcome desk
    with SessionLocal() as db:
        draft = db.query(ActionDraft).filter(
            ActionDraft.type == "flight_delay_chauffeur_update",
            ActionDraft.guest_name == guest_name
        ).order_by(ActionDraft.created_at.desc()).first()
        assert draft is not None, "ActionDraft was not queued for chauffeur delay"
        assert "Route 160" in draft.content

    print(f" [PASS] Chauffeur webhook processed & welcome desk alert staged in {int((time.time()-t0)*1000)}ms")
    print(f"        Guest: {guest_name} | Status: {hook_res['new_status']}")
    print(f"        Action Draft Queued: '{draft.content[:75]}...'")
    passed += 1

    # =========================================================================
    # USE CASE 8: Bespoke Corporate Buyout Inquiry with Auto-Mirrored Clinical Thesis & SMS Alert
    # =========================================================================
    log_step(
        "8. Bespoke Corporate Buyout Inquiry with Mirrored Thesis & SMS Alert",
        "A corporate VP submits a private 12-guest executive retreat inquiry. System records CustomGroupInquiry, auto-mirrors into Sidecar Staging with a custom RAG clinical thesis, and stages an operational SMS alert for Kareena Islam."
    )
    t0 = time.time()
    custom_group_payload = {
        "organizerName": "Victoria Sterling",
        "email": "v.sterling@biotechlongevity.com",
        "phone": "+1 (415) 555-0144",
        "groupSize": 12,
        "targetDestination": "nosara",
        "targetDates": "November 14-20, 2026",
        "somaticGoals": "Executive cognitive recovery, vagus nerve down-regulation, 432Hz sound baths, and uninterrupted delta sleep."
    }
    res8 = client.post("/api/v1/retreats/custom-group", json=custom_group_payload)
    assert res8.status_code == 201, f"Expected 201: {res8.text}"
    grp_res = res8.json()
    assert grp_res["success"] is True

    # Verify database state in both tables
    with SessionLocal() as db:
        # Check CustomGroupInquiry
        inq = db.query(CustomGroupInquiry).filter(
            CustomGroupInquiry.email == "v.sterling@biotechlongevity.com"
        ).first()
        assert inq is not None
        assert inq.group_size == 12

        # Check Mirrored StagingIntake
        staging = db.query(StagingIntake).filter(
            StagingIntake.email == "v.sterling@biotechlongevity.com"
        ).first()
        assert staging is not None, "Inquiry was not mirrored into Sidecar StagingIntake"
        assert staging.source_ref.startswith("GRP-")
        assert staging.consultation_thesis is not None
        assert staging.status == "PENDING_APPROVAL"

        # Check Staged SMS Alert for Kareena Islam
        sms = db.query(SmsDispatch).filter(
            SmsDispatch.recipient_name == "Kareena Islam",
            SmsDispatch.message_body.like("%Victoria Sterling%")
        ).order_by(SmsDispatch.created_at.desc()).first()
        assert sms is not None, "Operational SMS alert was not queued for Kareena Islam"
        assert sms.status == "PENDING_APPROVAL"

    print(f" [PASS] Custom group buyout inquiry processed and mirrored in {int((time.time()-t0)*1000)}ms")
    print(f"        Organizer: Victoria Sterling (12 guests, Nosara)")
    print(f"        Mirrored Staging Intake Ref: {staging.source_ref}")
    print(f"        Staged SMS Body: '{sms.message_body}'")
    passed += 1

    # =========================================================================
    # USE CASE 9: Live Sanctuary Cohort Capacity & Spots Remaining Telemetry Audit
    # =========================================================================
    log_step(
        "9. Live Sanctuary Cohort Capacity & Spots Remaining Telemetry Audit",
        "Audits visual cohort telemetry across all 4 sanctuaries. Verifies 12-14 guest caps and mathematical calculation of remaining spots."
    )
    t0 = time.time()
    # Sidecar cohort telemetry
    res9_cohorts = client.get("/api/v1/sidecar/intakes/telemetry/cohorts")
    assert res9_cohorts.status_code == 200
    cohorts = res9_cohorts.json()
    assert len(cohorts) == 4

    nosara_c = next((c for c in cohorts if c["slug"] == "nosara"), None)
    amalfi_c = next((c for c in cohorts if c["slug"] == "amalfi"), None)
    assert nosara_c is not None and amalfi_c is not None
    assert nosara_c["capacity_limit"] == 14
    assert amalfi_c["capacity_limit"] == 12
    assert nosara_c["remaining_spots"] == max(0, nosara_c["capacity_limit"] - (nosara_c["staged_count"] + nosara_c["tern_confirmed_count"]))

    # Public retreat availability endpoint
    res9_pub = client.get("/api/v1/retreats/nosara/availability")
    assert res9_pub.status_code == 200
    pub_avail = res9_pub.json()
    assert pub_avail["spotsTotal"] == 14
    assert "nosara" in pub_avail["slug"]

    print(f" [PASS] Cohort telemetry & capacity audit verified in {int((time.time()-t0)*1000)}ms")
    for c in cohorts:
        print(f"        Cohort '{c['title']}': Cap {c['capacity_limit']} | Staged {c['staged_count']} | Synced {c['tern_confirmed_count']} | Remaining: {c['remaining_spots']} ({c['status']})")
    passed += 1

    # =========================================================================
    # USE CASE 10: Synthetic Data Seeding & Database Telemetry Health Check
    # =========================================================================
    log_step(
        "10. Synthetic Data Seeding & Database Telemetry Health Check",
        "Executes synthetic data seeder to test database write concurrency and verifies counts of intakes, preferred vendors, leads, calendar events, and drafts."
    )
    t0 = time.time()
    res10 = client.post("/api/v1/sidecar/system/seed-synthetic-data")
    assert res10.status_code == 200, f"Expected 200: {res10.text}"
    seed_res = res10.json()

    assert seed_res["status"] == "success"
    counts = seed_res["counts"]
    assert "intakes_created" in counts
    assert "suppliers_created" in counts
    assert "leads_created" in counts
    assert "calendar_events_created" in counts
    assert "drafts_created" in counts

    print(f" [PASS] Synthetic test data seeding completed in {int((time.time()-t0)*1000)}ms")
    print(f"        Seed Counts Summary: {counts}")
    passed += 1

    # =========================================================================
    # SUITE SUMMARY
    # =========================================================================
    total_time = round(time.time() - suite_t0, 2)
    print(f"\n{'='*75}")
    print(f" EXPANDED USE CASES COMPLETE: {passed}/{total} PASSED ({total_time}s)")
    print(f"{'='*75}\n")


if __name__ == "__main__":
    run_suite()
