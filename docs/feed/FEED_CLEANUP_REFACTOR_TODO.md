# Feed Temizlik ve Refaktör Kontrol Listesi

**Kaynak:** `FEED_CODE_REVIEW_CLEANUP_REPORT.md`  
**Durum:** Uygulama İçin Hazır

## 🔴 Yüksek Öncelik (Temizlik)

- [x] **SİL** `src/presentation/components/feed/FeedManager.backup.tsx`
    - *Sebep:* Ölü Kod (Dead Code).
- [x] **TAŞI** `src/presentation/components/feed/UploadModal.tsx` -> `src/presentation/components/upload/UploadModal.tsx`
    - *Sebep:* İlgi Alanlarının Ayrımı (Separation of Concerns). (Not: Diğer dosyalardaki importların güncellendiğinden emin olun).

## 🟡 Orta Öncelik (Hijyen ve Stabilite)

- [x] **STABİLİZE ET** `ActiveVideoOverlay.tsx`
    - [x] `arePropsEqual` fonksiyonu çok uzun ve manuel. Gelecekteki hataları önlemek için `Lodash.isEqual` veya daha güvenli bir prop karşılaştırma yöntemi değerlendirilmeli veya dokümante edilmeli.
- [x] **TEMİZLE** `CarouselLayer.tsx`
    - [x] Kullanılmayan `video` stil nesnesini kaldır.
- [x] **TEMİZLE** `DeleteConfirmationModal.tsx`
    - [x] Kullanılmayan `BlurView` importunu kaldır.

## 🟢 Düşük Öncelik (Geleceğe Yatırım)

- [ ] **İZLE** `VideoPlayerPool.tsx`
    - [ ] `shouldRasterizeIOS` kullanımı düşük RAM'li cihazlarda bellek baskısı yaratabilir. Performans izlenmeli.
- [ ] **OPTİMİZE ET** `useFeedScroll.ts`
    - [ ] `onViewableItemsChanged` tetiklenme sıklığı (debounce) optimize edilebilir.
- [x] **DOKÜMAN** `DOCUMENTATION_INDEX.md` dosyasını `FEED_CODE_REVIEW_CLEANUP_REPORT.md` referansı ile güncelle (Zaten yapıldı).
