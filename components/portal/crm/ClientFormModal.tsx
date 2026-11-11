"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  FileText,
  Shield,
  HeartPulse,
  Tag,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import {
  CRMClientItem,
  CRMClientCreatePayload,
  createCrmClient,
  updateCrmClient,
} from "@/lib/sidecar-api";

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  clientToEdit?: CRMClientItem | null;
}

const COMMON_TAGS = [
  "VIP Guest",
  "Private Villa",
  "Gluten-Free",
  "Seed-Oil-Free",
  "Chauffeur Pickup",
  "First-Time Guest",
];

const DIETARY_QUICK_PRESETS = [
  "Gluten-Free",
  "Seed-Oil-Free",
  "Vegan",
  "Pescatarian",
  "Nut-Free",
  "Dairy-Free",
];

export default function ClientFormModal({
  isOpen,
  onClose,
  onSuccess,
  clientToEdit,
}: ClientFormModalProps) {
  const isEditing = Boolean(clientToEdit);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [passportCountry, setPassportCountry] = useState("USA");
  const [passportExpiry, setPassportExpiry] = useState("");
  const [dietaryRequirements, setDietaryRequirements] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [movementExperience, setMovementExperience] = useState("Reformer Intermediate");
  const [intentions, setIntentions] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [notes, setNotes] = useState("");

  // Emergency contact
  const [emgName, setEmgName] = useState("");
  const [emgRelation, setEmgRelation] = useState("");
  const [emgPhone, setEmgPhone] = useState("");
  const [emgEmail, setEmgEmail] = useState("");

  // Collapsible progressive disclosure sections
  const [showPassportSection, setShowPassportSection] = useState(false);
  const [showEmergencySection, setShowEmergencySection] = useState(false);
  const [showMovementSection, setShowMovementSection] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (clientToEdit) {
      setFullName(clientToEdit.full_name || "");
      setEmail(clientToEdit.email || "");
      setPhone(clientToEdit.phone || "");
      setDietaryRequirements(clientToEdit.dietary_requirements || "");
      setHealthNotes(clientToEdit.health_notes || "");
      setMovementExperience(clientToEdit.movement_experience || "Reformer Intermediate");
      setIntentions(clientToEdit.intentions || "");
      setSelectedTags(clientToEdit.tags || []);
      setNotes((clientToEdit as any).notes || "");

      // Auto-open sections if data exists
      if ((clientToEdit as any).passport_number || clientToEdit.passport_valid_6mo) setShowPassportSection(true);
      if ((clientToEdit as any).emergency_contact) setShowEmergencySection(true);
      if (clientToEdit.movement_experience || clientToEdit.intentions) setShowMovementSection(true);
    } else {
      setFullName("");
      setEmail("");
      setPhone("");
      setDateOfBirth("");
      setPassportNumber("");
      setPassportCountry("USA");
      setPassportExpiry("");
      setDietaryRequirements("");
      setHealthNotes("");
      setMovementExperience("Reformer Intermediate");
      setIntentions("");
      setSelectedTags(["VIP Guest"]);
      setCustomTagInput("");
      setNotes("");
      setEmgName("");
      setEmgRelation("");
      setEmgPhone("");
      setEmgEmail("");
      setShowPassportSection(false);
      setShowEmergencySection(false);
      setShowMovementSection(false);
    }
    setErrorMsg(null);
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleToggleDietaryPreset = (preset: string) => {
    const parts = dietaryRequirements
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const exists = parts.some((p) => p.toLowerCase() === preset.toLowerCase());
    let next: string;
    if (exists) {
      next = parts.filter((p) => p.toLowerCase() !== preset.toLowerCase()).join(", ");
    } else {
      next = parts.length > 0 ? `${parts.join(", ")}, ${preset}` : preset;
    }
    setDietaryRequirements(next);
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault();
      const formatted = customTagInput.trim();
      if (!selectedTags.includes(formatted)) {
        setSelectedTags([...selectedTags, formatted]);
      }
      setCustomTagInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setErrorMsg("Full name and email are required fields.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      if (isEditing && clientToEdit) {
        await updateCrmClient(clientToEdit.id, {
          full_name: fullName.trim(),
          phone: phone.trim() || undefined,
          dietary_requirements: dietaryRequirements.trim() || undefined,
          health_notes: healthNotes.trim() || undefined,
          movement_experience: movementExperience,
          intentions: intentions.trim() || undefined,
          tags: selectedTags,
          notes: notes.trim() || undefined,
          passport_number: passportNumber.trim() || undefined,
          passport_issuing_country: passportCountry.trim() || undefined,
          passport_expiry: passportExpiry.trim() || undefined,
        });
        onSuccess(`Saved profile changes for ${fullName.trim()}.`);
      } else {
        const payload: CRMClientCreatePayload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          date_of_birth: dateOfBirth.trim() || undefined,
          passport_number: passportNumber.trim() || undefined,
          passport_issuing_country: passportCountry.trim() || undefined,
          passport_expiry: passportExpiry.trim() || undefined,
          dietary_requirements: dietaryRequirements.trim() || undefined,
          health_notes: healthNotes.trim() || undefined,
          movement_experience: movementExperience,
          intentions: intentions.trim() || undefined,
          tags: selectedTags,
          notes: notes.trim() || undefined,
          emergency_contact: emgName.trim()
            ? {
                name: emgName.trim(),
                relationship: emgRelation.trim() || "Spouse / Partner",
                phone: emgPhone.trim() || undefined,
                email: emgEmail.trim() || undefined,
              }
            : undefined,
        };
        const res = await createCrmClient(payload);
        onSuccess(
          `Saved guest profile for ${res.client.full_name}.`
        );
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save guest profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
    >
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-2xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
                {isEditing ? `Edit Guest: ${clientToEdit?.full_name}` : "Add New Guest Profile"}
              </h2>
              <p className="text-xs text-[#5C6B5E]">
                Essential contact details, dietary requirements, and sanctuary preferences
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Identity (Essential) */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <User className="w-4 h-4 text-[#C07D63]" />
              <span>1. Contact &amp; Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Victoria Sterling"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={isEditing}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. victoria.sterling@example.com"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] disabled:opacity-60 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Mobile Phone (WhatsApp Verified)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1-415-555-0192"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dietary, Allergies & Preferences (Essential) */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-3.5">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <HeartPulse className="w-4 h-4 text-[#C07D63]" />
              <span>2. Dietary &amp; Chef Protocols</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Dietary Requirements &amp; Food Allergies
                </label>
                <input
                  type="text"
                  value={dietaryRequirements}
                  onChange={(e) => setDietaryRequirements(e.target.value)}
                  placeholder="e.g. Gluten-Free, Seed-Oil-Free, Organic Pescatarian"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-[#5C6B5E] font-medium mr-1">1-Click Quick Add:</span>
                  {DIETARY_QUICK_PRESETS.map((preset) => {
                    const active = dietaryRequirements.toLowerCase().includes(preset.toLowerCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleToggleDietaryPreset(preset)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                          active
                            ? "bg-[#2D3E35] text-[#FAF7F2] font-bold"
                            : "bg-[#F2ECE4] text-[#5C6B5E] hover:bg-[#EBE3D8]"
                        }`}
                      >
                        {active ? preset : `+ ${preset}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Hospitality &amp; Villa Notes
                </label>
                <textarea
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Quiet villa preference, morning sound bath, lavender aromatherapy."
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Tags &amp; Badges
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#2D3E35] text-[#FAF7F2] font-bold"
                            : "bg-[#FAF7F2] text-[#5C6B5E] hover:bg-[#F2ECE4] border border-[#E5DDD0]"
                        }`}
                      >
                        {isSelected ? tag : `+ ${tag}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Passport & Travel Documents (Collapsible Progressive Disclosure) */}
          <div className="bg-white rounded-xl border border-[#E5DDD0] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowPassportSection(!showPassportSection)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#FAF7F2] transition cursor-pointer"
            >
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                <FileText className="w-4 h-4 text-blue-700" />
                <span>Passport &amp; Travel Documents</span>
                {passportNumber && (
                  <span className="text-[10px] font-mono lowercase bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200">
                    {passportCountry} · {passportNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#5C6B5E]">
                <span className="text-[11px] font-semibold">
                  {showPassportSection ? "Hide" : passportNumber ? "View" : "+ Add"}
                </span>
                {showPassportSection ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {showPassportSection && (
              <div className="p-4 pt-0 border-t border-[#E5DDD0]/60 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    placeholder="e.g. C10948271"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-mono focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Issuing Country
                  </label>
                  <input
                    type="text"
                    value={passportCountry}
                    onChange={(e) => setPassportCountry(e.target.value)}
                    placeholder="USA, GBR, CAN, CHE"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Passport Expiry Date
                  </label>
                  <input
                    type="date"
                    value={passportExpiry}
                    onChange={(e) => setPassportExpiry(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Emergency Contact (Collapsible Progressive Disclosure) */}
          <div className="bg-white rounded-xl border border-[#E5DDD0] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowEmergencySection(!showEmergencySection)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#FAF7F2] transition cursor-pointer"
            >
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                <Shield className="w-4 h-4 text-amber-700" />
                <span>Emergency Contact &amp; Next of Kin</span>
                {emgName && (
                  <span className="text-[10px] font-normal bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                    {emgName} ({emgRelation || "Spouse"})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#5C6B5E]">
                <span className="text-[11px] font-semibold">
                  {showEmergencySection ? "Hide" : emgName ? "View" : "+ Add"}
                </span>
                {showEmergencySection ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {showEmergencySection && (
              <div className="p-4 pt-0 border-t border-[#E5DDD0]/60 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={emgName}
                    onChange={(e) => setEmgName(e.target.value)}
                    placeholder="e.g. Julian Sterling"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={emgRelation}
                    onChange={(e) => setEmgRelation(e.target.value)}
                    placeholder="e.g. Spouse / Sibling"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Emergency Phone
                  </label>
                  <input
                    type="tel"
                    value={emgPhone}
                    onChange={(e) => setEmgPhone(e.target.value)}
                    placeholder="e.g. +1-415-555-0199"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Movement & Reformer Experience (Collapsible Progressive Disclosure) */}
          <div className="bg-white rounded-xl border border-[#E5DDD0] overflow-hidden">
            <button
              type="button"
              onClick={() => setShowMovementSection(!showMovementSection)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-[#FAF7F2] transition cursor-pointer"
            >
              <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Movement Experience &amp; Intention</span>
                {intentions && (
                  <span className="text-[10px] font-normal truncate max-w-[150px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                    {intentions}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[#5C6B5E]">
                <span className="text-[11px] font-semibold">
                  {showMovementSection ? "Hide" : intentions ? "View" : "+ Add"}
                </span>
                {showMovementSection ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {showMovementSection && (
              <div className="p-4 pt-0 border-t border-[#E5DDD0]/60 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Movement &amp; Reformer Experience
                  </label>
                  <select
                    value={movementExperience}
                    onChange={(e) => setMovementExperience(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="Beginner Somatic">Beginner Somatic</option>
                    <option value="Reformer Intermediate">Reformer Intermediate (1-3 yrs)</option>
                    <option value="Advanced Classical Reformer">Advanced Classical Reformer</option>
                    <option value="Restorative Only">Restorative &amp; Gentle Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Primary Sanctuary Intention
                  </label>
                  <input
                    type="text"
                    value={intentions}
                    onChange={(e) => setIntentions(e.target.value)}
                    placeholder="e.g. Nervous system reset & restorative sleep"
                    className="w-full px-3 py-1.5 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Internal Host Notes */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D3E35]">
              Private Host Notes (Internal Staff Only)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Private preferences, champagne vintage preference, room nuances..."
              className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#E5DDD0]">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-[#5C6B5E] hover:text-[#2D3E35] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#2D3E35] hover:bg-[#1f2c25] text-[#FAF7F2] text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
            >
              {saving ? (
                <span>Saving Guest Profile...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isEditing ? "Save Guest Profile" : "Save New Guest"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

