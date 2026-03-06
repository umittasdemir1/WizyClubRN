# WizyClubRN için Codex CLI Tam Verim Mimarisi (Final)

## 1) Bu Revizyonda Netleştirilenler
- Notlarındaki yaklaşım doğru: manuel kod yazımından “ajan orkestrasyonu”na geçiş bu repo için verimli.
- Ancak kararları yalnızca doğrulanabilir kaynaklarla sabitledim.
- Doğrulanamayan iddiaları (ör. “2.500+ repo analizi” sayısı) mimari kararı olarak kullanmadım.

## 2) Mevcut Repo Durumu (Gerçek Fotoğraf)
- Monorepo: `backend/`, `mobile/`, `r2-mcp/`, `docs/`, `scripts/`.
- Codex proje ayarı yok: `.codex/config.toml` bulunmuyor.
- Repo skill altyapısı yok: `.agents/skills/` dizini bulunmuyor.
- Codex MCP durumu: `codex mcp list` çıktısı “No MCP servers configured yet”.
- `docs/` içinde 106 markdown dosyası var; bağlam yönetimi kritik.
- Güvenlik bloklayıcısı: `r2-mcp/custom-r2-server.js` içinde hardcoded R2 credential’ları var.

## 3) AGENTS.md Mimari Standardı (Bu Proje İçin)
Codex AGENTS yükleme sırası resmi olarak katmanlıdır: global (`~/.codex/AGENTS(.override).md`) + repo kök + CWD’ye kadar alt dizinler; derindeki dosya üsttekini override eder.

Önerilen kurulum:
- `AGENTS.md` (kök): ortak kurallar, zorunlu komutlar, güvenlik.
- `backend/AGENTS.md`: route/usecase/repository sınırları, `npm --prefix backend run test:all`.
- `mobile/AGENTS.md`: RN performans kuralları, TS strict, platform parity.
- `r2-mcp/AGENTS.md`: MCP transport kuralları, secret hygiene.
- Sprint odaklı geçici kural için: `AGENTS.override.md`.

AGENTS içeriğinde 3 kademeli sınır zorunlu olmalı:

### ✅ Her Zaman
- Değişiklik sonrası ilgili test/typcheck komutunu çalıştır.
- iOS/Android davranış eşliğini koru.

### ⚠️ Önce Sor
- DB şeması, Supabase RPC sözleşmesi, `android/` ve native iOS kritik ayarları.

### 🚫 Asla
- `node_modules` altında kalıcı patch commit etme.
- Secret/API key loglama veya commit etme.

## 4) Skill Mimarisi (Progressive Disclosure)
Codex skills için resmi yapı: her skill klasöründe `SKILL.md` (zorunlu `name` + `description`), opsiyonel `scripts/`, `references/`, `assets/`.
Repo tarafında canonical konum: `.agents/skills/`.

Önerilen dizin:

```text
.agents/skills/
  backend-guardrails/
    SKILL.md
    scripts/run-backend-checks.sh
  mobile-feed-perf/
    SKILL.md
    references/measure-optimize-validate.md
  supabase-rpc-contract/
    SKILL.md
  env-sync-release/
    SKILL.md
  r2-mcp-ops/
    SKILL.md
  docs-navigator/
    SKILL.md
```

`SKILL.md` minimum şablon:

```md
---
name: mobile-feed-perf
description: Trigger only for feed scrolling, render drops, TTI/FPS issues in mobile.
---
```

Repo için öncelikli skill’ler:
1. `backend-guardrails`: `npm --prefix backend run test:all`
2. `mobile-feed-perf`: `npx --prefix mobile tsc --noEmit` + `npm --prefix mobile run perf:baseline:android`
3. `supabase-rpc-contract`: `npm --prefix backend run verify:mobile-rpcs`
4. `env-sync-release`: `bash scripts/sync-env.sh all`
5. `r2-mcp-ops`: credential kontrol + sanitization
6. `docs-navigator`: `docs/DOCUMENTATION_INDEX.md` tabanlı hedefli okuma

## 5) MCP Topolojisi (RN + Backend Odaklı)
P0 (hemen):
- `openai-docs` (resmi dokümantasyon araması)
- `supabase` (tercihen `read_only=true` + `project_ref` scoped)
- `r2-local` (repo içi sunucu, ama env tabanlı secret ile)

P1 (takım olgunlaşınca):
- `XcodeBuildMCP` (yalnız macOS/iOS iş akışı için)
- `github` MCP (PR/issue otomasyonu)

P2 (opsiyonel):
- `figma` MCP (design-to-code hızlandırma)

MCP taşıma kuralı (kritik):
- STDIO sunucularında `stdout` yalnızca MCP mesajı olmalı; loglar `stderr`’e yazılmalı.

## 6) Codex CLI Profil Stratejisi (Deprecatedsiz)
`on-failure` artık deprecated; `on-request` veya `never` kullanılmalı.

```toml
# ~/.codex/config.toml
model = "gpt-5"
model_reasoning_effort = "medium"
web_search = "cached"

[profiles.plan]
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
web_search = "live"

[profiles.implement]
model_reasoning_effort = "medium"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.review]
model_reasoning_effort = "high"
approval_policy = "never"
sandbox_mode = "read-only"

[profiles.ci]
model_reasoning_effort = "low"
approval_policy = "never"
sandbox_mode = "workspace-write"
```

Önerilen kullanım:
- Plan: `codex --profile plan`
- Implementasyon: `codex --profile implement`
- İnceleme: `codex --profile review`
- Otomasyon: `codex exec --profile ci --json "...task..." -o artifacts/codex-last.txt`
- Canlı web doğrulama gereken iş: `codex --search`

## 7) React Native’ye Özel Ajan Kuralları
- Büyük feed/list işlerinde varsayılan tercih `FlashList`; `FlatList` yalnızca gerekçeyle.
- Ağır component’lerde `React.memo`, seçici state ve render izolasyonu zorunlu.
- Ölçüm döngüsü standart olmalı: Measure -> Optimize -> Re-measure -> Validate.
- Her performans PR’ında en az şu çıktılar bulunmalı:
  - `npx --prefix mobile tsc --noEmit`
  - `npm --prefix mobile run perf:baseline:android` (mümkünse)
  - etkilenen ekran/video kaydı + önce/sonra metriği

## 8) İlk 10 Günlük Uygulama Planı
1. `r2-mcp` hardcoded secret cleanup (env’e taşı, rotate et).
2. Paket bazlı `AGENTS.md` dosyalarını ekle.
3. `.agents/skills/` altında 6 skill iskeletini oluştur.
4. `~/.codex/config.toml` profil standardını takımda sabitle.
5. Supabase MCP’yi read-only + project scoped bağla.
6. XcodeBuildMCP’yi sadece iOS pipeline’ı olan geliştiricilere aç.
7. PR şablonuna “kullanılan profile/skill/MCP + çalıştırılan komutlar” alanı ekle.

## 9) Notlarından Alınan ve Düzeltilen Noktalar
- Alındı: 3 kademeli boundary modeli (`Her Zaman / Önce Sor / Asla`).
- Alındı: progressive disclosure skill yaklaşımı.
- Alındı: RN performansını ölçüm döngüsüyle yönetme yaklaşımı.
- Düzeltilen: Codex için canonical skill konumu `.agents/skills`; `.github/skills` sadece çapraz-ajan uyumu için opsiyonel.
- Düzeltilen: `approval_policy=on-failure` kullanılmamalı (deprecated).
- Şartlı: `XCODEBUILDMCP_DYNAMIC_TOOLS`; bu optimizasyon client sampling desteğine bağlı, her istemcide aynı kazanımı vermez.

## 10) Kaynaklar (Resmi + Topluluk)
- OpenAI Codex AGENTS: https://developers.openai.com/codex/guides/agents-md
- OpenAI Codex Skills: https://developers.openai.com/codex/skills
- OpenAI Codex MCP: https://developers.openai.com/codex/mcp
- OpenAI Codex Config Reference: https://developers.openai.com/codex/config-reference
- OpenAI Codex Non-interactive: https://developers.openai.com/codex/noninteractive
- OpenAI Codex CLI Reference: https://developers.openai.com/codex/cli/reference
- OpenAI Skills repo: https://github.com/openai/skills
- MCP Spec (Transports): https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
- MCP Quickstart (Server logging): https://modelcontextprotocol.io/quickstart/server
- MCP Organization: https://github.com/modelcontextprotocol
- Supabase MCP: https://github.com/supabase-community/supabase-mcp
- XcodeBuildMCP (npm): https://www.npmjs.com/package/xcodebuildmcp
- React Native MCP Guide (community): https://github.com/MrNitro360/React-Native-MCP
- Callstack RN agent skills duyurusu: https://www.callstack.com/blog/announcing-react-native-best-practices-for-ai-agents
