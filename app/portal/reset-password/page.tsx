"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

const MIN_LENGTH = 12;
const INPUT_CLASS =
  "w-full px-3.5 py-2.5 bg-white border border-[#D9D0C2] rounded-lg text-sm text-[#2D3E35] focus:outline-none focus:border-[#2D3E35] focus:ring-1 focus:ring-[#2D3E35]";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // The link's token is in the fragment. Read it once, then remove it from the address bar and history.
    const params = new URLSearchParams(window.location.hash.slice(1));
    setToken(params.get("token"));
    setInvite(params.get("invite") === "1");
    setChecked(true);
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/operator/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      const body = await res.json().catch(() => ({}));
      setError(typeof body.detail === "string" ? body.detail : "We could not save your password. Please try again.");
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="-mt-20 min-h-screen bg-white flex items-center justify-center px-4 sm:px-6 py-12">
      <main className="w-full max-w-sm">
        <p className="font-serif text-2xl text-[#2D3E35]">KAI Wellness Retreats</p>
        <p className="text-sm text-[#5C6B5E] mb-8">Staff CRM</p>

        {done ? (
          <div>
            <CheckCircle2 className="w-7 h-7 text-emerald-700 mb-3" aria-hidden="true" />
            <h1 className="font-serif text-3xl text-[#2D3E35]">Password saved</h1>
            <p className="text-sm text-[#5C6B5E] mt-1 mb-6">You can now sign in. Any other devices have been signed out.</p>
            <Link href="/portal/login" className="block text-center py-2.5 bg-[#2D3E35] hover:bg-[#1F2C25] text-[#FAF7F2] rounded-lg text-sm font-medium">
              Go to sign in
            </Link>
          </div>
        ) : checked && !token ? (
          <div>
            <h1 className="font-serif text-3xl text-[#2D3E35]">This link isn&apos;t valid</h1>
            <p className="text-sm text-[#5C6B5E] mt-1 mb-6">Open the full link from your email, or request a new one from the sign-in page.</p>
            <Link href="/portal/login" className="block text-center py-2.5 bg-[#2D3E35] hover:bg-[#1F2C25] text-[#FAF7F2] rounded-lg text-sm font-medium">
              Go to sign in
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="font-serif text-3xl text-[#2D3E35]">{invite ? "Set your password" : "Choose a new password"}</h1>
            <p className="text-sm text-[#5C6B5E] mt-1 mb-6">Use at least {MIN_LENGTH} characters. A short phrase works well.</p>

            {error && (
              <p role="alert" className="flex gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-[#2D3E35] mb-1.5">New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={show ? "text" : "password"}
                    required
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${INPUT_CLASS} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShow((shown) => !shown)}
                    aria-label={show ? "Hide password" : "Show password"}
                    aria-pressed={show}
                    className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#5C6B5E] hover:text-[#2D3E35]"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-[#2D3E35] mb-1.5">Repeat password</label>
                <input
                  id="confirm-password"
                  type={show ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>
              <button
                type="submit"
                disabled={pending || !token}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2D3E35] hover:bg-[#1F2C25] disabled:opacity-60 text-[#FAF7F2] rounded-lg text-sm font-medium transition-colors"
              >
                {pending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Save password
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
