"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wind, ShieldCheck, Compass, Award, Globe, Plane } from "lucide-react";
import { RETREATS } from "@/lib/retreats";
import RetreatGrid from "@/components/RetreatGrid";
import SoundAndBreathModal from "@/components/SoundAndBreathModal";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";

export default function HomePage() {
  const [somaticModalOpen, setSomaticModalOpen] = useState(false);

  // Take the 3 flagship 2027 retreats + Riviera Maya highlight
  const featuredRetreats = RETREATS.filter((r) => r.year === 2027);

  return (
    <div className="relative overflow-hidden">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[92vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        {/* Ambient Background with subtle coastal tone */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=85"
            alt="Tranquil ocean horizon"
            fill
            priority
            className="object-cover object-center brightness-[0.93] contrast-[0.95]"
          />
          {/* Layered luxury overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-linen/85 via-linen/70 to-linen" />
          <div className="absolute inset-0 subtle-grain opacity-40" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          {/* Brand Emblem & Sanctuary Year */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 flex flex-col items-center justify-center"
          >
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden mb-3">
              <img
                src="/kai-logo.png"
                alt="KAI Wellness Retreats"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="inline-flex items-center rounded-full border border-sand-border bg-linen/90 backdrop-blur-md px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-olive font-medium shadow-2xs">
              <span>2026–2027 Sanctuaries</span>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-sage tracking-tight leading-[1.08]"
          >
            A Journey of Movement, <br />
            <span className="italic font-normal text-sage-muted">
              Culture &amp; Connection
            </span>
          </motion.h1>

          {/* Subtitle / Philosophy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-sage/80 leading-relaxed font-light"
          >
            <em>Kai</em> represents renewal and restoration — a return to balance, to presence, and to yourself. Thoughtfully curated retreats with restorative movement, acoustic sound healing, nourishing culinary design, and deep cultural immersion.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/retreats"
              className="group flex items-center justify-center gap-3 rounded-full bg-sage px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium text-linen hover:bg-sage-dark transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
            >
              <span>Explore 2027 Sanctuaries</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              onClick={() => setSomaticModalOpen(true)}
              className="flex items-center justify-center gap-2.5 rounded-full border border-sand-border bg-sand/80 backdrop-blur-md px-6 py-4 text-xs uppercase tracking-[0.2em] font-medium text-sage hover:bg-sand transition-all w-full sm:w-auto"
            >
              <Wind className="h-4 w-4 text-terracotta" />
              <span>Experience Somatic Reset</span>
            </button>
          </motion.div>

          {/* Brand Positioning: Powered by Grand Travel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 flex items-center justify-center"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-sand/60 px-5 py-2 text-xs text-sage/85 shadow-2xs">
              <Compass className="h-4 w-4 text-terracotta" />
              <span className="tracking-[0.18em] uppercase text-[11px] font-medium text-sage">Powered by Grand Travel</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 2. 2027 RETREAT HIGHLIGHTS */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              The 2027 Calendar
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light mt-2">
              Featured Sanctuaries
            </h2>
            <p className="text-sm text-sage/75 mt-2 max-w-xl">
              Thoughtfully curated sanctuary destinations designed for an unhurried, personalized restorative journey and deep cultural discovery.
            </p>
          </div>

          <Link
            href="/retreats"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-olive font-semibold hover:text-terracotta transition-colors self-start md:self-auto"
          >
            <span>View All Destinations & Schedules</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 3 Flagship Cards */}
        <RetreatGrid retreats={featuredRetreats} className="grid grid-flow-row-dense grid-cols-1 md:grid-cols-3 gap-8" />

        {/* Fall 2026 Sneak Peek Banner */}
        <div className="mt-14 rounded-3xl border border-sand-border bg-sand/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="rounded-full bg-terracotta/10 text-terracotta border border-terracotta/30 px-3 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
              Upcoming 2026 Opportunity
            </span>
            <h3 className="font-serif text-2xl text-sage font-normal">
              KAI Fall Retreat • Riviera Maya, Mexico
            </h3>
            <p className="text-xs text-sage/75 max-w-2xl">
              October 1 – 4, 2026 at luxury adults-only El Dorado Seaside Palms. Rapid pre-holiday nervous system reset and renewal with oceanfront crystal bowl healing.
            </p>
          </div>

          <Link
            href="/book?retreat=riviera-2026"
            className="shrink-0 rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow"
          >
            View 2026 Details
          </Link>
        </div>
      </section>

      {/* THE TRAVEL INSIDER ADVANTAGE */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-sand-border/80">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            <Award className="h-3.5 w-3.5 text-terracotta" />
            The Travel Insider Advantage
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            Strong Travel Partnerships and Real Local Connections
          </h2>
          <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
            A truly restorative sanctuary cannot exist inside an isolated tourist bubble or an overpriced package. Backed by Grand Travel & Cruise and recognized by <em>Future Leaders in Travel</em>, Kareena Islam brings the luxury travel industry’s most coveted relationships directly to your retreat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Advantage 1: Best Deals & Estate Buyouts */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-sage border border-sand-border">
                <ShieldCheck className="h-6 w-6 text-sage" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Best Deals in the Industry
              </h3>
              <p className="text-xs text-olive font-medium">
                25+ Years Host Agency Volume
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Grand Travel & Cruise’s premier host agency standing secures private villa estate buyouts, preferred group air contracts, and complimentary suite upgrades unavailable to ordinary travelers or boutique retreat hosts.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium">
              ✓ Exclusive wholesale contract leverage
            </div>
          </div>

          {/* Advantage 2: Deep Knowledge of Locals & Sacred Customs */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta border border-terracotta/20">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Locals & Sacred Customs
              </h3>
              <p className="text-xs text-terracotta font-medium">
                Authentic Immersion, Zero Tourist Traps
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Kareena’s on-the-ground relationships welcome you into authentic cultural traditions—from sacred Melukat water blessings with Balinese high priests to generational olive harvest tables in Ravello and Blue Zone botanical medicine in Costa Rica.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium">
              ✓ Intimate cultural reverence & local artisans
            </div>
          </div>

          {/* Advantage 3: Zero-Friction VIP Logistics */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-soft text-olive border border-olive/20">
                <Plane className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Zero-Friction Logistics
              </h3>
              <p className="text-xs text-olive font-medium">
                White-Glove Airport & Flight Desk
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Travel can be stressful, and that stress can follow you to the retreat. Our concierge manages flight routing, schedule change protections, tarmac meet-and-greets, and private chauffeured transfers straight to sanctuary gates.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium">
              ✓ 24/7 dedicated flight monitoring & VIP transit
            </div>
          </div>

          {/* Advantage 4: Future Leaders in Travel Honoree */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-terracotta border border-sand-border">
                <Compass className="h-6 w-6 text-terracotta" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Future Leaders Honoree
              </h3>
              <p className="text-xs text-sage font-medium">
                National Luxury Travel Recognition
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Hand-picked among the country’s top next-generation travel innovators, Kareena pairs clinical nursing precision with experiential luxury and the #LivingBIG philosophy pioneered alongside Jay Islam.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium">
              ✓ Elite supplier access & VIP concierge care
            </div>
          </div>
        </div>

        {/* Clout Trust Banner */}
        <div className="mt-10 rounded-2xl border border-sand-border bg-sand/50 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linen text-sage font-serif text-sm border border-sand-border">
              GT
            </div>
            <div>
              <p className="font-serif text-sm text-sage font-medium">
                Grand Travel & Cruise • 25+ Years Host Agency Legacy
              </p>
              <p className="text-[11px] text-sage/75">
                Premier Host Agency Standing • Future Leaders in Travel Honoree • Dedicated Flight & VIP Ground Desk
              </p>
            </div>
          </div>

          <Link
            href="/about#triad-of-care"
            className="shrink-0 text-xs font-semibold text-terracotta hover:text-terracotta-dark uppercase tracking-wider inline-flex items-center gap-1.5"
          >
            <span>Read The Founder’s Heritage</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* 4. GUEST EXPERIENCES & TESTIMONIALS */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-sand-border/80">
        <TestimonialsSection />
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS */}
      <FAQSection />

      {/* Somatic Modal */}
      <SoundAndBreathModal
        isOpen={somaticModalOpen}
        onClose={() => setSomaticModalOpen(false)}
      />
    </div>
  );
}
