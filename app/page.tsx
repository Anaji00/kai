"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Wind, ShieldCheck, Compass, Award, Globe, Plane, CheckCircle, Heart, Users } from "lucide-react";
import { RETREATS } from "@/lib/retreats";
import RetreatGrid from "@/components/RetreatGrid";
import SoundAndBreathModal from "@/components/SoundAndBreathModal";
import TestimonialsSection from "@/components/TestimonialsSection";
import FAQSection from "@/components/FAQSection";

export default function HomePage() {
  const [somaticModalOpen, setSomaticModalOpen] = useState(false);

  // Featured Sanctuaries: Marival Armony (January 2027) + completed retreat at El Dorado Seaside Palms
  const featuredRetreats = RETREATS.filter((r) => r.featured);

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

      {/* 2. FEATURED SANCTUARIES */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              Curated Escapes &amp; Sanctuary History
            </span>
            <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light mt-2">
              Featured Sanctuaries
            </h2>
            <p className="text-sm text-sage/75 mt-2 max-w-xl">
              Explore our upcoming 2027 flagship retreat at Marival Armony and discover reflections from our previously completed sanctuary at El Dorado Seaside Palms.
            </p>
          </div>

          <Link
            href="/retreats"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-olive font-semibold hover:text-terracotta transition-colors self-start md:self-auto"
          >
            <span>View All Destinations &amp; Schedules</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Featured Cards: Marival Armony & El Dorado Seaside Palms */}
        <RetreatGrid retreats={featuredRetreats} className="grid grid-flow-row-dense grid-cols-1 md:grid-cols-2 gap-8" />

        {/* Previously Completed Sanctuary Banner */}
        <div className="mt-14 rounded-3xl border border-sand-border bg-sand/60 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <span className="rounded-full bg-olive/15 text-olive border border-olive/30 px-3 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
              Previously Completed Sanctuary
            </span>
            <h3 className="font-serif text-2xl text-sage font-normal">
              Past Retreat • El Dorado Seaside Palms, Riviera Maya
            </h3>
            <p className="text-xs text-sage/75 max-w-2xl">
              Our inaugural adult sanctuary at El Dorado Seaside Palms brought guests together for restorative oceanfront vinyasa, crystal singing bowls, and nervous-system renewal. Explore attendee reflections and testimonials.
            </p>
          </div>

          <Link
            href="/testimonials"
            className="shrink-0 rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow"
          >
            View Guest Stories
          </Link>
        </div>
      </section>

      {/* 3. WHY KAI WELLNESS RETREATS? */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-sand-border/80">
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            <Heart className="h-3.5 w-3.5 text-terracotta" />
            Why KAI Wellness Retreats?
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            Where Wellness Meets Heart, Connection &amp; Discovery
          </h2>
          <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
            At KAI Wellness Retreats, we believe the most beautiful journeys are the ones that touch your heart, nourish your soul, and bring people together. Rooted in family values, genuine hospitality, and a passion for mindful living, our retreats are thoughtfully created to help you reconnect with yourself, discover new cultures, and build meaningful friendships. More than a retreat, KAI is a community where everyone belongs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1: Wellness With Heart */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-terracotta-soft text-terracotta border border-terracotta/20">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Wellness With Heart
              </h3>
              <p className="text-xs text-terracotta font-medium">
                Nurturing Mind, Body &amp; Spirit
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Wellness is personal, and every journey is unique. We create a welcoming space where you can relax, recharge, and rediscover your inner balance.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-olive shrink-0" aria-hidden="true" />
              <span>Nurturing Mind, Body &amp; Spirit</span>
            </div>
          </div>

          {/* Pillar 2: Meaningful Connections */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-olive-soft text-olive border border-olive/20">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Meaningful Connections
              </h3>
              <p className="text-xs text-olive font-medium">
                Arrive as Guests. Leave as Family.
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                The heart of KAI is human connection. We believe shared experiences, genuine conversations, laughter, and kindness create lasting friendships. Our intimate retreats bring people together in an environment where everyone feels welcomed, valued, and cared for.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-olive shrink-0" aria-hidden="true" />
              <span>Arrive as Guests. Leave as Family.</span>
            </div>
          </div>

          {/* Pillar 3: Authentic Cultural Experiences */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-sage border border-sand-border">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Authentic Cultural Experiences
              </h3>
              <p className="text-xs text-olive font-medium">
                Explore Beyond the Ordinary
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Every destination has a story worth discovering. From local traditions and cultural encounters to breathtaking natural wonders, we thoughtfully blend wellness with authentic travel experiences that inspire curiosity, appreciation, and unforgettable memories.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-olive shrink-0" aria-hidden="true" />
              <span>Explore Beyond the Ordinary</span>
            </div>
          </div>

          {/* Pillar 4: Travel Expertise With a Personal Touch */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-terracotta border border-sand-border">
                <Compass className="h-6 w-6 text-terracotta" />
              </div>
              <h3 className="font-serif text-xl text-sage font-normal">
                Travel Expertise With a Personal Touch
              </h3>
              <p className="text-xs text-sage font-medium">
                Decades of Experience. A Lifetime of Care.
              </p>
              <p className="text-xs text-sage/80 leading-relaxed">
                Supported by Grand Travel &amp; Cruise and more than 30 years of trusted travel industry relationships, KAI brings together exceptional destinations, thoughtful planning, and unreasonable hospitality. Our family takes pride in caring for the details so you can fully embrace the experience.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-sage/70 font-medium flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5 text-olive shrink-0" aria-hidden="true" />
              <span>Decades of Experience. A Lifetime of Care.</span>
            </div>
          </div>
        </div>

        {/* The KAI Promise Callout Banner */}
        <div className="mt-12 rounded-3xl border border-sand-border bg-sand/60 p-7 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2 text-center md:text-left max-w-2xl">
            <span className="rounded-full bg-terracotta/15 text-terracotta border border-terracotta/30 px-3 py-0.5 text-[10px] uppercase tracking-wider font-semibold">
              The KAI Promise
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-sage font-normal">
              &ldquo;Come as you are. Connect with others. Rediscover yourself.&rdquo;
            </h3>
            <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
              At KAI, we don’t simply create wellness retreats. We create a sense of belonging, a journey of discovery, and memories that stay in your heart long after you return home.
            </p>
          </div>

          <Link
            href="/about"
            className="shrink-0 rounded-full bg-sage px-6 py-3.5 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow"
          >
            Meet The Hearts Behind KAI
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
