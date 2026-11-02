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
  Send,
  Database,
} from 'lucide-react';
import { submitVoiceConsultationMemo, transcribeVoiceMemo, VoiceMemoResponse } from '@/lib/sidecar-api';

interface VoiceConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_MEMOS = [
  {
    title: 'Elena Vance (Puerto Vallarta • Marival Harmony Jan 28–31)',
    text: "Hey copilot, just finished a consultation call with Elena Vance for our First Retreat of 2027 at Marival Harmony in Puerto Vallarta, January 28th through 31st. She's flying out of IAH Houston, wants the Marival Harmony Oceanfront Suite. Her main intention is deep executive burnout recovery, 432Hz sound baths, and Armaan's Ironman endurance recovery workshop. She eats gluten-free and plant-forward coastal food."
  },
  {
    title: 'Victoria Sterling (Nosara Restorative Villa)',
    text: "Hey copilot, just finished a 30-minute consultation call with Victoria Sterling. She's flying out of ORD Chicago, looking for our Nosara sanctuary in a Private Villa Sanctuary. Her main intention is deep executive burnout recovery and circadian sleep renewal. She eats plant-based, loves silent sunrise meditation, and requested business class coordination."
  },
  {
    title: 'Marcus Vance (Elevated Safety Review)',
    text: "Quick voice note for Marcus Vance. Spoke with him about Puerto Vallarta at Marival Harmony. He mentioned he has a history of epilepsy and uses a pacemaker, so we need our medical director to review acoustic sound frequencies and hot cold contrast therapies before confirming."
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
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  const handleSimulateDictation = (text: string) => {
    setTranscript(text);
    setResult(null);
    setError(null);
  };

  // Supports live browser Web Speech API dictation + MediaRecorder Whisper audio transcription
  const startRecording = async () => {
    setError(null);

    // 1. Try starting live Web Speech API recognition in parallel for instant browser voice-to-text
    try {
      const w = window as unknown as {
        SpeechRecognition?: new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void;
          start: () => void;
          stop: () => void;
        };
        webkitSpeechRecognition?: new () => {
          continuous: boolean;
          interimResults: boolean;
          lang: string;
          onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal?: boolean }> }) => void;
          start: () => void;
          stop: () => void;
        };
      };
      const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SpeechRec) {
        const rec = new SpeechRec();
        rec.continuous = true;
        rec.interimResults = false;
        rec.lang = 'en-US';
        rec.onresult = (event) => {
          const pieces: string[] = [];
          for (let i = 0; i < event.results.length; i++) {
            const item = event.results[i];
            if (item && item[0] && item[0].transcript) {
              pieces.push(item[0].transcript);
            }
          }
          if (pieces.length > 0) {
            setTranscript(pieces.join(' ').trim());
          }
        };
        rec.start();
        speechRecRef.current = rec;
      }
    } catch {
      // Browser speech recognition optional
    }

    // 2. Also capture microphone audio for backend Whisper / fallback transcription
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError('Microphone access is blocked. You can type or click a sample memo above, or allow microphone permissions.');
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
        setTranscript((prev) => (prev.trim() ? prev.trim() : text));
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
    try {
      speechRecRef.current?.stop();
      speechRecRef.current = null;
    } catch {
      // ignore
    }
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
                Kareena &amp; Armaan Voice-to-Text Record Automator
                <span className="text-[10px] uppercase font-sans tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Auto-Populates Software Records
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Dictate post-call notes to automatically populate Guest Intake, Clinical/Dietary Flags, Flight Desk &amp; Welcome Email Drafts
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
              Quick Load Sample Dictation (1-Click Test):
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
                Live Voice-to-Text Transcription / Founder Notes:
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={transcribing}
                className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-full transition-all border ${
                  isRecording
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30 animate-pulse'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:text-white'
                }`}
              >
                {transcribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Transcribing Audio…</span>
                  </>
                ) : isRecording ? (
                  <>
                    <MicOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>Listening Live · Tap to Stop</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5 text-amber-400" />
                    <span>Start Voice-to-Text Capture</span>
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
                  Streaming voice-to-text into Kareena’s software records...
                </span>
              </div>
            )}

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. Spoke with Elena Vance for 25 minutes about Puerto Vallarta at Marival Harmony (Jan 28–31). She wants the Oceanfront Suite, loves sunrise yoga, eats gluten-free, flying from IAH..."
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
            <div className="p-4 bg-neutral-950 border border-emerald-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Software Records Populated &amp; Staged Successfully</span>
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
                    {result.extracted_data.sanctuary_slug.replace(/-/g, ' ')}
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

              {/* Automated Software Records Populated */}
              <div className="p-3 bg-neutral-900/70 rounded-lg border border-neutral-800 space-y-2">
                <span className="text-[11px] font-medium text-emerald-300 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" />
                  Automated Software Records Updated from Voice Note:
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-neutral-300">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>StagingIntake Record #{result.intake_id.slice(0, 8)}</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Clinical &amp; Dietary Kitchen Profile</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Welcome Email Draft #{result.action_draft_id}</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Grand Travel Flight &amp; Transfer Task</span>
                  </li>
                </ul>
              </div>

              {/* Email Draft Preview */}
              <div className="p-3 bg-neutral-900/50 rounded-lg border border-neutral-800/80">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1.5">
                  <span className="flex items-center gap-1 text-amber-300 font-medium">
                    <Send className="w-3 h-3" />
                    Staged Action Draft #{result.action_draft_id} (Welcome Email)
                  </span>
                  <span className="text-neutral-500 font-mono">Routed for Kareena &amp; Armaan</span>
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
                <span>Populating Software Records...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Populate Software Records from Voice Note</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
