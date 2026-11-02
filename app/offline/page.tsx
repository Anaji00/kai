"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Compass, RefreshCw, WifiOff, ShieldCheck, ArrowRight } from "lucide-react";

export default function OfflineStandbyPage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => {
      if (navigator.onLine) {
        router.push("/");
      } else {
        setChecking(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#1C1917] text-[#FAF7F2] flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Serene Icon Emblem */}
        <div className="relative mx-auto w-24 h-24 rounded-3xl bg-stone-900 border border-stone-800 flex items-center justify-center shadow-2xl">
          <div className="absolute inset-0 rounded-3xl bg-emerald-500/10 blur-xl"></div>
          <div className="relative flex flex-col items-center justify-center">
            <Compass className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>
        </div>

        {/* Status Messaging */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-900 border border-stone-800 text-xs text-stone-400">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span>Transit Offline Standby</span>
          </div>

          <h1 className="text-3xl font-serif tracking-tight text-stone-100">
            Circadian Quietude Active
          </h1>
          <p className="text-sm text-stone-400 leading-relaxed max-w-sm mx-auto">
            You are currently offline or in quiet transit. All cached itineraries, preferred supplier routes, and founder action drafts remain accessible locally.
          </p>
        </div>

        {/* Local Invariants Summary */}
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 text-left space-y-2 text-xs text-stone-300">
          <div className="flex items-center gap-2 font-medium text-stone-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Offline Operations Standby</span>
          </div>
          <ul className="space-y-1 text-stone-400 text-[11px] list-disc list-inside">
            <li>Cached retreat schedules & cohort rosters loaded</li>
            <li>VIP Grand Travel flight logs preserved</li>
            <li>Changes will sync once cellular or satellite radar resumes</li>
          </ul>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            disabled={checking}
            className="w-full py-3.5 px-6 rounded-xl font-medium text-sm text-[#1C1917] bg-[#FAF7F2] hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            <span>{isOnline ? "Reconnect to Sanctuary Site" : "Check Connection & Retry"}</span>
          </button>

          <Link
            href="/"
            className="text-xs text-stone-400 hover:text-stone-200 transition-colors inline-flex items-center justify-center gap-1"
          >
            <span>Return to Home</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </div>
    </div>
  );
}
