# Theme Colors

## Kaynaklar
- Aktif değerler: `mobile/src/core/constants/theme-colors.config.json`
- Varsayılanlar + kullanım notları: `mobile/src/core/constants/theme-colors.defaults.json`
- Uygulama export noktası: `mobile/src/core/constants/index.ts`

## Tema Paneli (`tema`)
- `tema`: İnteraktif tema panelini açar.
- `tema list`: Tüm tema anahtarlarını, aktif değerleri ve kullanım yollarını listeler.
- `tema reset`: Tüm tema anahtarlarını varsayılana döndürür.
- `tema reset <key>`: Sadece seçili anahtarı varsayılana döndürür.
- Panel içi sıfırlama: Seçili satırda `[R] Varsayılana Sıfırla`, tümü için `[A] Tümünü Varsayılana Sıfırla`.

> `tema` komutunun shell'e tanımlanması için: `scripts/setup-tema-alias.sh` (bash/zsh) veya `scripts/setup-tema-alias.ps1` (PowerShell).

## Aktif Tema Renkleri

| Key | Light | Dark | Kullanım Yerleri |
| --- | --- | --- | --- |
| background | `#FFFFFF` | `#080A0F` | `mobile/app/search.tsx`, `mobile/app/(tabs)/profile.tsx`, `mobile/app/(tabs)/explore.tsx`, `mobile/src/presentation/components/feed/FeedManager.styles.ts`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx` |
| videoBackground | `#000000` | `#080A0F` | `mobile/src/presentation/components/story/StoryActions.tsx`, `mobile/src/presentation/components/story/StoryPage.tsx`, `mobile/src/presentation/components/story/StoryViewer.tsx`, `mobile/src/presentation/components/feed/FeedStatusViews.tsx`, `mobile/src/presentation/components/feed/FeedManager.styles.ts` |
| card | `#F2F2F7` | `#222222` | `mobile/app/user/[id].tsx`, `mobile/app/(tabs)/profile.tsx`, `mobile/app/paywall/badge.tsx`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx` |
| black | `#000000` | `#000000` | `mobile/src/presentation/components/shared/InAppBrowserOverlay.tsx` |
| border | `#E5E5EA` | `#333333` | `mobile/src/presentation/components/shared/InAppBrowserOverlay.tsx`, `mobile/src/presentation/components/profile/EditProfileSheet.tsx` |
| textPrimary | `#000000` | `#FFFFFF` | `mobile/app/search.tsx`, `mobile/app/(tabs)/profile.tsx`, `mobile/app/(tabs)/notifications.tsx`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`, `mobile/src/presentation/components/profile/EditProfileSheet.tsx` |
| textSecondary | `#8E8E93` | `rgba(255, 255, 255, 0.6)` | `mobile/app/search.tsx`, `mobile/app/user/[id].tsx`, `mobile/app/paywall/badge.tsx`, `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`, `mobile/src/presentation/components/profile/EditProfileSheet.tsx` |
