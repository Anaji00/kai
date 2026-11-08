from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, Float, Boolean
from sqlalchemy.orm import synonym
from datetime import datetime, timezone
import uuid
from backend.database import Base


def generate_uuid_str():
    return str(uuid.uuid4())


def generate_contact_id_str():
    return f"kai_cnt_{uuid.uuid4().hex[:12]}"


def generate_trip_id_str():
    return f"kai_trp_{uuid.uuid4().hex[:12]}"


def _utc_now():
    return datetime.now(timezone.utc)

class StagingIntake(Base):
    """
    Staging table for client reservations, wellness preferences, and clinical inquiries.
    MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES.
    Defaults to status = 'PENDING_APPROVAL'.
    Requires human operator review before committing to Sanctuary CRM.
    """
    __tablename__ = "staging_intakes"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    source_ref = Column(String(64), index=True, nullable=True)  # e.g., KAI-AB12C
    client_name = Column(String(128), nullable=False)
    email = Column(String(128), index=True, nullable=False)
    phone = Column(String(32), nullable=True)
    sanctuary_slug = Column(String(64), nullable=True)  # nosara, amalfi, bali, riviera-maya
    room_tier = Column(String(64), nullable=True)  # Private Villa Sanctuary, Shared Ocean Pavilion
    wellness_profile = Column(JSON, nullable=True, default=dict)
    clinical_screening_enabled = Column(Boolean, default=False, nullable=False)
    clinical_profile = Column(JSON, nullable=False, default=dict)
    flight_request = Column(JSON, nullable=True)
    consultation_thesis = Column(JSON, nullable=True)  # Generated Pre-Call Thesis RAG Dossier
    status = Column(String(32), default="PENDING_APPROVAL", index=True, nullable=False)
    reviewed_by = Column(String(64), nullable=True)
    crm_trip_id = Column(String(64), nullable=True)
    crm_contact_id = Column(String(64), nullable=True)
    sub_trip_id = Column(String(64), nullable=True)
    group_cohort_id = Column(String(64), nullable=True)
    synced_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class StagedLead(Base):
    """
    Staging table for discovered B2B wellness partner targets.
    Discovered studios, sound/breathwork practitioners, longevity clinics.
    """
    __tablename__ = "staged_leads"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    business_name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=True)  # studio, clinic, practitioner, corporate
    contact_name = Column(String(128), nullable=True)
    email = Column(String(128), nullable=True)
    phone = Column(String(32), nullable=True)
    location = Column(String(128), nullable=True)  # e.g. "Houston, TX", "Austin, TX"
    website = Column(String(256), nullable=True)
    outreach_thesis = Column(Text, nullable=True)  # AI-generated partnership proposal
    status = Column(String(32), default="PENDING_APPROVAL", index=True, nullable=False)
    reviewed_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class SmsDispatch(Base):
    """
    Staging table for internal operational pings & outbound SMS campaign broadcasts.
    Requires 1-click human operator authorization to dispatch.
    """
    __tablename__ = "sms_dispatches"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    recipient_phone = Column(String(32), nullable=False)
    recipient_name = Column(String(128), nullable=True)
    message_body = Column(Text, nullable=False)
    dispatch_type = Column(String(32), default="OPERATIONAL_ALERT", nullable=False)  # OPERATIONAL_ALERT, GUEST_JOURNEY, CAMPAIGN_BROADCAST
    status = Column(String(32), default="PENDING_APPROVAL", index=True, nullable=False)
    dispatched_at = Column(DateTime, nullable=True)
    authorized_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class SanctuaryKnowledge(Base):
    """
    RAG knowledge base embeddings for clinical protocols, acoustics,
    sanctuary specifications, and Grand Travel logistics.
    """
    __tablename__ = "sanctuary_knowledge"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    category = Column(String(64), nullable=False, index=True)  # clinical, logistics, itinerary, objection
    title = Column(String(128), nullable=False)
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=False, default=dict)
    embedding_json = Column(JSON, nullable=True)  # Vector representation (float array)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class StagedEmail(Base):
    """
    Staging table for incoming emails sent to agents to parse.
    Stores raw email content, parsed entities, and suggested triage actions.
    """
    __tablename__ = "staged_emails"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sender = Column(String(128), nullable=False)
    recipient = Column(String(128), nullable=False)
    subject = Column(String(256), nullable=False)
    raw_body = Column(Text, nullable=False)
    parsed_intent = Column(String(64), nullable=True)  # VOUCHER_CONFIRMATION, GUEST_INQUIRY, FLIGHT_UPDATE
    parsed_entities = Column(JSON, nullable=False, default=dict)  # extracted dates, codes, names, requests
    suggested_action = Column(Text, nullable=True)
    staging_intake_id = Column(String(36), nullable=True)
    status = Column(String(32), default="PENDING_APPROVAL", index=True, nullable=False)
    reviewed_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class StagedVoucherDiff(Base):
    """
    Staging table for room-block and flight manifest diff audits.
    Flags over-capacity conditions (>14), unallocated rooms, or transfer mismatches.
    """
    __tablename__ = "staged_voucher_diffs"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), nullable=False)
    document_name = Column(String(128), nullable=False)
    external_count = Column(Integer, default=0)
    crm_cohort_count = Column(Integer, default=0)
    cohort_cap = Column(Integer, default=14)
    over_capacity = Column(String(8), default="NO")  # YES, NO
    discrepancies = Column(JSON, nullable=False, default=list)
    reconciliation_notes = Column(Text, nullable=True)
    status = Column(String(32), default="PENDING_APPROVAL", index=True, nullable=False)
    reviewed_by = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class WebhookEventLog(Base):
    """
    Log of inbound events from Sanctuary Card Vault, Expedia / Hotel PMS,
    Grand Travel Flight Desk, WhatsApp Cloud, and Resend.
    """
    __tablename__ = "webhook_event_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    provider_event_id = Column(String(128), unique=True, index=True, nullable=True)  # Idempotency deduplication key
    provider = Column(String(64), nullable=False, index=True)  # HOSPITALITY_EXPEDIA, FLIGHT_DESK, WHATSAPP, RESEND
    event_type = Column(String(64), nullable=False, index=True)  # trip.approved, payment.authorized, hotel.inventory, flight.delayed
    payload_json = Column(JSON, nullable=False, default=dict)
    headers_json = Column(JSON, nullable=False, default=dict)
    status = Column(String(32), default="VERIFIED", index=True, nullable=False)  # VERIFIED, PROCESSED, STAGED, FAILED
    processed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class CalendarEvent(Base):
    """
    Operator retreat calendar events: cohort windows, 20-min Pre-Call consultations,
    flight arrivals, and circadian schedule blocks.
    """
    __tablename__ = "calendar_events"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    title = Column(String(128), nullable=False)
    sanctuary_slug = Column(String(64), nullable=True)  # nosara, amalfi, bali, riviera-maya
    category = Column(String(32), nullable=False, index=True)  # COHORT, CONSULTATION, FLIGHT_ARRIVAL, SOMATIC_SESSION
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    intake_id = Column(String(36), nullable=True, index=True)
    guest_name = Column(String(128), nullable=True)
    location = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class SanctuaryRoute(Base):
    """
    Scenic travel routes connecting international/regional airports to sanctuaries.
    Calculated via geodesic routing with terrain-adjusted driving times and luxury vehicle specs.
    """
    __tablename__ = "sanctuary_routes"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), nullable=False, index=True)
    origin_name = Column(String(128), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lon = Column(Float, nullable=False)
    destination_name = Column(String(128), nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lon = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    estimated_minutes = Column(Integer, nullable=False)
    scenic_description = Column(Text, nullable=False)
    recommended_vehicle = Column(String(128), nullable=False)
    road_conditions = Column(String(64), default="Paved Coastal Highway")
    route_geometry = Column(JSON, nullable=True, default=list)  # List of [lat, lon] coordinates along real road
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class SomaticPointOfInterest(Base):
    """
    Vagus nerve and somatic nature waypoints (waterfalls, sacred springs, quiet sunset bluffs).
    """
    __tablename__ = "somatic_points_of_interest"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # WATERFALL, SACRED_WATER, SUNSET_BLUFF, HOT_SPRINGS, FOREST_BATHING
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    vagus_nerve_benefit = Column(Text, nullable=False)  # Gentle nervous system calm
    ideal_visiting_time = Column(String(64), default="Early Morning (Gentle Sun)")
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class GroundTransferRecord(Base):
    """
    Private chauffeur status & arrival telemetry.
    """
    __tablename__ = "ground_transfer_records"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), nullable=False, index=True)
    guest_name = Column(String(128), nullable=False)
    intake_id = Column(String(36), nullable=True, index=True)
    pickup_location = Column(String(128), nullable=False)
    dropoff_location = Column(String(128), nullable=False)
    chauffeur_notes = Column(Text, nullable=True)
    flight_number = Column(String(32), nullable=True)
    pickup_time = Column(DateTime, nullable=False)
    chauffeur_name = Column(String(128), nullable=False)
    vehicle_type = Column(String(64), nullable=False)  # Mercedes Sprinter VIP, Luxury 4WD Suburban, Private Boat
    status = Column(String(32), default="DISPATCHED", index=True, nullable=False)  # DISPATCHED, EN_ROUTE, ARRIVED_AT_TARMAC, COMPLETED
    chilled_amenities = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class CuratedDiningSpot(Base):
    """
    Organic, Farm-to-Table, Ayurvedic, and Blue Zone dining spots near sanctuaries.
    """
    __tablename__ = "curated_dining_spots"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), nullable=False, index=True)
    name = Column(String(128), nullable=False)
    cuisine_type = Column(String(64), nullable=False)  # Organic Farm-to-Table, Ayurvedic Kitchen, Blue Zone Plant-Forward, Fresh Catch Coastal
    dietary_tags = Column(JSON, nullable=False, default=list)  # ["Gluten-Free", "Dairy-Free", "Low-FODMAP", "Ayurvedic", "Anti-Inflammatory"]
    distance_from_villa_km = Column(Float, nullable=False)
    description = Column(Text, nullable=False)
    nurse_notes = Column(Text, nullable=False)  # Soothing digestion & somatic benefits
    price_tier = Column(String(8), default="$$$")
    reservation_required = Column(String(32), default="CONCIERGE_HANDLED")
    lat = Column(Float, nullable=True)
    lon = Column(Float, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class DestinationReview(Base):
    """
    Verified guest reflections focusing on deep sleep, acoustic quietude, and renewal.
    """
    __tablename__ = "destination_reviews"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), nullable=False, index=True)
    guest_name = Column(String(128), nullable=False)
    stay_dates = Column(String(64), nullable=False)
    overall_rating = Column(Float, default=5.0)
    deep_sleep_score = Column(Float, default=95.0)
    quietude_score = Column(Float, default=98.0)
    clinical_attentiveness_score = Column(Float, default=99.0)
    review_text = Column(Text, nullable=False)
    sentiment_label = Column(String(32), default="DEEPLY_RESTORATIVE")  # DEEPLY_RESTORATIVE, PEACEFUL, RENEWING
    source = Column(String(32), default="VERIFIED_GUEST")  # VERIFIED_GUEST, POST_RETREAT_SURVEY, WEBHOOK
    status = Column(String(32), default="PUBLISHED", index=True, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class DestinationGuide(Base):
    """
    Destination intelligence: entry visas, temple etiquette, jet lag advice, and packing checklists.
    """
    __tablename__ = "destination_guides"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    sanctuary_slug = Column(String(64), unique=True, nullable=False, index=True)
    country = Column(String(64), nullable=False)
    visa_requirements = Column(Text, nullable=False)
    passport_validity = Column(String(128), nullable=False)
    temple_customs = Column(Text, nullable=False)
    circadian_timezone_offset = Column(Integer, default=-6)  # hours from UTC
    packing_checklist = Column(JSON, nullable=False, default=list)
    emergency_clinic_distance = Column(String(128), nullable=False)
    local_concierge_phone = Column(String(32), nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class UploadedDocumentRecord(Base):
    """
    Secure file upload record for guest intake forms, doctor notes, vouchers, and manifests.
    """
    __tablename__ = "uploaded_document_records"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    filename = Column(String(256), nullable=False)
    file_type = Column(String(32), nullable=False)  # PDF, CSV, TXT, JSON
    file_size_bytes = Column(Integer, nullable=False)
    associated_guest_name = Column(String(128), nullable=True)
    associated_intake_id = Column(String(36), nullable=True, index=True)
    extracted_summary = Column(Text, nullable=False)
    clinical_notes_found = Column(JSON, nullable=False, default=list)
    travel_details_found = Column(JSON, nullable=False, default=list)
    safety_clearance_status = Column(String(32), default="CLEARED")  # CLEARED, ATTENTION_NEEDED
    created_at = Column(DateTime, default=_utc_now, nullable=False)


class VendorSupplierRecord(Base):
    """
    Sanctuary CRM Preferred Supplier Registry & Local Database Storage.
    Tracks luxury suppliers, commission structures, contact info, and Nurse Kareena's
    clinical suitability notes.
    """
    __tablename__ = "vendor_supplier_records"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    supplier_code = Column(String(64), index=True, nullable=True)  # e.g. sup_...
    name = Column(String(128), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # TRANSPORTATION_CHAUFFEUR, LODGING_VILLA, etc.
    sanctuary_slug = Column(String(64), default="all", index=True, nullable=False)
    contact_name = Column(String(128), nullable=True)
    email = Column(String(128), nullable=True)
    phone = Column(String(32), nullable=True)
    website = Column(String(256), nullable=True)
    booking_url_or_code = Column(String(256), nullable=True)
    commission_rate = Column(Float, default=10.0, nullable=False)
    commission_type = Column(String(32), default="PERCENTAGE", nullable=False)  # PERCENTAGE, FLAT_FEE, NET_RATE_WHOLESALE, NON_COMMISSIONABLE
    payment_terms = Column(String(128), default="Sanctuary Native Client Card Auth", nullable=False)
    lead_time_days = Column(Integer, default=7, nullable=False)
    preferred_tier = Column(String(32), default="PREFERRED_PARTNER", nullable=False)  # PREFERRED_PARTNER, ACTIVE_SUPPLIER, VETTED_BACKUP
    service_description = Column(Text, nullable=False)
    clinical_relevance = Column(Text, nullable=True)
    dossier_url = Column(String(256), nullable=True)
    last_synced_at = Column(DateTime, default=_utc_now, nullable=True)
    status = Column(String(32), default="ACTIVE", index=True, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class GuestPortalSession(Base):
    """
    Database-backed guest portal magic-link sessions.
    Persists token hashes, guest metadata, and TTLs across server reboots.
    Strict privacy boundary: zero internal notes or clinical contraindications stored here.
    """
    __tablename__ = "guest_portal_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    intake_id = Column(String(36), index=True, nullable=True)
    client_name = Column(String(128), nullable=False)
    email = Column(String(128), index=True, nullable=False)
    sanctuary_slug = Column(String(64), default="nosara", nullable=False)
    room_tier = Column(String(64), default="Private Villa Sanctuary", nullable=False)
    flight_request = Column(JSON, nullable=True, default=dict)
    wellness_profile = Column(JSON, nullable=True, default=dict)
    expires_at = Column(DateTime, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class GuestSomaticPulse(Base):
    """
    In-stay subjective somatic metrics reported by guests via the sanctuary companion.
    Tracks sleep restoration, autonomic calm, and subjective vagus tone.
    Feeds directly into the Clinical Copilot briefing and 30-day continuity arc.
    """
    __tablename__ = "guest_somatic_pulses"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    intake_id = Column(String(36), index=True, nullable=True)
    guest_name = Column(String(128), nullable=False)
    sanctuary_slug = Column(String(64), default="nosara", nullable=False)
    day_number = Column(Integer, default=1, nullable=False)
    phase = Column(String(32), default="MORNING_AWAKENING", nullable=False)  # MORNING_AWAKENING, EVENING_STILLNESS
    restorative_sleep_score = Column(Integer, default=8, nullable=False)  # 1 - 10
    nervous_system_ease = Column(Integer, default=8, nullable=False)  # 1 - 10
    vagal_tone_descriptor = Column(String(64), nullable=True)  # e.g., "Calm & Grounded", "Open Heart", "Lingering Fatigue"
    private_reflection_notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=_utc_now, nullable=False)




class CRMClient(Base):
    """
    Native Sanctuary Travel CRM Client / Contact entity stored in the database.
    Stores comprehensive personal, clinical, passport, and travel history ready for staff querying and automation.
    """
    __tablename__ = "crm_clients"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    crm_contact_id = Column(String(64), unique=True, index=True, default=generate_contact_id_str, nullable=False)  # e.g. kai_cnt_...
    full_name = Column(String(128), nullable=False, index=True)
    email = Column(String(128), unique=True, index=True, nullable=False)
    phone = Column(String(32), nullable=True)
    date_of_birth = Column(String(32), nullable=True)
    passport_number = Column(String(64), nullable=True)
    passport_issuing_country = Column(String(64), nullable=True)
    passport_expiry = Column(String(32), nullable=True)
    passport_valid_6mo = Column(Boolean, default=True, nullable=False)
    address = Column(JSON, nullable=True, default=dict)
    emergency_contact = Column(JSON, nullable=True, default=dict)
    dietary_requirements = Column(Text, nullable=True)
    health_notes = Column(Text, nullable=True)
    movement_experience = Column(String(64), default="all-levels")
    intentions = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list)  # ["KAI_GUEST", "CORTISOL_RESET", "LIE_FLAT_AIR", "VIP_RETREAT", ...]
    loyalty_programs = Column(JSON, nullable=True, default=dict)
    total_lifetime_spend = Column(Float, default=0.0, nullable=False)
    total_trips_count = Column(Integer, default=0, nullable=False)
    source = Column(String(64), default="DIRECT_WEBSITE", nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class CRMTrip(Base):
    """
    Native Sanctuary Travel CRM Trip & Itinerary entity stored in the database.
    Manages complete retreat itineraries, smart flight blocks, pricing, room allocations, and proposals.
    """
    __tablename__ = "crm_trips"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    crm_trip_id = Column(String(64), unique=True, index=True, default=generate_trip_id_str, nullable=False)  # e.g. kai_trp_...
    client_id = Column(String(36), index=True, nullable=False)
    client_name = Column(String(128), nullable=False)
    client_email = Column(String(128), index=True, nullable=False)
    sanctuary_slug = Column(String(64), nullable=False, index=True)
    title = Column(String(256), nullable=False)
    dates = Column(String(128), default="Dates Flexible / TBA", nullable=False)
    room_tier = Column(String(128), default="Private Luxury Suite")
    status = Column(String(32), default="PROPOSED_ITINERARY", index=True, nullable=False)  # INQUIRY, PROPOSED_ITINERARY, DEPOSIT_PAID, CONFIRMED, COMPLETED
    total_investment = Column(Float, default=4850.0, nullable=False)
    deposit_amount = Column(Float, default=1500.0, nullable=False)
    deposit_status = Column(String(32), default="PENDING_CLIENT_AUTHORIZATION", nullable=False)
    final_balance = Column(Float, default=3350.0, nullable=False)
    final_balance_status = Column(String(32), default="SCHEDULED", nullable=False)
    currency = Column(String(8), default="USD", nullable=False)
    payment_terms = Column(String(256), default="KAI Native Card Authorization & Grand Travel Deposit Schedule")
    payment_history = Column(JSON, nullable=True, default=list)  # Ledger of split payments, wire txns, card settlements
    cancellation_record = Column(JSON, nullable=True, default=dict)  # Cancellation audit, refund amount, insurance notes
    smart_flight = Column(JSON, nullable=True)  # Flight schedule, airline, cabin, tracking
    ground_transfer = Column(JSON, nullable=True)  # Chauffeur, pickup, vehicle
    clinical_thesis = Column(JSON, nullable=True)  # Full pre-call clinical talk tracks & RAG notes
    suggested_plan = Column(JSON, nullable=True)  # Somatic & endurance restoration itinerary
    itinerary_blocks = Column(JSON, nullable=False, default=list)  # Day-by-day scheduled activities
    activity_timeline = Column(JSON, nullable=False, default=list)  # Chronological audit stream of guest & operator milestones
    proposal_url = Column(String(256), nullable=True)
    deep_link = Column(String(256), nullable=True)
    created_by = Column(String(64), default="Kareena Islam", nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class AIAutomationPlaybook(Base):
    """
    Database-backed registry of AI Assistant Playbooks & Sanctuary CRM Workflows.
    Each playbook encapsulates a verified real-life use case (Scenarios 1–36),
    its trigger condition, deterministic + LLM synthesis prompts, target endpoint,
    and execution telemetry.
    """
    __tablename__ = "ai_automation_playbooks"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    playbook_code = Column(String(64), unique=True, index=True, nullable=False)  # e.g. SCENARIO_19_FORCE_MAJEURE
    scenario_number = Column(Integer, nullable=False, index=True)
    title = Column(String(160), nullable=False)
    category = Column(String(64), nullable=False, index=True)  # COHORT_CRISIS, AVIATION_LOGISTICS, SANCTUARY_PAY_FX, CLINICAL_RN_TRIAGE, VIP_CONCIERGE
    assistant_persona = Column(String(128), default="KAI Chief of Staff & Clinical RN Copilot", nullable=False)
    trigger_condition = Column(Text, nullable=False)
    automated_actions_json = Column(JSON, nullable=False, default=list)  # Step-by-step automated actions
    sample_payload_json = Column(JSON, nullable=False, default=dict)  # Ready-to-run example payload from stress tests
    target_endpoint = Column(String(160), nullable=False)
    requires_founder_approval = Column(Boolean, default=True, nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    total_runs_count = Column(Integer, default=0, nullable=False)
    last_run_at = Column(DateTime, nullable=True)
    last_status = Column(String(32), default="READY", nullable=False)
    created_at = Column(DateTime, default=_utc_now, nullable=False)
    updated_at = Column(DateTime, default=_utc_now, onupdate=_utc_now, nullable=False)


class AIAutomationExecutionLog(Base):
    """
    Immutable database execution log for every AI Assistant & Staff Automation run.
    Links the triggered playbook/scenario to the generated ActionDraft id,
    latency metrics, AI reasoning summary, and affected guest/cohort records.
    """
    __tablename__ = "ai_automation_execution_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    playbook_code = Column(String(64), index=True, nullable=False)
    playbook_title = Column(String(160), nullable=False)
    category = Column(String(64), index=True, nullable=False)
    assistant_persona = Column(String(128), nullable=False)
    sanctuary_slug = Column(String(64), index=True, nullable=True)
    target_guest_Or_cohort = Column(String(160), nullable=True)
    input_payload_json = Column(JSON, nullable=False, default=dict)
    output_summary_json = Column(JSON, nullable=False, default=dict)
    ai_copilot_briefing = Column(Text, nullable=False)
    staged_draft_ids = Column(JSON, nullable=False, default=list)
    execution_latency_ms = Column(Integer, default=12, nullable=False)
    status = Column(String(32), default="STAGED_FOR_APPROVAL", index=True, nullable=False)
    triggered_by = Column(String(64), default="Kareena Islam, BSN, RN", nullable=False)
    executed_at = Column(DateTime, default=_utc_now, nullable=False)


class AICopilotConversationLog(Base):
    """
    Persistent database store for AI Chief of Staff & Clinical Copilot sessions.
    Tracks staff prompts, RAG citations, safety screening flags, and staged proposals.
    """
    __tablename__ = "ai_copilot_conversation_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid_str, index=True)
    session_id = Column(String(64), index=True, nullable=False)
    operator_name = Column(String(64), default="Kareena Islam, BSN, RN", nullable=False)
    mode = Column(String(64), default="wellness_safety", index=True, nullable=False)
    sanctuary_slug = Column(String(64), nullable=True)
    user_message = Column(Text, nullable=False)
    assistant_response = Column(Text, nullable=False)
    safety_level = Column(String(32), default="CLEAR", nullable=False)
    citations_json = Column(JSON, nullable=False, default=list)
    tool_calls_json = Column(JSON, nullable=False, default=list)
    latency_ms = Column(Integer, default=0, nullable=False)
    model_used = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=_utc_now, nullable=False)

