"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { RETREATS } from "@/lib/retreats";
import RetreatGrid from "@/components/RetreatGrid";

export default function RetreatsPage() {
  const [filter, setFilter] = useState<"all" | "2027" | "2026">("all");

  const filteredRetreats = RETREATS.filter((retreat) => {
    if (filter === "2027") return retreat.year === 2027;
    if (filter === "2026") return retreat.year === 2026;
    return true;
  });

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="inline-block rounded-full bg-sand px-4 py-1 text-xs uppercase tracking-[0.25em] text-olive font-semibold border border-sand-border">
          Intimate Global Sanctuaries
        </span>
        <h1 className="font-serif text-4xl sm:text-6xl text-sage font-light tracking-tight">
          2026 – 2027 Retreat Calendar
        </h1>

        {/* Filter Pills */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-xs uppercase tracking-wider transition-all font-medium ${filter === "all"
                ? "bg-sage text-linen shadow-sm"
                : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
          >
            All Sanctuaries ({RETREATS.length})
          </button>
          <button
            onClick={() => setFilter("2027")}
            className={`whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-xs uppercase tracking-wider transition-all font-medium ${filter === "2027"
                ? "bg-sage text-linen shadow-sm"
                : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
          >
            2027 Flagship ({RETREATS.filter((r) => r.year === 2027).length})
          </button>
          <button
            onClick={() => setFilter("2026")}
            className={`whitespace-nowrap rounded-full px-4 sm:px-5 py-2 text-xs uppercase tracking-wider transition-all font-medium ${filter === "2026"
                ? "bg-sage text-linen shadow-sm"
                : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
          >
            2026 ({RETREATS.filter((r) => r.year === 2026).length})
          </button>
        </div>
      </div>

      {/* Retreats Grid */}
      <RetreatGrid
        retreats={filteredRetreats}
        priorityCount={3}
        className="grid grid-flow-row-dense grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
      />

      {/* Private Group & Custom Curation Section */}
      <section className="mt-24 rounded-3xl border border-sand-border bg-sand/60 p-8 sm:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <span className="text-xs uppercase tracking-[0.2em] font-semibold text-terracotta">
              Private Group Retreats
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
              Private Group & Executive Restorative Journeys
            </h2>
            <p className="text-sm leading-relaxed text-sage/80">
              Seeking a private sanctuary for your family, wellness community, or executive leadership team? In partnership with Grand Travel & Cruise, Kareena designs fully customized restorative itineraries worldwide, complete with private villa buyouts, dedicated chefs, crystal singing bowl sound healing, and nurse-led wellness clinics.
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs text-sage/75">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-olive" /> Private Estate Buyouts
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-olive" /> Custom Clinical & Somatic Focus
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
              Tailored for groups of 6 to 20 guests
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
                How are retreat groups put together?
              </h4>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
                Because KAI retreat groups are limited to 12 to 14 guests, Kareena personally reviews every inquiry. We ensure a harmonious dynamic where all participants share an intention for rest, respect, and nervous system restoration.
              </p>
            </div>

            <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-2">
              <h4 className="font-serif text-xl text-sage">
                Do I need advanced yoga experience?
              </h4>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
                Not at all. Grounded in anatomical safety and Kareena’s nursing background, every movement practice is designed for every body, every age, and every stage. Variations and restorative props are always provided.
              </p>
            </div>

            <div className="rounded-2xl border border-sand-border bg-linen p-6 space-y-2">
              <h4 className="font-serif text-xl text-sage">
                How does travel booking work?
              </h4>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
                Through our partnership with Grand Travel & Cruise, our dedicated luxury concierge assists you with personalized flight routing, travel insurance, and private VIP transfers directly to our sanctuary gates.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
