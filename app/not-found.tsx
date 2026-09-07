import React from "react";
import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-xl mx-auto text-center space-y-6">
        <span className="inline-block rounded-full bg-sand px-4 py-1 text-xs uppercase tracking-[0.25em] text-olive font-semibold border border-sand-border">
          404 Sanctuary Notice
        </span>

        <h1 className="font-serif text-4xl sm:text-6xl text-sage font-light tracking-tight">
          A Moment to Pause
        </h1>

        <p className="text-sm sm:text-base text-sage/80 leading-relaxed font-light">
          The path you are seeking does not exist or has been relocated to another sanctuary. Take a slow, restorative breath and allow us to guide you back to center.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/retreats"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3.5 text-xs uppercase tracking-widest text-linen font-medium hover:bg-sage-dark transition-all shadow"
          >
            <span>Explore Sanctuaries</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

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
