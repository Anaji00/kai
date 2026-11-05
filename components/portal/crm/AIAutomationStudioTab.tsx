"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Bot,
  Play,
  Database,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Terminal,
  RefreshCw,
  Send,
  Layers,
  HeartPulse,
  Plane,
  CreditCard,
  Crown,
} from "lucide-react";
import {
  fetchAiAutomationPlaybooks,
  executeAiAutomationPlaybook,
  chatWithCopilot,
  AIAutomationPlaybookItem,
  AIAutomationExecutionItem,
} from "@/lib/sidecar-api";

interface AIAutomationStudioTabProps {
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

const CATEGORIES = [
  { id: "ALL", label: "All 15 AI Playbooks", icon: Layers },
  { id: "CLINICAL_RN_TRIAGE", label: "Clinical RN & Somatic", icon: HeartPulse },
  { id: "COHORT_CRISIS", label: "Cohort Crisis & Weather", icon: ShieldCheck },
  { id: "AVIATION_LOGISTICS", label: "Aviation & Border Gate", icon: Plane },
  { id: "SANCTUARY_PAY_FX", label: "Sanctuary Pay & FX Folios", icon: CreditCard },
  { id: "VIP_CONCIERGE", label: "VIP Concierge & Recovery", icon: Crown },
];

export default function AIAutomationStudioTab({
  onRefresh,
  onNotify,
}: AIAutomationStudioTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [playbooks, setPlaybooks] = useState<AIAutomationPlaybookItem[]>([]);
  const [executions, setExecutions] = useState<AIAutomationExecutionItem[]>([]);
  const [telemetry, setTelemetry] = useState<{
    total_playbooks_configured: number;
    total_automation_runs_logged: number;
    total_copilot_conversations_logged: number;
    journal_mode: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningCode, setRunningCode] = useState<string | null>(null);
  const [selectedSanctuary, setSelectedSanctuary] = useState("puerto-vallarta-2027");

  // Inline AI Chief of Staff & Clinical Copilot Bench
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantMode, setAssistantMode] = useState<
    "clinical_safety" | "travel_concierge" | "consult_prep" | "studio_ops"
  >("clinical_safety");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantReply, setAssistantReply] = useState<{
    text: string;
    safety_level?: string;
    citations?: string[];
    latency_ms?: number;
    model_used?: string;
  } | null>(null);

  const loadPlaybooks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAiAutomationPlaybooks(selectedCategory);
      setPlaybooks(data.playbooks);
      setExecutions(data.recent_executions);
      setTelemetry(data.database_telemetry);
    } catch (err) {
      console.error("Failed to load AI automation playbooks:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    loadPlaybooks();
  }, [loadPlaybooks]);

  const handleRunPlaybook = async (playbookCode: string) => {
    setRunningCode(playbookCode);
    try {
      const res = await executeAiAutomationPlaybook(
        playbookCode,
        selectedSanctuary,
        "Kareena Islam, BSN, RN"
      );
      onNotify(res.ai_copilot_briefing);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("drafts-updated"));
      }
      await loadPlaybooks();
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Playbook execution failed"}`);
    } finally {
      setRunningCode(null);
    }
  };

  const handleRunAllShowcase = async () => {
    setRunningCode("BATCH_SHOWCASE");
    try {
      const topCodes = [
        "SCENARIO_07_CLINICAL_TRIAGE",
        "SCENARIO_21_SOMATIC_PULSE_SPIKE",
        "SCENARIO_23_CHAUFFEUR_CLUSTERING",
        "SCENARIO_25_ALLERGEN_QUARANTINE",
        "SCENARIO_28_WEATHER_SQUALL_PIVOT",
      ];
      for (const code of topCodes) {
        await executeAiAutomationPlaybook(code, selectedSanctuary, "Kareena Islam, BSN, RN");
      }
      onNotify(
        `Executed 5-Scenario AI Automation Stress Showcase across ${selectedSanctuary}. All database logs and Action Review Queue drafts staged.`
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("drafts-updated"));
      }
      await loadPlaybooks();
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Batch showcase failed"}`);
    } finally {
      setRunningCode(null);
    }
  };

  const handleAskInlineAssistant = async (customPrompt?: string) => {
    const q = (customPrompt ?? assistantPrompt).trim();
    if (!q || assistantLoading) return;
    setAssistantLoading(true);
    try {
      const res = await chatWithCopilot(
        q,
        assistantMode,
        undefined,
        selectedSanctuary,
        "/portal/crm"
      );
      setAssistantReply({
        text: res.response_text,
        safety_level: res.safety_level,
        citations: res.citations,
        latency_ms: res.latency_ms,
        model_used: res.model_used,
      });
      await loadPlaybooks();
    } catch (err: unknown) {
      setAssistantReply({
        text: `Notice: ${err instanceof Error ? err.message : "AI Assistant unavailable"}`,
        safety_level: "CLEAR",
      });
    } finally {
      setAssistantLoading(false);
    }
  };

  const exampleAssistantPrompts = [
    "Screen a guest with episodic SVT arrhythmia and severe tree-nut anaphylaxis for Puerto Vallarta",
    "What is our protocol when a guest's morning Somatic Pulse shows Sleep 2/10 and Ease 2/10?",
    "Draft a white-glove suite conflict upgrade note offering a Private Cliffside Plunge Villa + $500 spa credit",
    "Explain how our Gulfstream G650ER weight & balance and FAA Part 135 14-hour crew duty gate works",
  ];

  return (
    <div className="space-y-6">
      {/* Database Telemetry & AI Architecture Header */}
      <div className="bg-stone-900 text-stone-100 p-5 rounded-2xl border border-stone-800 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="font-serif text-xl font-bold text-stone-50">
                  Retreat Staff Assistants &amp; Automation Tools
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  Direct Sanctuary Database
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-1">
                Equipped with 5 specialized Retreat Advisor Roles &amp; 15 One-Touch Workflows to draft guest schedules, coordinate flights, and prepare clinical safety reviews.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <select
              value={selectedSanctuary}
              onChange={(e) => setSelectedSanctuary(e.target.value)}
              className="px-3 py-2 text-xs rounded-lg bg-stone-800 border border-stone-700 text-stone-100 font-semibold"
            >
              <option value="puerto-vallarta-2027">Puerto Vallarta Cohort</option>
              <option value="nosara">Nosara Blue Zone Cohort</option>
              <option value="amalfi">Amalfi Coast Cohort</option>
              <option value="bali">Bali Ubud Cohort</option>
            </select>

            <button
              onClick={handleRunAllShowcase}
              disabled={runningCode !== null}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {runningCode === "BATCH_SHOWCASE"
                  ? "Running 5-Scenario Suite..."
                  : "Run 5-Scenario Stress Showcase"}
              </span>
            </button>
          </div>
        </div>

        {/* Live System Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">
              Automation Recipes
            </span>
            <div className="text-lg font-serif font-bold text-amber-300 mt-0.5">
              {telemetry?.total_playbooks_configured ?? playbooks.length} Workflows
            </div>
            <span className="text-[10px] text-stone-500">Ready for 1-click execution</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">
              Completed Tasks
            </span>
            <div className="text-lg font-serif font-bold text-emerald-400 mt-0.5">
              {telemetry?.total_automation_runs_logged ?? executions.length} Runs Logged
            </div>
            <span className="text-[10px] text-stone-500">Activity history &amp; draft links</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">
              Staff Briefings
            </span>
            <div className="text-lg font-serif font-bold text-blue-400 mt-0.5">
              {telemetry?.total_copilot_conversations_logged ?? 0} Briefings
            </div>
            <span className="text-[10px] text-stone-500">Accurate Guidelines &amp; Exact Math</span>
          </div>

          <div className="p-3 rounded-xl bg-stone-950/80 border border-stone-800">
            <span className="text-[10px] font-mono uppercase text-stone-400 block">
              Review &amp; Approval Safety
            </span>
            <div className="text-lg font-serif font-bold text-stone-100 mt-0.5">
              100% In Your Control
            </div>
            <span className="text-[10px] text-stone-500">Nothing Sent Without Your Approval</span>
          </div>
        </div>

        {/* Inline AI Assistant Console */}
        <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-200">
                Staff Assistant Console
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              {(
                [
                  { id: "clinical_safety", label: "RN Clinical Copilot" },
                  { id: "travel_concierge", label: "Aviation & Weather AI" },
                  { id: "consult_prep", label: "VIP Concierge Drafter" },
                  { id: "studio_ops", label: "Sanctuary CRM Ops Guide" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setAssistantMode(m.id)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors cursor-pointer ${
                    assistantMode === m.id
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-stone-900 text-stone-400 hover:text-stone-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Example Use-Case Prompts */}
          <div className="flex flex-wrap gap-1.5">
            {exampleAssistantPrompts.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setAssistantPrompt(p);
                  handleAskInlineAssistant(p);
                }}
                className="text-[11px] px-2.5 py-1 rounded-md bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition-colors cursor-pointer text-left"
              >
                ↳ {p}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskInlineAssistant();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              placeholder="Ask the AI Assistant to triage a clinical scenario, audit a flight manifest, or draft a recovery voucher..."
              className="flex-1 px-3.5 py-2 text-xs rounded-lg bg-stone-900 border border-stone-700 text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={assistantLoading || !assistantPrompt.trim()}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{assistantLoading ? "Thinking..." : "Ask Assistant"}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {assistantReply && (
            <div className="p-3.5 rounded-xl bg-stone-900/90 border border-stone-700 text-xs text-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  Safety Gate: {assistantReply.safety_level || "VERIFIED"}
                </span>
                {assistantReply.latency_ms !== undefined && (
                  <span className="font-mono text-[10px] text-stone-400">
                    {assistantReply.latency_ms}ms &middot; {assistantReply.model_used || "KAI-Copilot"}
                  </span>
                )}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{assistantReply.text}</div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3.5 rounded-xl border border-[#E5DDD0] shadow-xs">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  active
                    ? "bg-[#2D3E35] text-[#FAF7F2]"
                    : "bg-[#FAF7F2] text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={loadPlaybooks}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] flex items-center space-x-1.5 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Playbooks</span>
        </button>
      </div>

      {/* Playbook Cards Grid (Use-Case Examples & 1-Click Test Runners) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playbooks.map((pb) => {
          const isRunning = runningCode === pb.playbook_code;
          return (
            <div
              key={pb.id}
              className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#2D3E35]/50 transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]">
                    Scenario #{pb.scenario_number} &middot; {pb.category}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                    {pb.total_runs_count} Runs
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-[#2D3E35] leading-snug">
                  {pb.title}
                </h3>

                <div className="text-[11px] font-semibold text-[#C07D63] flex items-center space-x-1">
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span>{pb.assistant_persona}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[11px] text-[#5C6B5E]">
                  <strong className="text-[#2D3E35]">Trigger Use Case:</strong> {pb.trigger_condition}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-semibold text-[#5C6B5E]">
                    Automated Staff Pipeline:
                  </span>
                  <ul className="space-y-1 text-[11px] text-[#2D3E35]">
                    {(pb.automated_actions || []).map((act, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5DDD0]/60 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-[#5C6B5E]">
                  <span className="truncate max-w-[200px]" title={pb.target_endpoint}>
                    POST {pb.target_endpoint}
                  </span>
                  <span>{pb.last_status}</span>
                </div>

                <button
                  onClick={() => handleRunPlaybook(pb.playbook_code)}
                  disabled={runningCode !== null}
                  className="w-full py-2 px-3 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isRunning
                      ? "Executing Scenario..."
                      : `Run Scenario #${pb.scenario_number} Example`}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Database Execution Audit Log (`ai_automation_execution_logs`) */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-[#2D3E35]" />
            <h3 className="font-serif text-base font-bold text-[#2D3E35]">
              Database Execution Audit Trail (`ai_automation_execution_logs`)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#5C6B5E]">
            Showing latest {executions.length} persisted runs
          </span>
        </div>

        {executions.length === 0 ? (
          <p className="text-xs text-[#5C6B5E] py-4 text-center">
            Click any &ldquo;Run Scenario Example&rdquo; button above to execute a stress-tested automation against the database and inspect its audit trace here.
          </p>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {executions.map((ex) => (
              <div
                key={ex.id}
                className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-[#2D3E35] flex items-center space-x-2">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#2D3E35] text-white">
                      {ex.playbook_code}
                    </span>
                    <span>{ex.playbook_title}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] font-mono text-[#5C6B5E]">
                    <span>{ex.execution_latency_ms}ms</span>
                    <span>&middot;</span>
                    <span className="text-emerald-800 font-bold">
                      Drafts: #{(ex.staged_draft_ids || []).join(", #") || "N/A"}
                    </span>
                  </div>
                </div>
                <p className="text-[#5C6B5E] leading-relaxed">{ex.ai_copilot_briefing}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

