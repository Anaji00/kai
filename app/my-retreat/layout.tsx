import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sanctuary Guest Companion | KAI Wellness Retreats",
  description: "Private retreat itinerary, flight concierge, and somatic schedule companion for registered sanctuary guests.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyRetreatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
