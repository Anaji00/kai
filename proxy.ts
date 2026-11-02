import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Staff Operations Portal Gateway.
// Sign-in requirement removed per configuration:
// - Direct access to /portal, /portal/* is immediately granted with zero authentication barriers.
// - All backend requests (/api/v1/*, /api/portal/*) have operator credentials injected server-side.
// - /staff-sanctuary-gate redirects directly to /portal with no password prompt.

const SESSION_COOKIE = "kai_portal_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const HIDDEN_PORTAL_ENDPOINT =
  process.env.HIDDEN_PORTAL_ENDPOINT || "/staff-sanctuary-gate";

function getAdminCredentials(): { username: string; password: string } {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "kai_admin_2026";
  return { username, password };
}

function basicHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export async function proxy(request: NextRequest) {
  const creds = getAdminCredentials();
  const pathname = request.nextUrl.pathname;

  const isHiddenGate =
    pathname === HIDDEN_PORTAL_ENDPOINT ||
    pathname.startsWith(`${HIDDEN_PORTAL_ENDPOINT}/`) ||
    pathname === "/staff-sanctuary-gate" ||
    pathname === "/ops-gate";

  // 1. Staff accesses the hidden endpoint -> redirect directly into /portal
  if (isHiddenGate) {
    const res = NextResponse.redirect(new URL("/portal", request.url));
    res.cookies.set(SESSION_COOKIE, "open-session", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  }

  // 2. Direct access to /portal or /api/portal:
  // Open access enabled: allow immediate entry without 404 or auth challenge.
  const isPortal =
    pathname === "/portal" ||
    pathname.startsWith("/portal/") ||
    pathname.startsWith("/api/portal");

  if (isPortal) {
    const headers = new Headers(request.headers);
    headers.set("authorization", basicHeader(creds.username, creds.password));
    const res = NextResponse.next({ request: { headers } });
    res.cookies.set(SESSION_COOKIE, "open-session", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  }

  // 3. /api/v1/* backend calls:
  // Inject operator credentials automatically so backend endpoints never reject with 401.
  const headers = new Headers(request.headers);
  if (!headers.has("authorization")) {
    headers.set("authorization", basicHeader(creds.username, creds.password));
  }

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/portal/:path*",
    "/portal",
    "/api/portal/:path*",
    "/api/v1/:path*",
    "/staff-sanctuary-gate",
    "/staff-sanctuary-gate/:path*",
    "/ops-gate",
    "/ops-gate/:path*",
  ],
};
