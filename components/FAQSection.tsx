"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: "Philosophy" | "Experience" | "Travel & Logistics";
}

const FAQS: FAQItem[] = [
  {
    category: "Philosophy",
    question: "How does KAI differ from typical wellness or yoga retreats?",
    answer:
      "Most retreats offer temporary escapes with generic classes. KAI was founded by Kareena Islam to treat the root of modern burnout: chronic nervous system stress and exhaustion. Every schedule, breathwork cadence, Yin pose, and 432Hz crystal bowl frequency is clinical-grade and intentionally sequenced to shift your body from chronic fight-or-flight tension into deep, restful peace.",
  },
  {
    category: "Experience",
    question: "Do I need previous experience in yoga, breathwork, or sound healing?",
    answer:
      "Not at all. With Kareena’s clinical nursing background and RYT certifications, movement practices prioritize orthopedic safety, anatomical modifications, and restorative myofascial release. Every session meets your body exactly where it is, whether you are an experienced practitioner or have never stepped on a yoga mat.",
  },
  {
    category: "Travel & Logistics",
    question: "How does Grand Travel & Cruise secure the best rates and private estate access?",
    answer:
      "With over 25 years as a host agency powerhouse and elite Funjet 500 Club recognition under Jay Islam, Grand Travel & Cruise commands high-volume global purchasing power. We negotiate full private estate buyouts, preferred group air contracts, complimentary villa upgrades, and exclusive industry rates that individual travelers or ordinary retreat hosts cannot secure on their own. You experience secluded multi-million dollar estates at preferred pricing.",
  },
  {
    category: "Experience",
    question: "How do KAI retreats connect guests with authentic local customs and culture?",
    answer:
      "Honored as a Future Leaders in Travel advisor, Kareena rejects sterile tourist enclaves. Every sanctuary is built around intimate, respectful cultural immersion through long-standing relationships with local elders, priests, artisans, and organic farmers. Guests experience sacred local customs—such as private Melukat water purification ceremonies led by Balinese high priests, generational olive harvest tables in Ravello, and native botanical medicine in Costa Rica—with deep reverence and authenticity.",
  },
  {
    category: "Travel & Logistics",
    question: "How does travel booking and flight coordination work?",
    answer:
      "Through our direct backing by Grand Travel & Cruise (25+ years of host agency mastery), our dedicated travel desk manages every detail: optimal flight routing, schedule change protections, luggage handling, and private chauffeured VIP transfers directly to sanctuary gates. We eliminate travel friction entirely so your body unwinds and settles into ease the moment you leave home.",
  },
  {
    category: "Experience",
    question: "Can dietary preferences, allergies, or restrictions be accommodated?",
    answer:
      "Yes, completely. Prior to arrival, you complete a comprehensive clinical wellness and dietary intake form. Our chefs prepare organic, anti-inflammatory, farm-to-table meals tailored precisely to gluten-free, vegan, vegetarian, dairy-free, or specific allergy profiles.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="rounded-3xl border border-sand-border bg-sand/40 p-8 sm:p-14 space-y-10">
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-terracotta font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-terracotta" />
          Clarity & Sanctuary Care
        </span>
        <h2 className="font-serif text-3xl sm:text-5xl text-sage font-light">
          Frequently Asked Questions
        </h2>
        <p className="text-xs sm:text-sm text-sage/80 leading-relaxed font-light">
          Everything you need to know about our retreats, restorative movement, cultural immersions, and travel planning powered by Grand Travel.
        </p>
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;

          return (
            <div
              key={idx}
              className="rounded-2xl border border-sand-border bg-linen overflow-hidden transition-all"
            >
              <button
                onClick={() => toggleItem(idx)}
                className="w-full flex items-center justify-between p-5 sm:p-6 text-left focus:outline-none"
                aria-expanded={isOpen}
              >
                <div className="pr-4 space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-olive font-semibold block">
                    {faq.category}
                  </span>
                  <h3 className="font-serif text-lg sm:text-xl text-sage font-normal">
                    {faq.question}
                  </h3>
                </div>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sand text-sage transition-transform duration-300 ${
                    isOpen ? "rotate-180 bg-sage text-linen" : ""
                  }`}
                >
                  <ChevronDown className="h-4 w-4" />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-sage/80 leading-relaxed border-t border-sand-border/60">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
