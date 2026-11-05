import { NextRequest, NextResponse } from "next/server";
import { backendOrigin } from "@/lib/backend-origin";

/**
 * Staff-Only Portal API Route: POST /api/portal/generate-plan
 * Triggers on-demand AI plan & clinical thesis generation for a guest intake or booking reference.
 * Strictly isolated from the client-facing frontend.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const intakeId = body.intakeId || body.bookingReference;

    if (!intakeId || typeof intakeId !== "string") {
      return NextResponse.json(
        { error: "intakeId or bookingReference is required." },
        { status: 400 }
      );
    }

    const backendUrl = backendOrigin();

    const res = await fetch(
      `${backendUrl}/api/v1/sidecar/intakes/${encodeURIComponent(intakeId)}/generate-plan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          cookie: request.headers.get("cookie") ?? "",
          "X-KAI-CSRF-Token": request.headers.get("X-KAI-CSRF-Token") ?? "",
        },
      }
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: "Generation failed" }));
      return NextResponse.json(
        { error: errData.detail || "Failed to generate staff plan" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Staff portal plan generation error:", error);
    return NextResponse.json(
      { error: "Internal server error in staff plan generation route." },
      { status: 500 }
    );
  }
}

