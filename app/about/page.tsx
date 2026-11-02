"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  Sparkles,
  Compass,
  ShieldCheck,
  Globe,
  Award,
  Trophy,
  Briefcase,
  Mail,
  Share2,
  Heart,
} from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";

export default function AboutPage() {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
      {/* 1. PHILOSOPHY & FOUNDERS HERO */}
      <section className="space-y-12">
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-sand border border-sand-border px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-olive font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            <span>The Founders of KAI Wellness Retreats • Grand Travel & Cruise</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-sage font-light leading-[1.08] tracking-tight">
            &ldquo;KAI Wellness Retreats is a place where your peace within can blend with the pieces around.&rdquo;
          </h1>

          <p className="text-sm sm:text-base text-sage/85 leading-relaxed font-light max-w-3xl mx-auto">
            Co-founded by <strong>Kareena Islam, BSN, RN, RYT</strong> and <strong>Armaan Islam</strong>, KAI unites high-acuity clinical nursing science, 432Hz somatic sound restoration, Ironman endurance discipline, and strategic business execution—all anchored by 25+ years of global luxury travel mastery at <strong>Grand Travel & Cruise</strong> and deep cultural integrations.
          </p>

          {/* Direct Founder Inquiry Routing Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-sand-border bg-linen px-5 py-3 text-xs text-sage shadow-sm">
            <span className="font-semibold text-olive uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-terracotta" /> Direct Founders Inquiry Desk:
            </span>
            <a
              href="mailto:kareena@grandtravelcruise.com"
              className="font-medium text-sage hover:text-terracotta underline transition-colors"
            >
              kareena@grandtravelcruise.com
            </a>
            <span className="text-sage/40">&amp;</span>
            <a
              href="mailto:armaan@grandtravelcruise.com"
              className="font-medium text-sage hover:text-terracotta underline transition-colors"
            >
              armaan@grandtravelcruise.com
            </a>
            <span className="rounded-full bg-terracotta/15 text-terracotta px-2.5 py-0.5 text-[10px] font-semibold">
              2027 Sanctuary Inquiries Open
            </span>
          </div>
        </div>

        {/* 2. DENSE DUAL FOUNDER DOSSIERS: KAREENA ISLAM & ARMAAN ISLAM */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* FOUNDER 1: KAREENA ISLAM */}
          <article className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-md flex flex-col justify-between">
            <div>
              <div className="relative h-80 w-full overflow-hidden bg-sand">
                <Image
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"
                  alt="Kareena Islam, BSN, RN, RYT — Co-Founder of KAI Wellness Retreats"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/90 via-sage-dark/30 to-transparent" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-linen/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-olive">
                    Co-Founder &amp; Clinical Director
                  </span>
                  <span className="rounded-full bg-terracotta px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-linen">
                    BSN, RN • RYT • 432Hz Sound
                  </span>
                </div>
                <div className="absolute bottom-5 left-6 right-6 text-linen">
                  <h2 className="font-serif text-3xl sm:text-4xl font-light">
                    Kareena Islam, BSN, RN, RYT
                  </h2>
                  <p className="text-xs text-sand-muted mt-0.5">
                    Registered Nurse • Somatic &amp; Crystal Sound Healer • National Future Leaders in Travel Honoree
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  <strong>Kareena Islam</strong> created KAI Wellness Retreats out of a clinical and personal imperative: modern high-performers are burning out at a cellular level, yet conventional vacations only mask exhaustion. A proud graduate of <strong>Texas A&amp;M University (BSN, RN)</strong> with intensive clinical experience in acute surgical and hospital care across premier Texas medical centers (including <strong>Memorial Hermann</strong> and <strong>HCA Healthcare</strong>), Kareena spent years caring for patients at their most vulnerable—observing firsthand how chronic sympathetic stress, broken circadian sleep, and unexpressed somatic tension erode cardiovascular and immune health.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Raised inside <strong>Grand Travel &amp; Cruise</strong>—a 25+ year luxury host agency powerhouse founded alongside Jay Islam (Funjet 500 Club)—and hand-selected nationally as a <strong><em>Future Leaders in Travel</em> Honoree</strong>, Kareena bridges evidence-based clinical restoration with anatomical yoga, 432Hz crystal singing bowl entrainment, and authentic cultural reverence.
                </p>

                {/* Dense Credential Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-terracotta" /> Clinical Medicine
                    </span>
                    <p className="text-xs text-sage font-medium">Texas A&amp;M BSN, RN</p>
                    <p className="text-[11px] text-sage/75">
                      Acute &amp; Surgical Nursing (Memorial Hermann, HCA); vagal tone &amp; cortisol regulation protocols.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-terracotta" /> Somatic &amp; Acoustic
                    </span>
                    <p className="text-xs text-sage font-medium">RYT Yoga &amp; 432Hz Sound</p>
                    <p className="text-[11px] text-sage/75">
                      Orthopedic alignment vinyasa, myofascial Yin release, 4-7-8 breathwork &amp; crystal bowl theta entrainment.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-terracotta" /> Industry Recognition
                    </span>
                    <p className="text-xs text-sage font-medium">Future Leaders in Travel</p>
                    <p className="text-[11px] text-sage/75">
                      National luxury advisor honoree commanding preferred resort contracts &amp; private sanctuary buyouts.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-terracotta" /> Holistic Guest Care
                    </span>
                    <p className="text-xs text-sage font-medium">Personalized Somatic Support</p>
                    <p className="text-[11px] text-sage/75">
                      Personal pre-retreat consultation to honor dietary preferences, physical comfort, and restorative goals.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-4 bg-sand/40 border-t border-sand-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <a
                href="mailto:kareena@grandtravelcruise.com"
                className="font-medium text-sage hover:text-terracotta flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-terracotta" />
                kareena@grandtravelcruise.com
              </a>
              <div className="flex items-center gap-2">
                <a
                  href="https://www.instagram.com/kareenatravelrn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-olive hover:text-terracotta"
                >
                  <InstagramIcon className="h-3 w-3" /> @kareenatravelrn
                </a>
              </div>
            </div>
          </article>

          {/* FOUNDER 2: ARMAAN ISLAM */}
          <article className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-md flex flex-col justify-between">
            <div>
              <div className="relative h-80 w-full overflow-hidden bg-sand">
                <Image
                  src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85"
                  alt="Armaan Islam — Co-Founder, Ironman Athlete & Chief Business Officer of KAI Wellness Retreats"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/90 via-sage-dark/35 to-transparent" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-linen/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-olive">
                    Co-Founder &amp; Chief Business Officer
                  </span>
                  <span className="rounded-full bg-terracotta px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-linen">
                    Ironman Triathlete • Business Strategy
                  </span>
                </div>
                <div className="absolute bottom-5 left-6 right-6 text-linen">
                  <h2 className="font-serif text-3xl sm:text-4xl font-light">
                    Armaan Islam
                  </h2>
                  <p className="text-xs text-sand-muted mt-0.5">
                    Ironman Endurance Athlete • Business Operations &amp; Strategy • Grand Travel &amp; Cruise Executive
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6">
                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  <strong>Armaan Islam</strong> brings the relentless discipline of an <strong>Ironman endurance athlete</strong> and the analytical rigor of a seasoned business architect to KAI Wellness Retreats. Having trained for and conquered the grueling 140.6-mile Ironman triathlon distance (2.4-mile open-water swim, 112-mile bike, and 26.2-mile marathon run), Armaan understands at a physiological level that peak human output is impossible without structured, science-backed recovery.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Leading business strategy, commercial partnerships, and executive retreat operations across KAI and <strong>Grand Travel &amp; Cruise</strong>, Armaan bridges the gap between high-stakes business leadership and physical longevity. He co-architects KAI’s endurance recovery tracks, metabolic conditioning protocols, resort contract negotiations (including our flagship 2027 launch at <strong>Marival Harmony in Puerto Vallarta</strong>), and bespoke concierge workflows.
                </p>

                {/* Dense Credential Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-terracotta" /> Endurance Athletics
                    </span>
                    <p className="text-xs text-sage font-medium">Ironman Triathlete (140.6)</p>
                    <p className="text-[11px] text-sage/75">
                      Aerobic base conditioning, HRV-guided recovery, electrolyte &amp; thermal adaptation, mental grit under fatigue.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-terracotta" /> Business Focus
                    </span>
                    <p className="text-xs text-sage font-medium">Operations &amp; Growth Lead</p>
                    <p className="text-[11px] text-sage/75">
                      Executive leadership retreats, corporate wellness underwriting, wholesale resort contracting &amp; unit economics.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5 text-terracotta" /> Travel Infrastructure
                    </span>
                    <p className="text-xs text-sage font-medium">Grand Travel &amp; Cruise</p>
                    <p className="text-[11px] text-sage/75">
                      Global supplier negotiations, group air desk coordination, and VIP ground logistics across Mexico, Costa Rica &amp; Europe.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-terracotta" /> White-Glove Hospitality
                    </span>
                    <p className="text-xs text-sage font-medium">Seamless Guest Logistics</p>
                    <p className="text-[11px] text-sage/75">
                      End-to-end itinerary coordination, private ground transfers, and dedicated founder attention.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 sm:px-8 py-4 bg-sand/40 border-t border-sand-border flex flex-wrap items-center justify-between gap-3 text-xs">
              <a
                href="mailto:armaan@grandtravelcruise.com"
                className="font-medium text-sage hover:text-terracotta flex items-center gap-1.5"
              >
                <Mail className="h-3.5 w-3.5 text-terracotta" />
                armaan@grandtravelcruise.com
              </a>
              <div className="flex items-center gap-2">
                <a
                  href="https://grandtravelcruise.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-olive hover:text-terracotta"
                >
                  <Compass className="h-3 w-3" /> Grand Travel Executive Desk
                </a>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* 3. CULTURAL INTEGRATIONS: PEACE WITHIN BLENDING WITH THE PIECES AROUND */}
      <section id="cultural-integrations" className="rounded-3xl border border-sand-border bg-sand/50 p-8 sm:p-14 space-y-10">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            <Globe className="h-4 w-4 text-terracotta" />
            Cultural Integrations • Core Philosophy
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            Where Your Peace Within Can Blend With The Pieces Around
          </h2>
          <p className="text-sm text-sage/85 leading-relaxed">
            True restoration does not happen behind closed resort walls detached from the soul of a destination. Kareena and Armaan design every KAI sanctuary so your internal nervous system stillness (<em>your peace within</em>) harmonizes with the living traditions, ecology, cuisine, and artisans of our host communities (<em>the pieces around</em>).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <span className="rounded-full bg-terracotta/15 text-terracotta px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              Puerto Vallarta • Jan 28–31, 2027
            </span>
            <h3 className="font-serif text-xl text-sage font-normal">
              Wixárika Art &amp; Coastal Jalisco Heritage
            </h3>
            <p className="text-xs text-sage/80 leading-relaxed">
              At <strong>Marival Harmony (Armony)</strong>, guests engage in authentic Wixárika (Huichol) yarn and beadwork dialogues, sacred coastal cacao &amp; copal intention ceremonies, Sierra Madre herbal steam hydrotherapy, and Banderas Bay whale migration ecology.
            </p>
          </div>

          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <span className="rounded-full bg-sand text-olive px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              Nosara, Costa Rica • Coming Soon
            </span>
            <h3 className="font-serif text-xl text-sage font-normal">
              Nicoya Blue Zone &amp; Chorotega Wisdom
            </h3>
            <p className="text-xs text-sage/80 leading-relaxed">
              Immersing in one of the world’s five official Blue Zones—learning longevity nutrition, ancestral Chorotega clay traditions, and medicinal rainforest ethnobotany with local Guanacaste healers.
            </p>
          </div>

          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <span className="rounded-full bg-sand text-olive px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              Amalfi Coast, Italy • Coming Soon
            </span>
            <h3 className="font-serif text-xl text-sage font-normal">
              Campanian Harvest &amp; Maritime Heritage
            </h3>
            <p className="text-xs text-sage/80 leading-relaxed">
              Walking terraced Sfusato lemon groves in Ravello, cold-pressing single-estate olive oil with multi-generational Italian families, and sailing traditional wooden gozzo boats into quiet sea grottos.
            </p>
          </div>

          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <span className="rounded-full bg-sand text-olive px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              Ubud &amp; Sidemen, Bali • Coming Soon
            </span>
            <h3 className="font-serif text-xl text-sage font-normal">
              Tri Hita Karana &amp; Melukat Blessings
            </h3>
            <p className="text-xs text-sage/80 leading-relaxed">
              Honoring the Balinese philosophy of harmony between spirit, people, and nature through private Melukat holy water purification rituals led by hereditary priests and village Jamu apothecaries.
            </p>
          </div>
        </div>
      </section>

      {/* 4. GRAND TRAVEL & CRUISE SOCIAL MEDIA & AGENCY HERITAGE */}
      <section className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-14 space-y-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              <Share2 className="h-3.5 w-3.5 text-terracotta" />
              Grand Travel &amp; Cruise • Official Social Media &amp; Contact Hub
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
              Connect With KAI Wellness Retreats &amp; Grand Travel &amp; Cruise
            </h2>
            <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
              Backed by 25+ years of host agency excellence founded with <strong>Jay Islam</strong> (Funjet 500 Club), <strong>Grand Travel &amp; Cruise</strong> powers all air, resort, and private transfer logistics for KAI Wellness Retreats. Follow our official channels for live retreat dispatches, cultural previews from Puerto Vallarta, and luxury travel insights.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <a
              href="https://www.instagram.com/grandtravelcruise/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-sand-border bg-sand/50 p-4 hover:border-terracotta transition-colors flex items-center gap-3"
            >
              <InstagramIcon className="h-5 w-5 text-terracotta shrink-0" />
              <div>
                <span className="font-semibold text-sage block">@grandtravelcruise</span>
                <span className="text-[11px] text-sage/70">Grand Travel Instagram</span>
              </div>
            </a>

            <a
              href="https://www.instagram.com/kaiwellnessretreats/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-sand-border bg-sand/50 p-4 hover:border-terracotta transition-colors flex items-center gap-3"
            >
              <InstagramIcon className="h-5 w-5 text-terracotta shrink-0" />
              <div>
                <span className="font-semibold text-sage block">@kaiwellnessretreats</span>
                <span className="text-[11px] text-sage/70">Official KAI Sanctuary Feed</span>
              </div>
            </a>

            <a
              href="https://www.instagram.com/kareenatravelrn/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-sand-border bg-sand/50 p-4 hover:border-terracotta transition-colors flex items-center gap-3"
            >
              <InstagramIcon className="h-5 w-5 text-olive shrink-0" />
              <div>
                <span className="font-semibold text-sage block">@kareenatravelrn</span>
                <span className="text-[11px] text-sage/70">Kareena Islam, BSN, RN</span>
              </div>
            </a>

            <a
              href="https://grandtravelcruise.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-sand-border bg-sand/50 p-4 hover:border-terracotta transition-colors flex items-center gap-3"
            >
              <Compass className="h-5 w-5 text-olive shrink-0" />
              <div>
                <span className="font-semibold text-sage block">grandtravelcruise.com</span>
                <span className="text-[11px] text-sage/70">Luxury Host Agency &amp; Global Consortia</span>
              </div>
            </a>
          </div>
        </div>

        <div className="pt-4 border-t border-sand-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-sage/80">
            <Heart className="h-4 w-4 text-terracotta" />
            <span>
              All inquiries route directly to <strong>kareena@grandtravelcruise.com</strong> &amp; <strong>armaan@grandtravelcruise.com</strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/testimonials"
              className="rounded-full border border-sand-border bg-sand px-5 py-2.5 text-xs font-medium text-sage hover:bg-sand-muted transition-colors"
            >
              View Past Retreat Photos &amp; Testimonials
            </Link>
            <Link
              href="/book?retreat=puerto-vallarta-2027"
              className="rounded-full bg-sage px-6 py-2.5 text-xs uppercase tracking-widest text-linen font-semibold hover:bg-sage-dark transition-all shadow"
            >
              Reserve Puerto Vallarta (Jan 28–31, 2027)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
