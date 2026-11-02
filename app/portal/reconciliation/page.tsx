"use client";

import React, { useState, useEffect } from "react";
import {
  Scale,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Upload,
} from "lucide-react";
import {
  parseVoucher,
  runManifestDiff,
  fetchManifestDiffs,
  resolveManifestDiff,
  StagedVoucherDiff,
} from "@/lib/sidecar-api";

interface ParsedVoucherResult {
  voucher_ref: string;
  sanctuary_slug: string;
  check_in: string;
  check_out: string;
  total_amount: number;
  identified_room_codes: string[];
  raw_text_snippet: string;
}

export default function ReconciliationPage() {
  // Voucher parsing state
  const [voucherText, setVoucherText] = useState(
    `CONFIRMATION: NOS-VILLA-2026-884\nDates: Nov 14, 2026 to Nov 20, 2026\nAccommodations: VILLA-01 and VILLA-02\nContract Total: $12,400.00\nClient: Eleanor Vance\nSupplier: Nosara Luxury Villas SRL\nNotes: Daily organic breakfast included, direct beach path access.`
  );
  const [voucherSanctuary, setVoucherSanctuary] = useState("nosara");
  const [parsingVoucher, setParsingVoucher] = useState(false);
  const [parsedVoucherResult, setParsedVoucherResult] = useState<ParsedVoucherResult | null>(null);

  // Manifest diff state
  const [diffSanctuary, setDiffSanctuary] = useState("nosara");
  const [manifestJsonText, setManifestJsonText] = useState(
    JSON.stringify(
      [
        { name: "Eleanor Vance", room: "Private Villa Sanctuary" },
        { name: "Julian Thorne", room: "Private Villa Sanctuary" },
        { name: "Dr. Marcus Reed", room: "Cliffside Stillness Suite" },
        { name: "Camille Laurent", room: "Shared Ocean Pavilion" },
        { name: "Sarah Lin", room: "Private Villa Sanctuary" },
        { name: "Chloe Dupont", room: "Shared Ocean Pavilion" },
        { name: "Unlinked Manifest Guest", room: "VILLA-07" },
      ],
      null,
      2
    )
  );

  const [auditingDiff, setAuditingDiff] = useState(false);
  const [activeDiffResult, setActiveDiffResult] = useState<StagedVoucherDiff | null>(null);
  const [diffHistory, setDiffHistory] = useState<StagedVoucherDiff[]>([]);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadDiffHistory = async () => {
    try {
      const data = await fetchManifestDiffs();
      setDiffHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        const data = await fetchManifestDiffs();
        if (active) setDiffHistory(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, []);

  const handleParseVoucher = async () => {
    setParsingVoucher(true);
    try {
      const res = await parseVoucher(voucherText, voucherSanctuary, "nosara_villa_agreement.pdf");
      setParsedVoucherResult(res.parsed_data);
    } catch (e) {
      console.error(e);
      alert("Failed to parse voucher text");
    } finally {
      setParsingVoucher(false);
    }
  };

  const handleRunManifestDiff = async () => {
    setAuditingDiff(true);
    try {
      const records = JSON.parse(manifestJsonText);
      const res = await runManifestDiff(diffSanctuary, records, "ground_operator_manifest.json");
      setActiveDiffResult(res);
      await loadDiffHistory();
    } catch (e: unknown) {
      alert(`Manifest audit error: ${(e as Error).message || "Invalid JSON format"}`);
    } finally {
      setAuditingDiff(false);
    }
  };

  const handleLoadOverCapacitySample = () => {
    // 16 guests exceeds 14 cap!
    const overList = Array.from({ length: 16 }, (_, i) => ({
      name: `External Manifest Guest ${i + 1}`,
      room: `VILLA-${(i + 1).toString().padStart(2, "0")}`,
    }));
    setManifestJsonText(JSON.stringify(overList, null, 2));
  };

  const handleResolveDiff = async (diffId: string) => {
    setResolvingId(diffId);
    try {
      await resolveManifestDiff(diffId, "Kareena Islam");
      await loadDiffHistory();
      if (activeDiffResult?.id === diffId) {
        setActiveDiffResult({ ...activeDiffResult, status: "RESOLVED" });
      }
    } catch (e) {
      console.error(e);
      alert("Failed to resolve diff");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
          Guest List &amp; Room Booking Check
        </h1>
        <p className="text-sm text-[#5C6B5E] mt-1">
          Compare ground operator guest manifests with confirmed KAI Sanctuary bookings to ensure every traveler is accounted for.
        </p>
      </div>

      {/* Section 1: Villa Contract & Supplier Voucher Ingestion */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DDD0]/70 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-[#C07D63]" />
            <h2 className="font-serif text-base font-bold text-[#2D3E35]">
              Villa Booking Confirmation Reader
            </h2>
          </div>
          <span className="text-xs text-[#5C6B5E]">Automatic Details Extraction</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#5C6B5E]">Contract / Voucher Text</label>
              <select
                value={voucherSanctuary}
                onChange={(e) => setVoucherSanctuary(e.target.value)}
                className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2 py-0.5 text-[#2D3E35]"
              >
                <option value="nosara">Nosara Sanctuary</option>
                <option value="amalfi">Amalfi Sanctuary</option>
                <option value="bali">Bali Sanctuary</option>
                <option value="riviera-maya">Riviera Maya</option>
              </select>
            </div>

            <textarea
              rows={6}
              value={voucherText}
              onChange={(e) => setVoucherText(e.target.value)}
              className="w-full text-xs font-mono bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-3 text-[#2D3E35] focus:outline-none leading-relaxed"
            />

            <button
              onClick={handleParseVoucher}
              disabled={parsingVoucher}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{parsingVoucher ? "Parsing Contract..." : "Parse Voucher Text"}</span>
            </button>
          </div>

          {/* Parsed Result Display */}
          <div className="p-4 rounded-lg bg-[#FAF7F2]/60 border border-[#E5DDD0] space-y-3">
            <div className="font-semibold text-xs text-[#5C6B5E] uppercase tracking-wider">
              Extracted Contract Attributes
            </div>

            {parsedVoucherResult ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2 bg-white rounded border border-[#E5DDD0]">
                  <span className="text-[#5C6B5E]">Confirmation / Folio Code:</span>
                  <span className="font-mono font-bold text-[#2D3E35]">
                    {parsedVoucherResult.voucher_ref}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded border border-[#E5DDD0]">
                  <span className="text-[#5C6B5E]">Check-In / Out Dates:</span>
                  <span className="font-semibold text-[#2D3E35]">
                    {parsedVoucherResult.check_in} &rarr; {parsedVoucherResult.check_out}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded border border-[#E5DDD0]">
                  <span className="text-[#5C6B5E]">Total Contract Rate:</span>
                  <span className="font-bold text-[#C07D63]">
                    ${parsedVoucherResult.total_amount.toLocaleString()} USD
                  </span>
                </div>
                <div className="p-2 bg-white rounded border border-[#E5DDD0] space-y-1">
                  <span className="text-[#5C6B5E]">Identified Room Codes:</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {parsedVoucherResult.identified_room_codes.map((code: string) => (
                      <span
                        key={code}
                        className="px-2 py-0.5 rounded bg-[#F2ECE4] text-[#2D3E35] font-mono text-[11px] font-semibold"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-[#5C6B5E] text-center py-8">
                Paste contract text and click &ldquo;Parse Voucher Text&rdquo; to extract entities.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Ground Manifest & Group Size Check */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DDD0]/70 pb-3">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-[#C07D63]" />
            <h2 className="font-serif text-base font-bold text-[#2D3E35]">
              Guest Manifest &amp; 12–14 Group Size Check
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLoadOverCapacitySample}
              className="text-xs text-[#C07D63] hover:underline font-medium"
            >
              Load Over-Capacity Sample (&gt;14)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#5C6B5E]">
                External Ground Operator Manifest (JSON / CSV Guest Records)
              </label>
              <select
                value={diffSanctuary}
                onChange={(e) => setDiffSanctuary(e.target.value)}
                className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded px-2 py-0.5 text-[#2D3E35]"
              >
                <option value="nosara">Nosara (Cap: 14)</option>
                <option value="amalfi">Amalfi (Cap: 12)</option>
                <option value="bali">Bali (Cap: 14)</option>
                <option value="riviera-maya">Riviera Maya (Cap: 12)</option>
              </select>
            </div>

            <textarea
              rows={7}
              value={manifestJsonText}
              onChange={(e) => setManifestJsonText(e.target.value)}
              className="w-full text-xs font-mono bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-3 text-[#2D3E35] focus:outline-none leading-relaxed"
            />

            <button
              onClick={handleRunManifestDiff}
              disabled={auditingDiff}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>{auditingDiff ? "Auditing Manifest..." : "Run Guest Manifest Check"}</span>
            </button>
          </div>

          {/* Active Diff Result Card */}
          <div className="space-y-3">
            {activeDiffResult ? (
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  activeDiffResult.over_capacity === "YES"
                    ? "bg-red-50 border-red-200 text-red-950"
                    : activeDiffResult.discrepancies.length > 0
                    ? "bg-amber-50/70 border-amber-200 text-amber-950"
                    : "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                }`}
              >
                <div className="flex items-center justify-between border-b border-black/10 pb-2">
                  <div className="flex items-center space-x-2">
                    {activeDiffResult.over_capacity === "YES" ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    )}
                    <span className="font-serif font-bold text-sm">
                      Audit Result: {activeDiffResult.sanctuary_slug.toUpperCase()}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      activeDiffResult.over_capacity === "YES"
                        ? "bg-red-200 text-red-900"
                        : "bg-emerald-200 text-emerald-900"
                    }`}
                  >
                    Capacity: {activeDiffResult.over_capacity === "YES" ? "VIOLATION" : "VALID"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white/80 rounded border border-black/5">
                    <div className="text-[10px] text-[#5C6B5E]">External Count</div>
                    <div className="font-bold text-base">{activeDiffResult.external_count}</div>
                  </div>
                  <div className="p-2 bg-white/80 rounded border border-black/5">
                    <div className="text-[10px] text-[#5C6B5E]">CRM Confirmed</div>
                    <div className="font-bold text-base">{activeDiffResult.crm_cohort_count}</div>
                  </div>
                  <div className="p-2 bg-white/80 rounded border border-black/5">
                    <div className="text-[10px] text-[#5C6B5E]">Group Limit</div>
                    <div className="font-bold text-base">{activeDiffResult.cohort_cap}</div>
                  </div>
                </div>

                {/* Discrepancies list */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider">
                    Discrepancies Flagged ({activeDiffResult.discrepancies.length}):
                  </div>
                  {activeDiffResult.discrepancies.map((d, i) => (
                    <div
                      key={i}
                      className="p-2 bg-white rounded border border-black/10 text-xs flex items-start space-x-2"
                    >
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded mt-0.5 ${
                          d.severity === "CRITICAL"
                            ? "bg-red-600 text-white"
                            : d.severity === "HIGH"
                            ? "bg-amber-600 text-white"
                            : "bg-gray-600 text-white"
                        }`}
                      >
                        {d.severity}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{d.message}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {activeDiffResult.status === "PENDING_APPROVAL" && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleResolveDiff(activeDiffResult.id)}
                      disabled={resolvingId === activeDiffResult.id}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#2D3E35] text-white rounded hover:bg-[#1F2C25] transition-colors"
                    >
                      {resolvingId === activeDiffResult.id ? "Resolving..." : "Resolve & Acknowledge Diff"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-[#FAF7F2]/60 rounded-xl border border-[#E5DDD0] text-xs text-[#5C6B5E]">
                Click &ldquo;Run Guest Manifest Check&rdquo; to compare ground arrivals against confirmed guest reservations.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diff Audit History Table */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-3">
        <h3 className="font-serif text-base font-bold text-[#2D3E35]">
          Historical Manifest Audit Trail
        </h3>
        {diffHistory.length === 0 ? (
          <div className="text-xs text-[#5C6B5E] py-4 text-center">No reconciliation logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E5DDD0] text-[#5C6B5E]">
                  <th className="py-2">Document</th>
                  <th className="py-2">Sanctuary</th>
                  <th className="py-2">Counts (Ext / CRM / Cap)</th>
                  <th className="py-2">Over Cap</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Audited At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DDD0]/50">
                {diffHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-[#FAF7F2]">
                    <td className="py-2.5 font-medium text-[#2D3E35]">{h.document_name}</td>
                    <td className="py-2.5 uppercase font-semibold">{h.sanctuary_slug}</td>
                    <td className="py-2.5 font-mono">
                      {h.external_count} / {(h as any).crm_cohort_count} / {h.cohort_cap}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          h.over_capacity === "YES"
                            ? "bg-red-100 text-red-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {h.over_capacity}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          h.status === "RESOLVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {h.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#5C6B5E]">{new Date(h.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
