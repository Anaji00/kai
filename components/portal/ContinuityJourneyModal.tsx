'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  Loader2,
  Clock,
  Music,
  Utensils,
  Wind,
  Crown,
  AlertCircle
} from 'lucide-react';
import { generateContinuityArc, ContinuityArcResponse, StagingIntake } from '@/lib/sidecar-api';

interface ContinuityJourneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  intake: StagingIntake | null;
  onSuccess?: () => void;
}

const MILESTONE_ICONS = {
  3: Wind,
  7: Utensils,
  14: Music,
  28: Crown
};

export default function ContinuityJourneyModal({
  isOpen,
  onClose,
  intake,
  onSuccess
}: ContinuityJourneyModalProps) {
  const [departureDate, setDepartureDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContinuityArcResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !intake) return null;

  const handleGenerateArc = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await generateContinuityArc(intake.id, departureDate);
      setResult(res);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate continuity arc');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-700/60 rounded-2xl shadow-2xl shadow-amber-950/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-amber-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif text-white tracking-wide flex items-center gap-2">
                30-Day Post-Sanctuary Continuity Arc
                <span className="text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  Zero Autonomous Writes
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Curate long-term integration milestones for {intake.client_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Guest Summary Card */}
          <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-neutral-500 block">
                Guest Dossier
              </span>
              <h3 className="text-sm font-semibold text-white">{intake.client_name}</h3>
              <p className="text-xs text-amber-300 capitalize">
                KAI {(intake.sanctuary_slug || 'nosara').replace('-', ' ')} Sanctuary • {intake.room_tier}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {!result && (
                <button
                  onClick={handleGenerateArc}
                  disabled={loading}
                  className="self-end flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Arc</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Staged Milestones Arc */}
          {result ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>4 Integration Milestones Staged into Action Drafts Queue</span>
                </div>
                <span className="text-[11px] text-neutral-500 font-mono">
                  All drafts pending founder review
                </span>
              </div>

              <div className="space-y-3">
                {result.milestones.map((milestone) => {
                  const Icon =
                    MILESTONE_ICONS[milestone.day as keyof typeof MILESTONE_ICONS] || Clock;
                  return (
                    <div
                      key={milestone.day}
                      className="p-4 bg-neutral-950 border border-neutral-800 hover:border-amber-500/30 rounded-xl transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-medium text-white">{milestone.title}</h4>
                            <span className="text-[10px] text-neutral-400 font-sans">
                              {milestone.theme}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-amber-300 border border-neutral-700 block">
                            📅 {milestone.scheduled_date}
                          </span>
                          <span className="text-[9px] text-neutral-500 font-mono">
                            Draft #{milestone.draft_id}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-neutral-300 pl-11 font-mono leading-relaxed">
                        {milestone.content_preview}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-neutral-800 rounded-xl text-center space-y-2">
              <Clock className="w-8 h-8 text-neutral-600 mx-auto" />
              <h4 className="text-sm font-medium text-neutral-300">
                Ready to Generate 30-Day Integration Arc
              </h4>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                Generates a tailored 4-phase sequence (Day 3 Grounding, Day 7 Blue Zone Pantry, Day 14 432Hz Sound Immersion, Day 28 Priority Circle) staged into the Action Drafts queue.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/80">
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
          {result && (
            <a
              href="/portal/drafts"
              className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 font-medium transition-colors"
            >
              <span>View in Action Drafts Queue</span>
              <Send className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
