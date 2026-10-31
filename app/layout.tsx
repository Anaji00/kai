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
  title: {
    default: "KAI Sanctuary & Wellness Retreats | Restorative Wellness & Curated Luxury Travel",
    template: "%s | KAI Wellness Retreats",
  },
  description:
    "Founded by Kareena Islam. Intimate, quiet luxury wellness retreats blending restorative circadian vitality, anatomical yoga, crystal singing bowl sound healing, and bespoke Grand Travel curation.",
  keywords: [
    "KAI Wellness Retreats",
    "Kareena Islam",
    "Nurse led retreat",
    "Somatic retreats",
    "Quiet luxury wellness",
    "Costa Rica wellness retreat",
    "Amalfi Coast retreat",
    "Bali somatic retreat",
    "Crystal singing bowl sound bath",
    "Vagus nerve reset",
    "Grand Travel and Cruise",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "KAI Wellness Retreats | Where Clinical Science Meets Somatic Restoration",
    description:
      "Curated by Kareena Islam. Restorative wellness retreats in Nosara, Amalfi Coast, Bali, and Riviera Maya.",
    url: "https://kaiwellnessretreats.com",
    siteName: "KAI Wellness Retreats",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "KAI Wellness Retreats",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KAI Wellness Retreats | Clinical Science & Somatic Restoration",
    description:
      "Nurse-led luxury sanctuaries in Costa Rica, Amalfi Coast, Bali, and Riviera Maya.",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "HealthAndBeautyBusiness",
  name: "KAI Wellness Retreats",
  url: "https://kaiwellnessretreats.com",
  logo: "https://kaiwellnessretreats.com/icon.png",
  founder: {
    "@type": "Person",
    name: "Kareena Islam",
    jobTitle: "Founder, Registered Nurse & Clinical Director",
  },
  description:
    "Intimate, quiet luxury wellness retreats blending clinical autonomic science, anatomical yoga, crystal singing bowl sound healing, and bespoke luxury travel curation.",
  sameAs: [
    "https://www.instagram.com/kaiwellnessretreats/",
    "https://www.instagram.com/kareenatravelrn/",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
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
