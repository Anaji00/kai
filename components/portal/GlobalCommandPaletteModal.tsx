"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Users,
  Send,
  Calendar,
  Compass,
  Briefcase,
  Sparkles,
  Scale,
  Mail,
  Globe2,
  Database,
  Plus,
  Download,
  Mic,
  Printer,
  FileText,
  DollarSign,
  Plane,
  HeartPulse,
  Utensils,
  ChevronRight,
  ArrowRight,
  Command,
  CornerDownLeft,
} from "lucide-react";
import { AttendeeRow } from "@/components/portal/crm/AttendeeSpreadsheetTab";
import { fetchDraftStats } from "@/lib/sidecar-api";

interface GlobalCommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVoiceMemo?: () => void;
  onOpenFormsHub?: () => void;
  onOpenCopilot?: (query?: string, mode?: string) => void;
}

type PaletteCategory = "all" | "screens" | "guests" | "actions" | "copilot";

interface PaletteItem {
  id: string;
  category: "screens" | "guests" | "actions" | "copilot";
  title: string;
  subtitle: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  keywords?: string[];
  action: () => void;
}

const DEFAULT_GUESTS: Array<{
  name: string;
  email: string;
  flight: string;
  sanctuary: string;
  room: string;
  status: string;
}> = [
  {
    name: "Lady Elena Vance",
    email: "elena.vance@vanceholdings.co.uk",
    flight: "BA 2157",
    sanctuary: "Nosara Coastal Sanctuary",
    room: "Master Ocean Canopy Villa 1A",
    status: "Confirmed",
  },
  {
    name: "Marcus Thorne",
    email: "marcus.thorne@thornecap.com",
    flight: "AA 1042",
    sanctuary: "Amalfi Coast Sanctuary",
    room: "Cliffside Sunset Pavilion 2B",
    status: "Confirmed",
  },
  {
    name: "Sofia Chen",
    email: "sofia.chen@novabiowellness.com",
    flight: "SQ 942",
    sanctuary: "Sacred Springs Sanctuary, Bali",
    room: "Oceanfront Villa Suite 3A",
    status: "Confirmed",
  },
  {
    name: "Dr. Julian Sterling",
    email: "j.sterling@harborfunctional.org",
    flight: "UA 1482",
    sanctuary: "Nosara Coastal Sanctuary",
    room: "Garden Canopy Suite 4A",
    status: "Deposit Paid",
  },
  {
    name: "Claire Delacroix",
    email: "claire@delacroixdesign.fr",
    flight: "AF 482",
    sanctuary: "Amalfi Coast Sanctuary",
    room: "Cliffside Sunset Pavilion 1B",
    status: "Confirmed",
  },
  {
    name: "David & Rachel Kim",
    email: "david.kim@kimcapital.com",
    flight: "DL 1892",
    sanctuary: "Sacred Springs Sanctuary, Bali",
    room: "Master Sanctuary Villa 5B",
    status: "Confirmed",
  },
  {
    name: "Frank Lucas",
    email: "frank.lucas@lucastech.com",
    flight: "UA 842",
    sanctuary: "Puerto Vallarta Sanctuary",
    room: "Oceanfront Villa Suite 2A",
    status: "Deposit Paid",
  },
  {
    name: "Sarah Jenkins",
    email: "sarah.jenkins@zenithmedia.com",
    flight: "BA 2159",
    sanctuary: "Nosara Coastal Sanctuary",
    room: "Oceanfront Villa Suite 1B",
    status: "Confirmed",
  },
];

export default function GlobalCommandPaletteModal({
  isOpen,
  onClose,
  onOpenVoiceMemo,
  onOpenFormsHub,
  onOpenCopilot,
}: GlobalCommandPaletteModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PaletteCategory>("all");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pendingDraftsCount, setPendingDraftsCount] = useState<number>(0);
  const [cachedAttendees, setCachedAttendees] = useState<AttendeeRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load drafts count and cached attendees
  useEffect(() => {
    if (!isOpen) return;

    // Focus input on open
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);

    // Fetch live draft count
    fetchDraftStats()
      .then((s) => setPendingDraftsCount(s.total_pending))
      .catch(() => {});

    // Read cached attendee rows from localStorage if present
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("kai_attendee_board_rows_v2");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCachedAttendees(parsed);
          }
        }
      } catch (err) {
        console.warn("Could not read cached attendees:", err);
      }
    }
  }, [isOpen]);

  // Reset selected index when query or category changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, category]);

  // Build the complete index of items
  const allItems = useMemo<PaletteItem[]>(() => {
    const items: PaletteItem[] = [];

    // 1. Screens
    const screens: Array<{
      id: string;
      title: string;
      subtitle: string;
      href: string;
      icon: React.ElementType;
      badge: string;
      keywords: string[];
    }> = [
      {
        id: "screen-inquiries",
        title: "Guest Inquiries (Founder Studio)",
        subtitle: "Review incoming retreat applications, staged intakes & medical notes",
        href: "/portal",
        icon: Users,
        badge: "Staging",
        keywords: ["inquiries", "intake", "founder", "staging", "leads", "applications", "screening"],
      },
      {
        id: "screen-spreadsheet",
        title: "Attendee Spreadsheet Board",
        subtitle: "Monday.com-style live grid: rooms, suites, nights, payments & flight tracking",
        href: "/portal/crm?tab=spreadsheet",
        icon: Database,
        badge: "Live Grid",
        keywords: ["spreadsheet", "excel", "attendees", "monday", "guests", "rows", "rooms", "villas", "dates", "board"],
      },
      {
        id: "screen-drafts",
        title: "Action Review Queue",
        subtitle: pendingDraftsCount > 0 ? `${pendingDraftsCount} pending messages waiting for your review` : "Review drafts before sending — nothing goes out without your approval",
        href: "/portal/drafts",
        icon: Send,
        badge: pendingDraftsCount > 0 ? `${pendingDraftsCount} Pending` : "Drafts",
        keywords: ["drafts", "queue", "approval", "review", "actions", "pending", "write", "governance"],
      },
      {
        id: "screen-crm",
        title: "Travel CRM Overview",
        subtitle: "Sanctuary client dossiers, booked itineraries & credit card authorizations",
        href: "/portal/crm",
        icon: Database,
        badge: "Clients & Trips",
        keywords: ["crm", "clients", "trips", "authorizations", "cards", "travelers", "profiles"],
      },
      {
        id: "screen-calendar",
        title: "Retreat & Alignment Calendar",
        subtitle: "Live feed of upcoming sanctuary dates, 12-14 limits & consultation calls",
        href: "/portal/calendar",
        icon: Calendar,
        badge: "Live Feed",
        keywords: ["calendar", "dates", "schedule", "cohorts", "groups", "ical", "timeline"],
      },
      {
        id: "screen-travel-logistics",
        title: "Travel Logistics & Flight Radar",
        subtitle: "Cirium flight tracker, tarmac chauffeurs, scenic routes & microclimates",
        href: "/portal/travel-logistics",
        icon: Compass,
        badge: "Routes & Guides",
        keywords: ["travel", "logistics", "flights", "cirium", "radar", "chauffeur", "routes", "weather", "dining", "airports"],
      },
      {
        id: "screen-vendors",
        title: "Vendors & Preferred Suppliers",
        subtitle: "Wholesale commissions, private chauffeurs, organic caterers & emergency contacts",
        href: "/portal/vendors",
        icon: Briefcase,
        badge: "Directory",
        keywords: ["vendors", "suppliers", "commissions", "directory", "caterers", "contracts", "wholesale"],
      },
      {
        id: "screen-leads",
        title: "Partner Wellness Studios",
        subtitle: "Reformer pilates studios, functional medicine clinics & referral syndicates",
        href: "/portal/leads",
        icon: Sparkles,
        badge: "Referrals",
        keywords: ["leads", "partners", "studios", "pilates", "clinics", "syndicate", "referrals"],
      },
      {
        id: "screen-campaigns",
        title: "Concierge SMS Broadcasts",
        subtitle: "Pre-arrival dispatches, packing updates & group announcements",
        href: "/portal/campaigns",
        icon: Send,
        badge: "SMS",
        keywords: ["campaigns", "broadcasts", "sms", "announcements", "text", "messages", "cohort"],
      },
      {
        id: "screen-reconciliation",
        title: "Guest List Check (Manifest)",
        subtitle: "Compare registered website guests against confirmed CRM files",
        href: "/portal/reconciliation",
        icon: Scale,
        badge: "Manifest",
        keywords: ["reconciliation", "manifest", "guest list", "check", "audit", "comparison"],
      },
      {
        id: "screen-emails",
        title: "Concierge Inbox",
        subtitle: "Inbound guest questions, WhatsApp notes & concierge threads",
        href: "/portal/emails",
        icon: Mail,
        badge: "Inbound",
        keywords: ["emails", "inbox", "inbound", "messages", "whatsapp", "threads", "concierge"],
      },
      {
        id: "screen-webhooks",
        title: "Service Connections & Webhooks",
        subtitle: "Status of external integrations: Grand Travel, Expedia, WhatsApp & CRM",
        href: "/portal/webhooks",
        icon: Globe2,
        badge: "Integrations",
        keywords: ["webhooks", "integrations", "connections", "services", "api", "health"],
      },
    ];

    screens.forEach((s) => {
      items.push({
        id: s.id,
        category: "screens",
        title: s.title,
        subtitle: s.subtitle,
        icon: s.icon,
        badge: s.badge,
        badgeColor: "bg-[#2D3E35] text-[#FAF7F2]",
        keywords: s.keywords,
        action: () => {
          onClose();
          router.push(s.href);
        },
      });
    });

    // 2. Guests & Attendees (Dynamic + Curated)
    const combinedGuests = [...cachedAttendees];
    // Add default guests if not already present
    DEFAULT_GUESTS.forEach((dg) => {
      if (!combinedGuests.some((cg) => cg.email.toLowerCase() === dg.email.toLowerCase())) {
        combinedGuests.push({
          id: `guest_${dg.email}`,
          name: dg.name,
          email: dg.email,
          phone: "+1 (555) 019-2834",
          sanctuarySlug: "nosara",
          sanctuaryName: dg.sanctuary,
          checkInDate: "2026-11-14",
          checkOutDate: "2026-11-21",
          nights: 7,
          roomTier: dg.room,
          roomNumber: dg.room,
          assignedHost: "Kareena Islam (BSN RN)",
          groupCategory: "confirmed",
          bookingStatus: dg.status as any,
          totalPrice: 9800,
          amountPaid: 9800,
          balanceDue: 0,
          flightStatus: "Flight Booked & Chauffeur Set",
          flightDetails: `Flight ${dg.flight}`,
          dietaryNotes: "Plant-forward, seed-oil-free",
          clinicalSafety: "Cleared by Nurse",
        });
      }
    });

    combinedGuests.forEach((g) => {
      const flightNum = g.flightDetails?.match(/[A-Z0-9\s]{2,8}/i)?.[0] || g.flightDetails || "";
      items.push({
        id: `guest-${g.id || g.email}`,
        category: "guests",
        title: g.name,
        subtitle: `${g.sanctuaryName || "Sanctuary"} · ${g.roomNumber || g.roomTier || "Villa"} · Flight: ${flightNum || "TBD"}`,
        icon: Plane,
        badge: g.bookingStatus || "Guest",
        badgeColor: g.bookingStatus === "Confirmed" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white",
        keywords: [
          g.name.toLowerCase(),
          g.email.toLowerCase(),
          g.phone || "",
          flightNum.toLowerCase(),
          g.sanctuaryName?.toLowerCase() || "",
          g.roomNumber?.toLowerCase() || "",
          "guest",
          "attendee",
          "flight",
        ],
        action: () => {
          onClose();
          router.push(`/portal/crm?tab=spreadsheet&search=${encodeURIComponent(g.name)}`);
        },
      });
    });

    // 3. Quick Actions
    const quickActions: Array<{
      id: string;
      title: string;
      subtitle: string;
      icon: React.ElementType;
      badge: string;
      badgeColor: string;
      keywords: string[];
      action: () => void;
    }> = [
      {
        id: "action-add-attendee",
        title: "+ Add New Attendee Row",
        subtitle: "Insert an editable row into the Monday.com-style retreat guest board",
        icon: Plus,
        badge: "Action",
        badgeColor: "bg-[#C07D63] text-white",
        keywords: ["add", "new", "attendee", "row", "create", "insert", "guest"],
        action: () => {
          onClose();
          router.push("/portal/crm?tab=spreadsheet&action=new-row");
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("kai:spreadsheet:add-row"));
          }
        },
      },
      {
        id: "action-review-drafts",
        title: pendingDraftsCount > 0 ? `Review ${pendingDraftsCount} Pending Action Drafts` : "Review Pending Action Drafts",
        subtitle: "Review or approve queued messages (nothing is sent automatically)",
        icon: Send,
        badge: `${pendingDraftsCount} Pending`,
        badgeColor: "bg-amber-600 text-white",
        keywords: ["review", "drafts", "approve", "pending", "queue"],
        action: () => {
          onClose();
          router.push("/portal/drafts");
        },
      },
      {
        id: "action-export-csv",
        title: "Export Attendee Spreadsheet to CSV",
        subtitle: "Instantly download live guest roster with room assignments, pricing & flights",
        icon: Download,
        badge: "Download",
        badgeColor: "bg-emerald-600 text-white",
        keywords: ["export", "csv", "excel", "download", "roster", "spreadsheet"],
        action: () => {
          onClose();
          // Dispatch export event if on spreadsheet tab, or trigger download from cached rows
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("kai:spreadsheet:export-csv"));
            // Fallback direct export if not on spreadsheet tab
            try {
              const cached = localStorage.getItem("kai_attendee_board_rows_v2");
              const rowsToExport = cached ? JSON.parse(cached) : combinedGuests;
              const headers = ["Guest Name", "Email", "Phone", "Sanctuary", "Room", "Booking Status", "Total ($)", "Paid ($)", "Balance ($)", "Flight Details"];
              const csvLines = rowsToExport.map((r: any) => [
                `"${r.name}"`,
                `"${r.email}"`,
                `"${r.phone || ""}"`,
                `"${r.sanctuaryName || ""}"`,
                `"${r.roomNumber || r.roomTier || ""}"`,
                `"${r.bookingStatus || ""}"`,
                r.totalPrice || 0,
                r.amountPaid || 0,
                r.balanceDue || 0,
                `"${r.flightDetails || ""}"`,
              ].join(","));
              const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvLines].join("\n");
              const link = document.createElement("a");
              link.href = encodeURI(csvContent);
              link.download = `KAI_Sanctuary_Attendees_${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } catch (err) {
              console.error("Export fallback failed:", err);
            }
          }
        },
      },
      {
        id: "action-voice-memo",
        title: "Start Founder Voice Memo",
        subtitle: "Record clinical thoughts, travel notes or guest observations hands-free",
        icon: Mic,
        badge: "Voice",
        badgeColor: "bg-purple-600 text-white",
        keywords: ["voice", "memo", "dictate", "record", "audio", "mic", "transcribe"],
        action: () => {
          onClose();
          if (onOpenVoiceMemo) {
            onOpenVoiceMemo();
          } else if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("kai:voice:open"));
          }
        },
      },
      {
        id: "action-print-manifest",
        title: "Print Cohort Manifest & Emergency Dossier",
        subtitle: "Generate clean printable roster for on-site sanctuary hosts and medical team",
        icon: Printer,
        badge: "Print",
        badgeColor: "bg-stone-700 text-white",
        keywords: ["print", "manifest", "roster", "dossier", "pdf", "emergency"],
        action: () => {
          onClose();
          router.push("/portal/crm?tab=spreadsheet");
        },
      },
      {
        id: "action-native-forms",
        title: "Open KAI Native Forms Hub",
        subtitle: "Share direct guest intake, studio referral and travel preference form links",
        icon: FileText,
        badge: "Hub",
        badgeColor: "bg-[#2D3E35] text-[#FAF7F2]",
        keywords: ["forms", "hub", "intake", "share", "public", "links"],
        action: () => {
          onClose();
          if (onOpenFormsHub) {
            onOpenFormsHub();
          }
        },
      },
    ];

    quickActions.forEach((qa) => {
      items.push({
        id: qa.id,
        category: "actions",
        title: qa.title,
        subtitle: qa.subtitle,
        icon: qa.icon,
        badge: qa.badge,
        badgeColor: qa.badgeColor,
        keywords: qa.keywords,
        action: qa.action,
      });
    });

    // 4. Broad Business AI Copilot Prompts (The 5 Pillars)
    const copilotPrompts: Array<{
      id: string;
      title: string;
      subtitle: string;
      mode: string;
      icon: React.ElementType;
      badge: string;
      badgeColor: string;
      keywords: string[];
      query: string;
    }> = [
      {
        id: "ai-finance-buyout",
        title: "Calculate Villa Buyout Split Folio (14 Guests)",
        subtitle: "Compute individual suite share, 30% deposit hold & 70% balance at 45 days",
        mode: "executive_finance",
        icon: DollarSign,
        badge: "Finance",
        badgeColor: "bg-emerald-700 text-white",
        keywords: ["finance", "buyout", "split", "deposit", "balance", "pricing", "margin", "folio"],
        query: "Calculate full villa buyout split folio for 14 guests at Nosara Sacred Canopy with 30% deposit and 70% balance terms.",
      },
      {
        id: "ai-logistics-radar",
        title: "Cluster Delayed Arrivals into Chauffeur Waves (<=35m Wait)",
        subtitle: "Optimize airport Escalade & Sprinter pairings based on live flight radar",
        mode: "travel_logistics",
        icon: Plane,
        badge: "Radar",
        badgeColor: "bg-sky-700 text-white",
        keywords: ["flights", "radar", "chauffeur", "waves", "escalade", "transit", "delays", "logistics"],
        query: "Cluster delayed PVR arrivals into Escalade/Sprinter waves (<=35m wait) with WhatsApp chauffeur run-sheet.",
      },
      {
        id: "ai-b2b-syndicate",
        title: "Draft 15% Studio Referral Agreement",
        subtitle: "Formulate partnership terms for high-end reformer pilates & functional clinics",
        mode: "b2b_sales",
        icon: Sparkles,
        badge: "B2B Sales",
        badgeColor: "bg-amber-700 text-white",
        keywords: ["b2b", "sales", "syndicate", "commission", "pilates", "referral", "partnership"],
        query: "Draft B2B partnership proposal for luxury Manhattan reformer pilates studio with 15% syndicate referral commissions.",
      },
      {
        id: "ai-chef-dietary",
        title: "Generate Private Chef Dietary Banquet Matrix",
        subtitle: "Anti-inflammatory, seed-oil-free protocols with celiac & allergen cross-checks",
        mode: "chef_hospitality",
        icon: Utensils,
        badge: "Kitchen",
        badgeColor: "bg-orange-700 text-white",
        keywords: ["chef", "dietary", "matrix", "kitchen", "seed oil", "celiac", "allergy", "menu", "dining"],
        query: "Generate Private Chef Dietary Banquet Matrix (Celiac, Allium-free, Vegan, Seed-Oil-Free) for upcoming cohort.",
      },
      {
        id: "ai-clinical-triage",
        title: "Check Cold Plunge & Breathwork Safety",
        subtitle: "Nurse recommendations: gentle 4-7-8 breathing exercises for guest comfort",
        mode: "clinical_safety",
        icon: HeartPulse,
        badge: "Nurse Care",
        badgeColor: "bg-rose-700 text-white",
        keywords: ["clinical", "contraindication", "svt", "arrhythmia", "cold plunge", "breathwork", "safety", "nurse"],
        query: "Scenario #7: Screen guest with SVT arrhythmia & nut anaphylaxis. Safe somatic adaptations under nurse protocol.",
      },
      {
        id: "ai-ops-capacity",
        title: "Audit Intimate Retreat Capacity (12-14 Cap)",
        subtitle: "Check booked vs available spots across Nosara, Amalfi, Bali & Riviera Maya",
        mode: "studio_ops",
        icon: Users,
        badge: "Ops",
        badgeColor: "bg-purple-700 text-white",
        keywords: ["capacity", "cohort", "groups", "limit", "spots", "availability", "sanctuaries"],
        query: "What is the status of our upcoming 12–14 guest retreat groups across all 4 sanctuaries?",
      },
    ];

    copilotPrompts.forEach((cp) => {
      items.push({
        id: cp.id,
        category: "copilot",
        title: cp.title,
        subtitle: cp.subtitle,
        icon: cp.icon,
        badge: cp.badge,
        badgeColor: cp.badgeColor,
        keywords: cp.keywords,
        action: () => {
          onClose();
          if (onOpenCopilot) {
            onOpenCopilot(cp.query, cp.mode);
          } else if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("kai:copilot:open", {
                detail: { query: cp.query, mode: cp.mode },
              })
            );
          }
        },
      });
    });

    return items;
  }, [pendingDraftsCount, cachedAttendees, onClose, router, onOpenVoiceMemo, onOpenFormsHub, onOpenCopilot]);

  // Filter items by category and fuzzy query
  const filteredItems = useMemo(() => {
    let result = allItems;

    // Filter by tab
    if (category !== "all") {
      result = result.filter((item) => item.category === category);
    }

    // Filter by search query
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return result;

    const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);

    return result.filter((item) => {
      const titleLower = item.title.toLowerCase();
      const subtitleLower = item.subtitle.toLowerCase();
      const keywords = item.keywords || [];

      // Check if all query terms match something in title, subtitle, or keywords
      return queryTerms.every((term) => {
        if (titleLower.includes(term)) return true;
        if (subtitleLower.includes(term)) return true;
        if (keywords.some((k) => k.includes(term))) return true;
        return false;
      });
    });
  }, [allItems, category, query]);

  // Handle keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < filteredItems.length ? prev + 1 : 0));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredItems.length - 1));
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const activeItem = filteredItems[selectedIndex];
        if (activeItem) {
          activeItem.action();
        }
      }
    },
    [filteredItems, selectedIndex, onClose]
  );

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#E5DDD0] overflow-hidden flex flex-col text-[#2D3E35] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#E5DDD0] bg-white gap-3">
          <Search className="w-5 h-5 text-[#5C6B5E] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search screens, guest by name/flight #, actions, or ask Copilot..."
            className="flex-1 bg-transparent border-none text-sm font-medium text-[#2D3E35] placeholder:text-[#5C6B5E]/70 focus:outline-hidden focus:ring-0"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono bg-[#F2ECE4] border border-[#E5DDD0] rounded text-[#5C6B5E]">
              ESC
            </kbd>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center px-3 py-2 bg-[#F2ECE4]/70 border-b border-[#E5DDD0] gap-1 overflow-x-auto text-xs font-medium no-scrollbar">
          {(
            [
              { id: "all", label: "All Items" },
              { id: "screens", label: "Screens" },
              { id: "guests", label: "Guests & Flights" },
              { id: "actions", label: "Quick Actions" },
              { id: "copilot", label: "AI Copilot" },
            ] as const
          ).map((t) => {
            const isActive = category === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setCategory(t.id)}
                className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-[#2D3E35] text-[#FAF7F2] font-semibold shadow-xs"
                    : "text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-white/60"
                }`}
              >
                {t.label}
              </button>
            );
          })}
          <div className="ml-auto text-[11px] text-[#5C6B5E] font-medium pr-1 shrink-0">
            {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[380px] sm:max-h-[440px] overflow-y-auto p-2 space-y-1 divide-y divide-[#E5DDD0]/40"
        >
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#5C6B5E]">
              <Search className="w-8 h-8 text-[#5C6B5E]/40 mx-auto mb-2" />
              <p className="font-medium text-[#2D3E35]">No matching items found</p>
              <p className="text-xs text-[#5C6B5E] mt-1">
                Try searching for a guest name, flight number (e.g. &ldquo;BA 2157&rdquo;), or screen title.
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  data-index={idx}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
                      : "hover:bg-[#F2ECE4] text-[#2D3E35]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-white/15 text-[#FAF7F2]"
                        : "bg-white border border-[#E5DDD0] text-[#5C6B5E]"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider shrink-0 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : item.badgeColor || "bg-[#E5DDD0] text-[#5C6B5E]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-[11px] truncate ${
                        isSelected ? "text-white/80" : "text-[#5C6B5E]"
                      }`}
                    >
                      {item.subtitle}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center">
                    {isSelected ? (
                      <div className="flex items-center gap-1 text-[10px] font-mono bg-white/20 px-1.5 py-0.5 rounded text-white">
                        <span>Select</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#5C6B5E]/40" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Legend */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#F2ECE4] border-t border-[#E5DDD0] text-[11px] text-[#5C6B5E]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-white border border-[#E5DDD0] rounded text-[10px]">↑</kbd>
              <kbd className="px-1.5 py-0.5 font-mono bg-white border border-[#E5DDD0] rounded text-[10px]">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 font-mono bg-white border border-[#E5DDD0] rounded text-[10px]">↵</kbd>
              <span>Execute</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>Universal Search</span>
            <span className="text-[#C07D63] font-semibold">&middot;</span>
            <span className="font-semibold text-[#2D3E35]">KAI Staff Studio</span>
          </div>
        </div>
      </div>
    </div>
  );
}

