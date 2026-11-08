# 🌿 KAI Sanctuary & Wellness Retreats — Platform & Team Guide

> **Internal Operations Manual & Architecture Guide for Kareena Islam, RN, Armaan Islam & the KAI Team**  
> *Sanctuary Operations • Host Agency Partner: Grand Travel & Cruise • Independent Sovereign CRM & Clinical Intelligence Core*

---

## 💡 What is KAI? (Executive Overview)

KAI curates quiet luxury, medically informed wellness sanctuaries in Costa Rica, the Amalfi Coast, Bali, Riviera Maya, and Puerto Vallarta.
* **Who it's for**: High-performing professionals, founders, and physicians seeking autonomic nervous system reset, deep circadian recovery, and cellular restoration.
* **Clinical Leadership**: Founded by **Kareena Islam, BSN, RN**, uniting high-acuity nursing science with 432Hz crystal singing bowl acoustic restoration and anatomical movement.
* **Strategic & Travel Backing**: Co-founded with **Armaan Islam**, backed by 25+ years of host agency mastery at **Grand Travel & Cruise** (elite Funjet 500 Club member) for private villa buyouts, contracted first-class lie-flat air, and VIP chauffeured transfers.
* **The Golden Invariant**: Strictly **12 to 14 guests per retreat**—never overcrowded, always tranquil, intimate, and personalized.

---

## 🛡️ Core Architectural Invariants

### 1. Strict Human-in-the-Loop (HITL) Sovereign State Mutation
**The AI never autonomously writes to external systems or commits irreversible state.**
* **All outputs are staged as versioned drafts**: Every outreach email, SMS alert, chauffeur adjustment, or folio update is held in the Action Review Queue (`/portal/drafts`).
* **1-Click Human Approval**: Staff review, edit, and click **"Approve & Dispatch"**. Only then is the email transmitted, SMS sent, or reservation synced directly to the Sanctuary Database.
* **Zero Autonomous Drift**: High-net-worth guests always receive verified, warm, personal communication from a real nurse clinician.

### 2. Deterministic Clinical Safety Before Probabilistic AI
Probabilistic LLMs are **never** the sole arbiter of medical safety or modality clearances.
* A synchronous Python clinical rules engine (`DeterministicClinicalEngine`) executes *before* any text generation.
* Detects medication contraindications (SSRIs/SNRIs $\rightarrow$ blocks Holotropic Hyperventilation Breathwork; Anticoagulants $\rightarrow$ blocks High-Velocity Deep Tissue; Hypertension $\ge 160/100$ mmHg $\rightarrow$ blocks Cold Plunge / High-Heat Saunas).
* Injects an immutable, cryptographically hashed `ClinicalEvaluationReport` into all staff tools and dossiers as ground truth.

### 3. Cryptographic Optimistic Concurrency Control (OCC)
* Staged drafts capture a canonical SHA-256 version hash of the target record at creation time.
* If a record is modified elsewhere before approval, the system detects state drift and returns a friendly visual 3-way difference view (`Field` | `Original Draft` | `Current Database` | `Proposed Changes`) with optional force-approval override.

---

## 📊 The KAI Operations Portal (`/portal`)

Log in to the staff operations portal at **`http://localhost:3536/portal`**. All screens use clean, non-technical language tailored for retreat coordinators:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           KAI OPERATIONS PORTAL WORKSPACE                         │
├─────────────────┬─────────────────────────────────────────────────────────────────┤
│ Screen          │ What Staff Use It For                                           │
├─────────────────┼─────────────────────────────────────────────────────────────────┤
│ 1. Inquiries    │ Review inbound guest intake forms with nurse cheat-sheets.      │
│ 2. Drafts Queue │ 1-Click approval center for staged emails, texts, & updates.     │
│ 3. Sovereign CRM│ 7-Tab hub with Monday.com-style spreadsheet, folios, & profiles.│
│ 4. Calendar     │ Visual cohort schedule with 14-guest capacity meters & flights. │
│ 5. Logistics    │ Interactive map view, chauffeur routes, 4WD vehicles, & clinics.│
│ 6. Vendors      │ Luxury chauffeurs, private chefs, sound healers, & rate cards.  │
│ 7. Partners     │ Outreach list for vetted medical spas and yoga studios.         │
│ 8. Broadcasts   │ Staged mass SMS announcements to retreat alumni.                │
│ 9. Audit & Room │ Compare room vouchers against guest rosters to prevent errors.  │
│ 10. Inbox       │ Shared travel desk email organizer.                             │
│ 11. Connections │ Live system connections for flight radar and text gateways.     │
│ 12. Copilot     │ Floating voice-enabled clinical & operations ChatGPT-style AI.  │
└─────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 📋 The Monday.com-Style Vacation & Attendee Spreadsheet Grid

Located at **`/portal/crm`** under the **Attendee Spreadsheet** tab, this interactive grid gives staff immediate, spreadsheet-style control over every guest:

### Key Capabilities
* **Grouped Lifecycle Containers**:
  * 🟢 **Confirmed Sanctuary Guests**: Shows confirmed attendees, group revenue, paid sum, and remaining balance due.
  * 🟡 **Inquiries & Deposit Pending**: Tracks pending deposits and intake reviews.
  * 🟣 **Waitlist & Completed Journeys**: Manages waitlist positions and past retreat archives.
* **100% Inline-Editable Cells**:
  * **Guest Name & Contact**: Click to edit full name, email, and phone with avatar initials.
  * **Retreat Location**: Dropdown with country flags (🇲🇽 Puerto Vallarta, 🇨🇷 Nosara, 🇮🇹 Amalfi Coast, 🇮🇩 Sacred Springs Bali, 🇺🇸 Sedona).
  * **Travel Dates**: Integrated Check-In and Check-Out date pickers with automatic night calculation (e.g. `Nov 14 → Nov 21 · 7n`).
  * **Room & Suite**: Dropdown (Oceanfront Villa Suite, Master Sanctuary Villa, Garden Canopy Suite, Cliffside Sunset Pavilion) + room number.
  * **RSVP Status**: Monday.com signature vibrant color blocks (Confirmed [Emerald], Deposit Paid [Amber], In Review [Sky], Waitlist [Purple], Completed [Slate]).
  * **Package Total ($) & Paid ($)**: Clean inline currency inputs.
  * **Remaining Balance ($)**: Auto-calculated indicator showing `Paid in Full ✓` (green) or `⚠️ $X,XXX Due` (amber).
  * **Flight & Chauffeur**: Status chip (`Flight Booked & Chauffeur Set`, `Awaiting Flight Details`, etc.) + flight number notes.
  * **Dietary & Health**: Inline text cell for food allergies and movement preferences.
  * **Nurse Safety Clearance**: Status badge (`Cleared by Nurse`, `Awaiting Medical Intake`, `Special Attention`).
* **One-Click Actions & Exports**:
  * **`+ Add Attendee Row`**: Inserts a new row with instant focus.
  * **`Export to Excel (CSV)`**: Formatted `.csv` download ready for Microsoft Excel or Google Sheets.
  * **`Print Roster`**: Generates a clean printable cohort manifest.
  * **Row Actions**: 1-click **Print Guest Dossier**, **Duplicate Row**, and **Delete Row**.
  * **Direct Sanctuary Database Auto-Save**: Seamless persistence with local storage fallback.

---

## 🖨️ One-Click Printable Document Engine (`lib/print-export.ts`)

Staff can generate branded, high-resolution printable documents formatted with dedicated `@media print` CSS:
1. **Rooming & Guest Manifest**: Complete villa room allocations, airport chauffeur waves, flight arrival times, and kitchen dietary protocols.
2. **Itemized Billing Folios**: Multi-currency wire settlement receipts, deposit breakdowns, host agency 90/10 commission splits, and zero-cent balance reconciliation.
3. **Guest Clinical & Dietary Dossiers**: Personalized medical clearance summaries, safe alternative modalities, and dietary guidelines.
4. **1-Click Chargeback Defense Audit Bundle ("Chargeback Shield")**: Direct itinerary-linked card authorizations, merchant representations, Exhibit B value inclusions, and signed no-chargeback waivers formatted into an official card-issuer dispute package.

---

## 🏛️ Tern CRM Sovereign Parity & Custom Enhancements

Drawing from deep analysis of luxury travel agency workflows (Tern CRM, TravelJoy, Axus), KAI has native, sovereign implementations built directly into its portal without third-party subscription fees or SaaS vendor lock-in:

* **1-Click Chargeback Shield Generator (`components/portal/crm/BillingFolioTab.tsx`)**: Binds signed guest authorizations directly to timestamped itinerary versions, cancellation policies, and merchant proofs to definitively close merchant dispute loops.
* **Self-Service Dynamic Room Block Suite Selection (`app/my-retreat/page.tsx`)**: Guests on `/my-retreat` can interactively toggle suite upgrades (*Oceanfront King Suite*, *Private Cliffside Plunge Villa* +$3,200, *Master Penthouse Sanctuary* +$5,500) with instant, real-time recalculation of the 30% deposit and 70% balance terms prior to e-signing.
* **Curated Somatic Activity Block Library (`components/portal/crm/SomaticActivityBlockLibrary.tsx`)**: Directly integrated into the Itinerary Builder (`TripBuilderModal.tsx`), giving coordinators 12+ pre-vetted somatic, biochemical, and restorative activity templates with 1-click insertion.
* **Host Agency Commission Engine (`components/portal/crm/BillingFolioTab.tsx`)**: Native 90/10 commission split tracking, gross-to-net supplier wire reconciliations, and host agency remittance summaries tailored for Grand Travel & Cruise.

---

## 🎙️ Floating Sanctuary AI Copilot & Voice Assistant

Accessible from any screen in the Operations Portal via the bottom-right floating trigger:
* **ChatGPT-Style Minimalist Floating Interface**: Modern, distraction-free floating conversational window with fluid slide and pulse animations.
* **Voice-Enabled Hands-Free Operations**: Full hands-free two-way voice mode leveraging the browser Web Speech API for voice dictation and serene clinical audio responses.
* **Omnipresent System Action Calling**: Can execute any operational or clinical action on command—drafting personalized guest outreach, approving held bookings, retrieving contraindication clearances, recalculating folios, and looking up flight statuses.
* **Zero Autonomous Writes Preserved**: All mutations suggested by the Copilot continue to adhere to the strict Human-in-the-Loop review queue invariant.

---

## 🤖 Background Automation Helpers (In Plain English)

| Helper / Agent | What It Monitors | What It Stages in the Review Queue |
| :--- | :--- | :--- |
| **1. Booking & Quote Helper** | Inquiries, suite choices, and budgets | Drafts booking holds with 30% deposit and 70% balance calculations. |
| **2. Flight Delay Radar** | Live Cirium satellite radar for guest flights | If delayed $\ge 45$ min, recalibrates driver pickup windows and drafts an alert. |
| **3. Concierge Email Parser** | Inbound guest and airline emails | Extracts flight numbers, arrival times, and drafts itinerary updates. |
| **4. Clinical Safety Checker** | Medical waivers and intake notes | Runs deterministic contraindication rules and flags items for Nurse Kareena. |
| **5. Rooming Manifest Auditor** | Rooming vouchers vs. database records | Verifies cohort capacity (max 14) and highlights room mismatches. |
| **6. Partner Studio Finder** | High-end wellness clinics in NY, Austin, LA | Drafts personalized collaboration proposals highlighting group air perks. |
| **7. Bespoke Packing Stylist** | Microclimate weather and health notes | Drafts curated packing checklists (organic linens, earplugs, hydration). |
| **8. Pre-Arrival Welcome Host** | Evening prior to arrival | Drafts welcoming WhatsApp messages with driver contacts and calming sound tracks. |
| **9. 14-Day Post-Retreat Arc** | Exactly 14 days after departure | Drafts a personalized nervous system integration check-in note. |
| **10. Guest Journal Reviewer** | New submitted guest testimonials | Holds reviews for staff moderation before publishing to the Destination Journal. |
| **11. Priority Circle Concierge** | VIP newsletter signups | Stages early-access invitation letters for upcoming sanctuaries. |
| **12. Executive Burnout Outreach**| High-stress corporate signals | Suggests prospective guests and drafts personalized restorative retreat invitations. |

---

## 🌐 Full-Stack SEO & Schema.org Rich Snippets

All public marketing routes (`/`, `/retreats`, `/retreats/*`, `/about`, `/book`, `/testimonials`) are optimized for search engine crawlers while preserving visual designs:

* **Robots Directives (`app/robots.ts`)**: Whitelists public marketing routes and image assets while strictly disallowing private endpoints (`/portal`, `/api/*`, `/my-retreat*`). Declares canonical XML sitemap and host.
* **Dynamic XML Sitemap (`app/sitemap.ts`)**: Auto-indexes all static and dynamic retreat paths with priority weightings and featured image links for Google Image SEO.
* **Core Brand & FAQ Schema (`app/layout.tsx`)**:
  * `HealthAndBeautyBusiness` + `TravelAgency` JSON-LD schema with founder credentials and clinical knowledge domains.
  * `WebSite` schema with sitename aliases (`KAI`, `KAI Sanctuaries`).
  * `FAQPage` schema indexing common retreat questions directly for Google SERP accordion rich snippets.
* **Collection & Destination Schemas**:
  * `/retreats` (`app/retreats/layout.tsx`): `ItemList` + `BreadcrumbList` schemas.
  * `/retreats/[slug]` (`app/retreats/[slug]/page.tsx`): Itemized `TouristTrip` itineraries, pricing offers, and breadcrumbs.
* **Founder Authority & E-E-A-T (`app/about/layout.tsx`)**: `AboutPage` and `Person` schema documenting Kareena Islam's BSN RN credentials and Grand Travel host agency lineage.
* **Guest Review Rich Snippets (`app/testimonials/layout.tsx`)**: `AggregateRating` schema (5.0 stars over 48 reviews) and verified guest reflections for golden search review stars.
* **Reservation Schema (`app/book/page.tsx`)**: `Service` + `BreadcrumbList` structured data.
* **Privacy Isolation (`app/my-retreat/layout.tsx`)**: Disallowed in robots.txt and tagged with `robots: { index: false, follow: false }` to protect guest itineraries.

---

## 📬 Transactional Email Architecture

KAI uses a **Dual-Dispatch Email Architecture** for reservation inquiries submitted on `/book`:

```
                        ┌───────────────────────────────────┐
                        │    Guest Reservation on /book     │
                        │    (with legal waiver e-sign)     │
                        └─────────────────┬─────────────────┘
                                          │
                ┌─────────────────────────┴─────────────────────────┐
                ▼                                                   ▼
┌───────────────────────────────┐                   ┌───────────────────────────────┐
│ 1. Customer Confirmation      │                   │ 2. Founder / Staff Alert      │
├───────────────────────────────┤                   ├───────────────────────────────┤
│ • Booking Reference (KAI-XXXX)│                   │ • Full medical / health notes │
│ • Retreat dates & suite tier  │                   │ • Movement experience level   │
│ • Liability waiver receipt    │                   │ • Passport readiness status   │
│ • 24–48hr concierge call info │                   │ • Legal waiver e-sign receipt │
│ • Grand Travel air assistance │                   │ • Staged CRM intake & draft   │
├───────────────────────────────┤                   ├───────────────────────────────┤
│ TO: Customer / Guest          │                   │ TO: Kareena & Armaan Islam    │
│ FROM: KAI Concierge Desk      │                   │ FROM: KAI Sanctuary Inquiries │
└───────────────────────────────┘                   └───────────────────────────────┘
```

### Production Email Setup (Resend)
* **Domain Verification**: Add `kaiwellnessretreats.com` or `grandtravelcruise.com` at [resend.com/domains](https://resend.com/domains) and set DNS records (DKIM, SPF, DMARC).
* **Environment Variables**:
  ```env
  RESEND_API_KEY="re_..."
  RESEND_FROM_EMAIL="KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>"
  RESEND_CONCIERGE_FROM_EMAIL="KAI Concierge Desk <concierge@kaiwellnessretreats.com>"
  KAREENA_ROUTING_EMAIL="kareena@grandtravelcruise.com"
  ARMAAN_ROUTING_EMAIL="armaan@grandtravelcruise.com"
  ```
* **Zero-DNS Fallbacks**: Native Microsoft 365 SMTP (`smtp.office365.com:587`) or Google Workspace SMTP (`smtp.gmail.com:587`) with App Passwords require zero DNS modifications.

---

## 💻 Developer Quickstart & Commands

### Prerequisites
* **Node.js**: v18.18+ or v20+
* **Python**: v3.11+
* **Docker** (optional for local multi-container development)

### Local Development Setup
```bash
# 1. Clone repository
git clone https://github.com/Anaji00/kai.git
cd kai

# 2. Setup Python environment
python -m venv venv
venv\Scripts\activate      # Windows (Mac/Linux: source venv/bin/activate)
pip install -r backend/requirements.txt

# 3. Setup Next.js dependencies
npm install

# 4. Seed database with realistic sanctuary data
python -m backend.sidecar.services.synthetic_data_seeder
```

### Running the Services
Open two terminal windows:
```bash
# Terminal 1: FastAPI Backend Sidecar (port 8972)
npm run backend
# API docs available at: http://127.0.0.1:8972/docs

# Terminal 2: Next.js Frontend (port 3536)
npm run dev
# Website: http://localhost:3536
# Operations Portal: http://localhost:3536/portal
```

### Docker Compose
```bash
cp .env.example .env      # Fill in ADMIN_PASSWORD, AUTH_SECRET_KEY, WEBHOOK_HMAC_SECRET and WHATSAPP_WEBHOOK_VERIFY_TOKEN
docker compose up --build
```
* Frontend: `http://localhost:3536`
* Backend API: `http://localhost:8972`

### Verification & Testing
```bash
# 1. Frontend TypeScript type checking (must exit with 0 errors)
npx tsc --noEmit

# 2. Comprehensive 33-point edge case & system hardening test suite
python backend/sidecar/test_expanded_edge_cases.py

# 3. Core backend hardening suite (deterministic clinical gate, prompt spotlighting, OCC)
python -m pytest backend/sidecar/test_system_hardening.py -v

# 4. Test transactional email pipeline via CLI
python scripts/send_test_email.py --to your-email@gmail.com --pipeline
```

---

## 🔒 Security, Privacy & Compliance

* **Zero Direct Card Storage**: All guest payments are handled through the native Sanctuary Travel Card Vault & Proposal e-sign platform.
* **Strict Medical Privacy**: Guest clinical intakes, contraindications, and dietary restrictions are isolated in encrypted database fields and never shared with third-party advertising or marketing services.
* **Session Cookie Protection**: Portal access is secured by Next.js 16's consolidated `proxy.ts` gateway with server-side administrative credential injection.

---

© 2026 KAI Wellness Retreats • Grand Travel & Cruise Partnered • Concierge Desk: `concierge@kaiwellnessretreats.com`.
