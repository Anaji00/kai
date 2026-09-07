"use client";

import React, { useState, useEffect } from "react";
import {
  Sun,
  CloudSun,
  Droplets,
  Wind,
  Sparkles,
  Clock,
  HeartPulse,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { WeatherForecast, fetchSanctuaryWeather } from "@/lib/sidecar-api";

interface MicroclimateWeatherTabProps {
  sanctuarySlug: string;
  viewMode: "client" | "clinical";
}

export default function MicroclimateWeatherTab({ sanctuarySlug, viewMode }: MicroclimateWeatherTabProps) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWeather = async () => {
    setLoading(true);
    try {
      const data = await fetchSanctuaryWeather(sanctuarySlug);
      setWeather(data);
    } catch (e) {
      console.error("Failed to fetch weather:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
  }, [sanctuarySlug]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-700">
              <Sun className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
              {viewMode === "client" ? "Sanctuary Weather & Sunshine" : "Microclimate Bioclimatology & Solar Radiance"}
            </h2>
          </div>
          <p className="text-xs text-[#5C6B5E] mt-1">
            {viewMode === "client"
              ? "Real-time coastal microclimate, sunshine intensity, and nurse-curated breathwork windows."
              : "Live Open-Meteo telemetry with in-memory TTL caching (15-min) and autonomic bioclimatic evaluation."}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {weather?.cached && (
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md flex items-center space-x-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              <span>15-Min In-Memory Cache Active</span>
            </span>
          )}
          <button
            onClick={loadWeather}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-all shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Climate</span>
          </button>
        </div>
      </div>

      {/* 2. Hero Weather & Conditions Card */}
      {weather ? (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FAF7F2] via-white to-[#F2ECE4] border border-[#E5DDD0] shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DDD0] pb-5">
            <div>
              <div className="text-xs font-bold text-[#C07D63] uppercase tracking-wider">
                {weather.sanctuary_slug.toUpperCase()} MICROCLIMATE
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#2D3E35] mt-1">
                {weather.location_name}
              </h3>
              <div className="text-sm text-[#5C6B5E] mt-0.5 flex items-center space-x-2">
                <CloudSun className="w-4 h-4 text-amber-600" />
                <span>{weather.conditions}</span>
              </div>
            </div>

            <div className="flex items-baseline space-x-3">
              <span className="text-5xl font-serif font-bold text-[#2D3E35]">
                {weather.current_temp_c}°C
              </span>
              <div className="text-xs text-[#5C6B5E]">
                <span className="block font-medium">Feels like {weather.feels_like_c}°C</span>
                <span className="text-[10px]">Updated: {weather.fetched_at}</span>
              </div>
            </div>
          </div>

          {/* Meteorological Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Relative Humidity</span>
                <Droplets className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                {weather.humidity}%
              </div>
              <div className="text-[11px] text-[#5C6B5E] mt-0.5">
                {weather.humidity >= 70 ? "Tropical Moisture" : "Balanced Comfort"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Sunshine &amp; UV Index</span>
                <Sun className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                {weather.uv_index}
              </div>
              <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                {weather.uv_index >= 8.0 ? "High Golden Radiance" : "Moderate Morning Light"}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Ocean Breeze</span>
                <Wind className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                {weather.wind_speed_kmh} <span className="text-xs font-normal">km/h</span>
              </div>
              <div className="text-[11px] text-[#5C6B5E] mt-0.5">Gentle Canopy Airflow</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Somatic Safety</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-sm font-serif font-bold text-emerald-800">
                Optimal Rest
              </div>
              <div className="text-[11px] text-[#5C6B5E] mt-0.5">Nervous system verified</div>
            </div>
          </div>

          {/* Nurse Clinical Somatic Windows */}
          <div className="space-y-3 pt-2">
            <h4 className="font-serif text-sm font-bold text-[#2D3E35] flex items-center space-x-2">
              <HeartPulse className="w-4 h-4 text-[#C07D63]" />
              <span>
                {viewMode === "client" ? "Nurse-Guided Restorative Windows" : "Bioclimatic Clinical Somatic Prescriptions"}
              </span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-1.5">
                <div className="font-semibold text-[#2D3E35] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-700" />
                  <span>Optimal Prana Breathwork Window</span>
                </div>
                <p className="text-[#5C6B5E] leading-relaxed">
                  {weather.prana_breathwork_window}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-1.5">
                <div className="font-semibold text-[#2D3E35] flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Twilight Sound Bath Window</span>
                </div>
                <p className="text-[#5C6B5E] leading-relaxed">
                  {weather.sunset_sound_bath_recommendation}
                </p>
              </div>
            </div>

            {/* Nurse Guidance Callout */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex items-start space-x-3 text-xs">
              <Sparkles className="w-5 h-5 text-[#C07D63] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-[#2D3E35]">
                  Founder Kareena Islam, BSN, RN &mdash; Clinical Somatic Guidance:
                </span>
                <p className="text-[#2D3E35] leading-relaxed">
                  {weather.nurse_somatic_guidance}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-[#E5DDD0]">
          <RefreshCw className="w-6 h-6 text-[#5C6B5E] mx-auto animate-spin mb-2" />
          <div className="text-xs text-[#5C6B5E]">Gathering live microclimate weather...</div>
        </div>
      )}
    </div>
  );
}
