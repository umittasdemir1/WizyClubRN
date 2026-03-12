# Root MCP ve Skill Master Rehberi

Son güncelleme: 2026-03-12

Bu dosya, root altındaki MCP ve skill rehberlerinin kanonik özetidir. Amaç tek dosyada şu sorulara cevap vermektir:
- Şu an son durumumuz ne?
- Evde Windows lokal makinede ne çalışmalı?
- Firebase Studio cloud workspace içinde ne çalışmalı?
- Hangi MCP ne işe yarar, ne ister, hangi ortamda nasıl açılır?
- Hangi skill ne zaman kullanılmalı?

Bu dosya özet ve operasyon odaklıdır. Teknik kaynaklar:
- MCP manifest: `.codex/mcp-servers.json`
- Shell/MCP bootstrap: `scripts/setup-codex-mcp.js`, `scripts/doctor-codex-mcp.js`, `scripts/bootstrap-codex-mcp.js`
- Shell integration: `scripts/install-codex-shell-integration.js`
- Ortam kaynağı: root `.env` ve `.env.example`
- Skill kaynakları: `.codex/skills/<skill>/SKILL.md`

## 1. Son Durum

- Repo artık MCP tarafında merkezi yönetiliyor; kullanıcı config'i manuel kopyalanmıyor.
- 2026-03-12 doctor çıktısıyla doğrulanan managed MCP seti:
  `openaiDeveloperDocs`, `filesystem`, `r2-local`, `github`, `supabase-mcp-server`, `netlify`, `render`, `doppler`, `bookmarks-local`
- Bu workspace doğrulamasında pasif kalan tek optional MCP:
  `postgres` çünkü `POSTGRES_MCP_URL` yok.
- `netlify` için startup timeout `90` saniyeye çıkarıldı.
- `render` resmi hosted MCP olarak eklendi.
- `netlify` resmi MCP olarak token bazlı açılıyor.
- Firebase Studio / Linux için aynı managed akış destekleniyor; user-level `~/.codex/config.toml` kopyalamak yok.
- 2026-03-12 local doctor doğrulaması temiz:
  Codex config OK, `r2-mcp/.env` OK.
- Build, smoke ve deploy gibi çalışma zamanı durumları bu master dosyada kalıcı gerçek olarak tutulmaz; gerektiğinde ilgili komut veya servis panelinden yeniden doğrulanır.

## 2. Kanonik Kural

- Tek kaynak root `.env` dosyasıdır.
- `backend/.env`, `mobile/.env`, `r2-mcp/.env` türev dosyalardır.
- MCP tanımları yalnızca `.codex/mcp-servers.json` içinde tutulur.
- Kullanıcı seviyesindeki Codex config manuel düzenlenmez; managed block script ile üretilir.
- Yeni makinede dosya kopyalamak yerine bootstrap yeniden çalıştırılır.
- Skill kullanımı için kısa özet burada vardır; detay gerektiğinde ilgili `SKILL.md` dosyası açılır.

## 3. MCP Matrisi

| MCP | Tür | Aktivasyon | Şu Anki Durum | Windows Lokal | Firebase Studio / Linux | Ana Amaç | Not |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `openaiDeveloperDocs` | URL | Her zaman aktif | Enabled | Doğrudan çalışır | Doğrudan çalışır | OpenAI resmi dokümantasyon, endpoint, örnek, migration | Çekirdek MCP |
| `filesystem` | Command | Her zaman aktif | Enabled | Workspace içinde dosya erişimi | Workspace içinde dosya erişimi | Okuma, yazma, listeleme | Çekirdek MCP |
| `r2-local` | Command | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Enabled | `r2-mcp/custom-r2-server.js` ile çalışır | Aynı şekilde çalışır | Bucket ve obje kontrolü | `r2-mcp/.env` bootstrap ile üretilir |
| `github` | Command | `GITHUB_PERSONAL_ACCESS_TOKEN` | Enabled | Wrapper ile aktif | Aynı env verilirse aktif | PR, issue, repo yönetimi | Optional |
| `supabase-mcp-server` | Command | `SUPABASE_MCP_ACCESS_TOKEN` | Enabled | Wrapper ile aktif | Aynı env verilirse aktif | Supabase yönetimi, DB/admin işlemleri | Optional |
| `postgres` | Command | `POSTGRES_MCP_URL` | Skipped | URL verilirse aktif | URL verilirse aktif | Doğrudan SQL ve schema inceleme | Şu an kapalı |
| `netlify` | Command | `NETLIFY_MCP_ENABLED=1` ve `NETLIFY_PERSONAL_ACCESS_TOKEN` | Enabled | `@netlify/mcp` ile aktif | Aynı env verilirse aktif | Netlify proje ve deploy yönetimi | Timeout 90 sn |
| `render` | URL | `RENDER_API_KEY` | Enabled | Hosted MCP aktif | Aynı env verilirse aktif | Render deploy ve servis yönetimi | URL: `https://mcp.render.com/mcp` |
| `doppler` | Command | `DOPPLER_TOKEN` | Enabled | Wrapper ile aktif | Aynı env verilirse aktif | Secret yönetimi | Env sync ile karıştırılmamalı |
| `bookmarks-local` | Command | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Enabled | Yerel bookmark arama akışı | Aynı env ve veri varsa aktif | X bookmark arama | Supabase verisi gerekir |

## 4. Skill Matrisi

Not:
- İlk 16 skill repo-local.
- Son 2 skill sistem/global skill.
- Detay gerektiğinde ilgili `SKILL.md` açılır; burası operasyonel kılavuzdur.

| Skill | Kategori | Ne İşe Yarar | Ne Zaman Kullanılır | Temel Gereksinim |
| --- | --- | --- | --- | --- |
| `backend-guardrails` | Backend | Backend refactor ve API değişikliklerinde katman sınırlarını korur | `backend/` içinde route/usecase/service değişiyorsa | `npm --prefix backend run test:all` |
| `codex-mcp-cross-env` | MCP / DevOps | Windows ve Firebase Studio arasında MCP bootstrap/onarım/doğrulama yapar | Yeni makine, yeni workspace, bozuk MCP durumu | Root `.env`, bootstrap scriptleri |
| `docs-navigator` | Docs | `docs/` içinde hedefli belge araması yapar | Büyük dokümantasyon havuzunda doğru dosyayı bulmak için | `docs/` içeriği |
| `doppler-env-sync` | Env | Doppler'dan root `.env` çekip tüm paket env dosyalarını üretir | Çok makine arasında aynı secret seti gerektiğinde | `DOPPLER_TOKEN` |
| `env-sync-release` | Env | Root `.env` içeriğini paket env'lerine dağıtır | Doppler dışı local env değişikliklerinde | `scripts/sync-env.sh all` |
| `gh-address-comments` | GitHub | Açık PR yorumlarını ele alır | Review yorumlarını kapatmak için | `gh` auth |
| `gh-fix-ci` | CI | GitHub Actions hata analizi yapar | PR check fail olduğunda | `gh` auth, CI log erişimi |
| `mcp-researcher` | MCP | Yeni MCP araştırır, önerir, kaydeder | Yeni MCP eklemek gerektiğinde | `.codex/mcp-servers.json`, katalog scriptleri |
| `mobile-feed-perf` | Mobile Perf | Feed scroll/render/video performansını optimize eder | `mobile/` içinde perf sorunu olduğunda | Mobile type-check ve perf ölçümü |
| `openai-docs` | OpenAI | OpenAI resmi docs üzerinden güncel teknik yanıt üretir | OpenAI API, model, migration işleri | `openaiDeveloperDocs` MCP |
| `r2-mcp-ops` | Storage | R2 MCP preflight ve güvenli operasyon akışı sağlar | Bucket/object operasyonlarında | R2 env'leri |
| `security-best-practices` | Security | Dil/framework bazlı güvenlik review yapar | Kod güvenlik incelemesi istenirse | Destekli dil: JS/TS, Python, Go |
| `security-threat-model` | Security | Repo veya path için threat model üretir | Abuse path / trust boundary analizi istendiğinde | Path ve mimari bağlamı |
| `skills-researcher` | Skills | Yeni üçüncü parti skill keşfi yapar | Mevcut skill seti yetersizse | GitHub katalog scriptleri |
| `supabase-rpc-contract` | Backend / Mobile | Mobile ile backend RPC sözleşmesini doğrular | RPC isim/parametreleri değiştiğinde | Backend verify komutları |
| `telegram-progress-reporter` | Reporting | Codex oturum ilerlemesini Telegram'a yollar | Uzun oturumlarda checkpoint/test sonucu göndermek için | `CODEX_TELEGRAM_*` env'leri |
| `skill-creator` | System | Yeni skill tasarlamaya rehberlik eder | Yeni bir özel skill yazılacaksa | Sistem skill'i |
| `skill-installer` | System | Harici veya curated skill kurar | Yeni skill repoya alınacaksa | Sistem skill'i |

## 5. Evde Windows Lokal Akışı

Bu makinede hedef durum:
- Root `.env` gerçek değerlerle dolu.
- `r2-mcp/.env` üretilmiş.
- Managed Codex MCP block yazılmış.
- Shell integration kurulmuş.
- `codex mcp list` beklenen MCP'leri gösteriyor.

Önerilen akış:

1. Root `.env` hazır değilse oluştur:
```powershell
Copy-Item .env.example .env
```

2. Doppler kullanıyorsan env'i çek:
```powershell
node scripts/update-env-from-doppler.js
```

3. Shell integration kur:
```powershell
node scripts/install-codex-shell-integration.js
```

4. MCP bootstrap:
```powershell
node scripts/bootstrap-codex-mcp.js
```

5. Sağlık kontrolü:
```powershell
node scripts/doctor-codex-mcp.js
cmd /d /s /c "codex mcp list"
```

6. İsteğe bağlı wrapper kullanımları:
- Sade MCP launcher:
  `scripts\codex-with-mcp.cmd`
- Telegram bildirimli launcher:
  `scripts\codex-with-telegram.cmd`

7. PowerShell profil sorunu varsa:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Windows notları:
- `cmd.exe` için kalıcı alias yazılmaz; doğrudan wrapper çağrılır.
- PowerShell veya Git Bash tercih edilir.
- Netlify ve Render gibi yeni MCP eklemelerinden sonra Codex yeniden başlatmak en temiz yoldur.

## 6. Firebase Studio / Cloud Workspace Akışı

Bu ortamda ana kural:
- Windows'taki `~/.codex/config.toml` kopyalanmaz.
- Aynı repo içinden bootstrap yeniden üretilir.

Önerilen akış:

1. Repo clone veya workspace aç.

2. Root `.env` için iki yol var:
- Tam env elinde varsa `.env` oluştur.
- Elinde yalnızca Doppler bootstrap anahtarları varsa minimum `.env` ile başla:
  `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG`

3. Gerekirse Doppler'dan tam env çek:
```bash
node scripts/update-env-from-doppler.js
```

4. Shell integration kur:
```bash
node scripts/install-codex-shell-integration.js
```

5. Bootstrap ve doğrulama:
```bash
node scripts/bootstrap-codex-mcp.js
node scripts/doctor-codex-mcp.js
codex mcp list
```

6. Wrapper kullanımları:
- MCP ile aç:
  `bash scripts/codex-with-mcp.sh`
- Telegram ile aç:
  `bash scripts/codex-with-telegram.sh`

Firebase Studio notları:
- `r2-local` için yine root env şarttır.
- Optional MCP'ler yalnızca ilgili env geldiyse aktif olur.
- Netlify ve Render token'ları cloud workspace'e de taşınacaksa en güvenli yol Doppler'dır.

## 7. Her Ortamda Ne Olmalı?

| Kalem | Windows Lokal | Firebase Studio / Cloud |
| --- | --- | --- |
| Root `.env` | Gerçek değerlerle dolu olmalı | Gerçek değerlerle dolu veya Doppler ile çekilmiş olmalı |
| `r2-mcp/.env` | Bootstrap sonrası otomatik oluşmalı | Bootstrap sonrası otomatik oluşmalı |
| Managed MCP block | `setup`/`bootstrap` sonrası oluşmalı | `setup`/`bootstrap` sonrası oluşmalı |
| Shell integration | Tercihen kurulu olmalı | Tercihen kurulu olmalı |
| `codex mcp list` | Çekirdek MCP'leri göstermeli | Çekirdek MCP'leri göstermeli |
| Optional MCP'ler | İlgili env varsa aktif | Aynı env verilirse aktif |
| Telegram wrapper | İsteğe bağlı | İsteğe bağlı |

## 8. Sık Operasyonlar

### Yeni secret veya token eklendi

Doğrudan root `.env` içine yazdıysan:
```bash
node scripts/setup-codex-mcp.js
node scripts/doctor-codex-mcp.js
```

Doppler'a yazdıysan:
```bash
node scripts/update-env-from-doppler.js
node scripts/bootstrap-codex-mcp.js
node scripts/doctor-codex-mcp.js
```

### Yeni MCP eklendi veya değiştirildi

Sıra değişmez:
1. `.codex/mcp-servers.json`
2. `.env.example`
3. Gerekirse root `.env`
4. `node scripts/setup-codex-mcp.js`
5. `node scripts/doctor-codex-mcp.js`
6. `node scripts/bootstrap-codex-mcp.js --check-only`
7. `codex mcp list`

### Netlify timeout aldı

Yapılacak:
- `.codex/mcp-servers.json` içindeki `startupTimeoutSec` yükseltilir.
- `setup`, `doctor`, `bootstrap` tekrar çalıştırılır.
- Gerekirse Codex yeniden başlatılır.

### `codex mcp list` eksik görünüyorsa

Kontrol et:
- Root `.env` var mı?
- Gerekli env dolu mu?
- `node scripts/doctor-codex-mcp.js` geçiyor mu?
- Yeni eklenen MCP için restart gerekiyor mu?

## 9. 2026-03-12 Workspace Doğrulaması

- `node scripts/doctor-codex-mcp.js` geçti.
- Codex config: OK (`/home/user/.codex/config.toml`)
- R2 env: OK (`/home/user/WizyClubRN/r2-mcp/.env`)
- Managed MCP servers:
  `openaiDeveloperDocs`, `filesystem`, `r2-local`, `github`, `supabase-mcp-server`, `netlify`, `render`, `doppler`, `bookmarks-local`
- Skipped optional MCP:
  `postgres` (`POSTGRES_MCP_URL` eksik)
- Bu bölüm yalnızca repo içinden doğrulanabilen MCP durumunu özetler; build, smoke, deploy ve UI freeze gibi akışlar ayrıca doğrulanmalıdır.

## 10. Arşiv İndeksi

Eski root rehberleri artık şu klasör altında tutulur:
- `docs/archive/root-mcp-skills-guides/`

Arşiv linkleri:
- [MCP_SKILLS_INDEX.md](docs/archive/root-mcp-skills-guides/MCP_SKILLS_INDEX.md)
- [MCP_VE_SKILL_REHBERI_TR.md](docs/archive/root-mcp-skills-guides/MCP_VE_SKILL_REHBERI_TR.md)
- [MCP_AND_SKILLS_GUIDE_EN.md](docs/archive/root-mcp-skills-guides/MCP_AND_SKILLS_GUIDE_EN.md)
- [MCP_STANDARDIZATION_GUIDE.md](docs/archive/root-mcp-skills-guides/MCP_STANDARDIZATION_GUIDE.md)
- [CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md](docs/archive/root-mcp-skills-guides/CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md)
- [LOKAL_GECIS_VE_ENV_R2_REHBERI.md](docs/archive/root-mcp-skills-guides/LOKAL_GECIS_VE_ENV_R2_REHBERI.md)
- [BOOKMARKS_MCP_LOCAL_SETUP.md](docs/archive/root-mcp-skills-guides/BOOKMARKS_MCP_LOCAL_SETUP.md)

Kural:
- Güncel operasyon kararı için önce bu master dosyaya bakılır.
- Arşiv dosyaları tarihsel detay ve eski bağlam için tutulur.
- Derin detay gerektiğinde ilgili arşiv belgesi veya ilgili `SKILL.md` açılır.
