# MCP ve Skill Rehberi (WizyClubRN)

Son güncelleme: 2026-03-06

Indeks: [MCP_SKILLS_INDEX.md](./MCP_SKILLS_INDEX.md) | English version: [MCP_AND_SKILLS_GUIDE_EN.md](./MCP_AND_SKILLS_GUIDE_EN.md)

Bu rehber, bu repoda şu anda kullanılabilen MCP entegrasyonlarını ve Codex skill'lerini, pratik örneklerle açıklar.

## 1) Mevcut MCP Entegrasyonları

### OpenAI Developer Docs MCP
OpenAI tarafında güncel ve resmi dokümantasyona, endpoint sözleşmelerine ve örnek kodlara ihtiyaç olduğunda kullanılır.

- Ana araçlar:
  - `search_openai_docs`: OpenAI dokümanlarında arama yapar.
  - `list_openai_docs`: Doküman indeksini listeler.
  - `fetch_openai_doc`: Belirli doküman/sayfa bölümünü markdown olarak çeker.
  - `list_api_endpoints`: OpenAI API endpoint URL'lerini listeler.
  - `get_openapi_spec`: Endpoint OpenAPI şeması ve örnek kodları getirir.
- Tipik kullanım alanları:
  - Responses API için en güncel yaklaşımı bulmak.
  - Model ve araç kabiliyetlerini karşılaştırmak.
  - Implementasyon için request/response alanlarını netleştirmek.
- Örnek istemler:
  - "OpenAI docs MCP kullanarak Node.js için en güncel Responses API streaming örneğini bul."
  - "Responses endpoint OpenAPI spec'ini çekip zorunlu alanları özetle."

### R2 Local MCP
Cloudflare R2 storage işlemlerinde, özellikle lokal doğrulama ve güvenli operasyon akışı için kullanılır.

- Ana araçlar:
  - `list_buckets`: Bucket'ları listeler.
  - `list_objects`: Bucket içindeki objeleri listeler (opsiyonel prefix filtresiyle).
- Tipik kullanım alanları:
  - Upload hedeflerinin varlığını doğrulamak.
  - Temizlik/migrasyon öncesi obje yapısını kontrol etmek.
- Örnek istemler:
  - "`media-prod` bucket'ında `videos/` prefix'i altındaki objeleri listele."
  - "Tanımlı bucket içinde `mobile/assets/` anahtarları var mı kontrol et."

## 2) Mevcut Skill'ler

Skill'ler tekrar kullanılabilir iş akışlarıdır. Skill adını doğrudan yazarak (ör. `use gh-fix-ci`) veya eşleşen bir görev isteyerek tetikleyebilirsin.

| Skill | Ne İçin Kullanılır | Örnek İstek |
|---|---|---|
| `backend-guardrails` | Backend refactor/API değişikliklerinde katman sınırları ve test disiplini uygular. | "`backend-guardrails` kullanıp `backend/routes/feed.js` dosyasını katman sınırını bozmadan refactor et." |
| `docs-navigator` | Büyük kapsamlı analizlerde `docs/` içinden hedefli bilgi toplar. | "`docs-navigator` kullanıp bildirim mimarisiyle ilgili tüm dokümanları çıkar." |
| `env-sync-release` | Env değişiklikleri, release hazırlığı ve paketler arası env senkronu için. | "`env-sync-release` ile yeni bir env değişkenini backend/mobile/r2-mcp'ye senkronla." |
| `gh-address-comments` | Açık PR üzerindeki review yorumlarını `gh` ile sistemli ele alır. | "`gh-address-comments` ile açık PR'daki unresolved yorumları kapatacak düzeltmeleri uygula." |
| `gh-fix-ci` | GitHub Actions CI hatalarını analiz eder; onay sonrası düzeltme uygular. | "`gh-fix-ci` ile bu branch'te backend-ci neden fail oldu analiz et." |
| `mobile-feed-perf` | `mobile/` içindeki feed scroll/render/prefetch/video performansını iyileştirir. | "`mobile-feed-perf` ile ana feed'deki frame drop sorununu azalt." |
| `openai-docs` | OpenAI API/ChatGPT entegrasyonları için güncel ve kaynaklı rehberlik sağlar. | "`openai-docs` ile uygun modeli seçip Responses API geçiş notlarını çıkar." |
| `r2-mcp-ops` | Cloudflare R2 operasyonlarında güvenli preflight ve işlem akışı sağlar. | "`r2-mcp-ops` ile toplu obje taşıma öncesi bucket yapılandırmasını doğrula." |
| `security-best-practices` | JS/TS, Python veya Go kodu için güvenlik odaklı en iyi pratikleri denetler. | "`security-best-practices` ile backend auth middleware'i güvenlik açısından incele." |
| `security-threat-model` | Repo/path bazlı tehdit modeli, abuse path ve mitigasyon üretir. | "`security-threat-model` ile `backend/routes` için kısa bir threat model hazırla." |
| `supabase-rpc-contract` | Mobile ve backend arasında RPC sözleşme uyumluluğunu doğrular. | "`supabase-rpc-contract` ile mobile feed datasource'un RPC parametrelerini doğrula." |
| `skill-creator` | Yeni skill oluşturma/mevcut skill iyileştirme sürecini yönetir. | "`skill-creator` kullanarak Expo release checklist otomasyonu için yeni bir skill tasarla." |
| `skill-installer` | Curated liste veya GitHub'dan skill kurulumunu yapar. | "`skill-installer` ile kurulum yapılabilir skill'leri listele ve birini kur." |
| `slides` | Sunum (deck) oluşturma, düzenleme ve dışa aktarma işlemleri için. | "`slides` ile docs içeriğinden ürün mimarisi sunumu üret." |
| `spreadsheets` | Spreadsheet oluşturma/düzenleme/hesaplama/dışa aktarma için. | "`spreadsheets` ile backend-mobile regression test matrisi hazırla." |

## 3) Hızlı Önerilen Akışlar

1. CI kırık:
   - `gh-fix-ci` ile başla.
   - Düzeltme sonrası backend/mobile doğrulamalarını çalıştır.
2. RPC değişikliği yaptın:
   - `supabase-rpc-contract` kullan.
   - Ardından mobile type-check ve backend testlerini çalıştır.
3. OpenAI entegrasyon güncellemesi gerekiyor:
   - `openai-docs` kullan.
   - Gerekli bölüm için `fetch_openai_doc` ile net kaynak çek.
4. Release öncesi env güncellemesi:
   - `env-sync-release` kullan.
   - `.env` senkronundan sonra smoke kontrolleri yap.

## 4) Notlar

- Görev skill ile net eşleşiyorsa skill tabanlı akış tercih et; proje guardrail'lerini otomatik uygular.
- Env/secrets/storage gibi hassas işlemlerde önce preflight kontrolü yap.
- Backend değişikliklerinde varsayılan doğrulama adımı `npm --prefix backend run test:all` olmalı.
