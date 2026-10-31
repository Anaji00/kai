# Deploying kaiwellnessretreats.com

One Vercel project runs everything:

```
Browser ──► Vercel
             ├─ Next.js site + /portal (proxy.ts login)
             └─ /api/v1/*  ──rewrite──►  api/index.py (FastAPI as a Python function) ──► Neon Postgres
                                                                                   └─► Groq, Resend
```

No separate API server and no `api.` DNS record. Reuse the secret values from your local `.env`.

## 1. Neon (database)
Easiest path: in the Vercel project, open **Storage → Create Database → Neon** (Vercel Marketplace).
It provisions the database and adds `DATABASE_URL` to the project automatically.

Doing it on neon.tech directly works too. Copy the **pooled** connection string (host contains
`-pooler`, ends in `?sslmode=require`) into `DATABASE_URL`.

## 2. Vercel environment variables
**Settings → Environment Variables**, for Production (and Preview if you use preview deploys):

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string (set for you by the Neon integration) |
| `ENVIRONMENT` | `production` |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | from `.env` |
| `JWT_SECRET_KEY`, `TERN_WEBHOOK_SECRET`, `EMAIL_WEBHOOK_SECRET`, `CIRIUM_WEBHOOK_SECRET`, `EXPEDIA_WEBHOOK_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | from `.env` |
| `GROQ_API_KEY` | from https://console.groq.com/keys |
| `NEXT_PUBLIC_SITE_URL` | `https://kaiwellnessretreats.com` |
| `KAREENA_ROUTING_EMAIL` | `kareena@grandtravelcruise.com` |

**Delete `FASTAPI_BACKEND_URL` if you added it earlier.** The site now finds the backend on its own
deployment, and the old value points at an `api.` address that no longer exists.

With `ENVIRONMENT=production`, the API refuses to serve if any secret above is empty or a repo
default. The function log names the missing ones.

Then **Deployments → Redeploy**.

## 3. Load starter data (once)
From your machine, with the Neon string:
```bash
DATABASE_URL="<neon pooled string>" python -m backend.sidecar.services.synthetic_data_seeder
```

## 4. Domains in Vercel
**Settings → Domains:** add `kaiwellnessretreats.com` and `www.kaiwellnessretreats.com`, and set
`www` to redirect to the apex. Note the A-record IP and the www CNAME Vercel displays.

## 5. Squarespace DNS
**Domains → kaiwellnessretreats.com → DNS.**

1. Delete the **Squarespace Defaults** preset (trash icon). This removes all six records:

   | Type | Host | Data |
   |---|---|---|
   | A | @ | 198.185.159.144 |
   | A | @ | 198.185.159.145 |
   | A | @ | 198.49.23.144 |
   | A | @ | 198.49.23.145 |
   | CNAME | www | ext-sq.squarespace.com |
   | HTTPS | @ | `1 . alpn="h2,http/1.1" ipv4hint=...` |

   The **HTTPS** record must go: its `ipv4hint` sends some browsers to Squarespace even after the A
   records change.
2. Under **Custom Records → Add Record**:

   | Type | Host | Data |
   |---|---|---|
   | A | `@` | `76.76.21.21` (or the IP Vercel shows) |
   | CNAME | `www` | the value Vercel shows for www |

3. Leave any MX/TXT (email) records alone.

If the defaults reappear or won't delete, the domain is still attached to a Squarespace website:
disconnect it under **Website → Settings → Domains**, then delete the preset again.

## 6. Verify
- [ ] Vercel shows both domains **Valid Configuration** with certificates.
- [ ] `https://kaiwellnessretreats.com` loads; `www` redirects to it.
- [ ] `https://kaiwellnessretreats.com/api/v1/health` → 200 (Python function is live).
- [ ] `/portal` asks for a login, and after signing in the drafts list loads.
- [ ] A test booking on `/book` succeeds.

The old records had a 4-hour TTL, so some visitors may see Squarespace for up to 4 hours after the switch.

## Limits to know
- Each API request has up to 60 s (`maxDuration` in `vercel.json`). Groq replies take a few seconds.
- The first request after idle time cold-starts the function, adding a second or two while it connects to Neon.

## Later (Phase 3)
Resend domain verification adds DKIM (`resend._domainkey`), SPF/MX on `send.` and a `_dmarc` record.
These are additions only and don't affect the site records above.
