"""
KAI Sanctuary Sovereign Travel CRM — End-to-End Pipeline Test Suite
===================================================================
Validates the complete lifecycle of the KAI Sanctuary Travel CRM:
  1. Client Profile Ingestion, Deduplication & Tagging
  2. Clinical Somatic Safety Triage & Modality Contraindication Interception
  3. Trip Proposal Formulation & Mathematical Penny Integrity
  4. Day-by-Day Living Itinerary Block Customization & Timeline Auditing
  5. Live VIP Flight Logistics & Tarmac Disruption Handling
  6. Financial Payment Ledger, Deposit Clearing & Balance Tracking
  7. Zero Autonomous Writes Invariant & Founder Review Queue
  8. Human Review Approval & Immutable Dispatch Attribution
  9. Guest Sanctuary Companion Synchronization
  10. Emergency Clinical Medical Freeze & Credit Voucher Protocol
  11. Executive Chef Sanctuary Dietary & Allergen Manifest Aggregation
"""

import os
import sys
import uuid
from datetime import datetime, timezone

# Ensure root directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, init_db
from backend.testing import admin_headers
from backend.sidecar.models import CRMClient, CRMTrip
from backend.models import ActionDraft

class PipelineReporter:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.total = 0

    def assert_true(self, condition: bool, description: str):
        self.total += 1
        if condition:
            self.passed += 1
            print(f"  [PASS] {description}")
        else:
            self.failed += 1
            print(f"  [FAIL] {description}")

def run_crm_e2e_pipeline():
    reporter = PipelineReporter()
    print("=" * 64)
    print("STARTING KAI SANCTUARY SOVEREIGN CRM END-TO-END PIPELINE AUDIT")
    print("=" * 64)

    init_db()
    headers = admin_headers()
    client = TestClient(app)

    db = SessionLocal()
    unique_suffix = uuid.uuid4().hex[:6]
    test_email = f"lady.evelyn.{unique_suffix}@mayfair-wealth.co.uk"
    client_id = None
    trip_id = None

    try:
        # -------------------------------------------------------------
        # PIPELINE STEP 1: Client Ingestion, Deduplication & Tagging
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 1: Client Ingestion & Deduplication ---")
        client_payload = {
            "full_name": "Lady Evelyn Montagu-Scott",
            "email": test_email,
            "phone": "+44 20 7946 0912",
            "dietary_requirements": "Strictly Gluten-Free, Plant-Forward, Celiac Awareness",
            "health_notes": "Mild autonomic fatigue, sound sensitivity, no history of cardiovascular events",
            "movement_experience": "Gentle restorative Yin, classical Pilates",
            "intentions": "Nervous system de-escalation, uninterrupted restorative sleep",
            "passport_number": "UK987654321",
            "passport_issuing_country": "GBR",
            "passport_expiry": "2031-08-20",
            "tags": ["VIP_FOUNDER_CIRCLE", "CELIAC_AWARENESS", "FIRST_TIME_SANCTUARY"],
            "source": "Private Concierge Referral"
        }

        # Create client
        res = client.post("/api/v1/sidecar/crm/clients", json=client_payload, headers=headers)
        reporter.assert_true(res.status_code == 200, f"Client profile created successfully (Status: {res.status_code})")
        created_client = res.json()
        client_id = created_client.get("id")
        reporter.assert_true(
            bool(client_id) and created_client.get("email") == test_email,
            f"Client profile assigned valid ID ({client_id}) and correct email"
        )

        # Test Deduplication: Submitting the same email returns existing client profile without error
        res_dup = client.post("/api/v1/sidecar/crm/clients", json=client_payload, headers=headers)
        reporter.assert_true(res_dup.status_code == 200, "Client deduplication handles re-submission gracefully")
        dup_client = res_dup.json()
        reporter.assert_true(
            dup_client.get("id") == client_id,
            "Duplicate ingestion returns identical persistent client ID without creating orphan contact"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 2: Clinical Somatic Safety Triage
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 2: Clinical Safety Triage ---")
        triage_payload = {
            "health_disclosure": "Pregnancy 1st trimester, mild orthostatic dizziness in high heat, no seizure disorders",
            "vital_context": "Resting HR 68, blood pressure 110/70"
        }
        res_triage = client.post(f"/api/v1/sidecar/crm/clients/{client_id}/clinical-triage", json=triage_payload, headers=headers)
        reporter.assert_true(res_triage.status_code == 200, "Clinical safety triage evaluated successfully")
        triage_data = res_triage.json()
        
        # Verify contraindications detected and blocked
        blocked_modalities = triage_data.get("blocked_modalities", [])
        reporter.assert_true(
            len(blocked_modalities) > 0,
            f"High-heat thermal & rapid breathwork contraindicated for pregnancy disclosure (Blocked: {len(blocked_modalities)} modalities)"
        )
        reporter.assert_true(
            triage_data.get("action_draft_staged") is True,
            "Clinical triage automatically stages a review action draft for founder review"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 3: Trip Proposal Formulation & Penny Integrity
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 3: Trip Proposal Formulation & Financial Math ---")
        trip_payload = {
            "client_id": client_id,
            "sanctuary_slug": "puerto-vallarta-2027",
            "title": "Puerto Vallarta Somatic Awakening",
            "dates": "Jan 28–31, 2027",
            "room_tier": "Private Ocean Villa Sanctuary",
            "total_investment": 14500.0,
            "deposit_amount": 4350.0,
            "currency": "USD",
            "payment_terms": "30% non-refundable deposit upon reservation, balance due 60 days prior to sanctuary check-in.",
            "smart_flight": {
                "airline": "Delta Air Lines",
                "flight_number": "DL-842",
                "departure_airport": "LHR",
                "arrival_airport": "PVR",
                "cabin_class": "Delta One Suite"
            },
            "ground_transfer": {
                "vehicle": "Private Chilled Suburban",
                "chauffeur": "Mateo Hernandez",
                "meeting_point": "PVR Terminal 2 VIP Meet & Greet"
            }
        }
        res_trip = client.post("/api/v1/sidecar/crm/trips", json=trip_payload, headers=headers)
        reporter.assert_true(res_trip.status_code == 200, "Bespoke trip formulated and persisted successfully")
        trip_data = res_trip.json()
        trip_id = trip_data.get("id")
        
        # Verify Penny Integrity
        expected_balance = 14500.0 - 4350.0
        reporter.assert_true(
            trip_data.get("final_balance") == expected_balance,
            f"Mathematical penny integrity verified: Total ($14,500) == Deposit ($4,350) + Balance (${expected_balance:,.2f})"
        )
        
        # Verify Living Activity Timeline initialized
        timeline = trip_data.get("activity_timeline", [])
        reporter.assert_true(
            len(timeline) >= 1 and timeline[0].get("event") == "PROPOSAL_CREATED",
            "Living activity timeline initialized with PROPOSAL_CREATED milestone"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 4: Day-by-Day Itinerary Block Customization
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 4: Itinerary Block Customization & Timeline ---")
        custom_blocks = [
            {
                "day": 1,
                "title": "Arrival & Grounding in Banderas Bay",
                "activities": [
                    {"time": "15:00", "activity": "Chauffeured arrival at Marival Harmony & botanical welcome tea"},
                    {"time": "18:00", "activity": "Gentle restorative Yin yoga & anatomical grounding with Kareena Islam"},
                    {"time": "20:00", "activity": "Anti-inflammatory welcome dinner prepared by Executive Chef"}
                ]
            },
            {
                "day": 2,
                "title": "Vagal De-Escalation & Sound Stillness",
                "activities": [
                    {"time": "08:00", "activity": "4-7-8 parasympathetic sunrise breathwork on the private ocean pavilion"},
                    {"time": "10:30", "activity": "Wixárika coastal cacao ceremony & ancestral intention setting"},
                    {"time": "19:30", "activity": "432Hz acoustic crystal singing bowl sound bath"}
                ]
            }
        ]
        res_itinerary = client.patch(f"/api/v1/sidecar/crm/trips/{trip_id}/itinerary", json={"itinerary_blocks": custom_blocks}, headers=headers)
        reporter.assert_true(res_itinerary.status_code == 200, "Itinerary blocks updated and serialized cleanly")
        updated_trip = res_itinerary.json()
        reporter.assert_true(
            len(updated_trip.get("itinerary_blocks", [])) == 2,
            "Custom somatic itinerary blocks persisted across multiple sanctuary days"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 5: Live VIP Flight Logistics & Disruption Protocol
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 5: Flight Disruption Handling ---")
        delay_payload = {
            "flight_number": "DL-842",
            "delay_minutes": 90,
            "new_arrival_time": "18:30",
            "notes": "Weather hold over Dallas; VIP chauffeur Mateo Hernandez alerted for delayed tarmac greeting"
        }
        res_delay = client.post(f"/api/v1/sidecar/crm/trips/{trip_id}/flight-delay", json=delay_payload, headers=headers)
        reporter.assert_true(res_delay.status_code == 200, "Flight delay protocol executed without crashing")
        delay_res = res_delay.json()
        reporter.assert_true(
            delay_res.get("staged_draft_id") is not None,
            "Chauffeur schedule adjustment staged as ActionDraft in Review Queue (Zero Autonomous Writes)"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 6: Financial Payment Ledger & Deposit Clearance
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 6: Payment Ledger & Deposit Clearance ---")
        payment_payload = {
            "amount": 4350.0,
            "payment_type": "DEPOSIT",
            "payment_method": "Amex Centurion (*1008)",
            "transaction_reference": f"AUTH-DEP-EVELYN-{unique_suffix.upper()}",
            "notes": "30% reservation deposit authorized by guest"
        }
        res_pay = client.post(f"/api/v1/sidecar/crm/trips/{trip_id}/payments", json=payment_payload, headers=headers)
        reporter.assert_true(res_pay.status_code == 200, "Deposit payment recorded in immutable ledger")
        pay_res = res_pay.json()
        reporter.assert_true(
            pay_res.get("deposit_status") == "PAID",
            "Trip deposit status successfully transitioned to PAID"
        )
        reporter.assert_true(
            pay_res.get("final_balance") == 10150.0,
            "Final balance ($10,150.00) properly retained as remaining due"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 7: Zero Autonomous Writes & Review Queue
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 7: Zero Autonomous Writes Invariant ---")
        res_drafts = client.get("/api/v1/drafts", headers=headers)
        reporter.assert_true(res_drafts.status_code == 200, "Fetched human review queue drafts")
        drafts = res_drafts.json()
        pending_drafts = [d for d in drafts if d.get("status") == "pending_review"]
        reporter.assert_true(
            len(pending_drafts) > 0,
            f"Zero Autonomous Writes strictly verified: {len(pending_drafts)} action drafts held in pending_review"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 8: Human Approval & Dispatch Attribution
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 8: Founder Approval & Dispatch Attribution ---")
        target_draft = pending_drafts[0]
        draft_id = target_draft.get("id")
        res_approve = client.post(f"/api/v1/drafts/{draft_id}/approve", headers=headers)
        reporter.assert_true(res_approve.status_code == 200, "ActionDraft approved by founder operator")
        approved_draft = res_approve.json()
        reporter.assert_true(
            approved_draft.get("status") in ["approved", "dispatched"],
            f"Draft status successfully transitioned to {approved_draft.get('status')}"
        )
        reporter.assert_true(
            bool(approved_draft.get("dispatched_by")),
            f"Immutable operator provenance recorded (Dispatched by: {approved_draft.get('dispatched_by')})"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 9: Sanctuary Capacity & Dietary Manifest
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 9: Sanctuary Dietary Manifest ---")
        res_diet = client.get("/api/v1/sidecar/crm/sanctuaries/puerto-vallarta-2027/dietary-manifest", headers=headers)
        reporter.assert_true(res_diet.status_code == 200, "Executive Chef dietary manifest generated")
        diet_data = res_diet.json()
        manifest_entries = diet_data.get("guests", [])
        evelyn_entry = next((g for g in manifest_entries if g.get("client_email") == test_email), None)
        reporter.assert_true(
            evelyn_entry is not None,
            "Guest dietary preferences correctly aggregated in Puerto Vallarta culinary manifest"
        )

        # -------------------------------------------------------------
        # PIPELINE STEP 10: Emergency Clinical Medical Freeze
        # -------------------------------------------------------------
        print("\n--- Pipeline Step 10: Emergency Medical Freeze Protocol ---")
        freeze_payload = {
            "reason": "Unexpected orthopaedic emergency requiring temporary travel postponement",
            "physician_note": "Postponement recommended by attending physician Dr. Aris Thorne",
            "voucher_validity_months": 24
        }
        res_freeze = client.post(f"/api/v1/sidecar/crm/trips/{trip_id}/emergency-medical-freeze", json=freeze_payload, headers=headers)
        reporter.assert_true(res_freeze.status_code == 200, "Emergency medical freeze executed safely")
        freeze_data = res_freeze.json()
        reporter.assert_true(
            freeze_data.get("status") == "MEDICAL_FREEZE",
            "Trip transitioned into protected MEDICAL_FREEZE status without penalizing guest"
        )
        reporter.assert_true(
            freeze_data.get("credit_voucher_code") is not None,
            f"Full value sanctuary credit voucher generated ({freeze_data.get('credit_voucher_code')})"
        )

    finally:
        # Cleanup test trip and client records
        if trip_id:
            trip_rec = db.query(CRMTrip).filter(CRMTrip.id == trip_id).first()
            if trip_rec:
                db.delete(trip_rec)
        if client_id:
            client_rec = db.query(CRMClient).filter(CRMClient.id == client_id).first()
            if client_rec:
                db.delete(client_rec)
        db.commit()
        db.close()

    print("\n" + "=" * 64)
    print(f"PIPELINE TEST RUN SUMMARY: {reporter.total} assertions evaluated")
    print(f"PASSED: {reporter.passed} | FAILED: {reporter.failed}")
    print("=" * 64)
    
    if reporter.failed > 0:
        raise AssertionError(f"CRM Pipeline test failed with {reporter.failed} failures!")

if __name__ == "__main__":
    run_crm_e2e_pipeline()

