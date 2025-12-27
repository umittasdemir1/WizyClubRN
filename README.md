# WizyClub (Monorepo)

Bu proje, WizyClub mobil uygulaması ve ilgili backend scriptlerini içeren bir monorepo yapısına sahiptir.

## 📂 Proje Yapısı

*   **`/mobile`**: React Native (Expo) mobil uygulaması. Tüm ön yüz kodları buradadır.
*   **`/backend`**: Supabase veritabanı şemaları, bakım scriptleri ve sunucu taraflı kodlar.
*   **`PROJECT_KNOWLEDGE_BASE.md`**: Proje ile ilgili tüm teknik dokümantasyon ve analizlerin toplandığı bilgi bankası.

## 🚀 Başlangıç

Projeyi geliştirmek için ilgili klasöre gidip komutları çalıştırmanız gerekir.

### Mobil Uygulamayı Başlatma

```bash
cd mobile
npm install  # İlk kurulumda
npx expo start
```

### Backend Scriptlerini Çalıştırma

Backend klasöründeki scriptleri çalıştırmak için:

```bash
cd backend
npm install  # İlk kurulumda
node server.js # Veya ilgili script (örn: node check-env.js)
```

## 📝 Önemli Notlar

*   **Git:** Tüm proje tek bir Git deposu (repository) olarak yönetilir. Kök dizinden commit atabilirsiniz.
*   **Ortam Değişkenleri:** `.env` dosyaları gizlidir. Eğer projeyi yeni çektiyseniz `.env` dosyalarını oluşturmayı unutmayın.
