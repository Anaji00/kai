"""
Stress and race tests against a running stack (see stack.sh). Traffic goes through the Next.js proxy, like
real users. Each scenario reports throughput, latency, and status codes; race scenarios then check Postgres,
because a 200 does not prove an operation happened exactly once.

Only KAI endpoints are hit. Weather, routing, and LLM endpoints are excluded so third parties aren't load tested.
"""
import asyncio
import statistics
import sys
import time
import uuid
from collections import Counter

import httpx

from common import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    BASE_URL,
    booking_payload,
    latest_otp,
    new_reference,
    sign,
    sql,
    unique,
    wait_for,
)

PROBLEMS = []
LIMITS = httpx.Limits(max_connections=500, max_keepalive_connections=100)


def client(**kwargs) -> httpx.AsyncClient:
    return httpx.AsyncClient(base_url=BASE_URL, timeout=httpx.Timeout(120.0), limits=LIMITS, **kwargs)


def check(ok: bool, message: str) -> None:
    print(f"    {'ok  ' if ok else 'FAIL'} {message}")
    if not ok:
        PROBLEMS.append(message)


async def run_load(name, total, concurrency, make_request, expected=(200,), max_p95_ms=None):
    """Runs total requests at the given concurrency and prints a summary row."""
    semaphore = asyncio.Semaphore(concurrency)
    latencies, statuses = [], Counter()

    async def one(i):
        async with semaphore:
            start = time.perf_counter()
            try:
                res = await make_request(i)
                statuses[res.status_code] += 1
            except httpx.HTTPError as exc:
                statuses[type(exc).__name__] += 1
            latencies.append((time.perf_counter() - start) * 1000)

    started = time.perf_counter()
    await asyncio.gather(*(one(i) for i in range(total)))
    elapsed = time.perf_counter() - started
    latencies.sort()
    p = lambda q: latencies[min(int(len(latencies) * q), len(latencies) - 1)]
    bad = sum(n for code, n in statuses.items() if code not in expected)
    print(
        f"  {name:<38} {total:>5} req @ {concurrency:>3} | {total / elapsed:>7.1f} req/s | "
        f"p50 {p(.5):>7.0f}ms  p95 {p(.95):>7.0f}ms  p99 {p(.99):>7.0f}ms | {dict(statuses)}"
    )
    if bad:
        PROBLEMS.append(f"{name}: {bad}/{total} unexpected responses {dict(statuses)}")
    if max_p95_ms and p(.95) > max_p95_ms:
        PROBLEMS.append(f"{name}: p95 {p(.95):.0f}ms is over the {max_p95_ms}ms target")
    return statuses


async def login() -> httpx.AsyncClient:
    c = client()
    res = await c.post("/api/auth/operator/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    res.raise_for_status()
    c.headers["X-KAI-CSRF-Token"] = c.cookies["kai_csrf_token"]
    return c


# ---------------------------------------------------------------- throughput

async def read_load(op):
    print("\n[1] Read load")
    async with client() as anon:
        await run_load("Home page (SSR)", 500, 50, lambda i: anon.get("/"), max_p95_ms=5000)
        await run_load("Retreat page", 500, 50, lambda i: anon.get("/retreats"), max_p95_ms=5000)
        await run_load("Public API: retreats", 1000, 100, lambda i: anon.get("/api/v1/retreats"), max_p95_ms=5000)
        await run_load("Anonymous rejected: drafts", 1000, 100, lambda i: anon.get("/api/v1/drafts/stats"), expected=(401,), max_p95_ms=5000)
    await run_load("Operator: draft stats", 500, 50, lambda i: op.get("/api/v1/drafts/stats"), max_p95_ms=5000)
    await run_load("Operator: intake list", 300, 30, lambda i: op.get("/api/v1/sidecar/intakes"), max_p95_ms=5000)
    await run_load("Operator: whoami", 1000, 100, lambda i: op.get("/api/auth/me"), max_p95_ms=5000)


async def booking_burst():
    print("\n[2] Booking burst: a launch-day rush, then confirm nothing was lost")
    before = int(sql("SELECT count(*) FROM bookings"))
    intakes_before = int(sql("SELECT count(*) FROM staging_intakes"))
    total = 300
    async with client() as anon:
        await run_load("New bookings", total, 50, lambda i: anon.post("/api/v1/bookings", json=booking_payload(health_notes="Vegetarian.")), expected=(201,), max_p95_ms=10000)
    check(int(sql("SELECT count(*) FROM bookings")) - before == total, f"{total} bookings stored")
    try:
        wait_for(lambda: int(sql("SELECT count(*) FROM staging_intakes")) - intakes_before >= total, timeout=60)
        check(True, f"{total} intakes staged by background tasks")
    except AssertionError:
        check(False, f"background tasks staged only {int(sql('SELECT count(*) FROM staging_intakes')) - intakes_before}/{total} intakes after 60s")
    check(sql("SELECT count(*) - count(DISTINCT reference_code) FROM bookings") == "0", "all booking references unique")


async def login_load():
    print("\n[3] Password hashing load (Argon2 is deliberately slow)")
    async with client() as anon:
        await run_load(
            "Operator logins",
            60, 10,
            lambda i: anon.post("/api/auth/operator/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}),
            max_p95_ms=15000,
        )


# ---------------------------------------------------------------- races

async def race_same_booking_reference():
    print("\n[4] Race: 25 simultaneous retries of one booking (double-click, flaky network)")
    payload = booking_payload(reference=new_reference())
    async with client() as anon:
        results = await asyncio.gather(*(anon.post("/api/v1/bookings", json=payload) for _ in range(25)))
    statuses = Counter(r.status_code for r in results)
    print(f"    statuses: {dict(statuses)}")
    check(sql(f"SELECT count(*) FROM bookings WHERE reference_code='{payload['clientReference']}'") == "1", "exactly one booking stored")
    check(not any(r.status_code >= 500 for r in results), "no server errors")


async def race_double_approve(op):
    print("\n[5] Race: 20 simultaneous approvals of one draft (two tabs, double-click)")
    guest = f"Race Guest {unique()}"
    sql(f"INSERT INTO action_drafts (type, guest_name, content, status, created_at) VALUES ('concierge_guest_ping', '{guest}', 'race', 'pending_review', now())")
    draft_id = sql(f"SELECT id FROM action_drafts WHERE guest_name='{guest}'")
    results = await asyncio.gather(*(op.post(f"/api/v1/drafts/{draft_id}/approve", json={}) for _ in range(20)))
    print(f"    statuses: {dict(Counter(r.status_code for r in results))}")
    dispatched = int(sql(f"SELECT count(*) FROM audit_events WHERE action='draft.approved' AND entity_id='{draft_id}'"))
    check(dispatched == 1, f"draft dispatched exactly once (was {dispatched})")
    check(not any(r.status_code >= 500 for r in results), "no server errors")


async def race_refresh():
    print("\n[6] Race: 10 simultaneous refreshes of one token")
    c = await login()
    token, csrf = c.cookies["kai_refresh_token"], c.cookies["kai_csrf_token"]
    cookies = f"kai_refresh_token={token}; kai_csrf_token={csrf}"
    async with client() as raw:
        results = await asyncio.gather(*(
            raw.post("/api/auth/operator/refresh", headers={"cookie": cookies, "X-KAI-CSRF-Token": csrf}) for _ in range(10)
        ))
    statuses = Counter(r.status_code for r in results)
    print(f"    statuses: {dict(statuses)}")
    check(statuses[200] <= 1, f"at most one rotation succeeded (was {statuses[200]})")
    check(not any(r.status_code >= 500 for r in results), "no server errors")
    await c.aclose()


async def race_webhook_duplicates():
    print("\n[7] Race: 25 simultaneous deliveries of one webhook event")
    guest = f"Webhook Race {unique()}"
    body, headers = sign({"event_type": "flight.delayed", "event_id": unique("race-"), "passenger": guest, "flight": "AA 9"})
    async with client() as anon:
        results = await asyncio.gather(*(anon.post("/api/v1/sidecar/webhooks/flight-desk", content=body, headers=headers) for _ in range(25)))
    print(f"    statuses: {dict(Counter(r.status_code for r in results))}")
    drafts = int(sql(f"SELECT count(*) FROM action_drafts WHERE guest_name='{guest}'"))
    check(drafts == 1, f"exactly one draft staged (was {drafts})")
    check(not any(r.status_code >= 500 for r in results), "no server errors")


async def race_otp_guessing():
    print("\n[8] Attack: 100 simultaneous wrong guesses at a 6-digit guest code")
    email, reference = f"{unique('otp.')}@example.com", new_reference()
    async with client() as anon:
        res = await anon.post("/api/v1/bookings", json=booking_payload(email=email, reference=reference))
        assert res.status_code == 201
        await anon.post("/api/auth/guest/request-access", json={"email": email, "booking_reference": reference})
        code = latest_otp(email)
        wrong = "000000" if code != "000000" else "111111"
        body = {"email": email, "booking_reference": reference, "otp": wrong}
        results = await asyncio.gather(*(anon.post("/api/auth/guest/verify", json=body) for _ in range(100)))
        print(f"    statuses: {dict(Counter(r.status_code for r in results))}")
        check(not any(r.status_code >= 500 for r in results), "no server errors")
        check(not any(r.status_code == 200 for r in results), "no wrong guess succeeded")
        recorded = int(sql(f"SELECT attempts FROM guest_otp_challenges WHERE email='{email}' ORDER BY id DESC LIMIT 1"))
        print(f"    attempts recorded: {recorded}")
        real = await anon.post("/api/auth/guest/verify", json={"email": email, "booking_reference": reference, "otp": code})
        check(real.status_code == 401, f"code is burned after the guesses (real code returned {real.status_code})")


async def attack_login_spray():
    print("\n[9] Attack: 200 password guesses in parallel from one address")
    email = f"{unique('nobody.')}@example.com"
    async with client() as anon:
        statuses = await run_load(
            "Password spray",
            200, 25,
            lambda i: anon.post("/api/auth/operator/login", json={"email": email, "password": f"guess-{i}"}),
            expected=(401, 429),
        )
    check(statuses[429] > 0, "throttle engaged")
    check(statuses[401] <= 45, f"guesses before the throttle stayed small (was {statuses[401]}; limit is 20, plus requests in flight)")
    sql("DELETE FROM auth_attempts")


async def hostile_inputs():
    print("\n[10] Hostile input: oversized and pathological text")
    huge = "I have been feeling tired. " * 40000  # about 1 MB
    regex_bomb = "no " * 200000 + "pregnant"
    async with client() as anon:
        for name, notes in (("1 MB health notes", huge), ("600 KB regex stress", regex_bomb)):
            start = time.perf_counter()
            res = await anon.post("/api/v1/bookings", json=booking_payload(health_notes=notes))
            elapsed = time.perf_counter() - start
            print(f"    {name}: HTTP {res.status_code} in {elapsed:.2f}s")
            check(res.status_code == 422, f"{name} is refused by the size limit")
            check(elapsed < 10, f"{name} answered within 10s")
        # The same stress reaches the clinical engine through an operator's voice memo, which has no form limit.
        op = await login()
        try:
            start = time.perf_counter()
            res = await op.post("/api/v1/sidecar/intakes/voice-memo", json={"raw_transcript": regex_bomb})
            elapsed = time.perf_counter() - start
            print(f"    regex stress via voice memo: HTTP {res.status_code} in {elapsed:.2f}s")
            check(res.status_code < 500, "voice memo survives pathological text")
            check(elapsed < 10, "voice memo answered within 10s")
        finally:
            await op.aclose()
        await asyncio.sleep(3)
        health = await anon.get("/api/v1/health")
        check(health.status_code == 200, "API healthy afterwards")
        bad = await anon.post("/api/v1/bookings", content=b"{not json", headers={"Content-Type": "application/json"})
        check(bad.status_code == 422, "malformed JSON gets 422")
        injection = booking_payload(name="Robert'); DROP TABLE bookings;--")
        check((await anon.post("/api/v1/bookings", json=injection)).status_code == 201, "SQL-looking input is stored as plain text")
        check(int(sql("SELECT count(*) FROM bookings")) > 0, "bookings table intact")


# ---------------------------------------------------------------- soak

async def soak(op, seconds: int = 60):
    print(f"\n[11] Mixed traffic for {seconds}s")
    stop_at = time.time() + seconds
    statuses, latencies = Counter(), []

    async def visitor(c, seed):
        i = seed
        while time.time() < stop_at:
            i += 1
            pick = i % 20
            start = time.perf_counter()
            try:
                if pick < 10:
                    res = await c.get("/api/v1/retreats")
                elif pick < 15:
                    res = await c.get("/")
                elif pick < 17:
                    res = await c.post("/api/v1/bookings", json=booking_payload())
                else:
                    res = await op.get("/api/v1/drafts/stats")
                statuses[res.status_code] += 1
            except httpx.HTTPError as exc:
                statuses[type(exc).__name__] += 1
            latencies.append((time.perf_counter() - start) * 1000)

    async with client() as anon:
        await asyncio.gather(*(visitor(anon, s * 7) for s in range(40)))
    latencies.sort()
    total = len(latencies)
    print(f"    {total} requests, {total / seconds:.1f} req/s | p50 {latencies[total // 2]:.0f}ms  p95 {latencies[int(total * .95)]:.0f}ms  p99 {latencies[int(total * .99)]:.0f}ms | {dict(statuses)}")
    errors = sum(n for code, n in statuses.items() if not (isinstance(code, int) and code < 400))
    check(errors == 0, f"no errors in mixed traffic (was {errors})")


async def main():
    started = time.perf_counter()
    op = await login()
    await read_load(op)
    await booking_burst()
    await login_load()
    await race_same_booking_reference()
    await race_double_approve(op)
    await race_refresh()
    await race_webhook_duplicates()
    await race_otp_guessing()
    await attack_login_spray()
    await hostile_inputs()
    await soak(op)
    await op.aclose()

    print(f"\nFinished in {time.perf_counter() - started:.0f}s")
    print(f"Open connections: {sql('SELECT count(*) FROM pg_stat_activity')}")
    if PROBLEMS:
        print(f"\n{len(PROBLEMS)} PROBLEMS:")
        for problem in PROBLEMS:
            print(f"  - {problem}")
        return 1
    print("\nNo problems found.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
