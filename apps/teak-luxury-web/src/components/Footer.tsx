"use client";

import { motion } from "framer-motion";
import { Phone, Mail, MapPin } from "lucide-react";
import { COMPANY_INFO, SERVICES } from "@/constants/data";

export default function Footer() {
  return (
    <footer id="contact" className="bg-charcoal text-white">
      {/* CTA Band */}
      <div className="border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-8 py-20 md:py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-marine-navy text-[11px] tracking-[0.3em] uppercase font-medium">
              İletişim
            </span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold mt-4 leading-tight">
              Projenizi Konuşalım
            </h2>
            <a
              href={`mailto:${COMPANY_INFO.email}`}
              className="inline-block mt-10 px-10 py-4 bg-marine-navy text-white text-sm font-medium tracking-wider uppercase hover:bg-marine-navy-dark transition-colors duration-300 rounded-full"
            >
              İletişime Geçin
            </a>
          </motion.div>
        </div>
      </div>

      {/* Footer Grid */}
      <div className="max-w-[1400px] mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8">
          {/* Brand */}
          <div>
            <span className="font-display text-xl font-extrabold tracking-[0.04em]">
              GÜVERTE
            </span>
            <span className="block text-[10px] tracking-[0.4em] text-white/30 font-light uppercase mt-0.5 mb-6">
              TEAK
            </span>
            <p className="text-white/30 text-sm leading-relaxed">
              28 yıllık deneyim ile lüks yat güverte imalatında Türkiye&apos;nin
              öncü markası.
            </p>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-white/20 font-semibold mb-6">
              Hizmetler
            </h4>
            <ul className="space-y-3">
              {SERVICES.map((service) => (
                <li key={service.id}>
                  <a
                    href="#services"
                    className="text-white/40 text-sm hover:text-white transition-colors"
                  >
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-white/20 font-semibold mb-6">
              Kurumsal
            </h4>
            <ul className="space-y-3">
              {["Hakkımızda", "Kariyer", "Sürdürülebilirlik", "Basın"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-white/40 text-sm hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-[10px] tracking-[0.2em] uppercase text-white/20 font-semibold mb-6">
              İletişim
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <Phone className="w-3.5 h-3.5 text-marine-navy/60 mt-1 flex-shrink-0" />
                <span className="text-white/40 text-sm">
                  {COMPANY_INFO.phone}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-3.5 h-3.5 text-marine-navy/60 mt-1 flex-shrink-0" />
                <span className="text-white/40 text-sm">
                  {COMPANY_INFO.email}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-3.5 h-3.5 text-marine-navy/60 mt-1 flex-shrink-0" />
                <span className="text-white/40 text-sm">
                  {COMPANY_INFO.address}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/15 text-xs tracking-wider">
            © 2024 {COMPANY_INFO.name}. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-8">
            {["Instagram", "LinkedIn", "YouTube"].map((social) => (
              <a
                key={social}
                href="#"
                className="text-white/15 text-xs tracking-wider hover:text-white transition-colors"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
