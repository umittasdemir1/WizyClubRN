# Bulut Ortamından Eve Geçiş Rehberi (Firebase Studio -> Local)

## 1) Kısa Cevap: Yapılacak Bir Şey Kaldı mı?
Evet, yalnızca lokal makinede ortam hazırlığı ve doğrulama adımları kaldı.
Kod tarafındaki mimari kurulum tamamlandı.

## 2) Bu Repo’da Tamamlananlar ve Ne İşe Yarıyor
- `.env` merkezi kaynak olarak köke taşındı ve standart hale getirildi.
- `scripts/sync-env.sh all` ile kök `.env` dosyasından `backend/.env`, `mobile/.env` ve `r2-mcp/.env` üretiliyor.
- `r2-mcp/custom-r2-server.js` hardcoded credential yerine env tabanlı çalışacak şekilde güvenli hale getirildi.
- Paket bazlı ajan kuralları eklendi:
  - `backend/AGENTS.md`
  - `mobile/AGENTS.md`
  - `r2-mcp/AGENTS.md`
- Proje içi skill mimarisi kuruldu: `.codex/skills/`
- OpenAI curated skill’lerin kritik seti projeye vendor edildi.
- Codex MCP kayıtları artık repodan merkezi olarak üretiliyor.
- Tek kaynak: `.codex/mcp-servers.json`
- Kurulum scripti: `node scripts/setup-codex-mcp.js`
- Doğrulama scripti: `node scripts/doctor-codex-mcp.js`

## 3) Evde Local Makinede Yapılacaklar (Adım Adım)
1. Depoyu güncelle:
```bash
git pull origin main
```

2. Kök `.env` dosyasını hazırla:
```bash
cp .env.example .env
```
`.env` içine gerçek değerleri gir.

3. Uygulama `.env` dosyalarını üret:
```bash
bash scripts/sync-env.sh all
```

4. Bağımlılıkları kur:
```bash
npm --prefix backend ci
npm --prefix mobile ci
npm --prefix r2-mcp ci
```

5. Zorunlu doğrulamaları çalıştır:
```bash
npm --prefix backend run test:all
npm --prefix backend run verify:mobile-rpcs
npx --prefix mobile tsc --noEmit -p mobile/tsconfig.json
node -c r2-mcp/custom-r2-server.js
```

6. Merkezi MCP kurulumunu uygula:
```bash
node scripts/setup-codex-mcp.js
node scripts/doctor-codex-mcp.js
```

7. MCP kurulumunu doğrula:
```bash
codex mcp list
```
Beklenen aktif kayıtlar:
- `openaiDeveloperDocs`
- `filesystem`
- `r2-local`
- `github` (yalnızca `GITHUB_PERSONAL_ACCESS_TOKEN` varsa)
- `supabase-mcp-server` (yalnızca `SUPABASE_MCP_ACCESS_TOKEN` varsa)
- `postgres` (yalnızca `POSTGRES_MCP_URL` varsa)
- `netlify` (yalnızca `NETLIFY_MCP_ENABLED` varsa)

Not:
- Artık önerilen yol `codex mcp add ...` ile tek tek kayıt açmak değil.
- Repo standardı `node scripts/setup-codex-mcp.js` ile managed block üretmektir.

## 4) R2 Tarafı (Önemli)
`r2-mcp` artık şu env değişkenlerini zorunlu ister:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Bu değişkenler kök `.env` içinde olmalı. Gerekirse `r2-mcp/.env.example` dosyasını referans al.

## 5) Güvenlik Notu
Geçmişte repoda düz metin R2/Cloudflare secret değerleri bulunduğu için:
1. R2 access key’lerini rotate et.
2. Varsa Cloudflare API token’larını rotate et.
3. Yeni değerleri sadece kök `.env` dosyasına yaz.

## 6) Codex Profil Kullanımı (Local)
Önerilen profiller:
- Planlama: `codex --profile plan`
- Uygulama: `codex --profile implement`
- İnceleme: `codex --profile review`
- Otomasyon/CI: `codex exec --profile ci "...task..."`

Projeye ait örnek şablon:
- `.codex/config.template.toml`

## 7) Hızlı Sorun Giderme
- `codex mcp list` boşsa: MCP kayıtlarını tekrar ekle.
- `r2-local` çalışmıyorsa: `node scripts/setup-codex-mcp.js` çalıştır, sonra `node scripts/doctor-codex-mcp.js` ile doğrula.
- `github` görünmüyorsa: kök `.env` içine `GITHUB_PERSONAL_ACCESS_TOKEN` ekle, sonra setup/doctor akışını tekrar çalıştır.
- `postgres` görünmüyorsa: kök `.env` içine `POSTGRES_MCP_URL` ekle, sonra setup/doctor akışını tekrar çalıştır.
- `sync-env` başarısızsa: kök `.env` içindeki zorunlu anahtarları tamamla.
