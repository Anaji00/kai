"use client";

import React, { useState, useEffect } from "react";
import {
  Globe2,
  CheckCircle2,
  AlertCircle,
  Play,
  RefreshCw,
  CreditCard,
  Building,
  Plane,
  MessageSquare,
  Mail,
  Check,
  Code,
  Sparkles,
} from "lucide-react";
import { triggerExplainThis } from "@/lib/portal-form-bus";
import {
  fetchIntegrationProviders,
  fetchWebhookEventLogs,
  simulateWebhookEvent,
  IntegrationProvider,
  WebhookEventLog
} from "@/lib/sidecar-api";

export default function WebhookTelemetryView() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [logs, setLogs] = useState<WebhookEventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState("");

  // Simulation Form
  const [simProvider, setSimProvider] = useState("cirium_flights");
  const [simEventType, setSimEventType] = useState("flight.delayed");

  const loadData = async () => {
    setLoading(true);
    try {
      const [provRes, logRes] = await Promise.all([
        fetchIntegrationProviders(),
        fetchWebhookEventLogs()
      ]);
      setProviders(provRes.providers);
      setLogs(logRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSimulate = async () => {
    setSimulating(true);
    setSimSuccessMsg("");
    try {
      let samplePayload: Record<string, unknown> = {};
       if (simProvider === "expedia_pms") {
        samplePayload = {
          hotel: "Andaz Peninsula Papagayo",
          gateway: "LIR",
          nights: 2,
          status: "CONFIRMED"
        };
      } else if (simProvider === "cirium_flights") {
        samplePayload = {
          flight: "DL 1928",
          route: "MIA -> LIR",
          status: "ON_TIME",
          eta: "13:45 UTC"
        };
      } else if (simProvider === "whatsapp_cloud") {
        samplePayload = {
          from: "+17135550199",
          message: "Approved proposal for Nosara",
          timestamp: new Date().toISOString()
        };
      } else {
        samplePayload = {
          from: "sarah.j@example.com",
          subject: "Inquiry regarding private villa & 4-7-8 breathing",
          intent: "VOUCHER_CONFIRMATION"
        };
      }

      const res = await simulateWebhookEvent(simProvider, simEventType, samplePayload);
      setSimSuccessMsg(res.message);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const getProviderIcon = (id: string) => {
    switch (id) {
      case "expedia_pms":
        return <Building className="w-5 h-5 text-amber-400" />;
      case "cirium_flights":
        return <Plane className="w-5 h-5 text-sky-400" />;
      case "whatsapp_cloud":
        return <MessageSquare className="w-5 h-5 text-emerald-300" />;
      default:
        return <Mail className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-stone-900/80 border border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif text-stone-100">External Travel &amp; Service Connections</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
              5 Active Connectors
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Live connections for your sanctuary apps: Grand Travel Flight Tracker, Hotel PMS, WhatsApp Concierge, and Guest Intake Forms.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map(prov => (
          <div
            key={prov.id}
            className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-stone-700 transition-all space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-stone-800/80 border border-stone-700/60">
                  {getProviderIcon(prov.id)}
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {prov.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-stone-100">{prov.name}</h3>
                <p className="text-[11px] text-amber-400/90 font-medium">{prov.category}</p>
              </div>

              <p className="text-xs text-stone-300 leading-relaxed">
                {prov.description}
              </p>
            </div>

            <div className="pt-3 border-t border-stone-800/80 space-y-1.5 text-[11px]">
              <div className="text-stone-400 font-mono truncate">
                <span className="text-stone-500 font-sans">Endpoint: </span>
                {prov.webhook_url}
              </div>
              <div className="flex flex-wrap gap-1">
                {prov.active_events.map(ev => (
                  <span key={ev} className="px-2 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Simulator Panel */}
      <div className="p-5 rounded-2xl bg-stone-900/40 border border-stone-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-stone-100">Simulate External Webhook Event</h2>
          </div>
          <span className="text-[11px] text-stone-400">
            Tests end-to-end integration resilience without external API dependencies.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] text-stone-400 mb-1">Provider</label>
            <select
              value={simProvider}
              onChange={e => {
                setSimProvider(e.target.value);
                if (e.target.value === "expedia_pms") setSimEventType("booking.confirmed");
                else if (e.target.value === "cirium_flights") setSimEventType("flight.status_update");
                else if (e.target.value === "whatsapp_cloud") setSimEventType("messages.received");
                else setSimEventType("email.received");
              }}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            >
              
              <option value="expedia_pms">Expedia EPS / Hotel PMS</option>
              <option value="cirium_flights">Cirium Flight Tracker</option>
              <option value="whatsapp_cloud">Meta WhatsApp Cloud</option>
              <option value="resend_email">Resend Concierge Email</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-stone-400 mb-1">Event Type</label>
            <input
              type="text"
              value={simEventType}
              onChange={e => setSimEventType(e.target.value)}
              className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-xl text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="w-full py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              <span>{simulating ? "Injecting Event..." : "Simulate & Log Event"}</span>
            </button>
          </div>
        </div>

        {simSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{simSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* Live Webhook Event Logs */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
            <Code className="w-4 h-4 text-stone-400" />
            Live Webhook &amp; Connection Logs
          </h2>
          <span className="text-xs text-stone-500 font-mono">{logs.length} events logged</span>
        </div>

        <div className="rounded-2xl bg-stone-900/60 border border-stone-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-950/80 border-b border-stone-800 text-stone-400 font-medium">
                <tr>
                  <th className="p-3.5 pl-5">Provider</th>
                  <th className="p-3.5">Event Type</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Message Details</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 pr-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 text-stone-300">
                {logs.map(log => {
                  const dateStr = new Date(log.processed_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                  });

                  return (
                    <tr key={log.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="p-3.5 pl-5 font-medium text-stone-200">
                        {log.provider.toUpperCase().replace("_", " ")}
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-amber-300/90 text-[11px]">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {log.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-stone-400 max-w-xs truncate">
                        {JSON.stringify(log.payload)}
                      </td>
                      <td className="p-3.5 text-stone-500 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => triggerExplainThis(`Explain incoming notification from service ${log.provider}: event "${log.event_type}" with details: ${JSON.stringify(log.payload)}. Explain guest record impact and recommended staff steps.`, "studio_ops")}
                          className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-sans font-medium transition-colors cursor-pointer"
                          title="Ask Assistant to explain this update in plain English"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Explain</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
