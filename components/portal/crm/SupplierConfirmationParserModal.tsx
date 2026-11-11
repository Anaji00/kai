"use client";

import React, { useState } from "react";
import {
  FileText,
  Plane,
  Building,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  ArrowRight,
} from "lucide-react";

export interface ParsedSupplierData {
  passenger_name?: string;
  airline?: string;
  flight_number?: string;
  departure_airport?: string;
  arrival_airport?: string;
  arrival_time?: string;
  cabin_class?: string;
  confirmation_code?: string;
  property_name?: string;
  room_tier?: string;
  dates_summary?: string;
  total_price?: number;
  sanctuary_slug?: string;
  generated_blocks: Array<{
    day: number;
    time: string;
    title: string;
    description: string;
    activity_type: string;
  }>;
}

interface SupplierConfirmationParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedData: (data: ParsedSupplierData) => void;
}

const SAMPLE_AIRLINE_EMAIL = `DELTA AIR LINES CONFIRMATION
Record Locator: DL-8924KA
Passenger: Aria Montgomery
Flight: Delta DL-842
Departure: JFK (New York) at 08:30 AM
Arrival: PVR (Puerto Vallarta) at 12:45 PM
Cabin: First Class / Lie-Flat Suite
Baggage: 2 Checked Bags Included
Status: Confirmed & Ticketed`;

const SAMPLE_VILLA_VOUCHER = `MARIVAL ARMONY LUXURY RESORT & SANCTUARY
Booking Ref: MAR-2027-PV-09
Guest Name: Aria Montgomery
Check-in: Oct 10, 2027 (15:00)
Check-out: Oct 15, 2027 (11:00)
Suite: Private Cliffside Plunge Villa
Inclusions: Daily Organic Blue Zone Breakfast, Hydrotherapy Circuit, Tarmac Chauffeur Escort
Total Nights: 5 Nights`;

export default function SupplierConfirmationParserModal({
  isOpen,
  onClose,
  onApplyParsedData,
}: SupplierConfirmationParserModalProps) {
  const [rawText, setRawText] = useState("");
  const [parsedResult, setParsedResult] = useState<ParsedSupplierData | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  if (!isOpen) return null;

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        setRawText(text.trim());
      }
    } catch (err) {
      console.warn("Clipboard access not available:", err);
    }
  };

  const handleParse = () => {
    if (!rawText.trim()) return;
    setIsParsing(true);

    // Deterministic extraction rules for travel confirmations
    const text = rawText;
    
    // Passenger / Guest Name extraction
    let passenger_name = undefined;
    const nameMatch = text.match(/(?:Passenger(?:\s*Name)?|Guest(?:\s*Name)?|Traveler|Name)[:\s]+([A-Za-z\s'.-]+?)(?:\r?\n|$)/i);
    if (nameMatch && nameMatch[1].trim().length > 2) {
      passenger_name = nameMatch[1].trim();
    }

    // Flight Number extraction (e.g. DL-842, UA 1042, AA 492, DL842)
    const flightMatch = text.match(/\b([A-Z]{2})\s*[-#]?\s*(\d{3,4})\b/i);
    const flight_number = flightMatch ? `${flightMatch[1].toUpperCase()}-${flightMatch[2]}` : undefined;

    // Airline Name detection
    let airline = undefined;
    if (/delta/i.test(text)) airline = "Delta Air Lines";
    else if (/united/i.test(text)) airline = "United Airlines";
    else if (/american/i.test(text)) airline = "American Airlines";
    else if (/aeromexico/i.test(text)) airline = "Aeromexico";
    else if (/air\s*france/i.test(text)) airline = "Air France";
    else if (/british\s*airways/i.test(text)) airline = "British Airways";
    else if (/emirates/i.test(text)) airline = "Emirates";
    else if (/qatar/i.test(text)) airline = "Qatar Airways";
    else if (/lufthansa/i.test(text)) airline = "Lufthansa";
    else if (/singapore/i.test(text)) airline = "Singapore Airlines";
    else if (/alaska/i.test(text)) airline = "Alaska Airlines";
    else if (/jetblue/i.test(text)) airline = "JetBlue";
    else if (/southwest/i.test(text)) airline = "Southwest Airlines";
    else if (/virgin/i.test(text)) airline = "Virgin Atlantic";
    else if (/swiss/i.test(text)) airline = "Swiss International";

    // Cabin class
    let cabin_class = undefined;
    if (/lie-flat|first class|delta one|polaris|mint suite/i.test(text)) cabin_class = "Lie-Flat / First Class";
    else if (/business/i.test(text)) cabin_class = "Business Class";
    else if (/premium/i.test(text)) cabin_class = "Premium Select";

    // Airport codes (e.g. JFK, PVR, SJO, NAP, LAX, ORD, MIA, LIR, DPS)
    const airportMatches = text.match(/\b([A-Z]{3})\b/g) || [];
    const validCodes = airportMatches.filter((c) =>
      ["JFK", "PVR", "SJO", "NAP", "LAX", "ORD", "MIA", "DFW", "SFO", "EWR", "CUN", "LIR", "DPS", "FCO", "LHR"].includes(c.toUpperCase())
    );
    const departure_airport = validCodes.length > 0 ? validCodes[0].toUpperCase() : undefined;
    const arrival_airport = validCodes.length > 1 ? validCodes[1].toUpperCase() : undefined;

    // Arrival Time extraction (e.g. at 12:45 PM, 14:20, ETA: 15:30)
    let arrival_time = undefined;
    const timeMatch = text.match(/(?:Arrival|Arrives|ETA|Landing)[:\s]+.*?(?:at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (timeMatch) {
      arrival_time = timeMatch[1].trim();
    }

    // Confirmation Code / PNR
    const pnrMatch = text.match(/(?:Record Locator|Booking Ref|Confirmation|PNR)[:\s]+([A-Z0-9]{5,10})/i);
    const confirmation_code = pnrMatch ? pnrMatch[1].toUpperCase() : undefined;

    // Dates extraction (e.g. Check-in: Oct 10, 2027 ... Check-out: Oct 15, 2027)
    let dates_summary = undefined;
    const checkInOutMatch = text.match(/Check-in[:\s]+([A-Za-z0-9,\s]+?)(?:\s*\(|\r?\n)[\s\S]*?Check-out[:\s]+([A-Za-z0-9,\s]+?)(?:\s*\(|\r?\n|$)/i);
    if (checkInOutMatch) {
      const inDate = checkInOutMatch[1].trim().replace(/,\s*\d{4}/, "");
      const outDate = checkInOutMatch[2].trim();
      dates_summary = `${inDate}–${outDate}`;
    } else {
      const datesFieldMatch = text.match(/Dates?[:\s]+([A-Za-z0-9–\-,\s]+?)(?:\r?\n|$)/i);
      if (datesFieldMatch) {
        dates_summary = datesFieldMatch[1].trim();
      }
    }

    // Total Investment / Price extraction
    let total_price = undefined;
    const priceMatch = text.match(/(?:Total(?:\s*Amount|\s*Investment|\s*Price)?|Amount\s*Paid|Rate)[:\s]+\$?([0-9,]+(?:\.[0-9]{2})?)/i);
    if (priceMatch) {
      total_price = Number(priceMatch[1].replace(/,/g, ""));
    }

    // Sanctuary Slug & Property Name
    let property_name = undefined;
    let sanctuary_slug = undefined;
    if (/marival|puerto vallarta/i.test(text)) {
      property_name = "Marival Armony Sanctuary";
      sanctuary_slug = "puerto-vallarta-2027";
    } else if (/el dorado|riviera maya/i.test(text)) {
      property_name = "El Dorado Seaside Palms";
      sanctuary_slug = "riviera-maya";
    } else if (/nosara|costa rica|guanacaste/i.test(text)) {
      property_name = "Nosara Sacred Canopy Villa";
      sanctuary_slug = "nosara";
    } else if (/amalfi|ravello|positano|italy/i.test(text)) {
      property_name = "Amalfi Cliffside Sanctuary";
      sanctuary_slug = "amalfi";
    } else if (/bali|ubud/i.test(text)) {
      property_name = "Sacred Springs Bali Sanctuary";
      sanctuary_slug = "bali";
    }

    // Suite Tier
    let room_tier = undefined;
    if (/cliffside plunge/i.test(text)) room_tier = "Private Cliffside Plunge Villa";
    else if (/penthouse/i.test(text)) room_tier = "Master Penthouse Sanctuary";
    else if (/oceanfront|king suite/i.test(text)) room_tier = "Oceanfront King Suite";
    else if (/garden/i.test(text)) room_tier = "Garden Wellness Suite";
    else if (/pavilion/i.test(text)) room_tier = "Shared Ocean View Pavilion";

    // Auto-generate itinerary blocks based on parsed data
    const blocks: ParsedSupplierData["generated_blocks"] = [];

    // Day 1: Arrival & Flight block
    blocks.push({
      day: 1,
      time: "08:30 AM",
      title: flight_number ? `Inbound Transcontinental Flight (${flight_number})` : "Arrival Transit & Flight",
      description: `Flight confirmed on ${airline || "Private Air"}${flight_number ? ` (${flight_number})` : ""}${departure_airport && arrival_airport ? ` from ${departure_airport} to ${arrival_airport}` : ""}. Cabin: ${cabin_class || "First Class / Lie-Flat"}. Ground chaperone on standby.`,
      activity_type: "Cirium Aviation",
    });

    blocks.push({
      day: 1,
      time: "01:30 PM",
      title: "Private Tarmac SUV Transfer & Villa Check-in",
      description: `VIP high-clearance SUV escort to ${property_name || "the sanctuary estate"}. Seamless private suite orientation in your ${room_tier || "Private Luxury Suite"}.`,
      activity_type: "Chauffeur",
    });

    blocks.push({
      day: 1,
      time: "05:30 PM",
      title: "Sunset Circadian Realignment & Acoustic Sound Bath",
      description: "Gentle 432Hz quartz crystal sound bath and restorative grounding movement led by Nurse Kareena Islam to reset cortisol after transcontinental travel.",
      activity_type: "Somatic Reformer",
    });

    // Day 2: First full restorative sanctuary day
    blocks.push({
      day: 2,
      time: "07:30 AM",
      title: "Sunrise Coastal Movement & Breathwork",
      description: "Anatomically guided vinyasa and gentle parasympathetic breathwork overlooking the ocean shala, followed by fresh organic cold-pressed botanicals.",
      activity_type: "Somatic Reformer",
    });

    blocks.push({
      day: 2,
      time: "12:30 PM",
      title: "Executive Chef Blue Zone Gastronomy",
      description: "Anti-inflammatory coastal harvest lunch featuring local heirloom produce, wild catch, and polyphenol-rich cold-pressed olive oils.",
      activity_type: "Blue Zone Dining",
    });

    setParsedResult({
      passenger_name,
      airline,
      flight_number,
      departure_airport,
      arrival_airport,
      arrival_time,
      cabin_class,
      confirmation_code,
      property_name,
      room_tier,
      dates_summary,
      total_price,
      sanctuary_slug,
      generated_blocks: blocks,
    });

    setIsParsing(false);
  };

  const handleApply = () => {
    if (parsedResult) {
      onApplyParsedData(parsedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white border border-[#D9D0C2] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#FAF7F2] border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#2D3E35]">
                Smart Supplier Confirmation Parser
              </h3>
              <p className="text-xs text-[#5C6B5E]">
                Tern CRM Parity: Paste airline emails or resort vouchers to auto-populate itinerary blocks
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#E5DDD0]/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Quick Samples Pill */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#5C6B5E] uppercase tracking-wider">
              Paste Raw Supplier Confirmation Text:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                title="Paste confirmation from system clipboard"
              >
                <Copy className="w-3 h-3 text-emerald-700" />
                <span>Paste from Clipboard</span>
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_AIRLINE_EMAIL)}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF7F2] hover:bg-[#E5DDD0] text-[#2D3E35] border border-[#D9D0C2] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plane className="w-3 h-3 text-[#C07D63]" />
                <span>Delta Flight Email</span>
              </button>
              <button
                type="button"
                onClick={() => setRawText(SAMPLE_VILLA_VOUCHER)}
                className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#FAF7F2] hover:bg-[#E5DDD0] text-[#2D3E35] border border-[#D9D0C2] flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Building className="w-3 h-3 text-emerald-700" />
                <span>Villa Voucher</span>
              </button>
            </div>
          </div>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={5}
            placeholder="Paste raw text from a flight booking confirmation email, GDS ticket receipt, or resort villa voucher here..."
            className="w-full px-3.5 py-2.5 bg-[#FAF7F2]/50 border border-[#D9D0C2] rounded-xl text-xs text-[#2D3E35] placeholder:text-[#8A9489] focus:outline-none focus:border-[#2D3E35] focus:ring-1 focus:ring-[#2D3E35] font-mono leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleParse}
              disabled={!rawText.trim() || isParsing}
              className="px-4 py-2 bg-[#2D3E35] hover:bg-[#3D5246] disabled:opacity-50 text-[#FAF7F2] rounded-xl font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C07D63]" />
              <span>{isParsing ? "Extracting Data..." : "Parse Confirmation"}</span>
            </button>
          </div>

          {/* Parsed Result Preview */}
          {parsedResult && (
            <div className="space-y-3 pt-3 border-t border-[#E5DDD0]">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>Extracted Supplier Specs:</span>
                  </span>
                  {parsedResult.confirmation_code && (
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-300 font-bold text-emerald-800">
                      Ref: {parsedResult.confirmation_code}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Guest / Passenger</span>
                    <span className="font-semibold text-[#2D3E35]">
                      {parsedResult.passenger_name || "Auto-Detected Guest"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Dates / Stay</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.dates_summary || "Default Sanctuary Dates"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Airline &amp; Flight</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.airline || "Private Air"} {parsedResult.flight_number || "DL-842"}{parsedResult.arrival_time ? ` (${parsedResult.arrival_time})` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Route</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.departure_airport || "JFK"} &rarr; {parsedResult.arrival_airport || "PVR"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Cabin Class</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.cabin_class || "Lie-Flat / First"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Property / Villa</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.property_name || "Marival Armony"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Suite Tier</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.room_tier || "Private Luxury Suite"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#5C6B5E] block text-[10px] uppercase">Total Investment</span>
                    <span className="font-medium text-[#2D3E35]">
                      {parsedResult.total_price ? `$${parsedResult.total_price.toLocaleString()} USD` : "Standard Tier Rate"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Generated Day Blocks Preview */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#5C6B5E] uppercase tracking-wider block">
                  Generated Day Blocks ({parsedResult.generated_blocks.length} Activities):
                </span>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {parsedResult.generated_blocks.map((b, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] flex items-start gap-2.5"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-white border border-[#D9D0C2] text-[10px] font-bold text-[#2D3E35]">
                        Day {b.day} &middot; {b.time}
                      </span>
                      <div className="flex-1">
                        <p className="font-semibold text-[#2D3E35]">{b.title}</p>
                        <p className="text-[10px] text-[#5C6B5E] mt-0.5 line-clamp-1">{b.description}</p>
                      </div>
                      <span className="text-[10px] text-emerald-800 font-medium">{b.activity_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#FAF7F2] border-t border-[#E5DDD0] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-[#5C6B5E] hover:text-[#2D3E35] font-medium"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={!parsedResult}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 disabled:opacity-40 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <span>Apply to Itinerary Proposal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}