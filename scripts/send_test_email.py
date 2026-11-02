#!/usr/bin/env python3
"""
KAI Wellness Retreats - Email Dispatch & Integration Verification Tool
========================================================================
Tests transactional email delivery via Resend API and validates:
1. Direct API handshake and authentication.
2. Verified sender vs onboarding sandbox domain.
3. Dual-dispatch booking confirmation pipeline (Founder Alert + Guest Receipt).
"""

import os
import sys
import argparse
import requests
from pathlib import Path
from dotenv import load_dotenv

# Ensure root directory is on PYTHONPATH
REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

# Load .env
load_dotenv(dotenv_path=REPO_ROOT / ".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "KAI Sanctuary Reservations <onboarding@resend.dev>")
RESEND_CONCIERGE_FROM_EMAIL = os.getenv("RESEND_CONCIERGE_FROM_EMAIL", "KAI Concierge Desk <onboarding@resend.dev>")
KAREENA_ROUTING_EMAIL = os.getenv("KAREENA_ROUTING_EMAIL", "alessionaji1@gmail.com")
ARMAAN_ROUTING_EMAIL = os.getenv("ARMAAN_ROUTING_EMAIL", "alessionaji1@gmail.com")
ENABLE_LIVE = os.getenv("ENABLE_LIVE_EMAIL_DISPATCH", "false").lower() in ("true", "1", "yes")

BANNER = """
=============================================================================
         KAI WELLNESS RETREATS - TRANSACTIONAL EMAIL TEST SUITE
=============================================================================
"""

def print_config(target_email: str):
    print(BANNER)
    print(f"Target Testing Email:       {target_email}")
    print(f"Kareena Routing Email:      {KAREENA_ROUTING_EMAIL}")
    print(f"Armaan Routing Email:       {ARMAAN_ROUTING_EMAIL}")
    print(f"Sender From Address:        {RESEND_FROM_EMAIL}")
    print(f"Concierge From Address:     {RESEND_CONCIERGE_FROM_EMAIL}")
    print(f"Live Dispatch Enabled:      {ENABLE_LIVE}")
    print(f"Resend API Key Configured:  {'Yes (' + RESEND_API_KEY[:8] + '...)' if RESEND_API_KEY else 'NO (Missing)'}")
    print("=" * 77)

def send_direct_test_email(target_email: str) -> bool:
    print(f"\n[STEP 1] Sending Direct Resend API Test Email to: {target_email}...")
    
    if not RESEND_API_KEY:
        print("[ERROR] RESEND_API_KEY is not set in .env. Please configure it.")
        return False

    html_content = f"""
    <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 36px 32px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 16px; line-height: 1.65;">
        <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 28px; letter-spacing: 6px; text-transform: uppercase; color: #2D3E35; font-weight: 300; display: block;">K A I</span>
            <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E; font-weight: 600;">Sanctuary Travel CRM &bull; Email Delivery Verification</span>
        </div>

        <div style="background-color: #EBF2EC; border: 1px solid #C4DCCE; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 14px; color: #22442B; font-weight: 600;">
                &#10003; Email Integration Online &amp; Operational
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #3C784E;">
                This test confirmation verifies that your Resend API credentials, sender formatting, and recipient delivery are working correctly.
            </p>
        </div>

        <h3 style="font-size: 16px; color: #2D3E35; margin: 0 0 12px 0;">Configuration Details</h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid #E5DDD0;">
                <td style="padding: 8px 0; color: #5C6B5E; width: 40%;"><strong>Delivered To:</strong></td>
                <td style="padding: 8px 0; color: #2D3E35;">{target_email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5DDD0;">
                <td style="padding: 8px 0; color: #5C6B5E;"><strong>Sender Header:</strong></td>
                <td style="padding: 8px 0; color: #2D3E35;">{RESEND_FROM_EMAIL}</td>
            </tr>
            <tr style="border-bottom: 1px solid #E5DDD0;">
                <td style="padding: 8px 0; color: #5C6B5E;"><strong>Founder Routing:</strong></td>
                <td style="padding: 8px 0; color: #2D3E35;">{KAREENA_ROUTING_EMAIL}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #5C6B5E;"><strong>Host Agency Partner:</strong></td>
                <td style="padding: 8px 0; color: #2D3E35;">Grand Travel &amp; Cruise (Funjet 500 Club)</td>
            </tr>
        </table>

        <p style="font-size: 13px; color: #5C6B5E; margin: 0 0 16px 0;">
            Any new guest inquiries from the website booking form will automatically dispatch dual alerts:
        </p>
        <ul style="font-size: 13px; color: #2D3E35; padding-left: 20px; margin: 0 0 24px 0;">
            <li><strong>Staff / Founder Alert</strong> with full medical intake, liability waiver e-signature, and room tier preferences.</li>
            <li><strong>Guest Confirmation Receipt</strong> with booking reference code and 24&ndash;48 hour follow-up expectations.</li>
        </ul>

        <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #738475; text-align: center; margin: 0;">
            KAI Wellness Retreats &bull; Founded by Kareena Islam, BSN, RN &bull; Grand Travel &amp; Cruise
        </p>
    </div>
    """

    payload = {
        "from": RESEND_FROM_EMAIL,
        "to": [target_email],
        "subject": "[KAI Sanctuary Verification] Transactional Email Pipeline Active",
        "html": html_content
    }

    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }

    try:
        res = requests.post(
            "https://api.resend.com/emails",
            json=payload,
            headers=headers,
            timeout=10
        )
        if res.status_code in (200, 201):
            data = res.json()
            email_id = data.get("id")
            print(f"[PASS] Email successfully dispatched via Resend!")
            print(f"       Resend Message ID: {email_id}")
            print(f"       Recipient:         {target_email}")
            print(f"       Sender:            {RESEND_FROM_EMAIL}")
            return True
        else:
            print(f"[FAIL] Resend API rejected the request (HTTP {res.status_code}):")
            print(f"       Error Response: {res.text}")
            _explain_resend_error(res.status_code, res.text)
            return False
    except requests.exceptions.ConnectionError as ce:
        print(f"[CONNECTION ERROR] Could not reach api.resend.com:")
        print(f"   {ce}")
        print("\n   -> NOTE: If running inside a restricted sandbox, outbound network calls are isolated.")
        print("   -> Run this script directly in your PowerShell terminal to send live:")
        print(f"      python scripts/send_test_email.py --to {target_email}")
        return False
    except Exception as e:
        print(f"[EXCEPTION] {e}")
        return False

def _explain_resend_error(status_code: int, response_text: str):
    print("\n" + "-" * 77)
    print("DIAGNOSTIC & RESOLUTION GUIDE:")
    if "domain" in response_text.lower() and "verify" in response_text.lower():
        print("-> DOMAIN UNVERIFIED ISSUE:")
        print("   Your RESEND_FROM_EMAIL is using a domain that hasn't completed DNS verification in Resend.")
        print("   Resolution Options:")
        print("   Option A (Immediate Testing): Change RESEND_FROM_EMAIL in .env to Resend's free sandbox sender:")
        print('      RESEND_FROM_EMAIL="KAI Sanctuary <onboarding@resend.dev>"')
        print("      (Note: onboarding@resend.dev can only deliver to the email you used to register Resend).")
        print("   Option B (Production Domain): Add and verify your custom domain in Resend:")
        print("      1. Visit https://resend.com/domains")
        print("      2. Add your domain (e.g. grandtravelcruise.com or kaiwellnessretreats.com)")
        print("      3. Add the DNS records (DKIM, SPF) to your domain's DNS host (GoDaddy, Cloudflare, etc.).")
    elif status_code == 401 or "api_key" in response_text.lower():
        print("-> INVALID API KEY:")
        print("   The RESEND_API_KEY in your .env was not recognized by Resend.")
        print("   Generate a new key at: https://resend.com/api-keys and paste it into .env.")
    print("-" * 77)

def send_full_booking_pipeline_test(target_email: str) -> bool:
    print(f"\n[STEP 2] Testing Full Booking Intake Pipeline via email_service.py...")
    try:
        from backend.services.email_service import send_booking_confirmation

        test_booking = {
            "reference_code": "KAI-TEST88",
            "retreat_id": "puerto-vallarta-2027",
            "full_name": "Alessio (Test Customer)",
            "email": target_email,
            "phone": "+1 (555) 019-2834",
            "room_preference": "private-suite",
            "movement_experience": "all-levels",
            "passport_valid": "yes-valid-6mo",
            "health_notes": "Testing restorative intake email dispatch pipeline.",
            "intentions": "Restorative relaxation and nervous system decompression.",
            "waiver_signed_by": "Alessio Naji",
            "waiver_signed_at": "Today (Testing Session)"
        }

        test_retreat = {
            "title": "Puerto Vallarta • Sierra Madre Cliffside Sanctuary",
            "dates": "January 28 – 31, 2027"
        }

        result = send_booking_confirmation(test_booking, test_retreat)
        print(f"[PASS] send_booking_confirmation() completed successfully (Result: {result})")
        print(f"       Founder Alert routed to: {_get_founder_list()}")
        print(f"       Guest Confirmation sent to: {target_email}")
        return result
    except Exception as e:
        print(f"[ERROR in booking pipeline]: {e}")
        return False

def _get_founder_list():
    emails = [KAREENA_ROUTING_EMAIL]
    if ARMAAN_ROUTING_EMAIL and ARMAAN_ROUTING_EMAIL not in emails:
        emails.append(ARMAAN_ROUTING_EMAIL)
    return emails

def main():
    parser = argparse.ArgumentParser(description="KAI Sanctuary Email Testing Tool")
    parser.add_argument("--to", default="najialessio1@gmail.com", help="Recipient email for test delivery")
    parser.add_argument("--pipeline", action="store_true", help="Also run the full booking intake pipeline test")
    args = parser.parse_args()

    target_email = args.to
    print_config(target_email)

    success = send_direct_test_email(target_email)
    
    if args.pipeline or success:
        send_full_booking_pipeline_test(target_email)

    print("\n" + "=" * 77)
    print("Test finished. Check your inbox (and spam/promotions folder) at: " + target_email)
    print("=" * 77)

if __name__ == "__main__":
    main()

