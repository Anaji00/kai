import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { backendOrigin } from "./lib/backend-origin";

// Gatekeeper for the operator portal and guest companion. It checks that a session token is
// well signed and unexpired so pages redirect quickly; the backend remains the authority and
// also checks revocation on every API call. The portal is internal and admin-only: guests use
// /my-retreat, and a guest session never opens a portal page.

const ACCESS_COOKIE = "kai_access_token";
const REFRESH_COOKIE = "kai_refresh_token";
const CSRF_COOKIE = "kai_csrf_token";
const GUEST_COOKIE = "kai_guest_session";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
};

function authSecret(): string | null {
  if (process.env.AUTH_SECRET_KEY) return process.env.AUTH_SECRET_KEY;
  return process.env.NODE_ENV === "production" ? null : "kai_dev_only_auth_secret_do_not_use_in_production";
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Verifies an HS256 token with Web Crypto (constant-time) and returns whether it is valid for this role.
async function tokenIsValid(token: string | undefined, secret: string, type: string, role: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    if (header.alg !== "HS256") return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    if (!(await crypto.subtle.verify("HMAC", key, base64UrlToBytes(parts[2]), signed))) return false;
    const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    return claims.typ === type && claims.role === role && typeof claims.exp === "number" && claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

function withSecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value);
  return response;
}

function redirectToLogin(request: NextRequest, loginPath: string): NextResponse {
  const url = new URL(loginPath, request.url);
  url.search = "";
  const { pathname, search } = request.nextUrl;
  if (pathname !== loginPath) url.searchParams.set("next", `${pathname}${search}`);
  return withSecurityHeaders(NextResponse.redirect(url));
}

// Rotates the session for a full page navigation and passes the new cookies to the browser.
// Only navigations do this: parallel prefetches would present the same refresh token and trip replay detection.
async function refreshedResponse(request: NextRequest): Promise<NextResponse | null> {
  const csrf = request.cookies.get(CSRF_COOKIE)?.value;
  if (!csrf) return null;
  try {
    const res = await fetch(`${backendOrigin()}/api/auth/operator/refresh`, {
      method: "POST",
      headers: { cookie: request.headers.get("cookie") ?? "", "X-KAI-CSRF-Token": csrf },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const next = NextResponse.next();
    for (const cookie of res.headers.getSetCookie()) next.headers.append("set-cookie", cookie);
    return next;
  } catch {
    return null;
  }
}

function isDocumentNavigation(request: NextRequest): boolean {
  return request.headers.get("sec-fetch-mode") === "navigate" && !request.headers.has("next-router-prefetch");
}

export async function proxy(request: NextRequest) {
  const response = await route(request);
  // Private areas stay out of search results, without naming them in the public robots.txt.
  if (/^\/(portal|my-retreat)(\/|$)/.test(request.nextUrl.pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

async function route(request: NextRequest): Promise<NextResponse> {
  const { pathname, searchParams } = request.nextUrl;
  const isPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const isGuest = pathname === "/my-retreat" || pathname.startsWith("/my-retreat/");

  // Retired open-access gateways.
  if (pathname === "/staff-sanctuary-gate" || pathname === "/ops-gate") {
    return withSecurityHeaders(NextResponse.redirect(new URL("/portal/login", request.url)));
  }

  if (isPortal || isGuest) {
    const secret = authSecret();
    if (!secret) {
      return withSecurityHeaders(new NextResponse("Sign-in is not configured (AUTH_SECRET_KEY is missing).", { status: 503 }));
    }

    if (isPortal) {
      const signedIn = await tokenIsValid(request.cookies.get(ACCESS_COOKIE)?.value, secret, "access", "ADMIN");
      if (pathname === "/portal/reset-password") {
        // Opened from an emailed link, usually signed out. The token in the link is the credential.
      } else if (pathname === "/portal/login") {
        // With ?next= the API has just rejected this token as revoked, so show the form rather than loop.
        if (signedIn && !searchParams.has("next")) return withSecurityHeaders(NextResponse.redirect(new URL("/portal", request.url)));
      } else if (!signedIn) {
        if (!request.cookies.has(REFRESH_COOKIE)) return redirectToLogin(request, "/portal/login");
        if (!isDocumentNavigation(request)) return withSecurityHeaders(NextResponse.next()); // the client refreshes on its first API 401
        return withSecurityHeaders((await refreshedResponse(request)) ?? redirectToLogin(request, "/portal/login"));
      }
    } else if (pathname !== "/my-retreat/login") {
      // A magic link (?token=) is exchanged by the page, and proposal links (?ref=) carry their own reference.
      const carriesCredential = searchParams.has("token") || searchParams.has("ref");
      if (!carriesCredential && !(await tokenIsValid(request.cookies.get(GUEST_COOKIE)?.value, secret, "guest", "SANCTUARY_GUEST"))) {
        return redirectToLogin(request, "/my-retreat/login");
      }
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest).*)"],
};
