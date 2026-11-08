import logging
from sqlalchemy.orm import Session
from backend.models import ActionDraft

logger = logging.getLogger("kai_automation_generators")

def generate_flight_chauffeur_draft(db: Session, guest_name: str, flight_details: str):
    content = f"URGENT: Flight delay detected for {guest_name}. {flight_details}\n\nPlease adjust private tarmac pickup by +2 hours."
    draft = ActionDraft(
        type="flight_delay_chauffeur_update",
        guest_name=guest_name,
        content=content
    )
    db.add(draft)
    db.commit()
    logger.info(f"Generated flight draft for {guest_name}")

def generate_whatsapp_concierge_draft(db: Session, guest_name: str, intention: str):
    content = f"Hi {guest_name},\n\nWe saw your intention for the retreat was '{intention}'. The Founder has prepared a specific 432Hz track for you tonight to help with this. Also, your Grand Travel private chauffeur has confirmed your private pickup for tomorrow morning's excursion. Let us know how you sleep!"
    draft = ActionDraft(
        type="whatsapp_concierge",
        guest_name=guest_name,
        content=content
    )
    db.add(draft)
    db.commit()
    logger.info(f"Generated whatsapp draft for {guest_name}")

def generate_packing_dossier_draft(db: Session, guest_name: str, location: str):
    content = f"Pre-Arrival Packing Concierge for {guest_name}\nDestination: {location}\n\n- Passport (Required for your Grand Travel international flights)\n- Organic linen layers (evenings can be cool)\n- 2 bathing suits (for hydrotherapy)\n- The acoustic earplugs we recommended during intake have already been placed in your suite.\n\nYour lie-flat seating and VIP tarmac transfers are fully confirmed."
    draft = ActionDraft(
        type="packing_dossier",
        guest_name=guest_name,
        content=content
    )
    db.add(draft)
    db.commit()
    logger.info(f"Generated packing draft for {guest_name}")

def generate_post_retreat_integration_draft(db: Session, guest_name: str):
    content = f"Dear {guest_name},\n\nIt has been two weeks since you returned from the sanctuary. As part of your integration protocol, we recommend scheduling your follow-up telehealth session with Kareena.\n\nAdditionally, our Grand Travel desk has noted your interest in future wellness journeys, and we have placed a complimentary hold on priority business class routing for our upcoming 2027 escapes.\n\nBooking Link: [Calendar Link]\n\nWarmly,\nKAI Concierge"
    draft = ActionDraft(
        type="post_retreat_integration",
        guest_name=guest_name,
        content=content
    )
    db.add(draft)
    db.commit()
    logger.info(f"Generated post-retreat draft for {guest_name}")


def simulate_flight_status_check(db: Session, flight_number: str = "AF 066", guest_name: str = "Elena Rostova", delay_minutes: int = 45):
    """
    Simulates Cirium/FlightAware radar polling. If a delay or schedule change is detected,
    it stages an ActionDraft(type='flight_delay_chauffeur_update') for Founder authorization
    to notify Grand Travel flight desk and update tarmac chauffeur dispatch.
    """
    content = (
        f"FLIGHT STATUS ALERT: {flight_number} for {guest_name} is delayed by {delay_minutes} minutes. "
        f"New ETA: Updated schedule received from Cirium flight radar. "
        f"Grand Travel & Cruise flight desk has reserved alternative connections. "
        f"Action: Adjust private tarmac chauffeur pickup window and send SMS/WhatsApp update to guest."
    )
    draft = ActionDraft(
        type="flight_delay_chauffeur_update",
        guest_name=guest_name,
        content=content
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    logger.info(f"Staged flight_delay_chauffeur_update draft {draft.id} for {guest_name} ({flight_number})")
    return draft


def generate_guest_companion_invitation_draft(
    db: Session,
    guest_name: str,
    email: str,
    phone: str | None,
    portal_url: str,
    sanctuary_name: str,
    sanctuary_slug: str = "nosara",
) -> ActionDraft:
    """
    Generates a personalized sanctuary companion invitation draft for Founder Kareena Islam
    to review and authorize in /portal/drafts (Zero Autonomous Writes).
    """
    first_name = guest_name.split()[0] if guest_name else "Guest"
    content = (
        f"Dearest {first_name},\n\n"
        f"Nurse Kareena here. We have finalized your sanctuary preparations for {sanctuary_name}.\n\n"
        f"Your private Sanctuary Companion is ready:\n"
        f"{portal_url}\n\n"
        f"Inside, you will find your live sanctuary weather, private chauffeur meeting instructions, "
        f"curated packing checklist, daily restorative schedule, and our 432Hz sleep sound player. "
        f"You can also add any flight gate or arrival changes directly.\n\n"
        f"We hold this space for your deepest rest.\n\n"
        f"With warmth,\nKareena Islam, RN | KAI Wellness Retreats"
    )
    draft = ActionDraft(
        type="guest_companion_invitation",
        guest_name=guest_name,
        recipient_email=email,
        recipient_phone=phone,
        content=content
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    logger.info(f"Staged guest_companion_invitation draft {draft.id} for {guest_name}")
    return draft


def generate_guest_flight_update_draft(
    db: Session,
    guest_name: str,
    flight_number: str,
    delay_minutes: int,
    gate: str | None = None,
    notes: str | None = None,
    phone: str | None = None,
) -> ActionDraft:
    """
    Stages an ActionDraft when a guest reports a flight delay or gate change via their companion PWA.
    Awaiting Kareena's 1-click approval to notify Grand Travel air desk and dispatch tarmac chauffeur.
    """
    gate_info = f" (Gate {gate})" if gate else ""
    notes_info = f"\nGuest Notes: {notes}" if notes else ""
    content = (
        f"GUEST FLIGHT UPDATE (via Sanctuary Companion):\n"
        f"Guest: {guest_name}\n"
        f"Flight: {flight_number}{gate_info}\n"
        f"Reported Delay: {delay_minutes} minutes\n"
        f"{notes_info}\n\n"
        f"Action Required: Approve to notify Grand Travel chauffeur dispatch to adjust pickup window by +{delay_minutes} min."
    )
    draft = ActionDraft(
        type="flight_delay_chauffeur_update",
        guest_name=guest_name,
        recipient_phone=phone,
        content=content
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    logger.info(f"Staged flight update draft {draft.id} for guest {guest_name}")
    return draft


def generate_culinary_refinement_draft(
    db: Session,
    guest_name: str,
    dietary_tags: list,
    allergies: str | None = None,
    special_chef_notes: str | None = None,
) -> ActionDraft:
    """
    Stages an ActionDraft when a guest refines their dietary preferences or food allergies.
    Awaiting Kareena's 1-click clinical approval to brief the villa private chef.
    """
    tags_str = ", ".join(dietary_tags) if dietary_tags else "Standard Ayurvedic / Blue Zone"
    allergies_str = f"\nSevere Allergies: {allergies}" if allergies else ""
    notes_str = f"\nChef Instructions: {special_chef_notes}" if special_chef_notes else ""
    content = (
        f"CLINICAL CULINARY REFINEMENT:\n"
        f"Guest: {guest_name}\n"
        f"Dietary Preferences: {tags_str}\n"
        f"{allergies_str}{notes_str}\n\n"
        f"Action Required: 1-click approval updates guest wellness profile and briefs the villa executive chef."
    )
    draft = ActionDraft(
        type="clinical_dietary_refinement",
        guest_name=guest_name,
        content=content
    )
    db.add(draft)
    db.commit()
    db.refresh(draft)
    logger.info(f"Staged culinary refinement draft {draft.id} for guest {guest_name}")
    return draft

