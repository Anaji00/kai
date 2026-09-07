"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw, Compass } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("KAI Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-terracotta-soft text-terracotta border border-terracotta/30">
          <AlertCircle className="h-7 w-7" />
        </div>

        <span className="inline-block text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
          System Interruption
        </span>

        <h1 className="font-serif text-3xl sm:text-5xl text-sage font-light">
          An Unexpected Ripple
        </h1>

        <p className="text-sm text-sage/80 leading-relaxed font-light">
          A temporary disturbance occurred while rendering this view. Our team has been notified, and your sanctuary state remains secure.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3.5 text-xs uppercase tracking-widest text-linen font-medium hover:bg-sage-dark transition-all shadow"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-sand-border bg-sand px-6 py-3.5 text-xs uppercase tracking-widest text-sage font-medium hover:bg-sand-muted transition-all"
          >
            <Compass className="h-3.5 w-3.5 text-olive" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
