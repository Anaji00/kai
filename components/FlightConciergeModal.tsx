"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plane, ShieldCheck, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { submitFlightConciergeRequest } from "@/lib/api";
import { RETREATS } from "@/lib/retreats";

interface FlightConciergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRetreatId?: string;
}

export default function FlightConciergeModal({
  isOpen,
  onClose,
  defaultRetreatId = "nosara-2027",
}: FlightConciergeModalProps) {
  const [guestName, setGuestName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [departureAirport, setDepartureAirport] = useState("");
  const [retreatId, setRetreatId] = useState(defaultRetreatId);
  const [cabinClass, setCabinClass] = useState<"economy" | "premium-economy" | "business" | "first">("business");
  const [preferredAirline, setPreferredAirline] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [successData, setSuccessData] = useState<{ message: string; requestId: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setErrorMsg(null);

    try {
      const res = await submitFlightConciergeRequest({
        guestName,
        email,
        phone,
        retreatId,
        departureAirport: departureAirport.toUpperCase(),
        cabinClass,
        preferredAirline: preferredAirline || undefined,
        travelDatesFlexible: true,
        specialRequests: specialRequests || undefined,
      });

      setSuccessData({ message: res.message, requestId: res.requestId });
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error.message || "Failed to route flight request. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  const handleReset = () => {
    setSuccessData(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-sage/65 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-sand-border bg-linen p-6 sm:p-8 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-sand-border/70 pb-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-olive font-semibold">
                  <Plane className="h-3.5 w-3.5 text-terracotta" />
                  Grand Travel & Cruise Flight Desk
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-sage font-light mt-0.5">
                  VIP Flight & Transfer Coordination
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-2 text-sage/70 hover:bg-sand hover:text-sage transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            {successData ? (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive-soft text-olive border border-olive/30">
                  <CheckCircle2 className="h-8 w-8" />
                </div>

                <div className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
                    Flight Coordination Queued
                  </span>
                  <h4 className="font-serif text-2xl sm:text-3xl text-sage font-light">
                    Your Journey Begins with Ease
                  </h4>
                  <p className="text-xs sm:text-sm text-sage/80 max-w-md mx-auto leading-relaxed">
                    {successData.message}
                  </p>
                </div>

                <div className="rounded-2xl bg-sand/70 border border-sand-border p-4 max-w-xs mx-auto text-xs text-sage/80">
                  <span className="text-[10px] uppercase tracking-wider text-sage/60 block">
                    Concierge Request ID
                  </span>
                  <span className="font-serif text-xl font-semibold text-sage">
                    GT-FLIGHT-#{successData.requestId}
                  </span>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleReset}
                    className="rounded-full bg-sage px-8 py-3 text-xs uppercase tracking-widest text-linen font-medium hover:bg-sage-dark transition-all shadow"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <p className="text-xs text-sage/75 leading-relaxed">
                  Travel anxiety disrupts the nervous system before a retreat begins. Backed by Grand Travel & Cruise’s Funjet 500 Club status, our dedicated flight desk books preferred group air contracts, handles airline schedule changes, and arranges VIP airport meet-and-greets.
                </p>

                {errorMsg && (
                  <div className="flex items-start gap-2.5 rounded-2xl bg-terracotta-soft/70 border border-terracotta/40 p-3.5 text-xs text-sage">
                    <AlertCircle className="h-4 w-4 text-terracotta shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Name & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                      Passenger Full Name <span className="text-terracotta">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Marcus Vance"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                      Email Address <span className="text-terracotta">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="marcus@example.com"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                  </div>
                </div>

                {/* Phone & Sanctuary Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                      Phone Number <span className="text-terracotta">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (713) 555-0199"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                      Retreat Destination <span className="text-terracotta">*</span>
                    </label>
                    <select
                      value={retreatId}
                      onChange={(e) => setRetreatId(e.target.value)}
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    >
                      {RETREATS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.destination} ({r.dates})
                        </option>
                      ))}
                      <option value="custom">Bespoke Private Group</option>
                    </select>
                  </div>
                </div>

                {/* Departure Airport & Cabin Class */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                      Departure City or Airport <span className="text-terracotta">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={departureAirport}
                      onChange={(e) => setDepartureAirport(e.target.value)}
                      placeholder="e.g. IAH, JFK, ORD, SFO"
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                      Cabin Class Preference <span className="text-terracotta">*</span>
                    </label>
                    <select
                      value={cabinClass}
                      onChange={(e) => setCabinClass(e.target.value as "economy" | "premium-economy" | "business" | "first")}
                      className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                    >
                      <option value="business">Business Class (Lie-Flat)</option>
                      <option value="first">First Class Luxury</option>
                      <option value="premium-economy">Premium Economy</option>
                      <option value="economy">Economy Standard</option>
                    </select>
                  </div>
                </div>

                {/* Preferred Airline & Loyalty */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                    Preferred Airline & Frequent Flyer Numbers (Optional)
                  </label>
                  <input
                    type="text"
                    value={preferredAirline}
                    onChange={(e) => setPreferredAirline(e.target.value)}
                    placeholder="e.g. United Star Alliance, Delta SkyMiles, American Airlines"
                    className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors"
                  />
                </div>

                {/* Special Transit Requests */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] uppercase tracking-wider font-semibold text-sage">
                    Luggage, Seating or Special Arrival Notes
                  </label>
                  <textarea
                    rows={2}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="e.g. Traveling with somatic yoga gear, desire extra legroom, or need private tarmac wheelchair escort."
                    className="w-full rounded-2xl border border-sand-border bg-sand/40 px-3.5 py-2.5 text-xs text-sage placeholder:text-sage/40 focus:border-olive focus:outline-none focus:ring-1 focus:ring-olive transition-colors resize-none"
                  />
                </div>

                {/* Trust Footer */}
                <div className="rounded-2xl bg-sand/50 p-3.5 border border-sand-border/70 flex items-center gap-2.5 text-[11px] text-sage/75">
                  <ShieldCheck className="h-4 w-4 text-olive shrink-0" />
                  <span>
                    Direct host agency rates negotiated by Grand Travel & Cruise. No third-party ticketing markups.
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-full bg-sage py-3.5 text-xs uppercase tracking-[0.2em] font-medium text-linen hover:bg-sage-dark transition-all shadow flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-sand" />
                      <span>Routing to Flight Desk...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Flight Coordination Request</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
