"use client";

import React, { useActionState, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Loader2, Compass } from "lucide-react";
import confetti from "canvas-confetti";
import { submitBookingInquiry } from "@/app/actions/booking";
import { RETREATS, getRetreatById } from "@/lib/retreats";
import { BookingFormState } from "@/lib/types";

const initialState: BookingFormState = {
  success: false,
  message: "",
};

export default function BookingForm() {
  const searchParams = useSearchParams();
  const preselectedRetreatParam = searchParams.get("retreat") || "nosara-2027";

  const [selectedRetreatId, setSelectedRetreatId] = useState<string>(preselectedRetreatParam);
  const [prevParam, setPrevParam] = useState<string>(preselectedRetreatParam);
  if (preselectedRetreatParam !== prevParam) {
    setPrevParam(preselectedRetreatParam);
    setSelectedRetreatId(preselectedRetreatParam);
  }

  const [state, formAction, isPending] = useActionState(submitBookingInquiry, initialState);

  // Trigger celebration on success
  useEffect(() => {
    if (state.success) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#2D3E35", "#C07D63", "#5C6B5E", "#E5DDD0"],
        });
      } catch {
        // ignore if canvas blocked
      }
    }
  }, [state.success]);

  const selectedRetreat = getRetreatById(selectedRetreatId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
      {/* LEFT: Sanctuary Details Card Preview */}
      <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
        <div className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-md">
          {selectedRetreat ? (
            <>
              <div className="relative h-56 w-full">
                <Image
                  src={selectedRetreat.heroImage}
                  alt={selectedRetreat.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage/80 via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="rounded-full bg-linen/90 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sage border border-sand-border">
                    {selectedRetreat.destination}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-linen">
                  <span className="text-[11px] uppercase tracking-widest text-sand-muted block">
                    {selectedRetreat.dates}
                  </span>
                  <h3 className="font-serif text-2xl font-normal leading-snug">
                    {selectedRetreat.title}
                  </h3>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-sage/80 leading-relaxed">
                  {selectedRetreat.description}
                </p>

                <div className="rounded-2xl bg-sand/60 p-3.5 border border-sand-border/70 space-y-1.5 text-xs text-sage/85">
                  <div className="flex justify-between items-center">
                    <span className="text-sage/60">Cohort Limit:</span>
                    <span className="font-medium text-sage">{selectedRetreat.spotsTotal} guests max</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sage/60">Spots Remaining:</span>
                    <span className="font-medium text-terracotta">{selectedRetreat.spotsRemaining} spots available</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sage/60">Investment Starting:</span>
                    <span className="font-medium text-sage">{selectedRetreat.investmentStarting}</span>
                  </div>
                </div>

                <div className="space-y-2 border-t border-sand-border/60 pt-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-olive block">
                    Key Inclusions:
                  </span>
                  <ul className="space-y-1 text-xs text-sage/75">
                    {selectedRetreat.inclusions.slice(0, 3).map((inc, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-olive shrink-0 mt-0.5" />
                        <span className="line-clamp-1">{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 space-y-4 text-center">
              <Compass className="h-12 w-12 text-terracotta mx-auto" />
              <h3 className="font-serif text-2xl text-sage">Custom Group Curation</h3>
              <p className="text-xs text-sage/80 leading-relaxed">
                Inquiring for a private sanctuary or corporate retreat? Kareena and the Grand Travel & Cruise concierge team will formulate a bespoke proposal tailored to your group size, destination vision, and somatic goals.
              </p>
            </div>
          )}
        </div>

        {/* Reassurance note */}
        <div className="rounded-2xl border border-sand-border bg-sand/40 p-4 space-y-2 text-xs text-sage/80">
          <div className="flex items-center gap-2 font-medium text-sage">
            <ShieldCheck className="h-4 w-4 text-olive shrink-0" />
            <span>Intimate Cohort Curation</span>
          </div>
          <p className="text-[11px] leading-relaxed text-sage/75">
            Submitting this inquiry does not require immediate payment. Kareena personally contacts each applicant to ensure the cohort dynamic aligns with your personal restorative intentions.
          </p>
        </div>
      </div>

      {/* RIGHT: Booking Engine Form or Success Screen */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {state.success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-12 shadow-md text-center space-y-6"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive-soft text-olive border border-olive/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
                  Reservation Received
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
                  Welcome to the Path of Renewal
                </h2>
                <p className="text-sm text-sage/80 max-w-lg mx-auto leading-relaxed">
                  {state.message}
                </p>
              </div>

              {state.bookingReference && (
                <div className="rounded-2xl bg-sand/80 border border-sand-border p-4 max-w-sm mx-auto">
                  <span className="text-[10px] uppercase tracking-wider text-sage/60 block">
                    Your Booking Reference
                  </span>
                  <span className="font-serif text-2xl font-semibold text-sage tracking-wider">
                    {state.bookingReference}
                  </span>
                </div>
              )}

              <div className="border-t border-sand-border/70 pt-6 max-w-md mx-auto text-xs text-sage/75 space-y-2">
                <p>
                  A confirmation email has been dispatched with preliminary details. If you have immediate flight or clinical questions, you can reach out directly to:
                </p>
                <p className="font-medium text-sage">
                  concierge@kaiwellnessretreats.com
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/retreats"
                  className="rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow"
                >
                  Return to Retreats
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-sand-border bg-sand px-6 py-3 text-xs uppercase tracking-widest text-sage hover:bg-sand-muted transition-colors font-medium"
                >
                  Return to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-10 shadow-sm"
            >
              <div className="mb-8 space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
                  Reservation & Waitlist Intake
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
                  Reserve Your Sanctuary Place
                </h2>
                <p className="text-xs sm:text-sm text-sage/75 leading-relaxed">
                  Please complete the confidential inquiry below. All personal and health details are treated with medical-grade discretion.
                </p>
              </div>

              {state.message && !state.success && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl bg-terracotta-soft/70 border border-terracotta/40 p-4 text-xs text-sage">
                  <AlertCircle className="h-4 w-4 text-terracotta shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Submission Incomplete</span>
                    <span>{state.message}</span>
                  </div>
                </div>
              )}

              <form action={formAction} className="space-y-6">
                {/* 1. Sanctuary Selection */}
                <div className="space-y-2">
                  <label htmlFor="retreatId" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                    Select Sanctuary <span className="text-terracotta">*</span>
                  </label>
                  <select
                    id="retreatId"
                    name="retreatId"
                    value={selectedRetreatId}
                    onChange={(e) => setSelectedRetreatId(e.target.value)}
                    className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                  >
                    {RETREATS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.destination} ({r.dates}) — {r.title}
                      </option>
                    ))}
                    <option value="custom">Bespoke / Private Group Inquiry</option>
                  </select>
                  {state.errors?.retreatId && (
                    <p className="text-[11px] text-terracotta">{state.errors.retreatId[0]}</p>
                  )}
                </div>

                {/* 2. Full Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="fullName" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                      Full Legal Name <span className="text-terracotta">*</span>
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="e.g. Eleanor Vance"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                    {state.errors?.fullName && (
                      <p className="text-[11px] text-terracotta">{state.errors.fullName[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                      Email Address <span className="text-terracotta">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      placeholder="eleanor@example.com"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                    {state.errors?.email && (
                      <p className="text-[11px] text-terracotta">{state.errors.email[0]}</p>
                    )}
                  </div>
                </div>

                {/* 3. Phone & Room Preference */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="phone" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                      Phone Number <span className="text-terracotta">*</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="+1 (713) 555-0199"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                    {state.errors?.phone && (
                      <p className="text-[11px] text-terracotta">{state.errors.phone[0]}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="roomPreference" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                      Room Tier Preference <span className="text-terracotta">*</span>
                    </label>
                    <select
                      id="roomPreference"
                      name="roomPreference"
                      defaultValue="private-suite"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    >
                      <option value="private-suite">Private Luxury Suite (Single Occupancy)</option>
                      <option value="shared-luxury">Shared Ocean Villa (Double Occupancy)</option>
                      <option value="flexible">Flexible / First Available Tier</option>
                    </select>
                    {state.errors?.roomPreference && (
                      <p className="text-[11px] text-terracotta">{state.errors.roomPreference[0]}</p>
                    )}
                  </div>
                </div>

                {/* 4. Movement Experience & Passport */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="movementExperience" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                      Movement & Yoga Experience <span className="text-terracotta">*</span>
                    </label>
                    <select
                      id="movementExperience"
                      name="movementExperience"
                      defaultValue="all-levels"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    >
                      <option value="gentle-beginner">Beginner (Gentle, Restorative)</option>
                      <option value="occasional">Occasional Practitioner (Monthly/Weekly)</option>
                      <option value="experienced">Consistent Practice (Vinyasa/Yin)</option>
                      <option value="healing-injury">Recovering from physical strain/injury</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="passportValid" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                      Passport Validity Status
                    </label>
                    <select
                      id="passportValid"
                      name="passportValid"
                      defaultValue="yes-valid-6mo"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    >
                      <option value="yes-valid-6mo">Valid for 6+ months from retreat date</option>
                      <option value="renewal-in-progress">Renewal currently in progress</option>
                      <option value="domestic-only">Traveling domestic (Mexico/Caribbean)</option>
                    </select>
                  </div>
                </div>

                {/* 5. Health, Dietary & Mobility Notes */}
                <div className="space-y-2">
                  <label htmlFor="healthNotes" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                    Dietary Requirements, Health or Mobility Notes
                  </label>
                  <textarea
                    id="healthNotes"
                    name="healthNotes"
                    rows={3}
                    placeholder="e.g. Plant-based, gluten-free, joint sensitivity, or recovering from surgery. (All clinical notes are reviewed personally by Kareena Islam)."
                    className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors resize-none"
                  />
                </div>

                {/* 6. Intentions for Renewal */}
                <div className="space-y-2">
                  <label htmlFor="intentions" className="block text-xs uppercase tracking-wider font-semibold text-sage">
                    Your Personal Intention for this Sanctuary
                  </label>
                  <textarea
                    id="intentions"
                    name="intentions"
                    rows={2}
                    placeholder="e.g. Recovering from executive burnout, deep rest, reconnecting with breath..."
                    className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-full bg-sage py-4 text-xs uppercase tracking-[0.2em] font-medium text-linen hover:bg-sage-dark transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-sand" />
                      <span>Transmitting Inquiry Securely...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Sanctuary Reservation</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-sage/60">
                  By submitting, you consent to receive direct travel and cohort coordination from Kareena Islam & Grand Travel & Cruise.
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
