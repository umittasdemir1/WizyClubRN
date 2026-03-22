"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { SERVICES, PROJECTS, MATERIALS } from "@/constants/data";

function ServicesSection() {
  return (
    <section id="services" className="py-24 md:py-32 bg-pearl-white">
      <div className="max-w-[1400px] mx-auto px-8">
        {/* Section Header — centered, Rixos style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 md:mb-28"
        >
          <span className="text-marine-navy text-[11px] tracking-[0.3em] uppercase font-medium">
            Hizmetler
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold mt-4 leading-tight">
            Ustalığın Üç Boyutu
          </h2>
        </motion.div>

        {/* Asymmetric service cards */}
        <div className="space-y-20 md:space-y-0 md:grid md:grid-cols-12 md:gap-6 md:gap-y-20">
          {SERVICES.map((service, i) => {
            // Rixos-style asymmetric grid: alternate image sizes
            const isWide = i % 2 === 0;
            const imageCol = isWide ? "md:col-span-7" : "md:col-span-5";
            const textCol = isWide ? "md:col-span-5" : "md:col-span-7";

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.8 }}
                className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center"
              >
                {/* Image */}
                <div
                  className={`${imageCol} relative overflow-hidden rounded-lg ${
                    i % 2 === 1 ? "md:order-2" : ""
                  }`}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-lg">
                    <div
                      className="w-full h-full bg-cover bg-center hover:scale-105 transition-transform duration-700"
                      style={{ backgroundImage: `url('${service.image}')` }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`${textCol} ${
                    i % 2 === 1 ? "md:order-1 md:pr-8" : "md:pl-8"
                  }`}
                >
                  <span className="text-marine-navy text-[10px] tracking-[0.3em] uppercase font-semibold">
                    {service.subtitle}
                  </span>
                  <h3 className="font-display text-3xl md:text-4xl text-charcoal font-semibold mt-3 mb-5">
                    {service.title}
                  </h3>
                  <p className="text-charcoal-muted text-[15px] leading-relaxed mb-8">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {service.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-4 py-2 bg-pearl-warm text-charcoal text-xs font-medium tracking-wide rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section id="projects" className="py-24 md:py-32 bg-pearl-warm">
      <div className="max-w-[1400px] mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-marine-navy text-[11px] tracking-[0.3em] uppercase font-medium">
            Referans Projeler
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold mt-4 leading-tight">
            Portföyümüz
          </h2>
        </motion.div>

        {/* Rixos-style asymmetric grid: 1 big + 1 small per row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {PROJECTS.map((project, i) => {
            const isBig = i % 3 === 0;
            const colSpan = isBig ? "md:col-span-7" : "md:col-span-5";
            const aspect = isBig ? "aspect-[16/10]" : "aspect-[4/3]";

            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`${colSpan} group relative overflow-hidden ${aspect} rounded-lg cursor-pointer`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-700"
                  style={{ backgroundImage: `url('${project.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                {/* Hover arrow */}
                <div className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/0 group-hover:bg-white/20 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100">
                  <ArrowUpRight className="w-5 h-5 text-white" />
                </div>

                {/* Project Info */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <span className="text-marine-navy text-[10px] tracking-[0.2em] uppercase font-semibold">
                    {project.type} · {project.year}
                  </span>
                  <h3 className="font-display text-xl md:text-2xl text-white font-semibold mt-1.5">
                    {project.name}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-white/50 text-xs tracking-wide">
                    <span>{project.length} LOA</span>
                    <span className="w-1 h-1 rounded-full bg-white/30" />
                    <span>{project.area} Güverte</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MaterialsSection() {
  return (
    <section id="materials" className="py-24 md:py-32 bg-pearl-white">
      <div className="max-w-[1400px] mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20"
        >
          <span className="text-marine-navy text-[11px] tracking-[0.3em] uppercase font-medium">
            Malzemeler
          </span>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl text-charcoal font-semibold mt-4 leading-tight">
            Hammaddede Uzlaşmasız Kalite
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MATERIALS.map((material, i) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group bg-pearl-warm rounded-xl p-8 md:p-10 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-500 border border-transparent hover:border-pearl-muted"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="text-marine-navy text-[10px] tracking-[0.2em] uppercase font-semibold">
                  {material.origin}
                </span>
                <span className="px-3 py-1 bg-white/80 text-charcoal-muted text-[10px] tracking-[0.15em] font-semibold rounded-full">
                  {material.grade}
                </span>
              </div>

              <h3 className="font-display text-2xl text-charcoal font-semibold mb-3">
                {material.name}
              </h3>
              <p className="text-charcoal-muted text-sm leading-relaxed mb-8">
                {material.description}
              </p>

              <ul className="space-y-3">
                {material.properties.map((prop) => (
                  <li
                    key={prop}
                    className="flex items-center gap-3 text-sm text-charcoal"
                  >
                    <div className="w-1 h-1 rounded-full bg-marine-navy" />
                    {prop}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ServicesSection, ProjectsSection, MaterialsSection };
