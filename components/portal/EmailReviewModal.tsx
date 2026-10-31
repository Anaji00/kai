import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { sendLeadEmail } from '@/lib/sidecar-api';

interface EmailReviewModalProps {
  leadId: string;
  leadName: string;
  leadEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailReviewModal({ leadId, leadName, leadEmail, onClose, onSuccess }: EmailReviewModalProps) {
  const [subject, setSubject] = useState(`Information Request: ${leadName}`);
  const [body, setBody] = useState(`Hi ${leadName},\n\nWe would like to request some additional information to proceed with the collaboration thesis. Please fill out our secure form.\n\nBest,\nThe Founder Team`);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendLeadEmail(leadId, subject, body);
      onSuccess();
    } catch (e) {
      console.error("Failed to send email:", e);
      alert("Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl border border-[#E5DDD0] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5DDD0]">
          <h2 className="font-serif text-xl font-bold text-[#2D3E35]">Review Email</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#F2ECE4] rounded-full text-[#5C6B5E] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">To</label>
            <input 
              type="text" 
              value={`${leadName} <${leadEmail}>`} 
              disabled 
              className="w-full text-sm bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#5C6B5E] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">Subject</label>
            <input 
              type="text" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-sm bg-white border border-[#2D3E35] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">Message Body</label>
            <textarea 
              rows={8}
              value={body} 
              onChange={(e) => setBody(e.target.value)}
              className="w-full text-sm bg-white border border-[#2D3E35] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-[#E5DDD0] bg-[#FAF7F2] rounded-b-xl space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-[#5C6B5E] hover:text-[#2D3E35]"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            disabled={sending}
            className="inline-flex items-center space-x-2 px-6 py-2.5 text-sm font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-lg transition-all shadow-sm"
          >
            <Send className={`w-4 h-4 ${sending ? "animate-pulse" : ""}`} />
            <span>{sending ? "Sending..." : "Send Email"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
