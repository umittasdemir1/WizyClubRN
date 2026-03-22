# WizyClub Theme Manager Guide

Bu rehber, `tema` terminal araci ile uygulamadaki tema renklerini yonetmek icindir.

## 1) Ne Ise Yarar?

- Light/Dark tema renklerini terminal panelinden degistirirsin.
- Her renk icin kullanim yerlerini gorursun.
- Secili rengi veya tum renkleri varsayilana sifirlarsin.

## 2) Tema Dosya Yapisi

- Aktif degerler: `mobile/src/core/constants/theme-colors.config.json`
- Varsayilanlar + kullanim notlari: `mobile/src/core/constants/theme-colors.defaults.json`
- Uygulama export noktasi: `mobile/src/core/constants/index.ts`
- Terminal panel scripti: `scripts/tema.js`

## 3) Hizli Baslatma

Proje kokunde:

```bash
tema
```

Alias yoksa dogrudan:

```bash
node scripts/tema.js
```

## 4) Yeni IDE / Yeni Ortam Kurulumu

### Bash / Linux / macOS

```bash
bash scripts/setup-tema-alias.sh
source ~/.bashrc && hash -r
```

### PowerShell (Windows / VS Code)

```powershell
.\scripts\setup-tema-alias.ps1
```

Not: Script, `~/.local/bin/tema` ve `~/.local/bin/TEMA` launcherlarini da olusturur.

## 5) Komutlar

- `tema`: Interaktif tema panelini acar.
- `tema list`: Tum tema anahtarlarini, mevcut degerleri ve kullanim yerlerini listeler.
- `tema reset`: Tum tema renklerini varsayilana dondurur.
- `tema reset <key>`: Sadece secili anahtari varsayilana dondurur.

## 6) Panel Tuslari

- `Up/Down`: Satirlar arasinda gezin.
- `L`: Secili tema icin sadece `light` degerini duzenle.
- `D`: Secili tema icin sadece `dark` degerini duzenle.
- `Enter` / `Space`: Light + dark birlikte duzenle.
- `R`: Secili satiri varsayilana sifirla.
- `A`: Tum tema anahtarlarini varsayilana sifirla.
- `Q`: Kaydet ve cik.

## 7) Degisiklik Sonrasi Uygulama

- Tema degerleri JSON dosyasina yazilir.
- Metro aciksa cogu durumda Fast Refresh ile gorunur.
- Gerekirse Expo terminalinde `r` ile yenile.

## 8) Sorun Giderme

### `tema: command not found`

```bash
source ~/.bashrc && hash -r
command -v tema
command -v TEMA
```

Hala yoksa kurulum scriptini tekrar calistir:

```bash
bash scripts/setup-tema-alias.sh
```

### `mobile/` klasorundeyken script bulunamiyor

`mobile` icindeysen goreli yol farkli olur:

```bash
node ../scripts/tema.js
bash ../scripts/setup-tema-alias.sh
```

### Alias olmadan gecici calistirma

```bash
node /home/user/WizyClubRN/scripts/tema.js
```

## 9) Onerilen Gunluk Akis

1. Proje kokunde `tema` komutunu calistir.
2. Guncellemek istedigin rengi sec.
3. `L` veya `D` ile yeni degeri gir.
4. UI kontrolu yap.
5. Gerekirse `R` ile secili rengi varsayilana dondur.
