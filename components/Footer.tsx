"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { Compass, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { subscribeNewsletter } from "@/app/actions/booking";

export default function Footer() {
  const [state, formAction, isPending] = useActionState(subscribeNewsletter, {
    success: false,
    message: "",
  });

  return (
    <footer className="border-t border-sand-border bg-sand/60 text-sage pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-sand-border/80">
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linen border border-sand-border">
                <span className="font-serif text-lg font-light text-sage">界</span>
              </div>
              <div>
                <span className="font-serif text-2xl tracking-[0.2em] uppercase font-light">
                  KAI
                </span>
                <span className="block text-[9px] uppercase tracking-[0.25em] text-olive font-medium">
                  Wellness Retreats
                </span>
              </div>
            </div>

            <p className="font-serif italic text-lg text-sage/90">
              &ldquo;Kai means renewal in Japanese. A return to balance. To presence. To yourself.&rdquo;
            </p>

            <p className="text-xs leading-relaxed text-sage/75">
              Immersive somatic sanctuaries thoughtfully curated by Kareena Islam. Rooted in restorative wellness science, anatomical yoga, crystal sound resonance, and high-touch luxury travel.
            </p>

            {/* Social & Partner Badges */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://www.instagram.com/kaiwellnessretreats/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-sand-border bg-linen px-3.5 py-1.5 text-xs text-sage hover:text-terracotta hover:border-terracotta transition-colors"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
                <span>@kaiwellnessretreats</span>
              </a>

              <a
                href="https://www.instagram.com/kareenatravelrn/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-sand-border bg-linen px-3.5 py-1.5 text-xs text-sage hover:text-terracotta hover:border-terracotta transition-colors"
              >
                <InstagramIcon className="h-3.5 w-3.5" />
                <span>@kareenatravelrn</span>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Sanctuaries
            </h4>
            <ul className="space-y-2 text-xs text-sage/80">
              <li>
                <Link href="/retreats" className="hover:text-terracotta transition-colors">
                  All 2026–2027 Retreats
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=nosara-2027" className="hover:text-terracotta transition-colors">
                  Nosara, Costa Rica (Feb 2027)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=amalfi-2027" className="hover:text-terracotta transition-colors">
                  Amalfi Coast, Italy (May 2027)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=bali-2027" className="hover:text-terracotta transition-colors">
                  Ubud & Sidemen, Bali (Sep 2027)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=riviera-2026" className="hover:text-terracotta transition-colors">
                  Riviera Maya, Mexico (Fall 2026)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=custom" className="hover:text-terracotta transition-colors">
                  Private & Custom Groups
                </Link>
              </li>
            </ul>
          </div>

          {/* Founder & Clinical Pillars */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Foundation
            </h4>
            <ul className="space-y-2 text-xs text-sage/80">
              <li>
                <Link href="/about" className="hover:text-terracotta transition-colors">
                  Meet Kareena Islam
                </Link>
              </li>
              <li>
                <Link href="/about#clinical-science" className="hover:text-terracotta transition-colors">
                  Clinical Restorative Science
                </Link>
              </li>
              <li>
                <Link href="/about#triad-of-care" className="hover:text-terracotta transition-colors">
                  The Triad of Care
                </Link>
              </li>
              <li>
                <a
                  href="https://grandtravelcruise.com/about-us/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-terracotta transition-colors flex items-center gap-1"
                >
                  <span>Grand Travel & Cruise</span>
                  <Compass className="h-3 w-3" />
                </a>
              </li>
              <li>
                <Link href="/book" className="hover:text-terracotta transition-colors">
                  Sanctuary Reservations
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter / Waitlist */}
          <div className="md:col-span-4 space-y-4">
            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Intimate Retreat Announcements
            </h4>
            <p className="text-xs text-sage/75 leading-relaxed">
              Because our retreats maintain an intimate capacity of 12 to 14 guests, openings are released privately to our circle first.
            </p>

            {state.success ? (
              <div className="flex items-center gap-2 rounded-2xl bg-olive-soft border border-olive/30 p-3 text-xs text-sage">
                <CheckCircle2 className="h-4 w-4 text-olive shrink-0" />
                <span>{state.message}</span>
              </div>
            ) : (
              <form action={formAction} className="space-y-2">
                <div className="flex rounded-full border border-sand-border bg-linen p-1 focus-within:border-olive transition-colors">
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter your email address"
                    className="w-full bg-transparent px-4 py-2 text-xs text-sage placeholder:text-sage/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-full bg-sage px-4 py-2 text-xs font-medium uppercase tracking-wider text-linen hover:bg-sage-dark transition-colors disabled:opacity-50"
                  >
                    {isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <span>Join</span>
                        <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
                <span className="block text-[10px] text-sage/60">
                  Zero spam. Sacred privacy. Unsubscribe at any time.
                </span>
              </form>
            )}

            {/* Travel Partner Badge */}
            <div className="rounded-2xl border border-sand-border bg-linen/70 p-3.5 text-xs text-sage/80 flex items-start gap-3">
              <Compass className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-sage block">
                  Curated with Grand Travel & Cruise
                </span>
                <span className="text-[11px] text-sage/70">
                  25+ years of luxury travel mastery. <em>Future Leaders in Travel</em> Honoree.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] text-sage/60 leading-relaxed">
          <div className="max-w-2xl">
            <p>
              <strong className="font-medium text-sage/75">Clinical Somatics Notice:</strong> KAI Wellness Retreats provides restorative somatic movement, parasympathetic breathwork, and wellness guidance led by Kareena Islam. Programming is designed for nervous system restoration and stress alleviation; it is not a substitute for diagnostic medical care or acute clinical intervention.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center md:text-right shrink-0">
            <span>© {new Date().getFullYear()} KAI Wellness Retreats. All rights reserved.</span>
            <span>#LivingBIG • Be In Gratitude</span>
            <a
              href="/api/v1/health"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-olive transition-colors text-[10px] text-sage/75"
              title="FastAPI Backend Health & OpenAPI Documentation"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-olive animate-pulse" />
              <span>API Engine: Active</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
