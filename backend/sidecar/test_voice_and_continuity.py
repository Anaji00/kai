import sys
import os
import unittest
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from starlette.testclient import TestClient
from backend.main import app
from backend.database import SessionLocal
from backend.testing import admin_headers
from backend.models import ActionDraft
from backend.sidecar.models import StagingIntake
from backend.sidecar.services.voice_transcriber import extract_entities_from_transcript
from backend.sidecar.services.continuity_service import generate_continuity_milestones

client = TestClient(app, headers=admin_headers())


class TestVoiceAndContinuity(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_voice_memo_extraction_clean(self):
        """
        Verify natural language voice dictation extraction with clean guest details,
        confirming that clinical screening remains False when no acute contraindications exist.
        """
        transcript = (
            "Hey copilot, just finished a 30-minute consultation call with Victoria Sterling. "
            "She's flying out of ORD Chicago, looking for our Nosara sanctuary in a Private Villa Sanctuary. "
            "Her main intention is deep executive burnout recovery and circadian sleep renewal. "
            "She eats plant-based, loves silent sunrise meditation, and requested business class coordination."
        )
        extracted = extract_entities_from_transcript(transcript)

        self.assertEqual(extracted["client_name"], "Victoria Sterling")
        self.assertEqual(extracted["sanctuary_slug"], "nosara")
        self.assertEqual(extracted["room_tier"], "Private Villa Sanctuary")
        self.assertEqual(extracted["flight_request"]["departure_airport"], "ORD")
        self.assertIn("burnout", extracted["wellness_profile"]["primary_focus"].lower())
        self.assertIn("plant", extracted["wellness_profile"]["nutrition_preferences"].lower())
        # Clinical screening should be FALSE by default (restorative wellness base case)
        self.assertFalse(extracted["clinical_screening_enabled"])
        self.assertEqual(len(extracted["clinical_profile"]["flags"]), 0)
        self.assertIn("Victoria Sterling", extracted["welcome_email_draft"])

    def test_voice_memo_extraction_contraindication_alert(self):
        """
        Verify that elevated clinical screening turns True ONLY when acute medical contraindications
        such as epilepsy, pregnancy, pacemaker, or severe cardiovascular conditions are dictated.
        """
        transcript = (
            "Quick voice note for Marcus Vance. Spoke with him about Nosara. "
            "He mentioned he has a history of epilepsy and uses a pacemaker, "
            "so we need our medical director to review acoustic sound frequencies and hot cold contrast therapies."
        )
        extracted = extract_entities_from_transcript(transcript)

        self.assertEqual(extracted["client_name"], "Marcus Vance")
        self.assertTrue(extracted["clinical_screening_enabled"])
        self.assertTrue(
            any("EPILEPSY" in f or "PACEMAKER" in f for f in extracted["clinical_profile"]["flags"])
        )

    def test_post_voice_memo_endpoint(self):
        """
        Verify POST /api/v1/sidecar/intakes/voice-memo creates a StagingIntake with status
        PENDING_APPROVAL and stages an ActionDraft with status pending_review (Zero Autonomous Writes).
        """
        payload = {
            "raw_transcript": (
                "Consultation with Julianne Moore. Flying from JFK to Amalfi Coast sanctuary. "
                "Wants the Cliffside Stillness Suite. Focusing on nervous system decompression and gluten-free nutrition."
            ),
            "operator_name": "Kareena Islam"
        }

        res = client.post("/api/v1/sidecar/intakes/voice-memo", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "PENDING_APPROVAL")
        self.assertIn("intake_id", data)
        self.assertIn("action_draft_id", data)

        # Verify StagingIntake in DB
        intake = self.db.query(StagingIntake).filter(StagingIntake.id == data["intake_id"]).first()
        self.assertIsNotNone(intake)
        self.assertEqual(intake.client_name, "Julianne Moore")
        self.assertEqual(intake.sanctuary_slug, "amalfi")
        self.assertEqual(intake.room_tier, "Cliffside Stillness Suite")
        self.assertEqual(intake.status, "PENDING_APPROVAL")
        self.assertFalse(intake.clinical_screening_enabled)

        # Verify ActionDraft in DB (Zero Autonomous Writes)
        draft = self.db.query(ActionDraft).filter(ActionDraft.id == data["action_draft_id"]).first()
        self.assertIsNotNone(draft)
        self.assertEqual(draft.type, "guest_email_confirmation")
        self.assertEqual(draft.status, "pending_review")
        self.assertIn("Julianne Moore", draft.content)

    def test_continuity_milestone_generation(self):
        """
        Verify the 4-phase post-sanctuary continuity journey generator produces Day 3, Day 7,
        Day 14, and Day 28 milestones with accurate themes and relative scheduling.
        """
        mock_intake = StagingIntake(
            id="TEST-INTAKE-01",
            client_name="Cassandra Cruz",
            email="cassandra@vip.kai",
            sanctuary_slug="nosara",
            room_tier="Private Villa Sanctuary",
            wellness_profile={
                "primary_focus": "Circadian sleep restoration and nervous system quietude",
                "nutrition_preferences": "Anti-inflammatory organic botanicals"
            }
        )
        base_departure = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
        milestones = generate_continuity_milestones(mock_intake, base_departure)

        self.assertEqual(len(milestones), 4)
        days = [m["day"] for m in milestones]
        self.assertEqual(days, [3, 7, 14, 28])

        # Verify Day 3
        self.assertEqual(milestones[0]["scheduled_date"], "2026-10-04")
        self.assertIn("Grounding", milestones[0]["title"])
        self.assertIn("Cassandra Cruz", milestones[0]["content"])

        # Verify Day 7
        self.assertEqual(milestones[1]["scheduled_date"], "2026-10-08")
        self.assertIn("Blue Zone Pantry", milestones[1]["title"])

        # Verify Day 14
        self.assertEqual(milestones[2]["scheduled_date"], "2026-10-15")
        self.assertIn("432Hz Sound Immersion", milestones[2]["title"])

        # Verify Day 28
        self.assertEqual(milestones[3]["scheduled_date"], "2026-10-29")
        self.assertIn("Priority Circle Invitation", milestones[3]["title"])

    def test_post_continuity_arc_endpoint(self):
        """
        Verify POST /api/v1/sidecar/continuity/generate-arc creates 4 ActionDrafts
        in the review queue with status pending_review (Zero Autonomous Writes).
        """
        # Create a test staging intake first
        test_intake = StagingIntake(
            client_name="David Sterling",
            email="david.sterling.test@vip.kai",
            sanctuary_slug="bali",
            room_tier="Shared Ocean Pavilion",
            wellness_profile={"primary_focus": "Executive decompression"},
            status="PENDING_APPROVAL"
        )
        self.db.add(test_intake)
        self.db.commit()
        self.db.refresh(test_intake)

        payload = {
            "intake_id": test_intake.id,
            "departure_date": "2026-11-15",
            "operator_name": "Kareena Islam"
        }

        res = client.post("/api/v1/sidecar/continuity/generate-arc", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertTrue(data["success"])
        self.assertEqual(data["guest_name"], "David Sterling")
        self.assertEqual(data["staged_draft_count"], 4)
        self.assertEqual(len(data["milestones"]), 4)

        # Verify that 4 drafts were created in DB
        draft_ids = [m["draft_id"] for m in data["milestones"]]
        drafts = self.db.query(ActionDraft).filter(ActionDraft.id.in_(draft_ids)).all()
        self.assertEqual(len(drafts), 4)
        for d in drafts:
            self.assertEqual(d.status, "pending_review")
            self.assertIn(d.type, ["post_retreat_integration", "priority_circle_welcome"])

    def test_get_active_continuity_arcs_endpoint(self):
        """
        Verify GET /api/v1/sidecar/continuity/active-arcs returns active integration drafts.
        """
        res = client.get("/api/v1/sidecar/continuity/active-arcs")
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertIsInstance(items, list)


if __name__ == "__main__":
    unittest.main()
