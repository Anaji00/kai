"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  Send,
  AlertTriangle,
  ShieldCheck,
  Building,
  Mail,
  Check,
  Copy,
  BookOpen,
  ArrowRight,
  Compass,
  RefreshCw,
  Paperclip,
  Mic,
  MicOff,
  Share2,
  Upload,
  CheckCircle2,
  Clock,
  DollarSign,
  Plane,
  Utensils,
  HeartPulse,
  Briefcase,
  Command,
  Table,
  Printer,
  Phone,
  Maximize2,
  Minimize2,
  Minus,
  Volume2,
  VolumeX,
  ExternalLink,
  Bot,
  User,
  Radio,
  SlidersHorizontal,
  ChevronDown
} from "lucide-react";
import {
  chatWithCopilot,
  chatWithCopilotStream,
  uploadGuestDocument,
} from "@/lib/sidecar-api";
import { dispatchFormFill, FormFillProposal } from "@/lib/portal-form-bus";

export type CopilotMode =
  | "omniscient"
  | "executive_finance"
  | "travel_logistics"
  | "b2b_sales"
  | "chef_hospitality"
  | "clinical_safety"
  | "spreadsheet_crm"
  | "wellness_safety"
  | "itinerary_curation"
  | "concierge_prep"
  | "studio_ops"
  | "consult_prep"
  | "travel_concierge";

interface ClinicalCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guestContext?: Record<string, unknown>;
  initialQuery?: string;
  initialMode?: CopilotMode;
}

interface MessageItem {
  sender: "user" | "copilot";
  text: string;
  safety_level?: string;
  safety_screened?: boolean;
  citations?: string[];
  suggested_followups?: string[];
  isDocument?: boolean;
  form_fill_proposal?: FormFillProposal;
  proposal_authorized?: boolean;
  latency_ms?: number;
  model_used?: string;
  sanctuary_slug?: string;
  system_action_hints?: Array<{ label: string; url: string; icon: string }>;
}

const PILLAR_MODES: Array<{
  id: CopilotMode;
  label: string;
  icon: React.ElementType;
  badge: string;
}> = [
  { id: "omniscient", label: "✨ All-in-One", icon: Sparkles, badge: "All Areas" },
  { id: "executive_finance", label: "💰 Finance & Buyouts", icon: DollarSign, badge: "Payments" },
  { id: "travel_logistics", label: "✈️ Flights & Rides", icon: Plane, badge: "Drivers & Radar" },
  { id: "chef_hospitality", label: "🍽️ Private Chef", icon: Utensils, badge: "Allergies & Menus" },
  { id: "b2b_sales", label: "🤝 Partner Studios", icon: Briefcase, badge: "Commissions" },
  { id: "clinical_safety", label: "🩺 Health Safety", icon: HeartPulse, badge: "Nurse Care" },
  { id: "spreadsheet_crm", label: "👥 Guest CRM", icon: Table, badge: "Spreadsheet" },
  { id: "studio_ops", label: "🌿 Sanctuary Ops", icon: Building, badge: "Capacities" },
];

const QUICK_COMMAND_CHIPS = [
  { label: "/finance", hint: "Villa buyouts & 30/70 payment schedules", icon: DollarSign },
  { label: "/radar", hint: "Flight tracking & chauffeur schedules", icon: Plane },
  { label: "/chef", hint: "Allergy charts & healthy menus", icon: Utensils },
  { label: "/b2b", hint: "Studio proposals & 15% commissions", icon: Briefcase },
  { label: "/clinical", hint: "Health check & gentle care tips", icon: HeartPulse },
  { label: "/attendee", hint: "Add guest to spreadsheet", icon: Table },
  { label: "/book", hint: "Check room prices & dates", icon: Sparkles },
  { label: "/crm", hint: "Open sovereign travel CRM", icon: Table },
  { label: "/draft", hint: "Warm welcome email to guest", icon: Mail },
];

const QUICK_PROMPTS: Record<string, string[]> = {
  omniscient: [
    "💰 Calculate villa buyout and payment breakdown for 14 guests at Nosara",
    "✈️ Group delayed airport arrivals into luxury van pickups (<=35 min wait)",
    "🍽️ Create Private Chef allergy-safe menu (Celiac, Onion/Garlic-free, Seed-Oil-Free)",
    "🤝 Draft partnership agreement for luxury Pilates studio (15% thank-you commission)",
    "🩺 Check guest health notes for heart rate & nut allergies (Nurse recommendations)",
    "👥 Add a new guest row for Sarah Jenkins in retreat spreadsheet",
    "📊 Calculate 30% deposit and 70% final balance on $11,500 villa stay",
    "📋 Check room availability and pricing for upcoming 7-day retreat"
  ],
  executive_finance: [
    "Calculate villa buyout and payment breakdown for 14 guests at Nosara",
    "Calculate 30% deposit and 70% balance payment schedule for $11,500 stay",
    "Reconcile international bank wires vs credit card processing fees",
    "Generate profit margins report across all 4 retreats"
  ],
  travel_logistics: [
    "Group delayed airport arrivals into luxury van pickups (<=35 min wait)",
    "Check private jet luggage weight & pilot duty hours",
    "Create 1-click WhatsApp driver schedule for Nosara arrivals",
    "Plan 4WD mountain route around river during seasonal rain"
  ],
  chef_hospitality: [
    "Create Private Chef allergy-safe menu (Celiac, Onion/Garlic-free, Seed-Oil-Free)",
    "Plan 7-day farm-to-table regenerative culinary plan for Nosara",
    "Check all guest food allergies for upcoming Amalfi cohort",
    "Design 432Hz evening herbal elixir tea menu for sleep renewal"
  ],
  b2b_sales: [
    "Draft partnership agreement for luxury Pilates studio (15% thank-you commission)",
    "Draft B2B concierge email to Manhattan wellness director",
    "Calculate 15% reciprocal commission on $42,000 group buyout",
    "Create private co-branded retreat invitation for luxury studio"
  ],
  clinical_safety: [
    "Check guest health notes for heart rate & nut allergies (Nurse recommendations)",
    "Review contraindicated modalities for guest with hypertension",
    "Verify cold plunge and sauna safety guidelines for pregnant guest",
    "Generate clinical triage intake checklist for Nurse Kareena"
  ],
  spreadsheet_crm: [
    "Add a new guest row for Sarah Jenkins in retreat spreadsheet",
    "List all booked guests with balance due for Nosara",
    "Find guest dossier by email: alexander@vancefamily.com",
    "Update room assignment to Ocean Villa Suite"
  ],
  studio_ops: [
    "Show remaining spots across Nosara, Amalfi, Bali, and Puerto Vallarta",
    "Explain how founder review keeps all communications safe",
    "What is the booking status for our upcoming 12–14 guest groups?",
    "Check weather microclimate for Nosara arrival day"
  ]
};

export default function ClinicalCopilotDrawer({
  isOpen,
  onClose,
  guestContext,
  initialQuery,
  initialMode,
}: ClinicalCopilotDrawerProps) {
  const [activeMode, setActiveMode] = useState<CopilotMode>(initialMode || "omniscient");
  const [inputMessage, setInputMessage] = useState("");
  const [selectedTool, setSelectedTool] = useState("chat");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Layout View States: Docked Floating Widget vs Maximized Command Center
  const [isExpanded, setIsExpanded] = useState(false);

  // ChatGPT-style Voice Mode States
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceVolumeEnabled, setVoiceVolumeEnabled] = useState(true);
  const [liveVoiceTranscript, setLiveVoiceTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const executedInitialRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<MessageItem[]>([
    {
      sender: "copilot",
      text: "**Welcome, Kareena & Sanctuary Team!** I am your Retreat Operations Assistant.\n\nI am connected to every system across KAI to help you take action in seconds:\n• **Billing & Invoices**: Villa buyout calculations, 30% deposit & 70% balance schedules, and currency conversions.\n• **Flights & Airport Rides**: Live flight tracking, WhatsApp driver pickup schedules, and mountain road routes.\n• **Partner Studios**: Pilates & yoga studio referrals, 15% partner thank-you commissions, and group proposals.\n• **Private Chef & Dining**: Healthy seed-oil-free meal plans, allergy safety charts, and farm-to-table menus.\n• **Guest Care & Health Safety**: Daily morning wellness checks, gentle breathing exercises, and health safety reviews.\n• **Retreat Guest Spreadsheet**: Instant guest additions, CRM room assignments, and reservation statuses.\n\nNothing is ever sent to a guest or partner without your review and approval. You are always in full control."
    }
  ]);

  // Check speech recognition capability
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as any;
      if (win.SpeechRecognition || win.webkitSpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  // Auto-scroll messages to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Handle Initial Query from shortcuts (Cmd+K or props)
  useEffect(() => {
    if (isOpen && initialQuery && executedInitialRef.current !== initialQuery) {
      executedInitialRef.current = initialQuery;
      if (initialMode) {
        setActiveMode(initialMode);
      }
      setTimeout(() => {
        handleSend(initialQuery);
      }, 120);
    }
    if (!isOpen) {
      executedInitialRef.current = null;
    }
  }, [isOpen, initialQuery, initialMode]);

  // Adjust textarea height dynamically
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Text-To-Speech helper for ChatGPT-style spoken responses
  const speakResponse = useCallback((text: string) => {
    if (!voiceVolumeEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for natural speech
      const cleanText = text
        .replace(/[*#_`~>]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/\n+/g, " ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Samantha") ||
            v.name.includes("Karen") ||
            v.name.includes("Google") ||
            v.name.includes("Victoria"))
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis error:", err);
      setIsSpeaking(false);
    }
  }, [voiceVolumeEnabled]);

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Speech Recognition (Voice Input)
  const startListening = () => {
    if (typeof window === "undefined") return;
    const win = window as any;
    const SpeechRecClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecClass) {
      alert("Voice speech recognition is not supported in this browser.");
      return;
    }

    stopSpeaking();

    try {
      const recognition = new SpeechRecClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setLiveVoiceTranscript("");
      };

      recognition.onresult = (e: any) => {
        const transcript = Array.from(e.results)
          .map((result: any) => result[0].transcript)
          .join("");
        setLiveVoiceTranscript(transcript);
        setInputMessage(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (isVoiceMode && liveVoiceTranscript.trim()) {
          handleSend(liveVoiceTranscript);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Speech recognition start error:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && typeof recognitionRef.current.stop === "function") {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleVoiceListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Send Message Handler (Streaming & Agentic Superpowers)
  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    stopSpeaking();
    stopListening();

    const userMsg: MessageItem = { sender: "user", text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLiveVoiceTranscript("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    const convHistory = messages
      .filter((m) => {
        if (!m.text || m.isDocument) return false;
        const lower = m.text.trim().toLowerCase();
        if (lower.startsWith("welcome") || lower.startsWith("**welcome")) return false;
        return true;
      })
      .slice(-3)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text
      }));

    const currentPath = typeof window !== "undefined" ? window.location.pathname : undefined;
    let accumulatedText = "";

    // Append placeholder copilot response message
    setMessages((prev) => [
      ...prev,
      {
        sender: "copilot",
        text: "",
        safety_level: undefined,
        safety_screened: false,
        citations: [],
        suggested_followups: [],
        form_fill_proposal: undefined,
        proposal_authorized: false,
        latency_ms: undefined,
        sanctuary_slug: undefined
      }
    ]);

    try {
      await chatWithCopilotStream(
        query,
        activeMode,
        guestContext,
        undefined,
        currentPath,
        convHistory,
        {
          onToken: (token) => {
            accumulatedText += token;
            setMessages((prev) => {
              const lastIdx = prev.length - 1;
              if (lastIdx < 0) return prev;
              const copy = [...prev];
              copy[lastIdx] = { ...copy[lastIdx], text: accumulatedText };
              return copy;
            });
          },
          onMeta: (meta) => {
            setMessages((prev) => {
              const lastIdx = prev.length - 1;
              if (lastIdx < 0) return prev;
              const copy = [...prev];
              copy[lastIdx] = {
                ...copy[lastIdx],
                safety_level: meta.safety_level,
                safety_screened: meta.safety_screened,
                citations: meta.citations || copy[lastIdx].citations,
                suggested_followups: meta.suggested_followups || copy[lastIdx].suggested_followups,
                form_fill_proposal: meta.form_fill_proposal || copy[lastIdx].form_fill_proposal,
                sanctuary_slug: meta.sanctuary_slug || copy[lastIdx].sanctuary_slug,
                latency_ms: meta.latency_ms,
                model_used: meta.model_used
              };
              return copy;
            });
          },
          onDone: () => {
            setLoading(false);
            if (isVoiceMode && accumulatedText) {
              speakResponse(accumulatedText);
            }
          },
          onError: async (err) => {
            console.warn("Live stream paused, falling back to direct response:", err);
            if (!accumulatedText) {
              try {
                const directResp = await chatWithCopilot(
                  query,
                  activeMode,
                  guestContext,
                  undefined,
                  currentPath,
                  convHistory
                );
                setMessages((prev) => {
                  const lastIdx = prev.length - 1;
                  if (lastIdx < 0) return prev;
                  const copy = [...prev];
                  copy[lastIdx] = {
                    sender: "copilot",
                    text: directResp.response_text || "I have received your request and logged it for review.",
                    safety_level: directResp.safety_level,
                    safety_screened: directResp.safety_screened,
                    citations: directResp.citations,
                    suggested_followups: directResp.suggested_followups,
                    form_fill_proposal: directResp.form_fill_proposal,
                    sanctuary_slug: directResp.sanctuary_slug
                  };
                  return copy;
                });
                if (isVoiceMode && directResp.response_text) {
                  speakResponse(directResp.response_text);
                }
              } catch (fallbackErr) {
                setMessages((prev) => {
                  const lastIdx = prev.length - 1;
                  if (lastIdx < 0) return prev;
                  const copy = [...prev];
                  copy[lastIdx] = {
                    sender: "copilot",
                    text: `⚠️ **Notice**: Could not complete query: *${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}*. Please try again.`,
                    safety_level: "CLEAR"
                  };
                  return copy;
                });
              }
            }
            setLoading(false);
          }
        }
      );
    } catch (err) {
      console.error("Chat invocation failed:", err);
      setLoading(false);
    }
  };

  // Document Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    setUploading(true);

    try {
      const parsed = await uploadGuestDocument(file);
      if (!parsed) {
        throw new Error("Unable to parse document payload.");
      }

      const safetyLevel =
        parsed.safety_clearance_status === "ATTENTION_NEEDED"
          ? "CONTRAINDICATION_ALERT"
          : "CLEAR";

      let responseText = `📄 **Document Read**: \`${fileName}\`\n\n`;
      if (parsed.associated_guest_name) {
        responseText += `• **Guest Name:** ${parsed.associated_guest_name}\n`;
      }
      if (parsed.extracted_summary) {
        responseText += `• **Summary:** ${parsed.extracted_summary}\n`;
      }
      if (parsed.clinical_notes_found && parsed.clinical_notes_found.length > 0) {
        responseText += `• **Health & Dietary Notes:**\n${parsed.clinical_notes_found.map((d: string) => `  - ${d}`).join("\n")}\n`;
      }
      if (parsed.travel_details_found && parsed.travel_details_found.length > 0) {
        responseText += `• **Travel & Flight Notes:**\n${parsed.travel_details_found.map((t: string) => `  - ${t}`).join("\n")}\n`;
      }
      responseText += `\n*Screened according to Nurse Kareena Islam's clinical safety guidelines.*`;

      setMessages((prev) => [
        ...prev,
        {
          sender: "copilot",
          text: responseText,
          safety_level: safetyLevel,
          citations: ["Guest Care Guidelines", "Nervous System Safety Standards"],
          suggested_followups: [
            `Create gentle schedule for ${parsed.associated_guest_name || "this guest"}`,
            "Draft friendly email to guest regarding health history",
            "Check cold plunge and breathwork comfort"
          ]
        }
      ]);
    } catch (err) {
      console.error("Document upload failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "copilot",
          text: `⚠️ **Document Notice**: Could not read \`${fileName}\`. Please check that it is a PDF, PNG, JPG, or CSV under 10MB.`,
          safety_level: "CLEAR"
        }
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Clipboard & Share actions
  const copyToClipboard = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const shareContent = async (text: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "KAI Sanctuary Note",
          text: text
        });
      } catch {
        navigator.clipboard.writeText(text);
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Note copied to clipboard!");
    }
  };

  // Form Fill Proposal Approval
  const handleApproveProposal = (proposal: FormFillProposal, idx: number) => {
    dispatchFormFill(proposal);
    setMessages((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx], proposal_authorized: true };
      }
      return copy;
    });
    if (proposal.target_url) {
      window.location.assign(proposal.target_url);
    }
  };

  // System Navigation Helper
  const navigateToPortal = (url: string) => {
    if (typeof window !== "undefined") {
      window.location.assign(url);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end items-end p-0 sm:p-6">
        {/* Backdrop for Maximized Mode */}
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsExpanded(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto z-40 transition-opacity"
          />
        )}

        {/* Floating / Expanded ChatGPT-Style Card */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.92, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 24 }}
          transition={{ type: "spring", damping: 28, stiffness: 340 }}
          className={`pointer-events-auto bg-[#121110]/95 backdrop-blur-2xl border border-stone-800/90 text-stone-100 flex flex-col shadow-2xl shadow-black/90 overflow-hidden z-50 ${
            isExpanded
              ? "fixed inset-3 sm:inset-6 md:inset-10 max-w-6xl max-h-[92vh] m-auto rounded-3xl"
              : "relative w-full sm:w-[460px] h-[680px] max-h-[90vh] rounded-t-3xl sm:rounded-3xl border-b-0 sm:border-b"
          }`}
        >
          {/* Top Bar: ChatGPT-Inspired Minimalist Navigation */}
          <div className="px-4 py-3 border-b border-stone-800/80 bg-stone-950/80 flex items-center justify-between gap-3 shrink-0">
            {/* Left: Identity & Status Indicator */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600/30 to-amber-400/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-sm">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-stone-950 animate-pulse" />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm font-semibold tracking-tight text-stone-100">
                    KAI Assistant
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                    Brain 4.0
                  </span>
                </div>
                <p className="text-[11px] text-stone-400 font-sans">
                  Connected to CRM, Flights, Dining &amp; Health
                </p>
              </div>
            </div>

            {/* Right: Controls (Voice Mode, Expand, Minimize, Close) */}
            <div className="flex items-center gap-1">
              {/* Voice Mode Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  const nextVoice = !isVoiceMode;
                  setIsVoiceMode(nextVoice);
                  if (nextVoice) {
                    startListening();
                  } else {
                    stopListening();
                    stopSpeaking();
                  }
                }}
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isVoiceMode
                    ? "bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-xs"
                    : "text-stone-400 hover:text-amber-300 hover:bg-stone-800/80"
                }`}
                title="Toggle Live Voice Mode (ChatGPT Experience)"
              >
                <Radio className={`w-3.5 h-3.5 ${isVoiceMode ? "animate-pulse text-amber-400" : ""}`} />
                <span className="text-[11px] font-medium hidden sm:inline">
                  {isVoiceMode ? "Voice On" : "Voice"}
                </span>
              </button>

              {/* Expand / Restore Button */}
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-colors cursor-pointer"
                title={isExpanded ? "Collapse to Widget" : "Expand to Fullscreen"}
              >
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  stopSpeaking();
                  setIsVoiceMode(false);
                  onClose();
                }}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-colors cursor-pointer"
                title="Close Assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mode Selector Strip */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-stone-950/60 border-b border-stone-800/70 overflow-x-auto no-scrollbar shrink-0 text-xs">
            {PILLAR_MODES.map((pm) => {
              const Icon = pm.icon;
              const isMatch = activeMode === pm.id;
              return (
                <button
                  key={pm.id}
                  onClick={() => setActiveMode(pm.id)}
                  className={`py-1 px-2.5 rounded-full whitespace-nowrap text-[11px] transition-all flex items-center gap-1.5 shrink-0 ${
                    isMatch
                      ? "bg-amber-500/20 text-amber-200 border border-amber-500/40 font-medium shadow-xs"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60 border border-transparent"
                  }`}
                >
                  <Icon className="w-3 h-3 text-amber-400/80" />
                  <span>{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* MAIN BODY: Voice Mode View OR Standard Chat View */}
          {isVoiceMode ? (
            /* ======================================================== */
            /* CHATGPT-STYLE ANIMATED VOICE MODE VIEW                   */
            /* ======================================================== */
            <div className="flex-1 flex flex-col items-center justify-between p-6 sm:p-10 relative overflow-hidden bg-gradient-to-b from-stone-950 via-[#141210] to-stone-950">
              {/* Voice State Header */}
              <div className="text-center space-y-1 z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-[11px] font-mono text-amber-300">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSpeaking
                        ? "bg-amber-400 animate-ping"
                        : isListening
                        ? "bg-emerald-400 animate-pulse"
                        : "bg-stone-500"
                    }`}
                  />
                  <span>
                    {isSpeaking
                      ? "KAI Speaking…"
                      : isListening
                      ? "Listening to your voice…"
                      : "Tap orb to speak"}
                  </span>
                </div>
                <h3 className="text-lg font-serif text-stone-100 font-semibold tracking-tight">
                  KAI Ambient Voice
                </h3>
              </div>

              {/* Pulsating Fluid Organic Orb */}
              <div className="relative flex items-center justify-center my-auto cursor-pointer" onClick={toggleVoiceListening}>
                {/* Outermost Concentric Glow Ring */}
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.45, 1.1, 1.3, 1] : isListening ? [1, 1.25, 1.05, 1.2, 1] : [1, 1.05, 1],
                    opacity: isSpeaking ? [0.4, 0.8, 0.5, 0.7, 0.4] : isListening ? [0.3, 0.6, 0.3] : [0.15, 0.25, 0.15],
                  }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute w-56 h-56 rounded-full bg-gradient-to-tr from-amber-600/30 via-rose-500/20 to-amber-300/30 blur-2xl pointer-events-none"
                />

                {/* Secondary Ripple Ring */}
                <motion.div
                  animate={{
                    scale: isSpeaking ? [1, 1.28, 1.05, 1.2, 1] : isListening ? [1, 1.15, 1] : [1, 1.03, 1],
                    rotate: isSpeaking ? 360 : 0,
                  }}
                  transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                  className="absolute w-44 h-44 rounded-full border border-amber-500/30 border-dashed pointer-events-none"
                />

                {/* Central Glowing Orb Body */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    scale: isSpeaking ? [1, 1.12, 0.98, 1.08, 1] : isListening ? [1, 1.08, 1] : [1, 1.02, 1],
                  }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="relative w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 via-amber-600 to-rose-700 shadow-2xl shadow-amber-500/40 flex items-center justify-center border-2 border-amber-200/40 overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent_60%)]" />
                  {isSpeaking ? (
                    <Volume2 className="w-10 h-10 text-white drop-shadow-md animate-pulse" />
                  ) : isListening ? (
                    <Mic className="w-10 h-10 text-white drop-shadow-md animate-bounce" />
                  ) : (
                    <MicOff className="w-10 h-10 text-white/80 drop-shadow-md" />
                  )}
                </motion.div>
              </div>

              {/* Live Voice Caption & Subtitle Display */}
              <div className="w-full max-w-lg text-center space-y-3 z-10">
                <div className="min-h-14 flex items-center justify-center px-4 py-2 rounded-2xl bg-stone-900/80 border border-stone-800 text-xs leading-relaxed text-stone-200 shadow-inner">
                  {liveVoiceTranscript ? (
                    <p className="italic text-amber-200 font-sans">
                      &ldquo;{liveVoiceTranscript}&rdquo;
                    </p>
                  ) : isSpeaking ? (
                    <p className="text-stone-300 font-sans">
                      Speaking response aloud…
                    </p>
                  ) : (
                    <p className="text-stone-500 font-sans">
                      Speak your question or instruction. Try &ldquo;Calculate villa buyout for 14 guests&rdquo; or &ldquo;Add guest to spreadsheet&rdquo;
                    </p>
                  )}
                </div>

                {/* Bottom Voice Controls */}
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setVoiceVolumeEnabled((prev) => !prev)}
                    className="p-2.5 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
                    title={voiceVolumeEnabled ? "Mute Spoken Audio" : "Enable Spoken Audio"}
                  >
                    {voiceVolumeEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-stone-500" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceListening}
                    className={`px-5 py-2.5 rounded-full font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                      isListening
                        ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                        : "bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        <span>Stop Listening</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        <span>Tap to Speak</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      stopListening();
                      stopSpeaking();
                      setIsVoiceMode(false);
                    }}
                    className="px-3.5 py-2.5 rounded-full bg-stone-900 hover:bg-stone-800 border border-stone-800 text-xs text-stone-300 transition-colors"
                    title="Return to Text Chat"
                  >
                    Text Mode
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* STANDARD CHATGPT CHAT STREAM VIEW                        */
            /* ======================================================== */
            <>
              {/* Quick Prompts Strip */}
              <div className="px-4 py-2 bg-stone-950/40 border-b border-stone-800/60 overflow-x-auto flex items-center gap-1.5 no-scrollbar shrink-0">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold shrink-0 mr-1">
                  Suggestions:
                </span>
                {(QUICK_PROMPTS[activeMode] || QUICK_PROMPTS.omniscient).slice(0, 4).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="text-xs px-2.5 py-1 rounded-full bg-stone-900/80 hover:bg-amber-500/20 hover:text-amber-200 border border-stone-800 hover:border-amber-500/30 text-stone-300 transition-colors shrink-0 flex items-center gap-1 text-[11px]"
                  >
                    <span>{prompt.slice(0, 36)}…</span>
                    <ArrowRight className="w-2.5 h-2.5 text-stone-500" />
                  </button>
                ))}
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[94%] sm:max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed transition-all ${
                        m.sender === "user"
                          ? "bg-amber-600/90 text-stone-50 rounded-br-sm shadow-md"
                          : "bg-stone-900/90 border border-stone-800/90 text-stone-200 rounded-bl-sm shadow-md"
                      }`}
                    >
                      {/* Clinical Safety & Speed Header */}
                      {m.sender === "copilot" && (
                        <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
                          {m.safety_level === "CONTRAINDICATION_ALERT" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-300">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Health Hold · Review with Nurse Kareena
                            </span>
                          ) : m.safety_level === "CLEAR" && m.safety_screened ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              Health Safety Check Cleared
                            </span>
                          ) : <span />}

                          {m.latency_ms !== undefined && (
                            <span className="text-[9px] font-mono text-stone-400 bg-stone-950/60 border border-stone-800 px-2 py-0.5 rounded-full flex items-center gap-1 ml-auto">
                              <Clock className="w-2.5 h-2.5 text-amber-400" />
                              {(m.latency_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed space-y-2">
                        {m.text}
                      </div>

                      {/* Interactive Founder Approval Card (Zero Autonomous Writes) */}
                      {m.form_fill_proposal && (
                        <div className="mt-3.5 p-3.5 rounded-xl bg-amber-950/50 border border-amber-500/40 text-stone-200 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                              <span>Founder Action Staged</span>
                            </div>
                            <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                              {m.proposal_authorized ? "Approved & Dispatched" : "Requires Your 1-Click Approval"}
                            </span>
                          </div>

                          <div className="text-xs font-serif font-semibold text-stone-100">
                            {m.form_fill_proposal.form_title || m.form_fill_proposal.action_title}
                          </div>

                          <p className="text-[11px] text-stone-300 leading-relaxed">
                            {m.form_fill_proposal.summary}
                          </p>

                          <div className="pt-1.5 flex items-center gap-2">
                            <button
                              onClick={() => handleApproveProposal(m.form_fill_proposal!, idx)}
                              disabled={m.proposal_authorized}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                                m.proposal_authorized
                                  ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 cursor-default"
                                  : "bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold shadow-xs cursor-pointer"
                              }`}
                            >
                              {m.proposal_authorized ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Authorized by You</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Review &amp; Approve Action</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Citations & Evidence Pill */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center gap-1.5 text-[10px] text-stone-400">
                          <BookOpen className="w-3 h-3 text-amber-400" />
                          <span>Sources: {m.citations.join(" · ")}</span>
                        </div>
                      )}

                      {/* Specialized Action Chips */}
                      {m.sender === "copilot" && (
                        <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* Billing Summary Copy */}
                            {(m.text.includes("Buyout") || m.text.includes("Deposit") || m.text.includes("Installment") || m.text.includes("Balance")) && (
                              <button
                                onClick={() => copyToClipboard(m.text, idx)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium transition-colors"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Copy Billing Breakdown</span>
                              </button>
                            )}

                            {/* WhatsApp Driver Link */}
                            {(m.text.includes("Chauffeur") || m.text.includes("WhatsApp") || m.text.includes("Flight") || m.text.includes("Driver")) && (
                              <button
                                onClick={() => {
                                  copyToClipboard(m.text, idx);
                                  if (typeof window !== "undefined") {
                                    const encoded = encodeURIComponent(m.text);
                                    window.open(`https://wa.me/?text=${encoded}`, "_blank");
                                  }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium transition-colors"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Send WhatsApp to Driver</span>
                              </button>
                            )}

                            {/* Print Chef Chart */}
                            {(m.text.includes("Dietary") || m.text.includes("Allergen") || m.text.includes("Chef") || m.text.includes("Menu")) && (
                              <button
                                onClick={() => {
                                  const printWin = window.open("", "_blank");
                                  if (printWin) {
                                    printWin.document.write(`<html><head><title>KAI Private Chef Dietary Chart</title><style>body{font-family:sans-serif;padding:24px;color:#1c1917;}table{border-collapse:collapse;width:100%;}th,td{border:1px solid #d6d3d1;padding:8px;}th{background:#f5f5f4;}</style></head><body><h1>KAI Sanctuary · Private Chef Dietary Chart</h1><pre style="white-space:pre-wrap;font-family:inherit;">${m.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`);
                                    printWin.document.close();
                                    printWin.print();
                                  }
                                }}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[11px] font-medium transition-colors"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Print Chef Chart</span>
                              </button>
                            )}

                            {/* Jump to CRM shortcut */}
                            {(m.text.includes("CRM") || m.text.includes("Spreadsheet") || m.text.includes("Guest row")) && (
                              <button
                                onClick={() => navigateToPortal("/portal/crm")}
                                className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-[11px] font-medium transition-colors"
                              >
                                <Table className="w-3 h-3 text-amber-400" />
                                <span>Open Travel CRM</span>
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <button
                              onClick={() => copyToClipboard(m.text, idx)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] transition-colors"
                            >
                              {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                            </button>

                            <button
                              onClick={() => shareContent(m.text)}
                              className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] transition-colors"
                            >
                              <Share2 className="w-3 h-3" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Followup suggestion pills */}
                    {m.suggested_followups && m.suggested_followups.length > 0 && (
                      <div className="mt-2 pl-2 flex flex-wrap gap-1.5">
                        {m.suggested_followups.map((f, fIdx) => (
                          <button
                            key={fIdx}
                            onClick={() => handleSend(f)}
                            className="text-[10px] px-2.5 py-0.5 rounded-full bg-stone-900 border border-stone-800 hover:border-amber-500/40 text-stone-400 hover:text-amber-300 transition-colors"
                          >
                            ↳ {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Loading / Thinking Indicator */}
                {loading && (
                  <div className="flex items-center gap-2.5 text-xs text-amber-300/80 py-2 px-3 rounded-xl bg-stone-900/60 border border-stone-800 w-fit">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span className="font-sans">Formulating response and calculating logistics…</span>
                  </div>
                )}

                {uploading && (
                  <div className="flex items-center gap-2.5 text-xs text-amber-300/80 py-2 px-3 rounded-xl bg-stone-900/60 border border-stone-800 w-fit">
                    <Upload className="w-3.5 h-3.5 animate-bounce text-amber-400" />
                    <span className="font-sans">Parsing document for guest notes, dietary requests, and flights…</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Slash Commands Ribbon */}
              <div className="px-3 py-1.5 bg-stone-950/70 border-t border-stone-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
                <span className="text-[10px] font-mono text-amber-400/80 uppercase font-semibold shrink-0 mr-1 flex items-center gap-1">
                  <Command className="w-2.5 h-2.5 text-amber-400" />
                  <span>Actions:</span>
                </span>
                {QUICK_COMMAND_CHIPS.map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => {
                        setInputMessage(`${chip.label} `);
                        setSelectedTool(chip.label);
                        textareaRef.current?.focus();
                      }}
                      className="px-2 py-0.5 rounded-md bg-stone-900 hover:bg-amber-500/20 hover:text-amber-200 border border-stone-800 hover:border-amber-500/40 text-[10px] font-mono text-stone-400 flex items-center gap-1 transition-colors shrink-0"
                      title={chip.hint}
                    >
                      <Icon className="w-2.5 h-2.5 text-amber-400/70" />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Signature ChatGPT-Style Rounded Input Bar */}
              <div className="p-3 sm:p-4 border-t border-stone-800/80 bg-stone-950 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="relative flex items-end gap-2 rounded-2xl bg-stone-900 border border-stone-800 focus-within:border-amber-500/50 focus-within:ring-2 focus-within:ring-amber-500/20 p-2 transition-all shadow-inner"
                >
                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                    className="hidden"
                  />

                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || loading}
                    title="Upload guest intake PDF, doctor note, voucher, or CSV"
                    className="p-2 rounded-xl text-stone-400 hover:text-amber-300 hover:bg-stone-800/80 transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Multiline Expanding Textarea */}
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={inputMessage}
                    onChange={(e) => {
                      setInputMessage(e.target.value);
                      adjustTextareaHeight();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      activeMode === "executive_finance"
                        ? "Calculate villa buyout, 30% deposit, or balance schedule..."
                        : activeMode === "travel_logistics"
                        ? "Check flight arrivals, airport drivers, or driving routes..."
                        : activeMode === "chef_hospitality"
                        ? "Create allergy-safe menus, local produce lists, or herbal teas..."
                        : activeMode === "clinical_safety"
                        ? "Check guest health considerations, medications, or breathwork..."
                        : "Ask anything, or type a shortcut like /finance, /radar, /chef..."
                    }
                    className="flex-1 bg-transparent text-xs text-stone-100 placeholder-stone-500 focus:outline-none resize-none py-1.5 px-1 max-h-28 overflow-y-auto font-sans leading-relaxed"
                  />

                  {/* Speech Dictation Mic Button */}
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleVoiceListening}
                      title={isListening ? "Listening... click to stop" : "Click to speak"}
                      className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                        isListening
                          ? "bg-rose-500/20 text-rose-400 animate-pulse"
                          : "text-stone-400 hover:text-amber-300 hover:bg-stone-800/80"
                      }`}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}

                  {/* Circular ChatGPT-Style Send Button */}
                  <button
                    type="submit"
                    disabled={loading || uploading || !inputMessage.trim()}
                    className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-stone-950 font-bold transition-all shadow-md shrink-0 cursor-pointer"
                    title="Send message (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>

                <p className="text-[10px] text-stone-500 text-center mt-2 font-sans">
                  Founder Review Invariant Active · 100% Controlled by Kareena Islam, BSN, RN
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
