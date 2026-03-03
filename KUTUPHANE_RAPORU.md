# 📦 WizyClub Paket ve Kütüphane Kullanım Raporu

Bu belge, WizyClub uygulamasının **Backend (Sunucu)** ve **Mobile (Mobil Uygulama)** tarafında kullanılan tüm paket ve kütüphaneleri listeler. Kütüphanelerin ne işe yaradığı ve statik analiz sonuçlarına göre projede aktif olarak kullanılıp kullanılmadığı belirtilmiştir.

> **Not:** Mobil (React Native/Expo) ekosisteminde bazı paketlerin "Kullanılmıyor (JS)" olarak görünmesi, onların gereksiz olduğu anlamına gelmeyebilir. Expo ve React Native paketlerinin çoğu yerel (native) seviyede bağlanır, `app.json` veya `metro.config.js` içinde eklenti olarak kullanılır veya doğrudan JavaScript/TypeScript kodunda içe aktarılmasalar bile geliştirme aracı (dev client) için gerekli olabilirler.

---

## 🛠️ Backend (Sunucu) Bağımlılıkları (`/backend/package.json`)

| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **@aws-sdk/client-s3** | AWS S3 istemcisi, nesne depolama (Cloudflare R2 / AWS) işlemleri için kullanılır. | ✅ Aktif Kullanılıyor |
| **@ffprobe-installer/ffprobe** | FFprobe için çapraz platform kurulum aracı (video meta verilerini okumak için). | ✅ Aktif Kullanılıyor |
| **@google-cloud/speech** | Google Cloud Speech-to-Text API istemcisi (altyazı veya transkripsiyon oluşturmak için). | ✅ Aktif Kullanılıyor |
| **@smithy/util-base64** | Base64 kodlama ve çözme araçları. | ⚠️ **Kullanılmıyor** |
| **@supabase/supabase-js** | Supabase için resmi JS istemcisi (Kimlik Doğrulama, Veritabanı, Depolama). | ✅ Aktif Kullanılıyor |
| **axios** | Harici API istekleri yapmak için Promise tabanlı HTTP istemcisi. | ✅ Aktif Kullanılıyor |
| **cors** | Farklı alan adlarından gelen isteklere (CORS) izin veren Express ara yazılımı. | ✅ Aktif Kullanılıyor |
| **dotenv** | Çevresel değişkenleri `.env` dosyalarından `process.env` içerisine yükler. | ✅ Aktif Kullanılıyor |
| **express** | Node.js için hızlı ve minimal web sunucu ve yönlendirme (routing) çatısı. | ✅ Aktif Kullanılıyor |
| **ffmpeg-static** | FFmpeg statik ikili dosyaları (video işleme, kırpma vb. için). | ✅ Aktif Kullanılıyor |
| **fluent-ffmpeg** | FFmpeg video işleme komutlarını çalıştırmak için akıcı (fluent) bir API sunar. | ✅ Aktif Kullanılıyor |
| **form-data** | Çok parçalı (multipart/form-data) veri akışları oluşturmak için modül. | ✅ Aktif Kullanılıyor |
| **js-yaml** | YAML okuyucu ve yazıcı; genelde OpenAPI/Swagger konfigürasyonlarını ayrıştırmak için kullanılır. | ✅ Aktif Kullanılıyor |
| **multer** | Dosya yükleme işlemleri için `multipart/form-data` işleyen ara yazılım. | ✅ Aktif Kullanılıyor |
| **swagger-ui-express** | API dokümantasyonu için otomatik Swagger UI arayüzü sunar. | ✅ Aktif Kullanılıyor |
| **uuid** | Eşsiz tanımlayıcılar (RFC4122 v1, v4 vb. UUID'ler) oluşturur. | ✅ Aktif Kullanılıyor |
| **ws** | WebSocket istemci ve sunucu kütüphanesi. | ⚠️ **Kullanılmıyor** |
| **jest** *(Geliştirme)* | JavaScript test çerçevesi. | ✅ Aktif Kullanılıyor |

---

## 📱 Mobile (Mobil) Bağımlılıkları (`/mobile/package.json`)

### Çekirdek Çatı ve Yönlendirme (Routing)
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **expo** | Çekirdek Expo SDK'sı. | ✅ Aktif Kullanılıyor |
| **react** / **react-dom** | React çekirdek kütüphanesi ve DOM işleme (web için). | ✅ Aktif Kullanılıyor |
| **react-native** | Çapraz platform mobil uygulama geliştirmek için React Native çatısı. | ✅ Aktif Kullanılıyor |
| **react-native-web** | React Native kodunu web üzerinde çalıştırmak için uyumluluk katmanı. | ✅ Aktif Kullanılıyor |
| **expo-router** | React Native ve web için dosya tabanlı sayfa yönlendirme sistemi. | ✅ Aktif Kullanılıyor |

### Veri, Durum Yönetimi (State) ve Depolama
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **@tanstack/react-query** | Veri çekme, önbelleğe alma (caching) ve durum yönetimi. | ✅ Aktif Kullanılıyor |
| **zustand** | Basit, hızlı ve küçük boyutlu durum yönetimi aracı. | ✅ Aktif Kullanılıyor |
| **@supabase/supabase-js** | Mobil için Supabase istemcisi. | ✅ Aktif Kullanılıyor |
| **@react-native-async-storage/async-storage** | Kalıcı, şifresiz, asenkron anahtar-değer (key-value) depolama alanı. | ✅ Aktif Kullanılıyor |
| **react-native-mmkv** | Çok yüksek performanslı, senkron anahtar-değer depolama alanı. | ⚠️ **Kullanılmıyor (JS'de)** |
| **lru-cache** | En az son kullanılan (LRU) öğeleri silen önbellek yapısı. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-hook-form** | Yüksek performanslı ve esnek form yönetimi. | ⚠️ **Kullanılmıyor (JS'de)** |

### Kullanıcı Arayüzü (UI) Bileşenleri ve Stil
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **nativewind** / **tailwindcss** | React Native için Tailwind tabanlı fayda-öncelikli (utility-first) CSS çatısı. | ✅ Aktif Kullanılıyor |
| **lucide-react-native** | Lucide tabanlı modern ikon kütüphanesi. | ✅ Aktif Kullanılıyor |
| **@expo/vector-icons** | Expo için standart ikon seti. | ✅ Aktif Kullanılıyor |
| **@gorhom/bottom-sheet** | Gelişmiş, esnek alt sayfa (bottom sheet) bileşeni. | ✅ Aktif Kullanılıyor |
| **@shopify/flash-list** | Yüksek performanslı liste bileşeni (FlatList alternatifi). | ✅ Aktif Kullanılıyor |
| **react-native-pager-view** | Kaydırılabilir (swipeable) sayfa bileşeni. | ✅ Aktif Kullanılıyor |
| **react-native-safe-area-context** | Ekran çentikleri ve güvenli alan sınırlarının yönetimi. | ✅ Aktif Kullanılıyor |
| **expo-linear-gradient** | Renk geçişli (gradient) arka planlar oluşturur. | ✅ Aktif Kullanılıyor |
| **react-native-svg** | React Native içinde SVG formatındaki görselleri çizer. | ✅ Aktif Kullanılıyor |
| **react-native-toast-message** | Animasyonlu bildirim (toast) mesajı bileşeni. | ✅ Aktif Kullanılıyor |
| **react-native-pell-rich-editor** | Zengin metin (rich text) editörü bileşeni. | ✅ Aktif Kullanılıyor |
| **rn-emoji-keyboard** | Özel emoji klavyesi bileşeni. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-gifted-charts** / **react-native-chart-kit** | Grafik ve veri görselleştirme bileşenleri. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-calendars** | Takvim bileşenleri. | ⚠️ **Kullanılmıyor (JS'de)** |
| **@react-native-community/datetimepicker** / **react-native-modal-datetime-picker** | Tarih ve saat seçici bileşenleri. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-reanimated-carousel** | Karusel (kaydırmalı resim galerisi) bileşeni. | ⚠️ **Kullanılmıyor (JS'de)** |
| **@shopify/react-native-skia** | Yüksek performanslı 2D grafik motoru. | ⚠️ **Kullanılmıyor (JS'de)** |
| **@react-native-masked-view/masked-view** | Maskelenmiş (masked) görünümler oluşturmak için bileşen. | ⚠️ **Kullanılmıyor (JS'de)** |

### Animasyonlar
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **react-native-reanimated** | Yüksek performanslı yerel animasyon API'si. | ✅ Aktif Kullanılıyor |
| **moti** | React Native için evrensel animasyon kütüphanesi (Reanimated tabanlı). | ✅ Aktif Kullanılıyor |
| **lottie-react-native** | Adobe After Effects animasyonlarını yerel olarak çalıştırır. | ⚠️ **Kullanılmıyor (JS'de)** |

### Medya İşleme (Video, Fotoğraf, Kamera)
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **expo-video** | Expo için yeni nesil yerel video oynatıcı. | ✅ Aktif Kullanılıyor |
| **react-native-video** | Gelişmiş video oynatma bileşeni. | ✅ Aktif Kullanılıyor |
| **expo-image** | Görüntüleri önbelleğe alabilen yüksek performanslı resim bileşeni. | ✅ Aktif Kullanılıyor |
| **expo-camera** | Kameraya erişim ve barkod okuma desteği. | ✅ Aktif Kullanılıyor |
| **react-native-compressor** | Yerel video ve resim sıkıştırma kütüphanesi. | ✅ Aktif Kullanılıyor |
| **expo-image-picker** | Galeriden fotoğraf/video seçme veya kamera ile fotoğraf çekme arayüzü. | ✅ Aktif Kullanılıyor |
| **react-native-vision-camera** | Kamera karelerini (frame) işleyebilen gelişmiş kamera kütüphanesi. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-av** | Ses çalma ve kaydetme desteği. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-image-manipulator** | Temel resim işlemleri (kırpma, yeniden boyutlandırma, döndürme). | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-image-crop-picker** | Gelişmiş yerel resim seçme ve kırpma kütüphanesi. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-video-trim** | Yerel video kırpma (trim) arayüzü. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-view-shot** | Bir ekran görünümünün ekran görüntüsünü (screenshot) alır. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-create-thumbnail** | Video dosyalarından küçük resim (thumbnail) oluşturur. | ⚠️ **Kullanılmıyor (JS'de)** |

### Cihaz Donanımı ve Sensörler
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **expo-font** | Çalışma zamanında özel fontları sisteme yükler. | ✅ Aktif Kullanılıyor |
| **expo-haptics** | İşletim sisteminin titreşim ve dokunsal geribildirim motoruna erişim. | ✅ Aktif Kullanılıyor |
| **expo-keep-awake** | Ekranın uyku moduna geçmesini engeller. | ✅ Aktif Kullanılıyor |
| **expo-linking** | Derin bağlantıları (deep link) yönetir ve URL açar. | ✅ Aktif Kullanılıyor |
| **expo-crypto** | Kriptografik işlemler (örn. hashing). | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-secure-store** | Şifrelenmiş anahtar-değer deposu. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-clipboard** | Panoya (clipboard) metin kopyalama ve yapıştırma. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-contacts** | Cihaz rehberine/kişilere erişim. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-location** | GPS ve konum verilerine erişim. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-screen-orientation** | Ekran yönlendirmesini (dikey/yatay) okuma ve kilitleme. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-permissions** | Çoklu izin isteklerini yönetmek için birleştirilmiş API. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-device-info** | Cihaz meta verileri ve donanım bilgileri. | ⚠️ **Kullanılmıyor (JS'de)** |

### Kimlik Doğrulama
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **expo-apple-authentication** | Apple ile Giriş Yap (Sign in with Apple) desteği. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-local-authentication** | FaceID/TouchID gibi biyometrik doğrulama. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-auth-session** | Web tabanlı kimlik doğrulama akışları (OAuth vb.). | ⚠️ **Kullanılmıyor (JS'de)** |

### Sistem Kullanıcı Arayüzü ve Modüller
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **expo-splash-screen** | Uygulama açılış ekranının (splash screen) görünürlüğünü kontrol eder. | ✅ Aktif Kullanılıyor |
| **expo-navigation-bar** | Android alt navigasyon çubuğunu kontrol eder. | ✅ Aktif Kullanılıyor |
| **react-native-edge-to-edge** | Ekranın tamamını kaplayan (tam ekran) tasarımlar yapmaya yardımcı olur. | ✅ Aktif Kullanılıyor |
| **expo-status-bar** | Üst durum çubuğunu kontrol eder. | ⚠️ **Konfigürasyon Amaçlı** |
| **expo-build-properties** | Projenin yerel derleme (compileSdk vb.) ayarlarını yapılandırır. | ⚠️ **Konfigürasyon Amaçlı** |
| **expo-dev-client** | Özel geliştirme derlemeleri (development builds) oluşturmak için kullanılır. | ⚠️ **Konfigürasyon Amaçlı** |
| **react-native-keyboard-controller** | Gelişmiş klavye yönetimi ve animasyonları. | ⚠️ **Kullanılmıyor (JS'de)** |
| **react-native-nitro-modules** | Nitro mimarisi üzerinden hızlı native modüller yazmaya yarayan çekirdek kütüphane. | ⚠️ **Kullanılmıyor (JS'de)** |

### Dosya Sistemi ve Veritabanı
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **expo-file-system** | Cihazdaki yerel dosya sistemine okuma/yazma erişimi sağlar. | ✅ Aktif Kullanılıyor |
| **expo-media-library** | Kullanıcının medya galerisine (fotoğraflar/videolar) erişim sağlar. | ✅ Aktif Kullanılıyor |
| **expo-sqlite** | Yerel SQLite veritabanı. | ⚠️ **Kullanılmıyor (JS'de)** |

### Dış Entegrasyonlar ve Analitik
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **react-native-purchases** | Uygulama içi satın alma işlemleri için RevenueCat SDK'sı. | ✅ Aktif Kullanılıyor |
| **react-native-webview** | Uygulama içerisinde web sayfalarını render eder. | ✅ Aktif Kullanılıyor |
| **react-native-share** | Gelişmiş yerel içerik paylaşım seçenekleri sunar. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-sharing** | Yerel sistem paylaşım penceresini açar. | ⚠️ **Kullanılmıyor (JS'de)** |
| **expo-tracking-transparency** | iOS'ta Uygulama Takip Şeffaflığı (ATT) için izin isteme. | ⚠️ **Kullanılmıyor (JS'de)** |
| **@segment/analytics-react-native** | Analitik takibi için Segment SDK'sı. | ⚠️ **Kullanılmıyor (JS'de)** |
| **@segment/sovran-react-native** | Segment tarafından kullanılan iç durum yönetim aracı. | ⚠️ **Kullanılmıyor (JS'de)** |
| **@storybook/react-native** | Kullanıcı arayüzü bileşenlerini ayrı bir ortamda geliştirmek ve test etmek için kullanılır. | ⚠️ **Kullanılmıyor (JS'de)** |

### Fontlar (`@expo-google-fonts/*`)
- Projede bulunan onlarca `@expo-google-fonts/` paketi (ör. Inter, Roboto, Poppins vb.), kullanıcı arayüzünde kullanılan özel yazı tiplerini sisteme yüklemek için kullanılır.

### Geliştirme Bağımlılıkları (DevDependencies)
| Paket Adı | Ne İşe Yarar? | Kullanım Durumu |
| :--- | :--- | :--- |
| **typescript** / **@types/react** | TypeScript derleyicisi ve tip tanımlamaları. | ✅ Aktif Kullanılıyor |
| **babel-preset-expo** / **babel-plugin-module-resolver** | Babel dönüşümü ve dizin alias (takma ad) çözümleri. | ✅ Aktif Kullanılıyor |
| **react-native-svg-transformer** | SVG dosyalarının doğrudan import edilerek React bileşeni gibi kullanılmasını sağlar. | ✅ Aktif Kullanılıyor |
| **@expo/ngrok** | Yerel sunucuyu internete açmak (tünelleme) için kullanılır. | ⚠️ **Kullanılmıyor** |

---
_Bu rapor, statik kod analizi (`depcheck`) ve projede yer alan `package.json` dosyalarının incelenmesi sonucunda yapay zeka tarafından oluşturulmuştur._
