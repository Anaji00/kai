"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Sparkles, Wind, Play, Pause, RefreshCw } from "lucide-react";

interface SoundAndBreathModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "breath" | "sound";
}

export default function SoundAndBreathModal({
  isOpen,
  onClose,
  defaultTab = "breath",
}: SoundAndBreathModalProps) {
  const [activeTab, setActiveTab] = useState<"breath" | "sound">(defaultTab);
  const [prevDefaultTab, setPrevDefaultTab] = useState(defaultTab);
  if (defaultTab !== prevDefaultTab) {
    setPrevDefaultTab(defaultTab);
    setActiveTab(defaultTab);
  }

  // Breathwork state (4-7-8 breathing)
  const [breathPhase, setBreathPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [breathSecondsLeft, setBreathSecondsLeft] = useState<number>(4);
  const [isBreathingActive, setIsBreathingActive] = useState<boolean>(true);
  const [completedCycles, setCompletedCycles] = useState<number>(0);

  // Sound bath state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [selectedFrequency, setSelectedFrequency] = useState<432 | 528>(432);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);

  const stopAudio = useCallback(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const ctx = audioContextRef.current;
      gainNodeRef.current.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      setTimeout(() => {
        oscillatorsRef.current.forEach((osc) => {
          try {
            osc.stop();
            osc.disconnect();
          } catch {
            // ignore
          }
        });
        oscillatorsRef.current = [];
        if (audioContextRef.current && audioContextRef.current.state !== "closed") {
          audioContextRef.current.close();
        }
        setIsPlayingAudio(false);
      }, 1300);
    } else {
      setIsPlayingAudio(false);
    }
  }, []);

  // Breathwork loop
  useEffect(() => {
    if (!isOpen || !isBreathingActive) return;

    const timer = setInterval(() => {
      setBreathSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        if (breathPhase === "inhale") {
          setBreathPhase("hold");
          return 7;
        } else if (breathPhase === "hold") {
          setBreathPhase("exhale");
          return 8;
        } else {
          setBreathPhase("inhale");
          setCompletedCycles((c) => c + 1);
          return 4;
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, isBreathingActive, breathPhase]);

  // Cleanup audio when modal closes
  useEffect(() => {
    if (!isOpen && isPlayingAudio) {
      stopAudio();
    }
  }, [isOpen, isPlayingAudio, stopAudio]);

  const startAudio = (freq: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 2.5);
      masterGain.connect(ctx.destination);
      gainNodeRef.current = masterGain;

      // Base crystal bowl tone
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(freq, ctx.currentTime);

      // Warm harmonic overtone (second harmonic with subtle warmth)
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 1.5, ctx.currentTime);

      // Binaural detuned wave (+1.5Hz for parasympathetic alpha-wave entrainment)
      const osc3 = ctx.createOscillator();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(freq + 1.5, ctx.currentTime);

      const subGain2 = ctx.createGain();
      subGain2.gain.value = 0.35;
      osc2.connect(subGain2);
      subGain2.connect(masterGain);

      const subGain3 = ctx.createGain();
      subGain3.gain.value = 0.45;
      osc3.connect(subGain3);
      subGain3.connect(masterGain);

      osc1.connect(masterGain);

      osc1.start();
      osc2.start();
      osc3.start();

      oscillatorsRef.current = [osc1, osc2, osc3];
      setIsPlayingAudio(true);
    } catch (err) {
      console.error("Audio Context initialization failed:", err);
    }
  };

  const toggleAudio = () => {
    if (isPlayingAudio) {
      stopAudio();
    } else {
      startAudio(selectedFrequency);
    }
  };

  const changeFrequency = (freq: 432 | 528) => {
    setSelectedFrequency(freq);
    if (isPlayingAudio) {
      stopAudio();
      setTimeout(() => startAudio(freq), 1400);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-sage/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-sand-border bg-linen p-6 md:p-8 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sand-border/70 pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-olive font-medium">
                  Somatic Self-Care Ritual
                </span>
                <h3 className="font-serif text-2xl text-sage font-light">
                  Nervous System Decompression
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-sage/70 hover:bg-sand hover:text-sage transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-6 flex rounded-full bg-sand/70 p-1 border border-sand-border">
              <button
                onClick={() => setActiveTab("breath")}
                className={`flex-1 rounded-full py-2 text-xs font-medium uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === "breath"
                    ? "bg-sage text-linen shadow-sm"
                    : "text-sage/70 hover:text-sage"
                }`}
              >
                <Wind className="h-3.5 w-3.5" />
                4-7-8 Breathwork
              </button>
              <button
                onClick={() => setActiveTab("sound")}
                className={`flex-1 rounded-full py-2 text-xs font-medium uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === "sound"
                    ? "bg-sage text-linen shadow-sm"
                    : "text-sage/70 hover:text-sage"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Crystal Bowl Resonance
              </button>
            </div>

            {/* Tab 1: Breathwork */}
            {activeTab === "breath" && (
              <div className="mt-8 flex flex-col items-center text-center">
                <div className="relative flex h-52 w-52 items-center justify-center">
                  {/* Outer Pulsing Ring */}
                  <motion.div
                    animate={{
                      scale:
                        breathPhase === "inhale"
                          ? [1, 1.4]
                          : breathPhase === "hold"
                          ? 1.4
                          : [1.4, 1],
                      opacity: breathPhase === "hold" ? 0.85 : 0.6,
                    }}
                    transition={{
                      duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 7 : 8,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 rounded-full bg-olive-soft/80 border border-olive/30"
                  />

                  {/* Inner Breathing Core */}
                  <motion.div
                    animate={{
                      scale:
                        breathPhase === "inhale"
                          ? [0.75, 1.1]
                          : breathPhase === "hold"
                          ? 1.1
                          : [1.1, 0.75],
                    }}
                    transition={{
                      duration: breathPhase === "inhale" ? 4 : breathPhase === "hold" ? 7 : 8,
                      ease: "easeInOut",
                    }}
                    className="relative flex h-36 w-36 flex-col items-center justify-center rounded-full bg-sage text-linen shadow-inner"
                  >
                    <span className="text-xs uppercase tracking-widest text-sand-border font-light">
                      {breathPhase === "inhale"
                        ? "Inhale Gently"
                        : breathPhase === "hold"
                        ? "Retain Peace"
                        : "Exhale Slowly"}
                    </span>
                    <span className="font-serif text-4xl font-light">
                      {breathSecondsLeft}s
                    </span>
                  </motion.div>
                </div>

                <div className="mt-6 max-w-xs space-y-1">
                  <p className="text-xs text-sage-muted">
                    Clinical grounding: The 4-7-8 cadence stimulates the vagus nerve, immediately signaling the amygdala to down-regulate sympathetic cortisol response.
                  </p>
                  <p className="text-xs text-olive font-medium">
                    Cycles completed: {completedCycles}
                  </p>
                </div>

                <div className="mt-5 flex gap-3">
                  <button
                    onClick={() => setIsBreathingActive(!isBreathingActive)}
                    className="flex items-center gap-2 rounded-full border border-sand-border bg-sand px-4 py-2 text-xs font-medium uppercase tracking-wider text-sage hover:bg-sand-muted transition-colors"
                  >
                    {isBreathingActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    {isBreathingActive ? "Pause Pacing" : "Resume"}
                  </button>
                  <button
                    onClick={() => {
                      setBreathPhase("inhale");
                      setBreathSecondsLeft(4);
                      setCompletedCycles(0);
                    }}
                    className="flex items-center gap-2 rounded-full border border-sand-border bg-sand px-4 py-2 text-xs font-medium uppercase tracking-wider text-sage hover:bg-sand-muted transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Sound Bath */}
            {activeTab === "sound" && (
              <div className="mt-8 flex flex-col items-center text-center">
                <div className="relative flex h-48 w-48 items-center justify-center">
                  <motion.div
                    animate={
                      isPlayingAudio
                        ? {
                            scale: [1, 1.25, 1],
                            rotate: [0, 180, 360],
                            opacity: [0.3, 0.65, 0.3],
                          }
                        : { scale: 1, opacity: 0.2 }
                    }
                    transition={{
                      duration: 8,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 rounded-full border border-terracotta/40 bg-terracotta-soft/50"
                  />

                  <button
                    onClick={toggleAudio}
                    className="group relative flex h-32 w-32 flex-col items-center justify-center rounded-full bg-sage text-linen shadow-lg hover:scale-105 transition-all"
                  >
                    {isPlayingAudio ? (
                      <>
                        <Volume2 className="h-8 w-8 text-sand animate-pulse" />
                        <span className="mt-1 text-[11px] uppercase tracking-widest text-sand-border">
                          Restoring
                        </span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="h-8 w-8 text-sand/80 group-hover:text-sand" />
                        <span className="mt-1 text-[11px] uppercase tracking-widest text-sand-border">
                          Play Tone
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => changeFrequency(432)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      selectedFrequency === 432
                        ? "bg-sage text-linen"
                        : "bg-sand text-sage hover:bg-sand-muted"
                    }`}
                  >
                    432 Hz • Cellular Harmony
                  </button>
                  <button
                    onClick={() => changeFrequency(528)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
                      selectedFrequency === 528
                        ? "bg-sage text-linen"
                        : "bg-sand text-sage hover:bg-sand-muted"
                    }`}
                  >
                    528 Hz • Miraculous Repair
                  </button>
                </div>

                <p className="mt-4 max-w-xs text-xs text-sage-muted">
                  Curated in homage to Kareena Islam’s crystal singing bowl sound healing sessions. Acoustic waves promote theta brainwave synchronization for profound restorative calm.
                </p>
              </div>
            )}

            {/* Footer Notice */}
            <div className="mt-8 border-t border-sand-border/70 pt-4 text-center">
              <p className="text-[11px] tracking-wide text-olive font-light">
                KAI Clinical Somatics • Founded by Kareena Islam
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
