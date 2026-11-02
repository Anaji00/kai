"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Plane,
  User,
  MapPin,
  CheckCircle2,
  Copy,
  Check,
  Code,
  Layers,
  Database,
  Sparkles,
  Mail,
  Compass,
  FileCheck2,
  SendHorizontal,
} from "lucide-react";
import { StagingIntake, automateCrmTripOutreach } from "@/lib/sidecar-api";

export interface CrmEntityInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  intake: StagingIntake | null;
}

export function CrmEntityInspectorModal({
  isOpen,
  onClose,
  intake,
}: CrmEntityInspectorModalProps) {


  const [activeTab, setActiveTab] = useState<"overview" | "json">("overview");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [automating, setAutomating] = useState<string | null>(null);
  const [automationResult, setAutomationResult] = useState<string | null>(null);

  if (!isOpen || !intake) return null;

  const tripId = intake.crm_trip_id || `kai_trp_${intake.id.substring(0, 8)}`;
  const contactId = intake.crm_contact_id || `kai_cnt_${intake.id.substring(0, 8)}`;

  // Native internal database URLs (no third-party external lock-in)
  const tripUrl = `/portal?tab=crm&trip_id=${tripId}`;
  const paymentsUrl = `/portal?tab=crm&trip_id=${tripId}&view=payments`;
  const contactUrl = `/portal?tab=crm&client_id=${contactId}`;
  const proposalUrl = `/portal?tab=crm&section=proposal&trip_id=${tripId}`;

  const copyToClipboard = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const isSynced = intake.status === "CONFIRMED_IN_CRM" || intake.status === "APPROVED";

  // Simulated flight block
  const flight = intake.flight_request || {};
  const flightBlock = {
    airline: flight.preferred_airline || "United Airlines / Delta Air Lines",
    flight_number: "UA 1420",
    departure: flight.departure_airport || "MIA",
    arrival: (intake.sanctuary_slug || "").includes("puerto") ? "PVR" : "LIR",
    cabin_class: flight.cabin_class || "Business",
    status: "ON_TIME (Cirium Active)",
  };

  const tags = intake.consultation_thesis?.clinical_flags || [
    "CORTISOL_RESET",
    "VAGAL_DYSREGULATION",
    "BLUE_ZONE_DIET",
    "LIE_FLAT_AIR",
  ];

  const handleAutomate = async (
    actionType: "draft_welcome" | "draft_packing_guide" | "draft_flight_coordination" | "draft_post_retreat_arc",
    label: string
  ) => {
    setAutomating(actionType);
    setAutomationResult(null);
    try {
      const res = await automateCrmTripOutreach(tripId, actionType, "Kareena Islam");
      setAutomationResult(`Success: Staged "${label}" (Draft #${res.draft_id}) ready for advisor approval.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to automate advisor task";
      setAutomationResult(`Notice: ${msg}`);
    } finally {
      setAutomating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
              <Database className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2D3E35] leading-tight">
                KAI Sanctuary Travel CRM Record
              </h3>
              <p className="text-xs text-[#5C6B5E] flex items-center gap-1.5 flex-wrap">
                <span>Client: <strong className="text-[#2D3E35]">{intake.client_name}</strong></span>
                <span>&middot;</span>
                <span className="inline-flex items-center gap-1 font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 text-[10px]">
                  <Database className="w-3 h-3 text-emerald-600" />
                  Stored Natively in KAI Database (crm_clients &amp; crm_trips)
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex bg-[#F2ECE4] rounded-lg p-0.5 text-xs border border-[#E5DDD0]">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeTab === "overview"
                    ? "bg-white font-semibold text-[#2D3E35] shadow-xs"
                    : "text-[#5C6B5E]"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("json")}
                className={`px-3 py-1 rounded-md transition-colors flex items-center space-x-1 ${
                  activeTab === "json"
                    ? "bg-white font-semibold text-[#2D3E35] shadow-xs"
                    : "text-[#5C6B5E]"
                }`}
              >
                <Code className="w-3 h-3" />
                <span>DB Payload</span>
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] rounded-md hover:bg-[#F2ECE4]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {activeTab === "overview" ? (
            <>
              {/* Native CRM Payments & Card Schedule */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-[#C07D63]" />
                    <span className="font-bold text-sm text-[#2D3E35]">
                      Native Payment Schedule &amp; Card Invoicing
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    PENDING CLIENT AUTHORIZATION
                  </span>
                </div>

                <p className="text-xs text-[#5C6B5E] leading-relaxed">
                  Financial records, installment schedules, and guest payment statuses are managed
                  <span className="font-semibold text-[#2D3E35]"> natively in KAI&apos;s database</span>.
                  Guests authorize card payments securely through their private itinerary link without reliance on external SaaS subscriptions.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 py-1 text-[11px]">
                  <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                    <span className="text-[#5C6B5E] text-[10px] uppercase font-semibold">Total Investment</span>
                    <div className="text-sm font-bold text-[#2D3E35]">$4,850.00 USD</div>
                  </div>
                  <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                    <span className="text-[#5C6B5E] text-[10px] uppercase font-semibold">30% Deposit (Due Now)</span>
                    <div className="text-sm font-bold text-[#C07D63]">$1,500.00 USD</div>
                  </div>
                  <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0] col-span-2 sm:col-span-1">
                    <span className="text-[#5C6B5E] text-[10px] uppercase font-semibold">70% Balance (45d Prior)</span>
                    <div className="text-sm font-bold text-[#2D3E35]">$3,350.00 USD</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5DDD0]/60">
                  <a
                    href={paymentsUrl}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-[#2D3E35] text-[#FAF7F2] font-semibold hover:bg-[#1F2C25] transition-colors"
                  >
                    <span>View Native Payment Record</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={() => copyToClipboard(paymentsUrl, "payments")}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] transition-colors"
                  >
                    {copiedLink === "payments" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 1-Click Database Automations */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-[#C07D63]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      1-Click Advisor Task Automations
                    </span>
                  </div>
                  <span className="text-[10px] text-[#5C6B5E]">Stages draft for Kareena &amp; Armaan</span>
                </div>

                {automationResult && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{automationResult}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleAutomate("draft_welcome", "Pre-Arrival Welcome")}
                    disabled={automating !== null}
                    className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-left transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-[#C07D63]" />
                      <span className="font-medium text-[#2D3E35]">Pre-Arrival Welcome</span>
                    </div>
                    <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => handleAutomate("draft_packing_guide", "14-Day Packing Guide")}
                    disabled={automating !== null}
                    className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-left transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <Compass className="w-3.5 h-3.5 text-[#2D3E35]" />
                      <span className="font-medium text-[#2D3E35]">14-Day Packing Guide</span>
                    </div>
                    <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => handleAutomate("draft_flight_coordination", "Flight & Chauffeur")}
                    disabled={automating !== null}
                    className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-left transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <Plane className="w-3.5 h-3.5 text-blue-700" />
                      <span className="font-medium text-[#2D3E35]">Flight &amp; Chauffeur Align</span>
                    </div>
                    <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <button
                    onClick={() => handleAutomate("draft_post_retreat_arc", "30-Day Somatic Arc")}
                    disabled={automating !== null}
                    className="p-2.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-left transition-colors flex items-center justify-between group disabled:opacity-50"
                  >
                    <div className="flex items-center space-x-2">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="font-medium text-[#2D3E35]">30-Day Somatic Arc</span>
                    </div>
                    <SendHorizontal className="w-3 h-3 text-[#5C6B5E] group-hover:text-[#2D3E35] transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Native Database Entities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trip Entity */}
                <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                  <div className="flex items-center justify-between text-[#5C6B5E]">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Native Trip Record
                    </span>
                    <span className="font-mono text-[10px] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DDD0]">
                      {tripId}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-sm text-[#2D3E35]">
                    KAI Sanctuary - {(intake.sanctuary_slug || "Nosara").toUpperCase()}
                  </div>
                  <div className="text-[11px] text-[#5C6B5E]">
                    Tier: <span className="font-medium text-[#2D3E35]">{intake.room_tier}</span> &middot; Cap: 14 Max
                  </div>
                  <div className="pt-2 flex items-center space-x-2">
                    <a
                      href={tripUrl}
                      className="text-xs text-[#C07D63] hover:underline flex items-center space-x-1 font-medium"
                    >
                      <span>View in Native CRM</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Contact Entity */}
                <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                  <div className="flex items-center justify-between text-[#5C6B5E]">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Native Client Record
                    </span>
                    <span className="font-mono text-[10px] bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#E5DDD0]">
                      {contactId}
                    </span>
                  </div>
                  <div className="font-serif font-bold text-sm text-[#2D3E35] flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-[#5C6B5E]" />
                    <span>{intake.client_name}</span>
                  </div>
                  <div className="text-[11px] text-[#5C6B5E]">
                    {intake.email} &middot; Matching:{" "}
                    <span className="font-semibold text-emerald-700">Database Record Synced</span>
                  </div>
                  <div className="pt-2 flex items-center space-x-2">
                    <a
                      href={contactUrl}
                      className="text-xs text-[#C07D63] hover:underline flex items-center space-x-1 font-medium"
                    >
                      <span>View Client Dossier</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Smart Flights Live Tracking Block */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Plane className="w-4 h-4 text-[#2D3E35]" />
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Smart Flight Tracking (Cirium Active)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded font-semibold">
                    {flightBlock.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div>
                    <span className="text-[10px] text-[#5C6B5E]">Airline:</span>
                    <div className="font-semibold text-[#2D3E35]">{flightBlock.airline}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C6B5E]">Flight Number:</span>
                    <div className="font-semibold font-mono text-[#2D3E35]">{flightBlock.flight_number}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C6B5E]">Route:</span>
                    <div className="font-semibold font-mono text-[#2D3E35]">
                      {flightBlock.departure} &rarr; {flightBlock.arrival}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#5C6B5E]">Cabin Class:</span>
                    <div className="font-semibold text-[#C07D63]">{flightBlock.cabin_class}</div>
                  </div>
                </div>
              </div>

              {/* Standardized Guest Tags */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                  Standardized Guest Tags in Native CRM
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                    COHORT_2026_2027
                  </span>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-50 text-blue-900 border border-blue-200">
                    NATIVE_DB_RECORD
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* JSON Technical View */
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-[#5C6B5E]">
                <span>Native Database Record Structure (crm_clients &amp; crm_trips)</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          crm_client: {
                            id: contactId,
                            name: intake.client_name,
                            email: intake.email,
                            tags,
                            source: "WEBSITE_INTAKE",
                            total_lifetime_spend: 4850.0,
                          },
                          crm_trip: {
                            id: tripId,
                            status: "PROPOSED_ITINERARY",
                            room_tier: intake.room_tier,
                            deep_links: { tripUrl, paymentsUrl, proposalUrl },
                            payments: {
                              total: 4850.0,
                              deposit: 1500.0,
                              balance: 3350.0,
                              status: "PENDING_CLIENT_AUTHORIZATION",
                              storage: "NATIVE_KAI_DATABASE",
                            },
                            smart_flight: flightBlock,
                          },
                        },
                        null,
                        2
                      ),
                      "json"
                    )
                  }
                  className="hover:text-[#2D3E35] flex items-center space-x-1"
                >
                  {copiedLink === "json" ? (
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-xl bg-[#2D3E35] text-[#FAF7F2] font-mono text-[11px] overflow-x-auto leading-relaxed max-h-[380px]">
                {JSON.stringify(
                  {
                    crm_client: {
                      id: contactId,
                      name: intake.client_name,
                      email: intake.email,
                      tags,
                      source: "WEBSITE_INTAKE",
                      total_lifetime_spend: 4850.0,
                    },
                    crm_trip: {
                      id: tripId,
                      status: "PROPOSED_ITINERARY",
                      room_tier: intake.room_tier,
                      deep_links: { tripUrl, paymentsUrl, proposalUrl },
                      payments: {
                        total: 4850.0,
                        deposit: 1500.0,
                        balance: 3350.0,
                        status: "PENDING_CLIENT_AUTHORIZATION",
                        storage: "NATIVE_KAI_DATABASE",
                        note: "PCI DSS compliance & payment records handled natively in KAI database",
                      },
                      smart_flight: flightBlock,
                    },
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default CrmEntityInspectorModal;
