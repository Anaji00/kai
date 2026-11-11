import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Hearts Behind KAI | Kareena Islam, BSN, RN & Armaan Islam | KAI",
  description:
    "Meet Kareena Islam, BSN, RN and Armaan Islam—the hearts behind KAI. Discover their passion for caring, healing, movement, and meaningful connection.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/about",
  },
  openGraph: {
    title: "The Hearts Behind KAI Wellness Retreats | Kareena Islam & Armaan Islam",
    description:
      "Nursing experience, yoga and sound baths, and 25+ years of travel planning.",
    url: "https://kaiwellnessretreats.com/about",
    siteName: "KAI Wellness Retreats",
    images: [
      {
        url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "KAI Wellness Retreats — Founder & Sanctuary Philosophy",
      },
    ],
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Kareena Islam, RN | KAI Wellness Retreats",
    description:
      "Evidence-based clinical nursing meets 432Hz crystal sound healing and quiet luxury travel.",
    images: [
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export default function AboutLayout({
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
        name: "The Hearts Behind KAI",
        item: "https://kaiwellnessretreats.com/about",
      },
    ],
  };

  const aboutPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "The Hearts Behind KAI Wellness Retreats",
    url: "https://kaiwellnessretreats.com/about",
    description:
      "Biography, clinical background, and wellness philosophy of Kareena Islam, BSN, RN and Armaan Islam—the hearts behind KAI.",
    mainEntity: [
      {
        "@type": "Person",
        name: "Kareena Islam",
        jobTitle: "Founder, Registered Nurse & Somatic Director",
        alumniOf: {
          "@type": "EducationalOrganization",
          name: "BSN Nursing Program",
        },
        knowsAbout: [
          "Evidence-Based Clinical Nursing",
          "Autonomic Nervous System Regulation",
          "432Hz Crystal Sound Healing",
          "Anatomical Alignment Yoga",
        ],
        sameAs: [
          "https://www.instagram.com/kareenatravelrn/",
        ],
      },
      {
        "@type": "Person",
        name: "Armaan Islam",
        jobTitle: "Co-Founder & Strategic Director",
        knowsAbout: [
          "Ironman Triathlon & Endurance Recovery",
          "Metabolic Conditioning",
          "Luxury Travel Operations",
        ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}

