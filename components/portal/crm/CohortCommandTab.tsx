"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  CloudRain,
  Plane,
  AlertTriangle,
  ShieldAlert,
  Utensils,
  BedDouble,
  CheckCircle2,
  Users,
  Calendar,
  Sparkles,
  Printer,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  UserCheck,
  User,
  Compass,
} from "lucide-react";
import { printCohortManifest } from "@/lib/print-export";
import {
  CRMTripItem,
  CRMClientItem,
  fetchSanctuaryDietaryManifest,
  pivotCohortWeatherItinerary,
  resequenceCohortFlightDisruptions,
  triggerAllergenQuarantineProtocol,
  resolveRoomAllocationConflict,
  postponeCohortForceMajeure,
  scheduleBodyworkSession,
} from "@/lib/sidecar-api";

interface CohortCommandTabProps {
  trips: CRMTripItem[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  clients?: CRMClientItem[];
  onInspectGuest?: (clientId: string) => void;
  onInspectTrip?: (tripId: string) => void;
}

const SANCTUARY_COHORTS = [
  {
    slug: "puerto-vallarta-2027",
    title: "Puerto Vallarta · Sierra Madre Cliffside Sanctuary",
    dates: "Oct 10–15, 2027",
    capacity: 12,
    location: "Puerto Vallarta, Mexico (PVR)",
    defaultDate: "2027-10-12",
  },
  {
    slug: "nosara",
    title: "Nosara · Blue Zone Somatic Restoration",
    dates: "Nov 14–19, 2026",
    capacity: 12,
    location: "Guanacaste, Costa Rica (LIR)",
    defaultDate: "2026-11-16",
  },
  {
    slug: "amalfi",
    title: "Amalfi Coast · Tyrrhenian Cliffside Immersion",
    dates: "May 18–23, 2027",
    capacity: 12,
    location: "Ravello, Italy (NAP)",
    defaultDate: "2027-05-20",
  },
  {
    slug: "bali",
    title: "Bali · Ubud Jungle Autonomic Sanctuary",
    dates: "Sep 08–13, 2027",
    capacity: 12,
    location: "Ubud, Bali (DPS)",
    defaultDate: "2027-09-10",
  },
];

export default function CohortCommandTab({
  trips,
  onRefresh,
  onNotify,
  clients = [],
  onInspectGuest,
  onInspectTrip,
}: CohortCommandTabProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>("puerto-vallarta-2027");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [showOperationsDrawer, setShowOperationsDrawer] = useState<boolean>(true);

  // Result states for live visual inspection
  const [dietaryManifest, setDietaryManifest] = useState<{
    sanctuary_slug: string;
    total_guests: number;
    category_summary: Record<string, number>;
    kitchen_manifest: Array<{
      guest_name: string;
      room_tier: string;
      dietary_notes: string;
      clinical_flags: string[];
      chef_kitchen_protocol: string[];
    }>;
  } | null>(null);

  const [fleetRunsResult, setFleetRunsResult] = useState<{
    fleet_runs_count: number;
    active_passengers_count: number;
    cancelled_passengers_count: number;
    fleet_runs: Array<{
      run_id: string;
      vehicle_type: string;
      chauffeur_name: string;
      estimated_departure_time: string;
      passenger_count: number;
      passengers: Array<{ name: string; flight: string; arrival: string; terminal: string }>;
      vehicle_amenities: string;
    }>;
  } | null>(null);

  const [allergenAlertResult, setAllergenAlertResult] = useState<{
    contaminated_item: string;
    safe_alternative: string;
    high_risk_count: number;
    precautionary_count: number;
    high_risk_guests: Array<{ guest_name: string; room_tier: string; dietary_notes: string }>;
  } | null>(null);

  const [bodyworkFeedback, setBodyworkFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const cohortTrips = trips.filter((t) => t.sanctuary_slug === selectedSlug);
  const currentCohortMeta =
    SANCTUARY_COHORTS.find((c) => c.slug === selectedSlug) || SANCTUARY_COHORTS[0];

  // Bodywork scheduler inputs (Idiot-proofed: auto-binds to first guest or selected guest)
  const [selectedGuestId, setSelectedGuestId] = useState<string>("");
  const [bodyworkGuestName, setBodyworkGuestName] = useState("");
  const [bodyworkGuestEmail, setBodyworkGuestEmail] = useState("");
  const [bodyworkPractitioner, setBodyworkPractitioner] = useState("Mateo Silva (Master Craniosacral)");
  const [bodyworkTimeSlot, setBodyworkTimeSlot] = useState("14:00");
  const [bodyworkDate, setBodyworkDate] = useState(currentCohortMeta.defaultDate);

  // Synchronize bodywork guest defaults when cohort changes
  useEffect(() => {
    setBodyworkDate(currentCohortMeta.defaultDate);
    if (cohortTrips.length > 0) {
      setSelectedGuestId(cohortTrips[0].id);
      setBodyworkGuestName(cohortTrips[0].client_name);
      setBodyworkGuestEmail(cohortTrips[0].client_email);
    } else {
      setSelectedGuestId("custom");
      setBodyworkGuestName("");
      setBodyworkGuestEmail("");
    }
  }, [selectedSlug, trips.length]);

  const handleGuestSelectChange = (id: string) => {
    setSelectedGuestId(id);
    if (id === "custom") {
      setBodyworkGuestName("");
      setBodyworkGuestEmail("");
    } else {
      const match = cohortTrips.find((t) => t.id === id);
      if (match) {
        setBodyworkGuestName(match.client_name);
        setBodyworkGuestEmail(match.client_email);
      }
    }
  };

  const handleQuickBookGuest = (trip: CRMTripItem) => {
    setSelectedGuestId(trip.id);
    setBodyworkGuestName(trip.client_name);
    setBodyworkGuestEmail(trip.client_email);
    // Smooth scroll down to scheduler
    const el = document.getElementById("bodywork-scheduler-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const notifyDraftUpdate = (msg: string) => {
    onNotify(msg);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("drafts-updated"));
    }
  };

  // 1. Weather Pivot
  const handleWeatherPivot = async () => {
    setBusyAction("weather");
    try {
      const res = await pivotCohortWeatherItinerary(selectedSlug, {
        weather_event: "Tropical Squall & 95% Coastal Rain Warning",
        precipitation_probability: 95,
        wind_gust_kmh: 58,
        severity: "HIGH",
        affected_date: "Day 3 Morning & Sunset Sessions",
        operator_name: "Kareena Islam",
      });
      notifyDraftUpdate(
        `Weather Pivot Executed for ${currentCohortMeta.title}: ${res.updated_trips_count} guests shifted indoors to Geodesic Sound Domes & Magnesium Flotation (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed weather pivot"}`);
    } finally {
      setBusyAction(null);
    }
  };

  // 2. Batch Flight Disruption Fleet Re-Sequencing
  const handleBatchFlightResequence = async () => {
    setBusyAction("fleet");
    try {
      const sampleDisruptions =
        cohortTrips.length > 0
          ? cohortTrips.slice(0, 4).map((t, idx) => {
              const matchedCode =
                t.smart_flight?.flight_number ||
                (t.flight_details
                  ? t.flight_details.match(/([A-Z]{2,}\s*[-]?\s*\d{1,4})/i)?.[0]?.replace(/\s+/g, "-")
                  : null) ||
                (idx % 2 === 0 ? "AA-1040" : "UA-882");
              return {
                client_name: t.client_name,
                client_email: t.client_email,
                flight_number: matchedCode,
                original_arrival_time: "14:15",
                updated_arrival_time: idx === 0 ? "15:40" : idx === 1 ? "15:55" : "17:20",
                delay_minutes: idx === 0 ? 85 : idx === 1 ? 100 : 185,
                status: "DELAYED",
                connecting_airport: "DFW",
                terminal: "Terminal 2 VIP Gate",
              };
            })
          : [
              {
                client_name: "Clara Vance",
                client_email: "clara.vance@example.com",
                flight_number: "AA-1142",
                original_arrival_time: "14:00",
                updated_arrival_time: "15:35",
                delay_minutes: 95,
                status: "DELAYED",
                connecting_airport: "DFW",
                terminal: "T2",
              },
              {
                client_name: "Sienna Thorne",
                client_email: "sienna.thorne@example.com",
                flight_number: "UA-491",
                original_arrival_time: "14:20",
                updated_arrival_time: "15:50",
                delay_minutes: 90,
                status: "DELAYED",
                connecting_airport: "IAH",
                terminal: "T2",
              },
            ];

      const res = await resequenceCohortFlightDisruptions(selectedSlug, {
        disruptions: sampleDisruptions,
        operator_name: "Kareena Islam",
      });
      setFleetRunsResult(res);
      notifyDraftUpdate(
        `Chauffeur Fleet Re-Sequenced: ${res.fleet_runs_count} luxury vehicle dispatches clustered (≤35m wait window), ${res.cancelled_passengers_count} cancelled flight isolated (Draft #${res.draft_id}).`
      );
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed fleet re-sequencing"}`);
    } finally {
      setBusyAction(null);
    }
  };

  // 3. Allergen Quarantine Protocol
  const handleAllergenQuarantine = async () => {
    setBusyAction("allergen");
    try {
      const res = await triggerAllergenQuarantineProtocol(selectedSlug, {
        contaminated_item: "Artisanal Cacao & Macadamia Paste (Batch #MX-409)",
        allergen_category: "TREE_NUT_PEANUT_CROSS_CONTAMINATION",
        safe_alternative: "Single-Origin Organic Pumpkin Seed & Tahini Ganache",
        action_notes: "Immediate quarantine of Batch #MX-409; sanitize prep stations 1 & 2.",
        operator_name: "Kareena Islam",
      });
      setAllergenAlertResult(res);
      notifyDraftUpdate(
        `Allergen Quarantine Triggered: Audited ${res.total_guests_audited} guests (${res.high_risk_count} anaphylaxis high-risk). Kitchen directive staged (Draft #${res.draft_id}).`
      );
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed allergen quarantine"}`);
    } finally {
      setBusyAction(null);
    }
  };

  // 4. Double-Booking Suite Conflict Resolver
  const handleResolveRoomConflict = async () => {
    setBusyAction("conflict");
    try {
      const res = await resolveRoomAllocationConflict(selectedSlug, {
        conflicted_room_tier: "Oceanfront King Suite",
        upgrade_room_tier: "Private Cliffside Plunge Villa",
        complimentary_spa_credit: 500,
        operator_name: "Kareena Islam",
      });
      if (res.conflict_detected && res.reallocated_guest) {
        notifyDraftUpdate(
          `Suite Conflict Arbitrated: ${res.primary_guest?.name} retained ${res.conflicted_tier}; ${res.reallocated_guest.name} upgraded to ${res.reallocated_guest.new_room} at $0 fee + $${res.reallocated_guest.complimentary_credit_usd} spa credit (Draft #${res.draft_id}).`
        );
      } else {
        onNotify(res.message || "No duplicate room tier conflict detected in this cohort.");
      }
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed room conflict arbitration"}`);
    } finally {
      setBusyAction(null);
    }
  };

  // 5. Force Majeure Postponement
  const handleForceMajeure = async () => {
    setBusyAction("forcemajeure");
    try {
      const res = await postponeCohortForceMajeure(
        selectedSlug,
        "Category 4 Hurricane Preventive Sanctuary Closure & Civil Aviation Ground Stop",
        18
      );
      notifyDraftUpdate(
        `Force Majeure Postponement Executed: ${res.affected_trips_count} trips protected with 100% transferable vouchers ($${res.total_protected_credits_usd.toLocaleString()} total credit, 0% forfeiture fee).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed force majeure"}`);
    } finally {
      setBusyAction(null);
    }
  };

  // 6. Executive Chef Dietary Manifest
  const handleLoadDietaryManifest = async () => {
    setBusyAction("manifest");
    try {
      const res = await fetchSanctuaryDietaryManifest(selectedSlug);
      setDietaryManifest(res);
      onNotify(
        `Loaded Executive Chef Allergen Matrix for ${selectedSlug} (${res.total_guests} guests analyzed).`
      );
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed to load dietary manifest"}`);
    } finally {
      setBusyAction(null);
    }
  };

  // 7. 1:1 Bodywork Slot Scheduler
  const handleScheduleBodywork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyworkGuestName.trim() || !bodyworkGuestEmail.trim()) {
      onNotify("Please select or enter a guest name and email.");
      return;
    }
    setBusyAction("bodywork");
    setBodyworkFeedback(null);
    try {
      const res = await scheduleBodyworkSession(selectedSlug, {
        practitioner_name: bodyworkPractitioner,
        practitioner_service: "90-Min Craniosacral & Vagal Fascia Release",
        client_name: bodyworkGuestName,
        client_email: bodyworkGuestEmail,
        session_date: bodyworkDate,
        requested_time_slot: bodyworkTimeSlot,
        duration_minutes: 90,
      });
      if (res.allocated) {
        setBodyworkFeedback({
          success: true,
          message: `Slot Locked: ${bodyworkGuestName} confirmed with ${res.practitioner} at ${res.time} on ${res.date}.`,
        });
        notifyDraftUpdate(
          `Locked 1:1 Bodywork Slot: ${bodyworkGuestName} with ${res.practitioner} at ${res.time} on ${res.date} (Draft #${res.draft_id}).`
        );
      } else {
        setBodyworkFeedback({
          success: false,
          message: `Slot Conflict: ${bodyworkTimeSlot} is reserved. Auto-offered adjacent opening at ${res.offered_adjacent_slot} for ${bodyworkGuestName}.`,
        });
        notifyDraftUpdate(
          `Slot Conflict Resolved: ${bodyworkTimeSlot} already booked. Automatically reserved ${res.offered_adjacent_slot} for ${bodyworkGuestName} (Draft #${res.draft_id}).`
        );
      }
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed bodywork scheduling"}`);
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Cohort Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {SANCTUARY_COHORTS.map((cohort) => {
          const count = trips.filter((t) => t.sanctuary_slug === cohort.slug).length;
          const pct = Math.min(100, Math.round((count / cohort.capacity) * 100));
          const isSelected = selectedSlug === cohort.slug;

          return (
            <button
              key={cohort.slug}
              onClick={() => setSelectedSlug(cohort.slug)}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#2D3E35] text-[#FAF7F2] border-[#2D3E35] shadow-md ring-2 ring-[#C07D63]/30"
                  : "bg-white text-[#2D3E35] border-[#E5DDD0] hover:border-[#2D3E35]/40"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider opacity-80">
                <span className="font-semibold">{cohort.slug}</span>
                <span className="px-1.5 py-0.5 rounded bg-black/10 font-bold">
                  {count} / {cohort.capacity} Guests
                </span>
              </div>
              <div className="font-serif font-bold text-sm mt-1.5 line-clamp-1">{cohort.title}</div>
              <div className="text-[11px] opacity-80 mt-0.5">{cohort.dates}</div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-black/15 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected ? "bg-[#C07D63]" : "bg-[#2D3E35]"
                  }`}
                  style={{ width: `${Math.max(8, pct)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Master Cohort Command & Manifest Header */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-[#C07D63]/15 text-[#C07D63] border border-[#C07D63]/30 rounded">
                Sanctuary Retreat Cohort
              </span>
              <h2 className="font-serif text-xl font-bold text-[#2D3E35]">
                {currentCohortMeta.title}
              </h2>
            </div>
            <p className="text-xs text-[#5C6B5E] mt-1">
              {currentCohortMeta.location} &middot; {currentCohortMeta.dates} &middot;{" "}
              <strong>{cohortTrips.length}</strong> Registered Guests ({currentCohortMeta.capacity} Max)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sanctuary Synced</span>
            </div>
            <button
              onClick={() => {
                printCohortManifest({
                  title: currentCohortMeta.title,
                  dates: currentCohortMeta.dates,
                  location: currentCohortMeta.location,
                  capacity: currentCohortMeta.capacity,
                  guests: cohortTrips.map((t) => ({
                    guest_name: t.client_name,
                    room_tier: t.room_tier || "Sanctuary Master Villa",
                    dietary_notes: t.dietary_notes || "Standard Anti-inflammatory",
                    clinical_flags: t.clinical_flags || [],
                    flight: t.flight_details || "Arriving Private/Commercial PVR",
                    arrival: "Scheduled",
                  })),
                  kitchen_protocols: dietaryManifest?.kitchen_manifest?.map(
                    (k) => `${k.guest_name}: ${k.chef_kitchen_protocol.join("; ")}`
                  ),
                });
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] transition-colors cursor-pointer"
              title="Print rooming and guest manifest"
            >
              <Printer className="w-3.5 h-3.5 text-[#2D3E35]" />
              <span>Print Rooming List</span>
            </button>
            <button
              onClick={handleLoadDietaryManifest}
              disabled={busyAction !== null}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] transition-colors cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5 text-[#C07D63]" />
              <span>Chef Allergen Matrix</span>
            </button>
          </div>
        </div>

        {/* 3. Confirmed Cohort Guest Roster (Actual Visibility of Cohort Members) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-serif text-sm font-bold text-[#2D3E35] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#C07D63]" />
              <span>Cohort Guest &amp; Villa Roster ({cohortTrips.length} Guests)</span>
            </h3>
            <span className="text-[11px] text-[#5C6B5E]">
              1-click to schedule 1:1 bodywork sessions
            </span>
          </div>

          {cohortTrips.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-center space-y-1">
              <Users className="w-6 h-6 text-[#5C6B5E]/50 mx-auto" />
              <div className="font-serif font-bold text-sm text-[#2D3E35]">
                No guests registered in this cohort yet
              </div>
              <p className="text-xs text-[#5C6B5E]">
                Use the &quot;+ New Reservation&quot; modal in the top header to assign a guest to {currentCohortMeta.title}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {cohortTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-2 hover:border-[#2D3E35]/30 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        {onInspectGuest ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (trip.client_id) {
                                onInspectGuest(trip.client_id);
                              } else {
                                const matched = clients.find(
                                  (c) =>
                                    c.email.toLowerCase() === trip.client_email.toLowerCase() ||
                                    c.full_name.toLowerCase() === trip.client_name.toLowerCase()
                                );
                                if (matched) onInspectGuest(matched.id);
                              }
                            }}
                            className="font-serif font-bold text-sm text-[#2D3E35] hover:text-emerald-800 text-left transition-colors cursor-pointer"
                            title="Inspect Guest Dossier & Clearance"
                          >
                            {trip.client_name}
                          </button>
                        ) : (
                          <div className="font-serif font-bold text-sm text-[#2D3E35]">
                            {trip.client_name}
                          </div>
                        )}
                        <div className="text-[11px] text-[#5C6B5E]">{trip.client_email}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white border border-[#E5DDD0] text-[#2D3E35]">
                        {trip.status}
                      </span>
                    </div>

                    {onInspectTrip ? (
                      <button
                        type="button"
                        onClick={() => onInspectTrip(trip.id)}
                        className="mt-2 text-xs font-semibold text-[#2D3E35] hover:text-emerald-800 flex items-center space-x-1.5 text-left transition-colors cursor-pointer"
                        title="Click to view or edit reservation itinerary"
                      >
                        <BedDouble className="w-3.5 h-3.5 text-[#C07D63] shrink-0" />
                        <span className="line-clamp-1">{trip.room_tier || "Sanctuary Master Villa"}</span>
                      </button>
                    ) : (
                      <div className="mt-2 text-xs font-semibold text-[#2D3E35] flex items-center space-x-1.5">
                        <BedDouble className="w-3.5 h-3.5 text-[#C07D63] shrink-0" />
                        <span className="line-clamp-1">{trip.room_tier || "Sanctuary Master Villa"}</span>
                      </div>
                    )}

                    {trip.dietary_notes && (
                      <div className="mt-1 text-[11px] text-[#5C6B5E] flex items-center space-x-1">
                        <Utensils className="w-3 h-3 text-amber-700 shrink-0" />
                        <span className="line-clamp-1">{trip.dietary_notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#E5DDD0]/70 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#5C6B5E]">
                      Paid: ${(trip.paid_amount || 0).toLocaleString()} / ${trip.total_investment.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {onInspectGuest && (
                        <button
                          type="button"
                          onClick={() => {
                            if (trip.client_id) {
                              onInspectGuest(trip.client_id);
                            } else {
                              const matched = clients.find(
                                (c) =>
                                  c.email.toLowerCase() === trip.client_email.toLowerCase() ||
                                  c.full_name.toLowerCase() === trip.client_name.toLowerCase()
                              );
                              if (matched) onInspectGuest(matched.id);
                            }
                          }}
                          className="px-2 py-1 rounded text-[11px] font-semibold bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer flex items-center space-x-1"
                          title="Open Guest Dossier"
                        >
                          <User className="w-3 h-3 text-emerald-700" />
                          <span>Dossier</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleQuickBookGuest(trip)}
                        className="px-2.5 py-1 rounded text-[11px] font-semibold bg-white hover:bg-[#2D3E35] text-[#2D3E35] hover:text-[#FAF7F2] border border-[#E5DDD0] transition-colors cursor-pointer flex items-center space-x-1"
                        title="Schedule 1:1 Somatic Bodywork"
                      >
                        <Calendar className="w-3 h-3 text-[#C07D63]" />
                        <span>Book 1:1</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Streamlined Operations & Group Logistics (Clean, 3-Pillar Architecture) */}
        <div className="border-t border-[#E5DDD0] pt-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold uppercase tracking-wider text-[#2D3E35] flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C07D63]" />
              <span>Sanctuary Operations &amp; Group Contingency Protocols</span>
            </div>
            <button
              type="button"
              onClick={() => setShowOperationsDrawer(!showOperationsDrawer)}
              className="text-xs text-[#5C6B5E] hover:text-[#2D3E35] flex items-center space-x-1 font-semibold cursor-pointer"
            >
              <span>{showOperationsDrawer ? "Collapse Protocols" : "Expand Protocols"}</span>
              {showOperationsDrawer ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {showOperationsDrawer && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 animate-in fade-in">
              {/* Pillar A: Logistics & Weather */}
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-serif font-bold text-xs text-[#2D3E35] flex items-center space-x-1.5">
                    <CloudRain className="w-4 h-4 text-blue-700" />
                    <span>Weather &amp; Aviation Logistics</span>
                  </div>
                  <p className="text-[11px] text-[#5C6B5E] mt-1 leading-relaxed">
                    Automated group pivots for rainfall squalls and luxury chauffeur re-sequencing for delayed flights.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleWeatherPivot}
                    disabled={busyAction !== null}
                    className="w-full py-1.5 px-2.5 rounded-md bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === "weather" ? "Moving Indoors..." : "Move Activities Indoors (Rain)"}
                  </button>
                  <button
                    onClick={handleBatchFlightResequence}
                    disabled={busyAction !== null}
                    className="w-full py-1.5 px-2.5 rounded-md bg-white hover:bg-slate-50 text-[#2D3E35] border border-[#E5DDD0] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === "fleet" ? "Re-Sequencing Cars..." : "Group Delayed Airport Pickups"}
                  </button>
                </div>
              </div>

              {/* Pillar B: Accommodations & Food Safety */}
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-serif font-bold text-xs text-[#2D3E35] flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    <span>Safety &amp; Villa Arbitration</span>
                  </div>
                  <p className="text-[11px] text-[#5C6B5E] mt-1 leading-relaxed">
                    Instantly quarantine allergen-contaminated ingredients and arbitrate double-booked suites by lifetime spend.
                  </p>
                </div>
                <div className="space-y-2 pt-2">
                  <button
                    onClick={handleResolveRoomConflict}
                    disabled={busyAction !== null}
                    className="w-full py-1.5 px-2.5 rounded-md bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === "conflict" ? "Resolving Overlap..." : "Arbitrate Suite Overlap"}
                  </button>
                  <button
                    onClick={handleAllergenQuarantine}
                    disabled={busyAction !== null}
                    className="w-full py-1.5 px-2.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === "allergen" ? "Quarantining..." : "Trigger Allergen Quarantine"}
                  </button>
                </div>
              </div>

              {/* Pillar C: Force Majeure Contingency */}
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="font-serif font-bold text-xs text-rose-950 flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-700" />
                    <span>Contingency &amp; Force Majeure</span>
                  </div>
                  <p className="text-[11px] text-rose-900/80 mt-1 leading-relaxed">
                    Protects the entire cohort with 100% transferable 18-month retreat credits in severe weather or civil stop events.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleForceMajeure}
                    disabled={busyAction !== null}
                    className="w-full py-2 px-2.5 rounded-md bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busyAction === "forcemajeure" ? "Issuing Credits..." : "Issue 100% Transferable Credits"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Output Drawers (Dietary Matrix / Fleet Clustering / Allergen Audit) */}
        {dietaryManifest && (
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="font-serif font-bold text-sm text-[#2D3E35]">
                Executive Chef Dietary Matrix ({dietaryManifest.sanctuary_slug})
              </div>
              <button
                onClick={() => setDietaryManifest(null)}
                className="text-xs text-[#5C6B5E] hover:text-[#2D3E35] font-semibold cursor-pointer"
              >
                Close Matrix
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(dietaryManifest.category_summary || {}).map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-2.5 py-1 rounded-md bg-white border border-[#E5DDD0] text-xs font-mono font-semibold text-[#2D3E35]"
                >
                  {cat}: {count}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto">
              {dietaryManifest.kitchen_manifest.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-white border border-[#E5DDD0] text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-[#2D3E35]">
                    <span>{item.guest_name}</span>
                    <span className="text-[10px] font-mono text-[#5C6B5E]">{item.room_tier}</span>
                  </div>
                  <div className="text-[#5C6B5E] text-[11px]">{item.dietary_notes}</div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {item.chef_kitchen_protocol.map((p, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-mono"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fleetRunsResult && (
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="font-serif font-bold text-sm text-blue-950">
                Chauffeur Transfer Wave Re-Sequencing ({fleetRunsResult.fleet_runs_count} Runs Dispatched)
              </div>
              <button
                onClick={() => setFleetRunsResult(null)}
                className="text-xs text-blue-800 hover:underline font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fleetRunsResult.fleet_runs.map((run) => (
                <div key={run.run_id} className="p-3 rounded-lg bg-white border border-blue-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#2D3E35]">
                    <span>
                      {run.run_id}: {run.vehicle_type}
                    </span>
                    <span className="text-blue-800 font-mono">Departs {run.estimated_departure_time}</span>
                  </div>
                  <div className="text-[11px] text-[#5C6B5E]">
                    Chauffeur: {run.chauffeur_name} &middot; {run.vehicle_amenities}
                  </div>
                  <div className="pt-1 space-y-1 border-t border-blue-100">
                    {run.passengers.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-[#2D3E35]">{p.name}</span>
                        <span className="font-mono text-[#5C6B5E]">
                          {p.flight} (ETA {p.arrival} · {p.terminal})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {allergenAlertResult && (
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-300 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase text-amber-950">
                Allergen Quarantine Active: {allergenAlertResult.contaminated_item}
              </span>
              <button
                onClick={() => setAllergenAlertResult(null)}
                className="text-xs text-amber-900 font-semibold cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-amber-900">
              Safe Substitute Deployed: <strong>{allergenAlertResult.safe_alternative}</strong> &middot;{" "}
              High-Risk Anaphylaxis Guests Isolated: <strong>{allergenAlertResult.high_risk_count}</strong>
            </p>
          </div>
        )}
      </div>

      {/* 5. 1:1 Master Bodywork & Somatic Practitioner Scheduling (Idiot-Proofed) */}
      <div id="bodywork-scheduler-section" className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DDD0] pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-[#2D3E35] flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#C07D63]" />
              <span>1:1 Master Bodywork &amp; Somatic Practitioner Scheduling</span>
            </h3>
            <p className="text-xs text-[#5C6B5E] mt-0.5">
              Prevents concurrent double-booking of scarce 1:1 clinical practitioners and automatically proposes adjacent slots on collision.
            </p>
          </div>
        </div>

        {bodyworkFeedback && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              bodyworkFeedback.success
                ? "bg-emerald-50 text-emerald-950 border border-emerald-200"
                : "bg-amber-50 text-amber-950 border border-amber-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              {bodyworkFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{bodyworkFeedback.message}</span>
            </div>
            <button
              onClick={() => setBodyworkFeedback(null)}
              className="text-[10px] font-bold underline cursor-pointer ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleScheduleBodywork} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          {/* Guest Selector Dropdown */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
              Select Guest
            </label>
            <select
              value={selectedGuestId}
              onChange={(e) => handleGuestSelectChange(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
            >
              {cohortTrips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.client_name}
                </option>
              ))}
              <option value="custom">+ Manual / Other Guest</option>
            </select>
          </div>

          {/* Guest Email or Manual Name */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
              {selectedGuestId === "custom" ? "Guest Name & Email" : "Guest Email"}
            </label>
            {selectedGuestId === "custom" ? (
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  placeholder="Name"
                  value={bodyworkGuestName}
                  onChange={(e) => setBodyworkGuestName(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={bodyworkGuestEmail}
                  onChange={(e) => setBodyworkGuestEmail(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                  required
                />
              </div>
            ) : (
              <input
                type="email"
                value={bodyworkGuestEmail}
                readOnly
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#5C6B5E]"
              />
            )}
          </div>

          {/* Practitioner */}
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
              Practitioner &amp; Modality
            </label>
            <select
              value={bodyworkPractitioner}
              onChange={(e) => setBodyworkPractitioner(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35]"
            >
              <option value="Mateo Silva (Master Craniosacral)">Mateo Silva (Craniosacral)</option>
              <option value="Dr. Sofia Mendez (Vagal Acupuncture)">Dr. Sofia Mendez (Acupuncture)</option>
              <option value="Kareena Islam, BSN, RN (Somatic Consultation)">Kareena Islam, RN (Clinical)</option>
            </select>
          </div>

          {/* Date & Slot */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Date</label>
              <input
                type="date"
                value={bodyworkDate}
                onChange={(e) => setBodyworkDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Time Slot</label>
              <select
                value={bodyworkTimeSlot}
                onChange={(e) => setBodyworkTimeSlot(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
              >
                <option value="10:00">10:00 AM</option>
                <option value="14:00">2:00 PM</option>
                <option value="15:30">3:30 PM</option>
                <option value="17:00">5:00 PM</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={busyAction !== null}
            className="w-full py-2 px-3 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-1.5"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#C07D63]" />
            <span>{busyAction === "bodywork" ? "Locking Slot..." : "Lock 1:1 Session"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
