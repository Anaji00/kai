"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AlertCircle, Loader2, UserPlus } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  status: "active" | "invited" | "deactivated";
  last_login_at: string | null;
  is_you: boolean;
}

const STATUS_STYLE: Record<StaffMember["status"], string> = {
  active: "bg-emerald-50 text-emerald-800 border-emerald-200",
  invited: "bg-amber-50 text-amber-800 border-amber-200",
  deactivated: "bg-[#F2ECE4] text-[#5C6B5E] border-[#E5DDD0]",
};
const STATUS_LABEL: Record<StaffMember["status"], string> = { active: "Active", invited: "Invited", deactivated: "Deactivated" };

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 bg-white border border-[#D9D0C2] rounded-lg text-sm focus:outline-none focus:border-[#2D3E35] focus:ring-1 focus:ring-[#2D3E35]";
const ACTION_CLASS =
  "px-3 py-1.5 border border-[#D9D0C2] rounded-lg text-xs font-medium hover:bg-[#F2ECE4] disabled:opacity-50 transition-colors";

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return typeof body.detail === "string" ? body.detail : "That didn't work. Please try again.";
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await authFetch("/api/auth/staff");
      if (res.ok) setStaff(await res.json());
      else setError(await errorMessage(res));
    } catch {
      setError("We could not load the staff list. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const reportAccess = (who: string, result: { email_sent: boolean; access_link: string | null }) => {
    if (result.email_sent) {
      setNotice(`We emailed a link to ${who}.`);
      setManualLink(null);
    } else {
      setNotice(`The email to ${who} didn't send. Copy this link and share it with them privately.`);
      setManualLink(result.access_link);
    }
  };

  const clearMessages = () => {
    setError(null);
    setNotice(null);
    setManualLink(null);
  };

  const inviteStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();
    setInviting(true);
    try {
      const res = await authFetch("/api/auth/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name, email }),
      });
      if (!res.ok) {
        setError(res.status === 422 ? "Enter a name and a valid email address." : await errorMessage(res));
        return;
      }
      reportAccess(email, await res.json());
      setName("");
      setEmail("");
      await load();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setInviting(false);
    }
  };

  const act = async (member: StaffMember, action: "send-access" | "deactivate" | "reactivate") => {
    if (action === "deactivate" && !window.confirm(`Deactivate ${member.full_name}? They'll be signed out straight away.`)) return;
    clearMessages();
    setBusyId(member.id);
    try {
      const res = await authFetch(`/api/auth/staff/${encodeURIComponent(member.id)}/${action}`, { method: "POST" });
      if (!res.ok) {
        setError(await errorMessage(res));
        return;
      }
      if (action === "send-access") reportAccess(member.email, await res.json());
      else setNotice(`${member.full_name} has been ${action === "deactivate" ? "deactivated" : "reactivated"}.`);
      await load();
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#2D3E35]">
      <h1 className="font-serif text-3xl">Staff</h1>
      <p className="text-sm text-[#5C6B5E] mt-1 mb-6">Everyone here is an admin with full access to the CRM.</p>

      {error && (
        <p role="alert" className="flex gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 mb-4">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
      {notice && (
        <div role="status" className="text-sm bg-[#F2ECE4] rounded-lg px-3 py-2.5 mb-4">
          <p>{notice}</p>
          {manualLink && (
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <input readOnly value={manualLink} aria-label="Access link" className={`${INPUT_CLASS} font-mono text-xs`} onFocus={(e) => e.target.select()} />
              <button type="button" className={ACTION_CLASS} onClick={() => navigator.clipboard?.writeText(manualLink)}>Copy</button>
            </div>
          )}
        </div>
      )}

      <form onSubmit={inviteStaff} className="bg-white border border-[#E5DDD0] rounded-lg p-4 mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="staff-name" className="block text-sm font-medium mb-1.5">Full name</label>
          <input id="staff-name" required maxLength={255} value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
        </div>
        <div>
          <label htmlFor="staff-email" className="block text-sm font-medium mb-1.5">Work email</label>
          <input id="staff-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} />
        </div>
        <button type="submit" disabled={inviting} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2D3E35] hover:bg-[#1F2C25] disabled:opacity-60 text-[#FAF7F2] rounded-lg text-sm font-medium">
          {inviting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <UserPlus className="w-4 h-4" aria-hidden="true" />}
          Send invite
        </button>
      </form>

      {staff === null && !error && <p className="text-sm text-[#5C6B5E]">Loading staff…</p>}

      <ul className={staff ? "bg-white border border-[#E5DDD0] rounded-lg divide-y divide-[#E5DDD0]" : "hidden"}>
        {(staff ?? []).map((member) => (
          <li key={member.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {member.full_name}
                {member.is_you && <span className="font-normal text-[#5C6B5E]"> (you)</span>}
              </p>
              <p className="text-sm text-[#5C6B5E] break-all">{member.email}</p>
              <p className="text-xs text-[#5C6B5E] mt-0.5">
                {member.last_login_at ? `Last signed in ${new Date(member.last_login_at).toLocaleString()}` : "Hasn't signed in yet"}
              </p>
            </div>
            <span className={`self-start sm:self-center text-xs px-2 py-0.5 rounded border ${STATUS_STYLE[member.status]}`}>{STATUS_LABEL[member.status]}</span>
            <div className="flex flex-wrap gap-2">
              {member.status === "deactivated" ? (
                <button type="button" disabled={busyId === member.id} className={ACTION_CLASS} onClick={() => act(member, "reactivate")}>Reactivate</button>
              ) : (
                <>
                  <button type="button" disabled={busyId === member.id} className={ACTION_CLASS} onClick={() => act(member, "send-access")}>
                    {member.status === "invited" ? "Resend invite" : "Send reset link"}
                  </button>
                  {!member.is_you && (
                    <button type="button" disabled={busyId === member.id} className={ACTION_CLASS} onClick={() => act(member, "deactivate")}>Deactivate</button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
