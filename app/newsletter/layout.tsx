import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beyond The Retreats | Newsletter & Press | KAI Wellness Retreats",
  description:
    "Beyond The Retreats is the newsletter from Kareena and Armaan Islam—sharing reflections on wellness, gratitude, travel, press features, and early updates on upcoming KAI retreats.",
  alternates: {
    canonical: "https://kaiwellnessretreats.com/newsletter",
  },
  openGraph: {
    title: "Beyond The Retreats | KAI Wellness Retreats",
    description:
      "Reflections on mindful living, travel, and gratitude from Kareena and Armaan Islam, plus features in TravelAge West, Travel Weekly, and Click2Houston.",
    url: "https://kaiwellnessretreats.com/newsletter",
    siteName: "KAI Wellness Retreats",
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Beyond The Retreats — KAI Wellness Retreats",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyond The Retreats | KAI Wellness Retreats",
    description:
      "Read Kareena Islam's features in TravelAge West and subscribe to Beyond The Retreats for updates from Kareena and Armaan.",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

export default function NewsletterLayout({
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
        name: "Beyond The Retreats",
        item: "https://kaiwellnessretreats.com/newsletter",
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {children}
    </>
  );
}
