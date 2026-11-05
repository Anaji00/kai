from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
from backend.sidecar.services.clinical_governance_engine import (
    ClinicalEvaluationReport,
    ClinicalFinding,
    ClinicalSeverity,
)


# -----------------------------------------------------------------------------
# Staging Intakes & Restorative Wellness Pre-Arrival Dossier
# -----------------------------------------------------------------------------
class StagingIntakeBase(BaseModel):
    client_name: str
    email: EmailStr
    phone: Optional[str] = None
    sanctuary_slug: Optional[str] = None
    room_tier: Optional[str] = None
    wellness_profile: Dict[str, Any] = Field(default_factory=dict)
    clinical_screening_enabled: bool = False
    clinical_profile: Dict[str, Any] = Field(default_factory=dict)
    flight_request: Optional[Dict[str, Any]] = None


class StagingIntakeUpdate(BaseModel):
    client_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    sanctuary_slug: Optional[str] = None
    room_tier: Optional[str] = None
    wellness_profile: Optional[Dict[str, Any]] = None
    clinical_screening_enabled: Optional[bool] = None
    clinical_profile: Optional[Dict[str, Any]] = None
    flight_request: Optional[Dict[str, Any]] = None
    consultation_thesis: Optional[Dict[str, Any]] = None
    status: Optional[str] = None


class PreCallThesisGenerateRequest(BaseModel):
    regenerate: bool = False
    custom_notes: Optional[str] = None


class CrmActivityItem(BaseModel):
    pass


class CrmActivityItem(BaseModel):
    type: str  # LODGING, ACTIVITY, TRANSFER
    title: str
    description: str
    time: Optional[str] = None
    day: Optional[int] = None


class PreCallThesis(BaseModel):
    sympathetic_tone_hypothesis: str
    clinical_flags: List[str]
    recommended_sanctuary: str
    recommended_room_tier: str
    circadian_protocol: str
    consultation_talk_tracks: List[Dict[str, str]]
    objection_scripts: List[Dict[str, str]]
    itinerary_draft: List[Dict[str, Any]] = []
    personalized_email_draft: str


class StagingIntakeResponse(StagingIntakeBase):
    id: str
    source_ref: Optional[str] = None
    consultation_thesis: Optional[Dict[str, Any]] = None
    status: str
    reviewed_by: Optional[str] = None
    crm_trip_id: Optional[str] = None
    crm_contact_id: Optional[str] = None
    sub_trip_id: Optional[str] = None
    group_cohort_id: Optional[str] = None
    synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CrmCommitRequest(BaseModel):
    operator_name: str = "Kareena Islam"
    override_room_tier: Optional[str] = None


class CrmCommitResponse(BaseModel):
    success: bool
    message: str
    intake_id: str
    crm_contact_id: str
    crm_trip_id: str
    applied_tags: List[str]
    status: str
    deep_links: Optional[Dict[str, str]] = None


class CrmManifestItem(BaseModel):
    guest_name: str
    email: str
    phone: Optional[str] = None
    source_ref: Optional[str] = None
    sanctuary_slug: str
    sanctuary_dates: str
    room_tier: str
    room_code: str
    sub_trip_id: Optional[str] = None
    cabin_class: Optional[str] = None
    departure_airport: Optional[str] = None
    flight_requests: Optional[str] = None
    clinical_flags: List[str]
    dietary_notes: str
    status: str


# -----------------------------------------------------------------------------
# Sourced B2B Lead Gen
# -----------------------------------------------------------------------------
class StagedLeadCreate(BaseModel):
    business_name: str
    category: str = "studio"
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    outreach_thesis: Optional[str] = None


class StagedLeadUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    outreach_thesis: Optional[str] = None
    status: Optional[str] = None


class StagedLeadResponse(BaseModel):
    id: str
    business_name: str
    category: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    outreach_thesis: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LeadApproveRequest(BaseModel):
    operator_name: str = "Kareena Islam"
    custom_outreach: Optional[str] = None


class LeadDiscoveryTrigger(BaseModel):
    city: str = "Houston"
    category: str = "reformer_pilates"
    limit: int = 5


# -----------------------------------------------------------------------------
# SMS Notification System & Campaigns
# -----------------------------------------------------------------------------
class SmsDispatchCreate(BaseModel):
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_body: str
    dispatch_type: str = "OPERATIONAL_ALERT"


class SmsAuthorizeRequest(BaseModel):
    operator_name: str = "Kareena Islam"


class SmsBroadcastCampaignRequest(BaseModel):
    campaign_name: str
    target_segment: str  # "waitlist_nosara", "alumni_circle", "pre_departure_cohort"
    sanctuary_slug: Optional[str] = None
    message_body: str
    operator_name: str = "Kareena Islam"


class SmsDispatchResponse(BaseModel):
    id: str
    recipient_phone: str
    recipient_name: Optional[str] = None
    message_body: str
    dispatch_type: str
    status: str
    dispatched_at: Optional[datetime] = None
    authorized_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Inbound Emails & Agent Parsing
# -----------------------------------------------------------------------------
class StagedEmailIngest(BaseModel):
    sender: str
    recipient: str = "concierge@kaiwellnessretreats.com"
    subject: str
    raw_body: str


class StagedEmailResponse(BaseModel):
    id: str
    sender: str
    recipient: str
    subject: str
    raw_body: str
    parsed_intent: Optional[str] = None
    parsed_entities: Dict[str, Any] = Field(default_factory=dict)
    suggested_action: Optional[str] = None
    staging_intake_id: Optional[str] = None
    status: str
    reviewed_by: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmailActionApproveRequest(BaseModel):
    operator_name: str = "Kareena Islam"
    action_type: str = "CREATE_INTAKE"  # CREATE_INTAKE, ENRICH_FLIGHT, RECONCILE_VOUCHER, ARCHIVE


# -----------------------------------------------------------------------------
# Voucher Parsing & Room-Block Diff Engine
# -----------------------------------------------------------------------------
class VoucherParseRequest(BaseModel):
    document_text: str
    sanctuary_slug: str
    document_name: str = "villa_contract.pdf"


class ManifestDiffRequest(BaseModel):
    sanctuary_slug: str
    external_guest_records: List[Dict[str, Any]]
    diff_document_name: str = "ground_operator_manifest.csv"


class GuestPresentationDossierResponse(BaseModel):
    location: str
    sanctuary_slug: str
    geocoding: Dict[str, Any]
    scenic_route: Dict[str, Any]
    weather: Dict[str, Any]
    dining_spots: List[Dict[str, Any]]
    destination_guide: Dict[str, Any]
    guest_reflections: List[Dict[str, Any]]
    presentation_markdown: str


class ManifestDiffResponse(BaseModel):
    id: str
    sanctuary_slug: str
    document_name: str
    external_count: int
    crm_cohort_count: int = 0
    cohort_cap: int
    over_capacity: str
    discrepancies: List[Dict[str, Any]]
    reconciliation_notes: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Cohort Cap Telemetry
# -----------------------------------------------------------------------------
class SanctuaryCohortStatus(BaseModel):
    slug: str
    title: str
    dates: str
    capacity_limit: int  # 12 to 14
    staged_count: int
    crm_confirmed_count: int = 0
    remaining_spots: int
    status: str  # OPEN, NEAR_CAPACITY, FULL


# -----------------------------------------------------------------------------
# Calendar Event Schemas
# -----------------------------------------------------------------------------
class CalendarEventCreate(BaseModel):
    title: str
    category: str = "CONSULTATION"  # COHORT, CONSULTATION, FLIGHT_ARRIVAL, SOMATIC_BLOCK
    start_time: str
    end_time: str
    sanctuary_slug: Optional[str] = None
    guest_name: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    intake_id: Optional[str] = None


class CalendarEventResponse(BaseModel):
    id: str
    title: str
    sanctuary_slug: Optional[str] = None
    category: str
    start_time: str
    end_time: str
    guest_name: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    intake_id: Optional[str] = None


# -----------------------------------------------------------------------------
# Clinical Copilot Schemas
# -----------------------------------------------------------------------------
class CopilotChatRequest(BaseModel):
    message: str
    mode: str = "clinical_safety"  # clinical_safety, consult_prep, travel_concierge, studio_ops
    guest_context: Optional[Dict[str, Any]] = None
    sanctuary_slug: Optional[str] = None
    current_page: Optional[str] = None
    conversation_history: Optional[List[Dict[str, str]]] = None


class FormFillProposal(BaseModel):
    form_type: str  # vendor_supplier, route_calculator, guest_intake, curated_dining, destination_guide, somatic_review, broadcast_sms, location_scraper
    form_title: str
    target_tab: Optional[str] = None  # vendors, routes, dining, weather, destination, reviews, overview
    target_url: Optional[str] = None  # e.g. /portal, /portal/vendors, /portal/travel-logistics?tab=dining
    action_type: Optional[str] = None
    fields: Dict[str, Any] = Field(default_factory=dict)
    summary: str
    requires_approval: bool = True
    action_title: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None
    approval_required: Optional[bool] = None


class CopilotChatResponse(BaseModel):
    response_text: str
    mode: str
    safety_level: Optional[str] = None
    safety_screened: bool = False
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    citations: List[str] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    form_fill_proposal: Optional[FormFillProposal] = None
    sanctuary_slug: Optional[str] = None
    latency_ms: Optional[int] = None
    model_used: Optional[str] = None


# -----------------------------------------------------------------------------
# Webhook Schemas
# -----------------------------------------------------------------------------
class WebhookSimulateRequest(BaseModel):
    provider: str  # expedia, cirium, whatsapp, resend
    event_type: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class WebhookEventLogResponse(BaseModel):
    id: str
    provider: str
    event_type: str
    status: str
    payload: Dict[str, Any]
    error_message: Optional[str] = None
    processed_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Hospitality Search Schemas
# -----------------------------------------------------------------------------
class AccommodationSearchRequest(BaseModel):
    destination: Optional[str] = None
    check_in: Optional[str] = None
    check_out: Optional[str] = None
    luxury_tier: Optional[str] = None


# -----------------------------------------------------------------------------
# Travel, Dynamic Geodesic Routing & Points of Interest Schemas
# -----------------------------------------------------------------------------
class RouteCalculateRequest(BaseModel):
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    sanctuary_slug: Optional[str] = "nosara"
    terrain_type: Optional[str] = "COASTAL"  # COASTAL, MOUNTAIN, JUNGLE


class SanctuaryRouteResponse(BaseModel):
    id: str
    sanctuary_slug: str
    origin_name: str
    origin_lat: float
    origin_lon: float
    destination_name: str
    destination_lat: float
    destination_lon: float
    distance_km: float
    estimated_minutes: int
    scenic_description: str
    recommended_vehicle: str
    road_conditions: str
    route_geometry: Optional[List[List[float]]] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SomaticPointOfInterestResponse(BaseModel):
    id: str
    sanctuary_slug: str
    name: str
    category: str
    lat: float
    lon: float
    description: str
    vagus_nerve_benefit: str
    ideal_visiting_time: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Live Microclimate Bioclimatology & Weather Schemas
# -----------------------------------------------------------------------------
class WeatherForecastRequest(BaseModel):
    lat: float
    lon: float
    sanctuary_slug: Optional[str] = "nosara"


class WeatherForecastResponse(BaseModel):
    sanctuary_slug: str
    location_name: str
    current_temp_c: float
    feels_like_c: float
    humidity: int
    uv_index: float
    wind_speed_kmh: float
    conditions: str
    prana_breathwork_window: str
    sunset_sound_bath_recommendation: str
    nurse_somatic_guidance: str
    cached: bool = False
    fetched_at: str


# -----------------------------------------------------------------------------
# Curated Dining & Blue Zone Nutrition Schemas
# -----------------------------------------------------------------------------
class DiningSearchRequest(BaseModel):
    sanctuary_slug: Optional[str] = None
    dietary_tags: Optional[List[str]] = None
    cuisine_type: Optional[str] = None
    max_distance_km: Optional[float] = None


class CuratedDiningSpotResponse(BaseModel):
    id: str
    sanctuary_slug: str
    name: str
    cuisine_type: str
    dietary_tags: List[str]
    distance_from_villa_km: float
    description: str
    nurse_notes: str
    price_tier: str
    reservation_required: str
    lat: Optional[float] = None
    lon: Optional[float] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CuratedDiningCreateRequest(BaseModel):
    sanctuary_slug: str
    name: str
    cuisine_type: str
    dietary_tags: List[str]
    distance_from_villa_km: float
    description: str
    nurse_notes: str
    price_tier: Optional[str] = "$$$"
    reservation_required: Optional[str] = "CONCIERGE_HANDLED"
    lat: Optional[float] = None
    lon: Optional[float] = None


# -----------------------------------------------------------------------------
# Verified Guest Reflections & Somatic Reviews Schemas
# -----------------------------------------------------------------------------
class DestinationReviewResponse(BaseModel):
    id: str
    sanctuary_slug: str
    guest_name: str
    stay_dates: str
    overall_rating: float
    deep_sleep_score: float
    quietude_score: float
    clinical_attentiveness_score: float
    review_text: str
    sentiment_label: str
    source: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DestinationReviewCreateRequest(BaseModel):
    sanctuary_slug: str
    guest_name: str
    stay_dates: str
    overall_rating: float = 5.0
    review_text: str
    source: Optional[str] = "VERIFIED_GUEST"


class InboundReviewWebhookPayload(BaseModel):
    provider: str = "GUEST_EXPERIENCE"
    sanctuary_slug: str
    guest_name: str
    stay_dates: str
    rating: float
    comment: str
    metadata: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# Destination Intelligence & Regulatory Guides Schemas
# -----------------------------------------------------------------------------
class DestinationGuideResponse(BaseModel):
    id: str
    sanctuary_slug: str
    country: str
    visa_requirements: str
    passport_validity: str
    temple_customs: str
    circadian_timezone_offset: int
    packing_checklist: List[str]
    emergency_clinic_distance: str
    local_concierge_phone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Ground Transfer & Chauffeur Telemetry Schemas
# -----------------------------------------------------------------------------
class GroundTransferResponse(BaseModel):
    id: str
    sanctuary_slug: str
    guest_name: str
    intake_id: Optional[str] = None
    pickup_location: str
    dropoff_location: str
    chauffeur_notes: Optional[str] = None
    flight_number: Optional[str] = None
    pickup_time: datetime
    chauffeur_name: str
    vehicle_type: str
    status: str
    chilled_amenities: List[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GroundTransferDispatchWebhook(BaseModel):
    transfer_id: str
    status: str  # DISPATCHED, EN_ROUTE, ARRIVED_AT_TARMAC, COMPLETED
    chauffeur_notes: Optional[str] = None


# -----------------------------------------------------------------------------
# Secure Document Ingestion Schemas
# -----------------------------------------------------------------------------
class UploadedDocumentResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    file_size_bytes: int
    associated_guest_name: Optional[str] = None
    associated_intake_id: Optional[str] = None
    extracted_summary: str
    clinical_notes_found: List[str]
    travel_details_found: List[str]
    safety_clearance_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# -----------------------------------------------------------------------------
# Sanctuary CRM Preferred Vendors & Suppliers
# -----------------------------------------------------------------------------
class VendorSupplierCreateRequest(BaseModel):
    name: str
    category: str
    sanctuary_slug: str = "all"
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    booking_url_or_code: Optional[str] = None
    commission_rate: float = 10.0
    commission_type: str = "PERCENTAGE"
    payment_terms: str = "Sanctuary Native Client Card Auth"
    lead_time_days: int = 7
    preferred_tier: str = "PREFERRED_PARTNER"
    service_description: str
    clinical_relevance: Optional[str] = None


class VendorSupplierUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    sanctuary_slug: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    booking_url_or_code: Optional[str] = None
    commission_rate: Optional[float] = None
    commission_type: Optional[str] = None
    payment_terms: Optional[str] = None
    lead_time_days: Optional[int] = None
    preferred_tier: Optional[str] = None
    service_description: Optional[str] = None
    clinical_relevance: Optional[str] = None
    status: Optional[str] = None


class VendorSupplierResponse(BaseModel):
    id: str
    supplier_code: Optional[str] = None
    name: str
    category: str
    sanctuary_slug: str
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    booking_url_or_code: Optional[str] = None
    commission_rate: float
    commission_type: str
    payment_terms: str
    lead_time_days: int
    preferred_tier: str
    service_description: str
    clinical_relevance: Optional[str] = None
    dossier_url: Optional[str] = None
    status: str = "ACTIVE"
    last_synced_at: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LocationScrapeRequest(BaseModel):
    sanctuary_slug: str
    location_query: Optional[str] = None
    target_sections: Optional[List[str]] = None


class EmailSendRequest(BaseModel):
    subject: str
    body: str


# -----------------------------------------------------------------------------
# Founder Voice Consultation Transcriber
# -----------------------------------------------------------------------------
class VoiceMemoRequest(BaseModel):
    raw_transcript: str = Field(..., description="Audio transcription text from Founder voice memo")
    operator_name: Optional[str] = Field("Kareena Islam", description="Operating founder or concierge name")


class VoiceMemoResponse(BaseModel):
    success: bool
    message: str
    intake_id: str
    action_draft_id: int
    extracted_data: Dict[str, Any]
    status: str


# -----------------------------------------------------------------------------
# 30-Day Post-Sanctuary Continuity of Care Journey
# -----------------------------------------------------------------------------
class ContinuityMilestone(BaseModel):
    day: int
    title: str
    theme: str
    scheduled_date: str
    delivery_channel: str
    content_preview: str
    draft_id: Optional[int] = None


class ContinuityArcGenerateRequest(BaseModel):
    intake_id: str
    departure_date: Optional[str] = Field(None, description="ISO date YYYY-MM-DD or None for today")
    operator_name: Optional[str] = "Kareena Islam"


class ContinuityArcResponse(BaseModel):
    success: bool
    intake_id: str
    guest_name: str
    departure_date: str
    milestones: List[ContinuityMilestone]
    staged_draft_count: int
    message: str

