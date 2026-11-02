"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import { Compass, ArrowRight, CheckCircle2, Loader2, Mail, Globe, Share2 } from "lucide-react";
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

            <p className="font-serif italic text-lg text-sage/95 leading-snug">
              &ldquo;KAI Wellness Retreats is a place where your peace within can blend with the pieces around.&rdquo;
            </p>

            <p className="text-xs leading-relaxed text-sage/75">
              Immersive somatic & cultural sanctuaries founded by <strong>Kareena Islam, BSN, RN, RYT</strong> & <strong>Armaan Islam</strong>. Rooted in clinical restorative science, Ironman endurance discipline, 432Hz crystal sound resonance, cultural integrations, and <strong>Grand Travel & Cruise</strong> luxury execution.
            </p>

            {/* Direct Founder Inquiry Emails */}
            <div className="rounded-2xl border border-sand-border bg-linen/80 p-3.5 space-y-1.5 text-xs">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-olive flex items-center gap-1.5">
                <Mail className="h-3 w-3 text-terracotta" /> Direct Founders Inquiry Desk
              </span>
              <a
                href="mailto:kareena@grandtravelcruise.com"
                className="block text-sage hover:text-terracotta transition-colors font-medium"
              >
                kareena@grandtravelcruise.com
              </a>
              <a
                href="mailto:armaan@grandtravelcruise.com"
                className="block text-sage hover:text-terracotta transition-colors font-medium"
              >
                armaan@grandtravelcruise.com
              </a>
            </div>

            {/* Social & Grand Travel Social Media Badges */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase tracking-widest text-olive font-semibold flex items-center gap-1.5">
                <Share2 className="h-3 w-3 text-terracotta" /> KAI & Grand Travel Social Media
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="https://www.instagram.com/kaiwellnessretreats/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-sand-border bg-linen px-3 py-1.5 text-[11px] text-sage hover:text-terracotta hover:border-terracotta transition-colors"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>@kaiwellnessretreats</span>
                </a>

                <a
                  href="https://www.instagram.com/kareenatravelrn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-sand-border bg-linen px-3 py-1.5 text-[11px] text-sage hover:text-terracotta hover:border-terracotta transition-colors"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>@kareenatravelrn</span>
                </a>

                <a
                  href="https://www.instagram.com/grandtravelcruise/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-sand-border bg-linen px-3 py-1.5 text-[11px] text-sage hover:text-terracotta hover:border-terracotta transition-colors"
                >
                  <InstagramIcon className="h-3 w-3" />
                  <span>@grandtravelcruise</span>
                </a>

                <a
                  href="https://www.facebook.com/grandtravelcruise"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-sand-border bg-linen px-3 py-1.5 text-[11px] text-sage hover:text-terracotta hover:border-terracotta transition-colors"
                >
                  <Globe className="h-3 w-3 text-olive" />
                  <span>FB: Grand Travel & Cruise</span>
                </a>

                <a
                  href="https://grandtravelcruise.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-full border border-sand-border bg-linen px-3 py-1.5 text-[11px] text-sage hover:text-terracotta hover:border-terracotta transition-colors"
                >
                  <Compass className="h-3 w-3 text-terracotta" />
                  <span>grandtravelcruise.com</span>
                </a>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Sanctuaries
            </h4>
            <ul className="space-y-2 text-xs text-sage/80">
              <li>
                <Link
                  href="/retreats/puerto-vallarta-mexico-2027"
                  className="text-terracotta font-semibold hover:underline transition-colors"
                >
                  Puerto Vallarta • Marival Harmony (Jan 28–31, 2027)
                </Link>
              </li>
              <li>
                <Link href="/retreats" className="hover:text-terracotta transition-colors">
                  All 2027 Retreats
                </Link>
              </li>
              <li>
                <Link href="/retreats/nosara-costa-rica-2027" className="hover:text-terracotta transition-colors">
                  Nosara, Costa Rica (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/retreats/amalfi-coast-italy-2027" className="hover:text-terracotta transition-colors">
                  Amalfi Coast, Italy (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/retreats/ubud-sidemen-bali-2027" className="hover:text-terracotta transition-colors">
                  Ubud & Sidemen, Bali (Coming Soon)
                </Link>
              </li>
              <li>
                <Link href="/book?retreat=custom" className="hover:text-terracotta transition-colors">
                  Private & Corporate Groups
                </Link>
              </li>
            </ul>
          </div>

          {/* Founders & Community */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs uppercase tracking-[0.2em] font-semibold text-olive">
              Founders & Voices
            </h4>
            <ul className="space-y-2 text-xs text-sage/80">
              <li>
                <Link href="/about" className="hover:text-terracotta transition-colors">
                  Founders: Kareena & Armaan Islam
                </Link>
              </li>
              <li>
                <Link href="/about#cultural-integrations" className="hover:text-terracotta transition-colors">
                  Cultural Integrations
                </Link>
              </li>
              <li>
                <Link href="/testimonials" className="hover:text-terracotta transition-colors">
                  Testimonials & Past Retreat Photos
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
                  Sanctuary Reservations & Waiver
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
              Because our retreats maintain an intimate capacity of 12 to 16 guests, openings and new 2027 dates are released privately to our circle first.
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
                  25+ years of luxury travel mastery • Funjet 500 Club • <em>Future Leaders in Travel</em> Honoree.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Clinical Disclaimer & Copyright */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-[11px] text-sage/60 leading-relaxed">
          <div className="max-w-2xl">
            <p>
              <strong className="font-medium text-sage/75">Clinical Somatics & Liability Notice:</strong> KAI Wellness Retreats provides restorative somatic movement, parasympathetic breathwork, endurance recovery, and cultural guidance led by Kareena Islam & Armaan Islam. Programming is designed for nervous system restoration and is not a substitute for acute diagnostic medical care.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center md:text-right shrink-0">
            <span>© {new Date().getFullYear()} KAI Wellness Retreats. All rights reserved.</span>
            <span>#LivingBIG • Be In Gratitude</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
