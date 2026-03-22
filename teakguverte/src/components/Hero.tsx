"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative w-full px-4 pb-[10px] pt-[70px] sm:px-6 sm:pb-[10px] sm:pt-[82px] lg:px-6 lg:pb-[10px] lg:pt-[94px]"
    >
      <div className="relative flex min-h-[calc(100dvh-80px)] flex-col overflow-hidden rounded-[20px] sm:min-h-[calc(100dvh-92px)] sm:rounded-[22px] lg:min-h-[calc(100dvh-104px)] lg:rounded-[24px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/hero.webp')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/5 to-black/65" />

        <div className="relative z-10 flex flex-1" />

        <div className="relative z-10 px-3 pb-5 sm:px-5 sm:pb-5 lg:px-7 lg:pb-5">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9 }}
            className="mx-auto max-w-[1120px]"
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
    <div className="relative overflow-hidden rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.07))] shadow-[0_24px_70px_rgba(6,12,24,0.28)] backdrop-blur-[28px]">
      <div className="absolute inset-[1px] rounded-full bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06)_52%,rgba(255,255,255,0.03))]" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col md:flex-row md:items-center md:gap-4">
          <Field label="Hizmetlerimiz" value="Yeni İmalat · Refit · Bakım" />
          <Field label="Tekne Tipi" value="Motor Yat · Yelkenli · Gulet" />
          <Field label="Malzemelerimiz" value="Burma Teak · Plantation" />
          <Field label="Özel Fiyatlar" value="Ücretsiz keşif ve teklif alın" />
        </div>

        <div className="flex items-center justify-end px-3 pb-3.5 pt-0 md:flex-none md:px-4 md:py-3.5">
          <a
            href="#quote"
            aria-label="Teklif Al"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_8px_24px_rgba(8,16,30,0.18)] transition-all duration-300 hover:scale-105 hover:bg-white"
          >
            <svg
              className="h-4 w-4 text-marine-navy"
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-1 flex-col justify-center px-3 py-3 md:w-[224px] md:flex-none md:pl-8 md:pr-2 md:py-3.5">
      <div className="mb-1 font-body text-[10px] font-bold uppercase leading-none tracking-[0.24em] text-white sm:text-[12px]">
        {label}
      </div>
      <div className="font-body text-[14px] font-normal leading-tight text-white sm:text-[15px]">
        {value}
      </div>
    </div>
  );
}
