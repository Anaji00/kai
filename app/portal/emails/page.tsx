"use client";

import React, { useState, useEffect } from "react";
import {
  Mail,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import {
  fetchStagedEmails,
  ingestEmail,
  approveEmailAction,
  StagedEmail,
} from "@/lib/sidecar-api";

export default function EmailsTriagePage() {
  const [emails, setEmails] = useState<StagedEmail[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Ingest simulation modal/form
  const [sender, setSender] = useState("concierge@grandtravel.com");
  const [subject, setSubject] = useState(
    "Flight Itinerary & VIP Transfer: Eleanor Vance (NOS-VILLA-2026-884)"
  );
  const [rawBody, setRawBody] = useState(
    `Hello Kareena,\n\nGrand Travel & Cruise has issued Eleanor Vance's business class flight from Houston (IAH) to Liberia Costa Rica (LIR).\nBooking Reference: KAI-VANCE88\nConfirmation Code: NOS-VILLA-2026-884\nArrival: Nov 14, 2026 at 13:45 local time.\nPrivate ground transfer coordinated with adaptogenic hydration.\n\nWarm regards,\nGrand Travel Flight Desk`
  );
  const [ingesting, setIngesting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const data = await fetchStagedEmails(filterStatus);
      setEmails(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchEmails = async () => {
      try {
        const data = await fetchStagedEmails(filterStatus);
        if (active) {
          setEmails(data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (active) setLoading(false);
      }
    };
    fetchEmails();
    return () => {
      active = false;
    };
  }, [filterStatus]);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await ingestEmail(sender, subject, rawBody);
      await loadEmails();
      alert("Inbound email parsed by AI agent and staged with status PENDING_APPROVAL!");
    } catch (e) {
      console.error(e);
      alert("Failed to ingest email");
    } finally {
      setIngesting(false);
    }
  };

  const handleApprove = async (emailId: string) => {
    setApprovingId(emailId);
    try {
      const updated = await approveEmailAction(emailId, "EXECUTE_ACTION", "Kareena Islam");
      setEmails((prev) => prev.map((em) => (em.id === emailId ? updated : em)));
    } catch (e) {
      console.error(e);
      alert("Failed to approve action");
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
            Guest Concierge Inbox &amp; Message Queue
          </h1>
          <p className="text-sm text-[#5C6B5E] mt-1">
            AI Assistant automatically reads guest emails, organizes flight details &amp; booking numbers, and drafts replies for your 1-click review.
          </p>
        </div>

        <button
          onClick={loadEmails}
          disabled={loading}
          className="self-start md:self-auto inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Emails</span>
        </button>
      </div>

      {/* Simulator: Send inbound test email */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DDD0]/70 pb-3">
          <div className="flex items-center space-x-2">
            <Mail className="w-4 h-4 text-[#C07D63]" />
            <h2 className="font-serif text-base font-bold text-[#2D3E35]">
              Simulate Inbound Concierge / Supplier Email
            </h2>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Prepared for Your Review (Not Sent Yet)</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-[#5C6B5E] mb-1">Sender Email</label>
            <input
              type="email"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#5C6B5E] mb-1">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">Email Body Text</label>
          <textarea
            rows={4}
            value={rawBody}
            onChange={(e) => setRawBody(e.target.value)}
            className="w-full text-xs font-mono bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-3 text-[#2D3E35] focus:outline-none leading-relaxed"
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{ingesting ? "Agent Parsing..." : "Ingest & Run AI Parsing Agent"}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider">
          Filter:
        </span>
        {["ALL", "PENDING_APPROVAL", "APPROVED"].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              filterStatus === st
                ? "bg-[#2D3E35] text-[#FAF7F2]"
                : "text-[#5C6B5E] hover:bg-[#F2ECE4]"
            }`}
          >
            {st === "ALL" ? `All (${emails.length})` : st.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Emails List */}
      {emails.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-sm">
          <Mail className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-60" />
          <div className="text-sm font-semibold text-[#2D3E35]">No staged emails in queue</div>
          <p className="text-xs text-[#5C6B5E] mt-1">
            Simulate an inbound email above or wait for concierge forwards.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {emails.map((email) => {
            const isPending = email.status === "PENDING_APPROVAL";
            const isApproved = email.status === "APPROVED";

            return (
              <div
                key={email.id}
                className={`bg-white rounded-xl border p-5 space-y-4 shadow-sm transition-all ${
                  isPending ? "border-[#E5DDD0] hover:border-[#C07D63]" : "border-emerald-200 bg-emerald-50/10"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-serif text-lg font-bold text-[#2D3E35]">
                        {email.subject}
                      </h3>
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-[#F2ECE4] text-[#5C6B5E] uppercase">
                        {email.parsed_intent || "GENERAL_INQUIRY"}
                      </span>
                    </div>
                    <div className="text-xs text-[#5C6B5E]">
                      From: <span className="font-medium text-[#2D3E35]">{email.sender}</span> &middot; Received: {new Date(email.created_at).toLocaleString()}
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 self-start ${
                      isPending
                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>PENDING OPERATOR TRIAGE</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>ACTION APPROVED</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Extracted Entities Chips */}
                <div className="flex flex-wrap gap-2 text-xs bg-[#FAF7F2] p-3 rounded-lg border border-[#E5DDD0]">
                  <span className="font-semibold text-[#5C6B5E] text-[11px] self-center">
                    Extracted Entities:
                  </span>
                  {Object.entries(email.parsed_entities || {}).map(([k, v]) => {
                    if (!v) return null;
                    return (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[10px] text-[#2D3E35]"
                      >
                        <strong>{k.replace("extracted_", "")}:</strong> {String(v)}
                      </span>
                    );
                  })}
                </div>

                {/* Suggested Action Box */}
                <div className="p-3 bg-[#FAF7F2]/60 rounded-lg border border-[#E5DDD0] space-y-1 text-xs">
                  <div className="font-semibold text-[#5C6B5E] uppercase tracking-wider text-[10px]">
                    AI Agent Suggested Triage Action:
                  </div>
                  <div className="text-[#2D3E35] leading-relaxed">
                    {email.suggested_action || "Review email and coordinate with guest."}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-[#E5DDD0]/70 flex items-center justify-between">
                  <span className="text-[11px] text-[#5C6B5E]">
                    {isApproved && email.reviewed_by ? `Authorized by ${email.reviewed_by}` : "1-Click Operator Approval"}
                  </span>

                  {isPending ? (
                    <button
                      onClick={() => handleApprove(email.id)}
                      disabled={approvingId === email.id}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{approvingId === email.id ? "Approving..." : "Authorize & Execute Action"}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-xs text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Triaged & Action Completed</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
