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
      {/* 1. THE HEARTS BEHIND KAI: SIBLING STORY & HERITAGE */}
      <section className="space-y-12">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-sand border border-sand-border px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-olive font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            <span>The Hearts Behind KAI</span>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-sage font-light leading-[1.08] tracking-tight">
              Two Siblings. One Shared Passion.
            </h1>
            <p className="font-serif text-2xl sm:text-3xl text-sage/80 italic font-normal">
              A Journey Rooted in Gratitude.
            </p>
          </div>

          <div className="max-w-3xl mx-auto text-sm sm:text-base text-sage/85 leading-relaxed font-light space-y-4">
            <p>
              For Kareena and Armaan Islam, KAI Wellness Retreats is an extension of the values they grew up with &mdash; family, kindness, gratitude, and a genuine love for bringing people together.
            </p>
            <p>
              Raised in a family where travel was more than visiting destinations, they learned early that the most meaningful journeys are built around relationships, shared experiences, and caring for others.
            </p>
            <p>
              Their individual paths &mdash; Kareena’s in healthcare and mindful healing, and Armaan’s in athletics, adventure, and personal growth &mdash; eventually came together through their shared love for yoga, wellness, and travel.
            </p>
          </div>

          {/* Heartfelt Purpose Callout Card */}
          <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-8 max-w-2xl mx-auto shadow-sm space-y-3">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-terracotta block">
              Our Heartfelt Purpose
            </span>
            <p className="font-serif text-xl sm:text-2xl text-sage font-normal leading-snug">
              &ldquo;To create a welcoming community where people arrive as strangers, connect as friends, and leave feeling like family.&rdquo;
            </p>
            <p className="text-xs text-sage/75 pt-1">
              Inspired by their family’s philosophy of <em>Living BIG &mdash; Be In Gratitude</em>, Kareena and Armaan invite you to experience wellness not simply as a retreat, but as a beautiful way of living.
            </p>
          </div>

          {/* Direct Inquiry Routing Pill */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-sand-border bg-linen px-5 py-3 text-xs text-sage shadow-sm">
            <span className="font-semibold text-olive uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-terracotta" /> Direct Inquiry Desk:
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

        {/* 2. THE HEARTS BEHIND KAI: KAREENA ISLAM & ARMAAN ISLAM */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
          {/* DOSSIER 1: KAREENA ISLAM */}
          <article className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-md flex flex-col justify-between">
            <div>
              <div className="relative h-80 w-full overflow-hidden bg-sand">
                <Image
                  src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"
                  alt="Kareena Islam, BSN, RN — Founder of KAI Wellness Retreats"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/90 via-sage-dark/30 to-transparent" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-linen/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-olive">
                    Founder
                  </span>
                  <span className="rounded-full bg-terracotta px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-linen">
                    BSN, RN • Certified Yoga
                  </span>
                </div>
                <div className="absolute bottom-5 left-6 right-6 text-linen">
                  <h2 className="font-serif text-3xl sm:text-4xl font-light">
                    Kareena Islam, BSN, RN
                  </h2>
                  <p className="text-xs text-sand-muted mt-1 leading-snug">
                    Founder | Registered Nurse | Certified Yoga Instructor | Wellness &amp; Travel Specialist
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="border-b border-sand-border/70 pb-4">
                  <h3 className="font-serif text-xl sm:text-2xl text-sage font-normal">
                    A Passion for Caring. A Heart for Healing.
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  For Kareena Islam, caring for others has always been more than a profession &mdash; it’s a way of life.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  As a registered nurse with years of experience caring for patients during some of their most vulnerable moments, Kareena developed a deep appreciation for the connection between physical health, emotional well-being, and the importance of slowing down.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Her passion for wellness eventually led her beyond traditional healthcare and into the world of yoga, meditation, sound healing, and mindful travel.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Growing up in a family deeply rooted in travel and hospitality, Kareena discovered that some of life’s most meaningful experiences happen when we step outside our everyday routines, embrace new cultures, and connect with others.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Recognized as one of the travel industry’s rising stars by Travel Age West, Kareena brings together her healthcare background, love for wellness, and passion for exploring the world.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Through KAI Wellness Retreats, she hopes to create a welcoming space where people from all walks of life can pause, breathe, reconnect, and simply be themselves.
                </p>

                {/* Philosophy Box */}
                <div className="rounded-2xl bg-sand/60 border border-sand-border p-4">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-terracotta block">
                    Her Philosophy
                  </span>
                  <p className="font-serif text-base sm:text-lg text-sage italic mt-1">
                    &ldquo;Come as you are. Leave feeling renewed, inspired, and connected.&rdquo;
                  </p>
                </div>

                {/* Dense Credential Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Activity className="h-3.5 w-3.5 text-terracotta" /> Clinical Care
                    </span>
                    <p className="text-xs text-sage font-medium">Registered Nurse (BSN, RN)</p>
                    <p className="text-[11px] text-sage/75">
                      Compassionate acute care, patient advocacy &amp; holistic mind-body well-being.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-terracotta" /> Somatic &amp; Acoustic
                    </span>
                    <p className="text-xs text-sage font-medium">Certified Yoga &amp; Sound Healing</p>
                    <p className="text-[11px] text-sage/75">
                      Mindful yoga, meditation, 432Hz crystal sound healing &amp; slow somatic pacing.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Award className="h-3.5 w-3.5 text-terracotta" /> Industry Recognition
                    </span>
                    <p className="text-xs text-sage font-medium">Travel Age West Rising Star</p>
                    <p className="text-[11px] text-sage/75">
                      Honored travel industry talent with generational roots in luxury hospitality.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Heart className="h-3.5 w-3.5 text-terracotta" /> Welcoming Space
                    </span>
                    <p className="text-xs text-sage font-medium">A Sanctuary for All</p>
                    <p className="text-[11px] text-sage/75">
                      A welcoming space where guests pause, breathe, reconnect, and simply be themselves.
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

          {/* DOSSIER 2: ARMAAN ISLAM */}
          <article className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-md flex flex-col justify-between">
            <div>
              <div className="relative h-80 w-full overflow-hidden bg-sand">
                <Image
                  src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=85"
                  alt="Armaan Islam — Co-Founder, Certified Yoga Instructor & Ironman Finisher"
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/90 via-sage-dark/35 to-transparent" />
                <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-linen/95 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-olive">
                    Co-Founder
                  </span>
                  <span className="rounded-full bg-terracotta px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-linen">
                    Ironman Finisher • Certified Yoga
                  </span>
                </div>
                <div className="absolute bottom-5 left-6 right-6 text-linen">
                  <h2 className="font-serif text-3xl sm:text-4xl font-light">
                    Armaan Islam
                  </h2>
                  <p className="text-xs text-sand-muted mt-1 leading-snug">
                    Co-Founder | Certified Yoga Instructor | Ironman Finisher | Wellness &amp; Adventure Enthusiast
                  </p>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                <div className="border-b border-sand-border/70 pb-4">
                  <h3 className="font-serif text-xl sm:text-2xl text-sage font-normal">
                    A Passion for Movement. A Heart for Connection.
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  For Armaan Islam, wellness is about discovering what we’re capable of while appreciating the beauty of the journey.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  A lifelong athlete with a passion for soccer, endurance sports, and adventure, Armaan understands the dedication, discipline, and determination it takes to challenge both body and mind.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Completing an Ironman triathlon was more than an athletic achievement. It reinforced his belief in perseverance, mental strength, balance, and the importance of recovery.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  But Armaan also believes that true wellness goes beyond physical performance.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Through yoga, mindful movement, travel, and meaningful human connections, he has discovered the importance of slowing down, being present, and finding joy in life’s simplest moments.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Growing up surrounded by the world of travel and hospitality, Armaan developed a genuine appreciation for different cultures, new experiences, and the friendships that make every journey memorable.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  Today, he combines his passion for wellness and adventure with his experience in business and travel to help create thoughtfully designed retreats that inspire personal growth, connection, and discovery.
                </p>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                  At KAI Wellness Retreats, Armaan hopes every guest feels comfortable stepping outside their routine, embracing new possibilities, and celebrating their own unique journey.
                </p>

                {/* Philosophy Box */}
                <div className="rounded-2xl bg-sand/60 border border-sand-border p-4">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-terracotta block">
                    His Philosophy
                  </span>
                  <p className="font-serif text-base sm:text-lg text-sage italic mt-1">
                    &ldquo;Challenge yourself. Embrace the moment. Find gratitude in every step.&rdquo;
                  </p>
                </div>

                {/* Dense Credential Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5 text-terracotta" /> Endurance &amp; Discipline
                    </span>
                    <p className="text-xs text-sage font-medium">Ironman Finisher &amp; Lifelong Athlete</p>
                    <p className="text-[11px] text-sage/75">
                      Soccer, endurance sports, perseverance, mental strength &amp; structured recovery.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-terracotta" /> Mindful Movement
                    </span>
                    <p className="text-xs text-sage font-medium">Certified Yoga Instructor</p>
                    <p className="text-[11px] text-sage/75">
                      Mindful movement, presence, slowing down &amp; finding joy in life&rsquo;s simplest moments.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Compass className="h-3.5 w-3.5 text-terracotta" /> Travel &amp; Hospitality
                    </span>
                    <p className="text-xs text-sage font-medium">Cross-Cultural Lineage</p>
                    <p className="text-[11px] text-sage/75">
                      Hospitality heritage, appreciation for diverse cultures &amp; friendships that last.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-sand/50 border border-sand-border p-3.5 space-y-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-terracotta" /> Retreat Architecture
                    </span>
                    <p className="text-xs text-sage font-medium">Business &amp; Travel Synthesis</p>
                    <p className="text-[11px] text-sage/75">
                      Thoughtfully designed retreats inspiring personal growth, connection &amp; discovery.
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

        {/* OUR PHILOSOPHY: LIVING BIG — BE IN GRATITUDE */}
        <div id="our-philosophy" className="rounded-3xl border border-sand-border bg-sand/40 p-8 sm:p-14 space-y-4 max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            <Heart className="h-4 w-4 text-terracotta" />
            Our Philosophy
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            Living BIG &mdash; Be In Gratitude
          </h2>
          <p className="text-sm sm:text-base text-sage/85 leading-relaxed font-light max-w-2xl mx-auto">
            Led by Kareena and Armaan Islam, KAI Wellness Retreats is inspired by a family belief that life’s greatest blessings are found in gratitude, kindness, meaningful relationships, and shared experiences.
          </p>
          <p className="text-sm sm:text-base text-sage/85 leading-relaxed font-light max-w-2xl mx-auto">
            We believe wellness isn’t just something you practice during a retreat. It’s something you carry home and share with the world.
          </p>
        </div>
      </section>

      {/* 3. CULTURAL INTEGRATIONS • CORE PHILOSOPHY & THE KAI PROMISE */}
      <section id="cultural-integrations" className="rounded-3xl border border-sand-border bg-sand/50 p-8 sm:p-14 space-y-10">
        <div className="max-w-3xl mx-auto text-center space-y-3">
          <span className="inline-flex items-center justify-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            <Globe className="h-4 w-4 text-terracotta" />
            Cultural Integrations • Core Philosophy
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            Where Your Peace Within Blends With The Pieces Around
          </h2>
          <p className="text-sm sm:text-base text-sage/85 leading-relaxed font-light max-w-2xl mx-auto">
            True renewal happens when we step outside the everyday resort walls. Kareena and Armaan thoughtfully design each KAI sanctuary to blend mindful movement and quiet rest with the genuine warmth, coastal beauty, and authentic culture of our host destinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sanctuary 1: Marival Armony (Upcoming January 2027) */}
          <div className="rounded-2xl border border-sand-border bg-linen p-6 sm:p-7 space-y-3 flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <span className="rounded-full bg-terracotta/15 text-terracotta border border-terracotta/30 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider inline-block">
                Upcoming Sanctuary • January 28–31, 2027
              </span>
              <h3 className="font-serif text-2xl text-sage font-normal">
                Marival Armony • Puerto Vallarta
              </h3>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
                Set where the lush Sierra Madre mountains meet the quiet Pacific waters of Banderas Bay. Guests enjoy sunrise oceanfront yoga, evening crystal sound baths, fresh local Mexican cuisine, and the warm hospitality of coastal Jalisco.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-olive font-medium">
              Banderas Bay &amp; Sierra Madre Coastline
            </div>
          </div>

          {/* Sanctuary 2: Riviera Maya (Previously Completed Retreat) */}
          <div className="rounded-2xl border border-sand-border bg-linen p-6 sm:p-7 space-y-3 flex flex-col justify-between shadow-sm">
            <div className="space-y-3">
              <span className="rounded-full bg-olive/15 text-olive border border-olive/30 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider inline-block">
                Previously Completed Sanctuary
              </span>
              <h3 className="font-serif text-2xl text-sage font-normal">
                El Dorado Seaside Palms • Riviera Maya
              </h3>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
                Our intimate adults-only gathering on the turquoise shores of the Riviera Maya brought guests together for gentle oceanfront movement, sunset sound healing under the palms, nourishing regional cuisine, and lifelong friendships.
              </p>
            </div>
            <div className="pt-3 border-t border-sand-border/60 text-[11px] text-olive font-medium">
              Adults-Only Caribbean Sanctuary • Past Cohort Reflections
            </div>
          </div>
        </div>

        {/* The KAI Promise */}
        <div className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-10 shadow-sm text-center max-w-3xl mx-auto space-y-3 mt-4">
          <span className="rounded-full bg-terracotta/15 text-terracotta border border-terracotta/30 px-3.5 py-1 text-[10px] uppercase tracking-wider font-semibold inline-block">
            The KAI Promise
          </span>
          <h3 className="font-serif text-2xl sm:text-3xl text-sage font-normal">
            &ldquo;Come as you are. Connect with others. Rediscover yourself.&rdquo;
          </h3>
          <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light max-w-xl mx-auto">
            At KAI, we don’t simply create wellness retreats. We create a sense of belonging, a journey of discovery, and memories that stay in your heart long after you return home.
          </p>
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
              Backed by 25+ years of host agency excellence founded with <strong>Jay Islam</strong>, <strong>Grand Travel &amp; Cruise</strong> powers all air, resort, and private transfer logistics for KAI Wellness Retreats. Follow our official channels for live retreat dispatches, cultural previews from Puerto Vallarta, and luxury travel insights.
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
