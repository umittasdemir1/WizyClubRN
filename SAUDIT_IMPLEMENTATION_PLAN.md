# S+Audit — Implementation Plan

> **Proje:** Stockpilot → Studio → Yeni modül: S+Audit
> **Tarih:** 2026-03-27
> **Durum:** Onay bekliyor — kodlamaya başlanmadı

---

## 1. Genel Bakış

Studio'ya beşinci aktif modül olarak **S+Audit** ekleniyor. GoAudits referans alınarak tasarlanan, tam teşekküllü bir iç denetim (audit checklist) web uygulaması. Mevcut Stockpilot tasarım sistemiyle (renk, tipografi, bileşen) birebir uyumlu olacak.

---

## 2. Mimari Uyum — Mevcut Yapıya Entegrasyon

### 2.1 Değiştirilecek Dosyalar

| Dosya | Değişiklik |
|---|---|
| `src/studio/StudioNav.tsx` | `StudioModuleId`'e `"audit"` eklenir; NAV_MODULES dizisine `S+Audit` girişi eklenir (`available: true`) |
| `src/pages/StudioApp.tsx` | `AuditModule` lazy import + `ErrorBoundary` ile render |

### 2.2 Yeni Dosya Ağacı

```
src/studio/modules/audit/
├── AuditModule.tsx                  # Modül kök bileşeni (view state makinesi)
├── types.ts                         # Tüm TS tipleri
├── constants.ts                     # Cache key'leri, sabitler
├── cache.ts                         # localStorage yönetimi
├── utils.ts                         # Skor hesaplama, sectionlar
├── mock/
│   ├── questions.json               # 50 soruluk mock (root'taki ile aynı)
│   └── locations.json               # 20 lokasyon mock (root'taki ile aynı)
├── components/
│   ├── AuditLanding.tsx             # Landing / başlangıç ekranı
│   ├── AuditLocationPicker.tsx      # Lokasyon seçim ekranı
│   ├── AuditChecklist.tsx           # Ana denetim formu
│   ├── AuditQuestionCard.tsx        # Tekil soru kartı
│   ├── AuditSectionHeader.tsx       # Bölüm başlığı (sticky)
│   ├── AuditProgressBar.tsx         # İlerleme çubuğu
│   ├── AuditMediaUpload.tsx         # Fotoğraf/video ekleme
│   └── AuditReport.tsx             # Sonuç raporu ekranı
└── hooks/
    ├── useAuditChecklist.ts         # Checklist state + aksiyonlar
    └── useAuditMedia.ts             # Medya yükleme/önizleme yönetimi
```

---

## 3. Tasarım Sistemi Uyumu

### 3.1 Mevcut Token'lar (Değiştirilmeden Kullanılacak)

```
brand:       #246BFD   → CTA butonlar, aktif seçimler, progress bar
ink:         #15213A   → Başlık metinler
mist:        #F7FAFC   → Arka planlar
line:        #D9E4F4   → Kenarlıklar
success:     #1FA971   → "Yes" cevabı vurgusu, uyum skoru
warning:     #F2B13F   → Kısmen uyumlu bölümler
danger:      #E45858   → "No" cevabı vurgusu, düşük skor
```

### 3.2 Landing Tasarım Referansı

GoAudits screenshot'ından alınan elementler, **Stockpilot'un premium-card / glass-button** diliyle yeniden yorumlanıyor:

- Hero alanı: `story-spectrum-bg` + `story-grid-pattern` (Academia'dan alınan animated arka plan)
- Başlık: `font-display` (Plus Jakarta Sans), `text-gradient` utility
- CTA buton: `GlassButton` bileşeni, büyük boyut
- Özellik kartları: `premium-card-gradient` (4 kart: Kolay Denetim / Medya Desteği / Anlık Rapor / Geçmiş)

### 3.3 Tab Bileşeni

Sidebar sekmeleri için mevcut `Tabs3D` (`/components/ui/3d-icon-tabs.tsx`) kullanılacak. Audit modülünün sidebar tab'ları:

| id | label | icon (lucide) |
|---|---|---|
| `checklist` | Checklist | `ClipboardList` |
| `report` | Report | `BarChart3` |
| `history` | History | `History` |

---

## 4. Ekran Akışı (View State Machine)

```
AuditModule
│
├── view: "landing"          → AuditLanding
│        ↓ "Yeni Denetim Başlat"
├── view: "location-picker"  → AuditLocationPicker
│        ↓ Lokasyon seç
├── view: "checklist"        → AuditChecklist
│        ↓ "Denetimi Tamamla"
└── view: "report"           → AuditReport
         ↓ "Yeni Denetim" → "landing"
```

`AuditModule.tsx` içinde `useState<AuditView>` ile yönetilir. Academia'nın `sourceMode` pattern'ı örnek alınır.

---

## 5. Bileşen Detayları

### 5.1 AuditLanding

**Layout:** Tam yükseklik, iki sütun (desktop) / tek sütun (mobil)

**Sol Alan:**
- Küçük badge: `S+Audit • Beta`
- H1: `Retail Denetimini\nProfesyonelce Yönet`
- Alt metin: 1-2 cümle açıklama
- 2 buton: `Yeni Denetim Başlat` (brand, büyük) + `Örnek Raporu Gör` (ghost)
- Özellik listesi (4 madde, check icon ile):
  - Yes / No / N/A hızlı yanıt
  - Fotoğraf & video desteği
  - Anlık uyum skoru
  - Geçmiş denetimler

**Sağ Alan:**
- `inspection-mobile-app.webp` görseli veya CSS mockup kartı (goaudits tarzı denetim formu önizlemesi)
- Hafif rotasyon + shadow efekti

**Geçmiş Denetimler:**
- Landing'in altında, localStorage'dan okunan son 5 audit kartı
- Kart: lokasyon adı + tarih + uyum yüzdesi + "Raporu Gör" linki

---

### 5.2 AuditLocationPicker

**Layout:** Tek sütun, scroll edilebilir

**Üst:**
- Geri butonu (← Landing)
- Başlık: `Lokasyon Seç`
- Arama inputu (debounced, name/city/code filtreler)
- Filtre pill'leri: `Tümü` / `Street` / `Mall`

**Lokasyon Kartları:**
```
┌─────────────────────────────────┐
│ 🏪 Northbridge Store  [LDN01]   │
│ London • Street • 180 m²        │
│ 8 personel • Açılış: Mar 2022   │
│                    [Seç →]      │
└─────────────────────────────────┘
```
- Grid: 2 sütun (desktop), 1 sütun (mobil)
- Hover: `shadow-panel` + border-brand efekti
- Seçilince: view → "checklist", seçilen lokasyon state'e yazılır

---

### 5.3 AuditChecklist

**Layout:**
- **Desktop:** Sabit sol panel (lokasyon bilgisi + progress) + sağda scroll edilebilir sorular
- **Mobil:** Sticky header (progress bar + lokasyon) + altında sorular

**Header (sticky):**
```
← Lokasyon Seç    Northbridge Store • LDN01
[████████░░░░░░]  32 / 50 yanıtlandı  (64%)
```

**Soru Bölümleri (5 bölüm, 10'ar soru):**

| Bölüm | ID Aralığı | Başlık |
|---|---|---|
| 1 | 1–10 | Giriş & Genel Ortam |
| 2 | 11–20 | Ürün Teşhiri & Merchandising |
| 3 | 21–30 | Müşteri Deneyimi |
| 4 | 31–40 | Personel Performansı |
| 5 | 41–50 | Operasyon & Güvenlik |

**AuditQuestionCard:**
```
┌────────────────────────────────────────────┐
│ 1. Is the store entrance clean and organized?     │
│                                              │
│  [✓ YES]   [ NO ]   [ N/A ]                 │
│                                              │
│  💬 Yorum ekle...                           │
│  📷 Medya ekle (0/3)                        │
└────────────────────────────────────────────┘
```
- **YES:** success rengi border + arka plan tonu
- **NO:** danger rengi border + arka plan tonu
- **N/A:** mist rengi, italik
- Yorum: textarea, `NO` seçilince otomatik açılır (zorunlu değil ama önerilir)
- Medya: grid önizleme (thumb'lar), maks 3 dosya/soru

**Alt Çubuk (floating):**
- `Kaydet & Çık` (ghost) + `Denetimi Tamamla` (brand, disabled 50'si yanıtlanana kadar)

---

### 5.4 AuditMediaUpload

- Dosya tipi: `image/*,video/*`
- Tarayıcı memory'de `URL.createObjectURL` ile önizleme (persist etmiyoruz)
- Metadata (filename, type, size, timestamp) localStorage'a kaydedilir
- Önizleme grid: 3 sütunlu thumbnail, silme butonu

---

### 5.5 AuditReport

**Layout:** Tam ekran kart, scroll edilebilir

**Üst Band (Summary):**
```
Northbridge Store — LDN01
27 Mart 2026 • 14:32

Uyum Skoru: %74   [büyük daire gösterge]
✅ 37 Uyumlu   ❌ 8 Uyumsuz   ➖ 5 N/A
```
Daire gauge: brand→success gradient, SVG ile

**Bölüm Skorları:**
- Her bölüm için mini progress bar + yüzde
- Renk: >80% success, 60–80% warning, <60% danger

**Sorunlar Listesi (Sadece "No" cevaplar):**
- Soru metni
- Yorum (varsa)
- Medya thumbs (varsa)

**Aksiyon Butonları:**
- `🖨️ Yazdır` (window.print)
- `📋 Kopyala` (JSON özeti clipboard)
- `🔄 Yeni Denetim` → view: "landing"

---

## 6. State & Veri Yönetimi

### 6.1 TypeScript Tipleri (`types.ts`)

```typescript
type AuditView = "landing" | "location-picker" | "checklist" | "report";
type AuditAnswer = "yes" | "no" | "na" | null;

interface AuditQuestion {
    id: number;
    question: string;
}

interface AuditQuestionResponse {
    questionId: number;
    answer: AuditAnswer;
    comment: string;
    mediaFiles: AuditMediaMeta[];
    answeredAt: string | null;
}

interface AuditMediaMeta {
    name: string;
    type: string;
    size: number;
    objectUrl: string;   // runtime only, not persisted
}

interface AuditSession {
    id: string;          // uuid
    locationCode: string;
    locationName: string;
    startedAt: string;
    completedAt: string | null;
    responses: Record<number, AuditQuestionResponse>;
}

interface AuditStore {
    name: string;
    code: string;
    country: string;
    type: "Street" | "Mall";
    city: string;
    size_m2: number;
    opening_date: string;
    staff_count: number;
}
```

### 6.2 localStorage Cache (`cache.ts`)

```
AUDIT_SESSION_ACTIVE   → Devam eden oturum (AuditSession)
AUDIT_HISTORY          → Son 20 tamamlanan oturum (AuditSession[])
```

Kaydetme stratejisi: Her yanıt değişikliğinde debounce(500ms) ile `AUDIT_SESSION_ACTIVE` güncellenir. Tamamlanınca `AUDIT_HISTORY`'e eklenir, active temizlenir.

### 6.3 `useAuditChecklist` Hook

```typescript
interface UseAuditChecklistReturn {
    responses: Record<number, AuditQuestionResponse>;
    setAnswer: (qId: number, answer: AuditAnswer) => void;
    setComment: (qId: number, comment: string) => void;
    addMedia: (qId: number, file: File) => void;
    removeMedia: (qId: number, index: number) => void;
    progress: { answered: number; total: number; percent: number };
    score: { yes: number; no: number; na: number; compliance: number };
    canSubmit: boolean;  // tüm sorular yanıtlandığında true
    submit: () => void;  // session'ı tamamlar, view → "report"
    resume: () => boolean; // localStorage'da devam eden session var mı?
}
```

---

## 7. Responsive Breakpoint Stratejisi

| Ekran | Checklist Layout | Landing Layout |
|---|---|---|
| Mobile (<768px) | Sticky header + tek sütun sorular | Tek sütun, görsel gizli |
| Tablet (768–1024px) | Sticky header + tek sütun | İki sütun, görsel küçük |
| Desktop (>1024px) | Sol panel sabit + sağ scroll | İki sütun, görsel tam |

---

## 8. Geliştirme Adımları (Sıralı)

### Adım 1 — Nav & Routing Bağlantısı
- [ ] `StudioNav.tsx`: `StudioModuleId`'e `"audit"` ekle, NAV_MODULES'e giriş ekle
- [ ] `StudioApp.tsx`: Lazy import + ErrorBoundary render
- [ ] `AuditModule.tsx`: Boş iskelet, view state machine

### Adım 2 — Mock Veri & Tipler
- [ ] `mock/questions.json` ve `mock/locations.json` kopyala
- [ ] `types.ts` tüm interface'leri yaz
- [ ] `constants.ts` cache key'leri, section tanımları
- [ ] `utils.ts` skor hesaplama, section gruplama

### Adım 3 — AuditLanding
- [ ] Hero layout (Academia'nın `story-spectrum-bg` kullan)
- [ ] Özellik kartları
- [ ] Geçmiş denetim listesi (localStorage'dan)
- [ ] Responsive: mobil tek sütun

### Adım 4 — AuditLocationPicker
- [ ] Lokasyon kartları grid
- [ ] Arama + filtre
- [ ] Seçim → checklist geçişi

### Adım 5 — AuditChecklist & Soru Kartları
- [ ] `useAuditChecklist` hook
- [ ] `AuditProgressBar`
- [ ] `AuditSectionHeader` (sticky)
- [ ] `AuditQuestionCard` — Yes/No/NA radyo
- [ ] Yorum textarea (auto-open on No)
- [ ] `AuditMediaUpload` (thumbnail preview)
- [ ] Floating action bar

### Adım 6 — AuditReport
- [ ] SVG compliance gauge
- [ ] Bölüm skorları
- [ ] Sorunlar listesi
- [ ] Print / Copy aksiyonları

### Adım 7 — Cache & Persistence
- [ ] `cache.ts` implementasyonu
- [ ] `useAuditChecklist` içine debounced save
- [ ] "Devam et" akışı (resume)
- [ ] History listesi landing'e bağlanır

### Adım 8 — Polish & QA
- [ ] TypeScript strict: `npx --prefix mobile tsc --noEmit` (stockpilot için ayrı check)
- [ ] Responsive test: 375px / 768px / 1440px
- [ ] Animasyon: Framer Motion ile soru kartı enter/exit
- [ ] Empty states (lokasyon bulunamadı, geçmiş yok)
- [ ] Keyboard navigation (tab order)

---

## 9. Dikkat Edilecekler

1. **Academia pattern'ını kır, kopyalama** — Component API'leri academia'dan ilham alır ama import etmez. Modüller bağımsız.
2. **Medya persist edilmez** — `objectUrl`'ler sayfayı kapatınca geçersiz. Sadece metadata localStorage'a kaydedilir, gerçek dosya state'te tutulur. Kullanıcıya bu bildirilir.
3. **`canSubmit` katı olmamalı** — Tüm 50 soruyu cevaplamak zorunlu değil; ilerleme yüzde olarak gösterilir, submit için minimum eşik (örn. %80) belirlenir.
4. **StudioNav'a "audit" eklemek "senato" ve "loyal"'ı etkilemez** — Sadece yeni giriş eklenir.
5. **Tasarım tokenları** — Mevcut Tailwind config'deki renk değerleri dışına çıkılmaz; yeni CSS class yazılmaz.

---

## 10. Dosya Sayısı Özeti

| Kategori | Dosya Sayısı |
|---|---|
| Değiştirilen mevcut dosya | 2 |
| Yeni bileşen | 8 |
| Yeni hook | 2 |
| Yeni utility/type | 4 |
| Mock veri | 2 |
| **Toplam yeni dosya** | **16** |

---

**Onay verirsen Adım 1'den başlıyorum.**
