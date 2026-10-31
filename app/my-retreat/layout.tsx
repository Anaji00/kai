import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Sanctuary Companion | KAI Wellness Retreats",
  description:
    "Your personal KAI Wellness Retreats companion. Access your somatic schedule, flight tracking, live weather, packing checklist, and breathwork tools.",
  robots: { index: false, follow: false },
};

export default function MyRetreatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
