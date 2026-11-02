"use client";
import React, { useState, useEffect, useCallback } from "react";
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
  Shirt,
  Briefcase,
  Thermometer,
  Calendar,
  Copy,
  Check,
  Waves,
  Compass,
  Plus,
} from "lucide-react";
import {
  WeatherForecast,
  HistoricalWeatherResponse,
  fetchSanctuaryWeather,
  fetchHistoricalWeatherPatterns,
} from "@/lib/sidecar-api";
import { RETREATS } from "@/lib/retreats";

interface MicroclimateWeatherTabProps {
  sanctuarySlug: string;
  onSelectSanctuary?: (slug: string) => void;
}

type TempUnit = "F" | "C";
type DailySlotKey = "morning" | "midday" | "sunset" | "evening";

const PRESET_DATE_WINDOWS: Array<{
  slug: string;
  label: string;
  datesLabel: string;
  startMd: string;
  endMd: string;
  badge: string;
}> = [
    {
      slug: "puerto-vallarta",
      label: "Puerto Vallarta (Marival Harmony / Armony)",
      datesLabel: "Jan 28 – Jan 31, 2027",
      startMd: "01-28",
      endMd: "01-31",
      badge: "First Retreat of 2027",
    },
    {
      slug: "nosara",
      label: "Nosara, Costa Rica",
      datesLabel: "Feb 18 – Feb 24, 2027",
      startMd: "02-18",
      endMd: "02-24",
      badge: "Coming Soon",
    },
    {
      slug: "amalfi",
      label: "Amalfi Coast, Italy",
      datesLabel: "May 12 – May 18, 2027",
      startMd: "05-12",
      endMd: "05-18",
      badge: "Coming Soon",
    },
    {
      slug: "bali",
      label: "Ubud & Sidemen, Bali",
      datesLabel: "Sep 15 – Sep 21, 2027",
      startMd: "09-15",
      endMd: "09-21",
      badge: "Coming Soon",
    },
    {
      slug: "riviera-maya",
      label: "Riviera Maya, Mexico",
      datesLabel: "Nov 12 – Nov 16, 2026",
      startMd: "11-12",
      endMd: "11-16",
      badge: "Coming Soon",
    },
  ];

export default function MicroclimateWeatherTab({
  sanctuarySlug,
  onSelectSanctuary,
}: MicroclimateWeatherTabProps) {
  const [activeSlug, setActiveSlug] = useState<string>(sanctuarySlug || "puerto-vallarta");
  const [unit, setUnit] = useState<TempUnit>("F");
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [historical, setHistorical] = useState<HistoricalWeatherResponse | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | "30YR">("30YR");
  const [selectedSlot, setSelectedSlot] = useState<DailySlotKey>("morning");
  const [customStartMd, setCustomStartMd] = useState<string>("01-28");
  const [customEndMd, setCustomEndMd] = useState<string>("01-31");
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [customPackInput, setCustomPackInput] = useState("");
  const [extraPackItems, setExtraPackItems] = useState<string[]>([]);
  const [copiedPacking, setCopiedPacking] = useState(false);

  // Sync when parent sanctuarySlug changes
  useEffect(() => {
    if (sanctuarySlug) {
      const normalized = sanctuarySlug.toLowerCase().replace("_", "-");
      setActiveSlug(normalized);
      const preset = PRESET_DATE_WINDOWS.find((p) => normalized.includes(p.slug));
      if (preset) {
        setCustomStartMd(preset.startMd);
        setCustomEndMd(preset.endMd);
      }
    }
  }, [sanctuarySlug]);

  const loadWeatherAndHistory = useCallback(
    async (slugToLoad: string, sMd?: string, eMd?: string, showSpinner: boolean = false) => {
      if (showSpinner) {
        setLoading(true);
      }
      try {
        const [liveData, histData] = await Promise.all([
          fetchSanctuaryWeather(slugToLoad),
          fetchHistoricalWeatherPatterns(slugToLoad, sMd, eMd),
        ]);
        setWeather(liveData);
        setHistorical(histData);
      } catch (e) {
        console.error("Failed to fetch weather & historical patterns:", e);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const preset = PRESET_DATE_WINDOWS.find((p) => activeSlug.includes(p.slug));
    const sMd = preset?.startMd || customStartMd;
    const eMd = preset?.endMd || customEndMd;
    loadWeatherAndHistory(activeSlug, sMd, eMd, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlug, loadWeatherAndHistory]);

  // Match retreat profile from RETREATS
  const normalizedSlug = activeSlug.toLowerCase().replace("_", "-");
  const matchedRetreat =
    RETREATS.find(
      (r) =>
        r.id.includes(normalizedSlug) ||
        r.slug.includes(normalizedSlug) ||
        normalizedSlug.includes(r.id.split("-")[0])
    ) || RETREATS[0];

  const wp = matchedRetreat.weatherProfile;

  const formatTemp = (tempC: number) => {
    if (unit === "F") {
      return `${Math.round((tempC * 9) / 5 + 32)}°F`;
    }
    return `${Math.round(tempC * 10) / 10}°C`;
  };

  const allPackingItems = [...(wp?.whatToPack || []), ...extraPackItems];
  const checkedCount = allPackingItems.filter((item) => checkedItems[item]).length;

  const togglePackItem = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleAddPackItem = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customPackInput.trim();
    if (!trimmed) return;
    if (!extraPackItems.includes(trimmed)) {
      setExtraPackItems((prev) => [...prev, trimmed]);
      setCheckedItems((prev) => ({ ...prev, [trimmed]: true }));
    }
    setCustomPackInput("");
  };

  const handleCopyPackingGuide = () => {
    if (!wp) return;
    const lines = [
      `KAI WELLNESS RETREATS — WEATHER & PACKING GUIDE`,
      `Sanctuary: ${matchedRetreat.destination} (${matchedRetreat.locationDetails})`,
      `Target Dates: ${wp.targetWindow}`,
      `Climate: ${wp.climateClassification} | Avg High ${wp.avgHighF}°F (${wp.avgHighC}°C) / Low ${wp.avgLowF}°F (${wp.avgLowC}°C) | Ocean ${wp.oceanTempF}°F`,
      ``,
      `WHAT TO WEAR BY DAILY RHYTHM:`,
      `• Morning Practice: ${wp.whatToWear.morningPractice}`,
      `• Daytime Excursion: ${wp.whatToWear.daytimeExcursion}`,
      `• Evening Sound Bath & Dining: ${wp.whatToWear.eveningDining}`,
      ``,
      `WHAT TO PACK CHECKLIST:`,
      ...allPackingItems.map((i) => `[${checkedItems[i] ? "x" : " "}] ${i}`),
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
    setCopiedPacking(true);
    setTimeout(() => setCopiedPacking(false), 2500);
  };

  // Interactive Time-of-Day Simulator Data
  const baseHighC = historical?.climatology_30yr.avg_high_c ?? wp?.avgHighC ?? 27.2;
  const baseLowC = historical?.climatology_30yr.avg_low_c ?? wp?.avgLowC ?? 18.9;
  const baseHumidity = historical?.climatology_30yr.avg_humidity ?? weather?.humidity ?? 64;
  const dailySlots: Record<
    DailySlotKey,
    {
      label: string;
      timeRange: string;
      tempC: number;
      humidity: number;
      uv: string;
      breeze: string;
      whatToWear: string;
      somaticNote: string;
    }
  > = {
    morning: {
      label: "Morning Prana & Mobility",
      timeRange: "6:30 AM – 9:30 AM",
      tempC: Math.round((baseLowC + 2.2) * 10) / 10,
      humidity: baseHumidity + 6,
      uv: "Low–Moderate (UV 2–4)",
      breeze: "Crisp Sierra Madre & Coastal Dew Breeze (10 km/h)",
      whatToWear:
        wp?.whatToWear.morningPractice ||
        "Breathable moisture-wicking yoga set with a light organic cotton wrap for dawn meditation.",
      somaticNote:
        "Kareena (BSN, RN): Cool morning marine air maximizes negative ion uptake during 4-7-8 vagal breathwork. Armaan (Ironman): Ideal low-thermal-stress window for coastal endurance runs or ocean mobility.",
    },
    midday: {
      label: "Daytime Cultural & Coastal Excursion",
      timeRange: "11:30 AM – 3:30 PM",
      tempC: baseHighC,
      humidity: baseHumidity,
      uv: `High Radiance (UV ${wp?.uvIndex ?? "8"})`,
      breeze: "Onshore Pacific Trade Breeze (16 km/h)",
      whatToWear:
        wp?.whatToWear.daytimeExcursion ||
        "UPF 50+ linen overshirt, polarized sunglasses, reef-safe mineral swimwear, and woven walking sandals.",
      somaticNote:
        "Kareena (BSN, RN): Peak sunshine hours support natural serotonin & circadian anchoring—pair outdoor boat or artisan walks with trace-mineral electrolyte hydration.",
    },
    sunset: {
      label: "Golden Hour 432Hz Sound Bath",
      timeRange: "5:00 PM – 6:30 PM",
      tempC: Math.round((baseHighC - 2.8) * 10) / 10,
      humidity: baseHumidity + 2,
      uv: "Gentle Golden Light (UV 1–2)",
      breeze: "Calm Twilight Thermal Shift (11 km/h)",
      whatToWear:
        "Relaxed linen lounge set with a soft cashmere or woven cotton shawl as your body cools during deep parasympathetic stillness.",
      somaticNote:
        "Kareena (BSN, RN): Core body temperature naturally drops 0.5°C during 432Hz crystal bowl immersion—having a light wrap keeps muscles warm and vagal tone high.",
    },
    evening: {
      label: "Starlight Farm-to-Table Dining",
      timeRange: "7:30 PM – 10:00 PM",
      tempC: Math.round((baseLowC + 1.0) * 10) / 10,
      humidity: baseHumidity + 4,
      uv: "Zero UV (Starlight Canopy)",
      breeze: "Balmy Evening Ocean Air (9 km/h)",
      whatToWear:
        wp?.whatToWear.eveningDining ||
        "Elevated resort linen trousers or maxi dress with a light knit layer for open-air coastal dining.",
      somaticNote:
        "Kareena & Armaan: Mild evening coastal temperatures (66°F–70°F) transition seamlessly into deep delta-wave sleep without heavy air-conditioning.",
    },
  };

  const activeSlot = dailySlots[selectedSlot];
  const activeYearRecord =
    selectedYear === "30YR"
      ? historical?.historical_years?.[0]
      : historical?.historical_years?.find((y) => y.year === selectedYear) ||
      historical?.historical_years?.[0];

  return (
    <div className="space-y-6">
      {/* 1. Top Interactive Bar: Destination / Date Presets + °F/°C Toggle + Refresh */}
      <div className="bg-white p-5 rounded-2xl border border-[#E5DDD0] shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-md bg-amber-500/10 text-amber-700">
                <Sun className="w-4 h-4" />
              </span>
              <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
                Interactive Historical Weather Patterns, Live APIs &amp; Packing Intelligence
              </h2>
            </div>
            <p className="text-xs text-[#5C6B5E] mt-1">
              Powered by <strong className="text-[#2D3E35]">Open-Meteo Live Forecast API</strong>,{" "}
              <strong className="text-[#2D3E35]">ERA5 Historical Archive API</strong>, and{" "}
              <strong className="text-[#2D3E35]">30-Year NOAA/ECMWF Climatology</strong> for our exact retreat dates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* °F / °C Interactive Unit Toggle */}
            <div className="inline-flex rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] p-0.5">
              <button
                type="button"
                onClick={() => setUnit("F")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unit === "F"
                    ? "bg-[#2D3E35] text-[#FAF7F2] shadow-2xs"
                    : "text-[#5C6B5E] hover:text-[#2D3E35]"
                  }`}
              >
                °F (Fahrenheit)
              </button>
              <button
                type="button"
                onClick={() => setUnit("C")}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${unit === "C"
                    ? "bg-[#2D3E35] text-[#FAF7F2] shadow-2xs"
                    : "text-[#5C6B5E] hover:text-[#2D3E35]"
                  }`}
              >
                °C (Celsius)
              </button>
            </div>

            <button
              type="button"
              onClick={() => loadWeatherAndHistory(activeSlug, customStartMd, customEndMd, true)}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-lg transition-all shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Live APIs</span>
            </button>
          </div>
        </div>

        {/* Quick Destination & Target Retreat Date Selector Pills */}
        <div className="pt-2 border-t border-[#E5DDD0]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#5C6B5E] mb-2 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#C07D63]" />
            <span>1-Click Sanctuary &amp; Target Retreat Dates:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_DATE_WINDOWS.map((preset) => {
              const isSelected = activeSlug.includes(preset.slug);
              return (
                <button
                  key={preset.slug}
                  type="button"
                  onClick={() => {
                    setActiveSlug(preset.slug);
                    setCustomStartMd(preset.startMd);
                    setCustomEndMd(preset.endMd);
                    onSelectSanctuary?.(preset.slug);
                  }}
                  className={`px-3.5 py-2 rounded-xl text-left transition-all border flex items-center gap-2.5 ${isSelected
                      ? "bg-[#2D3E35] text-[#FAF7F2] border-[#2D3E35] shadow-sm"
                      : "bg-[#FAF7F2] text-[#2D3E35] border-[#E5DDD0] hover:bg-[#F2ECE4]"
                    }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      <span>{preset.label}</span>
                      {preset.slug === "puerto-vallarta" && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#C07D63] text-white font-bold">
                          Jan 28–31, 2027
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] ${isSelected ? "text-[#FAF7F2]/80" : "text-[#5C6B5E]"
                        }`}
                    >
                      Target Window: {preset.datesLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Potential Dates Explorer Bar */}
        <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#2D3E35]">
            <Calendar className="w-4 h-4 text-[#C07D63] shrink-0" />
            <span>
              <strong>Test Any Potential Retreat Dates:</strong> Enter a Month-Day window (e.g.{" "}
              <code className="px-1 py-0.5 bg-white rounded border border-[#E5DDD0]">01-28</code> to{" "}
              <code className="px-1 py-0.5 bg-white rounded border border-[#E5DDD0]">01-31</code>) to query 5-year historical ERA5 records:
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customStartMd}
              onChange={(e) => setCustomStartMd(e.target.value)}
              placeholder="MM-DD (01-28)"
              aria-label="Start Month-Day (MM-DD)"
              className="w-24 px-2.5 py-1.5 text-xs font-mono bg-white border border-[#E5DDD0] rounded-lg text-[#2D3E35]"
            />
            <span className="text-xs text-[#5C6B5E]">to</span>
            <input
              type="text"
              value={customEndMd}
              onChange={(e) => setCustomEndMd(e.target.value)}
              placeholder="MM-DD (01-31)"
              aria-label="End Month-Day (MM-DD)"
              className="w-24 px-2.5 py-1.5 text-xs font-mono bg-white border border-[#E5DDD0] rounded-lg text-[#2D3E35]"
            />
            <button
              type="button"
              onClick={() => loadWeatherAndHistory(activeSlug, customStartMd, customEndMd, true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#C07D63] text-white hover:bg-[#a86a52] transition-colors"
            >
              Check Dates
            </button>
          </div>
        </div>
      </div>

      {/* 2. Live Conditions + 30-Year Historical Target Window Summary */}
      {weather && (
        <div className="p-6 rounded-2xl bg-gradient-to-br from-[#FAF7F2] via-white to-[#F2ECE4] border border-[#E5DDD0] shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DDD0] pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#C07D63] uppercase tracking-wider">
                  {matchedRetreat.destination} • {wp?.climateClassification || "Coastal Microclimate"}
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{historical?.data_source || weather.api_source || "Open-Meteo + NOAA Climatology"}</span>
                </span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#2D3E35] mt-1">
                {weather.location_name}
              </h3>
              <div className="text-sm text-[#5C6B5E] mt-0.5 flex items-center space-x-2">
                <CloudSun className="w-4 h-4 text-amber-600" />
                <span>
                  Live Telemetry: {weather.conditions} • Target Retreat Window:{" "}
                  <strong className="text-[#2D3E35]">{wp?.targetWindow}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#5C6B5E]">
                  Live Right Now
                </div>
                <div className="text-4xl font-serif font-bold text-[#2D3E35]">
                  {formatTemp(weather.current_temp_c)}
                </div>
                <div className="text-[11px] text-[#5C6B5E]">
                  Feels like {formatTemp(weather.feels_like_c)}
                </div>
              </div>

              {wp && (
                <div className="pl-5 border-l border-[#E5DDD0] text-right">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#C07D63]">
                    Historical Retreat Avg
                  </div>
                  <div className="text-3xl font-serif font-bold text-[#2D3E35]">
                    {unit === "F"
                      ? `${wp.avgHighF}°F / ${wp.avgLowF}°F`
                      : `${wp.avgHighC}°C / ${wp.avgLowC}°C`}
                  </div>
                  <div className="text-[11px] text-[#5C6B5E]">
                    Ocean: {unit === "F" ? `${wp.oceanTempF}°F` : `${wp.oceanTempC}°C`} •{" "}
                    {wp.rainDays}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4 Key Climate Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Relative Humidity</span>
                <Droplets className="w-4 h-4 text-sky-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                {baseHumidity}%
              </div>
              <div className="text-[11px] text-[#5C6B5E] mt-0.5">
                Live: {weather.humidity}% • Dry-Season Comfort
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Ocean Temperature</span>
                <Waves className="w-4 h-4 text-teal-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                {wp
                  ? unit === "F"
                    ? `${wp.oceanTempF}°F`
                    : `${wp.oceanTempC}°C`
                  : formatTemp(24.4)}
              </div>
              <div className="text-[11px] text-teal-800 font-medium mt-0.5">
                Swimmable without wetsuit
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Sunshine &amp; UV Index</span>
                <Sun className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                UV {weather.uv_index}
              </div>
              <div className="text-[11px] text-amber-800 font-medium mt-0.5">
                9+ hrs golden daily sun
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs">
              <div className="flex items-center justify-between text-[#5C6B5E]">
                <span className="text-xs font-medium">Coastal Breeze</span>
                <Wind className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl font-serif font-bold text-[#2D3E35]">
                {weather.wind_speed_kmh} <span className="text-xs font-normal">km/h</span>
              </div>
              <div className="text-[11px] text-[#5C6B5E] mt-0.5">Gentle afternoon sea breeze</div>
            </div>
          </div>

          {/* 3. INTERACTIVE MULTI-YEAR HISTORICAL WEATHER EXPLORER */}
          {historical && (
            <div className="p-5 rounded-2xl bg-white border border-[#E5DDD0] space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#C07D63]">
                    Interactive Historical Weather Pattern Explorer ({historical.start_md} to{" "}
                    {historical.end_md})
                  </span>
                  <h4 className="font-serif text-base font-bold text-[#2D3E35]">
                    Compare Past 5 Years of Actual Observed Weather vs. 30-Year Climatology
                  </h4>
                </div>

                {/* Year Selector Pills */}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedYear("30YR")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedYear === "30YR"
                        ? "bg-[#2D3E35] text-[#FAF7F2]"
                        : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                      }`}
                  >
                    30-Yr Baseline
                  </button>
                  {historical.historical_years.map((yr) => (
                    <button
                      key={yr.year}
                      type="button"
                      onClick={() => setSelectedYear(yr.year)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${selectedYear === yr.year
                          ? "bg-[#C07D63] text-white shadow-2xs"
                          : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                        }`}
                    >
                      {yr.year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-Year Summary Comparison Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {historical.historical_years.map((yr) => {
                  const isFocused = selectedYear === yr.year;
                  return (
                    <button
                      key={yr.year}
                      type="button"
                      onClick={() => setSelectedYear(yr.year)}
                      className={`p-3 rounded-xl border text-left transition-all ${isFocused
                          ? "bg-[#FAF7F2] border-[#C07D63] ring-1 ring-[#C07D63]"
                          : "bg-[#FAF7F2]/60 border-[#E5DDD0] hover:bg-[#FAF7F2]"
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#2D3E35]">{yr.year} Window</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-800 font-semibold">
                          {yr.total_precip_mm === 0 ? "100% Dry" : `${yr.total_precip_mm}mm`}
                        </span>
                      </div>
                      <div className="mt-1.5 text-sm font-serif font-bold text-[#2D3E35]">
                        {unit === "F"
                          ? `${Math.round(yr.avg_high_f)}° / ${Math.round(yr.avg_low_f)}°F`
                          : `${yr.avg_high_c}° / ${yr.avg_low_c}°C`}
                      </div>
                      <div className="text-[10px] text-[#5C6B5E] mt-0.5">
                        Avg Breeze: {yr.avg_wind_kmh} km/h
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Day-by-Day Breakdown for Selected Year / Baseline */}
              {activeYearRecord && (
                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between text-xs text-[#5C6B5E]">
                    <span>
                      Showing Day-by-Day Retreat Window Pattern (
                      <strong className="text-[#2D3E35]">
                        {selectedYear === "30YR"
                          ? `Typical 30-Year Daily Rhythm (${activeYearRecord.year} Reference)`
                          : `${activeYearRecord.year} Historical Observations`}
                      </strong>
                      ):
                    </span>
                    <span className="text-[11px] font-medium text-[#C07D63]">
                      {historical.climate_model}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {activeYearRecord.days.map((day, idx) => {
                      const barWidthPct = Math.min(
                        100,
                        Math.max(35, Math.round(((day.high_c - 12) / 24) * 100))
                      );
                      return (
                        <div
                          key={day.date}
                          className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#2D3E35]">
                              Day {idx + 1} ({day.date.slice(5)})
                            </span>
                            <Sun className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="flex items-baseline justify-between">
                            <span className="text-lg font-serif font-bold text-[#2D3E35]">
                              {unit === "F" ? `${Math.round(day.high_f)}°F` : `${day.high_c}°C`}{" "}
                              <span className="text-xs font-normal text-[#5C6B5E]">High</span>
                            </span>
                            <span className="text-xs font-medium text-[#5C6B5E]">
                              {unit === "F" ? `${Math.round(day.low_f)}°F` : `${day.low_c}°C`} Low
                            </span>
                          </div>
                          {/* Visual Temperature Range Bar */}
                          <div className="w-full h-2 rounded-full bg-[#E5DDD0] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-[#C07D63]"
                              style={{ width: `${barWidthPct}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-[#5C6B5E] flex items-center justify-between">
                            <span>Rain: {day.precip_mm}mm</span>
                            <span>UV: {day.uv_index}</span>
                            <span>Wind: {day.wind_kmh}km/h</span>
                          </div>
                          <div className="text-[11px] text-[#2D3E35] font-medium truncate">
                            {day.condition}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Regional Historical Pattern & Model Notes */}
              {wp && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-2">
                  <div className="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                    <strong className="text-[#2D3E35] block">
                      Climate Profile ({wp.climateClassification}):
                    </strong>
                    <p className="text-[#5C6B5E] leading-relaxed">{wp.climateSummary}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                    <strong className="text-[#2D3E35] block">30-Year Regional Pattern:</strong>
                    <p className="text-[#5C6B5E] leading-relaxed">{wp.historicalPattern}</p>
                  </div>
                  <div className="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1">
                    <strong className="text-[#2D3E35] block">Weather Model Projection:</strong>
                    <p className="text-[#5C6B5E] leading-relaxed">{wp.weatherModelNote}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 4. INTERACTIVE DAILY RHYTHM & "WHAT TO WEAR" SIMULATOR */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5DDD0] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DDD0] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C07D63]">
                  Interactive Time-of-Day Simulator
                </span>
                <h4 className="font-serif text-base font-bold text-[#2D3E35] flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-[#C07D63]" />
                  <span>Click a Time of Day to See Expected Weather &amp; What to Wear</span>
                </h4>
              </div>
              <span className="text-xs text-[#5C6B5E]">
                Tailored for {matchedRetreat.destination}
              </span>
            </div>

            {/* 4 Interactive Time-of-Day Buttons */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {(Object.keys(dailySlots) as DailySlotKey[]).map((slotKey) => {
                const slot = dailySlots[slotKey];
                const isSelected = selectedSlot === slotKey;
                return (
                  <button
                    key={slotKey}
                    type="button"
                    onClick={() => setSelectedSlot(slotKey)}
                    className={`p-3.5 rounded-xl border text-left transition-all ${isSelected
                        ? "bg-[#2D3E35] text-[#FAF7F2] border-[#2D3E35] shadow-sm"
                        : "bg-[#FAF7F2] text-[#2D3E35] border-[#E5DDD0] hover:bg-[#F2ECE4]"
                      }`}
                  >
                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                      {slot.timeRange}
                    </div>
                    <div className="text-xs font-bold mt-0.5">{slot.label}</div>
                    <div className="mt-2 text-lg font-serif font-bold">
                      {formatTemp(slot.tempC)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Time Slot Detail Panel */}
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <div className="font-bold text-[#2D3E35] flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-[#C07D63]" />
                  <span>
                    {activeSlot.label} ({activeSlot.timeRange})
                  </span>
                </div>
                <div className="text-[#5C6B5E] space-y-1">
                  <p>
                    <strong className="text-[#2D3E35]">Expected Temp:</strong>{" "}
                    {formatTemp(activeSlot.tempC)} • Humidity: {activeSlot.humidity}%
                  </p>
                  <p>
                    <strong className="text-[#2D3E35]">UV &amp; Light:</strong> {activeSlot.uv}
                  </p>
                  <p>
                    <strong className="text-[#2D3E35]">Airflow:</strong> {activeSlot.breeze}
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-[#2D3E35] flex items-center gap-1.5">
                  <Shirt className="w-4 h-4 text-[#C07D63]" />
                  <span>What to Wear for This Window</span>
                </div>
                <p className="text-[#2D3E35] leading-relaxed bg-white p-3 rounded-lg border border-[#E5DDD0]">
                  {activeSlot.whatToWear}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-bold text-[#2D3E35] flex items-center gap-1.5">
                  <HeartPulse className="w-4 h-4 text-[#C07D63]" />
                  <span>Founders Clinical &amp; Endurance Note</span>
                </div>
                <p className="text-[#5C6B5E] leading-relaxed bg-white p-3 rounded-lg border border-[#E5DDD0]">
                  {activeSlot.somaticNote}
                </p>
              </div>
            </div>
          </div>

          {/* 5. INTERACTIVE "WHAT TO PACK" CHECKLIST */}
          {wp && (
            <div className="p-5 rounded-2xl bg-white border border-[#E5DDD0] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-3">
                <div>
                  <div className="font-serif text-base font-bold text-[#2D3E35] flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#C07D63]" />
                    <span>Interactive &ldquo;What to Pack&rdquo; Checklist ({matchedRetreat.destination})</span>
                  </div>
                  <p className="text-xs text-[#5C6B5E] mt-0.5">
                    Click items to check them off as you prepare, add custom items, or copy the full climate &amp; packing guide.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#2D3E35] bg-[#FAF7F2] px-3 py-1.5 rounded-lg border border-[#E5DDD0]">
                    {checkedCount} / {allPackingItems.length} Packed
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPackingGuide}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] transition-colors"
                  >
                    {copiedPacking ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Copied Guide!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Packing Guide</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Checklist Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {allPackingItems.map((item, idx) => {
                  const isChecked = !!checkedItems[item];
                  return (
                    <button
                      key={`${item}-${idx}`}
                      type="button"
                      onClick={() => togglePackItem(item)}
                      className={`p-3 rounded-xl border text-left text-xs flex items-start gap-2.5 transition-all ${isChecked
                          ? "bg-emerald-50/70 border-emerald-300 text-[#2D3E35] line-through opacity-80"
                          : "bg-[#FAF7F2] border-[#E5DDD0] text-[#2D3E35] hover:bg-[#F2ECE4]"
                        }`}
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 mt-0.5 ${isChecked ? "text-emerald-600" : "text-[#C07D63]"
                          }`}
                      />
                      <span>{item}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Packing Item */}
              <form onSubmit={handleAddPackItem} className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customPackInput}
                  onChange={(e) => setCustomPackInput(e.target.value)}
                  placeholder="Add a custom packing item for this cohort or guest..."
                  className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-xl text-[#2D3E35]"
                />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#F2ECE4] hover:bg-[#E5DDD0] text-[#2D3E35] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </form>
            </div>
          )}

          {/* Restorative Somatic Windows */}
          <div className="space-y-3 pt-1">
            <h4 className="font-serif text-sm font-bold text-[#2D3E35] flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-[#C07D63]" />
              <span>Nurse-Guided Restorative Windows</span>
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

            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] flex items-start space-x-3 text-xs">
              <Sparkles className="w-5 h-5 text-[#C07D63] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-[#2D3E35]">
                  Founders Kareena Islam, BSN, RN &amp; Armaan Islam &mdash; Somatic &amp; Endurance Climate Guidance:
                </span>
                <p className="text-[#2D3E35] leading-relaxed">
                  {weather.nurse_somatic_guidance}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
