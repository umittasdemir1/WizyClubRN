# WizyClub - Master Build Package List
**Tüm Native Kütüphaneler | Tek Komut Listesi**

> Bu dosya, bir sonraki EAS Build için kurulması gereken **TÜM** native modülleri içerir.

---

## 🎯 FULL BUILD KOMUTLARI (Toplu Kurulum)

### Seçenek 1: TEK KOMUT (Tüm Kritik + MVP)
```bash
npx expo install \
  expo-camera \
  expo-media-library \
  expo-av \
  expo-notifications \
  expo-sharing \
  expo-clipboard \
  expo-secure-store \
  expo-apple-authentication \
  react-native-pager-view \
  expo-device \
  expo-location \
  @react-native-firebase/app \
  @react-native-firebase/analytics \
  @react-native-firebase/crashlytics \
  @react-native-firebase/messaging \
  expo-tracking-transparency \
  react-native-webview \
  @react-native-async-storage/async-storage \
  expo-local-authentication \
  expo-contacts \
  expo-background-fetch \
  expo-task-manager \
  && npm install @react-native-google-signin/google-signin react-native-mmkv
```

### Seçenek 2: Full Build (Editor Dahil)
```bash
npx expo install \
  expo-camera \
  expo-media-library \
  expo-av \
  expo-notifications \
  expo-sharing \
  expo-clipboard \
  expo-secure-store \
  expo-apple-authentication \
  react-native-pager-view \
  expo-device \
  expo-location \
  @react-native-firebase/app \
  @react-native-firebase/analytics \
  @react-native-firebase/crashlytics \
  @react-native-firebase/messaging \
  expo-tracking-transparency \
  react-native-webview \
  @react-native-async-storage/async-storage \
  expo-local-authentication \
  expo-contacts \
  expo-background-fetch \
  expo-task-manager \
  ffmpeg-kit-react-native \
  @shopify/react-native-skia \
  && npm install @react-native-google-signin/google-signin react-native-mmkv
```

---

## 📦 KATEGORİZE EDİLMİŞ PAKET LİSTESİ

### 🔴 KRİTİK (Mutlaka Kurulmalı - 10 paket)

| # | Paket | Amaç | Kurulum |
|:--|:------|:-----|:--------|
| 1 | `@react-native-firebase/app` | Firebase core | `npx expo install` |
| 2 | `@react-native-firebase/analytics` | Analytics | `npx expo install` |
| 3 | `@react-native-firebase/crashlytics` | Crash tracking | `npx expo install` |
| 4 | `@react-native-firebase/messaging` | Push notifications | `npx expo install` |
| 5 | `expo-tracking-transparency` | iOS ATT (Zorunlu) | `npx expo install` |
| 6 | `react-native-webview` | Terms/Privacy | `npx expo install` |
| 7 | `react-native-mmkv` | Fast storage | `npm install` |
| 8 | `@react-native-async-storage/async-storage` | Fallback storage | `npx expo install` |
| 9 | `expo-notifications` | Local/Push notif | `npx expo install` |
| 10 | `expo-secure-store` | JWT storage | `npx expo install` |

---

### 🟡 ÖNEMLİ (MVP Features - 11 paket)

| # | Paket | Amaç | Kurulum |
|:--|:------|:-----|:--------|
| 11 | `expo-camera` | In-app recording | `npx expo install` |
| 12 | `expo-media-library` | Save to gallery | `npx expo install` |
| 13 | `expo-av` | Audio recording | `npx expo install` |
| 14 | `expo-sharing` | Share button | `npx expo install` |
| 15 | `expo-clipboard` | Copy link | `npx expo install` |
| 16 | `expo-apple-authentication` | Apple Sign-In | `npx expo install` |
| 17 | `@react-native-google-signin/google-signin` | Google Sign-In | `npm install` |
| 18 | `expo-local-authentication` | Face ID/Touch ID | `npx expo install` |
| 19 | `expo-contacts` | Find friends | `npx expo install` |
| 20 | `expo-background-fetch` | Background updates | `npx expo install` |
| 21 | `expo-task-manager` | Background tasks | `npx expo install` |

---

### 🟢 GELECEK (Nice-to-Have - 7 paket)

| # | Paket | Amaç | Kurulum |
|:--|:------|:-----|:--------|
| 22 | `react-native-pager-view` | Carousel | `npx expo install` |
| 23 | `expo-device` | Device detection | `npx expo install` |
| 24 | `expo-location` | Geolocation | `npx expo install` |
| 25 | `expo-speech` | Text-to-speech | `npx expo install` |
| 26 | `expo-barcode-scanner` | QR codes | `npx expo install` |
| 27 | `react-native-maps` | Maps | `npx expo install` |
| 28 | `react-native-branch` | Deep linking | `npm install` |

---

### 🎬 VİDEO EDITOR (Phase 2 - 2 paket)

| # | Paket | Amaç | Kurulum |
|:--|:------|:-----|:--------|
| 29 | `ffmpeg-kit-react-native` | Video processing | `npx expo install` |
| 30 | `@shopify/react-native-skia` | GPU rendering | `npx expo install` |

---

### 💰 MONETIZATION (Phase 3 - 2 paket)

| # | Paket | Amaç | Kurulum |
|:--|:------|:-----|:--------|
| 31 | `expo-ads-admob` | Ads | `npx expo install` |
| 32 | `react-native-iap` | In-app purchases | `npm install` |

---

## ✅ ZATEN KURULU OLANLAR (Build Gerekmez)

Şu anda projende zaten kurulu:
- `expo-video`
- `expo-image`
- `expo-image-picker`
- `expo-haptics`
- `expo-linear-gradient`
- `expo-blur`
- `expo-router`
- `react-native-screens`
- `@shopify/flash-list`
- `@gorhom/bottom-sheet`
- `react-native-reanimated`
- `react-native-svg`
- `react-native-safe-area-context`
- `expo-screen-orientation`
- `expo-file-system`
- `@react-native-community/netinfo`
- `react-native-video`

---

## 🎯 ÖNERİLEN KURULUM STRATEJİSİ

### Build #1: MVP Core (21 paket)
**Amaç:** Production-ready MVP

**Paketler:** #1-21

**Toplam Boyut:** ~50 MB

**Komut:**
```bash
npx expo install \
  @react-native-firebase/app \
  @react-native-firebase/analytics \
  @react-native-firebase/crashlytics \
  @react-native-firebase/messaging \
  expo-tracking-transparency \
  react-native-webview \
  @react-native-async-storage/async-storage \
  expo-notifications \
  expo-secure-store \
  expo-camera \
  expo-media-library \
  expo-av \
  expo-sharing \
  expo-clipboard \
  expo-apple-authentication \
  expo-local-authentication \
  expo-contacts \
  expo-background-fetch \
  expo-task-manager \
  && npm install @react-native-google-signin/google-signin react-native-mmkv
```

---

### Build #2: MVP + Extras (28 paket)
**Amaç:** MVP + Nice-to-have features

**Paketler:** #1-28

**Toplam Boyut:** ~60 MB

**Ek Paketler (Build #1'e ekle):**
```bash
npx expo install \
  react-native-pager-view \
  expo-device \
  expo-location \
  expo-speech \
  expo-barcode-scanner \
  react-native-maps \
  && npm install react-native-branch
```

---

### Build #3: Full Build (30 paket)
**Amaç:** MVP + Editor

**Paketler:** #1-30

**Toplam Boyut:** ~140 MB

**Ek Paketler (Build #2'ye ekle):**
```bash
npx expo install \
  ffmpeg-kit-react-native \
  @shopify/react-native-skia
```

---

### Build #4: Everything (32 paket)
**Amaç:** Tüm özellikler + Monetization

**Paketler:** #1-32

**Ek Paketler (Build #3'e ekle):**
```bash
npx expo install expo-ads-admob && npm install react-native-iap
```

---

## 📋 KURULUM SONRASI CHECKLIST

### 1. Package.json Kontrolü
```bash
cat package.json | grep -E "firebase|tracking|webview|mmkv|camera|notifications"
```

### 2. Expo Doctor
```bash
npx expo-doctor
```

### 3. App.json Config
```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics",
      "expo-tracking-transparency",
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

### 4. Firebase Setup
- [ ] `google-services.json` → `android/app/`
- [ ] `GoogleService-Info.plist` → `ios/WizyClub/`
- [ ] Firebase Console → Add apps
- [ ] Test analytics event

### 5. iOS Permissions (Info.plist)
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSMicrophoneUsageDescription`
- `NSLocationWhenInUseUsageDescription`
- `NSUserTrackingUsageDescription`
- `NSContactsUsageDescription`
- `NSFaceIDUsageDescription`

### 6. Android Permissions (AndroidManifest.xml)
- `CAMERA`
- `WRITE_EXTERNAL_STORAGE`
- `READ_EXTERNAL_STORAGE`
- `RECORD_AUDIO`
- `ACCESS_FINE_LOCATION`
- `READ_CONTACTS`
- `USE_BIOMETRIC`

### 7. EAS Build
```bash
# Development
eas build --platform android --profile development

# Production
eas build --platform all --profile production
```

---

## 📊 PAKET İSTATİSTİKLERİ

### Toplam Paket Sayısı: 32

**Kurulum Tipi Bazında:**
- 21 Expo paket (`npx expo install`)
- 11 NPM paket (`npm install`)

**Öncelik Bazında:**
- 🔴 Kritik: 10 paket
- 🟡 Önemli (MVP): 11 paket
- 🟢 Nice-to-have: 7 paket
- 🎬 Editor: 2 paket
- 💰 Monetization: 2 paket

**Boyut Tahmini:**
- Sadece Kritikler: ~20 MB
- MVP (Kritik + Önemli): ~50 MB
- MVP + Nice-to-have: ~60 MB
- Full (Editor dahil): ~140 MB
- Everything: ~150 MB

---

## 🚀 HIZLI BAŞLANGIÇ

### En Hızlı Yol (MVP Build)
```bash
# 1. Paketleri kur (tek komut)
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics @react-native-firebase/messaging expo-tracking-transparency react-native-webview @react-native-async-storage/async-storage expo-notifications expo-secure-store expo-camera expo-media-library expo-av expo-sharing expo-clipboard expo-apple-authentication expo-local-authentication expo-contacts expo-background-fetch expo-task-manager && npm install @react-native-google-signin/google-signin react-native-mmkv

# 2. Doctor check
npx expo-doctor

# 3. Firebase setup
# (google-services.json ve GoogleService-Info.plist ekle)

# 4. Build
eas build --platform all --profile production
```

---

## 💡 ÖNERİLER

1. **İlk Build:** Sadece Kritik + MVP paketleri (21 paket)
2. **İkinci Build:** Editor ekleme (23 paket)
3. **Üçüncü Build:** Monetization (25 paket)

**Neden Aşamalı?**
- Daha hızlı iteration
- Küçük app boyutu (başlangıçta)
- Test etme kolaylığı
- Sorun çıkarsa debug kolay

---

**Son Güncelleme:** 2025-12-11  
**Toplam Paket:** 32  
**Önerilen İlk Build:** 21 paket (MVP Core)
