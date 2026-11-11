"use client";

import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from "react";
import {
  Plus,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Printer,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  Utensils,
  Plane,
  Sparkles,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  FileText,
  Eye,
  ShieldCheck,
  Compass,
} from "lucide-react";
import {
  CRMClientItem,
  CRMTripItem,
  executeCopilotCrmAction,
  automateCrmTripOutreach,
} from "@/lib/sidecar-api";
import { printCohortManifest, printGuestClinicalDossier } from "@/lib/print-export";

export interface AttendeeRow {
  id: string;
  clientId?: string;
  tripId?: string;
  crmTripId?: string;
  name: string;
  email: string;
  phone: string;
  sanctuarySlug: string;
  sanctuaryName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomTier: string;
  roomNumber: string;
  assignedHost: string;
  groupCategory: "confirmed" | "in_review" | "waitlist";
  bookingStatus: "Confirmed" | "Deposit Paid" | "In Review" | "Waitlist" | "Completed";
  totalPrice: number;
  amountPaid: number;
  balanceDue: number;
  flightStatus: "Flight Booked & Chauffeur Set" | "Awaiting Flight Details" | "Airport Pickup Only" | "Self-Arranged";
  flightDetails: string;
  dietaryNotes: string;
  wellnessClearance?: "Confirmed" | "Awaiting Notes" | "Special Preference";
  waiverStatus?: "Pending" | "Signed" | "Exempt";
  medicalClearance?: "Cleared" | "Pending Review" | "Action Required";
  companionName?: string;
  notes?: string;
}

interface AttendeeSpreadsheetTabProps {
  clients: CRMClientItem[];
  trips: CRMTripItem[];
  onRefreshData?: () => void;
  initialLens?: "ALL" | "ALERTS" | "BALANCE_DUE" | "MISSING_FLIGHT" | "PENDING_CLEARANCE";
  onInspectGuest?: (clientId: string) => void;
  onInspectTrip?: (tripId: string) => void;
}

const SANCTUARY_OPTIONS = [
  { slug: "nosara", name: "Nosara Sanctuary, Costa Rica", flag: "CR" },
  { slug: "puerto-vallarta-2027", name: "Puerto Vallarta Sanctuary, Mexico", flag: "MX" },
  { slug: "amalfi", name: "Amalfi Coast Sanctuary, Italy", flag: "IT" },
  { slug: "bali", name: "Uluwatu Sanctuary, Bali", flag: "ID" },
  { slug: "riviera-maya", name: "Riviera Maya Sanctuary, Mexico", flag: "MX" },
];

const ROOM_TIER_OPTIONS = [
  "Private Villa Sanctuary",
  "Oceanfront King Suite",
  "Private Cliffside Plunge Villa",
  "Two-Bedroom Oceanfront Penthouse Villa",
  "Shared Ocean Pavilion",
  "Oceanfront Villa Suite",
  "Master Sanctuary Villa",
  "Garden Canopy Suite",
];

const STATUS_CONFIG: Record<
  AttendeeRow["bookingStatus"],
  {
    label: string;
    dbStatus: string;
    bg: string;
    text: string;
    group: "confirmed" | "in_review" | "waitlist";
  }
> = {
  Confirmed: {
    label: "Confirmed",
    dbStatus: "CONFIRMED",
    bg: "bg-emerald-600 hover:bg-emerald-700",
    text: "text-white",
    group: "confirmed",
  },
  "Deposit Paid": {
    label: "Deposit Paid",
    dbStatus: "DEPOSIT_PAID",
    bg: "bg-amber-500 hover:bg-amber-600",
    text: "text-white",
    group: "in_review",
  },
  "In Review": {
    label: "In Review",
    dbStatus: "INQUIRY",
    bg: "bg-sky-600 hover:bg-sky-700",
    text: "text-white",
    group: "in_review",
  },
  Waitlist: {
    label: "Waitlist",
    dbStatus: "WAITLIST_PRIORITY",
    bg: "bg-purple-600 hover:bg-purple-700",
    text: "text-white",
    group: "waitlist",
  },
  Completed: {
    label: "Completed",
    dbStatus: "COMPLETED",
    bg: "bg-stone-500 hover:bg-stone-600",
    text: "text-white",
    group: "waitlist",
  },
};

function normalizeSanctuarySlug(raw?: string): string {
  const s = (raw || "").toLowerCase();
  if (s.includes("vallarta") || s.includes("pvr")) return "puerto-vallarta-2027";
  if (s.includes("amalfi")) return "amalfi";
  if (s.includes("bali")) return "bali";
  if (s.includes("riviera") || s.includes("tulum")) return "riviera-maya";
  return "nosara";
}

export default function AttendeeSpreadsheetTab({
  clients,
  trips,
  onRefreshData,
  initialLens,
  onInspectGuest,
  onInspectTrip,
}: AttendeeSpreadsheetTabProps) {
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [destinationFilter, setDestinationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string>("");

  // Interactive Column Sorting State
  const [sortField, setSortField] = useState<
    "name" | "sanctuaryName" | "roomTier" | "bookingStatus" | "totalPrice" | "amountPaid" | "balanceDue"
  >("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // 1-Line Quick Add Bar State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickEmail, setQuickEmail] = useState("");
  const [quickSanctuary, setQuickSanctuary] = useState("nosara");
  const [quickRoom, setQuickRoom] = useState("Private Villa Sanctuary");
  const [quickStatus, setQuickStatus] = useState<AttendeeRow["bookingStatus"]>("Confirmed");
  const [quickPaid, setQuickPaid] = useState("4350");
  const [addingGuest, setAddingGuest] = useState(false);

  // 1-Click GUI Hospitality Quick Tools State
  const [copiedEmails, setCopiedEmails] = useState(false);
  // Concierge Lens Triage Filter State
  const [activeLens, setActiveLens] = useState<"ALL" | "ALERTS" | "BALANCE_DUE" | "MISSING_FLIGHT" | "PENDING_CLEARANCE">(
    initialLens || "ALL"
  );

  useEffect(() => {
    if (initialLens) {
      setActiveLens(initialLens);
    }
  }, [initialLens]);

  const handleSort = (
    field: "name" | "sanctuaryName" | "roomTier" | "bookingStatus" | "totalPrice" | "amountPaid" | "balanceDue"
  ) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleResetAllFilters = () => {
    setSearchQuery("");
    setDestinationFilter("ALL");
    setStatusFilter("ALL");
    setActiveLens("ALL");
  };

  const renderSortIcon = (
    field: "name" | "sanctuaryName" | "roomTier" | "bookingStatus" | "totalPrice" | "amountPaid" | "balanceDue"
  ) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-[#5C6B5E]/50 ml-1 inline shrink-0" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[#2D3E35] ml-1 inline shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#2D3E35] ml-1 inline shrink-0" />
    );
  };

  // Multi-Select Batch Actions State
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener (/ to focus search, Escape to blur/clear)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({});

  const pendingCount = useMemo(() => {
    return rows.filter((r) => r.bookingStatus === "In Review" || r.bookingStatus === "Deposit Paid").length;
  }, [rows]);

  const dietAlertCount = useMemo(() => {
    return rows.filter((r) => {
      const diet = (r.dietaryNotes || "").toLowerCase();
      return diet && !diet.includes("standard") && !diet.includes("none") && diet !== "seed-oil-free organic menu";
    }).length;
  }, [rows]);

  const balanceDueCount = useMemo(() => {
    return rows.filter((r) => r.balanceDue > 0).length;
  }, [rows]);

  const missingFlightCount = useMemo(() => {
    return rows.filter(
      (r) =>
        r.flightStatus === "Awaiting Flight Details" ||
        !r.flightDetails ||
        r.flightDetails.toLowerCase().includes("awaiting")
    ).length;
  }, [rows]);

  const pendingClearanceCount = useMemo(() => {
    return rows.filter((r) => r.waiverStatus !== "Signed" || r.medicalClearance !== "Cleared").length;
  }, [rows]);

  const handleToggleSelectAll = () => {
    if (filteredRows.length > 0 && filteredRows.every((r) => selectedRowIds.has(r.id))) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredRows.map((r) => r.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchConfirmSelected = () => {
    if (selectedRowIds.size === 0) return;
    setSaveState("saving");
    setSaveMessage(`Confirming ${selectedRowIds.size} selected guest(s)...`);
    rows
      .filter((r) => selectedRowIds.has(r.id))
      .forEach((r) => handleUpdateRow(r.id, "bookingStatus", "Confirmed"));
    setSaveState("saved");
    setSaveMessage(`Confirmed ${selectedRowIds.size} selected guest reservations`);
  };

  const handleBatchDepositPaidSelected = () => {
    if (selectedRowIds.size === 0) return;
    setSaveState("saving");
    setSaveMessage(`Updating ${selectedRowIds.size} selected guest(s) to Deposit Paid...`);
    rows
      .filter((r) => selectedRowIds.has(r.id))
      .forEach((r) => handleUpdateRow(r.id, "bookingStatus", "Deposit Paid"));
    setSaveState("saved");
    setSaveMessage(`Marked ${selectedRowIds.size} selected guests as Deposit Paid`);
  };

  const handleBatchStageWelcomeEmails = async () => {
    if (selectedRowIds.size === 0) return;
    setSaveState("saving");
    setSaveMessage(`Staging welcome emails for ${selectedRowIds.size} guest(s)...`);
    const selectedTrips = rows.filter((r) => selectedRowIds.has(r.id) && r.tripId);
    let stagedCount = 0;
    for (const r of selectedTrips) {
      if (r.tripId) {
        try {
          await automateCrmTripOutreach(r.tripId, "draft_welcome", "Kareena Islam");
          stagedCount++;
        } catch (e) {
          console.error("Failed to stage welcome email for trip:", r.tripId, e);
        }
      }
    }
    setSaveState("saved");
    setSaveMessage(`Staged ${stagedCount} Welcome Letters in Action Review Queue`);
  };

  const handleExportSelectedCSV = () => {
    const targetRows = rows.filter((r) => selectedRowIds.has(r.id));
    if (targetRows.length === 0) return;
    const headers = [
      "Guest Name",
      "Email",
      "Sanctuary",
      "Room Tier",
      "Booking Status",
      "Total Price ($)",
      "Amount Paid ($)",
      "Balance Due ($)",
      "Flight Details",
      "Dietary & Health Notes",
    ];
    const csvRows = targetRows.map((r) => [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.sanctuaryName}"`,
      `"${r.roomTier}"`,
      `"${r.bookingStatus}"`,
      r.totalPrice,
      r.amountPaid,
      r.balanceDue,
      `"${r.flightDetails}"`,
      `"${r.dietaryNotes}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `KAI_Selected_Guests_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOneClickConfirmAllPending = () => {
    const pendingRows = rows.filter((r) => r.bookingStatus === "In Review" || r.bookingStatus === "Deposit Paid");
    if (pendingRows.length === 0) return;

    setSaveState("saving");
    setSaveMessage(`Confirming ${pendingRows.length} guest(s)...`);

    for (const r of pendingRows) {
      handleUpdateRow(r.id, "bookingStatus", "Confirmed");
    }

    setSaveState("saved");
    setSaveMessage(`Confirmed ${pendingRows.length} guest reservations in 1 click`);
  };

  const handleCopyEmails = () => {
    const list = filteredRows
      .map((r) => r.email)
      .filter(Boolean)
      .filter((e) => !e.includes("example.com") && !e.includes("guest@"));
    const textToCopy = (list.length > 0 ? list : filteredRows.map((r) => r.email)).join(", ");
    navigator.clipboard.writeText(textToCopy);
    setCopiedEmails(true);
    setTimeout(() => setCopiedEmails(false), 2400);
  };

  const handleAddDietaryTag = (rowId: string, currentNotes: string, tag: string) => {
    const cleanNotes = currentNotes ? currentNotes.trim() : "";
    const lower = cleanNotes.toLowerCase();
    const tagLower = tag.toLowerCase();

    let newNotes = "";
    if (lower.includes(tagLower)) {
      newNotes = cleanNotes
        .split(/[,;|]/)
        .map((s) => s.trim())
        .filter((s) => s.toLowerCase() !== tagLower)
        .join(", ");
    } else {
      newNotes = cleanNotes ? `${cleanNotes}, ${tag}` : tag;
    }
    handleUpdateRow(rowId, "dietaryNotes", newNotes);
  };

  // Always map live backend `trips` & `clients` so the board is 100% in sync with the database
  // Optimized O(N + M) index lookups (js-set-map-lookups)
  useEffect(() => {
    const clientByEmailMap = new Map<string, CRMClientItem>();
    const clientByNameMap = new Map<string, CRMClientItem>();
    for (const c of clients) {
      if (c.email) clientByEmailMap.set(c.email.toLowerCase().trim(), c);
      if (c.full_name) clientByNameMap.set(c.full_name.toLowerCase().trim(), c);
    }

    const mappedRows: AttendeeRow[] = trips.map((trip, idx) => {
      const emailKey = (trip.client_email || "").toLowerCase().trim();
      const nameKey = (trip.client_name || "").toLowerCase().trim();
      const matchedClient =
        (emailKey ? clientByEmailMap.get(emailKey) : null) ||
        (nameKey ? clientByNameMap.get(nameKey) : null);

      const total = Number(trip.total_investment || 14500);
      const paid = Number(
        trip.paid_amount ??
          trip.deposit_amount ??
          (trip.status === "CONFIRMED" ? Math.round(total * 0.3) : 0)
      );
      const balance = Math.max(0, total - paid);

      const stUpper = (trip.status || "").toUpperCase();
      let bookingStatus: AttendeeRow["bookingStatus"] = "Confirmed";
      let group: AttendeeRow["groupCategory"] = "confirmed";

      if (stUpper.includes("WAITLIST")) {
        bookingStatus = "Waitlist";
        group = "waitlist";
      } else if (stUpper.includes("DEPOSIT") || stUpper.includes("HOLD")) {
        bookingStatus = "Deposit Paid";
        group = "in_review";
      } else if (stUpper.includes("PROPOSAL") || stUpper.includes("INQUIRY") || stUpper.includes("REVIEW") || stUpper.includes("PENDING")) {
        bookingStatus = "In Review";
        group = "in_review";
      } else if (stUpper.includes("COMPLETE")) {
        bookingStatus = "Completed";
        group = "waitlist";
      }

      const normSlug = normalizeSanctuarySlug(trip.sanctuary_slug);
      const sanctuary =
        SANCTUARY_OPTIONS.find((s) => s.slug === normSlug) || SANCTUARY_OPTIONS[0];

      return {
        id: trip.id || `att_${idx + 1}`,
        clientId: matchedClient?.id,
        tripId: trip.id,
        crmTripId: trip.crm_trip_id,
        name: trip.client_name || matchedClient?.full_name || "Sanctuary Guest",
        email: trip.client_email || matchedClient?.email || "guest@example.com",
        phone: trip.client_phone || matchedClient?.phone || "+1 (555) 019-2834",
        sanctuarySlug: sanctuary.slug,
        sanctuaryName: sanctuary.name,
        checkInDate: "2026-11-14",
        checkOutDate: "2026-11-20",
        nights: 6,
        roomTier: trip.room_tier || "Private Villa Sanctuary",
        roomNumber: trip.assigned_room_number || `Villa ${idx + 1}`,
        assignedHost: "Kareena Islam",
        groupCategory: group,
        bookingStatus,
        totalPrice: total,
        amountPaid: paid,
        balanceDue: balance,
        flightStatus: trip.smart_flight?.airline
          ? "Flight Booked & Chauffeur Set"
          : "Awaiting Flight Details",
        flightDetails: trip.smart_flight?.airline
          ? `${trip.smart_flight.airline} ${trip.smart_flight.flight_number || ""}`.trim()
          : trip.flight_details || "Grand Travel VIP Desk",
        dietaryNotes:
          matchedClient?.dietary_requirements ||
          trip.dietary_notes ||
          matchedClient?.health_notes ||
          "Seed-oil-free organic menu",
        wellnessClearance: "Confirmed",
        waiverStatus:
          matchedClient?.waiver_status === "SIGNED"
            ? "Signed"
            : matchedClient?.waiver_status === "EXEMPT"
            ? "Exempt"
            : "Pending",
        medicalClearance:
          matchedClient?.medical_clearance_status === "CLEARED"
            ? "Cleared"
            : matchedClient?.medical_clearance_status === "ACTION_REQUIRED"
            ? "Action Required"
            : "Pending Review",
        companionName: matchedClient?.companion_name || undefined,
      };
    });

    setRows(mappedRows);
  }, [clients, trips]);

  // Persist row update to backend SQLite CRM database (debounced 450ms for typing)
  const syncRowToBackend = (updatedRow: AttendeeRow) => {
    if (saveTimerRef.current[updatedRow.id]) {
      clearTimeout(saveTimerRef.current[updatedRow.id]);
    }
    setSaveState("saving");
    saveTimerRef.current[updatedRow.id] = setTimeout(async () => {
      try {
        const statusCfg = STATUS_CONFIG[updatedRow.bookingStatus] || STATUS_CONFIG.Confirmed;
        await executeCopilotCrmAction({
          form_type: "crm_mutation",
          action_type: "update_crm_record",
          target_id: updatedRow.crmTripId || updatedRow.tripId,
          sanctuary_slug: updatedRow.sanctuarySlug,
          fields: {
            client_name: updatedRow.name,
            email: updatedRow.email,
            phone: updatedRow.phone,
            sanctuary_slug: updatedRow.sanctuarySlug,
            room_tier: updatedRow.roomTier,
            status: statusCfg.dbStatus,
            total_investment: updatedRow.totalPrice,
            amount_paid: updatedRow.amountPaid,
            dietary_requirements: updatedRow.dietaryNotes,
          },
        });
        setSaveState("saved");
        setSaveMessage(`Saved ${updatedRow.name}`);
      } catch (err) {
        console.error("Failed to sync row to CRM:", err);
        setSaveState("error");
      }
    }, 450);
  };

  // Update a single field on a row & auto-sync to backend CRM
  const handleUpdateRow = (rowId: string, field: keyof AttendeeRow, value: any) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        const updated: AttendeeRow = { ...row, [field]: value };

        if (field === "totalPrice" || field === "amountPaid") {
          const total = field === "totalPrice" ? Number(value) || 0 : row.totalPrice;
          const paid = field === "amountPaid" ? Number(value) || 0 : row.amountPaid;
          updated.balanceDue = Math.max(0, total - paid);
        }

        if (field === "bookingStatus") {
          const conf = STATUS_CONFIG[value as AttendeeRow["bookingStatus"]];
          if (conf) {
            updated.groupCategory = conf.group;
          }
        }

        if (field === "sanctuarySlug") {
          const found = SANCTUARY_OPTIONS.find((s) => s.slug === value);
          if (found) {
            updated.sanctuaryName = found.name;
          }
        }

        syncRowToBackend(updated);
        return updated;
      })
    );
  };

  // 1-Line K.I.S.S. Quick Add Guest Handler -> Directly writes to Backend CRM
  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || addingGuest) return;

    setAddingGuest(true);
    setSaveState("saving");
    try {
      const cleanName = quickName.trim();
      const cleanEmail =
        quickEmail.trim() || `${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@example.com`;
      const statusCfg = STATUS_CONFIG[quickStatus] || STATUS_CONFIG.Confirmed;
      const paidVal = Number(quickPaid) || 0;

      await executeCopilotCrmAction({
        form_type: "crm_mutation",
        action_type: "create_crm_record",
        sanctuary_slug: quickSanctuary,
        fields: {
          client_name: cleanName,
          email: cleanEmail,
          sanctuary_slug: quickSanctuary,
          room_tier: quickRoom,
          status: statusCfg.dbStatus,
          total_investment: 14500,
          amount_paid: paidVal,
        },
      });

      setQuickName("");
      setQuickEmail("");
      setShowQuickAdd(false);
      setSaveState("saved");
      setSaveMessage(`Added ${cleanName} to CRM`);
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to quick-add guest:", err);
      setSaveState("error");
    } finally {
      setAddingGuest(false);
    }
  };

  // Delete row from UI and Backend CRM
  const handleDeleteRow = async (row: AttendeeRow) => {
    if (!confirm(`Remove ${row.name}'s booking from the CRM?`)) return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setSaveState("saving");
    try {
      await executeCopilotCrmAction({
        form_type: "crm_mutation",
        action_type: "delete_crm_record",
        target_id: row.crmTripId || row.tripId,
        fields: {
          client_name: row.name,
          target_id: row.crmTripId || row.tripId,
        },
      });
      setSaveState("saved");
      setSaveMessage(`Removed ${row.name}`);
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to delete CRM trip:", err);
      setSaveState("error");
    }
  };

  // Duplicate row in Backend CRM
  const handleDuplicateRow = async (row: AttendeeRow) => {
    setSaveState("saving");
    try {
      const copyName = `${row.name} (Guest 2)`;
      await executeCopilotCrmAction({
        form_type: "crm_mutation",
        action_type: "create_crm_record",
        sanctuary_slug: row.sanctuarySlug,
        fields: {
          client_name: copyName,
          email: `guest2.${row.email}`,
          sanctuary_slug: row.sanctuarySlug,
          room_tier: row.roomTier,
          status: STATUS_CONFIG[row.bookingStatus]?.dbStatus || "CONFIRMED",
          total_investment: row.totalPrice,
          amount_paid: row.amountPaid,
          dietary_requirements: row.dietaryNotes,
        },
      });
      setSaveState("saved");
      setSaveMessage(`Duplicated ${row.name}`);
      onRefreshData?.();
    } catch (err) {
      console.error("Failed to duplicate row:", err);
      setSaveState("error");
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Guest Name",
      "Email",
      "Sanctuary",
      "Room Tier",
      "Booking Status",
      "Total Price ($)",
      "Amount Paid ($)",
      "Balance Due ($)",
      "Flight Details",
      "Dietary & Health Notes",
    ];
    const csvRows = rows.map((r) => [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.sanctuaryName}"`,
      `"${r.roomTier}"`,
      `"${r.bookingStatus}"`,
      r.totalPrice,
      r.amountPaid,
      r.balanceDue,
      `"${r.flightDetails}"`,
      `"${r.dietaryNotes}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute(
      "download",
      `KAI_Sanctuary_Guests_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Guest Dossier
  const handlePrintDossier = (row: AttendeeRow) => {
    printGuestClinicalDossier({
      client_name: row.name,
      sanctuary: row.sanctuaryName,
      room_tier: row.roomTier,
      overall_severity: row.wellnessClearance === "Confirmed" ? "LOW_CLEAR" : "MODERATE_HOLD",
      blocked_modalities: [],
      clinical_findings: [
        {
          category: "Dietary",
          rule: row.dietaryNotes,
          safe_alternative: "Organic chef-prepared low-inflammatory menu",
        },
        {
          category: "Aviation & Ground",
          rule: row.flightStatus,
          safe_alternative: row.flightDetails,
        },
      ],
      dietary_notes: row.dietaryNotes,
      deterministic_hash: `GUEST-${row.id.slice(0, 8)}`,
    });
  };

  const filteredRows = useMemo(() => {
    const res = rows.filter((r: AttendeeRow) => {
      const q = (deferredSearchQuery || "").toLowerCase();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phone && r.phone.toLowerCase().includes(q)) ||
        r.sanctuaryName.toLowerCase().includes(q) ||
        r.roomTier.toLowerCase().includes(q) ||
        (r.roomNumber && r.roomNumber.toLowerCase().includes(q)) ||
        r.dietaryNotes.toLowerCase().includes(q) ||
        (r.flightDetails && r.flightDetails.toLowerCase().includes(q)) ||
        (r.flightStatus && r.flightStatus.toLowerCase().includes(q)) ||
        r.bookingStatus.toLowerCase().includes(q);

      const matchesDest =
        destinationFilter === "ALL" || r.sanctuarySlug === destinationFilter;

      const matchesStatus =
        statusFilter === "ALL" || r.bookingStatus === statusFilter;

      let matchesLens = true;
      if (activeLens === "ALERTS") {
        const diet = (r.dietaryNotes || "").toLowerCase();
        matchesLens = Boolean(
          diet &&
          !diet.includes("standard") &&
          !diet.includes("none") &&
          diet !== "seed-oil-free organic menu"
        );
      } else if (activeLens === "BALANCE_DUE") {
        matchesLens = r.balanceDue > 0;
      } else if (activeLens === "MISSING_FLIGHT") {
        matchesLens =
          r.flightStatus === "Awaiting Flight Details" ||
          !r.flightDetails ||
          r.flightDetails.toLowerCase().includes("awaiting");
      } else if (activeLens === "PENDING_CLEARANCE") {
        matchesLens = r.waiverStatus !== "Signed" || r.medicalClearance !== "Cleared";
      }

      return matchesSearch && matchesDest && matchesStatus && matchesLens;
    });

    res.sort((a, b) => {
      let cmp = 0;
      if (sortField === "totalPrice" || sortField === "amountPaid" || sortField === "balanceDue") {
        cmp = (a[sortField] || 0) - (b[sortField] || 0);
      } else {
        const valA = (a[sortField] || "").toLowerCase();
        const valB = (b[sortField] || "").toLowerCase();
        cmp = valA.localeCompare(valB);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return res;
  }, [rows, deferredSearchQuery, destinationFilter, statusFilter, activeLens, sortField, sortOrder]);

  const totalAttendees = filteredRows.length;
  const totalBilled = filteredRows.reduce((sum, r) => sum + r.totalPrice, 0);
  const totalCollected = filteredRows.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalOutstanding = filteredRows.reduce((sum, r) => sum + r.balanceDue, 0);

  return (
    <div className="space-y-4">
      {/* ================================================================== */}
      {/* 1. QUICK ADD GUEST BAR (CLEAN & COLLAPSIBLE)                       */}
      {/* ================================================================== */}
      {!showQuickAdd ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-xl border border-[#E5DDD0] p-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowQuickAdd(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2D3E35] hover:bg-[#1f2c25] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Quick Add Guest Row</span>
            </button>
            <span className="text-xs text-[#5C6B5E] hidden sm:inline">
              Click directly on any cell to edit rooms, status, or dietary notes
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {saveState === "saving" && (
              <span className="text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <RefreshCw className="w-3 h-3 animate-spin" /> Auto-saving to CRM…
              </span>
            )}
            {saveState === "saved" && (
              <span className="text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> {saveMessage || "Saved to CRM"}
              </span>
            )}
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleQuickAddSubmit}
          className="bg-white rounded-xl border border-[#E5DDD0] p-4 shadow-xs space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#2D3E35]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#2D3E35]">
                Quick Add Guest &amp; Booking
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickAdd(false)}
              className="text-[#5C6B5E] hover:text-[#2D3E35] text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Guest Name *
              </label>
              <input
                type="text"
                required
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="e.g. Aria Montgomery"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Email (Optional)
              </label>
              <input
                type="email"
                value={quickEmail}
                onChange={(e) => setQuickEmail(e.target.value)}
                placeholder="aria@example.com"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Sanctuary
              </label>
              <select
                value={quickSanctuary}
                onChange={(e) => setQuickSanctuary(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35] focus:bg-white focus:outline-none cursor-pointer"
              >
                {SANCTUARY_OPTIONS.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.flag} {s.name.split(",")[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                Suite / Room Tier
              </label>
              <select
                value={quickRoom}
                onChange={(e) => setQuickRoom(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35] focus:bg-white focus:outline-none cursor-pointer"
              >
                {ROOM_TIER_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Status
                </label>
                <select
                  value={quickStatus}
                  onChange={(e) =>
                    setQuickStatus(e.target.value as AttendeeRow["bookingStatus"])
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35] focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Deposit Paid">Deposit Paid</option>
                  <option value="In Review">In Review</option>
                  <option value="Waitlist">Waitlist</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-[#5C6B5E] mb-1">
                  Paid ($)
                </label>
                <input
                  type="number"
                  value={quickPaid}
                  onChange={(e) => setQuickPaid(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#E5DDD0] bg-[#FAF7F2] text-[#2D3E35] focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={addingGuest || !quickName.trim()}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-[#2D3E35] hover:bg-[#1f2c25] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer h-[32px]"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>{addingGuest ? "Adding…" : "Add Guest"}</span>
            </button>
          </div>
        </form>
      )}

      {/* ================================================================== */}
      {/* 2. FILTER BAR & SUMMARY TOTALS                                     */}
      {/* ================================================================== */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-[#5C6B5E] absolute left-3 top-2.5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guests, flights (e.g. AA-1184), rooms, diet... (Press /)"
                className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-[#5C6B5E] hover:text-[#2D3E35] cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg px-2.5 py-1.5 text-[#2D3E35] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sanctuaries</option>
              {SANCTUARY_OPTIONS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.flag} {s.name.split(",")[0]}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-[#FAF7F2] border border-[#E5DDD0] rounded-lg px-2.5 py-1.5 text-[#2D3E35] focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Deposit Paid">Deposit Paid</option>
              <option value="In Review">In Review</option>
              <option value="Waitlist">Waitlist</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#5C6B5E]" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                printCohortManifest({
                  title: "KAI Sanctuary Retreat Roster & Rooming Manifest",
                  dates: "2026 – 2027 Season",
                  location:
                    destinationFilter !== "ALL"
                      ? destinationFilter
                      : "All Active Sanctuaries",
                  capacity: 14,
                  guests: filteredRows.map((r) => ({
                    guest_name: r.name,
                    room_tier: r.roomTier,
                    dietary_notes: r.dietaryNotes,
                    flight: r.flightDetails,
                    arrival: r.checkInDate,
                  })),
                  kitchen_protocols: [
                    "All culinary preparations strictly organic, seed-oil-free, and farm-to-table.",
                  ],
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F2] hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#5C6B5E]" />
              <span>Print Roster</span>
            </button>

            <button
              type="button"
              onClick={() => {
                printCohortManifest({
                  title: "Executive Chef Dietary & Allergy Directive Manifest",
                  dates: "Active Retreat Service",
                  location:
                    destinationFilter !== "ALL"
                      ? destinationFilter
                      : "Sanctuary Kitchen & Dining Shala",
                  capacity: filteredRows.length,
                  guests: filteredRows.map((r) => ({
                    guest_name: r.name,
                    room_tier: r.roomTier,
                    dietary_notes: r.dietaryNotes || "Standard Blue Zone Organic Dining",
                    clinical_flags: r.dietaryNotes && !r.dietaryNotes.toLowerCase().includes("standard") ? ["SPECIAL_DIET"] : [],
                    flight: r.flightDetails,
                    arrival: r.checkInDate,
                  })),
                  kitchen_protocols: [
                    "100% Seed-Oil-Free cooking fat standard (single-origin cold-pressed olive oil & coconut oil only).",
                    "Dedicated prep surface separation for celiac and severe nut allergies.",
                  ],
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Print Kitchen Directive for Executive Chef"
            >
              <Utensils className="w-3.5 h-3.5 text-amber-800" />
              <span>Print Kitchen Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => {
                printCohortManifest({
                  title: "VIP Gateway Airport Chauffeur & Flight Arrival Manifest",
                  dates: "Active Inbound & Outbound Flight Service",
                  location:
                    destinationFilter !== "ALL"
                      ? destinationFilter
                      : "Gateway Airport (PVR / LIR / NAP / DPS)",
                  capacity: filteredRows.length,
                  guests: filteredRows.map((r) => ({
                    guest_name: r.name,
                    room_tier: r.roomTier,
                    dietary_notes: r.dietaryNotes,
                    flight: r.flightDetails || "Awaiting Flight Details",
                    arrival: r.checkInDate,
                  })),
                  kitchen_protocols: [
                    "High-clearance luxury SUV escorts with chilled hydration and adaptogenic mist.",
                  ],
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Print Chauffeur Schedule for Drivers"
            >
              <Plane className="w-3.5 h-3.5 text-blue-800" />
              <span>Print Driver Sheet</span>
            </button>
          </div>
        </div>

        {/* Concierge Lens Triage Strip (Zero-Search Staff Operations) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DDD0]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono uppercase font-bold text-[#5C6B5E] mr-1">
              Concierge Lens:
            </span>
            <button
              type="button"
              onClick={() => setActiveLens("ALL")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeLens === "ALL"
                  ? "bg-[#2D3E35] text-[#FAF7F2] shadow-xs"
                  : "bg-white text-[#2D3E35] border border-[#E5DDD0] hover:bg-[#F2ECE4]"
              }`}
            >
              All Guests ({rows.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLens("ALERTS")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeLens === "ALERTS"
                  ? "bg-amber-800 text-white shadow-xs"
                  : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              Clinical &amp; Dietary Flags ({dietAlertCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveLens("BALANCE_DUE")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeLens === "BALANCE_DUE"
                  ? "bg-[#C07D63] text-white shadow-xs"
                  : "bg-white text-[#C07D63] border border-[#C07D63]/30 hover:bg-[#FAF7F2]"
              }`}
            >
              Outstanding Balances ({balanceDueCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveLens("MISSING_FLIGHT")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeLens === "MISSING_FLIGHT"
                  ? "bg-blue-800 text-white shadow-xs"
                  : "bg-white text-blue-900 border border-blue-200 hover:bg-blue-50"
              }`}
            >
              Awaiting Flight Details ({missingFlightCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveLens("PENDING_CLEARANCE")}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeLens === "PENDING_CLEARANCE"
                  ? "bg-rose-700 text-white shadow-xs"
                  : "bg-white text-rose-800 border border-rose-200 hover:bg-rose-50"
              }`}
            >
              Pending Clearance ({pendingClearanceCount})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOneClickConfirmAllPending}
              disabled={pendingCount === 0}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white text-[11px] font-bold transition cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Confirm Pending ({pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={handleCopyEmails}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] text-[11px] font-semibold transition cursor-pointer"
            >
              <Copy className="w-3 h-3 text-[#5C6B5E]" />
              <span>{copiedEmails ? "Emails Copied" : "Copy Emails"}</span>
            </button>
          </div>
        </div>

        {/* Multi-Select Floating Batch Actions Bar */}
        {selectedRowIds.size > 0 && (
          <div className="bg-[#2D3E35] text-[#FAF7F2] p-2.5 px-4 rounded-xl shadow-lg border border-[#3E5246] flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold bg-[#FAF7F2]/20 px-2 py-0.5 rounded-full text-[11px]">
                {selectedRowIds.size} Selected
              </span>
              <span className="text-[#FAF7F2]/80">Batch concierge actions:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleBatchConfirmSelected}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded-md font-semibold text-white transition-colors cursor-pointer"
              >
                Mark as Confirmed
              </button>
              <button
                type="button"
                onClick={handleBatchDepositPaidSelected}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md font-semibold text-white transition-colors cursor-pointer"
              >
                Mark as Deposit Paid
              </button>
              <button
                type="button"
                onClick={handleBatchStageWelcomeEmails}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md font-semibold text-white transition-colors cursor-pointer"
              >
                Stage Welcome Emails ({selectedRowIds.size})
              </button>
              <button
                type="button"
                onClick={handleExportSelectedCSV}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 rounded-md font-semibold text-white transition-colors cursor-pointer"
              >
                Export Selected CSV
              </button>
              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                className="px-2 py-1 text-stone-300 hover:text-white text-[11px] cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* Clean 8-Column K.I.S.S. Table with Multi-Select */}
        <div className="overflow-x-auto rounded-lg border border-[#E5DDD0]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F4EE] text-[#5C6B5E] font-semibold border-b border-[#E5DDD0] text-[11px]">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && filteredRows.every((r) => selectedRowIds.has(r.id))}
                    onChange={handleToggleSelectAll}
                    className="rounded border-[#E5DDD0] text-[#2D3E35] focus:ring-[#2D3E35] cursor-pointer"
                    title="Select All Displayed Rows"
                  />
                </th>
                <th
                  onClick={() => handleSort("name")}
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[#2D3E35] transition-colors"
                  title="Click to sort by Guest Name"
                >
                  <span className="inline-flex items-center">
                    <span>Guest &amp; Email</span>
                    {renderSortIcon("name")}
                  </span>
                </th>
                <th
                  onClick={() => handleSort("sanctuaryName")}
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[#2D3E35] transition-colors"
                  title="Click to sort by Sanctuary"
                >
                  <span className="inline-flex items-center">
                    <span>Sanctuary</span>
                    {renderSortIcon("sanctuaryName")}
                  </span>
                </th>
                <th
                  onClick={() => handleSort("roomTier")}
                  className="py-2.5 px-3 cursor-pointer select-none hover:text-[#2D3E35] transition-colors"
                  title="Click to sort by Suite / Room Tier"
                >
                  <span className="inline-flex items-center">
                    <span>Suite / Room Tier</span>
                    {renderSortIcon("roomTier")}
                  </span>
                </th>
                <th
                  onClick={() => handleSort("bookingStatus")}
                  className="py-2.5 px-3 w-36 cursor-pointer select-none hover:text-[#2D3E35] transition-colors"
                  title="Click to sort by Booking Status"
                >
                  <span className="inline-flex items-center">
                    <span>Status</span>
                    {renderSortIcon("bookingStatus")}
                  </span>
                </th>
                <th
                  onClick={() => handleSort("balanceDue")}
                  className="py-2.5 px-3 text-right cursor-pointer select-none hover:text-[#2D3E35] transition-colors"
                  title="Click to sort by Balance Due"
                >
                  <span className="inline-flex items-center justify-end w-full">
                    <span>Paid / Total ($)</span>
                    {renderSortIcon("balanceDue")}
                  </span>
                </th>
                <th className="py-2.5 px-3">Dietary &amp; Flight Notes</th>
                <th className="py-2.5 px-3 w-20 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DDD0]/70">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#5C6B5E] bg-[#FAF8F5]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="font-semibold text-[#2D3E35] text-xs">No matching guests found</p>
                      <p className="text-[11px] text-[#5C6B5E]">
                        Your search or filter combination did not match any active guest records.
                      </p>
                      <button
                        type="button"
                        onClick={handleResetAllFilters}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E5DDD0] text-[#2D3E35] hover:bg-[#F2ECE4] transition-colors shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-[#5C6B5E]" />
                        <span>Reset All Filters &amp; Search</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const statusConfig =
                    STATUS_CONFIG[row.bookingStatus] || STATUS_CONFIG.Confirmed;
                  const initials = row.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-[#FAF8F5] transition-colors group"
                    >
                      {/* 0. Row Selection Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(row.id)}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="rounded border-[#E5DDD0] text-[#2D3E35] focus:ring-[#2D3E35] cursor-pointer"
                        />
                      </td>

                      {/* 1. Guest Name & Email */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => row.clientId && onInspectGuest?.(row.clientId)}
                            title="Inspect Guest Dossier & Clearance"
                            className="w-7 h-7 rounded-full bg-[#2D3E35] text-amber-200 text-[10px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-600 transition-all shadow-xs"
                          >
                            {initials || "G"}
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) =>
                                  handleUpdateRow(row.id, "name", e.target.value)
                                }
                                className="font-semibold text-[#2D3E35] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1.5 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] text-xs flex-1"
                              />
                              {row.clientId && onInspectGuest && (
                                <button
                                  type="button"
                                  onClick={() => onInspectGuest(row.clientId!)}
                                  title="Inspect 360 Dossier"
                                  className="text-[10px] text-emerald-800 hover:text-emerald-950 px-1 py-0.5 rounded hover:bg-emerald-50 shrink-0 font-semibold transition-colors"
                                >
                                  Dossier
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={row.email}
                              onChange={(e) =>
                                handleUpdateRow(row.id, "email", e.target.value)
                              }
                              className="w-full text-[11px] text-[#5C6B5E] bg-transparent hover:bg-white focus:bg-white focus:outline-none px-1.5 py-0.2 rounded border border-transparent hover:border-[#E5DDD0]"
                            />
                            {row.companionName && (
                              <div className="text-[10px] text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-medium inline-block mt-0.5">
                                Companion: {row.companionName}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Sanctuary */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.sanctuarySlug}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "sanctuarySlug", e.target.value)
                          }
                          className="w-full text-xs bg-transparent hover:bg-white focus:bg-white focus:outline-none px-1.5 py-1 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35] font-medium cursor-pointer"
                        >
                          {SANCTUARY_OPTIONS.map((s) => (
                            <option key={s.slug} value={s.slug}>
                              {s.flag} {s.name.split(",")[0]}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 3. Suite / Room Tier */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.roomTier}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "roomTier", e.target.value)
                          }
                          className="w-full text-xs bg-transparent hover:bg-white focus:bg-white focus:outline-none px-1.5 py-1 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35] font-medium cursor-pointer"
                        >
                          {!ROOM_TIER_OPTIONS.includes(row.roomTier) && (
                            <option value={row.roomTier}>{row.roomTier}</option>
                          )}
                          {ROOM_TIER_OPTIONS.map((room) => (
                            <option key={room} value={room}>
                              {room}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 4. Status */}
                      <td className="py-2.5 px-3">
                        <select
                          value={row.bookingStatus}
                          onChange={(e) =>
                            handleUpdateRow(
                              row.id,
                              "bookingStatus",
                              e.target.value
                            )
                          }
                          className={`w-full py-1 px-2 rounded-md font-bold text-center text-xs shadow-2xs cursor-pointer transition-colors border-0 ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <option value="Confirmed" className="bg-white text-emerald-800 font-bold">
                            Confirmed
                          </option>
                          <option value="Deposit Paid" className="bg-white text-amber-800 font-bold">
                            Deposit Paid
                          </option>
                          <option value="In Review" className="bg-white text-sky-800 font-bold">
                            In Review
                          </option>
                          <option value="Waitlist" className="bg-white text-purple-800 font-bold">
                            Waitlist
                          </option>
                          <option value="Completed" className="bg-white text-stone-800 font-bold">
                            Completed
                          </option>
                        </select>
                        {row.bookingStatus !== "Confirmed" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRow(row.id, "bookingStatus", "Confirmed")}
                            className="mt-1 w-full py-0.5 px-1.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 transition flex items-center justify-center gap-1 cursor-pointer"
                            title="1-click confirm this guest"
                          >
                            <Check className="w-3 h-3" />
                            <span>1-Click Confirm</span>
                          </button>
                        )}
                      </td>

                      {/* 5. Paid / Total ($) */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[11px] text-[#5C6B5E]">Paid $</span>
                          <input
                            type="number"
                            value={row.amountPaid}
                            onChange={(e) =>
                              handleUpdateRow(
                                row.id,
                                "amountPaid",
                                Number(e.target.value)
                              )
                            }
                            className="w-20 text-right font-bold text-emerald-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none px-1.5 py-0.5 rounded border border-transparent hover:border-[#E5DDD0]"
                          />
                        </div>
                        <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px]">
                          <span className="text-[#5C6B5E]">
                            of ${row.totalPrice.toLocaleString()}
                          </span>
                          {row.balanceDue <= 0 ? (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              Paid
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-semibold">
                              ${row.balanceDue.toLocaleString()} due
                            </span>
                          )}
                        </div>
                        {row.balanceDue > 0 && (
                          <button
                            type="button"
                            onClick={() => handleUpdateRow(row.id, "amountPaid", row.totalPrice)}
                            className="mt-1 ml-auto text-[10px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded transition flex items-center justify-center gap-0.5 cursor-pointer"
                            title="Mark full balance paid"
                          >
                            Mark Paid
                          </button>
                        )}
                      </td>

                      {/* 6. Dietary & Flight Notes */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={row.dietaryNotes}
                          onChange={(e) =>
                            handleUpdateRow(row.id, "dietaryNotes", e.target.value)
                          }
                          placeholder="Dietary or food notes..."
                          className="w-full text-xs text-[#2D3E35] bg-transparent hover:bg-white focus:bg-white focus:outline-none px-1.5 py-0.5 rounded border border-transparent hover:border-[#E5DDD0]"
                        />
                        {/* 1-Click Dietary Preset Chips */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {["Gluten-Free", "Seed-Oil-Free", "Vegan", "Nut-Free"].map((dietTag) => (
                            <button
                              key={dietTag}
                              type="button"
                              onClick={() => handleAddDietaryTag(row.id, row.dietaryNotes, dietTag)}
                              className={`text-[9px] px-1.5 py-0.2 rounded border transition cursor-pointer ${
                                (row.dietaryNotes || "").toLowerCase().includes(dietTag.toLowerCase())
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold"
                                  : "bg-white/[0.8] text-stone-600 border-stone-200 hover:border-emerald-400 hover:text-emerald-700"
                              }`}
                              title={`Click to add or remove ${dietTag}`}
                            >
                              + {dietTag}
                            </button>
                          ))}
                        </div>
                        <div className="text-[10px] text-[#5C6B5E] px-1.5 mt-1 truncate flex items-center gap-1">
                          <Plane className="w-3 h-3 text-[#5C6B5E] shrink-0" />
                          <span>{row.flightDetails}</span>
                        </div>
                        {/* Arrival Readiness 4-Segment Micro-Badge */}
                        <div className="flex flex-wrap items-center gap-1 px-1.5 mt-1 text-[9px] font-mono">
                          <span
                            className={`px-1.5 py-0.2 rounded border font-semibold ${
                              row.waiverStatus === "Signed"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            Waiver: {row.waiverStatus || "Pending"}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded border font-semibold ${
                              row.medicalClearance === "Cleared"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            Medical: {row.medicalClearance === "Cleared" ? "Cleared" : "Review"}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded border font-semibold ${
                              row.flightDetails && !row.flightDetails.toLowerCase().includes("awaiting")
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            Flight: {row.flightDetails && !row.flightDetails.toLowerCase().includes("awaiting") ? "Set" : "Missing"}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 rounded border font-semibold ${
                              row.balanceDue <= 0
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            Ledger: {row.balanceDue <= 0 ? "Paid" : "Due"}
                          </span>
                        </div>
                      </td>

                      {/* 7. Actions */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {row.clientId && onInspectGuest && (
                            <button
                              type="button"
                              onClick={() => onInspectGuest(row.clientId!)}
                              title="Inspect Guest Dossier & Clearance"
                              className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {(row.crmTripId || row.tripId) && onInspectTrip && (
                            <button
                              type="button"
                              onClick={() => onInspectTrip(row.crmTripId || row.tripId!)}
                              title="Inspect Reservation & Itinerary"
                              className="p-1.5 text-[#2D3E35] hover:text-[#C07D63] hover:bg-[#FAF7F2] rounded transition-colors cursor-pointer"
                            >
                              <Compass className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePrintDossier(row)}
                            title="Print Guest Dossier"
                            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#EBE3D8] rounded transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row)}
                            title="Duplicate Booking"
                            className="p-1.5 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#EBE3D8] rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row)}
                            title="Delete Booking"
                            className="p-1.5 text-[#5C6B5E] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filteredRows.length > 0 && (
              <tfoot>
                <tr className="bg-[#FAF8F5] text-xs font-bold text-[#2D3E35] border-t border-[#E5DDD0]">
                  <td className="py-2.5 px-3" colSpan={4}>
                    Total ({totalAttendees} {totalAttendees === 1 ? "Guest" : "Guests"})
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-emerald-800">
                      ${totalCollected.toLocaleString()} Paid
                    </span>{" "}
                    <span className="text-[#5C6B5E] font-normal">
                      / ${totalBilled.toLocaleString()}
                    </span>
                    {totalOutstanding > 0 && (
                      <div className="text-[10px] text-amber-800">
                        ${totalOutstanding.toLocaleString()} balance due
                      </div>
                    )}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
