"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Bell,
  Clock,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import {
  fetchSmsQueue,
  stageOperationalAlert,
  stageBroadcastCampaign,
  dispatchSms,
  SmsDispatch,
} from "@/lib/sidecar-api";

export default function CampaignsPage() {
  const [dispatches, setDispatches] = useState<SmsDispatch[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  // Broadcast Composer State
  const [campaignName, setCampaignName] = useState("Nosara Waitlist Drop");
  const [targetSegment, setTargetSegment] = useState("waitlist_nosara");
  const [sanctuarySlug, setSanctuarySlug] = useState("nosara");
  const [messageBody, setMessageBody] = useState(
    "KAI Private Circle: Hello {name}, a private villa spot has just opened for {sanctuary}. Reply YES to reserve priority review with Kareena."
  );

  const [stagingBroadcast, setStagingBroadcast] = useState(false);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await fetchSmsQueue(filterStatus, filterType);
      setDispatches(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchQueue = async () => {
      try {
        const data = await fetchSmsQueue(filterStatus, filterType);
        if (active) {
          setDispatches(data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (active) setLoading(false);
      }
    };
    fetchQueue();
    return () => {
      active = false;
    };
  }, [filterStatus, filterType]);

  const handleStageBroadcast = async () => {
    setStagingBroadcast(true);
    try {
      await stageBroadcastCampaign(campaignName, targetSegment, messageBody, sanctuarySlug);
      await loadQueue();
      alert("Broadcast campaign successfully staged into PENDING_APPROVAL queue!");
    } catch (e) {
      console.error(e);
      alert("Failed to stage campaign");
    } finally {
      setStagingBroadcast(false);
    }
  };

  const handleDispatch = async (smsId: string) => {
    setDispatchingId(smsId);
    try {
      const res = await dispatchSms(smsId, "Kareena Islam");
      setDispatchSuccessMsg(res.message);
      setTimeout(() => setDispatchSuccessMsg(null), 4000);
      await loadQueue();
    } catch (e: unknown) {
      console.error(e);
      alert(`Dispatch failed: ${(e as Error).message || "Unknown carrier error"}`);
    } finally {
      setDispatchingId(null);
    }
  };

  const handleQuickAlert = async (type: "burnout" | "flight" | "cap") => {
    const alerts = {
      burnout: {
        name: "Kareena Islam",
        phone: "+17135550199",
        msg: "KAI Alert: High-stress corporate group application received for Nosara. Pre-call consultation guide ready in portal.",
      },
      flight: {
        name: "Grand Travel Flight Desk",
        phone: "+17135550199",
        msg: "Grand Travel VIP Air Desk: Lie-flat first class flight routing requested from Chicago (ORD) -> Naples (NAP).",
      },
      cap: {
        name: "Kareena Islam",
        phone: "+17135550199",
        msg: "Sanctuary Capacity Warning: Nosara Blue Zone group has reached 12/14 guests. Maximum group limit is 14.",
      },
    };

    const target = alerts[type];
    try {
      await stageOperationalAlert(target.phone, target.name, target.msg);
      await loadQueue();
    } catch (e) {
      console.error(e);
    }
  };

  const pendingCount = dispatches.filter((d) => d.status === "PENDING_APPROVAL").length;
  const dispatchedCount = dispatches.filter((d) => d.status === "DISPATCHED").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
            SMS Alerts & Campaign Broadcast Staging Hub
          </h1>
          <p className="text-sm text-[#5C6B5E] mt-1">
            MANDATORY ZERO AUTONOMOUS DISPATCH: Every notification and SMS campaign terminates in staging for 1-click authorization.
          </p>
        </div>

        <button
          onClick={loadQueue}
          disabled={loading}
          className="self-start md:self-auto inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Success alert message */}
      {dispatchSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-semibold">{dispatchSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDispatchSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Top Grid: Campaign Composer & Operational Alerts Stager */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Broadcast Campaign Composer */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DDD0]/70 pb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#C07D63]" />
              <h2 className="font-serif text-base font-bold text-[#2D3E35]">
                SMS Broadcast Campaign Composer
              </h2>
            </div>
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center space-x-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Stages to PENDING_APPROVAL</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">
                Campaign Name
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
                placeholder="e.g. Nosara Waitlist Drop"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">
                Target Audience Segment
              </label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
              >
                <option value="waitlist_nosara">Nosara Waitlist (High Intent)</option>
                <option value="alumni_circle">Returning Guests Circle (Priority Access)</option>
                <option value="pre_departure_cohort">Confirmed Retreat Guests (Pre-Departure 4-7-8 Breathwork)</option>
                <option value="corporate_feeder">Corporate Executive Network</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">
                Sanctuary Context
              </label>
              <select
                value={sanctuarySlug}
                onChange={(e) => setSanctuarySlug(e.target.value)}
                className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
              >
                <option value="nosara">Nosara Costa Rica Blue Zone</option>
                <option value="amalfi">Amalfi Coast Cliffside Stillness</option>
                <option value="bali">Bali Sacred Water & Jungle</option>
                <option value="riviera-maya">Riviera Maya Coastal Grounding</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#5C6B5E]">Message Template</label>
              <span className="text-[10px] text-[#5C6B5E] font-mono">
                Variables: &#123;name&#125;, &#123;sanctuary&#125;
              </span>
            </div>
            <textarea
              rows={3}
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              className="w-full text-xs font-sans bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-3 text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-[#5C6B5E]">
              Generates personalized individual drafts for segment review without firing carrier API.
            </div>
            <button
              onClick={handleStageBroadcast}
              disabled={stagingBroadcast}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{stagingBroadcast ? "Drafting Segment..." : "Stage Broadcast Campaign"}</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Quick Operational Alerts Stager */}
        <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 border-b border-[#E5DDD0]/70 pb-3">
            <Bell className="w-4 h-4 text-[#C07D63]" />
            <h2 className="font-serif text-base font-bold text-[#2D3E35]">
              Quick Operational Pings
            </h2>
          </div>

          <p className="text-xs text-[#5C6B5E] leading-relaxed">
            Quick-trigger test notifications for founder and flight desk logistics:
          </p>

          <div className="space-y-2">
            <button
              onClick={() => handleQuickAlert("burnout")}
              className="w-full text-left p-2.5 rounded-lg border border-[#E5DDD0] hover:bg-[#FAF7F2] transition-colors text-xs space-y-0.5"
            >
              <div className="font-semibold text-[#2D3E35]">🚨 High Burnout Alert</div>
              <div className="text-[11px] text-[#5C6B5E]">Ping Kareena on urgent corporate intake</div>
            </button>

            <button
              onClick={() => handleQuickAlert("flight")}
              className="w-full text-left p-2.5 rounded-lg border border-[#E5DDD0] hover:bg-[#FAF7F2] transition-colors text-xs space-y-0.5"
            >
              <div className="font-semibold text-[#2D3E35]">✈️ Grand Travel Lie-Flat Alert</div>
              <div className="text-[11px] text-[#5C6B5E]">Stage VIP business flight desk routing</div>
            </button>

            <button
              onClick={() => handleQuickAlert("cap")}
              className="w-full text-left p-2.5 rounded-lg border border-[#E5DDD0] hover:bg-[#FAF7F2] transition-colors text-xs space-y-0.5"
            >
              <div className="font-semibold text-[#2D3E35]">⚠️ Group Size Warning (&gt;=12 Guests)</div>
              <div className="text-[11px] text-[#5C6B5E]">Alert when retreat group approaches 14 limit</div>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs for Queue */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-[#E5DDD0]">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider">
            Status:
          </span>
          {[
            { id: "ALL", label: `All (${dispatches.length})` },
            { id: "PENDING_APPROVAL", label: `Pending (${pendingCount})` },
            { id: "DISPATCHED", label: `Dispatched (${dispatchedCount})` },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                filterStatus === st.id
                  ? "bg-[#2D3E35] text-[#FAF7F2]"
                  : "text-[#5C6B5E] hover:bg-[#F2ECE4]"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-[#5C6B5E]">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-md px-2.5 py-1 text-[#2D3E35] focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="OPERATIONAL_ALERT">Operational Alerts</option>
            <option value="CAMPAIGN_BROADCAST">Campaign Broadcasts</option>
          </select>
        </div>
      </div>

      {/* Staged Messages Queue List */}
      {dispatches.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-sm">
          <MessageSquare className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-60" />
          <div className="text-sm font-semibold text-[#2D3E35]">SMS queue is clear</div>
          <p className="text-xs text-[#5C6B5E] mt-1">
            Stage an operational ping or compose a broadcast campaign above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dispatches.map((sms) => {
            const isPending = sms.status === "PENDING_APPROVAL";
            const isDispatched = sms.status === "DISPATCHED";

            return (
              <div
                key={sms.id}
                className={`p-4 rounded-xl border transition-all bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPending
                    ? "border-[#E5DDD0] hover:border-[#C07D63]"
                    : "border-emerald-200 bg-emerald-50/20"
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-[#2D3E35]">
                      {sms.recipient_name || "Operator"}
                    </span>
                    <span className="text-xs text-[#5C6B5E] font-mono">{sms.recipient_phone}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#F2ECE4] text-[#5C6B5E]">
                      {sms.dispatch_type.replace(/_/g, " ")}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                        isPending
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}
                    >
                      {isPending ? (
                        <>
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>PENDING DISPATCH</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                          <span>DISPATCHED</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="text-xs text-[#2D3E35] font-sans bg-[#FAF7F2]/60 p-2.5 rounded-lg border border-[#E5DDD0]/70 leading-relaxed">
                    &ldquo;{sms.message_body}&rdquo;
                  </p>

                  <div className="text-[10px] text-[#5C6B5E] flex items-center space-x-3">
                    <span>Staged: {new Date(sms.created_at).toLocaleString()}</span>
                    {isDispatched && sms.dispatched_at && (
                      <span className="text-emerald-800 font-semibold">
                        Dispatched: {new Date(sms.dispatched_at).toLocaleTimeString()} by{" "}
                        {sms.authorized_by || "Operator"}
                      </span>
                    )}
                  </div>
                </div>

                {/* 1-Click Dispatch Action */}
                <div className="flex items-center space-x-2 shrink-0">
                  {isPending ? (
                    <button
                      onClick={() => handleDispatch(sms.id)}
                      disabled={dispatchingId === sms.id}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{dispatchingId === sms.id ? "Sending..." : "1-Click Approve & Dispatch"}</span>
                    </button>
                  ) : (
                    <div className="text-right">
                      <span className="text-xs text-emerald-800 font-semibold bg-emerald-100 px-3 py-1.5 rounded-md flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Carrier Dispatched</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
