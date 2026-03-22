"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const BOAT_TYPES = [
  "Motor Yat",
  "Yelkenli",
  "Gulet",
  "Mega Yat",
  "Katamaran",
] as const;

const MATERIALS_OPTIONS = [
  "Burma Teak",
  "Plantation Teak",
  "Sentetik Teak",
] as const;

export default function QuickAction() {
  const [boatType, setBoatType] = useState("");
  const [area, setArea] = useState("");
  const [material, setMaterial] = useState("");

  return (
    <section id="quote" className="bg-pearl-white py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-14 text-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-marine-navy">
            Hızlı Teklif
          </span>
          <h2 className="mt-3 font-display text-4xl font-semibold text-charcoal md:text-5xl">
            Projenizi Başlatın
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-pearl-muted bg-white shadow-xl shadow-black/5"
        >
          <div className="grid grid-cols-1 md:grid-cols-4">
            <div className="border-b border-pearl-muted px-6 py-6 md:border-b-0 md:border-r">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal-muted">
                Tekne Tipi
              </label>
              <select
                value={boatType}
                onChange={(e) => setBoatType(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-sm font-medium text-charcoal focus:outline-none"
              >
                <option value="">Seçiniz</option>
                {BOAT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-b border-pearl-muted px-6 py-6 md:border-b-0 md:border-r">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal-muted">
                Güverte Alanı
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="m² giriniz"
                  className="w-full bg-transparent text-sm font-medium text-charcoal placeholder:text-charcoal/30 focus:outline-none"
                />
              </div>
            </div>

            <div className="border-b border-pearl-muted px-6 py-6 md:border-b-0 md:border-r">
              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal-muted">
                Malzeme Tercihi
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-sm font-medium text-charcoal focus:outline-none"
              >
                <option value="">Seçiniz</option>
                {MATERIALS_OPTIONS.map((mat) => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            <button className="group flex items-center justify-center gap-2 bg-marine-navy px-6 py-6 transition-all duration-300 hover:bg-marine-navy-dark">
              <span className="text-sm font-semibold tracking-wide text-white">Teklif Al</span>
              <ArrowRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
