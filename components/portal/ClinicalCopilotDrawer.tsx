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
  Clock
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
}

export type CopilotMode =
  | "wellness_safety"
  | "itinerary_curation"
  | "concierge_prep"
  | "studio_ops"
  | "clinical_safety"
  | "consult_prep"
  | "travel_concierge";

export default function ClinicalCopilotDrawer({
  isOpen,
  onClose,
  guestContext
}: ClinicalCopilotDrawerProps) {
  const [activeMode, setActiveMode] = useState<CopilotMode>("wellness_safety");
  const [inputMessage, setInputMessage] = useState("");
  const [selectedTool, setSelectedTool] = useState("chat");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<unknown>(null);

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
      text: "**Welcome, Kareena.** I am your AI Chief of Staff & Wellness Concierge.\n\nI am here to support you with restorative wellness intentions, curated travel logistics, preferred Tern supplier partnerships, scenic chauffeur transit, microclimate sun windows, and pre-arrival guest itineraries. Clinical contraindication screening is an elevated safety module whenever specialized medical flags arise.\n\nAll operational actions and communications require your direct review and authorization."
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
        if (lower.includes("ai chief of staff") || lower.includes("clinical somatic assistant") || lower.includes("i am here to support you")) return false;
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
            console.warn("SSE stream failed, attempting synchronous copilot fallback:", err);
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
                console.error("Fallback copilot failed:", fallbackErr);
                setMessages((prev) => {
                  const lastIdx = prev.length - 1;
                  if (lastIdx < 0) return prev;
                  const copy = [...prev];
                  copy[lastIdx] = {
                    sender: "copilot",
                    text: "I encountered a momentary connection issue. Please ensure the KAI API service is running.",
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
            text: "I encountered a momentary connection issue. Please ensure the KAI API service is running.",
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
    // Add user note that file is uploading
    setMessages((prev) => [
      ...prev,
      {
        sender: "user",
        text: `📎 Uploaded Document for Clinical Intake: ${fileName}`,
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

      let responseText = `**Document Ingested & Clinically Analyzed:** \`${parsed.filename}\`\n\n`;
      responseText += `**Executive Summary:**\n${parsed.extracted_summary}\n\n`;

      if (parsed.associated_guest_name) {
        responseText += `• **Guest Identified:** ${parsed.associated_guest_name}\n`;
      }
      if (parsed.clinical_notes_found && parsed.clinical_notes_found.length > 0) {
        responseText += `• ⚠️ **Health Considerations Detected:**\n${parsed.clinical_notes_found.map((n: string) => `  - ${n}`).join("\n")}\n`;
      }
      if (parsed.travel_details_found && parsed.travel_details_found.length > 0) {
        responseText += `• **Travel Manifest Notes:**\n${parsed.travel_details_found.map((t: string) => `  - ${t}`).join("\n")}\n`;
      }

      responseText += `\n*Screened under Kareena Islam BSN, RN clinical oversight guidelines.*`;

      setMessages((prev) => [
        ...prev,
        {
          sender: "copilot",
          text: responseText,
          safety_level: safetyLevel,
          citations: ["Clinical Document Parsing", "Vagal Nerve Safety Standards"],
          suggested_followups: [
            `Create gentle adaptation for ${parsed.associated_guest_name || "this guest"}`,
            "Draft empathetic inquiry to guest regarding medical history",
            "Screen for cold plunge and breathwork compatibility"
          ]
        }
      ]);
    } catch (err) {
      console.error("Document upload failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "copilot",
          text: `⚠️ **Document Analysis Notice**: Could not process \`${fileName}\`. Please ensure it is a PDF, PNG, JPG, or CSV under 10MB.`,
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
          title: "KAI Clinical Care Note",
          text: text
        });
      } catch {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("Note copied to clipboard!");
    }
  };

  const QUICK_PROMPTS: Record<string, string[]> = {
    wellness_safety: [
      "Curate: Nervous system restorative protocol & sleep optimization",
      "Review 4-7-8 vagal breathing & 432Hz acoustic grounding",
      "Elevated Screen: Guest with epilepsy requesting rapid breathwork",
      "Elevated Screen: Pregnant guest (1st trimester) requesting Finnish sauna"
    ],
    clinical_safety: [
      "Screen: Guest with epilepsy requesting rapid breathwork",
      "Screen: Guest with Raynaud's syndrome requesting cold plunge",
      "Screen: Pregnant guest (1st trimester) requesting Finnish sauna",
      "Review clinical mechanism of 4-7-8 vagal breathing"
    ],
    itinerary_curation: [
      "Calculate scenic transit from airport to private villa",
      "What is the microclimate weather and breathwork window today in Nosara?",
      "Find nourishing Blue Zone and plant-forward dining in Nosara",
      "Coordinate Grand Travel & Cruise air desk for lie-flat routing"
    ],
    travel_concierge: [
      "Show our active chauffeur partners in Nosara",
      "Calculate scenic transit from airport to villa",
      "What is the microclimate weather and breathwork window today in Nosara?",
      "Find gluten-free and Blue Zone dining spots in Nosara",
      "Search luxury pre-retreat hotels near Costa Rica (SJO/LIR)"
    ],
    concierge_prep: [
      "Draft restorative welcome email for Sarah Jenkins (Nosara Reset)",
      "Review guest intake and intentions for Eleanor Vance",
      "What are the top 3 talk tracks for hesitant executives seeking deep rest?",
      "Explain 12–14 guest intimate group restorative experience"
    ],
    consult_prep: [
      "Draft consultation email for Sarah Jenkins (Nosara Reset)",
      "Draft consultation follow-up for Eleanor Vance (Executive Burnout)",
      "What are the top 3 talk tracks for hesitant executives?",
      "Explain 12–14 guest intimate group safety"
    ],
    studio_ops: [
      "Show our registered preferred suppliers in Nosara",
      "Add a new vendor: Pacific Alchemy sound bowls in Nosara, 15% commission",
      "Explain Tern Back Office Vendor & Supplier Registry",
      "Explain Personalized Founder Approval (Zero Autonomous Writes)",
      "What is the status of our upcoming 12–14 guest retreat groups?"
    ]
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl h-full bg-stone-900 border-l border-stone-800 shadow-2xl flex flex-col text-stone-200">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 bg-stone-950/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif text-stone-100 flex items-center gap-2">
                AI Chief of Staff & Wellness Concierge
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
                  KAI Brain
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Kareena Islam · Restorative Wellness, Curated Travel & Founder Ops
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

        {/* 4 Mode Tabs */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-stone-950/90 border-b border-stone-800/80 text-[11px] font-medium">
          <button
            onClick={() => setActiveMode("wellness_safety")}
            className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
              activeMode === "wellness_safety" || activeMode === "clinical_safety"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Wellness & Safety</span>
          </button>

          <button
            onClick={() => setActiveMode("itinerary_curation")}
            className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
              activeMode === "itinerary_curation" || activeMode === "travel_concierge"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Travel & Itinerary</span>
          </button>

          <button
            onClick={() => setActiveMode("concierge_prep")}
            className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
              activeMode === "concierge_prep" || activeMode === "consult_prep"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Concierge & Intake</span>
          </button>

          <button
            onClick={() => setActiveMode("studio_ops")}
            className={`py-2 px-1 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
              activeMode === "studio_ops"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900"
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Sanctuary Ops</span>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-3 bg-stone-950/40 border-b border-stone-800/60 overflow-x-auto flex items-center gap-2 no-scrollbar">
          <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold shrink-0">
            Suggested:
          </span>
          {(QUICK_PROMPTS[activeMode] || QUICK_PROMPTS.wellness_safety).map((prompt, idx) => (
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
                        HEALTH CONSIDERATION ALERT (FOUNDER REVIEW REQUIRED)
                      </span>
                    ) : m.safety_level === "MODERATE_REVIEW" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 border border-amber-500/40 text-amber-300">
                        <AlertTriangle className="w-3 h-3" />
                        CLINICAL MODIFICATION RECOMMENDED
                      </span>
                    ) : m.safety_level === "CLEAR" && m.safety_screened ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-3 h-3" />
                        CLINICAL CLEARANCE VERIFIED
                      </span>
                    ) : <span />}

                    {m.latency_ms !== undefined && (
                      <span className="text-[9px] font-mono text-stone-400 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-amber-400" />
                        {(m.latency_ms / 1000).toFixed(1)}s{m.model_used ? ` · ${m.model_used}` : ""}
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
                        <span>Founder Review Required</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
                        {m.proposal_authorized ? "Authorized" : "Action Staged"}
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
                            <span>Authorized by Founder</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Review & Approve Proposal</span>
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
                    <span>Protocols: {m.citations.join(" · ")}</span>
                  </div>
                )}

                {/* Copy / Share Actions for Copilot Messages */}
                {m.sender === "copilot" && (
                  <div className="mt-3 pt-2 border-t border-stone-800 flex justify-end items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(m.text, idx)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] transition-colors"
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
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] transition-colors"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>Share</span>
                    </button>
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
              <span>Synthesizing clinical knowledge, routes & travel inventory...</span>
            </div>
          )}

          {uploading && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80 py-2">
              <Upload className="w-4 h-4 animate-bounce" />
              <span>Analyzing document for health considerations & travel notes...</span>
            </div>
          )}
        </div>

        {/* Input Bar with Voice & File Attachment */}
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
              title="Upload intake PDF, doctor note, voucher, or CSV manifest"
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
              <option value="chat">Chat</option>
              <option value="/sales">💰 Sales</option>
              <option value="/screen">🩺 Screen</option>
              <option value="/draft">📝 Draft</option>
              <option value="/route">🗺️ Route</option>
              <option value="/weather">🌤️ Weather</option>
              <option value="/vendors">🏬 Vendors</option>
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
                activeMode === "clinical_safety"
                  ? "Screen guest medical conditions or symptoms..."
                  : activeMode === "consult_prep"
                    ? "Ask about a guest's care plan, draft an email, or consult prep..."
                    : activeMode === "travel_concierge"
                      ? "Ask about routes, weather windows, dining, reviews..."
                      : "Ask about tools, retreat groups, or operations..."
              }
              className="flex-1 px-3.5 py-2.5 text-xs bg-stone-900 border border-stone-700/80 rounded-xl text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
            />

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || uploading || !inputMessage.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          <p className="text-[10px] text-stone-500 text-center mt-2">
            Founder Sanctuary Studio · Clinical Voice & Intake Parser Active · Personalized Founder Approval Enforced
          </p>
        </div>
      </div>
    </div>
  );
}
