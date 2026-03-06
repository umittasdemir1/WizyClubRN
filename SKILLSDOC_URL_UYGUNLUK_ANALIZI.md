# Skillsdoc URL Uygunluk Analizi (WizyClubRN)

Analiz tarihi: 2026-03-06  
Kapsam: `skillsdoc` içindeki URL’lerin Codex ile pratikte kullanılabilirliği + bu repo ile teknik uyumu.

## 1) Proje Gerçekliği (Uyumluluk İçin Baz Alınan)
- Stack: Expo React Native (`mobile`) + Node/Express (`backend`) + Supabase + Cloudflare R2 (`r2-mcp`).
- Test/CI: backend’de `node --test` + Jest + GitHub Actions.
- Kritik ihtiyaçlar: feed performansı, RPC sözleşme güvenliği, secret yönetimi, dokümantasyon yoğunluğu.
- Mevcut eksikler:
  - `.codex/skills/` yok
  - MCP sunucusu yok (`codex mcp list` boş)
  - `r2-mcp/custom-r2-server.js` içinde hardcoded credential var
- Ortam notu:
  - `gh` kurulu (`1.58.2`)
  - `wrangler` görünmüyor
  - `python/python3` yok (bazı skill-installer yardımcı scriptleri terminalden çalışmıyor)

## 2) URL Bazlı Karar Matrisi

### 1. `https://github.com/openai/skills`
- Durum: **En yüksek uyum (önerilen ana kaynak)**
- Neden:
  - Codex odaklı resmi skill deposu
  - Curated skill’lerde `SKILL.md` + `agents/openai.yaml` yapısı tutarlı
  - MCP bağımlılıkları metadata’da açık
- Bu proje için doğrudan adaylar:
  - `openai-docs`
  - `security-best-practices`
  - `security-threat-model`
  - `gh-fix-ci`
  - `gh-address-comments`
- Karar: **Kullan**

### 2. `https://github.com/anthropics/skills`
- Durum: **Kısmi uyum (uyarlanabilir)**
- Neden:
  - 18 adet `SKILL.md` içeriyor, format genel standarda yakın
  - Ancak repo Claude odaklı; bazı workflow’lar Codex’te birebir çalışmayabilir
- Bu proje için olası adaylar:
  - `frontend-design` (UI/UX rehberlik)
  - `webapp-testing` (web test patternleri)
  - `mcp-builder` (MCP iskeleti)
- Karar: **Seçici kullan (önce PoC)**

### 3. `https://github.com/ComposioHQ/awesome-claude-skills`
- Durum: **Kısmi uyum (çok geniş, düşük sinyal)**
- Neden:
  - Çok yüksek hacim (`SKILL.md` sayısı çok fazla)
  - Kalite ve bakım seviyesi homojen değil; birçoğu dış API/özel entegrasyon bağımlı
- Kullanım yaklaşımı:
  - Sadece tekil, açık değeri olan skill’i URL-path ile çek
  - Projeye almadan önce `scripts` ve secret gereksinimlerini denetle
- Karar: **Sınırlı ve kontrollü kullan**

### 4. `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
- Durum: **Kısmi uyum (tek skill, tasarım odaklı)**
- Neden:
  - Bir adet `SKILL.md` var (`.claude/skills/...`)
  - React Native dahil çoklu stack rehberliği içeriyor
  - Doğrudan kod üretiminden çok tasarım karar kalitesi artırır
- Karar: **Opsiyonel kullan (UI revamp işleri)**

### 5. `https://github.com/vercel-labs/skills`
- Durum: **Dolaylı uyum (skill kaynağı değil, ekosistem CLI)**
- Neden:
  - Bu repo ağırlıklı olarak “skills CLI”; çok sınırlı örnek skill içeriyor
  - Asıl skill içeriği başka depolarda (ör. `vercel-labs/agent-skills`)
- Karar: **Ana kaynak olarak kullanma**

### 6. `https://github.com/Chalarangelo/30-seconds-of-code`
- Durum: **Uyumsuz (skill deposu değil)**
- Neden:
  - `SKILL.md` içermiyor
  - Snippet/içerik deposu, Codex skill paketi değil
- Karar: **Kullanma**

## 3) Bu Repo İçin Nihai Skill Stratejisi

P0 (hemen):
1. `openai-docs`
2. `security-best-practices`
3. `security-threat-model`
4. `gh-fix-ci`
5. `gh-address-comments`

P1 (ihtiyaç oldukça):
1. `figma` veya `figma-implement-design` (tasarım akışı varsa)
2. `cloudflare-deploy` (wrangler/tooling hazırsa)

P2 (opsiyonel/deneysel):
1. `anthropics/skills` içinden `frontend-design` benzeri seçici import
2. `ui-ux-pro-max` (tasarım ağırlıklı sprintlerde)

## 4) Kurulum Notu (Pratik)
- Codex tarafında resmi yol: `$skill-installer` ile `openai/skills` curated skill yüklemek.
- Repo seviyesi hedef klasör: `.codex/skills/`.
- Her skill sonrası: Codex yeniden başlatma önerilir.

Örnek istekler:
- `$skill-installer openai-docs`
- `$skill-installer security-best-practices`
- `$skill-installer gh-fix-ci`
- `$skill-installer install https://github.com/anthropics/skills/tree/main/skills/frontend-design`

## 5) “Tam Kullanabilirlik” Kontrol Checklist’i
1. Skill’de dış tool/MCP bağımlılığı var mı (`agents/openai.yaml`)?
2. Skill script’i yerel ortamda çalışır mı (Node/Python/Bash gereksinimi)?
3. Repo güvenlik sınırlarına uyuyor mu (secret/log/policy)?
4. Bu repodaki gerçek iş akışına değiyor mu (backend test, mobile perf, Supabase RPC)?
5. İlk deneme PoC sonucu ölçülebilir çıktı üretiyor mu?

## 6) Sonuç
- **Ana omurga**: `openai/skills` curated.
- **Takviye kaynak**: `anthropics/skills` ve `ui-ux-pro-max` (yalnız seçici import).
- **Hariç tutulacaklar**: `30-seconds-of-code` ve `vercel-labs/skills` (bu URL bağlamında).
- Bu repo için verim anahtarı: skill sayısını artırmak değil, `P0` setini `.codex/skills` altında disiplinli işletmek.

