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
    FileText,
  Calendar,
  Globe2,
  HelpCircle,
  Compass,
  Briefcase,
  Mic,
  Database,
  Search,
  LogOut
} from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";
import { fetchCohortCapacities, SanctuaryCohortStatus, seedDemoIntakes, fetchDraftStats } from "@/lib/sidecar-api";
import NativeFormsModal from "@/components/portal/NativeFormsModal";
import PortalHelpModal from "@/components/portal/PortalHelpModal";
import ClinicalCopilotDrawer from "@/components/portal/ClinicalCopilotDrawer";
import VoiceConsultationModal from "@/components/portal/VoiceConsultationModal";
import GlobalCommandPaletteModal from "@/components/portal/GlobalCommandPaletteModal";

interface OperatorIdentity {
  email: string;
  full_name: string;
  role: string;
}

function OperatorSessionBadge() {
  const [operator, setOperator] = useState<OperatorIdentity | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    authFetch("/api/auth/me")
      .then(async (res) => {
        if (active && res.ok) setOperator(await res.json());
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    setSigningOut(true);
    try {
      await authFetch("/api/auth/operator/logout", { method: "POST" });
    } finally {
      window.location.assign("/portal/login");
    }
  };

  return (
    <div className="flex items-center gap-2 pl-2 border-l border-[#E5DDD0]">
      <div className="hidden xl:block text-right leading-tight">
        <p className="text-xs font-medium text-[#2D3E35]" title={operator?.email}>{operator?.full_name ?? "Checking session…"}</p>
        <p className="text-[10px] text-emerald-700">{operator ? "Session active" : ""}</p>
      </div>
      {operator && (
        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
          Admin
        </span>
      )}
      <button
        type="button"
        onClick={signOut}
        aria-label="Sign out"
        disabled={signingOut}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] disabled:opacity-60 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Sign-in renders without the portal shell, whose effects would call authenticated APIs.
  if (pathname === "/portal/login" || pathname === "/portal/reset-password") return <>{children}</>;
  return <AuthenticatedPortalShell>{children}</AuthenticatedPortalShell>;
}

function AuthenticatedPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [cohorts, setCohorts] = useState<SanctuaryCohortStatus[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [isFormsOpen, setIsFormsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [copilotInitialQuery, setCopilotInitialQuery] = useState<string | undefined>(undefined);
  const [copilotInitialMode, setCopilotInitialMode] = useState<any>(undefined);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
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

    const handleOpenCopilot = (e: Event) => {
      const customEvent = e as CustomEvent<{ query?: string; mode?: string }>;
      if (customEvent.detail?.query) {
        setCopilotInitialQuery(customEvent.detail.query);
      }
      if (customEvent.detail?.mode) {
        setCopilotInitialMode(customEvent.detail.mode);
      }
      setIsCopilotOpen(true);
    };
    window.addEventListener("kai:copilot:open", handleOpenCopilot);

    const handleOpenVoice = () => setIsVoiceOpen(true);
    window.addEventListener("kai:voice:open", handleOpenVoice);

    // Global Command Palette Shortcut (Cmd+K / Ctrl+K)
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);

    const interval = setInterval(fetchTelemetry, 20000);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("drafts-updated", loadDraftsCount);
      window.removeEventListener("kai:copilot:open", handleOpenCopilot);
      window.removeEventListener("kai:voice:open", handleOpenVoice);
      window.removeEventListener("keydown", handleGlobalKeyDown);
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
    { href: "/portal", label: "Inquiries", icon: Users },
    { href: "/portal/crm", label: "CRM", icon: Database },
    { 
      href: "/portal/drafts", 
      label: "Review Queue", 
      icon: Send, 
      badge: pendingDraftsCount > 0 ? String(pendingDraftsCount) : undefined 
    },
    { href: "/portal/calendar", label: "Calendar", icon: Calendar },
    { href: "/portal/travel-logistics", label: "Travel", icon: Compass },
    { href: "/portal/vendors", label: "Vendors", icon: Briefcase },
    { href: "/portal/leads", label: "Partners", icon: Sparkles },
    { href: "/portal/campaigns", label: "SMS", icon: Send },
    { href: "/portal/reconciliation", label: "Manifest", icon: Scale },
    { href: "/portal/emails", label: "Inbox", icon: Mail },
    { href: "/portal/webhooks", label: "Integrations", icon: Globe2 },
    { href: "/portal/staff", label: "Staff", icon: Users },
  ];

  return (
    <div className="-mt-20 min-h-screen bg-[#FAF7F2] text-[#2D3E35] flex flex-col font-sans selection:bg-[#5C6B5E] selection:text-[#FAF7F2]">
      {/* Top Founder Operator Header */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E5DDD0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15">
            {/* Left: Branding */}
            <div className="flex items-center space-x-3">
              <Link href="/portal" className="group flex items-center space-x-2">
                <img
                  src="/kai-logo.png"
                  alt="KAI Wellness Retreats"
                  className="w-7 h-7 rounded-full object-contain"
                />
                <span className="font-serif text-xl font-bold tracking-tight text-[#2D3E35] group-hover:text-[#C07D63] transition-colors">
                  KAI
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase bg-[#2D3E35] text-[#FAF7F2] px-1.5 py-0.5 rounded">
                  PORTAL
                </span>
              </Link>
            </div>

            {/* Right: Clean Utility Bar */}
            <div className="flex items-center space-x-1.5 whitespace-nowrap">
              {/* Global Command Palette Trigger */}
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs text-[#5C6B5E] hover:text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-all cursor-pointer"
                title="Search or Run Command (Cmd+K / Ctrl+K)"
              >
                <Search className="w-3.5 h-3.5 text-[#5C6B5E]" />
                <span className="hidden xl:inline font-medium">Search</span>
                <kbd className="hidden xl:inline-flex items-center px-1 text-[10px] font-mono bg-white/90 border border-[#E5DDD0] rounded text-[#5C6B5E]">
                  ⌘K
                </kbd>
              </button>

              <button
                onClick={() => setIsVoiceOpen(true)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-semibold text-[#2D3E35] bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-md transition-all cursor-pointer"
                title="Voice Memo to Guest Dossier"
              >
                <Mic className="w-3.5 h-3.5 text-amber-700" />
                <span className="hidden sm:inline">Voice</span>
              </button>

              <button
                onClick={() => setIsFormsOpen(true)}
                className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer"
                title="Forms Hub"
              >
                <FileText className="w-3.5 h-3.5 text-[#C07D63]" />
                <span className="hidden xl:inline">Forms</span>
              </button>

              <button
                onClick={() => setIsHelpOpen(true)}
                className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer"
                title="Help & Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden xl:inline">Help</span>
              </button>

              {process.env.NODE_ENV !== "production" && (
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="hidden lg:inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer"
                title="Seed sample intakes"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${seeding ? "animate-spin" : ""}`} />
                <span className="hidden 2xl:inline">{seedSuccess ? "Seeded!" : "Seed Demo"}</span>
              </button>
              )}

              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-[#5C6B5E] hover:text-[#2D3E35] border border-[#E5DDD0] rounded-md hover:bg-white/50 transition-colors"
              >
                <span className="hidden xl:inline">Site</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <OperatorSessionBadge />
            </div>
          </div>

          {/* Clean Sub Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto py-1.5 border-t border-[#E5DDD0]/60 scrollbar-none">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-[#2D3E35] text-[#FAF7F2] shadow-2xs"
                      : "text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4]/70"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                        isActive
                          ? "bg-amber-400 text-black"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Compact Cohort Strip */}
      <section className="bg-[#F2ECE4] border-b border-[#E5DDD0] px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2 font-medium text-[#2D3E35]">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C07D63]" />
            <span className="font-serif font-semibold text-xs">12–14 Guest Cap</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto py-0.5">
            {cohorts.map((c) => {
              const isNearCap = c.remaining_spots <= 3 && c.remaining_spots > 0;
              const isFull = c.remaining_spots === 0;
              return (
                <div
                  key={c.slug}
                  className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border text-[11px] whitespace-nowrap ${
                    isFull
                      ? "bg-red-50 border-red-200 text-red-800"
                      : isNearCap
                      ? "bg-amber-50 border-amber-200 text-amber-900 font-semibold"
                      : "bg-white/80 border-[#E5DDD0] text-[#2D3E35]"
                  }`}
                >
                  <span className="font-semibold">{c.title.split(" ")[0]}</span>
                  <span className="text-[#5C6B5E]">
                    {(c.crm_confirmed_count ?? 0) + c.staged_count}/{c.capacity_limit}
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
                    {isFull ? "FULL" : `${c.remaining_spots} left`}
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

      {/* Floating AI Copilot Trigger (Minimalist ChatGPT Pill) */}
      {!isCopilotOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setIsCopilotOpen(true)}
            className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full bg-[#0D0D0D] hover:bg-[#171717] text-white border border-white/[0.12] shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer group"
            title="Open KAI AI Assistant (ChatGPT Workspace & Live CRM)"
          >
            <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.12]">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0D0D0D]" />
            </div>
            <div className="text-left leading-tight">
              <span className="text-xs font-medium text-white tracking-tight block">
                Ask KAI
              </span>
              <span className="text-[10px] text-neutral-400 block">
                CRM &amp; Sanctuary AI
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Footer Audit Signature */}
      <footer className="bg-[#FAF7F2] border-t border-[#E5DDD0] py-4 text-center text-xs text-[#5C6B5E]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            KAI Wellness Retreats &copy; 2026–2027 &middot; Curated by Kareena Islam &middot; Grand Travel & Cruise Host Agency
          </div>
          <div className="text-[11px] text-[#5C6B5E]/90 font-medium">
            Founder Sanctuary Care Platform &middot; KAI Travel CRM Platform &middot; Grand Travel & Cruise Host Agency
          </div>
        </div>
      </footer>

      {/* Modals and Drawers */}
      <GlobalCommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onOpenVoiceMemo={() => setIsVoiceOpen(true)}
        onOpenFormsHub={() => setIsFormsOpen(true)}
        onOpenCopilot={(query, mode) => {
          setCopilotInitialQuery(query);
          setCopilotInitialMode(mode);
          setIsCopilotOpen(true);
        }}
      />
      <NativeFormsModal isOpen={isFormsOpen} onClose={() => setIsFormsOpen(false)} />
      <PortalHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ClinicalCopilotDrawer 
        isOpen={isCopilotOpen} 
        onClose={() => {
          setIsCopilotOpen(false);
          setCopilotInitialQuery(undefined);
          setCopilotInitialMode(undefined);
        }} 
        initialQuery={copilotInitialQuery}
        initialMode={copilotInitialMode}
      />
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
