# 🎯 WizyClub — Feed Performance & Architecture Audit

> **Tarih:** 2026-03-04  
> **Kapsam:** Infinite Feed + Pool Feed akışları, video player pool, caching, prefetch, state yönetimi  
> **Video Motoru:** `react-native-video` (değiştirilmeyecek — kısıt)  
> **Hedef:** X / Instagram / TikTok / YouTube seviyesine yaklaşmak

---

## 1. Hedef Metrikler

| Metrik | Mevcut (Tahmini) | Hedef |
|---|---|---|
| Scroll FPS | ~45-55 (hitch'li) | ≥58 kararlı |
| Dropped Frames (scroll sırasında) | ~8-15 / sn | <2 / sn |
| Video Start Latency (1. frame) | ~400-800ms (network) | <200ms (cached), <400ms (network) |
| Seek Latency | ~200ms | <100ms |
| Scroll Hitching (16ms+ jank) | Sık (slot recycle sırasında) | Nadir |
| JS Thread Busy (scroll esnasında) | Yüksek | <10ms / frame |
| Memory Peak (10 video sonrası) | ~180-250MB | <150MB kararlı |
| Stall Ratio (rebuffer event / play) | Bilinmiyor | <2% |

---

## 2. Mevcut Mimari Özeti

### 2.1 İki Paralel Feed Sistemi

Projede **iki tamamen bağımsız** feed mimarisi var:

```
┌────────────────────────────────────┐  ┌──────────────────────────────────────┐
│       InfiniteFeed (X/IG tarzı)    │  │       PoolFeed (TikTok tarzı)        │
│                                    │  │                                      │
│  InfiniteFeedManager.tsx (1394 ln) │  │  PoolFeedManager.tsx (632 ln)        │
│  InfiniteFeedCard.tsx (1835 ln)    │  │  PoolFeedVideoPlayerPool.tsx (827 ln)│
│  3+ hooks, 1 store                │  │  PoolFeedSlotRecycler.ts (114 ln)    │
│                                    │  │  6+ hooks, 1 store                  │
│  ⚠️ HER KART OWN Video component  │  │  ✅ 3-slot player pool recycling     │
│  ⚠️ FlashList recycling + Video   │  │  ✅ Reanimated scroll transform      │
│  = sık mount/unmount              │  │  ✅ Slot-based positioning           │
└────────────────────────────────────┘  └──────────────────────────────────────┘
         │                                         │
         └──────────── Ortak Katmanlar ────────────┘
                FeedPrefetchService (226 ln)
                VideoCacheService (320 ln)
                bufferConfig.ts (53 ln)
                getVideoUrl utility
```

### 2.2 InfiniteFeed Akışı
- **FlashList** kullanılıyor (`@shopify/flash-list`)
- Her kart (`InfiniteFeedCard`, 1835 satır!) kendi `<Video>` bileşenini **bağımsız olarak mount** ediyor
- Scroll → `onViewableItemsChanged` → `setFeedActiveState` (batched) → kart `isActive` prop alıyor
- Aktif kart video oynatır, komşu kartlar thumbnail gösterir 
- `VIDEO_MOUNT_RANGE = 1`: aktif ± 1 indeks arası Video mount ediliyor (decode pre-warm)
- `useInfiniteFeedResolvedSourceStore` (Zustand): çözümlenmiş video kaynaklarını saklar

### 2.3 PoolFeed Akışı
- **FlashList** scroll layer + **3-slot player pool** (ayrı katman)
- `PoolFeedSlotRecycler.calculateTargetIndices()` → current/next/prev slot ataması
- `Animated.View` + `translateY` ile slot pozisyonlandırma (Reanimated worklet)
- `recycleSlots()` → async cache lookup → slot state update → `setSlots` 
- `PlayerSlotRenderer` (memo) → tek `<Video>` bileşeni per slot

### 2.4 Cache Hiyerarşisi
```
1. Memory Cache (Map, 100 entry, 60 dk TTL)
   ↓ miss
2. Disk Cache (expo-file-system, 500MB limit)
   ↓ miss  
3. Network (R2/CDN URL)
```

### 2.5 Prefetch Stratejisi
- `FeedPrefetchService`: singleton, priority queue, max 2-3 paralel download
- `pauseForActiveVideo()` / `resumeAfterActiveVideo()`: aktif video oynarken bant genişliği yönetimi
- Direction-aware prefetch: ileri/geri yöne göre farklı sayıda video

---

## 3. Bulgular: Performans Darboğazları (Öncelik Sırasına Göre)

### 🔴 P0 — Kritik

#### 3.1 InfiniteFeedCard: Her Kart Kendi Video Bileşenini Mount Ediyor
**Dosya:** `InfiniteFeedCard.tsx:216-245`  
**Problem:** Her `InfiniteFeedCard` kendi `<Video>` bileşenini mount/unmount ediyor. FlashList recycle ettiğinde eski Video destroy olup yeni Video oluşuyor. Bu:
- Native player instance oluşturma/yok etme (~50-100ms per instance)
- HW decoder slot tüketimi (Android: max 4-8 concurrent decoder)
- Memory pressure ve GC spikes
- Scroll sırasında JS thread blocking (bridge calls)

**Etki:** Scroll hitching'in **ana kaynağı**. PoolFeed'deki 3-slot recycling bunu çözmüş durumda.

**Çözüm:**
```
InfiniteFeed için de bir player pool katmanı ekle (PoolFeed'den 
adapt et). FlashList sadece overlay/UI render etsin, Video 
bileşenleri ayrı bir pool katmanında recycling yapsın.
```

#### 3.2 İki Paralel Feed Mimarisi — Büyük Kod Tekrarı
**Dosyalar:** Tüm `infiniteFeed/` ve `poolFeed/` dizinleri  
**Problem:** 
- Props hemen hemen aynı: `videos, isLoading, toggleLike, toggleSave, toggleFollow...`
- Prefetch/cache/viewability mantığı duplicate
- İki ayrı config dosyası (`useInfiniteFeedConfig.ts` vs `usePoolFeedConfig.ts`)
- İki ayrı store alias dosyası
- Toplam ~5000+ satır sadece iki feed manager + kart bileşenleri

**Etki:** Bakım maliyeti çok yüksek. Bir feed'de yapılan optimizasyon diğerine uygulanmıyor.

**Çözüm:**
```
Ortak bir BaseFeedEngine oluştur:
  - SharedFeedConfig (birleştirilmiş config)
  - SharedVideoPool (recycling mantığı)
  - SharedPrefetchOrchestrator
  - Feed-specific renderers (InfiniteCardRenderer vs PoolCardRenderer)
```

### 🟡 P1 — Yüksek

#### 3.3 PoolFeedVideoPlayerPool: renderPlayer İçinde Closure Allocation
**Dosya:** `PoolFeedVideoPlayerPool.tsx:792-796`  
**Problem:** `renderPlayer()` fonksiyonu her render'da 5 yeni closure oluşturuyor:
```tsx
onLoad={(data) => handleLoad(slotIndex, slot.videoId, slot.index, data)}
onError={(error) => handleError(slotIndex, slot.videoId, error)}
onProgress={(data) => handleProgress(slotIndex, slot.videoId, data)}
onEnd={() => handleEnd(slotIndex, slot.videoId, slot.index)}
onReadyForDisplay={() => handleReadyForDisplay(slotIndex, slot.videoId)}
```
Bu closure'lar `PlayerSlotRenderer` (memo) bileşenine prop olarak geçiyor. Her slots state değişikliğinde `memo` devre dışı kalıyor çünkü closure referansları her seferinde yeni.

**Etki:** Gereksiz re-render'lar. 3 slot × 5 callback = 15 fonksiyon her render'da.

**Çözüm:**
```tsx
// Slot-indexed stable callback map kullan
const callbacks = useMemo(() => 
  [0, 1, 2].map(slotIndex => ({
    onLoad: (data) => handleLoad(slotIndex, slotsRef.current[slotIndex]?.videoId, ...),
    onError: (error) => handleError(slotIndex, slotsRef.current[slotIndex]?.videoId, error),
    // ... diğerleri
  })), [handleLoad, handleError, handleProgress, handleEnd, handleReadyForDisplay]
);
```

#### 3.4 recycleSlots Async + setState Race Condition Riski
**Dosya:** `PoolFeedVideoPlayerPool.tsx:425-622`  
**Problem:** 
- `recycleSlots()` async fonksiyon, cache lookup yapıyor
- `recycleCounterRef` ile stale update koruması var (✅), ama:
- `applySlotUpdate` anında `setSlots(prev => ...)` çağırıyor, ardından `Promise.all` ile diğer slotlar güncelleniyor
- Bu, bir scroll sırasında **3-4 ayrı `setSlots` çağrısı** demek → 3-4 re-render chain

**Etki:** Slot değişikliğinde kısa süreli frame drop.

**Çözüm:**
```
Tüm slot güncellemelerini tek bir batched setSlots() çağrısında birleştir.
Active slot'a öncelik vermeye devam et ama diğer slotları da aynı 
microtask'ta güncelle.
```

#### 3.5 InfiniteFeedManager: Aşırı useState Sayısı
**Dosya:** `InfiniteFeedManager.tsx:147-220`  
**Problem:** 70+ satır state/ref tanımı. Özellikle:
- `themeColorsRef`, `currentUserIdRef`, `isMutedRef`, `netInfoTypeRef`, `subtitleModeRef` gibi "ref mirror" pattern'ları
- Her `useEffect` sonunda manüel ref sync
- `feedActiveState` batched state (✅ iyi), ama diğer state'ler hâlâ ayrı

**Etki:** Her tema/network/subtitle değişikliğinde gereksiz re-render zinciri.

**Çözüm:**
```
1. Volatile state'leri tek bir useRef record'a taşı
2. Ya da Zustand store'a taşı (component dışı state)
3. renderItem fonksiyonu useMemo ile stabilize et
```

### 🟢 P2 — Orta

#### 3.6 progressUpdateInterval = 33ms (30fps Progress Callbacks)
**Dosya:** `PoolFeedVideoPlayerPool.tsx:237`, `InfiniteFeedCard.tsx` (benzer)  
**Problem:** Her 33ms'de bir JS→Native→JS bridge call. Seek bar güncelleme için gerekli ama çok agresif.

**Etki:** Oynatma sırasında JS thread'e sürekli yük.

**Çözüm:**
```
SeekBar aktif (kullanıcı dokunuyor / görünür) ise 33ms,
aksi halde 250ms veya 500ms. Conditional progress interval.
```

#### 3.7 FeedPrefetchService: Generation Tabanlı Queue Reset
**Dosya:** `FeedPrefetchService.ts:78-83`  
**Problem:** `queueVideos()` her yeni `currentIndex` için tüm queue'yu temizliyor (`this.queue = []`). Hızlı scroll'da bu, kuyruktaki yarısı indirilmiş dosyaları çöpe atıyor.

**Etki:** Bandwidth waste, cache miss artışı.

**Çözüm:**
```
Queue'yu tamamen temizlemek yerine, sadece uzak indeksleri 
kaldır ve yakın indekslerin önceliğini güncelle.
```

#### 3.8 VideoCacheService: Senkron Memory Cache + Async Disk I/O Karışımı
**Dosya:** `VideoCacheService.ts:54-83, 142-171`  
**Problem:** `getFromMemoryCache` → senkron, `getCachedVideoPath` → async disk check. Pool recycle sırasında her slot için ayrı async disk check yapılıyor.

**Etki:** `recycleSlots` süresini uzatıyor (~10-30ms per check).

**Çözüm:**
```
Disk cache lookup'ları batch'le: recycleSlots'ta 3 slotu 
paralel kontrol et (zaten yapılıyor ama serielize oluyor).
Active slot için fast-path: sadece memory cache kontrol et, 
disk check'i background'a bırak.
```

#### 3.9 usePoolFeedScroll: setActiveFromIndex İçinde Çoklu Senkron İşlem
**Dosya:** `usePoolFeedScroll.ts:180-258`  
**Problem:** `setActiveFromIndex` tek bir callback içinde:
1. 4 store update (`setActiveVideo`, `setCleanScreen`, `setActiveTab`, `setIsCarouselInteracting`)
2. `VideoCacheService.warmupCache` (current + next)
3. `VideoCacheService.cacheVideo(nextUrl)` async başlatma
4. `Image.prefetch()` × 3 thumbnail
5. `FeedPrefetchService.queueVideos()` (setTimeout ile ertelenmiş ama yine de heavy)

**Etki:** Scroll sırasında viewable item değiştiğinde JS thread'de ~5-10ms yük.

**Çözüm:**
```
Store update'leri unstable_batchedUpdates ile sarmalayıp 
thumbnail/cache işlemlerini requestAnimationFrame veya 
InteractionManager.runAfterInteractions ile ertele.
```

---

## 4. Kaynak Referansları

| Kaynak | İçerik | URL |
|---|---|---|
| react-native-video v7 Docs | Preloading, modüler mimari | [thewidlarzgroup.com](https://thewidlarzgroup.com/react-native-video/) |
| React Native Performance | Official optimization guide | [reactnative.dev/docs/performance](https://reactnative.dev/docs/performance) |
| FlashList — Best Practices | recyclingConfig, estimatedItemSize | [shopify.github.io/flash-list](https://shopify.github.io/flash-list/) |
| react-native-video GitHub | Performance Issues & PRs | [github.com/TheWidlarzGroup/react-native-video](https://github.com/TheWidlarzGroup/react-native-video) |
| TikTok-style Feed Patterns | Player pool, viewability | Community articles & presentations |
| Reanimated Worklets | UI thread animations | [docs.swmansion.com/react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) |

---

## 5. Düzeltme Planı (Phased)

### Faz 1 — Hızlı Kazanımlar (1-2 gün)

| # | Değişiklik | Beklenen Etki |
|---|---|---|
| 1.1 | `renderPlayer` callback'lerini `useMemo`-bazlı stable callback map'e çevir | Re-render %50↓ |
| 1.2 | `progressUpdateInterval` → conditional (33ms seekbar aktif, 250ms pasif) | JS thread load %15↓ |
| 1.3 | `recycleSlots` slot update'lerini tek batched `setSlots` çağrısına birleştir | Frame drop ↓ |
| 1.4 | `setActiveFromIndex` → cache/prefetch işlemlerini InteractionManager'a taşı | Scroll smoothness ↑ |
| 1.5 | FeedPrefetchService: queue reset yerine incremental priority update | Cache hit rate ↑ |

### Faz 2 — Orta Vadeli Refactor (3-5 gün)

| # | Değişiklik | Beklenen Etki |
|---|---|---|
| 2.1 | InfiniteFeed için player pool katmanı ekle (PoolFeed adapter) | Scroll FPS 45→58+ |
| 2.2 | Ortak `BaseFeedEngine` / `SharedVideoPool` abstraction'ı çıkar | Kod %40↓, bakım ↑ |
| 2.3 | InfiniteFeedManager state'lerini Zustand store'a taşı | Re-render ↓ |
| 2.4 | InfiniteFeedCard'ı Video bileşeninden ayır (pure overlay component) | Mount/unmount cost ↓ |

### Faz 3 — İleri Optimizasyonlar (sürekli)

| # | Değişiklik | Beklenen Etki |
|---|---|---|
| 3.1 | `react-native-video` v7 migration (preloading API, modüler mimari) | Start latency ↓ |
| 3.2 | Adaptive buffer tuning (runtime metrics tabanlı) | Stall ratio ↓ |
| 3.3 | HLS variant selection (network speed'e göre quality) | Bandwidth optimization |
| 3.4 | Background prefetch worker (headless JS task) | Cold start cache hit ↑ |

---

## 6. Dosya/Sayfa Bazlı Değişiklik Listesi

### Faz 1 Detayları

---

#### 1.1 — Stable Callback Map

**Dosya:** `src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx`  
**Bileşen:** `PoolFeedVideoPlayerPool` → `renderPlayer` fonksiyonu  
**Problem:** 5 closure × 3 slot = 15 yeni fonksiyon referansı her render'da  
**Önerilen Düzeltme:**
```tsx
// PoolFeedVideoPlayerPool.tsx — renderPlayer üstünde ekle:
const slotCallbacks = useMemo(() => 
  [0, 1, 2].map(si => ({
    onLoad: (data: OnLoadData) => {
      const s = slotsRef.current[si];
      if (s) handleLoad(si, s.videoId, s.index, data);
    },
    onError: (error: OnVideoErrorData) => {
      const s = slotsRef.current[si];
      if (s) handleError(si, s.videoId, error);
    },
    onProgress: (data: OnProgressData) => {
      const s = slotsRef.current[si];
      if (s) handleProgress(si, s.videoId, data);
    },
    onEnd: () => {
      const s = slotsRef.current[si];
      if (s) handleEnd(si, s.videoId, s.index);
    },
    onReadyForDisplay: () => {
      const s = slotsRef.current[si];
      if (s) handleReadyForDisplay(si, s.videoId);
    },
  })),
  [handleLoad, handleError, handleProgress, handleEnd, handleReadyForDisplay]
);

// renderPlayer içinde:
// onLoad={slotCallbacks[slotIndex].onLoad}
// onError={slotCallbacks[slotIndex].onError}
// vs.
```
**Beklenen Etki:** `PlayerSlotRenderer` memo'su artık gerçekten çalışacak → 3 gereksiz re-render ↓

---

#### 1.2 — Conditional Progress Interval

**Dosya:** `src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx`  
**Bileşen:** `PlayerSlotRenderer` → `<Video>` bileşeni  
**Problem:** `progressUpdateInterval={33}` sürekli 30fps callback  
**Önerilen Düzeltme:**
```tsx
// PlayerSlotRendererProps'a ekle:
isSeekBarVisible: boolean;

// <Video> içinde:
progressUpdateInterval={isSeekBarVisible ? 33 : 250}
```
**Aynı değişiklik:** `InfiniteFeedCard.tsx`'teki `<Video>` bileşeni için de uygula  
**Beklenen Etki:** JS bridge call %85↓ (seekbar kapalıyken)

---

#### 1.3 — Batched Slot Update

**Dosya:** `src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx`  
**Bileşen:** `PoolFeedVideoPlayerPool` → `recycleSlots` (satır 432-603)  
**Problem:** Active slot + 2 other slot → 2-3 ayrı `setSlots` çağrısı  
**Önerilen Düzeltme:**
```tsx
// recycleSlots içinde — tüm slot'ları tek seferde güncelle:
const allSlotResults = await Promise.all(
  [0, 1, 2].map(async (slotIndex) => ({
    slotIndex,
    nextSlot: await buildSlotForIndex(slotIndex, targetIndices[slotIndex]),
  }))
);

// Tek bir setSlots çağrısı:
setSlots((prev) => {
  let next = prev;
  // Active slot'u önce uygula
  const activeResult = allSlotResults.find(r => r.slotIndex === activeSlotIndexForUpdate);
  if (activeResult?.nextSlot && (!prev[activeResult.slotIndex] || !slotsEqual(prev[activeResult.slotIndex], activeResult.nextSlot))) {
    next = [...prev];
    next[activeResult.slotIndex] = activeResult.nextSlot;
  }
  // Diğer slot'ları da ekle
  for (const { slotIndex, nextSlot } of allSlotResults) {
    if (slotIndex === activeSlotIndexForUpdate) continue;
    if (!nextSlot || (next[slotIndex] && slotsEqual(next[slotIndex], nextSlot))) continue;
    if (next === prev) next = [...prev];
    next[slotIndex] = nextSlot;
  }
  return next;
});
```
**Beklenen Etki:** 3 re-render → 1 re-render. Frame drop riski ↓

---

#### 1.4 — Cache/Prefetch İşlemlerini Ertele

**Dosya:** `src/presentation/components/poolFeed/hooks/usePoolFeedScroll.ts`  
**Bileşen:** `setActiveFromIndex` (satır 180-258)  
**Problem:** Scroll sırasında senkron cache warmup + Image.prefetch  
**Önerilen Düzeltme:**
```tsx
import { InteractionManager } from 'react-native';

// setActiveFromIndex içinde store update'leri bırak, 
// cache işlemlerini ertele:
InteractionManager.runAfterInteractions(() => {
  // Cache warmup
  if (currentUrl) VideoCacheService.warmupCache(currentUrl);
  if (nextUrl) {
    VideoCacheService.warmupCache(nextUrl);
    VideoCacheService.cacheVideo(nextUrl).catch(() => {});
  }
  // Thumbnail prefetch
  [newIndex - 1, newIndex + 1, newIndex + 2].forEach(idx => {
    const video = videosRef.current[idx];
    if (video?.thumbnailUrl) Image.prefetch(video.thumbnailUrl);
  });
});
```
**Beklenen Etki:** Scroll callback'ten ~5ms JS work kaldırılır

---

#### 1.5 — Incremental Queue Update

**Dosya:** `src/data/services/FeedPrefetchService.ts`  
**Bileşen:** `queueVideos` (satır 68-116)  
**Problem:** Her `currentIndex` değişikliğinde `this.queue = []`  
**Önerilen Düzeltme:**
```tsx
// queue'yu tamamen silmek yerine:
if (typeof currentIndex === 'number' && currentIndex !== this.activeIndex) {
  this.activeIndex = currentIndex;
  this.generation += 1;
  
  // Uzak indeksleri kaldır, yakınları koru
  const keepRange = 5; // currentIndex ± 5 koru
  this.queue = this.queue.filter(item => {
    // Cache key ile video index'i match et (gerekirse ek mapping)
    return true; // Bu filtreleme için ek metadata gerekebilir
  });
  // Temiz kesim yerine priorities güncelle
}
```
**Beklenen Etki:** Cache hit rate %10-15 ↑, bandwidth waste ↓

---

### Faz 2 Detayları

---

#### 2.1 — InfiniteFeed Player Pool Katmanı

**Yeni Dosya:** `src/presentation/components/infiniteFeed/InfiniteFeedVideoPool.tsx` [NEW]  
**Modifiye:** `InfiniteFeedManager.tsx`, `InfiniteFeedCard.tsx`  
**Problem:** Her kart kendi Video mount ediyor  
**Önerilen Düzeltme:**
```
1. PoolFeedVideoPlayerPool.tsx'ten adapt edilmiş InfiniteFeedVideoPool oluştur
2. Pool büyüklüğü: 3 slot (Infinite'te card boyutu farklı olacağından 
   pozisyonlama stratejisi değişecek — translateY yerine card offset hesapla)
3. InfiniteFeedCard'dan <Video> bileşenini kaldır, sadece overlay render et
4. InfiniteFeedManager'a pool ref ekle, active index değiştiğinde recycle et
```
**Beklenen Etki:** **Scroll FPS'de dramatik artış.** Video mount/unmount elimine.

---

#### 2.2 — BaseFeedEngine Abstraction

**Yeni Dosya:** `src/presentation/components/shared/feed/BaseFeedEngine.tsx` [NEW]  
**Yeni Dosya:** `src/presentation/components/shared/feed/SharedVideoPool.tsx` [NEW]  
**Yeni Dosya:** `src/presentation/components/shared/feed/SharedFeedConfig.ts` [NEW]  
**Problem:** İki feed'de tekrarlanan mantık  
**Önerilen Düzeltme:**
```
Ortak olan:
  - Video pool recycling mantığı
  - Prefetch orchestration
  - Active video selection (viewability-based)
  - Cache lookup pipeline
  - Error handling & retry

Feed-specific:
  - Rendering strategy (card vs full-screen)
  - Overlay components
  - Gesture handling
  - Layout (card height vs SCREEN_HEIGHT)
```

---

#### 2.3 — State Konsolidasyonu

**Dosya:** `InfiniteFeedManager.tsx`  
**Problem:** 15+ useState + 20+ useRef  
**Önerilen Düzeltme:**
```tsx
// Mevcut:
const [activeTab, setActiveTab] = useState('Sana Özel');
const [selectedMoreVideoId, setSelectedMoreVideoId] = useState(null);
const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
// ... 10+ more

// Önerilen: Zustand store
interface InfiniteFeedUIState {
  activeTab: FeedTab;
  selectedMoreVideoId: string | null;
  isMoreSheetOpen: boolean;
  isCarouselInteracting: boolean;
  // ...
  setActiveTab: (tab: FeedTab) => void;
  openMoreSheet: (videoId: string) => void;
  // ...
}

export const useInfiniteFeedUIStore = create<InfiniteFeedUIState>()((set) => ({ ... }));
```
**Beklenen Etki:** Component re-render'ları izole edilir; sadece ilgili slice subscribe eden bileşenler güncellenir.

---

#### 2.4 — InfiniteFeedCard Video Ayrımı

**Dosya:** `src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`  
**Problem:** 1835 satırlık monolitik bileşen  
**Önerilen Düzeltme:**
```
1. VideoMediaLayer → tamamen kaldır (pool katmanından gelecek)
2. Kalan UI: overlay, metadata, actions, subtitles
3. Card boyutu: ~800-1000 satıra düşer
4. FlashList recycling artık saf UI component recycle eder → çok hızlı
```
**Beklenen Etki:** FlashList recycling sadece UI element'lerini kapsar, Video mount/unmount yok.

---

## 7. Riskler, Trade-off'lar, Test Stratejisi

### Riskler

| Risk | Olasılık | Etki | Mitigasyon |
|---|---|---|---|
| InfiniteFeed pool'da card offset hesaplama zorluğu | Orta | Layout kayması | Prototype → measure → tune |
| BaseFeedEngine abstraction sırasında regresyon | Orta | Feature break | Mevcut testleri koru, yeni integration test ekle |
| `react-native-video` v7 migration breaking change | Yüksek | API farklılıkları | Ayrı branch, incremental migration |
| Performance ölçüm hatası (cihaza bağlı) | Düşük | Yanlış optimizasyon | Gerçek cihazda profiling, multiple device |

### Trade-off'lar

| Karar | Avantaj | Dezavantaj |
|---|---|---|
| Pool boyutu 3 (mevcut) | Düşük memory | Hızlı scroll'da poster flash |
| Pool boyutu 5 | Smooth scroll | ~50MB ekstra memory |
| Incremental queue (Faz 1.5) | Daha iyi cache hit | Daha karmaşık queue logic |
| Batched slot update (Faz 1.3) | 1 re-render | Active slot görsel gecikmesi risk (minimal) |

### Test Stratejisi

#### Profiling Araçları
1. **React DevTools Profiler** — re-render count & duration
2. **Flipper / React Native Performance Monitor** — FPS, JS/UI thread frame time
3. **Hermes Profiler** (`hermes-profile-transformer`) — JS execution profile
4. **Android Studio Profiler** — memory, CPU, GPU rendering
5. **Xcode Instruments** — Time Profiler, Memory Allocations

#### Ölçüm Planı
```
Her faz öncesi/sonrası:
1. 30 video scroll (yukarı→aşağı→yukarı): FPS log, dropped frame count
2. 10 video arası rapid scroll: hitching count, player transition time
3. Memory baseline: app start → 20 video izle → memory delta
4. Video start latency: viewability change → first frame visible (PerformanceLogger)
5. Cold start → first video play: TTI ölçümü
```

#### Regresyon Kontrolleri
- [ ] Tüm feed türleri scroll davranışı korunuyor mu?
- [ ] Mute/unmute, like/save/share aksiyonları çalışıyor mu?
- [ ] Pull-to-refresh feed yenileme çalışıyor mu?
- [ ] Carousel post'lar doğru render ediliyor mu?
- [ ] Deep link ile direkt video açma çalışıyor mu?
- [ ] Story bar etkileşimi korunuyor mu?
- [ ] Subtitle overlay çalışıyor mu?

---

## 8. Sonuç ve Başarı Kriterleri

### Özet
WizyClub'ın feed sistemi **işlevsel olarak kapsamlı ve feature-complete** bir durumda. İki paralel feed mimarisi (Infinite/Pool) farklı kullanım senaryolarını destekliyor. Ancak **performans ve sürdürülebilirlik** açısından kritik iyileştirme alanları mevcut:

1. **En büyük sorun:** InfiniteFeedCard'ın her kart için ayrı Video mount etmesi
2. **En büyük mimari borç:** İki feed sisteminin kod tekrarı
3. **En hızlı kazanım:** Callback stabilization + batched state update

### Başarı Kriterleri

| # | Kriter | Hedef | Ölçüm Yöntemi |
|---|---|---|---|
| 1 | Scroll FPS (30 video traversal) | ≥58 FPS ortalama | RN Perf Monitor |
| 2 | Video start latency (cached) | <200ms | PerformanceLogger |
| 3 | Video start latency (network) | <400ms | PerformanceLogger |
| 4 | Memory delta (20 video sonrası) | <50MB artış | Platform profiler |
| 5 | Dropped frames (rapid scroll) | <2/sn | Flipper |
| 6 | InfiniteFeed + PoolFeed toplam satır sayısı | ≤3500 (mevcut ~5000+) | `cloc` |
| 7 | Regresyon testi pass rate | %100 | Manuel + CI |

---

> **Öneri:** Faz 1 (hızlı kazanımlar) 1-2 günde uygulanabilir ve ölçülebilir performans artışı sağlar. Faz 2 daha planlamalı bir refactor gerektirir ve Faz 1 sonuçlarına göre önceliklendirilebilir.
