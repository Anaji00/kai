"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Send,
  Scale,
  Mail,
  RefreshCw,
  ExternalLink,
  Sparkles,
  HeartPulse,
  FileText,
  Calendar,
  Globe2,
  HelpCircle,
  Compass,
  Briefcase,
  Mic
} from "lucide-react";
import { fetchCohortCapacities, SanctuaryCohortStatus, seedDemoIntakes, fetchDraftStats } from "@/lib/sidecar-api";
import TernFormsModal from "@/components/portal/TernFormsModal";
import PortalHelpModal from "@/components/portal/PortalHelpModal";
import ClinicalCopilotDrawer from "@/components/portal/ClinicalCopilotDrawer";
import VoiceConsultationModal from "@/components/portal/VoiceConsultationModal";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [cohorts, setCohorts] = useState<SanctuaryCohortStatus[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [isFormsOpen, setIsFormsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);

  const loadDraftsCount = async () => {
    try {
      const stats = await fetchDraftStats();
      setPendingDraftsCount(stats.total_pending);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTelemetry = async () => {
    try {
      const data = await fetchCohortCapacities();
      setCohorts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchTelemetry = async () => {
      try {
        const data = await fetchCohortCapacities();
        if (active) setCohorts(data);
        await loadDraftsCount();
      } catch (err) {
        console.error(err);
      }
    };
    fetchTelemetry();
    window.addEventListener("drafts-updated", loadDraftsCount);
    const interval = setInterval(fetchTelemetry, 20000);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("drafts-updated", loadDraftsCount);
    };
  }, []);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      await seedDemoIntakes();
      setSeedSuccess(true);
      await loadTelemetry();
      await loadDraftsCount();
      setTimeout(() => setSeedSuccess(false), 3000);
      window.dispatchEvent(new Event("intakes-updated"));
      window.dispatchEvent(new Event("drafts-updated"));
    } catch (e) {
      console.error("Seed error:", e);
    } finally {
      setSeeding(false);
    }
  };

  const navItems = [
    { href: "/portal", label: "Guest Inquiries", icon: Users, badge: "Staging" },
    { 
      href: "/portal/drafts", 
      label: "Action Review Queue", 
      icon: Send, 
      badge: pendingDraftsCount > 0 ? `${pendingDraftsCount} Pending` : "Drafts" 
    },
    { href: "/portal/calendar", label: "Retreat Calendar", icon: Calendar, badge: "Live Feed" },
    { href: "/portal/travel-logistics", label: "Travel & Destinations", icon: Compass, badge: "Routes & Guides" },
    { href: "/portal/vendors", label: "Vendors & Suppliers", icon: Briefcase, badge: "Tern Back Office" },
    { href: "/portal/leads", label: "Partner Studios", icon: Sparkles, badge: "Referrals" },
    { href: "/portal/campaigns", label: "Concierge Broadcasts", icon: Send, badge: "SMS" },
    { href: "/portal/reconciliation", label: "Guest List Check", icon: Scale, badge: "Manifest" },
    { href: "/portal/emails", label: "Concierge Inbox", icon: Mail, badge: "Inbound" },
    { href: "/portal/webhooks", label: "Service Connections", icon: Globe2, badge: "Integrations" },
  ];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2D3E35] flex flex-col font-sans selection:bg-[#5C6B5E] selection:text-[#FAF7F2]">
      {/* Top Founder Operator Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E5DDD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Branding & Governance Badge */}
            <div className="flex items-center space-x-3">
              <Link href="/portal" className="group flex items-center space-x-2">
                <span className="font-serif text-2xl font-bold tracking-tight text-[#2D3E35] group-hover:text-[#C07D63] transition-colors">
                  KAI
                </span>
                <span className="text-[10px] font-semibold tracking-widest uppercase bg-[#2D3E35] text-[#FAF7F2] px-2 py-0.5 rounded">
                  FOUNDER STUDIO
                </span>
              </Link>
              <span className="text-[#C07D63] text-sm">/</span>
              <span className="text-xs text-[#5C6B5E] hidden sm:inline-block font-medium">
                Tern Guest & Travel Planner
              </span>

              {/* Personalized Founder Approval Pill */}
              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Personalized Founder Approval</span>
              </div>
            </div>

            {/* Right: Help Guide, Forms Hub, Seeder, Operator Profile */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsVoiceOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-[#2D3E35] bg-gradient-to-r from-amber-100 to-amber-50 hover:from-amber-200 hover:to-amber-100 border border-amber-300/80 rounded-md transition-all shadow-sm"
                title="Transcribe Founder Voice Note to Guest Dossier"
              >
                <Mic className="w-3.5 h-3.5 text-amber-700" />
                <span>Dictate Memo</span>
              </button>

              <button
                onClick={() => setIsHelpOpen(true)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors"
                title="Open Studio Orientation & Layman's Terms Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Help & Guide</span>
              </button>

              <button
                onClick={() => setIsFormsOpen(true)}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors"
                title="Open Tern Public Forms Hub (/responses/new)"
              >
                <FileText className="w-3.5 h-3.5 text-[#C07D63]" />
                <span>Tern Forms Hub</span>
              </button>

              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="hidden lg:inline-flex items-center space-x-1.5 px-3 py-1 text-xs font-medium text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors"
                title="Populate test sample submissions for Nosara, Amalfi, and Bali"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
                <span>{seedSuccess ? "Sample Seeded!" : "Test Sample Submission"}</span>
              </button>

              <div className="hidden sm:flex items-center space-x-2 border-l border-[#E5DDD0] pl-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-[#2D3E35] leading-tight">
                    Kareena Islam, BSN, RN
                  </div>
                  <div className="text-[10px] text-[#5C6B5E] flex items-center justify-end space-x-1">
                    <HeartPulse className="w-3 h-3 text-[#C07D63]" />
                    <span>Founder & Restorative Curator</span>
                  </div>
                </div>
              </div>

              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0] rounded-md hover:bg-white/50 transition-colors"
              >
                <span>Live Site</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Sub Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto py-2 border-t border-[#E5DDD0]/60 scrollbar-none">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
                      : "text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4]/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                      isActive
                        ? "bg-[#FAF7F2]/20 text-[#FAF7F2]"
                        : "bg-[#E5DDD0] text-[#5C6B5E]"
                    }`}
                  >
                    {item.badge}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Intimate Retreat Groups (12-14 Guests Max across all 4 Sanctuaries) */}
      <section className="bg-[#F2ECE4] border-b border-[#E5DDD0] px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 font-medium text-[#2D3E35]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C07D63]"></span>
            <span className="font-serif font-semibold text-sm">Intimate Retreat Groups (12–14 Guests Max)</span>
          </div>

          <div className="flex items-center space-x-3 overflow-x-auto py-1">
            {cohorts.map((c) => {
              const isNearCap = c.remaining_spots <= 3 && c.remaining_spots > 0;
              const isFull = c.remaining_spots === 0;
              return (
                <div
                  key={c.slug}
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border text-[11px] ${
                    isFull
                      ? "bg-red-50 border-red-200 text-red-800"
                      : isNearCap
                      ? "bg-amber-50 border-amber-200 text-amber-900 font-semibold"
                      : "bg-white/80 border-[#E5DDD0] text-[#2D3E35]"
                  }`}
                >
                  <span className="font-semibold">{c.title.split(" ")[0]}:</span>
                  <span>
                    {c.tern_confirmed_count + c.staged_count}/{c.capacity_limit} Booked
                  </span>
                  <span
                    className={`text-[10px] px-1 rounded ${
                      isFull
                        ? "bg-red-200 text-red-900"
                        : isNearCap
                        ? "bg-amber-200 text-amber-900"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isFull ? "FULL" : `${c.remaining_spots} spots left`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Floating AI Copilot Trigger */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsCopilotOpen(true)}
          className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-stone-900 hover:bg-stone-800 text-amber-400 border border-amber-500/40 shadow-xl hover:shadow-2xl transition-all group scale-100 hover:scale-105 active:scale-95"
          title="Open AI Clinical Somatic Copilot (KAI Brain)"
        >
          <div className="p-1 rounded-full bg-amber-500/20 text-amber-300">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <span className="text-xs font-semibold text-stone-100 font-serif">
            AI Copilot
          </span>
          <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
            KAI Brain
          </span>
        </button>
      </div>

      {/* Footer Audit Signature */}
      <footer className="bg-[#FAF7F2] border-t border-[#E5DDD0] py-4 text-center text-xs text-[#5C6B5E]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            KAI Wellness Retreats &copy; 2026–2027 &middot; Curated by Kareena Islam, BSN, RN &middot; Grand Travel & Cruise Host Agency
          </div>
          <div className="text-[11px] text-[#5C6B5E]/90 font-medium">
            Founder Sanctuary Care Platform &middot; Tern Travel Partner Engine &middot; Grand Travel & Cruise Host Agency
          </div>
        </div>
      </footer>

      {/* Modals and Drawers */}
      <TernFormsModal isOpen={isFormsOpen} onClose={() => setIsFormsOpen(false)} />
      <PortalHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ClinicalCopilotDrawer isOpen={isCopilotOpen} onClose={() => setIsCopilotOpen(false)} />
      <VoiceConsultationModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new Event("intakes-updated"));
          window.dispatchEvent(new Event("drafts-updated"));
        }}
      />
    </div>
  );
}
