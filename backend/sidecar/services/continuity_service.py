import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, timezone

from backend.sidecar.models import StagingIntake

logger = logging.getLogger("kai_continuity_service")


def generate_continuity_milestones(
    intake: StagingIntake,
    departure_date: Optional[datetime] = None
) -> List[Dict[str, Any]]:
    """
    Generates a bespoke 4-phase milestone arc for post-retreat nervous system
    and wellness integration following sanctuary departure.
    All milestones are staged as ActionDrafts awaiting founder authorization (Zero Autonomous Writes).
    """
    base_date = departure_date or datetime.now(timezone.utc)
    guest_name = intake.client_name or "Honored Guest"
    sanctuary_slug = intake.sanctuary_slug or "nosara"
    sanctuary_display = sanctuary_slug.replace("-", " ").title()
    wellness_profile = intake.wellness_profile or {}
    primary_focus = wellness_profile.get(
        "primary_focus", "Nervous system decompression and circadian renewal"
    )
    nutrition_pref = wellness_profile.get(
        "nutrition_preferences", "Anti-inflammatory Blue Zone botanicals"
    )

    milestones = [
        # Milestone 1: Day 3
        {
            "day": 3,
            "title": f"Day 3 Grounding & Somatic Decompression - {sanctuary_display}",
            "theme": "Somatic Re-Entry & Nervous System Anchoring",
            "scheduled_date": (base_date + timedelta(days=3)).strftime("%Y-%m-%d"),
            "delivery_channel": "email",
            "content": (
                f"Dearest {guest_name},\n\n"
                f"It has been three days since your departure from the tranquil canopy of KAI {sanctuary_display}. "
                f"As you transition back into your home rhythm, your nervous system is actively integrating "
                f"the restorative stillness you cultivated here.\n\n"
                f"Your 3-Day Somatic Re-Entry Anchor:\n"
                f"- Morning Prana Sequence: 5 minutes of box breathing (4s in, 4s hold, 4s out, 4s hold) before checking screens.\n"
                f"- Hydration Recalibration: Warm structured spring water with fresh citrus and pinch of pink salt upon waking.\n"
                f"- Evening Boundary: 30 minutes of low-lux amber lighting before sleep to preserve your circadian melatonin cycle.\n\n"
                f"Remember: the stillness you discovered in {sanctuary_display} was not outside of you—it is your natural baseline.\n\n"
                f"With grounding warmth,\n\n"
                f"Kareena Islam\nFounder & Restorative Curator | KAI Wellness Retreats"
            ),
            "content_preview": "Morning box breathing anchor, hydration recalibration, and low-lux circadian sleep preservation."
        },
        # Milestone 2: Day 7
        {
            "day": 7,
            "title": f"Day 7 Blue Zone Pantry & Botanical Nutrition - {sanctuary_display}",
            "theme": "Cellular Longevity & Anti-Inflammatory Culinary Rituals",
            "scheduled_date": (base_date + timedelta(days=7)).strftime("%Y-%m-%d"),
            "delivery_channel": "email",
            "content": (
                f"Dearest {guest_name},\n\n"
                f"One week into your post-sanctuary journey, we want to help you bring the restorative kitchen "
                f"of KAI {sanctuary_display} into your own home sanctuary.\n\n"
                f"Based on your wellness focus ({primary_focus}) and preference for {nutrition_pref.lower()}, "
                f"our executive holistic chef has prepared your personalized Home Pantry Guide:\n\n"
                f"1. Morning Golden Elixir: Fresh turmeric, ginger root, cold-pressed raw coconut water, and cracked black pepper.\n"
                f"2. Blue Zone Whole Bowl: Steamed leafy greens, roasted heirloom squash, toasted pepitas, and cold-pressed unfiltered olive oil.\n"
                f"3. Evening Calming Infusion: Organic chamomile, passionflower, and lemon balm steep 1 hour prior to sleep.\n\n"
                f"Nourish the cellular calm you seeded during your time with us.\n\n"
                f"In vitality,\n\n"
                f"Kareena Islam\nFounder & Restorative Curator | KAI Wellness Retreats"
            ),
            "content_preview": "Personalized Blue Zone anti-inflammatory recipes, morning golden elixir, and evening herbal infusions."
        },
        # Milestone 3: Day 14
        {
            "day": 14,
            "title": f"Day 14 432Hz Sound Immersion & Circadian Sanctuary - {sanctuary_display}",
            "theme": "Acoustic Nervous System Reset & Deep Delta Restoration",
            "scheduled_date": (base_date + timedelta(days=14)).strftime("%Y-%m-%d"),
            "delivery_channel": "email",
            "content": (
                f"Dearest {guest_name},\n\n"
                f"Two weeks post-departure, executive pace and modern demands often attempt to elevate stress and cortisol levels. "
                f"To keep your restorative blueprint intact, we are gifting you direct access to our private sanctuary audio vault.\n\n"
                f"Your 14-Day Acoustic Immersion:\n"
                f"- 432Hz Tibetan Singing Bowls & Forest Canopy Resonance (Recorded live in {sanctuary_display})\n"
                f"- Protocol: Listen with over-ear headphones in horizontal repose for 20 minutes at sunset or directly before sleep.\n"
                f"- Measurable Impact: Clinically observed to synchronize bilateral brain hemispheres and promote restorative vagal tone.\n\n"
                f"Recline, close your eyes, and return to the serene stillness of the sanctuary.\n\n"
                f"In deep harmony,\n\n"
                f"Kareena Islam\nFounder & Restorative Curator | KAI Wellness Retreats"
            ),
            "content_preview": "Private 432Hz sanctuary acoustic audio vault, vagal nerve restoration, and sunset listening protocol."
        },
        # Milestone 4: Day 28
        {
            "day": 28,
            "title": f"Day 28 Priority Circle Invitation & Sanctuary Horizon - {sanctuary_display}",
            "theme": "Long-Term Integration & Returning Guests Sanctuary Privileges",
            "scheduled_date": (base_date + timedelta(days=28)).strftime("%Y-%m-%d"),
            "delivery_channel": "email",
            "content": (
                f"Dearest {guest_name},\n\n"
                f"As you complete your first 30 days of post-sanctuary integration, I want to celebrate the intentional commitment "
                f"you have shown toward your health, circadian rhythm, and inner quietude.\n\n"
                f"Because you have walked the KAI path, it is my privilege to welcome you into the KAI Priority Circle:\n"
                f"- Exclusive Returning Guests Window: 7-day advance booking window for our limited 14-guest retreats in Amalfi Coast, Bali, and Nosara.\n"
                f"- Dedicated Travel Concierge: Complimentary Lie-Flat upgrade search and private tarmac coordination via Grand Travel & Cruise.\n"
                f"- Grandfathered Sanctuary Rates: Guaranteed preferred pricing on all oceanfront villas across 2026-2027 seasons.\n\n"
                f"Whenever your spirit calls for deep restorative renewal once again, your sanctuary villa is waiting.\n\n"
                f"With profound gratitude,\n\n"
                f"Kareena Islam\nFounder & Restorative Curator | KAI Wellness Retreats"
            ),
            "content_preview": "KAI Priority Circle invitation, 7-day advance retreat booking, and Grand Travel flight concierge perks."
        }
    ]

    return milestones
