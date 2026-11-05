"use client";

import React, { useState } from "react";
import {
  HeartPulse,
  ThermometerSnowflake,
  Ambulance,
  MessageSquareWarning,
  ShieldCheck,
  AlertTriangle,
  Activity,
  Stethoscope,
  Sparkles,
} from "lucide-react";
import { triggerExplainThis } from "@/lib/portal-form-bus";
import {
  CRMClientItem,
  CRMTripItem,
  triageCrmClientClinicalProfile,
  triageSomaticPulseTelemetry,
  triageThermalShockEscalation,
  freezeCrmTripMedicalEmergency,
  ingestReviewWithSentimentTriage,
} from "@/lib/sidecar-api";

interface ClinicalSafetyTelemetryTabProps {
  clients: CRMClientItem[];
  trips: CRMTripItem[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

export default function ClinicalSafetyTelemetryTab({
  clients,
  trips,
  onRefresh,
  onNotify,
}: ClinicalSafetyTelemetryTabProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || "");
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || "");
  const [busy, setBusy] = useState<string | null>(null);

  // 1. Pre-Arrival Contraindication Triage Result
  const [clinicalTriageRes, setClinicalTriageRes] = useState<{
    client_name: string;
    safety_status: string;
    clinical_flags: string[];
    contraindications: string[];
  } | null>(null);

  // 2. Somatic Pulse Telemetry inputs
  const [sleepScore, setSleepScore] = useState<number>(2);
  const [easeScore, setEaseScore] = useState<number>(2);
  const [pulseSymptoms, setPulseSymptoms] = useState<string>(
    "Severe orthostatic dizziness, resting palpitations, and acute insomnia on Night 2"
  );
  const [pulseRes, setPulseRes] = useState<{
    alert_level: string;
    triage_status: string;
    contraindication_protocol: string;
    draft_id: number | null;
  } | null>(null);

  // 3. Thermal Shock / Hypoxia Escalation inputs
  const [spo2, setSpo2] = useState<number>(88);
  const [coreTemp, setCoreTemp] = useState<number>(35.2);
  const [restingHr, setRestingHr] = useState<number>(118);
  const [shiveringMins, setShiveringMins] = useState<number>(25);
  const [thermalRes, setThermalRes] = useState<{
    alert_level: string;
    protocol_lockout: string;
    draft_id: number;
  } | null>(null);

  // 4. Emergency Medical Freeze inputs
  const [clinicalEvent, setClinicalEvent] = useState<string>(
    "Sustained supraventricular tachycardia (SVT > 165 bpm) requiring IV adenosine & telemetry observation"
  );
  const [localFacility, setLocalFacility] = useState<string>(
    "Hospital Joya Marina Vallarta (Level-3 Cardiac Trauma Unit)"
  );

  // 5. Post-Retreat Sentiment & Founder Red-Alert inputs
  const [reviewRating, setReviewRating] = useState<number>(2);
  const [reviewText, setReviewText] = useState<string>(
    "Adjacent villa construction noise disrupted morning nidra and the somatic pacing felt rushed on Day 3."
  );
  const [reviewRes, setReviewRes] = useState<{
    sentiment_label: string;
    triage_priority: string;
    recovery_voucher: string | null;
    draft_id: number;
  } | null>(null);

  const activeClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0];

  const notifyDraftUpdate = (msg: string) => {
    onNotify(msg);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("drafts-updated"));
    }
  };

  // Handler 1: Pre-Arrival Clinical Contraindication Triage
  const handlePreArrivalTriage = async () => {
    if (!activeClient) {
      onNotify("Notice: Select a client profile first.");
      return;
    }
    setBusy("prearrival");
    try {
      const res = await triageCrmClientClinicalProfile(activeClient.id);
      setClinicalTriageRes(res);
      onNotify(
        `Clinical Profile Triaged for ${res.client_name}: Status [${res.safety_status}] (${res.clinical_flags.length} clinical flags mapped).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed clinical triage"}`);
    } finally {
      setBusy(null);
    }
  };

  // Handler 2: Somatic Pulse Telemetry Triage
  const handleSomaticPulseTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("pulse");
    try {
      const res = await triageSomaticPulseTelemetry({
        client_name: activeClient?.full_name || "Sienna Thorne",
        client_email: activeClient?.email || "sienna.thorne@example.com",
        sanctuary_slug: activeTrip?.sanctuary_slug || "puerto-vallarta-2027",
        day_number: 2,
        phase: "IN_STAY_MORNING_PULSE",
        restorative_sleep_score: sleepScore,
        nervous_system_ease: easeScore,
        vagal_tone_descriptor: "SYMPATHETIC_OVERDRIVE",
        reported_symptoms: pulseSymptoms,
        operator_name: "Kareena Islam, BSN, RN",
      });
      setPulseRes(res);
      notifyDraftUpdate(
        `Somatic Pulse Triaged [${res.alert_level}]: ${res.contraindication_protocol} (Draft #${res.draft_id ?? "N/A"}).`
      );
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed somatic pulse triage"}`);
    } finally {
      setBusy(null);
    }
  };

  // Handler 3: Thermal Shock & Hypoxia Escalation
  const handleThermalShock = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("thermal");
    try {
      const res = await triageThermalShockEscalation({
        client_name: activeClient?.full_name || "Marcus Sterling",
        client_email: activeClient?.email || "marcus.sterling@example.com",
        sanctuary_slug: activeTrip?.sanctuary_slug || "puerto-vallarta-2027",
        day_number: 3,
        spo2_percent: spo2,
        resting_hr_bpm: restingHr,
        core_temp_c: coreTemp,
        shivering_duration_minutes: shiveringMins,
        reported_symptoms: "Post-38°F ice plunge peripheral cyanosis, shivering >25m, mild dyspnea",
        operator_name: "Kareena Islam, BSN, RN",
      });
      setThermalRes(res);
      notifyDraftUpdate(
        `Thermal Shock Lockout Enforced [${res.alert_level}]: ${res.protocol_lockout} (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed thermal shock triage"}`);
    } finally {
      setBusy(null);
    }
  };

  // Handler 4: Emergency Medical Freeze & Hospital Handover
  const handleMedicalFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) {
      onNotify("Notice: Select an active trip first.");
      return;
    }
    setBusy("freeze");
    try {
      const res = await freezeCrmTripMedicalEmergency(
        activeTrip.id,
        clinicalEvent,
        "Kareena Islam, BSN, RN",
        localFacility
      );
      notifyDraftUpdate(
        `Emergency Medical Freeze Executed for ${res.guest_name}: Status [${res.status}], routed to ${res.local_facility} (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed emergency freeze"}`);
    } finally {
      setBusy(null);
    }
  };

  // Handler 5: Post-Retreat Sentiment & Founder Red-Alert Recovery
  const handleReviewTriage = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("review");
    try {
      const res = await ingestReviewWithSentimentTriage({
        sanctuary_slug: activeTrip?.sanctuary_slug || "puerto-vallarta-2027",
        guest_name: activeClient?.full_name || "Victoria Sterling",
        guest_email: activeClient?.email || "victoria.sterling@example.com",
        stay_dates: activeTrip?.dates || "Oct 10–15, 2027",
        overall_rating: reviewRating,
        deep_sleep_score: 2,
        quietude_score: 2,
        clinical_attentiveness_score: 4,
        review_text: reviewText,
        source: "POST_RETREAT_SOMATIC_SURVEY",
      });
      setReviewRes(res);
      notifyDraftUpdate(
        `Review Sentiment Triaged [${res.triage_priority}]: Voucher ${res.recovery_voucher || "None"} issued & 1:1 Founder Recovery Call staged (Draft #${res.draft_id}).`
      );
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed review sentiment triage"}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Patient / Guest Selector Strip */}
      <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] shadow-xs grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-mono uppercase font-bold text-[#C07D63] mb-1">
            Target Guest Profile (BSN, RN Clinical Dossier)
          </label>
          <select
            value={activeClient?.id || ""}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-mono uppercase font-bold text-[#2D3E35] mb-1">
            Retreat Stay (Emergency &amp; Medical Contact Link)
          </label>
          <select
            value={activeTrip?.id || ""}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.client_name} — {t.title} ({t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 1: Pre-Arrival Health & Medical Check + Daily Wellness Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Pre-Arrival Health Scanner */}
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-4 h-4 text-[#2D3E35]" />
                <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                  Pre-Arrival Health &amp; Medical Safety Check
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded">
                Nurse Health Review
              </span>
            </div>

            <p className="text-xs text-[#5C6B5E]">
              Scans guest health notes and medical intake history for allergies, medications, cardiovascular conditions, pregnancy, or joint limitations to recommend safe retreat activities.
            </p>

            {clinicalTriageRes && (
              <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-2">
                <div className="flex items-center justify-between font-bold text-[#2D3E35]">
                  <span>{clinicalTriageRes.client_name}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-mono text-[10px]">
                    {clinicalTriageRes.safety_status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {clinicalTriageRes.clinical_flags.map((f, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-900 font-mono text-[10px]"
                    >
                      <span>{f}</span>
                      <button
                        type="button"
                        onClick={() => triggerExplainThis(`Explain clinical contraindication flag: ${f} for guest ${clinicalTriageRes.client_name}. Detail underlying physiological mechanisms, contraindicated somatic modalities, and safe clinical alternatives.`, "clinical_safety")}
                        className="text-amber-800 hover:text-amber-950 font-sans font-bold underline pl-1 cursor-pointer"
                        title="Explain this clinical flag"
                      >
                        Explain
                      </button>
                    </span>
                  ))}
                </div>
                <ul className="list-disc list-inside text-[11px] text-[#5C6B5E] space-y-0.5">
                  {clinicalTriageRes.contraindications.map((c, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{c}</span>
                      <button
                        type="button"
                        onClick={() => triggerExplainThis(`Explain contraindicated somatic modality: ${c} for guest ${clinicalTriageRes.client_name}. What is the evidence-based protocol?`, "clinical_safety")}
                        className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-[10px] font-medium"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                        <span>Explain</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={handlePreArrivalTriage}
            disabled={busy !== null || !activeClient}
            className="w-full py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer"
          >
            {busy === "prearrival" ? "Checking Health Notes..." : "Run Nurse Health & Safety Check"}
          </button>
        </div>

        {/* Card 2: In-Stay Somatic Pulse Dysautonomia Triage */}
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-[#C07D63]" />
              <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                In-Stay Guest Daily Vitality &amp; Nervous System Check
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
              Sleep ≤3 &amp; Ease ≤3
            </span>
          </div>

          <form onSubmit={handleSomaticPulseTriage} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Restorative Sleep Score (1–10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={sleepScore}
                  onChange={(e) => setSleepScore(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Nervous System Ease (1–10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={easeScore}
                  onChange={(e) => setEaseScore(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Morning Telemetry &amp; Autonomic Symptoms
              </label>
              <input
                type="text"
                value={pulseSymptoms}
                onChange={(e) => setPulseSymptoms(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              />
            </div>

            <button
              type="submit"
              disabled={busy !== null}
              className="w-full py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] font-semibold transition-colors cursor-pointer"
            >
              {busy === "pulse" ? "Evaluating Telemetry..." : "Submit Somatic Pulse & Stage Bedside RN Check"}
            </button>
          </form>

          {pulseRes && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-bold text-amber-950">
                  Alert: {pulseRes.alert_level} &middot; Status: {pulseRes.triage_status}
                </div>
                <button
                  type="button"
                  onClick={() => triggerExplainThis(`Explain somatic pulse alert: ${pulseRes.alert_level} (${pulseRes.triage_status}). Protocol: ${pulseRes.contraindication_protocol}. What autonomic nervous system indicators are driving this?`, "clinical_safety")}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 text-[10px] font-semibold cursor-pointer"
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-800" />
                  <span>Explain Telemetry</span>
                </button>
              </div>
              <div className="text-[11px] text-amber-900">{pulseRes.contraindication_protocol}</div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Thermal Shock Hypoxia Lockout + Hospital Trauma Handover */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 3: Thermal Shock & Hypoxia Escalation */}
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
            <div className="flex items-center space-x-2">
              <ThermometerSnowflake className="w-4 h-4 text-blue-700" />
              <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                Thermal Shock &amp; Hypoxia Lockout (SpO2 &lt; 90%)
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-blue-50 text-blue-900 border border-blue-200 px-2 py-0.5 rounded">
              Hard Plunge Lockout
            </span>
          </div>

          <form onSubmit={handleThermalShock} className="space-y-3 text-xs">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">SpO2 %</label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Temp °C</label>
                <input
                  type="number"
                  step="0.1"
                  value={coreTemp}
                  onChange={(e) => setCoreTemp(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">HR bpm</label>
                <input
                  type="number"
                  value={restingHr}
                  onChange={(e) => setRestingHr(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">Shiver (m)</label>
                <input
                  type="number"
                  value={shiveringMins}
                  onChange={(e) => setShiveringMins(Number(e.target.value))}
                  className="w-full px-2 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy !== null}
              className="w-full py-2 rounded-lg bg-blue-900 hover:bg-blue-950 text-white font-semibold transition-colors cursor-pointer"
            >
              {busy === "thermal"
                ? "Enforcing Lockout..."
                : "Enforce Cold-Plunge Prohibition & Stage Warming + 2L O2"}
            </button>
          </form>

          {thermalRes && (
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-950 flex items-center justify-between">
              <div>
                <strong>{thermalRes.alert_level}:</strong> {thermalRes.protocol_lockout} (Draft #{thermalRes.draft_id})
              </div>
              <button
                type="button"
                onClick={() => triggerExplainThis(`Explain thermal shock and hypoxia escalation: ${thermalRes.alert_level}. Protocol: ${thermalRes.protocol_lockout}. What physiological hypothermia/hypoxia criteria triggered this lockout?`, "clinical_safety")}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-200 hover:bg-blue-300 text-blue-950 text-[10px] font-semibold cursor-pointer shrink-0 ml-2"
              >
                <Sparkles className="w-2.5 h-2.5 text-blue-800" />
                <span>Explain</span>
              </button>
            </div>
          )}
        </div>

        {/* Card 4: Emergency Medical Freeze & Hospital Trauma Handover */}
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-rose-200 pb-3">
            <div className="flex items-center space-x-2">
              <Ambulance className="w-4 h-4 text-rose-700" />
              <h3 className="font-serif text-base font-bold text-rose-950">
                Emergency Medical Freeze &amp; Trauma Handover
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-rose-100 text-rose-900 border border-rose-300 px-2 py-0.5 rounded font-bold">
              Level-3 Hospital
            </span>
          </div>

          <form onSubmit={handleMedicalFreeze} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Acute Clinical Event
              </label>
              <input
                type="text"
                value={clinicalEvent}
                onChange={(e) => setClinicalEvent(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Receiving Medical Facility
              </label>
              <input
                type="text"
                value={localFacility}
                onChange={(e) => setLocalFacility(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              />
            </div>

            <button
              type="submit"
              disabled={busy !== null || !activeTrip}
              className="w-full py-2 rounded-lg bg-rose-800 hover:bg-rose-900 text-white font-semibold transition-colors cursor-pointer"
            >
              {busy === "freeze"
                ? "Freezing Itinerary..."
                : "Freeze Guest Itinerary & Stage Hospital Transfer Packet"}
            </button>
          </form>
        </div>
      </div>

      {/* Row 3: Post-Retreat Sentiment Triage & Founder Red-Alert Recovery */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
          <div className="flex items-center space-x-2">
            <MessageSquareWarning className="w-4 h-4 text-[#C07D63]" />
            <h3 className="font-serif text-base font-bold text-[#2D3E35]">
              Post-Retreat Review Sentiment Triage &amp; Founder Red-Alert ($1,500 Recovery Voucher)
            </h3>
          </div>
          <span className="text-[10px] font-mono bg-[#FAF7F2] border border-[#E5DDD0] px-2 py-0.5 rounded text-[#5C6B5E]">
            Reputation Protection
          </span>
        </div>

        <form onSubmit={handleReviewTriage} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end text-xs">
          <div>
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
              Overall Rating (1–5)
            </label>
            <select
              value={reviewRating}
              onChange={(e) => setReviewRating(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
            >
              <option value={1}>1 Star (Critical Strain)</option>
              <option value={2}>2 Stars (Acoustic / Pacing Issue)</option>
              <option value={3}>3 Stars (Mixed)</option>
              <option value={5}>5 Stars (Transformational)</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
              Guest Survey Feedback
            </label>
            <input
              type="text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
            />
          </div>
          <button
            type="submit"
            disabled={busy !== null}
            className="py-2 px-4 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] font-semibold transition-colors cursor-pointer"
          >
            {busy === "review" ? "Triaging..." : "Ingest & Trigger Recovery"}
          </button>
        </form>

        {reviewRes && (
          <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs flex items-center justify-between">
            <div>
              <strong>Priority: {reviewRes.triage_priority}</strong> ({reviewRes.sentiment_label}) &middot;
              Recovery Voucher: <span className="font-mono font-bold text-[#C07D63]">{reviewRes.recovery_voucher || "N/A"}</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-800">Draft #{reviewRes.draft_id} Staged</span>
          </div>
        )}
      </div>
    </div>
  );
}

