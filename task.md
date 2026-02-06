# Infinite Feed Stabilization Task List (February 6, 2026)

## Completed Steps
1. [x] Infinite feed codebase tarandı ve tüm ilgili dosyalar çıkarıldı.
2. [x] `InfiniteFeedManager` ve `InfiniteFeedCard` üzerinde kök neden analizi yapıldı.
3. [x] Pasif kartlarda gereksiz video mount engellendi (`active-only inline video`).
4. [x] Poster->video geçişi için `onReadyForDisplay` tabanlı overlay eklendi.
5. [x] FlashList clipping kaynaklı siyah ekran riski azaltıldı (`removeClippedSubviews=false`).
6. [x] Viewability algoritması top-most visible item mantığına geçirildi.
7. [x] FlashList recycling state leak düzeltildi (card + carousel state reset).
8. [x] Thumbnail fallback güvenli hale getirildi (yanlış URL fallback engellendi).
9. [x] Feed veri katmanında gereksiz obje churn azaltıldı (`syncedVideos` identity korunumu).
10. [x] Derin code review raporu yazıldı (`docs/feed/INFINITE_FEED_DEEP_REVIEW_2026-02-06.md`).
11. [x] Thumbnail->black screen geçişi için derin teknik araştırma yapıldı ve kaynaklı raporlandı (`docs/feed/INFINITE_FEED_THUMBNAIL_BLACK_SCREEN_RESEARCH_2026-02-06.md`).
12. [x] Prefetch/preload/cache/buffer zinciri audit edildi ve güçlendirildi (`docs/feed/INFINITE_FEED_PREFETCH_PRELOAD_CACHE_BUFFER_AUDIT_2026-02-06.md`).
13. [x] Acil siyah ekran için active-video zorunlu cache + source lock + native poster düzeltmesi uygulandı.
14. [x] TSX/TypeScript kontrolü çalıştırıldı (`npx tsc --noEmit`) ve başarıyla geçti.
15. [x] Active video commit akışı scroll-settle anına taşındı (`onMomentumScrollEnd` / no-momentum `onScrollEndDrag`).
16. [x] Scroll sırasında global pause katmanı eklendi (`isFeedScrolling`) ve autoplay jitter azaltıldı.
17. [x] Infinite card'da strict source lock + first-frame görünürlük gating geri alındı (`videoHidden` + ready/progress/fallback reveal).
18. [x] Prefetch/cache/scroll/video zinciri için telemetry logları eklendi (`logVideo`, `logCache`, `logPerf`).
19. [x] 25 swipe doğrulama checklist dokümanı eklendi (`docs/feed/INFINITE_FEED_SWIPE_LOG_CHECKLIST_2026-02-06.md`).
20. [x] Son değişikliklerden sonra TSX/TypeScript doğrulaması tekrar çalıştırıldı (`cd mobile && npx tsc --noEmit`).
21. [x] Video cache key stabilizasyonu uygulandı (signed/query URL parametreleri cache identity'den ayrıldı).
22. [x] Active video resolved source erken sıfırlama engellendi (cache fallback korunarak network thrash azaltıldı).
23. [x] Siyah ekran korumasını bozmadan hızlı başlangıç için pending-video pre-mount + active-only play modeli eklendi.
24. [x] Viewability anında active commit (A/B flag) etkinleştirildi ve scroll sırasında aktif video pause kaldırıldı.
25. [x] Hızlı scroll boş ekran algısı için pending-window pre-mount genişletildi ve thumbnail yoksa siyah yerine UI-temelli placeholder uygulandı.
26. [x] App-level cache envanteri çıkarıldı ve detaylı rapor yazıldı (`docs/feed/APP_CACHE_SETTINGS_AUDIT_2026-02-06.md`).
27. [x] Kritik kök neden düzeltildi: `refreshFeed` içindeki global `VideoCacheService.clearCache()` kaldırıldı (`mobile/src/presentation/hooks/useVideoFeed.ts`).
28. [x] Android native crash için `ReactExoplayerView` null/stale-callback guard patch’i script’e eklendi ve uygulandı (`mobile/scripts/patch-react-native-video.js`).
29. [x] Native patch doğrulandı: `onEvents` stale callback guard + `videoLoaded` null guard aktif (`mobile/node_modules/react-native-video/.../ReactExoplayerView.java`).
30. [x] Son değişikliklerden sonra TSX/TypeScript doğrulaması tekrar planlandı ve çalıştırıldı (`cd mobile && npx tsc --noEmit`).

## Next Steps (Manual Runtime Validation)
1. [ ] Gerçek cihazda hızlı scroll (aşağı/yukarı) smoke testi.
2. [ ] Karışık içerik (video + carousel) aktif item doğrulaması.
3. [ ] Düşük ağ koşullarında poster->video geçiş doğrulaması.
4. [ ] 25 swipe checklist'ine göre log PASS/FAIL doğrulaması.
