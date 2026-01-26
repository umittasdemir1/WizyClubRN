# 🚀 WizyClub Backend Kurulum Rehberi

## 🏢 İŞTE (Cloud - Firebase Studio)

### Günlük Çalıştırma (3 Terminal):

**Terminal 1: Backend**
```bash
cd ~/WizyClubRN/backend
npm start
```

**Terminal 2: Ngrok**
```bash
# Binary indir
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz

# Aç
tar xvzf ngrok-v3-stable-linux-amd64.tgz

# Çalıştır
./ngrok http 3000
```

**Terminal 3: Mobile**
```bash
cd ~/WizyClubRN/mobile
nano .env
# EXPO_PUBLIC_API_URL=<NGROK_URL_BURAYA>
# Kaydet: CTRL+X, Y, Enter

npx expo start --dev-client --tunnel

# Baseline loglarını otomatik yakalamak için:
npm run start:devclient:baseline -- --tunnel --clear
```

---

## 🏠 EVDE (Kendi PC)

### Günlük Çalıştırma (2 Terminal):

**Terminal 1: Backend**
```bash
cd backend
npm start
```

**Terminal 2: Mobile**
```bash
cd mobile
nano .env
# EXPO_PUBLIC_API_URL=http://192.168.0.138:3000
# (Kendi local IP'ni kullan)

npx expo start --dev-client
# Tunnel yok!

# Baseline loglarını otomatik yakalamak için:
npm run start:devclient:baseline -- --clear
```

---

## ⚙️ Konfigürasyon

### backend/.env (Her Yerde Aynı)
```env
SUPABASE_URL=https://snpckjrjmwxwgqcqghkl.supabase.co
SUPABASE_KEY=eyJhbGci...

R2_ACCOUNT_ID=952ab104...
R2_ACCESS_KEY_ID=83698d55...
R2_SECRET_ACCESS_KEY=568611ad...
R2_BUCKET_NAME=wizyclub-assets
R2_PUBLIC_URL=https://wizy-r2-proxy.tasdemir-umit.workers.dev
```

**⚠️ ÖNEMLİ:** `R2_PUBLIC_URL` worker URL olmalı!

---

### mobile/.env (Her Ortamda Farklı)

**İşte:**
```env
EXPO_PUBLIC_API_URL=https://abc-xyz.ngrok-free.app
```

**Evde:**
```env
EXPO_PUBLIC_API_URL=http://192.168.0.138:3000
```

---

## 🔧 Sorun Giderme

### Backend başlamıyor
```bash
# .env dosyasını kontrol et
cat ~/WizyClubRN/backend/.env
```

### App backend'e bağlanamıyor
```bash
# mobile/.env doğru mu?
cat ~/WizyClubRN/mobile/.env

# Expo restart
CTRL+C, tekrar başlat
```

### Avatar upload çalışmıyor
```bash
# backend/.env'de R2_PUBLIC_URL worker URL mi?
grep R2_PUBLIC_URL ~/WizyClubRN/backend/.env

# Şu olmalı:
# R2_PUBLIC_URL=https://wizy-r2-proxy.tasdemir-umit.workers.dev
```

---

## 📝 Özet

**İşte:** Backend + Ngrok + Expo (3 terminal)
**Evde:** Backend + Expo (2 terminal)

**mobile/.env** → Her gün değişir (ngrok URL)
**backend/.env** → Sabit kalır (worker URL)

---

**Son güncelleme:** 2025-12-29
