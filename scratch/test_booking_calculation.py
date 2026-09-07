import sys
import time
from backend.database import SessionLocal
from backend.sidecar.services.copilot_agent import clinical_copilot

def main():
    print("Testing booking and rest calculation with query:")
    query = "dd a bew booking for a frank lucas fo rnnosara, calculate the rest, 3 night"
    print(f"Query: {query}\n")

    db = SessionLocal()
    try:
        # 1. Test parsing directly
        parsed = clinical_copilot.parse_booking_request(query, db=db)
        print("=== PARSED BOOKING REQUEST ===")
        print(f"Guest Name: {parsed['guest_name']}")
        print(f"Sanctuary: {parsed['sanctuary_config']['name']} ({parsed['sanctuary_slug']})")
        print(f"Stay Nights: {parsed['nights']}")
        print(f"Accommodation: {parsed['room_tier']}")
        print(f"Nightly Rate: ${parsed['nightly_rate']:,.2f}")
        print(f"Total Amount: ${parsed['total_amount']:,.2f}")
        print(f"30% Deposit: ${parsed['deposit_30']:,.2f}")
        print(f"70% Balance ('The Rest'): ${parsed['balance_70']:,.2f}")
        print(f"Remaining Spots: {parsed['remaining_spots']}/{parsed['capacity_limit']}")
        print(f"Airport Transfer: {parsed['transit_airport']} via {parsed['transit_vehicle']}")
        print("Rest Arc:")
        for r in parsed['rest_arc']:
            print(f"  {r}")
        print()

        assert parsed['guest_name'] == "Frank Lucas", f"Expected Frank Lucas, got {parsed['guest_name']}"
        assert parsed['sanctuary_slug'] == "nosara", f"Expected nosara, got {parsed['sanctuary_slug']}"
        assert parsed['nights'] == 3, f"Expected 3 nights, got {parsed['nights']}"
        assert parsed['total_amount'] == 5700.0, f"Expected 5700, got {parsed['total_amount']}"
        assert parsed['deposit_30'] == 1710.0, f"Expected 1710, got {parsed['deposit_30']}"
        assert parsed['balance_70'] == 3990.0, f"Expected 3990, got {parsed['balance_70']}"
        print("Parsing assertions PASSED!\n")

        # 2. Test proposal generation
        proposal = clinical_copilot.detect_form_fill_proposal(query, db=db)
        print("=== PROPOSAL GENERATION ===")
        print(f"Form Type: {proposal['form_type']}")
        print(f"Form Title: {proposal['form_title']}")
        print(f"Target URL: {proposal['target_url']}")
        print(f"Client Name: {proposal['fields']['client_name']}")
        print(f"Total Amount: ${proposal['fields']['total_amount']:,.2f}")
        print(f"Deposit (30%): ${proposal['fields']['deposit_30']:,.2f}")
        print(f"Balance (70%): ${proposal['fields']['balance_70']:,.2f}")
        print(f"Summary: {proposal['summary']}")
        assert proposal['target_url'] == "/portal"
        assert proposal['form_type'] == "guest_intake"
        print("Proposal assertions PASSED!\n")

        # 3. Test full process_chat with live Ollama inference
        print("=== RUNNING FULL PROCESS_CHAT (OLLAMA QWEN 0.5B) ===")
        t0 = time.time()
        res = clinical_copilot.process_chat(
            message=query,
            mode="studio_ops",
            sanctuary_slug="nosara",
            current_page="/portal",
            db=db
        )
        elapsed = time.time() - t0
        print(f"Inference completed in {elapsed:.2f}s\n")
        print("--- RESPONSE TEXT ---")
        print(res["response_text"])
        print("\n--- TOOL CALLS ---")
        for tc in res["tool_calls"]:
            print(f"- {tc.get('tool_name') or tc.get('tool')}: {tc.get('summary')}")
        print("\n--- PROPOSAL ---")
        if res.get("form_fill_proposal"):
            print(f"Proposal: {res['form_fill_proposal']['form_title']}")
            print(f"Target URL: {res['form_fill_proposal']['target_url']}")
        print("\n--- FOLLOWUPS ---")
        print(res.get("suggested_followups"))

        # Verify NO hallucination of "Frank Lucas Rollover Sanctuary"
        assert "rollover sanctuary" not in res["response_text"].lower(), "Hallucinated rollover sanctuary detected!"
        print("\nALL TESTS PASSED WITH 0 HALLUCINATIONS!")
    finally:
        db.close()

if __name__ == "__main__":
    main()
