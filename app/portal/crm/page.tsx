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
import ClinicalSafetyTelemetryTab from "@/components/portal/crm/ClinicalSafetyTelemetryTab";
import TripOperationsDrawer from "@/components/portal/crm/TripOperationsDrawer";
import AIAutomationStudioTab from "@/components/portal/crm/AIAutomationStudioTab";
import ClientFormModal from "@/components/portal/crm/ClientFormModal";
import TripBuilderModal from "@/components/portal/crm/TripBuilderModal";

export default function NativeTravelCRMPage() {
  const [activeTab, setActiveTab] = useState<
    "attendees" | "clients" | "trips" | "cohorts" | "billing" | "clinical" | "ai_playbooks"
  >("attendees");
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

  // Automation state
  const [automatingTripId, setAutomatingTripId] = useState<string | null>(null);
  const [automationFeedback, setAutomationFeedback] = useState<string | null>(null);
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  // Concurrency Stress Simulator toggle
  const [showConcurrencyTest, setShowConcurrencyTest] = useState(false);
  const [reserveName, setReserveName] = useState("Aria Montgomery");
  const [reserveEmail, setReserveEmail] = useState("aria.montgomery@example.com");
  const [reservePhone, setReservePhone] = useState("+1-310-555-0194");
  const [reserveSanctuary, setReserveSanctuary] = useState("puerto-vallarta-2027");
  const [reserveRoom, setReserveRoom] = useState("Oceanfront King Suite");
  const [reserving, setReserving] = useState(false);

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

  const handleAtomicReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    setReserving(true);
    try {
      const res = await atomicReserveSanctuaryCohort(reserveSanctuary, {
        fullName: reserveName,
        email: reserveEmail,
        phone: reservePhone,
        roomPreference: reserveRoom,
        movementExperience: "reformer-advanced",
        healthNotes: "Mild vagal fatigue; prefers morning oceanfront sessions",
        waiverSignature: reserveName,
      });
      if (res.allocated) {
        setAutomationFeedback(
          `Atomic Cohort Lock Confirmed [${res.booking_reference}]: ${reserveName} allocated to ${reserveSanctuary} (${res.cohort_count}/12 filled, ${res.spots_remaining} spots left · Draft #${res.draft_id}).`
        );
      } else {
        setAutomationFeedback(
          `Cohort Capacity Gate (12/12 Full): ${reserveName} placed on Priority VIP Waitlist (#${res.waitlist_position}) with $0 charge until suite release (Draft #${res.draft_id}).`
        );
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("drafts-updated"));
      }
      loadData();
    } catch (err: unknown) {
      setAutomationFeedback(`Notice: ${err instanceof Error ? err.message : "Reservation failed"}`);
    } finally {
      setReserving(false);
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
      {/* Feedback Banner */}
      {automationFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{automationFeedback}</span>
          </div>
          <button
            onClick={() => setAutomationFeedback(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Title Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 flex-wrap">
            <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
              KAI Sanctuary Retreat Operations &amp; Guest Management
            </h1>
            <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
              Direct Sanctuary Database &middot; 36 Staff Workflows
            </span>
          </div>
          <p className="text-sm text-[#5C6B5E] mt-1">
            Guest Travel &amp; Retreat Care &middot; Manage Attendees, Bookings, Rooming, Payments &amp; Wellness Intakes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Guest List</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Guest Contacts</span>
            <Users className="w-4 h-4 text-[#2D3E35]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">{clients.length}</div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Detailed Profiles &amp; Notes</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Retreat Bookings</span>
            <Layers className="w-4 h-4 text-[#C07D63]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">{trips.length}</div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Current &amp; Upcoming Vacations</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue Tracked</span>
            <CreditCard className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">
            ${totalLifetimeSpend.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Paid Deposits &amp; Outstanding Balances</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between text-[#5C6B5E]">
            <span className="text-xs font-semibold uppercase tracking-wider">Flight &amp; Chauffeur Arrivals</span>
            <Plane className="w-4 h-4 text-blue-700" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#2D3E35]">{activeFlightsCount}</div>
          <div className="text-[11px] text-[#5C6B5E] mt-0.5">Flight Numbers &amp; Airport Transfers</div>
        </div>
      </div>

      {/* 7-Tab Workspace Navigation Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[#E5DDD0]/60 pb-3">
          <div className="flex flex-wrap bg-[#F2ECE4] rounded-lg p-1 text-xs border border-[#E5DDD0] gap-1">
            <button
              onClick={() => setActiveTab("attendees")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "attendees"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>Attendee Spreadsheet</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                Monday.com Grid
              </span>
            </button>

            <button
              onClick={() => setActiveTab("clients")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "clients"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#2D3E35]" />
              <span>Guest Profiles ({clients.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("trips")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "trips"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-blue-700" />
              <span>Vacations &amp; Itineraries ({trips.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("cohorts")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "cohorts"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#C07D63]" />
              <span>Rooming &amp; Group Logistics</span>
            </button>

            <button
              onClick={() => setActiveTab("billing")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "billing"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
              <span>Payments &amp; Villa Folios</span>
            </button>

            <button
              onClick={() => setActiveTab("clinical")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "clinical"
                  ? "bg-white text-[#2D3E35] shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <HeartPulse className="w-3.5 h-3.5 text-rose-700" />
              <span>Nurse Health &amp; Dietary Care</span>
            </button>

            <button
              onClick={() => setActiveTab("ai_playbooks")}
              className={`px-3.5 py-1.5 rounded-md font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === "ai_playbooks"
                  ? "bg-stone-900 text-amber-300 shadow-xs"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-500" />
              <span>Retreat Assistant Tools</span>
            </button>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-64">
              <Search className="w-4 h-4 text-[#5C6B5E] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search guest, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg text-[#2D3E35] placeholder:text-[#5C6B5E]/60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
              />
            </div>

            {activeTab === "clients" && (
              <button
                onClick={() => {
                  setClientToEdit(null);
                  setClientModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>New Client</span>
              </button>
            )}

            {activeTab === "trips" && (
              <button
                onClick={() => {
                  setTripToEdit(null);
                  setPreselectedClientId(undefined);
                  setTripModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] rounded-lg transition-colors shadow-xs shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Build Proposal</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills (shown on Clients & Trips tabs) */}
        {(activeTab === "clients" || activeTab === "trips") && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#5C6B5E] font-medium mr-1">Filter by Tag:</span>
              {popularTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? "bg-[#2D3E35] text-[#FAF7F2] font-bold"
                      : "bg-[#FAF7F2] text-[#5C6B5E] hover:bg-[#F2ECE4] border border-[#E5DDD0]"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {activeTab === "trips" && (
              <div className="flex items-center space-x-2">
                <span className="text-[#5C6B5E]">Sanctuary Cohort:</span>
                <select
                  value={selectedSanctuary}
                  onChange={(e) => setSelectedSanctuary(e.target.value)}
                  className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2.5 py-1 text-[#2D3E35] focus:outline-none"
                >
                  <option value="ALL">All Sanctuaries</option>
                  <option value="puerto-vallarta-2027">Puerto Vallarta</option>
                  <option value="nosara">Nosara</option>
                  <option value="amalfi">Amalfi</option>
                  <option value="bali">Bali</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TAB: ATTENDEE & VACATION SPREADSHEET (MONDAY.COM GRID) */}
      {activeTab === "attendees" && (
        <AttendeeSpreadsheetTab
          clients={clients}
          trips={trips}
          onRefreshData={loadData}
        />
      )}

      {/* TAB 0: AI ASSISTANTS & SCENARIO PLAYBOOKS */}
      {activeTab === "ai_playbooks" && (
        <AIAutomationStudioTab
          onRefresh={loadData}
          onNotify={(msg) => setAutomationFeedback(msg)}
        />
      )}

      {/* TAB 1: GROUP COHORTS & CRISIS AUTOMATIONS */}
      {activeTab === "cohorts" && (
        <CohortCommandTab
          trips={trips}
          onRefresh={loadData}
          onNotify={(msg) => setAutomationFeedback(msg)}
        />
      )}

      {/* TAB 2: SUB-TRIPS, ITINERARIES & SMART AVIATION DESK */}
      {activeTab === "trips" && (
        <div className="space-y-4">
          {trips.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-xs">
              <Compass className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-50" />
              <p className="font-serif text-lg font-bold text-[#2D3E35]">No Sanctuary Sub-Trips Stored</p>
              <p className="text-xs text-[#5C6B5E] mt-1">
                Sync an inquiry from the Guest Inquiries tab or use the Atomic Cohort Enrollment tool to generate a trip record.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {trips.map((trip) => {
                const isExpanded = expandedTripId === trip.id;
                const flight = trip.smart_flight || {};

                return (
                  <div
                    key={trip.id}
                    className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="font-serif text-lg font-bold text-[#2D3E35]">
                            {trip.title}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-900 border border-emerald-200">
                            {trip.status}
                          </span>
                        </div>
                        <div className="text-xs text-[#5C6B5E] mt-1 flex items-center space-x-2 flex-wrap">
                          <span>
                            Guest: <strong className="text-[#2D3E35]">{trip.client_name}</strong>
                          </span>
                          <span>&middot;</span>
                          <span>{trip.client_email}</span>
                          <span>&middot;</span>
                          <span className="font-medium text-[#2D3E35]">{trip.dates}</span>
                          <span>&middot;</span>
                          <span>Suite: {trip.room_tier}</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DDD0] text-[#5C6B5E]">
                          {trip.crm_trip_id}
                        </span>
                        <button
                          onClick={() => {
                            setTripToEdit(trip);
                            setTripModalOpen(true);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3 text-emerald-400" />
                          <span>Edit Itinerary</span>
                        </button>
                        <button
                          onClick={() => handleOpenTripDetail(trip.id)}
                          className="px-2.5 py-1 rounded text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] text-[#2D3E35] cursor-pointer"
                        >
                          Full Itinerary
                        </button>
                        <button
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] rounded-md transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Financial & Flight Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                        <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Total Stay</span>
                        <div className="font-bold text-sm text-[#2D3E35]">
                          ${trip.total_investment.toLocaleString()} USD
                        </div>
                      </div>

                      <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                        <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">30% Deposit</span>
                        <div className="font-bold text-xs text-[#C07D63]">
                          ${trip.deposit_amount.toLocaleString()} ({trip.deposit_status.replace(/_/g, " ")})
                        </div>
                      </div>

                      <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                        <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">70% Balance</span>
                        <div className="font-bold text-xs text-[#2D3E35]">
                          ${trip.final_balance.toLocaleString()} (Due 45d Prior)
                        </div>
                      </div>

                      <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                        <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Smart Flight</span>
                        <div className="font-semibold text-xs text-blue-900 truncate">
                          {flight.airline ? `${flight.airline} (${flight.departure_airport || "MIA"})` : "TBD Desk"}
                        </div>
                      </div>
                    </div>

                    {/* 1-Click Lifecycle Outreach Bar */}
                    <div className="pt-2 border-t border-[#E5DDD0]/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#2D3E35] flex items-center space-x-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#C07D63]" />
                          <span>1-Click Advisor Lifecycle Outreach &amp; Logistics Console:</span>
                        </span>
                        <button
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className="text-[11px] font-semibold text-[#C07D63] hover:underline cursor-pointer"
                        >
                          {isExpanded
                            ? "Hide Flight/Charter/Luggage/Passport Console ▲"
                            : "Open Flight, Jet Charter, Luggage & Passport Console ▼"}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          onClick={() => handleAutomate(trip.id, "draft_welcome", "Pre-Arrival Welcome")}
                          disabled={automatingTripId === trip.id}
                          className="px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-xs font-medium text-[#2D3E35] transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <Mail className="w-3 h-3 text-[#C07D63] shrink-0" />
                            <span className="truncate">Pre-Arrival Welcome</span>
                          </div>
                          <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] shrink-0" />
                        </button>

                        <button
                          onClick={() => handleAutomate(trip.id, "draft_packing_guide", "14-Day Packing Guide")}
                          disabled={automatingTripId === trip.id}
                          className="px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-xs font-medium text-[#2D3E35] transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <Compass className="w-3 h-3 text-[#2D3E35] shrink-0" />
                            <span className="truncate">Packing Guide</span>
                          </div>
                          <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] shrink-0" />
                        </button>

                        <button
                          onClick={() => handleAutomate(trip.id, "draft_flight_coordination", "Flight Alignment")}
                          disabled={automatingTripId === trip.id}
                          className="px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-xs font-medium text-[#2D3E35] transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <Plane className="w-3 h-3 text-blue-700 shrink-0" />
                            <span className="truncate">Flight Desk Sync</span>
                          </div>
                          <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] shrink-0" />
                        </button>

                        <button
                          onClick={() => handleAutomate(trip.id, "draft_post_retreat_arc", "30-Day Continuity Arc")}
                          disabled={automatingTripId === trip.id}
                          className="px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-xs font-medium text-[#2D3E35] transition-colors flex items-center justify-between group disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            <FileCheck2 className="w-3 h-3 text-emerald-700 shrink-0" />
                            <span className="truncate">30-Day Arc</span>
                          </div>
                          <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* Interactive Sub-Trip Operations Console (Delay, FBO Divert, Charter W&B, Lost Luggage, Upgrade, Passport) */}
                    {isExpanded && (
                      <TripOperationsDrawer
                        trip={trip}
                        onRefresh={loadData}
                        onNotify={(msg) => setAutomationFeedback(msg)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SANCTUARY PAY, MULTI-CURRENCY FX & SPLIT FOLIOS */}
      {activeTab === "billing" && (
        <BillingFolioTab
          trips={trips}
          onRefresh={loadData}
          onNotify={(msg) => setAutomationFeedback(msg)}
        />
      )}

      {/* TAB 4: RN CLINICAL SAFETY & SOMATIC TELEMETRY */}
      {activeTab === "clinical" && (
        <ClinicalSafetyTelemetryTab
          clients={clients}
          trips={trips}
          onRefresh={loadData}
          onNotify={(msg) => setAutomationFeedback(msg)}
        />
      )}

      {/* TAB 5: 360° CLIENT DOSSIERS & CONTACT MANAGEMENT */}
      {activeTab === "clients" && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-[#E5DDD0] shadow-xs">
            <div>
              <h3 className="font-serif text-base font-bold text-[#2D3E35] flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#C07D63]" />
                <span>Client Dossiers &amp; Guest Registry ({clients.length} Profiles)</span>
              </h3>
              <p className="text-xs text-[#5C6B5E] mt-0.5">
                Comprehensive luxury travel dossiers, RN clinical screening notes, and passport validity records.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConcurrencyTest(!showConcurrencyTest)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#5C6B5E] hover:text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-lg transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showConcurrencyTest ? "Hide Capacity Checker" : "Test Room & Group Limit (12–14 Guests)"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientToEdit(null);
                  setClientModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Create Client Dossier</span>
              </button>
            </div>
          </div>

          {/* Optional Collapsible Capacity Checker */}
          {showConcurrencyTest && (
            <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-sm font-bold text-[#2D3E35] flex items-center space-x-2">
                    <UserPlus className="w-4 h-4 text-[#C07D63]" />
                    <span>Intimate Group Size Safety Check (Guarantees max 12–14 guests per retreat)</span>
                  </h4>
                  <p className="text-xs text-[#5C6B5E]">
                    Checks that guest enrollment automatically honors retreat villa limits; shifts #13+ guests to a priority waitlist without extra charge.
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleAtomicReserve}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end text-xs"
              >
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={reserveName}
                    onChange={(e) => setReserveName(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Email</label>
                  <input
                    type="email"
                    value={reserveEmail}
                    onChange={(e) => setReserveEmail(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Phone</label>
                  <input
                    type="text"
                    value={reservePhone}
                    onChange={(e) => setReservePhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Sanctuary</label>
                  <select
                    value={reserveSanctuary}
                    onChange={(e) => setReserveSanctuary(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                  >
                    <option value="puerto-vallarta-2027">Puerto Vallarta</option>
                    <option value="nosara">Nosara</option>
                    <option value="amalfi">Amalfi</option>
                    <option value="bali">Bali</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Suite Tier</label>
                  <input
                    type="text"
                    value={reserveRoom}
                    onChange={(e) => setReserveRoom(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={reserving}
                  className="py-1.5 px-3 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-white font-semibold cursor-pointer"
                >
                  {reserving ? "Locking..." : "Atomic Reserve"}
                </button>
              </form>
            </div>
          )}

          {clients.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-xs">
              <Users className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-50" />
              <p className="font-serif text-lg font-bold text-[#2D3E35]">No CRM Clients Found</p>
              <p className="text-xs text-[#5C6B5E] mt-1">
                Approved website intakes are automatically converted to native CRM clients.
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
                      <span className="font-semibold">Health &amp; Dietary Notes: </span>
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
                        title="Edit Client Dossier"
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
                        title="Create Proposal for this Client"
                      >
                        <CalendarPlus className="w-3 h-3 text-emerald-700" />
                        <span>Build Proposal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenClientDetail(client.id)}
                        disabled={loadingClientDetail}
                        className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-semibold text-[#FAF7F2] bg-[#2D3E35] hover:bg-[#1f2c25] rounded-md transition-colors cursor-pointer"
                      >
                        <span>360&deg; Dossier</span>
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

      {/* 360-Degree Client Dossier Modal */}
      {selectedClientDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
                  <User className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#2D3E35]">
                    {selectedClientDetail.client.full_name}
                  </h3>
                  <p className="text-xs text-[#5C6B5E]">
                    Contact ID: <span className="font-mono">{selectedClientDetail.client.crm_contact_id}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setClientToEdit(selectedClientDetail.client);
                    setSelectedClientDetail(null);
                    setClientModalOpen(true);
                  }}
                  className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] font-semibold cursor-pointer"
                >
                  <Edit3 className="w-3 h-3 text-emerald-400" />
                  <span>Edit Dossier</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreselectedClientId(selectedClientDetail.client.id);
                    setTripToEdit(null);
                    setSelectedClientDetail(null);
                    setTripModalOpen(true);
                    setActiveTab("trips");
                  }}
                  className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 font-semibold cursor-pointer"
                >
                  <CalendarPlus className="w-3 h-3 text-emerald-700" />
                  <span>Build Proposal</span>
                </button>
                <button
                  onClick={() => setSelectedClientDetail(null)}
                  className="text-xs px-2.5 py-1 rounded bg-[#F2ECE4] hover:bg-[#EBE3D8] font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Email</span>
                  <div className="font-semibold text-[#2D3E35]">{selectedClientDetail.client.email}</div>
                </div>
                <div className="p-3 rounded-lg bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Phone</span>
                  <div className="font-semibold text-[#2D3E35]">
                    {selectedClientDetail.client.phone || "Not on file"}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold">Lifetime Spend</span>
                  <div className="font-bold text-sm text-[#2D3E35]">
                    ${selectedClientDetail.client.total_lifetime_spend.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Linked Trips in DB */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                  Linked Trips in Native DB ({selectedClientDetail.trips.length})
                </span>
                <div className="space-y-2 pt-1">
                  {selectedClientDetail.trips.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-[#2D3E35]">{t.title}</div>
                        <div className="text-[11px] text-[#5C6B5E]">
                          {t.dates} &middot; {t.room_tier} &middot; Status: {t.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#2D3E35]">${t.total_investment.toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-800 font-semibold">{t.deposit_status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health Notes & Tags */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                  Health &amp; Dietary Requirements
                </span>
                <p className="text-xs text-[#5C6B5E] leading-relaxed">
                  {selectedClientDetail.client.health_notes ||
                    selectedClientDetail.client.dietary_requirements ||
                    "No clinical flags indicated. Standard organic Blue Zone dining protocol."}
                </p>
                <div className="flex flex-wrap gap-1 pt-2">
                  {(selectedClientDetail.client.tags || []).map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Trip Record Modal */}
      {selectedTripDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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
    </div>
  );
}
