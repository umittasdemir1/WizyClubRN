# Bookmarks MCP Local Kurulum

Bu dosya, evdeki local bilgisayarında `bookmarks-local` MCP'yi calistirmak icin gereken adimlari sade sekilde ozetler.

## Ne zaman bunu yapman gerekiyor?

Asagidaki iki durumdan biri varsa bu kurulum lazim:

1. Codex icinden X bookmark arsivinde arama yapmak istiyorsan
2. Kendi local makinenden bookmark toplayip Supabase'e senkronlamak istiyorsan

Eger `codex mcp list` ciktisinda zaten `bookmarks-local` gorunuyorsa ve arama calisiyorsa, ekstra bir sey yapman gerekmeyebilir.

## Minimum gereken kurulum

Sadece Codex icinde `bookmarks-local` MCP calissin istiyorsan bu kisim yeterli.

### 1. Repo'yu guncelle

```bash
git pull origin main
```

### 2. Root `.env` hazir olsun

Root `.env` icinde su degiskenler olmali:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Eger Doppler kullaniyorsan ve `.env` guncel degilse, root'ta sunu calistir:

```bash
node scripts/update-env-from-doppler.js
```

### 3. Codex shell entegrasyonunu kur

```bash
node scripts/install-codex-shell-integration.js
```

### 4. MCP'leri bootstrap et

```bash
node scripts/bootstrap-codex-mcp.js
```

Eger ortam degiskenlerini de ayni anda tazelemek istiyorsan:

```bash
node scripts/bootstrap-codex-mcp.js --full-env-sync
```

### 5. Dogrula

```bash
codex mcp list
```

Listede `bookmarks-local` gorunmeli.

## Bookmark verisini localde toplamak da istiyorsan

Bu kisim sadece kendi X bookmark'larini local tarayicidan alip Supabase'e yuklemek istiyorsan gerekli.

### 1. Collector aracini kur

```bash
cd x-bookmarks-local
npm install
npm run browser:install
```

### 2. Araci baslat

```bash
npm start
```

Bu arac localde acilir ve bookmark verisini `x-bookmarks-local/data/bookmarks.json` altinda tutar.

### 3. Veriyi Supabase'e senkronla

Repo root'a geri donup sunu calistir:

```bash
node bookmarks/sync-to-supabase.js
```

Bu adimdan sonra `bookmarks-local` MCP, Supabase'teki bookmark verisi uzerinden arama yapabilir.

## Sana en kisa cevap

Eger sadece Codex icinde bookmark aramak istiyorsan:

1. `.env` dogru olsun
2. `node scripts/install-codex-shell-integration.js`
3. `node scripts/bootstrap-codex-mcp.js`
4. `codex mcp list`

Eger kendi bookmark'larini da sisteme yuklemek istiyorsan, buna ek olarak `x-bookmarks-local` kurup `node bookmarks/sync-to-supabase.js` calistirman gerekir.

## Sorun olursa ilk bakilacak yerler

### `bookmarks-local` listede yoksa

- Root `.env` icinde `SUPABASE_URL` var mi kontrol et
- Root `.env` icinde `SUPABASE_SERVICE_ROLE_KEY` var mi kontrol et
- `node scripts/bootstrap-codex-mcp.js` komutunu tekrar calistir

### MCP var ama sonuc gelmiyorsa

- Bookmark verisi Supabase'e sync edilmis mi kontrol et
- Gerekirse `node bookmarks/sync-to-supabase.js` komutunu tekrar calistir

## Windows notu

Windows'ta PowerShell veya Git Bash kullanman daha sorunsuz olur.

PowerShell script politikasi blokluyorsa bir kez su komut gerekebilir:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
