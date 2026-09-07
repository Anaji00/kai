from typing import List, Dict, Any

FREQUENCIES_DATA: List[Dict[str, Any]] = [
    {
        "frequencyHz": 432,
        "name": "Cellular Harmony",
        "subtitle": "Natural Harmonic Grounding",
        "clinicalIndication": "Stimulates parasympathetic ventral vagal dominance, slowing cardiac resting pulse and shifting beta brainwaves into relaxing alpha frequencies (8–12Hz).",
        "targetBrainwave": "Alpha (8–12 Hz)",
        "binauralDifferenceHz": 1.5,
        "recommendedDurationMinutes": 15
    },
    {
        "frequencyHz": 528,
        "name": "Miraculous Repair",
        "subtitle": "Cellular & Cortisol Down-Regulation",
        "clinicalIndication": "Associated in bio-acoustic studies with reduced circulating cortisol, autonomic tension dissipation, and profound theta (4–7Hz) restorative states.",
        "targetBrainwave": "Theta (4–7 Hz)",
        "binauralDifferenceHz": 2.0,
        "recommendedDurationMinutes": 20
    },
    {
        "frequencyHz": 639,
        "name": "Relational Coherence",
        "subtitle": "Heart Field & Social Engagement",
        "clinicalIndication": "Promotes vagal brake softening, fostering empathetic connection, psychological safety, and somatic ease within intimate cohort dynamics.",
        "targetBrainwave": "Theta/Alpha Border",
        "binauralDifferenceHz": 1.8,
        "recommendedDurationMinutes": 15
    }
]

BREATHWORK_PROTOCOLS: List[Dict[str, Any]] = [
    {
        "id": "vagal-4-7-8",
        "name": "4-7-8 Parasympathetic Reset",
        "cadence": {"inhale": 4, "hold": 7, "exhale": 8},
        "targetNervousSystem": "Vagus Nerve & Sympathetic Decompensation",
        "clinicalMechanism": "Prolonged 8-second exhalation stimulates pulmonary stretch receptors and activates baroreflexes, triggering rapid acetylcholine release to calm cardiac tempo.",
        "cyclesRecommended": 4
    },
    {
        "id": "box-breathing",
        "name": "Box Breathing (Square Cadence)",
        "cadence": {"inhale": 4, "hold_full": 4, "exhale": 4, "hold_empty": 4},
        "targetNervousSystem": "Executive Calm & Amygdala Regulation",
        "clinicalMechanism": "Equal-ratio breath retention re-balances carbon dioxide tolerance and breaks automatic acute stress thought loops.",
        "cyclesRecommended": 6
    },
    {
        "id": "coherent-hrv",
        "name": "Coherent Resonance Breathing",
        "cadence": {"inhale": 5, "hold": 0, "exhale": 6},
        "targetNervousSystem": "Heart Rate Variability (HRV) Synchronization",
        "clinicalMechanism": "Achieves respiratory sinus arrhythmia coherence at approximately 0.1Hz frequency, maximizing autonomic flexibility and emotional stability.",
        "cyclesRecommended": 10
    }
]


def assess_somatic_stress(primary_symptom: str, work_hours: int, sleep_scale: int, travel_readiness: str) -> Dict[str, Any]:
    """Evaluates sympathetic overdrive level and recommends optimal protocol & retreat."""
    if primary_symptom in ["burnout", "overwhelm"] or work_hours >= 60:
        autonomic_state = "High Sympathetic Overdrive (Adrenal Fatigue Phase)"
        cadence = "4-7-8 Parasympathetic Reset"
        freq = 528
        slug = "nosara-costa-rica-2027"
        insight = "Your physiology is maintaining emergency fight-or-flight reserves. The Nosara Canopy sanctuary combines ocean saltwater hydrotherapy and daily restorative vinyasa beneath rainforest canopies to re-establish healthy circadian cortisol rhythms."
    elif primary_symptom == "insomnia" or sleep_scale <= 4:
        autonomic_state = "Dysregulated Sleep Architecture & Circadian Phase Delay"
        cadence = "Coherent Resonance Breathing"
        freq = 432
        slug = "riviera-maya-mexico-2026"
        insight = "Elevated nighttime cortisol is impeding restorative slow-wave sleep. The Riviera Maya autumn sanctuary offers rapid seaside somatic resets with 432Hz crystal bowl sound healing directly on ocean sands."
    elif travel_readiness == "mediterranean":
        autonomic_state = "Chronic Cognitive Constriction & Vascular Tension"
        cadence = "Box Breathing (Square Cadence)"
        freq = 528
        slug = "amalfi-coast-italy-2027"
        insight = "Desk-bound executive tension requires vascular relaxation and sensory deceleration. The Amalfi Coast sanctuary fuses Mediterranean cold-pressed longevity dining with cliffside silence."
    else:
        autonomic_state = "Somatic Holding Patterns & Neuro-Fascial Strain"
        cadence = "4-7-8 Parasympathetic Reset"
        freq = 432
        slug = "ubud-sidemen-bali-2027"
        insight = "Deep energetic tension stored within the pelvic and diaphragmatic fascia is best released through traditional Balinese Melukat water purification and master crystal sound journeys."

    return {
        "autonomicState": autonomic_state,
        "recommendedCadence": cadence,
        "recommendedFrequencyHz": freq,
        "recommendedRetreatSlug": slug,
        "clinicalInsight": insight
    }
