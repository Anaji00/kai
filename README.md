# 🌿 KAI Team Guide (How Everything Works)

> **Internal Team Guide & Field Manual for Kareena Islam & the KAI Team**  
> *Sanctuary Operations • Host Travel Partner: Grand Travel & Cruise • Travel System: KAI Sanctuary Travel CRM Platform & Card Vault*

---

## 💡 What is KAI? (The Quick Version)

KAI runs luxury, intimate wellness retreats in places like Costa Rica, the Amalfi Coast, Bali, and the Riviera Maya. 
* **Who it's for**: Burned-out professionals (executives, founders, doctors) who need deep rest and restorative sleep.
* **Who runs it**: Kareena Islam, a registered clinical nurse with a neuroscience background.
* **Our golden rule**: Strictly **12 to 14 guests per trip**—never crowded, always quiet and restorative.
* **Our travel partner**: We partner with a 25-year travel agency (**Grand Travel & Cruise**) to give our guests discounted first-class/business lie-flat flights, live radar flight tracking, and private luxury rides straight from the airport.

---

## 🛡️ The #1 Rule: The AI Never Sends Anything on Its Own

We use smart AI in the background to handle the heavy paperwork, but we have an absolute rule called **Zero Autonomous Writes**:
* **The AI only drafts**: The AI can write draft emails, draft text messages, flag delays, or plan driver pickups, but it is **never allowed to press send**.
* **The Action Review Queue**: Everything the AI creates goes into Kareena's private review screen inside our portal (`/portal/drafts`).
* **1-Click Human Approval**: Kareena or a team member reviews the draft, makes any changes, and clicks **"Approve & Dispatch"**. Only then does the text message send, the email go out, or the trip commit to our native Sanctuary Travel CRM.
* **Why this matters**: High-net-worth guests always get warm, personal communication from a real human nurse—zero robot mistakes, zero awkward automated messages.

---

## 🤖 What the AI Helpers Do in the Background (In Plain English)

Here are all 12 automated helpers running in the background and what they do for our team:

| Helper / Agent | What It Watches For | What It Automatically Drafts for You |
| :--- | :--- | :--- |
| **1. The Booking & Quote Helper** | Guest chats, room requests, and budget questions | Drafts a booking hold with the 30% deposit and 70% balance calculated, ready to commit to Sanctuary CRM. |
| **2. The Flight Delay Watcher** | Live satellite flight radar (Cirium) for guest flights | If a plane is delayed by 45+ minutes, it automatically recalibrates the driver's pickup window and drafts an SMS update. |
| **3. The Email Reader** | Inbound emails from guests or airlines | Pulls out flight numbers, airline names, and arrival times, and drafts a flight coordination update. |
| **4. The Doctor Note & Health Checker** | Uploaded medical forms, waivers, or doctor notes | Flags pregnancy or health issues as "Needs Attention" so Nurse Kareena can clear or adjust their schedule. |
| **5. The Guest List & Room Checker** | Hotel room lists and vouchers vs. our Sanctuary CRM guest list | Double-checks that no more than 14 guests are booked and flags any room mismatches. |
| **6. The Partner Studio Finder** | Wellness clinics and yoga studios in cities like Austin, Houston, and New York | Finds great partner clinics and drafts an introduction email offering our group flight perks to their clients. |
| **7. The Packing List Creator** | The destination weather and the guest's health profile | Drafts a personalized packing checklist (organic linen, earplugs, swimwear) for the guest. |
| **8. The Welcome Text Helper** | The night before a guest arrives | Drafts a welcoming WhatsApp text with driver details and calming sound tracks to listen to. |
| **9. The 2-Week Follow-Up Helper** | Exactly 14 days after a guest checks out | Drafts a check-in email for Kareena to see how their sleep and recovery are going at home. |
| **10. The Review Publisher** | New guest reviews submitted on the web | Holds the review for our team to approve before publishing it to the Destination Journal. |
| **11. The Newsletter Welcome Helper** | When someone joins our VIP Priority Circle email list | Drafts a welcome email with early access to upcoming retreat dates. |
| **12. The B2B Sales & Outreach Helper** | Executive life milestones or corporate burnout signals | Suggests prospects who might need a retreat and drafts a customized outreach note. |

---

## 📱 The KAI Portal: What Each Screen Does (`/portal`)

Log in to the team portal at **`http://localhost:3536/portal`** with `ADMIN_USERNAME` / `ADMIN_PASSWORD` (local development falls back to `admin` / `kai_admin_2026`; production refuses to start without real values).

1. **Guest Inquiries (`/portal`)**: 
   View everyone who applied for a retreat. The AI generates a quick "Cheat Sheet" for Nurse Kareena before her consultation call. With 1 click, you can commit the guest to our native Sanctuary Travel CRM.
2. **Action Review Queue (`/portal/drafts`)**: 
   **The most important screen!** Shows every text, email, flight alert, or note waiting for your approval. You can read it, edit it in place, and click **"Approve & Dispatch"** or **"Discard"**. The top navigation bar shows a live badge with how many drafts are waiting.
3. **Retreat Calendar (`/portal/calendar`)**: 
   A visual calendar of upcoming retreat cohorts (with 14-guest capacity meters), 20-minute phone consultations with guests, and airport flight arrival times.
4. **Travel & Destinations (`/portal/travel-logistics`)**: 
   Maps showing driving routes from gateway airports to each villa, what cars to use (like 4WD Suburbans for mountain roads), and nearby nature spots (waterfalls, sacred springs, sunset views).
5. **Vendors & Suppliers (`/portal/vendors`)**: 
   Our contact book for luxury drivers, private chefs, sound healers, and emergency clinics, including our commission rates and payment terms.
6. **Partner Studios (`/portal/leads`)**: 
   A list of wellness clinics and yoga studios we want to partner with, with ready-to-send collaboration emails.
7. **Text Broadcasts (`/portal/campaigns`)**: 
   Draft mass text messages to alumni guests (e.g. *"Private invites for Italy May 2027 are now open"*). Nothing sends until you approve it.
8. **Guest List Check (`/portal/reconciliation`)**: 
   Drop in hotel room lists or flight manifests to make sure no extra rooms are booked and nobody was missed.
9. **Concierge Inbox (`/portal/emails`)**: 
   A shared inbox where incoming travel emails are organized and tagged automatically.
10. **Service Connections (`/portal/webhooks`)**: 
    A technical screen showing live connections to our travel software (Sanctuary CRM), flight radar, and text services, with a button to simulate test events.
11. **Clinical Copilot (The Slide-Out Assistant)**: 
    Click the button on the bottom right of any portal screen to open a smart assistant. You can ask it to look up flights, draft an email, check health notes, or summarize sales.

---

## 🌿 What Guests See on the Public Website

* **Sanctuary Showcases**: Photos, daily schedules, and villa room choices for Costa Rica, Italy, Bali, and Mexico.
* **Flight Request Form**: Where guests can request lie-flat business class seats and private airport pickups.
* **Sound & Breath Tools**:
  * **Solfeggio Sound Player**: Streams pure 432Hz (deep sleep and calm) and 528Hz (recovery) audio tones.
  * **4-7-8 Breathing Circle**: An animated circle guiding guests through 4 seconds in, 7 seconds hold, and 8 seconds out to calm their nervous system.
* **Travel Guides**: Passport rules, entry requirements, local customs, and distances to the nearest medical clinics.
* **Healthy Food Guide**: Searchable directory of nearby restaurants that cater to gluten-free, dairy-free, and plant-based diets.
* **Guest Reflections**: Real reviews from past guests scored on sleep quality and quietude.

---

## 💻 How to Run the App (For Developers)

### Setup
```bash
# 1. Download the code
git clone https://github.com/Anaji00/kai.git
cd kai

# 2. Setup the Python backend (Python 3.11+)
python -m venv venv
venv\Scripts\activate      # On Windows (use source venv/bin/activate on Mac/Linux)
pip install -r backend/requirements.txt

# 3. Setup the Next.js frontend (Node 18+)
npm install

# 4. Fill the database with realistic sample data (guests, drivers, routes, drafts)
python -m backend.sidecar.services.synthetic_data_seeder
```

### Starting the App
Open two terminal windows:
```bash
# Terminal 1: Backend Engine
npm run backend
# Runs at http://127.0.0.1:8972 (API docs at http://127.0.0.1:8972/docs)

# Terminal 2: Website & Portal
npm run dev
# Runs at http://localhost:3536
```
* **Public Website**: http://localhost:3536
* **Team Portal**: http://localhost:3536/portal (development login: `admin` / `kai_admin_2026`)
* **Review Queue**: http://localhost:3536/portal/drafts

### Running with Docker
```bash
cp .env.example .env      # fill in every empty secret (ADMIN_PASSWORD, JWT_SECRET_KEY, webhook secrets)
docker compose up --build
```
* Site: http://localhost:3536, portal: http://localhost:3536/portal, API docs: http://localhost:8972/docs
* The backend runs with `ENVIRONMENT=production` and stores SQLite on the `kai_data` volume.
* Compose stops with an error if any required secret is empty; the backend also refuses to boot on the old default values.
* AI features (copilot, inquiry parsing, voice transcription) use Groq: set `GROQ_API_KEY` from https://console.groq.com/keys.

### Deploying (kaiwellnessretreats.com)
Everything runs on **Vercel**, in one project: the Next.js site plus the FastAPI backend as a Python
function (`api/index.py`, reached through the `/api/v1/*` rewrite in `vercel.json`), backed by
**Neon Postgres**. Step-by-step runbook including Squarespace DNS: [DEPLOYMENT.md](DEPLOYMENT.md).

Docker (`docker compose up`) remains the way to run the full stack locally.

### Running Tests
```bash
# Test the Action Draft approval and dispatch system (6 tests)
python backend/sidecar/test_drafts_execution.py

# Test the Sanctuary CRM integration
pytest backend/sidecar/test_sidecar.py -k "test_seed_and_list_intakes or test_pre_call_thesis_and_crm_commit" -v

# Check for TypeScript errors
npx tsc --noEmit

# Test transactional email dispatch & booking pipeline
python scripts/send_test_email.py --to your-email@gmail.com --pipeline
```

---

## 📬 Transactional Email Architecture & Go-Live Guide

KAI uses a **Dual-Dispatch Email Architecture** for every reservation inquiry submitted on the website (`/book`).

```
                            ┌───────────────────────────────────┐
                            │    Guest Booking on /book         │
                            │    (with legal waiver e-sign)     │
                            └─────────────────┬─────────────────┘
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
    ┌───────────────────────────────┐                   ┌───────────────────────────────┐
    │ 1. Customer Confirmation      │                   │ 2. Founder / Staff Alert      │
    ├───────────────────────────────┤                   ├───────────────────────────────┤
    │ • Booking Reference (KAI-XXXX)│                   │ • Full medical / health notes │
    │ • Retreat dates & suite tier  │                   │ • Movement experience tier    │
    │ • Liability waiver receipt    │                   │ • Passport readiness status   │
    │ • 24–48hr concierge call info │                   │ • Legal waiver e-sign receipt │
    │ • Grand Travel air assistance │                   │ • Staged CRM intake & draft   │
    ├───────────────────────────────┤                   ├───────────────────────────────┤
    │ TO: Customer / Guest          │                   │ TO: Kareena & Armaan Islam    │
    │ FROM: KAI Concierge Desk      │                   │ FROM: KAI Sanctuary Inquiries │
    └───────────────────────────────┘                   └───────────────────────────────┘
```

### 1. Production Go-Live: Domain Verification (Standard Method)

The gold standard for brand trust and deliverability is verifying your domain on [Resend](https://resend.com/domains):

* **Choice A: Host Agency Domain (`grandtravelcruise.com`)**
  1. Go to [resend.com/domains](https://resend.com/domains) and click **Add Domain** (`grandtravelcruise.com`).
  2. Add the 3 DNS records (DKIM, SPF, DMARC) in your domain DNS host (GoDaddy, Cloudflare, etc.).
  3. In `.env`:
     ```env
     RESEND_FROM_EMAIL="KAI Sanctuary Reservations <kareena@grandtravelcruise.com>"
     RESEND_CONCIERGE_FROM_EMAIL="KAI Concierge Desk <armaan@grandtravelcruise.com>"
     KAREENA_ROUTING_EMAIL="kareena@grandtravelcruise.com"
     ARMAAN_ROUTING_EMAIL="armaan@grandtravelcruise.com"
     ```

* **Choice B: Sanctuary Brand Domain (`kaiwellnessretreats.com`)**
  1. In [resend.com/domains](https://resend.com/domains), click **Add Domain** (`kaiwellnessretreats.com`).
  2. Add the 3 DNS records at your domain host.
  3. In `.env`:
     ```env
     RESEND_FROM_EMAIL="KAI Sanctuary Reservations <inquiries@kaiwellnessretreats.com>"
     RESEND_CONCIERGE_FROM_EMAIL="KAI Concierge Desk <concierge@kaiwellnessretreats.com>"
     KAREENA_ROUTING_EMAIL="kareena@grandtravelcruise.com"
     ARMAAN_ROUTING_EMAIL="armaan@grandtravelcruise.com"
     ```

---

### 2. Alternative Fallback Methods (Zero DNS Access Required)

If you or Kareena/Armaan do not have immediate access to your DNS host, use one of these verified zero-DNS fallbacks:

#### Fallback A: Microsoft 365 SMTP (Native to Grand Travel & Cruise)
*Grand Travel & Cruise (`grandtravelcruise.com`) email is hosted on Microsoft 365 (`mail.protection.outlook.com`). SPF and DKIM are already configured on Microsoft's servers.*

1. In Kareena or Armaan's Microsoft 365 account, create an **App Password** (or enable SMTP AUTH).
2. Configure in `.env`:
   ```env
   SMTP_HOST="smtp.office365.com"
   SMTP_PORT="587"
   SMTP_USER="kareena@grandtravelcruise.com"
   SMTP_PASSWORD="<your-365-app-password>"
   SMTP_USE_TLS="true"
   ```
* **Benefits**: Zero DNS changes. Emails send directly through Kareena's actual Microsoft 365 mailbox, appear in her Sent folder, and deliver to any customer worldwide without sandbox restrictions.

#### Fallback B: Google / Gmail SMTP with App Password (60-Second Setup)
*Fastest fallback to send to any real email without touching Microsoft 365 or DNS.*

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) on any Google Account with 2-Step Verification enabled.
2. Create an App Password named `KAI Sanctuary` (Google generates a 16-character code).
3. Configure in `.env`:
   ```env
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASSWORD="<16-character-app-password>"
   SMTP_USE_TLS="true"
   ```
* **Benefits**: Zero DNS changes. Instantly bypasses Resend sandbox restrictions and delivers confirmations to any customer email.

#### Fallback C: Email-Link Single Sender Verification (Brevo / Postmark)
*Services like Brevo or Postmark allow sending from `kareena@grandtravelcruise.com` without DNS by sending a one-click confirmation link to her inbox.*

#### Fallback D: Built-In Sandbox Testing Mirror (Active by Default)
*While in testing mode using `onboarding@resend.dev`, Resend blocks delivery to external recipients. Our code automatically catches this and forwards a complete **Customer Confirmation Carbon Copy** to `alessionaji1@gmail.com` labeled `[CUSTOMER CONFIRMATION: <email>]` so you can verify the email design and reference code without any setup.*

---

### 3. Testing the Email Pipeline via CLI

To verify transactional delivery at any time from your terminal:

```bash
# Test direct API handshake and recipient delivery:
python scripts/send_test_email.py --to your-email@gmail.com

# Test the complete intake pipeline (Founder Alert + Customer Confirmation):
python scripts/send_test_email.py --to your-email@gmail.com --pipeline
```

---

## 🔒 Security, Privacy & Payments (In Plain English)

* **We Never Touch Credit Card Numbers**: All guest payments are handled directly through our native Sanctuary Travel Card Vault & Proposal e-sign platform. We have zero payment liability.
* **Private Medical Info**: Guest medical notes, injuries, and dietary needs are stored in private clinical files and are never shared or used for marketing.
* **Password-Protected Portal**: The entire team portal is locked behind admin login credentials.

---

© 2026 KAI Wellness Retreats • Grand Travel & Cruise Partnered • Questions? Email `kareena@kaiwellnessretreats.com`.
