"use client";

import React, { useState } from "react";
import {
  X,
  Sparkles,
  HeartPulse,
  Plane,
  Car,
  Utensils,
  ShieldCheck,
  BedDouble,
  Clock,
  Plus,
  Search,
  Filter
} from "lucide-react";

export interface CuratedActivityBlock {
  title: string;
  time: string;
  activity_type: string;
  description: string;
  badge?: string;
  benefits?: string[];
}

export const CURATED_SOMATIC_BLOCKS: CuratedActivityBlock[] = [
  // Somatic Wellness & Recovery
  {
    title: "432Hz Acoustic Bowl Immersion & Spinal Decompression",
    time: "16:30 - 18:00",
    activity_type: "somatic_wellness",
    badge: "Core Somatic",
    description: "Gentle spinal traction on clinical reformers followed by immersive Tibetan and crystal bowl sound bath tuned to 432Hz for deep vagal down-regulation.",
    benefits: ["Nervous system reset", "Spinal alignment", "Anxiety relief"]
  },
  {
    title: "Infrared Sauna & Cedar Cold Plunge Thermal Contrast",
    time: "09:00 - 10:30",
    activity_type: "somatic_wellness",
    badge: "Contrast Therapy",
    description: "Thermogenic Finnish sauna protocol (>80°C) alternating with 3-minute immersion in 11°C mineral cedar plunge tubs to stimulate mitochondrial biogenesis.",
    benefits: ["Mitochondrial renewal", "Circulation boost", "Endorphin release"]
  },
  {
    title: "Vagal Nerve Realignment & Parasympathetic Breathwork",
    time: "10:30 - 12:00",
    activity_type: "somatic_wellness",
    badge: "Autonomic Care",
    description: "Guided 4-7-8 and extended exhalation breathwork masterclass combined with gentle sub-occipital cranial release to restore autonomic parasympathetic tone.",
    benefits: ["HRV enhancement", "Vagal tone activation", "Cortisol reduction"]
  },
  {
    title: "Craniosacral Structural Integration & Saltwater Float",
    time: "14:00 - 16:30",
    activity_type: "somatic_wellness",
    badge: "Restorative Release",
    description: "One-on-one craniosacral fascia mobilization followed by sensory-deprivation warm magnesium ocean floatation for deep neuromuscular decompression.",
    benefits: ["Fascial release", "Sensory rest", "Sleep architecture"]
  },
  {
    title: "Dawn Vinyasa & Autonomic Morning Integration",
    time: "07:30 - 08:45",
    activity_type: "somatic_wellness",
    badge: "Circadian Alignment",
    description: "Gentle sunrise somatic flow designed to align biological circadian clocks with morning sunlight exposure and ocean-air diaphragmatic breathing.",
    benefits: ["Circadian sync", "Gentle mobility", "Natural cortisol peak"]
  },

  // Blue Zone Dining & Clinical Nutrition
  {
    title: "Organic Farm-to-Table Welcome Feast (Seed-Oil-Free)",
    time: "19:00 - 21:00",
    activity_type: "blue_zone_dining",
    badge: "Executive Chef",
    description: "Chef-curated 5-course coastal dinner featuring 100% regeneratively farmed local ingredients, grass-fed bone broths, organic olive oil, and wild-caught fish.",
    benefits: ["Anti-inflammatory", "Gut microbiome balance", "Cellular nutrition"]
  },
  {
    title: "Blue Zone Longevity Gastronomy Tasting Menu",
    time: "12:30 - 14:00",
    activity_type: "blue_zone_dining",
    badge: "Longevity Nutrition",
    description: "Multi-course antioxidant-rich lunch modeled on Nicoya/Okinawa Blue Zone diets, pairing polyphenol-rich mountain vegetables with anti-inflammatory herbal elixirs.",
    benefits: ["Antioxidant delivery", "Clean energy", "Zero refined sugars"]
  },
  {
    title: "Evening Adaptogenic Herbal Elixir Tasting & Tea Circle",
    time: "20:30 - 21:30",
    activity_type: "blue_zone_dining",
    badge: "Sleep Elixir",
    description: "Ceremonial evening herbal tea formulation with ashwagandha, reishi, magnesium glycinate, and wild passionflower to promote restorative REM sleep.",
    benefits: ["Sleep induction", "GABA support", "Evening unwinding"]
  },

  // Aviation & VIP Ground Chauffeur
  {
    title: "Private SUV Tarmac Meet & Adaptogenic Welcome",
    time: "14:00 - 16:00",
    activity_type: "aviation_arrival",
    badge: "VIP Tarmac",
    description: "Dedicated airport meet-and-greet at gateway customs gate, VIP luggage transport, chilled herbal hydration tonics, and direct private luxury transfer to sanctuary grounds.",
    benefits: ["Zero transit friction", "Hydration recovery", "Seamless arrival"]
  },
  {
    title: "Scenic 4WD Mountain River-Crossing Chauffeur Escort",
    time: "11:00 - 13:30",
    activity_type: "ground_chauffeur",
    badge: "Expedition Escort",
    description: "Panoramic luxury 4WD escort navigating private coastal mountain passes, seasonal river overlooks, and tropical biodiversity canopy points with expert driver.",
    benefits: ["Scenic immersion", "Safe terrain navigation", "Air-conditioned comfort"]
  },

  // Clinical Protocol & Nurse Kareena Screening
  {
    title: "Nurse Kareena Intake & Autonomic Biometric Baseline",
    time: "09:30 - 10:30",
    activity_type: "clinical_screening",
    badge: "Clinical Triage",
    description: "Confidential clinical consultation with Nurse Kareena Islam, BSN, RN. Includes baseline HRV telemetry, vital signs review, contraindication checks, and tailored schedule adjustments.",
    benefits: ["100% personalized care", "Safety verification", "Biometric tracking"]
  },
  {
    title: "Daily Morning HRV Telemetry & Circadian Check-In",
    time: "08:00 - 08:30",
    activity_type: "clinical_screening",
    badge: "Daily Vitality",
    description: "5-minute non-invasive biometric telemetry check evaluating resting heart rate, autonomic recovery scores, and physiological readiness for daily retreat modalities.",
    benefits: ["Daily calibration", "Fatigue prevention", "Clinical peace of mind"]
  },

  // Sanctuary Living & Lodging
  {
    title: "Private Cliffside Plunge Session & Sunset Soaking",
    time: "17:30 - 19:00",
    activity_type: "lodging_sanctuary",
    badge: "Sanctuary Living",
    description: "Uninterrupted quiet recovery time on private villa terrace with panoramic sunset ocean views, private magnesium soaking plunge, and warm herbal compresses.",
    benefits: ["Deep solitude", "Sensory grounding", "Restorative peace"]
  }
];

interface SomaticActivityBlockLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (block: CuratedActivityBlock) => void;
}

export default function SomaticActivityBlockLibrary({
  isOpen,
  onClose,
  onSelectBlock
}: SomaticActivityBlockLibraryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  if (!isOpen) return null;

  const filteredBlocks = CURATED_SOMATIC_BLOCKS.filter((block) => {
    const matchesSearch =
      block.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (block.badge || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || block.activity_type === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800">
              <Sparkles className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#2D3E35] leading-tight">
                Curated Somatic Activity Block Library
              </h3>
              <p className="text-[11px] text-[#5C6B5E]">
                Clinically vetted, reusable retreat blocks · 1-click injection into itinerary
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] rounded-md hover:bg-[#F2ECE4] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Strip & Search */}
        <div className="p-3.5 bg-white/60 border-b border-[#E5DDD0] flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-[#5C6B5E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search somatic modalities, dining, breathwork..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg text-[#2D3E35] placeholder-[#5C6B5E]/60 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: "all", label: "All" },
              { id: "somatic_wellness", label: "🧘 Somatics" },
              { id: "blue_zone_dining", label: "🍽️ Dining" },
              { id: "aviation_arrival", label: "✈️ Aviation" },
              { id: "clinical_screening", label: "🩺 Clinical" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-[#2D3E35] text-[#FAF7F2]"
                    : "bg-[#FAF7F2] border border-[#E5DDD0] text-[#5C6B5E] hover:text-[#2D3E35]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blocks List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
          {filteredBlocks.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#5C6B5E]">
              No activity blocks match your search query. Try another term.
            </div>
          ) : (
            filteredBlocks.map((block, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-[#E5DDD0] hover:border-emerald-500/50 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-serif font-bold text-xs text-[#2D3E35]">
                      {block.title}
                    </span>
                    {block.badge && (
                      <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {block.badge}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-[#5C6B5E] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#5C6B5E]/80" />
                      {block.time}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5C6B5E] leading-relaxed">
                    {block.description}
                  </p>

                  {block.benefits && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {block.benefits.map((b, bIdx) => (
                        <span
                          key={bIdx}
                          className="text-[9px] text-[#2D3E35]/80 bg-[#FAF7F2] border border-[#E5DDD0] px-1.5 py-0.2 rounded"
                        >
                          ✓ {b}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onSelectBlock(block);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-700 hover:text-white border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Insert Block</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-[#E5DDD0] text-center text-[10px] text-[#5C6B5E]">
          Tern-Style Reusable Itinerary Activity Blocks · Pre-calculated for 12–14 guest intimate cohorts
        </div>
      </div>
    </div>
  );
}

