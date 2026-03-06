# MCP Standardization Guide

Bu repo MCP kurulumunu merkezden yonetir. Hedef, ayni MCP adlarini, ayni server hedeflerini ve ayni setup akisini hem lokal makinede hem de Firebase Studio gibi yeni bulut ortamlarda tekrar kullanmaktir.

## Tek Kaynaklar

Merkezi dosyalar:
- `.codex/mcp-servers.json`
- `scripts/setup-codex-mcp.js`
- `scripts/doctor-codex-mcp.js`
- `.env`

Bu sistemde:
- MCP server listesi repoda tutulur.
- Gerekli credential ve token bilgileri root `.env` dosyasindan okunur.
- `r2-mcp/.env` otomatik uretilir.
- Kullanici seviyesindeki Codex config icine repo tarafindan yonetilen tek bir MCP blogu yazilir.

## Standart MCP Seti

Bu repo icin standart MCP seti iki seviyeye ayrilir.

Core MCPler:
- `openaiDeveloperDocs`
- `filesystem`
- `r2-local`
- `netlify`

Opsiyonel MCPler:
- `github` if `GITHUB_PERSONAL_ACCESS_TOKEN` exists
- `supabase-mcp-server` if `SUPABASE_MCP_ACCESS_TOKEN` exists
- `postgres` if `POSTGRES_MCP_URL` exists

Bu secim bilincli yapildi:
- `filesystem` repo icinde dogrudan dosya okuma ve refactor icin yuksek getirili.
- `github` PR, issue ve remote repo isleri icin gerekli ama token gerektirdigi icin opsiyonel.
- `supabase-mcp-server` mevcut backend ve veri katmani icin birincil DB/Auth aracidir.
- `postgres` dogrudan SQL ve query tuning ihtiyaclari icin ikinci katman olarak sunulur.
- `r2-local` generic Cloudflare MCP yerine repo-ozel ve env-guvenli R2 server'idir.

Simdilik standart sete alinmayanlar:
- `shell`: Codex zaten native shell araci ile geliyor; ayni yetkiyi bir MCP ile tekrar acmak gereksiz.
- `fetch`: resmi referans server'i ek runtime ister; somut bir API otomasyon ihtiyaci olursa eklenmeli.
- `playwright`: repo su an mobile-first; browser E2E ihtiyaci netlestiginde eklenmeli.
- `docker`: mevcut repo akisi container tabanli degil.
- `cloudflare`: eski ve yanlis ad; bunun yerine `r2-local` kullanilir.

## Gerekli Env Anahtarlari

R2 icin zorunlu:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Opsiyonel MCP env anahtarlari:
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `SUPABASE_MCP_ACCESS_TOKEN`
- `POSTGRES_MCP_URL`

Not:
- `SUPABASE_URL` ve `SUPABASE_KEY` uygulama icindir.
- `SUPABASE_MCP_ACCESS_TOKEN` MCP sunucusunu yetkilendirmek icindir.
- `POSTGRES_MCP_URL` uygulama config'i yerine dogrudan DB baglantisi icin kullanilir.

## Yeni Makinede Kurulum

1. Repo kokunde `.env` hazir olsun.

2. Kurulum scriptini calistir:

```bash
node scripts/setup-codex-mcp.js
```

Bu komut:
- `r2-mcp/.env` uretir
- `~/.codex/config.toml` icinde repo tarafindan yonetilen MCP blogunu yazar veya gunceller
- env varsa opsiyonel MCPleri de ayni bloga dahil eder

3. Dogrulama scriptini calistir:

```bash
node scripts/doctor-codex-mcp.js
```

4. Gerekirse aktif kayitlari kontrol et:

```bash
codex mcp list
```

## Kullanici Config Mimarisi

Script, kullanici config'inde sadece yonettigi MCP blogunu gunceller.

Isaretleyiciler:

```toml
# BEGIN WIZYCLUB MANAGED MCP
...
# END WIZYCLUB MANAGED MCP
```

Bu sayede:
- kullanicinin model ve profil ayarlari korunur
- repo MCP ayarlari merkezi kalir
- yeni makinede ayni blok tekrar uretilir

## Cross-Machine Davranisi

Bu sistem su problemleri hedefli olarak cozer:
- eski `cloudflare` adinin kalmasi
- yanlis workspace path kullanilmasi
- `r2-mcp/.env` unutulmasi
- Windows ve Linux icin farkli `npx` komutu gereksinimi
- token gereken MCPlerde env forwarding unutulmasi

Platform secimleri script tarafindan yapilir:
- Windows: `npx.cmd`
- Linux/macOS: `npx`

R2 server path'i otomatik olarak mevcut repo kokunden uretilir.
GitHub MCP gibi stdio serverlarda gerekli env anahtarlari `config.toml` icine forward edilir.

## Sorun Giderme

`doctor-codex-mcp` fail olursa sirayla kontrol et:
- root `.env` var mi
- `r2-mcp/.env` uretilmis mi
- config icinde `# BEGIN WIZYCLUB MANAGED MCP` blogu var mi
- `filesystem` ve `r2-local` kayitlari var mi
- gerekiyorsa `github`, `supabase-mcp-server` ve `postgres` env anahtarlari dolu mu
- config icinde `cloudflare` yerine `r2-local` var mi

Eski hata:

```text
MCP client for `cloudflare` failed to start
connection closed: initialize response
```

Genelde eski kaydin kalmasi veya `r2-mcp/.env` eksikliginden gelir. Yeni setup scripti bu iki durumu standart akisa alir.

## Operasyon Kurali

MCP ekleme veya degistirme bundan sonra su sekilde yapilmali:
1. `.codex/mcp-servers.json` guncellenir
2. gerekiyorsa `.env.example` guncellenir
3. gerekiyorsa `scripts/setup-codex-mcp.js` veya `scripts/doctor-codex-mcp.js` destekleri genisletilir
4. `node scripts/setup-codex-mcp.js` ile yeni blok uretilir
5. `node scripts/doctor-codex-mcp.js` ile dogrulanir

Manuel olarak user config'e MCP satiri yazmak ana yol degildir.
