'use client';

import React, { useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  X,
  FileText,
  Volume2,
  Loader2,
  Send
} from 'lucide-react';
import { submitVoiceConsultationMemo, transcribeVoiceMemo, VoiceMemoResponse } from '@/lib/sidecar-api';

interface VoiceConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_MEMOS = [
  {
    title: 'Victoria Sterling (Nosara Restorative Villa)',
    text: "Hey copilot, just finished a 30-minute consultation call with Victoria Sterling. She's flying out of ORD Chicago, looking for our Nosara sanctuary in a Private Villa Sanctuary. Her main intention is deep executive burnout recovery and circadian sleep renewal. She eats plant-based, loves silent sunrise meditation, and requested business class coordination."
  },
  {
    title: 'Marcus Vance (Elevated Safety Review)',
    text: "Quick voice note for Marcus Vance. Spoke with him about Nosara. He mentioned he has a history of epilepsy and uses a pacemaker, so we need our medical director to review acoustic sound frequencies and hot cold contrast therapies before confirming."
  },
  {
    title: 'Julianne Moore (Amalfi Coast Stillness)',
    text: "Consultation call with Julianne Moore. Flying from JFK to Amalfi Coast sanctuary. She wants the Cliffside Stillness Suite. Focusing on nervous system decompression and gluten-free nutrition with silent sunset reflection."
  }
];

export default function VoiceConsultationModal({
  isOpen,
  onClose,
  onSuccess
}: VoiceConsultationModalProps) {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VoiceMemoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const handleSimulateDictation = (text: string) => {
    setTranscript(text);
    setResult(null);
    setError(null);
  };

  // Records from the microphone, then transcribes with Groq Whisper and appends to the notes for review.
  const startRecording = async () => {
    setError(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access is blocked. Allow the microphone for this site, then try again.');
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const audio = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      setTranscribing(true);
      try {
        const text = await transcribeVoiceMemo(audio);
        setTranscript((prev) => (prev.trim() ? `${prev.trim()}

${text}` : text));
        setResult(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Transcription failed');
      } finally {
        setTranscribing(false);
      }
    };
    recorder.start();
    recorderRef.current = recorder;
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setIsRecording(false);
  };

  const toggleRecording = () => (isRecording ? stopRecording() : startRecording());

  const handleTranscribeAndStage = async () => {
    if (!transcript.trim()) {
      setError('Please provide or dictate a consultation transcript.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await submitVoiceConsultationMemo(transcript);
      setResult(res);
      setIsRecording(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to parse voice memo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-neutral-900 border border-neutral-700/60 rounded-2xl shadow-2xl shadow-emerald-950/20 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-serif text-white tracking-wide flex items-center gap-2">
                Founder Voice Note-to-Dossier
                <span className="text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Zero Autonomous Writes
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Dictate natural language post-call reflections to stage guest profile & welcome email
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
        <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Sample Prompts */}
          <div>
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 font-medium block mb-2">
              Quick Load Sample Dictation:
            </span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_MEMOS.map((sample, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSimulateDictation(sample.text)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-neutral-800/70 hover:bg-neutral-800 border border-neutral-700/50 hover:border-amber-500/40 text-neutral-300 hover:text-amber-200 transition-all text-left"
                >
                  ⚡ {sample.title}
                </button>
              ))}
            </div>
          </div>

          {/* Dictation Waveform & Text Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-neutral-400" />
                Audio Transcription / Founder Notes:
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={transcribing}
                className={`flex items-center gap-2 text-xs px-3 py-1 rounded-full transition-all border ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200'
                }`}
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Transcribing…</span>
                  </>
                ) : isRecording ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Recording · tap to stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>Start Voice Capture</span>
                  </>
                )}
              </button>
            </div>

            {isRecording && (
              <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-xl flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                <div className="flex-1 flex items-center gap-1 h-5">
                  <div className="w-1 bg-emerald-400 h-3 animate-pulse"></div>
                  <div className="w-1 bg-emerald-400 h-5 animate-pulse delay-75"></div>
                  <div className="w-1 bg-emerald-400 h-2 animate-pulse delay-100"></div>
                  <div className="w-1 bg-emerald-400 h-4 animate-pulse delay-150"></div>
                  <div className="w-1 bg-emerald-400 h-5 animate-pulse delay-200"></div>
                  <div className="w-1 bg-emerald-400 h-3 animate-pulse delay-75"></div>
                  <div className="w-1 bg-emerald-400 h-4 animate-pulse"></div>
                </div>
                <span className="text-[11px] text-emerald-300 font-mono">
                  Audio streaming to AI transcriber...
                </span>
              </div>
            )}

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. Spoke with Cassandra Vance for 25 minutes about Nosara. She wants the Private Villa Sanctuary, loves quiet sunrise yoga, eats plant-forward, flying from ORD..."
              rows={4}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Staged Result Display */}
          {result && (
            <div className="p-4 bg-neutral-950 border border-emerald-500/30 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Staged Successfully in Review Queue</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-mono">
                  Status: PENDING_APPROVAL
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-neutral-900/70 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Guest Name</span>
                  <span className="font-medium text-white truncate block">
                    {result.extracted_data.client_name}
                  </span>
                </div>
                <div className="p-2.5 bg-neutral-900/70 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Sanctuary</span>
                  <span className="font-medium text-amber-300 capitalize truncate block">
                    {result.extracted_data.sanctuary_slug.replace('-', ' ')}
                  </span>
                </div>
                <div className="p-2.5 bg-neutral-900/70 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Room Tier</span>
                  <span className="font-medium text-neutral-200 truncate block">
                    {result.extracted_data.room_tier}
                  </span>
                </div>
                <div className="p-2.5 bg-neutral-900/70 rounded-lg border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block">Safety Mode</span>
                  {result.extracted_data.clinical_screening_enabled ? (
                    <span className="inline-flex items-center gap-1 font-medium text-rose-400">
                      <ShieldAlert className="w-3 h-3" />
                      Elevated Review
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-400">
                      <ShieldCheck className="w-3 h-3" />
                      Standard Wellness
                    </span>
                  )}
                </div>
              </div>

              {/* Email Draft Preview */}
              <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/80">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1 text-amber-300 font-medium">
                    <Send className="w-3 h-3" />
                    Staged Action Draft #{result.action_draft_id} (Welcome Email)
                  </span>
                  <span className="text-neutral-500 font-mono">Awaiting 1-Click Approval</span>
                </div>
                <p className="text-xs text-neutral-300 line-clamp-3 font-mono leading-relaxed whitespace-pre-wrap">
                  {result.extracted_data.welcome_email_draft}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-900/80">
          <button
            onClick={onClose}
            className="text-xs text-neutral-400 hover:text-white px-3 py-2 rounded-lg transition-colors"
          >
            {result ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleTranscribeAndStage}
            disabled={loading || !transcript.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-neutral-950 font-medium text-xs tracking-wide transition-all shadow-md shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing & Staging Dossier...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Transcribe & Stage Intake</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
