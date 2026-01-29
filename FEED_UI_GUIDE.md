# WizyClub Feed UI Architect Guide

Bu araç, uygulamanın Feed (Akış) tarafındaki görsel katmanları ve çekirdek mantığı terminalden yönetmek için geliştirilmiştir.

## Kullanım Yöntemleri

### 1. Profesyonel Kısayol (Tavsiye Edilen)
Herhangi bir terminale sadece `ui` yazarak panele erişebilirsiniz:
```powershell
ui
ui
```

### 2. Yeni Ortam / IDE Kurulumu (Kalıcı Kısayol)
Eğer başka bir bilgisayara geçerseniz veya kısayol çalışmazsa, bir kez şu komutu terminale yapıştırın:
```powershell
if (!(Test-Path $PROFILE)) { New-Item -Path $PROFILE -Type File -Force }; Add-Content $PROFILE "`nfunction ui { node ""$PWD\scripts\ui.js"" `$args }" -ErrorAction SilentlyContinue; function ui { node "$PWD\scripts\ui.js" $args }
```

### 3. İnteraktif Menü Kontrolleri
Açılan **"ARAYÜZ YÖNETİM PANELİ"** üzerinden:
- **[CORE]**: Kaydırma ve etkileşim gibi hayati döngüler.
- **[MASTER]**: Tek tuşla tüm arayüzü gizleyen ana anahtarlar.
- **[PARÇA]**: **Avatar, İsim, SeekBar, Butonlar ve Ticari Etiket** gibi elemanları tek tek kapatıp açabilen granüler kontroller.

**Kontrol Tuşları:**
- **Yön Tuşları (↑/↓):** Elemanlar arasında gezinti.
- **Boşluk (Space) / Enter:** Durumu değiştir (AÇIK 🟢 / KAPALI 🔴).
- **Q:** Kaydet ve çık.

## Komut Satırı Seçenekleri (Hızlı Erişim)
- `ui on`: Her şeyi (tüm görsel katmanları) aktif eder.
- `ui off`: Master switch ile tüm görsel katmanları kapatır.
- `node scripts/ui.js list`: Teknik liste görünümü sunar.

## Mimari Notlar
- **Bağımlılık:** `mobile/src/presentation/components/feed/hooks/useFeedConfig.ts` dosyasını manipüle eder.
- **Deterministik Yapı:** [CORE] bayrakları, Master Switch'lerden etkilenmez; böylece test sırasında UI kapalıyken bile kaydırma gibi temel özellikler çalışmaya devam eder.
- **Yenileme:** Değişiklik sonrası Expo terminalinde `r` tuşuna basarak uygulamayı yenilemeniz önerilir.

