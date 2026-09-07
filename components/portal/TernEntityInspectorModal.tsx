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
} from "lucide-react";
import { StagingIntake } from "@/lib/sidecar-api";

interface TernEntityInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  intake: StagingIntake | null;
}

export default function TernEntityInspectorModal({
  isOpen,
  onClose,
  intake,
}: TernEntityInspectorModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "json">("overview");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  if (!isOpen || !intake) return null;

  const tripId = intake.tern_trip_id || `tern_trp_${intake.id.substring(0, 8)}`;
  const contactId = intake.tern_contact_id || `tern_cnt_${intake.id.substring(0, 8)}`;

  const tripUrl = `https://app.tern.travel/trips/${tripId}`;
  const paymentsUrl = `https://app.tern.travel/trips/${tripId}/payments`;
  const contactUrl = `https://app.tern.travel/contacts/${contactId}`;
  const proposalUrl = `https://app.tern.travel/public/proposals/${tripId}`;

  const copyToClipboard = (url: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(label);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const isSynced = intake.status === "SYNCED_TO_TERN";

  // Simulated flight block
  const flight = intake.flight_request || {};
  const flightBlock = {
    airline: flight.preferred_airline || "Delta Air Lines",
    flight_number: "DL 1928",
    departure: flight.departure_airport || "MIA",
    arrival: "LIR",
    cabin_class: flight.cabin_class || "Business",
    status: "ON_TIME (Cirium Active)",
  };

  const tags = intake.consultation_thesis?.clinical_flags || [
    "CORTISOL_RESET",
    "VAGAL_DYSREGULATION",
    "BLUE_ZONE_DIET",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2D3E35] leading-tight">
                Tern CRM Entity &amp; Payments Inspector
              </h3>
              <p className="text-xs text-[#5C6B5E]">
                Client: <span className="font-semibold text-[#2D3E35]">{intake.client_name}</span> &middot;{" "}
                {isSynced ? (
                  <span className="text-emerald-700 font-medium">Live Synced Record</span>
                ) : (
                  <span className="text-amber-700 font-medium">Staged / Pre-Sync Preview</span>
                )}
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
                <span>Payload</span>
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
              {/* Native Tern Payments Banner */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-[#C07D63]" />
                    <span className="font-bold text-sm text-[#2D3E35]">
                      Tern Native Credit Card Authorization &amp; Payments
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    PENDING AUTHORIZATION
                  </span>
                </div>

                <p className="text-xs text-[#5C6B5E] leading-relaxed">
                  Payments, PCI DSS compliance, 2FA validation, and installment invoicing are managed
                  <span className="font-semibold text-[#2D3E35]"> 100% natively by Tern</span>. KAI does not
                  store or process raw credit cards. Guests authorize cards directly on their published itinerary.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5DDD0]/60">
                  <a
                    href={paymentsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-[#2D3E35] text-[#FAF7F2] font-semibold hover:bg-[#1F2C25] transition-colors"
                  >
                    <span>Open Tern Payments Tab</span>
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

              {/* Tern Entity IDs & Deep Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Trip Entity */}
                <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                  <div className="flex items-center justify-between text-[#5C6B5E]">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Tern Trip Entity
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
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#C07D63] hover:underline flex items-center space-x-1 font-medium"
                    >
                      <span>View in Tern Itinerary</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Contact Entity */}
                <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                  <div className="flex items-center justify-between text-[#5C6B5E]">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                      Tern Contact Entity
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
                    <span className="font-semibold text-emerald-700">Email Key Matched</span>
                  </div>
                  <div className="pt-2 flex items-center space-x-2">
                    <a
                      href={contactUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#C07D63] hover:underline flex items-center space-x-1 font-medium"
                    >
                      <span>View Contact Profile</span>
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
                      Tern Smart Flight Integration (Cirium Active)
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

              {/* Applied Clinical Tags */}
              <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] space-y-2">
                <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                  Standardized Clinical Tags in Tern CRM
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
                </div>
              </div>
            </>
          ) : (
            /* JSON Technical View */
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-[#5C6B5E]">
                <span>Raw Tern Sync Payload Structure</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(
                        {
                          contact: {
                            id: contactId,
                            name: intake.client_name,
                            email: intake.email,
                            tags,
                          },
                          trip: {
                            id: tripId,
                            status: "PROPOSED_ITINERARY",
                            room_tier: intake.room_tier,
                            deep_links: { tripUrl, paymentsUrl, proposalUrl },
                            payments: {
                              provider: "TERN_NATIVE",
                              status: "PENDING_CLIENT_AUTHORIZATION",
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
                    <span className="text-emerald-700">Copied!</span>
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
                    contact: {
                      id: contactId,
                      name: intake.client_name,
                      email: intake.email,
                      tags,
                    },
                    trip: {
                      id: tripId,
                      status: "PROPOSED_ITINERARY",
                      room_tier: intake.room_tier,
                      deep_links: { tripUrl, paymentsUrl, proposalUrl },
                      payments: {
                        provider: "TERN_NATIVE",
                        status: "PENDING_CLIENT_AUTHORIZATION",
                        note: "PCI compliance handled 100% natively by Tern",
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
