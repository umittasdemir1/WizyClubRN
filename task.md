# Tema Yönetim Paneli Görev Takibi

## Hedef
- `tema` komutuyla açılan yeni bir terminal arayüzü oluşturmak.
- Uygulamada kullanılan tema renklerini (light/dark) bu arayüzden görüntülemek ve güncellemek.
- Her renk için kullanım yeri bilgisini göstermek.
- Her renk için "varsayılana sıfırla" aksiyonu eklemek.
- Varsayılan değerleri ayrı bir dosyada tutmak.

## Adımlar
- [x] 1. Mevcut `ui` script altyapısını ve komut eşlemesini analiz et.
- [x] 2. Tema renkleri için yeni kaynak dosya yapısını tasarla (aktif config + defaults + kullanım notları).
- [x] 3. `mobile/src/core/constants/index.ts` dosyasını yeni tema kaynak dosyasını kullanacak şekilde güncelle.
- [x] 4. `scripts/tema.js` interaktif yönetim scriptini yaz.
- [x] 5. `tema` komutunu çağıracak yardımcı script/alias dosyalarını ekle.
- [x] 6. Dokümantasyonu güncelle (`THEME_COLORS.md` + kullanım notu).
- [x] 7. Tüm değişiklikler sonrası typecheck doğrulaması yap.

## İlerleme Günlüğü
- 2026-02-06: `scripts/ui.js`, alias setup dosyaları ve wrapper komutları incelendi. `ui` komutunun FEED flag düzenleme mantığı doğrulandı.
- 2026-02-06: `mobile/src/core/constants/theme-colors.defaults.json` ve `mobile/src/core/constants/theme-colors.config.json` oluşturuldu. Varsayılan + aktif tema renkleri ayrıştırıldı, kullanım yerleri defaults dosyasına eklendi.
- 2026-02-06: `mobile/src/core/constants/index.ts` tema renklerini doğrudan hardcode yerine `theme-colors.config.json` kaynağından okuyacak şekilde güncellendi.
- 2026-02-06: `scripts/tema.js` eklendi. Tema anahtarlarını listeleme, light/dark düzenleme, seçili/tüm tema için varsayılana sıfırlama ve kullanım yolu gösterimi tamamlandı.
- 2026-02-06: `scripts/TEMA`, `scripts/tema.bat`, `scripts/setup-tema-alias.sh`, `scripts/setup-tema-alias.ps1` dosyaları eklendi ve çalıştırma izinleri ayarlandı.
- 2026-02-06: `THEME_COLORS.md` yeni tema altyapısına göre güncellendi; `tema` komutu kullanımı, reset akışı, aktif değerler ve kullanım yerleri dokümante edildi.
- 2026-02-06: Tüm adımlar sonrası tekrar `cd mobile && npx tsc --noEmit` çalıştırıldı, typecheck temiz geçti (0 hata).
- 2026-02-06: Kesinti sonrası devam edildi; `node scripts/tema.js list`, `node scripts/tema.js reset background`, `node scripts/tema.js reset` komutları doğrulandı.
- 2026-02-06: Devam doğrulaması sonrası tekrar `cd mobile && npx tsc --noEmit` çalıştırıldı, typecheck temiz geçti.
- 2026-02-06: Kullanıcı oturumunda `tema` bulunamama sorunu için `scripts/setup-tema-alias.sh` ve `scripts/setup-tema-alias.ps1` güçlendirildi; `~/.local/bin/tema` ve `~/.local/bin/TEMA` launcher kurulumu eklendi, `TEMA` alias desteği eklendi.
- 2026-02-06: Kurulum tekrar çalıştırıldı ve yeni interactive shell doğrulamasında `tema` + `TEMA` komutları çözümlendi.
- 2026-02-06: `THEME_GUIDE.md` eklendi. Farkli IDE kurulum adimlari, baslatma komutlari, kullanim tuslari ve sorun giderme adimlari dokumante edildi.
