"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

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

        setIsVisible(!(currentScrollY > lastScrollYRef.current && currentScrollY > 100));
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
      className={`fixed left-0 right-0 top-0 z-50 border-b border-slate-100/60 bg-white/75 backdrop-blur-2xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 sm:py-2 lg:px-12 lg:py-2.5">
        <a href="#hero" className="group flex items-center">
          <img
            src="/guverteteakicon.svg"
            alt="Güverte Teak"
            className="h-12 w-auto object-contain transition-transform duration-500 group-hover:scale-105 sm:h-14 lg:h-16"
          />
        </a>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex xl:gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-body text-[13px] font-medium tracking-[0.18em] text-charcoal transition-colors hover:text-marine-navy xl:text-[14px]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="https://wa.me/905539016917?text=Merhaba%2C%20ileti%C5%9Fime%20ge%C3%A7mek%20istiyorum."
            target="_blank"
            rel="noreferrer"
            className="cta-orbit-ring inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-semibold leading-none text-slate-500 transition-colors hover:text-charcoal"
          >
            <span className="translate-y-[0.5px]">İLETİŞİM</span>
          </a>
        </div>

        <button
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-full p-2 text-charcoal transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Menü"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl lg:hidden"
          >
            <nav className="flex flex-col gap-4 px-4 py-5 sm:px-6">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-body text-[15px] font-medium tracking-[0.14em] text-charcoal transition-colors hover:text-marine-navy"
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
