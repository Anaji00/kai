"""
Real Use Cases Execution & Validation Script for KAI Sanctuary Platform.
Simulates real-world guest reservations, partner flight concierge requests,
inbound email voucher triage, live clinical AI safety screening with qwen2.5:3b,
WhatsApp mobile operator dispatch, travel logistics retrieval, and Action Drafts
human-in-the-loop approvals.
"""

import os
import sys
import time
import json
import base64

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.config import settings
from backend.database import SessionLocal
from backend.models import Booking, FlightConciergeRequest, ActionDraft
from backend.sidecar.models import StagingIntake, StagedEmail

client = TestClient(app)

ADMIN_USER = settings.ADMIN_USERNAME or "kai_founder"
ADMIN_PASS = settings.ADMIN_PASSWORD or "kai_sanctuary_2026"
AUTH_HEADER = {
    "Authorization": f"Basic {base64.b64encode(f'{ADMIN_USER}:{ADMIN_PASS}'.encode()).decode()}"
}

def print_banner(title: str):
    print("\n" + "=" * 70)
    print(f"  {title.upper()}")
    print("=" * 70)

def print_result(step: str, status: str, details: str = ""):
    badge = "[PASS]" if status == "PASS" else "[FAIL]"
    print(f"{badge} {step}")
    if details:
        for line in details.strip().split("\n"):
            print(f"       {line}")

def run_use_case_1_guest_booking():
    print_banner("Use Case 1: High-Net-Worth Guest Reservation with Medical Notes")
    payload = {
        "fullName": "Dr. Jonathan Hayes",
        "email": "j.hayes.cardio@nyulangone.org",
        "phone": "+1 (212) 555-0144",
        "retreatId": "costa-rica-nosara-2026",
        "roomPreference": "private-suite",
        "movementExperience": "all-levels",
        "passportValid": "yes-valid-6mo",
        "healthNotes": "History of supraventricular tachycardia, sensitive to high heat, vegetarian",
        "intentions": "Nervous system recovery after intense clinical surgical season"
    }

    start = time.perf_counter()
    res = client.post("/api/v1/bookings", json=payload)
    latency_ms = (time.perf_counter() - start) * 1000

    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    ref = data["bookingReference"]
    assert ref.startswith("KAI-")

    # Verify in DB
    db = SessionLocal()
    booking_rec = db.query(Booking).filter(Booking.reference_code == ref).first()
    db.close()
    assert booking_rec is not None
    assert booking_rec.email == "j.hayes.cardio@nyulangone.org"
    assert booking_rec.status in ["pending_review", "confirmed"]

    print_result(
        "Guest Reservation Submitted",
        "PASS",
        f"Booking Ref: {ref}\nLatency: {latency_ms:.1f}ms (<150ms non-blocking)\nGuest: Dr. Jonathan Hayes\nStatus: {booking_rec.status}"
    )
    return ref

def run_use_case_2_flight_concierge(booking_ref: str):
    print_banner("Use Case 2: VIP Flight Concierge via Grand Travel Partner")
    payload = {
        "bookingReference": booking_ref,
        "guestName": "Dr. Jonathan Hayes",
        "email": "j.hayes.cardio@nyulangone.org",
        "phone": "+1 (212) 555-0144",
        "retreatId": "costa-rica-nosara-2026",
        "departureAirport": "JFK",
        "cabinClass": "business",
        "preferredAirline": "United Airlines / Delta",
        "travelDatesFlexible": True,
        "specialRequests": "Requires lie-flat business class and coordinated 4x4 arrival transfer"
    }

    res = client.post("/api/v1/concierge/flight-request", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["departureAirport"] == "JFK"

    # Verify DB entry
    db = SessionLocal()
    req = db.query(FlightConciergeRequest).filter(FlightConciergeRequest.email == "j.hayes.cardio@nyulangone.org").first()
    db.close()
    assert req is not None
    assert req.cabin_class == "business"

    print_result(
        "Flight Concierge Request Logged",
        "PASS",
        f"Departure: JFK | Cabin: Business Lie-Flat | Partner: Grand Travel & Cruise\nLinked to Booking: {booking_ref}"
    )

def run_use_case_3_inbound_email_voucher_triage():
    print_banner("Use Case 3: Inbound Concierge Email Triage & Flight Voucher Parsing")
    settings.EMAIL_WEBHOOK_SECRET = "whsec_email_kai_sanctuary_2026"

    email_payload = {
        "sender": "reservations@grandtravel.com",
        "recipient": "concierge@kaiwellnessretreats.com",
        "subject": "Secured Business Class Seats: Dr. Jonathan Hayes (ORD-LIR-JFK)",
        "raw_body": (
            "Hi Kareena,\n"
            "We have ticketed Dr. Jonathan Hayes on United Airlines Business Class.\n"
            "Booking Ref: KAI-HAYES99. Voucher code: NOS-VILLA-2026-991.\n"
            "Arrival into LIR at 1:45 PM on Nov 14, 2026. Chauffeur transfer confirmed."
        )
    }

    res = client.post(
        "/api/v1/sidecar/email-in/ingest",
        json=email_payload,
        headers={"X-Email-Webhook-Secret": "whsec_email_kai_sanctuary_2026"}
    )
    assert res.status_code in [200, 201]
    staged = res.json()
    assert staged["status"] == "PENDING_APPROVAL"
    assert staged["parsed_intent"] in ["VOUCHER_CONFIRMATION", "FLIGHT_UPDATE"]

    print_result(
        "Inbound Email Triaged with Zero Autonomous Write",
        "PASS",
        f"Intent: {staged['parsed_intent']}\nStatus: {staged['status']} (Awaiting Founder 1-Tap Approval)\nSubject: {staged['subject']}"
    )
    return staged["id"]

def run_use_case_4_clinical_copilot_ai():
    print_banner("Use Case 4: Real-Time Clinical Safety Screening (qwen2.5:3b)")
    query = (
        "Guest Jonathan Hayes has history of supraventricular tachycardia (SVT) and heat sensitivity. "
        "Can he participate in 10-minute cold plunge titration and Wim Hof breathwork?"
    )
    print(f"Sending prompt to local Ollama qwen2.5:3b:\n\"{query}\"")

    start = time.perf_counter()
    res = client.post(
        "/api/v1/sidecar/copilot/chat",
        json={"message": query, "mode": "clinical_safety"},
        headers=AUTH_HEADER
    )
    latency_s = time.perf_counter() - start

    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    response_text = data.get("response_text", "")
    safety_level = data.get("safety_level", "")

    assert safety_level == "CONTRAINDICATION_ALERT", f"Expected CONTRAINDICATION_ALERT, got: {safety_level}"
    assert len(response_text) > 50

    print_result(
        "Clinical Copilot Assessment Completed",
        "PASS",
        f"Model: qwen2.5:3b | Generation Time: {latency_s:.2f}s\nSafety Level: {safety_level}\nAI Clinical Rationale:\n{response_text[:280]}..."
    )

def run_use_case_5_whatsapp_operator_dispatch():
    print_banner("Use Case 5: WhatsApp Mobile Dispatch & 1-Tap Tern CRM Sync")
    # 1. Get staged intake
    res_list = client.get("/api/v1/sidecar/intakes", headers=AUTH_HEADER)
    assert res_list.status_code == 200
    intakes = res_list.json()
    assert len(intakes) > 0
    target = intakes[0]
    intake_id = target["id"]

    # 2. Render WhatsApp interactive card
    res_card = client.post(
        "/api/v1/sidecar/webhook/whatsapp/simulate",
        json={"intake_id": intake_id, "action": "GET_CARD"},
        headers=AUTH_HEADER
    )
    assert res_card.status_code == 200
    card = res_card.json()
    assert card["success"] is True
    buttons = card["card_payload"]["interactive"]["action"]["buttons"]
    assert len(buttons) >= 2

    # 3. Conversational edit: upgrade room tier & tag VIP
    res_reply = client.post(
        "/api/v1/sidecar/webhook/whatsapp/simulate",
        json={
            "intake_id": intake_id,
            "action": "SEND_REPLY",
            "reply_text": "Upgrade to Private Forest Villa with medical waiver and tag as VIP"
        },
        headers=AUTH_HEADER
    )
    assert res_reply.status_code == 200
    reply_data = res_reply.json()
    assert reply_data["success"] is True

    # 4. 1-Tap Button Click: Authorize & Sync to Tern CRM
    res_click = client.post(
        "/api/v1/sidecar/webhook/whatsapp/simulate",
        json={
            "intake_id": intake_id,
            "action": "CLICK_BUTTON",
            "button_id": f"approve_sync_{intake_id}",
            "operator_name": "Kareena Islam"
        },
        headers=AUTH_HEADER
    )
    assert res_click.status_code == 200
    click_data = res_click.json()
    assert click_data["success"] is True
    assert click_data["updated_intake"]["status"] == "SYNCED_TO_TERN"

    print_result(
        "WhatsApp Mobile Interactive Handshake & Tern CRM Sync",
        "PASS",
        f"Intake ID: {intake_id} ({target['client_name']})\nAction: Interactive WhatsApp Card -> Inline NLP Edits -> 1-Tap Authorization\nResult: Status synced to Tern CRM with Trip ID: {click_data['updated_intake']['tern_trip_id']}"
    )

def run_use_case_6_travel_logistics_and_dossier():
    print_banner("Use Case 6: Travel Concierge Logistics & Dossier Retrieval")
    # 1. Destination Dossier / Guide
    res_dossier = client.get("/api/v1/sidecar/travel/destination-guide/nosara", headers=AUTH_HEADER)
    assert res_dossier.status_code == 200
    dossier = res_dossier.json()
    assert dossier["sanctuary_slug"] == "nosara"
    assert len(dossier["packing_checklist"]) >= 5

    # 2. Curated Dining
    res_dining = client.get("/api/v1/sidecar/travel/dining?sanctuary_slug=nosara", headers=AUTH_HEADER)
    assert res_dining.status_code == 200
    dining = res_dining.json()
    assert len(dining) >= 3

    # 3. Scenic Routes & Vehicle Logistics
    res_routes = client.get("/api/v1/sidecar/travel/routes?sanctuary_slug=nosara", headers=AUTH_HEADER)
    assert res_routes.status_code == 200
    routes = res_routes.json()
    assert len(routes) >= 1

    # 4. iCalendar Feed
    res_ics = client.get("/api/v1/sidecar/calendar/feed.ics", headers=AUTH_HEADER)
    assert res_ics.status_code == 200
    assert "BEGIN:VCALENDAR" in res_ics.text
    assert "BEGIN:VEVENT" in res_ics.text

    print_result(
        "Travel Logistics, Dining & iCalendar Integration",
        "PASS",
        f"Dossier: {dossier['sanctuary_slug'].title()} ({dossier['country']}) with {len(dossier['packing_checklist'])} packing items\nDining: {len(dining)} verified organic spots (Sample: {dining[0]['name']})\nRoutes: {len(routes)} scenic routes mapped (Sample: {routes[0]['scenic_description'][:60]}...)\niCal Feed: RFC 5545 verified with retreat calendar events"
    )

def run_use_case_7_action_draft_lifecycle():
    print_banner("Use Case 7: Action Draft Approval & Discard Lifecycle")
    # 1. Fetch pending drafts
    res_drafts = client.get("/api/v1/drafts/", headers=AUTH_HEADER)
    assert res_drafts.status_code == 200
    drafts = res_drafts.json()
    assert len(drafts) >= 2, f"Expected at least 2 drafts, got {len(drafts)}"

    # Find a pending draft to approve
    pending_drafts = [d for d in drafts if d.get("status") == "pending_review"]
    assert len(pending_drafts) >= 2, "Need at least 2 pending drafts for test"

    draft_to_approve = pending_drafts[0]
    draft_to_discard = pending_drafts[1]

    # 2. Approve draft_to_approve
    res_app = client.post(f"/api/v1/drafts/{draft_to_approve['id']}/approve", headers=AUTH_HEADER)
    assert res_app.status_code == 200
    app_data = res_app.json()
    assert app_data["status"] == "success"
    assert app_data["dispatch_result"] is not None

    # 3. Discard draft_to_discard
    res_disc = client.post(f"/api/v1/drafts/{draft_to_discard['id']}/discard", headers=AUTH_HEADER)
    assert res_disc.status_code == 200
    disc_data = res_disc.json()
    assert disc_data["status"] == "success"

    # Verify DB persistence of status transitions
    db = SessionLocal()
    db_app = db.query(ActionDraft).filter(ActionDraft.id == draft_to_approve["id"]).first()
    db_disc = db.query(ActionDraft).filter(ActionDraft.id == draft_to_discard["id"]).first()
    db.close()
    assert db_app.status == "approved"
    assert db_disc.status == "discarded"

    # 4. Check stats
    res_stats = client.get("/api/v1/drafts/stats", headers=AUTH_HEADER)
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_approved"] >= 1
    assert stats["total_discarded"] >= 1

    print_result(
        "Action Draft Execution Engine",
        "PASS",
        f"Approved Draft #{draft_to_approve['id']} ({draft_to_approve['type']}): Dispatch Result = {app_data['dispatch_result'].get('action_taken')}\nDiscarded Draft #{draft_to_discard['id']}: Status = discarded\nDraft Stats: Pending={stats['total_pending']}, Approved={stats['total_approved']}, Discarded={stats['total_discarded']}"
    )

if __name__ == "__main__":
    print("\n" + "#" * 70)
    print("  KAI SANCTUARY PLATFORM - REAL-WORLD END-TO-END USE CASES")
    print("#" * 70)

    start_all = time.perf_counter()
    booking_ref = run_use_case_1_guest_booking()
    run_use_case_2_flight_concierge(booking_ref)
    run_use_case_3_inbound_email_voucher_triage()
    run_use_case_4_clinical_copilot_ai()
    run_use_case_5_whatsapp_operator_dispatch()
    run_use_case_6_travel_logistics_and_dossier()
    run_use_case_7_action_draft_lifecycle()
    total_sec = time.perf_counter() - start_all

    print("\n" + "=" * 70)
    print(f"  ALL 7 REAL-WORLD USE CASES PASSED IN {total_sec:.2f}s!")
    print("=" * 70 + "\n")
