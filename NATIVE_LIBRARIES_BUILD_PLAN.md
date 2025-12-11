# WizyClub - Native Libraries Build Plan
**Expo SDK 54 Uyumlu | Toplu Build Stratejisi**

> Bu dosya, bir sonraki EAS Build öncesinde kurulacak tüm native modülleri içerir. Tüm paketler `npx expo install` komutu ile SDK sürümüyle uyumlu olarak kurulacaktır.

---

## 🎯 Build Stratejisi

**Neden Toplu Kurulum?**
- Her native modül EAS Build gerektirir (~15-30 dakika)
- Toplu kurulum = Tek build ile 10+ özellik
- Geliştirme sürecini hızlandırır

**Build Adımları:**
```bash
# 1. Paketleri kur (aşağıdaki listeden)
npx expo install [paket-listesi]

# 2. Uyumluluk kontrolü
npx expo-doctor

# 3. Prebuild (opsiyonel - lokal test için)
npx expo prebuild --clean

# 4. EAS Build (production)
eas build --platform all --profile production

# 5. Development build (geliştirme)
eas build --platform android --profile development
```

---

## 📦 Kurulacak Paketler (Kategori Bazlı)

### 1. 📸 Medya ve Kamera (Öncelikli - MVP)
```bash
npx expo install expo-camera expo-media-library expo-av
```

**Paketler:**
- **`expo-camera`** - In-app video/fotoğraf çekimi
  - Zoom/Focus kontrolü
  - 1080p/60fps kayıt
  - Video stabilization
- **`expo-media-library`** - Galeriye kaydetme
  - Save butonu özelliği
  - Video/fotoğraf exportu
- **`expo-av`** - Gelişmiş ses
  - Voiceover kaydı
  - Müzik önizleme
  - Audio mixing

**Kullanım:** Upload flow, Profile videos, Story creation

---

### 2. 🔔 Sosyal Özellikler (Öncelikli - UX)
```bash
npx expo install expo-notifications expo-sharing expo-clipboard
```

**Paketler:**
- **`expo-notifications`** - Push bildirimleri
  - Yeni takipçi
  - Yeni beğeni/yorum
  - İş birliği teklifleri
- **`expo-sharing`** - Share butonu
  - WhatsApp, Instagram, TikTok paylaşımı
  - Native share sheet
- **`expo-clipboard`** - Link kopyalama
  - Video link'i kopyala
  - Profil link'i kopyala

**Kullanım:** Action buttons, Engagement features

---

### 3. 🔐 Kimlik Doğrulama (MVP)
```bash
npx expo install expo-secure-store expo-apple-authentication
npm install @react-native-google-signin/google-signin
```

**Paketler:**
- **`expo-secure-store`** - JWT storage (güvenli)
  - AsyncStorage yerine
  - Encrypt edilmiş token saklama
- **`expo-apple-authentication`** - Apple Sign-In
  - iOS App Store gereksinimi
- **`@react-native-google-signin/google-signin`** - Google Sign-In

**Kullanım:** Login/Register screens

---

### 4. 🎨 UI ve Performans
```bash
npx expo install react-native-pager-view expo-device expo-location
```

**Paketler:**
- **`react-native-pager-view`** - Carousel
  - Çoklu fotoğraf/video slaytları
  - Stories swipe
  - Profile grid scroll
- **`expo-device`** - Cihaz algılama
  - Düşük performans → animasyon azaltma
  - Model bazlı optimizasyon
- **`expo-location`** - Lokasyon
  - Yakındaki içerik
  - Harita filtresi

**Kullanım:** Stories, Explore grid, Feed optimization

---

### 5. 🎬 Video Editor (Gelişmiş - Phase 2)
```bash
npx expo install ffmpeg-kit-react-native @shopify/react-native-skia
```

⚠️ **DİKKAT:** Bu paketler çok büyük (~50-100 MB app boyutu ekler)

**Paketler:**
- **`ffmpeg-kit-react-native`** - Video işleme (FULL-GPL versiyonu)
  - ✂️ Trim, Split, Crop
  - 🔇 Silence detection
  - 🎵 Müzik ekleme
  - 🎨 Filtreler
  - 💾 Export (H.264, 1080p)
  
- **`@shopify/react-native-skia`** - GPU rendering
  - Sticker overlay
  - Text overlay
  - Real-time filters
  - Drawing tools

**Config Plugin:**
```json
// app.json
{
  "expo": {
    "plugins": [
      [
        "ffmpeg-kit-react-native",
        {
          "package": "full-gpl"
        }
      ]
    ]
  }
}
```

**Kullanım:** Video Editor screen (Phase 2)

---

## 📋 Tam Komut Listesi (Tek Satırda)

### MVP Build (Öncelikli Özellikler)
```bash
npx expo install expo-camera expo-media-library expo-av expo-notifications expo-sharing expo-clipboard expo-secure-store expo-apple-authentication react-native-pager-view expo-device expo-location && npm install @react-native-google-signin/google-signin
```

### Full Build (Editor Dahil)
```bash
npx expo install expo-camera expo-media-library expo-av expo-notifications expo-sharing expo-clipboard expo-secure-store expo-apple-authentication react-native-pager-view expo-device expo-location ffmpeg-kit-react-native @shopify/react-native-skia && npm install @react-native-google-signin/google-signin
```

---

## ✅ Kurulum Sonrası Checklist

1. **Uyumluluk Kontrolü**
   ```bash
   npx expo-doctor
   ```
   ❌ Hata varsa → Paket versiyonlarını güncelle

2. **app.json Güncellemesi**
   - Permissions ekle (Camera, Notifications, Location, etc.)
   - Config plugins ekle (ffmpeg-kit)

3. **iOS Permissions (info.plist)**
   - `NSCameraUsageDescription`
   - `NSPhotoLibraryUsageDescription`
   - `NSLocationWhenInUseUsageDescription`

4. **Android Permissions (AndroidManifest.xml)**
   - `CAMERA`
   - `WRITE_EXTERNAL_STORAGE`
   - `ACCESS_FINE_LOCATION`

5. **EAS Build**
   ```bash
   # Development build (test için)
   eas build --platform android --profile development
   
   # Production build
   eas build --platform all --profile production
   ```

6. **Test Senaryoları**
   - [ ] Kamera çekimi
   - [ ] Galeriye kaydetme
   - [ ] Paylaşma
   - [ ] Push notification
   - [ ] Login (Apple/Google)

---

## 🔧 Troubleshooting

### Expo Doctor Hataları
```bash
# Paket versiyonları uyumsuz
npx expo install --fix

# Yarn cache temizle
yarn cache clean
rm -rf node_modules
yarn install
```

### Build Hataları
```bash
# Clean build
npx expo prebuild --clean
eas build --clear-cache

# Logları incele
eas build:view [build-id]
```

### Gradle Hataları (Android)
```gradle
// android/build.gradle
allprojects {
    repositories {
        maven { url 'https://jitpack.io' }
    }
}
```

---

## 📊 App Boyutu Tahmini

| Kategori | Paket Sayısı | Eklenen Boyut | Toplam |
|:---------|:-------------|:--------------|:-------|
| **Temel** (Camera, Share, Auth) | 8 | ~15 MB | ~50 MB |
| **+ Lokasyon/UI** | +3 | ~5 MB | ~55 MB |
| **+ Video Editor** | +2 | ~80 MB | **~135 MB** |

> **Not:** Editor paketleri opsiyonel. MVP için önce temel özellikleri build edelim.

---

## 🚀 Öneri: Aşamalı Build

### Phase 1 (MVP - Hemen)
✅ Camera, Media Library, Sharing, Notifications, Auth
- ~50 MB app
- 1 build
- Core features complete

### Phase 2 (Editing - Sonra)
✅ FFmpeg, Skia, Advanced tools
- +80 MB
- Ayrı build
- Professional features

**Avantaj:** MVP hızlı release, Editor zamanla gelişir

---

## 📝 Notlar

1. **EAS Build Credits:** Her build 1 credit harcar
2. **Build Süresi:** ~15-30 dakika
3. **Test:** Development build önce, production sonra
4. **App Store:** Permissions açıklamaları önemli

**Son Güncelleme:** 2025-12-11
