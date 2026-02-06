# InfiniteFeed Scroll Jank & Siyah Ekran Teşhis Raporu

**Tarih:** 06.02.2026
**Bileşenler:** InfiniteFeedManager.tsx, InfiniteFeedCard.tsx, useInfiniteFeedConfig.ts

---

## Sorun 1: Scroll Takılması (Jank)

### Kök Neden 1 - `resolvedVideoSources` state objesi `renderItem` dependency'sinde
- **Dosya:** InfiniteFeedManager.tsx:448
- `renderItem` callback'i `resolvedVideoSources` objesine bağımlı
- Her video cache resolve olduğunda `setResolvedVideoSources` çağrılıyor (satır 281-404)
- Bu, `renderItem` callback'ini yeniden oluşturuyor ve FlashList **tüm görünür hücreleri** re-render ediyor
- Aktif video + 3 komşu video için cache resolve olduğunda, her biri yeni bir render döngüsü tetikliyor

### Kök Neden 2 - `isFeedScrolling` `flashListExtraData` içinde
- **Dosya:** InfiniteFeedManager.tsx:518
- `setIsFeedScrolling(true/false)` her scroll'da çalışıyor
- `extraData` değişince FlashList tüm görünür öğeleri re-render ediyor

### Kök Neden 3 - `INF_ACTIVE_COMMIT_ON_VIEWABLE: true` ile çoklu setState
- **Dosya:** InfiniteFeedManager.tsx:178-198, 473-475
- Her viewability değişiminde `commitPendingActive` çağrılıyor ve **4 ayrı setState** tetikleniyor:
  - `setActiveInlineId`, `setPendingInlineId`, `setPendingInlineIndex`, `setActiveInlineIndex`
- Hızlı scroll'da her kart geçişinde bu 4 state güncellemesi + renderItem yeniden oluşturma + FlashList re-render zinciri çalışıyor

### Kök Neden 4 - `shouldPauseForScroll` render path'te
- **Dosya:** InfiniteFeedManager.tsx:416, 432
- `immediateActiveCommit = true` olduğu için şu an etkisiz ama `isFeedScrolling` yine de extraData'da

---

## Sorun 2: Siyah Ekran (Hızlı 5-6 Post Scroll)

### Kök Neden 1 - Video mount penceresi çok dar
- **Dosya:** InfiniteFeedCard.tsx:165
- `shouldMountVideo = isVideo && (isActive || isPendingActive)` → sadece ±1 kart
- 5-6 post hızlı atladığında, hedef kartta video henüz mount edilmemiş

### Kök Neden 2 - Video visibility gating süresi
- **Dosya:** InfiniteFeedCard.tsx:27, 247-249
- `FIRST_FRAME_FALLBACK_MS = 1200` → Video 1.2 saniye boyunca gizli kalabilir
- Hızlı scroll sonrası thumbnail yüklü olsa bile video katmanı geç gösteriliyor

### Kök Neden 3 - `playbackSource` her unmount'ta sıfırlanıyor
- **Dosya:** InfiniteFeedCard.tsx:301-308
- Kart pending window'dan çıkınca source tamamen siliniyor
- Tekrar girince cache zinciri baştan çalışıyor → ek gecikme

### Kök Neden 4 - Prefetch'in yetişememesi
- `PREFETCH_AHEAD_COUNT: 3` ile sadece 3 video önceden cache'leniyor
- 5-6 post atlayınca hedef video cache'de olmayabilir

---

## Özet Tablo

| Sorun | Dosya:Satır | Etki |
|-------|-------------|------|
| `resolvedVideoSources` renderItem dep | Manager:448 | Her cache resolve'da tüm liste re-render |
| `isFeedScrolling` extraData'da | Manager:518 | Scroll başla/bitir'de tam re-render |
| 4x setState commitPendingActive | Manager:195-198 | Her viewability'de 4 render cycle |
| Video mount penceresi ±1 | Card:165 | Hızlı scroll'da hedef video mount değil |
| 1200ms visibility fallback | Card:247 | Yavaş videolarda uzun siyah ekran |
| playbackSource null reset | Card:307 | Tekrar mount'ta source'dan başlama |
| Prefetch sadece 3 ileri | Config:31 | 5+ post atlayınca cache miss |
