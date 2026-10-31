import unittest
from backend.sidecar.services.geo_routing_service import compute_custom_route
from unittest import mock

from backend.sidecar.services import llm_service
from backend.sidecar.services.llm_service import check_llm_status, LLMServiceError
from backend.sidecar.services.copilot_agent import clinical_copilot


class TestMappingAndLLM(unittest.TestCase):

    def test_dynamic_road_routing_osrm(self):
        """Verify dynamic OSRM road routing calculates distance, duration, and road geometry."""
        # Route: Liberia Airport (LIR) to KAI Nosara Sanctuary
        route = compute_custom_route(
            origin_name="Liberia International Airport (LIR)",
            origin_lat=10.5933,
            origin_lon=-85.5444,
            dest_name="KAI Nosara Ocean Sanctuary",
            dest_lat=9.9806,
            dest_lon=-85.6667,
            sanctuary_slug="nosara"
        )
        self.assertGreater(route["distance_km"], 50.0)
        self.assertGreater(route["estimated_minutes"], 30)
        self.assertIn("route_geometry", route)
        self.assertIsInstance(route["route_geometry"], list)
        self.assertGreater(len(route["route_geometry"]), 5)
        # Ensure coordinate pairs are [lat, lon]
        first_point = route["route_geometry"][0]
        self.assertEqual(len(first_point), 2)
        self.assertTrue(9.0 <= first_point[0] <= 11.5)  # Costa Rica latitude
        print(f"[OK] Dynamic OSRM Route: {route['distance_km']} km, {route['estimated_minutes']} min, {len(route['route_geometry'])} polyline points")

    def test_llm_status_check(self):
        """Verify the Groq status check returns diagnostic info without crashing."""
        status = check_llm_status()
        self.assertEqual(status["provider"], "groq")
        self.assertIn("reachable", status)
        print(f"[OK] Groq Status Checked: configured={status['configured']} reachable={status['reachable']}")

    def test_missing_api_key_raises_actionable_error(self):
        """Without GROQ_API_KEY the client fails loudly with a hint instead of returning canned text."""
        with mock.patch.object(llm_service.settings, "GROQ_API_KEY", ""):
            with self.assertRaises(LLMServiceError) as ctx:
                llm_service.query_llm_chat("system", "hello")
        self.assertIn("GROQ_API_KEY", ctx.exception.message)

    def test_rate_limit_is_retried_then_succeeds(self):
        """A 429 with Retry-After is retried and the eventual 200 reply is returned."""
        import httpx
        responses = [
            httpx.Response(429, headers={"retry-after": "0"}, json={"error": "rate"}),
            httpx.Response(200, json={"choices": [{"message": {"content": "Namaste"}}]}),
        ]
        with mock.patch.object(llm_service.settings, "GROQ_API_KEY", "test-key"),              mock.patch.object(httpx.Client, "post", side_effect=responses) as post:
            self.assertEqual(llm_service.query_llm_chat("system", "hello"), "Namaste")
        self.assertEqual(post.call_count, 2)

    def test_copilot_screens_contraindications_without_llm(self):
        """
        Clinical screening runs before the LLM, so contraindications are flagged even when
        Groq is unconfigured; the reply then comes from the deterministic clinical synthesis.
        """
        res = clinical_copilot.process_chat(
            message="Guest has epilepsy and Raynaud's syndrome. What breathwork and hydrotherapy is safe?",
            mode="clinical_safety"
        )
        # Clinical screening MUST flag the contraindications
        self.assertEqual(res["safety_level"], "CONTRAINDICATION_ALERT")
        self.assertGreaterEqual(len(res["tool_calls"]), 1)
        self.assertEqual(res["tool_calls"][0]["tool"], "screen_guest_contraindications")

        response_text = res["response_text"]
        self.assertTrue(response_text.strip(), "Copilot must always return a briefing")
        print(f"[OK] Copilot Safety Pre-Screening: {res['safety_level']}, Response Length: {len(response_text)}")


if __name__ == "__main__":
    unittest.main()
