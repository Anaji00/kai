import React from "react";
import WebhookTelemetryView from "@/components/portal/WebhookTelemetryView";

export const metadata = {
  title: "External Integrations & Webhooks | KAI Founder Studio",
  description: "Monitor live webhooks and connectors for KAI Sanctuary Platform, Expedia EPS, Grand Travel Cirium, and WhatsApp."
};

export default function WebhooksPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <WebhookTelemetryView />
    </div>
  );
}
