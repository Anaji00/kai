"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  MapPin,
  Building2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Edit3,
  Check,
} from "lucide-react";
import {
  fetchStagedLeads,
  triggerLeadDiscovery,
  approveStagedLead,
  updateStagedLead,
  StagedLead,
} from "@/lib/sidecar-api";

export default function LeadsQueuePage() {
  const [leads, setLeads] = useState<StagedLead[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedCity, setSelectedCity] = useState<string>("Houston");
  const [selectedCategory, setSelectedCategory] = useState<string>("reformer_pilates");

  const [discovering, setDiscovering] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editedThesis, setEditedThesis] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const loadLeads = async () => {
    setLoading(true);
    try {
      const data = await fetchStagedLeads(statusFilter);
      setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const fetchLeads = async () => {
      try {
        const data = await fetchStagedLeads(statusFilter);
        if (active) {
          setLeads(data);
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        if (active) setLoading(false);
      }
    };
    fetchLeads();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const handleTriggerDiscovery = async () => {
    setDiscovering(true);
    try {
      await triggerLeadDiscovery(selectedCity, selectedCategory, 4);
      await loadLeads();
    } catch (e) {
      console.error(e);
      alert("Failed to run discovery worker");
    } finally {
      setDiscovering(false);
    }
  };

  const handleApproveLead = async (leadId: string) => {
    setApprovingId(leadId);
    try {
      const updated = await approveStagedLead(leadId, "Kareena Islam");
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
    } catch (e) {
      console.error(e);
      alert("Failed to approve lead");
    } finally {
      setApprovingId(null);
    }
  };

  const handleSaveThesis = async (leadId: string) => {
    try {
      const updated = await updateStagedLead(leadId, { outreach_thesis: editedThesis });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? updated : l)));
      setEditingLeadId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update thesis");
    }
  };

  const feederCities = [
    { city: "Houston", state: "TX", label: "Houston (River Oaks / Montrose)" },
    { city: "Austin", state: "TX", label: "Austin (South Congress / Clarksville)" },
    { city: "Dallas", state: "TX", label: "Dallas (Preston Hollow / Highland Park)" },
    { city: "New York", state: "NY", label: "New York (SoHo / Tribeca)" },
    { city: "Chicago", state: "IL", label: "Chicago (Gold Coast / Lincoln Park)" },
    { city: "Los Angeles", state: "CA", label: "Los Angeles (Brentwood / Santa Monica)" },
  ];

  const modalities = [
    { id: "reformer_pilates", label: "Reformer Pilates & Somatics" },
    { id: "practitioner", label: "Sound (432Hz) & Breathwork" },
    { id: "clinic", label: "Longevity & Cellular Clinics" },
    { id: "corporate", label: "Executive Leadership Circles" },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Worker Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#2D3E35] tracking-tight">
            Partner Wellness Studios &amp; Practices
          </h1>
          <p className="text-sm text-[#5C6B5E] mt-1">
            Discover, curate, and invite premier holistic studios to refer private guests to KAI retreats.
          </p>
        </div>

        <button
          onClick={loadLeads}
          disabled={loading}
          className="self-start md:self-auto inline-flex items-center space-x-2 px-3 py-1.5 text-xs font-semibold text-[#2D3E35] bg-[#F2ECE4] hover:bg-[#EBE3D8] border border-[#E5DDD0] rounded-md transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Partners</span>
        </button>
      </div>

      {/* Discovery Worker Control Box */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5DDD0]/70 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[#C07D63]" />
            <span className="font-serif text-base font-bold text-[#2D3E35]">
              Studio Discovery Finder (Personalized Founder Approval)
            </span>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Awaiting Founder Review
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">
              Metropolitan Feeder Market
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
            >
              {feederCities.map((fc) => (
                <option key={fc.city} value={fc.city}>
                  {fc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5C6B5E] mb-1">
              Practice Focus / Partner Specialization
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
            >
              {modalities.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleTriggerDiscovery}
              disabled={discovering}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-lg transition-all shadow-sm"
            >
              <Sparkles className={`w-3.5 h-3.5 text-[#C07D63] ${discovering ? "animate-spin" : ""}`} />
              <span>{discovering ? "Discovering Studios..." : "Run Studio Discovery Worker"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold text-[#5C6B5E] uppercase tracking-wider">
          Filter Status:
        </span>
        {["ALL", "PENDING_APPROVAL", "APPROVED"].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              statusFilter === st
                ? "bg-[#2D3E35] text-[#FAF7F2]"
                : "text-[#5C6B5E] hover:bg-[#F2ECE4]"
            }`}
          >
            {st === "ALL" ? "All Targets" : st.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Leads Grid */}
      {leads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#E5DDD0] shadow-sm">
          <Building2 className="w-8 h-8 text-[#5C6B5E] mx-auto mb-2 opacity-60" />
          <div className="text-sm font-semibold text-[#2D3E35]">No partner leads in queue</div>
          <p className="text-xs text-[#5C6B5E] mt-1">
            Click &quot;Run Studio Discovery Worker&quot; above to scan metropolitan feeder markets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {leads.map((lead) => {
            const isPending = lead.status === "PENDING_APPROVAL";
            const isApproved = lead.status === "APPROVED";
            const isEditing = editingLeadId === lead.id;

            return (
              <div
                key={lead.id}
                className={`bg-white rounded-xl border transition-all p-5 space-y-4 shadow-sm ${
                  isPending
                    ? "border-[#E5DDD0] hover:border-[#C07D63]"
                    : "border-emerald-200 bg-emerald-50/10"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-[#2D3E35]">
                      {lead.business_name}
                    </h3>
                    <div className="flex items-center space-x-2 text-xs text-[#5C6B5E] mt-0.5">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-[#C07D63]" />
                        <span>{lead.location || "Metropolitan"}</span>
                      </span>
                      <span>&middot;</span>
                      <span className="capitalize font-medium text-[#2D3E35]">
                        {(lead.category || "studio").replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                      isPending
                        ? "bg-amber-100 text-amber-900 border border-amber-200"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                    }`}
                  >
                    {isPending ? (
                      <>
                        <Clock className="w-3 h-3 text-amber-700" />
                        <span>PENDING APPROVAL</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        <span>APPROVED</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Contact metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#5C6B5E] bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E5DDD0]">
                  {lead.contact_name && (
                    <span>
                      <strong className="text-[#2D3E35]">Contact:</strong> {lead.contact_name}
                    </span>
                  )}
                  {lead.email && (
                    <span>
                      <strong className="text-[#2D3E35]">Email:</strong> {lead.email}
                    </span>
                  )}
                  {lead.phone && (
                    <span>
                      <strong className="text-[#2D3E35]">Phone:</strong> {lead.phone}
                    </span>
                  )}
                  {lead.website && (
                    <span>
                      <strong className="text-[#2D3E35]">Web:</strong>{" "}
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#C07D63] hover:underline"
                      >
                        {lead.website.replace("https://", "")}
                      </a>
                    </span>
                  )}
                </div>

                {/* Collaboration Thesis */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#5C6B5E] uppercase tracking-wider">
                      Tailored Partnership Plan &amp; Talking Points:
                    </span>
                    {!isEditing && isPending && (
                      <button
                        onClick={() => {
                          setEditingLeadId(lead.id);
                          setEditedThesis(lead.outreach_thesis || "");
                        }}
                        className="inline-flex items-center space-x-1 text-xs text-[#5C6B5E] hover:text-[#2D3E35]"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Partnership Plan</span>
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        rows={4}
                        value={editedThesis}
                        onChange={(e) => setEditedThesis(e.target.value)}
                        className="w-full text-xs font-sans bg-[#FAF7F2] border border-[#2D3E35] rounded-lg p-2.5 text-[#2D3E35] focus:outline-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingLeadId(null)}
                          className="px-2.5 py-1 text-xs text-[#5C6B5E] hover:text-[#2D3E35]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveThesis(lead.id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-[#2D3E35] rounded"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[#2D3E35] bg-[#FAF7F2]/60 p-3 rounded-lg border border-[#E5DDD0] leading-relaxed">
                      {lead.outreach_thesis || "No partnership plan formulated."}
                    </p>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-2 border-t border-[#E5DDD0]/70 flex items-center justify-between">
                  <span className="text-[11px] text-[#5C6B5E]">
                    {isApproved && lead.reviewed_by ? `Approved by ${lead.reviewed_by}` : "1-Click approval"}
                  </span>

                  {isPending ? (
                    <button
                      onClick={() => handleApproveLead(lead.id)}
                      disabled={approvingId === lead.id}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#2D3E35] hover:bg-[#1F2C25] rounded-md transition-all shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{approvingId === lead.id ? "Approving..." : "Approve & Authorize Outreach"}</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center space-x-1 text-xs text-emerald-800 font-semibold bg-emerald-100 px-2.5 py-1 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Authorized for Co-Hosting</span>
                    </span>
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
