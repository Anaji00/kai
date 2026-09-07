import unittest
from backend.sidecar.services.geo_routing_service import compute_custom_route, fetch_dynamic_road_route
from backend.sidecar.services.ollama_service import check_ollama_status, query_ollama_chat, OllamaServiceError
from backend.sidecar.services.copilot_agent import clinical_copilot


class TestMappingAndOllama(unittest.TestCase):

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

    def test_ollama_status_check(self):
        """Verify Ollama status check returns diagnostic info without crashing."""
        status = check_ollama_status()
        self.assertIn("reachable", status)
        print(f"[OK] Ollama Status Checked: reachable={status['reachable']}")

    def test_ollama_direct_execution_no_fallback(self):
        """
        Verify that copilot chat routes directly to Ollama, and if Ollama is not active,
        it returns an explicit diagnostic message rather than falling back to canned text.
        """
        res = clinical_copilot.process_chat(
            message="Guest has epilepsy and Raynaud's syndrome. What breathwork and hydrotherapy is safe?",
            mode="clinical_safety"
        )
        # Clinical screening MUST flag the contraindications
        self.assertEqual(res["safety_level"], "CONTRAINDICATION_ALERT")
        self.assertGreaterEqual(len(res["tool_calls"]), 1)
        self.assertEqual(res["tool_calls"][0]["tool"], "screen_guest_contraindications")

        # Response text must contain the diagnostic message or Ollama response (no silent canned template)
        response_text = res["response_text"]
        self.assertTrue(
            "Ollama" in response_text or "Clinical Alert" in response_text,
            "Response should explicitly reference Ollama or Clinical Alert"
        )
        print(f"[OK] Copilot Safety Pre-Screening: {res['safety_level']}, Response Length: {len(response_text)}")


if __name__ == "__main__":
    unittest.main()
