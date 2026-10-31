import React from "react";
import OperatorCalendarView from "@/components/portal/OperatorCalendarView";

export const metadata = {
  title: "Retreat & Alignment Calendar | KAI Founder Studio",
  description: "Schedule retreat groups, 20-minute client consultations, and live Cirium flight arrivals."
};

export default function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <OperatorCalendarView />
    </div>
  );
}
