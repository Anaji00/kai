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
  ExternalLink 
} from "lucide-react";
import { ApiActionDraft } from "@/lib/sidecar-api";

interface Props {
  draft: ApiActionDraft;
  onClose: () => void;
  onApprove: (content: string) => Promise<void> | void;
  onDiscard: () => Promise<void> | void;
}

export default function ActionReviewModal({ draft, onClose, onApprove, onDiscard }: Props) {
  const [content, setContent] = useState(draft.content);
  const [isApproving, setIsApproving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

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

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove(content);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      await onDiscard();
    } finally {
      setIsDiscarding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D3E35]/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#E5DDD0] w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E5DDD0] bg-white">
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
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span className="text-xs text-emerald-900 font-medium">
              Outbound Dispatch Target:
            </span>
            <span className="text-xs font-semibold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
              {draft.channel_target || "Founder Authorized Channel"}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-mono hidden sm:inline-block">
            100% Founder Approval Required
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold tracking-wider text-[#5C6B5E] uppercase">
                Draft Payload & Instructions
              </label>
              <span className="text-xs text-[#738475]">
                {content.length} characters
              </span>
            </div>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-52 p-4 bg-white border border-[#E5DDD0] rounded-xl text-[#2D3E35] focus:outline-none focus:ring-2 focus:ring-[#C07D63] font-sans text-sm leading-relaxed resize-none shadow-inner"
              placeholder="Draft content..."
            />
            <p className="mt-2 text-xs text-[#5C6B5E] flex items-center space-x-1">
              <span>Edit freely before authorizing dispatch. Approving will immediately trigger the downstream integration.</span>
            </p>
          </div>

          <div className="bg-[#F2ECE4]/60 rounded-xl p-3.5 border border-[#E5DDD0]/70 text-xs text-[#5C6B5E] space-y-1">
            <div className="flex justify-between">
              <span className="font-medium text-[#2D3E35]">Operator Signoff:</span>
              <span className="font-semibold text-emerald-800">Founder Kareena Islam, BSN, RN</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-[#2D3E35]">Created Timestamp:</span>
              <span>{new Date(draft.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between p-6 bg-[#F2ECE4] border-t border-[#E5DDD0]">
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
              onClick={handleApprove}
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
