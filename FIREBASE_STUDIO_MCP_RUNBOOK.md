# Firebase Studio MCP Runbook

Bu doküman, Firebase Studio veya başka bir yeni bulut çalışma ortamında Codex MCP kurulumunu tekrar ayağa kaldırmak içindir.

## Kısa Cevap

Evet, yeni makinede aynı sorun tekrar yaşanabilir.

Sebep:
- MCP kayıtları makine bazlıdır.
- `r2-mcp/.env` repoda tutulmaz, yeniden üretilmelidir.
- MCP server path'i workspace path'ine göre değişebilir.
- Eski `cloudflare` kaydı veya `run-r2-mcp.js` kullanımı handshake hatasına yol açabilir.

## Doğru Hedef Durum

Beklenen MCP kayıtları:
- `openaiDeveloperDocs`
- `r2-local`

Cloudflare/R2 için kullanılacak doğru server:
- `r2-mcp/custom-r2-server.js`

Kullanılmaması gereken eski startup:
- `r2-mcp/run-r2-mcp.js`
- `cloudflare` adlı eski MCP kaydı

## Hata Belirtisi

Şu hata tekrar görülürse:

```text
MCP client for `cloudflare` failed to start
connection closed: initialize response
```

genelde nedenlerden biri şudur:
- eski `cloudflare` kaydı hâlâ aktif
- `r2-mcp/.env` eksik
- MCP config yanlış path gösteriyor
- server `run-r2-mcp.js` üzerinden başlatılıyor

## Kurulum Adımları

1. Kök `.env` dosyasını hazırla.

2. `r2-mcp/.env` üret:

```bash
bash scripts/sync-env.sh r2-mcp
```

3. Gerekli env'lerin dolu olduğunu doğrula:

```bash
cat r2-mcp/.env
```

Beklenen anahtarlar:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

4. MCP server syntax kontrolü:

```bash
node -c r2-mcp/custom-r2-server.js
```

5. Server'ı doğrudan test et:

```bash
node r2-mcp/custom-r2-server.js
```

Beklenen çıktı:

```text
R2 MCP server started.
```

## Codex Config

Bulut ortamında kullanıcı config'inde MCP kaydı şu mantıkta olmalı:

```toml
[mcp_servers.r2-local]
command = "node"
args = ["/absolute/workspace/path/r2-mcp/custom-r2-server.js"]
```

Notlar:
- `args` içindeki path bulunduğun workspace'e göre güncellenmeli.
- Repo içindeki örnek şablon: `.codex/config.template.toml`
- Eğer workspace path'in `/home/user/WizyClubRN` değilse, template'i körlemesine kopyalama.

## Eski Kaydı Temizleme

Eğer config içinde buna benzer bir kayıt varsa:

```toml
[mcp_servers.cloudflare]
command = "node"
args = ["/.../r2-mcp/run-r2-mcp.js"]
```

sil veya şu yapıya çevir:

```toml
[mcp_servers.r2-local]
command = "node"
args = ["/.../r2-mcp/custom-r2-server.js"]
```

## Hızlı Kontrol Listesi

- `cloudflare` adlı MCP kaydı yok
- `r2-local` adlı MCP kaydı var
- kayıt `custom-r2-server.js` işaret ediyor
- `r2-mcp/.env` mevcut
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` dolu
- `node r2-mcp/custom-r2-server.js` başarılı açılıyor

## Bir Dakikalık Kurtarma

Yeni makinede sorun çıkarsa sırasıyla:

```bash
bash scripts/sync-env.sh r2-mcp
node -c r2-mcp/custom-r2-server.js
node r2-mcp/custom-r2-server.js
```

Ardından Codex MCP config'inde:
- eski `cloudflare` kaydını kaldır
- `r2-local` kaydını ekle
- path'i o makinedeki gerçek workspace path'i ile yaz

## Referanslar

- `LOKAL_GECIS_VE_ENV_R2_REHBERI.md`
- `.codex/config.template.toml`
- `r2-mcp/.env.example`
