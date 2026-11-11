"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  RefreshCw,
  Plane,
  CreditCard,
  CheckCircle2,
  Sparkles,
  Mail,
  Compass,
  FileCheck2,
  SendHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight,
  User,
  HeartPulse,
  ShieldCheck,
  UserPlus,
  Bot,
  Plus,
  Edit3,
  CalendarPlus,
  SlidersHorizontal,
  FileSpreadsheet,
  X,
  ExternalLink,
} from "lucide-react";
import {
  fetchCrmClients,
  fetchCrmTrips,
  fetchCrmClientDetail,
  fetchCrmTripDetail,
  automateCrmTripOutreach,
  atomicReserveSanctuaryCohort,
  CRMClientItem,
  CRMTripItem,
  CRMClientDetailResponse,
  CRMTripDetailResponse,
} from "@/lib/sidecar-api";
import AttendeeSpreadsheetTab from "@/components/portal/crm/AttendeeSpreadsheetTab";
import CohortCommandTab from "@/components/portal/crm/CohortCommandTab";
import BillingFolioTab from "@/components/portal/crm/BillingFolioTab";
import dynamic from "next/dynamic";
import { GuestDetailDrawer } from "@/components/portal/crm/GuestDetailDrawer";
import { onFormFill } from "@/lib/portal-form-bus";

const ClientFormModal = dynamic(() => import("@/components/portal/crm/ClientFormModal"), { ssr: false });
const TripBuilderModal = dynamic(() => import("@/components/portal/crm/TripBuilderModal"), { ssr: false });

export default function NativeTravelCRMPage() {
  const [activeTab, setActiveTab] = useState<
    "attendees" | "clients" | "trips" | "cohorts" | "billing" | "ai_playbooks"
  >("attendees");
  const [guestViewMode, setGuestViewMode] = useState<"table" | "cards">("table");
  const [clients, setClients] = useState<CRMClientItem[]>([]);
  const [trips, setTrips] = useState<CRMTripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [selectedSanctuary, setSelectedSanctuary] = useState<string>("ALL");

  // General CRM Modals
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<CRMClientItem | null>(null);

  const [tripModalOpen, setTripModalOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<CRMTripItem | null>(null);
  const [preselectedClientId, setPreselectedClientId] = useState<string | undefined>(undefined);

  // Selected detail drawers
  const [selectedClientDetail, setSelectedClientDetail] = useState<CRMClientDetailResponse | null>(null);
  const [loadingClientDetail, setLoadingClientDetail] = useState(false);
  const [selectedTripDetail, setSelectedTripDetail] = useState<CRMTripDetailResponse | null>(null);
  const [loadingTripDetail, setLoadingTripDetail] = useState(false);

  // Operational Lens & Shortcuts State
  const [spreadsheetLens, setSpreadsheetLens] = useState<
    "ALL" | "ALERTS" | "BALANCE_DUE" | "MISSING_FLIGHT"
  >("ALL");
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // Automation state
  const [automatingTripId, setAutomatingTripId] = useState<string | null>(null);
  const [automationFeedback, setAutomationFeedback] = useState<string | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsData, tripsData] = await Promise.all([
        fetchCrmClients(
          searchQuery.trim() || undefined,
          selectedTag !== "ALL" ? selectedTag : undefined
        ),
        fetchCrmTrips(
          selectedSanctuary !== "ALL" ? selectedSanctuary : undefined
        ),
      ]);
      setClients(clientsData);
      setTrips(tripsData);
    } catch (err) {
      console.error("Failed to load native CRM data:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTag, selectedSanctuary]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleCrmUpdated = () => {
      loadData();
    };
    window.addEventListener("crm-updated", handleCrmUpdated);
    const unsubFormFill = onFormFill((proposal) => {
      loadData();
      if (proposal.target_tab === "billing" || proposal.form_type === "billing_folio") {
        setActiveTab("billing");
      } else if (proposal.target_tab === "attendees" || proposal.form_type === "attendee_row") {
        setActiveTab("attendees");
        setGuestViewMode("table");
      } else if (proposal.target_tab === "cohorts" || proposal.form_type === "cohort_update") {
        setActiveTab("cohorts");
      } else if (proposal.target_tab === "clients" || proposal.form_type === "client_form") {
        setActiveTab("attendees");
        setGuestViewMode("cards");
        if (proposal.form_type === "client_form") {
          setClientToEdit(null);
          setClientModalOpen(true);
        }
      } else if (proposal.form_type === "trip_builder") {
        setActiveTab("attendees");
        setTripToEdit(null);
        setTripModalOpen(true);
      } else if (proposal.form_type === "crm_mutation") {
        setAutomationFeedback(proposal.summary || "CRM record updated by KAI Assistant.");
      }
    });
    return () => {
      window.removeEventListener("crm-updated", handleCrmUpdated);
      unsubFormFill();
    };
  }, [loadData]);

  // Auto-dismiss floating toast notification after 4 seconds
  useEffect(() => {
    if (automationFeedback) {
      const timer = setTimeout(() => {
        setAutomationFeedback(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [automationFeedback]);

  // Global Hotkeys Listener (Shortcuts & Esc Dismissals)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showShortcutsModal) setShowShortcutsModal(false);
        if (selectedClientDetail) setSelectedClientDetail(null);
        if (selectedTripDetail) setSelectedTripDetail(null);
        return;
      }

      // Ignore hotkeys when typing in form controls
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      } else if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setClientToEdit(null);
        setClientModalOpen(true);
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setTripToEdit(null);
        setPreselectedClientId(undefined);
        setTripModalOpen(true);
      } else if (e.key === "1") {
        e.preventDefault();
        setActiveTab("attendees");
        setGuestViewMode("table");
      } else if (e.key === "2") {
        e.preventDefault();
        setActiveTab("cohorts");
      } else if (e.key === "3") {
        e.preventDefault();
        setActiveTab("billing");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedClientDetail, selectedTripDetail, showShortcutsModal]);

  const handleOpenClientDetail = async (clientId: string) => {
    setLoadingClientDetail(true);
    try {
      const detail = await fetchCrmClientDetail(clientId);
      setSelectedClientDetail(detail);
    } catch (err) {
      console.error("Failed to fetch client detail:", err);
    } finally {
      setLoadingClientDetail(false);
    }
  };

  const handleOpenTripDetail = async (tripId: string) => {
    setLoadingTripDetail(true);
    try {
      const detail = await fetchCrmTripDetail(tripId);
      setSelectedTripDetail(detail);
    } catch (err) {
      console.error("Failed to fetch trip detail:", err);
    } finally {
      setLoadingTripDetail(false);
    }
  };

  const handleInspectCompanion = async (companionName: string, companionId?: string) => {
    if (companionId) {
      await handleOpenClientDetail(companionId);
      return;
    }
    const cleanName = companionName.toLowerCase().trim();
    const matched = clients.find(
      (c) => c.full_name.toLowerCase().includes(cleanName) || cleanName.includes(c.full_name.toLowerCase())
    );
    if (matched) {
      await handleOpenClientDetail(matched.id);
    } else {
      setAutomationFeedback(`Companion record for '${companionName}' not found in active guest database.`);
    }
  };

  const handleAutomate = async (
    tripId: string,
    actionType: "draft_welcome" | "draft_packing_guide" | "draft_flight_coordination" | "draft_post_retreat_arc",
    label: string
  ) => {
    setAutomatingTripId(tripId);
    setAutomationFeedback(null);
    try {
      const res = await automateCrmTripOutreach(tripId, actionType, "Kareena Islam");
      setAutomationFeedback(
        `Automated "${label}" (Draft #${res.draft_id} staged in Action Review Queue for advisor approval).`
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("drafts-updated"));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Automation failed";
      setAutomationFeedback(`Notice: ${msg}`);
    } finally {
      setAutomatingTripId(null);
    }
  };

  // Metrics calculation
  const totalLifetimeSpend = clients.reduce((sum, c) => sum + (c.total_lifetime_spend || 0), 0);
  const activeFlightsCount = trips.filter(
    (t) => t.smart_flight && t.smart_flight.airline
  ).length;

  const popularTags = [
    "ALL",
    "CORTISOL_RESET",
    "VAGAL_DYSREGULATION",
    "LIE_FLAT_AIR",
    "BLUE_ZONE_DIET",
    "VIP_RETREAT",
  ];

  return (
    <div className="space-y-6">
      {/* Header & Title Strip (Clean Luxury Layout, Zero Emojis) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5 flex-wrap">
            <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
              Retreat &amp; Guest CRM
            </h1>
            <span className="text-[11px] font-mono font-semibold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              <span>Auto-Saved &amp; Synced</span>
            </span>
          </div>
          <p className="text-sm text-[#5C6B5E] mt-1">
            Click any guest row to edit rooms, status, payments, or dietary notes, or dispatch requests to KAI Assistant.
          </p>
        </div>

        {/* Always-Visible Primary Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("kai:copilot:open"));
              }
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-[#0D0D0D] text-white hover:bg-[#1A1A1A] border border-white/[0.12] rounded-lg transition-colors shadow-xs cursor-pointer"
            title="Open KAI Assistant to ask or update anything"
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ask KAI Assistant</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setClientToEdit(null);
              setClientModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ New Guest</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTripToEdit(null);
              setPreselectedClientId(undefined);
              setTripModalOpen(true);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold bg-white hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] rounded-lg transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#C07D63]" />
            <span>+ New Reservation</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-lg transition-all cursor-pointer"
            title="Refresh CRM data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="inline-flex items-center space-x-1 px-2.5 py-2 text-xs font-semibold text-[#5C6B5E] hover:text-[#2D3E35] bg-white hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-lg transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
          >
            <span className="font-mono text-[11px] font-bold">?</span>
            <span className="hidden sm:inline">Shortcuts</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid (Clickable Operational Deep-Links) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => {
            setActiveTab("attendees");
            setGuestViewMode("cards");
          }}
          className="p-4 rounded-xl bg-white border border-[#E5DDD0] hover:border-[#2D3E35]/40 shadow-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Guests</span>
            <Users className="w-4 h-4 text-[#2D3E35]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">{clients.length}</div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Active Directory &middot; Click for Cards</div>
        </div>

        <div
          onClick={() => {
            setActiveTab("attendees");
            setGuestViewMode("table");
            setSpreadsheetLens("ALL");
          }}
          className="p-4 rounded-xl bg-white border border-[#E5DDD0] hover:border-[#2D3E35]/40 shadow-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Bookings</span>
            <Layers className="w-4 h-4 text-[#C07D63]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">{trips.length}</div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Active Reservations &middot; Click for Roster</div>
        </div>

        <div
          onClick={() => {
            setActiveTab("attendees");
            setGuestViewMode("table");
            setSpreadsheetLens("BALANCE_DUE");
          }}
          className="p-4 rounded-xl bg-white border border-[#E5DDD0] hover:border-[#2D3E35]/40 shadow-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Revenue Tracked</span>
            <CreditCard className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">
            ${totalLifetimeSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Click for Balances Due</div>
        </div>

        <div
          onClick={() => {
            setActiveTab("attendees");
            setGuestViewMode("table");
            setSpreadsheetLens("MISSING_FLIGHT");
          }}
          className="p-4 rounded-xl bg-white border border-[#E5DDD0] hover:border-[#2D3E35]/40 shadow-xs transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Flights &amp; Transfers</span>
            <Plane className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">{activeFlightsCount}</div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Click for Missing Flights</div>
        </div>
      </div>

      {/* Streamlined Workspace Navigation Bar (3 Clean Workspaces) */}
      <div className="bg-white p-3 rounded-xl border border-[#E5DDD0] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap bg-[#F2ECE4] rounded-lg p-1 text-xs border border-[#E5DDD0] gap-1">
            <button
              onClick={() => setActiveTab("attendees")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${activeTab === "attendees" || activeTab === "clients" || activeTab === "trips"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>Guest Roster &amp; Bookings ({trips.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("cohorts")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${activeTab === "cohorts"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
                }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#C07D63]" />
              <span>Villas &amp; Logistics</span>
            </button>

            <button
              onClick={() => setActiveTab("billing")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${activeTab === "billing"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
                }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Billing &amp; Payments</span>
            </button>
          </div>

          {(activeTab === "attendees" || activeTab === "clients" || activeTab === "trips") && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-[#5C6B5E]">View Mode:</span>
              <div className="bg-[#F2ECE4] rounded-lg p-0.5 border border-[#E5DDD0] flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("attendees");
                    setGuestViewMode("table");
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${guestViewMode === "table" && activeTab !== "clients"
                      ? "bg-white text-[#2D3E35] shadow-xs"
                      : "text-[#5C6B5E] hover:text-[#2D3E35]"
                    }`}
                >
                  <FileSpreadsheet className="w-3 h-3 text-[#1A73E8]" />
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("attendees");
                    setGuestViewMode("cards");
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 cursor-pointer ${guestViewMode === "cards" || activeTab === "clients"
                      ? "bg-white text-[#2D3E35] shadow-xs"
                      : "text-[#5C6B5E] hover:text-[#2D3E35]"
                    }`}
                >
                  <Users className="w-3 h-3 text-[#C07D63]" />
                  <span>Guest Cards ({clients.length})</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TAB: ATTENDEE & VACATION SPREADSHEET OR GUEST CARDS */}
      {(activeTab === "attendees" && guestViewMode === "table") && (
        <AttendeeSpreadsheetTab
          clients={clients}
          trips={trips}
          initialLens={spreadsheetLens}
          onRefreshData={loadData}
          onInspectGuest={(clientId) => handleOpenClientDetail(clientId)}
          onInspectTrip={(tripId) => handleOpenTripDetail(tripId)}
        />
      )}

      {/* TAB 1: GROUP COHORTS & CRISIS AUTOMATIONS */}
      {activeTab === "cohorts" && (
        <CohortCommandTab
          trips={trips}
          onRefresh={loadData}
          onNotify={(msg) => setAutomationFeedback(msg)}
          clients={clients}
          onInspectGuest={(clientId) => handleOpenClientDetail(clientId)}
          onInspectTrip={(tripId) => handleOpenTripDetail(tripId)}
        />
      )}

      {/* TAB 3: SANCTUARY PAY, MULTI-CURRENCY FX & SPLIT FOLIOS */}
      {activeTab === "billing" && (
        <BillingFolioTab
          trips={trips}
          onRefresh={loadData}
          onNotify={(msg) => setAutomationFeedback(msg)}
          clients={clients}
          onInspectGuest={(clientId) => handleOpenClientDetail(clientId)}
          onInspectTrip={(tripId) => handleOpenTripDetail(tripId)}
        />
      )}

      {/* TAB 5: GUEST DIRECTORY */}
      {/* TAB: GUEST DIRECTORY CARDS (Either via Guest Cards Toggle or Legacy Clients Tab) */}
      {((activeTab === "attendees" && guestViewMode === "cards") || activeTab === "clients") && (
        <div className="space-y-4">
          {/* Header Action Bar with Instant Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E5DDD0] shadow-xs">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#C07D63]" />
              <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                Guest Directory ({clients.length})
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-[#5C6B5E] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter guests by name or email..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-2.5 text-[#5C6B5E] hover:text-[#2D3E35] cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setClientToEdit(null);
                  setClientModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] rounded-lg transition-colors shadow-xs cursor-pointer shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>+ New Guest</span>
              </button>
            </div>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-xs">
              <Users className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-50" />
              <p className="font-serif text-lg font-bold text-[#2D3E35]">No Guests Found</p>
              <p className="text-xs text-[#5C6B5E] mt-1">
                New guests who submit an inquiry or are added by staff will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs hover:border-[#2D3E35]/40 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-serif font-bold text-base text-[#2D3E35] flex items-center space-x-1.5">
                        <User className="w-4 h-4 text-[#C07D63]" />
                        <span>{client.full_name}</span>
                      </div>
                      <div className="text-xs text-[#5C6B5E] mt-0.5">
                        {client.email} {client.phone && <span>&middot; {client.phone}</span>}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DDD0] text-[#5C6B5E]">
                      {client.crm_contact_id}
                    </span>
                  </div>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-[#E5DDD0]/50">
                    <div className="bg-[#FAF7F2] p-2 rounded border border-[#E5DDD0]/70">
                      <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Trips</span>
                      <span className="font-bold text-[#2D3E35]">{client.total_trips_count} Total</span>
                    </div>
                    <div className="bg-[#FAF7F2] p-2 rounded border border-[#E5DDD0]/70">
                      <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Spend</span>
                      <span className="font-bold text-[#2D3E35]">${client.total_lifetime_spend.toLocaleString()}</span>
                    </div>
                    <div className="bg-[#FAF7F2] p-2 rounded border border-[#E5DDD0]/70">
                      <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Passport</span>
                      <span className="font-semibold text-emerald-800">
                        {client.passport_valid_6mo ? "Valid 6mo+" : "Check Exp"}
                      </span>
                    </div>
                  </div>

                  {/* Notes / Dietary */}
                  {(client.dietary_requirements || client.health_notes) && (
                    <div className="text-xs bg-amber-50/70 p-2.5 rounded-lg border border-amber-200/80 text-amber-950">
                      <span className="font-semibold">Dietary &amp; Guest Notes: </span>
                      <span>{client.dietary_requirements || client.health_notes}</span>
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {(client.tags || []).map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 flex items-center justify-between border-t border-[#E5DDD0]/60 gap-2 flex-wrap">
                    <span className="text-[10px] text-[#5C6B5E]">Source: {client.source || "Website Intake"}</span>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setClientToEdit(client);
                          setClientModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer"
                        title="Edit Guest Profile"
                      >
                        <Edit3 className="w-3 h-3 text-[#5C6B5E]" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPreselectedClientId(client.id);
                          setTripToEdit(null);
                          setTripModalOpen(true);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                        title="New Reservation for this Guest"
                      >
                        <CalendarPlus className="w-3 h-3 text-emerald-700" />
                        <span>New Reservation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenClientDetail(client.id)}
                        disabled={loadingClientDetail}
                        className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-[#FAF7F2] bg-[#2D3E35] hover:bg-[#1f2c25] rounded-md transition-colors cursor-pointer"
                      >
                        <span>Guest Profile</span>
                        <ArrowRight className="w-3 h-3 ml-0.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 360-Degree Guest Dossier & Compliance Slide-Over Drawer */}
      {selectedClientDetail && (
        <GuestDetailDrawer
          detail={selectedClientDetail}
          onClose={() => setSelectedClientDetail(null)}
          onEditClient={(clientToEdit) => {
            setClientToEdit(clientToEdit);
            setClientModalOpen(true);
          }}
          onNewProposal={(clientId) => {
            setPreselectedClientId(clientId);
            setTripToEdit(null);
            setTripModalOpen(true);
          }}
          onAutomateTrip={(tripId, actionType, label) => handleAutomate(tripId, actionType as any, label)}
          automatingTripId={automatingTripId}
          onInspectCompanion={handleInspectCompanion}
          onRefreshData={loadData}
          onInspectTrip={(tripId) => handleOpenTripDetail(tripId)}
        />
      )}

      {/* Full Trip Record Modal */}
      {selectedTripDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTripDetail(null);
          }}
        >
          <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#2D3E35]">
                  {selectedTripDetail.trip.title}
                </h3>
                <p className="text-xs text-[#5C6B5E]">
                  Trip ID: <span className="font-mono">{selectedTripDetail.trip.crm_trip_id}</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    const match = trips.find(
                      (t) =>
                        t.id === selectedTripDetail.trip.id ||
                        t.crm_trip_id === selectedTripDetail.trip.crm_trip_id
                    );
                    setTripToEdit(match || (selectedTripDetail.trip as any));
                    setSelectedTripDetail(null);
                    setTripModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-emerald-400" />
                  <span>Edit Itinerary &amp; Details</span>
                </button>
                <button
                  onClick={() => setSelectedTripDetail(null)}
                  className="text-xs px-2.5 py-1 rounded bg-[#F2ECE4] hover:bg-[#EBE3D8] font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                  Day-by-Day Itinerary Blocks Stored in Database
                </span>
                <div className="space-y-2 pt-1 max-h-60 overflow-y-auto">
                  {(selectedTripDetail.trip.itinerary_blocks || []).map((b, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-[#FAF7F2] border border-[#E5DDD0]">
                      <div className="font-bold text-[#2D3E35]">
                        {b.title || `Day ${b.day || idx + 1}: Sanctuary Experience`}
                      </div>
                      <div className="text-[11px] text-[#5C6B5E] mt-0.5">{b.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Client Form Modal (Create & Edit) */}
      <ClientFormModal
        isOpen={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={(msg) => {
          setAutomationFeedback(msg);
          loadData();
        }}
        clientToEdit={clientToEdit}
      />

      {/* Trip Builder & Itinerary Editor Modal */}
      <TripBuilderModal
        isOpen={tripModalOpen}
        onClose={() => setTripModalOpen(false)}
        onSuccess={(msg) => {
          setAutomationFeedback(msg);
          loadData();
        }}
        clients={clients}
        tripToEdit={tripToEdit}
        preselectedClientId={preselectedClientId}
      />

      {/* Keyboard Shortcuts Cheat Sheet Overlay */}
      {showShortcutsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShortcutsModal(false);
          }}
        >
          <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-md rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                  Concierge Keyboard Shortcuts
                </h3>
                <p className="text-xs text-[#5C6B5E]">High-speed navigation without mouse clicks</p>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 text-[#5C6B5E] hover:text-[#2D3E35] cursor-pointer"
                aria-label="Close shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-[#E5DDD0]/60">
                <span className="text-[#5C6B5E]">Focus Universal Search</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  /
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E5DDD0]/60">
                <span className="text-[#5C6B5E]">New Guest Profile</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  N
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E5DDD0]/60">
                <span className="text-[#5C6B5E]">New Reservation Proposal</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  R
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E5DDD0]/60">
                <span className="text-[#5C6B5E]">Guest Roster &amp; Bookings</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  1
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E5DDD0]/60">
                <span className="text-[#5C6B5E]">Villas &amp; Logistics (Cohorts)</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  2
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[#E5DDD0]/60">
                <span className="text-[#5C6B5E]">Billing &amp; Payments</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  3
                </kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[#5C6B5E]">Close Drawer / Modal / Overlay</span>
                <kbd className="px-2 py-0.5 rounded bg-white border border-[#E5DDD0] font-mono text-[11px] font-bold shadow-xs">
                  Esc
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Auto-Dismissing Toast Notification */}
      {automationFeedback && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#2D3E35] text-[#FAF7F2] px-4 py-3 rounded-xl shadow-xl border border-[#3E5246] text-xs flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{automationFeedback}</span>
          <button
            type="button"
            onClick={() => setAutomationFeedback(null)}
            className="text-stone-400 hover:text-white ml-2 cursor-pointer p-0.5 rounded transition-colors"
            aria-label="Dismiss Notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
