# 🔧 WizyClub — Clean Architecture Refactoring TODO

> **Başlangıç:** 22 Şubat 2026  
> **Baseline TSX Hata:** 3 hata (mevcut)  
> **Kural:** Her adım sonrası `npx tsc --noEmit` kontrolü yapılır  
> **Sıralama:** Basit → Zor (risk minimizasyonu)

---

## ✅ PHASE 0 — Zaten Tamamlanan (Önceki Oturum)

- [x] **SC001** — Supabase credentials `.env`'e taşındı (`mobile/.env` + `mobile/src/core/supabase.ts`)
- [x] **SC002** — Backend scripts (7 dosya) `dotenv` ile güncellendi
- [x] **SEC** — `google-credentials.json` git'ten çıkarıldı, `.gitignore`'a eklendi
- [x] **PUSH** — Tüm lokal GitHub main'e push edildi

---

## 🟢 PHASE 1 — Hızlı Düzeltmeler (Basit, Düşük Risk)

### 1.1 Barrel Export'lar (11 dosya oluştur)
> Tahmini: ~15dk | Risk: Çok düşük

- [x] `src/domain/repositories/index.ts`
- [x] `src/domain/usecases/index.ts`
- [x] `src/data/repositories/index.ts`
- [x] `src/data/datasources/index.ts`
- [x] `src/data/mappers/index.ts`
- [x] `src/data/services/index.ts`
- [x] `src/presentation/hooks/index.ts`
- [x] `src/presentation/store/index.ts`
- [x] `src/presentation/components/infiniteFeed/index.ts`
- [x] `src/presentation/components/story/index.ts`
- [x] `src/presentation/components/explore/index.ts`
- [x] 🔍 TSX Kontrolü ✅ (1 pre-existing hata, barrel kaynaklı 0)

### 1.2 Dosya Taşıma: `src/utils/` → `core/utils/`
> Tahmini: ~5dk | Risk: Düşük

- [x] `src/utils/ignoreWarnings.ts` → `src/core/utils/ignoreWarnings.ts`
- [x] Import referanslarını güncelle
- [x] 🔍 TSX Kontrolü

### 1.3 `catch (error: any)` → `catch (error: unknown)` (12+ yer)
> Tahmini: ~20dk | Risk: Düşük

- [x] `useAuthStore.ts` (satır 84, 146)
- [x] `PoolFeedVideoPlayerPool.tsx` (catch blokları)
- [x] `StoryViewer.tsx` (catch blokları)
- [x] `useVideoFeed.ts` (catch blokları)
- [x] Diğer catch blokları tarama
- [x] 🔍 TSX Kontrolü

### 1.4 DRY: `resolveSubtitleTextAlign` Ortaklaştırma
> Tahmini: ~10dk | Risk: Düşük

- [x] `src/core/utils/subtitleUtils.ts` oluştur
- [x] `upload-composer.tsx` → import et
- [x] `video-editor.tsx` → import et
- [x] 🔍 TSX Kontrolü

### 1.5 Web-Only Dead Code Temizliği (`core/supabase.ts`)
> Tahmini: ~10dk | Risk: Düşük (Platform.OS guard'lı)

- [x] `createWebStorage()` fonksiyonunu kaldır (sadece native kullanıyoruz)
- [x] `document.addEventListener('visibilitychange')` bloğunu kaldır
- [x] Sadece `AsyncStorage` + `AppState` bırak
- [x] 🔍 TSX Kontrolü

---

## 🟡 PHASE 2 — DI Container + Katman İhlalleri (Orta Zorluk)

### 2.1 DI Container Oluştur
> Tahmini: ~30dk | Risk: Orta

- [x] `src/core/di/container.ts` oluştur
- [x] Tüm repository interface'lerini domain'den import et
- [x] Tüm repository impl'leri data'dan import et
- [x] Singleton container export et
- [x] Service'leri (VideoCacheService, FeedPrefetchService) container'a ekle
- [x] 🔍 TSX Kontrolü

### 2.2 Presentation Store'lardaki İhlalleri Düzelt (2 dosya)
> Tahmini: ~20dk | Risk: Orta

- [ ] `useSocialStore.ts` → `InteractionRepositoryImpl` → container
- [ ] `useDraftStore.ts` → `DraftRepositoryImpl` → container
- [ ] 🔍 TSX Kontrolü

### 2.3 Presentation Hook'lardaki İhlalleri Düzelt (7 dosya)
> Tahmini: ~40dk | Risk: Orta

- [ ] `useProfileSearch.ts` → container
- [ ] `useSavedVideos.ts` → container
- [ ] `useStories.ts` → container
- [ ] `useVideoViewTracking.ts` → container (SupabaseVideoDataSource → container)
- [ ] `useVideoSearch.ts` → container
- [ ] `useVideoFeed.ts` → container (4 import)
- [ ] `useProfile.ts` → container
- [ ] 🔍 TSX Kontrolü

### 2.4 Presentation Component'lardaki İhlalleri Düzelt (9 dosya)
> Tahmini: ~40dk | Risk: Orta

- [ ] `StoryViewer.tsx` → container
- [ ] `PoolFeedVideoPlayerPool.tsx` → container
- [ ] `PoolFeedStoryBar.tsx` → container
- [ ] `PoolFeedVideoErrorHandler.ts` → container
- [ ] `usePoolFeedLifecycleSync.ts` → container
- [ ] `usePoolFeedScroll.ts` → container
- [ ] `InfiniteFeedManager.tsx` → container
- [ ] `InfiniteStoryBar.tsx` → container
- [ ] `TrendingCarousel.tsx` → container
- [ ] 🔍 TSX Kontrolü

### 2.5 App Ekranlarındaki İhlalleri Düzelt (8 dosya)
> Tahmini: ~30dk | Risk: Orta

- [ ] `EditProfileSheet.tsx` → container
- [ ] `_layout.tsx` → container
- [ ] `user/[id].tsx` → container
- [ ] `user/activities/[type].tsx` → container
- [ ] `search.tsx` → container
- [ ] `notifications.tsx` → container (MOCK_NOTIFICATIONS → repository)
- [ ] `(tabs)/_layout.tsx` → container (MOCK_NOTIFICATIONS → repository)
- [ ] `(tabs)/profile.tsx` → container
- [ ] 🔍 TSX Kontrolü

---

## 🟠 PHASE 3 — Supabase Direkt Erişim Düzeltmeleri (7 dosya)

### 3.1 Supabase İmportlarını Data Katmanına Taşı
> Tahmini: ~1.5 saat | Risk: Yüksek (business logic taşıma)

- [ ] `useStories.ts` → supabase çağrısını `StoryRepositoryImpl`'e taşı
- [ ] `DeletedContentSheet.tsx` → supabase çağrısını repository'ye taşı
- [ ] `InfiniteFeedManager.tsx` → supabase çağrısını repository'ye taşı
- [ ] `UploadDetails.tsx` → supabase çağrısını repository'ye taşı
- [ ] `edit.tsx` → supabase çağrısını repository'ye taşı
- [ ] `explore.tsx` → supabase çağrısını repository'ye taşı
- [ ] 🔍 TSX Kontrolü

### 3.2 useAuthStore Business Logic → Domain
> Tahmini: ~45dk | Risk: Yüksek

- [ ] `IAuthRepository.ts` oluştur (domain/repositories)
- [ ] `AuthRepositoryImpl.ts` oluştur (data/repositories)
- [ ] `SignUpUseCase.ts` oluştur (domain/usecases)
- [ ] `useAuthStore.ts` → SignUpUseCase üzerinden çalış
- [ ] Container'a AuthRepository ekle
- [ ] 🔍 TSX Kontrolü

### 3.3 useEffect Cleanup: useAuthStore
> Tahmini: ~10dk | Risk: Düşük

- [ ] `onAuthStateChange` subscription'ını cleanup'ta unsubscribe et
- [ ] 🔍 TSX Kontrolü

---

## 🔴 PHASE 4 — `any` Type Düzeltmeleri (50+ yer)

### 4.1 Pool Feed `any` Düzeltmeleri
> Tahmini: ~30dk | Risk: Orta

- [ ] `PoolFeedOverlays.tsx` — `storyUsers: any[]`, `uiOpacityStyle: any`
- [ ] `PoolFeedVideoPlayerPool.tsx` — `error: any`, `netInfo: any`
- [ ] `usePoolFeedScroll.ts` — `event: any`, `listRef: React.RefObject<any>`
- [ ] `usePoolFeedInteractions.ts` — `event: any` (2 adet)
- [ ] 🔍 TSX Kontrolü

### 4.2 Story `any` Düzeltmeleri
> Tahmini: ~20dk | Risk: Orta

- [ ] `StoryViewer.tsx` — `data: any` (4 adet — video load callbacks)
- [ ] 🔍 TSX Kontrolü

### 4.3 Profile `any` Düzeltmeleri
> Tahmini: ~30dk | Risk: Orta

- [ ] `ProfileSettingsOverlay.tsx` — 6 farklı `any`
- [ ] `app/(tabs)/profile.tsx` — 7 farklı `any`
- [ ] 🔍 TSX Kontrolü

### 4.4 Kalan `any` Taraması
> Tahmini: ~20dk | Risk: Orta

- [ ] Tüm projeyi `grep` ile tara, kalan `any`'leri düzelt
- [ ] 🔍 TSX Kontrolü

---

## 🔵 PHASE 5 — DRY: Tekrarlanan Kod Ortaklaştırma

### 5.1 Shared TabIcons Bileşeni
> Tahmini: ~20dk | Risk: Düşük

- [ ] `src/presentation/components/shared/TabIcons.tsx` oluştur (GridIcon, VideoIcon, StoreTabIcon)
- [ ] `profile.tsx` → shared import
- [ ] `user/[id].tsx` → shared import
- [ ] 🔍 TSX Kontrolü

### 5.2 Shared PreviewModal Bileşeni
> Tahmini: ~15dk | Risk: Düşük

- [ ] `src/presentation/components/shared/PreviewModal.tsx` oluştur
- [ ] `profile.tsx` → shared import
- [ ] `user/[id].tsx` → shared import
- [ ] 🔍 TSX Kontrolü

---

## ⚫ PHASE 6 — God Component Parçalama (Zor, Yüksek Risk)

> ⚠️ Bu fazda her bileşen tek tek ayrıştırılacak.  
> Her file çıkarıldıktan sonra TSX kontrolü yapılacak.

### 6.1 `profile.tsx` Parçalama (1798 satır → ~500 satır hedef)
> Tahmini: ~3 saat | Risk: Yüksek

- [ ] `useProfileState.ts` hook'u çıkar (useState + useEffect logic)
- [ ] `ProfileHeader.tsx` çıkar (avatar, bio, stats)
- [ ] `ProfileTabsBar.tsx` çıkar (tab navigasyon)
- [ ] `ProfileGridView.tsx` çıkar (grid/video views)
- [ ] `ProfileActivityHistory.tsx` çıkar (izleme geçmişi)
- [ ] Ana `profile.tsx`'i sadece orchestration bırak
- [ ] 🔍 TSX Kontrolü

### 6.2 `upload-composer.tsx` Parçalama (1132 satır → ~400 satır hedef)
> Tahmini: ~2 saat | Risk: Yüksek

- [ ] `useComposerState.ts` hook'u çıkar
- [ ] `ComposerPreviewCarousel.tsx` çıkar
- [ ] `ComposerSubtitleEditor.tsx` çıkar
- [ ] `ComposerToolbar.tsx` çıkar
- [ ] `ExitConfirmationModal.tsx` çıkar
- [ ] Ana `upload-composer.tsx`'i sadece orchestration bırak
- [ ] 🔍 TSX Kontrolü

### 6.3 `search.tsx` Parçalama (1059 satır → ~300 satır hedef)
> Tahmini: ~1.5 saat | Risk: Yüksek

- [ ] `useSearchState.ts` hook'u çıkar
- [ ] `SearchDiscoveryView.tsx` çıkar
- [ ] `SearchResultsView.tsx` çıkar
- [ ] Ana `search.tsx`'i sadece orchestration bırak
- [ ] 🔍 TSX Kontrolü

### 6.4 `StoryViewer.tsx` Parçalama (931 satır → ~400 satır hedef)
> Tahmini: ~1.5 saat | Risk: Yüksek

- [ ] `useStoryViewerState.ts` hook'u çıkar
- [ ] Story alt bileşenleri çıkar
- [ ] Ana `StoryViewer.tsx`'i sadece orchestration bırak
- [ ] 🔍 TSX Kontrolü

### 6.5 `user/[id].tsx` + `video-editor.tsx` Parçalama
> Tahmini: ~1.5 saat | Risk: Yüksek

- [ ] `user/[id].tsx` shared components kullan (Phase 5 sonrası)
- [ ] `video-editor.tsx` alt bileşenlere ayır
- [ ] 🔍 TSX Kontrolü

---

## 📊 İlerleme Özeti

| Phase | Durum | Adım | Tamamlanan |
|-------|-------|------|-----------|
| Phase 0 — Önceki Oturum | ✅ Tamam | 4/4 | 4 |
| Phase 1 — Hızlı Düzeltmeler | ✅ Tamam | 5/5 | 5 |
| Phase 2 — DI Container | 🟡 Devam | 1/5 | 1 |
| Phase 3 — Supabase Düzeltmeleri | ⬜ Bekliyor | 0/3 | 0 |
| Phase 4 — `any` Düzeltmeleri | ⬜ Bekliyor | 0/4 | 0 |
| Phase 5 — DRY Düzeltmeleri | ⬜ Bekliyor | 0/2 | 0 |
| Phase 6 — God Components | ⬜ Bekliyor | 0/5 | 0 |
| **TOPLAM** | — | **10/28** | **10** |
