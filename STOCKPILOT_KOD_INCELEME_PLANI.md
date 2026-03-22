# StockPilot Kod Inceleme & Iyilestirme Plani

> Olusturulma: 2026-03-17
> Kapsam: Full-stack denetim — frontend (Vite+React+TS) + backend (Express+TS)
> Icerik: Bug/guvenlik taramasi + God Code anti-pattern denetimi
> Her adim sonrasi `npx tsc --noEmit` dogrulamasi yapilacak.

---

## Faz 0 — GOD CODE AYRISTIRMA (Mimari Borc)

> Bunlar diger tum duzeltmeleri zorlastiran yapisal anti-pattern'ler.
> Temiz refactoring icin once bunlar cozulmeli.

### God Dosyalar

- [ ] **0.1 canvasModel.ts'yi bol (1.471 satir, 128 export)**
  - Dosya: `frontend/src/components/canvas/canvasModel.ts`
  - Anti-pattern: GOD FILE — 1 dosyada 9 ilgisiz alan
  - Sorumluluklar: tipler, pivot hesaplama, custom metric parser/evaluator, filtre mantigi, alan tanimlari, toplastirma, sabitler, kolon overridelari, formatlama
  - Cozum: `canvas/model/` alt dizinine bol:
    - `model/types.ts` — tum tip/arayuz tanimlari (~200 satir)
    - `model/pivot.ts` — `buildPivotResult`, toplastirma, kombolar (~300 satir)
    - `model/customMetrics.ts` — tokenizer, evaluator, RPN (~250 satir)
    - `model/fields.ts` — `getFieldDefinition`, `getAvailablePivotFields`, hizli arama (~150 satir)
    - `model/formatting.ts` — `formatAggregatedValue`, sayi/tarih formatlama (~100 satir)
    - `model/index.ts` — barrel re-export (public API degismez)
  - Dogrulama: `npx tsc --noEmit` — sifir import hatasi

### God Bilesenler

- [ ] **0.2 CanvasStudio.tsx'i parcala (1.431 satir, 20 useState)**
  - Dosya: `frontend/src/components/canvas/CanvasStudio.tsx`
  - Anti-pattern: GOD COMPONENT — 1 bilesende 8 ilgisiz ozellik
  - Mevcut sorumluluklar: dosya gezgini, proje adi, aktivite cubugu, canvas alani, arac cubugu, tablo listesi, baslik filtreleri, panel duzeni
  - Cozum: Odakli bilesenlere ayir:
    - `DatasetExplorer.tsx` — dosyalar, klasorler, yeniden adlandirma, surekle-birak (~450 satir)
    - `ProjectHeader.tsx` — proje adi duzenleme (~80 satir)
    - `ActivityBar.tsx` — panel acma/kapama ikonlari (~50 satir, zaten inline tanimli)
    - `CanvasToolbar.tsx` — zoom, isaretci/el araclari, tablo menusu (~200 satir)
    - `CanvasEmptyState.tsx` — bos canvas yer tutucusu (~50 satir)
    - `CanvasStudio.tsx` — sadece kompozisyon koku (~300 satir)
  - Dogrulama: Her ayirma sonrasi `npx tsc --noEmit`

- [ ] **0.3 CanvasSidebar.tsx'i parcala (1.369 satir, 18 useState, 18 prop)**
  - Dosya: `frontend/src/components/canvas/CanvasSidebar.tsx`
  - Anti-pattern: GOD COMPONENT + ASIRI PROP — 6 ozellik, 18 prop (14'u callback)
  - Cozum: Odakli bilesenlere ayir:
    - `PivotFieldBrowser.tsx` — alan listesi, pinleme, surekle-birak (~400 satir)
    - `CustomMetricEditor.tsx` — metrik olusturucu, tokenizer UI (~450 satir)
    - `FieldFormatPanel.tsx` — kolon override duzenleme (~200 satir)
    - `CanvasSidebar.tsx` — duzen kabugu + bolum orkestrasyonu (~150 satir)
  - Dogrulama: Her ayirma sonrasi `npx tsc --noEmit`

### God Hook'lar

- [ ] **0.4 usePivotOrchestration.ts'yi parcala (586 satir, 17 useState)**
  - Dosya: `frontend/src/components/canvas/usePivotOrchestration.ts`
  - Anti-pattern: GOD HOOK — 8 ilgisiz state alani, 50+ disari aktarilan setter
  - Cozum: Odakli hook'lara bol:
    - `useTableManagement.ts` — tablolar, activeTableId, CRUD (~100 satir)
    - `useCustomMetrics.ts` — customMetrics state + mutasyonlar (~80 satir)
    - `useHeaderFilters.ts` — openHeaderFilter, secimler, siralama yonleri (~120 satir)
    - `useDragDropState.ts` — dragZone, activeDrag, dropIndicator (~80 satir)
    - `useStorageSync.ts` — debounce'lu localStorage kaliciligi (~60 satir)
    - `usePivotOrchestration.ts` — yukaridakileri birlestiren kompozisyon hook'u (~100 satir)
  - Dogrulama: Her ayirma sonrasi `npx tsc --noEmit`

- [ ] **0.5 useCanvasPointer.ts'yi parcala (479 satir)**
  - Dosya: `frontend/src/components/canvas/useCanvasPointer.ts`
  - Anti-pattern: GOD HOOK — zoom, secim, tasima, boyutlandirma, arac degistirme hepsi 1 hook'ta
  - Cozum: Odakli hook'lara bol:
    - `useCanvasZoom.ts` — zoom/pan state ve isleyiciler (~100 satir)
    - `useTableInteraction.ts` — secim, tasima, boyutlandirma (~250 satir)
    - `useCanvasTool.ts` — isaretci/el arac state'i (~50 satir)
    - `useCanvasPointer.ts` — kompozisyon hook'u (~80 satir)
  - Dogrulama: `npx tsc --noEmit`

### God Tipler

- [ ] **0.6 PivotTableView ve PivotTableInstance'i parcala**
  - Dosya: `canvasModel.ts` (0.1'e gore bolunecek)
  - Anti-pattern: GOD TYPE — PivotTableView (12 alan, domain+UI+config karismis), PivotTableInstance (11 alan, config+rendering+runtime karismis)
  - Cozum:
    ```
    PivotTableInstance → PivotTableConfig (id, name, layout)
                       + PivotTableUIState (headerColor, scale, position, size)
                       + PivotTableRuntime (filterSelections)

    PivotTableView → PivotViewData (filteredRecords, pivotResult)
                   + PivotViewFlags (hasColumnGroups, showSecondaryHeaderRow)
                   + PivotViewConfig (table, columns, columnOverrides, customMetrics)
    ```
  - Dogrulama: `npx tsc --noEmit`

### Prop Drilling

- [ ] **0.7 3+ seviye prop drilling'i Context ile ortadan kaldir**
  - Zincir: `LabsModule` → `CanvasStudio` → `CanvasSidebar` → alt bilesenler
  - Anti-pattern: 12 upload ile ilgili prop, CanvasStudio'dan kullanilmadan geciriliyor
  - Cozum: `PivotStudioContext` olustur:
    - `uploadState` (ilerleme, asama, hata, mevcutDosya)
    - `headerFilterState` (secimler, siralama yonleri)
    - CanvasStudio prop'larini 12'den ~4'e dusur
  - Dogrulama: `npx tsc --noEmit`

---

## Faz 1 — KRITIK (Uretim Engelleyiciler)

### Backend — Guvenlik & Kararlilik

- [ ] **1.1 Global hata isleyicide HTTP durum kodlarini duzelt**
  - Dosya: `backend/src/index.ts:30-35`
  - Sorun: Sunucu hatalari dahil tum hatalar 400 donduruyor
  - Cozum: `ValidationError` sinifi olustur, dogrulama icin 400 / sunucu hatalari icin 500 dondur
  - Dogrulama: `npx tsc --noEmit && npm run test`

- [ ] **1.2 CORS'u duzelt — env yokken tum kaynaklara acik**
  - Dosya: `backend/src/index.ts:10-14`
  - Sorun: `CORS_ORIGIN` ayarlanmadiginda `origin: true` herhangi bir domain'e izin veriyor
  - Cozum: `true` yerine `["http://localhost:5173"]` varsayilan yap
  - Dogrulama: `npx tsc --noEmit`

- [ ] **1.3 Analiz & transfer rotlarina girdi dogrulamasi ekle**
  - Dosyalar: `backend/src/routes/analysis.ts:8`, `transfer.ts:8`
  - Sorun: `req.body` null kontrolu yok, icerik tipi dogrulamasi yok
  - Cozum: `if (!req.body)` korumasi ekle, net mesajla 400 dondur
  - Dogrulama: `npx tsc --noEmit && npm run test`

- [ ] **1.4 Dizi boyut siniri dogrulamasi ekle**
  - Dosya: `backend/src/utils/validators.ts:26-58`
  - Sorun: Maksimum kayit siniri yok — 1M kayit sunucuyu cokertir
  - Cozum: `MAX_RECORDS = 10_000` korumasi ekle
  - Dogrulama: `npx tsc --noEmit && npm run test`

- [ ] **1.5 Yuklemeye MIME tipi beyaz listesi ekle**
  - Dosya: `backend/src/routes/upload.ts`
  - Sorun: Her dosya tipini kabul ediyor, sadece uzantiya bakiyor
  - Cozum: `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `application/vnd.ms-excel` beyaz listesi
  - Dogrulama: `npx tsc --noEmit`

- [ ] **1.6 Buyuk yuklemeler icin disk depolamaya gec — OOM'u onle**
  - Dosya: `backend/src/routes/upload.ts:5-10`
  - Sorun: `multer.memoryStorage()` 10MB dosyayi RAM'e yukler; XLSX ~100MB'a genisler
  - Cozum: Gecici dizinle `multer.diskStorage()`'a gec, diskten oku, sonra temizle
  - Dogrulama: `npx tsc --noEmit && npm run test`

### Frontend — Cokme Onleme

- [ ] **1.7 Ana bolumlere Error Boundary ekle**
  - Dosyalar: Yeni `src/components/ErrorBoundary.tsx`; `CanvasStudio`, `CanvasSidebar`, `StudioApp`'a sar
  - Sorun: Herhangi bir bilesen cokmesi tum uygulamayi oldurur
  - Cozum: Geri donus UI'li genel ErrorBoundary olustur
  - Dogrulama: `npx tsc --noEmit`

---

## Faz 2 — YUKSEK (Performans & Kararlilik)

### Backend

- [ ] **2.1 parseLocaleNumber mantik sirasini duzelt**
  - Dosya: `shared/normalization.ts:19-34`
  - Sorun: `normalized`'dan once `cleaned`'i parse ediyor, dogru sonuc tesadufi
  - Cozum: Normalize edilmis versiyonu once parse et
  - Dogrulama: `npx tsc --noEmit && npm run test`

- [ ] **2.2 analyzeInventory'de tekrarlanan veri taramasini duzelt**
  - Dosya: `backend/src/services/analyzer.ts:182-183`
  - Sorun: `.filter().length` diziyi tekrar tariyor — sayimlar dongu icinde zaten hesaplanmis
  - Cozum: Mevcut `lifecycleCounts` map degerlerini kullan
  - Dogrulama: `npx tsc --noEmit && npm run test`

- [ ] **2.3 Bozuk test suite'ini duzelt — API kontrati uyumsuzlugu**
  - Dosyalar: `backend/tests/usecases.test.mjs`, `parser.test.mjs`
  - Sorun: 13 testten 3'u basarisiz, testler eski API yapisini bekliyor
  - Cozum: Testleri mevcut API kontratina guncelle
  - Dogrulama: `npm run test` — 13'u de gecmeli

- [ ] **2.4 Sihirli sayilari adlandirilmis sabitlere cikar**
  - Dosyalar: `analyzer.ts:54-71`, `transfer.ts:25`
  - Sorun: Is esikleri kodda gomulu (90 gun, 3x carpan, vb.)
  - Cozum: Dosya basinda `const DURGUN_GUN = 90` vb. olustur
  - Dogrulama: `npx tsc --noEmit && npm run test`

### Frontend

- [ ] **2.5 useCanvasPointer'da layout thrashing'i duzelt**
  - Dosya: `frontend/src/components/canvas/useCanvasPointer.ts:95-140`
  - Sorun: `useLayoutEffect` herhangi bir ozellik degistiginde tum tablolarda `getBoundingClientRect()` cagiriyor
  - Cozum: Bunun yerine `ResizeObserver` kullan; sadece `autoFitKey` parmak izi degistiginde olc
  - Dogrulama: `npx tsc --noEmit`

- [ ] **2.6 Filtre seceneklerini cagirim noktalarinda useMemo ile onbellekle**
  - Dosyalar: `canvasRenderHelpers.ts` — `getRowFieldFilterOptions`, `getColumnGroupFilterOptions`, `getValueFieldFilterOptions`
  - Sorun: Girdiler degismese bile her renderda cagriliyor
  - Cozum: PivotCanvasTable ve CanvasStudio'da cagirildigi yerlerde sonuclari memoize et
  - Dogrulama: `npx tsc --noEmit`

- [ ] **2.7 Tekrarlanan useTypewriter uygulamasini kaldir**
  - Dosya: `frontend/src/App.tsx:16-50`
  - Sorun: Satir ici typewriter hook'u `useTypewriter.ts`'i cogaltiyor
  - Cozum: `./components/canvas/useTypewriter`'dan import et
  - Dogrulama: `npx tsc --noEmit`

- [ ] **2.8 Deger alani filtre secenekleri icin renderCell sonuclarini on-hesapla**
  - Dosya: `canvasRenderHelpers.ts:116-127` — `getValueFieldFilterOptions`
  - Sorun: Filtre seceneklerini olusturmak icin her satir kombosu basina `renderCell()` cagiriyor
  - Cozum: Toplam sutun render degerlerini PivotTableView olusturulurken onbellekle
  - Dogrulama: `npx tsc --noEmit`

---

## Faz 3 — ORTA (Surdurulebilirlik & Saglam lastirma)

### Backend

- [ ] **3.1 decodeCsvText'i duzelt — olu kod dali**
  - Dosya: `backend/src/services/parser.ts:178-187`
  - Sorun: `!utf8.includes("")` her zaman false — TextDecoder hic cagrilmiyor
  - Cozum: Bunun yerine BOM baytlarini veya null karakterleri kontrol et
  - Dogrulama: `npx tsc --noEmit && npm run test`

- [ ] **3.2 Yapilandirilmis hata yanitlari ekle**
  - Dosya: `backend/src/index.ts`
  - Sorun: Hata yanitlarinda hata kodu yok, sadece `message` var
  - Cozum: `{ error: "VALIDATION_ERROR"|"SERVER_ERROR", message, details? }` dondur
  - Dogrulama: `npx tsc --noEmit`

- [ ] **3.3 Istek zaman asimi middleware'i ekle**
  - Dosya: `backend/src/index.ts`
  - Sorun: Zaman asimi yok — buyuk dosya isleme sonsuza kadar asili kalabilir
  - Cozum: 30 saniyelik istek zaman asimi middleware'i ekle
  - Dogrulama: `npx tsc --noEmit`

- [ ] **3.4 Kullanilmayan parseInventoryUpload usecase'ini kaldir**
  - Dosya: `backend/src/usecases/parseInventoryUpload.ts`
  - Sorun: Sarmalayici mantik eklemiyor, rotlar tarafindan import edilmiyor
  - Cozum: Dosyayi sil, hicbir import'un referans vermediginden emin ol
  - Dogrulama: `npx tsc --noEmit`

### Frontend

- [ ] **3.5 Custom metric evaluator'de kapsamli tip kontrolleri ekle**
  - Dosya: `canvasModel.ts:659-800+`
  - Sorun: Token tipleri icin `never` kapsamlilik kontrolleri eksik
  - Cozum: Switch case'lerde `default: assertNever(token)` ekle
  - Dogrulama: `npx tsc --noEmit`

- [ ] **3.6 ColumnOverride format uyumlulugunu dogrula**
  - Dosya: `canvasModel.ts:139-143`
  - Sorun: Kullanici kolon tipiyle uyumsuz format ayarlayabiliyor (orn. tarih kolonuna "para birimi")
  - Cozum: `isCompatibleFormat(tip, format)` dogrulama fonksiyonu ekle
  - Dogrulama: `npx tsc --noEmit`

- [ ] **3.7 FileUploader'a dosya boyutu dogrulamasi ekle**
  - Dosya: `frontend/src/components/upload/FileUploader.tsx`
  - Sorun: Istemci tarafinda dosya boyutu kontrolu yok — buyuk dosyalar icin kotu UX
  - Cozum: Dropzone yapilandirmasina `maxSize: 10 * 1024 * 1024` ekle, hata mesaji goster
  - Dogrulama: `npx tsc --noEmit`

- [ ] **3.8 Satir ici kaydirma cubugu CSS'ini stil dosyasina tasi**
  - Dosya: `MetricFormatSelect.tsx:182-185`
  - Sorun: Kaydirma cubugu stilleri icin satir ici CSS
  - Cozum: `index.css`'e yardimci sinif olarak tasi
  - Dogrulama: `npx tsc --noEmit`

---

## Faz 4 — DUSUK (Kalite Cilasi)

### Backend

- [ ] **4.1 Saglik kontrolu endpoint'ini iyilestir**
  - Dosya: `backend/src/index.ts:18-24`
  - Cozum: Saglik yanitina bellek kullanimi, calisma suresi, surum ekle
  - Dogrulama: `npx tsc --noEmit`

- [ ] **4.2 Is kurallarini adlandirilmis sabitlerle belgele**
  - Dosyalar: `analyzer.ts`, `transfer.ts`
  - Cozum: Belirli esiklerin neden secildigini aciklayan satir ici yorumlar
  - Dogrulama: `npx tsc --noEmit`

### Frontend

- [ ] **4.3 Tutarli hata yonetimi — hata raporlayici arac olustur**
  - Sorun: Bazi hatalar sessizce yakalaniyor, bazilari firlatiliyor, tutarli bir desen yok
  - Cozum: `reportError(baglam, hata)` fonksiyonuyla `utils/errorReporter.ts` olustur
  - Dogrulama: `npx tsc --noEmit`

- [ ] **4.4 Ozel tarama icin localStorage geri donusu**
  - Dosya: `canvasStorage.ts:18-29`
  - Sorun: localStorage devre disi ise tum durum sessizce kayboluyor
  - Cozum: Bellek ici yedek Map ekle, konsola uyari kaydet
  - Dogrulama: `npx tsc --noEmit`

- [ ] **4.5 Etkilesimli elemanlara erisilebilirlik nitelikleri ekle**
  - Dosyalar: `PivotCanvasTable.tsx`, `CanvasSidebar.tsx`, `CanvasStudio.tsx`
  - Cozum: Surukleme tutamaclarina, filtre butonlarina, boyutlandirma tutamaclarina `aria-label` ekle
  - Dogrulama: `npx tsc --noEmit`

- [ ] **4.6 framer-motion ve recharts'i tembel yukle**
  - Dosya: `package.json` — framer-motion (12.6MB), recharts (2.15MB)
  - Sorun: Genel olarak paketlenmis, sadece belirli sayfalarda kullaniliyor
  - Cozum: `React.lazy()` ve `Suspense` ile dinamik import
  - Dogrulama: `npx tsc --noEmit && npm run build` — paket boyutu azalmasini kontrol et

- [ ] **4.7 Header scroll dinleyicisine debounce ekle**
  - Dosya: `frontend/src/components/layout/Header.tsx:37-38`
  - Sorun: Her scroll olayinda `getBoundingClientRect()` cagriliyor
  - Cozum: `requestAnimationFrame` ile kisitla
  - Dogrulama: `npx tsc --noEmit`

- [ ] **4.8 Kullanilmayan import'lari ve olu kodu temizle**
  - Dosyalar: CanvasStudio.tsx (hasSelection, hasCustomSort), cesitli
  - Cozum: TS teshislerinin isaretledigi tum kullanilmayan degiskenleri kaldir
  - Dogrulama: `npx tsc --noEmit` — sifir uyari

---

## God Code Denetim Ozeti

| Anti-pattern | Sayi | En kotu ornek |
|---|---|---|
| God Bilesenler (>400 satir) | **2** | CanvasStudio (1.431), CanvasSidebar (1.369) |
| God Dosyalar (>500 satir, 15+ export) | **1** | canvasModel.ts (1.471 satir, 128 export) |
| God Hook'lar (>200 satir, 5+ useState) | **2** | usePivotOrchestration (586), useCanvasPointer (479) |
| God Tipler (>10 alan, karisik sorumluluklar) | **3** | PivotTableView (12), PivotTableInstance (11) |
| Asiri Prop (>10) | **3** | CanvasSidebarProps (18), DatasetPanelProps (10) |
| Prop Drilling (3+ seviye) | **2** | LabsModule→CanvasStudio→CanvasSidebar→alt bilesen |
| Shotgun Surgery riski | **5** | PivotTableView degisikligi → 10+ dosya guncelleme |

**Anti-pattern'lerin %80'i `frontend/src/components/canvas/` icinde** — kod tabaninin geri kalani saglikli.

---

## Tam Plan Ozeti

| Faz | Madde | Odak |
|-----|-------|------|
| Faz 0 | 7 | God code ayristirma (yapisal borc) |
| Faz 1 | 7 | Guvenlik, cokmeler, veri kaybi (uretim engelleyiciler) |
| Faz 2 | 8 | Performans, kararlilik |
| Faz 3 | 8 | Mimari, saglam lastirma |
| Faz 4 | 8 | Kalite cilasi |
| **Toplam** | **38** | |

### Yurutme Sirasi
1. **Faz 0** ilk — ayristirma sonraki tum fazlarda temiz duzeltmelerin onunu acar
2. **Faz 1** sonra — uretim icin guvenlik/kararlilik
3. **Faz 2** ardindan — kullanicinin gordugu performans
4. **Faz 3-4** — surdurulebilirlik ve cilalama

### Dogrulama Protokolu
HER maddeden sonra:
```bash
# Frontend
cd stockpilot/frontend && npx tsc --noEmit

# Backend (backend degisikligi varsa)
cd stockpilot/backend && npx tsc --noEmit && npm run test
```
