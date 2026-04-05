"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section id="hero" className="relative w-full">
      <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">

        {/* Arka plan */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero.webp')" }}
        />

        {/* Gradient */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.1)_40%,rgba(0,0,0,0.15)_55%,rgba(0,0,0,0.82)_100%)]" />

        {/* Boşluk — metni alta iter */}
        <div className="relative z-10 flex flex-1" />

        {/* Hero text */}
        <div className="relative z-10 px-6 pb-12 sm:px-10 sm:pb-16 lg:px-16 lg:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Ana başlık */}
            <h1 className="font-display font-light leading-[0.88] tracking-tight text-white">
              <span className="block text-[3.8rem] sm:text-[5.6rem] lg:text-[7.6rem] xl:text-[9rem]">
                Denizin
              </span>
              <span className="block text-[3.8rem] sm:text-[5.6rem] lg:text-[7.6rem] xl:text-[9rem]">
                Üzerinde
              </span>
              <span className="block text-[3.8rem] sm:text-[5.6rem] lg:text-[7.6rem] xl:text-[9rem]">
                Bir Zarafet.
              </span>
            </h1>

            <p className="mt-7 max-w-sm font-body text-[14px] font-normal leading-relaxed text-white/80 sm:mt-8 sm:text-[15px]">
              Burma teak ve plantation ahşabıyla yeni imalat,
              refit ve bakım — güvertede kalıcı bir iz.
            </p>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
