"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Calendar, Compass, CloudSun } from "lucide-react";
import { RETREATS } from "@/lib/retreats";
import RetreatCard from "@/components/RetreatCard";

export default function RetreatsPage() {
  const [filter, setFilter] = useState<"all" | "open" | "coming-soon">("all");

  const filteredRetreats = RETREATS.filter((retreat) => {
    if (filter === "open") return retreat.status !== "coming-soon";
    if (filter === "coming-soon") return retreat.status === "coming-soon";
    return true;
  });

  const flagshipPV = RETREATS.find((r) => r.id === "puerto-vallarta-2027");

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
        <span className="inline-block rounded-full bg-sand px-4 py-1 text-xs uppercase tracking-[0.25em] text-olive font-semibold border border-sand-border">
          Where Your Peace Within Can Blend With The Pieces Around
        </span>
        <h1 className="font-serif text-4xl sm:text-6xl text-sage font-light tracking-tight">
          2027 Retreat Calendar
        </h1>
        <p className="text-sm sm:text-base text-sage/80 font-light leading-relaxed">
          Led by Founders <strong>Kareena Islam, BSN, RN, RYT</strong> & <strong>Armaan Islam</strong>. Opening the 2027 season on <strong>January 28–31, 2027</strong> at <strong>Marival Harmony (Armony) in Puerto Vallarta, Mexico</strong>, with additional global sanctuaries coming soon.
        </p>

        {/* Filter Pills */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-wider transition-all font-medium ${
              filter === "all"
                ? "bg-sage text-linen shadow-sm"
                : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
            }`}
          >
            All Sanctuaries ({RETREATS.length})
          </button>
          <button
            onClick={() => setFilter("open")}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-wider transition-all font-medium ${
              filter === "open"
                ? "bg-terracotta text-linen shadow-sm"
                : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
            }`}
          >
            First Retreat of 2027 • Open Now (1)
          </button>
          <button
            onClick={() => setFilter("coming-soon")}
            className={`rounded-full px-5 py-2 text-xs uppercase tracking-wider transition-all font-medium ${
              filter === "coming-soon"
                ? "bg-sage text-linen shadow-sm"
                : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
            }`}
          >
            Coming Soon Placeholders ({RETREATS.filter((r) => r.status === "coming-soon").length})
          </button>
        </div>
      </div>

      {/* Flagship First Retreat of 2027 Spotlight Banner */}
      {flagshipPV && filter !== "coming-soon" && (
        <section className="mb-14 rounded-3xl border-2 border-terracotta/40 bg-gradient-to-br from-linen via-sand/70 to-linen p-6 sm:p-10 shadow-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-linen">
                  <Sparkles className="h-3 w-3" /> First Official Retreat of 2027 • Open for Reservations
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3.5 py-1 text-[11px] font-medium text-sage border border-sand-border">
                  <Calendar className="h-3 w-3 text-terracotta" /> January 28 – 31, 2027
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-linen px-3.5 py-1 text-[11px] font-medium text-olive border border-sand-border">
                  <CloudSun className="h-3 w-3 text-terracotta" /> 81°F / 63°F Peak Dry Season
                </span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl text-sage font-normal">
                {flagshipPV.title} — {flagshipPV.destination}
              </h2>

              <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">
                Join <strong>Kareena Islam</strong> & <strong>Armaan Islam</strong> at <strong>Marival Armony (Harmony) Luxury Resort & Suites</strong> on Banderas Bay. Experience 4 days of oceanfront somatic vinyasa, 432Hz crystal bowl acoustics, endurance recovery science, Wixárika (Huichol) cultural integration, and Melange World Spa thermal hydrotherapy.
              </p>

              <div className="flex flex-wrap gap-3 text-xs text-sage/80 pt-1">
                <span className="flex items-center gap-1.5">
                  <Compass className="h-4 w-4 text-terracotta" /> Marival Harmony • Punta de Mita / Puerto Vallarta
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-olive" /> Personal Consultation with Kareena & Armaan
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-center gap-3">
              <div className="text-left lg:text-right mb-1">
                <span className="text-[11px] uppercase tracking-wider text-sage/60 block">
                  All-Inclusive Sanctuary Investment
                </span>
                <span className="font-serif text-3xl text-sage font-medium">
                  {flagshipPV.investmentStarting}
                </span>
                <span className="text-xs text-terracotta block font-medium">
                  {flagshipPV.spotsRemaining} of {flagshipPV.spotsTotal} spots remaining
                </span>
              </div>
              <Link
                href={`/book?retreat=${flagshipPV.id}`}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3.5 text-xs uppercase tracking-widest text-linen font-semibold hover:bg-sage-dark transition-all shadow"
              >
                <span>Reserve Puerto Vallarta</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/retreats/${flagshipPV.slug}`}
                className="inline-flex items-center justify-center gap-1.5 rounded-full border border-sand-border bg-linen px-5 py-2.5 text-xs font-medium text-sage hover:bg-sand transition-colors"
              >
                <span>Explore Full Dossier, Weather & Packing</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Retreats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRetreats.map((retreat, idx) => (
          <RetreatCard key={retreat.id} retreat={retreat} priority={idx < 3} />
        ))}
      </div>

      {/* Private Group & Custom Curation Section */}
      <section className="mt-24 rounded-3xl border border-sand-border bg-sand/60 p-8 sm:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-terracotta">
              Bespoke Sanctuary Curation
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
              Private Group, Athletic & Executive Restorative Journeys
            </h2>
            <p className="text-sm leading-relaxed text-sage/80">
              Seeking a private sanctuary for your family, wellness community, endurance club, or executive leadership team? In partnership with <strong>Grand Travel & Cruise</strong>, Kareena Islam and Armaan Islam design customized restorative itineraries worldwide—complete with private resort buyouts, crystal singing bowl sound healing, endurance recovery clinics, and cultural immersions. All inquiries route directly to <a href="mailto:kareena@grandtravelcruise.com" className="underline text-sage font-medium">kareena@grandtravelcruise.com</a> & <a href="mailto:armaan@grandtravelcruise.com" className="underline text-sage font-medium">armaan@grandtravelcruise.com</a>.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-sage/75">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-olive" /> Private Estate & Resort Buyouts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-olive" /> Clinical Somatics + Endurance Performance
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-olive" /> VIP Charter & Ground Logistics
              </span>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-4">
            <Link
              href="/book?retreat=custom"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3.5 text-xs uppercase tracking-widest text-linen font-medium hover:bg-sage-dark transition-all shadow"
            >
              <span>Inquire for Custom Group</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-[11px] text-sage/60 text-center lg:text-right">
              Tailored for groups of 6 to 24 guests
            </span>
          </div>
        </div>
      </section>

      {/* FAQs / Small Group Philosophy */}
      <section className="mt-20 border-t border-sand-border/80 pt-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Transparency & Care
            </span>
            <h3 className="font-serif text-3xl text-sage font-light mt-1">
              Common Questions About KAI Sanctuaries
            </h3>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-2">
              <h4 className="font-serif text-xl text-sage">
                Which retreat is currently open for 2027 bookings?
              </h4>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
                Our <strong>First Official Retreat of 2027</strong> is <strong>Marival Harmony (Armony) in Puerto Vallarta, Mexico (January 28 – 31, 2027)</strong>. Our additional sanctuaries in Nosara, the Amalfi Coast, and Bali are listed as <em>Coming Soon</em> placeholders so you can preview their clinical and cultural curriculum or join their priority waitlists.
              </p>
            </div>

            <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-2">
              <h4 className="font-serif text-xl text-sage">
                What happens immediately after I submit an inquiry?
              </h4>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
                Your inquiry is simultaneously delivered to both founders at <strong>kareena@grandtravelcruise.com</strong> and <strong>armaan@grandtravelcruise.com</strong>, who personally review your goals, dietary needs, and travel details to coordinate your suite and retreat itinerary.
              </p>
            </div>

            <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-2">
              <h4 className="font-serif text-xl text-sage">
                How does travel booking work?
              </h4>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
                Through our partnership with <strong>Grand Travel & Cruise</strong>, our dedicated luxury concierge assists you with personalized flight routing into Puerto Vallarta (PVR), travel protection, and private VIP transfers directly to Marival Harmony.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
