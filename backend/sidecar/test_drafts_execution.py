import os
import sys
import unittest
import base64

# Add root directory to python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal, init_db
from backend.models import ActionDraft, Booking, FlightConciergeRequest
from backend.sidecar.models import (
    StagingIntake,
    SmsDispatch,
    StagedVoucherDiff,
    UploadedDocumentRecord,
    DestinationReview,
    GroundTransferRecord,
)
from backend.sidecar.services.synthetic_data_seeder import seed_all_synthetic_data

class TestActionDraftExecution(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.unauth_client = TestClient(app)
        auth_header = "Basic " + base64.b64encode(b"admin:kai_admin_2026").decode()
        cls.client = TestClient(app, headers={"Authorization": auth_header})
        with SessionLocal() as db:
            seed_all_synthetic_data(db)

    def test_01_get_drafts_and_stats(self):
        # Verify unauthenticated request is blocked with 401
        unauth_res = self.unauth_client.get("/api/v1/drafts/stats")
        self.assertEqual(unauth_res.status_code, 401)

        # 1. Fetch stats with admin credentials
        res = self.client.get("/api/v1/drafts/stats")
        self.assertEqual(res.status_code, 200)
        stats = res.json()
        self.assertIn("total_pending", stats)
        self.assertGreater(stats["total_pending"], 0)
        self.assertIn("by_category", stats)
        print("Draft stats:", stats)

        # 2. Fetch pending drafts
        res = self.client.get("/api/v1/drafts/")
        self.assertEqual(res.status_code, 200)
        drafts = res.json()
        self.assertGreater(len(drafts), 0)
        first = drafts[0]
        self.assertIn("channel_target", first)
        self.assertIn("channel_badge", first)
        print(f"Fetched {len(drafts)} drafts. Sample: {first['type']} -> {first['channel_target']}")

    def test_02_approve_flight_draft(self):
        with SessionLocal() as db:
            draft = ActionDraft(
                type="flight_delay_chauffeur_update",
                guest_name="Elena Rostova",
                content="Cirium Alert: AF 066 delayed 45m. Reschedule tarmac suburban meet.",
                status="pending_review"
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            draft_id = draft.id

        res = self.client.post(f"/api/v1/drafts/{draft_id}/approve", json={"operator_name": "Kareena Islam"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "approved")
        self.assertEqual(data["dispatch_result"]["channel"], "GRAND_TRAVEL_FLIGHT_DESK_AND_CHAUFFEUR")
        print("Flight dispatch result:", data["dispatch_result"])

    def test_03_approve_intake_crm_commit(self):
        # Test Sanctuary CRM commit with clean standard tags (no clinical tags)
        with SessionLocal() as db:
            draft = ActionDraft(
                type="booking_hold",
                guest_name="Eleanor Vance",
                content="Booking Hold for Ocean Villa - 6 nights. Authorize CRM Commit.",
                status="pending_review"
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            draft_id = draft.id

        res = self.client.post(f"/api/v1/drafts/{draft_id}/approve", json={"operator_name": "Kareena Islam"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["dispatch_result"]["channel"], "SANCTUARY_CRM")
        crm_details = data["dispatch_result"]["details"]
        applied_tags = crm_details.get("applied_tags", [])
        self.assertIn("KAI_GUEST", applied_tags)
        self.assertIn("COHORT_2026_2027", applied_tags)
        # Verify no clinical diagnostic tags were forced
        for tag in applied_tags:
            self.assertNotIn("DYSREGULATION", tag)
            self.assertNotIn("HYPERAROUSAL", tag)
        print("CRM commit applied tags:", applied_tags)

    def test_04_approve_manifest_diff_resolution(self):
        with SessionLocal() as db:
            # Stage a voucher diff
            diff = StagedVoucherDiff(
                sanctuary_slug="nosara",
                document_name="test_manifest.csv",
                external_count=15,
                crm_cohort_count=14,
                cohort_cap=14,
                over_capacity="YES",
                discrepancies=[{"guest": "Test Guest", "reason": "Over cap"}],
                status="PENDING_APPROVAL"
            )
            db.add(diff)
            draft = ActionDraft(
                type="manifest_discrepancy",
                guest_name="Nosara Manifest Audit",
                content="Resolve over-capacity condition.",
                status="pending_review"
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            draft_id = draft.id

        res = self.client.post(f"/api/v1/drafts/{draft_id}/approve", json={"operator_name": "Kareena Islam"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["dispatch_result"]["channel"], "MANIFEST_RECONCILIATION_ENGINE")
        self.assertEqual(data["dispatch_result"]["details"]["status"], "RESOLVED")

    def test_05_approve_clinical_document_review(self):
        with SessionLocal() as db:
            doc = UploadedDocumentRecord(
                filename="pregnancy_waiver.pdf",
                file_type="PDF",
                file_size_bytes=1024,
                associated_guest_name="Sarah Jenkins",
                extracted_summary="First trimester pregnancy notes",
                safety_clearance_status="ATTENTION_NEEDED"
            )
            db.add(doc)
            draft = ActionDraft(
                type="clinical_document_review",
                guest_name="Sarah Jenkins",
                content="Clear Sarah Jenkins maternal protocol.",
                status="pending_review"
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            draft_id = draft.id

        res = self.client.post(f"/api/v1/drafts/{draft_id}/approve", json={"operator_name": "Kareena Islam"})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["dispatch_result"]["channel"], "CLINICAL_DOCUMENT_REGISTRY")
        self.assertEqual(data["dispatch_result"]["details"]["status"], "CLEARED")

    def test_06_discard_draft(self):
        with SessionLocal() as db:
            draft = ActionDraft(
                type="sms_alert",
                guest_name="Discard Test",
                content="Test discard content",
                status="pending_review"
            )
            db.add(draft)
            db.commit()
            db.refresh(draft)
            draft_id = draft.id

        res = self.client.post(f"/api/v1/drafts/{draft_id}/discard", json={"reason": "Redundant alert"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "success")
        
    def test_07_batch_approve_routine_drafts(self):
        with SessionLocal() as db:
            d1 = ActionDraft(
                type="email_reply",
                guest_name="Maya Lin",
                content="Thank you for inquiring about the Nosara reset.",
                status="pending_review"
            )
            d2 = ActionDraft(
                type="priority_circle_welcome",
                guest_name="Liam Chen",
                content="Welcome to the KAI Founder Priority Circle.",
                status="pending_review"
            )
            d_clin = ActionDraft(
                type="clinical_document_review",
                guest_name="Amara Vance",
                content="Epilepsy clinical waiver safety clearance required.",
                status="pending_review"
            )
            db.add_all([d1, d2, d_clin])
            db.commit()
            db.refresh(d1)
            db.refresh(d2)
            db.refresh(d_clin)
            id1, id2, id_clin = d1.id, d2.id, d_clin.id

        # Execute routine batch approval
        res = self.client.post("/api/v1/drafts/batch-approve", json={
            "category": "routine",
            "operator_name": "Kareena Islam"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertGreaterEqual(data["approved_count"], 2)
        self.assertIn("Elevated clinical contraindications require explicit individual review", data["safety_notice"])

        # Check DB states: routine drafts approved, clinical draft remains pending_review
        with SessionLocal() as db:
            ref_d1 = db.query(ActionDraft).filter(ActionDraft.id == id1).first()
            ref_d2 = db.query(ActionDraft).filter(ActionDraft.id == id2).first()
            ref_clin = db.query(ActionDraft).filter(ActionDraft.id == id_clin).first()
            self.assertEqual(ref_d1.status, "approved")
            self.assertEqual(ref_d2.status, "approved")
            self.assertEqual(ref_clin.status, "pending_review", "Clinical draft MUST NOT be auto-approved in routine batch mode!")

    def test_08_whatsapp_digest_dispatch(self):
        res = self.client.post("/api/v1/drafts/digest/whatsapp")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("digest_payload", data)
        payload = data["digest_payload"]
        self.assertEqual(payload["messaging_product"], "whatsapp")
        self.assertEqual(payload["type"], "interactive")
        self.assertIn("metadata", payload)
        self.assertIn("Action Drafts Pending Review", payload["interactive"]["body"]["text"])

    def test_09_copilot_sse_streaming(self):
        stream_res = self.client.post("/api/v1/sidecar/copilot/chat/stream", json={
            "message": "What is our microclimate weather and breathwork window today in Nosara?",
            "mode": "wellness_safety"
        })
        self.assertEqual(stream_res.status_code, 200)
        self.assertTrue("text/event-stream" in stream_res.headers.get("content-type", ""))
        stream_text = stream_res.text
        self.assertIn("data: ", stream_text)
        self.assertIn('"type": "meta"', stream_text)
        self.assertIn('"type": "done"', stream_text)

    def test_10_wellness_profile_as_base_case(self):
        with SessionLocal() as db:
            intake = StagingIntake(
                client_name="Camilla Thorne",
                email="camilla@thorne-wellness.com",
                phone="+1 305-555-0199",
                sanctuary_slug="nosara",
                room_tier="Private Villa Sanctuary",
                wellness_profile={
                    "primary_focus": "Circadian recalibration & deep nervous system reset",
                    "preferred_rhythm": "Sunrise somatic grounding, silent evenings",
                    "nutrition_preferences": "Blue Zone anti-inflammatory, local tropical botanicals"
                },
                clinical_screening_enabled=False,
                clinical_profile={
                    "notes": "General wellness consultation"
                },
                status="PENDING_APPROVAL"
            )
            db.add(intake)
            db.commit()
            db.refresh(intake)
            saved_id = intake.id

        with SessionLocal() as db:
            saved = db.query(StagingIntake).filter(StagingIntake.id == saved_id).first()
            self.assertIsNotNone(saved)
            self.assertEqual(saved.clinical_screening_enabled, False)
            self.assertEqual(saved.wellness_profile["primary_focus"], "Circadian recalibration & deep nervous system reset")

            # Enable elevated clinical screening feature
            saved.clinical_screening_enabled = True
            saved.clinical_profile = {
                **(saved.clinical_profile or {}),
                "elevated_contraindication_notes": "Slight Raynaud's reaction to extreme cold immersion"
            }
            db.commit()

        with SessionLocal() as db:
            updated = db.query(StagingIntake).filter(StagingIntake.id == saved_id).first()
            self.assertTrue(updated.clinical_screening_enabled)
            self.assertIn("Raynaud", updated.clinical_profile.get("elevated_contraindication_notes", ""))

if __name__ == "__main__":
    unittest.main()

