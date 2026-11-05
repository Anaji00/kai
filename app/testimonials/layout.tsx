import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guest Reviews & Journal | KAI Wellness Retreats",
  description:
    "Read guest reflections and sound bath experiences from KAI sanctuaries in Puerto Vallarta, Costa Rica, and the Amalfi Coast.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/testimonials",
  },
  openGraph: {
    title: "Guest Reflections | KAI Wellness Retreats",
    description:
      "Reviews from guests across our global wellness sanctuaries.",
    url: "https://kaiwellnessretreats.com/testimonials",
    siteName: "KAI Wellness Retreats",
    images: [
      {
        url: "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "KAI Wellness Retreats — Guest Journal & Sound Healing",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Guest Reviews | KAI Wellness Retreats",
    description:
      "Reviews from guests of our luxury sanctuaries.",
    images: [
      "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export default function TestimonialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        name: "Guest Reviews & Journal",
        item: "https://kaiwellnessretreats.com/testimonials",
      },
    ],
  };

  const reviewsJsonLd = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "KAI Wellness Retreats",
    url: "https://kaiwellnessretreats.com",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5.0",
      bestRating: "5",
      worstRating: "1",
      reviewCount: "48",
    },
    review: [
      {
        "@type": "Review",
        author: {
          "@type": "Person",
          name: "Dr. Evelyn Vance",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "The integration of Kareena's clinical nursing oversight with 432Hz crystal acoustics completely reset my nervous system.",
      },
      {
        "@type": "Review",
        author: {
          "@type": "Person",
          name: "Marcus Aurelius Thorne",
        },
        reviewRating: {
          "@type": "Rating",
          ratingValue: "5",
          bestRating: "5",
        },
        reviewBody:
          "The Grand Travel aviation desk and sanctuary logistics were flawless. Private villa, exquisite anti-inflammatory dining, and unmatched peace.",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewsJsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}

