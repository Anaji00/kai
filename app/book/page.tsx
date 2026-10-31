import React, { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import BookingForm from "./BookingForm";

export const metadata: Metadata = {
  title: "Reserve Your Sanctuary | KAI Wellness Retreats",
  description:
    "Reserve your intimate place in a 2026–2027 KAI Wellness Retreat. Personally curated by Kareena Islam.",
};

export default function BookPage() {
  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="inline-block rounded-full bg-sand px-4 py-1 text-xs uppercase tracking-[0.25em] text-olive font-semibold border border-sand-border">
          Intimate 12–14 Guest Retreat Groups
        </span>
        <h1 className="font-serif text-4xl sm:text-6xl text-sage font-light tracking-tight">
          Sanctuary Reservation
        </h1>
        <p className="text-sm sm:text-base text-sage/80 font-light leading-relaxed">
          Begin your journey toward deep nervous system relaxation and renewal. Each reservation inquiry is personally reviewed by founder Kareena Islam.
        </p>
      </div>

      {/* Suspense wrapper for useSearchParams in BookingForm */}
      <Suspense
        fallback={
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sage">
              <Loader2 className="h-6 w-6 animate-spin text-terracotta" />
              <span className="font-serif text-lg">Preparing Sanctuary Details...</span>
            </div>
          </div>
        }
      >
        <BookingForm />
      </Suspense>
    </div>
  );
}
