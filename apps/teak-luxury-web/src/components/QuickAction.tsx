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
    <section id="quote" className="py-20 md:py-28 bg-pearl-white">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-14"
        >
          <span className="text-marine-navy text-[11px] tracking-[0.3em] uppercase font-medium">
            Hızlı Teklif
          </span>
          <h2 className="font-display text-4xl md:text-5xl text-charcoal font-semibold mt-3">
            Projenizi Başlatın
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-black/5 border border-pearl-muted overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-4">
            {/* Boat Type */}
            <div className="px-6 py-6 border-b md:border-b-0 md:border-r border-pearl-muted">
              <label className="block text-[10px] text-charcoal-muted tracking-[0.2em] uppercase font-semibold mb-2">
                Tekne Tipi
              </label>
              <select
                value={boatType}
                onChange={(e) => setBoatType(e.target.value)}
                className="w-full bg-transparent text-charcoal text-sm font-medium focus:outline-none cursor-pointer appearance-none"
              >
                <option value="">Seçiniz</option>
                {BOAT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Deck Area */}
            <div className="px-6 py-6 border-b md:border-b-0 md:border-r border-pearl-muted">
              <label className="block text-[10px] text-charcoal-muted tracking-[0.2em] uppercase font-semibold mb-2">
                Güverte Alanı
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="m² giriniz"
                  className="w-full bg-transparent text-charcoal text-sm font-medium focus:outline-none placeholder:text-charcoal/30"
                />
              </div>
            </div>

            {/* Material */}
            <div className="px-6 py-6 border-b md:border-b-0 md:border-r border-pearl-muted">
              <label className="block text-[10px] text-charcoal-muted tracking-[0.2em] uppercase font-semibold mb-2">
                Malzeme Tercihi
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full bg-transparent text-charcoal text-sm font-medium focus:outline-none cursor-pointer appearance-none"
              >
                <option value="">Seçiniz</option>
                {MATERIALS_OPTIONS.map((mat) => (
                  <option key={mat} value={mat}>
                    {mat}
                  </option>
                ))}
              </select>
            </div>

            {/* CTA */}
            <button className="group px-6 py-6 bg-marine-navy hover:bg-marine-navy-dark transition-all duration-300 flex items-center justify-center gap-2">
              <span className="text-white text-sm font-semibold tracking-wide">
                Teklif Al
              </span>
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
