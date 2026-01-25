# FeedManager Refactoring - ToDo List

**Başlangıç:** 25 Ocak 2026 23:38  
**Hedef:** FeedManager.tsx kodunu modüler hale getirmek ve kritik hataları düzeltmek.

## ✅ Hazırlık
- [ ] UI flag açıldı (`DISABLE_FEED_UI_FOR_TEST = false`)
- [ ] FeedManager analiz edildi
- [ ] Implementation plan yazıldı

## 🏗️ Refactoring Adımları

### Adım 1: useFeedConfig.ts
- [ ] Dosya oluştur: `feed/hooks/useFeedConfig.ts`
- [ ] `FEED_FLAGS` objesi ve `isDisabled` helper
- [ ] Constants: `ITEM_HEIGHT`, `SCREEN_WIDTH`
- [ ] `VIEWABILITY_CONFIG`
- [ ] TypeScript check

### Adım 2: useFeedScroll.ts
- [ ] Dosya oluştur: `feed/hooks/useFeedScroll.ts`
- [ ] `scrollHandler` (Animated)
- [ ] `onViewableItemsChanged`
- [ ] `setActiveFromIndex`
- [ ] `getPrefetchIndices`
- [ ] `handleScrollEnd`
- [ ] `DISABLE_SCROLL_HANDLING` flag
- [ ] TypeScript check

### Adım 3: useFeedInteractions.ts
- [ ] Dosya oluştur: `feed/hooks/useFeedInteractions.ts`
- [ ] `handleSingleTap`
- [ ] `handleDoubleTapLike`
- [ ] `handleLongPress`
- [ ] `handlePressIn` / `handlePressOut`
- [ ] `handleCarouselTouchStart` / `handleCarouselTouchEnd`
- [ ] `showTapIndicator`
- [ ] `DISABLE_INTERACTIONS` flag
- [ ] TypeScript check

### Adım 4: useFeedActions.ts
- [ ] Dosya oluştur: `feed/hooks/useFeedActions.ts`
- [ ] `handleLike`, `handleSave`, `handleShare`, `toggleFollow`
- [ ] `handleDelete`
- [ ] `handleSeek`, `handleRetry` (Video Manager üzerinden)
- [ ] Toast logic
- [ ] `DISABLE_ACTIONS` flag
- [ ] TypeScript check

### Adım 5: FeedOverlays.tsx
- [ ] Dosya oluştur: `FeedOverlays.tsx`
- [ ] `HeaderOverlay`
- [ ] `StoryBar`
- [ ] `DescriptionSheet` / `MoreOptionsSheet` entegrasyonu
- [ ] `FeedManager.tsx` refactoring: Hooks entegrasyonu
- [ ] `useFeedVideoManager` (Playback logic) entegrasyonu

## 🛠️ Fixing & Wiring
- [ ] **Logic Restoration:** "Lost" logic restored (activeVideoId checks, etc.)
- [ ] **FlashList Ref:** Ref casting issue fixed.
- [ ] **Config Integration:** `useFeedConfig` flags ensured.
- [ ] **Integration:** `CarouselLayer` and `ScrollPlaceholder` properly integrated.
- [ ] **Linting:** Linting and type errors fixed in `FeedManager` and `custom-feed.tsx`.

## 🚑 Regression Fixes (Derin Düzeltmeler)
- [ ] **Image File Type:** `CarouselLayer`'da .jpg/.png dosyalarının ExoPlayer hatası vermesi engellendi (Regex detection eklendi).
- [ ] **Scroll Locking:** `CarouselLayer` içindeki çakışan touch handler'lar kaldırılarak dikey scroll kilidi çözüldü.
- [ ] **Black Screen / Input Block:** `ScrollPlaceholder` üzerindeki eski overlay kaldırılarak etkileşim engeli aşıldı.
- [ ] **Reanimated Compatibility:** `FlashList`, `Animated.createAnimatedComponent` ile sarılarak Reanimated scroll olaylarının kaybolması önlendi.
- [ ] **Gesture Conflicts:** `SwipeWrapper` tamamen kaldırılarak tüm gesture çakışmaları kökten çözüldü.
- [ ] **Initial Render:** Uygulama açılışında ilk videonun aktif olmasını sağlayan `useEffect` mantığı iyileştirildi.

## 🏁 Sonuç Dosya Yapısı
```
src/presentation/components/feed/
├── FeedManager.tsx        (~300 satır)
├── FeedOverlays.tsx       (~200 satır)
├── hooks/
│   ├── useFeedConfig.ts   (~50 satır)
│   ├── useFeedScroll.ts   (~150 satır)
│   ├── useFeedInteractions.ts (~200 satır)
│   └── useFeedActions.ts  (~150 satır)
```
