"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { Compass, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { subscribeNewsletter } from "@/app/actions/booking";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const [state, formAction, isPending] = useActionState(subscribeNewsletter, {
    success: false,
    message: "",
  });

  // The portal has its own footer.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) return null;

  return (
    <footer className="border-t border-sand-border bg-sand/60 text-sage pt-16 pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-sand-border/80">
          {/* Brand Col */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full overflow-hidden shadow-2xs">
                <img
                  src="/kai-logo.png"
                  alt="KAI Wellness Retreats"
                  className="h-full w-full object-contain"
                />
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
              Restorative wellness retreats curated by Kareena Islam and Armaan Islam, with mindful movement, sound baths, cultural immersion, and travel planning powered by Grand Travel & Cruise.
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
                <Link href="/retreats/puerto-vallarta-mexico-2027" className="hover:text-terracotta transition-colors">
                  Puerto Vallarta, Mexico (Jan 28–31, 2027)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=nosara-2027" className="hover:text-terracotta transition-colors">
                  Nosara, Costa Rica (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=amalfi-2027" className="hover:text-terracotta transition-colors">
                  Amalfi Coast, Italy (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=bali-2027" className="hover:text-terracotta transition-colors">
                  Ubud & Sidemen, Bali (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=riviera-2026" className="hover:text-terracotta transition-colors">
                  Riviera Maya, Mexico (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=custom" className="hover:text-terracotta transition-colors">
                  Private & Custom Groups
                </Link>
              </li>
            </ul>
          </div>

          {/* The Hearts Behind KAI & Philosophy */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Foundation
            </h4>
            <ul className="space-y-2 text-xs text-sage/80">
              <li>
                <Link href="/about" className="hover:text-terracotta transition-colors">
                  The Hearts Behind KAI
                </Link>
              </li>
              <li>
                <Link href="/about#our-philosophy" className="hover:text-terracotta transition-colors">
                  Living BIG — Be In Gratitude
                </Link>
              </li>
              <li>
                <Link href="/about#cultural-integrations" className="hover:text-terracotta transition-colors">
                  Cultural Integrations &amp; Promise
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
                  Occasional updates only. Unsubscribe at any time.
                </span>
              </form>
            )}

            {/* Travel Partner Badge */}
            <div className="rounded-2xl border border-sand-border bg-linen/70 p-4 text-xs text-sage/80 space-y-3">
              <div className="flex items-start gap-3">
                <Compass className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium text-sage block">
                    Powered by Grand Travel & Cruise
                  </span>
                  <span className="text-[11px] text-sage/70">
                    25+ years of luxury travel mastery. <em>Future Leaders in Travel</em> Honoree.
                  </span>
                </div>
              </div>

              {/* Grand Travel Logo */}
              <div className="pt-3 border-t border-sand-border/60">
                <a
                  href="https://grandtravelcruise.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block group rounded-xl bg-white/80 p-2.5 border border-sand-border/60 shadow-2xs hover:border-terracotta/50 hover:bg-white transition-all"
                  title="Visit Grand Travel & Cruise Official Agency"
                >
                  <img
                    src="/grand-travel-logo.png"
                    alt="Grand Travel & Cruise — Vacations, Weddings, Honeymoons"
                    className="h-14 sm:h-16 w-auto object-contain transition-transform group-hover:scale-[1.02]"
                  />
                </a>
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
            <span className="inline-flex items-center gap-1.5 text-[10px] text-sage/75">
              <span className="h-1.5 w-1.5 rounded-full bg-olive animate-pulse" />
              <span>Sanctuary Concierge Online</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
