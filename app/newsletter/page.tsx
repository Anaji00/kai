"use client";

import React, { useActionState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ExternalLink,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Heart,
} from "lucide-react";
import InstagramIcon from "@/components/icons/InstagramIcon";
import { subscribeNewsletter } from "@/app/actions/booking";

export interface PressArticle {
  id: string;
  publication: string;
  date: string;
  title: string;
  url: string;
  summary: string;
  quote?: string;
}

export const KAREENA_PRESS_ARTICLES: PressArticle[] = [
  {
    id: "taw-future-leaders-watch-list",
    publication: "TravelAge West",
    date: "September 2026",
    title: "5 Future Leaders to Watch List",
    url: "https://www.travelagewest.com/Industry-Insight/Business-Features/future-leaders-in-travel-watch-list-2026",
    summary:
      "TravelAge West profiled Kareena on how her background in nursing, teaching yoga, and growing up in her family's 35-year-old agency, Grand Travel & Cruise, led to launching KAI Wellness Retreats.",
    quote:
      "As someone with a biracial background, I bring a 'melting pot' approach to relationships, allowing me to build trust and create meaningful client experiences across different cultures and communities.",
  },
  {
    id: "taw-next-chapter-panel",
    publication: "TravelAge West",
    date: "August 2026",
    title: "Travel Advisors Write Their Next Chapter at Future Leaders in Travel",
    url: "https://www.travelagewest.com/Events/future-leaders-in-travel-2026-2",
    summary:
      "Coverage from the Riviera Maya summit where Kareena returned as a Future Leaders Guide and joined the mainstage panel, 'Breaking Down Barriers: Getting Candid About the Advisor-Supplier Relationship.'",
  },
  {
    id: "click2houston-faa-ground-stop",
    publication: "Click2Houston (KPRC 2)",
    date: "November 2026",
    title: "FAA Ground Stop: Can You Get a Refund If Your Flight Is Canceled? Here's What to Know",
    url: "https://www.click2houston.com/news/local/2026/11/14/faa-ground-stop-can-you-get-a-refund-if-your-flight-is-canceled-heres-what-to-know/",
    summary:
      "Interviewed by Houston's KPRC 2 News during nationwide flight disruptions, Kareena shared practical advice from Grand Travel & Cruise in Sugar Land on how travelers can navigate delays and rebooking.",
    quote:
      "So right now, it's very important for everyone to stay calm and keep their patience.",
  },
  {
    id: "travel-weekly-future-leaders-guide",
    publication: "Travel Weekly",
    date: "April 2026",
    title: "Future Leaders in Travel Opens Application for Annual Event",
    url: "https://www.travelweekly.com/News-at-TW/Future-Leaders-in-Travel-opens-application-for-2026-event",
    summary:
      "Travel Weekly announced Kareena Islam of Grand Travel & Cruise as one of the returning Future Leaders Guides selected to mentor first-time attendees and help lead event sessions in Mexico.",
  },
];

const RECENT_NOTES = [
  {
    label: "From Kareena",
    title: "Bringing the Slowness Home",
    body: [
      "As a nurse, I spent years watching how easy it is to put everyone else first until you have nothing left in the tank. We tell ourselves we will slow down on vacation, or once work gets quieter, or after the next busy season passes.",
      "When Armaan and I started KAI, we wanted our retreats to feel like a deep exhale—a place where you don't have to perform or keep up a schedule. Just as importantly, we wanted the simple habits we practice together by the ocean, like a few quiet minutes of breathing before the day starts or an evening walk without your phone, to feel doable once you're back home.",
    ],
  },
  {
    label: "From Kareena & Armaan",
    title: "Why We Keep Our Groups Small",
    body: [
      "Growing up in a family travel agency, we saw every kind of trip imaginable. The moments people talked about years later were rarely the biggest resorts or the busiest itineraries—they were the meals that stretched late into the evening and the strangers who became lifelong friends.",
      "That is why we keep every KAI retreat to 12 to 14 guests. Whether we are in the Riviera Maya or gathering in Puerto Vallarta, a smaller table means nobody gets lost in the crowd. You can show up on your own or with someone you love and immediately feel part of the family.",
    ],
  },
  {
    label: "From Armaan",
    title: "Rest Is Part of the Work",
    body: [
      "Training for an Ironman taught me that pushing harder only gets you so far. Real strength comes from how you recover, how you take care of your body between efforts, and the people who keep you grounded along the way.",
      "Whether you are training for a race, caring for a family, or building a career, stepping away to reset isn't a luxury—it's what lets you show up fully for the things and people you love.",
    ],
  },
];

export default function BeyondTheRetreatsPage() {
  const [state, formAction, isPending] = useActionState(subscribeNewsletter, {
    success: false,
    message: "",
  });

  const featuredArticle = KAREENA_PRESS_ARTICLES[0];
  const otherArticles = KAREENA_PRESS_ARTICLES.slice(1);

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-20">
      {/* 1. HEADER & NEWSLETTER SIGNUP */}
      <section className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-12 lg:p-14 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5">
            <span className="text-xs uppercase tracking-[0.22em] text-olive font-semibold block">
              Newsletter &amp; Press • KAI Wellness Retreats
            </span>

            <div className="space-y-2">
              <h1 className="font-serif text-4xl sm:text-6xl text-sage font-light leading-tight">
                Beyond The Retreats
              </h1>
              <p className="font-serif text-xl sm:text-2xl text-sage/80 italic font-normal">
                Notes on everyday wellness, travel, and Living BIG — Be In Gratitude.
              </p>
            </div>

            <div className="space-y-3 text-sm sm:text-base text-sage/85 leading-relaxed font-light max-w-xl">
              <p>
                We believe wellness isn&rsquo;t just something you practice during a four-day retreat. It&rsquo;s something you carry home and share with the people around you.
              </p>
              <p>
                <em>Beyond The Retreats</em> is our occasional letter where we share simple ways to slow down, stories from our travels, press features, and early word when new 12&ndash;14 guest retreat dates open.
              </p>
            </div>
          </div>

          {/* Signup Card */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-sand-border bg-sand/50 p-6 sm:p-8 space-y-5">
              <div className="space-y-1.5">
                <h2 className="font-serif text-2xl sm:text-3xl text-sage font-normal">
                  Stay in Touch
                </h2>
                <p className="text-xs text-sage/80 leading-relaxed">
                  Written by Kareena and Armaan. Because our retreats are limited to 12 to 14 guests, we always share new dates with our email list first.
                </p>
              </div>

              {state.success ? (
                <div className="rounded-2xl bg-linen border border-olive/40 p-4 space-y-1.5 text-xs text-sage">
                  <div className="flex items-center gap-2 font-semibold text-olive">
                    <CheckCircle2 className="h-4 w-4 text-olive shrink-0" />
                    <span>You&rsquo;re on the list</span>
                  </div>
                  <p className="text-sage/80 leading-relaxed">{state.message}</p>
                </div>
              ) : (
                <form action={formAction} className="space-y-3">
                  <input type="hidden" name="source" value="beyond-the-retreats" />
                  <div>
                    <label htmlFor="newsletter-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="newsletter-email"
                      type="email"
                      name="email"
                      required
                      placeholder="Your email address"
                      className="w-full rounded-xl border border-sand-border bg-linen px-4 py-3 text-xs sm:text-sm text-sage placeholder:text-sage/45 focus:border-olive focus:outline-none transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-3 text-xs font-semibold uppercase tracking-widest text-linen hover:bg-sage-dark transition-all shadow-sm disabled:opacity-50"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Joining...</span>
                      </>
                    ) : (
                      <>
                        <span>Subscribe</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                  {state.message && !state.success && (
                    <p className="text-xs text-terracotta font-medium">{state.message}</p>
                  )}
                </form>
              )}

              <p className="text-[11px] text-sage/60">
                Occasional notes only. Unsubscribe at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KAREENA'S ARTICLES & PRESS FEATURES */}
      <section id="kareena-press" className="space-y-10 scroll-mt-28">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-terracotta font-semibold block">
            In the Press
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
            Articles &amp; Features with Kareena Islam, BSN, RN
          </h2>
          <p className="text-sm text-sage/80 leading-relaxed font-light">
            Conversations and profiles from <em>TravelAge West</em>, <em>Travel Weekly</em>, and Houston&rsquo;s <em>KPRC 2 Click2Houston</em> on wellness travel, family business, and caring for travelers.
          </p>
        </div>

        {/* Featured Article: TravelAge West 5 Future Leaders to Watch */}
        <article className="rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-5 relative min-h-[280px] bg-sand">
              <Image
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=85"
                alt="Kareena Islam, BSN, RN"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/80 via-sage-dark/20 to-transparent" />
              <div className="absolute bottom-5 left-6 right-6 text-linen">
                <span className="text-[11px] uppercase tracking-widest text-sand-muted block">
                  {featuredArticle.publication} • {featuredArticle.date}
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl font-light mt-1">
                  {featuredArticle.title}
                </h3>
              </div>
            </div>

            <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-sm sm:text-base text-sage/85 leading-relaxed font-light">
                  {featuredArticle.summary}
                </p>

                {featuredArticle.quote && (
                  <blockquote className="rounded-2xl bg-sand/60 border border-sand-border p-5 space-y-2">
                    <p className="font-serif text-lg sm:text-xl text-sage italic leading-snug">
                      &ldquo;{featuredArticle.quote}&rdquo;
                    </p>
                    <footer className="text-xs text-sage/70">
                      &mdash; Kareena Islam in <em>TravelAge West</em>
                    </footer>
                  </blockquote>
                )}
              </div>

              <div className="pt-4 border-t border-sand-border/80 flex flex-wrap items-center justify-between gap-4">
                <a
                  href={featuredArticle.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-sage px-5 py-2.5 text-xs font-semibold uppercase tracking-widest text-linen hover:bg-sage-dark transition-all"
                >
                  <span>Read on TravelAge West</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href="https://www.instagram.com/kareenatravelrn/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-olive hover:text-terracotta transition-colors"
                >
                  <InstagramIcon className="h-3.5 w-3.5" />
                  <span>@kareenatravelrn</span>
                </a>
              </div>
            </div>
          </div>
        </article>

        {/* Other Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {otherArticles.map((article) => (
            <article
              key={article.id}
              className="rounded-2xl border border-sand-border bg-linen p-6 shadow-2xs flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-terracotta">
                    {article.publication}
                  </span>
                  <span className="text-sage/60">{article.date}</span>
                </div>

                <h3 className="font-serif text-xl text-sage font-normal leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
                  {article.summary}
                </p>

                {article.quote && (
                  <p className="rounded-xl bg-sand/50 border border-sand-border/80 p-3 text-xs italic font-serif text-sage/90">
                    &ldquo;{article.quote}&rdquo;
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-sand-border/70">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage hover:text-terracotta transition-colors"
                >
                  <span>Read article</span>
                  <ExternalLink className="h-3.5 w-3.5 text-terracotta" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 3. NOTES FROM KAREENA & ARMAAN */}
      <section className="rounded-3xl border border-sand-border bg-sand/40 p-6 sm:p-12 space-y-8">
        <div className="max-w-2xl space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-olive font-semibold block">
            From Our Journal
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
            Reflections from Kareena &amp; Armaan
          </h2>
          <p className="text-sm text-sage/80 leading-relaxed font-light">
            A look at the ideas and family values that shape our retreats and the notes we send to our community.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {RECENT_NOTES.map((note) => (
            <article
              key={note.title}
              className="rounded-2xl border border-sand-border bg-linen p-6 sm:p-7 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <span className="text-[11px] uppercase tracking-widest font-semibold text-terracotta block">
                  {note.label}
                </span>
                <h3 className="font-serif text-2xl text-sage font-normal leading-snug">
                  {note.title}
                </h3>
                <div className="space-y-3 text-xs sm:text-sm text-sage/85 leading-relaxed font-light">
                  {note.body.map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. CLOSING INVITATION */}
      <section className="rounded-3xl border border-sand-border bg-linen p-8 sm:p-10 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center lg:text-left max-w-xl">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-terracotta font-semibold">
            <Heart className="h-3.5 w-3.5" />
            <span>Join Us in Person</span>
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl text-sage font-light">
            Marival Armony • Puerto Vallarta (January 28–31, 2027)
          </h3>
          <p className="text-xs sm:text-sm text-sage/80 leading-relaxed">
            Have a question for us? Reach out anytime at{" "}
            <a
              href="mailto:kareena@grandtravelcruise.com"
              className="font-medium text-sage underline hover:text-terracotta"
            >
              kareena@grandtravelcruise.com
            </a>{" "}
            or{" "}
            <a
              href="mailto:armaan@grandtravelcruise.com"
              className="font-medium text-sage underline hover:text-terracotta"
            >
              armaan@grandtravelcruise.com
            </a>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
          <Link
            href="/about"
            className="rounded-full border border-sand-border bg-sand px-5 py-2.5 text-xs font-medium text-sage hover:bg-sand-muted transition-colors"
          >
            Meet Kareena &amp; Armaan
          </Link>
          <Link
            href="/book?retreat=puerto-vallarta-2027"
            className="rounded-full bg-sage px-6 py-2.5 text-xs uppercase tracking-widest text-linen font-semibold hover:bg-sage-dark transition-all"
          >
            Reserve Puerto Vallarta
          </Link>
        </div>
      </section>
    </div>
  );
}
