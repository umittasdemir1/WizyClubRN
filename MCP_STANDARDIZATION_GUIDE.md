# MCP Standardization Guide

Bu repo artik MCP kurulumunu merkezden yonetir. Amac, ayni MCP adlarini, ayni server hedeflerini ve ayni setup akisini hem lokal makinede hem de Firebase Studio gibi yeni bulut ortamlarda tekrar kullanmaktir.

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
- Kullanici seviyesindeki Codex config icine repo tarafindan yonetilen bir MCP blogu yazilir.

## Standart MCP Seti

Bu mimaride standart MCP seti:
- `openaiDeveloperDocs`
- `r2-local`
- `supabase-mcp-server` if `SUPABASE_MCP_ACCESS_TOKEN` exists
- `netlify`

Artik kullanilmamasi gereken eski ad:
- `cloudflare`

Artik kullanilmamasi gereken eski startup:
- `r2-mcp/run-r2-mcp.js`

Dogru R2 server:
- `r2-mcp/custom-r2-server.js`

## Gerekli Env Anahtarlari

R2 icin zorunlu:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

Opsiyonel ama Supabase MCP icin gerekli:
- `SUPABASE_MCP_ACCESS_TOKEN`

Not:
- `SUPABASE_URL` ve `SUPABASE_KEY` uygulama icindir.
- `SUPABASE_MCP_ACCESS_TOKEN` MCP sunucusunu yetkilendirmek icindir.

## Yeni Makinede Kurulum

1. Repo kokunde `.env` hazir olsun.

2. Kurulum scriptini calistir:

```bash
node scripts/setup-codex-mcp.js
```

Bu komut:
- `r2-mcp/.env` uretir
- `~/.codex/config.toml` icinde repo tarafindan yonetilen MCP blogunu yazar veya gunceller

3. Dogrulama scriptini calistir:

```bash
node scripts/doctor-codex-mcp.js
```

4. Gerekirse R2 server'i syntax olarak test et:

```bash
node -c r2-mcp/custom-r2-server.js
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
- kullanicinin model/secim ayarlari korunur
- repo MCP ayarlari merkezi kalir
- yeni makinede ayni blok tekrar uretilebilir

## Cross-Machine Davranisi

Bu sistem su problemleri hedefli olarak cozer:
- eski `cloudflare` adinin kalmasi
- yanlis workspace path kullanilmasi
- `r2-mcp/.env` unutulmasi
- Windows ve Linux icin farkli `npx` komutu gereksinimi

Platform secimleri script tarafindan yapilir:
- Windows: `npx.cmd`
- Linux/macOS: `npx`

R2 server path'i otomatik olarak mevcut repo kokunden uretilir.

## Firebase Studio Notu

Firebase Studio gibi yeni bulut ortamlarda sorun tekrar yasanmamasi icin her yeni workspace olusumunda su iki komutu standart onboarding adimi yap:

```bash
node scripts/setup-codex-mcp.js
node scripts/doctor-codex-mcp.js
```

## Sorun Giderme

`doctor-codex-mcp` fail olursa sirayla kontrol et:
- root `.env` var mi
- `SUPABASE_MCP_ACCESS_TOKEN` gerekiyorsa dolu mu
- `r2-mcp/.env` uretilmis mi
- config icinde `# BEGIN WIZYCLUB MANAGED MCP` blogu var mi
- config icinde `cloudflare` yerine `r2-local` var mi

Eski hata:

```text
MCP client for `cloudflare` failed to start
connection closed: initialize response
```

Genelde eski kaydin kalmasi veya `r2-mcp/.env` eksikliginden gelir. Yeni setup scripti bu iki durumu standart akisa alir.

## Operasyon Kuralı

MCP ekleme veya degistirme bundan sonra su sekilde yapilmali:
1. `.codex/mcp-servers.json` guncellenir
2. gerekiyorsa `.env.example` guncellenir
3. `node scripts/setup-codex-mcp.js` ile yeni blok uretilir
4. `node scripts/doctor-codex-mcp.js` ile dogrulanir

Manuel olarak user config'e MCP satiri yazmak artik ana yol degildir.
