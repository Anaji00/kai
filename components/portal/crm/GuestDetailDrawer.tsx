"use client";

import React, { useState } from "react";
import {
  User,
  Edit3,
  CalendarPlus,
  X,
  ShieldCheck,
  AlertCircle,
  HeartPulse,
  Plane,
  ExternalLink,
  Mail,
  FileCheck2,
  Compass,
  Phone,
  MessageSquare,
  FileText,
  Send,
  Check,
  Copy,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  CRMClientDetailResponse,
  CRMClientItem,
  CRMActivityItem,
  logCrmClientActivity,
  updateCrmClientCompliance,
} from "@/lib/sidecar-api";

interface GuestDetailDrawerProps {
  detail: CRMClientDetailResponse;
  onClose: () => void;
  onEditClient: (client: CRMClientItem) => void;
  onNewProposal: (clientId: string) => void;
  onAutomateTrip: (tripId: string, actionType: string, label: string) => void;
  automatingTripId?: string | null;
  onInspectCompanion?: (companionName: string, companionId?: string) => void;
  onRefreshData?: () => void;
  onInspectTrip?: (tripId: string) => void;
}

export function GuestDetailDrawer({
  detail,
  onClose,
  onEditClient,
  onNewProposal,
  onAutomateTrip,
  automatingTripId,
  onInspectCompanion,
  onRefreshData,
  onInspectTrip,
}: GuestDetailDrawerProps) {
  const { client, trips, activities: initialActivities = [] } = detail;

  // Active drawer tab
  const [activeDrawerTab, setActiveDrawerTab] = useState<"overview" | "activity" | "reservations">("overview");

  // Local state for optimistic updates
  const [waiverStatus, setWaiverStatus] = useState<string>(client.waiver_status || "PENDING");
  const [medicalStatus, setMedicalStatus] = useState<string>(client.medical_clearance_status || "PENDING_REVIEW");
  const [companionName, setCompanionName] = useState<string>(client.companion_name || "");
  const [editingCompanion, setEditingCompanion] = useState<boolean>(false);
  const [companionInput, setCompanionInput] = useState<string>(client.companion_name || "");

  // Quick Activity Logger State (The 3-Second Rule)
  const [logCategory, setLogCategory] = useState<"CALL" | "WHATSAPP" | "NOTE" | "CLINICAL">("NOTE");
  const [logSummary, setLogSummary] = useState<string>("");
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [activities, setActivities] = useState<CRMActivityItem[]>(initialActivities);

  // 1-Click Clipboard Feedback State
  const [briefingCopied, setBriefingCopied] = useState<boolean>(false);
  const [complianceSaving, setComplianceSaving] = useState<boolean>(false);

  // Toggle Liability Waiver Status
  const handleToggleWaiver = async () => {
    const nextStatus = waiverStatus === "SIGNED" ? "PENDING" : "SIGNED";
    setWaiverStatus(nextStatus);
    setComplianceSaving(true);
    try {
      await updateCrmClientCompliance(client.id, { waiver_status: nextStatus as any });
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to update waiver status:", err);
      setWaiverStatus(waiverStatus);
    } finally {
      setComplianceSaving(false);
    }
  };

  // Toggle Medical Clearance Status
  const handleToggleMedical = async () => {
    const nextStatus = medicalStatus === "CLEARED" ? "PENDING_REVIEW" : "CLEARED";
    setMedicalStatus(nextStatus);
    setComplianceSaving(true);
    try {
      await updateCrmClientCompliance(client.id, { medical_clearance_status: nextStatus as any });
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to update medical clearance status:", err);
      setMedicalStatus(medicalStatus);
    } finally {
      setComplianceSaving(false);
    }
  };

  // Save Companion Link
  const handleSaveCompanion = async () => {
    const clean = companionInput.trim();
    setCompanionName(clean);
    setEditingCompanion(false);
    try {
      await updateCrmClientCompliance(client.id, { companion_name: clean || undefined });
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to link companion:", err);
    }
  };

  // 3-Second Quick Logger Submit Handler
  const handleLogActivity = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!logSummary.trim() || isLogging) return;

    const summaryText = logSummary.trim();
    setIsLogging(true);

    // Optimistic UI insertion
    const optimisticItem: CRMActivityItem = {
      id: `act_opt_${Date.now()}`,
      category: logCategory,
      summary: summaryText,
      details: "",
      operator_name: "Kareena Islam",
      timestamp: new Date().toISOString(),
    };
    setActivities((prev) => [optimisticItem, ...prev]);
    setLogSummary("");

    try {
      const res = await logCrmClientActivity(client.id, {
        category: logCategory,
        summary: summaryText,
        operator_name: "Kareena Islam",
      });
      if (res?.activity) {
        setActivities((prev) => [res.activity, ...prev.filter((a) => a.id !== optimisticItem.id)]);
      }
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to log activity:", err);
    } finally {
      setIsLogging(false);
    }
  };

  // 1-Click Copy Concierge Briefing
  const handleCopyBriefing = () => {
    const cleanPhone = client.phone || "Not on file";
    const primaryTrip = trips[0];
    const sanctuaryTitle = primaryTrip?.title || "KAI Wellness Retreat";
    const villaRoom = primaryTrip?.room_tier || "Villa Suite";
    const flightInfo = primaryTrip?.smart_flight?.airline
      ? `${primaryTrip.smart_flight.airline} ${primaryTrip.smart_flight.flight_number || ""} (ETA: ${primaryTrip.smart_flight.arrival_time || "TBA"})`
      : primaryTrip?.flight_details || "Awaiting Flight Details";
    const dietary = client.dietary_requirements || client.health_notes || "Standard organic menu";

    const text = [
      `KAI CONCIERGE BRIEFING`,
      `Guest: ${client.full_name}`,
      `Contact ID: ${client.crm_contact_id}`,
      `Phone: ${cleanPhone}`,
      `Email: ${client.email}`,
      `Sanctuary: ${sanctuaryTitle} (${primaryTrip?.dates || "Dates TBA"})`,
      `Accommodations: ${villaRoom}`,
      `Flight & Transfer: ${flightInfo}`,
      `Dietary & Health: ${dietary}`,
      `Legal Waiver: ${waiverStatus}`,
      `Clinical Clearance: ${medicalStatus}`,
      companionName ? `Traveling Companion: ${companionName}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setBriefingCopied(true);
    setTimeout(() => setBriefingCopied(false), 2200);
  };

  // WhatsApp Web URL helper
  const cleanPhoneDigits = (client.phone || "").replace(/[^0-9]/g, "");
  const whatsAppUrl = cleanPhoneDigits ? `https://wa.me/${cleanPhoneDigits}` : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-xl h-full border-l border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-right duration-200">
        {/* Sticky Header with 1-Click Staff Action Toolbar */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <span className="p-2.5 rounded-xl bg-[#2D3E35] text-[#FAF7F2] shrink-0 shadow-xs">
                <User className="w-5 h-5 text-amber-200" />
              </span>
              <div className="min-w-0">
                <h3 className="font-serif text-lg font-bold text-[#2D3E35] truncate">
                  {client.full_name}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[#5C6B5E] font-mono truncate">
                    {client.crm_contact_id}
                  </span>
                  {complianceSaving && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Saving...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              {/* WhatsApp 1-Click Direct Chat */}
              {whatsAppUrl ? (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100 font-semibold transition-colors cursor-pointer"
                  title="Open WhatsApp Direct Chat"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-700" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-stone-100 text-stone-400 border border-stone-200 font-semibold opacity-60 cursor-not-allowed"
                  title="No Phone on File"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              )}

              {/* 1-Click Copy Briefing for Kitchen or Chauffeur */}
              <button
                type="button"
                onClick={handleCopyBriefing}
                className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] text-[#2D3E35] border border-[#E5DDD0] hover:bg-[#F2ECE4] font-semibold transition-colors cursor-pointer"
                title="Copy formatted briefing to clipboard for driver or chef"
              >
                {briefingCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span className="text-emerald-800 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#5C6B5E]" />
                    <span className="hidden sm:inline">Briefing</span>
                  </>
                )}
              </button>

              {/* Edit Profile */}
              <button
                type="button"
                onClick={() => {
                  onEditClient(client);
                  onClose();
                }}
                className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-[#2D3E35] text-[#FAF7F2] hover:bg-[#1f2c25] font-semibold transition-colors cursor-pointer shadow-xs"
                title="Edit Guest Profile"
              >
                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Edit</span>
              </button>

              {/* Proposal / New Reservation */}
              <button
                type="button"
                onClick={() => {
                  onNewProposal(client.id);
                  onClose();
                }}
                className="inline-flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100 font-semibold transition-colors cursor-pointer"
                title="Create Proposal / New Reservation"
              >
                <CalendarPlus className="w-3.5 h-3.5 text-amber-800" />
                <span>Proposal</span>
              </button>

              {/* Close Drawer Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#EBE3D8] transition-colors cursor-pointer ml-1"
                aria-label="Close Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="flex items-center space-x-2 pt-1 border-t border-[#E5DDD0]/60">
            <button
              type="button"
              onClick={() => setActiveDrawerTab("overview")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeDrawerTab === "overview"
                  ? "bg-[#2D3E35] text-white shadow-xs"
                  : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Overview &amp; Clearance</span>
              {(waiverStatus !== "SIGNED" || medicalStatus !== "CLEARED") && (
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawerTab("activity")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeDrawerTab === "activity"
                  ? "bg-[#2D3E35] text-white shadow-xs"
                  : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Activity &amp; Notes</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-200 text-[#2D3E35]">
                {activities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveDrawerTab("reservations")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeDrawerTab === "reservations"
                  ? "bg-[#2D3E35] text-white shadow-xs"
                  : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Reservations</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-stone-200 text-[#2D3E35]">
                {trips.length}
              </span>
            </button>
          </div>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 text-xs">
          {/* ================================================================= */}
          {/* TAB 1: OVERVIEW & COMPLIANCE CLEARANCE                             */}
          {/* ================================================================= */}
          {activeDrawerTab === "overview" && (
            <div className="space-y-4">
              {/* Profile Details Matrix */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold tracking-wider">Email</span>
                  <div className="font-semibold text-[#2D3E35] truncate mt-0.5">{client.email}</div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold tracking-wider">Phone</span>
                  <div className="font-semibold text-[#2D3E35] truncate mt-0.5">
                    {client.phone || "Not on file"}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold tracking-wider">Lifetime Spend</span>
                  <div className="font-bold text-sm text-[#2D3E35] mt-0.5">
                    ${client.total_lifetime_spend.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white border border-[#E5DDD0]">
                  <span className="text-[10px] text-[#5C6B5E] uppercase block font-semibold tracking-wider">Passport Status</span>
                  <div className="font-semibold text-[#2D3E35] mt-0.5 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{client.passport_valid_6mo ? "Valid (6+ Months)" : "Needs Renewal"}</span>
                  </div>
                </div>
              </div>

              {/* 1-Click Compliance Checklist Card (Staff-First Controls) */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-2">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Pre-Arrival Clearance &amp; Legal Waivers
                    </span>
                  </div>
                  <span className="text-[10px] text-[#5C6B5E]">1-Click Staff Toggles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Liability Waiver Toggle */}
                  <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] text-[#5C6B5E] uppercase font-semibold block">Legal Liability Waiver</span>
                      <div className="mt-1 flex items-center space-x-1.5">
                        {waiverStatus === "SIGNED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Signed on File</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            <span>Pending Signature</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleWaiver}
                      className={`w-full py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                        waiverStatus === "SIGNED"
                          ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{waiverStatus === "SIGNED" ? "Mark Pending" : "Mark Waiver Signed"}</span>
                    </button>
                  </div>

                  {/* Medical / Clinical Triage Toggle */}
                  <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] text-[#5C6B5E] uppercase font-semibold block">Clinical Triage Clearance</span>
                      <div className="mt-1 flex items-center space-x-1.5">
                        {medicalStatus === "CLEARED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Clinically Cleared</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <AlertCircle className="w-3 h-3 text-amber-700" />
                            <span>Awaiting Nurse Review</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleMedical}
                      className={`w-full py-1.5 px-2.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center space-x-1 cursor-pointer ${
                        medicalStatus === "CLEARED"
                          ? "bg-stone-200 text-stone-700 hover:bg-stone-300"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
                      }`}
                    >
                      <Check className="w-3 h-3" />
                      <span>{medicalStatus === "CLEARED" ? "Mark Review" : "Mark Clinical Cleared"}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Traveling Party / Companion Linkage Card */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[#C07D63]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Traveling Party &amp; Companion Link
                    </span>
                  </div>
                  {!editingCompanion && (
                    <button
                      type="button"
                      onClick={() => setEditingCompanion(true)}
                      className="text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold underline decoration-emerald-300 cursor-pointer"
                    >
                      {companionName ? "Change" : "+ Link Companion"}
                    </button>
                  )}
                </div>

                {editingCompanion ? (
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={companionInput}
                      onChange={(e) => setCompanionInput(e.target.value)}
                      placeholder="e.g. Dr. Marcus Vance"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] focus:outline-none focus:ring-1 focus:ring-[#2D3E35] bg-[#FAF7F2]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCompanion}
                      className="px-3 py-1.5 bg-[#2D3E35] text-white rounded-lg font-semibold hover:bg-[#1f2c25] transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCompanion(false);
                        setCompanionInput(companionName);
                      }}
                      className="px-2.5 py-1.5 text-[#5C6B5E] hover:text-[#2D3E35] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : companionName ? (
                  <div className="p-3 rounded-lg bg-stone-50 border border-[#E5DDD0] flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center justify-center">
                        {companionName.charAt(0)}
                      </span>
                      <div>
                        <div className="font-bold text-[#2D3E35]">{companionName}</div>
                        <div className="text-[10px] text-[#5C6B5E]">Linked Traveling Party &middot; Shared Accommodations</div>
                      </div>
                    </div>
                    {onInspectCompanion && (
                      <button
                        type="button"
                        onClick={() => onInspectCompanion(companionName, client.companion_id)}
                        className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-md bg-white border border-[#E5DDD0] text-[#2D3E35] hover:bg-[#F2ECE4] font-semibold transition-colors cursor-pointer"
                      >
                        <span>View Dossier</span>
                        <ArrowRight className="w-3 h-3 text-[#5C6B5E]" />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-[#5C6B5E] italic bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                    No companion currently linked to this reservation.
                  </div>
                )}
              </div>

              {/* Dietary & Clinical Protocols */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2.5">
                <div className="flex items-center space-x-2">
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                    Clinical &amp; Dietary Directives
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs text-[#2D3E35] leading-relaxed">
                  {client.dietary_requirements ||
                    client.health_notes ||
                    "Standard organic Blue Zone culinary protocol. No severe allergies documented."}
                </div>
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {client.tags.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: ACTIVITY FEED & 3-SECOND QUICK LOGGER                      */}
          {/* ================================================================= */}
          {activeDrawerTab === "activity" && (
            <div className="space-y-4">
              {/* 3-Second Quick Activity Logger (Staff-First Workflow) */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                    Quick Activity Logger
                  </span>
                  <span className="text-[10px] text-[#5C6B5E]">Staff: Kareena Islam</span>
                </div>

                {/* Channel Selector Pills */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLogCategory("NOTE")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                      logCategory === "NOTE"
                        ? "bg-[#2D3E35] text-white shadow-xs"
                        : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Host Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogCategory("CALL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                      logCategory === "CALL"
                        ? "bg-[#2D3E35] text-white shadow-xs"
                        : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
                    }`}
                  >
                    <Phone className="w-3 h-3" />
                    <span>Phone Call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogCategory("WHATSAPP")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                      logCategory === "WHATSAPP"
                        ? "bg-[#2D3E35] text-white shadow-xs"
                        : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLogCategory("CLINICAL")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                      logCategory === "CLINICAL"
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-stone-100 text-[#5C6B5E] hover:text-[#2D3E35]"
                    }`}
                  >
                    <HeartPulse className="w-3 h-3" />
                    <span>Clinical Triage</span>
                  </button>
                </div>

                {/* 1-Line Input + Submit */}
                <form onSubmit={handleLogActivity} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={logSummary}
                    onChange={(e) => setLogSummary(e.target.value)}
                    placeholder="Type update and press Enter to log..."
                    className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#E5DDD0] focus:outline-none focus:ring-1 focus:ring-[#2D3E35] bg-[#FAF7F2]"
                  />
                  <button
                    type="submit"
                    disabled={!logSummary.trim() || isLogging}
                    className="inline-flex items-center space-x-1 px-3.5 py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-white font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isLogging ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    <span>Log</span>
                  </button>
                </form>
              </div>

              {/* Chronological Activity Feed */}
              <div className="space-y-3">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35] block">
                  Interaction History &amp; Milestones ({activities.length})
                </span>

                {activities.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-white border border-[#E5DDD0] text-[#5C6B5E] text-xs">
                    No activity notes logged yet for this guest. Use the bar above to log calls or notes.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activities.map((act) => {
                      const isCall = act.category === "CALL";
                      const isWA = act.category === "WHATSAPP";
                      const isClinical = act.category === "CLINICAL";
                      const isFlight = act.category === "FLIGHT_DELAY";
                      const isUpgrade = act.category === "SUITE_UPGRADE";
                      const isPayment = act.category === "PAYMENT_RECORDED";

                      const formattedTime = act.timestamp
                        ? new Date(act.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Recent";

                      return (
                        <div
                          key={act.id}
                          className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`p-1.5 rounded-lg ${
                                  isClinical
                                    ? "bg-rose-100 text-rose-800"
                                    : isCall
                                    ? "bg-sky-100 text-sky-800"
                                    : isWA
                                    ? "bg-emerald-100 text-emerald-800"
                                    : isFlight
                                    ? "bg-amber-100 text-amber-800"
                                    : isUpgrade || isPayment
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-stone-100 text-[#2D3E35]"
                                }`}
                              >
                                {isClinical ? (
                                  <HeartPulse className="w-3.5 h-3.5" />
                                ) : isCall ? (
                                  <Phone className="w-3.5 h-3.5" />
                                ) : isWA ? (
                                  <MessageSquare className="w-3.5 h-3.5" />
                                ) : isFlight ? (
                                  <Plane className="w-3.5 h-3.5" />
                                ) : (
                                  <FileText className="w-3.5 h-3.5" />
                                )}
                              </span>
                              <span className="font-bold text-xs text-[#2D3E35]">
                                {act.summary}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#5C6B5E] font-mono">
                              {formattedTime}
                            </span>
                          </div>

                          {act.details && (
                            <p className="text-xs text-[#5C6B5E] pl-7 leading-relaxed">
                              {act.details}
                            </p>
                          )}

                          <div className="flex items-center justify-between pl-7 pt-1 text-[10px] text-[#5C6B5E]/80">
                            <span>Logged by {act.operator_name || "Kareena Islam"}</span>
                            {act.trip_title && (
                              <span className="font-semibold text-[#2D3E35]">{act.trip_title}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: RESERVATIONS & FLIGHT AUTOMATIONS                           */}
          {/* ================================================================= */}
          {activeDrawerTab === "reservations" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                  Active Reservations ({trips.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onNewProposal(client.id);
                    onClose();
                  }}
                  className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline decoration-emerald-300 cursor-pointer"
                >
                  + Add Reservation
                </button>
              </div>

              {trips.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-white border border-[#E5DDD0] text-[#5C6B5E] text-xs">
                  No active retreat reservations found for this guest.
                </div>
              ) : (
                <div className="space-y-3">
                  {trips.map((t) => {
                    const flightCode =
                      t.smart_flight?.flight_number ||
                      (t.flight_details ? t.flight_details.match(/([A-Z0-9]{2,}\s*[-]?\s*\d{1,4})/i)?.[0]?.replace(/\s+/g, "") : null);
                    const isAutomating = automatingTripId === t.id;

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-xs space-y-3"
                      >
                        {/* Trip Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-serif font-bold text-sm text-[#2D3E35]">{t.title}</div>
                            <div className="text-[11px] text-[#5C6B5E] mt-0.5">
                              {t.dates} &middot; {t.room_tier}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-[#2D3E35]">${t.total_investment.toLocaleString()}</div>
                            <div className="text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                              {t.deposit_status}
                            </div>
                            {onInspectTrip && (
                              <button
                                type="button"
                                onClick={() => {
                                  onInspectTrip(t.id);
                                  onClose();
                                }}
                                className="mt-1 inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline decoration-emerald-300 transition-colors cursor-pointer"
                                title="Edit Reservation & Itinerary"
                              >
                                <Compass className="w-3 h-3 text-[#C07D63]" />
                                <span>Edit Itinerary</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Flight Status Row */}
                        <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Plane className="w-3.5 h-3.5 text-[#5C6B5E]" />
                            <div>
                              <span className="font-semibold text-[#2D3E35]">
                                {t.smart_flight?.airline
                                  ? `${t.smart_flight.airline} ${t.smart_flight.flight_number || ""}`.trim()
                                  : t.flight_details || "Awaiting Flight Details"}
                              </span>
                              {t.smart_flight?.arrival_time && (
                                <span className="text-[#5C6B5E] text-[10px] ml-1.5">
                                  (Arrives {t.smart_flight.arrival_time})
                                </span>
                              )}
                            </div>
                          </div>
                          {flightCode && (
                            <a
                              href={`https://www.flightaware.com/live/flight/${encodeURIComponent(flightCode)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline decoration-emerald-300 transition-colors"
                            >
                              <span>Track</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>

                        {/* 4 Pre-Arrival Communication Actions */}
                        <div className="pt-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#5C6B5E] mb-1.5">
                            Pre-Arrival Concierge Actions
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              disabled={isAutomating}
                              onClick={() => onAutomateTrip(t.id, "draft_welcome", "Welcome Letter & Sanctuary Orientation")}
                              className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Mail className="w-3 h-3 text-[#5C6B5E]" />
                              <span>Welcome Email</span>
                            </button>

                            <button
                              type="button"
                              disabled={isAutomating}
                              onClick={() => onAutomateTrip(t.id, "draft_packing_guide", "Packing List & Microclimate Guide")}
                              className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <FileCheck2 className="w-3 h-3 text-[#5C6B5E]" />
                              <span>Packing List</span>
                            </button>

                            <button
                              type="button"
                              disabled={isAutomating}
                              onClick={() => onAutomateTrip(t.id, "draft_flight_coordination", "Chauffeur & Flight Alignment")}
                              className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Plane className="w-3 h-3 text-[#5C6B5E]" />
                              <span>Flight Alignment</span>
                            </button>

                            <button
                              type="button"
                              disabled={isAutomating}
                              onClick={() => onAutomateTrip(t.id, "draft_post_retreat_arc", "30-Day Integration Arc")}
                              className="inline-flex items-center justify-center space-x-1 px-2.5 py-1.5 text-[11px] font-semibold text-[#2D3E35] bg-[#FAF7F2] hover:bg-[#F2ECE4] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <Compass className="w-3 h-3 text-[#5C6B5E]" />
                              <span>30-Day Arc</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

