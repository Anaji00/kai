"use client";

import React, { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Mail } from "lucide-react";

function safeNextPath(next: string | null): string {
  return next && next.startsWith("/my-retreat") && !next.startsWith("/my-retreat/login") ? next : "/my-retreat";
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-[#FAF7F2] border border-[#E5DDD0] rounded-xl text-sm text-[#2D3E35] focus:outline-none focus:ring-2 focus:ring-[#C07D63]";

function GuestLoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [reference, setReference] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const post = (path: string, body: object) =>
    fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const detailOf = async (res: Response, fallback: string) => {
    const body = await res.json().catch(() => ({}));
    return typeof body.detail === "string" ? body.detail : fallback;
  };

  const requestCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await post("/api/auth/guest/request-access", { email, booking_reference: reference });
      if (res.ok) {
        setCodeSent(true);
        setNotice((await res.json()).message);
      } else {
        setError(await detailOf(res, "We could not send a code. Please try again."));
      }
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  const verifyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await post("/api/auth/guest/verify", { email, booking_reference: reference, otp });
      if (res.ok) {
        window.location.assign(safeNextPath(searchParams.get("next")));
        return;
      }
      setError(await detailOf(res, "That code is incorrect or has expired."));
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    }
    setPending(false);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="block font-serif text-2xl tracking-[0.4em] text-[#2D3E35] pl-[0.4em]">KAI</span>
          <span className="block mt-1 text-[10px] uppercase tracking-[0.25em] text-[#5C6B5E]">Guest Companion</span>
        </div>

        <div className="bg-white border border-[#E5DDD0] rounded-2xl shadow-sm p-7 sm:p-8">
          <h1 className="font-serif text-xl text-[#2D3E35]">Open your retreat</h1>
          <p className="text-sm text-[#5C6B5E] mt-1 mb-6">
            {codeSent ? notice : "Enter the email and booking reference from your confirmation, and we'll email you a 6-digit code."}
          </p>

          <form onSubmit={codeSent ? verifyCode : requestCode} className="space-y-4">
            {!codeSent && (
              <>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[#5C6B5E] mb-1.5">
                    Email
                  </label>
                  <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label htmlFor="reference" className="block text-xs font-semibold uppercase tracking-wider text-[#5C6B5E] mb-1.5">
                    Booking reference
                  </label>
                  <input id="reference" required placeholder="KAI-XXXXX" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
                </div>
              </>
            )}
            {codeSent && (
              <div>
                <label htmlFor="otp" className="block text-xs font-semibold uppercase tracking-wider text-[#5C6B5E] mb-1.5">
                  6-digit code
                </label>
                <input
                  id="otp"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={`${inputClass} tracking-[0.4em] text-center`}
                />
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2D3E35] hover:bg-[#3d5347] disabled:opacity-60 text-[#FAF7F2] rounded-xl text-sm font-medium transition-colors"
            >
              {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {codeSent ? "Verify code" : "Email me a code"}
            </button>

            {codeSent && (
              <button
                type="button"
                onClick={() => {
                  setCodeSent(false);
                  setOtp("");
                  setError(null);
                }}
                className="w-full text-xs text-[#5C6B5E] underline"
              >
                Use different details or send a new code
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default function GuestLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF7F2]" />}>
      <GuestLoginForm />
    </Suspense>
  );
}
