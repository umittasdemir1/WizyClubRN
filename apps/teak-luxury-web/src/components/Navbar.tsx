"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Anchor, ArrowRight, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "HİZMETLER", href: "#services" },
  { label: "PROJELER", href: "#projects" },
  { label: "MALZEMELER", href: "#materials" },
  { label: "TEKLİFLER", href: "#quote" },
] as const;

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const currentScrollY = window.scrollY;
        const hero = document.getElementById("hero");
        const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;

        if (heroBottom > 120) {
          setIsVisible(true);
          lastScrollYRef.current = currentScrollY;
          return;
        }

        if (currentScrollY > lastScrollYRef.current && currentScrollY > 100) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b border-slate-100/60 bg-white/70 backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5 sm:px-12">
        {/* Brand — Left */}
        <a href="#hero" className="group flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-charcoal transition-transform duration-500 group-hover:scale-105">
            <Anchor className="h-5 w-5 text-marine-navy" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-charcoal">
            Güverte<span className="font-light text-charcoal/50"> Teak</span>
          </span>
        </a>

        {/* Nav — Absolutely Centered */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-[13px] font-medium tracking-wide text-charcoal transition-colors hover:text-marine-navy"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="#quote"
            className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-100 bg-white/50 px-5 py-2 text-[11px] font-semibold text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white/80 hover:text-charcoal"
          >
            TEKLİF AL
            <ArrowRight className="h-3.5 w-3.5 text-marine-navy" />
          </a>
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-charcoal lg:hidden"
          aria-label="Menü"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-white/90 backdrop-blur-xl lg:hidden"
          >
            <nav className="flex flex-col gap-4 px-8 py-6">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-body text-[13px] font-medium tracking-wide text-charcoal hover:text-marine-navy transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
