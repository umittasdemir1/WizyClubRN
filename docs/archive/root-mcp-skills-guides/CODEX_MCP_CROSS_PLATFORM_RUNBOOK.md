# Codex MCP Cross-Platform Runbook

Bu dokuman, OpenAI Codex CLI kullanan iki hedef ortam icin yazildi:
- Windows lokal makine
- Linux tabanli bulut veya lokal ortamlar, ozellikle Firebase Studio

Durum:
- Bu akis 2026-03-07 tarihinde Firebase Studio uzerinde dogrulandi.
- 2026-03-08 tarihinde Doppler env sync akisi ve official `doppler` MCP kaydi eklendi.
- 2026-03-10 tarihinde Telegram `.env.bak` backup akisi sadeleştirildi; backup dosyalari Telegram'a plaintext document olarak gider ve restore icin ek key gerekmez.
- Windows tarafi icin gerekli scriptler ve kalici shell entegrasyonu repoya eklendi.
- Ama her makinede tek seferlik kurulum yine o makinenin icinde yapilmalidir.

Ana kural:
- `~/.codex/config.toml` veya benzeri user-level config dosyalari makineden makineye kopyalanmaz.
- Her makine kendi workspace path'i ile managed MCP block'unu yeniden uretir.

## Kisa Cevap

Evet, ayni sistem hem Windows'ta hem Linux/Firebase Studio'da calisir.

Ama her yeni ortamda en az su 3 sey yeniden kurulmalidir:
- kok `.env`
- `r2-mcp` bagimliliklari
- managed Codex MCP block'u

## Dosya Adlari ve Kisa Yollar

Bu repo icindeki ana araclar:
- `scripts/bootstrap-codex-mcp.js`
- `scripts/install-codex-shell-integration.js`
- `scripts/codex-launch.sh`
- `scripts/codex-launch.cmd`
- `scripts/codex-with-mcp.sh`
- `scripts/codex-with-mcp.cmd`
- `scripts/codex-with-telegram.sh`
- `scripts/codex-with-telegram.cmd`
- `.codex/mcp-servers.json`

Otomatik bootstrap + Codex acilisi:
- Linux/Firebase Studio: `bash scripts/codex-with-mcp.sh`
- Windows: `scripts\\codex-with-mcp.cmd`

Otomatik bootstrap + Telegram bildirimli Codex acilisi:
- Linux/Firebase Studio: `bash scripts/codex-with-telegram.sh`
- Windows: `scripts\\codex-with-telegram.cmd`

Kalici shell entegrasyonu:
- tum destekli shell'ler icin: `node scripts/install-codex-shell-integration.js`

2026-03-10 itibariyla wrapper startup davranisi:
- `codex` veya `codex-with-*` acilisinda Doppler bootstrap hazirsa once kisa bir soru gorunur
- soru: `Doppler'a yeni key/token/api girdin mi? Sync calistirayim mi? [e/H]`
- `e` dersen `node scripts/update-env-from-doppler.js` otomatik calisir
- sonra normal MCP bootstrap ve Codex acilisi devam eder
- bu prompt'u kapatmak istersen root `.env` icine `CODEX_DOPPLER_SYNC_PROMPT=0` yazabilirsin

## Telegram Wrapper Ne Zaman Calisir

Bu repoda 3 farkli acilis davranisi vardir:
- `codex`: shell entegrasyonu kuruluysa `scripts/codex-launch.*` uzerinden acilir. Launcher, root `.env` icindeki `CODEX_TELEGRAM_ENABLED` degerine bakar.
- `bash scripts/codex-with-mcp.sh` veya `scripts\\codex-with-mcp.cmd`: MCP bootstrap yapar, ama Telegram watcher baslatmaz.
- `bash scripts/codex-with-telegram.sh` veya `scripts\\codex-with-telegram.cmd`: MCP bootstrap yapar ve Telegram notifier'i de devreye alir.

Telegram wrapper'in anlami:
- oturum baslangicinda Telegram mesaji gonderir
- oturum bitisinde final ozet gonderir
- Linux/Firebase Studio tarafinda periyodik workspace ozeti de gonderir
- `update-env-from-doppler` kullanilirsa eski root `.env` kopyasini Telegram'a plaintext document olarak da yollayabilir

Onemli not:
- shell entegrasyonu kuruluysa ve `CODEX_TELEGRAM_ENABLED=1` ise plain `codex` da otomatik Telegram bildirimi ile acilir
- shell entegrasyonu kuruluysa ve `CODEX_TELEGRAM_ENABLED=0` ise plain `codex` MCP wrapper ile acilir
- shell entegrasyonu yoksa plain `codex` normal Codex binary'sini acar; otomatik Telegram bildirimi gelmez
- `codex-with-mcp` kullanirsan otomatik Telegram bildirimi gelmez
- buna ragmen ajan, oturum sirasinda acikca "Telegram'a gonder" diye yonlendirilirse manuel mesaj yine yollayabilir
- Telegram backup akisi plaintext oldugu icin dosya icindeki secret'lar Telegram document olarak saklanir; bu bilincli bir tradeoff'tur

## Platform Matrisi

| Platform | Destek Durumu | Kalici `codex` entegrasyonu | Not |
| --- | --- | --- | --- |
| Firebase Studio / Linux bash | Destekli | Evet | `.bashrc` guncellenir |
| Linux zsh | Destekli | Evet | `.zshrc` varsa veya `--all-shells` ile guncellenir |
| Windows PowerShell | Destekli | Evet | PowerShell profil dosyasi guncellenir |
| Windows Git Bash | Destekli | Evet | `~/.bashrc` guncellenir |
| Windows `cmd.exe` | Sinirli | Hayir | Kalici alias yazilmaz, `scripts\\codex-with-mcp.cmd` dogrudan cagrilir |
| fish vb. farkli shell'ler | Sinirli | Hayir | manuel wrapper cagrisi gerekir |

## Dogru Hedef Durum

Beklenen standart MCP kayitlari:
- `openaiDeveloperDocs`
- `filesystem`
- `r2-local`

Env varsa aktif olabilecek opsiyoneller:
- `github`
- `supabase-mcp-server`
- `postgres`
- `netlify`
- `doppler`

R2 icin managed config'in isaret etmesi gereken dogru server:
- `r2-mcp/custom-r2-server.js`

Temizlenmesi gereken eski kayit:
- `cloudflare`

Not:
- `r2-mcp/run-r2-mcp.js` debug veya manuel calistirma icin kullanilabilir.
- Ama managed MCP kaydi `custom-r2-server.js` hedeflemelidir.

## Ortak On Kosullar

Tum platformlarda once sunlar dogru olmali:
- repo guncel olmali
- `node` ve `npm` calismali
- kok `.env` gercek degerlerle doldurulmus olmali
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` mevcut olmali

Opsiyonel MCP env'leri:
- `GITHUB_PERSONAL_ACCESS_TOKEN`
- `SUPABASE_MCP_ACCESS_TOKEN`
- `POSTGRES_MCP_URL`
- `NETLIFY_MCP_ENABLED`
- `DOPPLER_TOKEN`

Telegram wrapper env'leri:
- `CODEX_TELEGRAM_ENABLED=1`
- `CODEX_TELEGRAM_BOT_TOKEN`
- `CODEX_TELEGRAM_CHAT_ID`
- `CODEX_DOPPLER_SYNC_PROMPT=0` sadece startup sorusunu kapatmak istersen

Opsiyonel Telegram backup env'leri:
- `CODEX_TELEGRAM_BACKUP_ENABLED=1`

Doppler env sync env'leri:
- `DOPPLER_TOKEN`
- `DOPPLER_PROJECT`
- `DOPPLER_CONFIG`

## Doppler Env Sync

Bu repoda iki farkli sey vardir:
- `doppler` MCP: Codex'in Doppler API tool'larini kullanmasi icin
- `doppler-env-sync` skill + `scripts/update-env-from-doppler.js`: root `.env` ve package `.env` dosyalarini Doppler'dan cekip yerelde uretmek icin

Source of truth kuralı:
- paylasilan secret kaynagi Doppler'dir
- root `.env` local cache'tir
- `backend/.env`, `mobile/.env`, `r2-mcp/.env` root `.env`'den uretilen turev dosyalardir

Tek komut:

```bash
node scripts/update-env-from-doppler.js
```

Bu komut su isi yapar:
- `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG` degerlerini root `.env`'den okur
- Doppler API'den root `.env` iceriğini indirir
- `DOPPLER_*` anahtarlarini yerelde korur
- `backend/.env`, `mobile/.env`, `r2-mcp/.env` dosyalarini native JS ile yeniden uretir
- root `.env` icin `.bak.<timestamp>` yedegi birakir
- Telegram backup akisi aktifse bu `.bak` dosyasini Telegram'a yollar ve local kopyayi siler

Onemli not:
- Bu akis artik `doppler` CLI veya `bash scripts/sync-env.sh all` bagimliligi istemez
- yani Windows PowerShell oturumunda da dogrudan calisir
- backup'i acmak icin restore komutu kullanilir; ek key gerekmez

Telegram backup restore komutu:

```bash
node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js restore-backup
node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js restore-backup --backup-id <id> --output <path>
```

Not:
- 2026-03-10 ve sonrasinda olusan backup'lar plaintext formatta archive edilir ve dogrudan restore edilir
- daha eski encrypted legacy backup kayitlari varsa `restore-backup` bunlari acmaz; once yeni bir plaintext backup olusmasi gerekir

## Doppler Bootstrap Kaydi

2026-03-08 tarihinde su durum olusturuldu:
- official `doppler` MCP managed config'e eklendi
- `.codex/skills/doppler-env-sync/` skill'i eklendi
- `scripts/update-env-from-doppler.js` yazildi
- Doppler tarafinda `wizyclub` project'i olusturuldu
- `dev` config'i kullanildi
- mevcut local root `.env` degerleri ilk kez Doppler'a yollandı
- ilk pull sync basarili calisti
- izole ikinci makine simulasyonu `.tmp_doppler_second_machine_test/` icinde basarili calisti
- sadece `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG` ile root ve package `.env` dosyalari yeniden uretildi

Ilk bootstrap'tan sonra yeni makinede gerekenler:
1. Root `.env` icine sadece minimum Doppler bootstrap anahtarlarini yaz:
   `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG`
2. Sonra tek komut calistir:

```bash
node scripts/update-env-from-doppler.js
```

Beklenen:
- root `.env` Doppler'dan dolar
- package `.env` dosyalari ayni oturumda uretilir

## Firebase Studio Sifir Sorun Checklist

Firebase Studio'da yeni workspace acildiginda su sirayi uygula:

1. Root `.env` dosyasini olustur ve doldur:

```bash
cp .env.example .env
```

2. En azindan bu anahtarlarin bos olmadigini dogrula:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

3. Once dry-run benzeri kontrol calistir:

```bash
node scripts/bootstrap-codex-mcp.js --check-only --no-list
node scripts/install-codex-shell-integration.js --check-only
```

4. Sonra gercek kurulum:

```bash
node scripts/install-codex-shell-integration.js
node scripts/bootstrap-codex-mcp.js
```

5. Yeni terminal ac, sonra:

```bash
type codex
codex mcp list
```

Bu akista amac, kurulumdan once eksikleri yakalayip Firebase tarafinda ilk acilista hata olasiligini dusurmektir.

## Windows Kurulum

Hedef:
- VSCode icinde PowerShell veya Git Bash kullaniyorsan `codex` komutu otomatik wrapper uzerinden acilsin
- MCP'ler her terminal acilisinda bootstrap edilsin

Onerilen Windows shell'leri:
- PowerShell
- Git Bash

Windows'ta bir kez calistir:

```powershell
git pull origin main
node scripts/install-codex-shell-integration.js
node scripts/bootstrap-codex-mcp.js
```

Iki makinede de birebir ayni env istiyorsan ve root `.env` icinde
`DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG` tanimliysa tercih edilen komut:

```powershell
node scripts/bootstrap-codex-mcp.js --full-env-sync
```

Eger backend/mobile env dosyalarini da kok `.env`'den uretmek istiyorsan ve Git Bash varsa:

```bash
bash scripts/sync-env.sh all
```

PowerShell'de `bash` PATH'te degilse su fallback komutu kullan:

```powershell
& "C:\\Program Files\\Git\\bin\\bash.exe" scripts/sync-env.sh all
```

Windows'ta installer sunlari yapar:
- PowerShell Core profilini gunceller
- Windows PowerShell profilini gunceller
- Git Bash kullanimi icin `~/.bashrc` icine `codex()` fonksiyonu yazar
- bu `codex()` fonksiyonu `scripts/codex-launch.*` uzerinden otomatik olarak uygun wrapper'i secer

Windows'ta installer'in dokunmadigi yer:
- `cmd.exe` icin kalici alias yazilmaz

Bu durumda iki secenek vardir:
- VSCode terminal profilini PowerShell veya Git Bash yap
- veya `scripts\\codex-with-mcp.cmd` dosyasini dogrudan calistir

Windows'ta kurulumdan sonra:
- yeni terminal ac
- `codex mcp list` calistir

PowerShell profilinin yuklenebilmesi icin (bir kez) execution policy su sekilde olmalidir:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Kontrol:

```powershell
Get-ExecutionPolicy -List
```

Beklenen:
- `CurrentUser` degeri `RemoteSigned`

Beklenen sonuc:
- `codex` komutu wrapper uzerinden gelir
- `openaiDeveloperDocs`, `filesystem`, `r2-local` gorunur
- opsiyonel env varsa `github`, `supabase-mcp-server`, `postgres`, `netlify` eklenir

## Windows'ta Telegram'li plain `codex` icin ne yapmali

Amac:
- PowerShell veya Git Bash icinde sadece `codex` yazarak acmak
- ve bu `codex` komutunun otomatik olarak Telegram bildirimli akisi secmesi

Gerekli kosullar:
- Windows makinede repo guncel olmali
- root `.env` bu makinede dolu olmali
- Telegram icin su 3 env root `.env` icinde bulunmali:
  - `CODEX_TELEGRAM_ENABLED=1`
  - `CODEX_TELEGRAM_BOT_TOKEN=...`
  - `CODEX_TELEGRAM_CHAT_ID=...`
- terminal olarak PowerShell veya Git Bash kullanilmali

Windows'ta bir kez sunu calistir:

```powershell
git pull origin main
node scripts/install-codex-shell-integration.js
node scripts/bootstrap-codex-mcp.js
```

Sonra mutlaka:
- terminali tamamen kapat
- yeni PowerShell veya yeni Git Bash ac

Artik beklenen davranis:
- sadece `codex` yazarsin
- shell entegrasyonu `scripts/codex-launch.cmd` veya uygun launcher akisini kullanir
- launcher root `.env` icindeki `CODEX_TELEGRAM_ENABLED` degerine bakar
- deger `1` ise otomatik olarak `scripts\\codex-with-telegram.cmd` secilir
- deger `0` ise otomatik olarak `scripts\\codex-with-mcp.cmd` secilir

Kontrol etmek icin:
- PowerShell'de `Get-Command codex`
- veya Git Bash'te `type codex`

Telegram'li akisin geldigi nasil anlasilir:
- `codex` oturumu acilinca Telegram'a baslangic mesaji gelir
- oturum bitince final ozet gelir

Eger bunlar olmuyorsa kontrol sirasi:
- root `.env` Windows makinede mevcut mu
- `CODEX_TELEGRAM_ENABLED=1` mi
- bot token ve chat id dolu mu
- `node scripts/install-codex-shell-integration.js` bu makinede tekrar calistirildi mi
- terminal kapatip yeniden acildi mi

PowerShell veya Git Bash kullanmiyorsan fallback:
- `scripts\\codex-with-telegram.cmd` dosyasini dogrudan calistir

Not:
- `cmd.exe` icin kalici alias yazilmaz
- bu yuzden `cmd.exe` kullaniyorsan plain `codex` yerine wrapper dosyasini dogrudan cagirmalisin

## Linux ve Firebase Studio Kurulum

Hedef:
- bash veya zsh terminalinde `codex` komutu wrapper uzerinden acilsin
- MCP bootstrap akisi terminal acilisindan hemen once calissin

Linux/Firebase Studio'da bir kez calistir:

```bash
git pull origin main
node scripts/install-codex-shell-integration.js
node scripts/bootstrap-codex-mcp.js
```

Iki makinede de birebir ayni env istiyorsan ve root `.env` icinde
`DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG` tanimliysa tercih edilen komut:

```bash
node scripts/bootstrap-codex-mcp.js --full-env-sync
```

Eger package env dosyalarini da tam senkronlamak istiyorsan:

```bash
bash scripts/sync-env.sh all
```

Linux/Firebase Studio installer davranisi:
- varsayilan olarak `~/.bashrc` guncellenir
- `~/.zshrc` varsa veya `--all-shells` verirsen o da guncellenir
- yazilan `codex()` fonksiyonu `scripts/codex-launch.sh` uzerinden `.env` degerine gore MCP veya Telegram wrapper'ini secer

Kurulumdan sonra:
- yeni terminal ac
- `type codex`
- `codex mcp list`
- terminali yeniden acamiyorsan gecici olarak `source ~/.bashrc` calistir

Beklenen sonuc:
- `codex is a function` veya esdeger wrapper tanimi gorunur
- MCP listesi beklenen sekilde gelir
- `CODEX_TELEGRAM_ENABLED=1` ise ayni `codex` komutu Telegram bildirimli akisi da baslatir

## MCP Sayisi Neden Degisir

Bu repoda MCP sayisi sabit degildir.

Taban set:
- `openaiDeveloperDocs`
- `filesystem`
- `r2-local`

Opsiyonel ekler:
- `github` yalnizca `GITHUB_PERSONAL_ACCESS_TOKEN` varsa
- `supabase-mcp-server` yalnizca `SUPABASE_MCP_ACCESS_TOKEN` varsa
- `postgres` yalnizca `POSTGRES_MCP_URL` varsa
- `netlify` yalnizca `NETLIFY_MCP_ENABLED` varsa
- `doppler` yalnizca `DOPPLER_TOKEN` varsa

Ornek:
- hic opsiyonel env yoksa 3 MCP gorursun
- `github` + `supabase-mcp-server` + `postgres` aciksa 6 MCP gorursun
- `netlify` opt-in aciksa buna 1 tane daha eklenir
- `doppler` da aciksa buna 1 tane daha eklenir

## Tek Komutluk Kisa Yollar

Sadece MCP bootstrap/doğrulama icin:

```bash
node scripts/bootstrap-codex-mcp.js
```

Sadece kontrol icin:

```bash
node scripts/bootstrap-codex-mcp.js --check-only
node scripts/install-codex-shell-integration.js --check-only
```

Tam env + MCP bootstrap icin:

```bash
node scripts/bootstrap-codex-mcp.js --full-env-sync
```

Bu komutun davranisi:
- `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG` tam ise once `scripts/update-env-from-doppler.js` calisir
- sonra `backend/.env`, `mobile/.env`, `r2-mcp/.env` ayni akista uretilir
- Doppler bootstrap yoksa fallback olarak `bash scripts/sync-env.sh all` kullanilir
- Telegram backup aktifse eski root `.env` icin `.bak.<timestamp>` dosyasi Telegram'a gonderilir ve local kopya silinir

Codex'i wrapper ile tek seferlik acmak icin:
- Linux/Firebase Studio: `bash scripts/codex-with-mcp.sh`
- Windows: `scripts\\codex-with-mcp.cmd`

Codex'i Telegram wrapper ile tek seferlik acmak icin:
- Linux/Firebase Studio: `bash scripts/codex-with-telegram.sh`
- Windows: `scripts\\codex-with-telegram.cmd`

Telegram'dan son `.env` backup'ini geri almak icin:
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js restore-backup`
- `node .codex/skills/telegram-progress-reporter/scripts/telegram_progress_notifier.js restore-backup --backup-id <id> --output <path>`

Shell entegrasyonu kuruluysa plain `codex` davranisi:
- `CODEX_TELEGRAM_ENABLED=1` ise `scripts/codex-with-telegram.*`
- aksi halde `scripts/codex-with-mcp.*`
- her iki wrapper da acilista ayni Doppler sync sorusunu kullanir

## Installer Ne Yapar

`node scripts/install-codex-shell-integration.js` su davranisi uygular:

Linux/macOS:
- `~/.bashrc` icine managed `codex()` launcher fonksiyonu yazar
- gerekiyorsa `~/.zshrc` icine de ayni blok yazilir

Windows:
- `Documents\\PowerShell\\Microsoft.PowerShell_profile.ps1`
- `Documents\\WindowsPowerShell\\Microsoft.PowerShell_profile.ps1`
- Git Bash icin `~/.bashrc`

Launcher kuralı:
- launcher root `.env` icindeki `CODEX_TELEGRAM_ENABLED` degerini okur
- `1` ise Telegram wrapper'i secer
- aksi halde MCP wrapper'i secer

Ortak kural:
- mevcut dosya tamamen ezilmez
- sadece `# BEGIN WIZYCLUB CODEX MCP LAUNCHER` ile `# END WIZYCLUB CODEX MCP LAUNCHER` arasindaki managed block guncellenir

## Bootstrap Scripti Ne Yapar

`node scripts/bootstrap-codex-mcp.js` su akisi calistirir:
- ortami algilar: Windows, Linux, VSCode, Firebase Studio
- `--full-env-sync` verildiyse ve Doppler bootstrap tam ise once root `.env` Doppler'dan yenilenir
- `--full-env-sync` verildiyse ama Doppler bootstrap yoksa fallback olarak `scripts/sync-env.sh all` calistirilir
- gerekirse `r2-mcp` bagimliliklarini kurar
- `node scripts/setup-codex-mcp.js` calistirir
- `node scripts/doctor-codex-mcp.js` calistirir
- `node -c r2-mcp/custom-r2-server.js` calistirir
- uygunsa `codex mcp list` ile listeyi gosterir

## Basari Kriteri

Kurulum sonunda minimum beklenen durum:
- `node scripts/doctor-codex-mcp.js` basarili biter
- `codex mcp list` icinde minimum `openaiDeveloperDocs`, `filesystem`, `r2-local` gorunur
- `r2-local` kaydi mevcut workspace altindaki `r2-mcp/custom-r2-server.js` yolunu gosterir
- shell entegrasyonu kurulduysa `codex` komutu wrapper uzerinden acilir

Telegram wrapper aktifse ek beklenen durum:
- oturum baslangic ve bitis mesajlari Telegram'a gider
- Linux/Firebase Studio tarafinda periyodik ozet mesajlari da gelir

Opsiyonel durum:
- `github`, `supabase-mcp-server`, `postgres`, `netlify`, `doppler` gorunmeyebilir
- bu normaldir; ilgili token veya URL tanimli degilse eklenmezler

## Sorun Giderme

Su hata tekrar gorulurse:

```text
MCP client for `cloudflare` failed to start
connection closed: initialize response
```

Kontrol sirasi:
- eski `cloudflare` kaydi kalmis mi
- kok `.env` eksik mi
- `r2-mcp/.env` uretilmis mi
- `r2-mcp/node_modules` kurulmus mu
- config yanlis workspace path gosteriyor mu

Bir dakikalik kurtarma:

```bash
node scripts/bootstrap-codex-mcp.js
node scripts/install-codex-shell-integration.js
codex mcp list
```

Eger hala sorun varsa:
- `doctor-codex-mcp` `Managed MCP block is missing` diyorsa setup bu makinede calismamistir
- `node scripts/bootstrap-codex-mcp.js --full-env-sync` sirasinda `Doppler bootstrap is partial` gorursen root `.env` icinde `DOPPLER_TOKEN`, `DOPPLER_PROJECT`, `DOPPLER_CONFIG` anahtarlarini birlikte doldur
- `restore-backup` sirasinda `unsupported legacy format` gorursen secilen backup 2026-03-10 oncesi eski encrypted akistan kalmadir; yeni bir plaintext backup olusturup onu kullan
- Windows `cmd.exe` kullaniyorsan kalici alias bekleme; `scripts\\codex-with-mcp.cmd` kullan
- `bash scripts/sync-env.sh all` Windows'ta calismiyorsa Git Bash veya WSL kullan
- PowerShell'de `running scripts is disabled on this system` gorursen `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` calistirip terminali yeniden ac
- PowerShell `bash` komutunu bulamiyorsa `& "C:\\Program Files\\Git\\bin\\bash.exe" scripts/sync-env.sh all` ile devam et
- `node` veya `npx` yoksa once lokal Node.js kurulumunu duzelt
- Firebase/Linux'ta `Root .env not found` alirsan `cp .env.example .env` ile dosyayi olusturup gerekli R2 anahtarlarini doldur
- Firebase/Linux'ta `codex: command not found` alirsan once Codex CLI kurulumunu dogrula; gecici olarak `bash scripts/codex-with-mcp.sh` ile wrapper akisini test et
- Firebase/Linux'ta shell entegrasyonu kurulup `type codex` hala function gostermuyorsa yeni terminal ac veya `source ~/.bashrc` calistir

## Operasyon Kurali

Bu repoda MCP ekleme veya degistirme su sekilde yapilmali:
1. `.codex/mcp-servers.json` guncellenir
2. gerekiyorsa `.env.example` guncellenir
3. gerekiyorsa `scripts/setup-codex-mcp.js`, `scripts/doctor-codex-mcp.js`, `scripts/bootstrap-codex-mcp.js` veya `scripts/install-codex-shell-integration.js` genisletilir
4. `node scripts/bootstrap-codex-mcp.js` ile dogrulanir

Manuel olarak user config'e satir yazmak veya `codex mcp add ...` ile tek tek kayit acmak standart yol degildir.

## Referanslar

- `MCP_STANDARDIZATION_GUIDE.md`
- `LOKAL_GECIS_VE_ENV_R2_REHBERI.md`
- `.codex/config.template.toml`
