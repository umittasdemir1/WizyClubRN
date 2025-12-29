# 🚀 WizyClub Backend Setup Guide

## 📖 Ne Yaptık?

### Problem:
- Expo app'i **tunnel mode** ile çalıştırıyorsun
- Backend local'de çalışıyor ama app ona erişemiyor
- Ev ve iş bilgisayarında farklı IP'ler var

### Çözüm:
1. **Localtunnel** ile backend'i internete açtık
2. **Environment variables** ile her ortamda farklı URL kullanıyoruz
3. Backend **Cloudflare R2** (S3-compatible storage) kullanıyor

---

## 🏗️ Mimari

```
[Mobile App (Tunnel)]
    ↓ HTTPS
[Localtunnel: https://xxx.loca.lt]
    ↓ HTTP
[Backend: localhost:3000]
    ↓ HTTPS
[Cloudflare R2 Storage]
[Supabase Database]
```

---

## 📋 Günlük Çalıştırma (İş PC'de)

### 1️⃣ Backend Başlat

**Terminal 1: Backend**
```bash
cd ~/WizyClubRN/backend
npm start
```

Çıktı:
```
✅ Video Backend running on http://0.0.0.0:3000
📤 Ready to accept uploads
```

---

### 2️⃣ Tunnel Aç

**Terminal 2: Localtunnel**
```bash
lt --port 3000
```

Çıktı:
```
your url is: https://abc-xyz-123.loca.lt
```

**⚠️ ÖNEMLİ:** Bu URL her seferinde değişir!

---

### 3️⃣ Mobile .env Güncelle

**Terminal 3: .env Dosyasını Güncelle**
```bash
cd ~/WizyClubRN/mobile
nano .env
```

İçine localtunnel URL'ini yaz:
```env
EXPO_PUBLIC_API_URL=https://abc-xyz-123.loca.lt
```

Kaydet: `CTRL+X` → `Y` → `Enter`

---

### 4️⃣ Expo App Başlat

**Terminal 3 (devam):**
```bash
npx expo start --dev-client --tunnel
```

---

## 🏠 Ev vs İş Farkı

### Evde:
```bash
# .env dosyası
EXPO_PUBLIC_API_URL=https://home-tunnel-url.loca.lt
```

### İşte:
```bash
# .env dosyası
EXPO_PUBLIC_API_URL=https://work-tunnel-url.loca.lt
```

**Not:** `.env` dosyası Git'e gitmez, her ortamda farklı olabilir!

---

## 📁 Dosya Yapısı

```
WizyClubRN/
├── backend/
│   ├── .env              # Backend config (R2, Supabase)
│   ├── .env.example      # Template
│   └── server.js         # Express server
│
├── mobile/
│   ├── .env              # Frontend config (API URL) ← Her gün değişir!
│   ├── .env.example      # Template
│   └── src/
│       └── core/
│           └── config.ts # process.env.EXPO_PUBLIC_API_URL kullanır
│
└── BACKEND_SETUP_GUIDE.md  # Bu dosya
```

---

## 🔧 Troubleshooting

### Backend başlamıyor
```bash
# .env dosyasını kontrol et
cat ~/WizyClubRN/backend/.env

# Supabase URL ve R2 credentials doğru mu?
```

### App backend'e bağlanamıyor
```bash
# 1. Localtunnel çalışıyor mu?
# Terminal 2'de "your url is:" görmeli

# 2. mobile/.env güncel mi?
cat ~/WizyClubRN/mobile/.env

# 3. Expo'yu restart et
# CTRL+C ile durdur, tekrar başlat
```

### Localtunnel URL değişti
```bash
# 1. Yeni URL'i kopyala
# 2. mobile/.env'i güncelle
nano ~/WizyClubRN/mobile/.env

# 3. Expo'yu restart et
```

### Avatar upload çalışmıyor
```bash
# 1. Backend loglarını kontrol et (Terminal 1)
# 2. R2 credentials doğru mu?
cat ~/WizyClubRN/backend/.env | grep R2

# 3. Tunnel bağlantısı var mı?
curl https://your-tunnel-url.loca.lt/health
```

---

## 🎯 Hızlı Başlangıç (Tek Komut)

İşe geldiğinde her gün:

```bash
# Terminal 1
cd ~/WizyClubRN/backend && npm start

# Terminal 2 (yeni tab)
lt --port 3000

# URL'i kopyala, .env'ye yapıştır, app'i başlat
# Terminal 3 (yeni tab)
cd ~/WizyClubRN/mobile && \
nano .env && \
npx expo start --dev-client --tunnel
```

---

## 📝 Environment Variables

### Backend (.env)
```env
# Supabase
SUPABASE_URL=https://snpckjrjmwxwgqcqghkl.supabase.co
SUPABASE_KEY=eyJhbGci...

# Cloudflare R2
R2_ACCOUNT_ID=952ab104...
R2_ACCESS_KEY_ID=83698d55...
R2_SECRET_ACCESS_KEY=568611ad...
R2_BUCKET_NAME=wizy-club-staging
R2_PUBLIC_URL=http://pub-426c6d2d3e914041a80d464249339e3c.r2.dev
```

### Mobile (.env)
```env
# API URL (localtunnel)
EXPO_PUBLIC_API_URL=https://xxx.loca.lt
```

---

## 🔒 Güvenlik

- ✅ `.env` dosyaları `.gitignore`'da
- ✅ Credentials GitHub'a gitmez
- ✅ Localtunnel geçici URL (her seferinde değişir)
- ⚠️ Production'da ngrok auth veya Cloudflare Tunnel kullan

---

## 🚨 Önemli Notlar

1. **Localtunnel URL her gün değişir** - `mobile/.env`'yi güncellemeyi unutma!
2. **Backend .env sabittir** - Bir kez kuruldu mu değişmez
3. **3 terminal** gerekli: Backend, Tunnel, Expo
4. **Expo restart** gerekir - .env değişince app'i yeniden başlat

---

## 📞 Yardım

Sorun yaşarsan:
1. Bu dosyayı oku
2. Troubleshooting bölümüne bak
3. Terminal loglarını kontrol et

---

**Son güncelleme:** 2025-12-29
**Branch:** claude/supabase-test-users-GQe5c
