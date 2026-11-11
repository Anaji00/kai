import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kaiwellnessretreats.com"),
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
      { url: "/kai-logo.png", type: "image/png" },
      { url: "/kai-logo-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  title: {
    default: "KAI Wellness Retreats | A Journey of Movement, Culture & Connection",
    template: "%s | KAI Wellness Retreats",
  },
  description:
    "KAI Wellness Retreats: A Journey of Movement, Culture & Connection. Restorative wellness retreats with yoga, crystal singing bowl sound baths, and authentic cultural experiences, powered by Grand Travel.",
  keywords: [
    "KAI Wellness Retreats",
    "Kareena Islam",
    "Nurse led retreat",
    "Somatic retreats",
    "Quiet luxury wellness retreats",
    "Puerto Vallarta luxury retreat",
    "Riviera Maya wellness retreat",
    "Marival Armony retreat",
    "Crystal singing bowl sound bath",
        "Autonomic nervous system recovery",
    "Grand Travel and Cruise",
    "Luxury wellness travel",
  ],
  authors: [
    { name: "Kareena Islam, BSN, RN", url: "https://kaiwellnessretreats.com/about" },
    { name: "Armaan Islam", url: "https://kaiwellnessretreats.com/about" },
  ],
  creator: "Kareena Islam, BSN, RN",
  publisher: "KAI Wellness Retreats",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "https://kaiwellnessretreats.com",
    languages: {
      "en-US": "https://kaiwellnessretreats.com",
      "x-default": "https://kaiwellnessretreats.com",
    },
  },
  category: "travel",
  classification: "Luxury Wellness Retreats & Clinical Somatic Care",
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KAI Sanctuary",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "KAI Wellness Retreats | A Journey of Movement, Culture & Connection",
    description:
      "A Journey of Movement, Culture & Connection. Restorative wellness retreats in Puerto Vallarta and Riviera Maya, powered by Grand Travel.",
    url: "https://kaiwellnessretreats.com",
    siteName: "KAI Wellness Retreats",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "KAI Sanctuary & Wellness Retreats — Tranquil Pacific Coastline",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KAI Wellness Retreats | A Journey of Movement, Culture & Connection",
    description:
      "A Journey of Movement, Culture & Connection. Restorative wellness retreats in Puerto Vallarta and Riviera Maya, powered by Grand Travel.",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": ["HealthAndBeautyBusiness", "TravelAgency"],
  name: "KAI Wellness Retreats",
  alternateName: ["KAI Sanctuaries", "KAI Sanctuary Travel", "KAI Wellness"],
  url: "https://kaiwellnessretreats.com",
  logo: "https://kaiwellnessretreats.com/kai-logo.png",
  image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
  email: "concierge@kaiwellnessretreats.com",
  priceRange: "$$$$",
  founder: {
    "@type": "Person",
    name: "Kareena Islam",
    jobTitle: "Founder, Registered Nurse & Somatic Director",
    sameAs: [
      "https://www.instagram.com/kareenatravelrn/",
    ],
  },
  founderPerson: {
    "@type": "Person",
    name: "Armaan Islam",
    jobTitle: "Co-Founder & Strategic Director",
  },
  description:
    "Intimate, quiet luxury wellness retreats with yoga, crystal singing bowl sound baths, and luxury travel planning.",
  knowsAbout: [
    "Somatic Movement",
    "Autonomic Nervous System Regulation",
        "432Hz Crystal Sound Healing",
    "High-Altitude & Tropical Microclimate Acclimatization",
    "Luxury Wellness Travel",
  ],
  sameAs: [
    "https://www.instagram.com/kaiwellnessretreats/",
    "https://www.instagram.com/kareenatravelrn/",
  ],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "KAI Wellness Retreats",
  url: "https://kaiwellnessretreats.com",
  alternateName: ["KAI", "KAI Sanctuaries"],
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How does KAI differ from typical wellness or yoga retreats?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "KAI was founded by Kareena Islam, BSN, RN to treat the root of modern burnout: chronic nervous system stress and exhaustion. Every schedule, breathwork cadence, Yin pose, and 432Hz crystal bowl frequency is clinical-grade and intentionally sequenced to shift your body from chronic fight-or-flight tension into deep, restful peace.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need previous experience in yoga, breathwork, or sound healing?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not at all. With Kareena’s clinical nursing background and RYT certifications, movement practices prioritize orthopedic safety, anatomical modifications, and restorative myofascial release. Every session meets your body exactly where it is.",
      },
    },
    {
      "@type": "Question",
      name: "Why are retreat groups strictly limited to 12–14 participants?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "True nervous system relaxation and deep restoration require psychological safety and genuine intimacy. Small retreat groups allow Kareena to provide individualized somatic attention and preserve the sacred stillness needed for profound rest.",
      },
    },
    {
      "@type": "Question",
      name: "How does Grand Travel & Cruise secure the best rates and private estate access?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "With over 25 years as a premier host agency under Jay Islam, Grand Travel & Cruise commands high-volume global purchasing power, negotiating full private estate buyouts, preferred group air contracts, and exclusive industry rates.",
      },
    },
    {
      "@type": "Question",
      name: "Can dietary preferences, allergies, or restrictions be accommodated?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, completely. Prior to arrival, you complete a comprehensive clinical wellness and dietary intake form. Our chefs prepare organic, anti-inflammatory, farm-to-table meals tailored precisely to gluten-free, vegan, vegetarian, dairy-free, or specific allergy profiles.",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${jakarta.variable} scroll-smooth`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#2D3E35" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-linen text-sage antialiased selection:bg-olive selection:text-linen">
        <PwaRegister />
        <Navbar />
        <main className="flex-1 pt-20">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
