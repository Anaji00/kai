"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Wind,
  ShieldCheck,
  Compass,
  Activity,
  Heart,
  Award,
  Globe,
  Plane,
  Calendar,
  CloudSun,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { RETREATS } from "@/lib/retreats";
import RetreatCard from "@/components/RetreatCard";
import SoundAndBreathModal from "@/components/SoundAndBreathModal";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";

export default function HomePage() {
  const [somaticModalOpen, setSomaticModalOpen] = useState(false);

  // Flagship 2027 retreats (Puerto Vallarta first, plus upcoming 2027 placeholders)
  const featuredRetreats = RETREATS.filter((r) => r.year === 2027).slice(0, 3);

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
            className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-linen/90 backdrop-blur-md px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-olive font-medium shadow-sm mb-6"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-terracotta animate-pulse" />
            <span>Founded by Kareena Islam & Armaan Islam • First Retreat Jan 28–31, 2027</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-serif text-4xl sm:text-6xl md:text-7xl font-light text-sage tracking-tight leading-[1.08]"
          >
            Where Your Peace Within <br />
            <span className="italic font-normal text-sage-muted">
              Can Blend With The Pieces Around
            </span>
          </motion.h1>

          {/* Subtitle / Philosophy */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-sage/85 leading-relaxed font-light"
          >
            <em>Kai</em> means renewal in Japanese — a return to balance, to presence, to yourself.
            Immersive sanctuaries uniting <strong>Kareena Islam’s</strong> clinical nursing & 432Hz somatic healing, <strong>Armaan Islam’s</strong> Ironman endurance & strategic discipline, deep cultural integrations, and <strong>Grand Travel & Cruise</strong> luxury execution.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/book?retreat=puerto-vallarta-2027"
              className="group flex items-center justify-center gap-3 rounded-full bg-sage px-8 py-4 text-xs uppercase tracking-[0.2em] font-medium text-linen hover:bg-sage-dark transition-all shadow-md hover:shadow-lg w-full sm:w-auto"
            >
              <span>Reserve Puerto Vallarta (Jan 28–31, 2027)</span>
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
              <ShieldCheck className="h-4 w-4 text-olive" /> BSN, RN & Ironman Co-Founded
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-olive" /> Authentic Cultural Integrations
            </span>
            <span className="flex items-center gap-1.5">
              <Compass className="h-4 w-4 text-olive" /> Grand Travel & Cruise Curated
            </span>
          </motion.div>
        </div>
      </section>

      {/* 2. THE TRIAD OF CARE & FOUNDERS SYNERGY */}
      <section className="relative bg-sand/50 py-24 px-4 sm:px-6 lg:px-8 border-t border-b border-sand-border/70">
        <div className="mx-auto max-w-7xl">
          {/* Section Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              Kareena Islam & Armaan Islam • Interdisciplinary Synergy
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light mt-2">
              The Architecture of KAI
            </h2>
            <p className="mt-4 text-sm sm:text-base text-sage/75 leading-relaxed">
              KAI Wellness Retreats is a place where your peace within can blend with the pieces around—uniting clinical nursing science, somatic & acoustic restoration, Ironman endurance discipline, and 25+ years of luxury travel mastery.
            </p>
          </div>

          {/* 3 Pillars Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1: Clinical & Somatic Restoration (Kareena) */}
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
                    Pillar 01 • Kareena Islam, BSN, RN, RYT
                  </span>
                  <h3 className="font-serif text-2xl text-sage font-normal mt-1">
                    Clinical & Somatic Science
                  </h3>
                  <p className="text-xs text-olive font-medium mt-0.5">
                    Nurse-Led Nervous System & 432Hz Sound Restoration
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-sage/80">
                  With clinical foundations in acute and surgical nursing across Texas medical centers (Memorial Hermann, HCA Healthcare, Texas A&M BSN) and RYT yoga certification, Kareena grounds every sanctuary in physiological safety, vagal tone elevation, and 432Hz crystal bowl brainwave entrainment.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-sand-border/70">
                <ul className="space-y-1.5 text-xs text-sage/75">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                    <span>Vagus nerve & circadian cortisol resetting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                    <span>Anatomically safe yoga & 432Hz crystal sound baths</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-olive" />
                    <span>Anti-inflammatory regional culinary design</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Pillar 2: Endurance & Business Focus (Armaan) */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ duration: 0.3 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta border border-terracotta/20">
                  <Trophy className="h-7 w-7" />
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-terracotta font-semibold">
                    Pillar 02 • Armaan Islam
                  </span>
                  <h3 className="font-serif text-2xl text-sage font-normal mt-1">
                    Ironman Discipline & Business Strategy
                  </h3>
                  <p className="text-xs text-terracotta font-medium mt-0.5">
                    Endurance Recovery, Metabolic Resilience & Operations
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-sage/80">
                  An accomplished Ironman endurance triathlete (140.6-mile swim, bike, run discipline) and business strategist, Armaan brings high-output athletic recovery protocols, HRV metabolic conditioning, and executive operational precision to every KAI cohort.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-sand-border/70">
                <ul className="space-y-1.5 text-xs text-sage/75">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span>Ironman-tested endurance recovery & mobility</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span>Executive performance & cognitive stamina systems</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-terracotta" />
                    <span>Strategic partnership & corporate sanctuary architecture</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Pillar 3: Cultural Integrations & Travel Powerhouse */}
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
                    Pillar 03 • Grand Travel & Cruise
                  </span>
                  <h3 className="font-serif text-2xl text-sage font-normal mt-1">
                    Cultural Integrations & Travel Clout
                  </h3>
                  <p className="text-xs text-sage font-medium mt-0.5">
                    25+ Year Host Agency • Future Leaders in Travel
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-sage/80">
                  Backed by Grand Travel & Cruise (Funjet 500 Club, founded with Jay Islam), Kareena and Armaan weave authentic regional cultural integrations—from Wixárika artisans in Puerto Vallarta to sacred Balinese water blessings—into zero-friction VIP travel logistics.
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-sand-border/70">
                <ul className="space-y-1.5 text-xs text-sage/75">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                    <span>Marival Harmony (Puerto Vallarta) flagship access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                    <span>Authentic Indigenous & regional cultural exchange</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                    <span>Historical weather modeling & personalized itinerary curation</span>
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
            <span className="text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
              First Retreat of 2027 Open Now • Other Destinations Coming Soon
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light mt-2">
              2027 Sanctuaries
            </h2>
            <p className="text-sm text-sage/75 mt-2 max-w-2xl">
              Our inaugural 2027 sanctuary takes place <strong>January 28 – 31, 2027</strong> at <strong>Marival Harmony (Armony) in Puerto Vallarta, Mexico</strong>. Additional 2027 global sanctuaries are previewed below as coming-soon placeholders.
            </p>
          </div>

          <Link
            href="/retreats"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-olive font-semibold hover:text-terracotta transition-colors self-start md:self-auto"
          >
            <span>View Full Calendar & Weather Profiles</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 3 Flagship Cards (Puerto Vallarta first + 2 placeholders) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {featuredRetreats.map((retreat, idx) => (
            <RetreatCard key={retreat.id} retreat={retreat} priority={idx === 0} />
          ))}
        </div>

        {/* Flagship Puerto Vallarta Highlight Strip */}
        <div className="mt-14 rounded-3xl border-2 border-terracotta/40 bg-sand/70 p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="rounded-full bg-terracotta text-linen px-3 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
                First Retreat of 2027 • Open Now
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-olive font-medium">
                <Calendar className="h-3.5 w-3.5 text-terracotta" /> Jan 28 – 31, 2027
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-sage/80">
                <CloudSun className="h-3.5 w-3.5 text-terracotta" /> 81°F High / 63°F Low • 75°F Ocean
              </span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl text-sage font-normal">
              Puerto Vallarta, Mexico • Marival Harmony (Armony) Resort & Suites
            </h3>
            <p className="text-xs sm:text-sm text-sage/80 max-w-3xl">
              4 Days / 3 Nights of Banderas Bay sunrise vinyasa, 432Hz crystal singing bowl sound baths, Ironman endurance recovery workshops, and Wixárika cultural integration. Every inquiry to <strong>kareena@grandtravelcruise.com</strong> & <strong>armaan@grandtravelcruise.com</strong> receives personal consultation and white-glove travel coordination.
            </p>
          </div>

          <Link
            href="/book?retreat=puerto-vallarta-2027"
            className="shrink-0 rounded-full bg-sage px-7 py-3.5 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-semibold shadow"
          >
            Reserve Puerto Vallarta
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
            Unmatched Industry Buying Power & Deep Cultural Integration
          </h2>
          <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
            A truly restorative sanctuary cannot exist inside an isolated tourist bubble. Backed by <strong>Grand Travel & Cruise</strong> and led by <strong>Kareena Islam</strong> & <strong>Armaan Islam</strong>, KAI brings the luxury travel industry’s most coveted relationships and regional cultural wisdom directly to your retreat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                Grand Travel & Cruise’s Funjet 500 Club elite standing unlocks luxury resort privileges at Marival Harmony, private estate buyouts, and preferred air contracts.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-olive shrink-0" />
              <span>Exclusive wholesale contract leverage</span>
            </div>
          </div>

          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta border border-terracotta/20">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Cultural Integrations
              </h3>
              <p className="text-xs text-terracotta font-medium">
                Where Peace Within Blends With The Pieces Around
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Every sanctuary honors the living culture of its land—from Wixárika artisans and coastal cacao rituals in Jalisco to sacred water ceremonies in Bali and lemon harvests in Ravello.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-olive shrink-0" />
              <span>Intimate cultural reverence & local artisans</span>
            </div>
          </div>

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
                Our dedicated concierge manages flight routing into PVR, schedule protections, historical weather packing briefings, and private chauffeured transfers straight to sanctuary gates.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-olive shrink-0" />
              <span>24/7 dedicated flight monitoring & VIP transit</span>
            </div>
          </div>

          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-terracotta border border-sand-border">
                <Compass className="h-6 w-6 text-terracotta" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Personal Founder Consultation
              </h3>
              <p className="text-xs text-sage font-medium">
                Bespoke Hospitality & Care
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Kareena and Armaan personally review every guest inquiry to coordinate your suite, dietary preferences, somatic comfort, and travel arrangements.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-olive shrink-0" />
              <span>Routed to Kareena & Armaan simultaneously</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. RESTORATIVE PHILOSOPHY QUOTE */}
      <section className="relative bg-sage py-24 px-4 sm:px-6 lg:px-8 text-linen overflow-hidden">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-sage-muted/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-olive/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-4xl text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-sand-border/30 bg-sage-muted/40 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-sand-muted font-light">
            <Heart className="h-3.5 w-3.5 text-terracotta-light" />
            <span>The KAI Philosophy</span>
          </div>

          <blockquote className="font-serif text-2xl sm:text-4xl md:text-5xl font-light leading-snug text-linen">
            &ldquo;KAI Wellness Retreats is a place where your peace within can blend with the pieces around — uniting clinical nervous system safety, endurance resilience, and deep reverence for the cultures that welcome us.&rdquo;
          </blockquote>

          <div className="pt-2">
            <cite className="not-italic block">
              <span className="font-serif text-xl text-sand block">
                Kareena Islam, BSN, RN, RYT & Armaan Islam
              </span>
              <span className="text-xs uppercase tracking-widest text-sand-border/80">
                Co-Founders • KAI Wellness Retreats & Grand Travel & Cruise
              </span>
            </cite>
          </div>
        </div>
      </section>

      {/* 5. ABOUT FOUNDERS TEASER */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Dual Founder Visual Stack */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative h-[380px] w-full rounded-3xl overflow-hidden border border-sand-border shadow-lg">
              <Image
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"
                alt="Kareena Islam and Armaan Islam — Founders of KAI Wellness Retreats"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sage/85 via-sage/20 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-linen space-y-1">
                <span className="text-[10px] uppercase tracking-widest text-sand-border">
                  Co-Founders • KAI Wellness Retreats
                </span>
                <h4 className="font-serif text-2xl font-light">
                  Kareena Islam & Armaan Islam
                </h4>
                <p className="text-xs text-sand-muted">
                  Clinical Somatics (BSN, RN, RYT) × Ironman Endurance & Business Execution
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-sand-border bg-linen p-4">
                <span className="text-[10px] uppercase tracking-wider text-olive font-semibold block">
                  Kareena Islam
                </span>
                <p className="font-serif text-sm text-sage font-medium mt-0.5">
                  BSN, RN • RYT • 432Hz Sound
                </p>
                <span className="text-[11px] text-sage/70 block mt-1">
                  kareena@grandtravelcruise.com
                </span>
              </div>
              <div className="rounded-2xl border border-sand-border bg-linen p-4">
                <span className="text-[10px] uppercase tracking-wider text-terracotta font-semibold block">
                  Armaan Islam
                </span>
                <p className="font-serif text-sm text-sage font-medium mt-0.5">
                  Ironman Athlete • Business Lead
                </p>
                <span className="text-[11px] text-sage/70 block mt-1">
                  armaan@grandtravelcruise.com
                </span>
              </div>
            </div>
          </div>

          {/* Narrative description */}
          <div className="lg:col-span-7 space-y-6">
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              Meet the Founders
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light leading-tight">
              Clinical Heart, Ironman Grit, and 25+ Years of Global Travel Heritage
            </h2>

            <p className="text-sm leading-relaxed text-sage/80">
              <strong>Kareena Islam, BSN, RN, RYT</strong> spent years in high-acuity surgical and hospital units at Memorial Hermann and HCA Healthcare after graduating from Texas A&M, witnessing how chronic stress erodes human health. Pairing her nursing precision with yoga, breathwork, and 432Hz crystal singing bowls, she designs spaces for true autonomic restoration.
            </p>

            <p className="text-sm leading-relaxed text-sage/80">
              Alongside her, Co-Founder <strong>Armaan Islam</strong> brings the mindset of a competitive <strong>Ironman triathlete</strong> and seasoned business strategist—architecting KAI’s operational excellence, endurance recovery protocols, corporate leadership tracks, and financial stewardship with <strong>Grand Travel & Cruise</strong>.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow-sm"
              >
                <span>Explore the Dense Founders Dossier</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/testimonials"
                className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-sand px-5 py-3 text-xs text-sage hover:bg-sand-muted transition-colors font-medium"
              >
                <span>View Past Photos & Testimonials</span>
              </Link>
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
