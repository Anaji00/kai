"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  ArrowUp,
  AlertTriangle,
  ShieldCheck,
  Check,
  Copy,
  BookOpen,
  ArrowRight,
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
  Table,
  Printer,
  Phone,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Plus,
  ChevronDown,
  PanelLeft,
  PanelRight,
  Database,
  Edit3,
  SquarePen,
  AudioLines,
  Zap,
  UserPlus,
  CheckCheck,
} from "lucide-react";
import {
  chatWithCopilot,
  chatWithCopilotStream,
  uploadGuestDocument,
  executeCopilotCrmAction,
  fetchCopilotCrmSnapshot,
  CopilotCrmSnapshot,
  fetchAiAutomationPlaybooks,
  executeAiAutomationPlaybook,
  AIAutomationPlaybookItem,
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

export type CopilotViewSize = "widget" | "sidebar" | "fullscreen";

interface ClinicalCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  guestContext?: Record<string, unknown>;
  initialQuery?: string;
  initialMode?: CopilotMode;
}

interface MessageItem {
  id: string;
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
  tool_calls?: Array<Record<string, unknown>>;
}

interface ConversationThread {
  id: string;
  title: string;
  updatedAt: string;
  messages: MessageItem[];
}

const PILLAR_MODES: Array<{
  id: CopilotMode;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  description: string;
}> = [
  { id: "omniscient", label: "KAI 4o", shortLabel: "KAI 4o", icon: Sparkles, description: "All operations & live CRM" },
  { id: "spreadsheet_crm", label: "CRM Records", shortLabel: "CRM", icon: Database, description: "Clients, rooms & payments" },
  { id: "executive_finance", label: "Finance & Folios", shortLabel: "Finance", icon: DollarSign, description: "30/70 deposits & buyouts" },
  { id: "travel_logistics", label: "Flights & Transfers", shortLabel: "Flights", icon: Plane, description: "Airport arrivals & drivers" },
  { id: "chef_hospitality", label: "Chef & Dietary", shortLabel: "Chef", icon: Utensils, description: "Allergies & menu matrix" },
  { id: "b2b_sales", label: "Partner Studios", shortLabel: "Partners", icon: Briefcase, description: "Referrals & group buyouts" },
];

const CHATGPT_STARTER_CARDS = [
  {
    title: "Update guest room or status",
    subtitle: "Change suite, payment, or booking status",
    prompt: "Update Eleanor Vance's room tier to Private Cliffside Plunge Villa and mark status as CONFIRMED",
    icon: Database,
  },
  {
    title: "Add new guest booking",
    subtitle: "Create guest & trip with deposit",
    prompt: "Add a new guest Sophia Laurent to Nosara in an Oceanfront King Suite with a $4,350 deposit paid",
    icon: UserPlus,
  },
  {
    title: "Airport pickup manifest",
    subtitle: "Group flights & driver schedule",
    prompt: "Group delayed airport arrivals into luxury van pickups and build the chauffeur manifest for Nosara",
    icon: Plane,
  },
  {
    title: "Chef dietary & allergy matrix",
    subtitle: "Guest allergies & menu preferences",
    prompt: "Create the Private Chef allergy-safe dietary matrix for Nosara",
    icon: Utensils,
  },
];

const QUICK_SLASH_ACTIONS = [
  { cmd: "/crm", label: "Update Guest", prompt: "Update Eleanor Vance's dietary notes to Gluten-free, seed-oil-free, no shellfish" },
  { cmd: "/book", label: "Quote Stay", prompt: "Calculate 6-night stay for Marcus Sterling at Amalfi in a Private Cliffside Villa" },
  { cmd: "/finance", label: "Buyout Quote", prompt: "Calculate villa buyout and 30/70 payment breakdown for 14 guests at Nosara" },
  { cmd: "/radar", label: "Driver Sheet", prompt: "/radar Generate airport chauffeur manifest for Nosara" },
  { cmd: "/chef", label: "Chef List", prompt: "/chef Build Private Chef dietary & allergen matrix for Nosara" },
  { cmd: "/approve", label: "Approve Queue", prompt: "Approve all pending drafts in the Action Review Queue" },
];

/**
 * Clean minimalist Markdown renderer for ChatGPT-style typography
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] font-mono text-[11px] text-neutral-200"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{tok}</React.Fragment>;
  });
}

function renderCleanMarkdown(rawText: string): React.ReactNode {
  if (!rawText) return null;
  const lines = rawText.split("\n");
  const elements: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={idx} className="h-2" />);
      return;
    }
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={idx} className="text-[13px] font-semibold text-white tracking-tight mt-3 mb-1">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={idx} className="text-sm font-semibold text-white tracking-tight mt-3.5 mb-1">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith("• ") || trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      elements.push(
        <div key={idx} className="flex items-start gap-2 pl-1 py-0.5 text-[13px] leading-relaxed text-neutral-200">
          <span className="text-neutral-500 select-none mt-1 text-[10px]">●</span>
          <div className="flex-1">{renderInlineMarkdown(trimmed.slice(2))}</div>
        </div>
      );
      return;
    }
    elements.push(
      <p key={idx} className="text-[13px] leading-relaxed text-neutral-200">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  return <div className="space-y-1">{elements}</div>;
}

export default function ClinicalCopilotDrawer({
  isOpen,
  onClose,
  guestContext,
  initialQuery,
  initialMode,
}: ClinicalCopilotDrawerProps) {
  const [activeMode, setActiveMode] = useState<CopilotMode>(initialMode || "omniscient");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);

  // Expandable 3-tier View State: "widget" (compact 420x640) | "sidebar" (docked tall) | "fullscreen" (full ChatGPT workspace)
  const [viewSize, setViewSize] = useState<CopilotViewSize>("widget");
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "crm" | "playbooks">("crm");

  // Inline CRM Inspector Drawer (for widget / sidebar modes too)
  const [showInlineCrmDrawer, setShowInlineCrmDrawer] = useState(false);
  const [crmSnapshot, setCrmSnapshot] = useState<CopilotCrmSnapshot | null>(null);
  const [loadingSnapshot, setLoadingSnapshot] = useState(false);
  const [editingGuestName, setEditingGuestName] = useState("");
  const [editingEmail, setEditingEmail] = useState("");
  const [editingSanctuary, setEditingSanctuary] = useState("nosara");
  const [editingRoomTier, setEditingRoomTier] = useState("Private Villa Sanctuary");
  const [editingStatus, setEditingStatus] = useState("CONFIRMED");
  const [editingAmountPaid, setEditingAmountPaid] = useState("");
  const [editingDietary, setEditingDietary] = useState("");
  const [editingHealthNotes, setEditingHealthNotes] = useState("");
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [quickEditFeedback, setQuickEditFeedback] = useState<string | null>(null);

  // AI Automation Playbooks
  const [playbooks, setPlaybooks] = useState<AIAutomationPlaybookItem[]>([]);
  const [runningPlaybookCode, setRunningPlaybookCode] = useState<string | null>(null);

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [executingProposalIdx, setExecutingProposalIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

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

  const [threads, setThreads] = useState<ConversationThread[]>([
    {
      id: "thread_default",
      title: "Current Session",
      updatedAt: "Just now",
      messages: [],
    },
  ]);
  const [activeThreadId, setActiveThreadId] = useState("thread_default");

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread.messages;

  const setMessages = useCallback(
    (updater: MessageItem[] | ((prev: MessageItem[]) => MessageItem[])) => {
      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id !== activeThreadId) return t;
          const nextMsgs = typeof updater === "function" ? updater(t.messages) : updater;
          const firstUser = nextMsgs.find((m) => m.sender === "user");
          const nextTitle = firstUser
            ? firstUser.text.slice(0, 34) + (firstUser.text.length > 34 ? "…" : "")
            : t.title;
          return {
            ...t,
            title: nextTitle,
            updatedAt: "Just now",
            messages: nextMsgs,
          };
        })
      );
    },
    [activeThreadId]
  );

  const loadCrmSnapshotData = useCallback(async () => {
    setLoadingSnapshot(true);
    try {
      const snap = await fetchCopilotCrmSnapshot();
      if (snap) {
        setCrmSnapshot(snap);
      }
    } catch (e) {
      console.warn("Could not load CRM snapshot:", e);
    } finally {
      setLoadingSnapshot(false);
    }
  }, []);

  const loadPlaybooksData = useCallback(async () => {
    try {
      const res = await fetchAiAutomationPlaybooks();
      if (res?.playbooks) {
        setPlaybooks(res.playbooks);
      }
    } catch (e) {
      console.warn("Could not load AI playbooks:", e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCrmSnapshotData();
      loadPlaybooksData();
    }
  }, [isOpen, loadCrmSnapshotData, loadPlaybooksData]);

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

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  };

  // Start a fresh ChatGPT conversation thread
  const handleNewChat = () => {
    const newId = `thread_${Date.now()}`;
    const newThread: ConversationThread = {
      id: newId,
      title: "New conversation",
      updatedAt: "Just now",
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newId);
    setInputMessage("");
    setTimeout(() => textareaRef.current?.focus(), 60);
  };

  // Populate Quick CRM Editor from an existing client/trip
  const selectRecordForQuickEdit = (clientName: string) => {
    const client = crmSnapshot?.clients.find(
      (c) => c.full_name.toLowerCase() === clientName.toLowerCase()
    );
    const trip = crmSnapshot?.trips.find(
      (t) => t.client_name.toLowerCase() === clientName.toLowerCase()
    );
    setEditingGuestName(client?.full_name || trip?.client_name || clientName);
    setEditingEmail(client?.email || "");
    setEditingSanctuary(trip?.sanctuary_slug || "nosara");
    setEditingRoomTier(trip?.room_tier || "Private Villa Sanctuary");
    setEditingStatus(trip?.status || "CONFIRMED");
    setEditingAmountPaid(trip ? String(trip.amount_paid || 0) : "");
    setEditingDietary(client?.dietary_requirements || "");
    setEditingHealthNotes(client?.health_notes || "");
    setQuickEditFeedback(null);
    setShowInlineCrmDrawer(true);
  };

  // Save Quick Edit directly to CRM Database
  const handleSaveQuickCrmEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGuestName.trim()) return;
    setSavingQuickEdit(true);
    setQuickEditFeedback(null);
    try {
      const fields: Record<string, unknown> = {
        client_name: editingGuestName.trim(),
        sanctuary_slug: editingSanctuary,
        room_tier: editingRoomTier,
        status: editingStatus,
      };
      if (editingEmail.trim()) fields.email = editingEmail.trim();
      if (editingAmountPaid.trim() && !isNaN(Number(editingAmountPaid))) {
        fields.amount_paid = Number(editingAmountPaid);
      }
      if (editingDietary.trim()) fields.dietary_requirements = editingDietary.trim();
      if (editingHealthNotes.trim()) fields.health_notes = editingHealthNotes.trim();

      const res = await executeCopilotCrmAction({
        form_type: "crm_mutation",
        action_type: "update_crm_record",
        sanctuary_slug: editingSanctuary,
        fields,
      });

      setQuickEditFeedback(res.summary || `Saved ${editingGuestName} to CRM.`);
      await loadCrmSnapshotData();

      // Also append a confirmation bubble into the active chat
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}`,
          sender: "copilot",
          text: `**✓ CRM Record Synchronized** (\`${res.record_id || "crm_sync"}\`)\n\n${res.summary || `Updated ${editingGuestName} in KAI Sanctuary CRM.`}`,
          form_fill_proposal: {
            form_type: "crm_mutation",
            form_title: res.title || `CRM Updated · ${editingGuestName}`,
            action_title: res.title || `CRM Updated · ${editingGuestName}`,
            target_url: "/portal/crm",
            fields,
            summary: res.summary || `Updated ${editingGuestName}`,
            executed: true,
            entity_type: res.entity_type || "CRMClient & CRMTrip",
            record_id: res.record_id || "crm_sync",
            changes: res.changes || fields,
          },
          proposal_authorized: true,
        },
      ]);
    } catch (err) {
      setQuickEditFeedback(
        `Error: ${err instanceof Error ? err.message : "Could not save CRM record"}`
      );
    } finally {
      setSavingQuickEdit(false);
    }
  };

  // Execute a Playbook directly from the Assistant
  const handleRunPlaybook = async (pb: AIAutomationPlaybookItem) => {
    setRunningPlaybookCode(pb.playbook_code);
    try {
      const res = await executeAiAutomationPlaybook(pb.playbook_code, "puerto-vallarta-2027");
      await loadCrmSnapshotData();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("crm-updated"));
        window.dispatchEvent(new Event("drafts-updated"));
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_u`,
          sender: "user",
          text: `Run Playbook #${pb.scenario_number}: ${pb.title}`,
        },
        {
          id: `msg_${Date.now()}_c`,
          sender: "copilot",
          text: `### ✓ Executed Playbook #${pb.scenario_number}: ${pb.title}\n\n${res.ai_copilot_briefing}\n\n• **Target**: ${res.target}\n• **Staged Drafts**: ${res.staged_draft_ids?.length ? res.staged_draft_ids.map((d) => `#${d}`).join(", ") : "Synchronized"}`,
          latency_ms: res.execution_latency_ms,
          suggested_followups: [
            "Approve all pending drafts in the Action Review Queue",
            "Show updated CRM records",
          ],
        },
      ]);
      if (viewSize === "fullscreen") {
        setSidebarTab("chats");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_${Date.now()}_err`,
          sender: "copilot",
          text: `⚠️ **Playbook Execution Error**: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setRunningPlaybookCode(null);
    }
  };

  // Text-To-Speech helper
  const speakResponse = useCallback(
    (text: string) => {
      if (!voiceVolumeEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
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
    },
    [voiceVolumeEnabled]
  );

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  // Speech Recognition
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

  // Send Message Handler
  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? inputMessage).trim();
    if (!query || loading) return;

    stopSpeaking();
    stopListening();
    setShowPlusMenu(false);

    const userMsg: MessageItem = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: query,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLiveVoiceTranscript("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setLoading(true);

    const convHistory = messages
      .filter((m) => m.text && !m.isDocument)
      .slice(-4)
      .map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      }));

    const currentPath = typeof window !== "undefined" ? window.location.pathname : undefined;
    let accumulatedText = "";

    const assistantMsgId = `copilot_${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        sender: "copilot",
        text: "",
        safety_level: undefined,
        safety_screened: false,
        citations: [],
        suggested_followups: [],
        form_fill_proposal: undefined,
        proposal_authorized: false,
      },
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
            const prop = meta.form_fill_proposal;
            if (prop?.executed && typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("crm-updated", { detail: prop }));
              window.dispatchEvent(new CustomEvent("intakes-updated", { detail: prop }));
              loadCrmSnapshotData();
            }
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
                form_fill_proposal: prop || copy[lastIdx].form_fill_proposal,
                proposal_authorized: Boolean(prop?.executed),
                sanctuary_slug: meta.sanctuary_slug || copy[lastIdx].sanctuary_slug,
                latency_ms: meta.latency_ms,
                model_used: meta.model_used,
                tool_calls: meta.tool_calls,
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
                if (directResp.form_fill_proposal?.executed && typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("crm-updated", { detail: directResp.form_fill_proposal }));
                  loadCrmSnapshotData();
                }
                setMessages((prev) => {
                  const lastIdx = prev.length - 1;
                  if (lastIdx < 0) return prev;
                  const copy = [...prev];
                  copy[lastIdx] = {
                    ...copy[lastIdx],
                    text: directResp.response_text || "Request processed.",
                    safety_level: directResp.safety_level,
                    safety_screened: directResp.safety_screened,
                    citations: directResp.citations,
                    suggested_followups: directResp.suggested_followups,
                    form_fill_proposal: directResp.form_fill_proposal,
                    proposal_authorized: Boolean(directResp.form_fill_proposal?.executed),
                    sanctuary_slug: directResp.sanctuary_slug,
                    latency_ms: directResp.latency_ms,
                    tool_calls: directResp.tool_calls,
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
                    ...copy[lastIdx],
                    text: `⚠️ **Connection Notice**: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`,
                    safety_level: "CLEAR",
                  };
                  return copy;
                });
              }
            }
            setLoading(false);
          },
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
    setShowPlusMenu(false);

    try {
      const parsed = await uploadGuestDocument(file);
      if (!parsed) {
        throw new Error("Unable to parse document payload.");
      }

      const safetyLevel =
        parsed.safety_clearance_status === "ATTENTION_NEEDED"
          ? "CONTRAINDICATION_ALERT"
          : "CLEAR";

      let responseText = `### Document Parsed · \`${fileName}\`\n\n`;
      if (parsed.associated_guest_name) {
        responseText += `• **Guest Name**: ${parsed.associated_guest_name}\n`;
      }
      if (parsed.extracted_summary) {
        responseText += `• **Summary**: ${parsed.extracted_summary}\n`;
      }
      if (parsed.clinical_notes_found && parsed.clinical_notes_found.length > 0) {
        responseText += `• **Health & Dietary Notes**: ${parsed.clinical_notes_found.join("; ")}\n`;
      }
      if (parsed.travel_details_found && parsed.travel_details_found.length > 0) {
        responseText += `• **Travel & Flight Notes**: ${parsed.travel_details_found.join("; ")}\n`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `doc_${Date.now()}`,
          sender: "copilot",
          text: responseText,
          safety_level: safetyLevel,
          citations: ["Guest Care Guidelines", "Nervous System Safety Standards"],
          suggested_followups: [
            `Update ${parsed.associated_guest_name || "guest"}'s CRM profile with these notes`,
            `Create gentle schedule for ${parsed.associated_guest_name || "this guest"}`,
          ],
        },
      ]);
    } catch (err) {
      console.error("Document upload failed:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `doc_err_${Date.now()}`,
          sender: "copilot",
          text: `⚠️ **Document Notice**: Could not read \`${fileName}\`. Please verify it is a PDF, PNG, JPG, or CSV under 10MB.`,
          safety_level: "CLEAR",
        },
      ]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
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
        await navigator.share({ title: "KAI Sanctuary Note", text });
      } catch {
        navigator.clipboard.writeText(text);
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  // Direct In-Place Execution of any CRM Action Proposal without leaving the chat
  const handleExecuteProposalInPlace = async (proposal: FormFillProposal, idx: number) => {
    setExecutingProposalIdx(idx);
    try {
      const res = await executeCopilotCrmAction({
        form_type: proposal.form_type,
        action_type: proposal.action_type || "update_crm_record",
        target_id: proposal.target_id,
        fields: proposal.fields,
        payload: proposal.payload,
      });

      dispatchFormFill({ ...proposal, executed: true });
      await loadCrmSnapshotData();

      setMessages((prev) => {
        const copy = [...prev];
        if (copy[idx]) {
          copy[idx] = {
            ...copy[idx],
            proposal_authorized: true,
            form_fill_proposal: {
              ...proposal,
              executed: true,
              entity_type: res.entity_type || proposal.entity_type || "CRMRecord",
              record_id: res.record_id || proposal.record_id || "crm_sync",
              changes: res.changes || proposal.changes || proposal.fields,
              summary: res.summary || proposal.summary,
            },
          };
        }
        return copy;
      });
    } catch (err) {
      console.error("Failed to execute CRM proposal:", err);
      // Still dispatch on form bus as fallback
      dispatchFormFill(proposal);
      setMessages((prev) => {
        const copy = [...prev];
        if (copy[idx]) {
          copy[idx] = { ...copy[idx], proposal_authorized: true };
        }
        return copy;
      });
    } finally {
      setExecutingProposalIdx(null);
    }
  };

  const handleOpenProposalPage = (proposal: FormFillProposal) => {
    dispatchFormFill(proposal);
    if (proposal.target_url && typeof window !== "undefined") {
      window.location.assign(proposal.target_url);
    }
  };

  if (!isOpen) return null;

  const currentModeObj = PILLAR_MODES.find((m) => m.id === activeMode) || PILLAR_MODES[0];

  // Dynamic sizing classes for the 3 expandable modes
  const containerLayoutClasses =
    viewSize === "fullscreen"
      ? "fixed inset-2 sm:inset-4 md:inset-6 rounded-2xl sm:rounded-3xl"
      : viewSize === "sidebar"
      ? "fixed top-3 bottom-3 right-3 w-full sm:w-[520px] rounded-2xl sm:rounded-3xl"
      : "fixed bottom-0 right-0 sm:bottom-5 sm:right-5 w-full sm:w-[420px] h-[88vh] sm:h-[640px] max-h-[88vh] rounded-t-3xl sm:rounded-3xl";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 pointer-events-none">
        {/* Subtle dim backdrop only in Fullscreen mode */}
        {viewSize === "fullscreen" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setViewSize("widget")}
            className="fixed inset-0 bg-black/65 backdrop-blur-xs pointer-events-auto z-40"
          />
        )}

        {/* Main Expandable ChatGPT Container */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.96, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 18 }}
          transition={{ type: "spring", damping: 30, stiffness: 360 }}
          className={`pointer-events-auto bg-[#0D0D0D] border border-white/[0.09] text-neutral-100 flex overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.85)] z-50 font-sans ${containerLayoutClasses}`}
        >
          {/* ============================================================== */}
          {/* COLLAPSIBLE LEFT SIDEBAR (Visible in Fullscreen Workspace)     */}
          {/* ============================================================== */}
          {viewSize === "fullscreen" && showLeftSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="w-[280px] shrink-0 bg-[#141414] border-r border-white/[0.07] flex flex-col select-none"
            >
              {/* Sidebar Top Header */}
              <div className="p-3 flex items-center justify-between border-b border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-neutral-100 transition-colors cursor-pointer"
                >
                  <SquarePen className="w-3.5 h-3.5 text-neutral-300" />
                  <span>New chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeftSidebar(false)}
                  className="ml-2 p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Hide sidebar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Mode Switcher: Live CRM Records | Playbooks | Threads */}
              <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarTab("crm")}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    sidebarTab === "crm"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]"
                  }`}
                >
                  CRM Records ({crmSnapshot?.counts.clients ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("playbooks")}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    sidebarTab === "playbooks"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]"
                  }`}
                >
                  Playbooks ({playbooks.length || 8})
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarTab("chats")}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    sidebarTab === "chats"
                      ? "bg-white text-black font-semibold"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]"
                  }`}
                >
                  Chats
                </button>
              </div>

              {/* Sidebar Content Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sidebarTab === "crm" && (
                  <>
                    <div className="flex items-center justify-between px-1 pb-1">
                      <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                        Click Any Guest to Touch/Edit
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGuestName("");
                          setEditingEmail("");
                          setEditingAmountPaid("");
                          setEditingDietary("");
                          setEditingHealthNotes("");
                          setShowInlineCrmDrawer(true);
                        }}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New</span>
                      </button>
                    </div>

                    {loadingSnapshot && !crmSnapshot ? (
                      <div className="text-xs text-neutral-500 py-6 text-center">
                        Loading CRM records…
                      </div>
                    ) : (
                      crmSnapshot?.trips.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => selectRecordForQuickEdit(t.client_name)}
                          className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.06] transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-medium text-neutral-100 truncate">
                              {t.client_name}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                                t.status === "CONFIRMED"
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                            {t.sanctuary_slug} · {t.room_tier}
                          </div>
                          <div className="flex items-center justify-between mt-1.5 text-[10px] text-neutral-500 font-mono">
                            <span>Paid: ${t.amount_paid.toLocaleString()}</span>
                            <span className="text-neutral-300 group-hover:text-white flex items-center gap-0.5">
                              <Edit3 className="w-2.5 h-2.5" /> Edit
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </>
                )}

                {sidebarTab === "playbooks" && (
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold px-1">
                      1-Click Sanctuary Automations
                    </div>
                    {playbooks.map((pb) => {
                      const isRunning = runningPlaybookCode === pb.playbook_code;
                      return (
                        <button
                          key={pb.id}
                          type="button"
                          disabled={isRunning}
                          onClick={() => handleRunPlaybook(pb)}
                          className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer disabled:opacity-50"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] font-mono text-emerald-400">
                              Scenario #{pb.scenario_number}
                            </span>
                            <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                              {isRunning ? (
                                <RefreshCw className="w-3 h-3 animate-spin text-white" />
                              ) : (
                                <Zap className="w-3 h-3 text-amber-400" />
                              )}
                              {isRunning ? "Running…" : "Execute"}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-neutral-100 mt-0.5 line-clamp-1">
                            {pb.title}
                          </div>
                          <div className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">
                            {pb.trigger_condition}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {sidebarTab === "chats" && (
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold px-1 pb-1">
                      Recent Sessions
                    </div>
                    {threads.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setActiveThreadId(t.id)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer truncate ${
                          t.id === activeThreadId
                            ? "bg-white/[0.1] text-white font-medium"
                            : "text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.04]"
                        }`}
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sidebar Footer: Live DB Telemetry */}
              <div className="p-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>CRM Connected</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") window.location.assign("/portal/crm");
                  }}
                  className="text-neutral-300 hover:text-white underline underline-offset-2 cursor-pointer"
                >
                  Open CRM
                </button>
              </div>
            </motion.aside>
          )}

          {/* ============================================================== */}
          {/* MAIN CHATGPT CONVERSATION COLUMN                               */}
          {/* ============================================================== */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0D0D0D] relative">
            {/* Minimalist ChatGPT Header Bar */}
            <header className="h-13 px-3.5 border-b border-white/[0.07] flex items-center justify-between gap-2 shrink-0 select-none bg-[#0D0D0D]/90 backdrop-blur-md z-20">
              {/* Left: Sidebar Toggle + Model Selector Dropdown (`KAI 4o v`) */}
              <div className="flex items-center gap-1.5 relative">
                {viewSize === "fullscreen" && !showLeftSidebar && (
                  <button
                    type="button"
                    onClick={() => setShowLeftSidebar(true)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Open sidebar"
                  >
                    <PanelLeft className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowModeDropdown((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.06] transition-colors cursor-pointer text-sm font-semibold text-neutral-100"
                >
                  <span>{currentModeObj.shortLabel}</span>
                  <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-md bg-white/[0.07] text-neutral-300">
                    CRM Live
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </button>

                {/* Minimalist ChatGPT Model/Pillar Popover */}
                <AnimatePresence>
                  {showModeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.97 }}
                      transition={{ duration: 0.14 }}
                      className="absolute top-11 left-0 w-72 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] shadow-2xl p-1.5 z-50"
                    >
                      <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        KAI Intelligence Mode
                      </div>
                      {PILLAR_MODES.map((pm) => {
                        const Icon = pm.icon;
                        const selected = pm.id === activeMode;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => {
                              setActiveMode(pm.id);
                              setShowModeDropdown(false);
                            }}
                            className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                              selected ? "bg-white/[0.09] text-white" : "text-neutral-300 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-white/[0.06] text-neutral-200">
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div className="truncate">
                                <div className="text-xs font-medium text-neutral-100 truncate">
                                  {pm.label}
                                </div>
                                <div className="text-[10px] text-neutral-400 truncate">
                                  {pm.description}
                                </div>
                              </div>
                            </div>
                            {selected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Controls: New Chat, Quick CRM Touch, Size Toggle (Widget / Sidebar / Fullscreen), Close */}
              <div className="flex items-center gap-1">
                {/* New Chat */}
                <button
                  type="button"
                  onClick={handleNewChat}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="New chat"
                >
                  <SquarePen className="w-4 h-4" />
                </button>

                {/* Quick CRM Record Touch Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setShowInlineCrmDrawer((prev) => !prev)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    showInlineCrmDrawer
                      ? "bg-white text-black"
                      : "text-neutral-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1]"
                  }`}
                  title="Directly touch or edit any CRM record"
                >
                  <Database className="w-3 h-3" />
                  <span className="hidden sm:inline">Touch CRM</span>
                </button>

                {/* Docked Tall Sidebar Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setViewSize((prev) => (prev === "sidebar" ? "widget" : "sidebar"))
                  }
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewSize === "sidebar"
                      ? "text-white bg-white/[0.1]"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                  title={viewSize === "sidebar" ? "Restore compact widget" : "Dock as tall sidecar"}
                >
                  <PanelRight className="w-4 h-4" />
                </button>

                {/* Expand Fullscreen Workspace Toggle */}
                <button
                  type="button"
                  onClick={() =>
                    setViewSize((prev) => (prev === "fullscreen" ? "widget" : "fullscreen"))
                  }
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title={viewSize === "fullscreen" ? "Collapse to widget" : "Expand to fullscreen workspace"}
                >
                  {viewSize === "fullscreen" ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>

                {/* Close */}
                <button
                  type="button"
                  onClick={() => {
                    stopListening();
                    stopSpeaking();
                    setIsVoiceMode(false);
                    onClose();
                  }}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* ============================================================== */}
            {/* INLINE LIVE CRM QUICK EDITOR DRAWER (Slide-down overlay)       */}
            {/* ============================================================== */}
            <AnimatePresence>
              {showInlineCrmDrawer && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-white/[0.09] bg-[#141414] overflow-hidden shrink-0 z-10"
                >
                  <form onSubmit={handleSaveQuickCrmEdit} className="p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs font-semibold text-white">
                          Direct CRM Record Touch &amp; Quick Editor
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowInlineCrmDrawer(false)}
                        className="text-[11px] text-neutral-400 hover:text-white cursor-pointer"
                      >
                        Close
                      </button>
                    </div>

                    {/* Existing Guest Selector Pills */}
                    {crmSnapshot && crmSnapshot.clients.length > 0 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-[10px] text-neutral-500 shrink-0">Select guest:</span>
                        {crmSnapshot.clients.slice(0, 8).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => selectRecordForQuickEdit(c.full_name)}
                            className={`px-2 py-0.5 rounded-full text-[11px] whitespace-nowrap border transition-colors cursor-pointer ${
                              editingGuestName.toLowerCase() === c.full_name.toLowerCase()
                                ? "bg-white text-black border-white font-medium"
                                : "bg-white/[0.04] text-neutral-300 border-white/[0.08] hover:bg-white/[0.08]"
                            }`}
                          >
                            {c.full_name}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-0.5">
                          Guest Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={editingGuestName}
                          onChange={(e) => setEditingGuestName(e.target.value)}
                          placeholder="e.g. Eleanor Vance"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-0.5">
                          Sanctuary Cohort
                        </label>
                        <select
                          value={editingSanctuary}
                          onChange={(e) => setEditingSanctuary(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white/30"
                        >
                          <option value="nosara">Nosara, Costa Rica</option>
                          <option value="amalfi">Amalfi Coast, Italy</option>
                          <option value="bali">Uluwatu, Bali</option>
                          <option value="riviera-maya">Riviera Maya, Mexico</option>
                          <option value="puerto-vallarta-2027">Puerto Vallarta 2027</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-0.5">
                          Suite / Room Tier
                        </label>
                        <select
                          value={editingRoomTier}
                          onChange={(e) => setEditingRoomTier(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white/30"
                        >
                          <option value="Private Villa Sanctuary">Private Villa Sanctuary</option>
                          <option value="Oceanfront King Suite">Oceanfront King Suite</option>
                          <option value="Private Cliffside Plunge Villa">Private Cliffside Plunge Villa</option>
                          <option value="Two-Bedroom Oceanfront Penthouse Villa">Two-Bedroom Penthouse Villa</option>
                          <option value="Shared Ocean Pavilion">Shared Ocean Pavilion</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-0.5">
                          Booking Status
                        </label>
                        <select
                          value={editingStatus}
                          onChange={(e) => setEditingStatus(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white/30"
                        >
                          <option value="CONFIRMED">CONFIRMED</option>
                          <option value="DEPOSIT_PAID">DEPOSIT_PAID</option>
                          <option value="WAITLIST_PRIORITY">WAITLIST_PRIORITY</option>
                          <option value="INQUIRY">INQUIRY</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-0.5">
                          Amount Paid ($ USD)
                        </label>
                        <input
                          type="number"
                          value={editingAmountPaid}
                          onChange={(e) => setEditingAmountPaid(e.target.value)}
                          placeholder="e.g. 4350"
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white/30"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-neutral-400 mb-0.5">
                          Dietary / Allergies
                        </label>
                        <input
                          type="text"
                          value={editingDietary}
                          onChange={(e) => setEditingDietary(e.target.value)}
                          placeholder="Celiac, seed-oil-free..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0D0D] border border-white/[0.1] text-xs text-white focus:outline-none focus:border-white/30"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-emerald-400 truncate">
                        {quickEditFeedback || "Writes directly to SQLite CRMClient, CRMTrip & StagingIntake."}
                      </span>
                      <button
                        type="submit"
                        disabled={savingQuickEdit || !editingGuestName.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-200 disabled:opacity-40 text-black text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {savingQuickEdit ? "Saving…" : "Save to CRM"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* VOICE MODE OR MINIMALIST CHATGPT STREAM                        */}
            {/* ============================================================== */}
            {isVoiceMode ? (
              <div className="flex-1 flex flex-col items-center justify-between p-8 bg-[#0D0D0D] select-none">
                <div className="text-center space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
                    {isSpeaking ? "KAI Speaking" : isListening ? "Listening" : "Voice Mode Ready"}
                  </span>
                  <h3 className="text-base font-medium text-white">KAI Realtime Voice</h3>
                </div>

                {/* Minimalist ChatGPT Breathing Circle Orb */}
                <div
                  onClick={toggleVoiceListening}
                  className="relative flex items-center justify-center my-auto cursor-pointer"
                >
                  <motion.div
                    animate={{
                      scale: isSpeaking
                        ? [1, 1.35, 1.08, 1.28, 1]
                        : isListening
                        ? [1, 1.18, 1.04, 1.15, 1]
                        : [1, 1.04, 1],
                      opacity: isSpeaking ? [0.35, 0.7, 0.35] : [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-48 h-48 rounded-full bg-white/20 blur-2xl pointer-events-none"
                  />
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    animate={{
                      scale: isSpeaking ? [1, 1.1, 0.96, 1.06, 1] : isListening ? [1, 1.06, 1] : [1, 1.02, 1],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="w-28 h-28 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_60px_rgba(255,255,255,0.3)]"
                  >
                    {isSpeaking ? (
                      <AudioLines className="w-9 h-9 animate-pulse" />
                    ) : isListening ? (
                      <Mic className="w-9 h-9 animate-bounce" />
                    ) : (
                      <MicOff className="w-8 h-8 text-neutral-500" />
                    )}
                  </motion.div>
                </div>

                <div className="w-full max-w-md text-center space-y-4">
                  <p className="text-xs text-neutral-300 min-h-10 flex items-center justify-center px-4">
                    {liveVoiceTranscript
                      ? `“${liveVoiceTranscript}”`
                      : "Tap the circle and ask KAI to update any CRM record, check flights, or screen guest health."}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setVoiceVolumeEnabled((v) => !v)}
                      className="p-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-neutral-200 transition-colors cursor-pointer"
                    >
                      {voiceVolumeEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleVoiceListening}
                      className="px-5 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-neutral-200 transition-colors cursor-pointer"
                    >
                      {isListening ? "Stop" : "Speak"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        stopListening();
                        stopSpeaking();
                        setIsVoiceMode(false);
                      }}
                      className="px-4 py-2 rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-xs text-neutral-200 transition-colors cursor-pointer"
                    >
                      Exit Voice
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation Stream */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
                  <div className={`mx-auto ${viewSize === "fullscreen" ? "max-w-2xl" : "w-full"} space-y-5`}>
                    {/* ====================================================== */}
                    {/* MINIMALIST CHATGPT EMPTY STATE                         */}
                    {/* ====================================================== */}
                    {messages.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="py-6 sm:py-10 flex flex-col items-center text-center space-y-6"
                      >
                        <div className="w-11 h-11 rounded-full bg-white/[0.07] border border-white/[0.1] flex items-center justify-center shadow-inner">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>

                        <div className="space-y-1">
                          <h2 className="text-lg sm:text-xl font-medium tracking-tight text-white">
                            How can I help?
                          </h2>
                          <p className="text-xs text-neutral-400">
                            Update guests, rooms, payments, flights, or dietary notes.
                          </p>
                        </div>

                        {/* 2x2 Minimalist Starter Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left">
                          {CHATGPT_STARTER_CARDS.map((card, i) => {
                            const Icon = card.icon;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSend(card.prompt)}
                                className="p-3 rounded-2xl bg-[#161616] hover:bg-[#1F1F1F] border border-white/[0.07] hover:border-white/[0.15] transition-all group cursor-pointer flex flex-col justify-between gap-1.5"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-neutral-100 group-hover:text-white">
                                    {card.title}
                                  </span>
                                  <Icon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors" />
                                </div>
                                <span className="text-[11px] text-neutral-400 leading-snug line-clamp-1">
                                  {card.subtitle}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Live CRM Status Bar */}
                        {crmSnapshot && (
                          <div className="w-full pt-1 flex items-center justify-between px-3.5 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] text-neutral-400">
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              <span>
                                <strong className="text-neutral-200">{crmSnapshot.counts.clients}</strong> guests ·{" "}
                                <strong className="text-neutral-200">{crmSnapshot.counts.trips}</strong> bookings
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setShowInlineCrmDrawer(true)}
                              className="text-white hover:underline font-medium cursor-pointer"
                            >
                              Quick Edit →
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      /* ====================================================== */
                      /* ACTIVE MESSAGE STREAM                                  */
                      /* ====================================================== */
                      messages.map((m, idx) => (
                        <motion.div
                          key={m.id || idx}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                          className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
                        >
                          {m.sender === "user" ? (
                            <div className="max-w-[85%] rounded-3xl rounded-br-md bg-[#262626] text-neutral-100 px-4 py-2.5 text-[13px] leading-relaxed">
                              {m.text}
                            </div>
                          ) : (
                            <div className="w-full space-y-2.5">
                              {/* Assistant Header Badges */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="w-5 h-5 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center">
                                  <Sparkles className="w-2.5 h-2.5 text-white" />
                                </div>
                                <span className="text-xs font-medium text-neutral-300">KAI</span>

                                {m.latency_ms !== undefined && (
                                  <span className="text-[10px] font-mono text-neutral-500 ml-auto flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" />
                                    {(m.latency_ms / 1000).toFixed(1)}s
                                  </span>
                                )}
                              </div>

                              {/* Clean Formatted Response Body */}
                              <div className="pl-7">{renderCleanMarkdown(m.text)}</div>

                              {/* Interactive CRM Record Mutation / Action Proposal Card */}
                              {m.form_fill_proposal && (
                                <div className="ml-7 mt-2 p-3 rounded-2xl bg-[#161616] border border-white/[0.1] space-y-2">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-white truncate">
                                      <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span className="truncate">
                                        {m.form_fill_proposal.action_title || m.form_fill_proposal.form_title}
                                      </span>
                                    </div>
                                    <span
                                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                                        m.form_fill_proposal.executed || m.proposal_authorized
                                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                                          : "bg-white/[0.08] text-neutral-300"
                                      }`}
                                    >
                                      {m.form_fill_proposal.executed || m.proposal_authorized
                                        ? "✓ Saved"
                                        : "Pending"}
                                    </span>
                                  </div>

                                  {/* Key-Value Diff Grid of Touched Fields (Simplified Plain English for Non-Technical Staff) */}
                                  {(m.form_fill_proposal.changes || m.form_fill_proposal.fields) && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {Object.entries(
                                        m.form_fill_proposal.changes || m.form_fill_proposal.fields || {}
                                      )
                                        .filter(
                                          ([k, v]) =>
                                            v !== undefined &&
                                            v !== null &&
                                            v !== "" &&
                                            k !== "action_type" &&
                                            k !== "raw_instruction" &&
                                            k !== "action_subtype" &&
                                            k !== "entity_type" &&
                                            !k.includes("id")
                                        )
                                        .slice(0, 5)
                                        .map(([k, v]) => {
                                          const friendlyKey: Record<string, string> = {
                                            client_name: "Guest",
                                            guest: "Guest",
                                            room_tier: "Suite",
                                            status: "Status",
                                            sanctuary_slug: "Sanctuary",
                                            sanctuary: "Sanctuary",
                                            dietary_requirements: "Dietary",
                                            amount_paid: "Deposit Paid",
                                            payment_recorded: "Paid",
                                            remaining_balance: "Balance Due",
                                            total_investment: "Total",
                                            approved_drafts_count: "Approved",
                                          };
                                          const label = friendlyKey[k] || k.replace(/_/g, " ");
                                          return (
                                            <div
                                              key={k}
                                              className="px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-[10px]"
                                            >
                                              <span className="text-neutral-400 mr-1">{label}:</span>
                                              <span className="text-neutral-100 font-medium">
                                                {String(v)}
                                              </span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  )}

                                  <div className="pt-0.5 flex flex-wrap items-center gap-2">
                                    {!(m.form_fill_proposal.executed || m.proposal_authorized) ? (
                                      <button
                                        type="button"
                                        disabled={executingProposalIdx === idx}
                                        onClick={() => handleExecuteProposalInPlace(m.form_fill_proposal!, idx)}
                                        className="px-3 py-1 rounded-xl bg-white hover:bg-neutral-200 text-black text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                                      >
                                        {executingProposalIdx === idx ? (
                                          <>
                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                            <span>Saving…</span>
                                          </>
                                        ) : (
                                          <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>1-Click Save to CRM</span>
                                          </>
                                        )}
                                      </button>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        Saved to CRM
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const fields = m.form_fill_proposal?.fields || {};
                                        const gName = String(
                                          fields.client_name || fields.name || fields.guest_name || ""
                                        );
                                        selectRecordForQuickEdit(gName);
                                      }}
                                      className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-200 text-[11px] transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit</span>
                                    </button>

                                    {m.form_fill_proposal.target_url && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenProposalPage(m.form_fill_proposal!)}
                                        className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-neutral-300 text-[11px] transition flex items-center gap-1 cursor-pointer ml-auto"
                                      >
                                        <span>Open CRM</span>
                                        <ArrowRight className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Subtle Action Row (Copy, Share, Print, WhatsApp, Sources) */}
                              {m.text && (
                                <div className="pl-7 pt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(m.text, idx)}
                                    className="hover:text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {copiedIdx === idx ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                    <span>{copiedIdx === idx ? "Copied" : "Copy"}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => shareContent(m.text)}
                                    className="hover:text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    <Share2 className="w-3 h-3" />
                                    <span>Share</span>
                                  </button>

                                  {(m.text.includes("Chauffeur") || m.text.includes("Flight")) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (typeof window !== "undefined") {
                                          window.open(`https://wa.me/?text=${encodeURIComponent(m.text)}`, "_blank");
                                        }
                                      }}
                                      className="hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Phone className="w-3 h-3" />
                                      <span>WhatsApp Driver</span>
                                    </button>
                                  )}

                                  {(m.text.includes("Dietary") || m.text.includes("Chef")) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const printWin = window.open("", "_blank");
                                        if (printWin) {
                                          printWin.document.write(
                                            `<html><head><title>KAI Private Chef Matrix</title><style>body{font-family:sans-serif;padding:24px;}</style></head><body><h2>KAI Private Chef Dietary Matrix</h2><pre style="white-space:pre-wrap;font-family:inherit;">${m.text
                                              .replace(/</g, "&lt;")
                                              .replace(/>/g, "&gt;")}</pre></body></html>`
                                          );
                                          printWin.document.close();
                                          printWin.print();
                                        }
                                      }}
                                      className="hover:text-neutral-200 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3 h-3" />
                                      <span>Print Chart</span>
                                    </button>
                                  )}

                                  {m.citations && m.citations.length > 0 && (
                                    <span className="flex items-center gap-1 text-[10px] text-neutral-500 ml-auto truncate max-w-[240px]">
                                      <BookOpen className="w-3 h-3 shrink-0" />
                                      <span className="truncate">{m.citations[0]}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Follow-up Suggestion Pills */}
                              {m.suggested_followups && m.suggested_followups.length > 0 && (
                                <div className="pl-7 pt-1 flex flex-wrap gap-1.5">
                                  {m.suggested_followups.slice(0, 3).map((f, fIdx) => (
                                    <button
                                      key={fIdx}
                                      type="button"
                                      onClick={() => handleSend(f)}
                                      className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))
                    )}

                    {/* Minimalist Thinking Pulse */}
                    {loading && (
                      <div className="flex items-center gap-2 pl-1 text-xs text-neutral-400">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>Thinking…</span>
                      </div>
                    )}

                    {uploading && (
                      <div className="flex items-center gap-2 pl-1 text-xs text-neutral-400">
                        <Upload className="w-3.5 h-3.5 animate-bounce text-white" />
                        <span>Reading document…</span>
                      </div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* ============================================================== */}
                {/* SIGNATURE CHATGPT BOTTOM COMPOSER PILL                         */}
                {/* ============================================================== */}
                <div className="px-3.5 pb-3 pt-1.5 bg-[#0D0D0D] shrink-0">
                  <div className={`mx-auto ${viewSize === "fullscreen" ? "max-w-2xl" : "w-full"} relative`}>
                    {/* Popover `+` Quick Action & Attachment Menu */}
                    <AnimatePresence>
                      {showPlusMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.14 }}
                          className="absolute bottom-16 left-0 w-64 rounded-2xl bg-[#1A1A1A] border border-white/[0.1] shadow-2xl p-1.5 z-40 space-y-0.5"
                        >
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:bg-white/[0.07] transition-colors cursor-pointer"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-neutral-400" />
                            <span>Upload intake PDF, CSV or note</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setShowPlusMenu(false);
                              setShowInlineCrmDrawer(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-neutral-200 hover:bg-white/[0.07] transition-colors cursor-pointer"
                          >
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Touch / Edit CRM Record Inline</span>
                          </button>
                          <div className="border-t border-white/[0.07] my-1 pt-1 px-2 text-[10px] uppercase tracking-wider text-neutral-500">
                            Quick Commands
                          </div>
                          {QUICK_SLASH_ACTIONS.map((qa) => (
                            <button
                              key={qa.cmd}
                              type="button"
                              onClick={() => {
                                setShowPlusMenu(false);
                                handleSend(qa.prompt);
                              }}
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs text-neutral-300 hover:bg-white/[0.07] hover:text-white transition-colors cursor-pointer"
                            >
                              <span>{qa.label}</span>
                              <code className="text-[10px] font-mono text-neutral-500">{qa.cmd}</code>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 1-Click Hospitality Quick Action Pills for Non-Technical Staff */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 scrollbar-none text-[11px] mb-1.5">
                      {[
                        { label: "✓ Confirm Eleanor", query: "elanor cliffside plunge villa confirm" },
                        { label: "💵 Add Sophia Deposit", query: "add sophia laurent noasra king suite 4350 paid" },
                        { label: "🍽️ Chef Dietary Matrix", query: "chef list allergies nosara" },
                        { label: "🚗 Airport Drivers", query: "nosara driver sheet airport pickups" },
                        { label: "💰 14-Guest Buyout", query: "buyout 14 guests nosara 30/70" },
                        { label: "✅ Approve Drafts", query: "approve all pending drafts" },
                      ].map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => handleSend(chip.query)}
                          disabled={loading}
                          className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-neutral-300 hover:text-white border border-white/[0.08] shrink-0 transition-colors cursor-pointer disabled:opacity-40"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      className="flex items-end gap-1.5 rounded-[26px] bg-[#1E1E1E] border border-white/[0.1] focus-within:border-white/[0.22] px-2.5 py-2 transition-all shadow-lg"
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg,.txt,.csv"
                        className="hidden"
                      />

                      {/* `+` Button (ChatGPT style) */}
                      <button
                        type="button"
                        onClick={() => setShowPlusMenu((prev) => !prev)}
                        disabled={uploading || loading}
                        title="Add attachment or run CRM action"
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                          showPlusMenu
                            ? "bg-white text-black"
                            : "text-neutral-300 hover:text-white hover:bg-white/[0.08]"
                        }`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>

                      {/* Auto-Expanding Multiline Input */}
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
                        placeholder="Message KAI or update any CRM record…"
                        className="flex-1 bg-transparent text-[13px] text-white placeholder-neutral-500 focus:outline-none resize-none py-1 px-1 max-h-32 overflow-y-auto leading-relaxed"
                      />

                      {/* Mic Dictation Button */}
                      {speechSupported && (
                        <button
                          type="button"
                          onClick={toggleVoiceListening}
                          title={isListening ? "Stop dictation" : "Dictate"}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            isListening
                              ? "bg-rose-500/20 text-rose-400 animate-pulse"
                              : "text-neutral-400 hover:text-white hover:bg-white/[0.08]"
                          }`}
                        >
                          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </button>
                      )}

                      {/* Right Button: White Up-Arrow when text is present, or Voice Mode Waveform when empty */}
                      {inputMessage.trim() ? (
                        <button
                          type="submit"
                          disabled={loading || uploading}
                          className="w-8 h-8 rounded-full bg-white hover:bg-neutral-200 disabled:opacity-40 text-black flex items-center justify-center transition-transform active:scale-95 shrink-0 cursor-pointer"
                          title="Send message"
                        >
                          <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsVoiceMode(true);
                            startListening();
                          }}
                          className="w-8 h-8 rounded-full bg-white/[0.1] hover:bg-white/[0.18] text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                          title="Start Realtime Voice Mode"
                        >
                          <AudioLines className="w-4 h-4" />
                        </button>
                      )}
                    </form>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
