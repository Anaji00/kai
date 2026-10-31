import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from starlette.testclient import TestClient
from backend.main import app
from backend.sidecar.routers.webhooks import verify_admin

import pytest

@pytest.fixture(autouse=True, scope="module")
def override_admin_auth():
    app.dependency_overrides[verify_admin] = lambda: "admin"
    yield
    app.dependency_overrides.pop(verify_admin, None)

client = TestClient(app)


def test_seed_and_list_intakes():
    # 1. Seed demo intakes
    res = client.post("/api/v1/sidecar/intakes/seed-demo")
    assert res.status_code == 200
    demo_records = res.json()
    assert len(demo_records) >= 3
    print(f"[PASS] Seeded {len(demo_records)} demo intakes into staging queue")

    # 2. List staged intakes
    res_list = client.get("/api/v1/sidecar/intakes")
    assert res_list.status_code == 200
    intakes = res_list.json()
    assert len(intakes) >= 3
    print(f"[PASS] Successfully verified staged intakes ({len(intakes)} total in database)")


def test_pre_call_thesis_and_tern_sync():
    # Fetch or reset a pending intake
    res_list = client.get("/api/v1/sidecar/intakes?status=PENDING_APPROVAL")
    assert res_list.status_code == 200
    pending = res_list.json()
    if len(pending) == 0:
        # Reset the first intake to PENDING_APPROVAL
        all_intakes = client.get("/api/v1/sidecar/intakes").json()
        target = all_intakes[0]
        client.patch(f"/api/v1/sidecar/intakes/{target['id']}", json={"status": "PENDING_APPROVAL"})
        target["status"] = "PENDING_APPROVAL"
    else:
        target = pending[0]
    intake_id = target["id"]

    # 1. Generate / verify pre-call thesis
    res_thesis = client.post(f"/api/v1/sidecar/intakes/{intake_id}/thesis", json={"regenerate": True})
    assert res_thesis.status_code == 200
    data = res_thesis.json()
    thesis = data["consultation_thesis"]
    assert thesis is not None
    assert "clinical_flags" in thesis
    assert len(thesis["consultation_talk_tracks"]) >= 2
    assert "tern_itinerary_draft" in thesis
    print(f"[PASS] Pre-Call Thesis RAG successfully generated (Flags: {thesis['clinical_flags']})")

    # 2. 1-Click Authorized Tern Sync
    res_sync = client.post(
        f"/api/v1/sidecar/intakes/{intake_id}/tern-sync",
        json={"operator_name": "Kareena Islam", "override_room_tier": "Private Villa Sanctuary"}
    )
    assert res_sync.status_code == 200
    sync_data = res_sync.json()
    assert sync_data["success"] is True
    assert sync_data["tern_contact_id"].startswith("tern_cnt_")
    assert sync_data["tern_trip_id"].startswith("tern_trp_")
    assert "BLUE_ZONE_DIET" in sync_data["applied_tags"]
    assert sync_data["status"] == "SYNCED_TO_TERN"
    print(f"[PASS] 1-Click Tern Sync authorized (Trip ID: {sync_data['tern_trip_id']})")


def test_cohort_telemetry():
    res = client.get("/api/v1/sidecar/intakes/telemetry/cohorts")
    assert res.status_code == 200
    cohorts = res.json()
    assert len(cohorts) == 4
    for c in cohorts:
        assert c["capacity_limit"] in [12, 14]
        assert c["remaining_spots"] >= 0
    print("[PASS] Cohort capacity telemetry verified across all 4 sanctuaries")


def test_b2b_lead_generation():
    # 1. Discover wellness feeder leads
    res = client.post(
        "/api/v1/sidecar/leads/discover",
        json={"city": "Houston", "category": "reformer_pilates", "limit": 3}
    )
    assert res.status_code == 200
    leads = res.json()
    assert leads[0]["status"] in ["PENDING_APPROVAL", "APPROVED", "OUTREACH_STAGED"]
    # The lead may already exist from seeded data (different thesis wording), so only require a thesis.
    assert leads[0]["outreach_thesis"].strip()
    lead_id = leads[0]["id"]
    print(f"[PASS] Lead discovery worker staged {len(leads)} B2B leads (Status: {leads[0]['status']})")

    # 2. 1-Click Approve lead
    res_app = client.post(
        f"/api/v1/sidecar/leads/{lead_id}/approve",
        json={"operator_name": "Kareena Islam"}
    )
    assert res_app.status_code == 200
    app_data = res_app.json()
    assert app_data["status"] == "APPROVED"
    assert app_data["reviewed_by"] == "Kareena Islam"
    print(f"[PASS] B2B lead '{app_data['business_name']}' approved by operator")


def test_sms_alerts_and_campaign_dispatch():
    # 1. Stage an operational alert
    res_alert = client.post(
        "/api/v1/sidecar/messaging/stage-alert",
        json={
            "recipient_phone": "+17135550199",
            "recipient_name": "Kareena Islam",
            "message_body": "Operator Test Alert: High burnout corporate group pending review.",
            "dispatch_type": "OPERATIONAL_ALERT"
        }
    )
    assert res_alert.status_code == 200
    sms = res_alert.json()
    assert sms["status"] == "PENDING_APPROVAL"
    sms_id = sms["id"]
    print("[PASS] Operational SMS alert staged with PENDING_APPROVAL")

    # 2. Stage a broadcast campaign
    res_bc = client.post(
        "/api/v1/sidecar/messaging/broadcast",
        json={
            "campaign_name": "Alumni Circle Drop",
            "target_segment": "alumni_circle",
            "sanctuary_slug": "nosara",
            "message_body": "KAI Private Circle: {name}, exclusive access opened for {sanctuary}.",
            "operator_name": "Kareena Islam"
        }
    )
    assert res_bc.status_code == 200
    broadcasts = res_bc.json()
    assert len(broadcasts) >= 2
    print(f"[PASS] Staged {len(broadcasts)} campaign broadcasts with PENDING_APPROVAL")

    # 3. 1-Click Dispatch SMS
    res_dispatch = client.post(
        f"/api/v1/sidecar/messaging/{sms_id}/dispatch",
        json={"operator_name": "Kareena Islam"}
    )
    assert res_dispatch.status_code == 200
    assert res_dispatch.json()["success"] is True
    print("[PASS] Explicit 1-click SMS dispatch executed")


def test_reconciliation_voucher_and_manifest_diff():
    # 1. Voucher Parsing
    voucher_text = """
    CONFIRMATION: NOS-VILLA-2026-884
    Dates: Nov 14, 2026 to Nov 20, 2026
    Accommodations: VILLA-01 and VILLA-02
    Contract Total: $12,400.00
    Grand Travel Client: Eleanor Vance
    """
    res_vouch = client.post(
        "/api/v1/sidecar/reconciliation/parse-voucher",
        json={"document_text": voucher_text, "sanctuary_slug": "nosara"}
    )
    assert res_vouch.status_code == 200
    vouch_data = res_vouch.json()["parsed_data"]
    assert vouch_data["voucher_ref"] == "NOS-VILLA-2026-884"
    assert vouch_data["total_amount"] == 12400.0
    print("[PASS] Voucher parser extracted confirmation code, rates, and dates")

    # 2. Manifest Diff & Cohort Cap Audit (Flagging Over-capacity >14)
    simulated_ground_manifest = [
        {"name": f"Ground Guest {i}", "room": f"VILLA-{i:02d}"}
        for i in range(1, 16)  # 15 guests exceeds cap of 14!
    ]
    res_diff = client.post(
        "/api/v1/sidecar/reconciliation/manifest-diff",
        json={
            "sanctuary_slug": "nosara",
            "external_guest_records": simulated_ground_manifest,
            "diff_document_name": "nosara_ground_transfer_nov.csv"
        }
    )
    assert res_diff.status_code == 200
    diff_data = res_diff.json()
    assert diff_data["over_capacity"] == "YES"
    assert diff_data["external_count"] == 15
    assert any(d["type"] == "CAPACITY_VIOLATION" for d in diff_data["discrepancies"])
    print("[PASS] Manifest diff engine accurately flagged over-capacity condition (>14)")


def test_inbound_email_triage():
    email_payload = {
        "sender": "vip.concierge@grandtravel.com",
        "recipient": "concierge@kaiwellnessretreats.com",
        "subject": "Flight Confirmation & VIP Transfer: Eleanor Vance (NOS-VILLA-2026-884)",
        "raw_body": (
            "Hello Kareena,\n"
            "We have secured Eleanor Vance's business class flight ORD -> LIR for Nov 14, 2026.\n"
            "Booking Ref: KAI-VANCE88. Confirmation voucher: NOS-VILLA-2026-884.\n"
            "Lie-flat requested with private arrival transfer."
        )
    }
    res = client.post("/api/v1/sidecar/email-in/ingest", json=email_payload)
    assert res.status_code in [200, 201]
    staged_email = res.json()
    assert staged_email["status"] == "PENDING_APPROVAL"
    assert staged_email["parsed_intent"] in ["VOUCHER_CONFIRMATION", "FLIGHT_UPDATE"]
    assert "KAI-VANCE88" in str(staged_email["parsed_entities"])
    print(f"[PASS] Inbound concierge email triaged and staged with intent: {staged_email['parsed_intent']}")


def test_whatsapp_mobile_dispatch():
    # 1. Fetch a staged intake
    res_list = client.get("/api/v1/sidecar/intakes")
    assert res_list.status_code == 200
    intakes = res_list.json()
    assert len(intakes) > 0
    target_intake = intakes[0]
    intake_id = target_intake["id"]

    # 2. Simulate GET_CARD
    res_card = client.post(
        "/api/v1/sidecar/webhook/whatsapp/simulate",
        json={"intake_id": intake_id, "action": "GET_CARD"}
    )
    assert res_card.status_code == 200
    card_data = res_card.json()
    assert card_data["success"] is True
    body_text = card_data["card_payload"]["interactive"]["body"]["text"]
    assert "KAI CONCIERGE DISPATCH" in body_text
    assert target_intake["client_name"] in body_text
    buttons = card_data["card_payload"]["interactive"]["action"]["buttons"]
    assert len(buttons) == 3
    assert buttons[0]["reply"]["id"] == f"approve_sync_{intake_id}"
    print(f"[PASS] Interactive WhatsApp card rendered for {target_intake['client_name']}")

    # 3. Simulate SEND_REPLY (Inline NLP edits)
    res_reply = client.post(
        "/api/v1/sidecar/webhook/whatsapp/simulate",
        json={
            "intake_id": intake_id,
            "action": "SEND_REPLY",
            "reply_text": "Change room tier to Shared Ocean Pavilion, tag as VIP"
        }
    )
    assert res_reply.status_code == 200
    reply_data = res_reply.json()
    assert reply_data["success"] is True
    assert reply_data["updated_intake"]["room_tier"] == "Shared Ocean Pavilion"
    assert reply_data["parsed"]["updates"]["vip_status"] is True
    print("[PASS] Natural language inline reply parsed: updated room tier to Shared Ocean Pavilion & tagged VIP")

    # 4. Simulate CLICK_BUTTON (1-Tap Approve & Sync)
    res_click = client.post(
        "/api/v1/sidecar/webhook/whatsapp/simulate",
        json={
            "intake_id": intake_id,
            "action": "CLICK_BUTTON",
            "button_id": f"approve_sync_{intake_id}",
            "operator_name": "Kareena Islam"
        }
    )
    assert res_click.status_code == 200
    click_data = res_click.json()
    assert click_data["success"] is True
    assert click_data["updated_intake"]["status"] == "SYNCED_TO_TERN"
    assert "AUTHORIZED & SYNCED TO TERN CRM" in click_data["action_result"]["reply_text"]
    assert "100% Native to Tern" in click_data["action_result"]["reply_text"]
    print(f"[PASS] 1-Tap WhatsApp button approval synced intake to Tern CRM (Trip ID: {click_data['updated_intake']['tern_trip_id']})")

    # 5. Meta Webhook challenge verification test
    res_challenge = client.get(
        "/api/v1/sidecar/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=kai_whatsapp_verify_token_2026&hub.challenge=99887766"
    )
    assert res_challenge.status_code == 200
    assert res_challenge.text == "99887766"
    print("[PASS] Meta WhatsApp Cloud Webhook verification challenge succeeded")


def test_calendar_events_and_ical_feed():
    # 1. Fetch calendar events
    res = client.get("/api/v1/sidecar/calendar/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 4
    categories = {e["category"] for e in events}
    assert "COHORT" in categories
    assert any("Nosara" in e["title"] for e in events)
    print(f"[PASS] Calendar events retrieved: {len(events)} events spanning {categories}")

    # 2. Add custom consultation event
    new_event = {
        "title": "20-Min Alignment Consultation: Test Guest",
        "category": "CONSULTATION",
        "start_time": "2027-01-15T15:00:00Z",
        "end_time": "2027-01-15T15:20:00Z",
        "sanctuary_slug": "nosara",
        "guest_name": "Test Guest",
        "location": "Phone / Meet",
        "notes": "Discuss private villa and cold plunge titration."
    }
    res_create = client.post("/api/v1/sidecar/calendar/events", json=new_event)
    assert res_create.status_code == 200
    created = res_create.json()
    assert created["title"] == new_event["title"]
    print(f"[PASS] Custom calendar consultation event created (ID: {created['id']})")

    # 3. Fetch iCal feed (.ics)
    res_ics = client.get("/api/v1/sidecar/calendar/feed.ics")
    assert res_ics.status_code == 200
    assert "BEGIN:VCALENDAR" in res_ics.text
    assert "END:VCALENDAR" in res_ics.text
    assert "BEGIN:VEVENT" in res_ics.text
    assert "text/calendar" in res_ics.headers.get("content-type", "")
    print("[PASS] RFC 5545 iCalendar feed verified")


def test_clinical_copilot_modes():
    # 1. Clinical safety screening with contraindication alert
    res_screen = client.post(
        "/api/v1/sidecar/copilot/chat",
        json={
            "message": "Guest has history of epilepsy and Raynaud's syndrome. Can they do tummo breathwork and cold plunge?",
            "mode": "clinical_safety"
        }
    )
    assert res_screen.status_code == 200
    screen_data = res_screen.json()
    assert screen_data["safety_level"] == "CONTRAINDICATION_ALERT"
    assert "CONTRAINDICATION_ALERT" in screen_data["response_text"]
    assert len(screen_data["tool_calls"]) > 0
    print("[PASS] Copilot clinical screening detected contraindication alert for epilepsy/Raynaud's")

    # 2. Consultation prep & email drafter
    res_draft = client.post(
        "/api/v1/sidecar/copilot/chat",
        json={
            "message": "Draft consultation follow-up email for Sarah Jenkins addressing nervous system reset",
            "mode": "consult_prep"
        }
    )
    assert res_draft.status_code == 200
    draft_data = res_draft.json()
    assert "Sarah Jenkins" in draft_data["response_text"]
    assert "Grand Travel & Cruise" in draft_data["response_text"]
    assert "Tern" in draft_data["response_text"]
    print("[PASS] Copilot consultation email drafted for Sarah Jenkins")

    # 3. Travel concierge & hotel search
    res_hotel = client.post(
        "/api/v1/sidecar/copilot/chat",
        json={
            "message": "What luxury hotels are near Costa Rica SJO airport for pre-retreat stay?",
            "mode": "travel_concierge"
        }
    )
    assert res_hotel.status_code == 200
    hotel_data = res_hotel.json()
    assert "Finca Rosa Blanca" in hotel_data["response_text"] or "Andaz" in hotel_data["response_text"]
    print("[PASS] Copilot travel concierge retrieved luxury gateway hotels")

    # 4. Layman tool guide
    res_guide = client.get("/api/v1/sidecar/copilot/tool-guide")
    assert res_guide.status_code == 200
    guide_data = res_guide.json()
    assert "founder_studio" in guide_data["guide"]
    assert guide_data["total_tools"] >= 10
    print(f"[PASS] Layman tool guide retrieved for all {guide_data['total_tools']} tools")


def test_webhook_integrations_and_telemetry():
    # 1. Fetch provider status
    res_providers = client.get("/api/v1/sidecar/webhooks/providers")
    assert res_providers.status_code == 200
    prov_data = res_providers.json()
    assert prov_data["total_active"] == 5
    provider_ids = {p["id"] for p in prov_data["providers"]}
    assert "tern_crm" in provider_ids
    assert "expedia_pms" in provider_ids
    assert "cirium_flights" in provider_ids
    print(f"[PASS] 5 external integration providers verified: {provider_ids}")

    # 2. Simulate Tern webhook
    res_sim_tern = client.post(
        "/api/v1/sidecar/webhooks/simulate",
        json={
            "provider": "tern_crm",
            "event_type": "payment_auth.completed",
            "payload": {"client": "Eleanor Vance", "status": "AUTHORIZED", "amount": 7200.0}
        }
    )
    assert res_sim_tern.status_code == 200
    sim_tern_data = res_sim_tern.json()
    assert sim_tern_data["success"] is True
    print(f"[PASS] Simulated Tern payment authorization webhook (Log: {sim_tern_data['log_id']})")

    # 3. Simulate Expedia hotel webhook
    res_sim_hotel = client.post(
        "/api/v1/sidecar/webhooks/simulate",
        json={
            "provider": "expedia_pms",
            "event_type": "booking.confirmed",
            "payload": {"hotel": "Andaz Peninsula Papagayo", "nights": 2}
        }
    )
    assert res_sim_hotel.status_code == 200
    sim_hotel_data = res_sim_hotel.json()
    assert sim_hotel_data["success"] is True
    print(f"[PASS] Simulated Expedia hotel booking webhook (Log: {sim_hotel_data['log_id']})")

    # 4. List webhook event logs
    res_events = client.get("/api/v1/sidecar/webhooks/events")
    assert res_events.status_code == 200
    event_logs = res_events.json()
    assert len(event_logs) >= 2
    print(f"[PASS] Webhook telemetry event log verified ({len(event_logs)} events)")


def test_scenic_routes_and_geodesic_calculation():
    # 1. List default routes
    res = client.get("/api/v1/sidecar/travel/routes?sanctuary_slug=nosara")
    assert res.status_code == 200
    routes = res.json()
    assert len(routes) >= 1
    assert "Liberia" in routes[0]["origin_name"]
    assert routes[0]["estimated_minutes"] > 0
    print(f"[PASS] Verified default scenic routes ({len(routes)} for Nosara)")

    # 2. Dynamic route calculation
    calc_req = {
        "origin_name": "San Jose Juan Santamaria Airport (SJO)",
        "origin_lat": 9.9981,
        "origin_lon": -84.2041,
        "destination_name": "KAI Nosara Ocean Sanctuary",
        "destination_lat": 9.9806,
        "destination_lon": -85.6667,
        "sanctuary_slug": "nosara",
        "terrain_type": "COASTAL"
    }
    res_calc = client.post("/api/v1/sidecar/travel/routes/calculate", json=calc_req)
    assert res_calc.status_code == 200
    route = res_calc.json()
    assert route["distance_km"] > 100
    assert route["estimated_minutes"] > 60
    assert "Suburban" in route["recommended_vehicle"] or "Charter" in route["recommended_vehicle"]
    print(f"[PASS] Geodesic route calculated ({route['distance_km']} km, ~{route['estimated_minutes']} mins)")

    # 3. Points of Interest
    res_pois = client.get("/api/v1/sidecar/travel/points-of-interest?sanctuary_slug=nosara")
    assert res_pois.status_code == 200
    pois = res_pois.json()
    assert len(pois) >= 2
    assert any("vagus" in p["vagus_nerve_benefit"].lower() for p in pois)
    print(f"[PASS] Somatic points of interest verified ({len(pois)} POIs with vagal benefits)")


def test_microclimate_weather_and_nurse_guidance():
    # 1. Live/baseline microclimate weather
    res = client.get("/api/v1/sidecar/travel/weather?sanctuary_slug=nosara")
    assert res.status_code == 200
    weather = res.json()
    assert weather["sanctuary_slug"] == "nosara"
    assert "current_temp_c" in weather
    assert "prana_breathwork_window" in weather
    assert "sunset_sound_bath_recommendation" in weather
    assert "nurse_somatic_guidance" in weather
    print(f"[PASS] Microclimate weather verified: {weather['current_temp_c']}°C, UV {weather['uv_index']}")

    # 2. Verify 15-minute in-memory cache hit
    res_cached = client.get("/api/v1/sidecar/travel/weather?sanctuary_slug=nosara")
    assert res_cached.status_code == 200
    cached_weather = res_cached.json()
    assert cached_weather["cached"] is True
    print("[PASS] Microclimate weather 15-minute in-memory TTL cache hit verified")


def test_curated_dining_and_dietary_filtering():
    # 1. List dining spots
    res = client.get("/api/v1/sidecar/travel/dining?sanctuary_slug=nosara")
    assert res.status_code == 200
    spots = res.json()
    assert len(spots) >= 2
    assert "Gluten-Free" in spots[0]["dietary_tags"]
    print(f"[PASS] Curated farm-to-table dining verified ({len(spots)} spots in Nosara)")

    # 2. Dietary filter (Gluten-Free)
    res_filtered = client.get("/api/v1/sidecar/travel/dining?sanctuary_slug=nosara&dietary_tag=Gluten-Free")
    assert res_filtered.status_code == 200
    filtered_spots = res_filtered.json()
    assert len(filtered_spots) >= 1
    print(f"[PASS] Dietary tag filter verified ({len(filtered_spots)} Gluten-Free spots)")

    # 3. Add newly discovered organic spot
    new_spot_req = {
        "sanctuary_slug": "nosara",
        "name": "Guiones Organic Beach Hearth",
        "cuisine_type": "Wild Greens & Sprouted Botanicals",
        "dietary_tags": ["Gluten-Free", "Plant-Forward", "Organic"],
        "distance_from_villa_km": 1.2,
        "description": "Candlelit bamboo shala serving cold-pressed juices and wood-roasted local roots.",
        "nurse_notes": "Abundant prebiotic fibers support microbiome balance during circadian reset.",
        "price_tier": "$$",
        "reservation_required": "NO"
    }
    res_add = client.post("/api/v1/sidecar/travel/dining", json=new_spot_req)
    assert res_add.status_code == 200
    added = res_add.json()
    assert added["name"] == "Guiones Organic Beach Hearth"
    print(f"[PASS] New curated dining spot registered ({added['name']})")


def test_verified_reviews_and_sentiment_scoring():
    # 1. List reviews
    res = client.get("/api/v1/sidecar/travel/reviews?sanctuary_slug=nosara")
    assert res.status_code == 200
    revs = res.json()
    assert len(revs) >= 2
    assert revs[0]["deep_sleep_score"] >= 90.0
    print(f"[PASS] Verified reviews verified (Sleep Score: {revs[0]['deep_sleep_score']})")

    # 2. Submit post-retreat survey webhook
    survey_payload = {
        "provider": "RETREAT_CHECKOUT_SURVEY",
        "sanctuary_slug": "nosara",
        "guest_name": "Julian Thorne",
        "stay_dates": "February 2026 Cohort",
        "rating": 5.0,
        "comment": "The absolute quietness at night gave me the deepest unbroken sleep I have experienced in years. Nurse Kareena was so attentive and kind."
    }
    res_hook = client.post("/api/v1/sidecar/travel/reviews/webhook", json=survey_payload)
    assert res_hook.status_code == 200
    webhook_rev = res_hook.json()
    assert webhook_rev["deep_sleep_score"] >= 95.0
    assert webhook_rev["quietude_score"] >= 95.0
    assert webhook_rev["sentiment_label"] == "DEEPLY_RESTORATIVE"
    print(f"[PASS] Inbound review webhook scored: Sleep {webhook_rev['deep_sleep_score']}, Quiet {webhook_rev['quietude_score']}, Sentiment: {webhook_rev['sentiment_label']}")


def test_document_upload_and_copilot_travel_tools():
    # 1. Test multipart document upload with clinical notes
    sample_doc_content = b"""
    KAI SANCTUARY GUEST HEALTH INTAKE
    Guest Name: Sarah Jenkins
    Arrival Flight: AA 1244 arriving Liberia Airport (LIR)
    Health Considerations: Mild pregnancy trimester 1, slight hypertension noted.
    Dietary Preferences: 100% Gluten-Free and Dairy-Free.
    """
    files = {"file": ("sarah_intake.txt", sample_doc_content, "text/plain")}
    data = {"guest_name": "Sarah Jenkins"}
    res_upload = client.post("/api/v1/sidecar/copilot/upload-document", files=files, data=data)
    assert res_upload.status_code == 200
    doc_res = res_upload.json()
    assert doc_res["safety_clearance_status"] == "ATTENTION_NEEDED"
    assert len(doc_res["clinical_notes_found"]) >= 1
    assert any("flight" in d.lower() for d in doc_res["travel_details_found"])
    print(f"[PASS] Multipart file parsed securely (Status: {doc_res['safety_clearance_status']}, Flags: {len(doc_res['clinical_notes_found'])})")

    # 2. Test Copilot Chat querying Curated Dining
    res_chat_dining = client.post("/api/v1/sidecar/copilot/chat", json={
        "message": "What organic gluten-free restaurants do you recommend near the Nosara sanctuary?",
        "mode": "travel_concierge"
    })
    assert res_chat_dining.status_code == 200
    dining_chat = res_chat_dining.json()
    assert any(tc.get("tool") == "search_curated_dining" for tc in dining_chat["tool_calls"])
    assert "Nourishing Dining" in dining_chat["response_text"]
    print("[PASS] Copilot dynamically searched curated dining in plain language")

    # 3. Test Copilot Chat querying Microclimate Weather
    res_chat_weather = client.post("/api/v1/sidecar/copilot/chat", json={
        "message": "What is the weather and optimal breathwork window in Nosara today?",
        "mode": "travel_concierge"
    })
    assert res_chat_weather.status_code == 200
    weather_chat = res_chat_weather.json()
    assert any(tc.get("tool") == "fetch_sanctuary_weather" for tc in weather_chat["tool_calls"])
    assert "Breathwork Window" in weather_chat["response_text"]
    print("[PASS] Copilot dynamically fetched weather with somatic breathwork windows")


if __name__ == "__main__":
    print("Running KAI Tern CRM Sidecar automated test suite...")
    test_seed_and_list_intakes()
    test_pre_call_thesis_and_tern_sync()
    test_cohort_telemetry()
    test_b2b_lead_generation()
    test_sms_alerts_and_campaign_dispatch()
    test_reconciliation_voucher_and_manifest_diff()
    test_inbound_email_triage()
    test_whatsapp_mobile_dispatch()
    test_calendar_events_and_ical_feed()
    test_clinical_copilot_modes()
    test_webhook_integrations_and_telemetry()
    test_scenic_routes_and_geodesic_calculation()
    test_microclimate_weather_and_nurse_guidance()
    test_curated_dining_and_dietary_filtering()
    test_verified_reviews_and_sentiment_scoring()
    test_document_upload_and_copilot_travel_tools()
    print("\nALL 16 TERN CRM & TRAVEL LOGISTICS SIDECAR TESTS PASSED CLEANLY!")


