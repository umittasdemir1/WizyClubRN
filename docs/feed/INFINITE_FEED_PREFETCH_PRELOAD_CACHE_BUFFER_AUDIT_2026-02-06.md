# Infinite Feed Prefetch/Preload/Cache/Buffer Audit (February 6, 2026)

## Goal
Fast scroll sırasında görülen siyah boş ekranı azaltmak için infinite feed video pipeline'ını uçtan uca kontrol edip güçlendirmek.

## Findings

1. Prefetch orchestration eksikti
- `useVideoFeed` başlangıç prefetch yapıyordu ama infinite feed active index değiştikçe özel bir prefetch/cache orkestrasyonu yoktu.
- Sonuç: hızlı scroll'da aktif karta geçerken video kaynağı çoğunlukla soğuk başlıyordu.

2. Active source çözümleme eksikti
- Infinite card her zaman ham network URL ile başlıyordu.
- Disk/memory cache path varsa dahi aktif kartta kullanılmıyordu.

3. Buffer ayarları infinite card tarafında dinamik değildi
- Ağ tipine göre `bufferConfig` kararları pool feed kadar kontrollü uygulanmıyordu.

4. Thumbnail preload yalnızca sınırlıydı
- Komşu kart thumbnail prefetch'i active index değişiminde merkezi yapılmıyordu.

## Applied Changes

### A) Manager-level prefetch/cache orchestration
File: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`

- Ağ tipini prefetch servisine bağladım:
  - `setNetworkType(...)` (`:146`)
- Active index bazlı komşu video prefetch indeks hesaplaması ekledim:
  - `getPrefetchIndices(...)` (`:44`)
- Active video için cache warmup + cached path resolve hattı eklendi:
  - `warmupCache` (`:194`)
  - `getCachedPath` (`:202`)
- Komşu videolar için queue prefetch + warmup eklendi:
  - `queueVideos` (`:223`)
  - `warmupCache` (`:227`)
- Komşu thumbnail preload eklendi:
  - `THUMBNAIL_PREFETCH_OFFSETS` (`:42`)
  - thumbnail prefetch loop (`:212`)
- Card'a resolved source + networkType geçirildi:
  - `resolvedVideoSource` (`:261`)
  - `networkType` (`:262`)

### A.1) Emergency hardening for revisit-black-screen
File: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`

- Active video için zorunlu öncelik ve indirme eklendi:
  - `bumpPriority(...)` (`:194`)
  - `queueSingleVideo(...)` (`:195`)
  - `cacheVideoNow(...)` (`:209`)
- Amaç: kullanıcı geri geldiğinde video kaynağının cache'ten açılma olasılığını artırmak.

### B) Card-level source/buffer hardening
File: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`

- Ağ tipine ve local/network kaynağa göre buffer config bağlandı:
  - `getBufferConfig` (`:159`)
- Video source içine cache/buffer/retry eklendi:
  - `videoSource` (`:162`)
  - `cacheSizeMB: 64` (`:168`)
  - `minLoadRetryCount: 5` (`:170`)
- Player source olarak resolved source kullanıldı:
  - `source={videoSource}` (`:387`)
- Playback sırasında source swap kaynaklı render resetini azaltmak için source kilitleme eklendi:
  - `playbackSource` (`:104`)
  - `effectiveVideoSourceUrl` (`:132`)
- Android black flash azaltma ayarları korundu/güçlendirildi:
  - `hideShutterView` (`:404`)
  - `shutterColor="transparent"` (`:405`)
  - `useTextureView` (`:407`)
- Native player poster katmanı geri eklendi:
  - `poster` + `posterResizeMode` (`:376`, `:377`)
- Frame reveal mantığı korunarak thumbnail->video geçişte black gap azaltıldı.

## External Docs Checked
- React Native Video v6 Source + bufferConfig:
  - https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/props/#source
- React Native Video v6 hideShutterView:
  - https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/props/#hideshutterview
- React Native Video v6 viewType / rendering surface:
  - https://docs.thewidlarzgroup.com/react-native-video/docs/v6/component/props/#viewtype

## Verification
- TypeScript check passed:
  - `cd mobile && npx tsc --noEmit`

## Residual Runtime Checks (Required)
1. Android gerçek cihazda uzun hızlı scroll (20+ kart aşağı/yukarı).
2. Zayıf ağda (throttled) siyah ekran sıklığı ölçümü.
3. Cache kapalı durumda (`__WIZY_DISABLE_VIDEO_CACHE__`) davranış karşılaştırması.
