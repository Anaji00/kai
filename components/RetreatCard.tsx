"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle,
  ChevronDown,
  Clock,
  MapPin,
  Sparkles,
  Sun,
  Users,
  X,
} from "lucide-react";
import { Retreat } from "@/lib/types";

interface RetreatCardProps {
  retreat: Retreat;
  priority?: boolean;
  isExpanded: boolean;
  /** Another card is open, so focus should not jump back to this one as it closes. */
  anotherCardOpen: boolean;
  onToggle: () => void;
}

type PanelTab = "overview" | "rhythm" | "included" | "weather";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-[11px] uppercase tracking-widest font-semibold text-olive mb-2.5">{children}</h4>;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-relaxed text-sage/85">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <CheckCircle className="h-4 w-4 text-terracotta shrink-0 mt-0.5" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RetreatDetailTabs({ retreat }: { retreat: Retreat }) {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<PanelTab>("overview");
  const tabRefs = useRef<Partial<Record<PanelTab, HTMLButtonElement | null>>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const selectTab = (tab: PanelTab) => {
    setActiveTab(tab);
    tabRefs.current[tab]?.scrollIntoView({ inline: "nearest", block: "nearest" });
    // A new tab starts at its top, not wherever the previous one was scrolled to.
    const scroller = rootRef.current?.parentElement;
    if (scroller) scroller.scrollTop = 0;
  };

  const tabs: { id: PanelTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "rhythm", label: "Daily Rhythm" },
    { id: "included", label: "What's Included" },
    ...(retreat.weatherProfile ? [{ id: "weather" as const, label: "Weather & Packing" }] : []),
  ];

  // Arrow keys move between tabs, as they do in native tab controls.
  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!offset) return;
    event.preventDefault();
    const next = tabs[(index + offset + tabs.length) % tabs.length];
    selectTab(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const weather = retreat.weatherProfile;

  return (
    <div ref={rootRef}>
      <div
        role="tablist"
        aria-label={`${retreat.title} details`}
        className="z-10 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-sand-border bg-linen [scrollbar-width:none] lg:sticky lg:top-0"
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-terracotta rounded-t-lg ${
                selected ? "border-terracotta text-sage" : "border-transparent text-sage/60 hover:text-sage"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeTab}`}
        aria-labelledby={`${baseId}-tab-${activeTab}`}
        tabIndex={0}
        className="pt-5 min-h-[18rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta rounded-lg"
      >
        {activeTab === "overview" && (
          <div className="space-y-6">
            <p className="text-sm leading-relaxed text-sage/85">{retreat.description}</p>
            <div>
              <SectionHeading>Clinical & Somatic Core</SectionHeading>
              <BulletList items={retreat.clinicalFocus} />
            </div>
            <div>
              <SectionHeading>Practices</SectionHeading>
              <BulletList items={retreat.somaticPractices} />
            </div>
            {retreat.culturalIntegrations && retreat.culturalIntegrations.length > 0 && (
              <div>
                <SectionHeading>Cultural Integrations</SectionHeading>
                <BulletList items={retreat.culturalIntegrations} />
              </div>
            )}
          </div>
        )}

        {activeTab === "rhythm" && (
          <ol className="space-y-3">
            {retreat.schedule.map((day) => (
              <li key={day.day} className="rounded-2xl border border-sand-border/70 bg-white/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sand px-2.5 py-0.5 text-[10px] font-semibold text-olive">{day.day}</span>
                  <span className="font-medium text-sm text-sage">{day.title}</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm leading-relaxed text-sage/80 list-disc pl-5">
                  {day.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}

        {activeTab === "included" && (
          <div className="space-y-6">
            <div>
              <SectionHeading>Where You'll Stay</SectionHeading>
              <p className="text-sm leading-relaxed text-sage/85">{retreat.accommodations}</p>
            </div>
            <div>
              <SectionHeading>Included in Your Retreat</SectionHeading>
              <BulletList items={retreat.inclusions} />
            </div>
          </div>
        )}

        {activeTab === "weather" && weather && (
          <div className="space-y-6">
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "High", value: `${weather.avgHighF}°F` },
                { label: "Low", value: `${weather.avgLowF}°F` },
                { label: "Ocean", value: `${weather.oceanTempF}°F` },
                { label: "UV index", value: weather.uvIndex.split(" ")[0] },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-sand/60 border border-sand-border/70 px-3 py-2.5">
                  <dt className="text-[10px] uppercase tracking-wider text-sage/60">{stat.label}</dt>
                  <dd className="font-serif text-xl text-sage">{stat.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm leading-relaxed text-sage/85">{weather.climateSummary}</p>
            <div>
              <SectionHeading>What to Wear</SectionHeading>
              <dl className="space-y-2 text-sm leading-relaxed text-sage/85">
                <div>
                  <dt className="font-medium text-sage inline">Morning practice: </dt>
                  <dd className="inline">{weather.whatToWear.morningPractice}</dd>
                </div>
                <div>
                  <dt className="font-medium text-sage inline">Daytime: </dt>
                  <dd className="inline">{weather.whatToWear.daytimeExcursion}</dd>
                </div>
                <div>
                  <dt className="font-medium text-sage inline">Evening: </dt>
                  <dd className="inline">{weather.whatToWear.eveningDining}</dd>
                </div>
              </dl>
            </div>
            <div>
              <SectionHeading>What to Pack</SectionHeading>
              <BulletList items={weather.whatToPack} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RetreatCard({ retreat, priority = false, isExpanded, anotherCardOpen, onToggle }: RetreatCardProps) {
  const isComingSoon = retreat.status === "coming-soon" || retreat.dates.toLowerCase().includes("coming soon");
  const reduceMotion = useReducedMotion();
  const panelId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const exploreButtonRef = useRef<HTMLButtonElement>(null);
  const wasExpanded = useRef(false);

  const statusLabel = isComingSoon ? "Coming Soon" : `${retreat.spotsRemaining} spots left`;
  const reserveLabel = isComingSoon ? "Join Waitlist" : "Reserve";

  // The opened card moves to span its row, so bring it into view and hand keyboard focus to its content.
  // On close, focus returns to the control that opened it, unless the user has moved on to another card.
  useEffect(() => {
    if (isExpanded && !wasExpanded.current) {
      panelRef.current?.focus({ preventScroll: true });
      cardRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    } else if (!isExpanded && wasExpanded.current && !anotherCardOpen) {
      exploreButtonRef.current?.focus({ preventScroll: true });
      cardRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    }
    wasExpanded.current = isExpanded;
  }, [isExpanded, anotherCardOpen, reduceMotion]);

  // The whole closed card is a click target, except its own links and buttons, or while selecting text.
  const onCardClick = (event: React.MouseEvent) => {
    if (isExpanded) return;
    if ((event.target as HTMLElement).closest("a, button")) return;
    if (window.getSelection()?.toString()) return;
    onToggle();
  };

  return (
    <motion.article
      ref={cardRef}
      // Neighbours glide to their new places; the opened card itself stays put so scrolling to it is accurate.
      layout={reduceMotion || isExpanded ? false : "position"}
      transition={{ duration: 0.3, ease: "easeOut" }}
      onClick={onCardClick}
      className={`group scroll-mt-24 overflow-clip rounded-3xl border bg-linen transition-shadow duration-300 ${
        isExpanded
          ? "col-span-full border-terracotta/40 shadow-lg"
          : "flex flex-col border-sand-border shadow-sm hover:shadow-md cursor-pointer"
      }`}
    >
      <div className={isExpanded ? "lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:h-[min(calc(100dvh-7.5rem),46rem)]" : "flex flex-1 flex-col"}>
        {/* Image */}
        <div className={`relative w-full overflow-hidden bg-sand ${isExpanded ? "h-64 sm:h-80 lg:h-full" : "h-72"}`}>
          <Image
            src={retreat.heroImage}
            alt=""
            fill
            priority={priority}
            // One size for both states, so opening a card never reloads a blank image.
            sizes="(max-width: 1024px) 100vw, 42vw"
            className={`object-cover transition-transform duration-700 ${isExpanded ? "" : "group-hover:scale-105"}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/90 via-sage-dark/30 to-transparent" />

          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
            <span className="min-w-0 truncate rounded-full bg-linen/90 backdrop-blur-md px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-sage border border-sand-border/80">
              {retreat.destination}
            </span>
            <span className="shrink-0 rounded-full bg-terracotta/90 backdrop-blur-md px-3 py-1 text-[11px] font-medium text-linen shadow-sm">
              {statusLabel}
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 text-linen">
            <span className="text-[11px] uppercase tracking-wider text-sand-muted block">
              {retreat.dates} • {retreat.duration}
            </span>
            <h3 className="font-serif text-2xl font-normal leading-tight text-linen drop-shadow-sm">{retreat.title}</h3>
          </div>
        </div>

        {isExpanded ? (
          <AnimatePresence initial>
            <motion.div
              ref={panelRef}
              id={panelId}
              tabIndex={-1}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex min-w-0 flex-col focus:outline-none lg:h-full lg:min-h-0"
            >
              <div className="flex items-start justify-between gap-3 px-6 pt-6 sm:px-8">
                <p className="font-serif text-lg leading-snug text-sage">{retreat.tagline}</p>
                <button
                  type="button"
                  onClick={onToggle}
                  aria-expanded="true"
                  aria-controls={panelId}
                  aria-label={`Close details for ${retreat.title}`}
                  className="shrink-0 rounded-full border border-sand-border bg-sand p-2 text-sage hover:bg-sand-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {/* Key facts stay visible whichever tab is open */}
              <ul className="flex flex-wrap gap-x-5 gap-y-2 px-6 pt-4 text-xs text-sage/80 sm:px-8">
                <li className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5 text-olive" aria-hidden="true" /> {retreat.dates}
                </li>
                <li className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-olive" aria-hidden="true" /> {retreat.duration}
                </li>
                <li className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-olive" aria-hidden="true" /> {retreat.spotsTotal} guests max
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-olive" aria-hidden="true" /> {retreat.country}
                </li>
              </ul>

              <div className="min-h-0 flex-1 px-6 pb-6 mt-4 sm:px-8 lg:overflow-y-auto">
                <RetreatDetailTabs retreat={retreat} />
                <Link
                  href={`/retreats/${retreat.slug}`}
                  className="mt-5 inline-flex items-center gap-1 text-xs font-medium text-terracotta underline underline-offset-4 sm:hidden"
                >
                  See the full retreat page
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>

              {/* Next steps stay in reach while the content scrolls */}
              <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-sand-border/70 bg-linen px-6 py-4 sm:px-8">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-sage/60 block">Starting From</span>
                  <span className="font-serif text-xl font-medium text-sage">{retreat.investmentStarting}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/retreats/${retreat.slug}`}
                    className="hidden sm:block rounded-full border border-sand-border bg-sand px-4 py-2.5 text-xs font-medium text-sage hover:bg-sand-muted transition-colors"
                  >
                    Full Retreat Page
                  </Link>
                  <Link
                    href={`/book?retreat=${retreat.id}`}
                    className="flex items-center gap-1.5 rounded-full bg-sage px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-linen hover:bg-sage-dark transition-all shadow-sm"
                  >
                    <span>{reserveLabel}</span>
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="flex flex-1 flex-col justify-between gap-6 p-6 sm:p-7">
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-sage/80 line-clamp-3">{retreat.description}</p>

              <div className="space-y-2 border-t border-b border-sand-border/60 py-3.5">
                <div className="flex items-center gap-2 text-xs font-medium text-olive">
                  <Sparkles className="h-3.5 w-3.5 text-terracotta" aria-hidden="true" />
                  <span className="uppercase tracking-wider text-[10px]">Clinical & Somatic Core</span>
                </div>
                <ul className="space-y-1.5 text-xs text-sage/85">
                  {retreat.clinicalFocus.slice(0, 2).map((focus) => (
                    <li key={focus} className="flex items-start gap-2">
                      <span className="text-terracotta text-sm leading-none" aria-hidden="true">•</span>
                      <span className="line-clamp-1">{focus}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs text-sage/75 pt-1">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-olive shrink-0" aria-hidden="true" />
                  <span>{retreat.spotsTotal} guests max</span>
                </div>
                {retreat.weatherProfile ? (
                  <div className="flex items-center gap-1 text-[11px] text-olive font-medium bg-sand/70 px-2 py-0.5 rounded-full border border-sand-border/60">
                    <Sun className="h-3 w-3 text-terracotta" aria-hidden="true" />
                    <span>{retreat.weatherProfile.avgHighF}°F • Dry Season</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 justify-end">
                    <MapPin className="h-3.5 w-3.5 text-olive shrink-0" aria-hidden="true" />
                    <span>{retreat.country}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3 border-t border-sand-border/60 pt-4">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] uppercase tracking-wider text-sage/60">Starting From</span>
                <span className="font-serif text-xl font-medium text-sage">{retreat.investmentStarting}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  ref={exploreButtonRef}
                  type="button"
                  onClick={onToggle}
                  aria-expanded="false"
                  aria-label={`Explore ${retreat.title}`}
                  className="flex items-center justify-center gap-1 rounded-full border border-sand-border bg-sand px-3 py-2.5 text-xs font-medium text-sage hover:bg-sand-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta"
                >
                  <span>Explore</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
                </button>
                <Link
                  href={`/book?retreat=${retreat.id}`}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-sage px-3 py-2.5 text-xs font-medium uppercase tracking-wider text-linen hover:bg-sage-dark transition-all shadow-sm"
                >
                  <span>{isComingSoon ? "Waitlist" : "Reserve"}</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.article>
  );
}
