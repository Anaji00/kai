"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plane,
  MapPin,
  Sun,
  Thermometer,
  Droplets,
  Wind,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Sunrise,
  UtensilsCrossed,
  Brain,
  Leaf,
  Waves,
  Moon,
  Music,
  Star,
  ChevronDown,
  ChevronUp,
  Shield,
  Luggage,
  Heart,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RefreshCw,
  Car,
  Globe,
  AlertCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

// ──── Types ────

interface DailyActivity {
  time: string;
  activity: string;
  icon: string;
}

interface SanctuaryData {
  sanctuary_name: string;
  destination: string;
  country: string;
  dates: string;
  duration: string;
  gateway_airport: string;
  gateway_airport_name: string;
  transfer_vehicle: string;
  transfer_duration: string;
  villa_name: string;
  check_in_time: string;
  check_out_time: string;
  emergency_clinic: string;
  local_currency: string;
  hero_image: string;
  daily_schedule: DailyActivity[];
  packing_essentials: string[];
}

interface WeatherData {
  temperature_celsius: number;
  humidity_percent: number;
  uv_index: number;
  condition: string;
  prana_breathwork_window?: string;
  sunset_sound_bath_window?: string;
  nurse_somatic_guidance?: string;
}

interface ChauffeurData {
  vehicle: string;
  transfer_duration: string;
  gateway_airport: string;
  gateway_airport_name: string;
  meeting_point: string;
  contact_note: string;
}

interface FlightData {
  departure_airport: string;
  cabin_class: string;
  preferred_airline: string;
  special_requests: string;
  status: string;
}

interface GuestPortalData {
  guest_name: string;
  sanctuary: SanctuaryData;
  room_tier: string;
  weather: WeatherData;
  chauffeur: ChauffeurData;
  flight: FlightData | null;
  packing_list: string[];
  daily_schedule: DailyActivity[];
  wellness_focus: string;
  wellness_intention: string;
  emergency_clinic: string;
  local_currency: string;
}

// ──── Icon Map ────

function getActivityIcon(icon: string) {
  const iconMap: Record<string, React.ReactNode> = {
    sunrise: <Sunrise className="h-4 w-4" />,
    utensils: <UtensilsCrossed className="h-4 w-4" />,
    yoga: <Heart className="h-4 w-4" />,
    brain: <Brain className="h-4 w-4" />,
    leaf: <Leaf className="h-4 w-4" />,
    waves: <Waves className="h-4 w-4" />,
    moon: <Moon className="h-4 w-4" />,
    music: <Music className="h-4 w-4" />,
    star: <Star className="h-4 w-4" />,
  };
  return iconMap[icon] || <Circle className="h-4 w-4" />;
}

// ──── Solfeggio Sound Engine ────

function useSolfeggioPlayer() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [frequency, setFrequency] = useState<432 | 528>(432);

  const start = useCallback((freq: 432 | 528) => {
    stop();
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 2.0);
    gain.connect(ctx.destination);
    gainRef.current = gain;

    const fundamentals = freq === 432 ? [432, 216, 108] : [528, 264, 132];
    fundamentals.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(gain);
      osc.start();
      oscillatorsRef.current.push(osc);
    });
    setFrequency(freq);
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    if (gainRef.current && audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      gainRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.0);
      setTimeout(() => {
        oscillatorsRef.current.forEach((o) => {
          try { o.stop(); o.disconnect(); } catch { /* noop */ }
        });
        oscillatorsRef.current = [];
        if (audioCtxRef.current?.state !== "closed") audioCtxRef.current?.close();
        setIsPlaying(false);
      }, 1100);
    } else {
      setIsPlaying(false);
    }
  }, []);

  return { isPlaying, frequency, start, stop };
}

// ──── 4-7-8 Breathing Engine ────

function useBreathingCycle() {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [secondsLeft, setSecondsLeft] = useState(4);
  const [active, setActive] = useState(false);
  const [cycles, setCycles] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;
        if (phase === "inhale") { setPhase("hold"); return 7; }
        if (phase === "hold") { setPhase("exhale"); return 8; }
        setPhase("inhale");
        setCycles((c) => c + 1);
        return 4;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [active, phase]);

  const reset = () => {
    setActive(false);
    setPhase("inhale");
    setSecondsLeft(4);
    setCycles(0);
  };

  return { phase, secondsLeft, active, cycles, setActive, reset };
}

// ──── Main Page Component ────

function MyRetreatContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [data, setData] = useState<GuestPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [packingChecked, setPackingChecked] = useState<Set<number>>(new Set());
  const [scheduleExpanded, setScheduleExpanded] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Sound & Breath
  const sound = useSolfeggioPlayer();
  const breath = useBreathingCycle();

  const loadDemoToken = async () => {
    setLoadingDemo(true);
    setError(null);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/v1/sidecar/guest-portal/demo-token`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Backend unavailable");
      const json = await res.json();
      if (json.token) {
        window.location.href = `/my-retreat?token=${encodeURIComponent(json.token)}`;
      }
    } catch {
      setError("Unable to launch the demo companion. Sign in to the founder portal first, then try again.");
      setLoadingDemo(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("No access token provided. Please use your magic link to access your sanctuary companion.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL || "";
        const res = await fetch(`${backendUrl}/api/v1/sidecar/guest-portal/me?token=${encodeURIComponent(token)}`);
        if (!res.ok) {
          if (res.status === 401) {
            setError("This magic link has expired. Please contact your KAI concierge for a new link.");
          } else {
            setError("Unable to load your retreat companion. Please try again later.");
          }
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Connection error. Please check your internet and try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const togglePacking = (idx: number) => {
    setPackingChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  // ──── Loading State ────
  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-6"
        >
          <Loader2 className="h-10 w-10 text-terracotta" />
        </motion.div>
        <p className="text-sm text-sage/70 tracking-wider uppercase">Preparing your sanctuary companion…</p>
      </div>
    );
  }

  // ──── Error / Token Missing ────
  if (error || !data) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-terracotta-soft border border-terracotta/30">
            <AlertCircle className="h-7 w-7 text-terracotta" />
          </div>
          <div className="space-y-2">
            <h1 className="font-serif text-3xl text-sage">Private Sanctuary Hub</h1>
            <p className="text-sm text-sage/70 leading-relaxed">{error || "Unable to load your retreat data."}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={loadDemoToken}
              disabled={loadingDemo}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-terracotta px-6 py-3 text-xs uppercase tracking-widest text-linen font-medium hover:bg-terracotta/90 transition-all shadow-sm"
            >
              {loadingDemo ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Hub…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Explore Demo Companion
                </>
              )}
            </button>
            <a
              href="mailto:concierge@kaiwellnessretreats.com?subject=Guest%20Portal%20Access"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-sand-border/90 bg-sand/50 px-6 py-3 text-xs uppercase tracking-widest text-sage font-medium hover:bg-sand transition-all"
            >
              Contact Concierge
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { sanctuary, weather, chauffeur, flight } = data;
  const sections = [
    { id: "overview", label: "Overview", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "schedule", label: "Schedule", icon: <Calendar className="h-3.5 w-3.5" /> },
    { id: "flight", label: "Travel", icon: <Plane className="h-3.5 w-3.5" /> },
    { id: "packing", label: "Packing", icon: <Luggage className="h-3.5 w-3.5" /> },
    { id: "breathwork", label: "Breathwork", icon: <Wind className="h-3.5 w-3.5" /> },
    { id: "sound", label: "Sound Bath", icon: <Music className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="min-h-screen bg-linen">
      {/* ───── Hero Banner ───── */}
      <section className="relative h-[50vh] min-h-[340px] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${sanctuary.hero_image})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/90 via-sage-dark/40 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-end px-6 pb-8 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-terracotta-light font-semibold mb-2">
              Your Sanctuary Companion
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl text-linen font-light leading-tight mb-1">
              Welcome, {data.guest_name.split(" ")[0]}
            </h1>
            <p className="text-sm text-linen/80 font-light">
              {sanctuary.sanctuary_name} · {sanctuary.destination}, {sanctuary.country}
            </p>
            <p className="text-xs text-linen/60 mt-1">
              {sanctuary.dates} · {sanctuary.duration}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ───── Navigation Pills ───── */}
      <div className="sticky top-[60px] z-30 bg-linen/95 backdrop-blur-md border-b border-sand-border/60">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-[11px] font-medium uppercase tracking-wider transition-all ${
                activeSection === s.id
                  ? "bg-sage text-linen shadow-sm"
                  : "bg-sand/60 text-sage/70 hover:bg-sand hover:text-sage"
              }`}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ═══════════ OVERVIEW ═══════════ */}
        <AnimatePresence mode="wait">
          {activeSection === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              {/* Weather Card */}
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">Live Sanctuary Weather</h2>
                  <span className="text-[10px] uppercase tracking-wider text-olive bg-olive-soft px-2.5 py-1 rounded-full">
                    {sanctuary.destination}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sand/50">
                    <Thermometer className="h-5 w-5 text-terracotta" />
                    <span className="font-serif text-2xl text-sage">{weather.temperature_celsius}°</span>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider">Celsius</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sand/50">
                    <Droplets className="h-5 w-5 text-olive" />
                    <span className="font-serif text-2xl text-sage">{weather.humidity_percent}%</span>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider">Humidity</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-sand/50">
                    <Sun className="h-5 w-5 text-terracotta-light" />
                    <span className="font-serif text-2xl text-sage">{weather.uv_index}</span>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider">UV Index</span>
                  </div>
                </div>
                <p className="text-xs text-sage/70 leading-relaxed italic">{weather.condition}</p>
                {weather.nurse_somatic_guidance && (
                  <div className="bg-olive-soft/50 rounded-xl p-3.5 border border-olive/10">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-olive font-semibold block mb-1">
                      Nurse Kareena's Guidance
                    </span>
                    <p className="text-xs text-sage/80 leading-relaxed">{weather.nurse_somatic_guidance}</p>
                  </div>
                )}
              </div>

              {/* Wellness Focus */}
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">Your Wellness Intention</h2>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta-soft">
                    <Heart className="h-4 w-4 text-terracotta" />
                  </div>
                  <div>
                    <p className="text-sm text-sage font-medium">{data.wellness_focus}</p>
                    <p className="text-xs text-sage/60 mt-1 leading-relaxed">{data.wellness_intention}</p>
                  </div>
                </div>
              </div>

              {/* Villa & Room */}
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">Your Sanctuary</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Villa</span>
                    <p className="text-sm text-sage font-medium">{sanctuary.villa_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Room Tier</span>
                    <p className="text-sm text-sage font-medium">{data.room_tier}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Check-in</span>
                    <p className="text-sm text-sage">{sanctuary.check_in_time}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Check-out</span>
                    <p className="text-sm text-sage">{sanctuary.check_out_time}</p>
                  </div>
                </div>
              </div>

              {/* Emergency & Currency Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card rounded-2xl p-4 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-olive mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider block">Emergency Clinic</span>
                    <p className="text-xs text-sage mt-0.5">{data.emergency_clinic}</p>
                  </div>
                </div>
                <div className="glass-card rounded-2xl p-4 flex items-start gap-3">
                  <Globe className="h-5 w-5 text-olive mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider block">Local Currency</span>
                    <p className="text-xs text-sage mt-0.5">{data.local_currency}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ DAILY SCHEDULE ═══════════ */}
          {activeSection === "schedule" && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">
                    Daily Somatic Schedule
                  </h2>
                  <button
                    onClick={() => setScheduleExpanded(!scheduleExpanded)}
                    className="text-xs text-sage/60 hover:text-sage flex items-center gap-1 transition-colors"
                  >
                    {scheduleExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <AnimatePresence>
                  {scheduleExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-1 overflow-hidden"
                    >
                      {data.daily_schedule.map((item, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-sand/40 transition-colors group"
                        >
                          {/* Time */}
                          <span className="text-xs font-mono text-sage/50 w-16 shrink-0 tabular-nums">
                            {item.time}
                          </span>

                          {/* Timeline dot */}
                          <div className="relative flex flex-col items-center">
                            <div className="h-8 w-8 rounded-full bg-olive-soft flex items-center justify-center text-olive group-hover:bg-olive group-hover:text-linen transition-colors">
                              {getActivityIcon(item.icon)}
                            </div>
                            {idx < data.daily_schedule.length - 1 && (
                              <div className="absolute top-8 w-px h-4 bg-sand-border" />
                            )}
                          </div>

                          {/* Activity */}
                          <p className="text-sm text-sage font-light">{item.activity}</p>
                        </motion.div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Breathwork Window */}
              {weather.prana_breathwork_window && (
                <div className="glass-card rounded-2xl p-4 border-l-4 border-terracotta/40">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-terracotta font-semibold block mb-1">
                    Today's Optimal Breathwork Window
                  </span>
                  <p className="text-xs text-sage/80">{weather.prana_breathwork_window}</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ═══════════ TRAVEL & FLIGHT ═══════════ */}
          {activeSection === "flight" && (
            <motion.div
              key="flight"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-5"
            >
              {/* Flight Info */}
              {flight ? (
                <div className="glass-card rounded-2xl p-5 space-y-4">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold flex items-center gap-2">
                    <Plane className="h-4 w-4 text-terracotta" />
                    Your Flight Coordination
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-sage/50 uppercase tracking-wider">Departing From</span>
                      <p className="text-sm text-sage font-medium">{flight.departure_airport || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-sage/50 uppercase tracking-wider">Cabin Class</span>
                      <p className="text-sm text-sage font-medium">{flight.cabin_class}</p>
                    </div>
                    {flight.preferred_airline && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-sage/50 uppercase tracking-wider">Airline</span>
                        <p className="text-sm text-sage font-medium">{flight.preferred_airline}</p>
                      </div>
                    )}
                    {flight.special_requests && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-sage/50 uppercase tracking-wider">Requests</span>
                        <p className="text-sm text-sage">{flight.special_requests}</p>
                      </div>
                    )}
                  </div>
                  <div className="bg-olive-soft/50 rounded-xl p-3.5 border border-olive/10">
                    <p className="text-xs text-sage/80 leading-relaxed italic">{flight.status}</p>
                  </div>
                </div>
              ) : (
                <div className="glass-card rounded-2xl p-5 text-center space-y-3">
                  <Plane className="h-8 w-8 text-sage/30 mx-auto" />
                  <p className="text-sm text-sage/60">No flight details on file yet.</p>
                  <p className="text-xs text-sage/40">Your Grand Travel concierge will coordinate your travel arrangements.</p>
                </div>
              )}

              {/* Chauffeur & Transfer */}
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold flex items-center gap-2">
                  <Car className="h-4 w-4 text-olive" />
                  Airport Chauffeur & Transfer
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Vehicle</span>
                    <p className="text-sm text-sage font-medium">{chauffeur.vehicle}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Transfer Time</span>
                    <p className="text-sm text-sage font-medium">{chauffeur.transfer_duration}</p>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <span className="text-[10px] text-sage/50 uppercase tracking-wider">Arriving At</span>
                    <p className="text-sm text-sage">{chauffeur.gateway_airport_name} ({chauffeur.gateway_airport})</p>
                  </div>
                </div>

                <div className="bg-terracotta-soft/40 rounded-xl p-3.5 border border-terracotta/10 space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-terracotta mt-0.5 shrink-0" />
                    <p className="text-xs text-sage/80 leading-relaxed">{chauffeur.meeting_point}</p>
                  </div>
                  <p className="text-xs text-sage/60 italic pl-5">{chauffeur.contact_note}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ PACKING LIST ═══════════ */}
          {activeSection === "packing" && (
            <motion.div
              key="packing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="glass-card rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">
                    Personalized Packing Checklist
                  </h2>
                  <span className="text-xs text-olive bg-olive-soft px-2.5 py-1 rounded-full">
                    {packingChecked.size}/{data.packing_list.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-sand overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-olive to-sage"
                    animate={{ width: `${(packingChecked.size / data.packing_list.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                <div className="space-y-1">
                  {data.packing_list.map((item, idx) => {
                    const checked = packingChecked.has(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => togglePacking(idx)}
                        className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-all ${
                          checked ? "bg-olive-soft/50" : "hover:bg-sand/40"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                          checked ? "bg-olive border-olive" : "border-sand-border"
                        }`}>
                          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-linen" />}
                        </div>
                        <span className={`text-sm transition-all ${
                          checked ? "text-sage/50 line-through" : "text-sage"
                        }`}>
                          {item}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {packingChecked.size === data.packing_list.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-3 bg-olive-soft/30 rounded-xl"
                  >
                    <p className="text-sm text-olive font-medium">✨ You're all packed for your sanctuary!</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ═══════════ 4-7-8 BREATHWORK ═══════════ */}
          {activeSection === "breathwork" && (
            <motion.div
              key="breathwork"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="glass-card rounded-2xl p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">
                    4-7-8 Vagal Breathing Guide
                  </h2>
                  <p className="text-xs text-sage/60">Clinically grounded breathwork for nervous system calm.</p>
                </div>

                {/* Breathing Circle */}
                <div className="flex flex-col items-center gap-6">
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      animate={{
                        scale: breath.phase === "inhale" ? 1.35 : breath.phase === "hold" ? 1.35 : 0.85,
                      }}
                      transition={{ duration: breath.phase === "inhale" ? 4 : breath.phase === "hold" ? 0.3 : 8, ease: "easeInOut" }}
                      className="h-40 w-40 rounded-full flex items-center justify-center"
                      style={{
                        background: breath.phase === "inhale"
                          ? "radial-gradient(circle, rgba(92,107,94,0.15) 0%, rgba(192,125,99,0.08) 100%)"
                          : breath.phase === "hold"
                            ? "radial-gradient(circle, rgba(192,125,99,0.12) 0%, rgba(92,107,94,0.06) 100%)"
                            : "radial-gradient(circle, rgba(45,62,53,0.08) 0%, rgba(242,236,228,0.3) 100%)",
                      }}
                    >
                      <div className="text-center">
                        <p className="font-serif text-4xl text-sage">{breath.secondsLeft}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-sage/60 mt-1">
                          {breath.phase === "inhale" ? "Breathe In" : breath.phase === "hold" ? "Hold" : "Breathe Out"}
                        </p>
                      </div>
                    </motion.div>

                    {/* Animated ring */}
                    <svg className="absolute inset-0 h-40 w-40" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="76" fill="none" stroke="rgba(229,221,208,0.4)" strokeWidth="2" />
                      <motion.circle
                        cx="80" cy="80" r="76"
                        fill="none"
                        stroke={breath.phase === "inhale" ? "#5C6B5E" : breath.phase === "hold" ? "#C07D63" : "#2D3E35"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={478}
                        animate={{
                          strokeDashoffset: breath.phase === "inhale"
                            ? 478 - (478 * (1 - breath.secondsLeft / 4))
                            : breath.phase === "hold"
                              ? 478 - (478 * (1 - breath.secondsLeft / 7))
                              : 478 - (478 * (1 - breath.secondsLeft / 8)),
                        }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </svg>
                  </div>

                  <p className="text-xs text-sage/50">Completed Cycles: {breath.cycles}</p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => breath.setActive(!breath.active)}
                      className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-xs uppercase tracking-widest font-medium transition-all ${
                        breath.active
                          ? "bg-terracotta text-linen hover:bg-terracotta-light"
                          : "bg-sage text-linen hover:bg-sage-dark"
                      }`}
                    >
                      {breath.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {breath.active ? "Pause" : "Begin"}
                    </button>
                    <button
                      onClick={breath.reset}
                      className="flex items-center gap-2 rounded-full border border-sand-border px-4 py-2.5 text-xs uppercase tracking-widest text-sage/70 hover:text-sage hover:border-sage/30 transition-all"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ SOLFEGGIO SOUND BATH ═══════════ */}
          {activeSection === "sound" && (
            <motion.div
              key="sound"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <div className="glass-card rounded-2xl p-6 space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-xs uppercase tracking-[0.2em] text-sage font-semibold">
                    Solfeggio Sound Immersion
                  </h2>
                  <p className="text-xs text-sage/60">
                    Pure sine-wave tones for deep nervous system restoration.
                    Perfect for your lie-flat flight.
                  </p>
                </div>

                {/* Frequency Selector */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => { if (sound.isPlaying) sound.stop(); sound.start(432); }}
                    className={`flex flex-col items-center gap-2 rounded-2xl px-6 py-4 transition-all border ${
                      sound.isPlaying && sound.frequency === 432
                        ? "bg-sage text-linen border-sage shadow-md"
                        : "bg-sand/60 text-sage border-sand-border hover:border-sage/30"
                    }`}
                  >
                    <span className="font-serif text-2xl font-light">432</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Hz · Deep Calm</span>
                  </button>
                  <button
                    onClick={() => { if (sound.isPlaying) sound.stop(); sound.start(528); }}
                    className={`flex flex-col items-center gap-2 rounded-2xl px-6 py-4 transition-all border ${
                      sound.isPlaying && sound.frequency === 528
                        ? "bg-terracotta text-linen border-terracotta shadow-md"
                        : "bg-sand/60 text-sage border-sand-border hover:border-terracotta/30"
                    }`}
                  >
                    <span className="font-serif text-2xl font-light">528</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Hz · Recovery</span>
                  </button>
                </div>

                {/* Visualizer */}
                {sound.isPlaying && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center gap-1 h-16"
                  >
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 rounded-full"
                        style={{
                          backgroundColor: sound.frequency === 432 ? "#5C6B5E" : "#C07D63",
                        }}
                        animate={{
                          height: [8, 20 + Math.random() * 32, 12, 28 + Math.random() * 20, 8],
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.8 + Math.random() * 1.2,
                          ease: "easeInOut",
                          delay: i * 0.08,
                        }}
                      />
                    ))}
                  </motion.div>
                )}

                {/* Controls */}
                <div className="flex justify-center">
                  {sound.isPlaying ? (
                    <button
                      onClick={sound.stop}
                      className="flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen font-medium hover:bg-sage-dark transition-all"
                    >
                      <VolumeX className="h-4 w-4" />
                      Stop Sound
                    </button>
                  ) : (
                    <p className="text-xs text-sage/50 italic">Tap a frequency above to begin</p>
                  )}
                </div>

                {/* Science note */}
                <div className="bg-sand/50 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sage/50 font-semibold">About Solfeggio Frequencies</p>
                  <p className="text-xs text-sage/60 leading-relaxed">
                    {sound.frequency === 432
                      ? "432Hz is associated with deep parasympathetic activation, promoting melatonin production and circadian rhythm re-alignment. Ideal for pre-sleep wind-down and long-haul travel."
                      : "528Hz is known as the 'Love Frequency' and is associated with cellular repair, DNA healing, and stress reduction. Recommended for morning grounding and post-travel recovery."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ───── Footer ───── */}
      <footer className="border-t border-sand-border/60 py-6 text-center">
        <p className="text-[10px] text-sage/40 uppercase tracking-[0.2em]">
          KAI Wellness Retreats · Grand Travel & Cruise Partnered · Private Guest Companion
        </p>
      </footer>
    </div>
  );
}

export default function MyRetreatPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-linen flex flex-col items-center justify-center px-6">
          <Loader2 className="h-10 w-10 text-terracotta animate-spin mb-4" />
          <p className="text-xs uppercase tracking-widest text-sage/70 font-medium">Preparing your sanctuary companion…</p>
        </div>
      }
    >
      <MyRetreatContent />
    </React.Suspense>
  );
}

