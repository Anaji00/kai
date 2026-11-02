import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from starlette.testclient import TestClient
from backend.main import app

from backend.services.retreats_service import RETREATS_CATALOG

client = TestClient(app)


def test_health():
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["databaseConnected"] is True
    assert data["totalRetreats"] == len(RETREATS_CATALOG)
    print("[PASS] Health check passed")


def test_retreats():
    res = client.get("/api/v1/retreats")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == len(RETREATS_CATALOG)
    assert any(r["id"] == "nosara-2027" for r in data)
    assert any(r["id"] == "puerto-vallarta-2027" for r in data)
    print("[PASS] List retreats passed")

    res_single = client.get("/api/v1/retreats/nosara-costa-rica-2027")
    assert res_single.status_code == 200
    single_data = res_single.json()
    assert single_data["title"] == "Canopy & Ocean Somatic Alignment"
    print("[PASS] Single retreat retrieval passed")

    res_avail = client.get("/api/v1/retreats/nosara-2027/availability")
    assert res_avail.status_code == 200
    avail_data = res_avail.json()
    assert avail_data["spotsTotal"] == 14
    assert avail_data["spotsRemaining"] >= 0
    print("[PASS] Retreat availability check passed")


def test_booking_workflow():
    payload = {
        "fullName": "Eleanor Vance",
        "email": "eleanor.vance@example.com",
        "phone": "+1 (713) 555-0199",
        "retreatId": "nosara-2027",
        "roomPreference": "private-suite",
        "movementExperience": "gentle-beginner",
        "passportValid": "yes-valid-6mo",
        "healthNotes": "Plant-based, gluten-sensitive",
        "intentions": "Nervous system restoration after executive burnout"
    }
    res = client.post("/api/v1/bookings", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["bookingReference"].startswith("KAI-")
    ref = data["bookingReference"]
    print(f"[PASS] Booking creation passed (Ref: {ref})")

    # Lookup booking
    assert client.get(f"/api/v1/bookings/{ref}").status_code == 422
    assert client.get(f"/api/v1/bookings/{ref}?email=someone.else@example.com").status_code == 404

    res_lookup = client.get(f"/api/v1/bookings/{ref}?email={payload['email']}")
    assert res_lookup.status_code == 200
    lookup_data = res_lookup.json()
    assert lookup_data["fullName"] == "Eleanor Vance"
    assert lookup_data["referenceCode"] == ref
    print("[PASS] Booking lookup passed")


def test_flight_concierge():
    payload = {
        "guestName": "Marcus Vance",
        "email": "marcus.vance@example.com",
        "phone": "+1 (312) 555-0182",
        "departureAirport": "ORD",
        "cabinClass": "business",
        "preferredAirline": "United Airlines",
        "travelDatesFlexible": True,
        "specialRequests": "Needs nonstop flight and early check-in transit"
    }
    res = client.post("/api/v1/concierge/flight-request", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    assert data["departureAirport"] == "ORD"
    print("[PASS] Flight concierge request passed")


def test_wellness_and_assessment():
    res_freq = client.get("/api/v1/wellness/frequencies")
    assert res_freq.status_code == 200
    freqs = res_freq.json()
    assert len(freqs) >= 2
    assert any(f["frequencyHz"] == 432 for f in freqs)
    print("[PASS] Wellness frequencies passed")

    res_breath = client.get("/api/v1/wellness/breathwork")
    assert res_breath.status_code == 200
    protocols = res_breath.json()
    assert len(protocols) >= 2
    print("[PASS] Breathwork protocols passed")

    payload = {
        "primarySymptom": "burnout",
        "workOverdriveHours": 65,
        "sleepQualityScale": 3,
        "travelReadiness": "latin-america"
    }
    res_assess = client.post("/api/v1/wellness/stress-assessment", json=payload)
    assert res_assess.status_code == 200
    assess_data = res_assess.json()
    assert "Sympathetic" in assess_data["autonomicState"]
    assert assess_data["recommendedFrequencyHz"] in [432, 528]
    print("[PASS] Stress assessment passed")


def test_newsletter():
    payload = {"email": "wellness.seeker@example.com", "source": "footer"}
    res = client.post("/api/v1/newsletter/subscribe", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["success"] is True
    print("[PASS] Newsletter subscription passed")


if __name__ == "__main__":
    print("Running KAI FastAPI automated test suite...")
    test_health()
    test_retreats()
    test_booking_workflow()
    test_flight_concierge()
    test_wellness_and_assessment()
    test_newsletter()
    print("\nALL 6 BACKEND TEST SUITES PASSED CLEANLY!")
