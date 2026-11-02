"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Users, MapPin, Sparkles, ArrowRight, CheckCircle, X, Sun } from "lucide-react";
import { Retreat } from "@/lib/types";

interface RetreatCardProps {
  retreat: Retreat;
  priority?: boolean;
}

export default function RetreatCard({ retreat, priority = false }: RetreatCardProps) {
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const isComingSoon = retreat.status === "coming-soon" || retreat.dates.toLowerCase().includes("coming soon");

  return (
    <>
      <div className="group flex flex-col overflow-hidden rounded-3xl border border-sand-border bg-linen shadow-sm hover:shadow-md transition-all duration-300">
        {/* Image Container */}
        <div className="relative h-72 w-full overflow-hidden bg-sand">
          <Image
            src={retreat.heroImage}
            alt={retreat.title}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/80 via-sage-dark/20 to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="rounded-full bg-linen/90 backdrop-blur-md px-3.5 py-1 text-[11px] font-medium uppercase tracking-wider text-sage border border-sand-border/80">
              {retreat.destination}
            </span>
            <span className="rounded-full bg-terracotta/90 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-linen shadow-sm">
              {isComingSoon ? "Coming Soon" : `${retreat.spotsRemaining} spots left`}
            </span>
          </div>

          {/* Bottom Title on Image */}
          <Link href={`/retreats/${retreat.slug}`} className="absolute bottom-4 left-4 right-4 text-linen block group/title">
            <span className="text-xs uppercase tracking-widest text-sand-muted font-light block">
              {retreat.dates} • {retreat.duration}
            </span>
            <h3 className="font-serif text-2xl font-normal leading-tight text-linen drop-shadow-sm group-hover/title:text-sand transition-colors">
              {retreat.title}
            </h3>
          </Link>
        </div>

        {/* Card Body */}
        <div className="flex flex-1 flex-col p-6 sm:p-7 justify-between space-y-6">
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-sage/80 line-clamp-3">
              {retreat.description}
            </p>

            {/* Clinical & Somatic Highlights */}
            <div className="space-y-2 border-t border-b border-sand-border/60 py-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-olive">
                <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                <span className="uppercase tracking-wider text-[10px]">Clinical & Somatic Core</span>
              </div>
              <ul className="space-y-1.5 text-xs text-sage/85">
                {retreat.clinicalFocus.slice(0, 2).map((focus, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-terracotta text-sm leading-none">•</span>
                    <span className="line-clamp-1">{focus}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Meta Row */}
            <div className="flex items-center justify-between text-xs text-sage/75 pt-1">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-olive shrink-0" />
                <span>Intimate ({retreat.spotsTotal} max)</span>
              </div>
              {retreat.weatherProfile ? (
                <div className="flex items-center gap-1 text-[11px] text-olive font-medium bg-sand/70 px-2 py-0.5 rounded-full border border-sand-border/60">
                  <Sun className="h-3 w-3 text-terracotta" />
                  <span>{retreat.weatherProfile.avgHighF}°F • Dry Season</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 justify-end">
                  <MapPin className="h-3.5 w-3.5 text-olive shrink-0" />
                  <span>{retreat.country}</span>
                </div>
              )}
            </div>
          </div>

          {/* Pricing & CTAs */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-sand-border/60">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-sage/60 block">
                Starting From
              </span>
              <span className="font-serif text-xl font-medium text-sage">
                {retreat.investmentStarting}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/retreats/${retreat.slug}`}
                className="rounded-full border border-sand-border bg-sand px-3 py-2 text-xs font-medium text-sage hover:bg-sand-muted transition-colors"
              >
                Details
              </Link>

              <Link
                href={`/book?retreat=${retreat.id}`}
                className="flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-xs font-medium uppercase tracking-wider text-linen hover:bg-sage-dark transition-all shadow-sm"
              >
                <span>{isComingSoon ? "Waitlist" : "Reserve"}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Deep Itinerary & Experience Modal */}
      <AnimatePresence>
        {showItineraryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowItineraryModal(false)}
              className="fixed inset-0 bg-sage/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-sand-border bg-linen p-6 md:p-8 shadow-2xl"
            >
              {/* Modal Top */}
              <div className="flex items-start justify-between border-b border-sand-border pb-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-olive font-medium">
                    {retreat.destination} • {retreat.duration}
                  </span>
                  <h3 className="font-serif text-3xl font-light text-sage mt-1">
                    {retreat.title}
                  </h3>
                  <p className="text-xs text-sage/75 mt-1">{retreat.dates}</p>
                </div>
                <button
                  onClick={() => setShowItineraryModal(false)}
                  className="rounded-full p-2 text-sage/70 hover:bg-sand hover:text-sage transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="mt-6 space-y-8">
                {/* Description */}
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-olive mb-2">
                    Retreat Essence
                  </h4>
                  <p className="text-sm leading-relaxed text-sage/85">
                    {retreat.description}
                  </p>
                </div>

                {/* Accommodations */}
                <div className="rounded-2xl border border-sand-border bg-sand/50 p-4">
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-olive mb-1">
                    Sanctuary Accommodations
                  </h4>
                  <p className="text-xs text-sage/80 leading-relaxed">
                    {retreat.accommodations}
                  </p>
                </div>

                {/* Clinical Grounding Rationale */}
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-olive mb-3">
                    The Clinical Science Behind This Sanctuary
                  </h4>
                  <ul className="space-y-2.5">
                    {retreat.clinicalFocus.map((focus, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-sage/85">
                        <CheckCircle className="h-4 w-4 text-terracotta shrink-0 mt-0.5" />
                        <span>{focus}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Day-by-day Itinerary */}
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-olive mb-3">
                    Curated Daily Rhythm
                  </h4>
                  <div className="space-y-4">
                    {retreat.schedule.map((day, idx) => (
                      <div
                        key={idx}
                        className="rounded-2xl border border-sand-border/70 bg-white/70 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-sand px-2.5 py-0.5 text-[10px] font-semibold text-olive">
                            {day.day}
                          </span>
                          <span className="font-medium text-xs text-sage">
                            {day.title}
                          </span>
                        </div>
                        <ul className="mt-2.5 space-y-1 text-xs text-sage/75 pl-3">
                          {day.highlights.map((h, hIdx) => (
                            <li key={hIdx} className="list-disc">
                              {h}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Inclusions */}
                <div>
                  <h4 className="text-xs uppercase tracking-widest font-semibold text-olive mb-3">
                    All-Inclusive Luxury Amenities
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-sage/85">
                    {retreat.inclusions.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-terracotta text-sm leading-none">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA inside Modal */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-sand-border pt-6">
                  <div>
                    <span className="text-xs text-sage/60 block">Starting Investment</span>
                    <span className="font-serif text-2xl font-medium text-sage">
                      {retreat.investmentStarting}
                    </span>
                    <span className="text-[11px] text-olive block">
                      Limited to {retreat.spotsTotal} total guests ({retreat.spotsRemaining} spots remaining)
                    </span>
                  </div>

                  <Link
                    href={`/book?retreat=${retreat.id}`}
                    onClick={() => setShowItineraryModal(false)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 text-xs font-medium uppercase tracking-widest text-linen hover:bg-sage-dark transition-all shadow"
                  >
                    <span>Reserve Your Spot</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
