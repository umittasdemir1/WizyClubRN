# MCP ve Skill Rehberi (WizyClubRN)

Son guncelleme: 2026-03-10

Indeks: [MCP_SKILLS_INDEX.md](./MCP_SKILLS_INDEX.md) | English: [MCP_AND_SKILLS_GUIDE_EN.md](./MCP_AND_SKILLS_GUIDE_EN.md) | Kurulum: [CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md](./CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md)

Bu rehber, repodaki tum MCP entegrasyonlari ve Codex skill'lerini guncel haliyle anlatir.
Manifest dosyasi: `.codex/mcp-servers.json`
Skill dizini: `.codex/skills/`

---

## 1) MCP Entegrasyonlari

### Her Zaman Aktif (3 adet)

#### openaiDeveloperDocs
OpenAI resmi developer dokumantasyonuna erisim.
- Tur: URL tabanli (`https://developers.openai.com/mcp`)
- Araclar: `search_openai_docs`, `list_openai_docs`, `fetch_openai_doc`, `list_api_endpoints`, `get_openapi_spec`
- Kullanim: Model secimi, API sartnameleri, migration notlari, ornek kodlar.

#### filesystem
Workspace-scoped dosya sistemi erisimi.
- Tur: Command (`@modelcontextprotocol/server-filesystem`)
- Araclar: Dosya okuma, yazma, listeleme (workspace sinirli).
- Kullanim: Agent'larin repo icindeki dosyalara guvenli erisimi.

#### r2-local
Cloudflare R2 storage islemleri.
- Tur: Command (`r2-mcp/custom-r2-server.js`)
- Araclar: `list_buckets`, `list_objects`
- Gerekli env: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- Kullanim: Bucket dogrulama, obje yapisi kontrolu, upload hedef kontrolu.

### Opsiyonel (6 adet - env varsa aktif)

#### github
GitHub API erisimi.
- Tur: Command (lokal wrapper: `scripts/mcp/github-wrapper.js`)
- Gerekli env: `GITHUB_PERSONAL_ACCESS_TOKEN`
- Kullanim: PR, issue, repo islemleri, kod incelemeleri.

#### supabase-mcp-server
Supabase yonetim API erisimi.
- Tur: Command (lokal wrapper: `scripts/mcp/supabase-wrapper.js`)
- Gerekli env: `SUPABASE_MCP_ACCESS_TOKEN`
- Kullanim: Supabase projesi yonetimi, veritabani islemleri.

#### postgres
Dogrudan PostgreSQL veritabani erisimi.
- Tur: Command (`@modelcontextprotocol/server-postgres`)
- Gerekli env: `POSTGRES_MCP_URL`
- Kullanim: SQL sorgu, sema inceleme, veri analizi.

#### netlify
Netlify platform erisimi.
- Tur: Command (`@netlify/mcp`)
- Gerekli env: `NETLIFY_MCP_ENABLED`
- Kullanim: Deploy durumu, site yonetimi.

#### doppler
Doppler secret yonetimi API erisimi.
- Tur: Command (lokal wrapper: `scripts/mcp/doppler-wrapper.js`)
- Gerekli env: `DOPPLER_TOKEN`
- Kullanim: Secret listeleme, proje/config yonetimi.
- Not: Bu, Doppler API tool'larina erisim icin. `.env` sync akisi icin ayrica `doppler-env-sync` skill'i var.

#### bookmarks-local
Supabase-backed bookmark arama ve erisim MCP'si.
- Tur: Command (`bookmarks-mcp/server.js`)
- Gerekli env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Kullanim: Bookmark arama, kayit listeleme, X/Twitter bookmark verilerine erisim.

---

## 2) Skill'ler (16 adet)

Skill'ler tekrar kullanilabilir is akislaridir. `use <skill-adi>` veya eslesen bir gorev isteyerek tetiklenir.

### Backend & API

| Skill | Amac | Ornek Istek |
|---|---|---|
| `backend-guardrails` | Backend refactor/API degisikliklerinde katman siniri ve test disiplini uygular. Script: `npm --prefix backend run test:all` | "backend-guardrails kullanip feed.js dosyasini refactor et." |
| `supabase-rpc-contract` | Mobile-backend RPC sozlesme uyumlulugunu dogrular. Script: `npm --prefix backend run verify:mobile-rpcs` | "supabase-rpc-contract ile feed datasource RPC parametrelerini dogrula." |

### CI & GitHub

| Skill | Amac | Ornek Istek |
|---|---|---|
| `gh-fix-ci` | Basarisiz GitHub Actions check'lerini analiz eder, log cekerip cozum onerir. Python scripti: `scripts/inspect_pr_checks.py` | "gh-fix-ci ile backend-ci neden fail oldu analiz et." |
| `gh-address-comments` | Acik PR uzerindeki review yorumlarini gh CLI ile ele alir. Python scripti: `scripts/fetch_comments.py` | "gh-address-comments ile PR'daki unresolved yorumlari kapat." |

### Env & Secret Yonetimi

| Skill | Amac | Ornek Istek |
|---|---|---|
| `env-sync-release` | Root `.env` dosyasini backend/mobile/r2-mcp paketlerine senkronize eder. Scriptler: `sync-env.sh all` + `check-env.js` | "env-sync-release ile yeni env degiskenini tum paketlere dagit." |
| `doppler-env-sync` | Doppler'dan root `.env` ceker ve tum paketlere dagitir. Script: `node scripts/update-env-from-doppler.js`. Gerekli env: `DOPPLER_TOKEN` | "doppler-env-sync ile env'leri Doppler'dan cek." |

### Guvenlik

| Skill | Amac | Ornek Istek |
|---|---|---|
| `security-threat-model` | Repo/path bazli tehdit modeli, abuse path ve mitigasyon uretir. Referans dosyalari: `prompt-template.md`, `security-controls-and-assets.md` | "security-threat-model ile backend/routes icin threat model hazirla." |
| `security-best-practices` | Dil/framework bazli guvenlik incelemesi. 10 adet referans dosyasi (JS/TS, Python, Go). | "security-best-practices ile auth middleware'i incele." |

### Performans

| Skill | Amac | Ornek Istek |
|---|---|---|
| `mobile-feed-perf` | Mobil feed scroll/render/prefetch/video performansini olcer ve iyilestirir. Script: `run-mobile-perf-checks.sh` | "mobile-feed-perf ile ana feeddeki frame drop sorununu azalt." |

### Dokumantasyon & Bilgi

| Skill | Amac | Ornek Istek |
|---|---|---|
| `openai-docs` | OpenAI developer docs'tan guncel rehberlik. MCP baglantili + 3 referans dosyasi (model secimi, GPT-5.4 gecisi). | "openai-docs ile Responses API gecis notlarini cikar." |
| `docs-navigator` | `docs/` dizininde hedefli arama. Script: `find-docs.sh` (ripgrep kullanir). | "docs-navigator ile bildirim mimarisi dokumanlarina ulas." |

### Altyapi & DevOps

| Skill | Amac | Ornek Istek |
|---|---|---|
| `r2-mcp-ops` | R2 MCP islemlerinde preflight kontrol. Script: env var kontrolu + `custom-r2-server.js` syntax check. | "r2-mcp-ops ile bucket yapilandirmasini dogrula." |
| `codex-mcp-cross-env` | Cross-platform (Windows/Linux/Firebase Studio) MCP bootstrap, onarim ve dogrulama. Root scriptleri kullanir. | "codex-mcp-cross-env ile MCP kurulumunu dogrula." |

### Iletisim & Raporlama

| Skill | Amac | Ornek Istek |
|---|---|---|
| `telegram-progress-reporter` | Codex oturum ilerlemesini, test sonuclarini, blokerleri Telegram'a bildirir. Backup/restore destegi. Script: `telegram_progress_notifier.js`. Gerekli env: `CODEX_TELEGRAM_BOT_TOKEN`, `CODEX_TELEGRAM_CHAT_ID`, `CODEX_TELEGRAM_ENABLED` | "Telegram'a oturum ozeti gonder." |

### Kesif & Arastirma

| Skill | Amac | Ornek Istek |
|---|---|---|
| `skills-researcher` | 3. parti skill kesfi ve import. GitHub `awesome-agent-skills` katalogundan arar. Script: `awesome_skill_tool.js` | "skills-researcher ile kullanabilecegim yeni skill'leri ara." |
| `mcp-researcher` | Yeni MCP sunucusu kesfi ve kayit. Official + community kataloglardan arar. Script: `mcp_catalog_tool.js` | "mcp-researcher ile Stripe MCP var mi ara." |

---

## 3) Hizli Akislar

### CI kirik
1. `gh-fix-ci` ile basla - hata loglarini analiz et.
2. Duzeltme sonrasi `backend-guardrails` ile dogrula.

### RPC degisikligi yaptin
1. `supabase-rpc-contract` ile uyumluluk kontrolu.
2. Mobile type-check + backend testleri calistir.

### Env degisikligi / Yeni makine kurulumu
1. Doppler varsa: `doppler-env-sync` ile cek.
2. Doppler yoksa: `env-sync-release` ile senkronla.
3. Detayli kurulum icin: [CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md](./CODEX_MCP_CROSS_PLATFORM_RUNBOOK.md)

### Guvenlik incelemesi
1. Kod bazli: `security-best-practices` ile incele.
2. Mimari bazli: `security-threat-model` ile threat model cikar.

### Performans sorunu
1. `mobile-feed-perf` ile measure-optimize-validate dongusu baslat.

### Yeni skill/MCP kesfetmek
1. Skill icin: `skills-researcher` ile ara.
2. MCP icin: `mcp-researcher` ile ara.

---

## 4) Env Degiskenleri Ozet Tablosu

| Degisken | Zorunlu mu | Kullanan |
|---|---|---|
| `R2_ACCOUNT_ID` | Evet | r2-local MCP, r2-mcp-ops |
| `R2_ACCESS_KEY_ID` | Evet | r2-local MCP, r2-mcp-ops |
| `R2_SECRET_ACCESS_KEY` | Evet | r2-local MCP, r2-mcp-ops |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | Opsiyonel | github MCP |
| `SUPABASE_MCP_ACCESS_TOKEN` | Opsiyonel | supabase-mcp-server MCP |
| `POSTGRES_MCP_URL` | Opsiyonel | postgres MCP |
| `NETLIFY_MCP_ENABLED` | Opsiyonel | netlify MCP |
| `DOPPLER_TOKEN` | Opsiyonel | doppler MCP, doppler-env-sync |
| `DOPPLER_PROJECT` | Opsiyonel | doppler-env-sync |
| `DOPPLER_CONFIG` | Opsiyonel | doppler-env-sync |
| `CODEX_TELEGRAM_ENABLED` | Opsiyonel | telegram-progress-reporter |
| `CODEX_TELEGRAM_BOT_TOKEN` | Opsiyonel | telegram-progress-reporter |
| `CODEX_TELEGRAM_CHAT_ID` | Opsiyonel | telegram-progress-reporter |
| `SUPABASE_URL` | Opsiyonel | bookmarks-local MCP |
| `SUPABASE_SERVICE_ROLE_KEY` | Opsiyonel | bookmarks-local MCP |

---

## 5) Agent'lar Icin Notlar

- Gorev bir skill ile net eslesiyorsa skill tabanli akis tercih et.
- Env/secrets/storage gibi hassas islemlerde once preflight kontrolu yap.
- Backend degisikliklerinde varsayilan dogrulama: `npm --prefix backend run test:all`
- MCP ekleme/degistirme sureci: `.codex/mcp-servers.json` guncelle > `.env.example` guncelle > `bootstrap-codex-mcp.js` ile dogrula.
- Skill SKILL.md dosyalari canonical referanstir; bu rehber ozet niteligindedir.
