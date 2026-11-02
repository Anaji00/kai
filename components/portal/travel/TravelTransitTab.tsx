"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Compass,
  MapPin,
  Car,
  Navigation,
  Clock,
  Sparkles,
  RefreshCw,
  Droplets,
  Sunset,
  Trees,
  CheckCircle2,
  Send
} from "lucide-react";
import {
  SanctuaryRoute,
  SomaticPointOfInterest,
  GroundTransfer,
  fetchSanctuaryRoutes,
  calculateDynamicRoute,
  fetchPointsOfInterest,
  fetchGroundTransfers,
  simulateGroundTransferWebhook
} from "@/lib/sidecar-api";

// Dynamically import Leaflet Map with SSR disabled
const InteractiveSanctuaryMap = dynamic(
  () => import("./InteractiveSanctuaryMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[380px] rounded-2xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col items-center justify-center text-xs text-[#5C6B5E] space-y-2">
        <RefreshCw className="w-5 h-5 animate-spin text-[#C07D63]" />
        <span>Loading Sanctuary Interactive Road Map...</span>
      </div>
    )
  }
);

interface TravelTransitTabProps {
  sanctuarySlug: string;
}

const DEFAULT_ROUTE_COORDS: Record<string, {
  originName: string;
  originLat: string;
  originLon: string;
  destName: string;
  destLat: string;
  destLon: string;
  terrain: "COASTAL" | "MOUNTAIN" | "JUNGLE";
}> = {
  "puerto-vallarta": {
    originName: "Licenciado Gustavo Díaz Ordaz International Airport (PVR)",
    originLat: "20.6801",
    originLon: "-105.2542",
    destName: "KAI Marival Harmony Sanctuary, Banderas Bay",
    destLat: "20.7356",
    destLon: "-105.3887",
    terrain: "COASTAL",
  },
  "nosara": {
    originName: "Liberia International Airport (LIR)",
    originLat: "10.5933",
    originLon: "-85.5444",
    destName: "KAI Nosara Ocean Sanctuary",
    destLat: "9.9806",
    destLon: "-85.6667",
    terrain: "COASTAL",
  },
  "amalfi": {
    originName: "Naples Capodichino Airport (NAP)",
    originLat: "40.8860",
    originLon: "14.2908",
    destName: "KAI Amalfi Cliffside Sanctuary",
    destLat: "40.6340",
    destLon: "14.6027",
    terrain: "MOUNTAIN",
  },
  "bali": {
    originName: "Ngurah Rai International Airport (DPS)",
    originLat: "-8.7482",
    originLon: "115.1672",
    destName: "KAI Bali Sacred Water Sanctuary, Ubud",
    destLat: "-8.5069",
    destLon: "115.2625",
    terrain: "JUNGLE",
  },
  "riviera-maya": {
    originName: "Cancún International Airport (CUN)",
    originLat: "21.0365",
    originLon: "-86.8770",
    destName: "KAI Riviera Maya Jungle Sanctuary",
    destLat: "20.2114",
    destLon: "-87.4654",
    terrain: "COASTAL",
  },
};

export default function TravelTransitTab({ sanctuarySlug }: TravelTransitTabProps) {
  const [routes, setRoutes] = useState<SanctuaryRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<SanctuaryRoute | null>(null);
  const [pois, setPois] = useState<SomaticPointOfInterest[]>([]);
  const [transfers, setTransfers] = useState<GroundTransfer[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculator Form State
  const [showCalculator, setShowCalculator] = useState(false);
  const [originName, setOriginName] = useState("Licenciado Gustavo Díaz Ordaz International Airport (PVR)");
  const [originLat, setOriginLat] = useState("20.6801");
  const [originLon, setOriginLon] = useState("-105.2542");
  const [destName, setDestName] = useState("KAI Marival Harmony Sanctuary, Banderas Bay");
  const [destLat, setDestLat] = useState("20.7356");
  const [destLon, setDestLon] = useState("-105.3887");
  const [terrain, setTerrain] = useState<"COASTAL" | "MOUNTAIN" | "JUNGLE">("COASTAL");
  const [calculating, setCalculating] = useState(false);
  const [calcSuccess, setCalcSuccess] = useState<string | null>(null);

  // Transfer simulation state
  const [simulatingTransferId, setSimulatingTransferId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Dynamically update default route coordinates to match selected sanctuary
    const normalized = (sanctuarySlug || "puerto-vallarta").toLowerCase().replace("_", "-");
    const matchedKey = Object.keys(DEFAULT_ROUTE_COORDS).find(k => normalized.includes(k)) || "puerto-vallarta";
    const defaults = DEFAULT_ROUTE_COORDS[matchedKey];
    if (defaults) {
      setOriginName(defaults.originName);
      setOriginLat(defaults.originLat);
      setOriginLon(defaults.originLon);
      setDestName(defaults.destName);
      setDestLat(defaults.destLat);
      setDestLon(defaults.destLon);
      setTerrain(defaults.terrain);
    }

    Promise.all([
      fetchSanctuaryRoutes(sanctuarySlug),
      fetchPointsOfInterest(sanctuarySlug),
      fetchGroundTransfers(sanctuarySlug)
    ])
      .then(([rData, pData, tData]) => {
        if (!isMounted) return;
        setRoutes(rData);
        setPois(pData);
        setTransfers(tData);
        if (rData.length > 0) {
          setSelectedRoute(rData[0]);
        }
      })
      .catch((e) => {
        console.error("Failed to load travel transit data:", e);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sanctuarySlug]);

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([
      fetchSanctuaryRoutes(sanctuarySlug),
      fetchPointsOfInterest(sanctuarySlug),
      fetchGroundTransfers(sanctuarySlug)
    ])
      .then(([rData, pData, tData]) => {
        setRoutes(rData);
        setPois(pData);
        setTransfers(tData);
        if (rData.length > 0 && !selectedRoute) {
          setSelectedRoute(rData[0]);
        }
      })
      .finally(() => setLoading(false));
  };

  const handleCalculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    setCalcSuccess(null);
    try {
      const calculated = await calculateDynamicRoute({
        origin_name: originName,
        origin_lat: parseFloat(originLat),
        origin_lon: parseFloat(originLon),
        destination_name: destName,
        destination_lat: parseFloat(destLat),
        destination_lon: parseFloat(destLon),
        sanctuary_slug: sanctuarySlug,
        terrain_type: terrain
      });
      if (calculated) {
        setRoutes(prev => [calculated, ...prev]);
        setSelectedRoute(calculated);
        setCalcSuccess(`Calculated official road route: ${calculated.distance_km} km (~${calculated.estimated_minutes} mins)`);
        setTimeout(() => setCalcSuccess(null), 5000);
      }
    } catch (e) {
      console.error("Error calculating dynamic route:", e);
    } finally {
      setCalculating(false);
    }
  };

  const handleSimulateTransfer = async (transferId: string) => {
    setSimulatingTransferId(transferId);
    try {
      const nextStatus = "ARRIVED_AT_TARMAC";
      await simulateGroundTransferWebhook(transferId, nextStatus, "Chauffeur waiting at aircraft stairs with chilled towels.");
      setTransfers(prev =>
        prev.map(t => (t.id === transferId ? { ...t, status: nextStatus } : t))
      );
    } catch (e) {
      console.error("Failed to simulate transfer webhook:", e);
    } finally {
      setSimulatingTransferId(null);
    }
  };

  const formatPoiIcon = (category: string) => {
    switch (category.toUpperCase()) {
      case "WATERFALL":
      case "SACRED_WATER":
        return <Droplets className="w-4 h-4 text-sky-600" />;
      case "SUNSET_BLUFF":
        return <Sunset className="w-4 h-4 text-amber-600" />;
      case "FOREST_BATHING":
        return <Trees className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#C07D63]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-md bg-[#2D3E35]/10 text-[#2D3E35]">
              <Compass className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2D3E35]">Scenic Travel & Private Chauffeur</h2>
          </div>
          <p className="text-xs text-[#5C6B5E] mt-1">Effortless travel from international runways to your villa door, guided by gentle pacing and private tarmac escorts.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowCalculator(!showCalculator)}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors shadow-2xs"
          >
            <Navigation className="w-3.5 h-3.5 text-[#C07D63]" />
            <span>{showCalculator ? "Hide Route Calculator" : "Calculate Road Route"}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] rounded-md transition-colors"
            title="Refresh routes and chauffeur telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Interactive Map View */}
      <InteractiveSanctuaryMap
        sanctuarySlug={sanctuarySlug}
        routes={routes}
        selectedRoute={selectedRoute}
        pois={pois}
        transfers={transfers}
        
      />
      {showCalculator && (
        <form
          onSubmit={handleCalculateRoute}
          className="p-5 rounded-xl bg-white border border-[#C07D63]/30 shadow-sm space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-2.5">
            <div className="font-serif text-sm font-bold text-[#2D3E35] flex items-center space-x-2">
              <Car className="w-4 h-4 text-[#C07D63]" />
              <span>Dynamic Scenic Route Calculator</span>
            </div>
            <span className="text-[11px] text-[#5C6B5E]">Terrain-Adjusted Travel Times</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-[#2D3E35] flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#C07D63]" />
                <span>Departure Gateway / Airport</span>
              </label>
              <input
                type="text"
                value={originName}
                onChange={e => setOriginName(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                placeholder="e.g. Liberia International Airport (LIR)"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={originLat}
                  onChange={e => setOriginLat(e.target.value)}
                  className="w-1/2 bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2 py-1 text-[11px]"
                  placeholder="Latitude"
                />
                <input
                  type="text"
                  value={originLon}
                  onChange={e => setOriginLon(e.target.value)}
                  className="w-1/2 bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2 py-1 text-[11px]"
                  placeholder="Longitude"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-[#2D3E35] flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sanctuary Arrival Villa</span>
              </label>
              <input
                type="text"
                value={destName}
                onChange={e => setDestName(e.target.value)}
                className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                placeholder="e.g. KAI Nosara Ocean Sanctuary"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={destLat}
                  onChange={e => setDestLat(e.target.value)}
                  className="w-1/2 bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2 py-1 text-[11px]"
                  placeholder="Latitude"
                />
                <input
                  type="text"
                  value={destLon}
                  onChange={e => setDestLon(e.target.value)}
                  className="w-1/2 bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2 py-1 text-[11px]"
                  placeholder="Longitude"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-[#5C6B5E]">Terrain Type:</span>
              <select
                value={terrain}
                onChange={e => setTerrain(e.target.value as "COASTAL" | "MOUNTAIN" | "JUNGLE")}
                className="bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2.5 py-1 text-[#2D3E35] text-xs focus:outline-none"
              >
                <option value="COASTAL">Scenic Coastal Highway (55 km/h)</option>
                <option value="MOUNTAIN">Cliffside Mountain Pass (38 km/h)</option>
                <option value="JUNGLE">Rainforest Canopy Road (26 km/h)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={calculating}
              className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
            >
              {calculating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing Scenic Path...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Calculate Scenic Path</span>
                </>
              )}
            </button>
          </div>

          {calcSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-md flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{calcSuccess}</span>
            </div>
          )}
        </form>
      )}

      {/* 3. Live Private Chauffeur Tarmac Status */}
      {transfers.length > 0 && (
        <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <h3 className="font-serif text-sm font-bold text-[#2D3E35]">Private Chauffeur Arrival Status</h3>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {transfers[0].status.replace(/_/g, " ")}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs bg-white p-3.5 rounded-lg border border-[#E5DDD0]">
            <div>
              <span className="text-[#5C6B5E] block font-medium">Guest &amp; Flight:</span>
              <span className="font-bold text-[#2D3E35] mt-0.5 block">
                {transfers[0].guest_name} &middot; {transfers[0].flight_number || "Private Tarmac Meet"}
              </span>
              <span className="text-[11px] text-[#5C6B5E]">{transfers[0].pickup_location}</span>
            </div>

            <div>
              <span className="text-[#5C6B5E] block font-medium">Private Chauffeur:</span>
              <span className="font-bold text-[#2D3E35] mt-0.5 block">{transfers[0].chauffeur_name}</span>
              <span className="text-[11px] text-[#C07D63] font-medium">{transfers[0].vehicle_type}</span>
            </div>

            <div>
              <span className="text-[#5C6B5E] block font-medium">Chilled In-Cabin Amenities:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {transfers[0].chilled_amenities.map(a => (
                  <span
                    key={a}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleSimulateTransfer(transfers[0].id)}
              disabled={simulatingTransferId === transfers[0].id}
              className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors"
            >
              <Send className="w-3 h-3 text-emerald-700" />
              <span>
                {simulatingTransferId === transfers[0].id ? "Simulating..." : "Simulate Tarmac Webhook Ping"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 4. Scenic Routes List Grid */}
      <div className="space-y-3">
        <h3 className="font-serif text-sm font-bold text-[#2D3E35] uppercase tracking-wider">Curated Scenic Routes</h3>

        {routes.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-[#E5DDD0] text-xs text-[#5C6B5E]">
            No scenic routes found for this sanctuary. Use the calculator above to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map(r => {
              const isSelected = selectedRoute?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`p-4 rounded-xl bg-white border transition-all shadow-2xs space-y-3 cursor-pointer ${isSelected
                      ? "border-[#C07D63] ring-2 ring-[#C07D63]/20 shadow-md"
                      : "border-[#E5DDD0] hover:border-[#C07D63]/50"
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-[#C07D63] uppercase tracking-wider">
                        {r.sanctuary_slug.toUpperCase()} ARRIVAL
                      </div>
                      <div className="font-serif text-base font-bold text-[#2D3E35] mt-0.5">
                        {r.origin_name} &rarr; {r.destination_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#2D3E35] block">{r.distance_km} km</span>
                      <span className="text-[11px] text-emerald-700 font-medium">~{r.estimated_minutes} mins</span>
                    </div>
                  </div>

                  <p className="text-xs text-[#2D3E35] leading-relaxed bg-[#FAF7F2]/60 p-3 rounded-lg border border-[#E5DDD0]/80">
                    {r.scenic_description}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C6B5E] border-t border-[#E5DDD0]/60 pt-2.5">
                    <div className="flex items-center space-x-1.5">
                      <Car className="w-3.5 h-3.5 text-[#2D3E35]" />
                      <span className="font-medium text-[#2D3E35]">{r.recommended_vehicle}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-[#F2ECE4] border border-[#E5DDD0] text-[#2D3E35]">
                      {r.road_conditions}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Somatic Nature Waypoints (Vagus Nerve Restorative Points) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-sm font-bold text-[#2D3E35] uppercase tracking-wider">Tranquil Nature Waypoints</h3>
            <p className="text-xs text-[#5C6B5E]">Secret waterfalls, peaceful sunset bluffs, and sacred springs curated for deep natural relaxation.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-[#F2ECE4] border border-[#E5DDD0] rounded text-[#2D3E35]">
            {pois.length} Curated Waypoints
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pois.map(p => (
            <div
              key={p.id}
              className="p-4 rounded-xl bg-white border border-[#E5DDD0] hover:border-[#2D3E35]/40 transition-colors shadow-2xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 rounded-md bg-[#FAF7F2] border border-[#E5DDD0]">
                    {formatPoiIcon(p.category)}
                  </span>
                  <div className="font-serif text-sm font-bold text-[#2D3E35]">{p.name}</div>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#5C6B5E] px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#E5DDD0]">
                  {p.category.replace(/_/g, " ")}
                </span>
              </div>

              <p className="text-xs text-[#5C6B5E] leading-relaxed">{p.description}</p>

              <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs text-[#2D3E35] space-y-1">
                <div className="font-semibold text-[#C07D63] text-[11px] flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Nervous System Calming Benefit</span>
                </div>
                <p className="text-[11px] text-[#2D3E35] leading-normal">{p.vagus_nerve_benefit}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#5C6B5E] pt-1">
                <span className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{p.ideal_visiting_time}</span>
                </span>
                <span className="font-mono text-[10px] text-[#5C6B5E]">
                  {p.lat.toFixed(4)}, {p.lon.toFixed(4)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
