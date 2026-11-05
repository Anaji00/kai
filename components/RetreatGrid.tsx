"use client";

import React, { useEffect, useState } from "react";
import { LayoutGroup } from "framer-motion";
import { Retreat } from "@/lib/types";
import RetreatCard from "@/components/RetreatCard";

interface RetreatGridProps {
  retreats: Retreat[];
  className: string;
  /** Number of leading cards whose images load eagerly. */
  priorityCount?: number;
}

// One card opens at a time, so comparing retreats never leaves a stack of long panels to scroll past.
export default function RetreatGrid({ retreats, className, priorityCount = 1 }: RetreatGridProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!expandedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expandedId]);

  return (
    <LayoutGroup>
      <div className={className}>
        {retreats.map((retreat, idx) => (
          <RetreatCard
            key={retreat.id}
            retreat={retreat}
            priority={idx < priorityCount}
            isExpanded={expandedId === retreat.id}
            anotherCardOpen={expandedId !== null && expandedId !== retreat.id}
            onToggle={() => setExpandedId((current) => (current === retreat.id ? null : retreat.id))}
          />
        ))}
      </div>
    </LayoutGroup>
  );
}
