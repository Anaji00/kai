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
        url: "/images/about-movement.jpg",
        width: 576,
        height: 1024,
        alt: "KAI Wellness Retreats — Founder & Sanctuary Philosophy",
      },
    ],
    type: "profile",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Kareena Islam, RN & Armaan Islam | KAI Wellness Retreats",
    description:
      "Meet Kareena Islam, BSN, RN and Armaan Islam—the siblings behind KAI Wellness Retreats.",
    images: ["/images/about-movement.jpg"],
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

