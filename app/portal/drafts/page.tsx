"use client";

import React, { useState, useEffect } from "react";
import { 
  fetchPendingDrafts, 
  fetchDraftStats, 
  approveDraftAction, 
  discardDraftAction, 
  batchApproveDraftsAction,
  dispatchDraftsDigestWhatsApp,
  ApiActionDraft, 
  DraftStats 
} from "@/lib/sidecar-api";
import { 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plane, 
  MessageSquare, 
  Calendar,
  Mail, 
  ShieldCheck, 
  FileDiff, 
  Star, 
  Handshake, 
  ArrowRight, 
  Check, 
  CheckCheck,
  Loader2, 
  RefreshCw, 
  Smartphone
} from "lucide-react";
import ActionReviewModal from "./ActionReviewModal";

export default function DraftsQueuePage() {
  const [drafts, setDrafts] = useState<ApiActionDraft[]>([]);
  const [stats, setStats] = useState<DraftStats>({
    total_pending: 0,
    total_approved: 0,
    total_discarded: 0,
    total_all: 0,
    by_category: {}
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [batchApproving, setBatchApproving] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [selectedDraft, setSelectedDraft] = useState<ApiActionDraft | null>(null);
  const [dispatchingId, setDispatchingId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState<{ message: string; type: "success" | "info" } | null>(null);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener("drafts-updated", handleUpdate);
    return () => window.removeEventListener("drafts-updated", handleUpdate);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [draftsData, statsData] = await Promise.all([
        fetchPendingDrafts("pending_review", activeTab),
        fetchDraftStats()
      ]);
      setDrafts(draftsData);
      setStats(statsData);
    } catch (err) {
      console.error("Failed to load drafts queue:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleQuickApprove = async (e: React.MouseEvent, draft: ApiActionDraft) => {
    e.stopPropagation();
    setDispatchingId(draft.id);
    try {
      const res = await approveDraftAction(draft.id);
      const actionText = res.dispatch_result?.action_taken || "Action dispatched successfully.";
      setActionNotice({
        message: `Approved & Dispatched Draft #${draft.id}: ${actionText}`,
        type: "success"
      });
      window.dispatchEvent(new Event("drafts-updated"));
      await loadData();
    } catch (err: any) {
      alert(`Approval failed: ${err?.message || "Unknown error"}`);
    } finally {
      setDispatchingId(null);
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  const handleQuickDiscard = async (e: React.MouseEvent, draftId: number) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to discard this draft?")) return;
    try {
      await discardDraftAction(draftId);
      setActionNotice({
        message: `Draft #${draftId} discarded from queue.`,
        type: "info"
      });
      window.dispatchEvent(new Event("drafts-updated"));
      await loadData();
    } catch (err: any) {
      alert(`Discard failed: ${err?.message || "Unknown error"}`);
    } finally {
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const handleBatchApproveRoutine = async () => {
    if (!confirm("Approve all routine communications (email replies, guest confirmations, priority welcomes)? Clinical reviews will remain protected for individual review.")) return;
    setBatchApproving(true);
    try {
      const res = await batchApproveDraftsAction(undefined, "routine");
      setActionNotice({
        message: `Batch approved ${res.approved_count} routine action drafts. (Protected clinical reviews require explicit review)`,
        type: "success"
      });
      window.dispatchEvent(new Event("drafts-updated"));
      await loadData();
    } catch (err: any) {
      alert(`Batch approval failed: ${err?.message || "Unknown error"}`);
    } finally {
      setBatchApproving(false);
      setTimeout(() => setActionNotice(null), 7000);
    }
  };

  const handleSendWhatsAppDigest = async () => {
    setSendingDigest(true);
    try {
      const res = await dispatchDraftsDigestWhatsApp();
      setActionNotice({
        message: `Dispatched Founder WhatsApp Digest to ${res.recipient} (${res.pending_count} pending drafts summarized).`,
        type: "success"
      });
    } catch (err: any) {
      alert(`WhatsApp digest failed: ${err?.message || "Unknown error"}`);
    } finally {
      setSendingDigest(false);
      setTimeout(() => setActionNotice(null), 7000);
    }
  };

  const handleModalApprove = async (newContent: string) => {
    if (!selectedDraft) return;
    try {
      const res = await approveDraftAction(selectedDraft.id, newContent);
      setSelectedDraft(null);
      setActionNotice({
        message: `Approved & Dispatched Draft #${selectedDraft.id}: ${res.dispatch_result?.action_taken || "Executed"}`,
        type: "success"
      });
      window.dispatchEvent(new Event("drafts-updated"));
      await loadData();
    } catch (err: any) {
      alert(`Approval failed: ${err?.message || "Unknown error"}`);
    } finally {
      setTimeout(() => setActionNotice(null), 6000);
    }
  };

  const handleModalDiscard = async () => {
    if (!selectedDraft) return;
    try {
      await discardDraftAction(selectedDraft.id);
      setSelectedDraft(null);
      setActionNotice({
        message: `Draft #${selectedDraft.id} discarded.`,
        type: "info"
      });
      window.dispatchEvent(new Event("drafts-updated"));
      await loadData();
    } catch (err: any) {
      alert(`Discard failed: ${err?.message || "Unknown error"}`);
    } finally {
      setTimeout(() => setActionNotice(null), 5000);
    }
  };

  const getChannelIcon = (badge?: string) => {
    switch (badge) {
      case "travel": return <Plane className="w-5 h-5 text-sky-600" />;
      case "intake": return <Calendar className="w-5 h-5 text-emerald-600" />;
      case "sms": return <MessageSquare className="w-5 h-5 text-amber-600" />;
      case "email": return <Mail className="w-5 h-5 text-indigo-600" />;
      case "clinical": return <ShieldCheck className="w-5 h-5 text-rose-600" />;
      case "manifest": return <FileDiff className="w-5 h-5 text-purple-600" />;
      case "journal": return <Star className="w-5 h-5 text-amber-500" />;
      case "partner": return <Handshake className="w-5 h-5 text-teal-600" />;
      default: return <FileText className="w-5 h-5 text-[#5C6B5E]" />;
    }
  };

  const getTypeLabel = (type: string) => {
    if (type === "post_retreat_integration") return "🌿 30-Day Post-Retreat Integration";
    if (type === "guest_email_confirmation") return "💌 Pre-Arrival Welcome Dossier";
    if (type === "priority_circle_welcome") return "👑 Priority Circle Invitation";
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const filterTabs = [
    { id: "all", label: "All Pending Tasks", count: stats.total_pending },
    { id: "travel", label: "Flight & Chauffeur", count: stats.by_category.travel || 0 },
    { id: "intake", label: "Intakes & Itineraries", count: stats.by_category.intake || 0 },
    { id: "email", label: "Concierge & Post-Retreat", count: stats.by_category.email || 0 },
    { id: "sms", label: "Twilio SMS", count: stats.by_category.sms || 0 },
    { id: "clinical", label: "Elevated Safety Flags", count: stats.by_category.clinical || 0 },
    { id: "manifest", label: "Manifest Audits", count: stats.by_category.manifest || 0 },
  ];


  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header & Governance Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-serif text-[#2D3E35] tracking-tight">Founder Action Review Queue</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
              100% Founder Approval Guaranteed
            </span>
          </div>
          <p className="text-sm text-[#5C6B5E] mt-1">
            All AI agents, flight desks, inbound webhooks, and concierge triggers stage actions here for explicit 1-click authorization by Founder Kareena Islam.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={handleBatchApproveRoutine}
            disabled={batchApproving || stats.total_pending === 0}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#2D3E35] hover:bg-[#1E2B24] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            title="Approve routine email replies and welcome confirmations at once"
          >
            {batchApproving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Approve Routine</span>
          </button>

          <button 
            onClick={handleSendWhatsAppDigest}
            disabled={sendingDigest}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors shadow-sm disabled:opacity-50"
            title="Send interactive WhatsApp summary card to founder"
          >
            {sendingDigest ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700" />
            ) : (
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>WhatsApp Digest</span>
          </button>

          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-[#2D3E35] bg-white border border-[#E5DDD0] rounded-xl hover:bg-[#FAF7F2] transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#C07D63]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-[#E5DDD0] shadow-sm">
          <p className="text-xs text-[#5C6B5E] font-medium uppercase tracking-wider">Pending Founder Review</p>
          <p className="text-2xl font-serif font-bold text-[#2D3E35] mt-1">{stats.total_pending}</p>
          <div className="flex items-center space-x-1 text-[11px] text-amber-700 mt-1">
            <Clock className="w-3 h-3" />
            <span>Awaiting authorization</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5DDD0] shadow-sm">
          <p className="text-xs text-[#5C6B5E] font-medium uppercase tracking-wider">Approved & Dispatched</p>
          <p className="text-2xl font-serif font-bold text-emerald-800 mt-1">{stats.total_approved}</p>
          <div className="flex items-center space-x-1 text-[11px] text-emerald-700 mt-1">
            <Check className="w-3 h-3" />
            <span>Downstream verified</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5DDD0] shadow-sm">
          <p className="text-xs text-[#5C6B5E] font-medium uppercase tracking-wider">Flight & Chauffeur Alerts</p>
          <p className="text-2xl font-serif font-bold text-sky-800 mt-1">{stats.by_category.travel || 0}</p>
          <div className="flex items-center space-x-1 text-[11px] text-sky-700 mt-1">
            <Plane className="w-3 h-3" />
            <span>Grand Travel & Cirium</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E5DDD0] shadow-sm">
          <p className="text-xs text-[#5C6B5E] font-medium uppercase tracking-wider">Sanctuary CRM Intakes & Holds</p>
          <p className="text-2xl font-serif font-bold text-indigo-800 mt-1">{stats.by_category.intake || 0}</p>
          <div className="flex items-center space-x-1 text-[11px] text-indigo-700 mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Native tags sync</span>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-sm animate-in fade-in duration-200 ${
          actionNotice.type === "success" 
            ? "bg-emerald-50 text-emerald-900 border-emerald-200" 
            : "bg-amber-50 text-amber-900 border-amber-200"
        }`}>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{actionNotice.message}</span>
          </div>
          <button 
            onClick={() => setActionNotice(null)}
            className="text-xs font-semibold underline hover:opacity-75"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center space-x-1 border-b border-[#E5DDD0] overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-white text-[#2D3E35] border-t-2 border-t-[#C07D63] border-x border-[#E5DDD0] shadow-sm font-semibold"
                : "text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-white/50"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                activeTab === tab.id ? "bg-[#2D3E35] text-white" : "bg-[#E5DDD0] text-[#5C6B5E]"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Drafts List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-[#E5DDD0]">
          <div className="w-8 h-8 rounded-full border-3 border-[#C07D63] border-t-transparent animate-spin" />
          <p className="text-xs text-[#5C6B5E] mt-3">Loading action drafts queue...</p>
        </div>
      ) : drafts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5DDD0] p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-[#F2ECE4] rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h3 className="text-xl font-serif text-[#2D3E35] mb-2">Inbox Zero Achieved</h3>
          <p className="text-sm text-[#5C6B5E] max-w-md mx-auto">
            All AI-staged drafts in this category have been authorized and dispatched or cleared. Zero unapproved messages are pending.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map(draft => {
            const isExecuting = dispatchingId === draft.id;
            return (
              <div 
                key={draft.id} 
                className="bg-white rounded-2xl border border-[#E5DDD0] p-5 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-[#C07D63]/50"
                onClick={() => setSelectedDraft(draft)}
              >
                {/* Left: Icon & Description */}
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-3 bg-[#FAF7F2] border border-[#E5DDD0] rounded-xl shrink-0">
                    {getChannelIcon(draft.channel_badge)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-[#2D3E35]">
                        {getTypeLabel(draft.type)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        {draft.channel_target || "Founder Dispatch Queue"}
                      </span>
                      <span className="text-[11px] text-[#738475]">
                        • {new Date(draft.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <h4 className="text-base font-serif font-bold text-[#2D3E35]">
                      Guest / Recipient: <span className="text-[#C07D63]">{draft.guest_name}</span>
                    </h4>

                    <p className="text-xs text-[#5C6B5E] line-clamp-2 leading-relaxed bg-[#FAF7F2]/60 p-2.5 rounded-lg border border-[#E5DDD0]/50 font-sans">
                      {draft.content}
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5DDD0]/60 justify-end">
                  <button
                    onClick={(e) => handleQuickDiscard(e, draft.id)}
                    className="p-2 text-[#738475] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-xs font-medium"
                    title="Discard Draft"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={(e) => handleQuickApprove(e, draft)}
                    disabled={isExecuting}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-[#2D3E35] text-[#FAF7F2] text-xs font-medium rounded-xl hover:bg-[#3d5347] transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Dispatching...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>1-Click Dispatch</span>
                      </>
                    )}
                  </button>

                  <span className="text-xs font-medium text-[#C07D63] group-hover:translate-x-0.5 transition-transform flex items-center pl-1">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {selectedDraft && (
        <ActionReviewModal 
          draft={selectedDraft}
          onClose={() => setSelectedDraft(null)}
          onApprove={handleModalApprove}
          onDiscard={handleModalDiscard}
        />
      )}
    </div>
  );
}
