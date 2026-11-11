"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Globe,
  Users,
  CheckCircle2,
  Receipt,
  Scale,
  ShieldCheck,
  Lock,
  Printer,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  User,
  Compass,
} from "lucide-react";
import { printBillingFolio, printChargebackDefenseBundle } from "@/lib/print-export";
import {
  CRMTripItem,
  CRMClientItem,
  recordCrmTripSplitPayment,
  settleMultiGuestSplitFolio,
  cancelCrmTripWithPolicy,
} from "@/lib/sidecar-api";

export interface BillingFolioTabProps {
  trips: CRMTripItem[];
  onRefresh: () => void;
  onNotify: (msg: string) => void;
  clients?: CRMClientItem[];
  onInspectGuest?: (clientId: string) => void;
  onInspectTrip?: (tripId: string) => void;
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
  clients = [],
  onInspectGuest,
  onInspectTrip,
}: BillingFolioTabProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>(trips[0]?.id || "");
  const [busy, setBusy] = useState<string | null>(null);

  // Billing Sub-Workspace Modes: "payment" (default) | "split" | "cancellation"
  const [billingMode, setBillingMode] = useState<"payment" | "split" | "cancellation">("payment");
  const [paymentSubMethod, setPaymentSubMethod] = useState<"card" | "wire">("card");

  // 1. Multi-Currency Payment Terminal state
  const [currency, setCurrency] = useState<string>("USD");
  const [fxAmount, setFxAmount] = useState<number>(4350);
  const [paymentMethod, setPaymentMethod] = useState<string>("SWIFT International Wire");
  const [txRef, setTxRef] = useState<string>("WIRE-KAI-90214");
  const [paymentNotes, setPaymentNotes] = useState<string>("Sanctuary deposit payment");
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

  const totalInv = activeTrip?.total_investment || 14500;
  const paidAmt = activeTrip?.paid_amount || 0;
  const remainingBal = Math.max(0, totalInv - paidAmt);
  const percentPaid = Math.min(100, Math.round((paidAmt / totalInv) * 100));

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

  const handleQuickSettleBalance = async () => {
    if (!activeTrip || remainingBal <= 0) return;
    setBusy("quick_settle");
    try {
      const refCode = `SETTLE-DIR-${Date.now().toString().slice(-6)}`;
      const res = await recordCrmTripSplitPayment(
        activeTrip.id,
        remainingBal,
        "Direct Balance Settlement (Cleared)",
        refCode,
        `Final folio balance of $${remainingBal.toLocaleString()} USD settled and cleared in full.`,
        "USD",
        1.0,
        remainingBal
      );
      setLastPaymentResult(res);
      notifyDraftUpdate(
        `Final Balance Settled: Recorded $${remainingBal.toLocaleString()} USD for ${activeTrip.client_name} (Folio cleared 100%, Draft #${res.draft_id} staged).`
      );
      onRefresh();
    } catch (err: unknown) {
      onNotify(`Notice: ${err instanceof Error ? err.message : "Failed to settle balance"}`);
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
      {/* 1. Target Trip Selector & Financial Overview Card */}
      <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase font-bold text-[#C07D63] block">
              Sanctuary Guest Accounting &amp; Ledger
            </span>
            <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
              Guest Folio &amp; Financial Ledger
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ledger Reconciled</span>
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
                      description: "Direct Settlement Record",
                      method: paymentMethod,
                      amount: activeTrip.paid_amount || 0,
                      reference: txRef || `SOV-${activeTrip.id.substring(0, 6)}`,
                    },
                  ],
                });
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] transition-colors cursor-pointer"
              title="Print or export PDF of itemized folio"
            >
              <Printer className="w-3.5 h-3.5 text-[#2D3E35]" />
              <span>Print Folio Receipt</span>
            </button>

            {/* Quick Guest Selector */}
            <select
              value={activeTrip?.id || ""}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35] font-semibold min-w-[280px]"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.client_name} — {t.title} (${t.total_investment.toLocaleString()})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Guest Ledger Metric Strip */}
        {activeTrip && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FAF7F2] p-3.5 rounded-xl border border-[#E5DDD0]">
            <div>
              <div className="text-[10px] font-semibold uppercase text-[#5C6B5E]">Selected Guest</div>
              <div className="font-serif font-bold text-sm text-[#2D3E35] truncate mt-0.5">
                {activeTrip.client_name}
              </div>
              <div className="text-[11px] text-[#5C6B5E] truncate">{activeTrip.room_tier}</div>
              <div className="flex items-center gap-2 mt-2">
                {onInspectGuest && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTrip.client_id) {
                        onInspectGuest(activeTrip.client_id);
                      } else {
                        const matched = clients.find(
                          (c) =>
                            c.email.toLowerCase() === activeTrip.client_email.toLowerCase() ||
                            c.full_name.toLowerCase() === activeTrip.client_name.toLowerCase()
                        );
                        if (matched) onInspectGuest(matched.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 hover:text-emerald-950 bg-white hover:bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 transition-colors cursor-pointer"
                    title="View Guest Dossier & Clearance"
                  >
                    <User className="w-2.5 h-2.5 text-emerald-700" />
                    <span>Dossier</span>
                  </button>
                )}
                {onInspectTrip && (
                  <button
                    type="button"
                    onClick={() => onInspectTrip(activeTrip.id)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#2D3E35] hover:text-emerald-800 bg-white hover:bg-[#F2ECE4] px-2 py-0.5 rounded border border-[#E5DDD0] transition-colors cursor-pointer"
                    title="Edit Reservation & Itinerary"
                  >
                    <Compass className="w-2.5 h-2.5 text-[#C07D63]" />
                    <span>Itinerary</span>
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase text-[#5C6B5E]">Total Investment</div>
              <div className="text-sm font-bold text-[#2D3E35] font-mono mt-0.5">
                ${totalInv.toLocaleString()} USD
              </div>
              <div className="text-[11px] text-[#5C6B5E]">All-Inclusive Sanctuary</div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase text-[#5C6B5E]">Paid to Date</div>
              <div className="text-sm font-bold text-emerald-800 font-mono mt-0.5">
                ${paidAmt.toLocaleString()} USD
              </div>
              <div className="text-[11px] text-emerald-700 font-medium">
                {percentPaid}% Cleared ({paidAmt >= totalInv * 0.3 ? "Deposit Secured" : "Pending Deposit"})
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold uppercase text-[#5C6B5E]">Remaining Balance</div>
              <div className="text-sm font-bold text-[#C07D63] font-mono mt-0.5">
                ${remainingBal.toLocaleString()} USD
              </div>
              <div className="text-[11px] text-[#5C6B5E]">Due 60 Days Prior</div>
              {remainingBal > 0 && (
                <button
                  type="button"
                  disabled={busy === "quick_settle"}
                  onClick={handleQuickSettleBalance}
                  className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-md transition-colors shadow-xs cursor-pointer"
                  title="Record full balance payment in 1 click"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Settle Balance (${remainingBal.toLocaleString()})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Billing Sub-Navigation (Idiots & Operators Don't Mix Payments with Cancellations) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5DDD0] shadow-xs">
        <div className="flex items-center space-x-1.5 bg-[#F2ECE4] p-1 rounded-lg border border-[#E5DDD0]">
          <button
            type="button"
            onClick={() => setBillingMode("payment")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              billingMode === "payment"
                ? "bg-white text-[#2D3E35] shadow-xs"
                : "text-[#5C6B5E] hover:text-[#2D3E35]"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
            <span>Receive Payment &amp; Card Vault</span>
          </button>

          <button
            type="button"
            onClick={() => setBillingMode("split")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              billingMode === "split"
                ? "bg-white text-[#2D3E35] shadow-xs"
                : "text-[#5C6B5E] hover:text-[#2D3E35]"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-[#2D3E35]" />
            <span>Shared Villa Split Folio</span>
          </button>

          <button
            type="button"
            onClick={() => setBillingMode("cancellation")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer ${
              billingMode === "cancellation"
                ? "bg-white text-rose-900 shadow-xs"
                : "text-[#5C6B5E] hover:text-rose-800"
            }`}
          >
            <Scale className="w-3.5 h-3.5 text-[#C07D63]" />
            <span>Cancellation &amp; Insurance Claims</span>
          </button>
        </div>

        {billingMode === "payment" && (
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-2.5 py-1 rounded-lg border border-[#E5DDD0] text-xs">
            <span className="text-[10px] uppercase font-bold text-[#5C6B5E]">Method:</span>
            <button
              type="button"
              onClick={() => setPaymentSubMethod("card")}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                paymentSubMethod === "card"
                  ? "bg-[#2D3E35] text-[#FAF7F2]"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              Direct Card Vault
            </button>
            <button
              type="button"
              onClick={() => setPaymentSubMethod("wire")}
              className={`px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                paymentSubMethod === "wire"
                  ? "bg-[#2D3E35] text-[#FAF7F2]"
                  : "text-[#5C6B5E] hover:text-[#2D3E35]"
              }`}
            >
              SWIFT Wire / FX
            </button>
          </div>
        )}
      </div>

      {/* 3. MODE: RECEIVE PAYMENT & CARD VAULT */}
      {billingMode === "payment" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
          {/* Main Payment & Vault Form */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4">
            {paymentSubMethod === "card" ? (
              /* CARD AUTHORIZATION SUB-METHOD */
              <div>
                <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                      Sanctuary Direct Credit Card Vault &amp; Authorization
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportChargebackShield}
                    className="text-[10px] font-mono bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Chargeback Defense Pack</span>
                  </button>
                </div>

                <form onSubmit={handleCardAuthorization} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        placeholder={activeTrip?.client_name || "Guest Name"}
                        value={cardholderName}
                        onChange={(e) => setCardholderName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        Card Brand
                      </label>
                      <select
                        value={cardBrand}
                        onChange={(e) => setCardBrand(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold text-[#2D3E35]"
                      >
                        <option value="American Express Centurion">American Express (Centurion / Plat)</option>
                        <option value="Chase Sapphire Reserve">Chase Sapphire Reserve / Preferred</option>
                        <option value="Visa Infinite">Visa Infinite / Signature</option>
                        <option value="Mastercard World Elite">Mastercard World Elite</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        Last 4 Digits
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-mono font-bold text-[#2D3E35]"
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
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-mono text-[#2D3E35]"
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
                        className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35]"
                      />
                    </div>
                  </div>

                  {/* Authorization terms schedule */}
                  <div className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-semibold text-[#2D3E35]">
                      <span>30% Deposit Authorization (Immediate):</span>
                      <span className="font-bold text-emerald-800">
                        ${(activeTrip?.deposit_amount || Math.round(totalInv * 0.3)).toLocaleString()} USD
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-[#5C6B5E]">
                      <span>70% Final Balance Authorization (60d Prior):</span>
                      <span>${(activeTrip?.final_balance || Math.round(totalInv * 0.7)).toLocaleString()} USD</span>
                    </div>
                  </div>

                  <label className="flex items-start space-x-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={authConsentSigned}
                      onChange={(e) => setAuthConsentSigned(e.target.checked)}
                      className="rounded border-[#E5DDD0] mt-0.5 text-[#2D3E35]"
                      required
                    />
                    <span className="text-[10px] text-[#5C6B5E] leading-tight">
                      Guest e-signature on file authorizing Grand Travel &amp; Cruise to vault card and execute payment schedule per KAI Sanctuary Travel CRM terms with zero chargeback liability.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={busy !== null || !activeTrip || !authConsentSigned}
                    className="w-full py-2.5 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy === "card_auth"
                      ? "Securing Vault Authorization..."
                      : `Authorize & Vault Card for $${(activeTrip?.deposit_amount || Math.round(totalInv * 0.3)).toLocaleString()} USD`}
                  </button>
                </form>
              </div>
            ) : (
              /* SWIFT WIRE / FX SUB-METHOD */
              <div>
                <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-emerald-700" />
                    <h3 className="font-serif text-base font-bold text-[#2D3E35]">
                      International Wire &amp; Installment Terminal
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded">
                    Zero Penny Drift
                  </span>
                </div>

                <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
                  {/* 1-Click Quick Preset Chips */}
                  {activeTrip && (
                    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0]">
                      <span className="text-[10px] text-[#5C6B5E] font-medium mr-1">1-Click Amount:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrency("USD");
                          setFxAmount(Math.round(totalInv * 0.3));
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 transition-colors cursor-pointer"
                      >
                        30% Deposit (${Math.round(totalInv * 0.3).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrency("USD");
                          setFxAmount(remainingBal);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-white hover:bg-blue-50 text-blue-900 border border-blue-300 transition-colors cursor-pointer"
                      >
                        Balance Due (${remainingBal.toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrency("USD");
                          setFxAmount(totalInv);
                        }}
                        className="px-2 py-1 rounded text-[10px] font-semibold bg-white hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] transition-colors cursor-pointer"
                      >
                        Full Total (${totalInv.toLocaleString()})
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        Payment Currency
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-semibold"
                      >
                        <option value="USD">USD ($) · 1.000</option>
                        <option value="EUR">EUR (€) · 1.085</option>
                        <option value="GBP">GBP (£) · 1.272</option>
                        <option value="CHF">CHF (Fr) · 1.134</option>
                        <option value="CAD">CAD ($) · 0.735</option>
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
                        className="w-full px-2.5 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        USD Settled Value
                      </label>
                      <div className="w-full px-2.5 py-2 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-950 font-mono font-bold">
                        ${convertedUsdPreview.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        Payment Method
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
                      >
                        <option value="SWIFT International Wire">SWIFT International Wire</option>
                        <option value="KAI Direct Card Auth (Amex)">KAI Direct Card Auth (Amex)</option>
                        <option value="HSA / Letter of Medical Necessity">HSA / Medical Card</option>
                        <option value="Corporate Executive Holding Wire">Corporate Holding Wire</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                        Wire Reference / Auth Code
                      </label>
                      <input
                        type="text"
                        value={txRef}
                        onChange={(e) => setTxRef(e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-mono"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={busy !== null || !activeTrip}
                    className="w-full py-2.5 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {busy === "payment"
                      ? "Recording Settlement..."
                      : `Post $${convertedUsdPreview.toLocaleString()} USD to Trip Ledger`}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Live Settlement Results & Chargeback Protection */}
          <div className="space-y-4">
            {lastPaymentResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-emerald-950">
                    Posted ${lastPaymentResult.amount_recorded.toLocaleString()} USD
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold">
                    Settled
                  </span>
                </div>
                <div className="text-[11px] text-emerald-900 space-y-1">
                  <div>
                    Remaining Balance: <strong>${lastPaymentResult.remaining_balance.toLocaleString()} USD</strong>
                  </div>
                  <div>Deposit Status: <span className="font-semibold">{lastPaymentResult.deposit_status}</span></div>
                  <div>Final Balance: <span className="font-semibold">{lastPaymentResult.final_balance_status}</span></div>
                </div>
              </div>
            )}

            {cardAuthResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 animate-in fade-in">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Card Authorization Confirmed</span>
                </div>
                <div className="font-mono text-[11px] text-emerald-900 bg-emerald-100/50 p-2 rounded">
                  Auth Ref: {cardAuthResult.auth_code}
                </div>
                <div className="text-[11px] text-emerald-900">
                  Authorized: <strong>${cardAuthResult.deposit_authorized.toLocaleString()} USD</strong> &middot; Scheduled: <strong>${cardAuthResult.balance_scheduled.toLocaleString()} USD</strong>
                </div>
                <button
                  type="button"
                  onClick={handleExportChargebackShield}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white font-semibold flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Export Defense Bundle</span>
                </button>
              </div>
            )}

            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-2">
              <div className="font-serif font-bold text-[#2D3E35] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Host Agency Protection Standards</span>
              </div>
              <p className="text-[11px] text-[#5C6B5E] leading-relaxed">
                All card authorizations include digital dispute packets with itinerary signatures, zero-penalty cancellation disclosures, and verified merchant terms.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODE: SHARED VILLA SPLIT FOLIO */}
      {billingMode === "split" && (
        <div className="bg-white p-5 rounded-xl border border-[#E5DDD0] shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5DDD0] pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-[#2D3E35] flex items-center space-x-2">
                <Users className="w-4 h-4 text-[#2D3E35]" />
                <span>Multi-Guest Shared Villa Proportional Split Folio</span>
              </h3>
              <p className="text-xs text-[#5C6B5E] mt-0.5">
                Splits a master luxury villa across co-occupants (50% / 25% / 25%) with zero-penny balance guarantee.
              </p>
            </div>
            <button
              onClick={handleMultiGuestSplitFolio}
              disabled={busy !== null}
              className="px-4 py-2 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              {busy === "splitfolio" ? "Calculating Shares..." : "Execute $22,000 Villa Split"}
            </button>
          </div>

          {splitResult ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {splitResult.splits.map((s, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-xs space-y-1.5">
                  <div className="flex items-center justify-between font-bold text-[#2D3E35]">
                    <span>{s.guest_name}</span>
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      {s.percentage_share}% Share
                    </span>
                  </div>
                  <div className="text-base font-serif font-bold text-[#2D3E35]">
                    ${s.share_amount_usd.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
                  </div>
                  <div className="text-[11px] text-[#5C6B5E]">
                    {s.payment_method} &middot; <span className="font-mono">{s.reference}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-[#FAF7F2] rounded-xl border border-dashed border-[#E5DDD0] space-y-2">
              <Users className="w-6 h-6 text-[#5C6B5E]/50 mx-auto" />
              <div className="font-serif font-bold text-sm text-[#2D3E35]">
                Split Folio Ready for Allocation
              </div>
              <p className="text-xs text-[#5C6B5E] max-w-md mx-auto">
                Click &quot;Execute $22,000 Villa Split&quot; to calculate individual corporate wire, Amex Centurion, and Virtuoso share allocations.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. MODE: CANCELLATION & INSURANCE CLAIMS (Safely Segregated) */}
      {billingMode === "cancellation" && (
        <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <h3 className="font-serif text-base font-bold text-rose-950">
                Cancellation &amp; Travel Insurance Claim Dossier Engine
              </h3>
            </div>
            <span className="text-[10px] font-mono bg-rose-50 text-rose-900 border border-rose-200 px-2 py-0.5 rounded font-bold">
              Protected Policy Review
            </span>
          </div>

          <p className="text-xs text-rose-900/80 bg-rose-50 p-3 rounded-lg border border-rose-200">
            <strong>Important Operator Notice:</strong> This action evaluates statutory cancellation penalties based on days prior to departure and generates formal insurance documentation for claims.
          </p>

          <form onSubmit={handleCancellationPolicy} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Days Prior to Departure
                </label>
                <input
                  type="number"
                  value={cancelDaysPrior}
                  onChange={(e) => setCancelDaysPrior(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] font-bold"
                />
              </div>

              <div className="flex items-end pb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={medicalCert}
                    onChange={(e) => setMedicalCert(e.target.checked)}
                    className="rounded border-[#E5DDD0] text-rose-700"
                  />
                  <span className="text-xs font-semibold text-[#2D3E35]">
                    Physician Medical Certificate On File
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
                className="w-full px-3 py-2 rounded-lg border border-[#E5DDD0] bg-[#FAF7F2]"
              />
            </div>

            <button
              type="submit"
              disabled={busy !== null || !activeTrip}
              className="w-full py-2.5 rounded-lg bg-rose-800 hover:bg-rose-900 text-white font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy === "cancel"
                ? "Calculating Forfeiture & Policy Tiers..."
                : "Calculate Policy Tiers & Stage Insurance Dossier"}
            </button>
          </form>

          {cancelResult && (
            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 text-xs space-y-2 animate-in fade-in">
              <div className="font-bold text-rose-950 flex items-center justify-between">
                <span>Policy Tier: {cancelResult.policy_tier}</span>
                <span className="text-[10px] font-mono text-rose-800">Draft #{cancelResult.draft_id}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-white rounded border border-rose-200">
                  <span className="block text-[10px] text-[#5C6B5E]">Cash Refund:</span>
                  <strong className="text-emerald-800">${cancelResult.cash_refund.toLocaleString()} USD</strong>
                </div>
                <div className="p-2 bg-white rounded border border-rose-200">
                  <span className="block text-[10px] text-[#5C6B5E]">Concierge Credit:</span>
                  <strong className="text-blue-800">${cancelResult.concierge_credit.toLocaleString()} USD</strong>
                </div>
                <div className="p-2 bg-white rounded border border-rose-200">
                  <span className="block text-[10px] text-[#5C6B5E]">Forfeited / Retained:</span>
                  <strong className="text-rose-800">${cancelResult.forfeiture_penalty.toLocaleString()} USD</strong>
                </div>
              </div>
              <p className="text-[11px] text-[#5C6B5E] pt-1">{cancelResult.policy_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BillingFolioTab;
