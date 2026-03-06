# WizyClubRN için Codex CLI Tam Verim Mimarisi (Final v2)

## 1) Revizyon Özeti
- Bu sürüm, özellikle `Codex Skills` resmi dokümanına göre normalize edildi.
- Kritik düzeltme: bu repo için skill dizini standardı `.codex/skills` olarak güncellendi.
- `skills.config`, skill keşif sırası, `agents/openai.yaml` bağımlılık modeli ve güncel `approval_policy` değerleri netleştirildi.

## 2) Mevcut Repo Fotoğrafı
- Monorepo: `backend/`, `mobile/`, `r2-mcp/`, `docs/`, `scripts/`.
- Codex proje konfigürasyonu yok: `.codex/config.toml` yok.
- Projede henüz skill klasörü yok: `.codex/skills/` yok.
- Codex MCP durumu: `codex mcp list` -> yapılandırılmış MCP sunucusu yok.
- `docs/` içinde 106 markdown dosyası var; hedefli bağlam yükleme şart.
- Güvenlik bloklayıcısı: `r2-mcp/custom-r2-server.js` içinde hardcoded credential mevcut.

## 3) AGENTS.md Mimari Standardı
Önerilen katman:
- `AGENTS.md` (kök): ortak kurallar, zorunlu komutlar, güvenlik.
- `backend/AGENTS.md`: katman sınırları, `npm --prefix backend run test:all`.
- `mobile/AGENTS.md`: RN performans/typcheck kuralları.
- `r2-mcp/AGENTS.md`: secret hygiene, MCP transport/log ayrımı.
- Geçici sprint kuralı için: `AGENTS.override.md`.

Zorunlu sınırlar:
- `Her Zaman`: ilgili test/typcheck çalıştır, platform parity koru.
- `Önce Sor`: DB şeması, Supabase RPC sözleşmesi, kritik native ayarlar.
- `Asla`: secret commit/log, `node_modules` altında kalıcı kod değişikliği.

## 4) Skill Mimarisi (Codex Resmi Modeli)
Resmi modelde bir skill, klasör + `SKILL.md` (zorunlu `name`, `description`) ve opsiyonel `scripts/`, `references/`, `assets/`, `agents/openai.yaml` içerir.

Codex skill keşif sırası:
1. System-level skill dizinleri (Codex kurulumu ile gelenler)
2. `/etc/codex/skills`
3. `~/.codex/skills`
4. Proje dizini: `.codex/skills` (CWD’den repo root’a kadar)

Bu repo için hedef dizin:

```text
.codex/skills/
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

`SKILL.md` minimum:

```md
---
name: mobile-feed-perf
description: Trigger for feed scroll/FPS/TTI regressions in mobile.
---
```

Opsiyonel `agents/openai.yaml` ile:
- UI metadata (`display_name`, icon, default prompt)
- Tool bağımlılığı (`dependencies.tools` içinde MCP bağlantısı)

Skill override/disable örneği:

```toml
[[skills.config]]
path = "/home/user/WizyClubRN/.codex/skills/r2-mcp-ops"
disabled = false
```

## 5) MCP Topolojisi (Önceliklendirilmiş)
P0:
- `openaiDeveloperDocs` (resmi dokümantasyon doğrulama)
- `supabase` (read-only, `project_ref` scoped)
- `r2-local` (env tabanlı secret ile)

P1:
- `github` MCP (PR/issue otomasyonu)
- `XcodeBuildMCP` (yalnız macOS/iOS işi olan ekip üyeleri için)

P2:
- `figma` MCP (design-to-code)

MCP transport kuralı:
- STDIO sunucusunda `stdout` sadece protokol mesajı; loglar `stderr`.

## 6) Codex CLI Profil Stratejisi
Config referansına göre `on-request` ve `on-failure` eski alias davranışındadır; yeni kullanımda `untrusted` + `never` tercih edilmelidir.

```toml
# ~/.codex/config.toml
model = "gpt-5"
model_reasoning_effort = "medium"

[profiles.plan]
model_reasoning_effort = "high"
approval_policy = "untrusted"
sandbox_mode = "workspace-write"

[profiles.implement]
model_reasoning_effort = "medium"
approval_policy = "untrusted"
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

## 7) React Native’ye Özel Ajan Kuralları
- Feed/list odaklı akışta varsayılan tercih `FlashList`; `FlatList` için gerekçe zorunlu.
- Ağır bileşenlerde `React.memo` + state izolasyonu zorunlu.
- Standart döngü: `Measure -> Optimize -> Re-measure -> Validate`.
- Performans PR minimum çıktıları:
  - `npx --prefix mobile tsc --noEmit`
  - `npm --prefix mobile run perf:baseline:android` (mümkünse)
  - önce/sonra metrik + ekran/video kanıtı

## 8) İlk 10 Günlük Uygulama Planı
1. `r2-mcp` hardcoded secret temizliği ve key rotate.
2. Paket bazlı `AGENTS.md` dosyalarını ekle.
3. `.codex/skills/` altında 6 skill iskeletini oluştur.
4. `~/.codex/config.toml` profile standardını ekipte sabitle.
5. Supabase MCP’yi read-only + scope ile bağla.
6. GH/CI otomasyonları için `gh` bazlı skill’leri devreye al.
7. PR şablonuna “profile/skill/MCP + komut çıktıları” alanı ekle.

## 9) Notlarından Alınan ve Düzeltilen Noktalar
- Alındı: 3 kademeli boundary modeli.
- Alındı: progressive disclosure yaklaşımı.
- Alındı: RN performansını ölçüm döngüsüyle yönetme.
- Düzeltilen: Codex proje skill konumu `.codex/skills` (`.agents/skills` değil).
- Düzeltilen: `approval_policy` için güncel tercih `untrusted` / `never`.
- Şartlı: `XCODEBUILDMCP_DYNAMIC_TOOLS` kazancı istemci/sampling desteğine bağlıdır.

## 10) Kaynaklar (Resmi + Topluluk)
- OpenAI Codex Skills: https://developers.openai.com/codex/skills
- OpenAI Codex Skills Create: https://developers.openai.com/codex/skills/create-skill
- OpenAI Codex AGENTS: https://developers.openai.com/codex/guides/agents-md
- OpenAI Codex MCP: https://developers.openai.com/codex/mcp
- OpenAI Codex Config Reference: https://developers.openai.com/codex/config-reference
- OpenAI Codex Non-interactive: https://developers.openai.com/codex/non-interactive
- OpenAI Skills repo: https://github.com/openai/skills
- MCP Spec (Transports): https://modelcontextprotocol.io/specification/2025-03-26/basic/transports
- MCP Quickstart (Server logging): https://modelcontextprotocol.io/quickstart/server
- Supabase MCP: https://github.com/supabase-community/supabase-mcp
- XcodeBuildMCP: https://www.npmjs.com/package/xcodebuildmcp
- Agent Skills standard: https://agentskills.io

## 11) Ek Not
- `skillsdoc` URL’lerinin repo uyumluluk analizi için: `SKILLSDOC_URL_UYGUNLUK_ANALIZI.md`
