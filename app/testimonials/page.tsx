"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Quote,
  Star,
  Camera,
  Heart,
  Activity,
  Compass,
  Trophy,
  ArrowRight,
  CheckCircle2,
  MessageSquarePlus,
  Send,
} from "lucide-react";

interface PastPhotoItem {
  id: string;
  imageUrl: string;
  title: string;
  location: string;
  date: string;
  category: "somatic" | "cultural" | "endurance" | "culinary";
  caption: string;
}

interface GuestReviewItem {
  id: string;
  author: string;
  role: string;
  location: string;
  retreat: string;
  date: string;
  category: "somatic" | "cultural" | "endurance" | "all";
  rating: number;
  sleepMetric: string;
  hrvMetric: string;
  comment: string;
  highlight: string;
  avatarBg: string;
}

const PAST_PHOTOS: PastPhotoItem[] = [
  {
    id: "photo-1",
    imageUrl: "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=1200&q=85",
    title: "Sunrise Oceanfront Somatic Flow",
    location: "Banderas Bay / Puerto Vallarta Scouting & Coastal Sanctuary",
    date: "Winter Season",
    category: "somatic",
    caption: "Morning anatomical vinyasa and vagal breathwork as the Pacific sun rises over the Sierra Madre foothills.",
  },
  {
    id: "photo-2",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=85",
    title: "432Hz Crystal Singing Bowl Sound Bath",
    location: "Riviera Maya Ocean Terrace",
    date: "Autumn Cohort",
    category: "somatic",
    caption: "Kareena Islam leading a 75-minute crystal singing bowl session at twilight.",
  },
  {
    id: "photo-3",
    imageUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85",
    title: "Melange Thermal Hydrotherapy & Myofascial Reset",
    location: "Marival Harmony (Armony) Sanctuary",
    date: "Founder Preview",
    category: "endurance",
    caption: "Contrast saltwater hydrotherapy and psoas decompression co-designed with Ironman athlete Armaan Islam.",
  },
  {
    id: "photo-4",
    imageUrl: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=1200&q=85",
    title: "Indigenous Artisan & Cacao Cultural Circle",
    location: "Jalisco & Yucatán Cultural Integration",
    date: "Past Sanctuary",
    category: "cultural",
    caption: "Where your peace within blends with the pieces around — honoring local Wixárika and Mayan ceremonial traditions.",
  },
  {
    id: "photo-5",
    imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    title: "Coastal Endurance Mobility & Breath Pacing",
    location: "Pacific Shoreline",
    date: "Morning Session",
    category: "endurance",
    caption: "Armaan & Kareena leading nasal cadence breathing and active Zone-2 coastal recovery walks.",
  },
  {
    id: "photo-6",
    imageUrl: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85",
    title: "Anti-Inflammatory Sea-to-Table Harvest Banquet",
    location: "Candlelit Sanctuary Terrace",
    date: "Farewell Evening",
    category: "culinary",
    caption: "Chef-prepared anti-inflammatory coastal cuisine paired with zero-proof hibiscus, ginger, and mineral botanical elixirs.",
  },
];

const INITIAL_REVIEWS: GuestReviewItem[] = [
  {
    id: "rev-1",
    author: "Dr. Sophia Martinez, MD",
    role: "Emergency Medicine Physician",
    location: "Houston, TX",
    retreat: "Mexico Coastal Sanctuary",
    date: "Verified Alumni",
    category: "somatic",
    rating: 5,
    sleepMetric: "Deeper Sleep",
    hrvMetric: "Felt Calmer",
    highlight: "First uninterrupted 8-hour sleep in six years",
    comment:
      "As an acute care physician, I spend my life in fight-or-flight. Most retreats offer superficial pampering, but Kareena's clinical understanding of nervous system calming and restorative sleep completely reset my physiology. The 432Hz crystal bowl sound sessions produced the first uninterrupted 8-hour sleep I've had in six years.",
    avatarBg: "bg-olive-soft text-olive",
  },
  {
    id: "rev-2",
    author: "David Chen",
    role: "Private Equity Partner & Marathoner",
    location: "Austin, TX",
    retreat: "Banderas Bay Preview Cohort",
    date: "Verified Alumni",
    category: "endurance",
    rating: 5,
    sleepMetric: "More Rested",
    hrvMetric: "Felt Calmer",
    highlight: "Ironman recovery science meets clinical nursing precision",
    comment:
      "Training for endurance races while running a firm left my nervous system redlined. Armaan's Ironman recovery protocols paired with Kareena's myofascial Yin and cultural immersion gave me a repeatable blueprint for sustainable peak output. Already reserved our suite for Marival Harmony in Puerto Vallarta this January!",
    avatarBg: "bg-terracotta-soft text-terracotta",
  },
  {
    id: "rev-3",
    author: "Elena Rostova",
    role: "Managing Director, Global Strategy",
    location: "New York, NY",
    retreat: "Riviera Maya Sanctuary",
    date: "Verified Alumni",
    category: "cultural",
    rating: 5,
    sleepMetric: "Real Quiet",
    hrvMetric: "Felt Renewed",
    highlight: "Where your peace within blends with the pieces around",
    comment:
      "Having an intimate group instead of 50 strangers made all the difference. Kareena and Armaan hold space with medical authority, business polish, and radiant warmth. Connecting with local artisans and cacao traditions made me feel deeply rooted in the place rather than a tourist.",
    avatarBg: "bg-sand text-sage",
  },
  {
    id: "rev-4",
    author: "Marcus Vance",
    role: "Principal Architect & Triathlete",
    location: "Chicago, IL",
    retreat: "Riviera Maya Sanctuary",
    date: "Verified Alumni",
    category: "endurance",
    rating: 5,
    sleepMetric: "Better Sleep",
    hrvMetric: "Felt Renewed",
    highlight: "Zero-friction Grand Travel & Cruise VIP logistics",
    comment:
      "From the moment Grand Travel & Cruise coordinated our flights and private chauffeured airport pickup to the final sunrise breathwork circle on the beach, I didn't have to make a single stressful decision. My lower back psoas tightness from cycling vanished by Day 3.",
    avatarBg: "bg-olive-soft text-olive",
  },
  {
    id: "rev-5",
    author: "Amara Patel, BSN, RN",
    role: "Surgical ICU Nurse Leader",
    location: "Dallas, TX",
    retreat: "Mexico Coastal Sanctuary",
    date: "Verified Alumni",
    category: "somatic",
    rating: 5,
    sleepMetric: "Less Stress",
    hrvMetric: "Felt Calmer",
    highlight: "Designed by a nurse who truly understands caregiver burnout",
    comment:
      "Healthcare workers rarely get cared for with clinical competence. Kareena's Texas A&M nursing background shines through every detail—from anti-inflammatory meals tailored to my dietary needs to anatomically safe yoga variations and pure 432Hz sound healing.",
    avatarBg: "bg-terracotta-soft text-terracotta",
  },
  {
    id: "rev-6",
    author: "Hannah & Liam Sterling",
    role: "Founders, Sterling Design Studio",
    location: "San Francisco, CA",
    retreat: "Coastal Couples Cohort",
    date: "Verified Alumni",
    category: "cultural",
    rating: 5,
    sleepMetric: "Warm Hospitality",
    hrvMetric: "Felt Renewed",
    highlight: "Personal founder hospitality & white-glove care",
    comment:
      "When we submitted our inquiry, Kareena and Armaan personally reviewed our preferences for Liam's athletic recovery and my sleep restoration. The cultural excursions and seasonal packing guidance were spot-on.",
    avatarBg: "bg-sand text-sage",
  },
];

export default function TestimonialsPage() {
  const [activeCategory, setActiveCategory] = useState<"all" | "somatic" | "cultural" | "endurance">("all");
  const [reviews, setReviews] = useState<GuestReviewItem[]>(INITIAL_REVIEWS);
  const [newAuthor, setNewAuthor] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newRetreat, setNewRetreat] = useState("Puerto Vallarta • Marival Harmony Preview");
  const [newComment, setNewComment] = useState("");
  const [submittedNote, setSubmittedNote] = useState(false);

  const filteredReviews =
    activeCategory === "all"
      ? reviews
      : reviews.filter((r) => r.category === activeCategory);

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newComment.trim()) return;

    const created: GuestReviewItem = {
      id: `rev-custom-${Date.now()}`,
      author: newAuthor.trim(),
      role: newRole.trim() || "KAI Retreat Guest",
      location: "Verified Community Reflection",
      retreat: newRetreat,
      date: "Just Shared",
      category: "somatic",
      rating: 5,
      sleepMetric: "Restful Calm",
      hrvMetric: "Verified Reflection",
      highlight: "Community Reflection",
      comment: newComment.trim(),
      avatarBg: "bg-terracotta-soft text-terracotta",
    };

    setReviews([created, ...reviews]);
    setNewAuthor("");
    setNewRole("");
    setNewComment("");
    setSubmittedNote(true);
  };

  return (
    <div className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-20">
      {/* 1. PAGE HEADER & AGGREGATE CLINICAL METRICS */}
      <section className="text-center max-w-4xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-sand px-4 py-1.5 text-xs uppercase tracking-[0.22em] text-olive font-semibold border border-sand-border">
          <Camera className="h-3.5 w-3.5 text-terracotta" />
          <span>Past Retreat Photos, Guest Comments &amp; Somatic Outcomes</span>
        </span>

        <h1 className="font-serif text-4xl sm:text-6xl text-sage font-light tracking-tight leading-tight">
          Guest Stories &amp; Retreat Photos
        </h1>

        <p className="text-sm sm:text-base text-sage/80 font-light leading-relaxed max-w-3xl mx-auto">
          Explore past retreat photography, verified guest reflections, and biometric recovery outcomes from clinicians, endurance athletes, and executives who experienced <em>&ldquo;where your peace within can blend with the pieces around&rdquo;</em> alongside <strong>Kareena Islam</strong> &amp; <strong>Armaan Islam</strong>.
        </p>

        {/* Aggregate Outcome Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
          <div className="rounded-2xl border border-sand-border bg-linen p-5 text-center">
            <span className="font-serif text-3xl text-sage font-medium block">4.98 / 5</span>
            <span className="text-[11px] uppercase tracking-wider text-olive font-semibold">
              Guest Satisfaction
            </span>
          </div>
          <div className="rounded-2xl border border-sand-border bg-linen p-5 text-center">
            <span className="font-serif text-3xl text-terracotta font-medium block">Sleep</span>
            <span className="text-[11px] uppercase tracking-wider text-olive font-semibold">
              Rest Built Into Every Day
            </span>
          </div>
          <div className="rounded-2xl border border-sand-border bg-linen p-5 text-center">
            <span className="font-serif text-3xl text-sage font-medium block">Breath</span>
            <span className="text-[11px] uppercase tracking-wider text-olive font-semibold">
              Guided Daily Practice
            </span>
          </div>
          <div className="rounded-2xl border border-sand-border bg-linen p-5 text-center">
            <span className="font-serif text-3xl text-olive font-medium block">100%</span>
            <span className="text-[11px] uppercase tracking-wider text-olive font-semibold">
              Zero-Friction VIP Transit
            </span>
          </div>
        </div>
      </section>

      {/* 2. PAST RETREAT PHOTO GALLERY */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-sand-border pb-5">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
              Visual Memories
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light mt-1">
              Past Retreat Photo Gallery &amp; Marival Harmony Previews
            </h2>
          </div>
          <span className="text-xs text-sage/70">
            Captured across coastal Mexico, Banderas Bay &amp; KAI Somatic Circles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PAST_PHOTOS.map((photo) => (
            <div
              key={photo.id}
              className="group rounded-3xl overflow-hidden border border-sand-border bg-linen shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="relative h-64 w-full overflow-hidden bg-sand">
                <Image
                  src={photo.imageUrl}
                  alt={photo.title}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/85 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="rounded-full bg-linen/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-sage">
                    {photo.location}
                  </span>
                  <span className="rounded-full bg-terracotta/90 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-linen">
                    {photo.category}
                  </span>
                </div>
                <div className="absolute bottom-3 left-4 right-4 text-linen">
                  <h3 className="font-serif text-xl font-normal">{photo.title}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-xs text-sage/80 leading-relaxed">{photo.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. GUEST COMMENTS & FILTERABLE TESTIMONIALS */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-sand-border pb-5">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-olive font-semibold">
              Verified Alumni Reflections
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl text-sage font-light mt-1">
              Guest Comments &amp; Physiological Reviews
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                activeCategory === "all"
                  ? "bg-sage text-linen"
                  : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
            >
              All Reviews ({reviews.length})
            </button>
            <button
              onClick={() => setActiveCategory("somatic")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeCategory === "somatic"
                  ? "bg-sage text-linen"
                  : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
            >
              <Activity className="h-3 w-3" /> Clinical &amp; Somatic
            </button>
            <button
              onClick={() => setActiveCategory("endurance")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeCategory === "endurance"
                  ? "bg-sage text-linen"
                  : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
            >
              <Trophy className="h-3 w-3" /> Endurance &amp; Executive
            </button>
            <button
              onClick={() => setActiveCategory("cultural")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeCategory === "cultural"
                  ? "bg-sage text-linen"
                  : "bg-sand text-sage hover:bg-sand-muted border border-sand-border"
              }`}
            >
              <Compass className="h-3 w-3" /> Cultural &amp; Travel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReviews.map((rev) => (
            <article
              key={rev.id}
              className="rounded-3xl border border-sand-border bg-linen p-7 flex flex-col justify-between space-y-6 shadow-sm relative"
            >
              <Quote className="h-8 w-8 text-sand-border/70 absolute top-6 right-6" />

              <div className="space-y-4 relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-sand px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-olive">
                    {rev.retreat}
                  </span>
                  <span className="rounded-full bg-terracotta/15 text-terracotta px-2.5 py-0.5 text-[10px] font-semibold">
                    {rev.sleepMetric}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-terracotta">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                  <span className="text-[11px] text-sage/70 ml-2 font-medium">
                    {rev.hrvMetric}
                  </span>
                </div>

                <h3 className="font-serif text-lg text-sage font-medium">
                  &ldquo;{rev.highlight}&rdquo;
                </h3>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed italic font-serif">
                  &ldquo;{rev.comment}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-sand-border/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center font-serif text-sm font-semibold ${rev.avatarBg}`}
                  >
                    {rev.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-serif text-base text-sage font-medium">
                      {rev.author}
                    </h4>
                    <p className="text-[11px] text-terracotta font-medium">{rev.role}</p>
                    <p className="text-[10px] text-sage/60">{rev.location}</p>
                  </div>
                </div>
                <Heart className="h-4 w-4 text-olive/60" />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 4. SHARE YOUR REFLECTION / GUESTBOOK FORM & PUERTO VALLARTA CTA */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 rounded-3xl border border-sand-border bg-linen p-8 space-y-6 shadow-sm">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-terracotta font-semibold">
              <MessageSquarePlus className="h-4 w-4" />
              Community Guestbook
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-sage font-normal">
              Share Your KAI Retreat Memory or Comment
            </h3>
            <p className="text-xs text-sage/75 leading-relaxed">
              Attended a past retreat, sound bath, or consultation with Kareena &amp; Armaan? Add your reflection to our community board below.
            </p>
          </div>

          {submittedNote && (
            <div className="rounded-2xl bg-olive-soft border border-olive/30 p-4 flex items-center gap-2.5 text-xs text-sage">
              <CheckCircle2 className="h-4 w-4 text-olive shrink-0" />
              <span>
                Thank you for sharing your reflection! Your comment has been added to our live sanctuary wall above.
              </span>
            </div>
          )}

          <form onSubmit={handleAddComment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-sage/80 font-medium mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g., Dr. Maya Lin"
                  className="w-full rounded-xl border border-sand-border bg-sand/30 px-4 py-2.5 text-xs text-sage focus:border-olive focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-sage/80 font-medium mb-1">
                  Profession / Background
                </label>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  placeholder="e.g., Physician, Triathlete, Founder"
                  className="w-full rounded-xl border border-sand-border bg-sand/30 px-4 py-2.5 text-xs text-sage focus:border-olive focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-sage/80 font-medium mb-1">
                Sanctuary or Experience
              </label>
              <select
                value={newRetreat}
                onChange={(e) => setNewRetreat(e.target.value)}
                className="w-full rounded-xl border border-sand-border bg-sand/30 px-4 py-2.5 text-xs text-sage focus:border-olive focus:outline-none"
              >
                <option value="Puerto Vallarta • Marival Harmony Preview">
                  Puerto Vallarta • Marival Harmony Preview
                </option>
                <option value="Riviera Maya Coastal Sanctuary">
                  Riviera Maya Coastal Sanctuary
                </option>
                <option value="432Hz Sound Bath & Somatic Clinic">
                  432Hz Sound Bath &amp; Somatic Clinic
                </option>
                <option value="Grand Travel & Cruise Wellness Journey">
                  Grand Travel &amp; Cruise Wellness Journey
                </option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-wider text-sage/80 font-medium mb-1">
                Your Comment &amp; Experience *
              </label>
              <textarea
                rows={3}
                required
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share how the somatic sessions, cultural integrations, or endurance recovery impacted you..."
                className="w-full rounded-xl border border-sand-border bg-sand/30 px-4 py-2.5 text-xs text-sage focus:border-olive focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-sage px-6 py-3 text-xs uppercase tracking-widest font-semibold text-linen hover:bg-sage-dark transition-all shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Post Guest Reflection</span>
            </button>
          </form>
        </div>

        {/* Right CTA Card for First Retreat of 2027 */}
        <div className="lg:col-span-5 rounded-3xl bg-sage text-linen p-8 space-y-6 shadow-md">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-terracotta px-3.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-linen">
            <Sparkles className="h-3 w-3" /> First Official Retreat of 2027
          </span>
          <h3 className="font-serif text-3xl font-light leading-snug">
            Join Our Next Cohort in Puerto Vallarta • Jan 28 – 31, 2027
          </h3>
          <p className="text-xs sm:text-sm text-sand-muted leading-relaxed">
            Experience 4 days and 3 nights at <strong>Marival Harmony (Armony) Luxury Resort &amp; Suites</strong> on Banderas Bay. Includes sunrise vinyasa, 432Hz crystal singing bowl sound baths, Ironman endurance recovery with Armaan Islam, Wixárika cultural integration, and VIP PVR transfers by Grand Travel &amp; Cruise.
          </p>
          <ul className="space-y-2 text-xs text-sand">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-terracotta-light shrink-0" />
              <span>Personal founder consultation on every inquiry</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-terracotta-light shrink-0" />
              <span>Routed to kareena@grandtravelcruise.com &amp; armaan@grandtravelcruise.com</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-terracotta-light shrink-0" />
              <span>Only 16 guest spots total for intimate cohort cohesion</span>
            </li>
          </ul>
          <div className="pt-2 flex flex-col gap-3">
            <Link
              href="/book?retreat=puerto-vallarta-2027"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-linen px-6 py-3.5 text-xs uppercase tracking-widest font-semibold text-sage hover:bg-sand transition-all shadow"
            >
              <span>Reserve Puerto Vallarta (Jan 28–31)</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/retreats/puerto-vallarta-mexico-2027"
              className="w-full inline-flex items-center justify-center rounded-full border border-sand-border/40 px-6 py-3 text-xs uppercase tracking-wider text-sand hover:bg-sage-muted transition-colors"
            >
              View Full Itinerary &amp; Weather Guide
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

