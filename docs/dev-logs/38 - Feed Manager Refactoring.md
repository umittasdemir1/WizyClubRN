# FeedManager Modüler Bölme Planı

**Amaç:** `FeedManager.tsx` (1491 satır) dosyasını sorumluluklarına göre 5 odaklı modüle bölerek yönetilebilirliği artırmak. Her modül, test edilebilirliği kolaylaştırmak için bağımsız flag sistemiyle korunacaktır.

## Mevcut Flag Yapısı
```typescript
// FeedManager.tsx satır 87-90
const DISABLE_FEED_UI_FOR_TEST = false;  // ← Ana global flag
const DISABLE_ACTIVE_VIDEO_OVERLAY = DISABLE_FEED_UI_FOR_TEST;
const DISABLE_GLOBAL_OVERLAYS = DISABLE_FEED_UI_FOR_TEST;
const DISABLE_NON_ACTIVE_UI = DISABLE_FEED_UI_FOR_TEST;
```

## Önerilen Modül Yapısı

| # | Modül | Tahmini Satır | Sorumluluk |
|---|---|---|---|
| 1 | `useFeedConfig.ts` | ~50 | Sabitler, flagler, konfigürasyon (ITEM_HEIGHT, vb.) |
| 2 | `useFeedScroll.ts` | ~150 | Scroll yönetimi (Reanimated), Viewability, Prefetching |
| 3 | `useFeedInteractions.ts` | ~200 | Dokunma, Çift Dokunma, Uzun Basma, Carousel Gestures |
| 4 | `useFeedActions.ts` | ~150 | Beğeni, Kaydetme, Paylaşma, Silme, Toast bildirimleri |
| 5 | `FeedOverlays.tsx` | ~200 | Header, StoryBar, BottomSheet'ler, Modallar |
| - | `FeedManager.tsx` | ~300 | Ana orkestrasyon ve birleştirme |

## Yeni Flag Sistemi
**`useFeedConfig.ts`** içeriği:
```typescript
export const FEED_FLAGS = {
  DISABLE_ALL: false,          // Global master switch
  DISABLE_SCROLL_HANDLING: false,
  DISABLE_INTERACTIONS: false,
  DISABLE_ACTIONS: false,
  DISABLE_OVERLAYS: false,
} as const;

// Helper: Global'e bağlı flag kontrolü
export const isDisabled = (flag: keyof typeof FEED_FLAGS): boolean => {
  return FEED_FLAGS.DISABLE_ALL || FEED_FLAGS[flag];
};
```

## Uygulama Adımları

### Adım 1: useFeedConfig.ts Oluştur
- Flag sabitleri tanımlanacak.
- Config değerleri (ITEM_HEIGHT, SCREEN_WIDTH, VIEWABILITY_CONFIG) buraya taşınacak.

### Adım 2: useFeedScroll.ts Oluştur
- `scrollHandler` (Animated/Reanimated) buraya taşınacak.
- `onViewableItemsChanged` mantığı buraya alınacak.
- `setActiveFromIndex` ve `getPrefetchIndices` fonksiyonları eklenecek.
- **Flag:** `DISABLE_SCROLL_HANDLING`

### Adım 3: useFeedInteractions.ts Oluştur
- `handleSingleTap`, `handleDoubleTapLike`, `handleLongPress` buraya taşınacak.
- `handlePressIn` / `handlePressOut` ve Carousel touch handler'ları eklenecek.
- **Flag:** `DISABLE_INTERACTIONS`

### Adım 4: useFeedActions.ts Oluştur
- Video aksiyonları: `handleLike`, `handleSave`, `handleShare`, `handleDelete`.
- Playback kontrolleri: `handleSeek`, `handleRetry`.
- Toast gösterim mantığı.
- **Flag:** `DISABLE_ACTIONS`

### Adım 5: FeedOverlays.tsx Oluştur
- UI katmanları buraya taşınacak:
  - HeaderOverlay
  - StoryBar
  - DescriptionSheet / MoreOptionsSheet
  - DeleteConfirmationModal
- **Flag:** `DISABLE_OVERLAYS`

### Adım 6: FeedManager.tsx Güncelle
- Yeni hook'lar import edilecek.
- Eski inline kodlar temizlenecek ve hook çağrılarıyla değiştirilecek.
- Dosya boyutu ~300 satıra indirilecek.

### Adım 7: Final Doğrulama
- Tüm flag kombinasyonları test edilecek.
- TypeScript kontrolü yapılacak (`npx tsc --noEmit`).

## Dosya Yapısı (Sonrası)
```
src/presentation/components/feed/
├── FeedManager.tsx          (~300 satır) ← Orkestrasyon
├── hooks/
│   ├── useFeedConfig.ts     (~50 satır)  ← Flags + Config
│   ├── useFeedScroll.ts     (~150 satır) ← Scroll
│   ├── useFeedInteractions.ts (~200 satır) ← Gestures
│   └── useFeedActions.ts    (~150 satır) ← Actions
├── FeedOverlays.tsx         (~200 satır) ← UI Layers
├── VideoPlayerPool.tsx      (mevcut)
├── ActiveVideoOverlay.tsx   (mevcut)
└── ...
```

## Risk ve Dikkat
> [!CAUTION]
> **Circular Import:** Hook'lar arasında döngüsel bağımlılık oluşmamasına dikkat edilmeli.

> [!IMPORTANT]
> **TypeScript:** Her adımdan sonra `npx tsc --noEmit` çalıştırılarak tip güvenliği doğrulanmalı.

> [!NOTE]
> Mevcut işlevsellik korunmalı, sadece kod organizasyonu değiştirilmelidir.
