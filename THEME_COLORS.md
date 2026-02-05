# Theme Colors

Source: `mobile/src/core/constants/index.ts`

Aşağıdaki tablo, uygulamadaki **tema renklerinin tamamını** ve **örnek kullanım** yerlerini gösterir.
"Doğrudan kullanım yok" yazanlar şu an kodda direkt referanslanmıyor.

| Key | Light | Dark | Örnek Kullanım |
| --- | --- | --- | --- |
| accent | `#7C3AED` | `#7C3AED` | — (doğrudan kullanım yok) |
| background | `#FFFFFF` | `#080A0F` | `mobile/src/presentation/components/sheets/DescriptionSheet.tsx:26` — `const bgColor = isDark ? '#1c1c1e' : themeColors.background;` |
| black | `#000000` | `#000000` | `mobile/src/presentation/components/shared/InAppBrowserOverlay.tsx:203` — `backgroundColor: LIGHT_COLORS.black,` |
| border | `#E5E5EA` | `#333333` | `mobile/src/presentation/components/shared/InAppBrowserOverlay.tsx:214` — `borderBottomColor: LIGHT_COLORS.border,` |
| card | `#F2F2F7` | `#222222` | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx:246` — `<View style={[styles.avatar, { backgroundColor: colors.card }]} />` |
| error | `#FF3B30` | `#FF6B6B` | — (doğrudan kullanım yok) |
| overlay | `rgba(0, 0, 0, 0.3)` | `rgba(0, 0, 0, 0.5)` | — (doğrudan kullanım yok) |
| primary | `#FF3B30` | `#FF3B30` | — (doğrudan kullanım yok) |
| success | `#34C759` | `#10B981` | — (doğrudan kullanım yok) |
| textMuted | `#AEAEB2` | `#8E8E93` | — (doğrudan kullanım yok) |
| textPrimary | `#000000` | `#FFFFFF` | `mobile/src/presentation/components/sheets/DescriptionSheet.tsx:27` — `const textPrimary = themeColors.textPrimary;` |
| textSecondary | `#8E8E93` | `rgba(255, 255, 255, 0.6)` | `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:148` — `<Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>` |
| trackBackground | `rgba(0, 0, 0, 0.1)` | `rgba(255, 255, 255, 0.2)` | — (doğrudan kullanım yok) |
| trackBuffered | `rgba(0, 0, 0, 0.2)` | `rgba(255, 255, 255, 0.4)` | — (doğrudan kullanım yok) |
| trackProgress | `#000000` | `#FFFFFF` | — (doğrudan kullanım yok) |
| videoBackground | `#000000` | `#080A0F` | `mobile/src/presentation/components/story/StoryActions.tsx:195` — `backgroundColor: COLORS.videoBackground,` |
| warning | `#FF9500` | `#FFA500` | — (doğrudan kullanım yok) |
| white | `#FFFFFF` | `#FFFFFF` | — (doğrudan kullanım yok) |

