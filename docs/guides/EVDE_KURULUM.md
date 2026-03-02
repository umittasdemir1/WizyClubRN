# Evde Hızlı Kurulum (Basit)

Bu proje evde sorunsuz açılır. Sadece gizli dosyaları elle koyman gerekir.

## 1) Projeyi çek
```bash
git pull
```

## 2) Root `.env` dosyasını oluştur
```bash
cp .env.example .env
```

## 3) `.env` içine gerçek keyleri yaz
Minimum gerekli olanlar:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `EXPO_PUBLIC_API_URL`

STT kullanacaksan ekle:
- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json`

## 4) (Opsiyonel - STT) Google dosyasını koy
`backend/google-credentials.json` dosyasını kendi bilgisayarına ekle.

## 5) Env dosyalarını üret
```bash
bash scripts/sync-env.sh all
```

## 6) Paketleri kur
```bash
cd backend && npm install
cd ../mobile && npm install
cd ..
```

## 7) Çalıştır
Backend:
```bash
bash scripts/backend-start.sh
```

Mobile (ev modu):
```bash
cd mobile
bash -lc '../scripts/sync-mobile-env.sh home && npx expo start --dev-client --clear'
```

Mobile (iş/ngrok modu):
```bash
cd mobile
bash -lc '../scripts/sync-mobile-env.sh work && npx expo start --dev-client --tunnel --clear'
```

