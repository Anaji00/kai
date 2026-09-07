"use client";

import React, { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import {
  SanctuaryRoute,
  SomaticPointOfInterest,
  GroundTransfer
} from "@/lib/sidecar-api";
import {
  Compass,
  Navigation,
  Sparkles,
  Maximize2,
  RefreshCw,
  Layers
} from "lucide-react";

interface InteractiveSanctuaryMapProps {
  sanctuarySlug: string;
  routes: SanctuaryRoute[];
  selectedRoute?: SanctuaryRoute | null;
  pois: SomaticPointOfInterest[];
  transfers: GroundTransfer[];
  viewMode: "client" | "clinical";
  onSelectRoute?: (route: SanctuaryRoute) => void;
}

// Sanctuary fallback center coordinates
const SANCTUARY_CENTERS: Record<string, [number, number]> = {
  nosara: [9.9806, -85.6667],
  amalfi: [40.6340, 14.6027],
  bali: [-8.5069, 115.2625],
  "riviera-maya": [20.2114, -87.4654],
  riviera_maya: [20.2114, -87.4654]
};

export default function InteractiveSanctuaryMap({
  sanctuarySlug,
  routes,
  selectedRoute,
  pois,
  transfers,
  viewMode,
  onSelectRoute
}: InteractiveSanctuaryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerGroupRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeTileType, setActiveTileType] = useState<"voyager" | "satellite">("voyager");

  const center = SANCTUARY_CENTERS[sanctuarySlug.toLowerCase()] || SANCTUARY_CENTERS.nosara;
  const activeRoute = selectedRoute || (routes.length > 0 ? routes[0] : null);

  // Initialize Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: center,
        zoom: 11,
        zoomControl: true,
        attributionControl: false
      });

      // CartoDB Voyager tiles (warm luxury travel palette)
      const tileUrl =
        activeTileType === "satellite"
          ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

      L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: "abcd"
      }).addTo(map);

      // Attribution
      L.control
        .attribution({ position: "bottomright" })
        .addAttribution(
          activeTileType === "satellite"
            ? '&copy; <a href="https://www.esri.com/">Esri</a>'
            : '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        )
        .addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
      setMapReady(true);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, []);

  // Update Tile Layer if toggled
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Reset base layers
    mapInstanceRef.current.eachLayer((layer: any) => {
      if (layer instanceof L.TileLayer) {
        mapInstanceRef.current.removeLayer(layer);
      }
    });

    const tileUrl =
      activeTileType === "satellite"
        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: "abcd"
    }).addTo(mapInstanceRef.current);
  }, [activeTileType]);

  // Render Markers, Polylines, and Waypoints on Map
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current) return;

    async function drawLayers() {
      const L = (await import("leaflet")).default;
      const layerGroup = layerGroupRef.current;
      layerGroup.clearLayers();

      const allLatLngs: [number, number][] = [];

      // 1. Draw Active Road Route Polyline
      if (activeRoute) {
        const routeCoords: [number, number][] =
          activeRoute.route_geometry && activeRoute.route_geometry.length > 0
            ? (activeRoute.route_geometry as [number, number][])
            : [
                [activeRoute.origin_lat, activeRoute.origin_lon],
                [activeRoute.destination_lat, activeRoute.destination_lon]
              ];

        // Outer glow polyline
        L.polyline(routeCoords, {
          color: "#C07D63",
          weight: 7,
          opacity: 0.45,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(layerGroup);

        // Core driving road line
        const mainPolyline = L.polyline(routeCoords, {
          color: "#2D3E35",
          weight: 4,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(layerGroup);

        mainPolyline.bindPopup(`
          <div style="font-family: serif; padding: 4px;">
            <div style="font-size: 11px; font-weight: bold; color: #C07D63; text-transform: uppercase;">
              Dynamic Road Route
            </div>
            <div style="font-size: 14px; font-weight: bold; color: #2D3E35; margin-top: 2px;">
              ${activeRoute.origin_name} &rarr; ${activeRoute.destination_name}
            </div>
            <div style="font-size: 12px; color: #5C6B5E; margin-top: 4px;">
              <strong>${activeRoute.distance_km} km</strong> &middot; ~${activeRoute.estimated_minutes} peaceful minutes
            </div>
            <div style="font-size: 11px; color: #2D3E35; margin-top: 6px; background: #FAF7F2; padding: 6px; border-radius: 6px; border: 1px solid #E5DDD0;">
              ${activeRoute.recommended_vehicle}
            </div>
          </div>
        `);

        routeCoords.forEach((pt) => allLatLngs.push(pt));

        // 2. Departure Gateway Airport Marker
        const airportIcon = L.divIcon({
          className: "custom-airport-pin",
          html: `
            <div style="
              background: #2D3E35;
              color: #FAF7F2;
              width: 34px;
              height: 34px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.25);
              border: 2.5px solid #FFFFFF;
              font-size: 15px;
            ">
              ✈
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -18]
        });

        L.marker([activeRoute.origin_lat, activeRoute.origin_lon], { icon: airportIcon })
          .bindPopup(`
            <div style="font-family: serif; padding: 2px;">
              <span style="font-size: 10px; font-weight: bold; color: #C07D63; text-transform: uppercase;">Arrival Gateway</span>
              <div style="font-size: 13px; font-weight: bold; color: #2D3E35;">${activeRoute.origin_name}</div>
              <p style="font-size: 11px; color: #5C6B5E; margin-top: 2px;">Private tarmac greeting & luxury chauffeur escort.</p>
            </div>
          `)
          .addTo(layerGroup);

        allLatLngs.push([activeRoute.origin_lat, activeRoute.origin_lon]);

        // 3. Sanctuary Arrival Villa Marker
        const villaIcon = L.divIcon({
          className: "custom-villa-pin",
          html: `
            <div style="
              background: #C07D63;
              color: #FFFFFF;
              width: 38px;
              height: 38px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 14px rgba(192, 125, 99, 0.5);
              border: 3px solid #FFFFFF;
              font-size: 18px;
            ">
              ✦
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19],
          popupAnchor: [0, -20]
        });

        L.marker([activeRoute.destination_lat, activeRoute.destination_lon], { icon: villaIcon })
          .bindPopup(`
            <div style="font-family: serif; padding: 2px;">
              <span style="font-size: 10px; font-weight: bold; color: #C07D63; text-transform: uppercase;">KAI Sanctuary Haven</span>
              <div style="font-size: 14px; font-weight: bold; color: #2D3E35;">${activeRoute.destination_name}</div>
              <p style="font-size: 11px; color: #5C6B5E; margin-top: 2px;">Intimate restorative cohort & private somatic pavilion.</p>
            </div>
          `)
          .addTo(layerGroup);

        allLatLngs.push([activeRoute.destination_lat, activeRoute.destination_lon]);
      }

      // 4. Somatic Nature Waypoint Pins
      pois.forEach((poi) => {
        let pinColor = "#0284c7"; // blue for water
        let pinIconChar = "💧";
        if (poi.category.includes("SUNSET")) {
          pinColor = "#d97706";
          pinIconChar = "🌅";
        } else if (poi.category.includes("FOREST") || poi.category.includes("BOTANICAL")) {
          pinColor = "#059669";
          pinIconChar = "🌿";
        }

        const poiIcon = L.divIcon({
          className: "custom-poi-pin",
          html: `
            <div style="
              background: ${pinColor};
              color: #FFFFFF;
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              border: 2px solid #FFFFFF;
              font-size: 13px;
              cursor: pointer;
            ">
              ${pinIconChar}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -15]
        });

        const marker = L.marker([poi.lat, poi.lon], { icon: poiIcon });
        marker.bindPopup(`
          <div style="font-family: serif; padding: 3px; max-width: 240px;">
            <span style="font-size: 10px; font-weight: bold; color: #C07D63; text-transform: uppercase;">
              ${poi.category.replace(/_/g, " ")}
            </span>
            <div style="font-size: 13px; font-weight: bold; color: #2D3E35; margin-top: 1px;">
              ${poi.name}
            </div>
            <p style="font-size: 11px; color: #5C6B5E; margin-top: 4px; line-height: 1.4;">
              ${poi.description}
            </p>
            <div style="background: #FAF7F2; padding: 6px; border-radius: 6px; border: 1px solid #E5DDD0; margin-top: 6px; font-size: 11px; color: #2D3E35;">
              <strong style="color: #C07D63;">${viewMode === "client" ? "Nervous System Calm" : "Vagal Mechanism"}:</strong>
              <div style="margin-top: 2px;">${poi.vagus_nerve_benefit}</div>
            </div>
            <div style="font-size: 10px; color: #5C6B5E; margin-top: 5px;">
              ⏱ <em>${poi.ideal_visiting_time}</em>
            </div>
          </div>
        `);
        marker.addTo(layerGroup);
        allLatLngs.push([poi.lat, poi.lon]);
      });

      // 5. Active Chauffeur Telemetry Marker
      if (transfers && transfers.length > 0 && activeRoute) {
        const transfer = transfers[0];
        // Position car midway along route
        const carLat = (activeRoute.origin_lat + activeRoute.destination_lat) / 2;
        const carLon = (activeRoute.origin_lon + activeRoute.destination_lon) / 2;

        const chauffeurIcon = L.divIcon({
          className: "custom-car-pin",
          html: `
            <div style="
              background: #047857;
              color: #FFFFFF;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(4, 120, 87, 0.4);
              border: 2px solid #FFFFFF;
              font-size: 14px;
            ">
              🚘
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        L.marker([carLat, carLon], { icon: chauffeurIcon })
          .bindPopup(`
            <div style="font-family: serif; padding: 2px;">
              <span style="font-size: 10px; font-weight: bold; color: #047857; text-transform: uppercase;">
                ${transfer.status.replace(/_/g, " ")}
              </span>
              <div style="font-size: 13px; font-weight: bold; color: #2D3E35;">
                Chauffeur: ${transfer.chauffeur_name}
              </div>
              <div style="font-size: 11px; color: #5C6B5E; margin-top: 2px;">
                ${transfer.vehicle_type} &middot; Guest: ${transfer.guest_name}
              </div>
            </div>
          `)
          .addTo(layerGroup);
      }

      // Smoothly fit bounds
      if (allLatLngs.length > 0) {
        const bounds = L.latLngBounds(allLatLngs);
        mapInstanceRef.current.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
          animate: true
        });
      }
    }

    drawLayers();
  }, [activeRoute, pois, transfers, viewMode]);

  const handleResetCenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, 11, { animate: true });
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#E5DDD0] shadow-sm bg-[#FAF7F2]">
      {/* Map Control Toolbar */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#E5DDD0] shadow-md text-xs font-semibold text-[#2D3E35]">
        <span className="p-1 rounded bg-[#2D3E35] text-[#FAF7F2]">
          <Compass className="w-3.5 h-3.5 text-[#C07D63]" />
        </span>
        <span className="capitalize">{sanctuarySlug.replace("-", " ")} Travel Map</span>
        {activeRoute && (
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E5DDD0] text-[#5C6B5E]">
            {activeRoute.distance_km} km &middot; ~{activeRoute.estimated_minutes}m
          </span>
        )}
      </div>

      {/* Layer / Tile Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-[#E5DDD0] shadow-md text-xs">
        <button
          onClick={() => setActiveTileType("voyager")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTileType === "voyager"
              ? "bg-[#2D3E35] text-white shadow-2xs"
              : "text-[#5C6B5E] hover:text-[#2D3E35]"
          }`}
          title="Warm Paper CartoDB Map"
        >
          Parchment
        </button>
        <button
          onClick={() => setActiveTileType("satellite")}
          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeTileType === "satellite"
              ? "bg-[#2D3E35] text-white shadow-2xs"
              : "text-[#5C6B5E] hover:text-[#2D3E35]"
          }`}
          title="Satellite Imagery"
        >
          Satellite
        </button>
        <button
          onClick={handleResetCenter}
          className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#FAF7F2] rounded-lg transition-colors"
          title="Reset Sanctuary View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        className="w-full h-[380px] sm:h-[440px] z-10"
        style={{ background: "#FAF7F2" }}
      />

      {/* Bottom Map Legend */}
      <div className="px-4 py-2.5 bg-white/95 backdrop-blur-sm border-t border-[#E5DDD0] flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#5C6B5E]">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2D3E35]" />
            <span>Gateway Airport</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C07D63]" />
            <span>Sanctuary Villa</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-1 rounded-full bg-[#2D3E35]" />
            <span>Official Road Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
            <span>Waterfall / Springs</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d97706]" />
            <span>Sunset Bluff</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#047857]" />
            <span>Live Chauffeur Transfer</span>
          </div>
        </div>
        <div className="text-[10px] text-[#5C6B5E]">
          Powered by OpenStreetMap &amp; OSRM Road Geometry
        </div>
      </div>
    </div>
  );
}
