"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Wind, ChevronRight, Plane } from "lucide-react";
import SoundAndBreathModal from "./SoundAndBreathModal";
import FlightConciergeModal from "./FlightConciergeModal";

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSomaticModalOpen, setIsSomaticModalOpen] = useState(false);
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);

  // Close mobile drawer upon path change during render
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileMenuOpen(false);
  }

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Sanctuaries", href: "/retreats" },
    { label: "The Hearts Behind KAI", href: "/about" },
    { label: "Reserve", href: "/book" },
  ];

  // The portal has its own header.
  if (pathname === "/portal" || pathname.startsWith("/portal/")) return null;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
          isScrolled
            ? "glass-header shadow-sm py-3.5"
            : "bg-linen/85 backdrop-blur-md py-5 border-b border-sand-border/50"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
              <img
                src="/kai-logo.png"
                alt="KAI Wellness Retreats"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif text-xl tracking-[0.2em] uppercase text-sage font-medium">
                KAI
              </span>
              <span className="text-[9px] uppercase tracking-[0.25em] text-olive font-medium -mt-1">
                Wellness Retreats
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs uppercase tracking-[0.18em] transition-colors relative py-1 ${
                    isActive
                      ? "text-sage font-semibold"
                      : "text-sage/75 hover:text-sage font-medium"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-terracotta"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions (Somatic tool + Flight Desk + Book CTA) */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setIsFlightModalOpen(true)}
              className="group flex items-center gap-1.5 rounded-full border border-sand-border/80 bg-linen px-3.5 py-2 text-[11px] font-medium uppercase tracking-wider text-sage hover:border-olive hover:text-olive transition-all"
              title="Grand Travel & Cruise Flight Desk & VIP Concierge"
            >
              <Plane className="h-3.5 w-3.5 text-terracotta group-hover:-translate-y-0.5 transition-transform" />
              <span>Flight Desk</span>
            </button>

            <button
              onClick={() => setIsSomaticModalOpen(true)}
              className="group flex items-center gap-2 rounded-full border border-sand-border/80 bg-sand/60 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-sage hover:bg-sand transition-all"
              title="Interactive 4-7-8 breathwork and crystal bowl sound bath"
            >
              <Wind className="h-3.5 w-3.5 text-olive group-hover:rotate-45 transition-transform" />
              <span>Somatic Reset</span>
            </button>

            <Link
              href="/book"
              className="rounded-full bg-sage px-5 py-2 text-xs font-medium uppercase tracking-widest text-linen hover:bg-sage-dark transition-all shadow-sm hover:shadow"
            >
              Reserve 2027
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setIsFlightModalOpen(true)}
              className="rounded-full p-2 text-sage hover:bg-sand"
              aria-label="Flight Desk"
            >
              <Plane className="h-5 w-5 text-terracotta" />
            </button>
            <button
              onClick={() => setIsSomaticModalOpen(true)}
              className="rounded-full p-2 text-sage hover:bg-sand"
              aria-label="Somatic Reset"
            >
              <Wind className="h-5 w-5 text-olive" />
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-full p-2 text-sage hover:bg-sand transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:hidden border-b border-sand-border bg-linen px-6 py-6"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between py-2 text-sm uppercase tracking-widest text-sage border-b border-sand-border/40 font-medium"
                  >
                    <span>{link.label}</span>
                    <ChevronRight className="h-4 w-4 text-olive" />
                  </Link>
                ))}

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsFlightModalOpen(true);
                  }}
                  className="mt-2 flex items-center justify-center gap-2 rounded-full border border-sand-border bg-linen py-3 text-xs uppercase tracking-wider text-sage"
                >
                  <Plane className="h-4 w-4 text-terracotta" />
                  Grand Travel Flight Desk
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsSomaticModalOpen(true);
                  }}
                  className="mt-1 flex items-center justify-center gap-2 rounded-full border border-sand-border bg-sand py-3 text-xs uppercase tracking-wider text-sage"
                >
                  <Wind className="h-4 w-4 text-olive" />
                  Somatic Breath & Sound Reset
                </button>

                <Link
                  href="/book"
                  className="mt-1 flex items-center justify-center rounded-full bg-sage py-3 text-xs uppercase tracking-widest text-linen font-medium shadow"
                >
                  Reserve Your Spot
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Somatic Modal */}
      <SoundAndBreathModal
        isOpen={isSomaticModalOpen}
        onClose={() => setIsSomaticModalOpen(false)}
      />

      {/* Flight Concierge Modal */}
      <FlightConciergeModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
      />
    </>
  );
}
