import React from "react";
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sand border border-sand-border">
          <span className="font-serif text-xl font-light text-sage animate-pulse">界</span>
        </div>
        <div className="flex items-center gap-2 text-sage">
          <Loader2 className="h-4 w-4 animate-spin text-terracotta" />
          <span className="font-serif text-sm tracking-widest uppercase text-sage/75">
            Holding Space...
          </span>
        </div>
      </div>
    </div>
  );
}
