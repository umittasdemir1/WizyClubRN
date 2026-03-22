# Feed Bileşeni Temizlik & Refaktör Hazırlık Analizi

> **Tarih:** 2025-01-28  
> **Kapsam:** `mobile/src/presentation/components/feed`  
> **Analiz Derinliği:** Kapsamlı (FeedManager.tsx için 2x inceleme)  
> **Toplam Analiz Edilen Dosya:** 16 TSX/TS dosyası  
> **Toplam Kod Satırı:** ~5.200 satır

---

## Yönetici Özeti

Feed bileşen katmanı, WizyClub'daki **en kritik UI alt sistemidir**. TikTok tarzı video oynatma, kullanıcı etkileşimleri ve içerik orkestrasyonundan sorumludur. Bu analiz, bakım kolaylığı ve performans optimizasyonu için dikkat gerektiren birkaç alanla birlikte **olgun ama karmaşık bir mimari** ortaya koymaktadır.

### Ana Bulgular

| Kategori | Durum | Risk Seviyesi |
|----------|-------|---------------|
| Mimari Bütünlük | ⚠️ Orta Düzey Sorunlar | Orta |
| Performans Optimizasyonu | ✅ İyi Optimize Edilmiş | Düşük |
| Sorumluluk Ayrımı | ⚠️ Kısmi İhlaller | Orta |
| Kod Tekrarı | ✅ Minimal | Düşük |
| Prop Drilling | ⚠️ Mevcut ama Yönetilebilir | Orta |
| Ölü/Kullanılmayan Kod | ⚠️ Biraz Mevcut | Düşük |

---

## Bileşen Envanteri

### Çekirdek Orkestrasyon (2 dosya)

| Dosya | Satır | Sorumluluk | Bağımlılık Seviyesi |
|-------|-------|------------|---------------------|
| [FeedManager.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedManager.tsx) | 1.524 | Ana orkestratör, kaydırma/indeks/yaşam döngüsü koordinasyonu | YÜKSEK |
| [VideoPlayerPool.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoPlayerPool.tsx) | 870 | 3 slotlu video oynatıcı geri dönüşüm havuzu | YÜKSEK |

### UI Katmanları (7 dosya)

| Dosya | Satır | Sorumluluk | Bağımlılık Seviyesi |
|-------|-------|------------|---------------------|
| [ActiveVideoOverlay.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx) | ~120 | Aktif video için ayrıştırılmış UI katmanı | DÜŞÜK |
| [HeaderOverlay.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/HeaderOverlay.tsx) | ~150 | Sessiz, hikayeler, yükleme, sekme navigasyonu | DÜŞÜK |
| [MetadataLayer.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/MetadataLayer.tsx) | ~200 | Kullanıcı bilgisi, açıklama, takip butonu | DÜŞÜK |
| [ActionButtons.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/ActionButtons.tsx) | ~250 | Beğeni, kaydet, paylaş, alışveriş butonları + animasyonlar | DÜŞÜK |
| [VideoSeekBar.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/VideoSeekBar.tsx) | 358 | SharedValue senkronizasyonlu arama çubuğu | ORTA |
| [BrightnessOverlay.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/BrightnessOverlay.tsx) | ~40 | Parlaklık kontrolü için koyu katman | DÜŞÜK |
| [DoubleTapLike.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/DoubleTapLike.tsx) | 104 | Çift dokunma beğeni gesture handler | DÜŞÜK |

### Hikaye Bileşenleri (2 dosya)

| Dosya | Satır | Sorumluluk | Bağımlılık Seviyesi |
|-------|-------|------------|---------------------|
| [StoryBar.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/StoryBar.tsx) | 215 | Yatay kaydırılabilir hikaye listesi | DÜŞÜK |
| [StoryAvatar.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/StoryAvatar.tsx) | ~70 | Görüntülenme durumlu hikaye halkası | DÜŞÜK |

### Carousel & Modallar (3 dosya)

| Dosya | Satır | Sorumluluk | Bağımlılık Seviyesi |
|-------|-------|------------|---------------------|
| [CarouselLayer.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/CarouselLayer.tsx) | ~300 | Çoklu görsel/video carousel gönderileri | ORTA |
| [UploadModal.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/UploadModal.tsx) | 949 | Video yükleme sihirbazı | ORTA |
| [DeleteConfirmationModal.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/DeleteConfirmationModal.tsx) | 102 | Silme onay diyalogu | DÜŞÜK |

### Yardımcı Bileşenler (2 dosya)

| Dosya | Satır | Sorumluluk | Bağımlılık Seviyesi |
|-------|-------|------------|---------------------|
| [FeedSkeleton.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/FeedSkeleton.tsx) | 120 | Shimmer efektli yükleme iskeleti | DÜŞÜK |
| [SpritePreview.tsx](file:///d:/WizyClub/mobile/src/presentation/components/feed/SpritePreview.tsx) | 213 | Sprite sheet kare önizlemesi | DÜŞÜK |

---

## FeedManager.tsx Derin Denetimi (2x İnceleme)

### Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                        FeedManager                               │
├─────────────────────────────────────────────────────────────────┤
│  Katman 0: SwipeWrapper (gesture yönetimi)                      │
│  ├── Katman 1: VideoPlayerPool (z-index: 1)                     │
│  ├── Katman 1.5: BrightnessOverlay                              │
│  ├── Katman 2: FlashList kaydırma algılama (z-index: 5)         │
│  ├── Katman 3: ActiveVideoOverlay (z-index: 50)                 │
│  ├── Katman 4: Global Overlays (HeaderOverlay, StoryBar)        │
│  └── Katman 5: Bottom Sheets & Modallar (z-index: 9999)         │
└─────────────────────────────────────────────────────────────────┘
```

### Sorumluluk Matrisi

| Sorumluluk | Durum | Notlar |
|------------|-------|--------|
| Kaydırma/İndeks Koordinasyonu | ✅ Uygun | `onViewableItemsChanged` + `snapToInterval` |
| Video Yaşam Döngüsü Yönetimi | ✅ Uygun | VideoPlayerPool'a delege ediyor |
| Oynatma Durumu (duraklat/oynat/hız) | ✅ Merkezi | `useActiveVideoStore` kullanıyor |
| Kullanıcı Etkileşimleri (dokunma/çift dokunma/uzun basma) | ✅ Uygun | Callback'ler ile yönetiliyor |
| Döngü Sayısı & Otomatik İlerleme | ⚠️ Karmaşık | `loopCountRef` + `handleVideoEnd` mantığı |
| Ön Yükleme (Prefetching) | ✅ Uygun | `FeedPrefetchService` entegrasyonu |
| Bottom Sheet Koordinasyonu | ✅ Uygun | Sheet ref'leri + callback'ler |
| Temiz Ekran Modu | ✅ Uygun | `isCleanScreen` state |
| Toast Bildirimleri | ⚠️ Inline | Animasyon mantığı FeedManager'da |

### Tespit Edilen Sorunlar

#### 1. UI Kapatma Bayrağı Hala Mevcut
```typescript
// Satır 88
const DISABLE_FEED_UI_FOR_TEST = false;
```
**Risk:** DÜŞÜK  
**Sorun:** Debug bayrağı üretim kodunda mevcut. Şu anda `false` olsa da teknik borç oluşturuyor.  
**Öneri:** Test aşamasından sonra kaldırılmalı veya ortam konfigürasyonuna taşınmalı.

#### 2. Çoklu Koşullu Kapatma Bayrakları
```typescript
// Satır 89-91
const DISABLE_NON_ACTIVE_UI = DISABLE_FEED_UI_FOR_TEST;
const DISABLE_ACTIVE_VIDEO_OVERLAY = DISABLE_FEED_UI_FOR_TEST;
const DISABLE_GLOBAL_OVERLAYS = DISABLE_FEED_UI_FOR_TEST;
```
**Risk:** DÜŞÜK  
**Sorun:** Türetilmiş bayraklar gereksiz dolaylama oluşturuyor.  
**Öneri:** Tek bir config nesnesinde birleştir veya kaldır.

#### 3. Döngü Sayısı Mantığı Karmaşıklığı
```typescript
// Satır 670-720 (handleVideoEnd)
loopCountRef.current += 1;
if (loopCountRef.current < 2) {
    videoPlayerRef.current?.seekTo(0);
    // ...
    return;
}
setIsVideoFinished(true);
```
**Risk:** ORTA  
**Sorun:** Döngü sayısı mantığı otomatik ilerleme mantığıyla iç içe. Maksimum döngüler için sihirli sayı `2`.  
**Öneri:** `MAX_VIDEO_LOOPS` konfigürasyon sabiti olarak çıkar.

#### 4. Toast Animasyon Mantığı Inline
```typescript
// Satır 1326-1351 (Kaydet Toast)
<RNAnimated.View
    pointerEvents="none"
    style={[
        styles.saveToast,
        saveToastActive ? styles.saveToastActive : styles.saveToastInactive,
        {
            top: insets.top + 60,
            opacity: saveToastOpacity,
            transform: [{ translateY: saveToastTranslateY }],
        },
    ]}
>
```
**Risk:** DÜŞÜK  
**Sorun:** Toast UI, ayrı bir bileşen yerine FeedManager'da inline tanımlanmış.  
**Öneri:** Yeniden kullanılabilirlik için `SaveToast` bileşeni çıkar.

#### 5. Effect Bağımlılık Dizileri

| Effect | Bağımlılıklar | Risk |
|--------|---------------|------|
| `handleVideoProgress` | 6 bağımlılık | ⚠️ Orta - `isSeeking` yeniden oluşturmaya neden oluyor |
| `handleVideoEnd` | 5 bağımlılık | ✅ Tamam |
| `handleFeedTap` | 3 bağımlılık | ✅ Tamam |
| `handleLongPress` | 2 bağımlılık | ⚠️ Orta - `playbackRate` bağımlılıklarda |

**Öneri:** Callback yeniden oluşturmayı önlemek için `playbackRate`'i ref'e sar.

#### 6. `ActiveVideoOverlay`'e Prop Drilling
```typescript
// Satır 1284-1317
<ActiveVideoOverlay
    data={{
        video: activeVideo,
        currentUserId,
        activeIndex,
        isPlayable: isActivePlayable,
    }}
    playback={{
        isFinished: isVideoFinished,
        hasError: hasVideoError,
        retryCount,
        isCleanScreen,
        isSeeking,
        tapIndicator,
        rateLabel,
    }}
    timeline={{
        currentTimeSV,
        durationSV,
        isScrollingSV,
        scrollY,
    }}
    actions={{
        onToggleLike: handleToggleLike,
        onToggleSave: handleToggleSave,
        onToggleShare: handleToggleShare,
        onToggleFollow: handleToggleFollow,
        onOpenShopping: handleOpenShopping,
        onOpenDescription: handleOpenDescription,
        playbackController,
        onActionPressIn: handleActionPressIn,
        onActionPressOut: handleActionPressOut,
    }}
/>
```
**Risk:** ORTA  
**Sorun:** Gruplandırılmış nesneler aracılığıyla tek bileşene 20+ prop geçiliyor.  
**Öneri:** Derinlemesine paylaşılan state için context provider düşün VEYA gruplandırma mantıklı olduğu için olduğu gibi bırak.

---

## VideoPlayerPool.tsx Derin Denetimi

### Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────────────────┐
│                      VideoPlayerPool                             │
├─────────────────────────────────────────────────────────────────┤
│  3 Slotlu Geri Dönüşüm Havuzu:                                  │
│  ├── Slot 0: Mevcut video (aktif oynatma)                       │
│  ├── Slot 1: Sonraki video (ön yüklenmiş)                       │
│  └── Slot 2: Önceki video (geri kaydırma için önbelleğe alınmış)│
├─────────────────────────────────────────────────────────────────┤
│  Alt bileşenler:                                                │
│  └── PlayerSlotRenderer (memo'lanmış, bireysel slotları yönetir)│
└─────────────────────────────────────────────────────────────────┘
```

### Tespit Edilen Sorunlar

#### 1. Karmaşık Slot Geri Dönüşüm Mantığı
```typescript
// Satır 419-661 (recycleSlots effect)
const recycleSlots = async () => {
    // ~240 satır slot yönetim mantığı
};
```
**Risk:** YÜKSEK (Karmaşıklık, hata değil)  
**Sorun:** Tek effect tüm geri dönüşüm mantığını yönetiyor. Test/debug zorluğu.  
**Öneri:** Ayrı yardımcı sınıf `SlotRecycler` olarak çıkar.

#### 2. Tekrarlanan `slotsEqual` Fonksiyon Tanımı
```typescript
// Satır 476-488 (effect içinde)
const slotsEqual = (a: PlayerSlot, b: PlayerSlot) =>
    a.index === b.index &&
    a.videoId === b.videoId &&
    // ...11 tane daha karşılaştırma
```
**Risk:** DÜŞÜK  
**Sorun:** Fonksiyon effect içinde tanımlanmış, her render'da yeniden oluşturuluyor.  
**Öneri:** Modül kapsamına taşı veya memoize et.

#### 3. Sihirli Sayılar
```typescript
// Satır 28
const MAX_RETRIES = 3;

// Satır 652
recycleTimeoutRef.current = setTimeout(() => {
    recycleSlots();
}, 100); // Sihirli 100ms gecikme
```
**Risk:** DÜŞÜK  
**Sorun:** Sihirli sayılar kodda dağınık.  
**Öneri:** Merkezi konfigürasyona taşı.

#### 4. Hata İşleme Callback Karmaşıklığı
```typescript
// Satır 683-745 (handleError)
const handleError = useCallback(async (slotIndex: number, slotVideoId: string, error: OnVideoErrorData) => {
    // 60+ satır hata işleme
});
```
**Risk:** ORTA  
**Sorun:** Önbellek fallback ile karmaşık yeniden deneme mantığı inline.  
**Öneri:** `VideoErrorHandler` yardımcı programı olarak çıkar.

---

## Sorumluluk Ayrımı Analizi

### Uygun Ayrımlar ✅

| Sorumluluk | Konum | Durum |
|------------|-------|-------|
| Video Rendering | `VideoPlayerPool` | ✅ İzole |
| UI Katmanları | `ActiveVideoOverlay` + alt bileşenler | ✅ Ayrıştırılmış |
| Gesture Yönetimi | `DoubleTapLike`, `SwipeWrapper` | ✅ İzole |
| Hikaye Görüntüleme | `StoryBar`, `StoryAvatar` | ✅ İzole |
| İskelet Yükleme | `FeedSkeleton` | ✅ İzole |

### Sorumluluk İhlalleri ⚠️

| Sorumluluk | Konum | Sorun |
|------------|-------|-------|
| Toast Animasyonu | `FeedManager` | Ayrı bileşen olmalı |
| Döngü Sayısı Mantığı | `FeedManager` | Domain/use case'de olmalı |
| Prefetch İndeksleri | `FeedManager` | Domain mantığı presentation'a sızıyor |

---

## Performans Analizi

### Mevcut Optimizasyonlar ✅

| Optimizasyon | Konum | Uygulama |
|--------------|-------|----------|
| FlashList | `FeedManager` | `estimatedItemSize`, `windowSize=3` |
| Video Havuz Geri Dönüşümü | `VideoPlayerPool` | 3 slotlu havuz deseni |
| Memo Bileşenler | Tüm projede | Tüm overlay bileşenlerinde `memo()` |
| Timeline için SharedValue | `FeedManager`, `VideoSeekBar` | 0ms gecikme UI senkronizasyonu |
| Donanım Hızlandırma | `PlayerSlotRenderer` | `shouldRasterizeIOS`, `renderToHardwareTextureAndroid` |
| Poster Görsel Fallback | `PlayerSlotRenderer` | Yükleme sırasında siyah ekranı önler |

### Performans Riskleri ⚠️

| Risk | Konum | Azaltma |
|------|-------|---------|
| Effect Yeniden Çalışmaları | `FeedManager` | Bazı callback'ler state değişiminde yeniden oluşturuluyor |
| Slot State Güncellemeleri | `VideoPlayerPool` | `recycleSlots`'ta `setSlots` birden fazla kez çağrılıyor |
| Animated Style Hesaplamaları | `PlayerSlotRenderer` | Her kaydırma frame'inde çalışıyor (Reanimated ile optimize) |

---

## Ölü/Kullanılmayan Kod Analizi

### Onaylanmış Ölü Kod

| Kod | Konum | Kanıt |
|-----|-------|-------|
| `DISABLE_FEED_UI_FOR_TEST` `false` olduğunda | Satır 88 | Debug bayrağı, çalışma zamanı etkisi yok |
| `DISABLE_NON_ACTIVE_UI` türetilmiş | Satır 89 | Yukarıdakiyle aynı |

### Potansiyel Kullanılmayan Bileşenler

| Bileşen | Şüphe Nedeni | Doğrulama Gerekli |
|---------|--------------|-------------------|
| `SpritePreview.tsx` | Sadece belirli senaryolarda kullanılıyor | Import kullanımını kontrol et |

---

## Yedekleme Politikası Durumu

**Şu anda silinmesi gereken dosya bulunmamaktadır.** Tespit edilen tüm sorunlar kaldırma değil, refaktör adaylarıdır.

---

## Önerilen Refaktör Öncelikleri

### Öncelik 1 - Yüksek Etki, Düşük Risk

1. `FeedManager`'dan `SaveToast` bileşenini çıkar
2. Sihirli sayıları konfigürasyon sabitine taşı
3. Debug bayraklarını kaldır veya ortam konfigürasyonuna taşı

### Öncelik 2 - Orta Etki, Orta Risk

1. `VideoPlayerPool`'dan `SlotRecycler` sınıfını çıkar
2. `slotsEqual` fonksiyonunu modül kapsamına taşı
3. `VideoErrorHandler` yardımcı programını çıkar

### Öncelik 3 - Düşük Etki, Yüksek Risk

1. Döngü sayısı mantığını domain katmanı use case'ine refaktör et
2. Derinlemesine paylaşılan overlay state için context provider düşün
3. Ref'lerle effect bağımlılıklarını optimize et

---

## FeedManager Modüler Bölme Planı

> **Referans:** [38 - Feed Manager Refactoring.md](./38%20-%20Feed%20Manager%20Refactoring.md)  
> **Durum:** ONAYLANDI - Uygulamaya Hazır

### Hedef Mimari

Onaylanan plan FeedManager'ı (1524 satır) 5 odaklı modüle böler:

```
src/presentation/components/feed/
├── FeedManager.tsx            (~300 satır) ← Sadece orkestrasyon
├── hooks/
│   ├── useFeedConfig.ts       (~50 satır)  ← Flagler + Sabitler
│   ├── useFeedScroll.ts       (~150 satır) ← Scroll + Görünürlük
│   ├── useFeedInteractions.ts (~200 satır) ← Gesture'lar
│   └── useFeedActions.ts      (~150 satır) ← Aksiyonlar + Toast
├── FeedOverlays.tsx           (~200 satır) ← UI Katmanları
├── VideoPlayerPool.tsx        (mevcut)
└── ...
```

### Modül Dağılımı

| Modül | Satır | Sorumluluk | Flag |
|-------|-------|------------|------|
| `useFeedConfig.ts` | ~50 | Sabitler (ITEM_HEIGHT, SCREEN_WIDTH), flagler, VIEWABILITY_CONFIG | `DISABLE_ALL` |
| `useFeedScroll.ts` | ~150 | `scrollHandler`, `onViewableItemsChanged`, prefetch indeksleri | `DISABLE_SCROLL_HANDLING` |
| `useFeedInteractions.ts` | ~200 | `handleSingleTap`, `handleDoubleTapLike`, `handleLongPress`, carousel gesture'ları | `DISABLE_INTERACTIONS` |
| `useFeedActions.ts` | ~150 | Beğeni, kaydetme, paylaşma, silme, arama, yeniden deneme, toast bildirimleri | `DISABLE_ACTIONS` |
| `FeedOverlays.tsx` | ~200 | HeaderOverlay, StoryBar, BottomSheet'ler, DeleteModal | `DISABLE_OVERLAYS` |

### Yeni Flag Sistemi

```typescript
// useFeedConfig.ts
export const FEED_FLAGS = {
  DISABLE_ALL: false,               // Global ana anahtar
  DISABLE_SCROLL_HANDLING: false,
  DISABLE_INTERACTIONS: false,
  DISABLE_ACTIONS: false,
  DISABLE_OVERLAYS: false,
} as const;

export const isDisabled = (flag: keyof typeof FEED_FLAGS): boolean => {
  return FEED_FLAGS.DISABLE_ALL || FEED_FLAGS[flag];
};
```

### Uygulama Fazları

| Faz | Görev | Risk | Bağımlılıklar |
|-----|-------|------|---------------|
| Faz 1 | `useFeedConfig.ts` oluştur | ✅ DÜŞÜK | Yok |
| Faz 2 | `useFeedScroll.ts` oluştur | ⚡ ORTA | Faz 1 |
| Faz 3 | `useFeedInteractions.ts` oluştur | ⚡ ORTA | Faz 1, 2 |
| Faz 4 | `useFeedActions.ts` oluştur | ⚡ ORTA | Faz 1 |
| Faz 5 | `FeedOverlays.tsx` oluştur | ⚡ ORTA | Faz 1, 4 |
| Faz 6 | `FeedManager.tsx` refaktör et | ⚠️ YÜKSEK | Faz 1-5 |
| Faz 7 | Entegrasyon testi | ⚡ ORTA | Faz 6 |

### Risk Azaltma

> [!CAUTION]
> **Döngüsel Import:** Hook'ların döngüsel bağımlılıkları olmamalı. Gerekirse bağımlılık enjeksiyonu deseni kullanın.

> [!IMPORTANT]
> **TypeScript:** Tip güvenliğini doğrulamak için her fazdan sonra `npx tsc --noEmit` çalıştırın.

> [!NOTE]
> **Davranış Koruma:** Refaktör sırasında işlevsel değişiklik yok. Sadece kod organizasyonu.

---

## Sonuç

Feed bileşen katmanı, video rendering ve UI katmanları arasında uygun ayrımla **sağlam mimari temeller** sergilemektedir. Çift katmanlı mimari (`VideoPlayerPool` + `FlashList`) TikTok tarzı feed'ler için kanıtlanmış bir desendir.

**Temel Güçlü Yönler:**
- Performans optimizasyonları kapsamlı
- Bileşen memoization tutarlı
- Z-index katmanlaması iyi belgelenmiş
- Retry mantıklı hata işleme sağlam

**İyileştirme Alanları:**
- Debug bayrakları kaldırılmalı veya dışsallaştırılmalı
- Büyük effect'lerdeki karmaşık mantık çıkarılmalı
- Bazı sorumluluk ihlalleri var ama yönetilebilir

**Genel Refaktör Hazırlığı: 7/10**

Kod tabanı artımlı refaktör için hazır ancak doğru çalışması için acil büyük değişiklikler gerektirmemektedir.
