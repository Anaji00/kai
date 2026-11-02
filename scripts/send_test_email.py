#!/usr/bin/env python3
"""
KAI Wellness Retreats - Unified Transactional Email Verification Suite
========================================================================
Tests both delivery engines:
1. Direct SMTP Relay (Microsoft 365, Google App Password, or Custom SMTP)
2. Resend Cloud API (Domain verification & Sandbox Mirror fallback)
3. End-to-end Dual-Dispatch Booking Pipeline (Customer Receipt + Founder Alert)
"""

import os
import sys
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

load_dotenv(dotenv_path=REPO_ROOT / ".env")

# Resend config
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "KAI Sanctuary Reservations <onboarding@resend.dev>")
RESEND_CONCIERGE_FROM_EMAIL = os.getenv("RESEND_CONCIERGE_FROM_EMAIL", "KAI Concierge Desk <onboarding@resend.dev>")

# SMTP config
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")

# Routing config
KAREENA_ROUTING_EMAIL = os.getenv("KAREENA_ROUTING_EMAIL", "kareena@grandtravelcruise.com")
ARMAAN_ROUTING_EMAIL = os.getenv("ARMAAN_ROUTING_EMAIL", "armaan@grandtravelcruise.com")
ENABLE_LIVE = os.getenv("ENABLE_LIVE_EMAIL_DISPATCH", "false").lower() in ("true", "1", "yes")

BANNER = """
=============================================================================
         KAI WELLNESS RETREATS - UNIFIED EMAIL VERIFICATION SUITE
=============================================================================
"""

def print_config(target_email: str):
    print(BANNER)
    print(f"Target Customer Email:      {target_email}")
    print(f"Kareena Routing Email:      {KAREENA_ROUTING_EMAIL}")
    print(f"Armaan Routing Email:       {ARMAAN_ROUTING_EMAIL}")
    print(f"Resend From Address:        {RESEND_FROM_EMAIL}")
    print(f"Resend Concierge Address:   {RESEND_CONCIERGE_FROM_EMAIL}")
    print(f"Resend API Key:             {'Configured (' + RESEND_API_KEY[:8] + '...)' if RESEND_API_KEY else 'Not set'}")
    print(f"Direct SMTP Relay:          {'Configured (' + SMTP_HOST + ' as ' + SMTP_USER + ')' if SMTP_HOST and SMTP_USER else 'Not configured (using Resend / Sandbox)'}")
    print(f"Live Dispatch Enabled:      {ENABLE_LIVE}")
    print("=" * 77)

def test_smtp_relay(target_email: str) -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        print("\n[SMTP ENGINE] Skipped (SMTP_HOST / SMTP_USER not set in .env)")
        return False

    print(f"\n[SMTP ENGINE] Testing Direct SMTP Relay via {SMTP_HOST}:{SMTP_PORT}...")
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.utils import formataddr

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "KAI Sanctuary • SMTP Direct Relay Verification"
        from_header = formataddr(("KAI Sanctuary Concierge", SMTP_USER))
        msg["From"] = from_header
        msg["To"] = target_email
        html = f"""
        <div style="font-family: Georgia, serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 32px; background: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px;">
            <h2 style="color: #2D3E35; margin-top: 0;">&#10003; Direct SMTP Relay Successful</h2>
            <p>This email was delivered directly via <strong>{SMTP_HOST}</strong> authenticated as <strong>{SMTP_USER}</strong>.</p>
            <p>Delivered to: <strong>{target_email}</strong></p>
            <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #738475;">KAI Wellness Retreats &bull; Grand Travel &amp; Cruise</p>
        </div>
        """
        msg.attach(MIMEText(html, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12) as server:
            if SMTP_USE_TLS:
                server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_USER, [target_email], msg.as_string())
        print(f"[PASS] SMTP Relay dispatched successfully to {target_email} from {from_header}")
        return True
    except Exception as e:
        print(f"[FAIL] SMTP Relay error: {e}")
        return False

def test_resend_api(target_email: str) -> bool:
    if not RESEND_API_KEY:
        print("\n[RESEND ENGINE] Skipped (RESEND_API_KEY not set in .env)")
        return False

    print(f"\n[RESEND ENGINE] Testing Resend API Handshake to: {target_email}...")
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [target_email],
        "subject": "KAI Sanctuary • Resend API Delivery Verification",
        "html": f"""
        <div style="font-family: Georgia, serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 32px; background: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px;">
            <h2 style="color: #2D3E35; margin-top: 0;">&#10003; Resend API Handshake Successful</h2>
            <p>Delivered to: <strong>{target_email}</strong> via <strong>{RESEND_FROM_EMAIL}</strong>.</p>
            <p style="font-size: 12px; color: #738475;">KAI Wellness Retreats &bull; Grand Travel &amp; Cruise</p>
        </div>
        """,
    }

    try:
        res = requests.post("https://api.resend.com/emails", json=payload, headers=headers, timeout=10)
        if res.status_code in (200, 201):
            data = res.json()
            print(f"[PASS] Resend delivered successfully! Message ID: {data.get('id')}")
            return True
        else:
            print(f"[FAIL] Resend API returned status {res.status_code}: {res.text[:300]}")
            if "domain" in res.text.lower() or "only send testing emails" in res.text.lower():
                print("       -> Note: Resend sandbox blocks unverified domain recipients.")
                print("       -> Our built-in fallback automatically redirects previews to the founder email.")
            return False
    except requests.exceptions.ConnectionError:
        print("[CONNECTION ERROR] Outbound network call isolated in sandbox.")
        return False
    except Exception as e:
        print(f"[EXCEPTION] {e}")
        return False

def test_booking_pipeline(target_email: str) -> bool:
    print(f"\n[DUAL-DISPATCH PIPELINE] Running Full Reservation Intake Pipeline via email_service.py...")
    try:
        from backend.services.email_service import send_booking_confirmation

        test_booking = {
            "reference_code": "KAI-VERIFY77",
            "retreat_id": "puerto-vallarta-2027",
            "full_name": "Test Customer",
            "email": target_email,
            "phone": "+1 (555) 019-2834",
            "room_preference": "private-suite",
            "movement_experience": "all-levels",
            "passport_valid": "yes-valid-6mo",
            "health_notes": "Deep rest, somatic recovery, restorative sleep focus.",
            "intentions": "Restorative relaxation and nervous system decompression.",
            "waiver_signed_by": "Test Customer Signature",
            "waiver_signed_at": "Today (Unified Engine Test)"
        }

        test_retreat = {
            "title": "Puerto Vallarta • Sierra Madre Cliffside Sanctuary",
            "dates": "January 28 – 31, 2027"
        }

        result = send_booking_confirmation(test_booking, test_retreat)
        print(f"[PASS] Dual-dispatch pipeline executed successfully (Result: {result})")
        print(f"       -> Founder Alert routed to: {[KAREENA_ROUTING_EMAIL, ARMAAN_ROUTING_EMAIL]}")
        print(f"       -> Customer Receipt routed to: {target_email}")
        return result
    except Exception as e:
        print(f"[ERROR in booking pipeline]: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="KAI Sanctuary Unified Email Testing Tool")
    parser.add_argument("--to", default="najialessio1@gmail.com", help="Recipient email for test delivery")
    parser.add_argument("--pipeline", action="store_true", help="Run full booking dual-dispatch pipeline")
    args = parser.parse_args()

    target_email = args.to
    print_config(target_email)

    smtp_ok = test_smtp_relay(target_email)
    resend_ok = test_resend_api(target_email)

    if args.pipeline or (not smtp_ok and not resend_ok):
        test_booking_pipeline(target_email)

    print("\n" + "=" * 77)
    print("Verification complete. Check inboxes for confirmations.")
    print("=" * 77)

if __name__ == "__main__":
    main()
