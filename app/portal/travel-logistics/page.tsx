import React from "react";
import TravelLogisticsMapView from "@/components/portal/TravelLogisticsMapView";

export const metadata = {
  title: "Sanctuary Travel & Destinations | KAI Founder Studio",
  description: "Scenic chauffeur transit, live microclimate weather windows, Blue Zone dining, and verified guest reflections for KAI Wellness Retreats."
};

export default function TravelLogisticsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <TravelLogisticsMapView />
    </div>
  );
}
