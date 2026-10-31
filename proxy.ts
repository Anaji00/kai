import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Founder portal gate. Admin credentials live only in server env and never reach the browser:
// operators authenticate once via HTTP Basic on /portal, receive an HttpOnly session cookie,
// and this proxy injects the backend Basic header onto their /api/v1 calls.

const SESSION_COOKIE = "kai_portal_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const REALM = "KAI Founder Portal";

function getAdminCredentials(): { username: string; password: string } | null {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV !== "production" ? "kai_admin_2026" : "");
  return password ? { username, password } : null;
}

async function sessionToken(username: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(`${username}:${password}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("kai-portal-session-v1"));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function basicHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function challenge(): NextResponse {
  return new NextResponse("Founder portal authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export async function proxy(request: NextRequest) {
  const creds = getAdminCredentials();
  const isPortal = request.nextUrl.pathname.startsWith("/portal");

  if (!creds) {
    // Production without ADMIN_PASSWORD: fail closed for the portal, leave public API traffic untouched.
    return isPortal
      ? new NextResponse("Founder portal is not configured (ADMIN_PASSWORD missing).", { status: 503 })
      : NextResponse.next();
  }

  const expected = await sessionToken(creds.username, creds.password);
  const hasSession = safeEqual(request.cookies.get(SESSION_COOKIE)?.value ?? "", expected);

  if (isPortal) {
    if (hasSession) return NextResponse.next();
    const provided = request.headers.get("authorization") ?? "";
    if (!safeEqual(provided, basicHeader(creds.username, creds.password))) {
      return challenge();
    }
    const res = NextResponse.next();
    res.cookies.set(SESSION_COOKIE, expected, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  }

  // /api/v1/*: authenticated operators get the backend admin header added server-side.
  // Anonymous traffic (guests, bookings, provider webhooks) passes through for the backend to judge.
  if (hasSession) {
    const headers = new Headers(request.headers);
    headers.set("authorization", basicHeader(creds.username, creds.password));
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/portal", "/api/v1/:path*"],
};
