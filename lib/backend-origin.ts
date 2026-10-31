// Origin of the FastAPI backend for server-side calls (server actions, RSC).
// On Vercel the backend is this same deployment (api/index.py), so it falls back to the
// deployment's own URL; locally and in Docker it is the separately running FastAPI server.
export function backendOrigin(): string {
  if (process.env.FASTAPI_BACKEND_URL) return process.env.FASTAPI_BACKEND_URL;
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://127.0.0.1:8000";
}
