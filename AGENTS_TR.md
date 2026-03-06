# Repository Guidelines

## Proje Yapısı ve Modül Organizasyonu
Bu depo çok paketli bir çalışma alanıdır:
- `backend/`: Node.js API (Express + Supabase + R2); katmanlar `routes/`, `usecases/`, `repositories/`, `services/`, `dto/`, `bootstrap/` altında.
- `mobile/`: Expo React Native uygulaması; rotalar `app/` içinde, katmanlı kod `src/core`, `src/data`, `src/domain`, `src/presentation` altında, varlıklar `assets/` içinde.
- `r2-mcp/`: R2 için MCP yardımcı betikleri.
- `docs/`: mimari, özellik ve operasyon dokümantasyonu.
- `scripts/`: depo genelinde yardımcı script’ler (özellikle ortam değişkeni senkronizasyonu).

## Derleme, Test ve Geliştirme Komutları
Komutları depo kökünden çalıştırın:
- `cp .env.example .env && bash scripts/sync-env.sh all`: `backend/.env` ve `mobile/.env` dosyalarını üretir.
- `npm --prefix backend ci`: backend bağımlılıklarını temiz kurar.
- `npm --prefix backend run start`: backend sunucusunu başlatır.
- `npm --prefix backend run test:all`: Node test runner + Jest testlerini çalıştırır.
- `npm --prefix backend run smoke`: backend smoke testlerini çalıştırır (gizli anahtarlar gerekir).
- `npm --prefix mobile run start`: Expo geliştirme sunucusunu başlatır.
- `npm --prefix mobile run android` / `ios` / `web`: mobil hedefleri çalıştırır.
- `npx --prefix mobile tsc --noEmit`: mobile için strict TypeScript kontrolü yapar.

## Kod Stili ve İsimlendirme Kuralları
- 4 boşluk girintileme ve noktalı virgül ile biten JS/TS ifadeleri kullanın.
- Backend CommonJS (`require/module.exports`), mobile strict TypeScript kullanır.
- Mobile tarafında path alias’larını tercih edin (`@/`, `@core/`, `@domain/`, `@data/`, `@presentation/`).
- İsimlendirme: component/use case/entity dosyaları `PascalCase` (örn. `GetVideoFeedUseCase.ts`), hook’lar `useXxx`, testler `*.test.js` veya `*.test.cjs`.

## Test Rehberi
- Ana test kapsamı `backend/tests` (Node `--test`) ve `backend/tests-jest` (Jest) dizinlerindedir.
- Test dosya adlarını `*.test.js` / `*.test.cjs` formatında tutun.
- PR açmadan önce `npm --prefix backend run test:all` çalıştırın.
- Şu an zorunlu bir coverage eşiği yok; yeni iş mantığını mutlaka regresyon testleriyle ekleyin.

## Commit ve Pull Request Kuralları
- Geçmiş commit’lerde farklı stiller var; tercih edilen önekler: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.
- Commit’leri paket bazında odaklı tutun (`backend`, `mobile`, `r2-mcp`) ve emir kipinde başlık yazın.
- PR içinde şunlar olmalı: kısa özet, bağlı issue/görev, çalıştırılan test komutları ve UI değişikliği varsa ekran görüntüsü/video.
- Backend değişikliklerinde `backend-ci` kontrolünü yerelde doğrulayın (`backend/` içinde `npm run test:all`).

## Güvenlik ve Konfigürasyon İpuçları
- `.env`, kimlik bilgisi JSON dosyaları veya ham anahtarları commit etmeyin.
- Kök `.env` dosyasını tek kaynak olarak kullanın; uygulama `.env` dosyalarını `bash scripts/sync-env.sh all` ile yeniden üretin.
- `r2-mcp/` altındaki kimlik bilgisi/konfigürasyonları hassas kabul edin; paylaşmadan önce temizleyin.
