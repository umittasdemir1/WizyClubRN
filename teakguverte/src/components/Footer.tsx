import { Instagram, Phone } from "lucide-react";
import { COMPANY_INFO, SERVICES } from "@/constants/data";

export default function Footer() {
  return (
    <footer id="contact" className="py-10 md:py-12">
      <div className="mx-auto max-w-[1400px] px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          <div className="flex items-start">
            <img
              src="/guverteteakicon.svg"
              alt="Güverte Teak"
              className="h-24 w-auto object-contain md:h-28"
            />
          </div>

          <div>
            <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/35">
              Hizmetler
            </h4>
            <ul className="space-y-2.5">
              {SERVICES.map((service) => (
                <li key={service.id}>
                  <a
                    href="#services"
                    className="text-sm text-charcoal/60 transition-colors hover:text-charcoal"
                  >
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal/35">
              İletişim
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <Phone className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-marine-navy/60" />
                <span className="text-sm text-charcoal/60">{COMPANY_INFO.phone}</span>
              </li>
              <li>
                <a
                  href={COMPANY_INFO.social.instagram}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="inline-flex items-center gap-3 text-sm text-charcoal/60 transition-colors hover:text-charcoal"
                >
                  <Instagram className="h-4 w-4 text-marine-navy/60" />
                  <span>Instagram</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
