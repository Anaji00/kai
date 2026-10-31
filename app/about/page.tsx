"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Activity, Sparkles, Compass, ShieldCheck, Globe, Plane, Award } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";

export default function AboutPage() {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-24">
      {/* 1. HERO PROFILE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Visual & Badges */}
        <div className="lg:col-span-5 relative">
          <div className="relative h-[520px] w-full rounded-3xl overflow-hidden border border-sand-border shadow-xl">
            <Image
              src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"
              alt="Kareena Islam"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sage/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-linen">
              <span className="text-[10px] uppercase tracking-widest text-sand-border">
                Founder & Clinical Director
              </span>
              <h1 className="font-serif text-3xl font-light">Kareena Islam</h1>
              <p className="text-xs text-sand-muted">BSN, RN • RYT • Luxury Travel Advisor</p>
            </div>
          </div>

          {/* Floated credential card */}
          <div className="absolute -bottom-6 -right-4 sm:right-6 rounded-2xl border border-sand-border bg-linen p-4 shadow-xl flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sand text-terracotta font-serif text-lg">
              界
            </div>
            <div className="text-xs">
              <span className="font-semibold text-sage block">KAI • Japanese for Renewal</span>
              <span className="text-[11px] text-olive">Return to balance & presence</span>
            </div>
          </div>
        </div>

        {/* Narrative bio */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-sand border border-sand-border px-4 py-1 text-xs uppercase tracking-[0.2em] text-olive font-semibold">
            <span>The Founder’s Journey</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light leading-tight">
            Bridging High-Acuity Medicine with Sacred Somatic Rest
          </h2>

          <p className="text-base text-sage/85 leading-relaxed font-light">
            KAI Wellness Retreats was created by <strong>Kareena Islam</strong> out of a clinical and personal imperative: modern high-performers are burning out at a cellular level, yet most wellness escapes offer only superficial remedies.
          </p>

          <p className="text-sm text-sage/80 leading-relaxed">
            As a Registered Nurse with intensive clinical experience in acute surgical care across premier Houston medical institutions (including Memorial Hermann and HCA Healthcare) and a proud graduate of Texas A&M, Kareena spent years observing the devastating toll of chronic bodily stress. She witnessed how relentless pressure, broken sleep cycles, and unexpressed physical tension erode cardiovascular health, vitality, and emotional peace.
          </p>

          <p className="text-sm text-sage/80 leading-relaxed">
            Growing up inside <strong>Grand Travel & Cruise</strong>—a 25+ year host agency powerhouse founded by her father Jay Islam and honored with Funjet 500 Club elite status—Kareena mastered the luxury travel industry from the inside out. Hand-selected as a national <em>Future Leaders in Travel</em> Honoree, she commands immense industry buying power to negotiate the best deals, full private estate buyouts, and preferred group flights. Equally vital, her deep-rooted relationships with locals and sacred customs ensure guests experience authentic cultural immersion and effortless, zero-friction logistics rather than commercial tourist bubbles.
          </p>

          <p className="text-sm text-sage/80 leading-relaxed">
            By fusing acute medical science with restorative yoga, crystal bowl sound healing, and elite travel curation, Kareena designed KAI: sanctuaries where evidence-based health, deep cultural reverence, and quiet luxury converse fluently.
          </p>

          {/* Social connections */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="https://www.instagram.com/kaiwellnessretreats/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-sand px-4 py-2 text-xs text-sage hover:text-terracotta hover:border-terracotta transition-colors"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              <span>@kaiwellnessretreats</span>
            </a>

            <a
              href="https://www.instagram.com/kareenatravelrn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-sand px-4 py-2 text-xs text-sage hover:text-terracotta hover:border-terracotta transition-colors"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              <span>@kareenatravelrn</span>
            </a>

            <a
              href="https://grandtravelcruise.com/about-us/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-sand px-4 py-2 text-xs text-sage hover:text-terracotta hover:border-terracotta transition-colors"
            >
              <Compass className="h-3.5 w-3.5" />
              <span>Grand Travel & Cruise</span>
            </a>
          </div>
        </div>
      </section>

      {/* 2. THE THREE FOUNDATIONAL CREDENTIALS */}
      <section id="triad-of-care" className="space-y-10 border-t border-sand-border/80 pt-16">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
            Integrative Competency
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light mt-1">
            The Three Disciplines
          </h2>
          <p className="text-xs sm:text-sm text-sage/75 mt-3">
            Every element of a KAI itinerary is verified through three distinct lenses before a single guest arrives.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="rounded-3xl border border-sand-border bg-linen p-8 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-soft text-olive border border-olive/20">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-2xl text-sage font-normal">
              1. Registered Nurse (BSN, RN)
            </h3>
            <p className="text-xs text-olive font-medium">
              Texas A&M Graduate • Nurse-Led Restorative Care
            </p>
            <p className="text-xs text-sage/80 leading-relaxed">
              Trained in high-pressure acute care hospital systems (Memorial Hermann, HCA Healthcare). Grounded in the physiological realities of nervous system balance, deep sleep restoration, inflammation markers, and patient safety protocols.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-3xl border border-sand-border bg-linen p-8 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta border border-terracotta/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-2xl text-sage font-normal">
              2. Certified Yoga & Sound Teacher
            </h3>
            <p className="text-xs text-terracotta font-medium">
              Anatomical Alignment • Crystal Singing Bowls
            </p>
            <p className="text-xs text-sage/80 leading-relaxed">
              RYT certified teacher specializing in restorative Yin, myofascial release, and pranayama. Trained under master sound mentors to guide acoustic 432Hz crystal bowl sound journeys.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl border border-sand-border bg-linen p-8 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-sage border border-sand-border">
              <Compass className="h-6 w-6 text-sage" />
            </div>
            <h3 className="font-serif text-2xl text-sage font-normal">
              3. Luxury Travel Powerhouse
            </h3>
            <p className="text-xs text-sage font-medium">
              Grand Travel & Cruise • Future Leaders in Travel Honoree
            </p>
            <p className="text-xs text-sage/80 leading-relaxed">
              Rooted in 25+ years of host agency leadership alongside Jay Islam (Funjet 500 Club). Hand-selected as a national Future Leaders in Travel Honoree, Kareena commands high-volume leverage to secure private estate buyouts, preferred rates, authentic connections to local customs, and zero-friction travel logistics.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CLINICAL RESTORATIVE SCIENCE BREAKDOWN */}
      <section id="clinical-science" className="rounded-3xl border border-sand-border bg-sand/60 p-8 sm:p-14 space-y-12">
        <div className="max-w-3xl space-y-3">
          <span className="text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            Evidence-Based Methodology
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            The Clinical Science Behind KAI
          </h2>
          <p className="text-sm text-sage/80 leading-relaxed">
            At KAI, somatic wellness is not an abstract concept; it is an intentional, guided transition into deep nervous system rest and physical renewal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Pillar 1 */}
          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <div className="text-2xl font-serif text-terracotta">01</div>
            <h4 className="font-serif text-xl text-sage font-normal">
              Chronic Stress &amp; Fight-or-Flight Release
            </h4>
            <p className="text-xs text-sage/80 leading-relaxed">
              Prolonged stress traps the body in constant fight-or-flight tension (elevated cortisol, shallow breathing, constricted blood vessels). Through slow-paced pranayama (e.g. 4-7-8 rhythm) and intentional quietude, we gently stimulate the vagus nerve to initiate deep bodily calm and restorative rest.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <div className="text-2xl font-serif text-terracotta">02</div>
            <h4 className="font-serif text-xl text-sage font-normal">
              Somatic Release & Acoustic Entrainment
            </h4>
            <p className="text-xs text-sage/80 leading-relaxed">
              Trauma and stress are stored physically in fascial networks, particularly the psoas muscle. Combining myofascial Yin holds with 432Hz crystal singing bowl sound baths creates physical and acoustic resonance, entraining erratic brainwaves into meditative theta states.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3">
            <div className="text-2xl font-serif text-terracotta">03</div>
            <h4 className="font-serif text-xl text-sage font-normal">
              Circadian & Biomarker Optimization
            </h4>
            <p className="text-xs text-sage/80 leading-relaxed">
              Every sanctuary itinerary is scheduled around natural solar cycles. Morning natural light exposure resets master clock retinal receptors to elevate daytime energy and optimize nighttime melatonin synthesis, accompanied by anti-inflammatory, antioxidant-rich regional cuisine.
            </p>
          </div>
        </div>
      </section>

      {/* 4. THE GRAND TRAVEL ADVANTAGE & CULTURAL IMMERSION */}
      <section className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-14 space-y-12 shadow-sm">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-olive font-semibold">
            <Award className="h-3.5 w-3.5 text-olive" />
            Host Agency Power & Local Intimacy
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            The Grand Travel Advantage: Unmatched Value, Locals & Logistics
          </h2>
          <p className="text-sm text-sage/80 leading-relaxed font-light">
            Wellness retreats frequently suffer from one of two flaws: they either charge extortionate rates through layers of third-party brokers, or they isolate guests in sterile resort compounds far removed from local life. KAI eliminates both through Kareena’s lifelong standing in luxury travel.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: Best Deals */}
          <div className="rounded-2xl border border-sand-border bg-sand/40 p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linen text-sage border border-sand-border">
              <ShieldCheck className="h-5 w-5 text-sage" />
            </div>
            <h4 className="font-serif text-xl text-sage font-normal">
              Best Deals in the Industry
            </h4>
            <p className="text-xs text-olive font-medium">
              25+ Years Host Agency Clout
            </p>
            <p className="text-xs text-sage/80 leading-relaxed">
              Grand Travel & Cruise’s Funjet 500 Club elite status and high-volume wholesale relationships unlock exclusive private estate buyouts, preferred flight blocks, and complimentary villa upgrades that independent travelers or typical retreats cannot match.
            </p>
          </div>

          {/* Card 2: Knowledge of Locals & Sacred Customs */}
          <div className="rounded-2xl border border-sand-border bg-sand/40 p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta border border-terracotta/20">
              <Globe className="h-5 w-5" />
            </div>
            <h4 className="font-serif text-xl text-sage font-normal">
              Sacred Customs & Local Roots
            </h4>
            <p className="text-xs text-terracotta font-medium">
              Truly Immersive, Respectful Cultural Access
            </p>
            <p className="text-xs text-sage/80 leading-relaxed">
              As a Future Leaders in Travel Honoree, Kareena cultivates personal relationships with local elders, priests, artisans, and organic farmers. Guests participate in authentic spiritual and culinary traditions—from Balinese Melukat blessings to Tuscan harvest tables—with genuine cultural reverence.
            </p>
          </div>

          {/* Card 3: Zero-Friction VIP Logistics */}
          <div className="rounded-2xl border border-sand-border bg-sand/40 p-6 space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-olive-soft text-olive border border-olive/20">
              <Plane className="h-5 w-5" />
            </div>
            <h4 className="font-serif text-xl text-sage font-normal">
              Zero-Friction VIP Logistics
            </h4>
            <p className="text-xs text-olive font-medium">
              Dedicated Flight & Ground Concierge
            </p>
            <p className="text-xs text-sage/80 leading-relaxed">
              Travel stress is the primary obstacle to nervous system reset. Grand Travel & Cruise manages flight routing, schedule change protection, luggage logistics, and private luxury ground escorts so your decompression begins before wheels touch the runway.
            </p>
          </div>
        </div>

        {/* Founder note */}
        <div className="rounded-2xl border border-sand-border bg-sand/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <p className="font-serif text-base text-sage font-medium">
              &ldquo;Travel should never cause stress—it should be an effortless bridge to renewal.&rdquo;
            </p>
            <p className="text-xs text-sage/75">
              Kareena Islam • Honored Future Leaders in Travel Advisor & Clinical Nurse
            </p>
          </div>
          <Link
            href="/retreats"
            className="shrink-0 rounded-full bg-sage px-6 py-2.5 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow"
          >
            Explore Sanctuaries
          </Link>
        </div>
      </section>

      {/* 5. FOUNDER ETHOS & CALL TO ACTION */}
      <section className="relative overflow-hidden rounded-3xl bg-sage p-8 sm:p-14 text-linen text-center space-y-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <span className="text-xs uppercase tracking-[0.25em] text-sand font-medium">
            #LivingBIG • Be In Gratitude
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl font-light text-linen leading-tight">
            Ready to Experience True Renewal?
          </h2>
          <p className="text-sm text-sand-muted leading-relaxed font-light">
            Whether joining our Fall 2026 retreat in Riviera Maya or our 2027 international sanctuaries in Costa Rica, Italy, or Bali, your seat at the table is curated with care.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/retreats"
              className="w-full sm:w-auto rounded-full bg-linen px-8 py-3.5 text-xs uppercase tracking-widest font-medium text-sage hover:bg-sand transition-all shadow"
            >
              Explore 2027 Sanctuaries
            </Link>
            <Link
              href="/book"
              className="w-full sm:w-auto rounded-full border border-sand-border/40 bg-sage-muted/50 px-8 py-3.5 text-xs uppercase tracking-widest font-medium text-sand hover:bg-sage-muted transition-all"
            >
              Reserve Your Spot
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
