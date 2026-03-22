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
    subtitle: "New Build",
    description:
      "Sıfırdan tasarlanmış, yatınızın karakterine özel teak güverte çözümleri. Her desen, her derzleme milimetrik hassasiyetle uygulanır.",
    image: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80",
    features: [
      "3D CAD tasarım",
      "Burma Teak Grade A",
      "CNC hassas kesim",
      "10 yıl garanti",
    ],
  },
  {
    id: "refit",
    title: "Refit & Yenileme",
    subtitle: "Refit & Renewal",
    description:
      "Mevcut güvertenizin tamamen sökülüp yeniden inşa edilmesi. Orijinal tasarımınıza sadık kalarak veya tamamen yeni bir vizyon ile.",
    image: "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80",
    features: [
      "Hasar analizi",
      "Yapısal güçlendirme",
      "Renk eşleştirme",
      "Hızlı teslimat",
    ],
  },
  {
    id: "maintenance",
    title: "Bakım & Koruma",
    subtitle: "Maintenance",
    description:
      "Periyodik bakım programları ile teak güvertenizin ömrünü uzatın. Profesyonel zımparalama, yağlama ve koruyucu uygulama.",
    image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    features: [
      "Yıllık bakım planı",
      "UV koruma",
      "Derzleme yenileme",
      "7/24 destek",
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
    description:
      "Dünyanın en prestijli teak kaynağı. Doğal yağ içeriği sayesinde üstün su dayanımı ve eşsiz altın tonları.",
    properties: ["Doğal yağ içeriği", "UV dayanımı", "Anti-slip yüzey", "50+ yıl ömür"],
  },
  {
    id: "plantation-teak",
    name: "Plantation Teak",
    origin: "Endonezya",
    grade: "Grade B+",
    description:
      "Sürdürülebilir plantasyon kaynaklı premium teak. Çevre dostu sertifikasyon ile yüksek kalite standartları.",
    properties: ["FSC sertifikalı", "Homojen doku", "Uygun maliyet", "30+ yıl ömür"],
  },
  {
    id: "synthetic-teak",
    name: "Sentetik Teak",
    origin: "İtalya",
    grade: "Premium",
    description:
      "Son teknoloji kompozit malzeme. Gerçek teak görünümü ile sıfır bakım gereksinimi.",
    properties: ["Sıfır bakım", "UV stabil", "Geri dönüşümlü", "25+ yıl ömür"],
  },
] as const;

export const COMPANY_INFO = {
  name: "Güverte Teak",
  tagline: "Premium Yat Güverte İmalatı",
  phone: "+90 216 555 0 123",
  email: "info@guverteteak.com",
  address: "Tuzla Tersaneler Bölgesi, İstanbul, Türkiye",
  social: {
    instagram: "#",
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
