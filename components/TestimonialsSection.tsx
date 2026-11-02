import React from "react";
import { Sparkles, Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  location: string;
  retreatAttended: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "As an acute care physician, I spend my life in fight-or-flight. Most retreats offer superficial pampering, but Kareena's clinical understanding of nervous system calming and restorative sleep completely reset my physiology. The 432Hz crystal bowl sound sessions in the evening produced the first uninterrupted 8-hour sleep I've had in six years.",
    author: "Dr. Sophia Martinez, MD",
    role: "Emergency Medicine Physician",
    location: "Houston, TX",
    retreatAttended: "Costa Rica Canopy Sanctuary",
  },
  {
    quote:
      "Having 12 people instead of 40 made all the difference. Kareena holds space with medical authority and radiant warmth. There was no spiritual bypassing or forced awkward sharing—just pure, anatomically grounded rest, exquisite organic food, and effortless travel logistics.",
    author: "Elena Rostova",
    role: "Managing Director, Global Strategy",
    location: "New York, NY",
    retreatAttended: "Amalfi Coast Sanctuary",
  },
  {
    quote:
      "Kareena Islam has created something genuinely rare: an intersection of deep anatomical precision and sacred luxury. From the seamless VIP airport pickup arranged by Grand Travel to the quiet sunrise breathwork, every single minute felt curated for restoration.",
    author: "Marcus Vance",
    role: "Architect & Spatial Designer",
    location: "Chicago, IL",
    retreatAttended: "Riviera Maya Sanctuary",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="space-y-10 py-6">
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-terracotta" />
          Voices of Renewal
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
          What Our Guests Experience
        </h2>
        <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
          Reflections from executives, clinicians, and seekers who found true nervous system reset and renewal in our sanctuaries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {TESTIMONIALS.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-3xl border border-sand-border bg-linen p-8 shadow-sm space-y-6 relative"
          >
            <Quote className="h-8 w-8 text-sand-border/80 absolute top-6 right-6" />

            <div className="space-y-4 relative z-10">
              <span className="inline-block rounded-full bg-sand px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-olive">
                {item.retreatAttended}
              </span>

              <p className="text-xs sm:text-sm text-sage/85 leading-relaxed italic font-serif">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            <div className="pt-4 border-t border-sand-border/70 space-y-0.5">
              <h4 className="font-serif text-base text-sage font-medium">{item.author}</h4>
              <p className="text-[11px] text-terracotta font-medium">{item.role}</p>
              <p className="text-[10px] text-sage/60">{item.location}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
