import logging
import requests
from backend.config import settings

logger = logging.getLogger("kai_email_service")


def send_booking_confirmation(booking_data: dict, retreat_info: dict) -> bool:
    """
    Dispatches dual notification:
    1. Internal alert to Kareena Islam
    2. Guest confirmation email with KAI booking reference and Grand Travel coordination notes
    """
    ref = booking_data.get("reference_code", "KAI-XXXXX")
    retreat_title = retreat_info.get("title", booking_data.get("retreat_id"))
    retreat_dates = retreat_info.get("dates", "2026–2027 Season")
    guest_email = booking_data.get("email")
    guest_name = booking_data.get("full_name")
    
    if settings.RESEND_API_KEY:
        try:
            # 1. Internal Alert
            headers = {
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            }
            payload_admin = {
                "from": "KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>",
                "to": [settings.KAREENA_ROUTING_EMAIL],
                "subject": f"[New Reservation Inquiry] {retreat_title} - {guest_name} ({ref})",
                "html": f"""
                <div style="font-family: Georgia, serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 12px;">
                    <h2 style="color: #2D3E35; border-bottom: 1px solid #E5DDD0; padding-bottom: 12px;">New Sanctuary Reservation Inquiry</h2>
                    <p><strong>Reference:</strong> {ref}</p>
                    <p><strong>Sanctuary:</strong> {retreat_title}</p>
                    <p><strong>Dates:</strong> {retreat_dates}</p>
                    <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
                    <h3 style="color: #5C6B5E;">Guest Intake:</h3>
                    <p><strong>Name:</strong> {guest_name}</p>
                    <p><strong>Email:</strong> {guest_email}</p>
                    <p><strong>Phone:</strong> {booking_data.get('phone')}</p>
                    <p><strong>Room Tier:</strong> {booking_data.get('room_preference')}</p>
                    <p><strong>Movement Experience:</strong> {booking_data.get('movement_experience')}</p>
                    <p><strong>Passport Status:</strong> {booking_data.get('passport_valid')}</p>
                    <p><strong>Dietary & Health Notes:</strong> {booking_data.get('health_notes') or 'None specified'}</p>
                    <p><strong>Intentions:</strong> {booking_data.get('intentions') or 'None specified'}</p>
                    <hr style="border: none; border-top: 1px solid #E5DDD0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #738475;">KAI Wellness Retreats Engine • Grand Travel & Cruise Partnered</p>
                </div>
                """
            }
            requests.post("https://api.resend.com/emails", json=payload_admin, headers=headers, timeout=5)

            # 2. Guest Confirmation
            payload_guest = {
                "from": "Kareena Islam | KAI Retreats <concierge@kaiwellnessretreats.com>",
                "to": [guest_email],
                "subject": f"Your Sanctuary Inquiry for {retreat_title} [Ref: {ref}]",
                "html": f"""
                <div style="font-family: Georgia, serif; color: #2D3E35; max-width: 600px; margin: 0 auto; padding: 40px; background-color: #FAF7F2; border: 1px solid #E5DDD0; border-radius: 16px; line-height: 1.6;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <span style="font-size: 24px; letter-spacing: 4px; text-transform: uppercase; color: #2D3E35; display: block;">K A I</span>
                        <span style="font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #5C6B5E;">Wellness Retreats</span>
                    </div>
                    <p>Dear {guest_name},</p>
                    <p>Thank you for placing your trust in KAI. Your reservation inquiry for <strong>{retreat_title}</strong> ({retreat_dates}) has been received with warmth and intention.</p>
                    <div style="background-color: #F2ECE4; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #E5DDD0;">
                        <p style="margin: 0; font-size: 15px;"><strong>Sanctuary:</strong> {retreat_title}</p>
                        <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Reference Code:</strong> {ref}</p>
                        <p style="margin: 4px 0 0 0; font-size: 14px;"><strong>Room Tier:</strong> {booking_data.get('room_preference', '').replace('-', ' ').upper()}</p>
                    </div>
                    <p>Because each KAI sanctuary is intentionally capped at 12 to 14 guests, I personally curate every cohort to ensure harmony, safety, and a restorative somatic environment.</p>
                    <p>Over the next 24 to 48 hours, our team (in partnership with Grand Travel & Cruise) will review your intake details and reach out directly to coordinate your flight logistics and finalize your placement.</p>
                    <p style="margin-top: 30px; font-style: italic; color: #5C6B5E;">
                        &ldquo;Kai means renewal in Japanese. A return to balance. To presence. To yourself.&rdquo;
                    </p>
                    <p style="margin-top: 24px;">
                        With gratitude and warm calm,<br />
                        <strong>Kareena Islam</strong><br />
                        <span style="font-size: 13px; color: #738475;">Founder & Clinical Director, KAI Wellness Retreats<br />Grand Travel & Cruise Luxury Advisor</span>
                    </p>
                </div>
                """
            }
            requests.post("https://api.resend.com/emails", json=payload_guest, headers=headers, timeout=5)
            return True
        except Exception as e:
            logger.error(f"Resend email dispatch error: {e}")
            return False
    else:
        # Graceful development simulation log
        logger.info(f"[Email Simulation] Admin Alert to {settings.KAREENA_ROUTING_EMAIL} for {ref} - {guest_name}")
        logger.info(f"[Email Simulation] Guest Confirmation to {guest_email} for {ref}")
        return True


def send_flight_request_alert(request_data: dict) -> bool:
    """Dispatches alert to Grand Travel & Cruise flight desk."""
    logger.info(f"[Flight Desk Alert] Passenger: {request_data.get('guest_name')}, Dep: {request_data.get('departure_airport')}, Cabin: {request_data.get('cabin_class')}")
    return True
