"use client";

import React, { useState } from "react";
import {
  Plane,
  Briefcase,
  ArrowUpCircle,
  ShieldCheck,
  Navigation,
  Gauge,
} from "lucide-react";
import {
  CRMTripItem,
  updateCrmTripFlightDelay,
  reportCrmAviationDivert,
  processPrivateCharterManifest,
  handleLostLuggageEmergency,
  upgradeCrmTripSuiteTier,
  verifyPassportImmigrationValidity,
} from "@/lib/sidecar-api";

interface TripOperationsDrawerProps {
  trip: CRMTripItem;
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

export default function TripOperationsDrawer({
  trip,
  onRefresh,
  onNotify,
}: TripOperationsDrawerProps) {
  const [activeTool, setActiveTool] = useState<
    "delay" | "divert" | "charter" | "luggage" | "upgrade" | "passport"
  >("delay");
  const [busy, setBusy] = useState(false);

  // 1. Flight Delay state
  const [delayMinutes, setDelayMinutes] = useState(145);
  const [newEta, setNewEta] = useState("17:40");
  const [delayReason, setDelayReason] = useState("ATC Ground Stop & Connecting Gate Hold");

  // 2. Private Aviation Diversion state
  const [divertedAirport, setDivertedAirport] = useState("GDL (Guadalajara International FBO)");
  const [divertDelay, setDivertDelay] = useState(190);
  const [divertReason, setDivertReason] = useState("Dense coastal fog & crosswind shear at PVR");

  // 3. Private Jet Charter Weight & Crew Duty state
  const [aircraftType, setAircraftType] = useState("Gulfstream G650ER");
  const [tailNumber, setTailNumber] = useState("N650KA");
  const [paxCount, setPaxCount] = useState(6);
  const [luggageLbs, setLuggageLbs] = useState(540);
  const [cargoLbs, setCargoLbs] = useState(380);
  const [pilotDutyHours, setPilotDutyHours] = useState(11.5);

  // 4. Lost Luggage & Boutique Capsule Wardrobe state
  const [bagClaimTag, setBagClaimTag] = useState("AA-BAG-994120");
  const [topSize, setTopSize] = useState("S");
  const [bottomSize, setBottomSize] = useState("S");
  const [shoeSize, setShoeSize] = useState("38 EU");

  // 5. Suite Upgrade & 30/70 Recalculation state
  const [newSuiteTier, setNewSuiteTier] = useState("Private Cliffside Plunge Pool Villa");
  const [newTotalInvestment, setNewTotalInvestment] = useState(14500);

  // 6. Passport 6-Month Validity Gate state
  const [passportNumber, setPassportNumber] = useState("US-884920194");
  const [passportExpiry, setPassportExpiry] = useState("2027-12-05");
  const [retreatArrival, setRetreatArrival] = useState("2027-10-10");
  const [retreatDeparture, setRetreatDeparture] = useState("2027-10-15");

  const notifyDraft = (msg: string) => {
    onNotify(msg);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("drafts-updated"));
    }
  };

  const handleRunDelay = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await updateCrmTripFlightDelay(trip.id, delayMinutes, newEta, delayReason);
      notifyDraft(
        `Flight Delay Recorded (+${delayMinutes}m, ETA ${res.new_eta}): Chauffeur & Cold-Towel Escort realigned (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed flight delay update"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRunDivert = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await reportCrmAviationDivert(
        trip.id,
        "PVR",
        divertedAirport,
        divertReason,
        divertDelay
      );
      notifyDraft(
        `Aviation Diversion Logged to ${res.diverted_airport}: ${res.ground_plan} (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed aviation diversion"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRunCharter = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await processPrivateCharterManifest(trip.id, {
        aircraft_type: aircraftType,
        tail_number: tailNumber,
        origin_icao: "KTEB",
        destination_icao: "MMPR",
        departure_time: "09:00 EST",
        estimated_arrival_time: "13:45 CST",
        passenger_count: paxCount,
        total_luggage_weight_lbs: luggageLbs,
        cargo_equipment_weight_lbs: cargoLbs,
        pilot_duty_hours: pilotDutyHours,
      });
      notifyDraft(
        `Private Charter Manifest (${res.tail_number}): Gross Payload ${res.gross_payload_lbs}/${res.max_payload_lbs} lbs, Crew Duty ${res.crew_duty_hours}h — Dispatch ${res.dispatch_approved ? "APPROVED" : "HOLD: RELIEF CREW REQUIRED"} (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed charter manifest"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRunLuggage = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await handleLostLuggageEmergency(trip.id, {
        carrier_airline: trip.smart_flight?.airline || "American Airlines",
        flight_number: "AA-1184",
        baggage_claim_tag: bagClaimTag,
        missing_bags_count: 2,
        guest_top_size: topSize,
        guest_bottom_size: bottomSize,
        guest_shoe_size: shoeSize,
      });
      notifyDraft(
        `Lost Luggage Protocol (${res.claim_tag}): Staged $0 5-Piece Organic Capsule Wardrobe (${res.capsule_items.length} items) in suite + 24/7 front-gate courier clearance (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed lost luggage protocol"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRunUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await upgradeCrmTripSuiteTier(trip.id, newSuiteTier, newTotalInvestment);
      notifyDraft(
        `Upgraded Suite to ${res.room_tier} ($${res.total_investment.toLocaleString()}): 30% Deposit $${res.deposit_amount.toLocaleString()}, 70% Balance $${res.final_balance.toLocaleString()} (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed suite upgrade"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRunPassport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await verifyPassportImmigrationValidity(trip.id, {
        passport_country: "United States",
        passport_number: passportNumber,
        passport_expiry_date: passportExpiry,
        retreat_arrival_date: retreatArrival,
        retreat_departure_date: retreatDeparture,
      });
      notifyDraft(
        `Passport 180-Day Border Gate [${res.alert_status}]: ${res.days_validity_remaining} days remaining (${res.action_required}) — Draft #${res.draft_id}.`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed passport validity check"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-[#E5DDD0] space-y-3 bg-[#FAF7F2]/80 p-3.5 rounded-xl">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTool("delay")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
            activeTool === "delay"
              ? "bg-[#2D3E35] text-white"
              : "bg-white text-[#2D3E35] border border-[#E5DDD0]"
          }`}
        >
          <Plane className="w-3 h-3" />
          <span>Flight Delay</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("divert")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
            activeTool === "divert"
              ? "bg-[#2D3E35] text-white"
              : "bg-white text-[#2D3E35] border border-[#E5DDD0]"
          }`}
        >
          <Navigation className="w-3 h-3" />
          <span>FBO Diversion</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("charter")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
            activeTool === "charter"
              ? "bg-[#2D3E35] text-white"
              : "bg-white text-[#2D3E35] border border-[#E5DDD0]"
          }`}
        >
          <Gauge className="w-3 h-3" />
          <span>Jet Charter W&amp;B</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("luggage")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
            activeTool === "luggage"
              ? "bg-[#2D3E35] text-white"
              : "bg-white text-[#2D3E35] border border-[#E5DDD0]"
          }`}
        >
          <Briefcase className="w-3 h-3" />
          <span>Lost Luggage Capsule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("upgrade")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
            activeTool === "upgrade"
              ? "bg-[#2D3E35] text-white"
              : "bg-white text-[#2D3E35] border border-[#E5DDD0]"
          }`}
        >
          <ArrowUpCircle className="w-3 h-3" />
          <span>Suite Upgrade (30/70)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTool("passport")}
          className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer ${
            activeTool === "passport"
              ? "bg-[#2D3E35] text-white"
              : "bg-white text-[#2D3E35] border border-[#E5DDD0]"
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>Passport 180d Gate</span>
        </button>
      </div>

      {/* Tool 1: Flight Delay */}
      {activeTool === "delay" && (
        <form onSubmit={handleRunDelay} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Delay (Mins)</label>
            <input
              type="number"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Revised ETA</label>
            <input
              type="text"
              value={newEta}
              onChange={(e) => setNewEta(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Cause</label>
            <input
              type="text"
              value={delayReason}
              onChange={(e) => setDelayReason(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="py-1.5 px-3 rounded bg-[#2D3E35] text-white font-semibold cursor-pointer"
          >
            {busy ? "Updating..." : "Realign Chauffeur"}
          </button>
        </form>
      )}

      {/* Tool 2: Private Aviation Diversion */}
      {activeTool === "divert" && (
        <form onSubmit={handleRunDivert} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Alternate FBO</label>
            <input
              type="text"
              value={divertedAirport}
              onChange={(e) => setDivertedAirport(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Ground Delay (m)</label>
            <input
              type="number"
              value={divertDelay}
              onChange={(e) => setDivertDelay(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Diversion Weather</label>
            <input
              type="text"
              value={divertReason}
              onChange={(e) => setDivertReason(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="py-1.5 px-3 rounded bg-[#2D3E35] text-white font-semibold cursor-pointer"
          >
            {busy ? "Routing..." : "Dispatch FBO Convoy"}
          </button>
        </form>
      )}

      {/* Tool 3: Private Jet Charter Weight & Balance */}
      {activeTool === "charter" && (
        <form onSubmit={handleRunCharter} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Aircraft</label>
            <input
              type="text"
              value={aircraftType}
              onChange={(e) => setAircraftType(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Tail #</label>
            <input
              type="text"
              value={tailNumber}
              onChange={(e) => setTailNumber(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0] font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Pax</label>
            <input
              type="number"
              value={paxCount}
              onChange={(e) => setPaxCount(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Bags (lbs)</label>
            <input
              type="number"
              value={luggageLbs}
              onChange={(e) => setLuggageLbs(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Crew Duty (h)</label>
            <input
              type="number"
              step="0.5"
              value={pilotDutyHours}
              onChange={(e) => setPilotDutyHours(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="py-1.5 px-3 rounded bg-[#2D3E35] text-white font-semibold cursor-pointer"
          >
            {busy ? "Auditing..." : "Verify Part 135"}
          </button>
        </form>
      )}

      {/* Tool 4: Lost Luggage & Boutique Capsule Wardrobe */}
      {activeTool === "luggage" && (
        <form onSubmit={handleRunLuggage} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">PIR Claim Tag</label>
            <input
              type="text"
              value={bagClaimTag}
              onChange={(e) => setBagClaimTag(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0] font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Top Size</label>
            <input
              type="text"
              value={topSize}
              onChange={(e) => setTopSize(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Bottom Size</label>
            <input
              type="text"
              value={bottomSize}
              onChange={(e) => setBottomSize(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Footwear</label>
            <input
              type="text"
              value={shoeSize}
              onChange={(e) => setShoeSize(e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="py-1.5 px-3 rounded bg-[#2D3E35] text-white font-semibold cursor-pointer"
          >
            {busy ? "Staging..." : "Stage $0 Capsule"}
          </button>
        </form>
      )}

      {/* Tool 5: Suite Tier Upgrade */}
      {activeTool === "upgrade" && (
        <form onSubmit={handleRunUpgrade} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">New Suite Tier</label>
            <input
              type="text"
              value={newSuiteTier}
              onChange={(e) => setNewSuiteTier(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
              Revised Total Stay ($ USD)
            </label>
            <input
              type="number"
              value={newTotalInvestment}
              onChange={(e) => setNewTotalInvestment(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0] font-bold"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="py-1.5 px-3 rounded bg-[#2D3E35] text-white font-semibold cursor-pointer"
          >
            {busy ? "Recalculating..." : "Upgrade & Recalculate 30/70"}
          </button>
        </form>
      )}

      {/* Tool 6: Passport 180-Day Validity Gate */}
      {activeTool === "passport" && (
        <form onSubmit={handleRunPassport} className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Passport #</label>
            <input
              type="text"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0] font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Expiry Date</label>
            <input
              type="date"
              value={passportExpiry}
              onChange={(e) => setPassportExpiry(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Retreat Arrival</label>
            <input
              type="date"
              value={retreatArrival}
              onChange={(e) => setRetreatArrival(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded bg-white border border-[#E5DDD0]"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="py-1.5 px-3 rounded bg-[#2D3E35] text-white font-semibold cursor-pointer"
          >
            {busy ? "Checking..." : "Verify 180d Rule"}
          </button>
        </form>
      )}
    </div>
  );
}

