"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Utensils,
  Leaf,
  Sparkles,
  MapPin,
  Clock,
  HeartPulse,
  Plus,
  Filter,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink
} from "lucide-react";
import {
  CuratedDiningSpot,
  fetchCuratedDining,
  createCuratedDiningSpot,
  CuratedDiningCreateRequest
} from "@/lib/sidecar-api";

interface CuratedDiningTabProps {
  sanctuarySlug: string;
}

export default function CuratedDiningTab({ sanctuarySlug }: CuratedDiningTabProps) {
  const [spots, setSpots] = useState<CuratedDiningSpot[]>([]);
  const [activeTag, setActiveTag] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // New Spot Form Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [cuisineType, setCuisineType] = useState("Organic Farm-to-Table & Botanical");
  const [dietaryTagsStr, setDietaryTagsStr] = useState("Gluten-Free, Dairy-Free, Organic");
  const [distKm, setDistKm] = useState("2.5");
  const [desc, setDesc] = useState("");
  const [nurseNotes, setNurseNotes] = useState("");
  const [priceTier, setPriceTier] = useState("$$$");
  const [adding, setAdding] = useState(false);

  const loadDining = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCuratedDining(sanctuarySlug, activeTag);
      setSpots(data);
    } catch (e) {
      console.error("Failed to fetch curated dining:", e);
    } finally {
      setLoading(false);
    }
  }, [sanctuarySlug, activeTag]);

  useEffect(() => {
    loadDining();
  }, [loadDining]);

  const handleCreateSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const tags = dietaryTagsStr.split(",").map(t => t.trim()).filter(Boolean);
      const req: CuratedDiningCreateRequest = {
        sanctuary_slug: sanctuarySlug,
        name,
        cuisine_type: cuisineType,
        dietary_tags: tags,
        distance_from_villa_km: parseFloat(distKm) || 2.0,
        description: desc,
        nurse_notes: nurseNotes || "Whole organic ingredients supporting restorative gut microbiomes.",
        price_tier: priceTier,
        reservation_required: "CONCIERGE_HANDLED"
      };
      const created = await createCuratedDiningSpot(req);
      if (created) {
        setSpots(prev => [created, ...prev]);
        setShowAddModal(false);
        // Reset form
        setName("");
        setDesc("");
        setNurseNotes("");
      }
    } catch (e) {
      console.error("Failed to create curated dining spot:", e);
    } finally {
      setAdding(false);
    }
  };

  const DIETARY_FILTERS = [
    "ALL",
    "Gluten-Free",
    "Dairy-Free",
    "Ayurvedic",
    "Anti-Inflammatory",
    "Plant-Forward",
    "Organic",
    "Fresh Catch"
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-md bg-[#C07D63]/10 text-[#C07D63]">
              <Utensils className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2D3E35]">Nourishing Dining & Organic Cafes</h2>
          </div>
          <p className="text-xs text-[#5C6B5E] mt-1">Farm-to-table dining, wild herbal teas, and soothing anti-inflammatory meals supporting deep sleep and easy digestion.</p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Nourishing Spot</span>
          </button>
          <button
            onClick={loadDining}
            disabled={loading}
            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] rounded-md transition-colors"
            title="Refresh curated dining list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. Dietary Tag Filter Pills Strip */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white p-3 rounded-xl border border-[#E5DDD0]">
        <span className="text-xs font-semibold text-[#5C6B5E] mr-2 flex items-center space-x-1">
          <Filter className="w-3 h-3 text-[#C07D63]" />
          <span>Dietary Preference:</span>
        </span>
        {DIETARY_FILTERS.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              activeTag === tag
                ? "bg-[#2D3E35] text-[#FAF7F2] shadow-2xs"
                : "bg-[#FAF7F2] text-[#5C6B5E] hover:bg-[#F2ECE4] hover:text-[#2D3E35] border border-[#E5DDD0]"
            }`}
          >
            {tag === "ALL" ? "All Nourishing Spots" : tag}
          </button>
        ))}
      </div>

      {/* 3. Curated Dining Spot Cards */}
      {spots.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#E5DDD0] text-xs text-[#5C6B5E]">
          No dining spots found matching &ldquo;{activeTag}&rdquo;. Click &ldquo;Add Nourishing Spot&rdquo; to register one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {spots.map(spot => (
            <div
              key={spot.id}
              className="p-5 rounded-xl bg-white border border-[#E5DDD0] hover:border-[#C07D63]/50 transition-all shadow-2xs space-y-3.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-bold text-[#C07D63] uppercase tracking-wider">
                    {spot.cuisine_type}
                  </div>
                  <h3 className="font-serif text-lg font-bold text-[#2D3E35] mt-0.5">
                    {spot.name}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-[#2D3E35] block">{spot.price_tier}</span>
                  <span className="text-[11px] text-[#5C6B5E] flex items-center justify-end space-x-0.5">
                    <MapPin className="w-3 h-3 text-[#C07D63]" />
                    <span>{spot.distance_from_villa_km} km from villa</span>
                  </span>
                </div>
              </div>

              {/* Dietary Tag Badges */}
              <div className="flex flex-wrap gap-1.5">
                {spot.dietary_tags.map(t => (
                  <span
                    key={t}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200"
                  >
                    {t}
                  </span>
                ))}
              </div>

              {/* Atmosphere Description */}
              <p className="text-xs text-[#2D3E35] leading-relaxed bg-[#FAF7F2]/60 p-3 rounded-lg border border-[#E5DDD0]/70">
                {spot.description}
              </p>

              {/* Wellness Digestion & Gut Health Callout */}
              <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-1">
                <div className="font-semibold text-[#C07D63] text-[11px] flex items-center space-x-1.5">
                  <HeartPulse className="w-3.5 h-3.5" />
                  <span>Wellness Gut Health & Digestion Note</span>
                </div>
                <p className="text-[11px] text-[#2D3E35] leading-normal">{spot.nurse_notes}</p>
              </div>

              {/* Card Footer: Concierge Handling */}
              <div className="flex items-center justify-between text-[11px] pt-1 text-[#5C6B5E] border-t border-[#E5DDD0]/60">
                <span className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Concierge Table Reservations Included</span>
                </span>
                <span className="text-emerald-800 font-semibold uppercase text-[10px] tracking-wider">
                  Verified Local Partner
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Add Nourishing Spot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DDD0] shadow-xl w-full max-w-lg p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center space-x-2">
                <Leaf className="w-4 h-4 text-emerald-600" />
                <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                  Add Curated Organic Dining Spot
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSpot} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Spot Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                  placeholder="e.g. Al Chile Organic Hearth & Gardens"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#2D3E35]">Cuisine Type</label>
                  <input
                    type="text"
                    value={cuisineType}
                    onChange={e => setCuisineType(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[#2D3E35]">Distance from Villa (km)</label>
                  <input
                    type="text"
                    value={distKm}
                    onChange={e => setDistKm(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Dietary Tags (comma-separated)</label>
                <input
                  type="text"
                  value={dietaryTagsStr}
                  onChange={e => setDietaryTagsStr(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                  placeholder="Gluten-Free, Dairy-Free, Ayurvedic, Organic"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Serene Atmosphere &amp; Farm Origin</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md p-2.5 text-[#2D3E35] focus:outline-none"
                  placeholder="Describe the garden setting, local produce sources, and peaceful ambiance..."
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Nurse Gut Health &amp; Digestive Note</label>
                <textarea
                  rows={2}
                  value={nurseNotes}
                  onChange={e => setNurseNotes(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md p-2.5 text-[#2D3E35] focus:outline-none"
                  placeholder="Clinical benefits of herbs, spices, or cooking methods for restorative digestion..."
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5DDD0]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 text-xs text-[#5C6B5E] hover:text-[#2D3E35] rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md shadow-sm"
                >
                  {adding ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Dining Spot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
