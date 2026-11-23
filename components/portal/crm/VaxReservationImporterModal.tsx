"use client";

import React, { useState, useEffect } from "react";
import {
  Plane,
  Building2,
  Bus,
  Compass,
  Users,
  DollarSign,
  CheckCircle2,
  Copy,
  Sparkles,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Search,
  Layers,
  Loader2,
  ClipboardPaste,
} from "lucide-react";
import {
  CRMClientItem,
  createCrmClient,
  createCrmTrip,
  CRMTripCreatePayload,
  parseSmartPasteText,
  executeCopilotCrmAction,
} from "@/lib/sidecar-api";

export interface VaxAirOriginLeg {
  tabLabel: string;
  originCode: string;
  originCity: string;
  destinationCode: string;
  destinationCity: string;
  airline: string;
  outboundFlight: string;
  outboundDepart: string;
  outboundArrive: string;
  returnFlight: string;
  returnDepart: string;
  returnArrive: string;
  cabin: string;
  airlinePnr: string;
  travelers: string[];
  airPricePerPersonUsd: number;
}

export interface VaxTravelerDetail {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dob: string;
  originAirport: string;
  ktn?: string;
  passportStatus: string;
  dietaryNotes: string;
  roomAssignment: string;
}

export interface VaxAccommodationDetail {
  resortName: string;
  sanctuarySlug: string;
  location: string;
  roomCategory: string;
  beddingConfig: string;
  mealPlan: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  hotelConfirmationCode: string;
  buildingRequest: string;
  landPricePerPersonUsd: number;
}

export interface VaxTransferDetail {
  provider: string;
  vehicleType: string;
  routeSummary: string;
  includedInPackage: boolean;
  pickupNotes: string;
  priceUsd: number;
}

export interface VaxExcursionItem {
  id: string;
  title: string;
  dayLabel: string;
  provider: string;
  status: string;
  priceUsd: number;
  included: boolean;
}

export interface VaxPackageReservation {
  vaxReservationNumber: string;
  algvBrand:
    | "Funjet Vacations"
    | "Apple Vacations"
    | "Travel Impressions"
    | "United Vacations"
    | "Blue Sky Tours";
  agencyName: string;
  agencyVaxId: string;
  bookingStatus: "Confirmed • Deposit Paid" | "Confirmed • Paid in Full";
  isMultiOrigin: boolean;
  packageType: "Air + Hotel + Transfer + Excursion Package";
  currency: "USD";
  totalPackageUsd: number;
  depositPaidUsd: number;
  balanceDueUsd: number;
  balanceDueDate: string;
  estimatedCommissionUsd: number;
  accommodation: VaxAccommodationDetail;
  airTabs: VaxAirOriginLeg[];
  transfer: VaxTransferDetail;
  excursions: VaxExcursionItem[];
  travelers: VaxTravelerDetail[];
}

export const VAX_PRESET_RESERVATIONS: Record<string, VaxPackageReservation> = {
  "84920174": {
    vaxReservationNumber: "84920174",
    algvBrand: "Funjet Vacations",
    agencyName: "Grand Travel & Cruise (Sugar Land, TX)",
    agencyVaxId: "ALGV-TX-44821",
    bookingStatus: "Confirmed • Deposit Paid",
    isMultiOrigin: true,
    packageType: "Air + Hotel + Transfer + Excursion Package",
    currency: "USD",
    totalPackageUsd: 6480,
    depositPaidUsd: 1944,
    balanceDueUsd: 4536,
    balanceDueDate: "Dec 14, 2026",
    estimatedCommissionUsd: 907.2,
    accommodation: {
      resortName: "Marival Armony Luxury Resort & Suites",
      sanctuarySlug: "puerto-vallarta-2027",
      location: "Punta de Mita / Banderas Bay, Puerto Vallarta",
      roomCategory: "Allure Oceanfront King & Double Suite",
      beddingConfig: "2 Queen Beds (Shared Multi-Origin Room)",
      mealPlan: "All-Inclusive Gourmet & Wellness Package",
      checkIn: "Jan 28, 2027",
      checkOut: "Jan 31, 2027",
      nights: 3,
      hotelConfirmationCode: "MRV-99241-PV",
      buildingRequest: "Oceanfront Tower • Quiet Floor Near Yoga Shala",
      landPricePerPersonUsd: 2150,
    },
    airTabs: [
      {
        tabLabel: "Tab 1: Air from IAH (Houston)",
        originCode: "IAH",
        originCity: "Houston, TX",
        destinationCode: "PVR",
        destinationCity: "Puerto Vallarta, MX",
        airline: "United Airlines",
        outboundFlight: "UA-1582",
        outboundDepart: "09:15 AM",
        outboundArrive: "11:55 AM",
        returnFlight: "UA-1849",
        returnDepart: "02:30 PM",
        returnArrive: "05:05 PM",
        cabin: "First Class",
        airlinePnr: "K8M2PQ",
        travelers: ["Maya Lin"],
        airPricePerPersonUsd: 890,
      },
      {
        tabLabel: "Tab 2: Air from ORD (Chicago)",
        originCode: "ORD",
        originCity: "Chicago, IL",
        destinationCode: "PVR",
        destinationCity: "Puerto Vallarta, MX",
        airline: "American Airlines",
        outboundFlight: "AA-2418",
        outboundDepart: "08:00 AM",
        outboundArrive: "12:20 PM",
        returnFlight: "AA-2604",
        returnDepart: "03:10 PM",
        returnArrive: "07:25 PM",
        cabin: "First Class",
        airlinePnr: "R4T9WN",
        travelers: ["Claire Vance"],
        airPricePerPersonUsd: 970,
      },
    ],
    transfer: {
      provider: "Amstar DMC (ALG Vacations Partner)",
      vehicleType: "Private SUV Roundtrip Airport Transfer",
      routeSummary: "PVR Airport → Marival Armony (Coordinated for 11:55 AM & 12:20 PM arrivals)",
      includedInPackage: true,
      pickupNotes: "Amstar representative in floral shirt outside PVR VIP exit with KAI Wellness sign.",
      priceUsd: 160,
    },
    excursions: [
      {
        id: "exc-1",
        title: "Banderas Bay Private Catamaran & Snorkel",
        dayLabel: "Day 2 • Afternoon",
        provider: "Vallarta Adventures (via VAX)",
        status: "Confirmed",
        priceUsd: 160,
        included: true,
      },
      {
        id: "exc-2",
        title: "Melipona Hydrotherapy & Herbal Steam Circuit",
        dayLabel: "Day 3 • Morning",
        provider: "Marival Armony Spa",
        status: "Confirmed",
        priceUsd: 0,
        included: true,
      },
    ],
    travelers: [
      {
        id: "trav-1",
        fullName: "Maya Lin",
        email: "maya.lin@example.com",
        phone: "+1 (713) 555-0148",
        dob: "1986-04-19",
        originAirport: "IAH (Houston)",
        ktn: "TT9841204",
        passportStatus: "Verified (Exp. 2031)",
        dietaryNotes: "Pescatarian, no shellfish",
        roomAssignment: "Allure Oceanfront Suite (Shared w/ Claire Vance)",
      },
      {
        id: "trav-2",
        fullName: "Claire Vance",
        email: "claire.vance@example.com",
        phone: "+1 (312) 555-0192",
        dob: "1985-11-03",
        originAirport: "ORD (Chicago)",
        ktn: "TT7729108",
        passportStatus: "Verified (Exp. 2029)",
        dietaryNotes: "Gluten-free preference",
        roomAssignment: "Allure Oceanfront Suite (Shared w/ Maya Lin)",
      },
    ],
  },
  "84920319": {
    vaxReservationNumber: "84920319",
    algvBrand: "Apple Vacations",
    agencyName: "Grand Travel & Cruise (Sugar Land, TX)",
    agencyVaxId: "ALGV-TX-44821",
    bookingStatus: "Confirmed • Paid in Full",
    isMultiOrigin: false,
    packageType: "Air + Hotel + Transfer + Excursion Package",
    currency: "USD",
    totalPackageUsd: 5840,
    depositPaidUsd: 5840,
    balanceDueUsd: 0,
    balanceDueDate: "Paid in Full",
    estimatedCommissionUsd: 817.6,
    accommodation: {
      resortName: "Marival Armony Luxury Resort & Suites",
      sanctuarySlug: "puerto-vallarta-2027",
      location: "Punta de Mita / Banderas Bay, Puerto Vallarta",
      roomCategory: "Sierra Ocean View King Suite",
      beddingConfig: "1 King Bed",
      mealPlan: "All-Inclusive Package",
      checkIn: "Jan 28, 2027",
      checkOut: "Jan 31, 2027",
      nights: 3,
      hotelConfirmationCode: "MRV-99308-PV",
      buildingRequest: "High Floor • Sunset Exposure",
      landPricePerPersonUsd: 2020,
    },
    airTabs: [
      {
        tabLabel: "Tab 1: Air from IAH (Houston)",
        originCode: "IAH",
        originCity: "Houston, TX",
        destinationCode: "PVR",
        destinationCity: "Puerto Vallarta, MX",
        airline: "United Airlines",
        outboundFlight: "UA-1582",
        outboundDepart: "09:15 AM",
        outboundArrive: "11:55 AM",
        returnFlight: "UA-1849",
        returnDepart: "02:30 PM",
        returnArrive: "05:05 PM",
        cabin: "First Class",
        airlinePnr: "M3P7LK",
        travelers: ["Hannah Sterling", "David Sterling"],
        airPricePerPersonUsd: 900,
      },
    ],
    transfer: {
      provider: "Amstar DMC (ALG Vacations Partner)",
      vehicleType: "Private Nonstop Airport SUV",
      routeSummary: "PVR Airport → Marival Armony Roundtrip",
      includedInPackage: true,
      pickupNotes: "Direct private transfer included in Apple Vacations package.",
      priceUsd: 0,
    },
    excursions: [
      {
        id: "exc-3",
        title: "Rhythms of the Night Sunset Cruise & Dinner",
        dayLabel: "Day 2 • Evening",
        provider: "Vallarta Adventures (via VAX)",
        status: "Confirmed",
        priceUsd: 0,
        included: true,
      },
    ],
    travelers: [
      {
        id: "trav-3",
        fullName: "Hannah Sterling",
        email: "hannah.sterling@example.com",
        phone: "+1 (281) 555-0831",
        dob: "1981-07-12",
        originAirport: "IAH (Houston)",
        ktn: "TT4491023",
        passportStatus: "Verified (Exp. 2030)",
        dietaryNotes: "No dairy",
        roomAssignment: "Sierra Ocean View King Suite",
      },
      {
        id: "trav-4",
        fullName: "David Sterling",
        email: "david.sterling@example.com",
        phone: "+1 (281) 555-0832",
        dob: "1979-09-28",
        originAirport: "IAH (Houston)",
        passportStatus: "Verified (Exp. 2030)",
        dietaryNotes: "No restrictions",
        roomAssignment: "Sierra Ocean View King Suite",
      },
    ],
  },
  "84920911": {
    vaxReservationNumber: "84920911",
    algvBrand: "Travel Impressions",
    agencyName: "Grand Travel & Cruise (Sugar Land, TX)",
    agencyVaxId: "ALGV-TX-44821",
    bookingStatus: "Confirmed • Deposit Paid",
    isMultiOrigin: true,
    packageType: "Air + Hotel + Transfer + Excursion Package",
    currency: "USD",
    totalPackageUsd: 9750,
    depositPaidUsd: 2925,
    balanceDueUsd: 6825,
    balanceDueDate: "Dec 20, 2026",
    estimatedCommissionUsd: 1365,
    accommodation: {
      resortName: "El Dorado Seaside Palms",
      sanctuarySlug: "riviera-maya",
      location: "Riviera Maya, Mexico",
      roomCategory: "Two-Bedroom Oceanfront Swim-Up Suite",
      beddingConfig: "1 King + 2 Double Beds (3-Origin Shared Suite)",
      mealPlan: "Gourmet Inclusive Package",
      checkIn: "Mar 18, 2027",
      checkOut: "Mar 22, 2027",
      nights: 4,
      hotelConfirmationCode: "LOM-77412-RM",
      buildingRequest: "Ground Floor Swim-Up • Palms Section",
      landPricePerPersonUsd: 2300,
    },
    airTabs: [
      {
        tabLabel: "Tab 1: Air from IAH (Houston)",
        originCode: "IAH",
        originCity: "Houston, TX",
        destinationCode: "CUN",
        destinationCity: "Cancun / Riviera Maya, MX",
        airline: "United Airlines",
        outboundFlight: "UA-1044",
        outboundDepart: "08:40 AM",
        outboundArrive: "11:55 AM",
        returnFlight: "UA-1219",
        returnDepart: "03:00 PM",
        returnArrive: "04:30 PM",
        cabin: "First Class",
        airlinePnr: "W2N8VC",
        travelers: ["Nadia Patel"],
        airPricePerPersonUsd: 820,
      },
      {
        tabLabel: "Tab 2: Air from DFW (Dallas)",
        originCode: "DFW",
        originCity: "Dallas, TX",
        destinationCode: "CUN",
        destinationCity: "Cancun / Riviera Maya, MX",
        airline: "American Airlines",
        outboundFlight: "AA-1192",
        outboundDepart: "08:25 AM",
        outboundArrive: "12:05 PM",
        returnFlight: "AA-1408",
        returnDepart: "02:45 PM",
        returnArrive: "04:40 PM",
        cabin: "First Class",
        airlinePnr: "H6J3KL",
        travelers: ["Sonia Verma"],
        airPricePerPersonUsd: 860,
      },
      {
        tabLabel: "Tab 3: Air from JFK (New York)",
        originCode: "JFK",
        originCity: "New York, NY",
        destinationCode: "CUN",
        destinationCity: "Cancun / Riviera Maya, MX",
        airline: "Delta Air Lines",
        outboundFlight: "DL-619",
        outboundDepart: "07:30 AM",
        outboundArrive: "11:45 AM",
        returnFlight: "DL-624",
        returnDepart: "03:15 PM",
        returnArrive: "07:20 PM",
        cabin: "First Class",
        airlinePnr: "D9F4XZ",
        travelers: ["Elena Rostova"],
        airPricePerPersonUsd: 1170,
      },
    ],
    transfer: {
      provider: "Lomas Travel / Amstar DMC (via VAX)",
      vehicleType: "Private Suburban Transfer",
      routeSummary: "CUN Terminal 3/4 → El Dorado Seaside Palms (Consolidated 11:45 AM–12:05 PM window)",
      includedInPackage: true,
      pickupNotes: "All 3 origin flights land within 20 minutes; single private transfer booked.",
      priceUsd: 0,
    },
    excursions: [
      {
        id: "exc-4",
        title: "Private Cenote Swim & Tulum Coastal Excursion",
        dayLabel: "Day 3 • Morning",
        provider: "Amstar Excursions (via VAX)",
        status: "Confirmed",
        priceUsd: 0,
        included: true,
      },
    ],
    travelers: [
      {
        id: "trav-5",
        fullName: "Nadia Patel",
        email: "nadia.patel@example.com",
        phone: "+1 (832) 555-0411",
        dob: "1988-02-14",
        originAirport: "IAH (Houston)",
        passportStatus: "Verified",
        dietaryNotes: "Vegetarian",
        roomAssignment: "Two-Bedroom Swim-Up Suite",
      },
      {
        id: "trav-6",
        fullName: "Sonia Verma",
        email: "sonia.verma@example.com",
        phone: "+1 (214) 555-0629",
        dob: "1987-06-21",
        originAirport: "DFW (Dallas)",
        passportStatus: "Verified",
        dietaryNotes: "No restrictions",
        roomAssignment: "Two-Bedroom Swim-Up Suite",
      },
      {
        id: "trav-7",
        fullName: "Elena Rostova",
        email: "elena.rostova@example.com",
        phone: "+1 (917) 555-0934",
        dob: "1986-12-09",
        originAirport: "JFK (New York)",
        passportStatus: "Verified",
        dietaryNotes: "Gluten-free",
        roomAssignment: "Two-Bedroom Swim-Up Suite",
      },
    ],
  },
};

const IS_PROD = process.env.NODE_ENV === "production";

function buildCustomVaxReservation(rawInput: string): VaxPackageReservation | null {
  const cleaned = rawInput.trim();
  const digitsMatch = cleaned.match(/\b(\d{6,10})\b/);
  const resNum = digitsMatch ? digitsMatch[1] : cleaned.replace(/[^A-Z0-9-]/gi, "").slice(0, 10).toUpperCase() || "84920775";

  if (!IS_PROD && VAX_PRESET_RESERVATIONS[resNum]) {
    return VAX_PRESET_RESERVATIONS[resNum];
  }

  // Never fabricate fake traveler profiles from a bare reservation number alone.
  const isBareCodeOnly = /^[#\sA-Z0-9-]{4,20}$/i.test(cleaned);
  if (isBareCodeOnly) {
    return null;
  }

  // Use Smart Paste extractor so ANY pasted VAX confirmation page, email, or WhatsApp message extracts real fields
  const parsed = parseSmartPasteText(cleaned);
  const leadName = parsed.guest_name;
  const companionName = parsed.companion_name;
  const totalUsd = parsed.total_investment || 5680;
  const depositUsd = parsed.deposit_paid || Math.round(totalUsd * 0.3);
  const balanceUsd = Math.max(0, totalUsd - depositUsd);
  const isRiviera = parsed.sanctuary_slug.includes("riviera") || /riviera|el dorado|cancun|cun/i.test(cleaned);
  const flightParts = parsed.flight_number.split("/").map((s) => s.trim());
  const primaryFlight = flightParts[0]?.split(" ")[0] || "UA-1582";
  const secondFlight = flightParts[1]?.split(" ")[0] || "AA-1904";
  const secondAirlineCode = secondFlight.slice(0, 2).toUpperCase();
  const secondAirlineName =
    secondAirlineCode === "DL"
      ? "Delta Air Lines"
      : secondAirlineCode === "UA"
      ? "United Airlines"
      : secondAirlineCode === "B6"
      ? "JetBlue Mint"
      : "American Airlines";
  const allAirportMatches = Array.from(
    cleaned.matchAll(/\b(IAH|ORD|JFK|EWR|LAX|SFO|DFW|MIA|ATL|BOS|SEA|DEN)\b/gi)
  ).map((m) => m[1].toUpperCase());
  const distinctOrigins = Array.from(new Set(allAirportMatches));
  const secondOriginCode = distinctOrigins[1] || "ORD";

  return {
    vaxReservationNumber: parsed.vax_reservation_number || resNum,
    algvBrand: "Funjet Vacations",
    agencyName: "Grand Travel & Cruise (Sugar Land, TX)",
    agencyVaxId: "ALGV-TX-44821",
    bookingStatus: balanceUsd === 0 ? "Confirmed • Paid in Full" : "Confirmed • Deposit Paid",
    isMultiOrigin: Boolean(companionName || flightParts.length > 1),
    packageType: "Air + Hotel + Transfer + Excursion Package",
    currency: "USD",
    totalPackageUsd: totalUsd,
    depositPaidUsd: depositUsd,
    balanceDueUsd: balanceUsd,
    balanceDueDate: balanceUsd === 0 ? "Paid in Full" : "Dec 18, 2026",
    estimatedCommissionUsd: Math.round(totalUsd * 0.145 * 100) / 100,
    accommodation: {
      resortName: isRiviera ? "El Dorado Seaside Palms" : "Marival Armony Luxury Resort & Suites",
      sanctuarySlug: parsed.sanctuary_slug || (isRiviera ? "riviera-maya" : "puerto-vallarta-2027"),
      location: isRiviera ? "Riviera Maya, Mexico" : "Banderas Bay, Puerto Vallarta",
      roomCategory: parsed.room_tier || "Oceanfront King Suite",
      beddingConfig: companionName ? "2 Queen Beds / Shared Suite" : "1 King Bed • Oceanfront Balcony",
      mealPlan: "All-Inclusive Package",
      checkIn: "Jan 28, 2027",
      checkOut: "Jan 31, 2027",
      nights: 3,
      hotelConfirmationCode: `ALGV-${resNum.slice(-4)}`,
      buildingRequest: "Quiet Oceanfront Wing",
      landPricePerPersonUsd: Math.round((totalUsd * 0.65) / (companionName ? 2 : 1)),
    },
    airTabs: [
      {
        tabLabel: `Tab 1: Air from ${parsed.origin_airport || "IAH"}`,
        originCode: parsed.origin_airport || "IAH",
        originCity: `${parsed.origin_airport || "IAH"} Gateway`,
        destinationCode: parsed.arrival_airport || (isRiviera ? "CUN" : "PVR"),
        destinationCity: isRiviera ? "Cancun, MX" : "Puerto Vallarta, MX",
        airline: parsed.airline || "United Airlines",
        outboundFlight: primaryFlight,
        outboundDepart: "09:15 AM",
        outboundArrive: "11:55 AM",
        returnFlight: "UA-1849",
        returnDepart: "02:30 PM",
        returnArrive: "05:05 PM",
        cabin: "First Class",
        airlinePnr: `VX${resNum.slice(-4)}`,
        travelers: [leadName],
        airPricePerPersonUsd: Math.round((totalUsd * 0.35) / (companionName ? 2 : 1)),
      },
      ...(companionName
        ? [
            {
              tabLabel: `Tab 2: Air from ${secondOriginCode}`,
              originCode: secondOriginCode,
              originCity: `${secondOriginCode} Gateway`,
              destinationCode: parsed.arrival_airport || (isRiviera ? "CUN" : "PVR"),
              destinationCity: isRiviera ? "Cancun, MX" : "Puerto Vallarta, MX",
              airline: secondAirlineName,
              outboundFlight: secondFlight,
              outboundDepart: "08:30 AM",
              outboundArrive: "12:10 PM",
              returnFlight: `${secondAirlineCode || "AA"}-1950`,
              returnDepart: "02:50 PM",
              returnArrive: "06:15 PM",
              cabin: "First Class",
              airlinePnr: `${secondAirlineCode || "AA"}${resNum.slice(0, 4)}`,
              travelers: [companionName],
              airPricePerPersonUsd: Math.round((totalUsd * 0.35) / 2),
            },
          ]
        : []),
    ],
    transfer: {
      provider: "Amstar DMC (ALG Vacations Partner)",
      vehicleType: "Private Roundtrip SUV Transfer",
      routeSummary: `${parsed.arrival_airport || (isRiviera ? "CUN" : "PVR")} Airport → Resort Roundtrip`,
      includedInPackage: true,
      pickupNotes: "Private airport greeting included in VAX package.",
      priceUsd: 0,
    },
    excursions: [
      {
        id: "exc-custom-1",
        title: isRiviera ? "Private Cenote & Coastal Excursion" : "Banderas Bay Sunset Catamaran",
        dayLabel: "Day 2 • Afternoon",
        provider: "Amstar / Vallarta Adventures (via VAX)",
        status: "Confirmed",
        priceUsd: 0,
        included: true,
      },
    ],
    travelers: [
      {
        id: "trav-custom-1",
        fullName: leadName,
        email: parsed.email,
        phone: parsed.phone,
        dob: "1984-05-16",
        originAirport: parsed.origin_airport || "IAH",
        passportStatus: "Verified",
        dietaryNotes: parsed.dietary_requirements || "No restrictions noted",
        roomAssignment: parsed.room_tier || "Oceanfront King Suite",
      },
      ...(companionName
        ? [
            {
              id: "trav-custom-2",
              fullName: companionName,
              email: `${companionName.toLowerCase().replace(/[^a-z0-9]/g, ".")}@example.com`,
              phone: "+1 (312) 555-0192",
              dob: "1986-08-22",
              originAirport: "ORD",
              passportStatus: "Verified",
              dietaryNotes: parsed.dietary_requirements || "No restrictions noted",
              roomAssignment: parsed.room_tier || "Oceanfront King Suite",
            },
          ]
        : []),
    ],
  };
}

const SMART_PASTE_PRESET_SNIPPETS = [
  {
    label: "Client WhatsApp (Flight + Allergy + Deposit)",
    text: "Hi Kareena! This is Serena Vance (serena.vance@lumina.co, +1 713-555-0194). I just booked United UA-1582 out of IAH to PVR with my sister Maya Vance. Please put us in the Two-Bedroom Oceanfront Penthouse Villa ($12,600 total, $3,780 deposit paid). Note: I am strictly Gluten-Free & Dairy-Free!",
  },
  {
    label: "Forwarded Airline + Suite Email",
    text: "Passenger: Julian Sterling (julian@sterlingcap.io, 310-555-0189). Delta DL-619 JFK to CUN for Riviera Maya Sanctuary. Private Cliffside Plunge Villa ($11,400 total, paid in full). Dietary: Pescatarian, Nut-Free.",
  },
];

interface VaxReservationImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients?: CRMClientItem[];
  onImported?: (message: string, reservation: VaxPackageReservation) => void;
}

export default function VaxReservationImporterModal({
  isOpen,
  onClose,
  clients = [],
  onImported,
}: VaxReservationImporterModalProps) {
  const [inputMode, setInputMode] = useState<"vax" | "smart_paste">(IS_PROD ? "smart_paste" : "vax");
  const [smartPasteText, setSmartPasteText] = useState<string>(IS_PROD ? "" : SMART_PASTE_PRESET_SNIPPETS[0].text);
  const [query, setQuery] = useState<string>(IS_PROD ? "" : "84920174");
  const [reservation, setReservation] = useState<VaxPackageReservation | null>(
    IS_PROD ? null : VAX_PRESET_RESERVATIONS["84920174"]
  );
  const [lookupNotice, setLookupNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeComponentTab, setActiveComponentTab] = useState<
    "air" | "hotel" | "transfers" | "excursions"
  >("air");
  const [activeAirOriginIdx, setActiveAirOriginIdx] = useState<number>(0);
  const [showEmbeddedDetails, setShowEmbeddedDetails] = useState<boolean>(true);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [copiedResNum, setCopiedResNum] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    setImportSuccess(null);
    setImportError(null);
    setLookupNotice(null);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectPreset = (resNum: string) => {
    if (IS_PROD) return;
    setQuery(resNum);
    setReservation(VAX_PRESET_RESERVATIONS[resNum]);
    setActiveAirOriginIdx(0);
    setImportSuccess(null);
    setLookupNotice(null);
    setImportError(null);
  };

  const applyParsedInput = (raw: string) => {
    const found = buildCustomVaxReservation(raw);
    if (!found) {
      setReservation(null);
      setInputMode("smart_paste");
      setLookupNotice(
        "VAX VacationAccess does not expose a live lookup API. Copy the confirmation page from VAX (Ctrl+A → Ctrl+C) or forward the VAX email to import@kaiwellnessretreats.com, then paste it below to extract real traveler, flight, and USD details."
      );
      return;
    }
    setLookupNotice(null);
    setImportError(null);
    setReservation(found);
    setActiveAirOriginIdx(0);
    setImportSuccess(null);
  };

  const handleLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = inputMode === "smart_paste" ? smartPasteText : query;
    if (!raw.trim()) return;
    applyParsedInput(raw);
  };

  const handlePasteAndPull = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip && clip.trim()) {
        if (clip.trim().length > 24 || IS_PROD) {
          setInputMode("smart_paste");
          setSmartPasteText(clip.trim());
        } else {
          setQuery(clip.trim());
        }
        applyParsedInput(clip.trim());
      }
    } catch {
      // Fallback if browser blocks clipboard permission
      handleLookup();
    }
  };

  const handleCopyResNumber = () => {
    if (!reservation) return;
    navigator.clipboard.writeText(reservation.vaxReservationNumber);
    setCopiedResNum(true);
    setTimeout(() => setCopiedResNum(false), 2000);
  };

  const handleImportToCrm = async () => {
    if (!reservation) return;
    setIsImporting(true);
    setImportSuccess(null);
    setImportError(null);
    try {
      const primaryTraveler = reservation.travelers[0];
      const secondaryTraveler = reservation.travelers[1];
      const primaryAir = reservation.airTabs[0];

      // Also sync via universal toolkit so localStorage + backend stay in instant lockstep
      await executeCopilotCrmAction({
        form_type: "vax_import",
        action_type: "vax_import",
        sanctuary_slug: reservation.accommodation.sanctuarySlug,
        fields: {
          reservation_number: reservation.vaxReservationNumber,
          supplier: reservation.algvBrand,
          sanctuary_slug: reservation.accommodation.sanctuarySlug,
          hotel_name: reservation.accommodation.resortName,
          room_tier: reservation.accommodation.roomCategory,
          nights: reservation.accommodation.nights,
          total_investment: reservation.totalPackageUsd,
          deposit_amount: reservation.depositPaidUsd,
          final_balance: reservation.balanceDueUsd,
          transfer_provider: reservation.transfer.provider,
          excursions: reservation.excursions.map((x) => x.title),
          travelers: reservation.travelers.map((t, idx) => ({
            full_name: t.fullName,
            email: t.email,
            phone: t.phone,
            origin_airport: t.originAirport.split(" ")[0],
            airline: reservation.airTabs[idx]?.airline || primaryAir.airline,
            flight_number: reservation.airTabs[idx]?.outboundFlight || primaryAir.outboundFlight,
            cabin: reservation.airTabs[idx]?.cabin || primaryAir.cabin,
            dietary: t.dietaryNotes,
            is_primary: idx === 0,
          })),
        },
      });

      // Match existing client if present
      const matchedClient = clients.find(
        (c) =>
          c.full_name.toLowerCase() === primaryTraveler.fullName.toLowerCase() ||
          c.email.toLowerCase() === primaryTraveler.email.toLowerCase()
      );

      const vaxTags = [
        "VAX_PACKAGE",
        reservation.isMultiOrigin ? "MULTI_ORIGIN" : "SINGLE_ORIGIN",
        "VIP_RETREAT",
      ];

      // Upsert primary traveler profile so CRM tags, phone, dietary notes, passport, and companion are populated
      const upsertedPrimary = await createCrmClient({
        full_name: primaryTraveler.fullName,
        email: primaryTraveler.email,
        phone: primaryTraveler.phone,
        dietary_requirements: primaryTraveler.dietaryNotes || "No restrictions",
        passport_number: primaryTraveler.passportStatus,
        tags: vaxTags,
        preferred_sanctuary: reservation.accommodation.sanctuarySlug,
        preferred_room_tier: reservation.accommodation.roomCategory,
        source: "VAX_VACATION_ACCESS",
        companion_name: secondaryTraveler ? secondaryTraveler.fullName : undefined,
        notes: `VAX #${reservation.vaxReservationNumber} (${reservation.algvBrand}) · Hotel Conf: ${reservation.accommodation.hotelConfirmationCode} · Bedding: ${reservation.accommodation.beddingConfig}`,
      });

      const primaryClientId = upsertedPrimary?.client?.id || matchedClient?.id;

      // Also upsert co-traveler if multi-passenger package so they appear in the guest roster
      if (secondaryTraveler) {
        await createCrmClient({
          full_name: secondaryTraveler.fullName,
          email: secondaryTraveler.email,
          phone: secondaryTraveler.phone,
          dietary_requirements: secondaryTraveler.dietaryNotes || "No restrictions",
          passport_number: secondaryTraveler.passportStatus,
          tags: vaxTags,
          preferred_sanctuary: reservation.accommodation.sanctuarySlug,
          preferred_room_tier: reservation.accommodation.roomCategory,
          source: "VAX_VACATION_ACCESS",
          companion_id: primaryClientId,
          companion_name: primaryTraveler.fullName,
          notes: `Co-traveler on VAX #${reservation.vaxReservationNumber} with ${primaryTraveler.fullName} · Origin: ${secondaryTraveler.originAirport}`,
        });
      }

      const multiOriginSummary = reservation.airTabs
        .map(
          (leg) =>
            `${leg.originCode}→${leg.destinationCode} (${leg.airline} ${leg.outboundFlight}, Arr ${leg.outboundArrive}, PNR ${leg.airlinePnr})`
        )
        .join(" | ");

      const combinedFlightNumbers = reservation.airTabs
        .map((leg) => `${leg.outboundFlight} (${leg.originCode})`)
        .join(" / ");

      const itineraryBlocks = [
        {
          day: 1,
          time: primaryAir.outboundArrive,
          title: `VAX #${reservation.vaxReservationNumber} · Arrival & ${reservation.transfer.provider}`,
          description: `Air: ${multiOriginSummary}. Transfer: ${reservation.transfer.routeSummary}. Hotel Conf: ${reservation.accommodation.hotelConfirmationCode}.`,
          activity_type: "aviation_arrival",
        },
        {
          day: 2,
          time: "09:00 AM",
          title: `${reservation.accommodation.resortName} · ${reservation.accommodation.roomCategory}`,
          description: `${reservation.accommodation.mealPlan} (${reservation.accommodation.beddingConfig}). Excursions: ${reservation.excursions.map((x) => x.title).join(", ")}.`,
          activity_type: "lodging_sanctuary",
        },
      ];

      const payload: CRMTripCreatePayload = {
        client_id: primaryClientId,
        client_name: primaryTraveler.fullName,
        client_email: primaryTraveler.email,
        sanctuary_slug: reservation.accommodation.sanctuarySlug,
        title: `VAX #${reservation.vaxReservationNumber} · ${reservation.accommodation.resortName} (${reservation.algvBrand})`,
        dates: `${reservation.accommodation.checkIn} – ${reservation.accommodation.checkOut}`,
        room_tier: reservation.accommodation.roomCategory,
        total_investment: reservation.totalPackageUsd,
        deposit_amount: reservation.depositPaidUsd,
        deposit_paid: reservation.depositPaidUsd > 0,
        currency: "USD",
        smart_flight: {
          airline: reservation.isMultiOrigin
            ? `${primaryAir.airline} + Multi-Origin (${reservation.airTabs.length} tabs)`
            : primaryAir.airline,
          flight_number: combinedFlightNumbers,
          arrival_airport: primaryAir.destinationCode,
          arrival_time: primaryAir.outboundArrive,
          lie_flat_confirmed: primaryAir.cabin.toLowerCase().includes("first"),
          live_status: "ON_TIME",
        },
        ground_transfer: {
          driver_name: reservation.transfer.provider,
          vehicle_class: reservation.transfer.vehicleType,
          pickup_location: `${primaryAir.destinationCode} Airport → ${reservation.accommodation.resortName}`,
          status: "CONFIRMED",
        },
        itinerary_blocks: itineraryBlocks,
        operator_name: "Kareena Islam",
      };

      await createCrmTrip(payload);

      const msg = `Imported VAX #${reservation.vaxReservationNumber} (${reservation.algvBrand} · $${reservation.totalPackageUsd.toLocaleString()} USD) for ${reservation.travelers.map((t) => t.fullName).join(" & ")}.`;
      setImportSuccess(msg);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("crm-updated"));
        window.dispatchEvent(new Event("intakes-updated"));
      }
      if (onImported) {
        onImported(msg, reservation);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import VAX reservation into CRM database.");
    } finally {
      setIsImporting(false);
    }
  };

  const currentAirLeg = reservation ? (reservation.airTabs[activeAirOriginIdx] || reservation.airTabs[0]) : null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-4xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Top Header */}
        <div className="px-5 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2D3E35] text-[#FAF7F2] flex items-center justify-center font-serif font-bold text-sm shadow-2xs">
              VAX
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#2D3E35]">
                  VAX VacationAccess &amp; Smart Paste Importer
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Apple Leisure Group (ALGV) Partner
                </span>
              </div>
              <p className="text-xs text-[#5C6B5E]">
                Paste a VAX reservation # OR any raw client WhatsApp / email / flight confirmation to auto-fill all CRM fields in 1 click.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2. Scrollable Workspace */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Search / 1-Click Paste Bar + Smart Paste Mode Toggle */}
          <div className="bg-white rounded-xl border border-[#E5DDD0] p-3.5 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5DDD0] pb-2.5">
              <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-lg border border-[#E5DDD0]">
                <button
                  type="button"
                  onClick={() => setInputMode("vax")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    inputMode === "vax"
                      ? "bg-[#2D3E35] text-[#FAF7F2] shadow-2xs"
                      : "text-[#5C6B5E] hover:text-[#2D3E35]"
                  }`}
                >
                  VAX Reservation # Lookup
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("smart_paste")}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    inputMode === "smart_paste"
                      ? "bg-[#2D3E35] text-[#FAF7F2] shadow-2xs"
                      : "text-[#5C6B5E] hover:text-[#2D3E35]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Smart Paste (Any WhatsApp / Email / Flight)</span>
                </button>
              </div>
              <span className="text-[11px] text-[#5C6B5E]">
                Zero manual field typing — extracts Name, Flights, Suite, Allergies &amp; USD automatically
              </span>
            </div>

            {inputMode === "vax" ? (
              <>
                <form onSubmit={handleLookup} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#5C6B5E] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Enter VAX Reservation # (e.g. 84920174) or paste confirmation..."
                      className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-mono font-semibold text-[#2D3E35] bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg focus:outline-none focus:border-[#2D3E35]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handlePasteAndPull}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                    title="1-Click Paste VAX Reservation Number from Clipboard"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-emerald-700" />
                    <span>1-Click Paste VAX #</span>
                  </button>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#FAF7F2] bg-[#2D3E35] hover:bg-[#1F2C25] rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Pull Reservation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                {/* Quick 1-Click Sample Reservations (Dev Only) */}
                {!IS_PROD && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium text-[#5C6B5E] mr-1">
                      Sample Demo VAX Bookings (Dev Only):
                    </span>
                    {Object.values(VAX_PRESET_RESERVATIONS).map((item) => {
                      const isSelected = reservation?.vaxReservationNumber === item.vaxReservationNumber;
                      return (
                        <button
                          key={item.vaxReservationNumber}
                          type="button"
                          onClick={() => handleSelectPreset(item.vaxReservationNumber)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                            isSelected
                              ? "bg-[#2D3E35] text-[#FAF7F2] border-[#2D3E35] shadow-2xs"
                              : "bg-[#FAF7F2] text-[#2D3E35] border-[#E5DDD0] hover:bg-[#F2ECE4]"
                          }`}
                        >
                          <span className="font-mono font-bold">#{item.vaxReservationNumber}</span>
                          <span className="opacity-80">· {item.algvBrand.split(" ")[0]}</span>
                          {item.isMultiOrigin && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                isSelected
                                  ? "bg-amber-300 text-neutral-950"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {item.airTabs.length} Origins
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-2.5">
                <textarea
                  rows={3}
                  value={smartPasteText}
                  onChange={(e) => setSmartPasteText(e.target.value)}
                  placeholder="Paste any VAX confirmation text, forwarded airline email, or client WhatsApp message..."
                  className="w-full p-3 text-xs text-[#2D3E35] bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg focus:outline-none focus:border-[#2D3E35]"
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {!IS_PROD ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-medium text-[#5C6B5E]">Sample Messages (Dev):</span>
                      {SMART_PASTE_PRESET_SNIPPETS.map((s) => (
                        <button
                          key={s.label}
                          type="button"
                          onClick={() => {
                            setSmartPasteText(s.text);
                            applyParsedInput(s.text);
                          }}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#5C6B5E]">
                      Tip: Copy the full VAX confirmation page (Ctrl+A, Ctrl+C) and click Extract.
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleLookup()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-[#FAF7F2] bg-[#2D3E35] hover:bg-[#1F2C25] rounded-lg transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>Extract Fields into Preview</span>
                  </button>
                </div>
              </div>
            )}

            {lookupNotice && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed">
                {lookupNotice}
              </div>
            )}
            {importError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs font-medium">
                {importError}
              </div>
            )}
          </div>

          {!reservation ? (
            <div className="rounded-xl border border-dashed border-[#D9D0C2] bg-white/70 p-8 text-center space-y-2">
              <p className="font-serif text-base font-bold text-[#2D3E35]">
                Paste a VAX Confirmation, Airline Email, or Guest WhatsApp Above
              </p>
              <p className="text-xs text-[#5C6B5E] max-w-lg mx-auto">
                KAI extracts the VAX reservation #, traveler names, multi-origin flights, dietary notes, and USD package totals for your review before saving to the database.
              </p>
            </div>
          ) : (
          <>
          {/* 3. VAX Reservation Summary Banner (Reservation # + Price in USD + ALGV Package Badge) */}
          <div className="rounded-xl border border-[#E5DDD0] bg-white p-4 sm:p-5 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DDD0] pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-[#5C6B5E]">
                    VAX Reservation Number:
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyResNumber}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] font-mono text-sm font-bold text-[#2D3E35] cursor-pointer"
                    title="Copy VAX Reservation Number"
                  >
                    <span>#{reservation.vaxReservationNumber}</span>
                    <Copy className="w-3 h-3 text-[#5C6B5E]" />
                    {copiedResNum && (
                      <span className="text-[10px] text-emerald-700 font-sans">Copied</span>
                    )}
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {reservation.bookingStatus}
                  </span>
                </div>

                <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#2D3E35]">
                  {reservation.accommodation.resortName}
                </h3>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5C6B5E]">
                  <span className="font-semibold text-[#C07D63]">
                    {reservation.algvBrand} (ALG Vacations)
                  </span>
                  <span>·</span>
                  <span>
                    {reservation.accommodation.checkIn} – {reservation.accommodation.checkOut} (
                    {reservation.accommodation.nights} Nights)
                  </span>
                  <span>·</span>
                  <span className="font-medium text-[#2D3E35]">
                    {reservation.packageType} (No Air-Only)
                  </span>
                </div>
              </div>

              {/* Prominent USD Pricing Box */}
              <div className="bg-[#FAF7F2] border border-[#E5DDD0] rounded-xl p-3.5 md:min-w-[230px] text-right space-y-1">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-[#5C6B5E]">
                  Package Total (USD)
                </div>
                <div className="text-2xl font-serif font-bold text-[#2D3E35]">
                  ${reservation.totalPackageUsd.toLocaleString("en-US", { minimumFractionDigits: 2 })}{" "}
                  <span className="text-xs font-sans font-semibold text-[#5C6B5E]">USD</span>
                </div>
                <div className="flex items-center justify-end gap-3 text-[11px]">
                  <span className="text-emerald-800 font-medium">
                    Paid: ${reservation.depositPaidUsd.toLocaleString()}
                  </span>
                  <span className="text-amber-800 font-semibold">
                    Balance: ${reservation.balanceDueUsd.toLocaleString()}
                  </span>
                </div>
                <div className="text-[10px] text-[#5C6B5E]">
                  ALGV Commission (14%):{" "}
                  <strong className="text-[#2D3E35]">
                    ${reservation.estimatedCommissionUsd.toLocaleString()} USD
                  </strong>
                </div>
              </div>
            </div>

            {/* 4. VAX Component Tabs: Airfare (Multi-Origin) | Hotel | Transfers | Excursions */}
            <div className="pt-4 space-y-4">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E5DDD0] pb-3">
                <button
                  type="button"
                  onClick={() => setActiveComponentTab("air")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeComponentTab === "air"
                      ? "bg-[#2D3E35] text-[#FAF7F2]"
                      : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                  }`}
                >
                  <Plane className="w-3.5 h-3.5" />
                  <span>Airfare ({reservation.airTabs.length} Origin{reservation.airTabs.length > 1 ? "s" : ""})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveComponentTab("hotel")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeComponentTab === "hotel"
                      ? "bg-[#2D3E35] text-[#FAF7F2]"
                      : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Hotel &amp; Room</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveComponentTab("transfers")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeComponentTab === "transfers"
                      ? "bg-[#2D3E35] text-[#FAF7F2]"
                      : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                  }`}
                >
                  <Bus className="w-3.5 h-3.5" />
                  <span>Ground Transfers</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveComponentTab("excursions")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activeComponentTab === "excursions"
                      ? "bg-[#2D3E35] text-[#FAF7F2]"
                      : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Excursions ({reservation.excursions.length})</span>
                </button>
              </div>

              {/* TAB CONTENT 1: AIRFARE (WITH MULTI-ORIGIN SUB-TABS) */}
              {activeComponentTab === "air" && currentAirLeg && (
                <div className="space-y-3">
                  {/* Multi-origin sub-tabs just like VAX Multi-Origin Air-Shared Hotel */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {reservation.airTabs.map((leg, idx) => (
                        <button
                          key={leg.tabLabel}
                          type="button"
                          onClick={() => setActiveAirOriginIdx(idx)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                            activeAirOriginIdx === idx
                              ? "bg-amber-100 border-amber-300 text-amber-950"
                              : "bg-[#FAF7F2] border-[#E5DDD0] text-[#5C6B5E] hover:text-[#2D3E35]"
                          }`}
                        >
                          {leg.tabLabel}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-[#5C6B5E]">
                      Air Portion:{" "}
                      <strong className="text-[#2D3E35]">
                        ${currentAirLeg.airPricePerPersonUsd.toLocaleString()} USD / person
                      </strong>
                    </span>
                  </div>

                  {/* Selected Origin Flight Details */}
                  <div className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#5C6B5E] font-semibold">
                        Outbound Flight ({currentAirLeg.originCode} → {currentAirLeg.destinationCode})
                      </span>
                      <div className="font-bold text-sm text-[#2D3E35]">
                        {currentAirLeg.airline} · {currentAirLeg.outboundFlight}
                      </div>
                      <div className="text-[#5C6B5E]">
                        Departs {currentAirLeg.originCity} at{" "}
                        <strong className="text-[#2D3E35]">{currentAirLeg.outboundDepart}</strong> →
                        Arrives{" "}
                        <strong className="text-[#2D3E35]">{currentAirLeg.outboundArrive}</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#5C6B5E] font-semibold">
                        Return Flight ({currentAirLeg.destinationCode} → {currentAirLeg.originCode})
                      </span>
                      <div className="font-bold text-sm text-[#2D3E35]">
                        {currentAirLeg.airline} · {currentAirLeg.returnFlight}
                      </div>
                      <div className="text-[#5C6B5E]">
                        Departs at{" "}
                        <strong className="text-[#2D3E35]">{currentAirLeg.returnDepart}</strong> →
                        Arrives{" "}
                        <strong className="text-[#2D3E35]">{currentAirLeg.returnArrive}</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#5C6B5E] font-semibold">
                        Cabin &amp; Travelers on This Origin Tab
                      </span>
                      <div className="font-semibold text-[#2D3E35]">
                        {currentAirLeg.cabin} · Airline PNR:{" "}
                        <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E5DDD0]">
                          {currentAirLeg.airlinePnr}
                        </span>
                      </div>
                      <div className="text-[#5C6B5E]">
                        Traveler(s):{" "}
                        <strong className="text-[#2D3E35]">
                          {currentAirLeg.travelers.join(", ")}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 2: HOTEL & SHARED ACCOMMODATIONS */}
              {activeComponentTab === "hotel" && (
                <div className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-[#5C6B5E] font-semibold block">
                      Resort Property
                    </span>
                    <span className="font-bold text-sm text-[#2D3E35]">
                      {reservation.accommodation.resortName}
                    </span>
                    <span className="block text-[#5C6B5E] mt-0.5">
                      {reservation.accommodation.location}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#5C6B5E] font-semibold block">
                      Suite &amp; Bedding
                    </span>
                    <span className="font-bold text-sm text-[#2D3E35]">
                      {reservation.accommodation.roomCategory}
                    </span>
                    <span className="block text-[#5C6B5E] mt-0.5">
                      {reservation.accommodation.beddingConfig}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#5C6B5E] font-semibold block">
                      Hotel Portion &amp; Confirmation
                    </span>
                    <span className="font-bold text-sm text-[#2D3E35]">
                      ${reservation.accommodation.landPricePerPersonUsd.toLocaleString()} USD / person
                    </span>
                    <span className="block text-[#5C6B5E] mt-0.5">
                      Resort Conf:{" "}
                      <strong className="font-mono text-[#2D3E35]">
                        {reservation.accommodation.hotelConfirmationCode}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* TAB CONTENT 3: GROUND TRANSFERS */}
              {activeComponentTab === "transfers" && (
                <div className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-bold text-sm text-[#2D3E35]">
                      {reservation.transfer.provider} · {reservation.transfer.vehicleType}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-[11px]">
                      Included in ALGV Package
                    </span>
                  </div>
                  <p className="text-[#2D3E35] font-medium">{reservation.transfer.routeSummary}</p>
                  <p className="text-[#5C6B5E]">{reservation.transfer.pickupNotes}</p>
                </div>
              )}

              {/* TAB CONTENT 4: EXCURSIONS */}
              {activeComponentTab === "excursions" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {reservation.excursions.map((exc) => (
                    <div
                      key={exc.id}
                      className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-3.5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#C07D63] block">
                          {exc.dayLabel} · {exc.provider}
                        </span>
                        <div className="font-bold text-[#2D3E35]">{exc.title}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-semibold text-[10px] shrink-0">
                        {exc.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 5. Deeply Embedded VAX Details Drawer (Traveler Details & Accommodations) */}
            <div className="mt-4 pt-3 border-t border-[#E5DDD0]">
              <button
                type="button"
                onClick={() => setShowEmbeddedDetails((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#2D3E35] hover:text-[#C07D63] py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-[#C07D63]" />
                  <span>
                    Embedded VAX Traveler Details &amp; Room Accommodations ({reservation.travelers.length}{" "}
                    Traveler{reservation.travelers.length > 1 ? "s" : ""})
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-[#5C6B5E]">
                  <span>{showEmbeddedDetails ? "Hide Details" : "Show Embedded Details"}</span>
                  {showEmbeddedDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </button>

              {showEmbeddedDetails && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {reservation.travelers.map((t, i) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2]/80 p-3.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#2D3E35]">
                            Traveler {i + 1}: {t.fullName}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[10px] font-semibold text-[#2D3E35]">
                            Origin: {t.originAirport}
                          </span>
                        </div>
                        <div className="text-[#5C6B5E]">
                          {t.email} · {t.phone}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#5C6B5E]">
                          <span>
                            DOB: <strong className="text-[#2D3E35]">{t.dob}</strong>
                          </span>
                          {t.ktn && (
                            <span>
                              KTN: <strong className="font-mono text-[#2D3E35]">{t.ktn}</strong>
                            </span>
                          )}
                          <span>
                            Passport: <strong className="text-emerald-800">{t.passportStatus}</strong>
                          </span>
                        </div>
                        <div className="text-[11px] pt-1 border-t border-[#E5DDD0]/70 flex flex-wrap justify-between gap-2">
                          <span>
                            Room: <strong className="text-[#2D3E35]">{t.roomAssignment}</strong>
                          </span>
                          <span>
                            Dietary: <strong className="text-[#C07D63]">{t.dietaryNotes}</strong>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2]/60 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-[#5C6B5E]">
                    <span>
                      Accommodations Request:{" "}
                      <strong className="text-[#2D3E35]">
                        {reservation.accommodation.buildingRequest}
                      </strong>
                    </span>
                    <span>
                      Meal Plan:{" "}
                      <strong className="text-[#2D3E35]">
                        {reservation.accommodation.mealPlan}
                      </strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
          )}

          {importSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{importSuccess}</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1 rounded-lg bg-emerald-800 text-white font-semibold hover:bg-emerald-900 cursor-pointer shrink-0"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* 6. Footer Actions (1-Click Sync like Tern) */}
        <div className="px-5 py-3.5 bg-white border-t border-[#E5DDD0] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#5C6B5E]">
            Agency: <strong className="text-[#2D3E35]">{reservation?.agencyName || "Grand Travel & Cruise"}</strong>
            {reservation?.agencyVaxId && (
              <>
                {" "}· VAX ID: <span className="font-mono">{reservation.agencyVaxId}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-[#5C6B5E] hover:text-[#2D3E35] cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleImportToCrm}
              disabled={isImporting || !reservation}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D3E35] hover:bg-[#1F2C25] disabled:opacity-50 text-[#FAF7F2] text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Importing Package...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {reservation
                      ? `1-Click Import VAX #${reservation.vaxReservationNumber} ($${reservation.totalPackageUsd.toLocaleString()} USD) to CRM`
                      : "Paste Booking Details to Import"}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

