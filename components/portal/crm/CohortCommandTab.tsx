"use client";

import React, { useState } from "react";
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
  RefreshCw,
} from "lucide-react";
import {
  CRMTripItem,
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
}

const SANCTUARY_COHORTS = [
  {
    slug: "puerto-vallarta-2027",
    title: "Puerto Vallarta · Sierra Madre Cliffside Sanctuary",
    dates: "Oct 10–15, 2027",
    capacity: 12,
    location: "Puerto Vallarta, Mexico (PVR)",
  },
  {
    slug: "nosara",
    title: "Nosara · Blue Zone Somatic Restoration",
    dates: "Nov 14–19, 2026",
    capacity: 12,
    location: "Guanacaste, Costa Rica (LIR)",
  },
  {
    slug: "amalfi",
    title: "Amalfi Coast · Tyrrhenian Cliffside Immersion",
    dates: "May 18–23, 2027",
    capacity: 12,
    location: "Ravello, Italy (NAP)",
  },
  {
    slug: "bali",
    title: "Bali · Ubud Jungle Autonomic Sanctuary",
    dates: "Sep 08–13, 2027",
    capacity: 12,
    location: "Ubud, Bali (DPS)",
  },
];

export default function CohortCommandTab({
  trips,
  onRefresh,
  onNotify,
}: CohortCommandTabProps) {
  const [selectedSlug, setSelectedSlug] = useState<string>("puerto-vallarta-2027");
  const [busyAction, setBusyAction] = useState<string | null>(null);

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

  // Bodywork scheduler inputs
  const [bodyworkGuestName, setBodyworkGuestName] = useState("Elena Vance");
  const [bodyworkGuestEmail, setBodyworkGuestEmail] = useState("elena.vance@example.com");
  const [bodyworkPractitioner, setBodyworkPractitioner] = useState("Mateo Silva (Master Craniosacral)");
  const [bodyworkTimeSlot, setBodyworkTimeSlot] = useState("14:00");
  const [bodyworkDate, setBodyworkDate] = useState("2027-10-12");

  const cohortTrips = trips.filter((t) => t.sanctuary_slug === selectedSlug);
  const currentCohortMeta =
    SANCTUARY_COHORTS.find((c) => c.slug === selectedSlug) || SANCTUARY_COHORTS[0];

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
        `Weather Pivot Executed for ${selectedSlug}: ${res.updated_trips_count} guest sub-trips shifted indoors to Geodesic Sound Domes & Magnesium Flotation (Draft #${res.draft_id} staged).`
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
        cohortTrips.length >= 2
          ? cohortTrips.slice(0, 4).map((t, idx) => ({
              client_name: t.client_name,
              client_email: t.client_email,
              flight_number: idx % 2 === 0 ? `AA-${1040 + idx}` : `UA-${882 + idx}`,
              original_arrival_time: "14:15",
              updated_arrival_time: idx === 0 ? "15:40" : idx === 1 ? "15:55" : "17:20",
              delay_minutes: idx === 0 ? 85 : idx === 1 ? 100 : 185,
              status: "DELAYED",
              connecting_airport: "DFW",
              terminal: "Terminal 2 VIP Gate",
            }))
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
              {
                client_name: "Marcus Sterling",
                client_email: "marcus.sterling@example.com",
                flight_number: "DL-908",
                original_arrival_time: "15:00",
                updated_arrival_time: "CANCELLED",
                delay_minutes: 720,
                status: "CANCELLED",
                connecting_airport: "ATL",
                terminal: "T1",
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
    setBusyAction("bodywork");
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
        notifyDraftUpdate(
          `Locked 1:1 Bodywork Slot: ${bodyworkGuestName} with ${res.practitioner} at ${res.time} on ${res.date} (Draft #${res.draft_id}).`
        );
      } else {
        notifyDraftUpdate(
          `Slot Collision Guard: ${bodyworkTimeSlot} is occupied by ${res.slot_occupied_by}. Auto-offered adjacent slot ${res.offered_adjacent_slot} to ${bodyworkGuestName} (Draft #${res.draft_id}).`
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
      {/* Cohort Selector Cards (Master Group Cohorts Architecture) */}
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
                  ? "bg-[#2D3E35] text-[#FAF7F2] border-[#2D3E35] shadow-md"
                  : "bg-white text-[#2D3E35] border-[#E5DDD0] hover:border-[#2D3E35]/50"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider opacity-80">
                <span>{cohort.slug}</span>
                <span>
                  {count}/{cohort.capacity} Sub-Trips
                </span>
              </div>
              <div className="font-serif font-bold text-sm mt-1 line-clamp-1">{cohort.title}</div>
              <div className="text-[11px] opacity-80 mt-0.5">{cohort.dates}</div>
              <div className="mt-3 w-full h-1.5 rounded-full bg-black/15 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isSelected ? "bg-[#C07D63]" : "bg-[#2D3E35]"
                  }`}
                  style={{ width: `${Math.max(8, pct)}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Master Group Cohort Command Bar */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold bg-[#C07D63]/15 text-[#C07D63] border border-[#C07D63]/30 rounded">
                Sanctuary Master Group Cohort
              </span>
              <h2 className="font-serif text-xl font-bold text-[#2D3E35]">
                {currentCohortMeta.title}
              </h2>
            </div>
            <p className="text-xs text-[#5C6B5E] mt-1">
              {currentCohortMeta.location} &middot; {currentCohortMeta.dates} &middot;{" "}
              <strong>{cohortTrips.length}</strong> Linked Traveler Sub-Trips
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        {/* 1-Click Cohort Crisis & Logistics Automations */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-[#2D3E35] mb-3 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C07D63]" />
            <span>1-Click Cohort Crisis, Weather &amp; Logistics Automations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Weather Pivot */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-[#2D3E35]">
                  <CloudRain className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>Weather Squall Pivot</span>
                </div>
                <p className="text-[11px] text-[#5C6B5E] mt-1">
                  Shifts outdoor beach pranayama to indoor Geodesic Sound Domes &amp; Magnesium Flotation across all cohort sub-trips.
                </p>
              </div>
              <button
                onClick={handleWeatherPivot}
                disabled={busyAction !== null}
                className="w-full py-1.5 px-2.5 rounded-md bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyAction === "weather" ? "Pivoting Cohort..." : "Execute Indoor Pivot"}
              </button>
            </div>

            {/* Batch Flight Disruption */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-[#2D3E35]">
                  <Plane className="w-4 h-4 text-indigo-700 shrink-0" />
                  <span>Chauffeur Fleet Clustering</span>
                </div>
                <p className="text-[11px] text-[#5C6B5E] mt-1">
                  Clusters cascading airline delays into luxury Escalade/Sprinter waves (≤35m wait window) &amp; isolates cancelled flights.
                </p>
              </div>
              <button
                onClick={handleBatchFlightResequence}
                disabled={busyAction !== null}
                className="w-full py-1.5 px-2.5 rounded-md bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyAction === "fleet" ? "Clustering Fleet..." : "Re-Sequence Arrivals"}
              </button>
            </div>

            {/* Allergen Quarantine */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-[#2D3E35]">
                  <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Allergen Recall Quarantine</span>
                </div>
                <p className="text-[11px] text-[#5C6B5E] mt-1">
                  Audits cohort for tree-nut/peanut anaphylaxis, quarantines contaminated supplier batch, and substitutes seed ganache.
                </p>
              </div>
              <button
                onClick={handleAllergenQuarantine}
                disabled={busyAction !== null}
                className="w-full py-1.5 px-2.5 rounded-md bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyAction === "allergen" ? "Auditing Kitchen..." : "Trigger Recall Quarantine"}
              </button>
            </div>

            {/* Suite Conflict Resolver */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-[#2D3E35]">
                  <BedDouble className="w-4 h-4 text-emerald-800 shrink-0" />
                  <span>Suite Conflict Arbitrator</span>
                </div>
                <p className="text-[11px] text-[#5C6B5E] mt-1">
                  Arbitrates double-booked suites by lifetime spend; awards secondary guest $0 Cliffside Villa upgrade + $500 spa folio credit.
                </p>
              </div>
              <button
                onClick={handleResolveRoomConflict}
                disabled={busyAction !== null}
                className="w-full py-1.5 px-2.5 rounded-md bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyAction === "conflict" ? "Arbitrating..." : "Resolve Suite Overlap"}
              </button>
            </div>

            {/* Force Majeure Postponement */}
            <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center space-x-1.5 font-semibold text-xs text-rose-950">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>Force Majeure Freeze</span>
                </div>
                <p className="text-[11px] text-rose-900/80 mt-1">
                  Mass-postpones cohort for hurricane/airspace closure with 100% transferable 18-month vouchers and 0% forfeiture penalty.
                </p>
              </div>
              <button
                onClick={handleForceMajeure}
                disabled={busyAction !== null}
                className="w-full py-1.5 px-2.5 rounded-md bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                {busyAction === "forcemajeure" ? "Issuing Vouchers..." : "Postpone & Protect 100%"}
              </button>
            </div>
          </div>
        </div>

        {/* Live Output Drawers (Dietary Matrix / Fleet Clustering / Allergen Audit) */}
        {dietaryManifest && (
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div className="font-serif font-bold text-sm text-[#2D3E35]">
                Executive Chef Allergen &amp; Clinical Dietary Matrix ({dietaryManifest.sanctuary_slug})
              </div>
              <button
                onClick={() => setDietaryManifest(null)}
                className="text-xs text-[#5C6B5E] hover:text-[#2D3E35] font-semibold"
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
                className="text-xs text-blue-800 hover:underline font-semibold"
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
                className="text-xs text-amber-900 font-semibold"
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

      {/* Atomic 1:1 Master Bodywork & Practitioner Slot Scheduler */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-[#2D3E35] flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-[#C07D63]" />
              <span>1:1 Master Bodywork &amp; Somatic Practitioner Slot Scheduler (Mutex Collision Guard)</span>
            </h3>
            <p className="text-xs text-[#5C6B5E]">
              Prevents concurrent double-booking of scarce 1:1 clinical practitioners and automatically proposes adjacent 15:30 slots on collision.
            </p>
          </div>
        </div>

        <form onSubmit={handleScheduleBodywork} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Guest Name</label>
            <input
              type="text"
              value={bodyworkGuestName}
              onChange={(e) => setBodyworkGuestName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Guest Email</label>
            <input
              type="email"
              value={bodyworkGuestEmail}
              onChange={(e) => setBodyworkGuestEmail(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Practitioner</label>
            <select
              value={bodyworkPractitioner}
              onChange={(e) => setBodyworkPractitioner(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
            >
              <option value="Mateo Silva (Master Craniosacral)">Mateo Silva (Craniosacral)</option>
              <option value="Dr. Sofia Mendez (Vagal Acupuncture)">Dr. Sofia Mendez (Acupuncture)</option>
              <option value="Kareena Islam, BSN, RN (Somatic Consultation)">Kareena Islam, RN (Clinical)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Date</label>
              <input
                type="date"
                value={bodyworkDate}
                onChange={(e) => setBodyworkDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Slot</label>
              <select
                value={bodyworkTimeSlot}
                onChange={(e) => setBodyworkTimeSlot(e.target.value)}
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              >
                <option value="10:00">10:00</option>
                <option value="14:00">14:00</option>
                <option value="15:30">15:30</option>
                <option value="17:00">17:00</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={busyAction !== null}
            className="px-4 py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer"
          >
            {busyAction === "bodywork" ? "Locking Slot..." : "Reserve 1:1 Session"}
          </button>
        </form>
      </div>
    </div>
  );
}

