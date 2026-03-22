"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    /* pt-[81px] = header height (py-5 + content), then outer padding */
    <section
      id="hero"
      className="relative w-full px-4 pb-[10px] pt-[89px] md:px-6 md:pb-[10px] md:pt-[93px]"
      style={{ height: "100dvh" }}
    >
      {/* Rounded hero container — fills from header to 10px from bottom */}
      <div className="relative h-full w-full overflow-hidden rounded-3xl">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1920&q=80')",
          }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/55" />

        {/* Center Content */}
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-5 font-body text-[12px] font-medium uppercase tracking-[0.35em] text-white/60"
          >
            Hoşgeldiniz
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6 }}
            className="font-display text-[clamp(2.8rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-tight text-white"
          >
            Güverte Teak
          </motion.h1>
        </div>

        {/* Booking Bar — inside hero, bottom */}
        <div className="absolute bottom-5 left-5 right-5 z-20 md:bottom-7 md:left-7 md:right-7">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="mx-auto max-w-5xl"
          >
            <BookingBar />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BookingBar() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-charcoal/85 backdrop-blur-xl md:flex-row md:items-stretch">
      <Field label="Hizmetlerimiz" value="Yeni İmalat · Refit · Bakım" />
      <Field label="Tekne Tipi" value="Motor Yat · Yelkenli · Gulet" />
      <Field label="Malzemelerimiz" value="Burma Teak · Sentetik · Plantation" />

      {/* Last field + CTA */}
      <div className="flex items-center gap-4 border-t border-white/8 px-6 py-5 md:border-l md:border-t-0">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
            Özel Fiyatlar
          </div>
          <div className="truncate font-body text-[13px] font-medium text-white/90">
            Ücretsiz keşif ve teklif alın
          </div>
        </div>
        <a
          href="#quote"
          aria-label="Teklif Al"
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white transition-all duration-300 hover:scale-105 hover:bg-white/90"
        >
          <svg
            className="h-5 w-5 text-marine-navy"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 border-b border-white/8 px-6 py-5 md:border-b-0 md:border-r">
      <div className="mb-1.5 font-body text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
        {label}
      </div>
      <div className="font-body text-[13px] font-medium text-white/90">{value}</div>
    </div>
  );
}
