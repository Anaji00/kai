# KAI Wellness Retreats

**Website, booking platform, and staff operations portal for KAI Wellness Retreats.**  
*Founded by Kareena Islam, BSN, RN & Armaan Islam • Travel logistics by Grand Travel & Cruise*

---

## Overview

KAI Wellness Retreats hosts small-group wellness retreats (12 to 14 guests) focused on yoga, sound baths, rest, and cultural connection in coastal destinations including the Riviera Maya and Puerto Vallarta.

This repository contains the three parts of the KAI system:
1. **Public Website**: Where guests learn about upcoming retreats, read about Kareena and Armaan, browse *Beyond The Retreats* (newsletter & press), and request a reservation.
2. **Staff Portal (`/portal`)**: An internal workspace where the team manages guest bookings, room assignments, flight arrivals, and dietary notes in one place.
3. **KAI Copilot**: An internal assistant (text and voice) that helps staff look up guest details, draft emails, calculate deposits, and update records.

---

## How Guest & Staff Safety Work

1. **Human Review on Outgoing Messages**  
   The assistant never emails, texts, or charges a guest automatically. Any message it drafts goes into the review queue (`/portal/drafts`) for a team member to check and approve first.

2. **Health & Activity Screening**  
   Before scheduling activities like sound baths, breathwork, or heat/cold sessions, the system checks the guest's intake notes (allergies, injuries, blood pressure, or medications) and flags anything that needs attention from Kareena.

3. **Safe Simultaneous Edits**  
   If two people edit the same guest record at once, the portal prevents silent overwrites and prompts before saving over newer changes.

---

## Key Pages

### Public Website
* **Retreats (`/retreats`)**: Upcoming and past retreats, including Marival Armony in Puerto Vallarta (Jan 28–31, 2027) and El Dorado Seaside Palms in the Riviera Maya.
* **The Hearts Behind KAI (`/about`)**: Kareena and Armaan Islam's story, background, and the *Living BIG — Be In Gratitude* philosophy.
* **Beyond The Retreats (`/newsletter`)**: Newsletter signup, reflections from Kareena and Armaan, and press features from *TravelAge West*, *Travel Weekly*, and *Click2Houston*.
* **Reserve (`/book`)**: Booking request and guest health/dietary intake form.
* **Guest Itinerary (`/my-retreat`)**: Day-by-day retreat schedule and travel details for confirmed guests.
* **Testimonials (`/testimonials`)**: Photos and stories from past retreat guests.

### Staff Portal (`/portal`)
* **Guest CRM (`/portal/crm`)**: Spreadsheet-style view for updating room tiers, payment statuses, flight numbers, and dietary needs. Press `/` to search and filter guests quickly.
* **Draft Queue (`/portal/drafts`)**: Review, edit, and approve drafted guest communications.
* **Calendar (`/portal/calendar`)**: Retreat dates, flight arrival windows, and group capacity.
* **Travel Logistics (`/portal/travel-logistics`)**: Flight tracking and airport transfer coordination.
* **Vendors & Leads (`/portal/vendors`, `/portal/leads`)**: Contacts for resorts, drivers, and prospective guests.
* **Printable Sheets**: One-click print views for airport pickup lists, kitchen allergy charts, rooming lists, and guest invoices.

---

## Getting Started

### Prerequisites
* **Node.js** 18+
* **Python** 3.11+

### 1. Install Dependencies

```bash
git clone https://github.com/Anaji00/kai.git
cd kai

# Python backend environment
python -m venv venv
venv\Scripts\activate      # Windows
# source venv/bin/activate # macOS / Linux
pip install -r backend/requirements.txt

# Frontend packages
npm install

# Optional: load sample portal data
python -m backend.sidecar.services.synthetic_data_seeder
```

### 2. Run Locally

Open two terminals:

**Terminal 1 — Backend API (`http://127.0.0.1:8972`):**
```bash
npm run backend
```

**Terminal 2 — Next.js App (`http://localhost:3536`):**
```bash
npm run dev
```

Then open:
* Public site: [http://localhost:3536](http://localhost:3536)
* Staff portal: [http://localhost:3536/portal](http://localhost:3536/portal)

---

## Verification

```bash
# TypeScript check
npx tsc --noEmit

# Backend test suite
python -m pytest backend/sidecar/test_system_hardening.py -v
```

---

## Contact

* **Kareena Islam, BSN, RN**: `kareena@grandtravelcruise.com`
* **Armaan Islam**: `armaan@grandtravelcruise.com`
* **Travel Agency Partner**: [Grand Travel & Cruise](https://grandtravelcruise.com/)
