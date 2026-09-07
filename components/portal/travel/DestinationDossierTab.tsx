"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  HeartPulse,
  Phone,
  CheckSquare,
  Square,
  Sparkles,
  Plane,
  RefreshCw,
  Info
} from "lucide-react";
import { DestinationGuide, fetchDestinationGuide } from "@/lib/sidecar-api";

interface DestinationDossierTabProps {
  sanctuarySlug: string;
  viewMode: "client" | "clinical";
}

export default function DestinationDossierTab({ sanctuarySlug, viewMode }: DestinationDossierTabProps) {
  const [guide, setGuide] = useState<DestinationGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const loadGuide = async () => {
    setLoading(true);
    try {
      const data = await fetchDestinationGuide(sanctuarySlug);
      setGuide(data);
    } catch (e) {
      console.error("Failed to fetch destination guide:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuide();
  }, [sanctuarySlug]);

  const toggleCheck = (item: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  const totalItems = guide?.packing_checklist?.length || 0;
  const packedCount = Object.values(checkedItems).filter(Boolean).length;
  const packedPct = totalItems > 0 ? Math.round((packedCount / totalItems) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-md bg-[#2D3E35]/10 text-[#2D3E35]">
              <FileText className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
              {viewMode === "client" ? "Destination & Packing Guide" : "Destination Regulatory Intelligence & Compliance"}
            </h2>
          </div>
          <p className="text-xs text-[#5C6B5E] mt-1">
            {viewMode === "client"
              ? "Everything you need for serene peace of mind before your journey—visa basics, temple etiquette, and what to pack."
              : "Consular visa protocols, circadian chronobiology parameters, and on-site emergency clinical logistics."}
          </p>
        </div>

        <button
          onClick={loadGuide}
          disabled={loading}
          className="self-start sm:self-auto inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Guide</span>
        </button>
      </div>

      {guide ? (
        <div className="space-y-5">
          {/* 2. Destination Core Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visa & Passport Peace of Mind */}
            <div className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 text-[#2D3E35]">
                <Plane className="w-4 h-4 text-[#C07D63]" />
                <h3 className="font-serif text-base font-bold">
                  {viewMode === "client" ? "Entry & Passport Essentials" : "Consular Visa & Passport Compliance"}
                </h3>
              </div>
              <div className="text-xs text-[#5C6B5E] space-y-2">
                <div>
                  <span className="font-semibold text-[#2D3E35] block">Sanctuary Region:</span>
                  <span>{guide.country}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#2D3E35] block">Passport Requirement:</span>
                  <span>{guide.passport_validity}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#2D3E35] block">Tourist Entry:</span>
                  <span className="text-[#2D3E35]">{guide.visa_requirements}</span>
                </div>
              </div>
            </div>

            {/* Medical Care & Concierge Emergency */}
            <div className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs space-y-3">
              <div className="flex items-center space-x-2 text-[#2D3E35]">
                <HeartPulse className="w-4 h-4 text-rose-600" />
                <h3 className="font-serif text-base font-bold">
                  {viewMode === "client" ? "Personal Safety & Care Support" : "On-Site Clinical Oversight & Proximity"}
                </h3>
              </div>
              <div className="text-xs text-[#5C6B5E] space-y-2">
                <div>
                  <span className="font-semibold text-[#2D3E35] block">Clinical Proximity:</span>
                  <span>{guide.emergency_clinic_distance}</span>
                </div>
                <div>
                  <span className="font-semibold text-[#2D3E35] block">Registered Nurse On-Site:</span>
                  <span className="text-emerald-800 font-medium">
                    Founder Kareena Islam, BSN, RN provides direct clinical wellness oversight daily.
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-[#2D3E35] block">Local Concierge Line:</span>
                  <span className="font-mono text-[#2D3E35] font-semibold">{guide.local_concierge_phone || "+1-800-KAI-CARE"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Sanctuary & Sacred Customs */}
          <div className="p-5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] shadow-2xs space-y-2.5">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#C07D63]" />
              <h3 className="font-serif text-sm font-bold text-[#2D3E35] uppercase tracking-wider">
                {viewMode === "client" ? "Welcoming Sanctuary Customs & Etiquette" : "Cultural Anthropological Protocols"}
              </h3>
            </div>
            <p className="text-xs text-[#2D3E35] leading-relaxed bg-white p-4 rounded-lg border border-[#E5DDD0]">
              {guide.temple_customs}
            </p>
          </div>

          {/* 4. Interactive Packing Checklist */}
          <div className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DDD0] pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                  {viewMode === "client" ? "Peace of Mind Packing Checklist" : "Equip-Ready Physiological Checklist"}
                </h3>
                <p className="text-xs text-[#5C6B5E] mt-0.5">
                  Check off items as you pack your bags. Everything has been carefully considered for coastal comfort.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-semibold text-[#2D3E35]">
                  {packedCount} of {totalItems} Packed ({packedPct}%)
                </span>
                <div className="w-24 bg-[#E5DDD0] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2D3E35] h-full transition-all duration-300"
                    style={{ width: `${packedPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {guide.packing_checklist.map((item, idx) => {
                const isChecked = !!checkedItems[item];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleCheck(item)}
                    className={`text-left p-3 rounded-lg border transition-all flex items-start space-x-3 text-xs ${
                      isChecked
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] border-[#E5DDD0] text-[#2D3E35]"
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-[#5C6B5E]" />
                      )}
                    </span>
                    <span className={`${isChecked ? "line-through opacity-80" : "font-medium"}`}>
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-white rounded-xl border border-[#E5DDD0] text-xs text-[#5C6B5E]">
          Loading destination guide...
        </div>
      )}
    </div>
  );
}
