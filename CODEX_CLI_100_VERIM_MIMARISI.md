# WizyClubRN için OpenAI Codex CLI Tam Verim Mimarisi

Tarih: 6 Mart 2026  
Kapsam: Bu doküman, mevcut repo durumu + resmi Codex dokümantasyonuna dayanarak WizyClubRN’de `AGENTS.md`, skills, MCP ve CLI kullanımını en verimli hale getirmek için hedef mimariyi tanımlar.

## 1. Mevcut Durum (As-Is)

- Repo kökünde `AGENTS.md` ve `AGENTS_TR.md` var.
- Codex CLI kurulu: `codex-cli 0.111.0`.
- Kullanıcı konfigürasyonunda model tanımlı: `gpt-5.3-codex` (`model_reasoning_effort = "xhigh"`).
- Proje içinde henüz `.codex/config.toml` yok (repo-level standart yok).
- Proje içinde henüz `.agents/skills/*/SKILL.md` yok (repo-level skill yok).
- `codex mcp list` çıktısı: tanımlı MCP sunucusu yok.
- Kritik güvenlik riski: [`r2-mcp/custom-r2-server.js`](/home/user/WizyClubRN/r2-mcp/custom-r2-server.js) içinde düz metin credential bulunuyor.

## 2. Resmi Dokümana Dayalı Temel İlkeler

- Codex, talimat dosyalarını dizin zincirinde sıralı okur (`AGENTS.override.md` > `AGENTS.md` > fallback isimler).
- Skill sistemi repo, user, admin ve system scope’dan okunur; repo için `.agents/skills` standarttır.
- MCP için `codex mcp add`, `codex mcp list`, `codex mcp login` akışı vardır; `required`, `enabled_tools`, `disabled_tools` ile kontrol yapılır.
- Otomasyon/CI için doğru yol `codex exec`’tir; varsayılan read-only, gerekirse `--full-auto` ile düzenleme açılır.
- Config önceliği: CLI flag > profile > proje `.codex/config.toml` > user `~/.codex/config.toml`.

## 3. Hedef Mimari (To-Be)

```text
WizyClubRN/
├─ AGENTS.md
├─ AGENTS_TR.md
├─ .codex/
│  └─ config.toml
├─ .agents/
│  └─ skills/
│     ├─ backend-ci-guardian/
│     │  └─ SKILL.md
│     ├─ mobile-performance-guard/
│     │  └─ SKILL.md
│     ├─ r2-mcp-ops/
│     │  └─ SKILL.md
│     └─ docs-sync/
│        └─ SKILL.md
└─ r2-mcp/
   └─ custom-r2-server.js (env tabanlı credential)
```

## 4. Önerilen Config Stratejisi

Projeye `.codex/config.toml` ekleyin ve repo standardını sabitleyin:

```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
approval_policy = "on-request"
sandbox_mode = "workspace-write"
project_doc_max_bytes = 65536

[profiles.quick]
model_reasoning_effort = "medium"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.deep]
model_reasoning_effort = "xhigh"
approval_policy = "on-request"
sandbox_mode = "workspace-write"

[profiles.ci]
approval_policy = "never"
sandbox_mode = "workspace-write"
model_reasoning_effort = "medium"
```

## 5. Skill Tasarımı (Repo-Özel)

- `backend-ci-guardian`: `backend` test/verify/smoke akışını standartlaştırır (`npm --prefix backend run test:all`).
- `mobile-performance-guard`: `mobile` type-check ve performans scriptlerini tutarlı uygular (`npx --prefix mobile tsc --noEmit`).
- `r2-mcp-ops`: R2 dosya operasyonlarını güvenli command set’iyle sınırlar.
- `docs-sync`: Kod değişikliğine bağlı dokümantasyon güncelleme checklist’i uygular.

Not: Skill’leri generic değil, doğrudan bu repo komutlarına bağlayın.

## 6. MCP Stratejisi

1. İlk faz: sadece R2 MCP’yi stdio olarak ekleyin, `enabled_tools` ile daraltın.  
2. İkinci faz: gerekirse dokümantasyon MCP (ör. Context7) ekleyin.  
3. Üçüncü faz: `required = true` sadece kritik ve stabil MCP’lerde kullanın.

Örnek:

```toml
[mcp_servers.r2]
command = "node"
args = ["r2-mcp/run-r2-mcp.js"]
enabled = true
required = false
enabled_tools = ["list_buckets", "list_objects"]
```

## 7. Günlük Operasyon Akışı

- Oturum başlangıcı: `/status` -> `/model` -> `/permissions`.
- Kod işi: net task + ilgili dosya referansı + gerekiyorsa skill çağrısı.
- Değişiklik sonrası: `/review`.
- MCP doğrulama: `/mcp`.
- CI/otomasyon: `codex exec --json` ile loglanabilir pipeline.

## 8. Güvenlik ve Verim Kritikleri

- [`r2-mcp/custom-r2-server.js`](/home/user/WizyClubRN/r2-mcp/custom-r2-server.js) credential’larını acilen `.env` tabanlı hale getirin.
- `AGENTS.md` kısa, net, yaşayan bir operasyon dokümanı olmalı; gereksiz uzun metin performansı düşürür.
- Her yeni otomasyon pattern’i önce skill’e taşınmalı, sonra AGENTS’de referanslanmalı.

## 9. Uygulama Planı (Kısa)

1. `.codex/config.toml` oluştur.  
2. `.agents/skills` altında 4 skill skeleton aç.  
3. R2 credential refactor yap (hardcoded -> env).  
4. MCP’yi `codex mcp add` ile bağla ve dar tool listesi uygula.  
5. 1 hafta sonra ölç: task başına süre, prompt tekrar sayısı, başarısız deneme sayısı.

## 10. Kaynaklar (Resmi)

- https://developers.openai.com/codex/guides/agents-md  
- https://developers.openai.com/codex/skills  
- https://developers.openai.com/codex/mcp  
- https://developers.openai.com/codex/noninteractive  
- https://developers.openai.com/codex/config-basic  
- https://developers.openai.com/codex/config-reference  
- https://developers.openai.com/codex/config-sample  
- https://developers.openai.com/codex/models  
- https://developers.openai.com/codex/cli/slash-commands

---

Not (çıkarım): Bu mimari uygulandığında verim artışı proje disiplini ve skill kalitesine bağlıdır; tipik kazanım alanı tekrarlı işlerde olur.
