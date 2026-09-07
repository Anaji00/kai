-- =============================================================================
-- KAI Wellness Retreats: Tern CRM Sidecar Staging Schema (PostgreSQL 16 + pgvector)
-- MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES
-- All intakes, leads, and broadcasts default to status = 'PENDING_APPROVAL'
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 1. Staged Intake and Discovery Records
CREATE TABLE IF NOT EXISTS staging_intakes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_ref VARCHAR(64),
    client_name VARCHAR(128) NOT NULL,
    email VARCHAR(128) NOT NULL,
    phone VARCHAR(32),
    sanctuary_slug VARCHAR(64),
    room_tier VARCHAR(64),
    clinical_profile JSONB NOT NULL,
    flight_request JSONB,
    consultation_thesis JSONB, -- Pre-call thesis and talking points
    status VARCHAR(32) DEFAULT 'PENDING_APPROVAL',
    reviewed_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staging_intakes_status ON staging_intakes(status);
CREATE INDEX IF NOT EXISTS idx_staging_intakes_email ON staging_intakes(email);

-- 2. Sourced B2B Lead Generation Targets
CREATE TABLE IF NOT EXISTS staged_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_name VARCHAR(128) NOT NULL,
    category VARCHAR(64), -- studio, clinic, practitioner, corporate
    contact_name VARCHAR(128),
    email VARCHAR(128),
    phone VARCHAR(32),
    location VARCHAR(128),
    outreach_thesis TEXT,
    status VARCHAR(32) DEFAULT 'PENDING_APPROVAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staged_leads_status ON staged_leads(status);

-- 3. Outbound SMS Logs and Campaign Broadcasts
CREATE TABLE IF NOT EXISTS sms_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_phone VARCHAR(32) NOT NULL,
    message_body TEXT NOT NULL,
    dispatch_type VARCHAR(32), -- OPERATIONAL_ALERT, GUEST_JOURNEY, CAMPAIGN_BROADCAST
    status VARCHAR(32) DEFAULT 'PENDING_APPROVAL',
    dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sms_dispatches_status ON sms_dispatches(status);

-- 4. RAG Knowledge Embeddings
CREATE TABLE IF NOT EXISTS sanctuary_knowledge (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(64) NOT NULL, -- clinical, logistics, itinerary, objection
    title VARCHAR(128) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    embedding VECTOR(1536)
);

CREATE INDEX IF NOT EXISTS idx_sanctuary_knowledge_category ON sanctuary_knowledge(category);
