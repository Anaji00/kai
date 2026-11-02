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
  CreditCard,
  Lock,
  Check,
  FileCheck2,
  ExternalLink,
  X,
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

interface ProposalItineraryBlock {
  day?: number;
  time?: string;
  title: string;
  description?: string;
  category?: string;
}

interface ProposalData {
  ref: string;
  trip_id: string;
  guest_name: string;
  guest_email: string;
  title: string;
  sanctuary_slug: string;
  dates: string;
  room_tier: string;
  status: string;
  total_investment: number;
  deposit_amount: number;
  deposit_status: string;
  final_balance: number;
  final_balance_status: string;
  currency: string;
  payment_terms: string;
  itinerary_blocks: ProposalItineraryBlock[];
  smart_flight?: Record<string, unknown>;
  ground_transfer?: Record<string, unknown>;
  created_by?: string;
  created_at?: string;
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

function getCategoryBadge(category?: string) {
  switch (category) {
    case "somatic_wellness":
      return { label: "Somatic Wellness", bg: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "lodging_sanctuary":
      return { label: "Sanctuary Living", bg: "bg-blue-50 text-blue-800 border-blue-200" };
    case "aviation_arrival":
      return { label: "Aviation & VIP Ground", bg: "bg-amber-50 text-amber-800 border-amber-200" };
    case "ground_chauffeur":
      return { label: "Chauffeur Transfer", bg: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "blue_zone_dining":
      return { label: "Blue Zone Culinary", bg: "bg-orange-50 text-orange-800 border-orange-200" };
    case "clinical_screening":
      return { label: "Clinical Protocol", bg: "bg-rose-50 text-rose-800 border-rose-200" };
    default:
      return { label: "Circadian Arc", bg: "bg-sand/70 text-sage border-sand-border" };
  }
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
  const ref = searchParams.get("ref");

  const [data, setData] = useState<GuestPortalData | null>(null);
  const [proposal, setProposal] = useState<ProposalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [packingChecked, setPackingChecked] = useState<Set<number>>(new Set());
  const [scheduleExpanded, setScheduleExpanded] = useState(true);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Proposal Authorization Modal State
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalSuccessRef, setApprovalSuccessRef] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [cardLast4, setCardLast4] = useState("4242");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [eSignature, setESignature] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

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
      setError("Unable to launch the demo companion right now. Please contact concierge@kaiwellnessretreats.com.");
      setLoadingDemo(false);
    }
  };

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL || "";

    // Flow 1: Guest Token provided -> Fetch guest companion
    if (token) {
      const fetchTokenData = async () => {
        try {
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
      fetchTokenData();
      return;
    }

    // Flow 2: Proposal Reference provided -> Fetch proposal details
    if (ref) {
      const fetchProposalData = async () => {
        try {
          const res = await fetch(`${backendUrl}/api/v1/sidecar/guest-portal/proposal?ref=${encodeURIComponent(ref)}`);
          if (!res.ok) {
            setError("We could not locate this sanctuary proposal. Please check your reservation link or contact concierge@kaiwellnessretreats.com.");
            return;
          }
          const json = await res.json();
          if (json.success && json.proposal) {
            setProposal(json.proposal);
            setCardholderName(json.proposal.guest_name || "");
            setESignature(json.proposal.guest_name || "");
          } else {
            setError("Unable to display proposal. Please contact your concierge.");
          }
        } catch {
          setError("Connection error. Please check your internet and try again.");
        } finally {
          setLoading(false);
        }
      };
      fetchProposalData();
      return;
    }

    // Flow 3: No token and no ref -> notify user
    setError("No access token or proposal reference provided. Please use your personal sanctuary link.");
    setLoading(false);
  }, [token, ref]);

  const togglePacking = (idx: number) => {
    setPackingChecked((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleApproveProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setApprovalError("Please check the legal authorization consent box to proceed.");
      return;
    }
    if (!eSignature.trim()) {
      setApprovalError("Please provide your legal electronic signature.");
      return;
    }

    setApproving(true);
    setApprovalError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/v1/sidecar/guest-portal/proposal/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: proposal?.ref,
          cardholder_name: cardholderName,
          billing_postal_code: billingPostalCode || "90210",
          card_last4: cardLast4,
          card_brand: cardBrand,
          e_signature: eSignature,
          agreed_to_terms: true,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.detail || "Unable to authorize deposit. Please contact concierge.");
      }

      setApprovalSuccessRef(json.auth_reference);
      if (proposal) {
        setProposal({
          ...proposal,
          status: "CONFIRMED",
          deposit_status: "PAID",
        });
      }
    } catch (err: unknown) {
      setApprovalError(err instanceof Error ? err.message : "Deposit authorization error.");
    } finally {
      setApproving(false);
    }
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

  // ──── Interactive Sanctuary Proposal View ────
  if (proposal && !data) {
    const isConfirmed = proposal.status === "CONFIRMED" || proposal.deposit_status === "PAID";

    return (
      <div className="min-h-screen bg-linen">
        {/* Proposal Top Bar */}
        <section className="bg-sand/40 border-b border-sand-border/70 py-6 px-6">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.25em] text-terracotta font-semibold block mb-1">
                KAI Wellness Retreats &middot; Grand Travel &amp; Cruise
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl text-sage font-light">
                Private Sanctuary Reservation Proposal
              </h1>
              <p className="text-xs text-sage/70 mt-1">
                Curated for <span className="font-semibold text-sage">{proposal.guest_name}</span> &middot; Reference: <span className="font-mono text-terracotta">{proposal.ref}</span>
              </p>
            </div>

            <div>
              {isConfirmed ? (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Confirmed &amp; Deposit Authorized
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Awaiting Deposit Authorization
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Proposal Body */}
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
          {/* Sanctuary Overview Card */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand-border/60 pb-5">
              <div>
                <h2 className="font-serif text-2xl text-sage">{proposal.title}</h2>
                <p className="text-xs text-sage/70 mt-0.5">{proposal.dates}</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] uppercase tracking-wider text-sage/50 block">Sanctuary Suite Tier</span>
                <span className="text-sm font-semibold text-sage">{proposal.room_tier}</span>
              </div>
            </div>

            {/* Financial Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-sand/50 border border-sand-border/80">
                <span className="text-[10px] uppercase tracking-wider text-sage/60 block">Total Stay Investment</span>
                <span className="font-serif text-2xl text-sage font-medium">${proposal.total_investment.toLocaleString()}</span>
                <span className="text-[10px] text-sage/50 block mt-0.5">{proposal.currency} &middot; All-Inclusive Sanctuary</span>
              </div>

              <div className="p-4 rounded-xl bg-terracotta-soft/50 border border-terracotta/20">
                <span className="text-[10px] uppercase tracking-wider text-terracotta block">30% Suite Retainer Deposit</span>
                <span className="font-serif text-2xl text-terracotta font-medium">${proposal.deposit_amount.toLocaleString()}</span>
                <span className="text-[10px] text-sage/60 block mt-0.5">
                  {isConfirmed ? "Paid & Authorized" : "Due Upon Proposal Approval"}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-sand/50 border border-sand-border/80">
                <span className="text-[10px] uppercase tracking-wider text-sage/60 block">70% Final Balance</span>
                <span className="font-serif text-2xl text-sage font-medium">${proposal.final_balance.toLocaleString()}</span>
                <span className="text-[10px] text-sage/50 block mt-0.5">Scheduled 45 Days Prior</span>
              </div>
            </div>

            <p className="text-xs text-sage/70 leading-relaxed italic border-t border-sand-border/40 pt-4">
              Payment Terms: {proposal.payment_terms}
            </p>
          </div>

          {/* Itinerary Blocks Section */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-sand-border/60 pb-4">
              <div>
                <h3 className="font-serif text-xl text-sage">Curated Daily Itinerary</h3>
                <p className="text-xs text-sage/60">Circadian circadian rhythm optimization &amp; somatic restorativeness</p>
              </div>
              <span className="text-xs text-olive bg-olive-soft px-3 py-1 rounded-full font-medium">
                {proposal.itinerary_blocks.length} Activities
              </span>
            </div>

            <div className="space-y-3">
              {proposal.itinerary_blocks.map((block, idx) => {
                const badge = getCategoryBadge(block.category);
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white/70 border border-sand-border/80 hover:border-terracotta/40 transition-colors space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {block.time && (
                          <span className="text-xs font-mono text-terracotta font-medium bg-terracotta-soft px-2 py-0.5 rounded">
                            {block.time}
                          </span>
                        )}
                        <span className="font-serif text-base text-sage font-medium">{block.title}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                    {block.description && (
                      <p className="text-xs text-sage/70 leading-relaxed">{block.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Host Agency Guarantee & Authorization Action */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 space-y-6 border-l-4 border-l-terracotta">
            <div className="flex items-start gap-3">
              <Shield className="h-6 w-6 text-terracotta shrink-0 mt-1" />
              <div className="space-y-1">
                <h4 className="font-serif text-lg text-sage">Grand Travel &amp; Cruise Host Agency Guarantee</h4>
                <p className="text-xs text-sage/70 leading-relaxed">
                  25-year travel legacy (Funjet 500 Club tier). All authorizations feature automated legal chargeback shielding,
                  PCI-compliant tokenization, and strict adherence to luxury travel consumer protection guidelines.
                </p>
              </div>
            </div>

            {isConfirmed ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <span className="font-semibold text-sm">Sanctuary Reservation Confirmed &amp; Secured</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Your 30% deposit of ${proposal.deposit_amount.toLocaleString()} USD has been successfully authorized
                  {approvalSuccessRef ? ` (Reference: ${approvalSuccessRef})` : ""}.
                  Your luxury suite at {proposal.title} is fully reserved.
                </p>
                <div className="pt-2">
                  <button
                    onClick={loadDemoToken}
                    disabled={loadingDemo}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-linen px-5 py-2.5 text-xs uppercase tracking-wider font-medium transition-all shadow-sm"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Enter Sanctuary Companion Experience
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <button
                  onClick={() => setShowApprovalModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-terracotta hover:bg-terracotta/90 text-linen px-8 py-4 text-xs uppercase tracking-widest font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <CreditCard className="h-4 w-4" />
                  Approve Proposal &amp; Authorize 30% Deposit (${proposal.deposit_amount.toLocaleString()} USD)
                </button>
                <a
                  href="mailto:concierge@kaiwellnessretreats.com?subject=Proposal%20Inquiry"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-sand-border/90 bg-sand/50 hover:bg-sand text-sage px-6 py-4 text-xs uppercase tracking-widest font-medium transition-all text-center"
                >
                  Inquire with Concierge
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ──── Direct Credit Card Authorization Modal / Drawer ──── */}
        <AnimatePresence>
          {showApprovalModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="bg-linen text-sage w-full max-w-lg rounded-2xl border border-sand-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-sand-border/80 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-terracotta text-linen">
                      <Lock className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="font-serif text-lg font-bold text-sage leading-tight">
                        Credit Card Authorization Form
                      </h3>
                      <p className="text-[11px] text-sage/70">
                        Grand Travel &amp; Cruise &middot; Secure Deposit Authorization
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className="p-1.5 text-sage/60 hover:text-sage rounded-md hover:bg-sand/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleApproveProposal} className="p-6 overflow-y-auto space-y-4 text-xs">
                  {approvalError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                      <span>{approvalError}</span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-sand/60 border border-sand-border/80 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-sage/60 block">Authorization Total</span>
                    <p className="font-serif text-xl text-sage font-medium">
                      ${proposal.deposit_amount.toLocaleString()} USD
                    </p>
                    <p className="text-[11px] text-sage/60">
                      30% Suite Retainer for {proposal.title} ({proposal.dates})
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-sage uppercase tracking-wider block">
                      Cardholder Full Legal Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      placeholder="e.g. Dr. Genevieve Sterling"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-sand-border bg-white text-sage text-xs focus:outline-none focus:ring-1 focus:ring-terracotta"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-sage uppercase tracking-wider block">
                        Card Brand
                      </label>
                      <select
                        value={cardBrand}
                        onChange={(e) => setCardBrand(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-sand-border bg-white text-sage text-xs focus:outline-none focus:ring-1 focus:ring-terracotta"
                      >
                        <option value="Visa">Visa</option>
                        <option value="Mastercard">Mastercard</option>
                        <option value="Amex">American Express</option>
                        <option value="Discover">Discover</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-sage uppercase tracking-wider block">
                        Card Last 4 Digits
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        required
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value)}
                        placeholder="e.g. 4242"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-sand-border bg-white text-sage text-xs font-mono focus:outline-none focus:ring-1 focus:ring-terracotta"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-sage uppercase tracking-wider block">
                      Billing Postal / Zip Code
                    </label>
                    <input
                      type="text"
                      required
                      value={billingPostalCode}
                      onChange={(e) => setBillingPostalCode(e.target.value)}
                      placeholder="e.g. 90210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-sand-border bg-white text-sage text-xs focus:outline-none focus:ring-1 focus:ring-terracotta"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-sage uppercase tracking-wider block">
                      Legal Electronic Signature
                    </label>
                    <input
                      type="text"
                      required
                      value={eSignature}
                      onChange={(e) => setESignature(e.target.value)}
                      placeholder="Type your full legal name to e-sign"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-sand-border bg-white text-sage text-xs font-serif italic focus:outline-none focus:ring-1 focus:ring-terracotta"
                    />
                  </div>

                  {/* Legal Protection Consent */}
                  <div className="pt-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-sand-border text-terracotta focus:ring-terracotta"
                      />
                      <span className="text-[11px] text-sage/75 leading-relaxed">
                        I hereby authorize KAI Wellness Retreats and host agency Grand Travel &amp; Cruise to charge the
                        non-refundable 30% sanctuary deposit of <strong>${proposal.deposit_amount.toLocaleString()} USD</strong> to the
                        card above. I acknowledge that the remaining 70% balance (${proposal.final_balance.toLocaleString()} USD)
                        will be automatically scheduled 45 days prior to retreat departure in accordance with the luxury cancellation policy.
                      </span>
                    </label>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-sand-border/60">
                    <button
                      type="button"
                      onClick={() => setShowApprovalModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-sand-border bg-sand/40 hover:bg-sand text-sage text-xs font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={approving || !agreedToTerms}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-terracotta hover:bg-terracotta/90 text-linen text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {approving ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Authorizing Deposit…
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Authorize Deposit (${proposal.deposit_amount.toLocaleString()})
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="border-t border-sand-border/60 py-6 text-center text-[10px] text-sage/50 uppercase tracking-[0.2em]">
          KAI Wellness Retreats &middot; Grand Travel &amp; Cruise &middot; Sanctuary Platform Verified
        </footer>
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
                  Loading Companion…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Explore Demo Companion
                </>
              )}
            </button>
            <a
              href="mailto:concierge@kaiwellnessretreats.com?subject=Sanctuary%20Reservation%20Inquiry"
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
              {sanctuary.sanctuary_name} &middot; {sanctuary.destination}, {sanctuary.country}
            </p>
            <p className="text-xs text-linen/60 mt-1">
              {sanctuary.dates} &middot; {sanctuary.duration}
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
                    <span className="font-serif text-2xl text-sage">{weather.temperature_celsius}&deg;</span>
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
                      Nurse Kareena&apos;s Guidance
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
                    Today&apos;s Optimal Breathwork Window
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
                  Airport Chauffeur &amp; Transfer
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
                        <div
                          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                            checked ? "bg-olive border-olive" : "border-sand-border"
                          }`}
                        >
                          {checked && <CheckCircle2 className="h-3.5 w-3.5 text-linen" />}
                        </div>
                        <span className={`text-sm transition-all ${checked ? "text-sage/50 line-through" : "text-sage"}`}>
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
                    <p className="text-sm text-olive font-medium">You&apos;re all packed for your sanctuary!</p>
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
                      transition={{
                        duration: breath.phase === "inhale" ? 4 : breath.phase === "hold" ? 0.3 : 8,
                        ease: "easeInOut",
                      }}
                      className="h-40 w-40 rounded-full flex items-center justify-center"
                      style={{
                        background:
                          breath.phase === "inhale"
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
                        cx="80"
                        cy="80"
                        r="76"
                        fill="none"
                        stroke={breath.phase === "inhale" ? "#5C6B5E" : breath.phase === "hold" ? "#C07D63" : "#2D3E35"}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={478}
                        animate={{
                          strokeDashoffset:
                            breath.phase === "inhale"
                              ? 478 - 478 * (1 - breath.secondsLeft / 4)
                              : breath.phase === "hold"
                              ? 478 - 478 * (1 - breath.secondsLeft / 7)
                              : 478 - 478 * (1 - breath.secondsLeft / 8),
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
                    onClick={() => {
                      if (sound.isPlaying) sound.stop();
                      sound.start(432);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl px-6 py-4 transition-all border ${
                      sound.isPlaying && sound.frequency === 432
                        ? "bg-sage text-linen border-sage shadow-md"
                        : "bg-sand/60 text-sage border-sand-border hover:border-sage/30"
                    }`}
                  >
                    <span className="font-serif text-2xl font-light">432</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Hz &middot; Deep Calm</span>
                  </button>
                  <button
                    onClick={() => {
                      if (sound.isPlaying) sound.stop();
                      sound.start(528);
                    }}
                    className={`flex flex-col items-center gap-2 rounded-2xl px-6 py-4 transition-all border ${
                      sound.isPlaying && sound.frequency === 528
                        ? "bg-terracotta text-linen border-terracotta shadow-md"
                        : "bg-sand/60 text-sage border-sand-border hover:border-terracotta/30"
                    }`}
                  >
                    <span className="font-serif text-2xl font-light">528</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">Hz &middot; Recovery</span>
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
                  <p className="text-[10px] uppercase tracking-[0.2em] text-sage/50 font-semibold">
                    About Solfeggio Frequencies
                  </p>
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
          KAI Wellness Retreats &middot; Grand Travel &amp; Cruise Partnered &middot; Private Guest Companion
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
