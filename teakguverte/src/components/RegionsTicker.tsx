const SERVICE_REGIONS = [
  "BODRUM",
  "GÖCEK",
  "MİLAS",
  "YALIKAVAK",
  "TÜRKBÜKÜ",
  "MARMARİS",
  "FETHİYE",
  "EGE BÖLGESİ",
] as const;

const LOOPED_REGIONS = [...SERVICE_REGIONS, ...SERVICE_REGIONS];

export default function RegionsTicker() {
  return (
    <section className="px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-5 lg:px-6" aria-label="Hizmet Bölgeleri">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.32em] text-[#080A0F] sm:text-[12px]">
          Hizmet verdiğimiz bölgeler
        </p>

        <div className="regions-flow py-3">
          <div className="regions-flow-track">
            {LOOPED_REGIONS.map((region, index) => (
              <span key={`${region}-${index}`} className="regions-flow-item">
                {region}
              </span>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-sm leading-relaxed text-[#080A0F] sm:text-[15px]">
          Bodrum, Göcek, Milas ve Ege Bölgesi genelinde tik güverte kaplama,
          teak deck yenileme ve yat güverte uygulamaları sunuyoruz.
        </p>
      </div>
    </section>
  );
}
