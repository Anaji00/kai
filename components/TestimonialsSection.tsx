import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Quote, ArrowRight, Camera, Heart, Star } from "lucide-react";

export interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  location: string;
  retreatAttended: string;
  sleepGain?: string;
  highlightTag?: string;
  photoUrl?: string;
  photoCaption?: string;
}

export const TESTIMONIALS: TestimonialItem[] = [
  {
    quote:
      "As an acute care physician, I spend my life in fight-or-flight. Most retreats offer superficial pampering, but Kareena's clinical understanding of nervous system calming and restorative sleep completely reset my physiology. The 432Hz crystal bowl sound sessions produced the first uninterrupted 8-hour sleep I've had in six years.",
    author: "Dr. Sophia Martinez, MD",
    role: "Emergency Medicine Physician",
    location: "Houston, TX",
    retreatAttended: "Mexico Coastal Sanctuary",
    sleepGain: "+42% Deep Sleep Score",
    highlightTag: "Nervous System & 432Hz Sound",
    photoUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    photoCaption: "Sunrise oceanfront pranayama & anatomical alignment session",
  },
  {
    quote:
      "Training for endurance races while running a company left my nervous system redlined. Armaan's Ironman recovery insights paired with Kareena's myofascial Yin and cultural immersion gave me a blueprint for sustainable peak performance. The private transfers and resort suite curated by Grand Travel were effortless.",
    author: "David Chen",
    role: "Private Equity Partner & Marathoner",
    location: "Austin, TX",
    retreatAttended: "Banderas Bay Preview Cohort",
    sleepGain: "+29 ms HRV Recovery",
    highlightTag: "Endurance Recovery & Executive Rest",
    photoUrl: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=900&q=80",
    photoCaption: "Afternoon thermal hydrotherapy & coastal recovery lounge",
  },
  {
    quote:
      "Having 14 people instead of 50 made all the difference. Kareena and Armaan hold space with medical authority, athletic discipline, and radiant warmth. We connected deeply with local artisans and sacred cacao traditions—where your peace within truly blends with the pieces around.",
    author: "Elena Rostova",
    role: "Managing Director, Global Strategy",
    location: "New York, NY",
    retreatAttended: "Riviera Maya Sanctuary",
    sleepGain: "9.9 / 10 Clinical Care",
    highlightTag: "Cultural Integration & Luxury",
    photoUrl: "https://images.unsplash.com/photo-1512813195386-6cf811ad3542?auto=format&fit=crop&w=900&q=80",
    photoCaption: "Golden hour cultural table & crystal bowl acoustic circle",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="space-y-12 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            Voices of Renewal &amp; Past Retreat Moments
          </span>
          <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
            Past Photos, Guest Comments &amp; Somatic Outcomes
          </h2>
          <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
            Reflections and captured moments from clinicians, endurance athletes, and executives who experienced nervous system restoration and cultural connection with Kareena &amp; Armaan.
          </p>
        </div>

        <Link
          href="/testimonials"
          className="inline-flex items-center gap-2 rounded-full border border-sand-border bg-linen px-5 py-2.5 text-xs uppercase tracking-widest text-olive font-semibold hover:border-terracotta hover:text-terracotta transition-colors self-start md:self-auto"
        >
          <Camera className="h-3.5 w-3.5 text-terracotta" />
          <span>Explore Full Testimonials &amp; Photo Archive</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIALS.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-3xl border border-sand-border bg-linen overflow-hidden shadow-sm hover:shadow-md transition-all"
          >
            <div>
              {item.photoUrl && (
                <div className="relative h-52 w-full overflow-hidden bg-sand">
                  <Image
                    src={item.photoUrl}
                    alt={item.photoCaption || item.retreatAttended}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-sage-dark/80 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="rounded-full bg-linen/90 px-3 py-0.5 text-[10px] uppercase tracking-wider font-semibold text-olive">
                      {item.retreatAttended}
                    </span>
                    {item.sleepGain && (
                      <span className="rounded-full bg-terracotta px-2.5 py-0.5 text-[10px] font-semibold text-linen">
                        {item.sleepGain}
                      </span>
                    )}
                  </div>
                  {item.photoCaption && (
                    <p className="absolute bottom-2.5 left-3 right-3 text-[11px] text-linen/90 font-light">
                      {item.photoCaption}
                    </p>
                  )}
                </div>
              )}

              <div className="p-6 sm:p-7 space-y-4 relative">
                <Quote className="h-7 w-7 text-sand-border/80 absolute top-5 right-5" />
                <div className="flex items-center gap-1 text-terracotta">
                  {[...Array(5)].map((_, sIdx) => (
                    <Star key={sIdx} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-sage/85 leading-relaxed italic font-serif">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>
            </div>

            <div className="px-6 sm:px-7 py-4 bg-sand/30 border-t border-sand-border/70 flex items-center justify-between">
              <div>
                <h4 className="font-serif text-base text-sage font-medium">{item.author}</h4>
                <p className="text-[11px] text-terracotta font-medium">{item.role}</p>
                <p className="text-[10px] text-sage/60">{item.location}</p>
              </div>
              <Heart className="h-4 w-4 text-olive/60" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
