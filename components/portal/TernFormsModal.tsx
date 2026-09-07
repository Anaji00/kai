"use client";

import React, { useState } from "react";
import {
  X,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Code2,
  Send,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface TernFormsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TernFormsModal({ isOpen, onClose }: TernFormsModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedEmbedIndex, setCopiedEmbedIndex] = useState<number | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);

  if (!isOpen) return null;

  const forms = [
    {
      title: "Trip Request & Cohort Reservation Form",
      description: "Direct guest inquiry form that collects retreat dates, room tier, and initial health notes.",
      url: "https://app.tern.travel/public/forms/kai-nosara-intake/responses/new",
      type: "Trip Request",
      tag: "Inbound Pipeline",
    },
    {
      title: "Guest Passport & Grand Travel Flight Desk Form",
      description: "Collects passport expiration dates, issuing country, and frequent flyer airline numbers.",
      url: "https://app.tern.travel/public/forms/kai-guest-passport/responses/new",
      type: "Contact Details",
      tag: "Flight Desk Sync",
    },
    {
      title: "Clinical Somatic Intake & Liability Waiver Form",
      description: "Collects somatic health disclosures, acoustic sensitivity parameters, and e-signatures.",
      url: "https://app.tern.travel/public/forms/kai-clinical-intake/responses/new",
      type: "Custom Waiver",
      tag: "Zero Writes Staging",
    },
  ];

  const handleCopyUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopyEmbed = (url: string, title: string, index: number) => {
    const embedCode = `<iframe src="${url}" title="${title}" width="100%" height="750" style="border: none; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);" allow="camera; microphone; payment"></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbedIndex(index);
    setTimeout(() => setCopiedEmbedIndex(null), 2000);
  };

  const handleSimulateInbound = async () => {
    setSimulating(true);
    try {
      // Dispatch simulation event or trigger seed
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: "Dr. Genevieve Sterling",
          email: "g.sterling@biotech-innovate.com",
          phone: "+1 415-555-0812",
          retreatId: "nosara",
          roomPreference: "private-suite",
          movementExperience: "Restorative Yoga & Breathwork",
          healthNotes: "Severe sympathetic hyperarousal, insomnia, high cortisol after funding round.",
          intentions: "Deep nervous system de-escalation and circadian rhythm reset.",
          passportValid: "yes",
        }),
      });

      if (res.ok) {
        setSimulatedSuccess(true);
        window.dispatchEvent(new Event("intakes-updated"));
        setTimeout(() => setSimulatedSuccess(false), 3500);
      }
    } catch (e) {
      console.error("Simulation error:", e);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#2D3E35] leading-tight">
                Tern Public Forms Hub (/responses/new)
              </h3>
              <p className="text-xs text-[#5C6B5E]">
                Native Tern public forms engine for direct guest inquiries, waivers, and embeds
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] rounded-md hover:bg-[#F2ECE4]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Zero Autonomous Writes Governance Callout */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
            <div className="leading-relaxed">
              <span className="font-semibold">Zero Autonomous Writes Protected:</span> All public submissions
              from these forms land in the KAI Staging Queue for clinical review and 1-click authorization by Kareena Islam, RN.
            </div>
          </div>

          {/* Forms List */}
          <div className="space-y-3">
            {forms.map((f, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-white border border-[#E5DDD0] shadow-sm space-y-2 hover:border-[#C07D63]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-[#2D3E35]">{f.title}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F2ECE4] text-[#5C6B5E] border border-[#E5DDD0]">
                    {f.tag}
                  </span>
                </div>

                <p className="text-xs text-[#5C6B5E] leading-relaxed">{f.description}</p>

                <div className="font-mono text-[10px] text-[#5C6B5E] truncate bg-[#FAF7F2] p-2 rounded border border-[#E5DDD0]/70">
                  {f.url}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#E5DDD0]/60">
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-[#2D3E35] text-[#FAF7F2] font-semibold hover:bg-[#1F2C25] transition-colors text-xs"
                  >
                    <span>Open Form</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <button
                    onClick={() => handleCopyUrl(f.url, idx)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] transition-colors text-xs"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Public Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleCopyEmbed(f.url, f.title, idx)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-[#E5DDD0] bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] transition-colors text-xs"
                  >
                    {copiedEmbedIndex === idx ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Embed Copied!</span>
                      </>
                    ) : (
                      <>
                        <Code2 className="w-3 h-3" />
                        <span>Copy iframe Embed</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Simulate Inbound Submission Tool */}
          <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-[#2D3E35]">
                Operator Inbound Testing Simulator
              </span>
              <span className="text-[10px] text-[#5C6B5E]">Simulates external form submission</span>
            </div>
            <p className="text-xs text-[#5C6B5E] leading-relaxed">
              Test the end-to-end flow: submits a mock high-burnout intake (Dr. Genevieve Sterling) which generates an AI Pre-Call Thesis and stages an operational notification card for WhatsApp.
            </p>
            <button
              onClick={handleSimulateInbound}
              disabled={simulating}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-[#C07D63] hover:bg-[#A86952] text-white font-semibold transition-colors shadow-sm"
            >
              <Send className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
              <span>{simulatedSuccess ? "Simulated Intake Landed in Queue!" : "Simulate Inbound Form Submission"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
