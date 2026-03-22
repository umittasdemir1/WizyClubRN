"use client";

import { motion } from "framer-motion";
import { SERVICES, PROJECTS, MATERIALS } from "@/constants/data";

function ServicesSection() {
  return (
    <section id="services" className="bg-pearl-white py-14 md:py-20">
      <div className="mx-auto max-w-[1400px] px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center md:mb-14"
        >
          <span className="text-[13px] font-medium uppercase tracking-[0.3em] text-marine-navy md:text-[14px]">
            Hizmetler
          </span>
          <h2 className="mt-4 font-display text-[3.2rem] font-semibold leading-tight text-charcoal md:text-[4.4rem] lg:text-[5.4rem]">
            Tik Güverte Uygulamalarında
            <br className="hidden sm:block" />
            Uçtan Uca Uzmanlık
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-charcoal/65 md:text-lg">
            Yeni imalat, refit ve bakım süreçlerinde; malzeme seçimi, işçilik ve
            uzun ömürlü kullanım performansını tek standartta bir araya getiriyoruz.
          </p>
        </motion.div>

        <div className="space-y-12 md:space-y-14">
          {SERVICES.map((service) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8 }}
              className="grid grid-cols-1 items-start gap-8 md:grid-cols-12 md:gap-12"
            >
              <div className="md:col-span-5 md:pr-4">
                <h3 className="mb-10 font-display text-[3.2rem] font-normal leading-[0.9] tracking-tight text-charcoal md:text-[4.4rem] lg:text-[5.1rem]">
                  {service.subtitle}
                </h3>
                <p className="text-[19px] font-light leading-relaxed text-charcoal/72 md:text-[21px] lg:text-[22px]">
                  {service.description}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-lg md:col-span-7">
                <div className="aspect-[4/3] overflow-hidden rounded-lg">
                  <div
                    className="h-full w-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{ backgroundImage: `url('${service.image}')` }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProjectsSection() {
  return (
    <section id="projects" className="bg-pearl-warm py-24 md:py-32">
      <div className="mx-auto max-w-[1400px] px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-12 text-center"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-marine-navy">
            Referans Projeler
          </span>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-charcoal md:text-5xl lg:text-6xl">
            Portföyümüz
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
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
                className={`${colSpan} ${aspect} group relative overflow-hidden rounded-lg`}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${project.image}')` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-marine-navy">
                    {project.type} · {project.year}
                  </span>
                  <h3 className="mt-1.5 font-display text-xl font-semibold text-white md:text-2xl">
                    {project.name}
                  </h3>
                  <div className="mt-2 flex items-center gap-4 text-xs tracking-wide text-white/60">
                    <span>{project.length} LOA</span>
                    <span className="h-1 w-1 rounded-full bg-white/30" />
                    <span>{project.area} güverte</span>
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
    <section id="materials" className="bg-pearl-white py-16 md:py-20">
      <div className="mx-auto max-w-[1400px] px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-20 text-center"
        >
          <span className="text-[13px] font-medium uppercase tracking-[0.3em] text-marine-navy md:text-[14px]">
            Malzemeler
          </span>
          <h2 className="mt-4 font-display text-[3.2rem] font-semibold leading-tight text-charcoal md:text-[4.4rem] lg:text-[5.4rem]">
            Hammaddede Uzlaşmasız Kalite
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {MATERIALS.map((material, i) => (
            <motion.div
              key={material.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="group relative min-h-[560px] overflow-hidden rounded-[28px]"
            >
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                style={{ backgroundImage: `url('${material.image}')` }}
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,10,15,0.12)_0%,rgba(8,10,15,0.34)_36%,rgba(8,10,15,0.82)_100%)]" />

              <div className="relative flex h-full flex-col justify-end p-8 text-white md:p-10">
                <span className="absolute left-8 top-8 text-[13px] font-semibold uppercase tracking-[0.28em] text-white/88 md:left-10 md:top-10 md:text-[15px]">
                  {material.origin}
                </span>
                <span className="absolute right-8 top-8 rounded-full bg-white/14 px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-white backdrop-blur-md md:right-10 md:top-10">
                  {material.grade}
                </span>

                <h3 className="mb-3 font-display text-[2.2rem] font-semibold tracking-tight text-white md:text-[2.6rem]">
                  {material.name}
                </h3>
                <p className="mb-8 max-w-xl text-[15px] leading-relaxed text-white/84 md:text-base">
                  {material.description}
                </p>

                <ul className="space-y-3">
                  {material.properties.map((prop) => (
                    <li key={prop} className="flex items-center gap-3 text-sm text-white/92">
                      <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
                      {prop}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ServicesSection, ProjectsSection, MaterialsSection };
