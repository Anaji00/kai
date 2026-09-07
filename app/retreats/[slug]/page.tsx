import React from "react";
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Compass,
  ChevronRight,
  Waves,
} from "lucide-react";
import { RETREATS, getRetreatBySlug } from "@/lib/retreats";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return RETREATS.map((r) => ({
    slug: r.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const retreat = getRetreatBySlug(slug);

  if (!retreat) {
    return {
      title: "Sanctuary Not Found | KAI Wellness Retreats",
      description: "The requested luxury wellness sanctuary could not be located.",
    };
  }

  return {
    title: `${retreat.title} — ${retreat.destination} | KAI Wellness Retreats`,
    description: retreat.description,
    alternates: {
      canonical: `/retreats/${retreat.slug}`,
    },
    openGraph: {
      title: `${retreat.title} | KAI Wellness Retreats`,
      description: retreat.description,
      url: `https://kaiwellnessretreats.com/retreats/${retreat.slug}`,
      images: [
        {
          url: retreat.heroImage,
          width: 1600,
          height: 900,
          alt: retreat.title,
        },
      ],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${retreat.title} | KAI Wellness Retreats`,
      description: retreat.description,
      images: [retreat.heroImage],
    },
  };
}

export default async function RetreatDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const retreat = getRetreatBySlug(slug);

  if (!retreat) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: retreat.title,
    description: retreat.description,
    touristType: ["Wellness", "Health Tourism", "Yoga and Somatics"],
    itinerary: {
      "@type": "ItemList",
      itemListElement: retreat.schedule.map((day, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        name: `${day.day}: ${day.title}`,
        description: day.highlights.join("; "),
      })),
    },
    offers: {
      "@type": "Offer",
      price: retreat.investmentStarting.replace(/[^0-9]/g, ""),
      priceCurrency: "USD",
      availability:
        retreat.spotsRemaining > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      url: `https://kaiwellnessretreats.com/book?retreat=${retreat.id}`,
    },
    provider: {
      "@type": "Organization",
      name: "KAI Wellness Retreats",
      url: "https://kaiwellnessretreats.com",
    },
  };

  return (
    <>
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-sage/70">
          <Link href="/" className="hover:text-terracotta transition-colors">
            Home
          </Link>
          <ChevronRight className="h-3 w-3 text-sage/40" />
          <Link href="/retreats" className="hover:text-terracotta transition-colors">
            Sanctuaries
          </Link>
          <ChevronRight className="h-3 w-3 text-sage/40" />
          <span className="text-sage font-medium truncate max-w-xs">{retreat.title}</span>
        </nav>

        {/* Hero Section */}
        <header className="relative rounded-3xl overflow-hidden border border-sand-border shadow-xl min-h-[460px] sm:min-h-[540px] flex flex-col justify-end p-6 sm:p-12 lg:p-16">
          <Image
            src={retreat.heroImage}
            alt={retreat.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center brightness-[0.88] contrast-[0.98]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/95 via-sage-dark/40 to-transparent" />

          {/* Badges */}
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-linen/95 backdrop-blur-md px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-sage border border-sand-border">
                {retreat.destination}, {retreat.country}
              </span>
              <span className="rounded-full bg-sand/90 backdrop-blur-md px-3.5 py-1 text-xs font-medium text-sage">
                {retreat.duration}
              </span>
              <span className="rounded-full bg-terracotta px-3.5 py-1 text-xs font-semibold text-linen shadow">
                {retreat.spotsRemaining} of {retreat.spotsTotal} spots left
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl text-linen font-light max-w-4xl leading-tight">
              {retreat.title}
            </h1>

            <p className="text-sm sm:text-base text-sand-muted max-w-2xl font-light leading-relaxed">
              {retreat.tagline}
            </p>
          </div>
        </header>

        {/* Quick Highlights Bar */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-sand-border bg-linen p-5 space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-olive text-xs font-medium">
              <Calendar className="h-4 w-4" />
              <span>Dates</span>
            </div>
            <p className="font-serif text-lg text-sage font-normal">{retreat.dates}</p>
          </div>

          <div className="rounded-2xl border border-sand-border bg-linen p-5 space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-olive text-xs font-medium">
              <Users className="h-4 w-4" />
              <span>Cohort Capacity</span>
            </div>
            <p className="font-serif text-lg text-sage font-normal">
              {retreat.spotsTotal} Guests Max
            </p>
          </div>

          <div className="rounded-2xl border border-sand-border bg-linen p-5 space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-olive text-xs font-medium">
              <Sparkles className="h-4 w-4 text-terracotta" />
              <span>Clinical Lead</span>
            </div>
            <p className="font-serif text-lg text-sage font-normal">Kareena Islam</p>
          </div>

          <div className="rounded-2xl border border-sand-border bg-linen p-5 space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-olive text-xs font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>Starting Tier</span>
            </div>
            <p className="font-serif text-lg text-sage font-normal">
              {retreat.investmentStarting}
            </p>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Body Column */}
          <main className="lg:col-span-8 space-y-16">
            {/* 1. Narrative & Essence */}
            <article className="space-y-4">
              <span className="text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
                Sanctuary Philosophy
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light">
                The Essence of This Sanctuary
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-sage/85 font-light">
                {retreat.description}
              </p>
            </article>

            {/* 2. Clinical Autonomic Focus */}
            <section className="rounded-3xl border border-sand-border bg-sand/50 p-6 sm:p-10 space-y-6">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] text-olive font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                  Evidence-Based Grounding
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-sage font-normal">
                  The Clinical Science Behind This Journey
                </h3>
              </div>

              <ul className="space-y-3.5">
                {retreat.clinicalFocus.map((focus, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-sage/85">
                    <CheckCircle2 className="h-5 w-5 text-terracotta shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{focus}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 3. Somatic & Sound Healing Practices */}
            <section className="space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
                Somatic Immersion
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-sage font-light">
                Daily Somatic Movement & Sound Journeys
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {retreat.somaticPractices.map((practice, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-sand-border bg-linen p-5 space-y-2"
                  >
                    <div className="flex items-center gap-2 text-xs font-semibold text-olive uppercase tracking-wider">
                      <Waves className="h-4 w-4 text-terracotta" />
                      <span>Practice {idx + 1}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-sage/85 leading-relaxed">{practice}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Photo Gallery Showcase */}
            <section className="space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
                Visual Sanctuary
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-sage font-light">
                Sanctuary Accommodations & Surroundings
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {retreat.gallery.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="relative h-64 sm:h-56 rounded-2xl overflow-hidden border border-sand-border shadow-sm group"
                  >
                    <Image
                      src={imgUrl}
                      alt={`${retreat.title} visual ${idx + 1}`}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed bg-sand/40 rounded-2xl p-4 border border-sand-border/70">
                <strong className="text-sage">Estate Accommodations: </strong>
                {retreat.accommodations}
              </p>
            </section>

            {/* 5. Daily Schedule & Rhythm */}
            <section className="space-y-6">
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
                  Intention & Rhythm
                </span>
                <h3 className="font-serif text-2xl sm:text-3xl text-sage font-light">
                  Curated Daily Schedule
                </h3>
              </div>

              <div className="space-y-4">
                {retreat.schedule.map((day, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-sand-border bg-linen p-6 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold text-olive uppercase tracking-wider">
                        {day.day}
                      </span>
                      <h4 className="font-serif text-xl text-sage font-normal">{day.title}</h4>
                    </div>

                    <ul className="space-y-1.5 pl-4 border-l-2 border-sand-border text-xs sm:text-sm text-sage/80">
                      {day.highlights.map((highlight, hIdx) => (
                        <li key={hIdx} className="leading-relaxed">
                          • {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* 6. Inclusions & Amenities */}
            <section className="space-y-6">
              <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
                Complete Transparency
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-sage font-light">
                What Is Included in Your Investment
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {retreat.inclusions.map((inclusion, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-sand-border bg-linen p-4 flex items-start gap-3 text-xs sm:text-sm text-sage/85"
                  >
                    <CheckCircle2 className="h-4 w-4 text-terracotta shrink-0 mt-0.5" />
                    <span>{inclusion}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 7. The Travel Insider Advantage */}
            <section className="rounded-3xl border border-sand-border bg-sand/40 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-olive">
                <Compass className="h-4 w-4 text-terracotta" />
                <span>The KAI Travel Insider Advantage</span>
              </div>
              <h3 className="font-serif text-2xl text-sage font-normal">
                Backed by 25+ Years of Host Agency Clout & Sacred Cultural Immersion
              </h3>
              <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
                This sanctuary is orchestrated through <strong>Grand Travel & Cruise</strong> (Funjet 500 Club) and curated by <strong>Kareena Islam</strong> (honored national <em>Future Leaders in Travel</em> advisor). Because of our 25+ year host agency volume, our guests enjoy the best negotiated deals in the industry, full private estate buyouts, and zero-friction travel logistics (optimal flight routing, schedule change protections, and chauffeured transit). Equally important, Kareena’s intimate relationships with local elders, priests, and artisans ensure authentic cultural reverence, sacred customs, and true regional immersion without tourist traps.
              </p>
            </section>
          </main>

          {/* Sticky Sidebar Reservation Card */}
          <aside className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
            <div className="rounded-3xl border border-sand-border bg-linen p-6 sm:p-8 space-y-6 shadow-md">
              <div className="border-b border-sand-border pb-5 space-y-2">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-olive">
                  Reservation Investment
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-3xl sm:text-4xl font-medium text-sage">
                    {retreat.investmentStarting}
                  </span>
                  <span className="text-xs text-sage/70 font-light">/ guest</span>
                </div>
                <p className="text-xs text-terracotta font-medium">
                  {retreat.spotsRemaining} spots remaining • {retreat.spotsTotal} total guests
                </p>
              </div>

              <div className="space-y-3 text-xs text-sage/80">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-olive shrink-0" />
                  <span>{retreat.locationDetails}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-olive shrink-0" />
                  <span>{retreat.duration}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Compass className="h-4 w-4 text-olive shrink-0" />
                  <span>Logistics by Grand Travel & Cruise</span>
                </div>
              </div>

              <Link
                href={`/book?retreat=${retreat.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-sage px-6 py-4 text-xs font-semibold uppercase tracking-widest text-linen hover:bg-sage-dark transition-all shadow-md hover:shadow-lg"
              >
                <span>Reserve Your Place</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <div className="border-t border-sand-border pt-4 text-center space-y-2">
                <p className="text-[11px] text-sage/70 leading-relaxed font-light">
                  Have questions before booking? Every inquiry is reviewed directly by Kareena
                  Islam and our dedicated retreat concierge team.
                </p>
                <Link
                  href="/book?retreat=custom"
                  className="text-[11px] text-terracotta hover:underline font-medium"
                >
                  Inquire for private cohort or custom travel
                </Link>
              </div>
            </div>

            {/* Travel Partner Note */}
            <div className="rounded-2xl border border-sand-border bg-sand/60 p-5 space-y-3 text-xs text-sage/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linen text-sage font-serif text-xs border border-sand-border">
                  GT
                </div>
                <div>
                  <span className="font-serif text-sm text-sage font-medium block">
                    Grand Travel & Cruise Concierge
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-olive font-semibold">
                    Best Industry Deals • Future Leaders in Travel
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-sage/75 leading-relaxed">
                Backed by 25+ years of host agency excellence and Funjet 500 Club status, our travel desk negotiates the best industry rates and private estate access. Enjoy white-glove flight routing, VIP airport transfers, and authentic cultural immersion with local guides and sacred traditions.
              </p>
              <div className="pt-2 border-t border-sand-border/60 flex flex-wrap gap-1.5 text-[10px] text-sage/70">
                <span className="rounded-full bg-linen px-2 py-0.5 border border-sand-border/60">Zero-Friction Transit</span>
                <span className="rounded-full bg-linen px-2 py-0.5 border border-sand-border/60">Local Elder Access</span>
                <span className="rounded-full bg-linen px-2 py-0.5 border border-sand-border/60">Best Contract Rates</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
