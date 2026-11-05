import React, { useState } from "react";
import { 
  X, 
  CheckCircle2, 
  Trash2, 
  Plane, 
  Calendar, 
  MessageSquare, 
  Mail, 
  ShieldCheck, 
  FileDiff, 
  Star, 
  Handshake, 
  Loader2, 
  AlertTriangle,
  GitBranch,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { ApiActionDraft, recordClinicalClearance } from "@/lib/sidecar-api";

export interface StateDriftConflictData {
  error_code: string;
  message: string;
  staged_hash?: string;
  live_hash?: string;
  conflicting_fields: string[];
  field_diffs: Record<string, {
    staged_base: unknown;
    live_record: unknown;
    proposed_patch: unknown;
  }>;
  force_override_permitted?: boolean;
}

interface Props {
  draft: ApiActionDraft;
  onClose: () => void;
  onApprove: (content: string, forceOverride?: boolean) => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
  /** The server's 409 details when a quick dispatch from the list was refused. */
  initialConflict?: { error_code?: string; message?: string; findings?: string[] } | null;
}

export default function ActionReviewModal({ draft, onClose, onApprove, onDiscard, initialConflict }: Props) {
  const [content, setContent] = useState(draft.content);
  const [isApproving, setIsApproving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [driftConflict, setDriftConflict] = useState<StateDriftConflictData | null>(
    initialConflict?.error_code === "OCC_STATE_DRIFT_CONFLICT" ? (initialConflict as unknown as StateDriftConflictData) : null
  );
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [clinicalHold, setClinicalHold] = useState<{ message: string; findings: string[] } | null>(
    initialConflict?.error_code === "CLINICAL_HOLD_ACTIVE"
      ? { message: initialConflict.message ?? "", findings: initialConflict.findings ?? [] }
      : null
  );
  const [clearanceReason, setClearanceReason] = useState("");

  const getTypeLabel = (type: string) => {
    return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const getChannelIcon = (badge?: string) => {
    switch (badge) {
      case "travel": return <Plane className="w-4 h-4 text-sky-600" />;
      case "intake": return <Calendar className="w-4 h-4 text-emerald-600" />;
      case "sms": return <MessageSquare className="w-4 h-4 text-amber-600" />;
      case "email": return <Mail className="w-4 h-4 text-indigo-600" />;
      case "clinical": return <ShieldCheck className="w-4 h-4 text-rose-600" />;
      case "manifest": return <FileDiff className="w-4 h-4 text-purple-600" />;
      case "journal": return <Star className="w-4 h-4 text-amber-500" />;
      case "partner": return <Handshake className="w-4 h-4 text-teal-600" />;
      default: return <CheckCircle2 className="w-4 h-4 text-[#5C6B5E]" />;
    }
  };

  const handleApprove = async (forceOverride: boolean = false) => {
    setIsApproving(true);
    setGeneralError(null);
    try {
      await onApprove(content, forceOverride);
    } catch (err: any) {
      if (err?.data?.error_code === "CLINICAL_HOLD_ACTIVE") {
        setClinicalHold({ message: err.message, findings: err.data.findings || [] });
      } else if (err?.data?.error_code === "OCC_STATE_DRIFT_CONFLICT") {
        setDriftConflict(err.data as StateDriftConflictData);
      } else {
        setGeneralError(err?.message || "Failed to authorize and dispatch draft.");
      }
    } finally {
      setIsApproving(false);
    }
  };

  const recordClearanceAndApprove = async () => {
    if (!draft.target_entity_id) return;
    setIsApproving(true);
    setGeneralError(null);
    try {
      await recordClinicalClearance(draft.target_entity_id, clearanceReason);
      setClinicalHold(null);
    } catch (err: any) {
      setGeneralError(err?.message || "Failed to record the clearance.");
      setIsApproving(false);
      return;
    }
    setIsApproving(false);
    await handleApprove(false);
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      await onDiscard();
    } finally {
      setIsDiscarding(false);
    }
  };

  const renderValue = (val: unknown) => {
    if (val === null || val === undefined) return <span className="text-stone-400 italic font-mono text-[11px]">null</span>;
    if (typeof val === "object") return <code className="text-[11px] font-mono text-stone-700 bg-stone-100 px-1 py-0.5 rounded">{JSON.stringify(val)}</code>;
    return <span className="font-mono text-xs">{String(val)}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3E35]/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#E5DDD0] w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5DDD0] bg-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0]">
              {getChannelIcon(draft.channel_badge)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-serif font-bold text-[#2D3E35]">Action Draft Review</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                  Draft #{draft.id}
                </span>
                {draft.target_entity_version_hash && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200" title={`Entity Version SHA: ${draft.target_entity_version_hash}`}>
                    Sync Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5C6B5E] mt-0.5">
                {getTypeLabel(draft.type)} • Guest: <strong className="text-[#2D3E35]">{draft.guest_name}</strong>
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-[#5C6B5E] hover:text-[#2D3E35] rounded-full hover:bg-[#FAF7F2] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Target Banner */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs text-emerald-900 font-medium">
              Sending Destination:
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
              {draft.channel_target || "Founder Authorized Channel"}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono hidden sm:inline-block">
            100% Founder Approval Required
          </span>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">

          {/* OCC State Drift Conflict 3-Way Diff View */}
          {driftConflict && (
            <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-900">
                    Record Updated Elsewhere: Please Review Differences
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    This guest or retreat record was updated in the system while this draft was waiting. Please review the comparison below to ensure no recent updates are accidentally lost.
                  </p>
                </div>
              </div>

              {/* 3-Way Diff Table */}
              <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-100/60 text-amber-900 font-semibold border-b border-amber-200">
                    <tr>
                      <th className="py-2 px-3">Detail / Field</th>
                      <th className="py-2 px-3">Value When Draft Was Prepared</th>
                      <th className="py-2 px-3 bg-rose-50 text-rose-900">Current Value in System</th>
                      <th className="py-2 px-3 bg-emerald-50 text-emerald-900">Proposed Update</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100">
                    {Object.entries(driftConflict.field_diffs || {}).map(([field, diff]) => (
                      <tr key={field} className="hover:bg-amber-50/40">
                        <td className="py-2 px-3 font-semibold text-[#2D3E35] whitespace-nowrap">{field}</td>
                        <td className="py-2 px-3 text-stone-600">{renderValue(diff.staged_base)}</td>
                        <td className="py-2 px-3 bg-rose-50/40 text-rose-900 font-medium">{renderValue(diff.live_record)}</td>
                        <td className="py-2 px-3 bg-emerald-50/40 text-emerald-900 font-medium">{renderValue(diff.proposed_patch)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Drift Resolution Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80">
                <button
                  type="button"
                  onClick={() => setDriftConflict(null)}
                  className="text-xs text-stone-600 hover:text-stone-900 font-medium underline"
                >
                  Edit Message Before Sending
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(true)}
                    disabled={isApproving}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                    <span>Approve & Apply These Changes Anyway</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Hold */}
          {clinicalHold && (
            <div className="bg-rose-50 border-2 border-rose-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-rose-900">Clinical hold on this guest</h4>
                  <p className="text-xs text-rose-800 mt-0.5">{clinicalHold.message}</p>
                  {clinicalHold.findings.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-xs text-rose-800 space-y-0.5">
                      {clinicalHold.findings.map((finding) => <li key={finding}>{finding}</li>)}
                    </ul>
                  )}
                </div>
              </div>
              {draft.target_entity_id ? (
                <>
                  <label htmlFor="clearance-reason" className="block text-xs font-semibold text-rose-900">
                    Nurse clearance notes (recorded under your name)
                  </label>
                  <textarea
                    id="clearance-reason"
                    value={clearanceReason}
                    onChange={(e) => setClearanceReason(e.target.value)}
                    className="w-full h-20 p-3 bg-white border border-rose-200 rounded-lg text-xs text-[#2D3E35] focus:outline-none focus:ring-2 focus:ring-rose-300"
                  />
                  <p className="text-[11px] text-rose-800">At least 10 characters. This is saved to the audit record.</p>
                  <button
                    type="button"
                    onClick={recordClearanceAndApprove}
                    disabled={isApproving || clearanceReason.trim().length < 10}
                    className="px-3.5 py-1.5 bg-rose-800 hover:bg-rose-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                  >
                    Record clearance &amp; approve
                  </button>
                </>
              ) : (
                <p className="text-xs text-rose-800">Clear this hold from the guest&apos;s intake record first.</p>
              )}
            </div>
          )}

          {/* General Error Banner */}
          {generalError && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{generalError}</span>
            </div>
          )}

          {/* Draft Payload Text Area */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold tracking-wider text-[#5C6B5E] uppercase">
                Draft Message & Details
              </label>
              <span className="text-xs text-[#738475]">
                {content.length} characters
              </span>
            </div>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-48 p-4 bg-white border border-[#E5DDD0] rounded-xl text-[#2D3E35] focus:outline-none focus:ring-2 focus:ring-[#C07D63] font-sans text-sm leading-relaxed resize-none shadow-inner"
              placeholder="Draft content..."
            />
            <p className="mt-1.5 text-xs text-[#5C6B5E]">
              You can edit anything above before sending. Once approved, this message or update will be sent immediately.
            </p>
          </div>

          <div className="bg-[#F2ECE4]/60 rounded-xl p-3.5 border border-[#E5DDD0]/70 text-xs text-[#5C6B5E] space-y-1">
            <div className="flex justify-between">
              <span className="font-medium text-[#2D3E35]">Created Timestamp:</span>
              <span>{new Date(draft.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-6 bg-[#F2ECE4] border-t border-[#E5DDD0] shrink-0">
          <button 
            onClick={handleDiscard}
            disabled={isDiscarding || isApproving}
            className="flex items-center space-x-2 px-4 py-2 text-rose-700 hover:bg-rose-50 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
          >
            {isDiscarding ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
            ) : (
              <Trash2 className="w-4 h-4 text-rose-600" />
            )}
            <span>Discard Draft</span>
          </button>
          
          <div className="flex items-center space-x-3">
            <button 
              onClick={onClose} 
              disabled={isDiscarding || isApproving}
              className="px-4 py-2 text-[#5C6B5E] font-medium text-sm hover:text-[#2D3E35] transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={() => handleApprove(false)}
              disabled={isDiscarding || isApproving}
              className="flex items-center space-x-2 px-6 py-2.5 bg-[#2D3E35] text-[#FAF7F2] rounded-xl hover:bg-[#3d5347] transition-all font-medium text-sm shadow-sm hover:shadow-md disabled:opacity-50 active:scale-95"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing Dispatch...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>1-Click Approve & Dispatch</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}