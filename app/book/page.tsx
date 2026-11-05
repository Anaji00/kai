import React, { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import BookingForm from "./BookingForm";

export const metadata: Metadata = {
  title: "Reserve Your Sanctuary | Intimate 12–14 Guest Retreats | KAI",
  description:
    "Reserve your place in a 2026–2027 KAI Wellness Retreat in Puerto Vallarta, Costa Rica, Amalfi Coast, or Bali. Personally reviewed by founder Kareena Islam, BSN, RN.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/book",
  },
  openGraph: {
    title: "Reserve Your Sanctuary Place | KAI Wellness Retreats",
    description:
      "Intimate 12–14 guest sanctuaries. Begin your personalized consultation and somatic wellness intake with founder Kareena Islam, BSN, RN.",
    url: "https://kaiwellnessretreats.com/book",
    siteName: "KAI Wellness Retreats",
    images: [
      {
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "KAI Wellness Retreats — Reserve Your Sanctuary",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Reserve Your Sanctuary | KAI Wellness Retreats",
    description:
      "Begin your journey toward nervous system renewal and restorative luxury travel.",
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export default function BookPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://kaiwellnessretreats.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Reserve Sanctuary",
        item: "https://kaiwellnessretreats.com/book",
      },
    ],
  };

  const bookingServiceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Sanctuary Reservation & Clinical Consultation",
    provider: {
      "@type": "Organization",
      name: "KAI Wellness Retreats",
      url: "https://kaiwellnessretreats.com",
    },
    serviceType: "Luxury Wellness Retreat Booking & Clinical Intake",
    description:
      "Nurse-led personalized retreat intake and suite allocation for intimate 12–14 guest sanctuaries.",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: "https://kaiwellnessretreats.com/book",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(bookingServiceJsonLd).replace(/</g, "\\u003c") }}
      />
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
    </>
  );
}
