# WizyClub Doğrudan Paket Envanteri

Bu belge, repodaki üç ayrı çalışma alanının doğrudan bağımlılıklarını eksiksiz listeler:

- `/backend/package.json`
- `/mobile/package.json`
- `/r2-mcp/package.json`

Bu sürüm manifest-first hazırlanmıştır. Yani kaynak doğruluğu için `package.json` dosyaları esas alınır; transitif (alt) bağımlılıklar bu rapora dahil edilmez. Önceki sürümdeki gibi agresif "kullanılmıyor" etiketleri yerine daha güvenli bir envanter yaklaşımı kullanılır.

## Durum Notları

- `Aktif`: Kodda veya config tarafında açıkça kullanılan paketler.
- `Config/Native`: Genelde Expo plugin, native bağlama veya runtime altyapısı üzerinden çalışan paketler.
- `Kurulu`: Doğrudan bağımlılık olarak kurulu; bu rapor, ayrıca her paketin tek tek import izini zorlamaz.

## Backend (`/backend/package.json`)

### Runtime Dependencies

- `@aws-sdk/client-s3` — `Aktif` — S3/R2 nesne depolama erişimi.
- `@ffprobe-installer/ffprobe` — `Aktif` — Video metadata okuma için ffprobe binary kurulumu.
- `@google-cloud/speech` — `Aktif` — Speech-to-Text entegrasyonu.
- `@smithy/util-base64` — `Kurulu` — Base64 yardımcıları; doğrudan declared dependency.
- `@supabase/supabase-js` — `Aktif` — Backend Supabase istemcisi.
- `axios` — `Aktif` — Harici HTTP istekleri.
- `cors` — `Aktif` — CORS middleware.
- `dotenv` — `Aktif` — Ortam değişkeni yükleme.
- `express` — `Aktif` — HTTP sunucu ve routing.
- `ffmpeg-static` — `Aktif` — FFmpeg binary.
- `fluent-ffmpeg` — `Aktif` — FFmpeg komut orkestrasyonu.
- `form-data` — `Aktif` — Multipart form oluşturma.
- `js-yaml` — `Aktif` — YAML ayrıştırma/yazma.
- `multer` — `Aktif` — Dosya upload middleware.
- `swagger-ui-express` — `Aktif` — Swagger UI sunumu.
- `uuid` — `Aktif` — Benzersiz kimlik üretimi.
- `ws` — `Kurulu` — WebSocket runtime desteği.

### Dev Dependencies

- `jest` — `Aktif` — Test çalıştırma.

## Mobile (`/mobile/package.json`)

### Yazı Tipleri

- `@expo-google-fonts/bebas-neue`, `@expo-google-fonts/dancing-script`, `@expo-google-fonts/inter`, `@expo-google-fonts/lato`, `@expo-google-fonts/lobster`, `@expo-google-fonts/montserrat`, `@expo-google-fonts/open-sans`, `@expo-google-fonts/oswald`, `@expo-google-fonts/pacifico`, `@expo-google-fonts/playfair-display`, `@expo-google-fonts/poppins`, `@expo-google-fonts/raleway`, `@expo-google-fonts/roboto`, `@expo-google-fonts/rubik`, `@expo-google-fonts/source-sans-pro`, `@expo-google-fonts/ubuntu` — `Aktif` — Uygulamadaki özel font aileleri.

### Uygulama Çekirdeği, Shell ve Navigation

- `expo` — `Aktif` — Expo SDK çekirdeği.
- `react` — `Aktif` — React runtime.
- `react-dom` — `Kurulu` — Web hedefi için DOM runtime.
- `react-native` — `Aktif` — React Native çekirdeği.
- `react-native-web` — `Kurulu` — Web uyumluluk katmanı.
- `expo-router` — `Aktif` — Dosya tabanlı routing.
- `expo-dev-client` — `Config/Native` — Custom dev client altyapısı.
- `expo-build-properties` — `Config/Native` — Native build ayarları.
- `expo-splash-screen` — `Aktif` — Splash screen kontrolü.
- `expo-status-bar` — `Aktif` — Status bar kontrolü.
- `react-native-edge-to-edge` — `Aktif` — Edge-to-edge ekran yerleşimi.
- `react-native-safe-area-context` — `Aktif` — Safe area yönetimi.
- `react-native-gesture-handler` — `Aktif` — Gesture altyapısı.
- `react-native-screens` — `Config/Native` — Native screen optimizasyonu.
- `react-native-pager-view` — `Aktif` — Sayfa tabanlı swipe görünümü.
- `react-native-worklets` — `Config/Native` — Worklet runtime desteği.

### Veri, Cache ve State

- `@tanstack/react-query` — `Aktif` — Server-state cache ve veri yönetimi.
- `zustand` — `Aktif` — Local state store.
- `@supabase/supabase-js` — `Aktif` — Mobil Supabase istemcisi.
- `@react-native-async-storage/async-storage` — `Aktif` — Kalıcı key-value storage.
- `react-native-mmkv` — `Kurulu` — Yüksek performanslı key-value storage.
- `expo-sqlite` — `Config/Native` — SQLite runtime.
- `lru-cache` — `Kurulu` — Bellek cache yapısı.
- `@react-native-community/netinfo` — `Aktif` — Ağ tipi ve bağlantı durumu.

### UI, Görsel Bileşenler ve Formlar

- `nativewind` — `Aktif` — Tailwind tabanlı RN stil katmanı.
- `tailwindcss` — `Aktif` — Nativewind için tasarım token / utility tabanı.
- `@expo/vector-icons` — `Aktif` — Expo ikon setleri.
- `lucide-react-native` — `Aktif` — Lucide ikonları.
- `@gorhom/bottom-sheet` — `Aktif` — Bottom sheet bileşeni.
- `@shopify/flash-list` — `Aktif` — Yüksek performanslı liste.
- `@shopify/react-native-skia` — `Kurulu` — Yüksek performanslı çizim/overlay altyapısı.
- `react-native-toast-message` — `Aktif` — Toast bildirimleri.
- `react-native-pell-rich-editor` — `Aktif` — Rich text editör.
- `react-native-gifted-charts` — `Kurulu` — Grafik bileşenleri.
- `react-native-chart-kit` — `Kurulu` — Grafik bileşenleri.
- `react-native-calendars` — `Kurulu` — Takvim bileşenleri.
- `@react-native-community/datetimepicker` — `Config/Native` — Native tarih/saat seçici altyapısı.
- `react-native-modal-datetime-picker` — `Kurulu` — Modal tarih/saat seçici sarmalayıcı.
- `react-native-reanimated-carousel` — `Kurulu` — Carousel bileşeni.
- `@react-native-masked-view/masked-view` — `Kurulu` — Masked view desteği.
- `react-native-svg` — `Aktif` — SVG çizimi.
- `expo-linear-gradient` — `Aktif` — Gradient render.
- `expo-blur` — `Kurulu` — Blur yüzeyleri.
- `lottie-react-native` — `Kurulu` — Lottie animasyonları.
- `rn-emoji-keyboard` — `Kurulu` — Emoji klavyesi.
- `@react-native-community/slider` — `Kurulu` — Native slider bileşeni.
- `react-hook-form` — `Kurulu` — Form state yönetimi.

### Animasyon

- `react-native-reanimated` — `Aktif` — Native-thread animasyon motoru.
- `moti` — `Aktif` — Reanimated tabanlı animasyon bileşenleri.

### Medya Oynatma, Kamera ve Düzenleme

- `expo-video` — `Aktif` — Expo video player / thumbnail hattı.
- `react-native-video` — `Aktif` — Ana video playback hattı.
- `expo-av` — `Kurulu` — Legacy audio/video API.
- `expo-image` — `Aktif` — Yüksek performanslı image bileşeni.
- `expo-image-picker` — `Aktif` — Galeri / medya seçici.
- `expo-image-manipulator` — `Kurulu` — Basit image düzenleme.
- `expo-camera` — `Aktif` — Kamera ve barcode erişimi.
- `react-native-vision-camera` — `Config/Native` — Gelişmiş kamera altyapısı.
- `react-native-compressor` — `Aktif` — Medya sıkıştırma ve thumbnail üretimi.
- `react-native-create-thumbnail` — `Kurulu` — Alternatif video thumbnail üretimi.
- `react-native-image-crop-picker` — `Kurulu` — Gelişmiş native media picker/crop.
- `react-native-video-trim` — `Kurulu` — Native video trim.
- `react-native-view-shot` — `Kurulu` — View capture/screenshot.

### Cihaz, Dosya Sistemi ve Sistem API'leri

- `expo-font` — `Aktif` — Runtime font yükleme.
- `expo-haptics` — `Aktif` — Dokunsal geribildirim.
- `expo-keep-awake` — `Aktif` — Ekranı uyanık tutma.
- `expo-linking` — `Aktif` — Deep link / URL handling.
- `expo-web-browser` — `Config/Native` — Sistem browser açma ve auth tabları.
- `expo-secure-store` — `Config/Native` — Şifreli anahtar-değer saklama.
- `expo-crypto` — `Kurulu` — Kriptografik yardımcılar.
- `expo-clipboard` — `Kurulu` — Clipboard erişimi.
- `expo-contacts` — `Kurulu` — Rehber erişimi.
- `expo-location` — `Aktif` — Konum erişimi.
- `expo-screen-orientation` — `Kurulu` — Ekran yönü kontrolü.
- `expo-media-library` — `Aktif` — Cihaz medya kütüphanesi erişimi.
- `expo-file-system` — `Aktif` — Dosya sistemi erişimi.
- `expo-navigation-bar` — `Aktif` — Android navigation bar kontrolü.
- `expo-constants` — `Kurulu` — Expo runtime constants.
- `expo-notifications` — `Aktif` — Bildirim altyapısı.
- `expo-task-manager` — `Kurulu` — Background task altyapısı.
- `expo-background-task` — `Config/Native` — Background task scheduling.
- `expo-tracking-transparency` — `Config/Native` — ATT izin akışı.
- `expo-sharing` — `Kurulu` — Sistem paylaşım sheet'i.
- `react-native-permissions` — `Kurulu` — Çoklu izin yönetimi.
- `react-native-device-info` — `Kurulu` — Cihaz metadata erişimi.
- `react-native-keyboard-controller` — `Kurulu` — Klavye animasyonu/koordinasyonu.
- `react-native-nitro-modules` — `Config/Native` — Nitro module runtime tabanı.
- `react-native-get-random-values` — `Aktif` — Kripto uyumlu random polyfill.

### Kimlik Doğrulama, Analitik, Harita ve Entegrasyonlar

- `expo-apple-authentication` — `Kurulu` — Apple Sign In.
- `expo-auth-session` — `Kurulu` — OAuth/web auth akışları.
- `expo-local-authentication` — `Kurulu` — Biyometrik doğrulama.
- `react-native-purchases` — `Aktif` — RevenueCat / IAP entegrasyonu.
- `react-native-webview` — `Aktif` — In-app web içerik gösterimi.
- `react-native-share` — `Kurulu` — Gelişmiş native paylaşım.
- `@segment/analytics-react-native` — `Kurulu` — Segment analitik istemcisi.
- `@segment/sovran-react-native` — `Kurulu` — Segment iç durum katmanı.
- `@storybook/react-native` — `Kurulu` — Bileşen sandbox ortamı.
- `react-native-maps` — `Aktif` — Harita render bileşeni.

### Dev Dependencies

- `@expo/ngrok` — `Kurulu` — Expo tunneling/ngrok desteği.
- `@types/react` — `Aktif` — React TypeScript tipleri.
- `autoprefixer` — `Kurulu` — Tailwind/PostCSS yardımcı aracı.
- `babel-plugin-module-resolver` — `Aktif` — Path alias çözümü.
- `babel-preset-expo` — `Aktif` — Expo Babel preset.
- `react-native-svg-transformer` — `Aktif` — SVG import transformer.
- `typescript` — `Aktif` — TypeScript derleyicisi.

## R2 MCP (`/r2-mcp/package.json`)

### Runtime Dependencies

- `@aws-sdk/client-s3` — `Kurulu` — S3/R2 erişimi.
- `@cloudflare/mcp-server-cloudflare` — `Kurulu` — Cloudflare MCP sunucu entegrasyonu.
- `@modelcontextprotocol/sdk` — `Kurulu` — MCP SDK.

## Açıkça Doğrulanan Aktif Kullanım Örnekleri

- `expo-notifications` — [mobile/app/_layout.tsx](/home/user/WizyClubRN/mobile/app/_layout.tsx), [mobile/app/notifications.tsx](/home/user/WizyClubRN/mobile/app/notifications.tsx)
- `@react-native-community/netinfo` — [mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx](/home/user/WizyClubRN/mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx), [mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx](/home/user/WizyClubRN/mobile/src/presentation/components/poolFeed/PoolFeedVideoPlayerPool.tsx)
- `react-native-gesture-handler` — [mobile/app/_layout.tsx](/home/user/WizyClubRN/mobile/app/_layout.tsx), [mobile/app/upload-composer.tsx](/home/user/WizyClubRN/mobile/app/upload-composer.tsx)
- `react-native-get-random-values` — [mobile/index.ts](/home/user/WizyClubRN/mobile/index.ts)
- `expo-location`, `react-native-maps` — [mobile/app/UploadDetails.tsx](/home/user/WizyClubRN/mobile/app/UploadDetails.tsx)
- `expo-build-properties`, `expo-tracking-transparency`, `expo-secure-store`, `expo-web-browser`, `react-native-compressor`, `react-native-vision-camera`, `expo-sqlite`, `expo-background-task`, `@react-native-community/datetimepicker` — [mobile/app.json](/home/user/WizyClubRN/mobile/app.json)

Bu rapor doğrudan bağımlılık envanteri olarak tutulmalıdır. Paket kaldırma veya temizlik kararları için ikinci adımda ayrı bir "gerçek kullanım / kaldırma adayı" analizi yapılması daha güvenlidir.
