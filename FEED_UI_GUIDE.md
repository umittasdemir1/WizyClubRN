# Feed UI Toggle Guide

Bu araç, `mobile/src/presentation/components/feed/hooks/useFeedConfig.ts` dosyasındaki UI layer bayraklarını (flags) yönetmek için geliştirilmiştir.

## Kullanım Yöntemleri

### 1. İnteraktif Mod (Tavsiye Edilen)
Sadece `UI` yazarak interaktif arayüzü açabilirsiniz:
```bash
UI
```
- **Yukarı/Aşağı Ok:** Modüller arasında gezinme.
- **Space / Enter:** Seçili modülü açma/kapama.
- **q:** Çıkış.

### 2. Hızlı Komutlar (CLI)
Arayüzü açmadan direkt işlem yapmak için:
- `UI list`: Tüm bayrakların durumunu listeler.
- `UI Açık`: Tüm UI'ı aktif eder (Master switches OFF).
- `UI Kapalı`: Tüm UI'ı kapatır (Master switches ON).
- `UI <FLAG_NAME> <DURUM>`: Belirli bir bayrağı değiştirir.

## Notlar
- `UI` komutunun her yerden çalışması için alias veya PATH tanımlanmış olmalıdır.
- Değişiklik sonrası Expo'da `r` (reload) yapmayı unutmayın.
