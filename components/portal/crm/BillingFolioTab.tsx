"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Globe,
  Users,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Receipt,
  Scale,
  DollarSign,
  ShieldCheck,
  Lock,
  FileCheck2,
  Printer,
  Sparkles,
} from "lucide-react";
import { printBillingFolio, printChargebackDefenseBundle } from "@/lib/print-export";
import { triggerExplainThis } from "@/lib/portal-form-bus";
import {
  CRMTripItem,
  recordCrmTripSplitPayment,
  settleMultiGuestSplitFolio,
  cancelCrmTripWithPolicy,
} from "@/lib/sidecar-api";

export interface BillingFolioTabProps {
  trips: CRMTripItem[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
}

const FX_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 1.085,
  GBP: 1.272,
  CHF: 1.134,
  CAD: 0.735,
};

export function BillingFolioTab({
  trips,
  onRefresh,
  onNotify,
}: BillingFolioTabProps) {


  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || "");
  const [busy, setBusy] = useState<string | null>(null);

  // 1. Multi-Currency Payment Terminal state
  const [currency, setCurrency] = useState<string>("EUR");
  const [fxAmount, setFxAmount] = useState<number>(3000);
  const [paymentMethod, setPaymentMethod] = useState<string>("SWIFT International Wire");
  const [txRef, setTxRef] = useState<string>("WIRE-ZURICH-88412");
  const [paymentNotes, setPaymentNotes] = useState<string>("Installment wire in foreign currency");
  const [lastPaymentResult, setLastPaymentResult] = useState<{
    amount_recorded: number;
    currency?: string;
    fx_amount?: number;
    fx_rate?: number;
    total_paid: number;
    remaining_balance: number;
    deposit_status: string;
    final_balance_status: string;
    draft_id: number;
  } | null>(null);

  // 2. Shared Villa Proportional Split Folio state
  const [splitSanctuary, setSplitSanctuary] = useState<string>("puerto-vallarta-2027");
  const [splitVillaTier, setSplitVillaTier] = useState<string>("Two-Bedroom Oceanfront Penthouse Villa");
  const [splitTotalUsd, setSplitTotalUsd] = useState<number>(22000);
  const [splitResult, setSplitResult] = useState<{
    villa_tier: string;
    total_stay_investment: number;
    running_total_allocated: number;
    splits: Array<{
      guest_name: string;
      email: string;
      percentage_share: number;
      share_amount_usd: number;
      payment_method: string;
      reference: string;
    }>;
  } | null>(null);

  // 3. Cancellation & Insurance Claim Generator state
  const [cancelDaysPrior, setCancelDaysPrior] = useState<number>(42);
  const [cancelReason, setCancelReason] = useState<string>(
    "Acute L4-L5 lumbar disc herniation requiring neurosurgical rest"
  );
  const [medicalCert, setMedicalCert] = useState<boolean>(true);
  const [cancelResult, setCancelResult] = useState<{
    policy_tier: string;
    total_investment: number;
    cash_refund: number;
    concierge_credit: number;
    forfeiture_penalty: number;
    policy_note: string;
    draft_id: number;
  } | null>(null);

  // 4. Sanctuary Direct Credit Card Authorization & Chargeback Shield
  const [cardBrand, setCardBrand] = useState<string>("American Express Centurion");
  const [cardLast4, setCardLast4] = useState<string>("8012");
  const [cardExpiry, setCardExpiry] = useState<string>("08/29");
  const [cardholderName, setCardholderName] = useState<string>("");
  const [billingAddress, setBillingAddress] = useState<string>("100 Central Park South, New York, NY");
  const [authConsentSigned, setAuthConsentSigned] = useState<boolean>(true);
  const [cardAuthResult, setCardAuthResult] = useState<{
    auth_code: string;
    deposit_authorized: number;
    balance_scheduled: number;
    timestamp: string;
    shield_active: boolean;
  } | null>(null);

  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0];
  const currentFxRate = FX_RATES[currency] || 1.0;
  const convertedUsdPreview = Math.round(fxAmount * currentFxRate * 100) / 100;

  const notifyDraftUpdate = (msg: string) => {
    onNotify(msg);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("drafts-updated"));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) {
      onNotify("Notice: Please sync or select an active trip first.");
      return;
    }
    setBusy("payment");
    try {
      const res = await recordCrmTripSplitPayment(
        activeTrip.id,
        convertedUsdPreview,
        paymentMethod,
        txRef,
        paymentNotes,
        currency,
        currentFxRate,
        fxAmount
      );
      setLastPaymentResult(res);
      notifyDraftUpdate(
        `Recorded ${currency} ${fxAmount.toLocaleString()} ($${res.amount_recorded.toLocaleString()} USD @ ${currentFxRate}) for ${activeTrip.client_name}. Remaining balance: $${res.remaining_balance.toLocaleString()} USD (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed to record payment"}`);
    } finally {
      setBusy(null);
    }
  };

  const handleCardAuthorization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) {
      onNotify("Notice: Please select an active trip first.");
      return;
    }
    setBusy("card_auth");
    try {
      const depositAmt = activeTrip.deposit_amount || Math.round(activeTrip.total_investment * 0.3);
      const balanceAmt = activeTrip.final_balance || Math.round(activeTrip.total_investment * 0.7);
      const guestName = cardholderName.trim() || activeTrip.client_name;
      const refCode = `AUTH-KAI-${cardBrand.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}-${cardLast4}`;

      const res = await recordCrmTripSplitPayment(
        activeTrip.id,
        depositAmt,
        `VAULTED_${cardBrand.toUpperCase().replace(/\s+/g, "_")}`,
        refCode,
        `Direct Credit Card Authorization Form executed by ${guestName}. 30% deposit ($${depositAmt.toLocaleString()} USD) authorized; 70% balance ($${balanceAmt.toLocaleString()} USD) scheduled for charge 60 days prior to departure. Zero chargeback liability agreement signed.`,
        "USD",
        1.0,
        depositAmt
      );

      setCardAuthResult({
        auth_code: refCode,
        deposit_authorized: depositAmt,
        balance_scheduled: balanceAmt,
        timestamp: new Date().toLocaleTimeString(),
        shield_active: true,
      });

      notifyDraftUpdate(
        `Direct Credit Card Authorization Secured [${refCode}]: ${guestName} authorized $${depositAmt.toLocaleString()} USD deposit & scheduled $${balanceAmt.toLocaleString()} USD balance (Draft #${res.draft_id} staged).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed to record card authorization"}`);
    } finally {
      setBusy(null);
    }
  };

  const handleExportChargebackShield = () => {
    if (!activeTrip) {
      onNotify("Please select an active trip first.");
      return;
    }
    const depositAmt = activeTrip.deposit_amount || Math.round(activeTrip.total_investment * 0.3);
    const balanceAmt = activeTrip.final_balance || Math.round(activeTrip.total_investment * 0.7);
    const guestName = cardholderName.trim() || activeTrip.client_name;
    const authCode = cardAuthResult?.auth_code || `AUTH-KAI-${cardBrand.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "")}-${cardLast4}`;

    printChargebackDefenseBundle({
      trip_id: activeTrip.crm_trip_id || activeTrip.id,
      client_name: guestName,
      client_email: activeTrip.client_email,
      billing_address: billingAddress,
      sanctuary_name: activeTrip.title || "Sanctuary Cohort",
      dates: activeTrip.dates || "Upcoming Cohort",
      room_tier: activeTrip.room_tier || "Oceanfront King Suite",
      total_investment: activeTrip.total_investment || (depositAmt + balanceAmt),
      deposit_authorized: depositAmt,
      balance_scheduled: balanceAmt,
      card_brand: cardBrand,
      card_last4: cardLast4,
      auth_reference: authCode,
      signed_timestamp: cardAuthResult?.timestamp || new Date().toLocaleString(),
      e_signature: guestName,
    });
    onNotify(`Generated Merchant Chargeback Defense Bundle for ${guestName} [${authCode}]`);
  };

  const handleMultiGuestSplitFolio = async () => {
    setBusy("splitfolio");
    try {
      const res = await settleMultiGuestSplitFolio(splitSanctuary, {
        villa_tier: splitVillaTier,
        total_stay_investment: splitTotalUsd,
        split_records: [
          {
            guest_name: "Victoria Sterling",
            guest_email: "victoria.sterling@example.com",
            percentage_share: 50,
            payment_method: "Corporate Holding Wire (Delaware LLC)",
            transaction_reference: "CORP-WIRE-901",
            notes: "Primary suite sponsor (50%)",
          },
          {
            guest_name: "Camille Laurent",
            guest_email: "camille.laurent@example.com",
            percentage_share: 25,
            payment_method: "Amex Centurion Auth",
            transaction_reference: "AMEX-CENT-442",
            notes: "Co-occupant share (25%)",
          },
          {
            guest_name: "Elena Rostova",
            guest_email: "elena.rostova@example.com",
            percentage_share: 25,
            payment_method: "Virtuoso Luxury Wellness Credit + Visa Infinite",
            transaction_reference: "VIRT-883",
            notes: "Co-occupant share (25%)",
          },
        ],
        operator_name: "Kareena Islam",
      });
      setSplitResult(res);
      notifyDraftUpdate(
        `Settled Shared Villa Split Folio ($${res.running_total_allocated.toLocaleString()} USD across ${res.co_occupants_count} co-occupants with zero cent drift).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed split folio settlement"}`);
    } finally {
      setBusy(null);
    }
  };

  const handleCancellationPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTrip) {
      onNotify("Notice: Please select a trip to run cancellation policy calculation.");
      return;
    }
    setBusy("cancel");
    try {
      const res = await cancelCrmTripWithPolicy(
        activeTrip.id,
        cancelDaysPrior,
        cancelReason,
        medicalCert,
        "Kareena Islam"
      );
      setCancelResult(res);
      notifyDraftUpdate(
        `Processed Cancellation Tier [${res.policy_tier}]: Refund $${res.cash_refund.toLocaleString()}, Credit $${res.concierge_credit.toLocaleString()}, Forfeiture $${res.forfeiture_penalty.toLocaleString()} (Draft #${res.draft_id}).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed cancellation policy"}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Trip Selector Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-[#C07D63] block">
            Sanctuary Guest Payments &amp; Accounting Ledger
          </span>
          <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
            Select Guest Trip for Payment Ledger
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sanctuary Database Synced</span>
          </div>

          <button
            onClick={() => {
              if (!activeTrip) return;
              printBillingFolio({
                trip_id: activeTrip.id,
                guest_name: activeTrip.client_name,
                destination: activeTrip.title || "Puerto Vallarta Sanctuary",
                currency: "USD",
                total_investment: activeTrip.total_investment,
                total_paid: activeTrip.paid_amount || 0,
                remaining_balance: Math.max(0, activeTrip.total_investment - (activeTrip.paid_amount || 0)),
                deposit_status: (activeTrip.paid_amount || 0) >= activeTrip.total_investment * 0.25 ? "PAID" : "PENDING",
                final_balance_status: (activeTrip.paid_amount || 0) >= activeTrip.total_investment ? "SETTLED" : "OPEN",
                transactions: [
                  {
                    date: new Date().toISOString().split("T")[0],
                    description: "Direct Wire Settlement Record",
                    method: paymentMethod,
                    amount: activeTrip.paid_amount || 0,
                    reference: txRef || `SOV-${activeTrip.id.substring(0, 6)}`
                  }
                ]
              });
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] transition-colors cursor-pointer"
            title="Print or export PDF of itemized folio"
          >
            <Printer className="w-3.5 h-3.5 text-[#2D3E35]" />
            <span>Print Folio Receipt</span>
          </button>

          <select
            value={activeTrip?.id || ""}
            onChange={(e) => setSelectedTripId(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35] font-semibold min-w-[280px]"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.client_name} — {t.title} (${t.total_investment.toLocaleString()} · {t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Multi-Currency FX & Split Installment Terminal */}
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-700" />
              <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                International Wire &amp; Installment Terminal
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded">
              Exact Balance Matched (Zero Penny Drift)
            </span>
          </div>

          <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Payment Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold"
                >
                  <option value="EUR">EUR (€) · 1.085</option>
                  <option value="GBP">GBP (£) · 1.272</option>
                  <option value="CHF">CHF (Fr) · 1.134</option>
                  <option value="CAD">CAD ($) · 0.735</option>
                  <option value="USD">USD ($) · 1.000</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Received Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={fxAmount}
                  onChange={(e) => setFxAmount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  USD Equivalent (Settled)
                </label>
                <div className="w-full px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 font-mono font-bold">
                  ${convertedUsdPreview.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                >
                  <option value="SWIFT International Wire">SWIFT International Wire</option>
                  <option value="KAI Direct Card Auth (Amex)">KAI Direct Card Auth (Amex)</option>
                  <option value="HSA / Letter of Medical Necessity">HSA / Medical Card</option>
                  <option value="Corporate Executive Holding Wire">Corporate Holding Wire</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Wire / Auth Reference
                </label>
                <input
                  type="text"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-mono"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={busy !== null || !activeTrip}
              className="w-full py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy === "payment"
                ? "Recording FX Settlement..."
                : `Authorize & Post $${convertedUsdPreview.toLocaleString()} USD to Trip Ledger`}
            </button>
          </form>

          {lastPaymentResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-bold text-emerald-950">
                  Posted ${lastPaymentResult.amount_recorded.toLocaleString()} USD &middot; Total Paid: $
                  {lastPaymentResult.total_paid.toLocaleString()} USD
                </div>
                <button
                  type="button"
                  onClick={() => triggerExplainThis(`Explain currency conversion and wire ledger settlement for ${activeTrip?.client_name}: ${currency} ${fxAmount} converted to $${lastPaymentResult.amount_recorded} USD @ ${currentFxRate}. Remaining balance: $${lastPaymentResult.remaining_balance} USD.`, "studio_ops")}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] font-semibold cursor-pointer shrink-0 ml-2"
                >
                  <Sparkles className="w-2.5 h-2.5 text-emerald-700" />
                  <span>Explain Payment</span>
                </button>
              </div>
              <div className="text-[11px] text-emerald-900">
                Remaining Balance: <strong>${lastPaymentResult.remaining_balance.toLocaleString()} USD</strong>{" "}
                &middot; Deposit: {lastPaymentResult.deposit_status} &middot; Final:{" "}
                {lastPaymentResult.final_balance_status}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Direct Credit Card Authorization & Chargeback Shield Vault */}
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-emerald-700" />
              <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                Direct Credit Card Authorization &amp; Vault
              </h3>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportChargebackShield}
                className="text-[10px] font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Generate instant chargeback defense dispute bundle"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Chargeback Shield Audit</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleCardAuthorization} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder={activeTrip?.client_name || "Guest Name"}
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Card Brand
                </label>
                <select
                  value={cardBrand}
                  onChange={(e) => setCardBrand(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
                >
                  <option value="American Express Centurion">American Express (Centurion / Plat)</option>
                  <option value="Chase Sapphire Reserve">Chase Sapphire Reserve / Preferred</option>
                  <option value="Visa Infinite">Visa Infinite / Signature</option>
                  <option value="Mastercard World Elite">Mastercard World Elite</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Last 4 Digits
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-mono font-bold text-[#2D3E35]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  placeholder="08/29"
                  maxLength={5}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-mono text-[#2D3E35]"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Billing ZIP
                </label>
                <input
                  type="text"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="10019"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35]"
                />
              </div>
            </div>

            {/* Authorization terms schedule */}
            <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1.5 text-[11px]">
              <div className="flex justify-between font-semibold text-[#2D3E35]">
                <span>30% Deposit Authorization (Immediate):</span>
                <span className="font-bold text-emerald-800">
                  ${(activeTrip?.deposit_amount || 4350).toLocaleString()} USD
                </span>
              </div>
              <div className="flex justify-between font-semibold text-[#5C6B5E]">
                <span>70% Final Balance Authorization (60d Prior):</span>
                <span>${(activeTrip?.final_balance || 10150).toLocaleString()} USD</span>
              </div>
            </div>

            {/* Signed authorization agreement checkbox */}
            <label className="flex items-start space-x-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={authConsentSigned}
                onChange={(e) => setAuthConsentSigned(e.target.checked)}
                className="rounded border-[#E5DDD0] mt-0.5 text-[#2D3E35]"
                required
              />
              <span className="text-[10px] text-[#5C6B5E] leading-tight">
                Guest e-signature on file authorizing Grand Travel &amp; Cruise to vault card and execute payment schedule per KAI Sanctuary Travel CRM terms and conditions merchant standards.
              </span>
            </label>

            <button
              type="submit"
              disabled={busy !== null || !activeTrip || !authConsentSigned}
              className="w-full py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy === "card_auth"
                ? "Securing Vault Authorization..."
                : `Authorize & Vault Card for $${(activeTrip?.deposit_amount || 4350).toLocaleString()} USD`}
            </button>
          </form>

          {cardAuthResult && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs space-y-1 animate-in fade-in">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Card Vault Authorization Confirmed [{cardAuthResult.auth_code}]</span>
              </div>
              <div className="text-[11px] text-emerald-900">
                Authorized: <strong>${cardAuthResult.deposit_authorized.toLocaleString()} USD</strong> &middot; Scheduled: <strong>${cardAuthResult.balance_scheduled.toLocaleString()} USD</strong>
              </div>
              <p className="text-[10px] text-emerald-800">
                Host agency chargeback protection active &middot; Recorded at {cardAuthResult.timestamp}
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExportChargebackShield}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer text-xs"
                  title="Download legally binding dispute defense package for Stripe/Acquirer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Download Chargeback Dispute Defense Pack (PDF/Print)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Card 2: 3-Tier Cancellation & Travel Insurance Claim Generator */}
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
            <div className="flex items-center space-x-2">
              <Scale className="w-4 h-4 text-[#C07D63]" />
              <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                3-Tier Cancellation &amp; Insurance Claim Engine
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
              &gt;60d / 30–60d / &lt;30d
            </span>
          </div>

          <form onSubmit={handleCancellationPolicy} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Days Prior to Departure
                </label>
                <input
                  type="number"
                  value={cancelDaysPrior}
                  onChange={(e) => setCancelDaysPrior(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medicalCert}
                    onChange={(e) => setMedicalCert(e.target.checked)}
                    className="rounded border-[#E5DDD0]"
                  />
                  <span className="text-xs font-semibold text-[#2D3E35]">
                    Verified Physician Certificate
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Clinical / Personal Cancellation Reason
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              />
            </div>

            <button
              type="submit"
              disabled={busy !== null || !activeTrip}
              className="w-full py-2 rounded-lg bg-[#C07D63] hover:bg-[#a86a52] text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy === "cancel"
                ? "Calculating Forfeiture & Credits..."
                : "Execute Policy Calculation & Stage Insurance Dossier"}
            </button>
          </form>

          {cancelResult && (
            <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-1">
              <div className="font-bold text-[#2D3E35]">
                Policy Tier: {cancelResult.policy_tier} (Draft #{cancelResult.draft_id})
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div>
                  Refund: <strong>${cancelResult.cash_refund.toLocaleString()}</strong>
                </div>
                <div>
                  Credit: <strong>${cancelResult.concierge_credit.toLocaleString()}</strong>
                </div>
                <div>
                  Forfeited: <strong>${cancelResult.forfeiture_penalty.toLocaleString()}</strong>
                </div>
              </div>
              <p className="text-[11px] text-[#5C6B5E] pt-1">{cancelResult.policy_note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Multi-Guest Shared Penthouse Proportional Split Folio */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5DDD0] pb-3">
          <div>
            <h3 className="font-serif text-base font-bold text-[#2D3E35] flex items-center space-x-2">
              <Users className="w-4 h-4 text-[#2D3E35]" />
              <span>Multi-Guest Shared Villa Proportional Split Folio (50% / 25% / 25%)</span>
            </h3>
            <p className="text-xs text-[#5C6B5E]">
              Splits a master two-bedroom villa across 3 co-occupants paying via Corporate Holding Wire, Amex Centurion, and Virtuoso Wellness Credit.
            </p>
          </div>
          <button
            onClick={handleMultiGuestSplitFolio}
            disabled={busy !== null}
            className="px-4 py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            {busy === "splitfolio" ? "Calculating Guest Shares..." : "Split Villa Stay Between Guests ($22,000)"}
          </button>
        </div>

        {splitResult && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {splitResult.splits.map((s, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-1">
                <div className="flex items-center justify-between font-bold text-[#2D3E35]">
                  <span>{s.guest_name}</span>
                  <span className="font-mono text-emerald-800">{s.percentage_share}% Share</span>
                </div>
                <div className="text-sm font-serif font-bold text-[#2D3E35]">
                  ${s.share_amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                </div>
                <div className="text-[11px] text-[#5C6B5E] flex items-center justify-between">
                  <span>{s.payment_method} &middot; <span className="font-mono">{s.reference}</span></span>
                  <button
                    type="button"
                    onClick={() => triggerExplainThis(`Explain proportional villa split share for ${s.guest_name}: ${s.percentage_share}% ($${s.share_amount_usd} USD) via ${s.payment_method}. Check zero-penny balance reconciliation.`, "studio_ops")}
                    className="text-[10px] text-stone-600 hover:text-stone-900 font-semibold underline cursor-pointer shrink-0 ml-1"
                  >
                    Explain Guest Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



export default BillingFolioTab;
