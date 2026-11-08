import html
import logging
import requests
from typing import Dict, Any, List
from backend.config import settings

logger = logging.getLogger("kai_email_service")

ROOM_LABELS = {
    "private-suite": "Private Luxury Suite (Single Occupancy)",
    "shared-luxury": "Shared Ocean Villa (Double Occupancy)",
    "flexible": "Flexible / First Available Tier",
}

MOVEMENT_LABELS = {
    "all-levels": "All Levels (Balanced Somatic & Mobility)",
    "gentle-beginner": "Beginner (Gentle, Restorative Focus)",
    "experienced": "Consistent Practice (Vinyasa / Yin / Endurance)",
    "healing-injury": "Recovering from physical strain or injury",
}



def _send_smtp_email(to_emails: List[str], subject: str, html_content: str, display_name: str = "KAI Sanctuary Reservations") -> bool:
    import smtplib
    import ssl
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.utils import formataddr

    if not (settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD):
        return False

    from_header = formataddr((display_name, settings.SMTP_USER))

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = from_header
        msg["To"] = ", ".join(to_emails)
        msg.attach(MIMEText(html_content, "html"))

        tls_context = ssl.create_default_context()
        if settings.SMTP_PORT == 465:
            smtp_client = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12, context=tls_context)
        else:
            smtp_client = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
        with smtp_client as server:
            if settings.SMTP_USE_TLS and settings.SMTP_PORT != 465:
                server.starttls(context=tls_context)
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, to_emails, msg.as_string())
        logger.info(f"[SMTP Live] Dispatched email to {to_emails} via {settings.SMTP_HOST} (From: {from_header})")
        return True
    except Exception as e:
        logger.error(f"[SMTP Error] Failed sending to {to_emails} via {settings.SMTP_HOST}: {e}")
        return False

def _get_founder_recipients() -> List[str]:
    return list(
        getattr(
            settings,
            "FOUNDER_INQUIRY_EMAILS",
            ["kareena@grandtravelcruise.com", "armaan@grandtravelcruise.com"],
        )
    )


def send_booking_confirmation(booking_data: dict, retreat_info: dict) -> bool:
    # Guest-supplied text goes into HTML email bodies below, so neutralize markup first.
    booking_data = {k: html.escape(v, quote=False) if isinstance(v, str) else v for k, v in booking_data.items()}
    """
    Dispatches dual confirmation emails:
    1. Internal Founder Alert: Routed simultaneously to kareena@grandtravelcruise.com & armaan@grandtravelcruise.com
       with full guest intake, clinical notes, room preferences, and verified electronic waiver signature.
    2. Guest Confirmation Email: Delivered directly to the guest's inbox with booking reference code,
       reservation summary, waiver verification, and personal founder follow-up expectations.
    """
    ref = booking_data.get("reference_code", "KAI-XXXXX")
    retreat_title = retreat_info.get("title", booking_data.get("retreat_id", "Sanctuary Retreat"))
    retreat_dates = retreat_info.get("dates", "January 28 – 31, 2027")
    guest_email = booking_data.get("email")
    guest_name = booking_data.get("full_name") or "Sanctuary Guest"
    phone = booking_data.get("phone", "Not provided")
    room_pref_raw = booking_data.get("room_preference", "private-suite")
    room_pref = ROOM_LABELS.get(room_pref_raw, room_pref_raw)
    movement_raw = booking_data.get("movement_experience", "all-levels")
    movement_exp = MOVEMENT_LABELS.get(movement_raw, movement_raw)
    passport_status = booking_data.get("passport_valid", "Verified Valid")
    health_notes = booking_data.get("health_notes") or "None specified"
    intentions = booking_data.get("intentions") or "None specified"
    waiver_signed_by = booking_data.get("waiver_signed_by") or guest_name
    waiver_signed_at = booking_data.get("waiver_signed_at") or "Verified on Submission"

    founder_recipients = _get_founder_recipients()

    is_live = bool(
        settings.RESEND_API_KEY
        and (
            getattr(settings, "ENABLE_LIVE_EMAIL_DISPATCH", False)
            or settings.ENVIRONMENT == "production"
        )
    )

    from_admin = settings.RESEND_FROM_EMAIL or "KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>"
    from_concierge = (
        settings.RESEND_CONCIERGE_FROM_EMAIL
        or settings.RESEND_FROM_EMAIL
        or "KAI Concierge Desk <concierge@kaiwellnessretreats.com>"
    )

    # -------------------------------------------------------------
    # 1. Internal Founder Alert Email Payload
    # -------------------------------------------------------------
    admin_html = f"""
    <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 640px; margin: 0 auto; padding: 32px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px; line-height: 1.6;">
        <div style="border-bottom: 1px solid #E5DDD0; padding-bottom: 16px; margin-bottom: 20px;">
            <span style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E; font-weight: 600;">KAI Sanctuary Reservation Desk</span>
            <h2 style="color: #2D3E35; margin: 4px 0 0 0; font-size: 24px; font-weight: normal;">New Sanctuary Reservation Inquiry</h2>
        </div>

        <p style="font-size: 14px; margin: 0 0 16px 0;">
            A new guest has submitted a reservation inquiry and signed the liability waiver. Details below:
        </p>

        <div style="background-color: #F2ECE4; padding: 18px; border-radius: 8px; border: 1px solid #E5DDD0; margin-bottom: 20px; font-size: 13px;">
            <p style="margin: 0 0 6px 0;"><strong>Reference Code:</strong> {ref}</p>
            <p style="margin: 0 0 6px 0;"><strong>Sanctuary:</strong> {retreat_title}</p>
            <p style="margin: 0 0 6px 0;"><strong>Dates:</strong> {retreat_dates}</p>
            <p style="margin: 0;"><strong>Suite Preference:</strong> {room_pref}</p>
        </div>

        <h3 style="color: #5C6B5E; font-size: 16px; margin: 20px 0 10px 0; border-bottom: 1px solid #E5DDD0; padding-bottom: 6px;">Guest Details &amp; Movement Tier:</h3>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Full Legal Name:</strong> {guest_name}</p>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Email:</strong> <a href="mailto:{guest_email}" style="color: #C07D63;">{guest_email}</a></p>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Phone:</strong> {phone}</p>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Movement Experience:</strong> {movement_exp}</p>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Passport Status:</strong> {passport_status}</p>

        <h3 style="color: #5C6B5E; font-size: 16px; margin: 20px 0 10px 0; border-bottom: 1px solid #E5DDD0; padding-bottom: 6px;">Dietary, Health &amp; Intentions:</h3>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Dietary Requirements &amp; Health:</strong> {health_notes}</p>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Personal Intention:</strong> {intentions}</p>

        <h3 style="color: #C07D63; font-size: 16px; margin: 20px 0 10px 0; border-bottom: 1px solid #E5DDD0; padding-bottom: 6px;">Legal Release of Liability:</h3>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Electronic Signature:</strong> {waiver_signed_by}</p>
        <p style="font-size: 13px; margin: 4px 0;"><strong>Timestamp:</strong> {waiver_signed_at}</p>
        <p style="font-size: 12px; color: #5C6B5E; margin: 4px 0;">Assumption of Risk &amp; Release of Liability Waiver accepted.</p>

        <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 24px 0;" />
        <p style="font-size: 11px; color: #738475; margin: 0;">
            Routed directly to <strong>kareena@grandtravelcruise.com</strong> &amp; <strong>armaan@grandtravelcruise.com</strong>.
            This inquiry is staged in the Concierge Portal for personal review.
        </p>
    </div>
    """

    # -------------------------------------------------------------
    # 2. Guest Confirmation Email Payload
    # -------------------------------------------------------------
    guest_html = f"""
    <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 640px; margin: 0 auto; padding: 36px 32px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 16px; line-height: 1.65;">
        <div style="text-align: center; margin-bottom: 28px;">
            <span style="font-size: 26px; letter-spacing: 5px; text-transform: uppercase; color: #2D3E35; display: block; font-weight: 300;">K A I</span>
            <span style="font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: #5C6B5E; font-weight: 600;">Wellness Retreats &bull; Where Your Peace Within Can Blend With The Pieces Around</span>
        </div>

        <p style="font-size: 16px; margin: 0 0 16px 0;">Dear {guest_name},</p>

        <p style="font-size: 14px; margin: 0 0 20px 0; color: #2D3E35;">
            Thank you for placing your trust in KAI Wellness Retreats. Your reservation inquiry for <strong>{retreat_title}</strong> ({retreat_dates}) has been delivered directly to <strong>Kareena Islam</strong> and <strong>Armaan Islam</strong>.
        </p>

        <div style="background-color: #F2ECE4; padding: 22px; border-radius: 12px; margin: 24px 0; border: 1px solid #E5DDD0; font-size: 14px;">
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #5C6B5E; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">Sanctuary Reservation Inquiry Summary</p>
            <p style="margin: 0 0 6px 0;"><strong>Sanctuary:</strong> {retreat_title}</p>
            <p style="margin: 0 0 6px 0;"><strong>Dates:</strong> {retreat_dates}</p>
            <p style="margin: 0 0 6px 0;"><strong>Booking Reference:</strong> <span style="font-family: monospace; font-size: 15px; color: #C07D63; font-weight: bold;">{ref}</span></p>
            <p style="margin: 0 0 6px 0;"><strong>Suite Preference:</strong> {room_pref}</p>
            <p style="margin: 0;"><strong>Liability Waiver Verified:</strong> E-Signed by {waiver_signed_by}</p>
        </div>

        <h3 style="font-size: 15px; color: #5C6B5E; margin: 24px 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">What Happens Next</h3>
        <p style="font-size: 14px; margin: 0 0 14px 0; color: #2D3E35;">
            Over the next 24 to 48 hours, Kareena and Armaan will personally review your dietary requirements, movement preferences, and personal intentions to coordinate your suite placement and discuss your restorative itinerary.
        </p>

        <div style="background-color: #FAF7F2; padding: 16px; border-left: 3px solid #C07D63; border-radius: 4px; margin: 20px 0; font-size: 13px; color: #5C6B5E;">
            <strong>Grand Travel &amp; Cruise Flight Desk:</strong> Need preferred group air rates, lie-flat seating, or private airport chauffeur coordination? Our dedicated luxury travel concierge is available to assist you without any third-party ticketing markups.
        </div>

        <p style="font-size: 14px; margin: 20px 0 0 0; color: #2D3E35;">
            If you have any immediate questions, reply directly to this email or reach us at <a href="mailto:kareena@grandtravelcruise.com" style="color: #C07D63;">kareena@grandtravelcruise.com</a> &amp; <a href="mailto:armaan@grandtravelcruise.com" style="color: #C07D63;">armaan@grandtravelcruise.com</a>.
        </p>

        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E5DDD0;">
            <p style="font-size: 14px; margin: 0; color: #2D3E35;">
                With gratitude and warm calm,<br />
                <strong style="color: #2D3E35;">Kareena Islam, BSN, RN, RYT &amp; Armaan Islam</strong><br />
                <span style="font-size: 12px; color: #738475;">Co-Founders, KAI Wellness Retreats &bull; Grand Travel &amp; Cruise</span>
            </p>
        </div>
    </div>
    """

    success_admin = False
    success_guest = False

    if is_live:
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        }

        # 1. Dispatch Internal Founder Alert
        if settings.SMTP_HOST:
            success_admin = _send_smtp_email(founder_recipients, f"[New KAI Inquiry] {retreat_title} - {guest_name} ({ref})", admin_html, display_name="KAI Sanctuary Reservations")
        if not success_admin:
            try:
                payload_admin = {
                    "from": from_admin,
                    "to": founder_recipients,
                    "subject": f"[New KAI Inquiry] {retreat_title} - {guest_name} ({ref})",
                    "html": admin_html,
                }
                res_admin = requests.post(
                    "https://api.resend.com/emails",
                    json=payload_admin,
                    headers=headers,
                    timeout=8,
                )
                if res_admin.status_code in (200, 201):
                    success_admin = True
                    logger.info(f"[Resend Live] Founder Alert dispatched to {founder_recipients} for {ref} (ID: {res_admin.json().get('id')})")
                else:
                    logger.error(f"[Resend Error] Founder Alert failed ({res_admin.status_code}): {res_admin.text[:300]}")
            except Exception as e:
                logger.error(f"[Resend Exception] Error sending founder alert for {ref}: {e}")

        # 2. Dispatch Guest Confirmation Email
        if guest_email:
            if settings.SMTP_HOST:
                success_guest = _send_smtp_email([guest_email], f"Your KAI Sanctuary Reservation Inquiry for {retreat_title} [Ref: {ref}]", guest_html, display_name="KAI Concierge Desk")
            if not success_guest:
                try:
                    payload_guest = {
                        "from": from_concierge,
                        "to": [guest_email],
                        "subject": f"Your KAI Sanctuary Reservation Inquiry for {retreat_title} [Ref: {ref}]",
                        "html": guest_html,
                    }
                    res_guest = requests.post(
                        "https://api.resend.com/emails",
                        json=payload_guest,
                        headers=headers,
                        timeout=8,
                    )
                    if res_guest.status_code in (200, 201):
                        success_guest = True
                        logger.info(f"[Resend Live] Guest Confirmation Email dispatched to {guest_email} for {ref} (ID: {res_guest.json().get('id')})")
                    else:
                        logger.error(f"[Resend Error] Guest Confirmation failed ({res_guest.status_code}): {res_guest.text[:300]}")
                        # Customer confirmation delivery fallback:
                        if founder_recipients and settings.ENVIRONMENT != "production":
                            mirror_payload = {
                                "from": "KAI Concierge Desk <onboarding@resend.dev>",
                                "to": founder_recipients,
                                "subject": f"[CUSTOMER CONFIRMATION: {guest_email}] Your KAI Reservation for {retreat_title} [Ref: {ref}]",
                                "html": f'''
                                    <div style="background-color: #FFF3CD; border: 1px solid #FFEEBA; color: #856404; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px; font-family: sans-serif; font-size: 13px; line-height: 1.5;">
                                        <strong>Customer Delivery Notice:</strong> In production with your verified domain (<code>kaiwellnessretreats.com</code>), this confirmation is delivered directly to the customer (<code>{guest_email}</code>). In testing sandbox mode, Resend delivers this customer copy here to <code>{founder_recipients[0]}</code> so you can review the exact layout and reference code.
                                    </div>
                                ''' + guest_html,
                            }
                            mirror_res = requests.post("https://api.resend.com/emails", json=mirror_payload, headers=headers, timeout=8)
                            if mirror_res.status_code in (200, 201):
                                logger.info(f"[Resend Fallback] Delivered customer confirmation preview to {founder_recipients} for {guest_email}")
                except Exception as e:
                    logger.error(f"[Resend Exception] Error sending guest confirmation to {guest_email}: {e}")
    else:
        # Simulated Dispatch (development or API key absent)
        logger.info(
            f"[Email Simulation] Founder Alert routed to {founder_recipients} for {ref} - {guest_name} ({retreat_title})"
        )
        if guest_email:
            logger.info(
                f"[Email Simulation] Guest Confirmation dispatched to {guest_email} [Ref: {ref}] for {retreat_title}"
            )
        success_admin = True
        success_guest = True

    # 3. Stage ActionDraft for CRM Audit and Review
    try:
        from backend.database import SessionLocal
        from backend.models import ActionDraft

        db = SessionLocal()
        try:
            draft_content = (
                f"Guest Sanctuary Confirmation for {guest_name} [{ref}]\n"
                f"Sanctuary: {retreat_title}\n"
                f"Dates: {retreat_dates}\n"
                f"Suite Preference: {room_pref}\n"
                f"Waiver Verified: {waiver_signed_by} ({waiver_signed_at})\n"
                f"Recipient: {guest_email}\n"
                f"Delivery Status: {'Dispatched via Resend' if success_guest and is_live else 'Simulated / Staged'}\n\n"
                f"Notice: Kareena and Armaan will personally reach out within 24–48 hours."
            )
            new_draft = ActionDraft(
                type="guest_email_confirmation",
                guest_name=guest_name,
                recipient_email=guest_email,
                content=draft_content,
                status="sent" if success_guest and is_live else "pending_review",
            )
            db.add(new_draft)
            db.commit()
            logger.info(f"Recorded guest email confirmation draft for {ref} (status={new_draft.status})")
        except Exception as e:
            logger.error(f"Error staging guest email draft: {e}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database error while staging email draft: {e}")

    return success_admin or success_guest


def send_flight_request_alert(request_data: dict) -> bool:
    """
    Dispatches flight coordination alerts:
    1. Grand Travel & Cruise Flight Desk Alert: routed to kareena@grandtravelcruise.com & armaan@grandtravelcruise.com
    2. Guest Flight Request Receipt Confirmation: delivered to guest's email.
    """
    guest_name = request_data.get("guest_name", "Sanctuary Guest")
    guest_email = request_data.get("email")
    dep_airport = request_data.get("departure_airport", "TBD")
    cabin_class = request_data.get("cabin_class", "business")
    pref_airline = request_data.get("preferred_airline") or "Host Agency Preferred Partner"
    special_requests = request_data.get("special_requests") or "None specified"
    booking_ref = request_data.get("booking_reference") or "Direct Flight Inquiry"

    founder_recipients = _get_founder_recipients()

    is_live = bool(
        settings.RESEND_API_KEY
        and (
            getattr(settings, "ENABLE_LIVE_EMAIL_DISPATCH", False)
            or settings.ENVIRONMENT == "production"
        )
    )

    from_concierge = (
        settings.RESEND_CONCIERGE_FROM_EMAIL
        or settings.RESEND_FROM_EMAIL
        or "Grand Travel Flight Desk <concierge@kaiwellnessretreats.com>"
    )

    # Internal Flight Desk Alert HTML
    desk_html = f"""
    <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 28px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px;">
        <span style="font-size: 11px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E; font-weight: 600;">Grand Travel &amp; Cruise Flight Desk</span>
        <h2 style="color: #2D3E35; margin: 6px 0 16px 0; font-size: 22px;">New VIP Flight &amp; Transfer Request</h2>
        <p><strong>Passenger:</strong> {guest_name}</p>
        <p><strong>Email:</strong> {guest_email}</p>
        <p><strong>Departure Airport:</strong> {dep_airport}</p>
        <p><strong>Cabin Class:</strong> {cabin_class.title()}</p>
        <p><strong>Preferred Airline:</strong> {pref_airline}</p>
        <p><strong>Booking Reference:</strong> {booking_ref}</p>
        <p><strong>Special Requests:</strong> {special_requests}</p>
        <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 18px 0;" />
        <p style="font-size: 11px; color: #738475;">Funjet 500 Club Host Agency Desk &bull; Grand Travel &amp; Cruise</p>
    </div>
    """

    # Guest Flight Confirmation HTML
    guest_html = f"""
    <div style="font-family: 'Georgia', serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 14px; line-height: 1.6;">
        <span style="font-size: 22px; letter-spacing: 4px; text-transform: uppercase; color: #2D3E35; display: block;">K A I</span>
        <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E; font-weight: 600;">Grand Travel &amp; Cruise Flight Desk</span>
        <h3 style="font-size: 18px; margin: 16px 0 8px 0; color: #2D3E35;">Your VIP Flight Request Has Been Received</h3>
        <p>Dear {guest_name},</p>
        <p>We have received your flight and private ground transfer request departing from <strong>{dep_airport}</strong> ({cabin_class.title()} class).</p>
        <p>Our dedicated luxury concierge at Grand Travel &amp; Cruise will review airline schedules and reach out within 24 hours with preferred routing and group contract pricing.</p>
        <p style="margin-top: 24px;">
            Warm regards,<br />
            <strong>Grand Travel &amp; Cruise Flight Concierge</strong><br />
            <span style="font-size: 12px; color: #738475;">In partnership with KAI Wellness Retreats</span>
        </p>
    </div>
    """

    if is_live:
        headers = {
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        }
        try:
            requests.post(
                "https://api.resend.com/emails",
                json={
                    "from": from_concierge,
                    "to": founder_recipients,
                    "subject": f"[Grand Travel Flight Desk] VIP Request: {guest_name} ({dep_airport})",
                    "html": desk_html,
                },
                headers=headers,
                timeout=8,
            )
        except Exception as e:
            logger.error(f"Error sending flight alert to desk: {e}")

        if guest_email:
            try:
                requests.post(
                    "https://api.resend.com/emails",
                    json={
                        "from": from_concierge,
                        "to": [guest_email],
                        "subject": f"Your VIP Flight Coordination Request - Grand Travel & Cruise [Ref: {booking_ref or dep_airport}]",
                        "html": guest_html,
                    },
                    headers=headers,
                    timeout=8,
                )
            except Exception as e:
                logger.error(f"Error sending flight confirmation to {guest_email}: {e}")
    else:
        logger.info(
            f"[Flight Desk Simulation] Desk Alert to {founder_recipients} & Guest Receipt to {guest_email} ({dep_airport}, {cabin_class})"
        )

    return True
