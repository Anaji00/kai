"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wind, ShieldCheck, Users, Compass, Activity, Heart, Award, Globe, Plane } from "lucide-react";
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
          {/* Eyebrow Pill */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-linen/90 backdrop-blur-md px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-olive font-medium shadow-sm mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta animate-pulse" />
            <span>Founded by Kareena Islam • 2026–2027 Sanctuaries</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-sage tracking-tight leading-[1.08]"
          >
            Where Clinical Science <br />
            <span className="italic font-normal text-sage-muted">
              Meets Somatic Restoration
            </span>
          </motion.h1>

          {/* Subtitle / Philosophy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-sage/80 leading-relaxed font-light"
          >
            <em>Kai</em> means renewal in Japanese — a return to balance, to presence, to yourself. 
            Small, nurse-led retreats with yoga, sound baths, good food, and time to get to know the place you’re visiting.
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

          {/* Micro trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-sage/75"
          >
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-olive" /> Registered Nurse Founded
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-olive" /> Intimate Groups (12–14 Guests)
            </span>
            <span className="flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-olive" /> Planned with Grand Travel & Cruise
            </span>
          </motion.div>
        </div>
      </section>

      {/* 2. THE TRIAD OF CARE */}
      <section className="relative bg-sand/50 py-24 px-4 sm:px-6 lg:px-8 border-t border-b border-sand-border/70">
        <div className="mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              The Founder’s Interdisciplinary Synergy
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light mt-2">
              The Triad of Care
            </h2>
            <p className="mt-4 text-sm sm:text-base text-sage/75 leading-relaxed">
              Most retreats force you to choose between sterile clinical wellness clinics and ungrounded esoteric getaways. KAI brings three distinct disciplines into harmony through founder Kareena Islam.
            </p>
          </div>

          {/* 3 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: The Nurse */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-olive-soft text-olive border border-olive/20">
                  <Activity className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-olive font-semibold">
                    Pillar 01
                  </span>
                  <h3 className="font-serif text-2xl text-sage font-normal mt-1">
                    The Nurse
                  </h3>
                  <p className="text-xs text-olive font-medium mt-0.5">
                    Nurse-Led Care & Restorative Science
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-sage/80">
                  With deep clinical foundations in acute and surgical nursing across Texas medical centers (Memorial Hermann, HCA Healthcare, Texas A&M graduate), Kareena brings a nurse’s eye to every retreat, from how the days are paced to how we plan around your health needs. Rest, daylight, movement, and slow breathing can help lower stress, ease tension, and improve sleep.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-sand-border/70">
                <ul className="space-y-1.5 text-xs text-sage/75">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                    <span>Breathwork that can help calm your nervous system</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                    <span>Daily rhythms that can help you sleep more deeply</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                    <span>Anti-inflammatory culinary design</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Pillar 2: The Yogi & Sound Practitioner */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta border border-terracotta/20">
                  <Sparkles className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-terracotta font-semibold">
                    Pillar 02
                  </span>
                  <h3 className="font-serif text-2xl text-sage font-normal mt-1">
                    The Yogi & Sound Healer
                  </h3>
                  <p className="text-xs text-terracotta font-medium mt-0.5">
                    Anatomical Alignment & Crystal Bowls
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-sage/80">
                  A certified yoga and somatic breathwork teacher, Kareena fuses precise orthopedic alignment with restorative Yin. Evenings often end with a crystal singing bowl sound bath, which can help quiet a busy mind and ease you toward sleep.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-sand-border/70">
                <ul className="space-y-1.5 text-xs text-sage/75">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span>Anatomically safe yoga for every body</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span>Acoustic crystal singing bowl baths</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span>Targeted myofascial & psoas release</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Pillar 3: The Luxury Travel Curator */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sand text-sage border border-sand-border">
                  <Compass className="h-7 w-7 text-sage" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-olive font-semibold">
                    Pillar 03
                  </span>
                  <h3 className="font-serif text-2xl text-sage font-normal mt-1">
                    The Travel Powerhouse
                  </h3>
                  <p className="text-xs text-sage font-medium mt-0.5">
                    Grand Travel & Cruise • Future Leaders in Travel
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-sage/80">
                  Backed by Grand Travel & Cruise (a 25+ year host agency powerhouse led by Jay Islam, Funjet 500 Club) and honored as a <em>Future Leaders in Travel</em> Honoree, Kareena leverages industry-leading buying power to secure private estate buyouts and the best rates in luxury travel. Her deep relationships with locals and sacred customs unlock truly immersive cultural journeys with zero-friction logistics.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-sand-border/70">
                <ul className="space-y-1.5 text-xs text-sage/75">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                    <span>Best industry rates & private estate buyouts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                    <span>Authentic local customs & sacred cultural access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                    <span>Zero-friction VIP flight & ground logistics</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. 2027 RETREAT HIGHLIGHTS */}
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
              Strictly limited to 12–14 participants per sanctuary to ensure an unhurried, personalized restorative journey.
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
                Grand Travel & Cruise’s Funjet 500 Club elite standing unlocks private villa estate buyouts, preferred group air contracts, and complimentary suite upgrades unavailable to ordinary travelers or boutique retreat hosts.
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
                Funjet 500 Club Member • Future Leaders in Travel Honoree • Dedicated Flight & VIP Ground Desk
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

      {/* 4. RESTORATIVE PHILOSOPHY & SOMATIC TESTIMONIAL */}
      <section className="relative bg-sage py-24 px-4 sm:px-6 lg:px-8 text-linen overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sage-muted/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-olive/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sand-border/30 bg-sage-muted/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-sand-muted font-light">
            <Heart className="h-3.5 w-3.5 text-terracotta-light" />
            <span>The Science of De-Escalation</span>
          </div>

          <blockquote className="font-serif text-2xl sm:text-4xl md:text-5xl font-light leading-snug text-linen">
            &ldquo;In modern life, high achievers live trapped in chronic stress and daily exhaustion — shallow breath, constant urgency, and hidden fatigue. True wellness is not a generic spa day; it is teaching your nervous system how to feel safe enough to rest.&rdquo;
          </blockquote>

          <div className="pt-2">
            <cite className="not-italic block">
              <span className="font-serif text-xl text-sand block">Kareena Islam</span>
              <span className="text-xs uppercase tracking-widest text-sand-border/80">
                Founder, Registered Nurse & Somatic Educator
              </span>
            </cite>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-sand-border/20 text-left">
            <div className="space-y-1.5">
              <span className="font-serif text-3xl text-sand-muted">01</span>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-sand">
                Nervous System Shift
              </h4>
              <p className="text-xs text-sand-border/70 leading-relaxed">
                Transitioning out of fight-or-flight into natural bodily calm and peaceful sleep through intentional breath and silence.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-serif text-3xl text-sand-muted">02</span>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-sand">
                Sound and Stillness
              </h4>
              <p className="text-xs text-sand-border/70 leading-relaxed">
                Sound baths can help you feel deeply relaxed, quiet a racing mind, and let go of the day.
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="font-serif text-3xl text-sand-muted">03</span>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-sand">
                Inclusive Healing
              </h4>
              <p className="text-xs text-sand-border/70 leading-relaxed">
                Designed for every body, every age, and every stage. Free from performance pressure or spiritual dogmatism.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ABOUT FOUNDER TEASER */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Image & credential stack */}
          <div className="lg:col-span-5 relative">
            <div className="relative h-[480px] w-full rounded-3xl overflow-hidden border border-sand-border shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"
                alt="Kareena Islam leading somatic meditation"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sage/70 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-linen">
                <span className="text-[10px] uppercase tracking-widest text-sand-border">
                  Founder & Clinical Director
                </span>
                <h4 className="font-serif text-2xl font-light">Kareena Islam</h4>
                <p className="text-xs text-sand-muted">BSN, RN • RYT • Luxury Travel Advisor</p>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="absolute -bottom-5 -right-5 rounded-2xl border border-sand-border bg-linen p-4 shadow-xl hidden sm:flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-terracotta font-serif">
                界
              </div>
              <div className="text-xs">
                <span className="font-medium text-sage block">Future Leaders in Travel</span>
                <span className="text-[10px] text-olive">Honoree & Guide</span>
              </div>
            </div>
          </div>

          {/* Narrative description */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              The Heart Behind KAI
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light leading-tight">
              &ldquo;I spent years caring for patients at their most vulnerable. KAI was born to protect your health before the crisis.&rdquo;
            </h2>

            <p className="text-sm leading-relaxed text-sage/80">
              Having graduated from Texas A&M and navigated intense acute and operating room hospital environments, Kareena witnessed firsthand how chronic, unaddressed stress manifests in physical illness. 
            </p>

            <p className="text-sm leading-relaxed text-sage/80">
              By combining clinical nursing credentials with advanced yoga certifications and deep luxury travel heritage alongside her father Jay Islam at Grand Travel & Cruise, Kareena crafts sanctuaries that nourish body, mind, and spirit without compromise.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow-sm"
              >
                <span>Read Kareena’s Full Story</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="https://www.instagram.com/kaiwellnessretreats/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-sand px-5 py-3 text-xs text-sage hover:bg-sand-muted transition-colors font-medium"
              >
                <span>Follow @kaiwellnessretreats</span>
              </a>
            </div>
          </div>
        </div>
      </section>
 
      {/* 6. GUEST EXPERIENCES & TESTIMONIALS */}
      <TestimonialsSection />

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
