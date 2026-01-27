# Havuz Uyumluluk İncelemesi (Sadece Belirtilen Dosyalar)

> Kapsam: Bu rapor, istek içinde açıkça listelenen dosyalarla sınırlıdır. Bu dosyalar dışındaki koda bağlı davranışlar **EXTERNAL DEPENDENCY** olarak işaretlenmiştir. İzinli listede olup bulunamayan dosyalar **VERIFY** olarak işaretlenmiştir.

## 1. Sistem Sorumluluk Haritası (Dosya → Rol)

- `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`
  - Slot havuzu sahibi (3 slot), video yaşam döngüsü yürütümü, slot geri dönüşümü, aktif slot geçitleme, playback surface render.
  - Aktif slot seçimi ve playback geçitlemesi (`paused={!shouldPlay}`), retry ve seek işlemleri (imperative ref) bu dosyada.
  - **EXTERNAL DEPENDENCY**: video URL şekillendirme (`getVideoUrl`), cache API’leri (`VideoCacheService`), buffer ayarı (`getBufferConfig`), logging/metrics.
- `mobile/src/presentation/components/feed/FeedManager.tsx`
  - Feed orkestrasyonu: aktif index seçimi, UI event’ler, overlay koordinasyonu, prefetch/cache kararları, app state pause/resume.
  - Aktif video kimliğini (`setActiveVideo`) yönetir ve scroll senkronunu pool/overlay’e taşır.
  - **EXTERNAL DEPENDENCY**: veri kaynakları (Supabase fetch), prefetch/cache servisleri, Story UI, sheet’ler, router, auth/user bilgisi.
- `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`
  - Aktif item için UI overlay: status icon’ları, action button’lar, metadata, seek bar.
  - Zaman/scroll için shared value ve seek/retry için playback controller kullanır.
  - **EXTERNAL DEPENDENCY**: `ActionButtons`, `MetadataLayer`, `VideoSeekBar` uygulama detayları.
- `mobile/src/presentation/hooks/useVideoFeed.ts`
  - Veri çekme, optimistic etkileşimler, cache init ve initial prefetch seçimi.
  - Social follow state senkronu ve delete/reorder davranışı.
  - **EXTERNAL DEPENDENCY**: repository/use case’ler, cache/prefetch servisleri, `getVideoUrl`.
- `mobile/src/presentation/store/useActiveVideoStore.ts`
  - Feed playback state için tek kaynak (active index/id, pause/mute, playbackRate, app state).
  - App state sync ve mute control hook’larını sağlar.
- `mobile/src/presentation/store/useAuthStore.ts`
  - Auth/session yönetimi; feed bu store’u user id ve auth-gated aksiyonlar için kullanır.
- **VERIFY (eksik dosyalar)**
  - `mobile/src/presentation/components/feed/FeedItemOverlay.tsx` (missing)
  - `mobile/src/presentation/components/feed/VideoOverlays.tsx` (missing)
  - `mobile/src/presentation/hooks/useVideoPlayback.ts` (missing)
  - `mobile/src/presentation/hooks/useVideoSource.ts` (missing)

## 2. Pool / Slot / Index Modeli (Mevcut Tasarımın Ayrıştırılması)

**Slot modeli (VideoPlayerPool)**
- Slot sayısı sabit 3 (`createEmptySlot` başlangıcı, 3 ref). Slot yapısı feed index, videoId, source, thumbnail, ready flag’leri ve retry state içerir.
- Slot yeniden kullanım mantığı `activeIndex` değişimlerinde çalışan recycle pipeline ile yürür (100ms gecikme + `recycleCounterRef` ile stale run’lar elenir).
- `slotsRef`, async handler’larda (retry, progress, error) son slot state’ine senkron erişim sağlar.

**Index modeli**
- Feed aktif index (`activeIndex`) `useActiveVideoStore` kaynaklıdır ve `FeedManager` içinde (`setActiveFromIndex`) viewability/scroll-end tetiklerinden set edilir.
- Pool, `activeIndex`’ten **sadece** playable item varsa `activeVideoIndex` üretir (`postType !== 'carousel'` ve `getVideoUrl` truthy). Playable değilse `activeVideoIndex = null`.
- Pool, playable olmayan active item varken bile adjacent slot mapping için `playableIndices` listesi üretir.

**Slot-to-index mapping**
- `resolveActiveSlotIndex()` aktif index’i zaten tutan slotu korur; yoksa boş slot veya slot 0’a düşer.
- Target slotlar `currentIdx`, sonra next/prev playable index’ler, ardından remaining target’lar ile doldurulur. Deterministik ama `playableIndices` sırası ve `activeIndex` input’una bağlıdır.
- Geçersiz veya playable olmayan index için boş slot üretilir.

**Out-of-range ve empty state**
- `buildSlotForIndex()` invalid / non-playable index’te `createEmptySlot(-1)` döndürür; render engellenir (`isValidSource` false).
- `videos.length === 0` iken pool slotları temizlemiyor; ancak `FeedManager` boş feed’de pool’u render etmediği için stale slotlar görünmez.

## 3. Candidate vs Active Index Analizi (Kanıtlı)

**Açık candidate index**
- Belirtilen dosyalarda açık bir candidate index yok. `activeIndex` viewability/scroll-end ile **anında** aktif olur.

**Örtük candidate handling**
- Pool, yeni aktif slot hazır değilse (`isActiveReady` false) `lastActiveSlotIndexRef` ile önceki slotu göstermeye devam eder. Bu, video katmanında örtük “candidate → active” buffer üretir.

**Olası mismatch**
- `ActiveVideoOverlay`, `activeIndex` ile pozisyonlanır ve `activeVideoId` üzerinden metadata’yı **anında** değiştirir. Ancak pool, yeni slot hazır değilse **önceki slotu** gösterebilir. Bu durumda kısa süreli **UI/video uyuşmazlığı** oluşur: UI video B’nin metadata’sını gösterirken video A görünmeye devam eder.

**Carousel edge case**
- `activeIndex` carousel item’a geldiğinde `activeVideoIndex = null` olur. Pool playable komşu index’leri slotlar ama `hasActiveVideo` false olur. Video katmanı pasifleşir; UI overlay hâlâ carousel item metadata’sını gösterebilir (overlay açıksa). Bu kasıtlı ayrıştırma olabilir; **doğrulama gerekir**.

## 4. Playback Yaşam Döngüsü Akışı

**Play / Pause**
- Playback’in tek kaynağı `useActiveVideoStore.isPaused` (togglePause/setPaused).
- Pool, `shouldPlay = isActiveSlot && !isPaused` hesaplar; sadece aktif slot oynar.

**Background / Foreground**
- `useAppStateSync()` store’daki `isAppActive`’i günceller. `FeedManager`, `ignoreAppState` veya in-app browser görünür değilse `setPaused` ile pause/resume yapar.
- **EXTERNAL DEPENDENCY**: Background audio davranışı, burada sadece `react-native-video` config’iyle (playInBackground/playWhenInactive false) sınırlı gözükür; native davranışa bağlıdır.

**Screen focus / blur**
- `FeedManager` `isScreenFocused` set eder ama bu dosyalarda pause/resume olarak kullanılmaz. Başka dosyalarda kullanılıyorsa **EXTERNAL DEPENDENCY**; kullanılmıyorsa write-only state’tir.

**Audio leakage senaryoları**
- Pool aktif olmayan slotları pause eder (`paused={!shouldPlay}`) ve background playback kapalıdır. Bu, scroll sırasında audio leakage riskini düşürür.
- Ancak hızlı scroll’da non-active slotlar mounted kalır (opacity 0) ve paused olur. Bazı cihazlarda paused video instance’ların audio sızdırıp sızdırmadığı **VERIFY** edilmeli.

**PlaybackRate sahipliği**
- Playback rate `useActiveVideoStore`’da tutulur ve pool’a aktarılır. Controller API (`VideoPlayerPoolRef.setPlaybackRate`) sadece `onPlaybackRateChange`’e proxy olur; otorite store’dadır.

## 5. UI Overlay vs Video Layer Ayrışması

- Video layer (pool) absolute konumlandırılmıştır; `scrollY` shared value ile transform yapar, UI re-render etkisini azaltır.
- `ActiveVideoOverlay` aynı `scrollY` ile görsel pozisyonu senkronlar.
- **Hard decoupling**: overlay seek/retry komutlarını controller üzerinden gönderir (player’a direkt çağrı yok).
- **Risk**: Overlay, `activeIndex` ile pozisyonlanır ve `activeVideo` ile UI render eder. Pool yeni slotu hazır değilken eski slotu gösterirse UI/video drift oluşabilir (Bölüm 3).
- **Feature flag**: `DISABLE_FEED_UI_FOR_TEST = true` tüm overlay/interaction’ları kapatır. Bu bir test bayrağı değilse prod’da UI/video entegrasyonunu devre dışı bırakır.

## 6. State Akışı (Store → Hooks → Components)

**Tek kaynak**
- `useActiveVideoStore`: active video identity, pause/mute, app state, playbackRate.
- `FeedManager`: `setActiveVideo` yazar, `activeIndex/activeVideoId/isPaused/...` okur ve pool/overlay’i koordine eder.

**Data akışı**
- `useVideoFeed` videos listesini oluşturur ve mutation (like/save/follow/delete) yapar. `FeedManager` videos’u üst bileşenden alır.
- `VideoPlayerPool` sadece `videos` + `activeIndex` alır, store’u direkt değiştirmez.

**Store hijyeni**
- `useActiveVideoStore.isScreenFocused` yazılıyor ama bu dosyalar içinde okunmuyor. Dışarıda tüketilmiyorsa dead state.
- `useVideoFeed`, `activeVideoId`’ye subscribe oluyor ama kullanmıyor; her active change’de gereksiz render yaratır.

**Effect bağımlılıkları**
- `useVideoFeed` fetch effect’i sadece `isInitialized` bağımlı; init sonrası user değişimi feed’i otomatik refetch etmiyor.
- `FeedManager` aktif index’i birden fazla kaynaktan set ediyor (viewability + scroll end). Koordinasyon yoksa hızlı scroll’da tekrarlı `setActiveVideo` çağrıları olur.

## 7. Render Performansı ve Re-render Kaynakları

- Pool yalnızca 3 player render eder; her biri shared scroll value ile expensive layout’u azaltır.
- `ScrollPlaceholder` memo; non-carousel item’lar sadece `video.id` değişince re-render olur. Placeholder boş olduğu için bu yaklaşım doğru.
- `ActiveVideoOverlay` özel comparator kullanır. Render’da kullanılan bazı alanlar (örn. `video.spriteUrl`) comparator’da yok; değişirse UI güncellenmeyebilir (**VERIFY**).
- `useVideoFeed`’in `activeVideoId` aboneliği gereksiz render’a neden olur.

## 8. Race Condition’lar ve Async Güvenlik

- **Index setter’lar yarışıyor**: viewability, `onScrollEndDrag`, `onMomentumScrollEnd` hepsi `setActiveFromIndex` çağırıyor. Hızlı scroll’da index thrash ve gereksiz prefetch doğurabilir.
- **Slot recycle concurrency**: `recycleCounterRef` stale async update’leri engelliyor ama 100ms gecikme penceresinde `activeIndex` ilerleyip active slot hazır değilken eski slot gösterilebilir.
- **Upload success flow**: Upload sonrası Supabase’den tekrar fetch, prepend, ardından index 0’a scroll + `setActiveVideo`. Liste değişirse index/ID mismatch riski **VERIFY**.

## 9. Video Source / Cache / Preload / Prefetch İncelemesi

- **URL shaping**: `getVideoUrl` hem pool hem feed’de kullanılıyor; URL mantığı dışarıda (**EXTERNAL DEPENDENCY**).
- **Cache kararları bölünmüş**:
  - `useVideoFeed` initial prefetch’i yönetir.
  - `FeedManager` aktif index değişince cache/prefetch yapar.
  - `VideoPlayerPool` slot bazında source çözümü (memory/disk/network) yapar.
- **Carousel dışlama**: `postType === 'carousel'` ve `isFeedVideoItem` gating sayesinde pool/prefetch video-only kalır.
- **Edge case**: Non-carousel bir item’da `getVideoUrl` null dönerse pool log atar ve empty slot render eder; `FeedManager` yine de bu item’ı aktif set edebilir (UI metadata + video yok). Bu kabul edilebilir bir fallback olabilir; ürün gereksinimi olarak doğrulanmalı.

## 10. Bulgular (Öncelikli)

1) **Candidate vs Active mismatch penceresi** (High)
   - Overlay `activeIndex` ve `activeVideoId` ile anında güncelleniyor; pool yeni slot hazır değilken önceki slotu göstermeye devam edebiliyor.
   - Risk: UI video B’yi gösterirken video A görünür.

2) **Aktif index birden çok kaynaktan set ediliyor** (High)
   - `onViewableItemsChanged`, `onScrollEndDrag`, `onMomentumScrollEnd` aynı işi yapıyor.
   - Risk: index thrash, ekstra prefetch, slot recycling’de nondeterminism.

3) **Global UI kill switch açık** (High)
   - `DISABLE_FEED_UI_FOR_TEST = true` overlay ve etkileşimleri kapatıyor.
   - Test bayrağı değilse prod’da UI/video entegrasyonu bypass olur.

4) **`isScreenFocused` write-only** (Medium)
   - Focus’ta set ediliyor ama bu dosyalar içinde playback gating yok.
   - Dışarıda kullanılmıyorsa dead state ve eksik lifecycle gate’i gizler.

5) **`useVideoFeed` activeVideoId değişiminde re-render** (Low/Perf)
   - Store aboneliği kullanılmıyor; gereksiz render yaratıyor.

6) **ActiveVideoOverlay comparator eksikleri** (Low/Correctness)
   - Render edilen bazı alanlar (örn. `video.spriteUrl`) comparator’da yok; değişirse UI güncellenmeyebilir.

## 11. Cleanup & Refactor Gereksinimleri (Dosya Bazlı)

- `mobile/src/presentation/components/feed/VideoPlayerPool.tsx`
  - UI ve video texture’ın birlikte switch edebilmesi için açık candidate/active senkron modeli veya “active-ready” gating API ekle.
  - `activeIndex` carousel ise overlay davranışı için net politika belirle (overlay gizle veya tutarlı placeholder).
- `mobile/src/presentation/components/feed/FeedManager.tsx`
  - Aktif index update kaynağını tek otoriteye indir (viewability *veya* scroll-end).
  - `DISABLE_FEED_UI_FOR_TEST` için karar ver: kaldır veya environment ile gate et.
  - Screen-focus pause davranışı gerekiyorsa ekle; değilse dead state temizle.
- `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`
  - Overlay switch’ini pool readiness ile hizala veya explicit “active-ready” sinyali ekle.
  - Comparator’ı render-kritik tüm props’u kapsayacak şekilde genişlet **VERIFY**.
- `mobile/src/presentation/hooks/useVideoFeed.ts`
  - Kullanılmayan `activeVideoId` aboneliğini kaldır.
  - Auth değişiminde feed refetch gerekip gerekmediğini netleştir.

**Rapor yolu:** `docs/POOL_COMPATIBILITY_INVESTIGATION_TR.md`

## 12. Uygulama Yol Haritası

1) **Index otoritesini stabilize et**
   - Aktif index’i tek bir kaynaktan set et (viewability *veya* scroll-end).
2) **Candidate → Active hizalaması**
   - Pool “ready” sinyali ile overlay switch’ini gate et veya slot hazır olana kadar `setActiveVideo` geciktir.
3) **Lifecycle tamamlanması**
   - `isScreenFocused` pause/resume kararını netleştir; uygula veya kaldır.
4) **Performans hijyeni**
   - `useVideoFeed`’te kullanılmayan store aboneliğini kaldır.
5) **Doğrulama**
   - Hızlı scroll + background/foreground testleriyle audio leakage ve UI/video sync doğrula.

**Dokümantasyon indeks durumu:** Güncellendi (`DOCUMENTATION_INDEX.md`).

## 13. Eksiksiz TODO Checklist

Bu liste ayrı dosyada tutulur: `docs/POOL_COMPATIBILITY_INVESTIGATION_TODO.md`.
