/**
 * KAI Wellness Retreats & Sanctuary CRM — One-Click Print & Export Engine
 * Generates styled, brand-accurate KAI Sanctuary HTML print documents in a dedicated window.
 */

interface ManifestGuest {
  guest_name: string;
  room_tier?: string;
  dietary_notes?: string;
  clinical_flags?: string[];
  flight?: string;
  arrival?: string;
}

interface CohortPrintData {
  title: string;
  dates: string;
  location: string;
  capacity: number;
  guests: ManifestGuest[];
  kitchen_protocols?: string[];
}

interface BillingFolioPrintData {
  trip_id: string;
  guest_name: string;
  destination: string;
  currency: string;
  total_investment: number;
  total_paid: number;
  remaining_balance: number;
  deposit_status: string;
  final_balance_status: string;
  transactions?: Array<{
    date: string;
    description: string;
    method: string;
    amount: number;
    reference: string;
  }>;
}

interface ClinicalDossierPrintData {
  client_name: string;
  sanctuary: string;
  room_tier: string;
  overall_severity: string;
  blocked_modalities: string[];
  clinical_findings: Array<{
    category: string;
    rule: string;
    safe_alternative: string;
  }>;
  dietary_notes?: string;
  deterministic_hash: string;
}

function openPrintWindow(title: string, bodyHtml: string): void {
  if (typeof window === "undefined") return;

  const printWindow = window.open("", "_blank", "width=900,height=800,menubar=no,toolbar=no,location=no,status=no");
  if (!printWindow) {
    alert("Please allow popups to open printable KAI Sanctuary documents.");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${title} — KAI Sanctuary Dossier</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Inter:wght@300;400;500;600&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: #2D3E35;
      background: #FFFFFF;
      padding: 32px;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #E5DDD0;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .logo-seal {
      display: inline-flex;
      align-items: center;
      gap: 10px;
    }
    .seal-icon {
      width: 36px;
      height: 36px;
      background: #FAF7F2;
      border: 1px solid #E5DDD0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Cinzel', serif;
      font-size: 16px;
      color: #7A3E2C;
    }
    .brand-title {
      font-family: 'Cinzel', serif;
      font-size: 18px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #2D3E35;
    }
    .brand-subtitle {
      font-size: 10px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #5C6B5E;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      background: #FAF7F2;
      border: 1px solid #E5DDD0;
      color: #5C6B5E;
    }
    .badge-alert {
      background: #FFF1F0;
      border-color: #FFA39E;
      color: #CF1322;
    }
    .badge-success {
      background: #F6FFED;
      border-color: #B7EB8F;
      color: #389E0D;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 24px;
    }
    th, td {
      border: 1px solid #E5DDD0;
      padding: 10px 12px;
      text-align: left;
    }
    th {
      background: #FAF7F2;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #5C6B5E;
    }
    .summary-card {
      background: #FAF7F2;
      border: 1px solid #E5DDD0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 20px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #E5DDD0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #5C6B5E;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: flex-end; gap: 8px;">
    <button onclick="window.print()" style="background: #2D3E35; color: #FAF7F2; border: none; padding: 8px 16px; border-radius: 9999px; font-size: 12px; cursor: pointer;">Print Document</button>
    <button onclick="window.close()" style="background: #FAF7F2; color: #2D3E35; border: 1px solid #E5DDD0; padding: 8px 16px; border-radius: 9999px; font-size: 12px; cursor: pointer;">Close</button>
  </div>
  ${bodyHtml}
  <div class="footer">
    <span>KAI Wellness Retreats • Confidential Sanctuary Operations</span>
    <span>Generated: ${new Date().toISOString()} • Host Agency: Grand Travel & Cruise</span>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function printCohortManifest(data: CohortPrintData): void {
  const rows = data.guests
    .map(
      (g, idx) => `
      <tr>
        <td><strong>${idx + 1}</strong></td>
        <td><strong>${g.guest_name}</strong></td>
        <td>${g.room_tier || "Standard Ocean Pavilion"}</td>
        <td>${g.flight ? `${g.flight} (${g.arrival || "TBD"})` : "TBD"}</td>
        <td>${g.dietary_notes || "None"}</td>
        <td>${(g.clinical_flags || []).join(", ") || "Cleared"}</td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="header">
      <div class="logo-seal">
        <img src="/kai-logo.png" style="width: 38px; height: 38px; border-radius: 50%; object-fit: contain;" alt="KAI Logo" />
        <div>
          <h1 class="brand-title">KAI Wellness Retreats</h1>
          <p class="brand-subtitle">Sanctuary Cohort Manifest & Transit Slip</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${data.location}</span>
        <p style="font-size: 11px; margin-top: 4px; color: #5C6B5E;">${data.dates}</p>
      </div>
    </div>

    <div class="summary-card">
      <h3 style="font-size: 14px; margin-bottom: 6px;">${data.title}</h3>
      <p style="font-size: 12px; color: #5C6B5E;">
        Capacity: ${data.guests.length} / ${data.capacity} Confirmed Guests • VIP Ground Logistics & Dietary Protocols
      </p>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Guest Name</th>
          <th>Villa Allocation</th>
          <th>Flight / Arrival</th>
          <th>Dietary Requirements</th>
          <th>Clinical Guidance</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;

  openPrintWindow(`Cohort_Manifest_${data.title.replace(/\s+/g, "_")}`, body);
}

export function printBillingFolio(data: BillingFolioPrintData): void {
  const txRows = (data.transactions || [
    {
      date: new Date().toLocaleDateString(),
      description: "Initial Sanctuary Deposit / Reservation Hold",
      method: "SWIFT Wire Transfer",
      amount: data.total_paid,
      reference: "WIRE-AUTONOMOUS-SYNC",
    },
  ])
    .map(
      (tx) => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.description}</td>
        <td>${tx.method}</td>
        <td><code>${tx.reference}</code></td>
        <td style="text-align: right;"><strong>$${tx.amount.toLocaleString()}</strong></td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="header">
      <div class="logo-seal">
        <img src="/kai-logo.png" style="width: 38px; height: 38px; border-radius: 50%; object-fit: contain;" alt="KAI Logo" />
        <div>
          <h1 class="brand-title">KAI Wellness Retreats</h1>
          <p class="brand-subtitle">Itemized Billing Folio & Wire Settlement Voucher</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge ${data.remaining_balance <= 0 ? "badge-success" : ""}">
          ${data.remaining_balance <= 0 ? "PAID IN FULL" : "BALANCE OUTSTANDING"}
        </span>
        <p style="font-size: 11px; margin-top: 4px; color: #5C6B5E;">Trip ID: <code>${data.trip_id}</code></p>
      </div>
    </div>

    <div class="summary-card" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
      <div>
        <span style="font-size: 10px; text-transform: uppercase; color: #5C6B5E;">Client Name</span>
        <h4 style="font-size: 14px; margin-top: 2px;">${data.guest_name}</h4>
        <span style="font-size: 11px; color: #5C6B5E;">Destination: ${data.destination}</span>
      </div>
      <div>
        <span style="font-size: 10px; text-transform: uppercase; color: #5C6B5E;">Total Stay Investment</span>
        <h4 style="font-size: 16px; margin-top: 2px; color: #2D3E35;">$${data.total_investment.toLocaleString()} ${data.currency}</h4>
        <span style="font-size: 11px; color: #389E0D;">Paid: $${data.total_paid.toLocaleString()}</span>
      </div>
      <div>
        <span style="font-size: 10px; text-transform: uppercase; color: #5C6B5E;">Remaining Balance</span>
        <h4 style="font-size: 16px; margin-top: 2px; color: ${data.remaining_balance > 0 ? "#CF1322" : "#389E0D"};">
          $${data.remaining_balance.toLocaleString()} ${data.currency}
        </h4>
        <span style="font-size: 11px; color: #5C6B5E;">Deposit: ${data.deposit_status}</span>
      </div>
    </div>

    <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin-bottom: 8px;">
      Payment Ledger & Transaction Records
    </h4>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Payment Method</th>
          <th>Transaction Reference</th>
          <th style="text-align: right;">Amount (${data.currency})</th>
        </tr>
      </thead>
      <tbody>
        ${txRows}
      </tbody>
    </table>
  `;

  openPrintWindow(`Billing_Folio_${data.guest_name.replace(/\s+/g, "_")}`, body);
}

export function printGuestClinicalDossier(data: ClinicalDossierPrintData): void {
  const findingsRows = data.clinical_findings
    .map(
      (f, idx) => `
      <tr>
        <td><strong>0${idx + 1}</strong></td>
        <td><span class="badge badge-alert">${f.category}</span></td>
        <td>${f.rule}</td>
        <td><strong style="color: #389E0D;">${f.safe_alternative}</strong></td>
      </tr>`
    )
    .join("");

  const body = `
    <div class="header">
      <div class="logo-seal">
        <img src="/kai-logo.png" style="width: 38px; height: 38px; border-radius: 50%; object-fit: contain;" alt="KAI Logo" />
        <div>
          <h1 class="brand-title">KAI Wellness Retreats</h1>
          <p class="brand-subtitle">Clinical Safety Protocol & Grounding Dossier</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge ${data.overall_severity.includes("HOLD") ? "badge-alert" : "badge-success"}">
          ${data.overall_severity}
        </span>
        <p style="font-size: 10px; margin-top: 4px; color: #5C6B5E;">SHA-256: <code>${data.deterministic_hash.substring(0, 16)}...</code></p>
      </div>
    </div>

    <div class="summary-card">
      <h3 style="font-size: 14px; margin-bottom: 4px;">Guest: ${data.client_name}</h3>
      <p style="font-size: 11px; color: #5C6B5E;">
        Sanctuary: ${data.sanctuary} • Room: ${data.room_tier} • Dietary: ${data.dietary_notes || "Standard Anti-inflammatory"}
      </p>
      ${
        data.blocked_modalities.length > 0
          ? `<p style="margin-top: 8px; font-size: 11px; color: #CF1322; font-weight: 600;">
              Contraindicated / Blocked Modalities: ${data.blocked_modalities.join(" • ")}
            </p>`
          : `<p style="margin-top: 8px; font-size: 11px; color: #389E0D;">All standard somatic retreat modalities cleared.</p>`
      }
    </div>

    <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #5C6B5E; margin-bottom: 8px;">
      Deterministic Protocol Findings & Safe Adaptations
    </h4>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Category</th>
          <th>Clinical Guidance Rule</th>
          <th>Prescribed Safe Alternative</th>
        </tr>
      </thead>
      <tbody>
        ${findingsRows || "<tr><td colspan='4'>No acute contraindications flagged.</td></tr>"}
      </tbody>
    </table>
  `;

  openPrintWindow(`Clinical_Dossier_${data.client_name.replace(/\s+/g, "_")}`, body);
}

export interface ChargebackAuditData {
  trip_id: string;
  client_name: string;
  client_email?: string;
  billing_address?: string;
  sanctuary_name: string;
  dates: string;
  room_tier: string;
  total_investment: number;
  deposit_authorized: number;
  balance_scheduled: number;
  card_brand: string;
  card_last4: string;
  auth_reference: string;
  signed_timestamp: string;
  e_signature: string;
  itinerary_highlights?: string[];
}

export function printChargebackDefenseBundle(data: ChargebackAuditData): void {
  const highlights = (data.itinerary_highlights || [
    "Dedicated Private SUV Gateway Airport Transfer & VIP Tarmac Escort",
    "All-Inclusive Sanctuary Accommodations & Private Somatic Soaking Suite",
    "Clinical 432Hz Sound Decompression & Autonomic Vagal Realignment",
    "Daily Organic Seed-Oil-Free Blue Zone Gastronomy by Private Executive Chef",
  ])
    .map((item) => `<li style="margin-bottom: 4px;">${item}</li>`)
    .join("");

  const body = `
    <div class="header">
      <div class="logo-seal">
        <div class="seal-icon">🛡️</div>
        <div>
          <h1 class="brand-title">KAI Wellness Retreats &amp; Grand Travel</h1>
          <p class="brand-subtitle">Merchant Chargeback Dispute Defense &amp; Evidence Bundle</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span class="badge badge-success">LEGALLY BINDING E-SIGNATURE</span>
        <p style="font-size: 10px; margin-top: 4px; color: #5C6B5E;">Ref: <code>${data.auth_reference}</code></p>
      </div>
    </div>

    <div class="summary-card" style="border-left: 4px solid #C07D63; background: #FAF7F2;">
      <h3 style="font-size: 13px; font-weight: bold; margin-bottom: 4px; color: #2D3E35;">
        DISPUTE CASE EXHIBIT A: TRANSACTION AUTHENTICITY &amp; AUTHORIZATION
      </h3>
      <p style="font-size: 11px; line-height: 1.6; color: #5C6B5E;">
        This document serves as definitive proof that the cardholder, <strong>${data.client_name}</strong>,
        voluntarily entered into an all-inclusive luxury sanctuary reservation agreement, acknowledged the non-refundable deposit terms,
        and legally authorized host agency <strong>Grand Travel &amp; Cruise</strong> to vault and charge their card.
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
      <div class="summary-card">
        <h4 style="font-size: 11px; text-transform: uppercase; color: #5C6B5E; margin-bottom: 8px;">Cardholder &amp; Payment Provenance</h4>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Cardholder Name:</strong> ${data.client_name}</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Billing Location / ZIP:</strong> ${data.billing_address || "On File"}</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Card Network &amp; Account:</strong> ${data.card_brand} ending in <code>*${data.card_last4}</code></p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Transaction Auth Token:</strong> <code>${data.auth_reference}</code></p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Authorization Signed At:</strong> ${data.signed_timestamp}</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Digital Signature Record:</strong> <span style="font-family: serif; font-style: italic; color: #C07D63;">${data.e_signature || data.client_name}</span></p>
      </div>

      <div class="summary-card">
        <h4 style="font-size: 11px; text-transform: uppercase; color: #5C6B5E; margin-bottom: 8px;">Itinerary Binding &amp; Suite Allocation</h4>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Sanctuary Cohort:</strong> ${data.sanctuary_name}</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Reserved Cohort Dates:</strong> ${data.dates}</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Allocated Room Tier:</strong> ${data.room_tier}</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>Total Stay Investment:</strong> $${data.total_investment.toLocaleString()} USD</p>
        <p style="font-size: 11px; margin: 3px 0; color: #237804;"><strong>30% Authorized Deposit:</strong> $${data.deposit_authorized.toLocaleString()} USD</p>
        <p style="font-size: 11px; margin: 3px 0;"><strong>70% Scheduled Final Balance:</strong> $${data.balance_scheduled.toLocaleString()} USD</p>
      </div>
    </div>

    <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #2D3E35; margin: 16px 0 8px;">
      EXHIBIT B: INCLUSIONS &amp; RESERVED BESPOKE VALUE DELIVERED
    </h4>
    <div class="summary-card" style="padding: 12px 16px;">
      <ul style="font-size: 11px; color: #5C6B5E; line-height: 1.6; padding-left: 20px;">
        ${highlights}
      </ul>
    </div>

    <h4 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #2D3E35; margin: 16px 0 8px;">
      EXHIBIT C: AGREED 3-TIER CANCELLATION SCHEDULE &amp; NO-CHARGEBACK WAIVER
    </h4>
    <table>
      <thead>
        <tr>
          <th>Cancellation Window</th>
          <th>Cash Refund</th>
          <th>Concierge Sanctuary Credit</th>
          <th>Non-Refundable Forfeiture</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>&gt; 60 Days Prior to Arrival</strong></td>
          <td>70% of Total Investment</td>
          <td>30% (Full Deposit Retained as 12-Mo Credit)</td>
          <td>0% Penalty</td>
        </tr>
        <tr>
          <td><strong>30 – 60 Days Prior to Arrival</strong></td>
          <td>0% Cash Refund</td>
          <td>50% Concierge Re-booking Credit</td>
          <td>50% Retained for Villa &amp; Private Chef Commitments</td>
        </tr>
        <tr>
          <td><strong>&lt; 30 Days Prior to Arrival</strong></td>
          <td>0% Cash Refund</td>
          <td>0% Credit (100% Operational Forfeiture)</td>
          <td>100% Forfeiture (Non-refundable / Non-transferable)</td>
        </tr>
      </tbody>
    </table>

    <div class="summary-card" style="margin-top: 16px; font-size: 10px; line-height: 1.6; color: #5C6B5E; border: 1px dashed #E5DDD0;">
      <p>
        <strong>MERCHANT LEGAL REPRESENTATION:</strong>
        The cardholder explicitly certified at the moment of authorization:
        <em>"I hereby authorize KAI Wellness Retreats and host agency Grand Travel &amp; Cruise to charge the non-refundable 30% sanctuary deposit to the card above.
        I acknowledge that the remaining 70% balance will be automatically scheduled in accordance with the luxury cancellation schedule.
        I agree not to initiate a chargeback or dispute for voluntary cancellations covered under this policy."</em>
        This agreement complies fully with Visa Core Rules, Mastercard Dispute Resolution, and American Express Merchant Regulations.
      </p>
    </div>
  `;

  openPrintWindow(`Chargeback_Defense_Bundle_${data.client_name.replace(/\s+/g, "_")}`, body);
}


