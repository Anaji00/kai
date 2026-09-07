from fastapi import APIRouter
from typing import List
from backend.schemas import (
    WellnessFrequencyResponse,
    BreathworkProtocolResponse,
    StressAssessmentRequest,
    StressAssessmentResponse,
)
from backend.services.wellness_service import (
    FREQUENCIES_DATA,
    BREATHWORK_PROTOCOLS,
    assess_somatic_stress,
)

router = APIRouter(prefix="/wellness", tags=["Somatic Restorative Science"])


@router.get("/frequencies", response_model=List[WellnessFrequencyResponse])
def get_wellness_frequencies():
    """Retrieve bio-acoustic crystal bowl sound frequencies and clinical indications."""
    return FREQUENCIES_DATA


@router.get("/breathwork", response_model=List[BreathworkProtocolResponse])
def get_breathwork_protocols():
    """Retrieve evidence-based breathwork cadences and autonomic nervous system mechanisms."""
    return BREATHWORK_PROTOCOLS


@router.post("/stress-assessment", response_model=StressAssessmentResponse)
def run_stress_assessment(data: StressAssessmentRequest):
    """
    Evaluates autonomic stress indicators and matches with optimal clinical breath cadence,
    crystal bowl frequency, and recommended KAI retreat destination.
    """
    return assess_somatic_stress(
        primary_symptom=data.primarySymptom,
        work_hours=data.workOverdriveHours,
        sleep_scale=data.sleepQualityScale,
        travel_readiness=data.travelReadiness
    )
