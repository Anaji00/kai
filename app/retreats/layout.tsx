import type { Metadata } from "next";
import { RETREATS } from "@/lib/retreats";

export const metadata: Metadata = {
  title: "Sanctuaries & Retreat Calendar | KAI Wellness Retreats",
  description:
    "Discover our intimate 12–14 guest sanctuaries in Puerto Vallarta and Riviera Maya. Restorative wellness retreats combining mindful movement, crystal sound healing, and genuine cultural connection.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/retreats",
  },
  openGraph: {
    title: "Sanctuaries & Retreat Calendar | KAI Wellness Retreats",
    description:
      "Explore intimate 12–14 guest sanctuaries thoughtfully created by Kareena and Armaan Islam. Restorative, inspiring, and harmoniously paced.",
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
    title: "Sanctuaries & Retreat Calendar | KAI Wellness Retreats",
    description:
      "Intimate sanctuaries combining mindful movement, crystal sound baths, and genuine cultural connection.",
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

