/**
 * KAI Wellness Retreats - Typed API Client for FastAPI Backend
 */

export interface ApiRetreatAvailability {
  id: string;
  slug: string;
  title: string;
  destination: string;
  spotsTotal: number;
  spotsRemaining: number;
  status: "open" | "waitlist" | "few-spots";
  investmentStarting: string;
}

export interface ApiBookingPayload {
  fullName: string;
  email: string;
  phone: string;
  retreatId: string;
  roomPreference: string;
  movementExperience: string;
  passportValid: string;
  healthNotes?: string;
  intentions?: string;
}

export interface ApiBookingResponse {
  success: boolean;
  message: string;
  bookingReference: string;
  retreatTitle: string;
  status: string;
  createdAt: string;
}

export interface ApiFlightRequestPayload {
  guestName: string;
  email: string;
  phone: string;
  bookingReference?: string;
  retreatId?: string;
  departureAirport: string;
  cabinClass: "economy" | "premium-economy" | "business" | "first";
  preferredAirline?: string;
  travelDatesFlexible?: boolean;
  specialRequests?: string;
}

export interface ApiFlightRequestResponse {
  success: boolean;
  message: string;
  requestId: number;
  departureAirport: string;
  cabinClass: string;
  status: string;
}

export interface ApiCustomGroupPayload {
  organizerName: string;
  email: string;
  phone: string;
  groupSize: number;
  targetDestination: string;
  targetDates?: string;
  somaticGoals?: string;
}

export interface ApiWellnessFrequency {
  frequencyHz: number;
  name: string;
  subtitle: string;
  clinicalIndication: string;
  targetBrainwave: string;
  binauralDifferenceHz: number;
  recommendedDurationMinutes: number;
}

export interface ApiBreathworkProtocol {
  id: string;
  name: string;
  cadence: Record<string, number>;
  targetNervousSystem: string;
  clinicalMechanism: string;
  cyclesRecommended: number;
}

export interface ApiStressAssessmentPayload {
  primarySymptom: string;
  workOverdriveHours: number;
  sleepQualityScale: number;
  travelReadiness: string;
}

export interface ApiStressAssessmentResponse {
  autonomicState: string;
  recommendedCadence: string;
  recommendedFrequencyHz: number;
  recommendedRetreatSlug: string;
  clinicalInsight: string;
}

export interface ApiHealthResponse {
  status: string;
  version: string;
  databaseConnected: boolean;
  totalRetreats: number;
  hostAgency: string;
}

const getBaseUrl = (): string => {
  // If running in browser, relative path uses Next.js rewrite proxy
  if (typeof window !== "undefined") {
    return "/api/v1";
  }
  // Server-side
  return (process.env.FASTAPI_BACKEND_URL || "http://127.0.0.1:8000") + "/api/v1";
};

export async function fetchApiHealth(): Promise<ApiHealthResponse | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/health`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchRetreatAvailability(slugOrId: string): Promise<ApiRetreatAvailability | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/retreats/${slugOrId}/availability`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitFlightConciergeRequest(
  payload: ApiFlightRequestPayload
): Promise<ApiFlightRequestResponse> {
  const res = await fetch(`${getBaseUrl()}/concierge/flight-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit flight request");
  }
  return await res.json();
}

export async function submitCustomGroupInquiry(
  payload: ApiCustomGroupPayload
): Promise<{ success: boolean; message: string; inquiryId: number }> {
  const res = await fetch(`${getBaseUrl()}/retreats/custom-group`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to submit custom group inquiry");
  }
  return await res.json();
}

export async function fetchWellnessFrequencies(): Promise<ApiWellnessFrequency[]> {
  try {
    const res = await fetch(`${getBaseUrl()}/wellness/frequencies`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function assessSomaticStress(
  payload: ApiStressAssessmentPayload
): Promise<ApiStressAssessmentResponse | null> {
  try {
    const res = await fetch(`${getBaseUrl()}/wellness/stress-assessment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
