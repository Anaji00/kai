from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# ==========================================
# RETREAT SCHEMAS
# ==========================================
class ItineraryDaySchema(BaseModel):
    day: str
    title: str
    highlights: List[str]


class RetreatDetailSchema(BaseModel):
    id: str
    slug: str
    title: str
    destination: str
    country: str
    locationDetails: str
    dates: str
    year: int
    season: Optional[str] = None
    duration: str
    spotsTotal: int
    spotsRemaining: int
    investmentStarting: str
    tagline: str
    description: str
    clinicalFocus: List[str]
    somaticPractices: List[str]
    inclusions: List[str]
    accommodations: str
    heroImage: str
    gallery: List[str]
    schedule: List[ItineraryDaySchema]
    featured: Optional[bool] = False
    status: str


class RetreatAvailabilityResponse(BaseModel):
    id: str
    slug: str
    title: str
    destination: str
    spotsTotal: int
    spotsRemaining: int
    status: str
    investmentStarting: str


# ==========================================
# BOOKING SCHEMAS
# ==========================================
class BookingCreate(BaseModel):
    fullName: str = Field(..., min_length=2, description="Full legal name of the guest")
    email: EmailStr = Field(..., description="Valid email address for reservation communication")
    phone: str = Field(..., min_length=7, description="Contact phone number")
    retreatId: str = Field(..., min_length=1, description="Selected retreat identifier")
    roomPreference: str = Field("private-suite", description="private-suite, shared-luxury, or flexible")
    movementExperience: str = Field("all-levels", description="Movement & yoga experience tier")
    passportValid: str = Field("yes-valid-6mo", description="Passport validity declaration")
    healthNotes: Optional[str] = Field(None, description="Dietary requirements, health or mobility notes")
    intentions: Optional[str] = Field(None, description="Personal intention for renewal")


class BookingResponse(BaseModel):
    success: bool
    message: str
    bookingReference: str
    retreatTitle: str
    status: str
    createdAt: datetime


class BookingLookupResponse(BaseModel):
    referenceCode: str
    retreatId: str
    retreatTitle: Optional[str]
    fullName: str
    email: str
    roomPreference: str
    status: str
    createdAt: datetime


# ==========================================
# FLIGHT CONCIERGE SCHEMAS (GRAND TRAVEL)
# ==========================================
class FlightRequestCreate(BaseModel):
    guestName: str = Field(..., min_length=2)
    email: EmailStr
    phone: str = Field(..., min_length=7)
    bookingReference: Optional[str] = None
    retreatId: Optional[str] = None
    departureAirport: str = Field(..., min_length=3, description="Airport code or city e.g. IAH, JFK")
    cabinClass: str = Field("economy", description="economy, premium-economy, business, or first")
    preferredAirline: Optional[str] = None
    travelDatesFlexible: bool = True
    specialRequests: Optional[str] = None


class FlightRequestResponse(BaseModel):
    success: bool
    message: str
    requestId: int
    departureAirport: str
    cabinClass: str
    status: str


# ==========================================
# CUSTOM GROUP SCHEMAS
# ==========================================
class CustomGroupCreate(BaseModel):
    organizerName: str = Field(..., min_length=2)
    email: EmailStr
    phone: str = Field(..., min_length=7)
    groupSize: int = Field(..., ge=4, le=50)
    targetDestination: str = Field(..., min_length=2)
    targetDates: Optional[str] = None
    somaticGoals: Optional[str] = None


class CustomGroupResponse(BaseModel):
    success: bool
    message: str
    inquiryId: int


# ==========================================
# NEWSLETTER SCHEMAS
# ==========================================
class NewsletterSubscribe(BaseModel):
    email: EmailStr
    source: Optional[str] = "footer"


class NewsletterResponse(BaseModel):
    success: bool
    message: str
    email: str


# ==========================================
# WELLNESS & SOMATIC SCHEMAS
# ==========================================
class WellnessFrequencyResponse(BaseModel):
    frequencyHz: int
    name: str
    subtitle: str
    clinicalIndication: str
    targetBrainwave: str
    binauralDifferenceHz: float
    recommendedDurationMinutes: int


class BreathworkProtocolResponse(BaseModel):
    id: str
    name: str
    cadence: Dict[str, int]
    targetNervousSystem: str
    clinicalMechanism: str
    cyclesRecommended: int


class StressAssessmentRequest(BaseModel):
    primarySymptom: str = Field(..., description="burnout, insomnia, tension, overwhelm, transition")
    workOverdriveHours: int = Field(40, ge=10, le=100)
    sleepQualityScale: int = Field(5, ge=1, le=10)
    travelReadiness: str = Field("caribbean-latin-america", description="domestic, latin-america, mediterranean, asia")


class StressAssessmentResponse(BaseModel):
    autonomicState: str
    recommendedCadence: str
    recommendedFrequencyHz: int
    recommendedRetreatSlug: str
    clinicalInsight: str


# ==========================================
# TESTIMONIAL & HEALTH
# ==========================================
class TestimonialResponse(BaseModel):
    quote: str
    author: str
    role: str
    location: str
    retreatAttended: str


class HealthResponse(BaseModel):
    status: str
    version: str
    databaseConnected: bool
    totalRetreats: int
    hostAgency: str
