"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  X,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Calendar,
  Compass,
  MessageSquare,
  CheckCircle2,
  Building2,
  Plane,
  FileSpreadsheet,
  Globe2,
  HeartHandshake,
  Navigation,
  Sun,
  Utensils,
  Star,
  BookOpen,
  Paperclip
} from "lucide-react";

interface PortalHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOOL_ENTRIES = [
  {
    key: "founder_studio",
    title: "Founder Sanctuary Studio",
    subtitle: "Your Executive Home Base",
    icon: Compass,
    layman: "Your serene central desk. Here you can see intimate retreat spaces, guest inquiries, urgent guest questions, and today's schedule at a single glance.",
    why_it_matters: "Keeps your daily workflow clear and calm without complex spreadsheets or multiple software tabs."
  },
  {
    key: "travel_logistics",
    title: "Scenic Routes & Chauffeur Transit",
    subtitle: "Live Terrain, Elevation & Private Transfers",
    icon: Navigation,
    layman: "Calculates gentle driving times, elevation shifts, scenic stops, and luxury vehicle options (4WD Prado, Mercedes Sprinter, private boat) from nearby airports to our sanctuaries. Coordinates private chauffeur dispatch seamlessly.",
    why_it_matters: "Ensures guests experience a relaxing, nervous-system soothing arrival without getting lost or stuck in bumpy unpaved terrain."
  },
  {
    key: "microclimate_weather",
    title: "Sanctuary Weather & Sunshine",
    subtitle: "Live Microclimate & Somatic Sun Windows",
    icon: Sun,
    layman: "Tracks real-time sunshine, ocean breezes, humidity, and UV levels directly from open meteorological satellites with an automatic 15-minute refresh. Automatically pinpoints the best hours of the day for open-air Prana breathwork and sunset sound baths.",
    why_it_matters: "Guarantees outdoor somatic sessions happen when the weather is gentle, safe, and most restorative for the nervous system."
  },
  {
    key: "curated_dining",
    title: "Nourishing Dining & Gut Health",
    subtitle: "Organic, Blue Zone & Dietary Harmony",
    icon: Utensils,
    layman: "A curated guide to local farm-to-table dining, organic cafes, and Blue Zone restaurants near each retreat. Filter easily by gluten-free, dairy-free, Low-FODMAP, or Ayurvedic dietary needs with wellness digestion notes.",
    why_it_matters: "Guarantees every meal honors guest dietary restrictions and supports restorative gut health."
  },
  {
    key: "guest_reflections",
    title: "Guest Reflections & Transformation Scores",
    subtitle: "Verified Traveler Sleep & Rest Metrics",
    icon: Star,
    layman: "Collects verified feedback from retreat graduates, rating deep sleep quality, acoustic quietude, and nurse attentiveness. Ingests reflections automatically when guests complete their stay.",
    why_it_matters: "Provides real proof of nervous system restoration and deep rest for hesitant guests."
  },
  {
    key: "destination_guides",
    title: "Destination Guides & Customs",
    subtitle: "Entry Rules, Sacred Customs & Packing Checklists",
    icon: BookOpen,
    layman: "Clear checklists covering passport visa requirements, sacred temple customs (such as shoulder wraps in Bali), gentle jet lag hydration protocols, and essential packing items.",
    why_it_matters: "Gives guests total peace of mind before they board their flights, reducing pre-trip anxiety."
  },
  {
    key: "guest_documents",
    title: "Guest Documents & Health Notes",
    subtitle: "Secure Intake PDF & Doctor Note Screening",
    icon: Paperclip,
    layman: "A secure drop-zone for guest intake forms, doctor clearance letters, and travel manifests. Automatically screens for health considerations (like cardiac history or pregnancy) and extracts key dates.",
    why_it_matters: "Ensures Kareena Islam, BSN, RN never misses a critical health consideration before welcoming a guest."
  },
  {
    key: "guest_planner",
    title: "Tern Guest & Travel Planner",
    subtitle: "Itineraries & Zero-Liability Payments",
    icon: CreditCard,
    layman: "Connects your guest details, custom retreat itineraries, and flight itineraries directly with Tern CRM. All published proposals include Tern's native credit card authorizations and payment schedules.",
    why_it_matters: "You never have to handle credit card numbers or build payment gateways yourself. Tern manages client authorizations, terms waivers, and PCI security 100% natively."
  },
  {
    key: "founder_approval",
    title: "Personalized Founder Approval",
    subtitle: "Founder Approval Guarantee (No Unapproved Messages)",
    icon: ShieldCheck,
    layman: "A protective safety shield ensuring no information or email is ever sent to external travel platforms or guests without your personal 1-click review and blessing.",
    why_it_matters: "Protects your high-touch reputation and ensures every guest communication reflects your personal care as a Expert Guide."
  },
  {
    key: "clinical_copilot",
    title: "AI Copilot (KAI Brain)",
    subtitle: "Your Chief of Staff & Nurse Guide",
    icon: Sparkles,
    layman: "An intelligent companion for Kareena with 4 helpful modes: screens guest health considerations, drafts consultation emails, searches scenic road routes, checks live weather windows, finds Blue Zone dining spots, and ingests intake PDFs.",
    why_it_matters: "Saves hours of preparation time before consultations and ensures every guest's guest safety is reviewed thoroughly."
  },
  {
    key: "retreat_calendar",
    title: "Retreat & Alignment Calendar",
    subtitle: "Retreat Groups, Consultations & Smart Flights",
    icon: Calendar,
    layman: "A visual schedule of 6-day retreat group dates, 20-minute consultation calls, and airport flight arrivals with live Cirium flight tracking.",
    why_it_matters: "Includes a 1-click live calendar feed (.ics) that syncs automatically with your iPhone or Google Calendar so you never miss a guest alignment call."
  },
  {
    key: "concierge_inbox",
    title: "Concierge Inbox & Guest Messages",
    subtitle: "Warm, Nurse-Guided Messaging",
    icon: MessageSquare,
    layman: "Collects guest emails and inquiries from your contact forms and WhatsApp into one calm, organized space where you can review, edit, and dispatch responses.",
    why_it_matters: "Helps you respond to questions with empathetic, nurse-guided clarity in seconds."
  },
  {
    key: "guest_list_check",
    title: "Guest List & Booking Check",
    subtitle: "Vouchers & Manifest Check Made Simple",
    icon: FileSpreadsheet,
    layman: "Compares your website registrations with confirmed Tern traveler files to catch any missing dietary requirements, flight routing, or room tier mismatches.",
    why_it_matters: "Ensures every single guest is accounted for and well looked after before arrival."
  },
  {
    key: "partner_studios",
    title: "Partner Wellness Studios & Practices",
    subtitle: "Curated Holistic Referral Network",
    icon: HeartHandshake,
    layman: "A directory of aligned functional medicine clinics, premier yoga sanctuaries, and private practices that refer their private clients to KAI retreats.",
    why_it_matters: "Fosters trusted B2B referral partnerships with medical doctors and wellness leaders across major hubs."
  },
  {
    key: "flight_desk",
    title: "Grand Travel Flight Desk",
    subtitle: "VIP Air & Real-Time Flight Tracking",
    icon: Plane,
    layman: "Coordinates preferred transcontinental airfare, lie-flat seat blocks, and live Cirium flight radar in partnership with Grand Travel & Cruise (Funjet 500 Club).",
    why_it_matters: "If a flight is delayed, your private tarmac chauffeurs receive real-time alerts automatically so guests never feel stranded."
  },
  {
    key: "integrations_webhooks",
    title: "External Travel & Service Connections",
    subtitle: "Multi-Provider Integration Hub",
    icon: Globe2,
    layman: "A visual health center displaying live connections to Tern CRM, Expedia / Hotel PMS, Grand Travel Flight Desk, and WhatsApp Cloud.",
    why_it_matters: "Keeps your systems in harmony so updates flow quietly in the background without technical headaches."
  }
];

const FAQS = [
  {
    q: "How do payments work for KAI retreats?",
    a: "Payments are 100% handled by Tern CRM. When you approve an itinerary in the portal, it generates a published Tern proposal link (app.tern.travel/public/proposals/...). Guests enter their payment details directly on Tern's secure platform, which handles card holds, terms & conditions waivers, and installment schedules. KAI never handles or stores credit card numbers."
  },
  {
    q: "Can the AI or system send emails or create bookings without my knowledge?",
    a: "Absolutely not. KAI operates under a strict 'Zero Unapproved Sends' rule. Every draft email, itinerary sync, or WhatsApp card requires your direct 1-click review and authorization."
  },
  {
    q: "How do I calculate driving routes and private chauffeur times for guests?",
    a: "Open the 'Travel & Destinations' tab from the sidebar. You can select your sanctuary (Nosara, Amalfi, Bali, Riviera Maya) and view pre-seeded scenic routes, or open the Route Calculator to enter custom coordinates and terrain type (Coastal, Mountain, Jungle). You can even simulate chauffeur dispatch with live tracking updates."
  },
  {
    q: "How does the weather forecast decide when to hold breathwork?",
    a: "Our weather service connects to live open satellite feeds. When winds are under 15 km/h and temperatures are between 21°C and 27°C, it tags an 'Optimal Prana Breathwork Window'. Sunset times are automatically calculated for sound baths."
  },
  {
    q: "How can I upload intake PDFs and health forms for automatic screening?",
    a: "Open the AI Copilot (KAI Brain) in the bottom-right corner and click the paperclip attachment icon. Upload any guest intake PDF, doctor's note, or CSV manifest up to 10MB. The system immediately scans for health considerations (like cardiac conditions, pregnancy, or epilepsy) and presents an executive summary."
  },
  {
    q: "Can I use voice dictation instead of typing questions to the Copilot?",
    a: "Yes! Simply click the microphone icon inside the Copilot drawer. Speak naturally into your device, and your words will be transcribed directly into the prompt box."
  },
  {
    q: "What is the intimate group limit and why is it 12–14 guests?",
    a: "To protect the nervous system restoration of our guests and ensure individualized attention from Kareena Islam, every retreat group is strictly limited to 12 to 14 guests. The studio alerts you whenever a group is nearing full capacity."
  },
  {
    q: "How does the Retreat Calendar sync with my personal phone?",
    a: "Navigate to the Retreat Calendar page and click 'Subscribe to iCal Feed'. You can paste that link into Apple Calendar (iPhone/Mac) or Google Calendar to have all retreat groups, 20-min consults, and flight arrivals show up on your phone automatically."
  }
];

export default function PortalHelpModal({ isOpen, onClose }: PortalHelpModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"tools" | "faqs" | "quickstart">("tools");

  if (!isOpen) return null;

  const filteredTools = TOOL_ENTRIES.filter(
    t =>
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.layman.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-stone-200">
        {/* Header */}
        <div className="p-6 border-b border-stone-800/80 bg-stone-900/90 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif tracking-wide text-stone-100 flex items-center gap-2">
                Founder Studio Guide & Layman's Terms
                <span className="text-xs font-sans px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                  Simple & Clear
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                A warm, straightforward guide explaining every tool in the KAI Sanctuary Studio.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-stone-800 bg-stone-950/40 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("tools")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "tools"
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
              }`}
            >
              All 10 Studio Tools
            </button>
            <button
              onClick={() => setActiveTab("quickstart")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "quickstart"
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
              }`}
            >
              5-Step Quick Start
            </button>
            <button
              onClick={() => setActiveTab("faqs")}
              className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                activeTab === "faqs"
                  ? "bg-amber-500/15 border border-amber-500/40 text-amber-300"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
              }`}
            >
              Frequently Asked Questions
            </button>
          </div>

          {activeTab === "tools" && (
            <div className="w-64 pb-2">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search tools in plain terms..."
                className="w-full px-3 py-1.5 text-xs bg-stone-900 border border-stone-700/80 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === "tools" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTools.map(t => {
                const IconComponent = t.icon;
                return (
                  <div
                    key={t.key}
                    className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-stone-700 transition-all space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-stone-800/80 text-amber-400 border border-stone-700/60 shrink-0">
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-stone-100">{t.title}</h3>
                        <p className="text-[11px] text-amber-400/90 font-medium">{t.subtitle}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs text-stone-300">
                      <p className="leading-relaxed">{t.layman}</p>
                      <div className="pt-2 border-t border-stone-800/80 flex items-start gap-1.5 text-[11px] text-stone-400">
                        <span className="font-semibold text-amber-300/80 shrink-0">Why it matters:</span>
                        <span>{t.why_it_matters}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "quickstart" && (
            <div className="max-w-2xl mx-auto space-y-6 py-2">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-serif text-stone-100">Kareena's 5-Step Sanctuary Workflow</h3>
                <p className="text-xs text-stone-400">How to welcome, screen, and publish retreat proposals effortlessly.</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    title: "Check Guest Inquiries",
                    text: "Open the Concierge Inbox or Lead Review to see new website reservations, partner studio referrals, and clinical notes."
                  },
                  {
                    step: "2",
                    title: "Run AI Copilot Screening",
                    text: "Click 'AI Copilot' in the lower corner to screen guest health considerations (e.g. breathwork contraindications or cold plunge readiness) and generate pre-call talking tracks."
                  },
                  {
                    step: "3",
                    title: "Book the 20-Min Alignment Consultation",
                    text: "Schedule the call on the Retreat & Alignment Calendar. The event syncs into your phone automatically via your iCal feed."
                  },
                  {
                    step: "4",
                    title: "Approve & Sync to Tern CRM",
                    text: "Click 'Approve & Sync to Tern' (either in the portal with 1 click or on your phone via WhatsApp). Tern creates the traveler profile and itinerary draft."
                  },
                  {
                    step: "5",
                    title: "Guest Authorizes on Tern",
                    text: "Send the published Tern proposal link to the guest. Tern handles the credit card authorization, waivers, and payments natively with 100% bank-grade safety."
                  }
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4 p-4 rounded-xl bg-stone-950/60 border border-stone-800">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-stone-100">{item.title}</h4>
                      <p className="text-xs text-stone-400 mt-1 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "faqs" && (
            <div className="space-y-4 max-w-3xl mx-auto py-2">
              {FAQS.map((faq, i) => (
                <div key={i} className="p-4 rounded-xl bg-stone-950/60 border border-stone-800 space-y-2">
                  <h4 className="text-sm font-semibold text-amber-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    {faq.q}
                  </h4>
                  <p className="text-xs text-stone-300 leading-relaxed pl-6">{faq.a}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-800 bg-stone-950 flex items-center justify-between text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Founder Care Platform · Tern Travel Partner Engine · Grand Travel Host Agency</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
