"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Calendar,
  ClipboardCheck,
  Database,
  Eye,
  EyeOff,
  FlaskConical,
  Info,
  Loader2,
  Mail,
  Users,
} from "lucide-react";

const DEMO_AUTH_ENABLED =
  process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH !== "false";

const REMEMBERED_EMAIL_KEY = "kai_portal_email";
const INPUT_CLASS =
  "w-full px-3.5 py-2.5 bg-white border border-[#D9D0C2] rounded-lg text-sm text-[#2D3E35] placeholder:text-[#8A9489] focus:outline-none focus:border-[#2D3E35] focus:ring-1 focus:ring-[#2D3E35]";

const WORKSPACE = [
  { icon: Users, title: "Guest inquiries", text: "New inquiries and suggested plans" },
  { icon: Database, title: "Travel CRM", text: "Guests, trips, waivers and payments" },
  { icon: ClipboardCheck, title: "Review queue", text: "Approve messages before they send" },
  { icon: Calendar, title: "Calendar and logistics", text: "Retreats, flights, transfers and vendors" },
];

// Only same-site portal paths are accepted, so a crafted link can't send an operator elsewhere after sign-in.
function safeNextPath(next: string | null): string {
  return next && next.startsWith("/portal") && !next.startsWith("/portal/login") ? next : "/portal";
}

// Browser storage can be blocked, and the form must still work when it is.
function readRememberedEmail(): string {
  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveRememberedEmail(email: string | null) {
  try {
    if (email) window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    else window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  } catch {
    // The email simply isn't remembered.
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<"password" | "demo" | null>(null);

  // proxy.ts adds ?next= when it sends someone back here from a page they had open.
  const returning = searchParams.has("next");

  useEffect(() => {
    const saved = readRememberedEmail();
    if (saved) {
      // Stored only in the browser, so it can't be read during server rendering.
      setEmail(saved);
      setRemember(true);
      document.getElementById("password")?.focus();
    } else {
      document.getElementById("email")?.focus();
    }
  }, []);

  const finishSignIn = async (res: Response, rememberedEmail?: string | null) => {
    if (res.ok) {
      if (rememberedEmail !== undefined) saveRememberedEmail(rememberedEmail);
      window.location.assign(safeNextPath(searchParams.get("next")));
      return;
    }
    const body = await res.json().catch(() => ({}));
    setError(typeof body.detail === "string" ? body.detail : "We could not sign you in. Please try again.");
    setPassword("");
    setPending(null);
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending("password");
    try {
      await finishSignIn(
        await fetch("/api/auth/operator/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }),
        remember ? email.trim() : null
      );
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setPending(null);
    }
  };

  const requestReset = async () => {
    const address = email.trim();
    if (!address) {
      setResetMessage("Enter your work email above first.");
      document.getElementById("email")?.focus();
      return;
    }
    setSendingReset(true);
    setResetMessage(null);
    try {
      const res = await fetch("/api/auth/operator/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const body = await res.json().catch(() => ({}));
      const fallback = res.status === 422 ? "Enter a valid email address." : "We could not send a link. Please try again.";
      setResetMessage(res.ok ? body.message : typeof body.detail === "string" ? body.detail : fallback);
    } catch {
      setResetMessage("We could not reach the server. Check your connection and try again.");
    } finally {
      setSendingReset(false);
    }
  };

  const demoSignIn = async () => {
    setError(null);
    setPending("demo");
    try {
      await finishSignIn(await fetch("/api/auth/operator/demo-login", { method: "POST", credentials: "include" }));
    } catch {
      setError("We could not reach the server. Check your connection and try again.");
      setPending(null);
    }
  };

  return (
    <div className="-mt-20 min-h-screen bg-white lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden lg:flex flex-col justify-between bg-[#2D3E35] text-[#FAF7F2] p-12">
        <div className="flex items-center space-x-3.5">
          <img
            src="/kai-logo.png"
            alt="KAI Wellness Retreats"
            className="w-10 h-10 rounded-full object-contain"
          />
          <div>
            <p className="font-serif text-2xl">KAI Wellness Retreats</p>
            <p className="text-sm text-[#C9D2CA] mt-0.5">Staff CRM</p>
          </div>
        </div>

        <div>
          <h2 className="font-serif text-4xl font-normal leading-tight">Everything the team needs, in one place.</h2>
          <ul className="mt-8 space-y-5">
            {WORKSPACE.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <Icon className="w-5 h-5 mt-0.5 shrink-0 text-[#D9967E]" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-[#C9D2CA]">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-[#C9D2CA]">Powered by Grand Travel &amp; Cruise</p>
      </aside>

      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex items-center space-x-3">
            <img
              src="/kai-logo.png"
              alt="KAI Wellness Retreats"
              className="w-10 h-10 rounded-full object-contain"
            />
            <div>
              <p className="font-serif text-2xl text-[#2D3E35]">KAI Wellness Retreats</p>
              <p className="text-sm text-[#5C6B5E]">Staff CRM</p>
            </div>
          </div>

          <h1 className="font-serif text-3xl text-[#2D3E35]">Sign in</h1>
          <p className="text-sm text-[#5C6B5E] mt-1 mb-6">Use your KAI staff account.</p>

          {returning && !error && (
            <p role="status" className="flex gap-2 text-sm text-[#2D3E35] bg-[#F2ECE4] rounded-lg px-3 py-2.5 mb-4">
              <Info className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              Please sign in to continue. We&apos;ll take you back to your page.
            </p>
          )}

          {error && (
            <p role="alert" className="flex gap-2 text-sm text-rose-800 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <form onSubmit={signIn} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#2D3E35] mb-1.5">
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                placeholder="name@grandtravelcruise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#2D3E35] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                  onBlur={() => setCapsLock(false)}
                  aria-describedby={capsLock ? "caps-lock-warning" : undefined}
                  className={`${INPUT_CLASS} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#5C6B5E] hover:text-[#2D3E35]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {capsLock && (
                <p id="caps-lock-warning" className="mt-1.5 text-xs text-amber-800">
                  Caps Lock is on.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[#2D3E35] cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-[#D9D0C2] accent-[#2D3E35]"
                />
                Remember my email
              </label>
              <button
                type="button"
                onClick={() => setShowHelp((shown) => !shown)}
                aria-expanded={showHelp}
                className="text-sm text-[#2D3E35] underline underline-offset-2 hover:text-[#C07D63]"
              >
                Forgot password?
              </button>
            </div>

            {showHelp && (
              <div className="text-sm text-[#2D3E35] bg-[#F2ECE4] rounded-lg px-3 py-2.5">
                <p>We&apos;ll email a link to the address above so you can choose a new password.</p>
                <button
                  type="button"
                  onClick={requestReset}
                  disabled={sendingReset}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 bg-white border border-[#D9D0C2] hover:bg-[#FAF7F2] disabled:opacity-60 rounded-lg font-medium"
                >
                  {sendingReset && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                  Email me a reset link
                </button>
                {resetMessage && <p role="status" className="mt-2">{resetMessage}</p>}
                <p className="mt-2">Need a new staff account, or no email arriving? Contact Kareena or Armaan.</p>
                <a
                  href="mailto:kareena@grandtravelcruise.com,armaan@grandtravelcruise.com?subject=KAI%20staff%20CRM%20sign-in%20help"
                  className="mt-1.5 inline-flex items-center gap-1.5 font-medium underline underline-offset-2"
                >
                  <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                  Email for help
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={pending !== null}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2D3E35] hover:bg-[#1F2C25] disabled:opacity-60 text-[#FAF7F2] rounded-lg text-sm font-medium transition-colors"
            >
              {pending === "password" && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              {pending === "password" ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {DEMO_AUTH_ENABLED && (
            <div className="mt-6 pt-5 border-t border-[#E5DDD0]">
              <p className="text-xs text-amber-800 mb-2">Development only. This option doesn&apos;t exist on the live site.</p>
              <button
                type="button"
                onClick={demoSignIn}
                disabled={pending !== null}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-[#D9D0C2] hover:bg-[#FAF7F2] disabled:opacity-60 text-[#2D3E35] rounded-lg text-sm font-medium transition-colors"
              >
                {pending === "demo" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                Use test admin account
              </button>
            </div>
          )}

          <p className="mt-8 text-xs text-[#5C6B5E]">
            Staff only. Sign-ins are logged, and you stay signed in for up to 7 days unless you sign out. Don&apos;t use
            &ldquo;Remember my email&rdquo; on a shared computer.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function OperatorLoginPage() {
  return (
    <Suspense fallback={<div className="-mt-20 min-h-screen bg-white" />}>
      <LoginForm />
    </Suspense>
  );
}
