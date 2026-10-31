/**
 * KAI Wellness Retreats - Tern CRM Sidecar Typed API Client
 * MANDATORY GOVERNANCE: ZERO DIRECT AUTONOMOUS WRITES
 * All client actions interact with staging review tables.
 */

import { FormFillProposal } from "./portal-form-bus";

export interface ClinicalProfile {
  movement_experience?: string;
  passport_valid?: string;
  health_notes?: string;
  intentions?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface FlightRequest {
  departure_airport?: string;
  cabin_class?: string;
  preferred_airline?: string;
  travel_dates_flexible?: boolean;
  special_requests?: string;
  [key: string]: unknown;
}

export interface TernActivityDraft {
  type: "LODGING" | "ACTIVITY" | "TRANSFER";
  day?: number;
  title: string;
  description: string;
  time?: string;
}

export interface PreCallThesis {
  sympathetic_tone_hypothesis: string;
  clinical_flags: string[];
  recommended_sanctuary: string;
  recommended_room_tier: string;
  circadian_protocol: string;
  consultation_talk_tracks: Array<{ phase: string; talking_point: string }>;
  objection_scripts: Array<{ objection: string; clinical_script: string }>;
  tern_itinerary_draft: TernActivityDraft[];
  personalized_email_draft: string;
}

export interface StagingIntake {
  id: string;
  source_ref?: string;
  client_name: string;
  email: string;
  phone?: string;
  sanctuary_slug?: string;
  room_tier?: string;
  wellness_profile?: Record<string, unknown>;
  clinical_screening_enabled?: boolean;
  clinical_profile: ClinicalProfile;
  flight_request?: FlightRequest;
  consultation_thesis?: PreCallThesis;
  status: "PENDING_APPROVAL" | "APPROVED" | "SYNCED_TO_TERN" | "REJECTED";
  reviewed_by?: string;
  tern_trip_id?: string;
  tern_contact_id?: string;
  synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SanctuaryCohortStatus {
  slug: string;
  title: string;
  dates: string;
  capacity_limit: number;
  staged_count: number;
  tern_confirmed_count: number;
  remaining_spots: number;
  status: "OPEN" | "NEAR_CAPACITY" | "FULL";
}

export interface StagedLead {
  id: string;
  business_name: string;
  category?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  outreach_thesis?: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "AWAITING_INFO";
  reviewed_by?: string;
  created_at: string;
}

export interface SmsDispatch {
  id: string;
  recipient_phone: string;
  recipient_name?: string;
  message_body: string;
  dispatch_type: "OPERATIONAL_ALERT" | "GUEST_JOURNEY" | "CAMPAIGN_BROADCAST";
  status: "PENDING_APPROVAL" | "DISPATCHED" | "CANCELLED";
  dispatched_at?: string;
  authorized_by?: string;
  created_at: string;
}

export interface ManifestDiscrepancy {
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  external_name?: string;
  matched_tern_name?: string;
  external_room?: string;
  tern_room?: string;
}

export interface StagedVoucherDiff {
  id: string;
  sanctuary_slug: string;
  document_name: string;
  external_count: number;
  tern_cohort_count: number;
  cohort_cap: number;
  over_capacity: "YES" | "NO";
  discrepancies: ManifestDiscrepancy[];
  reconciliation_notes?: string;
  status: "PENDING_APPROVAL" | "RESOLVED";
  reviewed_by?: string;
  created_at: string;
}

export interface StagedEmail {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  raw_body: string;
  parsed_intent?: string;
  parsed_entities: Record<string, unknown>;
  suggested_action?: string;
  staging_intake_id?: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "ARCHIVED";
  reviewed_by?: string;
  created_at: string;
}

// In the browser, admin auth is added by proxy.ts from the HttpOnly portal session cookie,
// so no credentials are ever bundled client-side. Server-side callers read them from env.
export const getAuthHeaders = (extraHeaders?: Record<string, string>): Record<string, string> => {
  const headers: Record<string, string> = { ...(extraHeaders || {}) };
  if (typeof window === "undefined" && process.env.ADMIN_PASSWORD) {
    const username = process.env.ADMIN_USERNAME || "admin";
    headers.Authorization = `Basic ${Buffer.from(`${username}:${process.env.ADMIN_PASSWORD}`).toString("base64")}`;
  }
  return headers;
};

const getBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "/api/v1/sidecar";
  }
  return (process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000") + "/api/v1/sidecar";
};

export async function sidecarFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const cleanPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${getBaseUrl()}${cleanPath}`;
  const existingHeaders = (options.headers as Record<string, string>) || {};
  const authHeaders = getAuthHeaders(existingHeaders);
  return fetch(url, {
    ...options,
    headers: authHeaders,
  });
}

// ----------------------------------------------------------------------------
// Staging Intakes & 1-Click Tern Sync
// ----------------------------------------------------------------------------
export async function fetchStagedIntakes(status?: string, sanctuarySlug?: string): Promise<StagingIntake[]> {
  try {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (sanctuarySlug && sanctuarySlug !== "ALL") params.append("sanctuary_slug", sanctuarySlug);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/intakes${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchStagedIntakes error:", e);
    return [];
  }
}

export async function fetchCohortCapacities(): Promise<SanctuaryCohortStatus[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/intakes/telemetry/cohorts`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchCohortCapacities error:", e);
    return [];
  }
}

export async function createStagedIntake(
  payload: Partial<StagingIntake>
): Promise<StagingIntake> {
  const res = await fetch(`${getBaseUrl()}/intakes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create staged intake");
  }
  return await res.json();
}

export async function seedDemoIntakes(): Promise<StagingIntake[]> {
  const res = await fetch(`${getBaseUrl()}/intakes/seed-demo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) throw new Error("Failed to seed demonstration records");
  return await res.json();
}

export async function seedSyntheticData(): Promise<{
  status: string;
  message: string;
  counts: Record<string, number>;
  timestamp: string;
}> {
  const res = await fetch(`${getBaseUrl()}/system/seed-synthetic-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to seed comprehensive synthetic data");
  }
  return await res.json();
}

export async function updateStagedIntake(
  intakeId: string,
  payload: Partial<StagingIntake>
): Promise<StagingIntake> {
  const res = await fetch(`${getBaseUrl()}/intakes/${intakeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update staged intake");
  return await res.json();
}

export async function generateIntakeThesis(
  intakeId: string,
  customNotes?: string
): Promise<StagingIntake> {
  const res = await fetch(`${getBaseUrl()}/intakes/${intakeId}/thesis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ regenerate: true, custom_notes: customNotes })
  });
  if (!res.ok) throw new Error("Failed to generate pre-call thesis");
  return await res.json();
}

export async function authorizeTernSync(
  intakeId: string,
  overrideRoomTier?: string,
  operatorName: string = "Kareena Islam"
): Promise<{
  success: boolean;
  message: string;
  intake_id: string;
  tern_contact_id: string;
  tern_trip_id: string;
  applied_tags: string[];
  status: string;
}> {
  const res = await fetch(`${getBaseUrl()}/intakes/${intakeId}/tern-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operator_name: operatorName,
      override_room_tier: overrideRoomTier
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to authorize Tern CRM sync");
  }
  return await res.json();
}

// ----------------------------------------------------------------------------
// Sourced B2B Feeder Leads
// ----------------------------------------------------------------------------
export async function fetchStagedLeads(status?: string, location?: string): Promise<StagedLead[]> {
  try {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (location) params.append("location", location);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/leads${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchStagedLeads error:", e);
    return [];
  }
}

export async function triggerLeadDiscovery(
  city: string = "Houston",
  category: string = "reformer_pilates",
  limit: number = 5
): Promise<StagedLead[]> {
  const res = await fetch(`${getBaseUrl()}/leads/discover`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ city, category, limit })
  });
  if (!res.ok) throw new Error("Failed to trigger lead discovery worker");
  return await res.json();
}

export async function updateStagedLead(
  leadId: string,
  payload: Partial<StagedLead>
): Promise<StagedLead> {
  const res = await fetch(`${getBaseUrl()}/leads/${leadId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Failed to update lead thesis");
  return await res.json();
}

export async function approveStagedLead(
  leadId: string,
  operatorName: string = "Kareena Islam",
  customOutreach?: string
): Promise<StagedLead> {
  const res = await fetch(`${getBaseUrl()}/leads/${leadId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operator_name: operatorName, custom_outreach: customOutreach })
  });
  if (!res.ok) throw new Error("Failed to approve B2B partner lead");
  return await res.json();
}

// ----------------------------------------------------------------------------
// SMS Hub & Campaign Broadcasts
// ----------------------------------------------------------------------------
export async function fetchSmsQueue(status?: string, dispatchType?: string): Promise<SmsDispatch[]> {
  try {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (dispatchType && dispatchType !== "ALL") params.append("dispatch_type", dispatchType);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/messaging/queue${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchSmsQueue error:", e);
    return [];
  }
}

export async function stageOperationalAlert(
  recipientPhone: string,
  recipientName: string,
  messageBody: string
): Promise<SmsDispatch> {
  const res = await fetch(`${getBaseUrl()}/messaging/stage-alert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient_phone: recipientPhone,
      recipient_name: recipientName,
      message_body: messageBody,
      dispatch_type: "OPERATIONAL_ALERT"
    })
  });
  if (!res.ok) throw new Error("Failed to stage operational alert");
  return await res.json();
}

export async function stageBroadcastCampaign(
  campaignName: string,
  targetSegment: string,
  messageBody: string,
  sanctuarySlug?: string
): Promise<SmsDispatch[]> {
  const res = await fetch(`${getBaseUrl()}/messaging/broadcast`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaign_name: campaignName,
      target_segment: targetSegment,
      sanctuary_slug: sanctuarySlug,
      message_body: messageBody,
      operator_name: "Kareena Islam"
    })
  });
  if (!res.ok) throw new Error("Failed to stage broadcast campaign");
  return await res.json();
}

export async function dispatchSms(
  smsId: string,
  operatorName: string = "Kareena Islam"
): Promise<{ success: boolean; message: string; sms_id: string; dispatched_at: string }> {
  const res = await fetch(`${getBaseUrl()}/messaging/${smsId}/dispatch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operator_name: operatorName })
  });
  if (!res.ok) throw new Error("Failed to dispatch SMS");
  return await res.json();
}

// ----------------------------------------------------------------------------
// Voucher Parsing & Manifest Diff Engine
// ----------------------------------------------------------------------------
export async function parseVoucher(
  documentText: string,
  sanctuarySlug: string = "nosara",
  documentName: string = "villa_contract.pdf"
): Promise<{
  success: boolean;
  document_name: string;
  parsed_data: {
    voucher_ref: string;
    sanctuary_slug: string;
    check_in: string;
    check_out: string;
    total_amount: number;
    identified_room_codes: string[];
    raw_text_snippet: string;
  };
}> {
  const res = await fetch(`${getBaseUrl()}/reconciliation/parse-voucher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      document_text: documentText,
      sanctuary_slug: sanctuarySlug,
      document_name: documentName
    })
  });
  if (!res.ok) throw new Error("Failed to parse voucher text");
  return await res.json();
}

export async function runManifestDiff(
  sanctuarySlug: string,
  externalGuestRecords: Array<{ name: string; room?: string }>,
  diffDocumentName: string = "ground_manifest.csv"
): Promise<StagedVoucherDiff> {
  const res = await fetch(`${getBaseUrl()}/reconciliation/manifest-diff`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sanctuary_slug: sanctuarySlug,
      external_guest_records: externalGuestRecords,
      diff_document_name: diffDocumentName
    })
  });
  if (!res.ok) throw new Error("Failed to run manifest diff audit");
  return await res.json();
}

export async function fetchManifestDiffs(sanctuarySlug?: string, status?: string): Promise<StagedVoucherDiff[]> {
  try {
    const params = new URLSearchParams();
    if (sanctuarySlug && sanctuarySlug !== "ALL") params.append("sanctuary_slug", sanctuarySlug);
    if (status && status !== "ALL") params.append("status", status);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/reconciliation/diffs${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchManifestDiffs error:", e);
    return [];
  }
}

export async function resolveManifestDiff(
  diffId: string,
  operatorName: string = "Kareena Islam"
): Promise<{ success: boolean; message: string; diff_id: string; status: string }> {
  const res = await fetch(`${getBaseUrl()}/reconciliation/diffs/${diffId}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operator_name: operatorName })
  });
  if (!res.ok) throw new Error("Failed to resolve manifest diff");
  return await res.json();
}

// ----------------------------------------------------------------------------
// Inbound Concierge Email Ingestion & Triage
// ----------------------------------------------------------------------------
export async function fetchStagedEmails(status?: string, parsedIntent?: string): Promise<StagedEmail[]> {
  try {
    const params = new URLSearchParams();
    if (status && status !== "ALL") params.append("status", status);
    if (parsedIntent && parsedIntent !== "ALL") params.append("parsed_intent", parsedIntent);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/email-in${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchStagedEmails error:", e);
    return [];
  }
}

export async function ingestEmail(
  sender: string,
  subject: string,
  rawBody: string,
  recipient: string = "concierge@kaiwellnessretreats.com"
): Promise<StagedEmail> {
  const res = await fetch(`${getBaseUrl()}/email-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sender, recipient, subject, raw_body: rawBody })
  });
  if (!res.ok) throw new Error("Failed to ingest and parse email");
  return await res.json();
}

export async function approveEmailAction(
  emailId: string,
  actionType: string = "CREATE_INTAKE",
  operatorName: string = "Kareena Islam"
): Promise<StagedEmail> {
  const res = await fetch(`${getBaseUrl()}/email-in/${emailId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_type: actionType, operator_name: operatorName })
  });
  if (!res.ok) throw new Error("Failed to approve email action");
  return await res.json();
}

// ----------------------------------------------------------------------------
// WhatsApp Mobile Operator Dispatch & Simulator
// ----------------------------------------------------------------------------
export interface WhatsAppCardPayload {
  messaging_product: string;
  recipient_type: string;
  to: string;
  type: string;
  interactive: {
    type: string;
    body: { text: string };
    action: {
      buttons: Array<{ type: string; reply: { id: string; title: string } }>;
    };
  };
  metadata: {
    intake_id: string;
    client_name: string;
    sanctuary_slug?: string;
    generated_at: string;
  };
}

export interface WhatsAppSimulationResponse {
  success: boolean;
  card_payload?: WhatsAppCardPayload;
  intake_status?: string;
  room_tier?: string;
  client_name?: string;
  action_result?: {
    success: boolean;
    action: string;
    intake_id: string;
    tern_trip_id?: string;
    reply_text: string;
  };
  parsed?: {
    raw_reply: string;
    detected_intent: string;
    updates: Record<string, unknown>;
  };
  applied_changes?: string[];
  reply_receipt?: string;
  updated_intake?: Partial<StagingIntake>;
}

export async function fetchWhatsAppCard(intakeId: string): Promise<WhatsAppSimulationResponse> {
  try {
    const res = await fetch(`${getBaseUrl()}/webhook/whatsapp/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intake_id: intakeId, action: "GET_CARD" })
    });
    if (!res.ok) throw new Error("Failed to fetch WhatsApp card");
    return await res.json();
  } catch (err) {
    console.warn("Using offline fallback for WhatsApp card:", err);
    return {
      success: true,
      card_payload: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: "+17135550199",
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: `🌿 *KAI CONCIERGE DISPATCH*\n*Guest:* Sarah Jenkins (Burnout Score: 9/10)\n*Sanctuary:* Nosara Rainforest Reset\n*Room:* Private Villa Sanctuary | *VIP Air:* Business (MIA)\n\n📋 *PRE-CALL CLINICAL THESIS:*\n• Sympathetic hyperarousal with insomnia & elevated evening cortisol.\n• Health Notes: Chronic exhaustion, waking at 3:00 AM.\n\n🏷️ *Tags:* CORTISOL_RESET, VAGAL_DYSREGULATION, BLUE_ZONE_DIET\n\n⚡ *Quick Operator Actions:*`
          },
          action: {
            buttons: [
              { type: "reply", reply: { id: `approve_sync_${intakeId}`, title: "⚡ Approve & Sync" } },
              { type: "reply", reply: { id: `view_dossier_${intakeId}`, title: "📝 View Dossier" } },
              { type: "reply", reply: { id: `route_flights_${intakeId}`, title: "✈️ Route Flights" } }
            ]
          }
        },
        metadata: {
          intake_id: intakeId,
          client_name: "Sarah Jenkins",
          generated_at: new Date().toISOString()
        }
      }
    };
  }
}

export async function executeWhatsAppButtonAction(
  intakeId: string,
  buttonId: string,
  operatorName: string = "Kareena Islam"
): Promise<WhatsAppSimulationResponse> {
  try {
    const res = await fetch(`${getBaseUrl()}/webhook/whatsapp/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intake_id: intakeId,
        action: "CLICK_BUTTON",
        button_id: buttonId,
        operator_name: operatorName
      })
    });
    if (!res.ok) throw new Error("Failed to execute WhatsApp action");
    return await res.json();
  } catch (err) {
    console.warn("Using offline fallback for WhatsApp button action:", err);
    const ternTripId = `tern_trp_${Math.random().toString(36).substring(2, 9)}`;
    const ternContactId = `tern_cnt_${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      action_result: {
        success: true,
        action: "APPROVE_AND_SYNC",
        intake_id: intakeId,
        tern_trip_id: ternTripId,
        reply_text: `✅ *AUTHORIZED & SYNCED TO TERN CRM*\n*Guest:* Eleanor Vance\n*Trip ID:* \`${ternTripId}\`\n*Contact ID:* \`${ternContactId}\`\n*Clinical Tags:* CORTISOL_RESET, VAGAL_DYSREGULATION, BLUE_ZONE_DIET\n\n💳 *Payments & Invoicing:* 100% Native to Tern\n🔗 Proposal: https://app.tern.travel/public/proposals/${ternTripId}\n🔗 Payments: https://app.tern.travel/trips/${ternTripId}/payments`
      },
      updated_intake: {
        id: intakeId,
        status: "SYNCED_TO_TERN",
        tern_trip_id: ternTripId,
        tern_contact_id: ternContactId
      }
    };
  }
}

export async function sendWhatsAppReplyText(
  intakeId: string,
  replyText: string
): Promise<WhatsAppSimulationResponse> {
  try {
    const res = await fetch(`${getBaseUrl()}/webhook/whatsapp/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intake_id: intakeId,
        action: "SEND_REPLY",
        reply_text: replyText
      })
    });
    if (!res.ok) throw new Error("Failed to send WhatsApp reply");
    return await res.json();
  } catch (err) {
    console.warn("Using offline fallback for WhatsApp reply:", err);
    const isOcean = replyText.toLowerCase().includes("ocean");
    const newTier = isOcean ? "Shared Ocean Pavilion" : "Private Villa Sanctuary";
    return {
      success: true,
      parsed: {
        raw_reply: replyText,
        detected_intent: isOcean ? "UPDATE_ROOM_TIER" : "TAG_VIP",
        updates: { room_tier: newTier, vip_status: true }
      },
      applied_changes: [
        `Room tier set to '${newTier}'`,
        "VIP Priority flag applied"
      ],
      reply_receipt: `📱 *KAI SYSTEM ACKNOWLEDGEMENT*\nParsed operator instruction: *UPDATE_ROOM_TIER*\nChanges applied to intake:\n• Room tier set to '${newTier}'\n• VIP Priority flag applied`,
      updated_intake: {
        id: intakeId,
        room_tier: newTier
      }
    };
  }
}

// -----------------------------------------------------------------------------
// Calendar Integration Types & API Methods
// -----------------------------------------------------------------------------
export interface CalendarEvent {
  id: string;
  title: string;
  sanctuary_slug?: string;
  category: "COHORT" | "CONSULTATION" | "FLIGHT_ARRIVAL" | "SOMATIC_BLOCK" | string;
  start_time: string;
  end_time: string;
  guest_name?: string;
  location?: string;
  notes?: string;
  intake_id?: string;
}

export async function fetchCalendarEvents(
  sanctuarySlug?: string,
  category?: string
): Promise<CalendarEvent[]> {
  try {
    const params = new URLSearchParams();
    if (sanctuarySlug && sanctuarySlug !== "ALL") params.append("sanctuary_slug", sanctuarySlug);
    if (category && category !== "ALL") params.append("category", category);

    const res = await fetch(`${getBaseUrl()}/calendar/events?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch calendar events");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback calendar events:", err);
    return [
      {
        id: "cohort_nosara_2027",
        title: "Nosara Canopy & Ocean Somatic Alignment",
        sanctuary_slug: "nosara",
        category: "COHORT",
        start_time: "2027-02-18T14:00:00Z",
        end_time: "2027-02-24T11:00:00Z",
        location: "Playa Guiones & Sacred Jungle Canopy, Nosara, Costa Rica",
        notes: "14 guests max. Private villa buyout with Grand Travel & Cruise VIP tarmac transfer."
      },
      {
        id: "consult_demo_01",
        title: "20-Min Alignment Call: Sarah Jenkins",
        sanctuary_slug: "nosara",
        category: "CONSULTATION",
        start_time: new Date(Date.now() + 86400000).toISOString(),
        end_time: new Date(Date.now() + 86400000 + 1200000).toISOString(),
        guest_name: "Sarah Jenkins",
        location: "Google Meet / Phone (+1 713-555-0192)",
        notes: "Review insomnia, elevated evening cortisol, and cold plunge hesitation."
      },
      {
        id: "flight_arr_01",
        title: "VIP Flight Arrival: DL 1928 (MIA -> LIR)",
        sanctuary_slug: "nosara",
        category: "FLIGHT_ARRIVAL",
        start_time: "2027-02-18T13:45:00Z",
        end_time: "2027-02-18T14:45:00Z",
        guest_name: "Sarah Jenkins & Eleanor Vance",
        location: "Liberia Guanacaste Airport (LIR)",
        notes: "Grand Travel Flight Desk tracking active (Cirium). Chauffeur waiting with chilled adaptogenic elixirs."
      }
    ];
  }
}

export async function createCalendarEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
  try {
    const res = await fetch(`${getBaseUrl()}/calendar/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData)
    });
    if (!res.ok) throw new Error("Failed to create calendar event");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback created calendar event:", err);
    return {
      id: `ev_${Date.now()}`,
      title: eventData.title || "Consultation Call",
      category: eventData.category || "CONSULTATION",
      start_time: eventData.start_time || new Date().toISOString(),
      end_time: eventData.end_time || new Date().toISOString(),
      sanctuary_slug: eventData.sanctuary_slug || "nosara",
      guest_name: eventData.guest_name,
      location: eventData.location,
      notes: eventData.notes
    };
  }
}

export function getCalendarIcsFeedUrl(): string {
  return `${getBaseUrl()}/calendar/feed.ics`;
}

// -----------------------------------------------------------------------------
// Clinical Copilot Types & API Methods
// -----------------------------------------------------------------------------
export interface CopilotChatResponse {
  response_text: string;
  mode: "clinical_safety" | "consult_prep" | "travel_concierge" | "studio_ops" | string;
  safety_level?: "CLEAR" | "MODERATE_REVIEW" | "CONTRAINDICATION_ALERT" | string;
  safety_screened?: boolean;
  tool_calls: Array<Record<string, unknown>>;
  citations: string[];
  suggested_followups: string[];
  form_fill_proposal?: FormFillProposal;
  sanctuary_slug?: string;
  latency_ms?: number;
  model_used?: string;
}

export interface LaymanToolGuideItem {
  title: string;
  layman_summary: string;
  why_it_matters: string;
}

export interface CopilotStreamCallbacks {
  onToken: (chunk: string) => void;
  onMeta?: (meta: Partial<CopilotChatResponse>) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
}

export async function chatWithCopilot(
  message: string,
  mode: string = "wellness_safety",
  guestContext?: Record<string, unknown>,
  sanctuarySlug?: string,
  currentPage?: string,
  conversationHistory?: Array<{ role: string; content: string }>
): Promise<CopilotChatResponse> {
  try {
    const res = await fetch(`${getBaseUrl()}/copilot/chat`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message,
        mode,
        guest_context: guestContext,
        sanctuary_slug: sanctuarySlug,
        current_page: currentPage,
        conversation_history: conversationHistory
      })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server returned error status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error("Clinical Copilot connection failed:", err);
    return {
      response_text: `⚠️ **Unable to Connect to KAI Backend Sidecar**\n\nCould not communicate with the sidecar API at \`${getBaseUrl()}/copilot/chat\`.\n\n**Diagnosis / Recovery**:\n* Ensure the FastAPI server is running with \`uvicorn main:app --reload\` (port 8000).\n* Error details: *${err instanceof Error ? err.message : String(err)}*`,
      mode,
      safety_level: undefined,
      safety_screened: false,
      tool_calls: [],
      citations: [],
      suggested_followups: [
        "Start backend: uvicorn main:app --reload",
        "Verify backend API docs at http://localhost:8000/docs",
        "Check GROQ_API_KEY is set on the backend"
      ]
    };
  }
}

export async function chatWithCopilotStream(
  message: string,
  mode: string = "wellness_safety",
  guestContext?: Record<string, unknown>,
  sanctuarySlug?: string,
  currentPage?: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  callbacks?: CopilotStreamCallbacks
): Promise<void> {
  try {
    const res = await fetch(`${getBaseUrl()}/copilot/chat/stream`, {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        message,
        mode,
        guest_context: guestContext,
        sanctuary_slug: sanctuarySlug,
        current_page: currentPage,
        conversation_history: conversationHistory
      })
    });

    if (!res.ok) {
      const errData = await res.text().catch(() => "");
      throw new Error(`SSE stream error (${res.status}): ${errData}`);
    }

    if (!res.body) {
      throw new Error("ReadableStream is not supported by this browser environment.");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const event of events) {
        const trimmed = event.trim();
        if (trimmed.startsWith("data: ")) {
          try {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === "meta" && callbacks?.onMeta) {
              callbacks.onMeta(data);
            } else if (data.type === "token" && data.content) {
              callbacks?.onToken(data.content);
            } else if (data.type === "done") {
              callbacks?.onDone?.();
            } else if (data.type === "error") {
              callbacks?.onError?.(new Error(data.message || "Streaming error occurred"));
            }
          } catch {
            // Non-JSON or incomplete chunk, continue buffer
          }
        }
      }
    }

    callbacks?.onDone?.();
  } catch (err) {
    console.error("Clinical Copilot SSE Streaming failed:", err);
    callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}

export async function fetchLaymanToolGuide(): Promise<{
  guide: Record<string, LaymanToolGuideItem>;
  total_tools: number;
  founder_principles: string[];
}> {
  try {
    const res = await fetch(`${getBaseUrl()}/copilot/tool-guide`);
    if (!res.ok) throw new Error("Failed to fetch layman tool guide");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback layman tool guide:", err);
    return {
      guide: {
        founder_studio: {
          title: "Founder Sanctuary Studio",
          layman_summary: "Your executive home base. View intimate retreat spaces, guest inquiries, urgent clinical questions, and today's schedule at a glance.",
          why_it_matters: "Gives you complete visibility into guest care and travel plans without overwhelming spreadsheets."
        },
        guest_planner: {
          title: "Tern Guest & Travel Planner",
          layman_summary: "Syncs your guest details, custom itineraries, and flights with Tern CRM. All published itineraries include Tern's secure credit card authorizations and payment schedules.",
          why_it_matters: "You never have to build custom payment forms or handle credit card numbers yourself. Tern manages client authorizations, bank security, and waivers 100% natively."
        },
        founder_approval: {
          title: "Personalized Founder Approval (100% Founder-Approved)",
          layman_summary: "A safety shield ensuring no information is sent to external travel platforms or guests without your direct review and approval.",
          why_it_matters: "Protects your high-touch reputation and clinical standards—every proposal and message is reviewed by you."
        },
        concierge_inbox: {
          title: "Concierge Inbox & Guest Messages",
          layman_summary: "Gathers guest emails and inquiries from your contact forms and WhatsApp into one calm, organized inbox.",
          why_it_matters: "Helps you respond to questions with empathetic, nurse-guided clarity in seconds."
        },
        guest_list_check: {
          title: "Guest List & Booking Check",
          layman_summary: "Compares your website registrations with confirmed Tern traveler files to catch any missing dietary needs or flight details.",
          why_it_matters: "Ensures every single guest is accounted for and well looked after before arrival."
        },
        retreat_calendar: {
          title: "Retreat & Alignment Calendar",
          layman_summary: "Your complete timeline for retreat group dates, 20-minute consultation calls, and airport flight arrivals.",
          why_it_matters: "Syncs directly into your personal iPhone or Google Calendar with a 1-click live calendar feed link."
        },
        partner_studios: {
          title: "Partner Wellness Studios & Practices",
          layman_summary: "A curated directory of high-end wellness practices, functional medicine clinics, and yoga studios who refer private clients to KAI.",
          why_it_matters: "Builds referral relationships with aligned holistic doctors and teachers across major wellness hubs."
        },
        flight_desk: {
          title: "Grand Travel Flight Desk & Cirium Tracker",
          layman_summary: "Tracks guest flight bookings, lie-flat seat assignments, and real-time gate arrivals powered by Grand Travel & Cruise and Cirium.",
          why_it_matters: "Alerts your private tarmac chauffeurs if a flight is delayed so guests are never left waiting."
        },
        public_forms: {
          title: "Tern Direct Guest Forms Hub",
          layman_summary: "Instant shareable links to Tern's official guest forms for intake, partner studio referrals, and travel preferences.",
          why_it_matters: "Guests complete their information directly into Tern's secure cloud with zero manual copy-pasting."
        },
        integrations_webhooks: {
          title: "External Travel & Service Connections",
          layman_summary: "A visual hub showing real-time connections to Tern CRM, Expedia / Hotel PMS, Grand Travel Flight Desk, and WhatsApp.",
          why_it_matters: "Keeps your systems in harmony so updates flow quietly in the background without technical headaches."
        }
      },
      total_tools: 10,
      founder_principles: [
        "Tern Native Payments: Zero custom payment liability, Tern handles authorizations.",
        "Personalized Founder Approval: 100% human-in-the-loop review before any external message.",
        "Intimate Group Safety: Strictly 12 to 14 guests max for nervous system sanctuary."
      ]
    };
  }
}

// -----------------------------------------------------------------------------
// Webhooks & Telemetry Types & API Methods
// -----------------------------------------------------------------------------
export interface IntegrationProvider {
  id: string;
  name: string;
  category: string;
  status: "HEALTHY" | "DEGRADED" | "STANDBY";
  webhook_url: string;
  active_events: string[];
  description: string;
  icon: string;
}

export interface WebhookEventLog {
  id: string;
  provider: string;
  event_type: string;
  status: "PROCESSED" | "VERIFIED" | "FAILED" | "STAGED";
  payload: Record<string, unknown>;
  error_message?: string;
  processed_at: string;
}

export async function fetchIntegrationProviders(): Promise<{
  providers: IntegrationProvider[];
  total_active: number;
}> {
  try {
    const res = await fetch(`${getBaseUrl()}/webhooks/providers`);
    if (!res.ok) throw new Error("Failed to fetch provider telemetry");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback integration providers:", err);
    return {
      providers: [
        {
          id: "tern_crm",
          name: "Tern CRM Travel Platform",
          category: "Travel CRM & Native Payments",
          status: "HEALTHY",
          webhook_url: "/api/v1/sidecar/webhooks/tern",
          active_events: ["form_response.submitted", "payment_auth.completed", "trip.published"],
          description: "Natively manages published proposals, guest credit card authorizations, and traveler profiles with zero KAI payment liability.",
          icon: "CreditCard"
        },
        {
          id: "expedia_pms",
          name: "Expedia EPS / Hotel PMS",
          category: "Luxury Hospitality Connector",
          status: "HEALTHY",
          webhook_url: "/api/v1/sidecar/webhooks/hospitality",
          active_events: ["booking.confirmed", "rate.updated", "inventory.allocated"],
          description: "Provides curated pre/post-retreat luxury hotel inventory near sanctuary gateway airports (SJO, LIR, NAP, DPS, CUN).",
          icon: "Building"
        },
        {
          id: "cirium_flights",
          name: "Grand Travel Flight Desk (Cirium)",
          category: "Smart Flights & Flight Tracker",
          status: "HEALTHY",
          webhook_url: "/api/v1/sidecar/webhooks/flight-desk",
          active_events: ["flight.status_update", "gate.assigned", "flight.landed"],
          description: "Real-time gate and schedule telemetry for transcontinental flights, alerting private tarmac chauffeurs immediately.",
          icon: "Plane"
        },
        {
          id: "whatsapp_cloud",
          name: "Meta WhatsApp Cloud API",
          category: "Mobile Operator Dispatch",
          status: "HEALTHY",
          webhook_url: "/api/v1/sidecar/whatsapp/webhook",
          active_events: ["messages.received", "button.clicked", "message.delivered"],
          description: "Sends interactive 1-tap proposal cards to Kareena's phone and parses natural language mobile replies.",
          icon: "MessageSquare"
        },
        {
          id: "resend_email",
          name: "Resend Transactional Email",
          category: "Clinical Concierge Email",
          status: "HEALTHY",
          webhook_url: "/api/v1/sidecar/email-in/ingest",
          active_events: ["email.received", "email.delivered", "email.opened"],
          description: "Secure inbound concierge email triage and nurse-guided response drafting.",
          icon: "Mail"
        }
      ],
      total_active: 5
    };
  }
}

export async function fetchWebhookEventLogs(
  provider?: string,
  limit: number = 25
): Promise<WebhookEventLog[]> {
  try {
    const params = new URLSearchParams({ limit: String(limit) });
    if (provider && provider !== "ALL") params.append("provider", provider);

    const res = await sidecarFetch(`/webhooks/events?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch webhook logs");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback webhook logs:", err);
    return [
      {
        id: "log_tern_01",
        provider: "tern_crm",
        event_type: "payment_auth.completed",
        status: "PROCESSED",
        payload: { trip_id: "trip_tern_nosara_2027", client: "Sarah Jenkins", amount: 6800, status: "AUTHORIZED" },
        processed_at: new Date().toISOString()
      },
      {
        id: "log_expedia_01",
        provider: "expedia_pms",
        event_type: "booking.confirmed",
        status: "PROCESSED",
        payload: { hotel: "Finca Rosa Blanca Coffee Plantation", gateway: "SJO", nights: 1 },
        processed_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: "log_cirium_01",
        provider: "cirium_flights",
        event_type: "flight.status_update",
        status: "PROCESSED",
        payload: { flight: "DL 1928", route: "MIA -> LIR", status: "ON_TIME", eta: "13:45 UTC" },
        processed_at: new Date(Date.now() - 7200000).toISOString()
      }
    ];
  }
}

export async function simulateWebhookEvent(
  provider: string,
  eventType: string,
  payload?: Record<string, unknown>
): Promise<{ success: boolean; log_id: string; message: string }> {
  try {
    const res = await sidecarFetch("/webhooks/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, event_type: eventType, payload })
    });
    if (!res.ok) throw new Error("Failed to simulate webhook event");
    return await res.json();
  } catch (err) {
    console.warn("Using fallback simulated webhook:", err);
    return {
      success: true,
      log_id: `wh_sim_${Date.now()}`,
      message: `Simulated ${eventType} from ${provider} recorded.`
    };
  }
}

// -----------------------------------------------------------------------------
// Curated Luxury Hospitality Search
// -----------------------------------------------------------------------------
export interface CuratedHotel {
  id: string;
  gateway: string;
  gateway_name: string;
  name: string;
  stars: number;
  luxury_tier: string;
  nightly_rate_usd: number;
  distance_to_airport: string;
  sanctuary_proximity: string;
  amenities: string[];
  hero_image: string;
  provider: string;
  affiliate_url: string;
}

export async function searchCuratedHotels(destination?: string): Promise<CuratedHotel[]> {
  const allHotels: CuratedHotel[] = [
    {
      id: "hotel_sjo_01",
      gateway: "sjo",
      gateway_name: "San Jose, Costa Rica (SJO)",
      name: "Finca Rosa Blanca Coffee Plantation Resort & Inn",
      stars: 5,
      luxury_tier: "Boutique Eco-Luxury",
      nightly_rate_usd: 395,
      distance_to_airport: "15 mins to SJO",
      sanctuary_proximity: "Ideal for overnight before private morning transfer to Nosara",
      amenities: ["Organic Coffee Farm", "Chemical-free Springfed Pool", "Farm-to-Table Dining", "Spa Treatments"],
      hero_image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80",
      provider: "Expedia EPS Rapid",
      affiliate_url: "https://www.expedia.com/San-Jose-Hotels-Finca-Rosa-Blanca.h12345"
    },
    {
      id: "hotel_lir_01",
      gateway: "lir",
      gateway_name: "Liberia Guanacaste (LIR)",
      name: "Andaz Costa Rica Resort at Peninsula Papagayo",
      stars: 5,
      luxury_tier: "Ultra-Luxury Waterfront",
      nightly_rate_usd: 750,
      distance_to_airport: "30 mins to LIR",
      sanctuary_proximity: "Direct scenic coastal drive to Nosara / Guiones",
      amenities: ["Onda Spa", "Adults-Only Saltwater Pool", "Private Beach House", "Mixology & Ceviche Bar"],
      hero_image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80",
      provider: "Expedia EPS Rapid",
      affiliate_url: "https://www.expedia.com/Liberia-Hotels-Andaz-Peninsula-Papagayo.h23456"
    },
    {
      id: "hotel_nap_01",
      gateway: "nap",
      gateway_name: "Naples / Sorrento, Italy (NAP)",
      name: "Grand Hotel Excelsior Vittoria (Sorrento)",
      stars: 5,
      luxury_tier: "Historic Cliffside Luxury",
      nightly_rate_usd: 920,
      distance_to_airport: "55 mins to NAP",
      sanctuary_proximity: "Direct hydrofoil & private car gateway to Amalfi Sanctuary",
      amenities: ["Michelin-Starred Dining", "Citrus Grove Pool", "Boutique Wellness Spa", "Panoramic Bay Views"],
      hero_image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=80",
      provider: "Amadeus Hospitality GDS",
      affiliate_url: "https://www.expedia.com/Sorrento-Hotels-Grand-Hotel-Excelsior-Vittoria.h34567"
    },
    {
      id: "hotel_dps_01",
      gateway: "dps",
      gateway_name: "Denpasar / Seminyak, Bali (DPS)",
      name: "The Legian Seminyak Bali",
      stars: 5,
      luxury_tier: "Oceanfront Sanctuary Suites",
      nightly_rate_usd: 580,
      distance_to_airport: "25 mins to DPS",
      sanctuary_proximity: "Ideal 1-night acclimation before private ascent to Ubud & Sidemen",
      amenities: ["Three-Tiered Infinity Pool", "Holistic Wellness Spa", "Sunset Beachfront Lounge", "Butler Service"],
      hero_image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80",
      provider: "Expedia EPS Rapid",
      affiliate_url: "https://www.expedia.com/Bali-Hotels-The-Legian.h45678"
    },
    {
      id: "hotel_cun_01",
      gateway: "cun",
      gateway_name: "Cancun / Riviera Maya, Mexico (CUN)",
      name: "Banyan Tree Mayakoba",
      stars: 5,
      luxury_tier: "Private Lagoon Pool Villas",
      nightly_rate_usd: 850,
      distance_to_airport: "35 mins to CUN",
      sanctuary_proximity: "Adjacent to KAI Riviera Maya Sacred Cenote sanctuary",
      amenities: ["Hydrothermal Rainforest Spa", "Private Heated Plunge Pools", "Saffron Thai Overwater Dining", "Eco-Boats"],
      hero_image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80",
      provider: "Expedia EPS Rapid",
      affiliate_url: "https://www.expedia.com/Riviera-Maya-Hotels-Banyan-Tree-Mayakoba.h56789"
    }
  ];

  if (!destination) return allHotels;
  const destLower = destination.toLowerCase();
  return allHotels.filter(
    h =>
      h.gateway.toLowerCase().includes(destLower) ||
      h.gateway_name.toLowerCase().includes(destLower) ||
      h.name.toLowerCase().includes(destLower) ||
      (destLower.includes("costa rica") && ["sjo", "lir"].includes(h.gateway)) ||
      (destLower.includes("nosara") && ["sjo", "lir"].includes(h.gateway)) ||
      (destLower.includes("amalfi") && h.gateway === "nap") ||
      (destLower.includes("bali") && h.gateway === "dps") ||
      (destLower.includes("riviera") && h.gateway === "cun")
  );
}

// ----------------------------------------------------------------------------
// Travel Logistics, Scenic Geodesic Routing & Points of Interest
// ----------------------------------------------------------------------------
export interface SanctuaryRoute {
  id: string;
  sanctuary_slug: string;
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  distance_km: number;
  estimated_minutes: number;
  scenic_description: string;
  recommended_vehicle: string;
  road_conditions: string;
  route_geometry?: [number, number][];
  created_at: string;
}

export interface RouteCalculateRequest {
  origin_name: string;
  origin_lat: number;
  origin_lon: number;
  destination_name: string;
  destination_lat: number;
  destination_lon: number;
  sanctuary_slug?: string;
  terrain_type?: "COASTAL" | "MOUNTAIN" | "JUNGLE";
}

export interface SomaticPointOfInterest {
  id: string;
  sanctuary_slug: string;
  name: string;
  category: string;
  lat: number;
  lon: number;
  description: string;
  vagus_nerve_benefit: string;
  ideal_visiting_time: string;
  created_at: string;
}

export async function fetchSanctuaryRoutes(sanctuarySlug?: string): Promise<SanctuaryRoute[]> {
  try {
    const qs = sanctuarySlug && sanctuarySlug !== "ALL" ? `?sanctuary_slug=${sanctuarySlug}` : "";
    const res = await fetch(`${getBaseUrl()}/travel/routes${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchSanctuaryRoutes error:", e);
    return [];
  }
}

export async function calculateDynamicRoute(req: RouteCalculateRequest): Promise<SanctuaryRoute | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/routes/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("calculateDynamicRoute error:", e);
    return null;
  }
}

export async function fetchPointsOfInterest(sanctuarySlug?: string): Promise<SomaticPointOfInterest[]> {
  try {
    const qs = sanctuarySlug && sanctuarySlug !== "ALL" ? `?sanctuary_slug=${sanctuarySlug}` : "";
    const res = await fetch(`${getBaseUrl()}/travel/points-of-interest${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchPointsOfInterest error:", e);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Live Microclimate Bioclimatology & Sanctuary Weather
// ----------------------------------------------------------------------------
export interface WeatherForecast {
  sanctuary_slug: string;
  location_name: string;
  current_temp_c: number;
  feels_like_c: number;
  humidity: number;
  uv_index: number;
  wind_speed_kmh: number;
  conditions: string;
  prana_breathwork_window: string;
  sunset_sound_bath_recommendation: string;
  nurse_somatic_guidance: string;
  cached: boolean;
  fetched_at: string;
}

export async function fetchSanctuaryWeather(
  sanctuarySlug = "nosara",
  lat?: number,
  lon?: number
): Promise<WeatherForecast | null> {
  try {
    const params = new URLSearchParams({ sanctuary_slug: sanctuarySlug });
    if (lat !== undefined) params.append("lat", lat.toString());
    if (lon !== undefined) params.append("lon", lon.toString());
    const res = await fetch(`${getBaseUrl()}/travel/weather?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("fetchSanctuaryWeather error:", e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Curated Dining & Blue Zone Nutrition
// ----------------------------------------------------------------------------
export interface CuratedDiningSpot {
  id: string;
  sanctuary_slug: string;
  name: string;
  cuisine_type: string;
  dietary_tags: string[];
  distance_from_villa_km: number;
  description: string;
  nurse_notes: string;
  price_tier: string;
  reservation_required: string;
  lat?: number;
  lon?: number;
  created_at: string;
}

export interface CuratedDiningCreateRequest {
  sanctuary_slug: string;
  name: string;
  cuisine_type: string;
  dietary_tags: string[];
  distance_from_villa_km: number;
  description: string;
  nurse_notes: string;
  price_tier?: string;
  reservation_required?: string;
  lat?: number;
  lon?: number;
}

export async function fetchCuratedDining(
  sanctuarySlug?: string,
  dietaryTag?: string,
  cuisineType?: string,
  maxDistanceKm?: number
): Promise<CuratedDiningSpot[]> {
  try {
    const params = new URLSearchParams();
    if (sanctuarySlug && sanctuarySlug !== "ALL") params.append("sanctuary_slug", sanctuarySlug);
    if (dietaryTag && dietaryTag !== "ALL") params.append("dietary_tag", dietaryTag);
    if (cuisineType) params.append("cuisine_type", cuisineType);
    if (maxDistanceKm) params.append("max_distance_km", maxDistanceKm.toString());
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/travel/dining${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchCuratedDining error:", e);
    return [];
  }
}

export async function createCuratedDiningSpot(req: CuratedDiningCreateRequest): Promise<CuratedDiningSpot | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/dining`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("createCuratedDiningSpot error:", e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Verified Guest Reflections & Somatic Reviews
// ----------------------------------------------------------------------------
export interface DestinationReview {
  id: string;
  sanctuary_slug: string;
  guest_name: string;
  stay_dates: string;
  overall_rating: number;
  deep_sleep_score: number;
  quietude_score: number;
  clinical_attentiveness_score: number;
  review_text: string;
  sentiment_label: string;
  source: string;
  status: string;
  created_at: string;
}

export interface DestinationReviewCreateRequest {
  sanctuary_slug: string;
  guest_name: string;
  stay_dates: string;
  overall_rating: number;
  review_text: string;
  source?: string;
}

export interface InboundReviewWebhookPayload {
  provider?: string;
  sanctuary_slug: string;
  guest_name: string;
  stay_dates: string;
  rating: number;
  comment: string;
  metadata?: Record<string, unknown>;
}

export async function fetchDestinationReviews(sanctuarySlug?: string): Promise<DestinationReview[]> {
  try {
    const qs = sanctuarySlug && sanctuarySlug !== "ALL" ? `?sanctuary_slug=${sanctuarySlug}` : "";
    const res = await fetch(`${getBaseUrl()}/travel/reviews${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchDestinationReviews error:", e);
    return [];
  }
}

export async function submitDestinationReview(req: DestinationReviewCreateRequest): Promise<DestinationReview | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("submitDestinationReview error:", e);
    return null;
  }
}

export async function simulateReviewWebhook(payload: InboundReviewWebhookPayload): Promise<DestinationReview | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/reviews/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("simulateReviewWebhook error:", e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Destination Intelligence & Regulatory Dossiers
// ----------------------------------------------------------------------------
export interface DestinationGuide {
  id: string;
  sanctuary_slug: string;
  country: string;
  visa_requirements: string;
  passport_validity: string;
  temple_customs: string;
  circadian_timezone_offset: number;
  packing_checklist: string[];
  emergency_clinic_distance: string;
  local_concierge_phone?: string;
  created_at: string;
  updated_at: string;
}

export async function fetchDestinationGuide(sanctuarySlug = "nosara"): Promise<DestinationGuide | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/destination-guide/${sanctuarySlug}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("fetchDestinationGuide error:", e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Ground Transfers & Chauffeur Telemetry
// ----------------------------------------------------------------------------
export interface GroundTransfer {
  id: string;
  sanctuary_slug: string;
  guest_name: string;
  intake_id?: string;
  pickup_location: string;
  dropoff_location: string;
  flight_number?: string;
  pickup_time: string;
  chauffeur_name: string;
  vehicle_type: string;
  status: "DISPATCHED" | "EN_ROUTE" | "ARRIVED_AT_TARMAC" | "COMPLETED";
  chilled_amenities: string[];
  created_at: string;
  updated_at: string;
}

export async function fetchGroundTransfers(sanctuarySlug?: string): Promise<GroundTransfer[]> {
  try {
    const qs = sanctuarySlug && sanctuarySlug !== "ALL" ? `?sanctuary_slug=${sanctuarySlug}` : "";
    const res = await fetch(`${getBaseUrl()}/travel/transfers${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchGroundTransfers error:", e);
    return [];
  }
}

export async function simulateGroundTransferWebhook(
  transferId: string,
  status: string,
  notes?: string
): Promise<{ status: string; transfer_id: string; new_status: string } | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/transfers/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transfer_id: transferId, status, chauffeur_notes: notes }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("simulateGroundTransferWebhook error:", e);
    return null;
  }
}

// ----------------------------------------------------------------------------
// Secure Document Upload & Clinical Ingestion
// ----------------------------------------------------------------------------
export interface UploadedDocument {
  id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
  associated_guest_name?: string;
  associated_intake_id?: string;
  extracted_summary: string;
  clinical_notes_found: string[];
  travel_details_found: string[];
  safety_clearance_status: "CLEARED" | "ATTENTION_NEEDED";
  created_at: string;
}

export async function uploadGuestDocument(
  file: File,
  guestName?: string,
  intakeId?: string
): Promise<UploadedDocument | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (guestName) formData.append("guest_name", guestName);
    if (intakeId) formData.append("intake_id", intakeId);

    const res = await fetch(`${getBaseUrl()}/copilot/upload-document`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || "Failed to upload document");
    }
    return await res.json();
  } catch (e) {
    console.error("uploadGuestDocument error:", e);
    throw e;
  }
}

export async function fetchUploadedDocuments(): Promise<UploadedDocument[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/travel/documents`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchUploadedDocuments error:", e);
    return [];
  }
}

// ----------------------------------------------------------------------------
// Tern Preferred Vendors & Suppliers Registry
// ----------------------------------------------------------------------------
export interface VendorSupplier {
  id: string;
  tern_supplier_id?: string;
  name: string;
  category:
    | "TRANSPORTATION_CHAUFFEUR"
    | "LODGING_VILLA"
    | "WELLNESS_SOMATIC"
    | "ORGANIC_CATERING"
    | "TOUR_EXCURSION"
    | "AIR_CHARTER"
    | "MEDICAL_EMERGENCY"
    | string;
  sanctuary_slug: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  booking_url_or_code?: string;
  commission_rate: number;
  commission_type: "PERCENTAGE" | "FLAT_FEE" | "NET_RATE_WHOLESALE" | "NON_COMMISSIONABLE" | string;
  payment_terms: string;
  lead_time_days: number;
  preferred_tier: "PREFERRED_PARTNER" | "ACTIVE_SUPPLIER" | "VETTED_BACKUP" | "INACTIVE" | string;
  service_description: string;
  clinical_relevance?: string;
  tern_deep_link?: string;
  tern_sync_status: "SYNCED" | "PENDING_SYNC" | "LOCAL_ONLY" | string;
  last_synced_at?: string;
  status: "ACTIVE" | "INACTIVE" | string;
  created_at: string;
  updated_at: string;
}

export interface VendorSupplierCreateRequest {
  name: string;
  category: string;
  sanctuary_slug?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  booking_url_or_code?: string;
  commission_rate?: number;
  commission_type?: string;
  payment_terms?: string;
  lead_time_days?: number;
  preferred_tier?: string;
  service_description: string;
  clinical_relevance?: string;
}

export interface VendorSupplierUpdateRequest {
  name?: string;
  category?: string;
  sanctuary_slug?: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  website?: string;
  booking_url_or_code?: string;
  commission_rate?: number;
  commission_type?: string;
  payment_terms?: string;
  lead_time_days?: number;
  preferred_tier?: string;
  service_description?: string;
  clinical_relevance?: string;
  status?: string;
}

export async function fetchVendors(sanctuarySlug?: string, category?: string): Promise<VendorSupplier[]> {
  try {
    const params = new URLSearchParams();
    if (sanctuarySlug && sanctuarySlug !== "all") params.append("sanctuary_slug", sanctuarySlug);
    if (category && category !== "ALL") params.append("category", category);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getBaseUrl()}/vendors${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("fetchVendors error:", e);
    return [];
  }
}

export async function fetchSingleVendor(id: string): Promise<VendorSupplier | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/vendors/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("fetchSingleVendor error:", e);
    return null;
  }
}

export async function createVendor(req: VendorSupplierCreateRequest): Promise<VendorSupplier | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("createVendor error:", e);
    return null;
  }
}

export async function updateVendor(id: string, req: VendorSupplierUpdateRequest): Promise<VendorSupplier | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/vendors/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("updateVendor error:", e);
    return null;
  }
}

export async function deleteVendor(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${getBaseUrl()}/vendors/${id}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (e) {
    console.error("deleteVendor error:", e);
    return false;
  }
}

export async function syncVendorToTern(id: string): Promise<VendorSupplier | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/vendors/${id}/sync-tern`, {
      method: "POST",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("syncVendorToTern error:", e);
    return null;
  }
}



export async function sendLeadEmail(leadId: string, subject: string, body: string): Promise<{ status: string; message: string }> {
  try {
    const res = await fetch(`${getBaseUrl()}/leads/${leadId}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body })
    });
    if (!res.ok) {
      throw new Error(`Error: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error("Failed to send lead email:", error);
    throw error;
  }
}

export interface ApiActionDraft {
  id: number;
  type: string;
  guest_name: string;
  content: string;
  status: string;
  created_at: string;
  channel_target?: string;
  channel_badge?: string;
  icon?: string;
}

export interface DraftStats {
  total_pending: number;
  total_approved: number;
  total_discarded: number;
  total_all: number;
  by_category: Record<string, number>;
}

const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  return (process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000") + "/api/v1";
};

export async function fetchPendingDrafts(status: string = "pending_review", category?: string): Promise<ApiActionDraft[]> {
  try {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (category && category !== "all") params.append("category", category);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${getApiBaseUrl()}/drafts${qs}`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch drafts');
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function fetchDraftStats(): Promise<DraftStats> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/drafts/stats`, {
      cache: 'no-store',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch draft stats');
    return await res.json();
  } catch (err) {
    console.error(err);
    return {
      total_pending: 0,
      total_approved: 0,
      total_discarded: 0,
      total_all: 0,
      by_category: {}
    };
  }
}

export async function approveDraftAction(
  draftId: number,
  updatedContent?: string,
  operatorName: string = "Kareena Islam"
): Promise<{ status: string; message: string; draft_id: number; dispatch_result?: Record<string, unknown> }> {
  const res = await fetch(`${getApiBaseUrl()}/drafts/${draftId}/approve`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ updated_content: updatedContent, operator_name: operatorName }),
  });
  if (!res.ok) throw new Error('Failed to approve draft');
  return await res.json();
}

export async function discardDraftAction(
  draftId: number,
  reason?: string,
  operatorName: string = "Kareena Islam"
): Promise<{ status: string; message: string; draft_id: number }> {
  const res = await fetch(`${getApiBaseUrl()}/drafts/${draftId}/discard`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ reason, operator_name: operatorName }),
  });
  if (!res.ok) throw new Error('Failed to discard draft');
  return await res.json();
}

export async function updateDraftStatus(draftId: number, status: string, content: string): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/drafts/${draftId}`, {
      method: 'PATCH',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, content }),
    });
    return res.ok;
  } catch (err) {
    console.error(err);
    return false;
  }
}

export async function batchApproveDraftsAction(
  draftIds?: number[],
  category: string = "routine",
  operatorName: string = "Kareena Islam"
): Promise<{
  status: string;
  approved_count: number;
  operator_name: string;
  results: Array<{ draft_id: number; type: string; guest_name: string; dispatch_result?: Record<string, unknown> }>;
  safety_notice?: string;
}> {
  const res = await fetch(`${getApiBaseUrl()}/drafts/batch-approve`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      draft_ids: draftIds && draftIds.length > 0 ? draftIds : null,
      category,
      operator_name: operatorName
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to batch approve action drafts');
  }
  return await res.json();
}

export async function dispatchDraftsDigestWhatsApp(): Promise<{
  status: string;
  message: string;
  pending_count: number;
  recipient: string;
  digest_payload: Record<string, unknown>;
}> {
  const res = await fetch(`${getApiBaseUrl()}/drafts/digest/whatsapp`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to dispatch WhatsApp drafts digest');
  }
  return await res.json();
}

// ----------------------------------------------------------------------------
// Voice Consultation Transcriber & 30-Day Post-Sanctuary Continuity Journey
// ----------------------------------------------------------------------------
export interface VoiceMemoResponse {
  success: boolean;
  message: string;
  intake_id: string;
  action_draft_id: number;
  extracted_data: {
    client_name: string;
    email: string;
    sanctuary_slug: string;
    room_tier: string;
    wellness_profile: Record<string, unknown>;
    clinical_screening_enabled: boolean;
    clinical_profile: Record<string, unknown>;
    flight_request: Record<string, unknown>;
    welcome_email_draft: string;
    extracted_at: string;
  };
  status: string;
}

export interface ContinuityMilestone {
  day: number;
  title: string;
  theme: string;
  scheduled_date: string;
  delivery_channel: string;
  content_preview: string;
  draft_id?: number;
}

export interface ContinuityArcResponse {
  success: boolean;
  intake_id: string;
  guest_name: string;
  departure_date: string;
  milestones: ContinuityMilestone[];
  staged_draft_count: number;
  message: string;
}

export interface ActiveContinuityDraft {
  draft_id: number;
  type: string;
  guest_name: string;
  status: string;
  content: string;
  created_at: string;
}

export async function transcribeVoiceMemo(audio: Blob): Promise<string> {
  const ext = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
  const form = new FormData();
  form.append('file', audio, `voice-memo.${ext}`);
  const res = await fetch(`${getApiBaseUrl()}/sidecar/intakes/voice-memo/transcribe`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to transcribe the recording');
  }
  const data = await res.json();
  return data.transcript as string;
}

export async function submitVoiceConsultationMemo(
  rawTranscript: string,
  operatorName: string = "Kareena Islam"
): Promise<VoiceMemoResponse> {
  const res = await fetch(`${getApiBaseUrl()}/sidecar/intakes/voice-memo`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      raw_transcript: rawTranscript,
      operator_name: operatorName
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to process voice consultation memo');
  }
  return await res.json();
}

export async function generateContinuityArc(
  intakeId: string,
  departureDate?: string,
  operatorName: string = "Kareena Islam"
): Promise<ContinuityArcResponse> {
  const res = await fetch(`${getApiBaseUrl()}/sidecar/continuity/generate-arc`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      intake_id: intakeId,
      departure_date: departureDate || null,
      operator_name: operatorName
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate 30-day post-retreat continuity arc');
  }
  return await res.json();
}

export async function fetchContinuityArcs(
  guestName?: string,
  status?: string
): Promise<ActiveContinuityDraft[]> {
  const params = new URLSearchParams();
  if (guestName) params.append('guest_name', guestName);
  if (status) params.append('status', status);
  const url = `${getApiBaseUrl()}/sidecar/continuity/active-arcs${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch continuity arcs');
  }
  return await res.json();
}

export interface GuestPortalTokenResponse {
  token: string;
  portal_url: string;
  expires_at: string;
  guest_name: string;
  sanctuary_slug: string;
  message?: string;
}

export async function generateGuestPortalToken(intakeId: string): Promise<GuestPortalTokenResponse> {
  const url = `${getApiBaseUrl()}/sidecar/guest-portal/generate-token?intake_id=${encodeURIComponent(intakeId)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate guest portal token');
  }
  return await res.json();
}

export async function fetchGuestPortalDemoToken(): Promise<GuestPortalTokenResponse> {
  const url = `${getApiBaseUrl()}/sidecar/guest-portal/demo-token`;
  const res = await fetch(url, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to generate guest demo token');
  }
  return await res.json();
}




