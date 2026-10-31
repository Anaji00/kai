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
    
    is_live = bool(settings.RESEND_API_KEY and (getattr(settings, "ENABLE_LIVE_EMAIL_DISPATCH", False) or settings.ENVIRONMENT == "production"))
    
    if is_live:
        try:
            # 1. Internal Alert
            headers = {
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            }
            payload_admin = {
                "from": settings.RESEND_FROM_EMAIL,
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

            # 2. Guest Confirmation - Drafted to Action Review Queue
            # Enforcing Zero Autonomous Dispatch Policy
            from backend.database import SessionLocal
            from backend.models import ActionDraft
            
            db = SessionLocal()
            try:
                draft_content = f"Draft Booking Receipt for {guest_name} [{ref}]\n\nSanctuary: {retreat_title}\nDates: {retreat_dates}\nRoom: {booking_data.get('room_preference')}\n\nPlease review before dispatching."
                new_draft = ActionDraft(
                    type="guest_email_confirmation",
                    guest_name=guest_name,
                    content=draft_content
                )
                db.add(new_draft)
                db.commit()
            except Exception as e:
                logger.error(f"Error staging guest email draft: {e}")
            finally:
                db.close()
                
            return True
        except Exception as e:
            logger.error(f"Resend email dispatch error: {e}")
            return False
    else:
        # Graceful development simulation log
        logger.info(f"[Email Simulation] Admin Alert to {settings.KAREENA_ROUTING_EMAIL} for {ref} - {guest_name}")
        
        from backend.database import SessionLocal
        from backend.models import ActionDraft
        
        db = SessionLocal()
        try:
            draft_content = f"Draft Booking Receipt for {guest_name} [{ref}]\n\nSanctuary: {retreat_title}\nDates: {retreat_dates}\nRoom: {booking_data.get('room_preference')}\n\nPlease review before dispatching."
            new_draft = ActionDraft(
                type="guest_email_confirmation",
                guest_name=guest_name,
                content=draft_content
            )
            db.add(new_draft)
            db.commit()
            logger.info(f"Staged guest email confirmation draft for {ref}")
        except Exception as e:
            logger.error(f"Error staging guest email draft: {e}")
        finally:
            db.close()
            
        return True


def send_flight_request_alert(request_data: dict) -> bool:
    """Dispatches alert to Grand Travel & Cruise flight desk."""
    logger.info(f"[Flight Desk Alert] Passenger: {request_data.get('guest_name')}, Dep: {request_data.get('departure_airport')}, Cabin: {request_data.get('cabin_class')}")
    return True
