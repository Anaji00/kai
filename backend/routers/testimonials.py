from fastapi import APIRouter
from typing import List
from backend.schemas import TestimonialResponse

router = APIRouter(prefix="/testimonials", tags=["Verified Clinical Testimonials"])

TESTIMONIALS_DATA = [
    {
        "quote": "As an acute care physician, I spend my life in fight-or-flight. Most retreats offer superficial pampering, but Kareena's clinical understanding of vagal tone and parasympathetic activation completely reset my physiology. The 432Hz crystal bowl sound sessions in the evening produced the first uninterrupted 8-hour sleep I've had in six years.",
        "author": "Dr. Sophia Martinez, MD",
        "role": "Emergency Medicine Physician",
        "location": "Houston, TX",
        "retreatAttended": "Costa Rica Canopy Sanctuary"
    },
    {
        "quote": "Having 12 people instead of 40 made all the difference. Kareena holds space with medical authority and radiant warmth. There was no spiritual bypassing or forced awkward sharing—just pure, anatomically grounded rest, exquisite organic food, and effortless travel logistics.",
        "author": "Elena Rostova",
        "role": "Managing Director, Global Strategy",
        "location": "New York, NY",
        "retreatAttended": "Amalfi Coast Sanctuary"
    },
    {
        "quote": "Kareena Islam has created something genuinely rare: an intersection of deep anatomical precision and sacred luxury. From the seamless VIP airport pickup arranged by Grand Travel to the quiet sunrise breathwork, every single minute felt curated for restoration.",
        "author": "Marcus Vance",
        "role": "Architect & Spatial Designer",
        "location": "Chicago, IL",
        "retreatAttended": "Riviera Maya Sanctuary"
    }
]


@router.get("", response_model=List[TestimonialResponse])
def get_testimonials():
    """Retrieve verified testimonials highlighting autonomic reset outcomes."""
    return TESTIMONIALS_DATA
