import sys
import os
import io
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.abspath("."))

from backend.database import SessionLocal
from backend.sidecar.services.copilot_agent import clinical_copilot

db = SessionLocal()

print("=" * 60)
print("TEST 1: Dossier on Frank (Non-existent guest -> stages Founder Approval card)")
print("=" * 60)
t0 = time.time()
res1 = clinical_copilot.process_chat(
    message="give me a dossier on Frank",
    mode="studio_ops",
    db=db
)
t1 = time.time()
print(f"Time: {round(t1 - t0, 2)}s")
print("Safety Level:", res1.get("safety_level"))
print("Safety Screened:", res1.get("safety_screened"))
print("Citations:", res1.get("citations"))
print("Proposal Title:", res1.get("form_fill_proposal", {}).get("form_title") if res1.get("form_fill_proposal") else None)
print("Tool Calls:", [tc["tool"] for tc in res1.get("tool_calls", [])])
print("\nCopilot Response:")
print(res1["response_text"])

print("\n" + "=" * 60)
print("TEST 2: Dossier on Eleanor Vance (Existing guest in SQLite DB)")
print("=" * 60)
t0 = time.time()
res2 = clinical_copilot.process_chat(
    message="give me a dossier on Eleanor Vance",
    mode="consult_prep",
    db=db
)
t1 = time.time()
print(f"Time: {round(t1 - t0, 2)}s")
print("Safety Level:", res2.get("safety_level"))
print("Safety Screened:", res2.get("safety_screened"))
print("Tool Calls:", [tc["tool"] for tc in res2.get("tool_calls", [])])
print("\nCopilot Response:")
print(res2["response_text"])

print("\n" + "=" * 60)
print("TEST 3: Business RAG - Cohorts, Capacity, & Pricing")
print("=" * 60)
t0 = time.time()
res3 = clinical_copilot.process_chat(
    message="what are your upcoming retreat cohorts, 12-14 capacity, and pricing tiers?",
    mode="studio_ops",
    db=db
)
t1 = time.time()
print(f"Time: {round(t1 - t0, 2)}s")
print("Citations:", res3.get("citations"))
print("Tool Calls:", [tc["tool"] for tc in res3.get("tool_calls", [])])
print("\nCopilot Response:")
print(res3["response_text"])
