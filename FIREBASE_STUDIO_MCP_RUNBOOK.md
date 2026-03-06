# Firebase Studio MCP Runbook

Bu dokuman, Firebase Studio veya baska bir yeni bulut calisma ortaminda Codex MCP kurulumunu standart sekilde yeniden ayaga kaldirmak icindir.

## Kisa Cevap

Evet, yeni makinede ayni sorun tekrar yasanabilir.

Sebep:
- MCP kayitlari makine bazlidir.
- `r2-mcp/.env` repoda tutulmaz, yeniden uretilmelidir.
- MCP server path'i workspace path'ine gore degisir.
- Eski `cloudflare` kaydi veya eski startup scripti handshake hatasina yol acabilir.

## Dogru Hedef Durum

Beklenen core MCP kayitlari:
- `openaiDeveloperDocs`
- `filesystem`
- `r2-local`
- `netlify`

Env varsa aktif olabilecek opsiyoneller:
- `github`
- `supabase-mcp-server`
- `postgres`

R2 icin kullanilacak dogru server:
- `r2-mcp/custom-r2-server.js`

Kullanilmamasi gerekenler:
- `r2-mcp/run-r2-mcp.js`
- `cloudflare` adli eski MCP kaydi

## Hata Belirtisi

Su hata tekrar gorulurse:

```text
MCP client for `cloudflare` failed to start
connection closed: initialize response
```

genelde nedenlerden biri sudur:
- eski `cloudflare` kaydi hala aktif
- `r2-mcp/.env` eksik
- MCP config yanlis path gosteriyor
- server eski startup uzerinden baslatiliyor

## Kurulum Adimlari

1. Kok `.env` dosyasini hazirla.

2. Standart setup akisini calistir:

```bash
node scripts/setup-codex-mcp.js
node scripts/doctor-codex-mcp.js
```

3. Gerekirse aktif MCP kayitlarini listele:

```bash
codex mcp list
```

4. R2 server syntax kontrolu:

```bash
node -c r2-mcp/custom-r2-server.js
```

## Codex Config

Bulut ortaminda kullanici config'i manuel satir ekleme ile degil, repo tarafindan yonetilen managed block ile guncellenmelidir.

Isaretleyiciler:

```toml
# BEGIN WIZYCLUB MANAGED MCP
...
# END WIZYCLUB MANAGED MCP
```

Notlar:
- workspace path setup scripti tarafindan otomatik yazilir
- GitHub gibi token gereken serverlarda env forwarding setup scripti tarafindan yazilir
- repo icindeki ornek sekil `.codex/config.template.toml` dosyasindadir

## Hizli Kontrol Listesi

- `cloudflare` adli MCP kaydi yok
- `filesystem` adli MCP kaydi var
- `r2-local` adli MCP kaydi var
- kayit `custom-r2-server.js` isaret ediyor
- `r2-mcp/.env` mevcut
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` dolu
- gerekiyorsa `GITHUB_PERSONAL_ACCESS_TOKEN`, `SUPABASE_MCP_ACCESS_TOKEN`, `POSTGRES_MCP_URL` tanimli

## Bir Dakikalik Kurtarma

Yeni makinede sorun cikarsa sirasiyla:

```bash
node scripts/setup-codex-mcp.js
node scripts/doctor-codex-mcp.js
node -c r2-mcp/custom-r2-server.js
```

Ardindan `codex mcp list` ile kayitlari kontrol et.

## Referanslar

- `MCP_STANDARDIZATION_GUIDE.md`
- `LOKAL_GECIS_VE_ENV_R2_REHBERI.md`
- `.codex/config.template.toml`
