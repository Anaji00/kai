"use client";

import React, { useState, useEffect } from "react";
import {
  Compass,
  Navigation,
  Sun,
  Utensils,
  Star,
  BookOpen,
  MapPin,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { onFormFill, getAndClearPendingFormFill, FormFillProposal } from "@/lib/portal-form-bus";
import TravelTransitTab from "./travel/TravelTransitTab";
import MicroclimateWeatherTab from "./travel/MicroclimateWeatherTab";
import CuratedDiningTab from "./travel/CuratedDiningTab";
import VerifiedReviewsTab from "./travel/VerifiedReviewsTab";
import DestinationDossierTab from "./travel/DestinationDossierTab";

const SANCTUARIES = [
  {
    slug: "puerto-vallarta",
    name: "Puerto Vallarta, Mexico (Jan 28–31, 2027)",
    region: "Banderas Bay • Marival Harmony (Armony)",
    badge: "First Retreat of 2027 • Flagship"
  },
  {
    slug: "nosara",
    name: "Nosara, Costa Rica",
    region: "Nicoya Peninsula • Blue Zone",
    badge: "Coming Soon • Ocean & Prana"
  },
  {
    slug: "amalfi",
    name: "Amalfi Coast, Italy",
    region: "Campania • Mediterranean Sea",
    badge: "Coming Soon • Cliffside Stillness"
  },
  {
    slug: "bali",
    name: "Ubud, Bali",
    region: "Gianyar • Sacred Valley",
    badge: "Coming Soon • Sacred Water"
  },
  {
    slug: "riviera-maya",
    name: "Riviera Maya, Mexico",
    region: "Quintana Roo • Caribbean Coast",
    badge: "Past Cohort / Future TBA"
  }
];

type ActiveTab = "routes" | "weather" | "dining" | "reviews" | "destination";

export default function TravelLogisticsMapView() {
  const [selectedSlug, setSelectedSlug] = useState("puerto-vallarta");
  const [activeTab, setActiveTab] = useState<ActiveTab>("weather");

  useEffect(() => {
    const handleProposal = (prop: FormFillProposal) => {
      const f = prop.fields || prop.payload || {};
      if (f.sanctuary_slug) {
        setSelectedSlug(f.sanctuary_slug as string);
      }
      if (prop.form_type === "route_calculator") {
        setActiveTab("routes");
      } else if (prop.form_type === "curated_dining") {
        setActiveTab("dining");
      } else if (prop.form_type === "somatic_review") {
        setActiveTab("reviews");
      } else if (prop.form_type === "location_scraper") {
        setActiveTab("destination");
      }
    };

    const pending = getAndClearPendingFormFill();
    if (pending) {
      handleProposal(pending);
    }

    const unsub = onFormFill((prop) => {
      handleProposal(prop);
    });
    return unsub;
  }, []);

  const currentSanctuary = SANCTUARIES.find((s) => s.slug === selectedSlug) || SANCTUARIES[0];

  return (
    <div className="space-y-6">
      {/* Top Header Card with Sanctuary Selector */}
      <div className="bg-[#FAF7F2] rounded-2xl p-6 border border-[#E5DDD0] shadow-sm relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#C07D63]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="p-1.5 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
                <Compass className="w-5 h-5 text-[#C07D63]" />
              </span>
              <span className="text-[11px] font-semibold tracking-widest uppercase bg-[#E5DDD0] text-[#2D3E35] px-2.5 py-0.5 rounded-full">
                Live Sanctuary Logistics &amp; Historical Weather Intelligence
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
              Scenic Travel &amp; Sanctuary Explorer
            </h1>
            <p className="text-sm text-[#5C6B5E] mt-1 max-w-2xl">
              Coordinated travel planning for Founders <strong>Kareena Islam, BSN, RN</strong> &amp; <strong>Armaan Islam</strong>. Live road transit calculations, 30-year historical weather models &amp; packing intelligence, nourishing dining, and verified guest rest metrics.
            </p>
          </div>

          {/* Right Controls: Sanctuary Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <label className="block text-[10px] uppercase font-bold text-[#5C6B5E] tracking-wider mb-1">
                Sanctuary Location
              </label>
              <div className="relative">
                <select
                  value={selectedSlug}
                  aria-label="Select Sanctuary Location"
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  className="appearance-none w-full sm:w-72 pl-9 pr-10 py-2.5 bg-white border border-[#E5DDD0] rounded-xl text-xs font-semibold text-[#2D3E35] focus:outline-none focus:ring-2 focus:ring-[#C07D63] shadow-sm cursor-pointer"
                >
                  {SANCTUARIES.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-[#C07D63] absolute left-3 top-3 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-[#5C6B5E] absolute right-3 top-3 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Selected Sanctuary Quick Context Bar */}
        <div className="mt-5 pt-4 border-t border-[#E5DDD0]/70 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#2D3E35] text-sm">
              {currentSanctuary.name}
            </span>
            <span className="text-[#C07D63]">•</span>
            <span className="text-[#5C6B5E]">{currentSanctuary.region}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#5C6B5E]/10 text-[#2D3E35] font-medium text-[11px]">
              {currentSanctuary.badge}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#5C6B5E]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              kareena@grandtravelcruise.com &amp; armaan@grandtravelcruise.com
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tab Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#E5DDD0] scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("weather")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "weather"
              ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
              : "bg-white text-[#5C6B5E] hover:bg-[#FAF7F2] border border-[#E5DDD0]"
          }`}
        >
          <Sun className={`w-4 h-4 ${activeTab === "weather" ? "text-amber-400" : "text-[#5C6B5E]"}`} />
          <span>Weather Model, What to Pack &amp; Wear</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("routes")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "routes"
              ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
              : "bg-white text-[#5C6B5E] hover:bg-[#FAF7F2] border border-[#E5DDD0]"
          }`}
        >
          <Navigation className={`w-4 h-4 ${activeTab === "routes" ? "text-[#C07D63]" : "text-[#5C6B5E]"}`} />
          <span>Scenic Routes &amp; Chauffeur Transit</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dining")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "dining"
              ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
              : "bg-white text-[#5C6B5E] hover:bg-[#FAF7F2] border border-[#E5DDD0]"
          }`}
        >
          <Utensils className={`w-4 h-4 ${activeTab === "dining" ? "text-[#C07D63]" : "text-[#5C6B5E]"}`} />
          <span>Nourishing Dining</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reviews")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "reviews"
              ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
              : "bg-white text-[#5C6B5E] hover:bg-[#FAF7F2] border border-[#E5DDD0]"
          }`}
        >
          <Star className={`w-4 h-4 ${activeTab === "reviews" ? "text-amber-400" : "text-[#5C6B5E]"}`} />
          <span>Guest Reflections &amp; Scores</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("destination")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === "destination"
              ? "bg-[#2D3E35] text-[#FAF7F2] shadow-sm"
              : "bg-white text-[#5C6B5E] hover:bg-[#FAF7F2] border border-[#E5DDD0]"
          }`}
        >
          <BookOpen className={`w-4 h-4 ${activeTab === "destination" ? "text-[#C07D63]" : "text-[#5C6B5E]"}`} />
          <span>Destination Guides &amp; Customs</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "routes" && <TravelTransitTab sanctuarySlug={selectedSlug} />}
        {activeTab === "weather" && (
          <MicroclimateWeatherTab
            sanctuarySlug={selectedSlug}
            onSelectSanctuary={setSelectedSlug}
          />
        )}
        {activeTab === "dining" && <CuratedDiningTab sanctuarySlug={selectedSlug} />}
        {activeTab === "reviews" && <VerifiedReviewsTab sanctuarySlug={selectedSlug} />}
        {activeTab === "destination" && <DestinationDossierTab sanctuarySlug={selectedSlug} />}
      </div>
    </div>
  );
}
