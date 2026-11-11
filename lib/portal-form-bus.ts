/**
 * KAI Sanctuary Durable Cross-Route Portal Intent Bus
 * Facilitates durable cross-route intent dispatching, auto-replay on modal mount,
 * 5-minute TTL expiration, and correlation ID deduplication.
 */

export type FormFillType =
  | "vendor_supplier"
  | "route_calculator"
  | "curated_dining"
  | "somatic_review"
  | "location_scraper"
  | "broadcast_sms"
  | "guest_intake"
  | "client_form"
  | "trip_builder"
  | "native_forms"
  | "email_review"
  | "continuity_journey"
  | "copilot_chat"
  | "sovereign_sync_preview"
  | "attendee_row"
  | "partner_lead"
  | "billing_folio"
  | "crm_mutation"
  | "calendar_event"
  | "cohort_update";

export interface FormFillProposal {
  correlation_id?: string;
  created_at_ms?: number;
  ttl_ms?: number; // Defaults to 5 minutes (300,000 ms)
  form_type: FormFillType;
  form_title: string;
  target_tab?: string; // "vendors", "routes", "dining", "reviews", "destination", "messaging", "founder_studio", "crm"
  target_url?: string; // "/portal", "/portal/crm", "/portal/vendors", "/portal/travel-logistics?tab=dining"
  action_title?: string;
  action_type?: string;
  target_id?: string;
  fields: Record<string, unknown>;
  payload?: Record<string, unknown>;
  summary: string;
  requires_approval?: boolean;
  approval_required?: boolean;
  executed?: boolean;
  entity_type?: string;
  record_id?: string;
  changes?: Record<string, unknown>;
}

export const FORM_FILL_EVENT = "kai:portal:form-fill";
export const TAB_SWITCH_EVENT = "kai:portal:tab-switch";
const PENDING_PROPOSAL_KEY = "kai:pending_proposal";
const PROCESSED_CORRELATIONS_KEY = "kai:processed_correlations";
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Returns recent processed correlation IDs to guarantee idempotency.
 */
function getProcessedCorrelations(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(PROCESSED_CORRELATIONS_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
    }
  } catch (e) {
    console.warn("Could not read processed correlations:", e);
  }
  return new Set();
}

function markCorrelationProcessed(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const set = getProcessedCorrelations();
    set.add(id);
    const recent = Array.from(set).slice(-50); // Keep last 50
    sessionStorage.setItem(PROCESSED_CORRELATIONS_KEY, JSON.stringify(recent));
  } catch (e) {
    console.warn("Could not record processed correlation:", e);
  }
}

/**
 * Stores a pending intent proposal in durable sessionStorage with correlation ID & TTL.
 */
export function setPendingFormFill(proposal: FormFillProposal): void {
  if (typeof window !== "undefined") {
    try {
      const enriched: FormFillProposal = {
        ...proposal,
        correlation_id: proposal.correlation_id || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        created_at_ms: proposal.created_at_ms || Date.now(),
        ttl_ms: proposal.ttl_ms || DEFAULT_TTL_MS,
      };
      sessionStorage.setItem(PENDING_PROPOSAL_KEY, JSON.stringify(enriched));
    } catch (e) {
      console.warn("Could not save pending form fill to sessionStorage:", e);
    }
  }
}

/**
 * Retrieves the pending intent proposal if valid and unexpired, and clears it from storage.
 */
export function getAndClearPendingFormFill(): FormFillProposal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PROPOSAL_KEY);
    if (raw) {
      sessionStorage.removeItem(PENDING_PROPOSAL_KEY);
      const proposal: FormFillProposal = JSON.parse(raw);

      // Verify 5-minute TTL
      const createdAt = proposal.created_at_ms || 0;
      const ttl = proposal.ttl_ms || DEFAULT_TTL_MS;
      if (Date.now() - createdAt > ttl) {
        console.info("Expired cross-route intent proposal discarded:", proposal.form_title);
        return null;
      }

      // Check deduplication
      if (proposal.correlation_id) {
        const processed = getProcessedCorrelations();
        if (processed.has(proposal.correlation_id)) {
          console.info("Duplicate intent proposal suppressed by correlation ID:", proposal.correlation_id);
          return null;
        }
        markCorrelationProcessed(proposal.correlation_id);
      }

      return proposal;
    }
  } catch (e) {
    console.warn("Could not retrieve pending form fill from sessionStorage:", e);
  }
  return null;
}

/**
 * Dispatches an intent across portal routes and triggers active listeners.
 */
export function dispatchFormFill(proposal: FormFillProposal): void {
  if (typeof window !== "undefined") {
    const correlation_id = proposal.correlation_id || `corr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const enriched: FormFillProposal = {
      ...proposal,
      correlation_id,
      created_at_ms: Date.now(),
      ttl_ms: proposal.ttl_ms || DEFAULT_TTL_MS,
    };
    setPendingFormFill(enriched);
    window.dispatchEvent(new CustomEvent(FORM_FILL_EVENT, { detail: enriched }));
  }
}

/**
 * Subscribes to live form fill events, and automatically replays any durable pending
 * intent matched on component mount.
 */
export function onFormFill(callback: (proposal: FormFillProposal) => void): () => void {
  if (typeof window === "undefined") return () => {};

  // Check and replay durable pending proposal on mount
  const pending = getAndClearPendingFormFill();
  if (pending) {
    setTimeout(() => {
      callback(pending);
    }, 50);
  }

  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<FormFillProposal>;
    if (customEvent.detail?.correlation_id) {
      markCorrelationProcessed(customEvent.detail.correlation_id);
    }
    callback(customEvent.detail);
  };
  window.addEventListener(FORM_FILL_EVENT, handler);
  return () => window.removeEventListener(FORM_FILL_EVENT, handler);
}

export function dispatchTabSwitch(tab: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TAB_SWITCH_EVENT, { detail: tab }));
  }
}

export function onTabSwitch(callback: (tab: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<string>;
    callback(customEvent.detail);
  };
  window.addEventListener(TAB_SWITCH_EVENT, handler);
  return () => window.removeEventListener(TAB_SWITCH_EVENT, handler);
}

/**
 * Universal "Explain This" contextual trigger.
 * Dispatches an event to open ClinicalCopilotDrawer pre-loaded with query and mode.
 */
export function triggerExplainThis(query: string, mode: string = "clinical_safety"): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("kai:copilot:open", { detail: { query, mode } }));
  }
}
