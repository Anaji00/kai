/**
 * Portal Form Fill Event Bus
 * Facilitates seamless 1-click Founder Approvals from the Clinical Copilot Chat
 * to auto-open and pre-populate forms across all Sanctuary domains.
 */

export interface FormFillProposal {
  form_type:
    | "vendor_supplier"
    | "route_calculator"
    | "curated_dining"
    | "somatic_review"
    | "location_scraper"
    | "broadcast_sms"
    | "guest_intake";
  form_title: string;
  target_tab?: string; // "vendors", "routes", "dining", "reviews", "destination", "messaging", "founder_studio"
  target_url?: string; // "/portal", "/portal/vendors", "/portal/travel-logistics?tab=dining"
  action_title?: string;
  fields: Record<string, unknown>;
  payload?: Record<string, unknown>;
  summary: string;
  requires_approval?: boolean;
  approval_required?: boolean;
}

export const FORM_FILL_EVENT = "kai:portal:form-fill";
export const TAB_SWITCH_EVENT = "kai:portal:tab-switch";
const PENDING_PROPOSAL_KEY = "kai:pending_proposal";

export function setPendingFormFill(proposal: FormFillProposal): void {
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(PENDING_PROPOSAL_KEY, JSON.stringify(proposal));
    } catch (e) {
      console.warn("Could not save pending form fill to sessionStorage:", e);
    }
  }
}

export function getAndClearPendingFormFill(): FormFillProposal | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_PROPOSAL_KEY);
    if (raw) {
      sessionStorage.removeItem(PENDING_PROPOSAL_KEY);
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not retrieve pending form fill from sessionStorage:", e);
  }
  return null;
}

export function dispatchFormFill(proposal: FormFillProposal): void {
  if (typeof window !== "undefined") {
    setPendingFormFill(proposal);
    window.dispatchEvent(new CustomEvent(FORM_FILL_EVENT, { detail: proposal }));
  }
}

export function onFormFill(callback: (proposal: FormFillProposal) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<FormFillProposal>;
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
