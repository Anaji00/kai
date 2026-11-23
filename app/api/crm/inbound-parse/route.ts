import { NextRequest } from "next/server";
import { parseSmartPasteText, SmartPasteExtractedData } from "@/lib/sidecar-api";
import { backendOrigin } from "@/lib/backend-origin";

export interface StagedInboundEmailItem {
  id: string;
  received_at: string;
  sender: string;
  subject: string;
  raw_text: string;
  extracted: SmartPasteExtractedData;
  status: "STAGED" | "APPROVED";
}

const IS_PROD = process.env.NODE_ENV === "production";

const DEV_SAMPLE_INBOUND_ITEMS: StagedInboundEmailItem[] = [
  {
    id: "inb_vax_84920911",
    received_at: "Sample (Dev)",
    sender: "reservations@vaxvacationaccess.com",
    subject: "Fw: VAX VacationAccess Confirmation #84920911 — Marival Armony (Elena & Nadia Rostova)",
    raw_text:
      "VAX Reservation #84920911 (Funjet Vacations). Passengers: Elena Rostova (elena.rostova@atelier.io, +1 212-555-0143) & companion Nadia Rostova. Flights: United UA-1804 out of EWR and UA-1582 out of IAH to PVR. Two-Bedroom Oceanfront Swim-Up Suite ($13,400 total, $4,020 deposit paid). Dietary: Vegan, Gluten-Free, Nut-Free.",
    extracted: parseSmartPasteText(
      "VAX Reservation #84920911 (Funjet Vacations). Passengers: Elena Rostova (elena.rostova@atelier.io, +1 212-555-0143) & companion Nadia Rostova. Flights: United UA-1804 out of EWR and UA-1582 out of IAH to PVR. Two-Bedroom Oceanfront Swim-Up Suite ($13,400 total, $4,020 deposit paid). Dietary: Vegan, Gluten-Free, Nut-Free.",
      "puerto-vallarta-2027"
    ),
    status: "STAGED",
  },
];

function mapBackendEmailToInboundItem(row: Record<string, unknown>): StagedInboundEmailItem {
  const rawBody = String(row.raw_body || "");
  const subject = String(row.subject || "Inbound Concierge Email");
  const sender = String(row.sender || "unknown@sender");
  const rawStatus = String(row.status || "PENDING_APPROVAL").toUpperCase();
  const createdAt = row.created_at ? String(row.created_at) : new Date().toISOString();

  return {
    id: String(row.id || `inb_${Date.now()}`),
    received_at: createdAt,
    sender,
    subject,
    raw_text: rawBody,
    extracted: parseSmartPasteText(`${subject}\n${rawBody}`, "puerto-vallarta-2027"),
    status: rawStatus === "APPROVED" ? "APPROVED" : "STAGED",
  };
}

function forwardAuthHeaders(request: NextRequest): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const cookie = request.headers.get("cookie");
  if (cookie) headers["cookie"] = cookie;
  const csrf = request.headers.get("X-KAI-CSRF-Token");
  if (csrf) headers["X-KAI-CSRF-Token"] = csrf;
  const sig = request.headers.get("X-KAI-Webhook-Signature");
  if (sig) headers["X-KAI-Webhook-Signature"] = sig;
  const hubSig = request.headers.get("X-Hub-Signature-256");
  if (hubSig) headers["X-Hub-Signature-256"] = hubSig;
  return headers;
}

export async function GET(request: NextRequest) {
  const backendUrl = backendOrigin();
  try {
    const res = await fetch(`${backendUrl}/api/v1/sidecar/email-in`, {
      method: "GET",
      headers: forwardAuthHeaders(request),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return Response.json(
        { error: "Operator authentication required." },
        { status: res.status }
      );
    }

    if (res.ok) {
      const rows = (await res.json()) as Array<Record<string, unknown>>;
      const items = rows.map(mapBackendEmailToInboundItem);
      return Response.json({
        inbox_address: "import@kaiwellnessretreats.com",
        count: items.length,
        items,
      });
    }

    if (IS_PROD) {
      return Response.json(
        { error: "Failed to load staged inbound emails from backend." },
        { status: res.status }
      );
    }
  } catch (err) {
    if (IS_PROD) {
      return Response.json(
        { error: err instanceof Error ? err.message : "Backend inbound email service unavailable." },
        { status: 503 }
      );
    }
  }

  return Response.json({
    inbox_address: "import@kaiwellnessretreats.com",
    count: DEV_SAMPLE_INBOUND_ITEMS.length,
    items: DEV_SAMPLE_INBOUND_ITEMS,
    dev_fallback: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const rawText = String(body.text || body.raw_text || body.raw_body || body.body || "").trim();
    const sender = String(body.from || body.sender || "forwarded@grandtravelcruise.com").trim();
    const subject = String(body.subject || "Forwarded Client Booking Confirmation").trim();
    const recipient = String(body.to || body.recipient || "import@kaiwellnessretreats.com").trim();
    const fallbackSanctuary = String(body.sanctuary_slug || "puerto-vallarta-2027").trim();

    if (!rawText) {
      return Response.json(
        { error: "Missing email or WhatsApp body text (`text` or `raw_text`)." },
        { status: 400 }
      );
    }

    const backendUrl = backendOrigin();
    const res = await fetch(`${backendUrl}/api/v1/sidecar/email-in/ingest`, {
      method: "POST",
      headers: forwardAuthHeaders(request),
      body: JSON.stringify({
        sender,
        recipient,
        subject,
        raw_body: rawText,
      }),
      cache: "no-store",
    });

    if (res.status === 401 || res.status === 403) {
      return Response.json(
        { error: "Valid operator session or HMAC webhook signature required." },
        { status: res.status }
      );
    }

    if (res.ok) {
      const saved = (await res.json()) as Record<string, unknown>;
      const item = mapBackendEmailToInboundItem(saved);
      return Response.json(
        {
          success: true,
          message: `Staged inbound booking for ${item.extracted.guest_name} (${item.extracted.airline} ${item.extracted.flight_number} · $${item.extracted.total_investment.toLocaleString()} USD).`,
          item,
        },
        { status: 201 }
      );
    }

    if (IS_PROD) {
      const errBody = await res.json().catch(() => ({}));
      return Response.json(
        { error: errBody.detail || "Failed to persist inbound email to database." },
        { status: res.status }
      );
    }

    // Development-only offline fallback when FastAPI isn't running locally
    const extracted = parseSmartPasteText(rawText, fallbackSanctuary);
    const stagedItem: StagedInboundEmailItem = {
      id: `inb_dev_${Date.now()}`,
      received_at: "Just now (Dev)",
      sender,
      subject,
      raw_text: rawText,
      extracted,
      status: "STAGED",
    };

    return Response.json({
      success: true,
      message: `Parsed inbound booking for ${extracted.guest_name} (${extracted.airline} ${extracted.flight_number} · $${extracted.total_investment.toLocaleString()} USD).`,
      item: stagedItem,
      dev_fallback: true,
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to parse inbound payload" },
      { status: 500 }
    );
  }
}
