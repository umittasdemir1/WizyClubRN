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

// easing curves
const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;
const EASE_IN  = [0.4, 0.0, 1.0, 1.0] as const;

export default function Navbar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isOverHero, setIsOverHero] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    let rafId: number | null = null;

    const update = () => {
      const hero = document.getElementById("hero");
      const heroBottom = hero?.getBoundingClientRect().bottom ?? 0;
      const currentScrollY = window.scrollY;

      setIsOverHero(heroBottom > 80);

      if (heroBottom > 120) {
        setIsVisible(true);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      setIsVisible(!(currentScrollY > lastScrollYRef.current && currentScrollY > 100));
      lastScrollYRef.current = currentScrollY;
    };

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => { rafId = null; update(); });
    };

    update();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  const overHeroAndClosed = isOverHero && !mobileOpen;

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-[transform,opacity,background-color,backdrop-filter,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      } ${
        overHeroAndClosed
          ? "border-b border-transparent bg-transparent"
          : "border-b border-slate-100/60 bg-white"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-3.5 lg:px-12 lg:py-4">

        <a href="#hero" className="group flex items-center">
          <img
            src={mobileOpen ? "/guverteteakiconlight.svg" : "/guverteteakicon.svg"}
            alt="Güverte Teak"
            className={`h-10 w-auto object-contain transition-all duration-500 group-hover:scale-105 sm:h-12 lg:h-14 ${
              isOverHero && !mobileOpen ? "drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]" : ""
            }`}
          />
        </a>

        {/* Desktop nav */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex xl:gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`font-body text-[13px] font-medium tracking-[0.18em] transition-colors xl:text-[14px] ${
                isOverHero
                  ? "text-white hover:text-white/75"
                  : "text-charcoal hover:text-marine-navy"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="https://wa.me/905539016917?text=Merhaba%2C%20ileti%C5%9Fime%20ge%C3%A7mek%20istiyorum."
            target="_blank"
            rel="noreferrer"
            className={`inline-flex items-center justify-center rounded-full border px-5 py-2 text-[12px] font-semibold leading-none transition-all duration-300 ${
              isOverHero
                ? "border-white/30 bg-white/10 text-white backdrop-blur-sm hover:border-white/50 hover:bg-white/18"
                : "border-slate-200 text-slate-500 hover:border-slate-300 hover:text-charcoal"
            }`}
          >
            <span className="translate-y-[0.5px]">İLETİŞİM</span>
          </a>
        </div>

        {/* Hamburger — ikon geçişi smooth */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          className={`rounded-full p-2 transition-colors lg:hidden ${
            isOverHero && !mobileOpen
              ? "text-white hover:bg-white/15"
              : "text-charcoal hover:bg-slate-100"
          }`}
          aria-label="Menü"
        >
          <AnimatePresence mode="wait" initial={false}>
            {mobileOpen ? (
              <motion.span
                key="x"
                initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <X className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span
                key="menu"
                initial={{ opacity: 0, rotate: 45, scale: 0.7 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: -45, scale: 0.7 }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <Menu className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: -12,
              transition: { duration: 0.22, ease: EASE_IN },
            }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="flex flex-col border-t border-slate-100 px-4 pb-4 pt-1 sm:px-6 lg:hidden"
          >
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, delay: 0.06 + i * 0.055, ease: EASE_OUT }}
                className="border-b border-slate-100 py-4 font-body text-[16px] font-medium tracking-[0.08em] text-charcoal transition-opacity last:border-none active:opacity-50"
              >
                {link.label}
              </motion.a>
            ))}

            <motion.a
              href="https://wa.me/905539016917?text=Merhaba%2C%20ileti%C5%9Fime%20ge%C3%A7mek%20istiyorum."
              target="_blank"
              rel="noreferrer"
              onClick={() => setMobileOpen(false)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.06 + NAV_LINKS.length * 0.055, ease: EASE_OUT }}
              className="mt-3 flex items-center justify-center rounded-full bg-marine-navy py-3.5 text-[13px] font-semibold tracking-[0.14em] text-white transition-opacity hover:opacity-90"
            >
              İLETİŞİM
            </motion.a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
