# KAI Wellness Retreats

> **Clinical Restorative Science • Somatic Breath & Sound • Curated Luxury Travel**  
> Founded by **Kareena Islam**, KAI crafts immersive nervous-system de-escalation retreats across secluded global sanctuaries.

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python 3.11](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?style=flat-square&logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License: Private](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](#)

---

## 🌿 Overview

Modern high-achievers experience chronic sympathetic nervous system overdrive—shallow respiration, systemic inflammation, and constant cognitive friction. 

**KAI Wellness Retreats** bridges evidence-based healthcare with experiential quiet luxury:
1. **Clinical Nursing Foundation**: Supervised by Kareena Islam, integrating physiological vagal stimulation, sleep architecture restoration, and anti-inflammatory culinary design.
2. **Somatic Movement & Acoustic Therapy**: Certified alignment yoga paired with therapeutic 432Hz and 528Hz crystal singing bowl acoustic entrainment.
3. **Curated Luxury Travel Powerhouse**: Backed by a 25+ year host agency heritage alongside Jay Islam (Grand Travel & Cruise, Funjet 500 Club) and recognized by *Future Leaders in Travel*. Delivers unbeatable industry rates, private estate buyouts, sacred access to local elders and customs, and zero-friction VIP logistics.

---

## ✨ Key Features

### Frontend (Next.js 16 App Router & React 19)
- **Quiet Luxury Design Language**: Bespoke warm palette (Linen `#FAF7F2`, Sand `#F2ECE4`, Sage `#2D3E35`, Terracotta `#C07D63`, Olive `#5C6B5E`) with editorial typography using *Cormorant Garamond* and *Plus Jakarta Sans*.
- **Interactive Somatic Sound & Breath Experience**: Built-in Web Audio API synthesizer generating genuine 432Hz (harmonic tranquility) and 528Hz (cellular repair) acoustic frequencies with 4-7-8 somatic breath pacing animations.
- **Grand Travel & Cruise Flight Desk Modal**: Direct flight and transfer intake modal allowing guests to request customized group air, cabin upgrades (Lie-Flat Business, First), and private airport meet-and-greets.
- **Dynamic Sanctuary Pages (`/retreats/[slug]`)**: Rich, SEO-optimized destination profiles (Costa Rica, Amalfi Coast, Bali, Riviera Maya) with daily circadian rhythms, medical/somatic focus highlights, photo galleries, and structured JSON-LD `TouristTrip` schemas.
- **Concierge Booking & Intake Engine**: Multi-tier room selection (Private Villa Sanctuary, Shared Ocean Pavilion), wellness intention tracking, dietary preferences, and resilient Next.js Server Actions.
- **Full SEO & PWA Discovery Suite**: Automated dynamic `sitemap.ts`, `robots.ts`, `manifest.ts`, canonical URLs, OpenGraph/Twitter previews, and Schema.org `Organization` metadata.

### Backend (FastAPI, Pydantic v2 & SQLite)
- **RESTful API Architecture**: Modular FastAPI routers with Pydantic v2 data validation and SQLAlchemy ORM persistence (`kai_sanctuary.db`).
- **Live Cohort Inventory & Dynamic Availability**: Real-time remaining spots calculation deducting active bookings from sanctuary caps (12–14 guests).
- **Grand Travel VIP Logistics Desk**: Intake and coordination queue for private airport transfers and group flight contracts.
- **Somatic Restorative Science Engine**: Endpoints serving acoustic parameters (432Hz/528Hz), vagal breathwork cadences (4-7-8, box breathing), and an interactive clinical stress-to-retreat recommender.
- **Dual-Stack Resilience**: Next.js Server Actions communicate with FastAPI on port 8000 with automatic fallback to local processing if the backend service is offline; Next.js rewrites proxy `/api/v1/:path*` transparently.
- **Interactive OpenAPI Documentation**: Built-in Swagger UI at `http://127.0.0.1:8000/docs` and ReDoc at `http://127.0.0.1:8000/redoc`.

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16 (App Router)](https://nextjs.org) with Turbopack |
| **Client UI & Animations** | [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com), [Framer Motion](https://www.framer.com/motion/) |
| **Icons & Media** | [Lucide React](https://lucide.dev), HTML5 Web Audio API (real-time harmonic oscillators) |
| **Backend Engine** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), Python 3.11 |
| **Data & ORM** | [SQLAlchemy 2.0](https://www.sqlalchemy.org/), [Pydantic v2](https://docs.pydantic.dev/), SQLite |
| **Email & Notifications** | Resend API integration with simulation fallback logging |

---

## 📡 REST API Reference

All backend endpoints are prefixed with `/api/v1` and accessible directly or through the Next.js proxy rewrite:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | System health check, database connectivity, and host agency info |
| `GET` | `/api/v1/retreats` | List all sanctuaries with live dynamic spots calculation (filterable by `year`) |
| `GET` | `/api/v1/retreats/{slug}` | Detailed sanctuary itinerary, clinical focus, and inclusions |
| `GET` | `/api/v1/retreats/{slug}/availability` | Live cohort spot availability status |
| `POST` | `/api/v1/retreats/custom-group` | Inquire for bespoke private group or executive retreats (6–20 guests) |
| `POST` | `/api/v1/bookings` | Submit sanctuary reservation intake with clinical and room preferences |
| `GET` | `/api/v1/bookings/{ref}` | Lookup reservation status and cohort details by reference code |
| `POST` | `/api/v1/concierge/flight-request` | Submit VIP flight coordination request to Grand Travel & Cruise |
| `GET` | `/api/v1/wellness/frequencies` | Bio-acoustic parameters for 432Hz, 528Hz, and 639Hz sound healing |
| `GET` | `/api/v1/wellness/breathwork` | Clinical breathwork cadences (4-7-8, box breathing, coherent HRV) |
| `POST` | `/api/v1/wellness/stress-assessment` | Evaluates sympathetic overdrive and recommends optimal protocol & retreat |
| `POST` | `/api/v1/newsletter/subscribe` | Add email to the private priority circle for confidential cohort releases |
| `GET` | `/api/v1/testimonials` | Curated physician and executive outcome reflections |

Interactive Swagger documentation is available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

---

## 🚀 Quick Start

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/kai.git
cd kai
npm install
pip install -r backend/requirements.txt
```

### 2. Configure Environment Variables

Copy the example configuration file:

```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
FASTAPI_BACKEND_URL="http://127.0.0.1:8000"
RESEND_API_KEY="" # Optional: Add your Resend key for live email dispatch
KAREENA_ROUTING_EMAIL="kareena@kaiwellnessretreats.com"
```

### 3. Start the Development Servers

**Option A: Run Frontend and Backend Together**

In Terminal 1 (FastAPI Backend):
```bash
npm run backend
# or: python backend/run.py
```

In Terminal 2 (Next.js Frontend):
```bash
npm run dev
```

Visit the applications in your browser:
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **FastAPI ReDoc UI**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Verification & Testing

KAI enforces strict zero-warning ESLint, TypeScript, and automated backend test suites:

```bash
# 1. Run Automated Backend Test Suite (All 6 router domains)
python backend/test_api.py

# 2. Run ESLint validation
npm run lint

# 3. Run Next.js production build validation
npm run build
```

---

## 🌐 Production Deployment

### 1. Next.js Frontend Deployment (e.g. Vercel)
1. Push your repository to your Git provider.
2. Import into [Vercel](https://vercel.com/new).
3. Under **Project Settings > Environment Variables**, add:
   - `NEXT_PUBLIC_SITE_URL`: `https://kaiwellnessretreats.com`
   - `FASTAPI_BACKEND_URL`: `https://api.kaiwellnessretreats.com` (or your backend domain)
   - `RESEND_API_KEY`: *(Your production Resend API key)*
   - `KAREENA_ROUTING_EMAIL`: `kareena@kaiwellnessretreats.com`
4. Click **Deploy**.

### 2. FastAPI Backend Deployment (e.g. Render, Railway, Fly.io, or VPS)
Run using Uvicorn in production:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 📂 Project Architecture

```
kai/
├── app/
│   ├── actions/
│   │   └── booking.ts              # Resilient Server Actions (calls FastAPI with local fallback)
│   ├── about/                      # Founder narrative, clinical science, and Grand Travel legacy
│   ├── book/                       # Multi-step luxury concierge reservation intake flow
│   ├── retreats/
│   │   ├── [slug]/page.tsx         # Dynamic destination detail view with JSON-LD TouristTrip
│   │   └── page.tsx                # Complete 2026/2027 calendar and destinations
│   ├── error.tsx                   # Global error boundary UI
│   ├── layout.tsx                  # Master layout, SEO tags, Organization schema
│   ├── loading.tsx                 # Route transition loading spinner
│   ├── manifest.ts                 # Web app manifest for PWA installability
│   ├── not-found.tsx               # Curated 404 recovery view
│   ├── page.tsx                    # Flagship homepage
│   ├── robots.ts                   # Dynamic robots.txt generator
│   └── sitemap.ts                  # Dynamic XML sitemap generator
├── backend/
│   ├── routers/
│   │   ├── health.py               # /api/v1/health
│   │   ├── retreats.py             # /api/v1/retreats, /availability, /custom-group
│   │   ├── bookings.py             # /api/v1/bookings & /bookings/{ref}
│   │   ├── concierge.py            # /api/v1/concierge/flight-request (Grand Travel Desk)
│   │   ├── wellness.py             # /api/v1/wellness/frequencies, /breathwork, /stress-assessment
│   │   ├── newsletter.py           # /api/v1/newsletter/subscribe
│   │   └── testimonials.py         # /api/v1/testimonials
│   ├── services/
│   │   ├── retreats_service.py     # Inventory & dynamic spot calculations
│   │   ├── email_service.py        # Resend API & simulated dual-alert dispatch
│   │   └── wellness_service.py     # Acoustic parameters & vagal cadences
│   ├── config.py                   # Pydantic Settings & environment variables
│   ├── database.py                 # SQLite database engine, session maker, table auto-init
│   ├── models.py                   # SQLAlchemy ORM models (Bookings, Flights, Subscribers, Groups)
│   ├── schemas.py                  # Pydantic v2 validation and serialization schemas
│   ├── run.py                      # Uvicorn launcher script (port 8000)
│   ├── test_api.py                 # Automated API test suite
│   └── requirements.txt            # Python dependencies
├── components/
│   ├── FAQSection.tsx              # Animated, accessible FAQ accordion
│   ├── FlightConciergeModal.tsx    # Grand Travel & Cruise flight desk intake modal
│   ├── Footer.tsx                  # Newsletter subscription, navigation, and API status link
│   ├── Navbar.tsx                  # Responsive glassmorphic navigation with Flight Desk trigger
│   ├── RetreatCard.tsx             # Luxury retreat preview cards
│   ├── SoundAndBreathModal.tsx     # Web Audio 432Hz/528Hz & 4-7-8 breathwork guide
│   └── TestimonialsSection.tsx     # Verified guest reflections & clinical outcomes
├── lib/
│   ├── api.ts                      # Typed TypeScript client for FastAPI backend
│   ├── retreats.ts                 # Sanctuary dataset, pricing, itineraries & queries
│   └── types.ts                    # Core TypeScript interfaces
├── next.config.ts                  # Turbopack root, remote images, and /api/v1 rewrites proxy
└── public/                         # Static assets and media
```

---

## 📄 License & Attribution

© 2026 KAI Wellness Retreats. All rights reserved.  
Curated with intention by **Kareena Islam** (BSN, RN, RYT, Future Leaders in Travel Honoree).  
Partnered with **Grand Travel & Cruise** (Funjet 500 Club Member).
