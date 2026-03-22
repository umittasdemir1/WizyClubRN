export const NAV_LINKS = [
  { label: "Ana Sayfa", href: "#hero" },
  { label: "Hizmetler", href: "#services" },
  { label: "Projeler", href: "#projects" },
  { label: "Malzemeler", href: "#materials" },
  { label: "İletişim", href: "#contact" },
] as const;

export const SERVICES = [
  {
    id: "new-build",
    title: "Yeni İmalat",
    subtitle: "Yeni İmalat",
    description:
      "Yatın karakterine, kullanım senaryosuna ve mimari diline özel tik güverte çözümleri geliştiriyoruz. Ölçü alma, yüzey kurgusu, derz planı ve uygulama detaylarını tek bir kalite standardında ele alarak yeni imalat projelerinde temiz, dengeli ve uzun ömürlü sonuçlar üretiyoruz.",
    image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80",
    features: [
      "Bodrum tik güverte",
      "Göcek teak deck",
      "Milas tik güverte kaplama",
      "Ege Bölgesi yat güverte",
    ],
  },
  {
    id: "refit",
    title: "Refit ve Yenileme",
    subtitle: "Refit ve Yenileme",
    description:
      "Mevcut güvertenin sökülmesi, alt yapının kontrol edilmesi ve yüzeyin yeniden kurgulanması süreçlerini uçtan uca yönetiyoruz. Orijinal tasarım dili korunabilir ya da teknenin güncel kullanım ihtiyaçlarına uygun, daha çağdaş ve rafine bir deck düzeni baştan oluşturulabilir.",
    image: "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80",
    features: [
      "Bodrum teak refit",
      "Göcek tik güverte yenileme",
      "Milas teak deck onarım",
      "Ege Bölgesi refit çözümleri",
    ],
  },
  {
    id: "maintenance",
    title: "Bakım ve Koruma",
    subtitle: "Bakım ve Koruma",
    description:
      "Periyodik bakım programlarıyla tik güvertenin estetik görünümünü ve yapısal performansını koruyoruz. Temizlik, yüzey yenileme, lokal onarım ve koruyucu uygulamalar sayesinde güvertenin servis ömrünü uzatan planlı bir bakım yaklaşımı sunuyoruz.",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    features: [
      "Bodrum tik güverte bakım",
      "Göcek teak deck bakım",
      "Milas güverte koruma",
      "Ege Bölgesi yat bakım",
    ],
  },
] as const;

export const PROJECTS = [
  {
    id: 1,
    name: "M/Y Aegean Spirit",
    length: "42m",
    area: "280 m²",
    type: "Yeni İmalat",
    year: 2024,
    image: "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80",
  },
  {
    id: 2,
    name: "S/Y Blue Horizon",
    length: "35m",
    area: "190 m²",
    type: "Refit",
    year: 2023,
    image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80",
  },
  {
    id: 3,
    name: "M/Y Bosphorus Queen",
    length: "55m",
    area: "420 m²",
    type: "Yeni İmalat",
    year: 2024,
    image: "https://images.unsplash.com/photo-1621277224630-81a0479c3505?w=800&q=80",
  },
  {
    id: 4,
    name: "S/Y Mediterranean Pearl",
    length: "28m",
    area: "145 m²",
    type: "Bakım",
    year: 2024,
    image: "https://images.unsplash.com/photo-1559599238-308793637427?w=800&q=80",
  },
] as const;

export const MATERIALS = [
  {
    id: "burma-teak",
    name: "Burma Teak",
    origin: "Myanmar",
    grade: "Grade A",
    image: "/burmateak.webp",
    description:
      "Doğal yağ oranı, su dayanımı ve sıcak tonlarıyla üst segment yat projelerinde tercih edilen en prestijli teak seçeneklerinden biridir.",
    properties: ["Doğal yağ içeriği", "UV dayanımı", "Kaymaz yüzey", "50+ yıl ömür"],
  },
  {
    id: "plantation-teak",
    name: "Plantation Teak",
    origin: "Endonezya",
    grade: "Grade B+",
    image: "/plantationteak.webp",
    description:
      "Sürdürülebilir kaynak yapısı ve homojen dokusuyla kalite ve maliyet dengesini birlikte sunan güçlü bir alternatif.",
    properties: ["FSC sertifikalı", "Homojen doku", "Dengeli maliyet", "30+ yıl ömür"],
  },
] as const;

export const COMPANY_INFO = {
  name: "Güverte Teak",
  tagline: "Premium Yat Güverte İmalatı",
  phone: "+90 553 901 69 17",
  email: "info@guverteteak.com",
  address: "Tuzla Tersaneler Bölgesi, İstanbul, Türkiye",
  social: {
    instagram: "https://www.instagram.com/teak_guverte/",
    linkedin: "#",
    youtube: "#",
  },
} as const;

export const STATS = [
  { value: "350+", label: "Tamamlanan Proje" },
  { value: "42", label: "Ülkeye İhracat" },
  { value: "28", label: "Yıllık Deneyim" },
  { value: "99%", label: "Müşteri Memnuniyeti" },
] as const;
