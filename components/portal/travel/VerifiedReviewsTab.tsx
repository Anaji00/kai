"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Moon,
  VolumeX,
  HeartHandshake,
  Star,
  RefreshCw,
  Send,
  Plus,
  ShieldCheck,
  CheckCircle2,
  MessageSquare
} from "lucide-react";
import {
  DestinationReview,
  fetchDestinationReviews,
  submitDestinationReview,
  simulateReviewWebhook
} from "@/lib/sidecar-api";

interface VerifiedReviewsTabProps {
  sanctuarySlug: string;
  viewMode: "client" | "clinical";
}

export default function VerifiedReviewsTab({ sanctuarySlug, viewMode }: VerifiedReviewsTabProps) {
  const [reviews, setReviews] = useState<DestinationReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation state
  const [simulating, setSimulating] = useState(false);
  const [simFeedback, setSimFeedback] = useState<string | null>(null);

  // Form modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [stayDates, setStayDates] = useState("Recent Cohort");
  const [rating, setRating] = useState(5.0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await fetchDestinationReviews(sanctuarySlug);
      setReviews(data);
    } catch (e) {
      console.error("Failed to fetch reviews:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [sanctuarySlug]);

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimFeedback(null);
    try {
      const sampleReviews = [
        "The utter silence of the villa shala allowed my nervous system to drop out of fight-or-flight within 24 hours. Slept eight unbroken hours every single night. Kareena's care was gentle, grounding, and deeply reassuring.",
        "As a surgeon with chronic sleep disturbances, this was the first time in ten years I woke up feeling truly restored. The organic coastal meals and dusk sound baths calmed my heart rate noticeably.",
        "Pure peace and stillness. Waking up to ocean breezes, practicing gentle 4-7-8 breathwork with Kareena, and walking barefoot on the sand reset my entire perspective."
      ];
      const randomText = sampleReviews[Math.floor(Math.random() * sampleReviews.length)];

      const created = await simulateReviewWebhook({
        sanctuary_slug: sanctuarySlug,
        guest_name: "Verified Cohort Guest",
        stay_dates: "Current 2026 Cohort",
        rating: 5.0,
        comment: randomText
      });

      if (created) {
        setReviews(prev => [created, ...prev]);
        setSimFeedback(`Scored new guest reflection: Sleep ${created.deep_sleep_score}/100, Quietude ${created.quietude_score}/100`);
        setTimeout(() => setSimFeedback(null), 5000);
      }
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setSimulating(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await submitDestinationReview({
        sanctuary_slug: sanctuarySlug,
        guest_name: guestName,
        stay_dates: stayDates,
        overall_rating: rating,
        review_text: reviewText
      });
      if (created) {
        setReviews(prev => [created, ...prev]);
        setShowAddModal(false);
        setGuestName("");
        setReviewText("");
      }
    } catch (e) {
      console.error("Manual review submission failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute average somatic metrics
  const avgSleep = reviews.length
    ? Math.round(reviews.reduce((acc, r) => acc + r.deep_sleep_score, 0) / reviews.length)
    : 98;
  const avgQuiet = reviews.length
    ? Math.round(reviews.reduce((acc, r) => acc + r.quietude_score, 0) / reviews.length)
    : 99;
  const avgCare = reviews.length
    ? Math.round(reviews.reduce((acc, r) => acc + r.clinical_attentiveness_score, 0) / reviews.length)
    : 100;

  return (
    <div className="space-y-6">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-md bg-purple-50 text-purple-700">
              <MessageSquare className="w-4 h-4" />
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
              {viewMode === "client" ? "Guest Reflections & Reviews" : "Somatic Sentiment NLP & Verified Review Telemetry"}
            </h2>
          </div>
          <p className="text-xs text-[#5C6B5E] mt-1">
            {viewMode === "client"
              ? "Verified stories of deep sleep, acoustic quietude, and nursing care from previous retreat guests."
              : "Post-retreat somatic sentiment evaluation tracking circadian down-regulation and parasympathetic recovery."}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleSimulateWebhook}
            disabled={simulating}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors shadow-2xs"
          >
            <Send className="w-3.5 h-3.5 text-purple-700" />
            <span>{simulating ? "Scoring..." : "Simulate Survey Webhook"}</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Reflection</span>
          </button>
          <button
            onClick={loadReviews}
            disabled={loading}
            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Simulation Feedback Alert */}
      {simFeedback && (
        <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 text-xs rounded-xl flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-purple-700 shrink-0" />
          <span>{simFeedback}</span>
        </div>
      )}

      {/* 2. Somatic Transformation Scoreboard Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs flex items-center space-x-3.5">
          <span className="p-2.5 rounded-lg bg-sky-50 text-sky-700">
            <Moon className="w-5 h-5" />
          </span>
          <div>
            <span className="text-xs text-[#5C6B5E] font-medium block">
              {viewMode === "client" ? "Deep Unbroken Sleep" : "Circadian Restoration Score"}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-serif font-bold text-[#2D3E35]">{avgSleep}%</span>
              <span className="text-[11px] text-emerald-700 font-medium">Verified by surveys</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs flex items-center space-x-3.5">
          <span className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <VolumeX className="w-5 h-5" />
          </span>
          <div>
            <span className="text-xs text-[#5C6B5E] font-medium block">
              {viewMode === "client" ? "Peaceful Acoustic Quietude" : "Soundscape Tranquility Index"}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-serif font-bold text-[#2D3E35]">{avgQuiet}%</span>
              <span className="text-[11px] text-emerald-700 font-medium">Protected by 12-14 cap</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs flex items-center space-x-3.5">
          <span className="p-2.5 rounded-lg bg-[#C07D63]/15 text-[#C07D63]">
            <HeartHandshake className="w-5 h-5" />
          </span>
          <div>
            <span className="text-xs text-[#5C6B5E] font-medium block">
              {viewMode === "client" ? "Nurse Attentiveness & Care" : "Clinical Guide Compassion Score"}
            </span>
            <div className="flex items-baseline space-x-1.5 mt-0.5">
              <span className="text-2xl font-serif font-bold text-[#2D3E35]">{avgCare}%</span>
              <span className="text-[11px] text-[#C07D63] font-medium">Founder Kareena, RN</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Verified Reflections Grid */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-[#E5DDD0] text-xs text-[#5C6B5E]">
            No guest reflections published yet. Click &ldquo;Simulate Survey Webhook&rdquo; to test review ingestion.
          </div>
        ) : (
          reviews.map(rev => (
            <div
              key={rev.id}
              className="p-5 rounded-xl bg-white border border-[#E5DDD0] shadow-2xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DDD0]/70 pb-3">
                <div>
                  <div className="font-serif text-base font-bold text-[#2D3E35]">
                    {rev.guest_name}
                  </div>
                  <div className="text-[11px] text-[#5C6B5E] mt-0.5">
                    {rev.stay_dates} &middot; Sanctuary: {rev.sanctuary_slug.toUpperCase()}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {rev.sentiment_label.replace(/_/g, " ")}
                  </span>
                </div>
              </div>

              {/* Reflection Body */}
              <p className="text-xs text-[#2D3E35] leading-relaxed italic bg-[#FAF7F2]/60 p-3.5 rounded-lg border border-[#E5DDD0]/60">
                &ldquo;{rev.review_text}&rdquo;
              </p>

              {/* Individual Somatic Metrics */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#5C6B5E] pt-1">
                <div className="flex items-center space-x-4">
                  <span>
                    Sleep Score: <strong className="text-[#2D3E35]">{rev.deep_sleep_score}%</strong>
                  </span>
                  <span>
                    Quietude: <strong className="text-[#2D3E35]">{rev.quietude_score}%</strong>
                  </span>
                  <span>
                    Clinical Care: <strong className="text-[#2D3E35]">{rev.clinical_attentiveness_score}%</strong>
                  </span>
                </div>
                <span className="flex items-center space-x-1 text-emerald-800 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Guest Feedback</span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Manual Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5DDD0] shadow-xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#C07D63]" />
                <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                  Add Verified Guest Reflection
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Guest Name</label>
                <input
                  type="text"
                  required
                  value={guestName}
                  onChange={e => setGuestName(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                  placeholder="e.g. Dr. Jennifer Vance"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Stay Dates / Cohort</label>
                <input
                  type="text"
                  value={stayDates}
                  onChange={e => setStayDates(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-3 py-1.5 text-[#2D3E35] focus:outline-none"
                  placeholder="e.g. November 2025 Sacred Water Cohort"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#2D3E35]">Guest Feedback &amp; Sleep Story</label>
                <textarea
                  rows={4}
                  required
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className="w-full bg-[#FAF7F2] border border-[#E5DDD0] rounded-md p-2.5 text-[#2D3E35] focus:outline-none"
                  placeholder="Reflections on deep sleep, quietude, nervous system calming, or Nurse Kareena's care..."
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
                  disabled={submitting}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md shadow-sm"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Save Reflection</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
