export interface RetreatItineraryDay {
  day: string;
  title: string;
  highlights: string[];
}

export interface Retreat {
  id: string;
  slug: string;
  title: string;
  destination: string;
  country: string;
  locationDetails: string;
  dates: string;
  year: number;
  season?: string;
  duration: string;
  spotsTotal: number;
  spotsRemaining: number;
  investmentStarting: string;
  tagline: string;
  description: string;
  clinicalFocus: string[];
  somaticPractices: string[];
  inclusions: string[];
  accommodations: string;
  heroImage: string;
  gallery: string[];
  schedule: RetreatItineraryDay[];
  featured?: boolean;
  status: "open" | "waitlist" | "few-spots";
}

export type RoomTier = "private-suite" | "shared-luxury" | "flexible";

export interface BookingFormState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  bookingReference?: string;
}
