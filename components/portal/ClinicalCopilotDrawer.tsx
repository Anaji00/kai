"use client";

import React, { useState, useRef, useEffect } from "react";
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
  CloudSun,
  MapPin,
  HelpCircle,
  FileText
} from "lucide-react";
import {
  chatWithCopilot,
  chatWithCopilotStream,
  CopilotChatResponse,
  uploadGuestDocument,
  UploadedDocument
} from "@/lib/sidecar-api";
import { dispatchFormFill, FormFillProposal } from "@/lib/portal-form-bus";

interface ClinicalCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guestContext?: Record<string, unknown>;
  initialQuery?: string;
  initialMode?: CopilotMode;
}

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
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);
  const executedInitialRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<
    Array<{
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
    }>
  >([
    {
      sender: "copilot",
      text: "**Welcome, Kareena & Sanctuary Team!** I am your Retreat Operations Assistant.\n\nI am here to help you run all aspects of our sanctuaries with ease:\n• **Billing & Invoices**: Villa buyout calculations, 30% deposit & 70% balance payment schedules, and currency conversions.\n• **Flights & Airport Rides**: Live flight tracking, driver pickup schedules, and mountain road updates.\n• **Partner Studios**: Pilates & yoga studio referrals, 15% partner thank-you commissions, and group proposals.\n• **Private Chef & Dining**: Healthy seed-oil-free meal plans, allergy safety charts, and farm-to-table menus.\n• **Guest Care & Health Safety**: Daily morning wellness checks, gentle breathing exercises, and health safety reviews.\n• **Retreat Guest Spreadsheet**: Easy-to-use spreadsheet rows, guest statuses, and room assignments.\n\nNothing is ever sent to a guest or partner without your review and approval. You are always in full control."
    }
  ]);

  // Check speech recognition capability
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as {
        SpeechRecognition?: unknown;
        webkitSpeechRecognition?: unknown;
      };
      if (win.SpeechRecognition || win.webkitSpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

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

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputMessage;
    if (!query.trim() || loading) return;

    const userMsg = { sender: "user" as const, text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    const convHistory = messages
      .filter((m) => {
        if (!m.text || m.isDocument) return false;
        const lower = m.text.trim().toLowerCase();
        if (lower.startsWith("welcome") || lower.startsWith("**welcome")) return false;
        if (lower.includes("retreat operations assistant") || lower.includes("chief of staff") || lower.includes("clinical somatic assistant") || lower.includes("i am here to support you")) return false;
        return true;
      })
      .slice(-2)
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
          },
          onError: async (err) => {
            console.warn("Live stream paused, using direct assistant response:", err);
            if (!accumulatedText) {
              try {
                const res: CopilotChatResponse = await chatWithCopilot(
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
                    text: res.response_text,
                    safety_level: res.safety_level,
                    safety_screened: res.safety_screened,
                    citations: res.citations,
                    suggested_followups: res.suggested_followups,
                    form_fill_proposal: res.form_fill_proposal,
                    proposal_authorized: false,
                    latency_ms: res.latency_ms,
                    model_used: res.model_used,
                    sanctuary_slug: res.sanctuary_slug
                  };
                  return copy;
                });
              } catch (fallbackErr) {
                console.error("Fallback assistant failed:", fallbackErr);
                setMessages((prev) => {
                  const lastIdx = prev.length - 1;
                  if (lastIdx < 0) return prev;
                  const copy = [...prev];
                  copy[lastIdx] = {
                    sender: "copilot",
                    text: "I encountered a momentary connection pause. Please ensure the KAI API service is running.",
                    safety_screened: false
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
      console.error(err);
      if (!accumulatedText) {
        setMessages((prev) => {
          const lastIdx = prev.length - 1;
          const copy = [...prev];
          copy[lastIdx] = {
            sender: "copilot",
            text: "I encountered a momentary connection pause. Please ensure the KAI API service is running.",
            safety_screened: false
          };
          return copy;
        });
      }
      setLoading(false);
    }
  };

  const handleApproveProposal = (proposal: FormFillProposal, msgIdx: number) => {
    setMessages((prev) =>
      prev.map((m, i) => (i === msgIdx ? { ...m, proposal_authorized: true } : m))
    );
    dispatchFormFill(proposal);
    if (typeof window !== "undefined") {
      if (proposal.target_url) {
        const targetBase = proposal.target_url.split("?")[0];
        if (window.location.pathname !== targetBase) {
          window.location.href = proposal.target_url;
        }
      } else if (proposal.target_tab === "vendors") {
        if (!window.location.pathname.includes("/portal/vendors")) {
          window.location.href = "/portal/vendors";
        }
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const fileName = file.name;
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: `📎 Attached Document for Guest Intake: ${fileName}`,
        isDocument: true
      }
    ]);

    try {
      const parsed: UploadedDocument | null = await uploadGuestDocument(file);
      if (!parsed) throw new Error("No response data from server");

      let safetyLevel = "CLEAR";
      if (
        parsed.safety_clearance_status === "ATTENTION_NEEDED" ||
        (parsed.clinical_notes_found && parsed.clinical_notes_found.length > 0)
      ) {
        safetyLevel = "CONTRAINDICATION_ALERT";
      }

      let responseText = `**Document Read & Organized:** \`${parsed.filename}\`\n\n`;
      responseText += `**Quick Summary:**\n${parsed.extracted_summary}\n\n`;

      if (parsed.associated_guest_name) {
        responseText += `• **Guest Name:** ${parsed.associated_guest_name}\n`;
      }
      if (parsed.clinical_notes_found && parsed.clinical_notes_found.length > 0) {
        responseText += `• ⚠️ **Health Notes Found:**\n${parsed.clinical_notes_found.map((n: string) => `  - ${n}`).join("\n")}\n`;
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
            "Draft friendly email to guest regarding medical history",
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

  const toggleVoiceRecognition = () => {
    if (typeof window === "undefined") return;

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onerror: (e: unknown) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
      webkitSpeechRecognition?: new () => {
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onresult: (e: { results: Array<Array<{ transcript: string }>> }) => void;
        onerror: (e: unknown) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
      };
    };

    const SpeechRecClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecClass) {
      alert("Voice speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      const currentRec = recognitionRef.current as { stop?: () => void } | null;
      if (currentRec && typeof currentRec.stop === "function") {
        currentRec.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecClass();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (e: { results: Array<Array<{ transcript: string }>> }) => {
        const transcript = e.results[0][0].transcript;
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

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
    b2b_sales: [
      "Draft partnership agreement for luxury Manhattan Pilates studio",
      "Calculate 15% partner thank-you commission for functional medicine clinic",
      "Draft executive wellness retreat proposal for 12 corporate leaders",
      "Write outreach email to Beverly Hills integrative cardiology practice"
    ],
    chef_hospitality: [
      "Create Private Chef allergy chart (Celiac, Onion/Garlic-free, Vegan, Seed-Oil-Free)",
      "Plan 7-day seed-oil-free healthy menu for Nosara retreat",
      "Draft local organic farm shopping list for retreat chef",
      "Create evening relaxing herbal tea and elixir pairing"
    ],
    clinical_safety: [
      "Check guest health notes for heart rate & nut allergies (Nurse recommendations)",
      "Check morning guest wellness score (Sleep 2/10, Energy 2/10)",
      "Cold plunge safety protocol: gentle warming if guest feels dizzy",
      "Emergency medical freeze and hospital handover steps"
    ],
    wellness_safety: [
      "Check guest health notes for heart rate & nut allergies (Nurse recommendations)",
      "Check morning guest wellness score (Sleep 2/10, Energy 2/10)",
      "Cold plunge safety protocol: gentle warming if guest feels dizzy",
      "Emergency medical freeze and hospital handover steps"
    ],
    spreadsheet_crm: [
      "Add a new guest row for Sarah Jenkins in retreat spreadsheet",
      "Add new partner lead for Align Pilates NYC with 15% commission",
      "Show all guests arriving in the next 14 days",
      "Export retreat spreadsheet to Excel / CSV for arrival team"
    ],
    itinerary_curation: [
      "Group delayed airport arrivals into luxury van pickups (<=35 min wait)",
      "Check private jet luggage weight & pilot duty hours",
      "Move outdoor beach session to indoor Sound Dome if rain forecast > 90%",
      "Check 6-month passport validity for international guests"
    ],
    travel_concierge: [
      "Group delayed airport arrivals into luxury van pickups (<=35 min wait)",
      "Check private jet luggage weight & pilot duty hours",
      "Move outdoor beach session to indoor Sound Dome if rain forecast > 90%",
      "Provide emergency organic clothing set if airline loses luggage"
    ],
    concierge_prep: [
      "Draft warm welcome email for Sarah Jenkins (Nosara retreat)",
      "Review guest intentions and rest goals for Eleanor Vance",
      "What are the top 3 talking points for executives who need deep rest?",
      "Explain the intimate 12–14 guest restorative experience"
    ],
    consult_prep: [
      "Draft consultation email for Sarah Jenkins (Nosara retreat)",
      "Draft consultation follow-up for Eleanor Vance (Executive Burnout)",
      "What are the top 3 talking points for hesitant executives?",
      "Explain the intimate 12–14 guest restorative experience"
    ],
    studio_ops: [
      "Show our trusted local suppliers in Nosara",
      "Add a new supplier: Pacific Alchemy sound bowls in Nosara, 15% commission",
      "Explain KAI Vendor & Supplier Directory",
      "Explain how founder review keeps all communications safe",
      "What is the booking status for our upcoming 12–14 guest groups?"
    ]
  };

  const PILLAR_MODES: Array<{
    id: CopilotMode;
    label: string;
    icon: React.ElementType;
    badge: string;
  }> = [
    { id: "omniscient", label: "✨ All-in-One (All Areas)", icon: Sparkles, badge: "All Areas Active" },
    { id: "executive_finance", label: "💰 Billing & Invoices", icon: DollarSign, badge: "Buyouts & Payments" },
    { id: "travel_logistics", label: "✈️ Flights & Airport Rides", icon: Plane, badge: "Flights & Drivers" },
    { id: "chef_hospitality", label: "🍽️ Private Chef & Meals", icon: Utensils, badge: "Allergies & Menus" },
    { id: "b2b_sales", label: "🤝 Partner Studios", icon: Briefcase, badge: "15% Commissions" },
    { id: "clinical_safety", label: "🩺 Guest Health Safety", icon: HeartPulse, badge: "Nurse Care" },
    { id: "spreadsheet_crm", label: "👥 Guest Spreadsheet", icon: Table, badge: "Guest Rows" },
    { id: "studio_ops", label: "🌿 Sanctuary Operations", icon: Building, badge: "Retreat Capacities" },
  ];

  const QUICK_COMMAND_CHIPS = [
    { label: "/finance", hint: "Villa buyouts & payment schedules", icon: DollarSign },
    { label: "/radar", hint: "Flight tracking & driver schedules", icon: Plane },
    { label: "/chef", hint: "Allergy charts & healthy menus", icon: Utensils },
    { label: "/b2b", hint: "Studio partnership proposals & 15% commissions", icon: Briefcase },
    { label: "/clinical", hint: "Health check & gentle care tips", icon: HeartPulse },
    { label: "/attendee", hint: "Add guest to spreadsheet", icon: Table },
    { label: "/book", hint: "Check room prices & dates", icon: Sparkles },
    { label: "/vendor", hint: "Trusted local suppliers", icon: Building },
    { label: "/draft", hint: "Warm welcome email to guest", icon: Mail },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl h-full bg-stone-900 border-l border-stone-800 shadow-2xl flex flex-col text-stone-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-800 bg-stone-950/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                Retreat Operations Assistant
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                  All-in-One Helper
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Billing · Flights & Rides · Partner Studios · Private Chef · Guest Health Safety
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fluid Business Pillar Ribbon */}
        <div className="flex items-center gap-1.5 p-2 bg-stone-950/90 border-b border-stone-800/80 text-[11px] font-medium overflow-x-auto no-scrollbar">
          {PILLAR_MODES.map((pm) => {
            const Icon = pm.icon;
            const isMatch =
              activeMode === pm.id ||
              (pm.id === "clinical_safety" && activeMode === "wellness_safety") ||
              (pm.id === "travel_logistics" && (activeMode === "itinerary_curation" || activeMode === "travel_concierge")) ||
              (pm.id === "concierge_prep" && activeMode === "consult_prep");

            return (
              <button
                key={pm.id}
                onClick={() => setActiveMode(pm.id)}
                className={`py-1.5 px-2.5 rounded-lg whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isMatch
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-xs"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-transparent"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{pm.label}</span>
              </button>
            );
          })}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-stone-950/40 border-b border-stone-800/60 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold shrink-0">
            {activeMode === "omniscient" ? "Popular Requests:" : "Helpful Prompts:"}
          </span>
          {(QUICK_PROMPTS[activeMode] || QUICK_PROMPTS.omniscient).map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="text-xs px-2.5 py-1 rounded-md bg-stone-800/80 hover:bg-amber-500/20 hover:text-amber-200 border border-stone-700/60 text-stone-300 transition-colors shrink-0 flex items-center gap-1"
            >
              <span>{prompt}</span>
              <ArrowRight className="w-3 h-3 text-stone-500" />
            </button>
          ))}
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"
                }`}
            >
              <div
                className={`max-w-[92%] rounded-2xl p-4 text-xs leading-relaxed ${m.sender === "user"
                    ? "bg-amber-600/90 text-stone-50 rounded-br-none"
                    : "bg-stone-950/80 border border-stone-800 text-stone-200 rounded-bl-none shadow-sm"
                  }`}
              >
                {/* Health Safety & System Response Header */}
                {m.sender === "copilot" && (
                  <div className="mb-2.5 flex items-center justify-between gap-2 flex-wrap">
                    {m.safety_level === "CONTRAINDICATION_ALERT" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 border border-rose-500/40 text-rose-400">
                        <AlertTriangle className="w-3 h-3" />
                        Health Note · Review with Nurse Kareena Before Confirming
                      </span>
                    ) : m.safety_level === "MODERATE_REVIEW" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        Gentle Adjustment Suggested for Guest Comfort
                      </span>
                    ) : m.safety_level === "CLEAR" && m.safety_screened ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        Health Safety Check Passed
                      </span>
                    ) : <span />}

                    {m.latency_ms !== undefined && (
                      <span className="text-[9px] font-mono text-stone-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400" />
                        Ready in {(m.latency_ms / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                )}

                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans space-y-2">
                  {m.text}
                </div>

                {/* Founder Approval Card (100% Founder-Approved) */}
                {m.form_fill_proposal && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                        <span>Review &amp; Approval Required</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
                        {m.proposal_authorized ? "Approved by You" : "Ready for Review"}
                      </span>
                    </div>

                    <div className="text-xs font-serif font-semibold text-stone-100">
                      {m.form_fill_proposal.form_title || m.form_fill_proposal.action_title}
                    </div>

                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      {m.form_fill_proposal.summary}
                    </p>

                    <div className="pt-2 flex items-center gap-2">
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
                            <span>Approved by You</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Review &amp; Approve This Update</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Citations & Evidence */}
                {m.citations && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex items-center gap-1.5 text-[10px] text-stone-400">
                    <BookOpen className="w-3 h-3 text-amber-400" />
                    <span>Based on: {m.citations.join(" · ")}</span>
                  </div>
                )}

                {/* Specialized Reactive In-Message Action Buttons */}
                {m.sender === "copilot" && (
                  <div className="mt-3 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Buyout / Installment / Margins */}
                      {(m.text.includes("Buyout") || m.text.includes("Deposit") || m.text.includes("Installment") || m.text.includes("Folio")) && (
                        <button
                          onClick={() => copyToClipboard(m.text, idx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-medium transition-colors"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Copy Billing Summary</span>
                        </button>
                      )}

                      {/* WhatsApp / Chauffeur Run-Sheet */}
                      {(m.text.includes("Chauffeur") || m.text.includes("WhatsApp") || m.text.includes("Wave") || m.text.includes("Flight") || m.text.includes("Driver")) && (
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
                          <span>Copy Driver Schedule for WhatsApp</span>
                        </button>
                      )}

                      {/* Dietary Matrix / Allergens */}
                      {(m.text.includes("Dietary") || m.text.includes("Allergen") || m.text.includes("Banquet Matrix") || m.text.includes("Seed-Oil-Free") || m.text.includes("Menu")) && (
                        <button
                          onClick={() => {
                            const printWin = window.open("", "_blank");
                            if (printWin) {
                              printWin.document.write(`<html><head><title>KAI Private Chef Dietary & Allergy Chart</title><style>body{font-family:sans-serif;padding:24px;line-height:1.5;color:#1c1917;}table{border-collapse:collapse;width:100%;margin-top:16px;}th,td{border:1px solid #d6d3d1;padding:8px;text-align:left;}th{background:#f5f5f4;}</style></head><body><h1>KAI Sanctuary · Private Chef Dietary & Allergy Chart</h1><pre style="white-space:pre-wrap;font-family:inherit;">${m.text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`);
                              printWin.document.close();
                              printWin.print();
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-300 text-[11px] font-medium transition-colors"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print Dietary &amp; Allergy Chart</span>
                        </button>
                      )}

                      {/* B2B Syndicate */}
                      {(m.text.includes("Syndicate") || m.text.includes("Commission") || m.text.includes("B2B") || m.text.includes("Partner")) && (
                        <button
                          onClick={() => copyToClipboard(m.text, idx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[11px] font-medium transition-colors"
                        >
                          <Briefcase className="w-3 h-3" />
                          <span>Copy Partnership Proposal</span>
                        </button>
                      )}

                      {/* Clinical Safety / Contraindication */}
                      {(m.safety_screened || m.text.includes("Clinical") || m.text.includes("Contraindication") || m.text.includes("Health")) && (
                        <button
                          onClick={() => copyToClipboard(m.text, idx)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-medium transition-colors"
                        >
                          <HeartPulse className="w-3 h-3" />
                          <span>Copy Health Care Note</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => copyToClipboard(m.text, idx)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] transition-colors"
                      >
                        {copiedIdx === idx ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
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

              {/* Suggested Followups */}
              {m.suggested_followups && m.suggested_followups.length > 0 && (
                <div className="mt-2 pl-2 flex flex-wrap gap-1.5">
                  {m.suggested_followups.map((f, fIdx) => (
                    <button
                      key={fIdx}
                      onClick={() => handleSend(f)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-stone-900 border border-stone-700 hover:border-amber-500/40 text-stone-400 hover:text-amber-300 transition-colors"
                    >
                      ↳ {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80 py-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Calculating exact pricing, flight schedules, and retreat details...</span>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80 py-2">
              <Upload className="w-4 h-4 animate-bounce" />
              <span>Reading your document for guest notes, dietary requests, and flight times...</span>
            </div>
          )}
        </div>

        {/* Quick Slash-Command Action Bar */}
        <div className="px-4 py-2 bg-stone-950/80 border-t border-stone-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono text-amber-400/80 uppercase font-semibold shrink-0 mr-1 flex items-center gap-1">
            <Command className="w-3 h-3 text-amber-400" />
            <span>Shortcuts:</span>
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
                }}
                className="px-2 py-1 rounded-md bg-stone-900 hover:bg-amber-500/20 hover:text-amber-300 border border-stone-800 hover:border-amber-500/40 text-[11px] font-mono text-stone-300 flex items-center gap-1 transition-colors shrink-0"
                title={chip.hint}
              >
                <Icon className="w-3 h-3 text-amber-400/70" />
                <span>{chip.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input Bar with Voice, Tools & File Attachment */}
        <div className="p-4 border-t border-stone-800 bg-stone-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            {/* Hidden File Input for PDF / CSV / Image */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
              className="hidden"
            />

            {/* Paperclip Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || loading}
              title="Upload guest intake PDF, doctor note, voucher, or CSV spreadsheet"
              className="p-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700/80 text-stone-400 hover:text-amber-300 transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Microphone Button (Speech Recognition) */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                title={isListening ? "Listening... click to stop" : "Click to speak"}
                className={`p-2.5 rounded-xl border transition-colors ${isListening
                    ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse"
                    : "bg-stone-900 hover:bg-stone-800 border-stone-700/80 text-stone-400 hover:text-amber-300"
                  }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Agentic Tools Dropdown */}
            <select
              value={selectedTool}
              onChange={(e) => {
                const tool = e.target.value;
                setSelectedTool(tool);
                if (tool !== "chat") {
                  const msgWithoutCmd = inputMessage.replace(/^\/\w+\s*/, "");
                  setInputMessage(`${tool} ${msgWithoutCmd}`);
                } else {
                  setInputMessage(inputMessage.replace(/^\/\w+\s*/, ""));
                }
              }}
              className="pl-3 pr-8 py-2.5 text-xs bg-stone-900 border border-stone-700/80 rounded-xl text-stone-200 focus:outline-none focus:border-amber-500/50 appearance-none cursor-pointer shrink-0"
              style={{ backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23a8a29e%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px top 50%', backgroundSize: '8px auto' }}
            >
              <option value="chat">💬 Chat with Assistant</option>
              <option value="/finance">💰 /finance · Villa Buyouts &amp; Payments</option>
              <option value="/radar">✈️ /radar · Flights &amp; Driver Pickups</option>
              <option value="/chef">🍽️ /chef · Allergy Charts &amp; Chef Menus</option>
              <option value="/b2b">🤝 /b2b · Partner Studios &amp; Commissions</option>
              <option value="/clinical">🩺 /clinical · Nurse Health Check &amp; Safety</option>
              <option value="/book">📋 /book · Room Prices &amp; Dates</option>
              <option value="/attendee">👥 /attendee · Add Guest to Spreadsheet</option>
              <option value="/vendor">🏬 /vendor · Trusted Local Suppliers</option>
              <option value="/draft">📝 /draft · Warm Welcome Email</option>
              <option value="/route">🗺️ /route · Scenic Driving Routes</option>
              <option value="/weather">🌤️ /weather · Local Weather Forecast</option>
            </select>

            {/* Text Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => {
                setInputMessage(e.target.value);
                if (!e.target.value.startsWith("/") && selectedTool !== "chat") {
                  setSelectedTool("chat");
                }
              }}
              placeholder={
                activeMode === "executive_finance"
                  ? "Calculate villa buyout, 30% deposit, or payment plan..."
                  : activeMode === "travel_logistics"
                    ? "Check flight arrivals, airport drivers, or scenic driving routes..."
                    : activeMode === "chef_hospitality"
                      ? "Create allergy-safe menus, local produce lists, or tea elixirs..."
                      : activeMode === "b2b_sales"
                        ? "Draft partnership proposals, 15% commissions, or group rates..."
                        : activeMode === "clinical_safety"
                          ? "Check guest health considerations, medications, or gentle breathwork..."
                          : activeMode === "spreadsheet_crm"
                            ? "Add guest row, lookup reservation, or check room assignment..."
                            : "Ask a question in plain English, or type a shortcut like /finance, /radar, /chef..."
              }
              className="flex-1 px-3.5 py-2.5 text-xs bg-stone-900 border border-stone-700/80 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || uploading || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <p className="text-[10px] text-stone-500 text-center mt-2">
            Protected by Review · Nothing is sent without your approval · 100% in your control
          </p>
        </div>
      </div>
    </div>
  );
}
