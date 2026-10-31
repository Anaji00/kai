# Deploying kaiwellnessretreats.com

```
Browser ──► Vercel (Next.js site + /portal, proxy.ts login)
              │  /api/v1/* rewrite (baked in at build time)
              ▼
            Railway (FastAPI container from Dockerfile.backend) ──► Neon Postgres
                                                               └─► Groq (LLM + Whisper), Resend (email)
```

| Host | Address |
|---|---|
| Site | `https://kaiwellnessretreats.com` (`www` redirects to it) |
| API | `https://api.kaiwellnessretreats.com` |

Do the steps in order. The secret values are already generated in your local `.env`; reuse them so
Railway and Vercel share the same `ADMIN_PASSWORD`.

## 1. Push the code
Railway and Vercel deploy from GitHub (`Anaji00/kai`). Commit and push the working tree first.

## 2. Neon (database)
1. Create a project (region close to Railway, e.g. US East) and a database named `kai`.
2. Copy the **pooled** connection string (host contains `-pooler`) and make sure it ends in `?sslmode=require`.

## 3. Railway (API)
1. **New Project → Deploy from GitHub repo → `Anaji00/kai`.** Railway reads `railway.json`:
   it builds `Dockerfile.backend` and health-checks `/api/v1/health`.
2. **Variables** (service → Variables):

   | Variable | Value |
   |---|---|
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | Neon pooled string from step 2 |
   | `UVICORN_WORKERS` | `2` |
   | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | from `.env` |
   | `JWT_SECRET_KEY`, `TERN_WEBHOOK_SECRET`, `EMAIL_WEBHOOK_SECRET`, `CIRIUM_WEBHOOK_SECRET`, `EXPEDIA_WEBHOOK_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | from `.env` |
   | `GROQ_API_KEY` | from https://console.groq.com/keys |
   | `KAREENA_ROUTING_EMAIL` | `kareena@grandtravelcruise.com` |
   | `RESEND_API_KEY` | later, once Resend verifies the domain (Phase 3) |

   The service refuses to start if any secret is empty or a repo default; the deploy log names the missing ones.
3. **Settings → Networking → Custom Domain → `api.kaiwellnessretreats.com`.** Railway shows a CNAME
   target (something like `xxxx.up.railway.app`); keep it for step 6.
4. Check `https://<service>.up.railway.app/api/v1/health` returns `200`.
5. Load starter data once, from your machine:
   ```bash
   DATABASE_URL="<neon pooled string>" python -m backend.sidecar.services.synthetic_data_seeder
   ```

## 4. Vercel (site)
1. **Settings → Environment Variables** (Production and Preview):

   | Variable | Value |
   |---|---|
   | `FASTAPI_BACKEND_URL` | `https://api.kaiwellnessretreats.com` |
   | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | same as Railway |
   | `NEXT_PUBLIC_SITE_URL` | `https://kaiwellnessretreats.com` |
   | `KAREENA_ROUTING_EMAIL` | `kareena@grandtravelcruise.com` |

   The build stops with "FASTAPI_BACKEND_URL must be set" until the first one exists. The rewrite is
   fixed at build time, so **redeploy after changing it**.
2. **Settings → Domains:** add `kaiwellnessretreats.com` and `www.kaiwellnessretreats.com`; set `www`
   to redirect to the apex. Note the A-record and CNAME values Vercel shows.
3. **Deployments → Redeploy** (without build cache).

## 5. Lower the TTL (a day ahead, optional)
In Squarespace DNS, set existing records to the shortest TTL so the switch propagates quickly.

## 6. Squarespace DNS cutover
**Domains → kaiwellnessretreats.com → DNS.**

Delete the **Squarespace Defaults** preset — all six records:

| Type | Name | Data |
|---|---|---|
| A | @ | 198.185.159.144 |
| A | @ | 198.185.159.145 |
| A | @ | 198.49.23.144 |
| A | @ | 198.49.23.145 |
| CNAME | www | ext-sq.squarespace.com |
| HTTPS | @ | `1 . alpn="h2,http/1.1" ipv4hint=...` |

The **HTTPS** record matters: its `ipv4hint` lists Squarespace's servers, and browsers that read it
would keep reaching Squarespace after the A records change.

Add these (use the exact values Vercel and Railway display if they differ):

| Type | Name | Data |
|---|---|---|
| A | @ | `76.76.21.21` (Vercel domain card) |
| CNAME | www | value from the Vercel domain card (e.g. `xxxx.vercel-dns-017.com`) |
| CNAME | api | value from Railway (e.g. `xxxx.up.railway.app`) |

Leave any MX/TXT records for email alone. Inquiries go to the grandtravelcruise.com inboxes, which this
change doesn't touch.

## 7. Verify
- [ ] Vercel shows both domains **Valid Configuration** with certificates issued.
- [ ] Railway shows `api.kaiwellnessretreats.com` verified.
- [ ] `https://api.kaiwellnessretreats.com/api/v1/health` → 200.
- [ ] `https://kaiwellnessretreats.com` loads; `https://www.kaiwellnessretreats.com` redirects to it.
- [ ] `https://kaiwellnessretreats.com/api/v1/retreats` → 200 (rewrite reaches Railway).
- [ ] `/portal` asks for a login; `ADMIN_USERNAME` / `ADMIN_PASSWORD` gets in and the drafts list loads.
- [ ] `dig HTTPS kaiwellnessretreats.com` returns nothing pointing at Squarespace.

## Later (Phase 3)
Resend domain verification adds DKIM (`resend._domainkey`), SPF/MX on `send.`, and a `_dmarc` record.
Those are additions only and don't affect the site records above.
