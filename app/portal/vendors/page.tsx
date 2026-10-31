import React from "react";
import VendorSuppliersRegistry from "@/components/portal/VendorSuppliersRegistry";

export const metadata = {
  title: "Preferred Vendors & Suppliers | KAI Founder Studio",
  description: "Tern CRM Back Office supplier registry, commission structures, and wellness certifications for KAI Wellness Retreats."
};

export default function VendorsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <VendorSuppliersRegistry />
    </div>
  );
}
