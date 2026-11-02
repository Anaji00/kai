export interface RetreatItineraryDay {
  day: string;
  title: string;
  highlights: string[];
}

export interface RetreatWeatherProfile {
  targetWindow: string;
  avgHighF: number;
  avgLowF: number;
  avgHighC: number;
  avgLowC: number;
  humidity: string;
  oceanTempF: number;
  oceanTempC: number;
  rainDays: string;
  uvIndex: string;
  climateClassification: string;
  climateSummary: string;
  historicalPattern: string;
  weatherModelNote: string;
  whatToWear: {
    morningPractice: string;
    daytimeExcursion: string;
    eveningDining: string;
  };
  whatToPack: string[];
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
  culturalIntegrations?: string[];
  weatherProfile?: RetreatWeatherProfile;
  inclusions: string[];
  accommodations: string;
  heroImage: string;
  gallery: string[];
  schedule: RetreatItineraryDay[];
  featured?: boolean;
  status: "open" | "waitlist" | "few-spots" | "coming-soon";
}

export type RoomTier = "private-suite" | "shared-luxury" | "flexible";

export interface SuggestedRetreatPlan {
  summary: string;
  peaceAndPiecesThesis: string;
  recommendedSanctuary: string;
  recommendedRoom: string;
  dailyRhythm: string[];
  culturalHighlights: string[];
  weatherAndPacking: string[];
  travelLogisticsNote: string;
  clinicalAndEnduranceNotes: string;
  routedTo: string[];
  generatedBy: string;
}

export interface BookingFormState {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  bookingReference?: string;
  suggestedPlan?: SuggestedRetreatPlan;
  waiverSignedBy?: string;
  waiverSignedAt?: string;
  routedEmails?: string[];
}
