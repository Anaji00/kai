"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Download,
  Copy,
  Check,
  Plane,
  Clock,
  MapPin,
  Sparkles,
  Users,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import {
  fetchCalendarEvents,
  createCalendarEvent,
  getCalendarIcsFeedUrl,
  CalendarEvent
} from "@/lib/sidecar-api";

export default function OperatorCalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSanctuary, setSelectedSanctuary] = useState("ALL");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedFeed, setCopiedFeed] = useState(false);

  // New Event Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("CONSULTATION");
  const [newSanctuary, setNewSanctuary] = useState("nosara");
  const [newGuestName, setNewGuestName] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await fetchCalendarEvents(selectedSanctuary, selectedCategory);
      setEvents(data);
    } catch (err) {
      console.error("Error loading calendar events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [selectedSanctuary, selectedCategory]);

  const handleCopyFeedUrl = () => {
    const feedUrl = `${window.location.origin}${getCalendarIcsFeedUrl()}`;
    navigator.clipboard.writeText(feedUrl);
    setCopiedFeed(true);
    setTimeout(() => setCopiedFeed(false), 2500);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStartTime) return;
    setSubmitting(true);
    try {
      const startDate = new Date(newStartTime);
      const endDate = new Date(startDate.getTime() + 20 * 60000); // 20 mins default
      await createCalendarEvent({
        title: newTitle,
        category: newCategory,
        sanctuary_slug: newSanctuary,
        guest_name: newGuestName || undefined,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        notes: newNotes || undefined,
        location: "Phone / Google Meet"
      });
      setShowAddModal(false);
      setNewTitle("");
      setNewGuestName("");
      setNewStartTime("");
      setNewNotes("");
      await loadEvents();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "COHORT":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <Users className="w-3 h-3" />
            Retreat Cohort (12–14 Max)
          </span>
        );
      case "CONSULTATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <Clock className="w-3 h-3" />
            20-Min Alignment Consultation
          </span>
        );
      case "FLIGHT_ARRIVAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 border border-sky-500/30 text-sky-400">
            <Plane className="w-3 h-3" />
            Smart Flight Arrival (Cirium)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-700/50 text-stone-300">
            {category}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-stone-900/80 border border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-serif text-stone-100">Retreat & Alignment Calendar</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
              Live Feed Active
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Visual schedule for intimate retreat dates, guest alignment calls, and Grand Travel VIP airport arrivals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyFeedUrl}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 transition-colors"
          >
            {copiedFeed ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-stone-400" />}
            <span>{copiedFeed ? "iCal URL Copied!" : "Subscribe to iCal Feed"}</span>
          </button>

          <a
            href={getCalendarIcsFeedUrl()}
            download="kai_retreat_calendar.ics"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-medium text-stone-200 transition-colors"
          >
            <Download className="w-4 h-4 text-stone-400" />
            <span>Download .ics</span>
          </a>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Consultation</span>
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-stone-900/50 border border-stone-800">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-stone-400" />
          <span className="text-xs font-medium text-stone-400">Sanctuary:</span>
          {["ALL", "nosara", "amalfi", "bali", "riviera-maya"].map(slug => (
            <button
              key={slug}
              onClick={() => setSelectedSanctuary(slug)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                selectedSanctuary === slug
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 font-medium"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
              }`}
            >
              {slug === "ALL" ? "All Sanctuaries" : slug.charAt(0).toUpperCase() + slug.slice(1).replace("-", " ")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-stone-400">Category:</span>
          {["ALL", "COHORT", "CONSULTATION", "FLIGHT_ARRIVAL"].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                selectedCategory === cat
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300 font-medium"
                  : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/50"
              }`}
            >
              {cat === "ALL" ? "All Events" : cat.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Events Timeline */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">
          Loading retreat schedule & consultations...
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center text-xs text-stone-500 bg-stone-900/30 rounded-2xl border border-stone-800/60">
          No calendar events match the selected filters.
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(ev => {
            const startDate = new Date(ev.start_time);
            const dateStr = startDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric"
            });
            const timeStr = startDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit"
            });

            return (
              <div
                key={ev.id}
                className="p-5 rounded-2xl bg-stone-900/60 border border-stone-800 hover:border-stone-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-stone-800/80 border border-stone-700 flex flex-col items-center justify-center text-center shrink-0">
                    <span className="text-[10px] uppercase font-semibold text-amber-400">
                      {startDate.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span className="text-base font-bold text-stone-100 leading-none">
                      {startDate.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="text-sm font-semibold text-stone-100">{ev.title}</h3>
                      {getCategoryBadge(ev.category)}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-stone-400 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        {dateStr} at {timeStr}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-500" />
                          {ev.location}
                        </span>
                      )}
                      {ev.guest_name && (
                        <span className="text-stone-300 font-medium">
                          Guest: {ev.guest_name}
                        </span>
                      )}
                    </div>

                    {ev.notes && (
                      <p className="text-xs text-stone-400/90 pt-1 leading-relaxed">
                        {ev.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-stone-800/60 text-stone-400 border border-stone-700/50">
                    {ev.sanctuary_slug ? ev.sanctuary_slug.toUpperCase() : "GENERAL"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 text-stone-200 space-y-4">
            <h2 className="text-base font-serif text-stone-100">Schedule 20-Min Alignment Consultation</h2>
            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-400 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={newGuestName}
                  onChange={e => {
                    setNewGuestName(e.target.value);
                    if (!newTitle) setNewTitle(`20-Min Alignment Call: ${e.target.value}`);
                  }}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Event Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. 20-Min Alignment Call: Sarah Jenkins"
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-400 mb-1">Sanctuary</label>
                  <select
                    value={newSanctuary}
                    onChange={e => setNewSanctuary(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="nosara">Nosara, Costa Rica</option>
                    <option value="amalfi">Amalfi Coast, Italy</option>
                    <option value="bali">Bali Sanctuary</option>
                    <option value="riviera-maya">Riviera Maya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-400 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 mb-1">Clinical Prep Notes</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  rows={2}
                  placeholder="e.g. Discuss insomnia baseline, 4-7-8 vagal reset, and private villa suite."
                  className="w-full px-3 py-2 bg-stone-950 border border-stone-800 rounded-lg text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-stone-800 text-stone-300 hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold"
                >
                  {submitting ? "Booking..." : "Book Call"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
