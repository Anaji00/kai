import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Kareena Islam, RN & Founders | Clinical & Somatic Mastery | KAI",
  description:
    "Meet founder Kareena Islam, BSN, RN and Armaan Islam. Learn how a nurse and an Ironman athlete came together with Grand Travel & Cruise to create small wellness retreats.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/about",
  },
  openGraph: {
    title: "About the Founders of KAI Wellness Retreats | Kareena Islam, BSN, RN",
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
      "Clinical high-acuity nursing meets 432Hz crystal sound healing and quiet luxury travel.",
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
        name: "About Us & Founders",
        item: "https://kaiwellnessretreats.com/about",
      },
    ],
  };

  const aboutPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About KAI Wellness Retreats & Founders",
    url: "https://kaiwellnessretreats.com/about",
    description:
      "Biography, clinical background, and travel lineage of founders Kareena Islam, BSN, RN and Armaan Islam.",
    mainEntity: {
      "@type": "Person",
      name: "Kareena Islam",
      jobTitle: "Founder, Registered Nurse & Somatic Director",
      alumniOf: {
        "@type": "EducationalOrganization",
        name: "BSN Nursing Program",
      },
      knowsAbout: [
        "High-Acuity Clinical Nursing",
        "Autonomic Nervous System Regulation",
        "432Hz Crystal Sound Healing",
        "Anatomical Alignment Yoga",
      ],
      sameAs: [
        "https://www.instagram.com/kareenatravelrn/",
      ],
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageJsonLd).replace(/</g, "\\u003c") }}
      />
      {children}
    </>
  );
}

