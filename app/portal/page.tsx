"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Plane,
  BedDouble,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Send,
  Copy,
  Check,
  AlertTriangle,
  FileCheck,
  HeartPulse,
  Smartphone,
  Layers,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Database,
  Calendar,
  Mic,
  X
} from "lucide-react";
import {
  fetchStagedIntakes,
  fetchCohortCapacities,
  fetchStagedLeads,
  fetchSmsQueue,
  generateIntakeThesis,
  commitIntakeToCrm,
  updateStagedIntake,
  createStagedIntake,
  seedSyntheticData,
  StagingIntake,
  SanctuaryCohortStatus,
  generateGuestPortalToken,
} from "@/lib/sidecar-api";
import { onFormFill, getAndClearPendingFormFill, FormFillProposal } from "@/lib/portal-form-bus";
import WhatsAppSimulatorModal from "@/components/portal/WhatsAppSimulatorModal";
import CrmEntityInspectorModal from "@/components/portal/CrmEntityInspectorModal";
import VoiceConsultationModal from "@/components/portal/VoiceConsultationModal";
import ContinuityJourneyModal from "@/components/portal/ContinuityJourneyModal";

export default function PortalDashboard() {
  const [intakes, setIntakes] = useState<StagingIntake[]>([]);
  const [cohorts, setCohorts] = useState<SanctuaryCohortStatus[]>([]);
  const [leadCount, setLeadCount] = useState(0);
  const [smsQueueCount, setSmsQueueCount] = useState(0);

  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterSanctuary, setFilterSanctuary] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Staged Guest Intake Proposal from Copilot Chat
  const [stagedProposal, setStagedProposal] = useState<FormFillProposal | null>(null);
  const [submittingStaged, setSubmittingStaged] = useState(false);
  const [seedingData, setSeedingData] = useState(false);
  const [seedToast, setSeedToast] = useState<string | null>(null);

  // Editable form state for Staged Proposal Review & Approval
  const [proposalFormData, setProposalFormData] = useState({
    client_name: "",
    email: "",
    phone: "",
    sanctuary_slug: "nosara",
    room_tier: "Private Villa Sanctuary",
    nights: 3,
    total_amount: 5700,
    deposit_30: 1710,
    balance_70: 3990,
    clinical_notes: "",
  });

  const initProposalForm = (prop: FormFillProposal) => {
    const f = prop.fields || prop.payload || {};
    const nights = Number(f.nights) || 3;
    const total = Number(f.total_amount) || (nights * 1900);
    const dep = Number(f.deposit_30) || Math.round(total * 0.3);
    const bal = Number(f.balance_70) || (total - dep);

    setProposalFormData({
      client_name: (f.client_name as string) || "Prospective Traveler",
      email: (f.email as string) || `${String(f.client_name || "traveler").toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: (f.phone as string) || "+1 (555) 019-2834",
      sanctuary_slug: (f.sanctuary_slug as string) || "nosara",
      room_tier: (f.room_tier as string) || "Private Villa Sanctuary",
      nights: nights,
      total_amount: total,
      deposit_30: dep,
      balance_70: bal,
      clinical_notes: (f.clinical_notes as string) || (f.intentions as string) || "Nervous system reset & restorative sleep",
    });
  };

  // Modals state for WhatsApp dispatch & CRM Entity Inspector
  const [whatsappIntake, setWhatsappIntake] = useState<StagingIntake | null>(null);
  const [inspectorIntake, setInspectorIntake] = useState<StagingIntake | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [continuityIntake, setContinuityIntake] = useState<StagingIntake | null>(null);

  // Expanded cards state for Personalized Conversation Guide drawer
  const [expandedIntakeId, setExpandedIntakeId] = useState<string | null>(null);
  const [generatingThesisId, setGeneratingThesisId] = useState<string | null>(null);
  const [syncingIntakeId, setSyncingIntakeId] = useState<string | null>(null);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ id: string; message: string; tags: string[] } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [intakesData, cohortData, leadsData, smsData] = await Promise.all([
        fetchStagedIntakes(filterStatus, filterSanctuary),
        fetchCohortCapacities(),
        fetchStagedLeads("PENDING_APPROVAL"),
        fetchSmsQueue("PENDING_APPROVAL"),
      ]);

      setIntakes(intakesData);
      setCohorts(cohortData);
      setLeadCount(leadsData.length);
      setSmsQueueCount(smsData.length);

      if (!expandedIntakeId && intakesData.length > 0) {
        setExpandedIntakeId(intakesData[0].id);
      }
    } catch (e) {
      console.error("Failed loading cockpit data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      try {
        const [intakesData, cohortData, leadsData, smsData] = await Promise.all([
          fetchStagedIntakes(filterStatus, filterSanctuary),
          fetchCohortCapacities(),
          fetchStagedLeads("PENDING_APPROVAL"),
          fetchSmsQueue("PENDING_APPROVAL"),
        ]);

        if (active) {
          setIntakes(intakesData);
          setCohorts(cohortData);
          setLeadCount(leadsData.length);
          setSmsQueueCount(smsData.length);
          setLoading(false);
          if (intakesData.length > 0) {
            setExpandedIntakeId((prev) => prev || intakesData[0].id);
          }
        }
      } catch (e) {
        console.error("Failed loading cockpit data:", e);
        if (active) setLoading(false);
      }
    };

    fetchData();

    // Check for pending proposal from Copilot Chat navigation
    const pending = getAndClearPendingFormFill();
    if (pending && pending.form_type === "guest_intake") {
      initProposalForm(pending);
      setStagedProposal(pending);
    }

    const unsubForm = onFormFill((prop: FormFillProposal) => {
      if (prop.form_type === "guest_intake") {
        initProposalForm(prop);
        setStagedProposal(prop);
      }
    });

    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener("intakes-updated", handleUpdate);
    return () => {
      active = false;
      window.removeEventListener("intakes-updated", handleUpdate);
      unsubForm();
    };
  }, [filterStatus, filterSanctuary]);

  const handleSeedSyntheticData = async () => {
    setSeedingData(true);
    try {
      const res = await seedSyntheticData();
      setSeedToast(res.message || "Synthetic test bookings (Frank Lucas), suppliers & leads seeded!");
      await loadData();
      setTimeout(() => setSeedToast(null), 6000);
    } catch (e: any) {
      console.error("Failed seeding synthetic data:", e);
      alert(e?.message || "Failed to seed synthetic data");
    } finally {
      setSeedingData(false);
    }
  };

  const handleConfirmStageProposal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stagedProposal) return;
    setSubmittingStaged(true);
    try {
      const f = proposalFormData;
      const newIntake = await createStagedIntake({
        client_name: f.client_name || "Prospective Traveler",
        email: f.email || `${String(f.client_name || "traveler").toLowerCase().replace(/\s+/g, ".")}@example.com`,
        phone: f.phone || "+1 (555) 019-2834",
        sanctuary_slug: f.sanctuary_slug || "nosara",
        room_tier: f.room_tier || "Private Villa Sanctuary",
        clinical_profile: {
          intentions: f.clinical_notes || "Nervous system reset & restorative sleep",
          health_notes: f.clinical_notes || "",
          nights: Number(f.nights),
          total_amount: Number(f.total_amount),
          deposit_30: Number(f.deposit_30),
          balance_70: Number(f.balance_70)
        },
        flight_request: stagedProposal.fields?.flight_request as any || null
      });
      setIntakes((prev) => [newIntake, ...prev.filter((i) => i.id !== newIntake.id)]);
      setExpandedIntakeId(newIntake.id);
      setStagedProposal(null);
      setSeedToast(`Intake for ${newIntake.client_name} verified and approved into database!`);
      setTimeout(() => setSeedToast(null), 5000);
    } catch (err) {
      console.error("Failed to stage intake from proposal:", err);
      alert(err instanceof Error ? err.message : "Failed to stage intake");
    } finally {
      setSubmittingStaged(false);
    }
  };

  const handleGenerateThesis = async (intakeId: string) => {
    setGeneratingThesisId(intakeId);
    try {
      const updated = await generateIntakeThesis(intakeId);
      setIntakes((prev) => prev.map((i) => (i.id === intakeId ? updated : i)));
    } catch (e) {
      console.error("Failed to generate thesis:", e);
      alert("Failed to generate conversation guide");
    } finally {
      setGeneratingThesisId(null);
    }
  };

  const handleAuthorizeSync = async (intake: StagingIntake) => {
    setSyncingIntakeId(intake.id);
    try {
      const result = await commitIntakeToCrm(intake.id, intake.room_tier, "Kareena Islam");
      setSyncFeedback({
        id: intake.id,
        message: result.message,
        tags: result.applied_tags,
      });

      // Update local record status
      setIntakes((prev) =>
        prev.map((i) =>
          i.id === intake.id
            ? {
              ...i,
              status: "CONFIRMED_IN_CRM",
              crm_trip_id: result.crm_trip_id,
              crm_contact_id: result.crm_contact_id,
            }
            : i
        )
      );

      // Refresh cohort telemetry
      const updatedCohorts = await fetchCohortCapacities();
      setCohorts(updatedCohorts);
    } catch (e: unknown) {
      alert(`KAI CRM Confirmation Error: ${(e as Error).message || "Failed to sync"}`);
    } finally {
      setSyncingIntakeId(null);
    }
  };

  const [generatingHubId, setGeneratingHubId] = useState<string | null>(null);

  const handleOpenGuestHub = async (intake: StagingIntake) => {
    setGeneratingHubId(intake.id);
    try {
      const res = await generateGuestPortalToken(intake.id);
      if (res.portal_url) {
        if (navigator.clipboard) {
          try {
            await navigator.clipboard.writeText(res.portal_url);
          } catch {
            // clipboard access may be restricted
          }
        }
        window.open(res.portal_url, "_blank");
      }
    } catch (e: unknown) {
      alert(`Guest Companion Hub generation error: ${(e as Error).message || "Failed"}`);
    } finally {
      setGeneratingHubId(null);
    }
  };


  const handleRoomTierChange = async (intakeId: string, newTier: string) => {
    try {
      const updated = await updateStagedIntake(intakeId, { room_tier: newTier });
      setIntakes((prev) => prev.map((i) => (i.id === intakeId ? updated : i)));
    } catch (e) {
      console.error("Failed to update room tier:", e);
    }
  };

  const copyEmailDraft = (intakeId: string, emailText: string) => {
    navigator.clipboard.writeText(emailText);
    setCopiedEmailId(intakeId);
    setTimeout(() => setCopiedEmailId(null), 2500);
  };

  const pendingIntakesCount = intakes.filter((i) => i.status === "PENDING_APPROVAL").length;
  const syncedIntakesCount = intakes.filter((i) => i.status === "CONFIRMED_IN_CRM").length;

  return (
    <div className="space-y-8">
      {/* Toast Alert Banner */}
      {seedToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{seedToast}</span>
          </div>
          <button
            onClick={() => setSeedToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-2 py-0.5 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. Header & KPI Metrics Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2D3E35] tracking-tight">
            Guest Inquiries
          </h1>
          <p className="text-xs text-[#5C6B5E] mt-0.5">
            Review inquiries, care plans &amp; sync confirmed guests to CRM
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setIsVoiceModalOpen(true)}
            title="Voice Memo to Guest Dossier"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-md transition-all cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-amber-900" />
            <span>Voice Memo</span>
          </button>

          {process.env.NODE_ENV !== "production" && (
          <button
            onClick={handleSeedSyntheticData}
            disabled={seedingData || loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-[#2D3E35] bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-md transition-all cursor-pointer"
          >
            <Database className={`w-3.5 h-3.5 text-amber-700 ${seedingData ? "animate-spin" : ""}`} />
            <span>{seedingData ? "Seeding..." : "Seed Demo"}</span>
          </button>
          )}

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#5C6B5E] uppercase tracking-wider">
              Pending
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[#2D3E35]">
              {pendingIntakesCount}
            </span>
            <span className="text-xs text-amber-700">To Review</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#5C6B5E] uppercase tracking-wider">
              Confirmed
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[#2D3E35]">
              {syncedIntakesCount}
            </span>
            <span className="text-xs text-emerald-700">In CRM</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#5C6B5E] uppercase tracking-wider">
              Partners
            </span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[#2D3E35]">{leadCount}</span>
            <span className="text-xs text-purple-700">Studios</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-[#5C6B5E] uppercase tracking-wider">
              SMS Queue
            </span>
            <Send className="w-4 h-4 text-[#C07D63]" />
          </div>
          <div className="mt-1 flex items-baseline space-x-2">
            <span className="text-2xl font-serif font-bold text-[#2D3E35]">{smsQueueCount}</span>
            <span className="text-xs text-[#C07D63]">Staged</span>
          </div>
        </div>
      </div>

      {/* 2. Retreat Group Capacity & Size Monitor (12-14 Guests) */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-base font-bold text-[#2D3E35]">
            Sanctuary Capacity (12–14 Guests Max)
          </h2>
          <span className="text-[11px] font-semibold px-2 py-0.5 bg-[#F2ECE4] border border-[#E5DDD0] rounded text-[#2D3E35]">
            14 Guest Cap
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cohorts.map((c) => {
            const totalBooked = (c.crm_confirmed_count ?? 0) + c.staged_count;
            const pct = Math.min(100, Math.round((totalBooked / c.capacity_limit) * 100));
            const isFull = c.remaining_spots === 0;
            const isNearCap = c.remaining_spots <= 3 && c.remaining_spots > 0;

            return (
              <div
                key={c.slug}
                className="p-3.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold text-sm text-[#2D3E35]">{c.title}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isFull
                        ? "bg-red-100 text-red-800"
                        : isNearCap
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                  >
                    {isFull ? "FULL" : `${c.remaining_spots} spots left`}
                  </span>
                </div>
                <div className="text-[11px] text-[#5C6B5E] mt-1">{c.dates}</div>

                {/* Progress bar */}
                <div className="mt-3 w-full bg-[#E5DDD0] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${isFull ? "bg-red-500" : isNearCap ? "bg-amber-500" : "bg-[#2D3E35]"
                      }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#5C6B5E] mt-1.5">
                  <span>Confirmed: {(c.crm_confirmed_count ?? 0)}</span>
                  <span>Staged: {c.staged_count}</span>
                  <span className="font-bold">Cap: {c.capacity_limit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Inquiry Review Queue Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E5DDD0] shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#2D3E35] uppercase tracking-wider">
              Filter Inquiries:
            </span>
            <div className="flex items-center space-x-1">
              {["ALL", "PENDING_APPROVAL", "CONFIRMED_IN_CRM"].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${filterStatus === st
                      ? "bg-[#2D3E35] text-[#FAF7F2]"
                      : "text-[#5C6B5E] hover:bg-[#F2ECE4]"
                    }`}
                >
                  {st === "ALL" ? "All Statuses" : st.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-[#5C6B5E]">Sanctuary:</span>
            <select
              value={filterSanctuary}
              onChange={(e) => setFilterSanctuary(e.target.value)}
              className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-2.5 py-1 text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
            >
              <option value="ALL">All Sanctuaries</option>
              <option value="nosara">Nosara Costa Rica</option>
              <option value="amalfi">Amalfi Coast</option>
              <option value="bali">Bali Sacred Water</option>
              <option value="riviera-maya">Riviera Maya</option>
            </select>
          </div>
        </div>

        {/* Sync Success Feedback Banner */}
        {syncFeedback && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start justify-between shadow-sm animate-in fade-in duration-300">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">{syncFeedback.message}</div>
                <div className="text-xs text-emerald-800 mt-1 flex flex-wrap gap-1.5 items-center">
                  <span className="font-medium">Applied Guest Tags in Native CRM:</span>
                  {syncFeedback.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded bg-emerald-200/80 font-mono text-[10px] text-emerald-950 font-semibold"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-xs text-emerald-700 hover:text-emerald-950 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* Intakes List */}
        {intakes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-sm">
            <Users className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-60" />
            <div className="text-sm font-semibold text-[#2D3E35]">No guest inquiries found</div>
            <p className="text-xs text-[#5C6B5E] mt-1 max-w-sm mx-auto">
              Incoming reservations from /book or custom groups will appear here awaiting founder review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {intakes.map((intake) => {
              const isExpanded = expandedIntakeId === intake.id;
              const isPending = intake.status === "PENDING_APPROVAL";
              const isSynced = intake.status === "CONFIRMED_IN_CRM";
              const thesis = intake.consultation_thesis;

              return (
                <div
                  key={intake.id}
                  className={`bg-white rounded-xl border transition-all shadow-sm ${isPending
                      ? "border-[#E5DDD0] hover:border-[#C07D63]/60"
                      : "border-emerald-200 bg-emerald-50/10"
                    }`}
                >
                  {/* Card Header & Summary */}
                  <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5DDD0]/60">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-xl font-bold text-[#2D3E35]">
                          {intake.client_name}
                        </h3>
                        {intake.source_ref && (
                          <span className="font-mono text-xs px-2 py-0.5 bg-[#F2ECE4] border border-[#E5DDD0] text-[#5C6B5E] rounded font-semibold">
                            {intake.source_ref}
                          </span>
                        )}
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 ${isPending
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            }`}
                        >
                          {isPending ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-amber-700" />
                              <span>Pending Review</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Synced to CRM</span>
                            </>
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#5C6B5E]">
                        <span>{intake.email}</span>
                        {intake.phone && <span>&middot; {intake.phone}</span>}
                        <span className="font-medium text-[#2D3E35]">
                          &middot; Sanctuary: {(intake.sanctuary_slug || "Nosara").toUpperCase()}
                        </span>
                        <span>
                          &middot; Received: {new Date(intake.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Right: Concise Primary Actions & Drawer Toggle */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {isPending && (
                        <button
                          onClick={() => handleAuthorizeSync(intake)}
                          disabled={syncingIntakeId === intake.id}
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-xs cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5 text-[#FAF7F2]" />
                          <span>
                            {syncingIntakeId === intake.id ? "Syncing..." : "Approve & Sync"}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => setInspectorIntake(intake)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5 text-[#C07D63]" />
                        <span>CRM Details</span>
                      </button>

                      <button
                        onClick={() => setWhatsappIntake(intake)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        onClick={() => setExpandedIntakeId(isExpanded ? null : intake.id)}
                        className="px-2 py-1.5 text-xs font-medium text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                        title={isExpanded ? "Collapse care plan" : "Expand care plan"}
                      >
                        <span>Care Plan</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Clinical Quick Tags Bar */}
                  <div className="px-4 sm:px-5 py-2.5 bg-[#FAF7F2]/70 border-b border-[#E5DDD0]/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[#5C6B5E] font-medium text-[11px]">Guest Tags:</span>
                      {thesis?.clinical_flags && thesis.clinical_flags.length > 0 ? (
                        thesis.clinical_flags.map((flag) => (
                          <span
                            key={flag}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#C07D63]/15 text-[#C07D63] border border-[#C07D63]/30"
                          >
                            {flag}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#5C6B5E] italic">
                          Awaiting conversation guide
                        </span>
                      )}
                    </div>

                    {/* Room Tier Selector */}
                    <div className="flex items-center space-x-1.5 text-xs">
                      <BedDouble className="w-3.5 h-3.5 text-[#5C6B5E]" />
                      <span className="text-[#5C6B5E] font-medium">Room Tier:</span>
                      <select
                        value={intake.room_tier || "Private Villa Sanctuary"}
                        onChange={(e) => handleRoomTierChange(intake.id, e.target.value)}
                        disabled={isSynced}
                        className="text-xs bg-white border border-[#E5DDD0] rounded px-2 py-0.5 text-[#2D3E35] focus:outline-none"
                      >
                        <option value="Private Villa Sanctuary">Private Villa Sanctuary</option>
                        <option value="Shared Ocean Pavilion">Shared Ocean Pavilion</option>
                        <option value="Cliffside Stillness Suite">Cliffside Stillness Suite</option>
                        <option value="Grand Travel Flight Desk Inquiry">
                          Grand Travel Flight Desk
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Expanded Personalized Conversation Guide & Care Plan Dossier & Flight Desk Detail */}
                  {isExpanded && (
                    <div className="p-4 sm:p-6 space-y-6 bg-white animate-in fade-in duration-200">
                      {/* Guest Clinical Profile & Flight Inquiries Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="p-3.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/40 space-y-2">
                          <div className="font-semibold text-sm text-[#2D3E35] flex items-center justify-between">
                            <div className="flex items-center space-x-1.5">
                              <Sparkles className="w-4 h-4 text-[#C07D63]" />
                              <span>Guest Wellness &amp; Dietary Preferences</span>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🌿 Restorative Retreat
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-[#5C6B5E]">Primary Focus:</span>{" "}
                            {(intake.wellness_profile?.primary_focus as string) || (intake.clinical_profile?.intentions as string) || "Restorative travel & deep rest"}
                          </div>
                          <div>
                            <span className="font-medium text-[#5C6B5E]">Restorative Rhythm:</span>{" "}
                            {(intake.wellness_profile?.preferred_rhythm as string) || (intake.clinical_profile?.movement_experience as string) || "Gentle sunrise yoga & twilight sound immersion"}
                          </div>
                          <div>
                            <span className="font-medium text-[#5C6B5E]">Dietary &amp; Chef Notes:</span>{" "}
                            {(intake.wellness_profile?.nutrition_preferences as string) || (intake.clinical_profile?.health_notes as string) || "Seed-oil-free Blue Zone organic menu"}
                          </div>
                        </div>


                        <div className="p-3.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/40 space-y-2">
                          <div className="font-semibold text-sm text-[#2D3E35] flex items-center space-x-1.5">
                            <Plane className="w-4 h-4 text-[#2D3E35]" />
                            <span>Grand Travel Flight Desk Coordination</span>
                          </div>
                          {intake.flight_request ? (
                            <>
                              <div>
                                <span className="font-medium text-[#5C6B5E]">Departure Airport:</span>{" "}
                                <span className="font-mono font-bold">
                                  {intake.flight_request.departure_airport || "N/A"}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-[#5C6B5E]">Cabin Class:</span>{" "}
                                <span className="uppercase font-semibold text-[#C07D63]">
                                  {intake.flight_request.cabin_class || "Economy"}
                                </span>
                              </div>
                              <div>
                                <span className="font-medium text-[#5C6B5E]">Preferred Airline:</span>{" "}
                                {intake.flight_request.preferred_airline || "Flexible / Best Lie-Flat"}
                              </div>
                              <div>
                                <span className="font-medium text-[#5C6B5E]">Special Requests:</span>{" "}
                                {intake.flight_request.special_requests || "None"}
                              </div>
                            </>
                          ) : (
                            <div className="text-[#5C6B5E] italic">
                              No flight coordination requested yet. Ground arrival transfer will be
                              scheduled with sanctuary concierge.
                            </div>
                          )}
                        </div>
                      </div>                      {/* Personalized Conversation Guide & Care Plan Card */}
                      {thesis ? (
                        <div className="p-5 rounded-xl border border-[#E5DDD0] bg-[#FAF7F2]/30 space-y-5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-3">
                            <div className="flex items-center space-x-2">
                              <Sparkles className="w-4 h-4 text-[#C07D63]" />
                              <h4 className="font-serif text-base font-bold text-[#2D3E35]">
                                Personalized Conversation Guide &amp; Care Plan
                              </h4>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setContinuityIntake(intake)}
                                className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-amber-700" />
                                <span>30-Day Arc</span>
                              </button>
                              <button
                                onClick={() => handleOpenGuestHub(intake)}
                                disabled={generatingHubId === intake.id}
                                className="inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3 text-teal-600" />
                                <span>{generatingHubId === intake.id ? "Opening..." : "Guest Hub"}</span>
                              </button>
                              <button
                                onClick={() => handleGenerateThesis(intake.id)}
                                disabled={generatingThesisId === intake.id}
                                className="inline-flex items-center space-x-1 text-xs text-[#5C6B5E] hover:text-[#2D3E35] cursor-pointer"
                              >
                                <RefreshCw
                                  className={`w-3 h-3 ${generatingThesisId === intake.id ? "animate-spin" : ""
                                    }`}
                                />
                                <span>Regenerate</span>
                              </button>
                            </div>
                          </div>

                          {/* Care Plan View (Plain English, Serene Language) */}
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                              <div className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider">
                                Serene Journey Overview for {intake.client_name}
                              </div>
                              <p className="text-xs text-[#2D3E35] leading-relaxed">
                                A bespoke 6-day restorative pathway designed for {intake.client_name}. Addressing their personal intention: &ldquo;{intake.clinical_profile?.intentions || "Deep restorative reset and nervous system balance"}&rdquo;. Curated within our intimate 12–14 guest circle with personal guidance from Founder Kareena Islam.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="p-3.5 bg-white rounded-lg border border-[#E5DDD0]">
                                <span className="font-semibold text-[#5C6B5E]">Recommended Sanctuary:</span>
                                <div className="text-sm font-serif font-bold text-[#2D3E35] mt-0.5">
                                  {thesis.recommended_sanctuary}
                                </div>
                                <div className="text-[#5C6B5E] mt-1 text-xs">
                                  Suite: {thesis.recommended_room_tier}
                                </div>
                              </div>
                              <div className="p-3.5 bg-white rounded-lg border border-[#E5DDD0]">
                                <span className="font-semibold text-[#5C6B5E]">Daily Restorative Schedule:</span>
                                <div className="text-[11px] text-[#2D3E35] mt-1 leading-normal">
                                  Gentle 4-7-8 calming breathwork &middot; 432Hz twilight sound immersion &middot; Farm-to-table coastal dining &middot; Deep restorative sleep
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Conversation Focus Points */}
                          <div>
                            <div className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider mb-2">
                              Conversation Focus Points &amp; Discussion Flow
                            </div>
                            <div className="space-y-2">
                              {thesis.consultation_talk_tracks?.map((tt, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-white border border-[#E5DDD0] text-xs"
                                >
                                  <span className="font-bold text-[#C07D63] mr-2">
                                    [{tt.phase}]
                                  </span>
                                  <span className="text-[#2D3E35]">{tt.talking_point}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Helpful Guidance & Common Questions */}
                          <div>
                            <div className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider mb-2">
                              Helpful Guidance &amp; Common Questions
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                              {thesis.objection_scripts?.map((obj, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg bg-white border border-[#E5DDD0] space-y-1"
                                >
                                  <div className="font-bold text-[#2D3E35] flex items-center space-x-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#C07D63]" />
                                    <span>{obj.objection}</span>
                                  </div>
                                  <p className="text-[#5C6B5E] text-[11px] leading-relaxed">
                                    {obj.clinical_script}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Proposed Retreat Itinerary */}
                          <div>
                            <div className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider mb-2">
                              Proposed Retreat Itinerary (CRM Itinerary Draft)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                              {thesis.itinerary_draft?.map((act, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white rounded border border-[#E5DDD0] space-y-0.5"
                                >
                                  <div className="flex items-center justify-between text-[10px] font-mono text-[#5C6B5E]">
                                    <span className="font-bold text-[#2D3E35]">Day {act.day || 1}</span>
                                    <span className="px-1.5 py-0.2 bg-[#F2ECE4] rounded">
                                      {act.type}
                                    </span>
                                  </div>
                                  <div className="font-semibold text-[#2D3E35] text-xs">
                                    {act.title}
                                  </div>
                                  <p className="text-[11px] text-[#5C6B5E] line-clamp-2">
                                    {act.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Personalized Follow-Up Email Draft */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider">
                                Personalized Follow-up Email Draft
                              </span>
                              <button
                                onClick={() =>
                                  copyEmailDraft(intake.id, thesis.personalized_email_draft)
                                }
                                className="inline-flex items-center space-x-1 text-xs text-[#2D3E35] hover:text-[#C07D63] font-medium"
                              >
                                {copiedEmailId === intake.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700">Copied to Clipboard!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Email Draft</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <textarea
                              readOnly
                              rows={5}
                              value={thesis.personalized_email_draft}
                              className="w-full text-xs font-mono bg-white border border-[#E5DDD0] rounded-lg p-3 text-[#2D3E35] leading-relaxed resize-none focus:outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 text-center bg-[#FAF7F2]/40 rounded-xl border border-[#E5DDD0]">
                          <p className="text-xs text-[#5C6B5E] mb-3">
                            No conversation guide generated yet for this guest.
                          </p>
                          <button
                            onClick={() => handleGenerateThesis(intake.id)}
                            disabled={generatingThesisId === intake.id}
                            className="inline-flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold bg-[#2D3E35] text-[#FAF7F2] rounded-md hover:bg-[#1F2C25] transition-colors"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#C07D63]" />
                            <span>
                              {generatingThesisId === intake.id
                                ? "Preparing Conversation Guide..."
                                : "Generate Conversation Guide"}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* Footer 1-Click Sync Execution */}
                      {isPending && (
                        <div className="pt-3 border-t border-[#E5DDD0] flex items-center justify-between">
                          <div className="text-xs text-[#5C6B5E]">
                            Approving this confirms the guest&apos;s room and saves their care notes directly to your retreat guest list.
                          </div>
                          <button
                            onClick={() => handleAuthorizeSync(intake)}
                            disabled={syncingIntakeId === intake.id}
                            className="inline-flex items-center space-x-2 px-4 py-2.5 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-lg transition-all shadow-md"
                          >
                            <FileCheck className="w-4 h-4 text-[#FAF7F2]" />
                            <span>
                              {syncingIntakeId === intake.id
                                ? "Committing to Sanctuary CRM..."
                                : "Authorize & Commit to Sanctuary CRM"}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp Mobile Operator Dispatch Simulator Modal */}
      <WhatsAppSimulatorModal
        isOpen={!!whatsappIntake}
        intake={whatsappIntake}
        onClose={() => setWhatsappIntake(null)}
        onIntakeUpdated={(updated) => {
          setIntakes((prev) =>
            prev.map((i) => (i.id === whatsappIntake?.id ? { ...i, ...updated } : i))
          );
        }}
      />

      {/* KAI CRM Entity & Payments Inspector Modal */}
      <CrmEntityInspectorModal
        isOpen={!!inspectorIntake}
        intake={inspectorIntake}
        onClose={() => setInspectorIntake(null)}
      />

      {/* 30-Day Post-Sanctuary Continuity Care Journey Modal */}
      <ContinuityJourneyModal
        isOpen={!!continuityIntake}
        intake={continuityIntake}
        onClose={() => setContinuityIntake(null)}
        onSuccess={loadData}
      />

      {/* Founder Voice Consultation Transcriber Modal */}
      <VoiceConsultationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSuccess={loadData}
      />


      {/* 1-Click Founder Staged Reservation Modal */}
      {stagedProposal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#FAF7F2] border border-[#E5DDD0] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-[#2D3E35]">
            <div className="p-6 border-b border-[#E5DDD0] bg-[#FAF7F2] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#2D3E35] text-[#FAF7F2]">
                  <Sparkles className="w-5 h-5 text-[#C07D63]" />
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold">
                    {stagedProposal.form_title || "Review & Approve Guest Intake"}
                  </h3>
                  <p className="text-xs text-[#5C6B5E]">
                    Founder Oversight · 100% Founder Approved · Verified Data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStagedProposal(null)}
                className="p-2 rounded-full hover:bg-stone-200 text-stone-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[#2D3E35] space-y-1.5">
                <div className="font-semibold text-amber-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Proposed by AI Copilot</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Data Verified for KAI Sanctuary CRM
                  </span>
                </div>
                <p className="text-[11px] text-[#5C6B5E] leading-relaxed">
                  {stagedProposal.summary}
                </p>
              </div>

              <form onSubmit={handleConfirmStageProposal} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-xl border border-[#E5DDD0]">
                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Guest / Client Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={proposalFormData.client_name}
                      onChange={(e) => setProposalFormData({ ...proposalFormData, client_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                      placeholder="e.g. Frank Lucas"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Guest Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={proposalFormData.email}
                      onChange={(e) => setProposalFormData({ ...proposalFormData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                      placeholder="e.g. frank.lucas@example.com"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Guest Phone Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={proposalFormData.phone}
                      onChange={(e) => setProposalFormData({ ...proposalFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                      placeholder="+1 (555) 019-2834"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Sanctuary Destination *
                    </label>
                    <select
                      value={proposalFormData.sanctuary_slug}
                      onChange={(e) => setProposalFormData({ ...proposalFormData, sanctuary_slug: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                    >
                      <option value="nosara">Nosara, Costa Rica</option>
                      <option value="amalfi">Amalfi Coast, Italy</option>
                      <option value="bali">Ubud, Bali</option>
                      <option value="riviera-maya">Riviera Maya, Mexico</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Accommodation Tier *
                    </label>
                    <select
                      value={proposalFormData.room_tier}
                      onChange={(e) => setProposalFormData({ ...proposalFormData, room_tier: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                    >
                      <option value="Private Villa Sanctuary">Private Villa Sanctuary</option>
                      <option value="Ocean Pavilion Suite">Ocean Pavilion Suite</option>
                      <option value="Sacred Mountain Compound">Sacred Mountain Compound</option>
                      <option value="Presidential Wellness Estate">Presidential Wellness Estate</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Stay Duration (Nights) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={proposalFormData.nights}
                      onChange={(e) => {
                        const nights = Math.max(1, parseInt(e.target.value) || 1);
                        const total = nights * 1900;
                        const dep = Math.round(total * 0.3);
                        const bal = total - dep;
                        setProposalFormData({
                          ...proposalFormData,
                          nights,
                          total_amount: total,
                          deposit_30: dep,
                          balance_70: bal
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                      Total Stay Investment ($) *
                    </label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={proposalFormData.total_amount}
                      onChange={(e) => {
                        const total = Math.max(0, parseInt(e.target.value) || 0);
                        const dep = Math.round(total * 0.3);
                        const bal = total - dep;
                        setProposalFormData({
                          ...proposalFormData,
                          total_amount: total,
                          deposit_30: dep,
                          balance_70: bal
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs font-semibold text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                        30% Sanctuary Deposit
                      </label>
                      <div className="px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800">
                        ${proposalFormData.deposit_30.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                        70% Remaining Balance
                      </label>
                      <div className="px-3 py-2 rounded-lg border border-[#E5DDD0] bg-stone-50 text-xs font-bold text-[#2D3E35]">
                        ${proposalFormData.balance_70.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-[#E5DDD0]">
                  <label className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block mb-1">
                    Guest & Operational Notes
                  </label>
                  <textarea
                    rows={2}
                    value={proposalFormData.clinical_notes}
                    onChange={(e) => setProposalFormData({ ...proposalFormData, clinical_notes: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]/60 text-xs text-[#2D3E35] focus:bg-white focus:ring-2 focus:ring-[#2D3E35]/30 outline-none"
                    placeholder="Nervous system reset & restorative sleep protocols..."
                  />
                </div>

                <div className="p-4 bg-stone-100 border-t border-[#E5DDD0] flex justify-end gap-2.5 rounded-b-2xl -mx-6 -mb-6 mt-4">
                  <button
                    type="button"
                    onClick={() => setStagedProposal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5C6B5E] hover:bg-stone-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingStaged}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    {submittingStaged ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Database...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Approve & Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
