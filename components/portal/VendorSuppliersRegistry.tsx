"use client";

import React, { useState, useEffect } from "react";
import {
  Briefcase,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Globe,
  Tag,
  Heart,
  X,
  Sparkles,
  ArrowUpRight
} from "lucide-react";
import {
  VendorSupplier,
  fetchVendors,
  createVendor,
  syncVendorToTern,
  VendorSupplierCreateRequest
} from "@/lib/sidecar-api";
import { onFormFill, FormFillProposal } from "@/lib/portal-form-bus";

const CATEGORIES = [
  { id: "ALL", label: "All Suppliers" },
  { id: "TRANSPORTATION_CHAUFFEUR", label: "Chauffeur & Tarmac" },
  { id: "AIR_CHARTER", label: "Air & Flight Desk" },
  { id: "ORGANIC_CATERING", label: "Organic Catering" },
  { id: "WELLNESS_SOMATIC", label: "Somatic & Sound" },
  { id: "MEDICAL_EMERGENCY", label: "Medical & Urgent Care" },
  { id: "TOUR_EXCURSION", label: "Sacred Excursions" },
  { id: "LODGING_VILLA", label: "Villas & Lodging" },
];

const SANCTUARIES = [
  { id: "all", label: "All Sanctuaries" },
  { id: "nosara", label: "Nosara, Costa Rica" },
  { id: "amalfi", label: "Amalfi Coast, Italy" },
  { id: "bali", label: "Ubud, Bali" },
  { id: "riviera-maya", label: "Riviera Maya, Mexico" },
];

export default function VendorSuppliersRegistry() {
  const [vendors, setVendors] = useState<VendorSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [activeSanctuary, setActiveSanctuary] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<"manual" | "copilot">("manual");
  const [formData, setFormData] = useState<VendorSupplierCreateRequest>({
    name: "",
    category: "TRANSPORTATION_CHAUFFEUR",
    sanctuary_slug: "nosara",
    contact_name: "",
    email: "",
    phone: "",
    website: "",
    booking_url_or_code: "",
    commission_rate: 10.0,
    commission_type: "PERCENTAGE",
    payment_terms: "Tern Native Client Card Auth",
    lead_time_days: 7,
    preferred_tier: "PREFERRED_PARTNER",
    service_description: "",
    clinical_relevance: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load vendors
  const loadVendors = async () => {
    setLoading(true);
    const data = await fetchVendors(
      activeSanctuary === "all" ? undefined : activeSanctuary,
      activeCategory === "ALL" ? undefined : activeCategory
    );
    setVendors(data);
    setLoading(false);
  };

  useEffect(() => {
    loadVendors();
  }, [activeCategory, activeSanctuary]);

  // Listen to Copilot Form-Fill Event Bus
  useEffect(() => {
    const unsubscribe = onFormFill((proposal: FormFillProposal) => {
      if (proposal.form_type === "vendor_supplier") {
        const fields = proposal.fields || proposal.payload || {};
        setFormData({
          name: (fields.name as string) || "",
          category: (fields.category as string) || "TRANSPORTATION_CHAUFFEUR",
          sanctuary_slug: (fields.sanctuary_slug as string) || "nosara",
          contact_name: (fields.contact_name as string) || "",
          email: (fields.email as string) || "",
          phone: (fields.phone as string) || "",
          website: (fields.website as string) || "",
          booking_url_or_code: (fields.booking_url_or_code as string) || "",
          commission_rate: (fields.commission_rate as number) ?? 10.0,
          commission_type: (fields.commission_type as string) || "PERCENTAGE",
          payment_terms: (fields.payment_terms as string) || "Tern Native Client Card Auth",
          lead_time_days: (fields.lead_time_days as number) ?? 7,
          preferred_tier: (fields.preferred_tier as string) || "PREFERRED_PARTNER",
          service_description: (fields.service_description as string) || "",
          clinical_relevance: (fields.clinical_relevance as string) || ""
        });
        setModalSource("copilot");
        setIsModalOpen(true);
      }
    });
    return unsubscribe;
  }, []);

  const handleSyncTern = async (id: string) => {
    setSyncingId(id);
    const updated = await syncVendorToTern(id);
    if (updated) {
      setVendors(prev => prev.map(v => v.id === id ? updated : v));
      showToast("Synced with Tern Back Office successfully.");
    }
    setSyncingId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.service_description.trim()) {
      alert("Please fill in Supplier Name and Service Description.");
      return;
    }

    setSubmitting(true);
    const res = await createVendor(formData);
    setSubmitting(false);

    if (res) {
      setIsModalOpen(false);
      loadVendors();
      showToast(`Supplier '${res.name}' registered and synced to Tern!`);
    } else {
      alert("Failed to save vendor. Please check backend connection.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredVendors = vendors.filter(v => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      v.category.toLowerCase().includes(q) ||
      v.service_description.toLowerCase().includes(q) ||
      (v.clinical_relevance && v.clinical_relevance.toLowerCase().includes(q)) ||
      (v.contact_name && v.contact_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#1e2922] text-[#f7f5f0] px-5 py-3 rounded-xl shadow-2xl border border-[#c5a880]/40 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#829e86]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#fcfbf9] border border-[#e5dfd5] rounded-2xl p-6 lg:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a880]/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#829e86] font-semibold mb-1">
              <Briefcase className="w-4 h-4" />
              Tern CRM Back Office Integration
            </div>
            <h1 className="text-3xl font-serif text-[#1e2922] tracking-tight">
              Preferred Vendors & Suppliers
            </h1>
            <p className="text-sm text-[#6b6255] max-w-2xl mt-1">
              Centralized supplier contracts, commission structures, and wellness certifications synced directly with 
              <span className="font-semibold text-[#1e2922]"> Tern Back Office → Suppliers</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadVendors}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#d6cfc4] bg-white hover:bg-[#f7f5f0] text-[#423d33] text-sm font-medium transition flex items-center gap-2 shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => {
                setModalSource("manual");
                setIsModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#1e2922] hover:bg-[#2d3b32] text-[#fcfbf9] text-sm font-medium transition flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Register Supplier
            </button>
          </div>
        </div>

        {/* Tern Architecture Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#eee9e0] text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#829e86] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#1e2922] block">Dual-Storage Architecture</span>
              <span className="text-[#6b6255]">Stored locally in SQLite for sub-millisecond Copilot RAG, dual-synced with Tern Cloud.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[#c5a880] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#1e2922] block">10-Min In-Memory TTL Cache</span>
              <span className="text-[#6b6255]">Instant chatbot queries without hitting external rate limits; auto-invalidates on write.</span>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#829e86] shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#1e2922] block">Guest Nervous System Screening</span>
              <span className="text-[#6b6255]">Founder Kareena's rationale ensuring quietude, somatic safety, and frictionless transit.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Sanctuary Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {SANCTUARIES.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSanctuary(s.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                activeSanctuary === s.id
                  ? "bg-[#1e2922] text-[#f7f5f0]"
                  : "bg-white border border-[#e5dfd5] text-[#6b6255] hover:bg-[#f7f5f0]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#9c9384] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search suppliers, contacts, notes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-[#d6cfc4] bg-white text-xs text-[#1e2922] placeholder-[#9c9384] focus:outline-none focus:ring-2 focus:ring-[#829e86]/40"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-[#e5dfd5] flex items-center gap-2 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`pb-3 text-xs font-medium px-2 whitespace-nowrap border-b-2 transition ${
              activeCategory === cat.id
                ? "border-[#1e2922] text-[#1e2922] font-semibold"
                : "border-transparent text-[#6b6255] hover:text-[#1e2922]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Suppliers Grid */}
      {loading ? (
        <div className="py-20 text-center text-[#6b6255] text-sm flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#829e86]" />
          <span>Retrieving preferred suppliers from dual cache...</span>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="bg-white border border-dashed border-[#d6cfc4] rounded-2xl p-12 text-center">
          <Briefcase className="w-10 h-10 text-[#c5a880] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-serif text-[#1e2922]">No suppliers match this filter</h3>
          <p className="text-xs text-[#6b6255] mt-1">Try switching sanctuary or category, or ask Copilot to register a new vendor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVendors.map(vendor => (
            <div
              key={vendor.id}
              className="bg-white border border-[#e5dfd5] rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between relative group"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-[#f4ede4] text-[#8c6b43] mb-1.5">
                      {vendor.category.replace(/_/g, " ")}
                    </span>
                    <h3 className="text-base font-serif text-[#1e2922] font-semibold leading-snug">
                      {vendor.name}
                    </h3>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#e8efe9] text-[#2d5236]">
                      {vendor.preferred_tier.replace(/_/g, " ")}
                    </span>
                    <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                      vendor.tern_sync_status === "SYNCED" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                    }`}>
                      {vendor.tern_sync_status}
                    </span>
                  </div>
                </div>

                {/* Service Description */}
                <p className="text-xs text-[#524b3f] line-clamp-3 leading-relaxed mb-4">
                  {vendor.service_description}
                </p>

                {/* Clinical Relevance Box */}
                {vendor.clinical_relevance && (
                  <div className="bg-[#faf8f5] border border-[#eee6db] rounded-xl p-3 mb-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#829e86] uppercase tracking-wide mb-1">
                      <Heart className="w-3 h-3" />
                      Founder Kareena Rationale
                    </div>
                    <p className="text-[11px] text-[#554e42] leading-normal italic">
                      "{vendor.clinical_relevance}"
                    </p>
                  </div>
                )}

                {/* Contract & Terms Spec Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#fcfbf9] border border-[#f0ece4] rounded-xl p-3 mb-4">
                  <div>
                    <span className="text-[#8c8273] block text-[10px]">Commission</span>
                    <span className="font-semibold text-[#1e2922]">
                      {vendor.commission_rate}% ({vendor.commission_type})
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8c8273] block text-[10px]">Payment Terms</span>
                    <span className="font-semibold text-[#1e2922] truncate block" title={vendor.payment_terms}>
                      {vendor.payment_terms}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8c8273] block text-[10px]">Lead Time</span>
                    <span className="font-semibold text-[#1e2922]">
                      {vendor.lead_time_days > 0 ? `${vendor.lead_time_days} days` : "Immediate / 24-7"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#8c8273] block text-[10px]">Sanctuary</span>
                    <span className="font-semibold text-[#1e2922] capitalize">
                      {vendor.sanctuary_slug}
                    </span>
                  </div>
                </div>

                {/* Contact Coordinates */}
                <div className="space-y-1.5 text-xs text-[#6b6255] mb-4">
                  {vendor.contact_name && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Tag className="w-3 h-3 text-[#9c9384]" />
                      <span>{vendor.contact_name}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Phone className="w-3 h-3 text-[#9c9384]" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Mail className="w-3 h-3 text-[#9c9384]" />
                      <a href={`mailto:${vendor.email}`} className="hover:underline text-[#2d5236]">
                        {vendor.email}
                      </a>
                    </div>
                  )}
                  {vendor.booking_url_or_code && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <Globe className="w-3 h-3 text-[#9c9384]" />
                      <code className="bg-[#f2ece2] px-1.5 py-0.5 rounded text-[10px] text-[#1e2922] font-mono">
                        {vendor.booking_url_or_code}
                      </code>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-[#f0ece4] flex items-center justify-between gap-2">
                <a
                  href={vendor.tern_deep_link || `https://app.tern.travel/back-office/suppliers/${vendor.tern_supplier_id || vendor.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#2d5236] hover:text-[#1e2922] inline-flex items-center gap-1 transition"
                >
                  Open in Tern Back Office
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>

                <button
                  onClick={() => handleSyncTern(vendor.id)}
                  disabled={syncingId === vendor.id}
                  className="text-[11px] text-[#6b6255] hover:text-[#1e2922] p-1.5 rounded-lg hover:bg-[#f5f1eb] transition"
                  title="Re-sync with Tern CRM Cloud"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingId === vendor.id ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#fcfbf9] border border-[#e5dfd5] rounded-3xl max-w-2xl w-full p-6 lg:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#829e86]">
                  Back Office Registration
                </span>
                <h2 className="text-2xl font-serif text-[#1e2922] mt-0.5">
                  Register Preferred Supplier
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-[#eee8df] text-[#6b6255] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Copilot prefill alert if triggered via Chat */}
            {modalSource === "copilot" && (
              <div className="bg-[#eaf2ec] border border-[#c4dcce] rounded-xl p-3 mb-5 flex items-center gap-2.5 text-xs text-[#22442b]">
                <Sparkles className="w-4 h-4 text-[#3c784e] shrink-0" />
                <span>
                  <strong>Founder Proposal Authorized:</strong> Pre-populated from your Copilot conversation. Review and confirm to sync to Tern CRM.
                </span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Supplier / Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                    placeholder="e.g. Pacific Coast Chauffeur"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Tern Supplier Category *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                  >
                    <option value="TRANSPORTATION_CHAUFFEUR">Transportation & Chauffeur</option>
                    <option value="AIR_CHARTER">Air Charter & Flight Desk</option>
                    <option value="ORGANIC_CATERING">Organic Catering & Farm</option>
                    <option value="WELLNESS_SOMATIC">Wellness & Somatic Instruments</option>
                    <option value="MEDICAL_EMERGENCY">Medical & Emergency Care</option>
                    <option value="TOUR_EXCURSION">Tours & Sacred Excursions</option>
                    <option value="LODGING_VILLA">Lodging & Luxury Villas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Sanctuary</label>
                  <select
                    value={formData.sanctuary_slug}
                    onChange={e => setFormData({ ...formData, sanctuary_slug: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                  >
                    <option value="all">All Sanctuaries</option>
                    <option value="nosara">Nosara, Costa Rica</option>
                    <option value="amalfi">Amalfi Coast, Italy</option>
                    <option value="bali">Ubud, Bali</option>
                    <option value="riviera-maya">Riviera Maya, Mexico</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.commission_rate}
                    onChange={e => setFormData({ ...formData, commission_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Commission Type</label>
                  <select
                    value={formData.commission_type}
                    onChange={e => setFormData({ ...formData, commission_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT_FEE">Flat Fee ($)</option>
                    <option value="NET_RATE_WHOLESALE">Net Rate Wholesale</option>
                    <option value="NON_COMMISSIONABLE">Non-Commissionable</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={formData.contact_name || ""}
                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                    placeholder="e.g. Elena Rossi"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={formData.email || ""}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                    placeholder="contact@partner.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone || ""}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                    placeholder="+506-8888-0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Booking Portal / Code</label>
                  <input
                    type="text"
                    value={formData.booking_url_or_code || ""}
                    onChange={e => setFormData({ ...formData, booking_url_or_code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                    placeholder="e.g. VIP-GDS-KAI"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#1e2922] mb-1">Payment Terms</label>
                  <input
                    type="text"
                    value={formData.payment_terms}
                    onChange={e => setFormData({ ...formData, payment_terms: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                    placeholder="Tern Native Client Card Auth"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#1e2922] mb-1">Service & Contract Description *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.service_description}
                  onChange={e => setFormData({ ...formData, service_description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                  placeholder="Detailed breakdown of luxury amenities, vehicle fleet, or organic culinary practices."
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1e2922] mb-1">Founder Kareena Relevance</label>
                <textarea
                  rows={2}
                  value={formData.clinical_relevance || ""}
                  onChange={e => setFormData({ ...formData, clinical_relevance: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#d6cfc4] bg-white text-xs focus:ring-2 focus:ring-[#829e86]/40 outline-none"
                  placeholder="Explain why this partner supports deep rest, peaceful quietude, or guest privacy."
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-[#eee9e0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#d6cfc4] text-[#6b6255] hover:bg-[#f7f5f0] font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-xl bg-[#1e2922] hover:bg-[#2d3b32] text-[#fcfbf9] font-medium transition flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Approve & Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
