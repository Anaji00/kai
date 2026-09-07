from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from backend.models import Booking

RETREATS_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "nosara-2027",
        "slug": "nosara-costa-rica-2027",
        "title": "Canopy & Ocean Somatic Alignment",
        "destination": "Nosara, Guanacaste",
        "country": "Costa Rica",
        "locationDetails": "Playa Guiones & Sacred Jungle Canopy",
        "dates": "February 18 – 24, 2027",
        "year": 2027,
        "season": "Winter",
        "duration": "7 Days / 6 Nights",
        "spotsTotal": 14,
        "baseSpotsRemaining": 4,
        "investmentStarting": "$3,850",
        "tagline": "Canopy seclusion, surf therapy, anatomically grounded vinyasa, and organic nourishment.",
        "description": "Nestled in the lush biodiversity of Costa Rica's Blue Zone, this sanctuary blends ocean saltwater hydrotherapy, daily alignment-focused vinyasa, and deep parasympathetic recovery beneath ancient forest canopies.",
        "clinicalFocus": [
            "Circadian cortisol curve re-synchronization through natural sunrise exposure",
            "Vagus nerve stimulation via thermal & saltwater ocean immersion",
            "Reduction of systemic inflammation through anti-inflammatory Blue Zone culinary sourcing"
        ],
        "somaticPractices": [
            "Anatomical alignment vinyasa led by Kareena Islam",
            "Sunset pranayama & restorative myofascial Yin release",
            "432Hz crystal singing bowl sound bath in open-air jungle pavilion",
            "Mindful surf therapy and ocean flow immersion"
        ],
        "inclusions": [
            "6 nights in a private luxury eco-villa buyout amidst pristine canopy (exclusive Grand Travel contract)",
            "3 daily organic, farm-to-table chef meals tailored to individual clinical dietary profiles",
            "Authentic native botanical apothecary workshop & medicinal plant walk with local herbalists",
            "Daily clinical grounding workshops, guided yoga & 432Hz crystal sound baths",
            "Private saltwater surf coaching and ocean hydro-restoration session",
            "Full VIP airport arrival coordination and private chauffeured transfers via Grand Travel & Cruise concierge",
            "Curated KAI restorative welcome kit (somatic eye pillows, mineral tinctures)"
        ],
        "accommodations": "Private teakwood sanctuary suites with outdoor open-air rain showers, stone soaking tubs, and panoramic ocean-canopy views.",
        "heroImage": "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=85",
        "gallery": [
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80"
        ],
        "schedule": [
            {
                "day": "Day 1",
                "title": "Arrival & The Unwinding",
                "highlights": ["San Jose / Liberia VIP transfer", "Welcome botanical elixir & cohort orientation", "Gentle nervous system down-regulation Yin session", "Intimate welcome dinner under the canopy"]
            },
            {
                "day": "Day 2",
                "title": "Circadian Awakening & Ocean Breath",
                "highlights": ["Sunrise pranayama on Guiones beach", "Anatomical alignment vinyasa", "Clinical seminar: Cortisol, Sleep Architecture & The Modern Nervous System", "Crystal singing bowl sound bath at dusk"]
            },
            {
                "day": "Day 3",
                "title": "Hydrotherapy & Surf Flow",
                "highlights": ["Mindful surf therapy session with local guides", "Therapeutic saltwater soak & lymphatic reset", "Afternoon silent reflection & personal journal time", "Chef-prepared Blue Zone culinary feast"]
            },
            {
                "day": "Day 4",
                "title": "Somatic Myofascial Release",
                "highlights": ["Restorative Yin with targeted fascia trigger points", "Guided breathwork session (4-7-8 and box breathing)", "Canopy forest bathing (Shinrin-yoku)", "Herbal infusion tea ceremony"]
            },
            {
                "day": "Day 5",
                "title": "Deep Parasympathetic Immersion",
                "highlights": ["Vinyasa flow focusing on pelvic and spinal alignment", "Apothecary workshop with native Costa Rican botanicals", "Group sound bath under starlight", "Nourishing farm-to-table dinner"]
            },
            {
                "day": "Day 6",
                "title": "Integration & Celebration",
                "highlights": ["Sunrise meditation & gratitude flow", "Integration workshop: Taking Clinical Grounding Home", "Sunset oceanfront farewell banquet", "Closing sound circle & sacred intention setting"]
            },
            {
                "day": "Day 7",
                "title": "Depart with Renewal",
                "highlights": ["Gentle closing meditation", "Nourishing farewell breakfast", "Private airport transfers"]
            }
        ],
        "featured": True,
        "status": "open"
    },
    {
        "id": "amalfi-2027",
        "slug": "amalfi-coast-italy-2027",
        "title": "Mediterranean Longevity & Coastal Stillness",
        "destination": "Amalfi Coast, Campania",
        "country": "Italy",
        "locationDetails": "Ravello & Positano Cliffside Haven",
        "dates": "May 10 – 16, 2027",
        "year": 2027,
        "season": "Spring",
        "duration": "7 Days / 6 Nights",
        "spotsTotal": 12,
        "baseSpotsRemaining": 3,
        "investmentStarting": "$4,650",
        "tagline": "Cliffside silence, cold-pressed longevity dining, restorative Yin, and Tyrrhenian hydro-therapy.",
        "description": "Perched on the serene terraced lemon groves of Ravello, this intimate sanctuary blends restorative yoga, ancestral Mediterranean longevity culinary science, and acoustic sound baths over looking the azure Tyrrhenian Sea.",
        "clinicalFocus": [
            "Polyphenol-rich Mediterranean nutrition for cellular anti-aging & cardiovascular calm",
            "Autonomic nervous system downregulation via negative ion coastal air exposure",
            "Restorative sleep architecture entrainment in peaceful cliffside microclimates"
        ],
        "somaticPractices": [
            "Morning spine-lengthening slow vinyasa facing the Tyrrhenian dawn",
            "Late afternoon targeted myofascial release for travel and desk-induced hip constriction",
            "528Hz crystal bowl sound journeys curated by Kareena Islam",
            "Pranayama breathwork calibrated to reduce autonomic blood pressure spikes"
        ],
        "inclusions": [
            "6 nights in an exclusive private historic villa takeover high above Amalfi (negotiated by Grand Travel & Cruise)",
            "Daily Mediterranean longevity meals crafted by private Campania private chefs with single-estate olive oils",
            "Private visit to a multi-generational family lemon orchard & cold-press olive mill with local artisans",
            "Private morning boat journey to secluded Tyrrhenian sea coves for restorative saltwater swimming",
            "Daily somatic yoga, crystal sound baths, and nervous system health workshops led by Kareena Islam",
            "Naples International VIP airport reception and private luxury Mercedes transfers to Ravello",
            "KAI botanical olive-leaf & citrus somatic gift curation"
        ],
        "accommodations": "Restored 17th-century clifftop palazzo with private sea-view balconies, hand-painted Vietri tiles, and cascading Mediterranean gardens.",
        "heroImage": "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1600&q=85",
        "gallery": [
            "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1000&q=80"
        ],
        "schedule": [
            {"day": "Day 1", "title": "Arrival in Ravello", "highlights": ["Naples private transfer to Ravello", "Welcome citrus aperitivo & cohort orientation", "Evening restorative gentle grounding", "Candlelit coastal welcome dinner"]},
            {"day": "Day 2", "title": "Awakening the Senses", "highlights": ["Sunrise terrace vinyasa", "Clinical Longevity Masterclass: The Mediterranean Autonomic Advantage", "Private terrace afternoon for journal reflection", "528Hz sound bath at sunset"]},
            {"day": "Day 3", "title": "Ancestral Roots & Harvest", "highlights": ["Private excursion to multi-generational lemon groves", "Cold-pressed olive oil sensory tasting", "Evening myofascial release for spinal decompression", "Family-style cliffside dinner"]},
            {"day": "Day 4", "title": "Tyrrhenian Hydrotherapy", "highlights": ["Private chartered wooden gozzo boat to quiet sea grottos", "Saltwater immersion & somatic float therapy", "Picnic lunch anchored off Positano", "Gentle twilight restorative yin"]},
            {"day": "Day 5", "title": "Stillness & Integration", "highlights": ["Morning anatomical spine workshop", "Afternoon silence and nervous system pause", "Sunset sound bath with crystal singing bowls", "Campanian chef dinner under the arbor"]},
            {"day": "Day 6", "title": "Celebration & Continuity", "highlights": ["Closing somatic movement circle", "Personalized somatic alignment guidance with Kareena", "Festive golden hour farewell dinner overlooking the cliffs", "Final evening crystal sound ceremony"]},
            {"day": "Day 7", "title": "Arrivederci with Renewal", "highlights": ["Closing gratitude meditation", "Fresh regional breakfast", "Private chauffeured airport transfers"]}
        ],
        "featured": True,
        "status": "few-spots"
    },
    {
        "id": "bali-2027",
        "slug": "ubud-sidemen-bali-2027",
        "title": "Sacred Valley Sound & Prana Renewal",
        "destination": "Ubud & Sidemen Valley",
        "country": "Indonesia",
        "locationDetails": "Ayung River Sanctuary & Sidemen Terraces",
        "dates": "September 12 – 19, 2027",
        "year": 2027,
        "season": "Fall",
        "duration": "8 Days / 7 Nights",
        "spotsTotal": 14,
        "baseSpotsRemaining": 5,
        "investmentStarting": "$4,200",
        "tagline": "Lush jungle acoustics, traditional Balinese water purification, and multi-frequency sound therapy.",
        "description": "Traverse the spiritual heart of Bali, dividing sacred time between an open-air riverfront jungle retreat in Ubud and the quiet ancestral rice terraces of Sidemen. Immerse in intensive crystal sound healing, daily somatic movement, and sacred water blessings.",
        "clinicalFocus": [
            "Auditory cortex & brainwave entrainment through multi-instrument sound resonance",
            "Neuro-fascial release targeting deep emotional holding patterns in the pelvis and diaphragm",
            "Ayurvedic and Balinese botanical pharmacology for gut-brain axis balance"
        ],
        "somaticPractices": [
            "Prana flow vinyasa incorporating traditional Balinese energetic focus",
            "Extended 75-minute crystal singing bowl and gong acoustic baths",
            "Nervous system resets utilizing traditional Jamu herbal adaptogens",
            "Silent morning walking meditation through ancient rice paddies"
        ],
        "inclusions": [
            "7 nights split between a private luxury jungle estate in Ubud and a secluded Sidemen valley eco-resort",
            "All organic plant-forward and fresh seafood Balinese meals prepared by dedicated wellness chefs",
            "Traditional Melukat water purification ceremony guided by a respected hereditary local high priest",
            "Daily master sound journeys with 432Hz and 528Hz crystal singing bowls",
            "Full private air-conditioned VIP transit between Ngurah Rai Airport, Ubud, and Sidemen",
            "Authentic Balinese Jamu herbal medicine making masterclass with village elders",
            "Complete KAI somatic travel wellness kit"
        ],
        "accommodations": "Open-air riverside suites with bamboo architecture, private plunge pools, and uninterrupted views of virgin rainforest canopy.",
        "heroImage": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1600&q=85",
        "gallery": [
            "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1000&q=80"
        ],
        "schedule": [
            {"day": "Day 1", "title": "Arrival in Ubud", "highlights": ["Denpasar Airport VIP greeting and escort", "Scenic rainforest drive to Ayung river estate", "Balinese welcome blessing & herbal Jamu elixir", "Intimate riverside cohort dinner"]},
            {"day": "Day 2", "title": "Awakening Prana", "highlights": ["Morning anatomical vinyasa over the river", "Clinical Seminar: The Vagus Nerve, Somatic Memory & Brain Waves", "Afternoon rest by the infinity spring pool", "Extended 432Hz crystal sound healing"]},
            {"day": "Day 3", "title": "Sacred Melukat Water Blessing", "highlights": ["Private early journey to Tirta Empul spring sanctuary", "Traditional water purification guided by local Balinese elder", "Silent contemplative picnic lunch in Sidemen foothills", "Evening restorative yoga for spinal release"]},
            {"day": "Day 4", "title": "Transition to Sidemen Valley", "highlights": ["Morning movement practice", "Scenic journey across emerald valleys to Sidemen", "Check-in to private bamboo sanctuary", "Starlight sound bath"]},
            {"day": "Day 5", "title": "Ancestral Botanicals & Sound", "highlights": ["Balinese herbal apothecary workshop", "Learn the pharmacology of turmeric, ginger, and Jamu", "Deep tissue Balinese restorative bodywork", "Sunset pranayama"]},
            {"day": "Day 6", "title": "The Art of Surrender", "highlights": ["Silent sunrise rice terrace walking meditation", "Gentle Yin practice targeting psoas releasing", "Integration circle led by Kareena Islam", "Balinese royal feast under bamboo pavilion"]},
            {"day": "Day 7", "title": "Integration & Renewal", "highlights": ["Morning alignment flow", "Closing gratitude & intention ceremony", "Celebratory farewell dinner with local gamelan acoustic masters", "Nightly sound bath"]},
            {"day": "Day 8", "title": "Journey Home", "highlights": ["Nourishing morning breakfast", "Closing prayer of renewal", "Private VIP transfer to Denpasar Airport"]}
        ],
        "featured": True,
        "status": "open"
    },
    {
        "id": "riviera-2026",
        "slug": "riviera-maya-mexico-2026",
        "title": "Autumn Equinox Coastal Somatic Reset",
        "destination": "Riviera Maya, Quintana Roo",
        "country": "Mexico",
        "locationDetails": "El Dorado Seaside Palms • Adults-Only Sanctuary",
        "dates": "October 1 – 4, 2026",
        "year": 2026,
        "season": "Fall",
        "duration": "4 Days / 3 Nights",
        "spotsTotal": 14,
        "baseSpotsRemaining": 2,
        "investmentStarting": "$2,150",
        "tagline": "Oceanfront luxury, restorative yin, crystal bowl acoustics, and coastal decompression before the holidays.",
        "description": "A focused 4-day long-weekend reset at the luxury adults-only El Dorado Seaside Palms. Intentionally scheduled during the autumn transition to calm nervous system burnout before the end of the year through ocean hydrotherapy and clinical grounding.",
        "clinicalFocus": [
            "Rapid sympathetic down-regulation for high-burnout executives and caregivers",
            "Cortisol deceleration prior to high-stress fourth quarter cycles",
            "Restorative sleep architecture restoration with ocean acoustic therapy"
        ],
        "somaticPractices": [
            "Twice-daily oceanfront yoga: uplifting morning vinyasa, sunset restorative yin",
            "Evening 432Hz crystal singing bowl sound healing on the beach",
            "Breathwork protocols specifically tailored for sleep onset and insomnia reduction",
            "Mindful sensory walks on powdery white sand"
        ],
        "inclusions": [
            "3 nights luxury oceanfront suite accommodations at El Dorado Seaside Palms",
            "Gourmet inclusive all-day farm-fresh dining and craft non-alcoholic botanical mocktails",
            "Full access to serene adults-only oceanfront grounds and hydrotherapy pools",
            "Twice-daily movement and sound journeys with Kareena Islam",
            "Private Cancun VIP airport roundtrip transfers arranged by Grand Travel & Cruise",
            "Welcome restorative gift bag"
        ],
        "accommodations": "Oceanfront luxury swim-up or terrace suites with views of the Caribbean sea, deep soaking tubs, and private outdoor daybeds.",
        "heroImage": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=85",
        "gallery": [
            "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
            "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1000&q=80"
        ],
        "schedule": [
            {"day": "Day 1", "title": "Thursday: Arrive & Decompress", "highlights": ["Private Cancun airport pickup", "Check-in to oceanfront suite", "Sunset gentle restorative yin & intention setting", "Welcome dinner overlooking the Caribbean"]},
            {"day": "Day 2", "title": "Friday: Grounding & Sound", "highlights": ["Sunrise beach vinyasa", "Clinical Workshop: De-Escalating Chronic Sympathetic Stress", "Afternoon hydrotherapy pool relaxation", "Full starlight 432Hz crystal bowl sound bath"]},
            {"day": "Day 3", "title": "Saturday: Hydrotherapy & Renewal", "highlights": ["Morning anatomical spine & hip release flow", "Botanical infusion tasting", "Afternoon ocean swim & silent rest", "Farewell celebratory culinary feast"]},
            {"day": "Day 4", "title": "Sunday: Return Centered", "highlights": ["Closing sunrise breathwork and meditation", "Nourishing seaside brunch", "Private VIP transfer to Cancun airport"]}
        ],
        "featured": False,
        "status": "few-spots"
    }
]


def get_all_retreats(db: Optional[Session] = None, year: Optional[int] = None) -> List[Dict[str, Any]]:
    results = []
    for r in RETREATS_CATALOG:
        if year and r["year"] != year:
            continue
        
        # Calculate dynamic spots remaining if DB session provided
        spots_booked = 0
        if db:
            spots_booked = db.query(Booking).filter(
                Booking.retreat_id == r["id"],
                Booking.status.in_(["confirmed", "pending_review"])
            ).count()
        
        dynamic_remaining = max(0, r["baseSpotsRemaining"] - spots_booked)
        
        retreat_copy = dict(r)
        retreat_copy["spotsRemaining"] = dynamic_remaining
        if dynamic_remaining == 0:
            retreat_copy["status"] = "waitlist"
        elif dynamic_remaining <= 3:
            retreat_copy["status"] = "few-spots"
        else:
            retreat_copy["status"] = "open"
            
        results.append(retreat_copy)
    return results


def get_retreat_by_slug_or_id(slug_or_id: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
    for r in RETREATS_CATALOG:
        if r["id"] == slug_or_id or r["slug"] == slug_or_id:
            spots_booked = 0
            if db:
                spots_booked = db.query(Booking).filter(
                    Booking.retreat_id == r["id"],
                    Booking.status.in_(["confirmed", "pending_review"])
                ).count()
            
            dynamic_remaining = max(0, r["baseSpotsRemaining"] - spots_booked)
            retreat_copy = dict(r)
            retreat_copy["spotsRemaining"] = dynamic_remaining
            if dynamic_remaining == 0:
                retreat_copy["status"] = "waitlist"
            elif dynamic_remaining <= 3:
                retreat_copy["status"] = "few-spots"
            else:
                retreat_copy["status"] = "open"
            return retreat_copy
    return None
