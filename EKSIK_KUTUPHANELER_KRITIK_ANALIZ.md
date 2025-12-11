# Eksik Kütüphaneler - Kritik Analiz
**Son Kontrol: 2025-12-11**

> Bu dosya, build'e eklenmesi gereken **eksik ama kritik** native kütüphaneleri listeler. Bir sonraki build'de bunları da ekleyin ki tekrar build almaya gerek kalmasın.

---

## ⚠️ ÇOK KRİTİK (Mutlaka Ekle)

### 1. **Firebase Suite** (Analytics & Crash Reporting)
```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics @react-native-firebase/messaging
```

**Neden Şart:**
- ✅ Production app'ler için analytics zorunlu
- ✅ Crash tracking (kullanıcı hangi hatalarda çakılıyor?)
- ✅ Push notifications (backend ile entegre)
- ✅ User behavior analysis
- ✅ Retention metrics

**Config:**
```json
// app.json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics"
    ]
  }
}
```

**Setup:**
- Firebase Console'dan `google-services.json` (Android)
- Firebase Console'dan `GoogleService-Info.plist` (iOS)

**Maliyet:** FREE (Spark plan yeterli)

---

### 2. **expo-tracking-transparency** (iOS 14+ Zorunlu)
```bash
npx expo install expo-tracking-transparency
```

**Neden Şart:**
- ✅ iOS 14+ için App Store ZORUNLU
- ✅ ATT (App Tracking Transparency) prompt
- ✅ Olmadan app reddedilir

**Kullanım:**
```typescript
import * as TrackingTransparency from 'expo-tracking-transparency';

// App açılışında
const { status } = await TrackingTransparency.requestTrackingPermissionsAsync();
if (status === 'granted') {
  // Firebase, analytics enable
}
```

**Info.plist:**
```xml
<key>NSUserTrackingUsageDescription</key>
<string>Sana özel içerik önermek için izin gerekiyor</string>
```

---

### 3. **react-native-webview** (External Links)
```bash
npx expo install react-native-webview
```

**Neden Şart:**
- ✅ Terms of Service göstermek (App Store requirement)
- ✅ Privacy Policy göstermek
- ✅ External links (marka URL'leri)
- ✅ OAuth flows (Google/Apple login redirect)

**Kullanım:**
```typescript
<WebView
  source={{ uri: 'https://wizyclub.com/terms' }}
  style={{ flex: 1 }}
/>
```

---

### 4. **react-native-mmkv** (Fast Storage)
```bash
npm install react-native-mmkv
```

**Neden Önemli:**
- ✅ AsyncStorage'dan **30x daha hızlı**
- ✅ Zustand persist için ideal
- ✅ User preferences, cache metadata

**Kullanım:**
```typescript
import { MMKV } from 'react-native-mmkv'

export const storage = new MMKV()

storage.set('user.name', 'Umit')
const name = storage.getString('user.name')
```

**Alternatif:** AsyncStorage kullanmaya devam et (ama yavaş)

---

### 5. **@react-native-async-storage/async-storage** (Fallback)
```bash
npx expo install @react-native-async-storage/async-storage
```

**Neden:**
- ✅ MMKV fail olursa fallback
- ✅ Birçok kütüphane buna depend eder
- ✅ Expo SDK 54'te recommended

**Not:** MMKV kuruyorsan bu opsiyonel ama kurmanı öneririm.

---

## 🟡 ÖNEMLİ (Eklemeni Öneriyorum)

### 6. **expo-local-authentication** (Biometric Login)
```bash
npx expo install expo-local-authentication
```

**Neden Güzel:**
- ✅ Face ID / Touch ID login
- ✅ Premium hissi (CapCut, Instagram gibi)
- ✅ Password-less experience

**Kullanım:**
```typescript
const hasHardware = await LocalAuthentication.hasHardwareAsync();
const isEnrolled = await LocalAuthentication.isEnrolledAsync();

if (hasHardware && isEnrolled) {
  const result = await LocalAuthentication.authenticateAsync();
  // Login successful
}
```

---

### 7. **expo-contacts** (Find Friends)
```bash
npx expo install expo-contacts
```

**Neden Güzel:**
- ✅ "Find friends from contacts" özelliği
- ✅ Social growth (TikTok/Instagram gibi)
- ✅ Onboarding sırasında kullanılır

**Privacy:** Permission gerekli (dikkatli kullan)

---

### 8. **expo-background-fetch** (Background Updates)
```bash
npx expo install expo-background-fetch expo-task-manager
```

**Neden Güzel:**
- ✅ Background'da feed yenileme
- ✅ Notifications için prep
- ✅ Offline-first experience

**Kısıtlama:** iOS'ta 15-30 dakikada bir, Android'de daha flexible

---

### 9. **react-native-branch** (Deep Linking & Attribution)
```bash
npm install react-native-branch
```

**Neden Önemli:**
- ✅ Referral links (user invite sistemi)
- ✅ Attribution tracking (hangi kampanyadan geldi?)
- ✅ Deferred deep linking (app install sonrası yönlendirme)

**Alternatif:** Expo's own deep linking (ama Branch daha güçlü)

---

## 🟢 NICE-TO-HAVE (Opsiyonel - Sonra Ekle)

### 10. **expo-speech** (Text-to-Speech)
```bash
npx expo install expo-speech
```

**Use Case:** Accessibility, audio captioning

---

### 11. **expo-barcode-scanner** (QR Codes)
```bash
npx expo install expo-barcode-scanner
```

**Use Case:** QR code ile profil takip, event check-in

---

### 12. **react-native-maps** (Lokasyon Tabanlı Feed)
```bash
npx expo install react-native-maps
```

**Use Case:** "Yakınımdaki videolar" özelliği

**Kısıtlama:** Google Maps API key gerekli (paralı)

---

### 13. **expo-ads-admob** (Monetization)
```bash
npx expo install expo-ads-admob
```

**Use Case:** Reklam geliri (MVP sonrası)

---

### 14. **react-native-iap** (In-App Purchases)
```bash
npm install react-native-iap
```

**Use Case:** Premium subscription, coins sistemi

---

## 📊 ÖNCELİKLENDİRİLMİŞ LİSTE

### Build #1 (MVP - Mutlaka)
```bash
# Analytics & Crash (ÇOK KRİTİK)
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics @react-native-firebase/messaging

# iOS Requirement (KRİTİK)
npx expo install expo-tracking-transparency

# External Links (KRİTİK)
npx expo install react-native-webview

# Fast Storage (ÖNEMLİ)
npm install react-native-mmkv

# Fallback Storage (ÖNEMLİ)
npx expo install @react-native-async-storage/async-storage

# Biometric (NICE)
npx expo install expo-local-authentication

# Find Friends (NICE)
npx expo install expo-contacts

# Background (NICE)
npx expo install expo-background-fetch expo-task-manager
```

### Build #2 (Phase 2 - Sonra)
- Branch IO (deep linking)
- Maps
- Ads
- IAP

---

## ✅ ZATEN KURULU OLANLAR (Yeniden Ekleme)

Şu anda projende **ZATEN** kurulu:
- ✅ `@react-native-community/netinfo` - Network status
- ✅ `expo-router` - Navigation
- ✅ `expo-haptics` - Vibration
- ✅ Tüm diğer temel modüller

---

## 🎯 TAVSİYE: Toplu Kurulum Komutu

### Minimum (Sadece Kritikler)
```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics @react-native-firebase/messaging expo-tracking-transparency react-native-webview @react-native-async-storage/async-storage && npm install react-native-mmkv
```

### Recommended (Kritikler + Önemliler)
```bash
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics @react-native-firebase/messaging expo-tracking-transparency react-native-webview @react-native-async-storage/async-storage expo-local-authentication expo-contacts expo-background-fetch expo-task-manager && npm install react-native-mmkv
```

### Full (Her Şey Dahil - Önceki Build Plan ile Birlikte)
```bash
# Core (from previous plan)
npx expo install expo-camera expo-media-library expo-av expo-notifications expo-sharing expo-clipboard expo-secure-store expo-apple-authentication react-native-pager-view expo-device expo-location

# Critical Missing
npx expo install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics @react-native-firebase/messaging expo-tracking-transparency react-native-webview @react-native-async-storage/async-storage expo-local-authentication expo-contacts expo-background-fetch expo-task-manager

# NPM Packages
npm install @react-native-google-signin/google-signin react-native-mmkv
```

---

## 🔧 Firebase Setup Checklist

1. **Firebase Console**
   - Yeni proje oluştur
   - Android app ekle (`com.anonymous.wizyclup`)
   - iOS app ekle
   - `google-services.json` indir
   - `GoogleService-Info.plist` indir

2. **Files**
   - `google-services.json` → `android/app/`
   - `GoogleService-Info.plist` → `ios/WizyClub/`

3. **app.json**
   ```json
   {
     "expo": {
       "plugins": [
         "@react-native-firebase/app",
         "@react-native-firebase/crashlytics",
         [
           "expo-tracking-transparency",
           {
             "userTrackingPermission": "Sana özel içerik önermek için izin gerekiyor"
           }
         ]
       ]
     }
   }
   ```

4. **Test**
   ```typescript
   import analytics from '@react-native-firebase/analytics';
   
   // Log event
   await analytics().logEvent('video_watched', {
     video_id: '123',
     duration: 45
   });
   ```

---

## 📝 Final Checklist

Bunu build almadan önce kontrol et:

- [ ] Firebase kuruldu ve test edildi
- [ ] Tracking Transparency iOS'ta düzgün çalışıyor
- [ ] WebView ile terms/privacy gösteriliyor
- [ ] MMKV ile state persist çalışıyor
- [ ] Local auth (biometric) test edildi
- [ ] Contacts permission düzgün
- [ ] Background fetch iOS'ta çalışıyor
- [ ] `npx expo-doctor` hatasız
- [ ] EAS build credentials ayarlı

---

## ⚡ Neden Bu Kadar Paket?

**Soru:** "Çok fazla paket değil mi?"

**Cevap:**
1. **Firebase** - Her production app'te olmalı (analytics + crash)
2. **Tracking Transparency** - iOS için zorunlu
3. **WebView** - Terms/Privacy için zorunlu
4. **MMKV** - Performance boost (30x faster)
5. **Geri kalan** - Nice-to-have ama rekabet için gerekli

**Sonuç:** İlk 5 paket KRİTİK, geri kalanı opsiyonel.

---

**Son Güncelleme:** 2025-12-11  
**Durum:** 📋 Review Ready  
**Action:** Build planına ekle ve tek seferde build al
