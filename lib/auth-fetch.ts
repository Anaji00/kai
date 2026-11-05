// Browser fetch wrapper for the session cookies: sends credentials, attaches the CSRF header on
// mutating requests, and on a 401 tries one silent refresh before sending the user to sign in.

const CSRF_COOKIE = "kai_csrf_token";
const GUEST_CSRF_COOKIE = "kai_guest_csrf_token";
const CSRF_HEADER = "X-KAI-CSRF-Token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const path = window.location.pathname;
  const cookie = path === "/my-retreat" || path.startsWith("/my-retreat/") ? GUEST_CSRF_COOKIE : CSRF_COOKIE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${cookie}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function withAuth(init: RequestInit): RequestInit {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const csrf = readCsrfToken();
  if (MUTATING_METHODS.has(method) && csrf) headers.set(CSRF_HEADER, csrf);
  return { ...init, headers, credentials: "include" };
}

let refreshInFlight: Promise<boolean> | null = null;

async function postRefresh(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/operator/refresh", withAuth({ method: "POST" }));
    return res.ok;
  } catch {
    return false;
  }
}

// One refresh at a time, across tabs where the browser supports it: a second concurrent refresh
// would present an already rotated token, which the server treats as theft and ends the session.
function refreshOnce(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const run = async (): Promise<boolean> =>
    typeof navigator !== "undefined" && navigator.locks
      ? await navigator.locks.request("kai-session-refresh", postRefresh)
      : await postRefresh();
  const inFlight = run().finally(() => {
    refreshInFlight = null;
  });
  refreshInFlight = inFlight;
  return inFlight;
}

function redirectToSignIn(loginPath: string): void {
  const next = `${window.location.pathname}${window.location.search}`;
  window.location.assign(`${loginPath}?next=${encodeURIComponent(next)}`);
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  // Server-side calls have no browser session.
  if (typeof window === "undefined") return fetch(input, init);

  const response = await fetch(input, withAuth(init));
  if (response.status !== 401) return response;

  const path = window.location.pathname;
  if (path === "/portal/login" || path === "/portal/reset-password" || path === "/my-retreat/login") return response;

  if (path === "/my-retreat" || path.startsWith("/my-retreat/")) {
    // A proposal link works without a session, so a 401 there is not a reason to leave the page.
    if (!new URLSearchParams(window.location.search).has("ref")) redirectToSignIn("/my-retreat/login");
    return response;
  }
  if (path !== "/portal" && !path.startsWith("/portal/")) return response;

  if (await refreshOnce()) return fetch(input, withAuth(init));
  redirectToSignIn("/portal/login");
  return response;
}
