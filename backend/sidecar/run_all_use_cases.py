"""
Master Operational Use Cases Orchestrator
=========================================
Platform: KAI Sanctuary Platform (Founder: Kareena Islam, BSN, RN)

Executes all 4 heavily expanded operational use case suites sequentially:
  Suite 1: run_real_use_cases.py          (7 Core Restorative Use Cases)
  Suite 2: run_full_system_use_cases.py  (12 Full-System Architecture Aspects)
  Suite 3: run_deep_expanded_use_cases.py (10 Deep Operational Domains)
  Suite 4: run_ultra_expanded_use_cases.py(10 Ultra-Expanded Real-World Scenarios)

Consolidates real-time execution timing, verifies 100% pass rate, and outputs
an executive operational audit report.
"""

import os
import sys
import time
import subprocess

# Ensure repository root is on PYTHONPATH
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, REPO_ROOT)

SUITES = [
    {
        "name": "Suite 1: Core Restorative Clinical Lifecycle",
        "file": os.path.join(REPO_ROOT, "backend", "sidecar", "run_real_use_cases.py"),
        "cases": 7,
        "description": "Full lifecycle, RAG pre-call thesis, Tern trip sync, voice memo intake, SMS staging, document upload, and audit."
    },
    {
        "name": "Suite 2: Full-System Architecture & Interceptor Gates",
        "file": os.path.join(REPO_ROOT, "backend", "sidecar", "run_full_system_use_cases.py"),
        "cases": 12,
        "description": "PII security, ActionDrafts gate, webhook auth, background booking, document upload safety, WAL concurrency, routes, POIs, dining, reviews, guide."
    },
    {
        "name": "Suite 3: Deep Expanded Operational Domains",
        "file": os.path.join(REPO_ROOT, "backend", "sidecar", "run_deep_expanded_use_cases.py"),
        "cases": 10,
        "description": "HNW staged intake, clinical clearance, SMS campaign gate, geodesic navigation, microclimate bioclimatology, Blue Zone dining, transfer webhook, buyout, capacity, data seeding."
    },
    {
        "name": "Suite 4: Ultra Heavily Expanded Real-World Scenarios",
        "file": os.path.join(REPO_ROOT, "backend", "sidecar", "run_ultra_expanded_use_cases.py"),
        "cases": 10,
        "description": "Family Office buyout, contraindication interceptor, 20-webhook concurrency storm, severe terrain reroute, 4-phase continuity arc, noisy voice dictation, B2B studio syndicate, 12-14 guest ceiling, vagal telemetry reviews, ActionDrafts lifecycle."
    }
]


def run_master_orchestration():
    total_start = time.time()
    results = []

    print("\n" + "#" * 80)
    print("  KAI SANCTUARY PLATFORM - MASTER REAL-WORLD OPERATIONAL SUITES")
    print("  Founder & Clinical Director: Kareena Islam, BSN, RN")
    print("  Orchestrating 4 Specialized Suites (39 Total Scenarios)")
    print("#" * 80)

    for idx, suite in enumerate(SUITES, 1):
        print(f"\n>>> Launching Suite {idx}/{len(SUITES)}: {suite['name']}...")
        suite_t0 = time.time()

        proc = subprocess.run(
            [sys.executable, suite["file"]],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True
        )

        elapsed = round(time.time() - suite_t0, 2)
        passed = (proc.returncode == 0)

        # Print output stream
        if proc.stdout:
            print(proc.stdout)
        if proc.stderr and not passed:
            print(f"[STDERR]:\n{proc.stderr}")

        results.append({
            "name": suite["name"],
            "cases": suite["cases"],
            "elapsed": elapsed,
            "passed": passed
        })

        if not passed:
            print(f"FAILED: {suite['name']} exited with code {proc.returncode}")
            break

    total_duration = round(time.time() - total_start, 2)
    all_passed = all(r["passed"] for r in results) and len(results) == len(SUITES)
    total_scenarios = sum(r["cases"] for r in results if r["passed"])

    print("\n" + "=" * 80)
    print("                      EXECUTIVE OPERATIONAL SCORECARD")
    print("=" * 80)
    print(f"{'Suite Name':<52} | {'Cases':<6} | {'Time (s)':<8} | {'Status'}")
    print("-" * 80)
    for r in results:
        status_str = "PASS [OK]" if r["passed"] else "FAIL [X]"
        print(f"{r['name']:<52} | {r['cases']:<6} | {r['elapsed']:<8.2f} | {status_str}")
    print("-" * 80)
    print(f"Total Scenarios Evaluated: {total_scenarios}/39")
    print(f"Total Execution Duration : {total_duration}s")
    print(f"Overall Platform Status  : {'ALL 39 SCENARIOS VERIFIED [PASS]' if all_passed else 'SUITE FAILURES DETECTED'}")
    print("=" * 80 + "\n")

    return all_passed


if __name__ == "__main__":
    success = run_master_orchestration()
    sys.exit(0 if success else 1)
