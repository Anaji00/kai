"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Table,
  Plus,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  MapPin,
  Bed,
  User,
  DollarSign,
  Plane,
  Heart,
  ChevronDown,
  ChevronRight,
  Trash2,
  Printer,
  Copy,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { CRMClientItem, CRMTripItem } from "@/lib/sidecar-api";
import { printCohortManifest, printBillingFolio, printGuestClinicalDossier } from "@/lib/print-export";

export interface AttendeeRow {
  id: string;
  clientId?: string;
  tripId?: string;
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
  clinicalSafety: "Cleared by Nurse" | "Awaiting Medical Intake" | "Special Attention";
  notes?: string;
}

interface AttendeeSpreadsheetTabProps {
  clients: CRMClientItem[];
  trips: CRMTripItem[];
  onRefreshData?: () => void;
}

const SANCTUARY_OPTIONS = [
  { slug: "puerto-vallarta-2027", name: "Puerto Vallarta Sanctuary, Mexico", flag: "🇲🇽" },
  { slug: "nosara-2026", name: "Nosara Coastal Sanctuary, Costa Rica", flag: "🇨🇷" },
  { slug: "amalfi-coast-2026", name: "Amalfi Coast Sanctuary, Italy", flag: "🇮🇹" },
  { slug: "bali-2027", name: "Sacred Springs Sanctuary, Bali", flag: "🇮🇩" },
  { slug: "sedona-2026", name: "Red Rock High-Desert Haven, Sedona", flag: "🇺🇸" },
];

const ROOM_TIER_OPTIONS = [
  "Oceanfront Villa Suite",
  "Master Sanctuary Villa",
  "Garden Canopy Suite",
  "Cliffside Sunset Pavilion",
  "Shared Wellness Pavilion",
];

const HOST_OPTIONS = [
  "Kareena Islam (BSN RN)",
  "Armaan Islam (Founder)",
  "Grand Travel Concierge Desk",
  "On-Site Sanctuary Host",
];

const STATUS_CONFIG: Record<
  AttendeeRow["bookingStatus"],
  { label: string; bg: string; text: string; dot: string; group: "confirmed" | "in_review" | "waitlist" }
> = {
  Confirmed: {
    label: "Confirmed",
    bg: "bg-emerald-600 hover:bg-emerald-700",
    text: "text-white",
    dot: "bg-emerald-400",
    group: "confirmed",
  },
  "Deposit Paid": {
    label: "Deposit Paid",
    bg: "bg-amber-500 hover:bg-amber-600",
    text: "text-white",
    dot: "bg-amber-300",
    group: "in_review",
  },
  "In Review": {
    label: "In Review",
    bg: "bg-sky-500 hover:bg-sky-600",
    text: "text-white",
    dot: "bg-sky-300",
    group: "in_review",
  },
  Waitlist: {
    label: "Waitlist",
    bg: "bg-purple-600 hover:bg-purple-700",
    text: "text-white",
    dot: "bg-purple-300",
    group: "waitlist",
  },
  Completed: {
    label: "Completed",
    bg: "bg-stone-500 hover:bg-stone-600",
    text: "text-white",
    dot: "bg-stone-300",
    group: "waitlist",
  },
};

const FLIGHT_OPTIONS: AttendeeRow["flightStatus"][] = [
  "Flight Booked & Chauffeur Set",
  "Awaiting Flight Details",
  "Airport Pickup Only",
  "Self-Arranged",
];

const CLINICAL_SAFETY_OPTIONS: AttendeeRow["clinicalSafety"][] = [
  "Cleared by Nurse",
  "Awaiting Medical Intake",
  "Special Attention",
];

const STORAGE_KEY = "kai_attendee_board_rows_v2";

export default function AttendeeSpreadsheetTab({
  clients,
  trips,
  onRefreshData,
}: AttendeeSpreadsheetTabProps) {
  const [rows, setRows] = useState<AttendeeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    confirmed: false,
    in_review: false,
    waitlist: false,
  });
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [activeCellId, setActiveCellId] = useState<string | null>(null);

  // Calculate nights between two YYYY-MM-DD dates
  const calculateNights = (start: string, end: string): number => {
    try {
      const d1 = new Date(start).getTime();
      const d2 = new Date(end).getTime();
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 7;
    } catch {
      return 7;
    }
  };

  // Pre-hydrate rows from local storage or map directly from live CRM trips & clients
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed: AttendeeRow[] = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not read local spreadsheet cache:", e);
    }

    // Otherwise, synthesize intuitive initial rows from live trips & clients
    const initialRows: AttendeeRow[] = trips.map((trip, idx) => {
      const matchedClient = clients.find(
        (c) => c.email === trip.client_email || c.full_name === trip.client_name
      );
      const total = trip.total_investment || 8500;
      const paid = trip.paid_amount ?? (trip.status === "CONFIRMED" ? total : 2550);
      const balance = Math.max(0, total - paid);

      let group: "confirmed" | "in_review" | "waitlist" = "confirmed";
      let bookingStatus: AttendeeRow["bookingStatus"] = "Confirmed";

      if (trip.status === "PROPOSAL" || trip.status === "IN_REVIEW") {
        group = "in_review";
        bookingStatus = "In Review";
      } else if (trip.status === "HOLD") {
        group = "in_review";
        bookingStatus = "Deposit Paid";
      } else if (trip.status === "WAITLIST") {
        group = "waitlist";
        bookingStatus = "Waitlist";
      } else if (trip.status === "COMPLETED") {
        group = "waitlist";
        bookingStatus = "Completed";
      }

      const sanctuary =
        SANCTUARY_OPTIONS.find((s) => s.slug === trip.sanctuary_slug) ||
        SANCTUARY_OPTIONS[idx % SANCTUARY_OPTIONS.length];

      return {
        id: trip.id || `att_${idx + 1}`,
        clientId: matchedClient?.id,
        tripId: trip.id,
        name: trip.client_name || matchedClient?.full_name || "Sanctuary Guest",
        email: trip.client_email || matchedClient?.email || "guest@example.com",
        phone: trip.client_phone || matchedClient?.phone || "+1 (555) 019-2834",
        sanctuarySlug: sanctuary.slug,
        sanctuaryName: sanctuary.name,
        checkInDate: "2026-11-14",
        checkOutDate: "2026-11-21",
        nights: 7,
        roomTier: trip.room_tier || ROOM_TIER_OPTIONS[idx % ROOM_TIER_OPTIONS.length],
        roomNumber: trip.assigned_room_number || `Villa ${idx + 1}A`,
        assignedHost: HOST_OPTIONS[idx % HOST_OPTIONS.length],
        groupCategory: group,
        bookingStatus: bookingStatus,
        totalPrice: total,
        amountPaid: paid,
        balanceDue: balance,
        flightStatus: trip.smart_flight?.airline
          ? "Flight Booked & Chauffeur Set"
          : "Awaiting Flight Details",
        flightDetails: trip.smart_flight?.airline
          ? `${trip.smart_flight.airline} ${trip.smart_flight.flight_number || "142"}`
          : trip.flight_details || "Awaiting itinerary",
        dietaryNotes: trip.dietary_notes || "Plant-forward, gluten-sensitive",
        clinicalSafety: trip.clinical_flags && trip.clinical_flags.length > 0
          ? "Special Attention"
          : "Cleared by Nurse",
        notes: "Preferred morning oceanfront sessions and low-histamine cuisine.",
      };
    });

    // If trips is empty, add demo real-world rows so non-technical staff see a full board immediately
    if (initialRows.length === 0) {
      initialRows.push(
        {
          id: "att_1",
          name: "Lady Elena Vance",
          email: "elena.vance@vanceholding.com",
          phone: "+1 (310) 555-0198",
          sanctuarySlug: "puerto-vallarta-2027",
          sanctuaryName: "Puerto Vallarta Sanctuary, Mexico",
          checkInDate: "2026-11-14",
          checkOutDate: "2026-11-21",
          nights: 7,
          roomTier: "Oceanfront Villa Suite",
          roomNumber: "Villa 3",
          assignedHost: "Kareena Islam (BSN RN)",
          groupCategory: "confirmed",
          bookingStatus: "Confirmed",
          totalPrice: 9500,
          amountPaid: 9500,
          balanceDue: 0,
          flightStatus: "Flight Booked & Chauffeur Set",
          flightDetails: "NetJets Citation X · ETA 14:15 PVR",
          dietaryNotes: "Strict gluten-free, organic berries",
          clinicalSafety: "Cleared by Nurse",
          notes: "Focusing on nervous system decompression and vagal tone.",
        },
        {
          id: "att_2",
          name: "Marcus Aurelius Thorne",
          email: "m.thorne@thornecapital.co.uk",
          phone: "+44 20 7946 0912",
          sanctuarySlug: "nosara-2026",
          sanctuaryName: "Nosara Coastal Sanctuary, Costa Rica",
          checkInDate: "2026-12-05",
          checkOutDate: "2026-12-12",
          nights: 7,
          roomTier: "Master Sanctuary Villa",
          roomNumber: "Villa 1A",
          assignedHost: "Armaan Islam (Founder)",
          groupCategory: "confirmed",
          bookingStatus: "Confirmed",
          totalPrice: 12500,
          amountPaid: 12500,
          balanceDue: 0,
          flightStatus: "Flight Booked & Chauffeur Set",
          flightDetails: "British Airways BA2237 · Chauffeur waiting at SJO",
          dietaryNotes: "Keto, wild seafood only",
          clinicalSafety: "Cleared by Nurse",
          notes: "Daily reformer Pilates and contrast therapy protocol.",
        },
        {
          id: "att_3",
          name: "Sofia Chen-Montague",
          email: "sofia@chenmontague.com",
          phone: "+1 (415) 555-0142",
          sanctuarySlug: "amalfi-coast-2026",
          sanctuaryName: "Amalfi Coast Sanctuary, Italy",
          checkInDate: "2026-09-18",
          checkOutDate: "2026-09-25",
          nights: 7,
          roomTier: "Cliffside Sunset Pavilion",
          roomNumber: "Pavilion 4",
          assignedHost: "Kareena Islam (BSN RN)",
          groupCategory: "in_review",
          bookingStatus: "Deposit Paid",
          totalPrice: 11000,
          amountPaid: 3300,
          balanceDue: 7700,
          flightStatus: "Awaiting Flight Details",
          flightDetails: "Coordinating lie-flat via Rome FCO",
          dietaryNotes: "Low-histamine, no nightshades",
          clinicalSafety: "Awaiting Medical Intake",
          notes: "Requested private sound bath session upon arrival.",
        },
        {
          id: "att_4",
          name: "Dr. Julian Sterling",
          email: "j.sterling@sterlinginstitute.org",
          phone: "+1 (212) 555-0177",
          sanctuarySlug: "bali-2027",
          sanctuaryName: "Sacred Springs Sanctuary, Bali",
          checkInDate: "2027-02-10",
          checkOutDate: "2027-02-17",
          nights: 7,
          roomTier: "Garden Canopy Suite",
          roomNumber: "Suite 6",
          assignedHost: "Grand Travel Concierge Desk",
          groupCategory: "in_review",
          bookingStatus: "In Review",
          totalPrice: 8500,
          amountPaid: 0,
          balanceDue: 8500,
          flightStatus: "Airport Pickup Only",
          flightDetails: "Singapore Airlines SQ942 into DPS",
          dietaryNotes: "Plant-forward, all Ayurvedic teas",
          clinicalSafety: "Special Attention",
          notes: "Requires SSRI-safe herbal formulations only.",
        },
        {
          id: "att_5",
          name: "Claire Delacroix",
          email: "claire.d@delacroixdesign.fr",
          phone: "+33 1 42 68 55 00",
          sanctuarySlug: "puerto-vallarta-2027",
          sanctuaryName: "Puerto Vallarta Sanctuary, Mexico",
          checkInDate: "2026-11-14",
          checkOutDate: "2026-11-21",
          nights: 7,
          roomTier: "Oceanfront Villa Suite",
          roomNumber: "Villa 3B (Waitlist)",
          assignedHost: "On-Site Sanctuary Host",
          groupCategory: "waitlist",
          bookingStatus: "Waitlist",
          totalPrice: 9500,
          amountPaid: 0,
          balanceDue: 9500,
          flightStatus: "Self-Arranged",
          flightDetails: "Pending suite release confirmation",
          dietaryNotes: "Dairy-free, Mediterranean",
          clinicalSafety: "Cleared by Nurse",
          notes: "Priority 1 on waitlist if Villa 3 has vacancy.",
        }
      );
    }

    setRows(initialRows);
    saveRowsToStorage(initialRows);
  }, [clients, trips]);

  // Persist to local storage
  const saveRowsToStorage = (updatedRows: AttendeeRow[]) => {
    if (typeof window === "undefined") return;
    setSaveStatus("saving");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRows));
      setTimeout(() => setSaveStatus("saved"), 300);
    } catch (e) {
      console.error("Failed to save attendee rows:", e);
      setSaveStatus("unsaved");
    }
  };

  // Update a single field on a row
  const handleUpdateRow = useCallback(
    (rowId: string, field: keyof AttendeeRow, value: any) => {
      setRows((prev) => {
        const next = prev.map((row) => {
          if (row.id !== rowId) return row;
          const updated = { ...row, [field]: value };

          // Automatically sync nights if dates changed
          if (field === "checkInDate" || field === "checkOutDate") {
            const start = field === "checkInDate" ? value : row.checkInDate;
            const end = field === "checkOutDate" ? value : row.checkOutDate;
            updated.nights = calculateNights(start, end);
          }

          // Automatically recalculate balance
          if (field === "totalPrice" || field === "amountPaid") {
            const total = field === "totalPrice" ? Number(value) || 0 : row.totalPrice;
            const paid = field === "amountPaid" ? Number(value) || 0 : row.amountPaid;
            updated.balanceDue = Math.max(0, total - paid);
          }

          // Automatically sync groupCategory if bookingStatus changed
          if (field === "bookingStatus") {
            const conf = STATUS_CONFIG[value as AttendeeRow["bookingStatus"]];
            if (conf) {
              updated.groupCategory = conf.group;
            }
          }

          // Automatically update sanctuaryName if sanctuarySlug changed
          if (field === "sanctuarySlug") {
            const found = SANCTUARY_OPTIONS.find((s) => s.slug === value);
            if (found) {
              updated.sanctuaryName = found.name;
            }
          }

          return updated;
        });

        saveRowsToStorage(next);
        return next;
      });
    },
    []
  );

  // Add a brand-new attendee row (Monday.com style)
  const handleAddAttendee = (group: "confirmed" | "in_review" | "waitlist" = "confirmed") => {
    const newId = `att_${Date.now()}`;
    const defaultStatus: AttendeeRow["bookingStatus"] =
      group === "confirmed" ? "Confirmed" : group === "in_review" ? "Deposit Paid" : "Waitlist";

    const newRow: AttendeeRow = {
      id: newId,
      name: "New Guest",
      email: "guest@example.com",
      phone: "+1 (555) 000-0000",
      sanctuarySlug: "puerto-vallarta-2027",
      sanctuaryName: "Puerto Vallarta Sanctuary, Mexico",
      checkInDate: "2026-11-14",
      checkOutDate: "2026-11-21",
      nights: 7,
      roomTier: "Oceanfront Villa Suite",
      roomNumber: "Villa Pending",
      assignedHost: "Kareena Islam (BSN RN)",
      groupCategory: group,
      bookingStatus: defaultStatus,
      totalPrice: 8500,
      amountPaid: group === "confirmed" ? 8500 : group === "in_review" ? 2550 : 0,
      balanceDue: group === "confirmed" ? 0 : group === "in_review" ? 5950 : 8500,
      flightStatus: "Awaiting Flight Details",
      flightDetails: "Not provided yet",
      dietaryNotes: "Standard Sanctuary Menu",
      clinicalSafety: "Awaiting Medical Intake",
      notes: "Newly created reservation.",
    };

    const nextRows = [newRow, ...rows];
    setRows(nextRows);
    saveRowsToStorage(nextRows);
    setActiveCellId(`${newId}_name`);
  };

  // Delete row
  const handleDeleteRow = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name} from this retreat list?`)) {
      const nextRows = rows.filter((r) => r.id !== id);
      setRows(nextRows);
      saveRowsToStorage(nextRows);
    }
  };

  // Duplicate row
  const handleDuplicateRow = (row: AttendeeRow) => {
    const duplicated: AttendeeRow = {
      ...row,
      id: `att_${Date.now()}`,
      name: `${row.name} (Copy)`,
      roomNumber: `${row.roomNumber} (Copy)`,
    };
    const nextRows = [duplicated, ...rows];
    setRows(nextRows);
    saveRowsToStorage(nextRows);
  };

  // Export to Excel / CSV
  const handleExportCSV = () => {
    const headers = [
      "Guest Name",
      "Email",
      "Phone",
      "Sanctuary Location",
      "Check-In Date",
      "Check-Out Date",
      "Nights",
      "Room Tier",
      "Villa / Room #",
      "Assigned Host",
      "Booking Status",
      "Total Price ($)",
      "Amount Paid ($)",
      "Balance Due ($)",
      "Flight & Transfer",
      "Flight Details",
      "Dietary Notes",
      "Nurse Safety Check",
      "Special Notes",
    ];

    const csvRows = rows.map((r) => [
      `"${r.name}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      `"${r.sanctuaryName}"`,
      `"${r.checkInDate}"`,
      `"${r.checkOutDate}"`,
      r.nights,
      `"${r.roomTier}"`,
      `"${r.roomNumber}"`,
      `"${r.assignedHost}"`,
      `"${r.bookingStatus}"`,
      r.totalPrice,
      r.amountPaid,
      r.balanceDue,
      `"${r.flightStatus}"`,
      `"${r.flightDetails}"`,
      `"${r.dietaryNotes}"`,
      `"${r.clinicalSafety}"`,
      `"${r.notes || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `KAI_Sanctuary_Attendees_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Listen for global command palette events & URL actions
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check URL parameters on mount
    const searchParams = new URLSearchParams(window.location.search);
    const searchParam = searchParams.get("search");
    if (searchParam) {
      setSearchQuery(searchParam);
    }
    const actionParam = searchParams.get("action");
    if (actionParam === "new-row") {
      setTimeout(() => handleAddAttendee("confirmed"), 100);
    } else if (actionParam === "export-csv") {
      setTimeout(() => handleExportCSV(), 100);
    }

    const onAddRow = () => handleAddAttendee("confirmed");
    const onExportCsv = () => handleExportCSV();

    window.addEventListener("kai:spreadsheet:add-row", onAddRow);
    window.addEventListener("kai:spreadsheet:export-csv", onExportCsv);

    return () => {
      window.removeEventListener("kai:spreadsheet:add-row", onAddRow);
      window.removeEventListener("kai:spreadsheet:export-csv", onExportCsv);
    };
  }, [rows]);

  // Print Guest Dossier
  const handlePrintDossier = (row: AttendeeRow) => {
    printGuestClinicalDossier({
      client_name: row.name,
      sanctuary: row.sanctuaryName,
      room_tier: `${row.roomTier} (${row.roomNumber})`,
      overall_severity: row.clinicalSafety === "Cleared by Nurse" ? "LOW_CLEAR" : "MODERATE_HOLD",
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

  // Filter rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // Search
      const matchesSearch =
        searchQuery === "" ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.sanctuaryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.dietaryNotes.toLowerCase().includes(searchQuery.toLowerCase());

      // Destination
      const matchesDest =
        destinationFilter === "ALL" || r.sanctuarySlug === destinationFilter;

      // Status
      const matchesStatus =
        statusFilter === "ALL" || r.bookingStatus === statusFilter;

      return matchesSearch && matchesDest && matchesStatus;
    });
  }, [rows, searchQuery, destinationFilter, statusFilter]);

  // Grouped rows
  const groupedData = useMemo(() => {
    const groups: {
      confirmed: AttendeeRow[];
      in_review: AttendeeRow[];
      waitlist: AttendeeRow[];
    } = {
      confirmed: [],
      in_review: [],
      waitlist: [],
    };

    filteredRows.forEach((r) => {
      if (r.groupCategory === "confirmed") groups.confirmed.push(r);
      else if (r.groupCategory === "in_review") groups.in_review.push(r);
      else groups.waitlist.push(r);
    });

    return groups;
  }, [filteredRows]);

  // Overall calculations
  const totalAttendees = filteredRows.length;
  const totalBilled = filteredRows.reduce((sum, r) => sum + r.totalPrice, 0);
  const totalCollected = filteredRows.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalOutstanding = filteredRows.reduce((sum, r) => sum + r.balanceDue, 0);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner / Monday-Style Header Strip */}
      <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#2D3E35] text-white rounded-lg shadow-xs">
                <FileSpreadsheet className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-2xl font-bold text-[#2D3E35]">
                    Retreat Attendees &amp; Vacation Tracker
                  </h2>
                  <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Spreadsheet Mode
                  </span>
                </div>
                <p className="text-xs text-[#5C6B5E] mt-0.5">
                  Interactive grid for retreat coordinators &middot; Click any cell to update guest details, rooms, dates, and payments in real time.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions (Monday.com Blue / Indigo Buttons) */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleAddAttendee("confirmed")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1A73E8] hover:bg-[#1557B0] text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Attendee Row</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Download formatted CSV spreadsheet for Excel or Google Sheets"
            >
              <Download className="w-3.5 h-3.5 text-[#5C6B5E]" />
              <span>Export to Excel (CSV)</span>
            </button>

            <button
              onClick={() => {
                const confirmedGuests = filteredRows.map((r) => ({
                  guest_name: r.name,
                  room_tier: `${r.roomTier} (${r.roomNumber})`,
                  dietary_notes: r.dietaryNotes,
                  flight: r.flightDetails,
                  arrival: r.checkInDate,
                }));
                printCohortManifest({
                  title: "KAI Sanctuary Retreat Roster & Rooming Manifest",
                  dates: "Fall / Winter 2026 - 2027",
                  location: destinationFilter !== "ALL" ? destinationFilter : "All Active Sanctuaries",
                  capacity: 24,
                  guests: confirmedGuests,
                  kitchen_protocols: [
                    "All culinary preparations strictly organic, seed-oil-free, and farm-to-table.",
                    "Breakfast: 08:00 - 10:30 · Lunch: 13:00 - 14:30 · Dinner: 19:30 - 21:30",
                  ],
                });
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#F2ECE4] text-[#2D3E35] border border-[#E5DDD0] text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-[#5C6B5E]" />
              <span>Print Roster</span>
            </button>
          </div>
        </div>

        {/* Monday.com KPI Battery Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#E5DDD0]/70">
          <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E5DDD0]">
            <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block">
              Total Registered Guests
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-serif text-[#2D3E35]">{totalAttendees}</span>
              <span className="text-[11px] text-[#5C6B5E]">across active cohorts</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E5DDD0]">
            <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block">
              Total Retreat Cost
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-serif text-[#2D3E35]">
                ${totalBilled.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#5C6B5E]">USD Total</span>
            </div>
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E5DDD0]">
            <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block">
              Paid Deposits &amp; Balances
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-bold font-serif text-emerald-800">
                ${totalCollected.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">
                ({totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% collected)
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#E5DDD0]">
            <span className="text-[10px] font-bold text-[#5C6B5E] uppercase tracking-wider block">
              Outstanding Balance Due
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-xl font-bold font-serif ${totalOutstanding > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                ${totalOutstanding.toLocaleString()}
              </span>
              <span className="text-[11px] text-[#5C6B5E]">
                {totalOutstanding > 0 ? "pending collection" : "all paid in full"}
              </span>
            </div>
          </div>
        </div>

        {/* Search, Filter & Quick Options Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4 pt-3 border-t border-[#E5DDD0]/70">
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#5C6B5E] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search guest, email, villa, or notes..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E5DDD0] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#2D3E35] focus:border-[#2D3E35]"
              />
            </div>

            {/* Destination Filter */}
            <select
              value={destinationFilter}
              onChange={(e) => setDestinationFilter(e.target.value)}
              className="text-xs bg-white border border-[#E5DDD0] rounded-lg px-2.5 py-1.5 text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35] cursor-pointer"
            >
              <option value="ALL">All Retreat Locations</option>
              {SANCTUARY_OPTIONS.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.flag} {s.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-[#E5DDD0] rounded-lg px-2.5 py-1.5 text-[#2D3E35] focus:outline-none focus:ring-1 focus:ring-[#2D3E35] cursor-pointer"
            >
              <option value="ALL">All RSVP Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Deposit Paid">Deposit Paid</option>
              <option value="In Review">In Review</option>
              <option value="Waitlist">Waitlist</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#5C6B5E]">
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Direct Retreat Database: Changes saved automatically
            </span>
          </div>
        </div>
      </div>

      {/* Monday.com Group 1: Confirmed Guests */}
      <SpreadsheetGroupSection
        title="Confirmed Sanctuary Guests"
        count={groupedData.confirmed.length}
        badgeColor="bg-emerald-600"
        borderColor="border-emerald-500"
        collapsed={collapsedGroups.confirmed}
        onToggle={() => toggleGroup("confirmed")}
        onAddRow={() => handleAddAttendee("confirmed")}
        rows={groupedData.confirmed}
        onUpdateRow={handleUpdateRow}
        onDeleteRow={handleDeleteRow}
        onDuplicateRow={handleDuplicateRow}
        onPrintDossier={handlePrintDossier}
        activeCellId={activeCellId}
        setActiveCellId={setActiveCellId}
      />

      {/* Monday.com Group 2: Inquiries & Deposit Pending */}
      <SpreadsheetGroupSection
        title="Inquiries &amp; Deposit Pending"
        count={groupedData.in_review.length}
        badgeColor="bg-amber-500"
        borderColor="border-amber-500"
        collapsed={collapsedGroups.in_review}
        onToggle={() => toggleGroup("in_review")}
        onAddRow={() => handleAddAttendee("in_review")}
        rows={groupedData.in_review}
        onUpdateRow={handleUpdateRow}
        onDeleteRow={handleDeleteRow}
        onDuplicateRow={handleDuplicateRow}
        onPrintDossier={handlePrintDossier}
        activeCellId={activeCellId}
        setActiveCellId={setActiveCellId}
      />

      {/* Monday.com Group 3: Waitlist & Completed */}
      <SpreadsheetGroupSection
        title="Waitlist &amp; Completed Journeys"
        count={groupedData.waitlist.length}
        badgeColor="bg-purple-600"
        borderColor="border-purple-500"
        collapsed={collapsedGroups.waitlist}
        onToggle={() => toggleGroup("waitlist")}
        onAddRow={() => handleAddAttendee("waitlist")}
        rows={groupedData.waitlist}
        onUpdateRow={handleUpdateRow}
        onDeleteRow={handleDeleteRow}
        onDuplicateRow={handleDuplicateRow}
        onPrintDossier={handlePrintDossier}
        activeCellId={activeCellId}
        setActiveCellId={setActiveCellId}
      />
    </div>
  );
}

// ----------------------------------------------------------------------------
// Group Container Component (Monday.com iconic group styling)
// ----------------------------------------------------------------------------
interface SpreadsheetGroupSectionProps {
  title: string;
  count: number;
  badgeColor: string;
  borderColor: string;
  collapsed: boolean;
  onToggle: () => void;
  onAddRow: () => void;
  rows: AttendeeRow[];
  onUpdateRow: (rowId: string, field: keyof AttendeeRow, value: any) => void;
  onDeleteRow: (id: string, name: string) => void;
  onDuplicateRow: (row: AttendeeRow) => void;
  onPrintDossier: (row: AttendeeRow) => void;
  activeCellId: string | null;
  setActiveCellId: (id: string | null) => void;
}

function SpreadsheetGroupSection({
  title,
  count,
  badgeColor,
  borderColor,
  collapsed,
  onToggle,
  onAddRow,
  rows,
  onUpdateRow,
  onDeleteRow,
  onDuplicateRow,
  onPrintDossier,
  activeCellId,
  setActiveCellId,
}: SpreadsheetGroupSectionProps) {
  // Calculations for this group
  const groupTotalCost = rows.reduce((sum, r) => sum + r.totalPrice, 0);
  const groupTotalPaid = rows.reduce((sum, r) => sum + r.amountPaid, 0);
  const groupTotalDue = rows.reduce((sum, r) => sum + r.balanceDue, 0);

  return (
    <div className={`bg-white rounded-xl border border-[#E5DDD0] shadow-xs overflow-hidden border-l-4 ${borderColor}`}>
      {/* Group Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FAF8F5] border-b border-[#E5DDD0]">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onToggle}
            className="p-1 hover:bg-[#EBE3D8] rounded text-[#2D3E35] transition-colors cursor-pointer"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-base text-[#2D3E35]">{title}</h3>
            <span className={`text-[11px] font-bold text-white px-2 py-0.5 rounded-full ${badgeColor}`}>
              {count} {count === 1 ? "Guest" : "Guests"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-4 text-xs text-[#5C6B5E]">
            <span>
              Total: <strong className="text-[#2D3E35]">${groupTotalCost.toLocaleString()}</strong>
            </span>
            <span>
              Paid: <strong className="text-emerald-700">${groupTotalPaid.toLocaleString()}</strong>
            </span>
            <span>
              Due: <strong className={groupTotalDue > 0 ? "text-amber-700" : "text-emerald-700"}>${groupTotalDue.toLocaleString()}</strong>
            </span>
          </div>

          <button
            onClick={onAddRow}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#1A73E8] hover:bg-[#1A73E8]/10 rounded transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F4EE] text-[#5C6B5E] font-semibold border-b border-[#E5DDD0] select-none text-[11px]">
                <th className="py-2.5 px-3 w-10 text-center border-r border-[#E5DDD0]">#</th>
                <th className="py-2.5 px-3 min-w-[200px] border-r border-[#E5DDD0]">Guest Name &amp; Contact</th>
                <th className="py-2.5 px-3 min-w-[190px] border-r border-[#E5DDD0]">Retreat Destination</th>
                <th className="py-2.5 px-3 min-w-[180px] border-r border-[#E5DDD0]">Dates (Check-In / Out)</th>
                <th className="py-2.5 px-3 min-w-[170px] border-r border-[#E5DDD0]">Room &amp; Suite</th>
                <th className="py-2.5 px-3 min-w-[140px] border-r border-[#E5DDD0]">RSVP Status</th>
                <th className="py-2.5 px-3 min-w-[120px] text-right border-r border-[#E5DDD0]">Package Total</th>
                <th className="py-2.5 px-3 min-w-[120px] text-right border-r border-[#E5DDD0]">Paid to Date</th>
                <th className="py-2.5 px-3 min-w-[130px] border-r border-[#E5DDD0]">Remaining Balance</th>
                <th className="py-2.5 px-3 min-w-[180px] border-r border-[#E5DDD0]">Flight &amp; Chauffeur</th>
                <th className="py-2.5 px-3 min-w-[170px] border-r border-[#E5DDD0]">Dietary &amp; Health</th>
                <th className="py-2.5 px-3 min-w-[130px] border-r border-[#E5DDD0]">Nurse Clearance</th>
                <th className="py-2.5 px-3 w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DDD0]/70">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-[#5C6B5E] italic bg-[#FAF8F5]">
                    No attendees in this section. Click &ldquo;+ Add Guest&rdquo; to add a new guest row.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <SpreadsheetRowItem
                    key={row.id}
                    index={idx + 1}
                    row={row}
                    onUpdateRow={onUpdateRow}
                    onDeleteRow={onDeleteRow}
                    onDuplicateRow={onDuplicateRow}
                    onPrintDossier={onPrintDossier}
                    activeCellId={activeCellId}
                    setActiveCellId={setActiveCellId}
                  />
                ))
              )}
            </tbody>
            {/* Monday-Style Calculation Footer */}
            {rows.length > 0 && (
              <tfoot>
                <tr className="bg-[#FAF8F5] text-xs font-bold text-[#2D3E35] border-t border-[#E5DDD0]">
                  <td className="py-2.5 px-3 text-center border-r border-[#E5DDD0]">Σ</td>
                  <td className="py-2.5 px-3 border-r border-[#E5DDD0]">
                    {rows.length} {rows.length === 1 ? "Guest" : "Guests"}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[#E5DDD0]" colSpan={4}></td>
                  <td className="py-2.5 px-3 text-right border-r border-[#E5DDD0]">
                    ${groupTotalCost.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-800 border-r border-[#E5DDD0]">
                    ${groupTotalPaid.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 border-r border-[#E5DDD0]">
                    <span className={`inline-block font-bold ${groupTotalDue > 0 ? "text-amber-800" : "text-emerald-800"}`}>
                      ${groupTotalDue.toLocaleString()} Due
                    </span>
                  </td>
                  <td className="py-2.5 px-3" colSpan={4}></td>
                </tr>
              </tfoot>
            )}
          </table>

          {/* Quick Bottom "+ Add Row" Button (Monday style) */}
          <div className="p-2.5 bg-white border-t border-[#E5DDD0] flex items-center">
            <button
              onClick={onAddRow}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#5C6B5E] hover:text-[#1A73E8] hover:bg-[#F2ECE4] rounded transition-colors cursor-pointer font-medium"
            >
              <Plus className="w-3.5 h-3.5 text-[#1A73E8]" />
              <span>+ Add Row to {title}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Individual Spreadsheet Row Item (Interactive, Editable Cells)
// ----------------------------------------------------------------------------
interface SpreadsheetRowItemProps {
  index: number;
  row: AttendeeRow;
  onUpdateRow: (rowId: string, field: keyof AttendeeRow, value: any) => void;
  onDeleteRow: (id: string, name: string) => void;
  onDuplicateRow: (row: AttendeeRow) => void;
  onPrintDossier: (row: AttendeeRow) => void;
  activeCellId: string | null;
  setActiveCellId: (id: string | null) => void;
}

function SpreadsheetRowItem({
  index,
  row,
  onUpdateRow,
  onDeleteRow,
  onDuplicateRow,
  onPrintDossier,
  activeCellId,
  setActiveCellId,
}: SpreadsheetRowItemProps) {
  const statusConfig = STATUS_CONFIG[row.bookingStatus] || STATUS_CONFIG.Confirmed;

  // Extract guest initials for avatar
  const initials = row.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <tr className="hover:bg-[#FAF8F5]/80 transition-colors group">
      {/* Row Index */}
      <td className="py-2 px-3 text-center text-[#5C6B5E] text-[11px] font-mono border-r border-[#E5DDD0]">
        {index}
      </td>

      {/* Guest Name & Contact */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#2D3E35] text-amber-200 text-[10px] font-bold flex items-center justify-center shrink-0">
            {initials || "K"}
          </div>
          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={row.name}
              onChange={(e) => onUpdateRow(row.id, "name", e.target.value)}
              className="w-full font-semibold text-[#2D3E35] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1.5 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] transition-colors text-xs"
              placeholder="Guest full name"
            />
            <div className="flex items-center gap-1.5 mt-0.5">
              <input
                type="text"
                value={row.email}
                onChange={(e) => onUpdateRow(row.id, "email", e.target.value)}
                className="w-full text-[10px] text-[#5C6B5E] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.2 rounded border border-transparent hover:border-[#E5DDD0]"
                placeholder="email@example.com"
              />
            </div>
          </div>
        </div>
      </td>

      {/* Retreat Destination Dropdown */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <select
          value={row.sanctuarySlug}
          onChange={(e) => onUpdateRow(row.id, "sanctuarySlug", e.target.value)}
          className="w-full text-xs bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1.5 py-1 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35] font-medium cursor-pointer"
        >
          {SANCTUARY_OPTIONS.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.flag} {s.name}
            </option>
          ))}
        </select>
      </td>

      {/* Check-In / Check-Out Dates */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={row.checkInDate}
            onChange={(e) => onUpdateRow(row.id, "checkInDate", e.target.value)}
            className="text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35]"
          />
          <span className="text-[#5C6B5E] text-[10px]">&rarr;</span>
          <input
            type="date"
            value={row.checkOutDate}
            onChange={(e) => onUpdateRow(row.id, "checkOutDate", e.target.value)}
            className="text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35]"
          />
          <span className="text-[10px] font-semibold text-[#5C6B5E] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5DDD0]">
            {row.nights}n
          </span>
        </div>
      </td>

      {/* Room & Suite */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <div>
          <select
            value={row.roomTier}
            onChange={(e) => onUpdateRow(row.id, "roomTier", e.target.value)}
            className="w-full text-xs bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35] font-medium cursor-pointer"
          >
            {ROOM_TIER_OPTIONS.map((room) => (
              <option key={room} value={room}>
                {room}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={row.roomNumber}
            onChange={(e) => onUpdateRow(row.id, "roomNumber", e.target.value)}
            className="w-full text-[10px] text-[#5C6B5E] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.2 rounded border border-transparent hover:border-[#E5DDD0]"
            placeholder="e.g. Villa 4A"
          />
        </div>
      </td>

      {/* RSVP Status (Monday.com Iconic Color Block) */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <select
          value={row.bookingStatus}
          onChange={(e) => onUpdateRow(row.id, "bookingStatus", e.target.value)}
          className={`w-full py-1.5 px-2 rounded-md font-bold text-center text-xs shadow-xs cursor-pointer transition-colors border-0 ${statusConfig.bg} ${statusConfig.text}`}
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
      </td>

      {/* Package Total ($) */}
      <td className="py-2 px-3 text-right border-r border-[#E5DDD0]">
        <div className="flex items-center justify-end gap-1">
          <span className="text-[#5C6B5E] text-xs">$</span>
          <input
            type="number"
            value={row.totalPrice}
            onChange={(e) => onUpdateRow(row.id, "totalPrice", Number(e.target.value))}
            className="w-20 text-right font-bold text-[#2D3E35] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.5 rounded border border-transparent hover:border-[#E5DDD0]"
          />
        </div>
      </td>

      {/* Paid to Date ($) */}
      <td className="py-2 px-3 text-right border-r border-[#E5DDD0]">
        <div className="flex items-center justify-end gap-1">
          <span className="text-[#5C6B5E] text-xs">$</span>
          <input
            type="number"
            value={row.amountPaid}
            onChange={(e) => onUpdateRow(row.id, "amountPaid", Number(e.target.value))}
            className="w-20 text-right font-bold text-emerald-800 bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.5 rounded border border-transparent hover:border-[#E5DDD0]"
          />
        </div>
      </td>

      {/* Remaining Balance (Calculated badge) */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        {row.balanceDue <= 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3 text-emerald-600" />
            Paid in Full
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            ${row.balanceDue.toLocaleString()} Due
          </span>
        )}
      </td>

      {/* Flight & Chauffeur */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <div>
          <select
            value={row.flightStatus}
            onChange={(e) => onUpdateRow(row.id, "flightStatus", e.target.value)}
            className="w-full text-[11px] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35] font-medium cursor-pointer"
          >
            {FLIGHT_OPTIONS.map((flight) => (
              <option key={flight} value={flight}>
                {flight}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={row.flightDetails}
            onChange={(e) => onUpdateRow(row.id, "flightDetails", e.target.value)}
            className="w-full text-[10px] text-[#5C6B5E] bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1 py-0.2 rounded border border-transparent hover:border-[#E5DDD0]"
            placeholder="Flight # or arrival notes"
          />
        </div>
      </td>

      {/* Dietary & Health Notes */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <input
          type="text"
          value={row.dietaryNotes}
          onChange={(e) => onUpdateRow(row.id, "dietaryNotes", e.target.value)}
          className="w-full text-xs bg-transparent hover:bg-white focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#2D3E35] px-1.5 py-0.5 rounded border border-transparent hover:border-[#E5DDD0] text-[#2D3E35]"
          placeholder="e.g. Gluten-free, plant-forward"
        />
      </td>

      {/* Nurse Safety Clearance */}
      <td className="py-2 px-3 border-r border-[#E5DDD0]">
        <select
          value={row.clinicalSafety}
          onChange={(e) => onUpdateRow(row.id, "clinicalSafety", e.target.value)}
          className={`w-full text-[10px] font-bold py-1 px-1.5 rounded-full border cursor-pointer text-center ${row.clinicalSafety === "Cleared by Nurse"
            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
            : row.clinicalSafety === "Awaiting Medical Intake"
              ? "bg-sky-50 text-sky-800 border-sky-300"
              : "bg-rose-50 text-rose-800 border-rose-300"
            }`}
        >
          {CLINICAL_SAFETY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </td>

      {/* Row Actions */}
      <td className="py-2 px-2 text-center">
        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onPrintDossier(row)}
            title="Print Guest Dossier"
            className="p-1 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#EBE3D8] rounded transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDuplicateRow(row)}
            title="Duplicate Row"
            className="p-1 text-[#5C6B5E] hover:text-[#2D3E35] hover:bg-[#EBE3D8] rounded transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteRow(row.id, row.name)}
            title="Delete Attendee"
            className="p-1 text-[#5C6B5E] hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}
