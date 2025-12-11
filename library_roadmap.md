# Future Library Roadmap

Bu dosya, sık sık `EAS Build` almayı önlemek amacıyla, gelecekte projemize eklenmesi muhtemel **native (yerel)** kütüphaneleri takip etmek için oluşturulmuştur. Amaç; bu kütüphaneleri toplu bir şekilde belirleyip tek seferde build alarak geliştirme sürecini hızlandırmaktır.

> **Not:** Sürümler `Expo SDK 54` ile uyumlu olmalıdır. Her zaman `npx expo install <paket-adi>` komutu ile en doğru sürüm kurulmalıdır.

## 📦 Planlanan Kütüphaneler

### 1. 📸 Medya ve Kamera
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`expo-camera`** | Uygulama içinden direkt fotoğraf/video çekmek için (Şu an galeriden alıyoruz). | ⏳ Beklemede |
| **`expo-media-library`** | Çekilen veya indirilen videoları kullanıcının telefon galerisine kaydetmek için (`Save` butonu). | ⏳ Beklemede |
| **`expo-av`** | Ses kaydı veya daha karmaşık ses işleme özellikleri gerekirse. | ⏳ Beklemede |

### 2. 🔔 Bildirim ve İletişim
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`expo-notifications`** | Yerel bildirimler (Local Notifications) veya Push bildirimleri için. | ⏳ Beklemede |
| **`expo-sharing`** | Videoları WhatsApp, Instagram vb. uygulamalarda paylaşmak için (`Share` butonu). | ⏳ Beklemede |
| **`expo-clipboard`** | Link kopyalama özelliği için. | ⏳ Beklemede |

### 3. 🔐 Kimlik ve Depolama
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`expo-secure-store`** | Kullanıcı token'larını (JWT) güvenli saklamak için (AsyncStorage yerine önerilir). | ⏳ Beklemede |
| **`expo-apple-authentication`** | "Apple ile Giriş Yap" özelliği için (iOS zorunlu kılar). | ⏳ Beklemede |
| **`@react-native-google-signin/google-signin`** | Google ile Giriş özelliği için. | ⏳ Beklemede |

### 4. 🌍 Lokasyon ve Harita
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`expo-location`** | Kullanıcının konumunu alıp feed'i özelleştirmek için. | ⏳ Beklemede |

### 5. 🎨 UI ve Görselleştirme
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`react-native-pager-view`** | TikTok/Instagram tarzı "Çoklu Fotoğraf Kaydırma" (Carousel) için. FlatList'ten çok daha performanslıdır. | ⏳ Beklemede |
| **`expo-screen-orientation`** | Yatay videoları tam ekran yapmak için ekranı döndürme kontrolü. | ✅ Kurulu |

### 6. 🛠️ Sistem ve Performans
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`expo-device`** | Cihaz modelini anlamak (örn: eski modelse animasyonları kapatmak) için. | ⏳ Beklemede |
| **`expo-network`** | İnternet bağlantısını kontrol edip "Offline" uyarısı göstermek için (`NetInfo` alternatifi). | ⏳ Beklemede |
### 7. 🎬 Video Editör (Ağır İşler)
| Kütüphane | Amaç | Durum |
| :--- | :--- | :--- |
| **`ffmpeg-kit-react-native`** | Trim, Crop, Müzik, Transcode işlemleri için (Paket: `full-gpl` seçilmeli). | ⏳ Beklemede |
| **`@shopify/react-native-skia`** | Video üzerine çizim, Sticker, Text ve canlı filtreler için yüksek performanslı grafik motoru. | ⏳ Beklemede |
| **`expo-file-system`** | Video dosyalarını okuma/yazma (ffmpeg ile entegre çalışır). | ✅ Kurulu |

---

## ✅ Şu An Kurulu Olan Native Kütüphaneler
*(Bunlar için tekrar build almaya gerek yok)*

- `expo-video` (Video oynatma)
- `expo-image` (Resim gösterme)
- `expo-image-picker` (Galeri erişimi)
- `expo-haptics` (Titreşim)
- `expo-linear-gradient` (Renk geçişleri)
- `expo-blur` (Bulanıklık efekti)
- `expo-router` / `react-native-screens` (Navigasyon)
- `@shopify/flash-list` (Hızlı liste)
- `@gorhom/bottom-sheet` (Açılır paneller)
- `react-native-reanimated` (Animasyonlar)
- `react-native-svg` (İkonlar)
- `react-native-safe-area-context` (Çentik uyumu)
- `expo-screen-orientation` (Ekran döndürme)
- `expo-file-system` (Dosya okuma/yazma)

## 🚀 Strateji
Bir sonraki `EAS Build` ihtiyacımız doğduğunda, yukarıdaki listeden (özellikle **Kamera**, **Paylaşım** ve **Galeriye Kaydet**) ihtiyacımız olabilecekleri seçip **topluca** kuracağız.
