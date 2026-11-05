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
  "VIP_RETREAT",
  "CORTISOL_RESET",
  "VAGAL_DYSREGULATION",
  "LIE_FLAT_AIR",
  "BLUE_ZONE_DIET",
  "PRENATAL_CARE",
  "ANAPHYLACTIC_ALERT",
  "ORTHOPEDIC_SENSITIVE",
  "GULFSTREAM_CHARTER",
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

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setSelectedTags(["VIP_RETREAT", "CORTISOL_RESET"]);
      setCustomTagInput("");
      setNotes("");
      setEmgName("");
      setEmgRelation("");
      setEmgPhone("");
      setEmgEmail("");
    }
    setErrorMsg(null);
  }, [clientToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && customTagInput.trim()) {
      e.preventDefault();
      const formatted = customTagInput.trim().toUpperCase().replace(/\s+/g, "_");
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
        onSuccess(`Updated 360° dossier for ${fullName.trim()}.`);
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
          `Created native CRM dossier for ${res.client.full_name} (${res.client.crm_contact_id}).`
        );
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save client dossier");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#FAF7F2] text-[#2D3E35] w-full max-w-3xl rounded-2xl border border-[#E5DDD0] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-lg bg-[#2D3E35] text-[#FAF7F2]">
              <User className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-serif text-lg font-bold text-[#2D3E35]">
                {isEditing ? `Edit Guest Profile: ${clientToEdit?.full_name}` : "Create Guest Profile & Notes"}
              </h2>
              <p className="text-xs text-[#5C6B5E]">
                Guest contact profile with retreat preferences, dietary needs &amp; nurse intake notes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#F2ECE4] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Identity */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <User className="w-4 h-4 text-[#C07D63]" />
              <span>Guest Identity &amp; Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Victoria Sterling"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] disabled:opacity-60 focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Passport & Travel Documents */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <FileText className="w-4 h-4 text-blue-700" />
              <span>International Passport &amp; Validity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Passport Number
                </label>
                <input
                  type="text"
                  value={passportNumber}
                  onChange={(e) => setPassportNumber(e.target.value)}
                  placeholder="e.g. C10948271"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-mono focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
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
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Clinical, Somatic & Dietary Intake */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <HeartPulse className="w-4 h-4 text-rose-600" />
              <span>Somatic, Clinical &amp; Dietary Architecture</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Dietary Requirements &amp; Food Allergies (Audited for Kitchen Manifest)
                </label>
                <input
                  type="text"
                  value={dietaryRequirements}
                  onChange={(e) => setDietaryRequirements(e.target.value)}
                  placeholder="e.g. Strict Celiac Gluten-Free, Tree Nut Allergy (carry EpiPen), Organic Pescatarian"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                  Clinical &amp; Somatic Notes (Nurse Review)
                </label>
                <textarea
                  value={healthNotes}
                  onChange={(e) => setHealthNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Elevated evening cortisol; cervical disc sensitivity; responds well to slow evening sound baths."
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">
                    Movement &amp; Reformer Experience
                  </label>
                  <select
                    value={movementExperience}
                    onChange={(e) => setMovementExperience(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none"
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
                    placeholder="e.g. Nervous system reset & restorative sleep realignment"
                    className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] focus:outline-none"
                  >
                  </input>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Tags & Classification */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <Tag className="w-4 h-4 text-emerald-700" />
              <span>CRM Classification &amp; Behavioral Tags</span>
            </div>

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
                    {isSelected ? `✓ ${tag}` : `+ ${tag}`}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Type custom tag and press Enter..."
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35] font-mono placeholder:font-sans focus:outline-none"
              />
            </div>
          </div>

          {/* Section 5: Emergency Contact */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
              <Shield className="w-4 h-4 text-amber-700" />
              <span>Emergency Contact &amp; Next of Kin</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">Name</label>
                <input
                  type="text"
                  value={emgName}
                  onChange={(e) => setEmgName(e.target.value)}
                  placeholder="e.g. Julian Sterling"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">Relationship</label>
                <input
                  type="text"
                  value={emgRelation}
                  onChange={(e) => setEmgRelation(e.target.value)}
                  placeholder="e.g. Spouse / Sibling"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5C6B5E] mb-1">Phone</label>
                <input
                  type="tel"
                  value={emgPhone}
                  onChange={(e) => setEmgPhone(e.target.value)}
                  placeholder="e.g. +1-415-555-0199"
                  className="w-full px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DDD0] text-[#2D3E35]"
                />
              </div>
            </div>
          </div>

          {/* Section 6: Internal Advisor Notes */}
          <div className="bg-white p-4 rounded-xl border border-[#E5DDD0] space-y-2">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2D3E35]">
              Private Advisor Notes (Internal Staff Only)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Private preferences, champagne vintage preference, flight seating nuances..."
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
                <span>Writing to WAL...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isEditing ? "Save Dossier Changes" : "Create Client Dossier"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

