"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Compass,
  Calendar,
  BedDouble,
  DollarSign,
  Plane,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  BadgePercent,
  Sparkles,
} from "lucide-react";
import SomaticActivityBlockLibrary, { CuratedActivityBlock } from "./SomaticActivityBlockLibrary";
import SupplierConfirmationParserModal, { ParsedSupplierData } from "./SupplierConfirmationParserModal";
import {
  CRMTripItem,
  CRMClientItem,
  createCrmTrip,
  updateCrmTripItinerary,
  CRMTripCreatePayload,
} from "@/lib/sidecar-api";

interface TripBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  clients: CRMClientItem[];
  tripToEdit?: CRMTripItem | null;
  preselectedClientId?: string;
}

interface ItineraryBlockItem {
  day: number;
  time: string;
  title: string;
  description: string;
  activity_type?: string;
}

const SANCTUARIES = [
  { slug: "puerto-vallarta-2027", name: "Puerto Vallarta · Sierra Madre Sanctuary", defaultDates: "Oct 10–15, 2027" },
  { slug: "nosara", name: "Nosara · Blue Zone Somatic Restoration", defaultDates: "Nov 14–19, 2026" },
  { slug: "amalfi", name: "Amalfi Coast · Tyrrhenian Cliffside Immersion", defaultDates: "May 18–23, 2027" },
  { slug: "bali", name: "Bali · Ubud Jungle Autonomic Sanctuary", defaultDates: "Sep 08–13, 2027" },
  { slug: "custom", name: "Custom Bespoke Sanctuary Cohort", defaultDates: "Flexible 2027" },
];

const ROOM_TIERS = [
  "Oceanfront King Suite",
  "Private Cliffside Plunge Villa",
  "Master Penthouse Sanctuary",
  "Shared Ocean View Pavilion",
  "Garden Wellness Suite",
];

const ACTIVITY_TYPES = [
  { value: "somatic_wellness", label: "🧘 Somatic Reformer & Recovery" },
  { value: "lodging_sanctuary", label: "🏨 Sanctuary Lodging & Villa" },
  { value: "aviation_arrival", label: "✈️ Cirium Aviation & Flights" },
  { value: "ground_chauffeur", label: "🚗 Private Tarmac Chauffeur" },
  { value: "blue_zone_dining", label: "🍽️ Organic Blue Zone Dining" },
  { value: "clinical_screening", label: "🩺 Nurse Health & Safety Check" },
  { value: "custom", label: "✨ Bespoke Guest Modality" },
];

const DEFAULT_BLOCKS: ItineraryBlockItem[] = [
  {
    day: 1,
    time: "15:00 - 18:30",
    title: "Arrival, Private Tarmac Chauffeur & Sunset Sound Bath",
    description: "Private SUV transfer, adaptogenic herbal welcome tonic, suite settling, and grounding oceanfront acoustic bowl immersion.",
    activity_type: "aviation_arrival",
  },
  {
    day: 2,
    time: "08:30 - 11:30",
    title: "Morning Somatic Reformer & Thermal Contrast Flotation",
    description: "Spinal decompression on clinical reformers followed by infrared sauna and cedar cold plunge therapy.",
    activity_type: "somatic_wellness",
  },
  {
    day: 3,
    time: "09:00 - 13:00",
    title: "Vagal Nerve Realignment & Blue Zone Gastronomy Tasting",
    description: "4-7-8 parasympathetic breathwork masterclass and multi-course organic plant-forward lunch by guest executive chef.",
    activity_type: "blue_zone_dining",
  },
  {
    day: 4,
    time: "14:00 - 17:00",
    title: "Private Craniosacral Bodywork & Magnesium Ocean Float",
    description: "One-on-one structural somatic release with master bodywork therapist followed by sensory deprivation saltwater float.",
    activity_type: "somatic_wellness",
  },
  {
    day: 5,
    time: "08:00 - 11:30",
    title: "Dawn Vinyasa, Farewell Integration Brunch & Airport Transfer",
    description: "Gentle sunrise movement, take-home autonomic home-practice guide, parting organic brunch, and VIP airport dispatch.",
    activity_type: "ground_chauffeur",
  },
];

export default function TripBuilderModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  tripToEdit,
  preselectedClientId,
}: TripBuilderModalProps) {
  const isEditing = Boolean(tripToEdit);

  // Client selection
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [customClientName, setCustomClientName] = useState<string>("");
  const [customClientEmail, setCustomClientEmail] = useState<string>("");

  // Trip details
  const [sanctuarySlug, setSanctuarySlug] = useState<string>("puerto-vallarta-2027");
  const [customTitle, setCustomTitle] = useState<string>("");
  const [dates, setDates] = useState<string>("Oct 10–15, 2027");
  const [roomTier, setRoomTier] = useState<string>("Oceanfront King Suite");
  const [totalInvestment, setTotalInvestment] = useState<number>(14500);
  const [currency, setCurrency] = useState<string>("USD");
  const [tripStatus, setTripStatus] = useState<string>("PROPOSED_ITINERARY");

  // Flight details
  const [hasFlight, setHasFlight] = useState<boolean>(true);
  const [airline, setAirline] = useState<string>("Delta Air Lines");
  const [flightNumber, setFlightNumber] = useState<string>("DL-842");
  const [arrivalAirport, setArrivalAirport] = useState<string>("PVR");
  const [arrivalTime, setArrivalTime] = useState<string>("14:20");
  const [isLieFlat, setIsLieFlat] = useState<boolean>(true);

  // Itinerary blocks
  const [itineraryBlocks, setItineraryBlocks] = useState<ItineraryBlockItem[]>(DEFAULT_BLOCKS);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isBlockLibraryOpen, setIsBlockLibraryOpen] = useState<boolean>(false);
  const [isParserOpen, setIsParserOpen] = useState<boolean>(false);

  const handleInsertCuratedBlock = (curated: CuratedActivityBlock) => {
    const nextDay = itineraryBlocks.length + 1;
    setItineraryBlocks((prev) => [
      ...prev,
      {
        day: nextDay,
        time: curated.time,
        title: curated.title,
        description: curated.description,
        activity_type: curated.activity_type,
      },
    ]);
  };

  const handleApplyParsedSupplierData = (data: ParsedSupplierData) => {
    if (data.airline) setAirline(data.airline);
    if (data.flight_number) setFlightNumber(data.flight_number);
    if (data.arrival_airport) setArrivalAirport(data.arrival_airport);
    if (data.cabin_class) setIsLieFlat(data.cabin_class.toLowerCase().includes("lie-flat") || data.cabin_class.toLowerCase().includes("first"));
    if (data.room_tier) setRoomTier(data.room_tier);
    if (data.generated_blocks && data.generated_blocks.length > 0) {
      setItineraryBlocks((prev) => [
        ...prev,
        ...data.generated_blocks.map((b, idx) => ({
          ...b,
          day: prev.length + idx + 1,
        })),
      ]);
    }
  };

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (tripToEdit) {
      setCustomTitle(tripToEdit.title || "");
      setDates(tripToEdit.dates || "");
      setRoomTier(tripToEdit.room_tier || "Oceanfront King Suite");
      setTotalInvestment(tripToEdit.total_investment || 14500);
      setTripStatus(tripToEdit.status || "CONFIRMED");
      setSanctuarySlug(tripToEdit.sanctuary_slug || "puerto-vallarta-2027");

      if (tripToEdit.smart_flight) {
        setHasFlight(true);
        setAirline(tripToEdit.smart_flight.airline || "Partner Air");
        setFlightNumber(tripToEdit.smart_flight.flight_number || "VIP-01");
        setArrivalAirport(tripToEdit.smart_flight.arrival_airport || "PVR");
        setArrivalTime(tripToEdit.smart_flight.arrival_time || "14:00");
        setIsLieFlat(Boolean(tripToEdit.smart_flight.lie_flat_confirmed));
      }

      // Check if itinerary blocks exist
      const existingBlocks = (tripToEdit as any).itinerary_blocks;
      if (Array.isArray(existingBlocks) && existingBlocks.length > 0) {
        setItineraryBlocks(existingBlocks);
      } else {
        setItineraryBlocks(DEFAULT_BLOCKS);
      }
    } else {
      setSelectedClientId(preselectedClientId || (clients[0]?.id || ""));
      setCustomClientName("");
      setCustomClientEmail("");
      setSanctuarySlug("puerto-vallarta-2027");
      setCustomTitle("Puerto Vallarta · Sierra Madre Sanctuary");
      setDates("Oct 10–15, 2027");
      setRoomTier("Oceanfront King Suite");
      setTotalInvestment(14500);
      setCurrency("USD");
      setTripStatus("PROPOSED_ITINERARY");
      setHasFlight(true);
      setAirline("Delta Air Lines");
      setFlightNumber("DL-842");
      setArrivalAirport("PVR");
      setArrivalTime("14:20");
      setIsLieFlat(true);
      setItineraryBlocks(DEFAULT_BLOCKS);
    }
    setErrorMsg(null);
  }, [tripToEdit, preselectedClientId, clients, isOpen]);

  if (!isOpen) return null;

  const depositPreview = Math.round(totalInvestment * 0.3 * 100) / 100;
  const balancePreview = Math.round(totalInvestment * 0.7 * 100) / 100;
  const commissionRate = 0.14; // Grand Travel & Cruise Funjet 500 Club Member tier
  const expectedCommission = Math.round(totalInvestment * commissionRate * 100) / 100;
  const netSupplierRemittance = Math.round((totalInvestment - expectedCommission) * 100) / 100;
  const advisorSplit = Math.round(expectedCommission * 0.9 * 100) / 100;

  const handleSanctuaryChange = (slug: string) => {
    setSanctuarySlug(slug);
    const found = SANCTUARIES.find((s) => s.slug === slug);
    if (found) {
      setCustomTitle(found.name);
      setDates(found.defaultDates);
      if (slug === "nosara") setArrivalAirport("LIR");
      else if (slug === "amalfi") setArrivalAirport("NAP");
      else if (slug === "bali") setArrivalAirport("DPS");
      else setArrivalAirport("PVR");
    }
  };

  const handleAddBlock = () => {
    const nextDay = itineraryBlocks.length + 1;
    setItineraryBlocks([
      ...itineraryBlocks,
      {
        day: nextDay,
        time: "10:00 - 12:00",
        title: `Day ${nextDay} Somatic Sanctuary Activity`,
        description: "Custom restorative schedule and clinical wellness modality.",
        activity_type: "custom",
      },
    ]);
  };

  const handleRemoveBlock = (idx: number) => {
    setItineraryBlocks(itineraryBlocks.filter((_, i) => i !== idx));
  };

  const handleBlockChange = (
    idx: number,
    field: keyof ItineraryBlockItem,
    val: string | number
  ) => {
    const updated = [...itineraryBlocks];
    (updated[idx] as any)[field] = val;
    setItineraryBlocks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    try {
      const flightData = hasFlight
        ? {
            airline,
            flight_number: flightNumber,
            arrival_airport: arrivalAirport,
            arrival_time: arrivalTime,
            lie_flat_confirmed: isLieFlat,
            live_status: "ON_TIME",
          }
        : undefined;

      if (isEditing && tripToEdit) {
        // Update existing trip itinerary and details
        await updateCrmTripItinerary(tripToEdit.id, {
          itinerary_blocks: itineraryBlocks,
          status: tripStatus,
          dates,
          room_tier: roomTier,
          smart_flight: flightData,
        });
        onSuccess(`Updated itinerary & details for trip #${tripToEdit.crm_trip_id}.`);
      } else {
        // Create new trip proposal
        let clientId = selectedClientId;
        let clientName = "";
        let clientEmail = "";

        if (clientId && clientId !== "NEW") {
          const selected = clients.find((c) => c.id === clientId);
          if (selected) {
            clientName = selected.full_name;
            clientEmail = selected.email;
          }
        } else {
          if (!customClientName.trim() || !customClientEmail.trim()) {
            throw new Error("Please select an existing client or enter guest name and email.");
          }
          clientName = customClientName.trim();
          clientEmail = customClientEmail.trim().toLowerCase();
        }

        const payload: CRMTripCreatePayload = {
          client_id: clientId !== "NEW" ? clientId : undefined,
          client_name: clientName,
          client_email: clientEmail,
          sanctuary_slug: sanctuarySlug,
          title: customTitle || "KAI Sanctuary Retreat",
          dates,
          room_tier: roomTier,
          total_investment: Number(totalInvestment),
          currency,
          smart_flight: flightData,
          itinerary_blocks: itineraryBlocks,
          operator_name: "Kareena Islam",
        };

        const res = await createCrmTrip(payload);
        onSuccess(
          `Created trip proposal #${res.trip.crm_trip_id} for ${clientName} ($${totalInvestment.toLocaleString()} USD · 30% Deposit: $${depositPreview.toLocaleString()}).`
        );
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save trip proposal");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-4xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
              <Compass className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
                {isEditing ? `Edit Trip & Itinerary: ${tripToEdit?.title}` : "Build Sanctuary Trip Proposal"}
              </h2>
              <p className="text-xs text-[#5C6B5E]">
                KAI Sanctuary Travel Proposal Builder · 30% Deposit / 70% Balance Schedule, Day-by-Day Blocks &amp; Cirium Flight Link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Client Assignment (Create Mode) or Status (Edit Mode) */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                {isEditing ? "Trip Status & Core Parameters" : "Select Guest Dossier"}
              </span>
              {isEditing && (
                <span className="font-mono text-[10px] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DDD0] text-[#5C6B5E]">
                  Ref: {tripToEdit?.crm_trip_id}
                </span>
              )}
            </div>

            {!isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Select Existing CRM Contact
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.full_name} ({c.email})
                      </option>
                    ))}
                    <option value="NEW">+ Enter New Guest Contact</option>
                  </select>
                </div>

                {selectedClientId === "NEW" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                        New Guest Name
                      </label>
                      <input
                        type="text"
                        value={customClientName}
                        onChange={(e) => setCustomClientName(e.target.value)}
                        placeholder="e.g. Camille Laurent"
                        className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                        New Guest Email
                      </label>
                      <input
                        type="email"
                        value={customClientEmail}
                        onChange={(e) => setCustomClientEmail(e.target.value)}
                        placeholder="e.g. camille@example.com"
                        className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Trip Lifecycle Status
                  </label>
                  <select
                    value={tripStatus}
                    onChange={(e) => setTripStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-semibold"
                  >
                    <option value="PROPOSED_ITINERARY">PROPOSED_ITINERARY</option>
                    <option value="CONFIRMED">CONFIRMED (Deposit Received)</option>
                    <option value="IN_RETREAT">IN_RETREAT (Active Somatic Flow)</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="FORCE_MAJEURE_POSTPONED">FORCE_MAJEURE_POSTPONED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Retreat Dates
                  </label>
                  <input
                    type="text"
                    value={dates}
                    onChange={(e) => setDates(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Allocated Suite Tier
                  </label>
                  <select
                    value={roomTier}
                    onChange={(e) => setRoomTier(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  >
                    {ROOM_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Sanctuary & Investment Terms */}
          {!isEditing && (
            <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                Sanctuary Cohort, Suite Tier &amp; Financial Terms
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Sanctuary Cohort
                  </label>
                  <select
                    value={sanctuarySlug}
                    onChange={(e) => handleSanctuaryChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  >
                    {SANCTUARIES.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Suite Tier
                  </label>
                  <select
                    value={roomTier}
                    onChange={(e) => setRoomTier(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  >
                    {ROOM_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Proposal Dates
                  </label>
                  <input
                    type="text"
                    value={dates}
                    onChange={(e) => setDates(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Total Stay Investment (USD)
                  </label>
                  <input
                    type="number"
                    value={totalInvestment}
                    onChange={(e) => setTotalInvestment(Number(e.target.value))}
                    step="500"
                    min="1000"
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-bold"
                  />
                </div>
              </div>

              {/* Automatic Sanctuary Payment Schedule Display */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E5DDD0]/80">
                <div>
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Total Stay</span>
                  <div className="font-serif font-bold text-base text-[#2D3E35]">
                    ${totalInvestment.toLocaleString()} {currency}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">
                    30% Immediate Deposit
                  </span>
                  <div className="font-serif font-bold text-base text-emerald-800">
                    ${depositPreview.toLocaleString()} {currency}
                  </div>
                  <span className="text-[10px] text-[#5C6B5E]">Upon Proposal Approval</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">
                    70% Balance Schedule
                  </span>
                  <div className="font-serif font-bold text-base text-[#2D3E35]">
                    ${balancePreview.toLocaleString()} {currency}
                  </div>
                  <span className="text-[10px] text-[#5C6B5E]">Due 60 Days Prior</span>
                </div>
              </div>

              {/* Host Agency Back-Office: Grand Travel Commission Estimator */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-800">
                <div>
                  <div className="flex items-center space-x-1.5 text-[10px] text-stone-600 uppercase font-bold">
                    <BadgePercent className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Grand Travel Host Agency</span>
                  </div>
                  <div className="font-bold text-xs text-[#2D3E35] mt-1">Funjet 500 Club (14% Tier)</div>
                  <span className="text-[11px] text-emerald-800 font-bold">+${expectedCommission.toLocaleString()} Commission</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-600 uppercase block font-bold">Net Supplier Remittance</span>
                  <div className="font-bold text-xs text-[#2D3E35] mt-1">${netSupplierRemittance.toLocaleString()} USD</div>
                  <span className="text-[10px] text-stone-500">Sanctuary Villa &amp; Ground Escort</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-600 uppercase block font-bold">Advisor Split (90/10)</span>
                  <div className="font-bold text-xs text-[#C07D63] mt-1">${advisorSplit.toLocaleString()} USD</div>
                  <span className="text-[10px] text-stone-500">Kareena Islam Net Payout</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Smart Aviation & Chauffeur Tracking */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                <Plane className="w-4 h-4 text-blue-700" />
                <span>Cirium Aviation Desk &amp; Chauffeur Coordination</span>
              </div>
              <label className="flex items-center space-x-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFlight}
                  onChange={(e) => setHasFlight(e.target.checked)}
                  className="rounded text-[#2D3E35]"
                />
                <span className="text-[#5C6B5E] font-medium">Coordinate Flights</span>
              </label>
            </div>

            {hasFlight && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-semibold text-[#5C6B5E] mb-1">Airline</label>
                  <input
                    type="text"
                    value={airline}
                    onChange={(e) => setAirline(e.target.value)}
                    placeholder="e.g. Delta Air Lines"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5C6B5E] mb-1">Flight Number</label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="e.g. DL-842"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5C6B5E] mb-1">Arrival Airport</label>
                  <input
                    type="text"
                    value={arrivalAirport}
                    onChange={(e) => setArrivalAirport(e.target.value)}
                    placeholder="e.g. PVR"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5C6B5E] mb-1">Arrival Time</label>
                  <input
                    type="text"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    placeholder="e.g. 14:20"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#5C6B5E] mb-1">Lie-Flat Cabin</label>
                  <button
                    type="button"
                    onClick={() => setIsLieFlat(!isLieFlat)}
                    className={`w-full py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      isLieFlat
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300"
                        : "bg-[#FAF7F2] text-[#5C6B5E] border-[#E5DDD0]"
                    }`}
                  >
                    {isLieFlat ? "✓ Confirmed" : "Standard"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Day-by-Day Itinerary Blocks */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>Day-by-Day Itinerary Blocks ({itineraryBlocks.length} Days)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsParserOpen(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#D9D0C2] rounded-lg transition-colors cursor-pointer"
                  title="Paste raw airline confirmation email or villa voucher to auto-generate day blocks"
                >
                  <FileText className="w-3.5 h-3.5 text-[#C07D63]" />
                  <span>Paste Confirmation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsBlockLibraryOpen(true)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer"
                  title="Open Tern-style Reusable Activity Block Library"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Curated Library</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddBlock}
                  className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Day Block</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {itineraryBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-2 relative"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 flex-1">
                      <span className="font-serif font-bold text-xs text-[#2D3E35] bg-white px-2 py-0.5 rounded border border-[#E5DDD0] shrink-0">
                        Day {block.day || idx + 1}
                      </span>
                      <input
                        type="text"
                        value={block.title}
                        onChange={(e) => handleBlockChange(idx, "title", e.target.value)}
                        placeholder="Itinerary block title..."
                        className="flex-1 px-2.5 py-1 text-xs font-semibold bg-white rounded border border-[#E5DDD0] text-[#2D3E35]"
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="text"
                        value={block.time}
                        onChange={(e) => handleBlockChange(idx, "time", e.target.value)}
                        placeholder="Time window..."
                        className="w-full px-2 py-1 text-[11px] bg-white rounded border border-[#E5DDD0] text-[#5C6B5E]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlock(idx)}
                      className="p-1 text-[#5C6B5E] hover:text-rose-600 transition-colors cursor-pointer"
                      title="Remove Block"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-semibold uppercase text-[#5C6B5E]">Activity Category:</span>
                    <select
                      value={block.activity_type || "somatic_wellness"}
                      onChange={(e) => handleBlockChange(idx, "activity_type", e.target.value)}
                      className="text-[11px] px-2 py-0.5 rounded border border-[#E5DDD0] bg-white text-[#2D3E35] font-medium"
                    >
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={block.description}
                    onChange={(e) => handleBlockChange(idx, "description", e.target.value)}
                    rows={2}
                    placeholder="Detailed experience description, somatic modality, clinical instructions..."
                    className="w-full px-2.5 py-1 text-xs bg-white rounded border border-[#E5DDD0] text-[#2D3E35]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Client Interactive Sanctuary Proposal & Authorization Link */}
          {isEditing && tripToEdit && (
            <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                  <ExternalLink className="w-4 h-4 text-emerald-700" />
                  <span>Client Interactive Sanctuary Proposal &amp; Authorization URL</span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  Status: {tripToEdit.deposit_status || "PENDING_AUTHORIZATION"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#FAF7F2] rounded-xl border border-[#E5DDD0]">
                <div className="truncate flex-1">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Shareable Client Proposal Link</span>
                  <div className="font-mono text-xs text-[#2D3E35] truncate">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/my-retreat?ref=${tripToEdit.crm_trip_id}`
                      : `/my-retreat?ref=${tripToEdit.crm_trip_id}`}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const url = typeof window !== "undefined"
                        ? `${window.location.origin}/my-retreat?ref=${tripToEdit.crm_trip_id}`
                        : `/my-retreat?ref=${tripToEdit.crm_trip_id}`;
                      navigator.clipboard.writeText(url);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] rounded-lg transition-colors cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Client Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={`/my-retreat?ref=${tripToEdit.crm_trip_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] text-[#2D3E35] rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#5C6B5E]" />
                    <span>Open Preview</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#E5DDD0]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-[#5C6B5E] hover:text-[#2D3E35] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Writing to Database...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isEditing ? "Save Itinerary Changes" : "Create Trip Proposal"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <SomaticActivityBlockLibrary
        isOpen={isBlockLibraryOpen}
        onClose={() => setIsBlockLibraryOpen(false)}
        onSelectBlock={handleInsertCuratedBlock}
      />

      <SupplierConfirmationParserModal
        isOpen={isParserOpen}
        onClose={() => setIsParserOpen(false)}
        onApplyParsedData={handleApplyParsedSupplierData}
      />
    </div>
  );
}

