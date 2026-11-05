import type { Metadata } from "next";
import { RETREATS } from "@/lib/retreats";

export const metadata: Metadata = {
  title: "2026–2027 Luxury Wellness Sanctuaries & Retreat Calendar | KAI",
  description:
    "Discover our intimate 12–14 guest sanctuaries in Puerto Vallarta, Nosara, Amalfi Coast, Bali, and Sedona. Nurse-led autonomic restoration, 432Hz crystal sound baths, and bespoke luxury travel.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/retreats",
  },
  openGraph: {
    title: "2026–2027 Global Retreat Calendar | KAI Wellness Retreats",
    description:
      "Explore intimate 12–14 guest sanctuaries personally planned by Kareena Islam, BSN, RN. Medically informed, restorative, and harmoniously paced.",
    url: "https://kaiwellnessretreats.com/retreats",
    siteName: "KAI Wellness Retreats",
    images: [
      {
        url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "KAI Wellness Retreats — Serene Sanctuary Setting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "2026–2027 Retreat Calendar | KAI Wellness Retreats",
    description:
      "Intimate global sanctuaries in Mexico, Costa Rica, Italy, and Bali. Nurse-led nervous system restoration.",
    images: [
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export default function RetreatsLayout({
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
        name: "Sanctuaries & Retreats",
        item: "https://kaiwellnessretreats.com/retreats",
      },
    ],
  };

  const retreatListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "KAI Global Sanctuaries & Retreats 2026-2027",
    description: "A collection of nurse-led luxury wellness retreats.",
    itemListElement: RETREATS.map((r, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: r.title,
      url: `https://kaiwellnessretreats.com/retreats/${r.slug}`,
      image: r.heroImage,
      description: r.tagline,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(retreatListJsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}

