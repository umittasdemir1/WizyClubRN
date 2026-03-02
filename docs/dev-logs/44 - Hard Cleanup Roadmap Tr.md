# HARD CLEANUP + REFACTOR YOL HARİTASI (WizyClubRN)

## Yönetici Özeti
- Repo birden fazla çalışma alanı (mobile, backend, tools) ve geniş bir tarihsel doküman/script arşivi içeriyor; temizlik önce kullanılmayan kodların ve takip edilen artefaktların silinmesine, ardından sahiplik sınırlarının konsolide edilmesine odaklanmalı.
- Birçok modül açıkça kullanılmıyor (hooks, store, feed UI bileşenleri, discovery bileşenleri) ve referans kontrolünden sonra düşük riskle kaldırılabilir.
- Video/feed yaşam döngüsü mantığı birden çok katmana dağılmış durumda; bir sonraki refactor oynatma, cache ve prefetch sahipliğini net API’lerle tek merkezde toplamalı.
- Backend tarafında büyük ve monolitik bir `server.js` ile çok sayıda tek seferlik script ve SQL dosyası var; operasyonel riski azaltmak için organize edilmeli ve yinelenenler birleştirilmeli.

## Temizlik İlkeleri ve Koruyucu Kurallar
- Bir dosyanın sıfır referansı ve tanımlı bir doğrulama adımı varsa, korumak yerine silmeyi tercih et.
- Her alan için tek bir doğruluk kaynağı tut (tema, feed yaşam döngüsü, cache/prefetch, scriptler).
- Silme veya refactor öncesinde her zaman bir baseline yakala (build, smoke test, performans kontrol noktaları).
- Doğrulama yolu ve geri dönüş planı olmadan hiçbir şeyi kaldırma.

## Envanter: Mevcutlar (Üst Düzey Harita)
- Root: `backend/`, `mobile/`, `r2-mcp/`, `docs/archive/` altında arşiv dokümanları, tool binary’leri (`ngrok`, `ngrok-v3-stable-linux-amd64.tgz.1`) ve çok sayıda feed denetim/refactor dokümanı.
- Backend: `server.js` monoliti, `services/HlsService.js`, `docs/openapi.yaml`, repo kökünde çok sayıda tek seferlik script ve SQL dosyası, ayrıca `backend/temp_uploads/` altında izlenen runtime artefaktları.
- Mobile app: `mobile/app/` altında route ekranları, mimari `core/`, `data/`, `domain/`, `presentation/` olarak ayrılmış ve büyük bir feed/video alt sistemi var.
- Tools: `r2-mcp/` paketi, DB/R2 kontrolleri için `backend/scripts/` CLI, `.idx/` tool config klasörü.
- Assets: `mobile/assets/` altında lokal ikon/görseller ve repo-hosted asset’lere bazı remote referanslar.

## Silme Listesi (Güvenli Kaldırmalar)
- `mobile/src/presentation/hooks/useVideoPlayback.ts` ve `mobile/src/presentation/hooks/useVideoSource.ts` (VideoLayer kaldırıldıktan sonra referans yok).
- `mobile/src/presentation/hooks/index.ts` (barrel import edilmiyor).
- `mobile/src/presentation/hooks/useDraftCleanup.ts` (referans yok).
- `mobile/src/presentation/store/useNotificationStore.ts` (referans yok).
- `mobile/src/presentation/components/feed/FeedItemOverlay.tsx` (referans yok).
- `mobile/src/presentation/components/feed/VideoOverlays.tsx` (referans yok).
- `mobile/src/presentation/components/feed/BrightnessController.tsx` (referans yok).
- `mobile/src/presentation/components/feed/SideOptionsSheet.tsx` (referans yok).
- `mobile/src/presentation/components/feed/index.ts` (barrel import edilmiyor).
- `mobile/src/presentation/components/shared/CustomRefreshScrollView.tsx` (referans yok).
- `mobile/src/presentation/components/shared/LoadingIndicator.tsx` (referans yok).
- `mobile/src/presentation/components/shared/RectangularStoryRing.tsx` (referans yok).
- `backend/temp_uploads/*` içindeki takip edilen runtime artefaktları (version’lanmamalı).
- Takip edilen arşiv `ngrok-v3-stable-linux-amd64.tgz.1` (gerektiğinde indirilebilir).

## Silme Listesi (Doğrulama Gerektirir)
- `mobile/src/presentation/components/discovery/*` (klasör dışında import bulunmuyor; dinamik ya da geleceğe dönük kullanım doğrulanmalı).
- Deals domain yığını: `mobile/src/domain/usecases/GetDealsUseCase.ts`, `mobile/src/domain/repositories/IDealRepository.ts`, `mobile/src/data/repositories/DealRepositoryImpl.ts`, `mobile/src/data/datasources/MockDealDataSource.ts`.
- User profile domain yığını: `mobile/src/domain/usecases/GetUserProfileUseCase.ts`, `mobile/src/domain/repositories/IUserRepository.ts`, `mobile/src/data/repositories/UserRepositoryImpl.ts`.
- Tooling ve arşivler: `r2-mcp/`, `backend/scripts/`, `.idx/` ve tüm `docs/archive/` doküman arşivi.

## Konsolidasyon Planı (Birleştirilecek Kopyalar)
- Tema sahipliği: `mobile/src/presentation/contexts/ThemeContext.tsx` vs `mobile/src/presentation/store/useThemeStore.ts` (tekini seç ve tüketimi birleştir).
- Feed overlay’leri ve UI state’i: `ActiveVideoOverlay`, `MetadataLayer` ve ilişkili bileşenler arasındaki çakışan overlay mantığını azalt.
- Cache/prefetch sahipliği: `FeedPrefetchService` ile `TrendingCarousel` içindeki ad-hoc cache kullanımını hizala.
- Script dağınıklığı: backend root scriptleri ve bakım görevlerini tek bir `backend/scripts/` CLI altında topla; giriş/çıkışları standardize et.
- Doküman dağınıklığı: `LOGGING_GUIDE.md` ve `LOGLAMA_KILAVUZU.md` birleştir; eski notları `docs/archive/` altına ve bir index ile taşı.

## Props ve Public API Yüzeyi Azaltma
- `mobile/src/presentation/components/feed/FeedManager.tsx` çok fazla prop alıp callback geçiriyor; prop yüzeyini azaltmak için ortak aksiyonları hook veya store’a taşı.
- `FeedManager.tsx` içindeki `ScrollPlaceholder` `topInset` alıyor ama kullanmıyor; kullanılmayan props’u kaldır ve memo kıyaslarını sıkılaştır.
- `ActiveVideoOverlay` ve `UploadModal` geniş prop yüzeyi sunuyor; alan bazlı config objeleriyle gruplamayı tercih et.

## State/Store Hijyeni (Alanları Kaldır/Azalt)
- `mobile/src/presentation/store/useActiveVideoStore.ts` içindeki kullanılmayan alan ve helper’ları (`customFeed`, `preloadIndices`, `setPreloadIndices`, `useVideoPreloader`, `useShouldVideoPlay`) kullanım doğrulamasından sonra kaldır.
- `useNotificationStore.ts` ihtiyacını yeniden değerlendir (kullanılmıyor) veya gerçek bildirim state’ine bağla.
- Tema state’ini `ThemeContext` ve `useThemeStore` arasında çiftlemeyin.

## Effect/Listener/Subscription Temizliği
- `AppState` ve `Appearance` listener’larını tek bir yaşam döngüsü sahibinde topla; birden fazla mount olabilen modüllerde listener kullanmaktan kaçın.
- `FeedManager.tsx` ve `useVideoFeed.ts` içindeki timer’ları denetle; unmount veya dependency değişiminde hepsi temizleniyor olmalı.
- Prefetch/service loop’larının navigation veya feed değişiminden sonra devam etmediğini doğrula.

## Mimari Refactor Hedefleri (Alan Bazlı)
- Mobile feed: `FeedManager.tsx` bir god component ve scroll, overlay, interaction ve lifecycle sahipliği için modüllere bölünmeli.
- Video lifecycle: `VideoPlayerPool`, store state ve feed overlay’leri arasında sahiplik netleştirilmeli.
- Backend: `backend/server.js` route modülleri, servisler ve middleware olarak ayrılmalı; R2/HLS mantığı `services/` içine izole edilmeli.
- Tooling: bakım scriptleri repo root’tan çıkarılmalı, tutarlı dokümantasyon ve input’larla yapılandırılmalı.

## Video/Feed Özel Hijyeni (Cache/Preload/Prefetch/Lifecycle)
- Prefetch kararları için tek bir sahip tut (ör. `FeedManager` ve feature bileşenlerinde yarışan mantıktan kaçın).
- Pool tabanlı playback her yerde kullanıldığı için eski playback hook’larını kaldır.
- Carousel image-only davranışını normalize et ve active/paused state için tek yaşam döngüsü kontratı tut.

## Bağımlılık Hijyeni (Paketler, Importlar, Build Artefaktları)
- Backend: `aws-sdk` (v2) kullanılmıyor gibi; doğrulayıp kaldır.
- Mobile: kullanılmayan bağımlılıkları doğrula ve kaldır: `react-native-vision-camera`, `react-native-compressor`, `react-native-controlled-mentions`, `react-native-qrcode-svg`, `react-native-color-matrix-image-filters`, `react-native-mmkv`, `react-native-keyboard-controller`, `react-native-worklets`, `react-native-worklets-core`, `@qeepsake/react-native-images-collage`, `@react-native-google-signin/google-signin`, `expo-audio`, `expo-contacts`, `expo-location`, `expo-clipboard`, `expo-local-authentication`, `expo-background-fetch`, `expo-task-manager`, `expo-secure-store`, `expo-sharing`, `expo-tracking-transparency`, `expo-device`.
- Artefaktlar: takip edilen binary ve runtime çıktıları kaldır (`ngrok-v3-stable-linux-amd64.tgz.1`, `backend/temp_uploads/*`) ve eksik ignore kurallarını ekle.

## Risk Kaydı (Neler Bozulabilir + Önlemler)
- Legacy hook/overlay kaldırımı sonrası feed playback regresyonları. Önlem: feed smoke testleri ve playback lifecycle doğrulaması.
- `ThemeContext` ve `useThemeStore` konsolidasyonu sonrası tema regresyonları. Önlem: tablar arası UI snapshot kontrolleri.
- Backend operasyon scriptlerinin yerine koymadan kaldırılması. Önlem: dokümante edilmiş bir CLI’a taşı ve doğrulanana kadar bir backup tag tut.
- Takip edilen artefaktları ignore güncellemeden silmek yeniden gürültüye yol açabilir. Önlem: .gitignore güncelle ve `git status` kontrolü yap.
- Kullanılmayan bağımlılıkları kaldırmak dinamik import veya native config’i bozabilir. Önlem: Android/iOS build al ve kritik akışları çalıştır.

## Test/Doğrulama Planı (Her Faz Sonrası Neyi Doğrulayacağız)
- Build/install: `mobile` (Expo start, Android build), `backend` (node server.js).
- Feed/video smoke: feed açılışı, ilk video yüklenmesi, hızlı scroll, arka plan/ön plan, mute/unmute, carousel görsel swipe.
- Performans kontrol noktaları: app start -> first frame, first video ready, pool aktifken scroll geçişleri.
- Regresyon kontrolleri: upload akışı, profil ekranı, notifications ekranı, explore/deals ekranları.

## Yol Haritası (Fazlı Plan ve Sıralama)
### Faz 0 — Güvenlik ve Baseline (Karmaşıklık: S)
- Ön Koşullar/Engeller: yok.
- Durma koşulu: baseline build/run adımları dokümante edildi ve smoke testler tanımlandı.

### Faz 1 — Güvenli Silmeler + Bariz Ölü Kod (Karmaşıklık: M)
- Ön Koşullar/Engeller: Faz 0 tamamlandı.
- Durma koşulu: kullanılmayan dosyalar kaldırıldı, takip edilen artefaktlar temizlendi ve `tsc` geçti.

### Faz 2 — Konsolidasyon + Yüzey Alanı Azaltma (Karmaşıklık: M)
- Ön Koşullar/Engeller: Faz 1 tamamlandı, testler geçiyor.
- Durma koşulu: yinelenen sahipler kaldırıldı ve docs/scripts konsolide edildi.

### Faz 3 — Yapısal Refactorlar (Sahiplik Sınırları) (Karmaşıklık: L)
- Ön Koşullar/Engeller: Faz 2 tamamlandı, baseline metrikleri yakalandı.
- Durma koşulu: büyük god component’ler bölündü ve sahiplik sınırları dokümante edildi.

### Faz 4 — Hardening (Risk + Regresyon Kontrolü) (Karmaşıklık: M)
- Ön Koşullar/Engeller: Faz 3 tamamlandı, büyük regresyonlar çözüldü.
- Durma koşulu: doğrulama paketi feed/video ve kritik kullanıcı akışlarını stabil performansla kapsıyor.

## TODO Kontrol Listesi (Eksiksiz, Dosya Referanslı)
### Faz 0 — Güvenlik ve Baseline
- [DOC] `BACKEND_SETUP_GUIDE.md`, `mobile/` run docs: Backend ve mobile için baseline run/build komutlarını dokümante et. Neden: temizlik tekrar edilebilir run’lara dayanmalı. Risk: low. Doğrulama: dokümante adımları temiz bir makinede çalıştır. Bağımlılıklar: none.
- [TEST] `mobile/src/presentation/components/feed/FeedManager.tsx`, `VideoPlayerPool.tsx`: Minimal feed/video smoke checklist tanımla (first play, fast scroll, mute/unmute, carousel image swipe). Neden: sessiz regresyonları engeller. Risk: low. Doğrulama: manuel çalıştır + beklenen davranış ekran kaydı. Bağımlılıklar: none.
- [VERIFY] `mobile/src/core/services/PerformanceLogger.ts`, `mobile/app/_layout.tsx`: Baseline performans kontrol noktalarını kaydet (startup, first video ready). Neden: perf regresyonu olmadan refactor risklidir. Risk: medium. Doğrulama: log kayıtları alınıp bir dokümana işlenir. Bağımlılıklar: none.

### Faz 1 — Güvenli Silmeler + Bariz Ölü Kod
- [DELETE] `backend/temp_uploads/*`: Takip edilen runtime artefaktlarını kaldır ve temp uploads için ignore kuralı ekle. Neden: runtime çıktısını version’lamak gürültü ve güvenlik riski. Risk: low. Doğrulama: `git status` temiz, server runtime’da temp dosya oluşturuyor. Bağımlılıklar: root `.gitignore` güncellemesi veya `backend/.gitignore` ekleme.
- [DELETE] `ngrok-v3-stable-linux-amd64.tgz.1`: Takip edilen arşivi kaldır ve gerekirse `*.tgz.*` ignore kuralı ekle. Neden: binary’ler repo’da yaşamamalı; doküman zaten indirme tarif ediyor. Risk: low. Doğrulama: `git ls-files` içinde ngrok arşivi yok. Bağımlılıklar: `.gitignore` güncellemesi.
- [DELETE] `mobile/src/presentation/hooks/useVideoPlayback.ts`, `mobile/src/presentation/hooks/useVideoSource.ts`: Kullanılmayan legacy playback hook’larını kaldır. Neden: pool tabanlı playback bunların yerini aldı; kalmaları kafa karıştırır. Risk: low. Doğrulama: `rg -n "useVideoPlayback|useVideoSource"` hiç sonuç vermez; `npx tsc --noEmit` geçer. Bağımlılıklar: VideoLayer kaldırımı tamamlanmış olmalı.
- [DELETE] `mobile/src/presentation/hooks/index.ts`: Kullanılmayan hooks barrel’ını kaldır. Neden: import yok; kalması ölü exportları gizler. Risk: low. Doğrulama: `rg -n "presentation/hooks"` hiç sonuç vermez. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/hooks/useDraftCleanup.ts`: Kullanılmayan hook’u kaldır. Neden: kullanılmayan mantık bakım yüzeyi oluşturur. Risk: low. Doğrulama: `rg -n "useDraftCleanup"` hiç sonuç vermez; `tsc` geçer. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/store/useNotificationStore.ts`: Kullanılmayan store’u kaldır. Neden: ölü state container uzun vadeli borçtur. Risk: low. Doğrulama: `rg -n "useNotificationStore"` hiç sonuç vermez; `tsc` geçer. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/components/feed/FeedItemOverlay.tsx`: Kullanılmayan overlay bileşenini kaldır. Neden: referans yok; legacy UI’yi temizler. Risk: low. Doğrulama: `rg -n "FeedItemOverlay"` hiç sonuç vermez; `tsc` geçer. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/components/feed/VideoOverlays.tsx`: Kullanılmayan overlay bileşenini kaldır. Neden: VideoLayer kaldırıldıktan sonra referans yok. Risk: low. Doğrulama: `rg -n "VideoOverlays"` hiç sonuç vermez; `tsc` geçer. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/components/feed/BrightnessController.tsx`: Kullanılmayan controller’ı kaldır. Neden: referans yok; parlaklık başka yerde ele alınıyor. Risk: low. Doğrulama: `rg -n "BrightnessController"` hiç sonuç vermez. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/components/feed/SideOptionsSheet.tsx`: Kullanılmayan sheet’i kaldır. Neden: referans yok; UI yüzeyini azaltır. Risk: low. Doğrulama: `rg -n "SideOptionsSheet"` hiç sonuç vermez. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/components/feed/index.ts`: Kullanılmayan feed barrel’ını kaldır. Neden: direkt import kullanılıyor; barrel ölü giriş noktasıdır. Risk: low. Doğrulama: `rg -n "components/feed"` barrel importu göstermez. Bağımlılıklar: none.
- [DELETE] `mobile/src/presentation/components/shared/CustomRefreshScrollView.tsx`, `LoadingIndicator.tsx`, `RectangularStoryRing.tsx`: Kullanılmayan shared bileşenleri kaldır. Neden: referans yok. Risk: low. Doğrulama: `rg -n "CustomRefreshScrollView|LoadingIndicator|RectangularStoryRing"` hiç sonuç vermez. Bağımlılıklar: none.
- [SIMPLIFY] `mobile/src/presentation/store/useActiveVideoStore.ts`: Kullanılmayan alan ve helper’ları kaldır (`customFeed`, `preloadIndices`, `setPreloadIndices`, `useVideoPreloader`, `useShouldVideoPlay`). Neden: store yüzeyini azaltır ve stale logic’i önler. Risk: low. Doğrulama: `rg -n "customFeed|preloadIndices|useVideoPreloader|useShouldVideoPlay"` sadece kaldırılan kodda görünür; `tsc` geçer. Bağımlılıklar: none.
- [SIMPLIFY] `mobile/src/presentation/components/feed/FeedManager.tsx`: `ScrollPlaceholder` içindeki kullanılmayan `topInset` prop’unu kaldır. Neden: kullanılmayan props kafa karıştırır ve churn yaratır. Risk: low. Doğrulama: TypeScript ve runtime render değişmez. Bağımlılıklar: none.

### Faz 2 — Konsolidasyon + Yüzey Alanı Azaltma
- [REFACTOR] `mobile/src/presentation/contexts/ThemeContext.tsx`, `mobile/src/presentation/store/useThemeStore.ts`, tüm tüketiciler: Tema sahipliğini tek provider/store’da birleştir. Neden: çift sahiplik drift ve bug riski taşır. Risk: medium. Doğrulama: tema değişimi ve dark/light UI tablar arasında tutarlı. Bağımlılıklar: Faz 1 tamamlandı.
- [REFACTOR] `mobile/src/presentation/components/feed/ActiveVideoOverlay.tsx`, `MetadataLayer.tsx`, `ActionButtons.tsx`: Prop yüzeyini aksiyon/state’i tek hook veya context altında gruplandırarak azalt. Neden: aşırı prop coupling ve regresyon riskini artırır. Risk: medium. Doğrulama: overlay aksiyonları çalışır ve UI doğru güncellenir. Bağımlılıklar: Faz 1 tamamlandı.
- [REFACTOR] `mobile/src/presentation/components/explore/TrendingCarousel.tsx`, `mobile/src/data/services/FeedPrefetchService.ts`: Cache/prefetch sahipliğini tek serviste konsolide et. Neden: duplikasyon tutarsız UX üretir. Risk: medium. Doğrulama: prefetch davranışı feed ile aynı ve cache hit’ler korunur. Bağımlılıklar: Faz 1 tamamlandı.
- [DOC] `LOGGING_GUIDE.md`, `LOGLAMA_KILAVUZU.md`: Tek bir kanonik logging dokümanı yap ve çevirileri tek yerde tut. Neden: yinelenen dokümanlar zamanla drift olur. Risk: low. Doğrulama: yeni doküman README veya root index’ten referanslanır. Bağımlılıklar: Faz 1 tamamlandı.
- [DOC] `docs/archive/`: Arşiv dokümanlarını `docs/archive/` altına taşı ve index dosyası ekle. Neden: büyük doküman arşivi repo root’unu kirletir. Risk: low. Doğrulama: dokümanlar index üzerinden erişilebilir. Bağımlılıklar: Faz 1 tamamlandı.
- [SIMPLIFY] `backend/` root scriptleri ve bakım görevleri (eski `maintenance_scripts/`): `backend/scripts/` altında tek bir CLI girişiyle konsolide et. Neden: scriptler dağınık ve keşfi zor. Risk: medium. Doğrulama: kritik bakım işleri çalışır. Bağımlılıklar: Faz 1 tamamlandı.
- [SIMPLIFY] `backend/*.sql`: Migration’ları `backend/migrations/` altına tutarlı isimlendirme ve README ile taşı. Neden: root seviyesinde SQL dağınıklığı yönetimi zorlaştırır. Risk: medium. Doğrulama: migration talimatları güncel ve yollar doğru. Bağımlılıklar: Faz 1 tamamlandı.

### Faz 3 — Yapısal Refactorlar (Sahiplik Sınırları)
- [REFACTOR] `mobile/src/presentation/components/feed/FeedManager.tsx`: Modüllere böl (scroll, overlay, interactions, prefetch) ve sahiplik sınırlarını netleştir. Neden: mevcut boyut bug’ları gizliyor ve iterasyonu tıkıyor. Risk: high. Doğrulama: tam feed smoke test geçer; scroll regresyonu yok. Bağımlılıklar: Faz 2 tamamlandı.
- [REFACTOR] `mobile/src/presentation/components/feed/VideoPlayerPool.tsx` + store: Playback ve state senkronu için tek lifecycle owner oluştur. Neden: çoklu doğruluk kaynağı desync riski taşır. Risk: high. Doğrulama: hızlı scroll’da audio leak veya yanlış video yok. Bağımlılıklar: Faz 2 tamamlandı.
- [REFACTOR] `backend/server.js`: Route modülleri, middleware ve servisler olarak böl. Neden: tek dosyalı backend test ve denetim açısından zayıf. Risk: high. Doğrulama: API endpoint’leri ve HLS pipeline çalışır. Bağımlılıklar: Faz 2 tamamlandı.
- [REFACTOR] `backend/services/HlsService.js` ve R2 scriptleri: R2 operasyonlarını tek modülde merkezileştir; scriptler ve server kullansın. Neden: duplikasyon veri bütünlüğü riski artırır. Risk: medium. Doğrulama: HLS upload ve cleanup scriptleri çalışır. Bağımlılıklar: Faz 2 tamamlandı.

### Faz 4 — Hardening (Risk + Regresyon Kontrolü)
- [TEST] `mobile/` feed ve video akışları: Tekrarlanabilir smoke test script’i ekle (manuel ya da otomatik) ve CI’ye dahil et. Neden: doğrulama olmadan refactor risklidir. Risk: medium. Doğrulama: test paketi CI veya local’de tutarlı çalışır. Bağımlılıklar: Faz 3 tamamlandı.
- [TEST] `backend/`: Upload endpoint’leri ve HLS pipeline için temel entegrasyon kontrolleri ekle. Neden: backend modül temizliği video pipeline’ı bozabilir. Risk: medium. Doğrulama: upload ve HLS endpoint’leri başarılı olur. Bağımlılıklar: Faz 3 tamamlandı.
- [DEPENDENCY] `backend/package.json`: Doğrulama sonrası kullanılmayan `aws-sdk` (v2) kaldır. Neden: dependency yüzeyini ve audit yükünü azaltır. Risk: low. Doğrulama: `rg -n "aws-sdk"` kullanım göstermiyor; server çalışır. Bağımlılıklar: Faz 1 tamamlandı.
- [DEPENDENCY] `mobile/package.json`: Kullanılmayan bağımlılıkları (Dependency Hygiene listesi) `depcheck` ve import taramasından sonra kaldır. Neden: build boyutunu ve native config riskini azaltır. Risk: medium. Doğrulama: `npx expo-doctor`, `npx tsc --noEmit` ve app boot. Bağımlılıklar: Faz 1 tamamlandı.
- [VERIFY] `mobile/src/presentation/store/useThemeStore.ts`: `Appearance.addChangeListener` kullanımını kontrollü bir yaşam döngüsüne taşı ve cleanup ekle. Neden: kontrolsüz listener leak oluşturabilir. Risk: low. Doğrulama: tema değişimleri hâlâ çalışır. Bağımlılıklar: Faz 2 tamamlandı.
