"use client";

import React, { useActionState, useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Compass,
  FileSignature,
  CloudSun,
  Plane,
} from "lucide-react";
import confetti from "canvas-confetti";
import { submitBookingInquiry } from "@/app/actions/booking";
import { RETREATS, getRetreatById } from "@/lib/retreats";
import { BookingFormState } from "@/lib/types";
import FlightConciergeModal from "@/components/FlightConciergeModal";

const initialState: BookingFormState = {
  success: false,
  message: "",
};

export default function BookingForm() {
  const searchParams = useSearchParams();
  const preselectedRetreatParam = searchParams.get("retreat") || "puerto-vallarta-2027";

  const [selectedRetreatId, setSelectedRetreatId] = useState<string>(preselectedRetreatParam);
  const [prevParam, setPrevParam] = useState<string>(preselectedRetreatParam);
  const [typedSignature, setTypedSignature] = useState<string>("");
  const [waiverChecked, setWaiverChecked] = useState<boolean>(false);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState<boolean>(false);

  if (preselectedRetreatParam !== prevParam) {
    setPrevParam(preselectedRetreatParam);
    setSelectedRetreatId(preselectedRetreatParam);
  }

  const [state, formAction, isPending] = useActionState(submitBookingInquiry, initialState);
  const resultRef = useRef<HTMLDivElement>(null);

  // The result appears at the top of a long form, away from the submit button, so bring it into view.
  // Without this a guest is left looking at the footer and never sees their reference number.
  useEffect(() => {
    if (!state.message) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    resultRef.current?.focus({ preventScroll: true });
  }, [state]);

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
      <div className="lg:col-span-5 space-y-5">
        <div className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-sm">
          {selectedRetreat ? (
            <>
              <div className="relative h-44 w-full">
                <Image
                  src={selectedRetreat.heroImage}
                  alt={selectedRetreat.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage/85 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-linen/90 backdrop-blur-md px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sage border border-sand-border">
                    {selectedRetreat.destination}
                  </span>
                  {selectedRetreat.status === "coming-soon" ? (
                    <span className="rounded-full bg-sage-dark/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sand">
                      Coming Soon Placeholder
                    </span>
                  ) : (
                    <span className="rounded-full bg-terracotta px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-linen">
                      First Retreat of 2027 • Open
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-linen">
                  <span className="text-[10px] uppercase tracking-widest text-sand-muted block">
                    {selectedRetreat.dates}
                  </span>
                  <h3 className="font-serif text-xl font-normal leading-snug">
                    {selectedRetreat.title}
                  </h3>
                </div>
              </div>

              <div className="p-5 space-y-3.5">
                <div className="rounded-2xl bg-sand/60 p-3 border border-sand-border/70 grid grid-cols-2 gap-2 text-xs text-sage/85">
                  <div>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider block">Resort</span>
                    <span className="font-medium text-sage line-clamp-1">
                      {selectedRetreat.locationDetails.split("•")[0]}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider block">Starting</span>
                    <span className="font-medium text-sage">{selectedRetreat.investmentStarting}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider block">Capacity</span>
                    <span className="font-medium text-sage">{selectedRetreat.spotsTotal} guests max</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-sage/60 uppercase tracking-wider block">Availability</span>
                    <span className="font-medium text-terracotta">
                      {selectedRetreat.status === "coming-soon"
                        ? "Priority Waitlist"
                        : `${selectedRetreat.spotsRemaining} spots available`}
                    </span>
                  </div>
                </div>

                {selectedRetreat.weatherProfile && (
                  <div className="rounded-2xl bg-sand/35 border border-sand-border/80 p-3 space-y-1 text-xs">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1.5">
                      <CloudSun className="h-3.5 w-3.5 text-terracotta" />
                      Weather Context • {selectedRetreat.weatherProfile.targetWindow.split("(")[0].trim()}
                    </span>
                    <p className="text-[11px] font-medium text-sage">
                      {selectedRetreat.weatherProfile.avgHighF}°F High / {selectedRetreat.weatherProfile.avgLowF}°F Low • {selectedRetreat.weatherProfile.oceanTempF}°F Ocean
                    </p>
                    <p className="text-[10px] text-sage/75">
                      {selectedRetreat.weatherProfile.climateSummary}
                    </p>
                  </div>
                )}

                <div className="space-y-1.5 border-t border-sand-border/60 pt-2.5">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-olive block">
                    Key Inclusions:
                  </span>
                  <ul className="space-y-1 text-xs text-sage/75">
                    {selectedRetreat.inclusions.slice(0, 2).map((inc, i) => (
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
            <div className="p-6 space-y-3 text-center">
              <Compass className="h-10 w-10 text-terracotta mx-auto" />
              <h3 className="font-serif text-xl text-sage">Custom Group Retreats</h3>
              <p className="text-xs text-sage/80 leading-relaxed">
                Inquiring for a private sanctuary or corporate retreat? Kareena Islam, Armaan Islam, and Grand Travel &amp; Cruise will put together a proposal tailored to your group size, destination, and somatic goals.
              </p>
            </div>
          )}
        </div>

        {/* Dual Founder Routing Reassurance Note */}
        <div className="rounded-2xl border border-sand-border bg-sand/40 p-4 space-y-2 text-xs text-sage/80">
          <div className="flex items-center gap-2 font-medium text-sage">
            <ShieldCheck className="h-4 w-4 text-olive shrink-0" />
            <span>Direct Founders Review</span>
          </div>
          <p className="text-[11px] leading-relaxed text-sage/75">
            Every inquiry is sent directly to <strong>kareena@grandtravelcruise.com</strong> &amp; <strong>armaan@grandtravelcruise.com</strong> for personal review by Kareena and Armaan.
          </p>
        </div>

        {/* Grand Travel & Cruise Flight Concierge Launcher Card */}
        <div className="rounded-2xl border border-sand-border bg-linen p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-sage text-xs">
              <Plane className="h-4 w-4 text-terracotta shrink-0" />
              <span className="uppercase tracking-wider text-[11px] font-semibold text-olive">
                Grand Travel &amp; Cruise Flight Desk
              </span>
            </div>
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-[10px] font-medium text-olive border border-sand-border">
              Premier Host Agency
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-sage/80">
            Need preferred group air rates, lie-flat seating, or private tarmac SUV transfer coordination to{" "}
            <strong>{selectedRetreat ? selectedRetreat.destination : "your sanctuary"}</strong>?
          </p>
          <button
            type="button"
            onClick={() => setIsFlightModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-sand-border bg-sand hover:bg-sand-muted px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-sage transition-all"
          >
            <Plane className="h-3.5 w-3.5 text-terracotta" />
            <span>Open VIP Flight &amp; Transfer Concierge</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Reservation Form or Confirmation Screen */}
      <div ref={resultRef} tabIndex={-1} className="lg:col-span-7 scroll-mt-24 focus:outline-none">
        <AnimatePresence mode="wait">
          {state.success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-10 shadow-md space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive-soft text-olive border border-olive/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold block">
                  Reservation Inquiry Received
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
                  Welcome to the Path of Renewal
                </h2>
                <p className="text-xs sm:text-sm text-sage/80 max-w-xl mx-auto leading-relaxed">
                  {state.message}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {state.bookingReference && (
                    <div className="rounded-2xl bg-sand/80 border border-sand-border px-4 py-2.5 text-left">
                      <span className="text-[10px] uppercase tracking-wider text-sage/60 block">
                        Booking Reference
                      </span>
                      <span className="font-serif text-xl font-semibold text-sage tracking-wider">
                        {state.bookingReference}
                      </span>
                    </div>
                  )}

                  {state.waiverSignedBy && (
                    <div className="rounded-2xl bg-sand/80 border border-sand-border px-4 py-2.5 text-left">
                      <span className="text-[10px] uppercase tracking-wider text-olive font-semibold block">
                        Waiver E-Signature Verified
                      </span>
                      <span className="font-serif text-sm font-medium text-sage block">
                        Signed by: {state.waiverSignedBy}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/retreats"
                  className="rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest text-linen hover:bg-sage-dark transition-all font-medium shadow"
                >
                  Explore Sanctuaries
                </Link>
                <Link
                  href="/about"
                  className="rounded-full border border-sand-border bg-sand px-6 py-3 text-xs uppercase tracking-widest text-sage hover:bg-sand-muted transition-colors font-medium"
                >
                  Meet Kareena &amp; Armaan
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
                  Sanctuary Reservation &amp; Liability Waiver
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
                  Reserve Your Sanctuary Place
                </h2>
                <p className="text-xs sm:text-sm text-sage/75 leading-relaxed">
                  Complete your inquiry below. Your submission is sent directly to{" "}
                  <strong>kareena@grandtravelcruise.com</strong> &amp;{" "}
                  <strong>armaan@grandtravelcruise.com</strong> for personal consultation and suite coordination.
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
                        {r.id === "puerto-vallarta-2027"
                          ? `FIRST RETREAT OF 2027: ${r.destination} (${r.dates}) — Marival Harmony`
                          : `${r.destination} (${r.dates}) — ${r.title}`}
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
                      Movement &amp; Endurance Experience <span className="text-terracotta">*</span>
                    </label>
                    <select
                      id="movementExperience"
                      name="movementExperience"
                      defaultValue="all-levels"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    >
                      <option value="all-levels">All Levels (Balanced Somatic &amp; Mobility)</option>
                      <option value="gentle-beginner">Beginner (Gentle, Restorative Focus)</option>
                      <option value="experienced">Consistent Practice (Vinyasa / Yin / Endurance)</option>
                      <option value="healing-injury">Recovering from physical strain or injury</option>
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
                      <option value="need-assistance">Need Grand Travel passport expedited assistance</option>
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
                    placeholder="e.g. Plant-based, gluten-free, joint sensitivity, marathon/triathlon recovery, or post-surgical care. (Reviewed personally by Kareena Islam, BSN, RN & Armaan Islam)."
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
                    placeholder="e.g. Recovering from executive burnout, deep sleep reset, blending peace within with the cultural pieces around..."
                    className="w-full rounded-2xl border border-sand-border bg-sand/40 px-4 py-3 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors resize-none"
                  />
                </div>

                {/* 7. LIABILITY WAIVER FOR POTENTIAL INJURIES & ELECTRONIC SIGNATURE */}
                <div className="rounded-2xl border-2 border-sand-border bg-sand/50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-semibold text-sage flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-terracotta" />
                      Release of Liability Waiver &amp; Electronic Signature <span className="text-terracotta">*</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-olive font-semibold">
                      Required Legal Consent
                    </span>
                  </div>

                  <div className="max-h-28 overflow-y-auto rounded-xl border border-sand-border bg-linen p-3 text-[11px] text-sage/75 leading-relaxed space-y-1.5">
                    <p>
                      <strong>Assumption of Risk &amp; Release of Liability for Potential Injuries:</strong> By participating in KAI Wellness Retreats programming—including yoga, somatic movement, breathwork, 432Hz sound baths, thermal hydrotherapy, endurance mobility sessions, ocean/water excursions, and international travel coordinated with Grand Travel &amp; Cruise—I acknowledge that physical movement and travel carry inherent risks of potential physical or musculoskeletal injury, illness, or property loss.
                    </p>
                    <p>
                      I confirm that I am medically fit to participate or will disclose any physical limitations to Kareena Islam, BSN, RN prior to movement sessions. I hereby voluntarily assume all risks and release, waive, and hold harmless KAI Wellness Retreats, Grand Travel &amp; Cruise, Kareena Islam, Armaan Islam, and partner resorts (including Marival Armony) from liability for any potential injuries to the fullest extent permitted by law.
                    </p>
                  </div>

                  {/* Mandatory Checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer text-xs text-sage">
                    <input
                      type="checkbox"
                      name="waiverAccepted"
                      required
                      checked={waiverChecked}
                      onChange={(e) => setWaiverChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-sand-border text-sage focus:ring-olive accent-sage"
                    />
                    <span className="leading-relaxed">
                      <strong>I agree to the Liability Waiver for Potential Injuries:</strong> I have read and accept the Release of Liability, Assumption of Risk, and Somatic Wellness Disclaimer above. <span className="text-terracotta">*</span>
                    </span>
                  </label>
                  {state.errors?.waiverAccepted && (
                    <p className="text-[11px] text-terracotta">{state.errors.waiverAccepted[0]}</p>
                  )}

                  {/* Typed Electronic Signature */}
                  <div className="space-y-1.5 pt-1">
                    <label
                      htmlFor="electronicSignature"
                      className="block text-[11px] uppercase tracking-wider font-semibold text-sage"
                    >
                      Typed Electronic Signature (Type Your Full Legal Name) <span className="text-terracotta">*</span>
                    </label>
                    <input
                      id="electronicSignature"
                      name="electronicSignature"
                      type="text"
                      required
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      placeholder="Type your full legal name to electronically sign"
                      className="w-full rounded-xl border border-sand-border bg-linen px-4 py-2.5 font-serif italic text-sm text-sage placeholder:font-sans placeholder:not-italic placeholder:text-xs placeholder:text-sage/40 focus:border-olive focus:outline-none"
                    />
                    {typedSignature && (
                      <p className="text-[10px] text-olive flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 shrink-0" />
                        <span>
                          Electronic signature preview: <strong className="font-serif italic text-xs">{typedSignature}</strong> • Timestamped upon submission
                        </span>
                      </p>
                    )}
                    {state.errors?.electronicSignature && (
                      <p className="text-[11px] text-terracotta">{state.errors.electronicSignature[0]}</p>
                    )}
                  </div>
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
                      <span>Submitting Your Reservation Inquiry...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Reservation Inquiry</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-sage/65">
                  Inquiries route simultaneously to{" "}
                  <strong>kareena@grandtravelcruise.com</strong> &amp;{" "}
                  <strong>armaan@grandtravelcruise.com</strong> • Grand Travel &amp; Cruise
                </p>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Flight Concierge Modal (Moved exclusively to Booking Page) */}
      <FlightConciergeModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        defaultRetreatId={
          selectedRetreatId && selectedRetreatId !== "custom"
            ? selectedRetreatId
            : "puerto-vallarta-2027"
        }
      />
    </div>
  );
}
