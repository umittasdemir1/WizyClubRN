# Modal & Sheet Inventory

## Aktif Kullanılanlar

### UploadModal
- Component: `mobile/src/presentation/components/upload/UploadModal.tsx`
- Usage:
  - `mobile/app/upload.tsx:367`
  - `mobile/app/storyUpload.tsx:194`
- Background:
  - Main: `isDark ? '#080A0F' : '#FFFFFF'` (`mobile/src/presentation/components/upload/UploadModal.tsx:100`)
  - Overlay: `rgba(0,0,0,0.6)` (`mobile/src/presentation/components/upload/UploadModal.tsx:664`)
  - Sub-modal overlay: `rgba(0,0,0,0.5)` (`mobile/src/presentation/components/upload/UploadModal.tsx:915`)
  - Menu card: `isDark ? '#1C1C1E' : '#FFFFFF'` (`mobile/src/presentation/components/upload/UploadModal.tsx:525`)

### DraftActionsSheet
- Component: `mobile/src/presentation/components/profile/DraftActionsSheet.tsx`
- Usage:
  - `mobile/app/drafts.tsx:98`
- Background:
  - `isDark ? '#1C1C1E' : '#FFFFFF'` (`mobile/src/presentation/components/profile/DraftActionsSheet.tsx:19`)

### BioBottomSheet
- Component: `mobile/src/presentation/components/profile/BioBottomSheet.tsx`
- Usage:
  - `mobile/app/(tabs)/profile.tsx:1247`
  - `mobile/app/user/[id].tsx:710`
- Background:
  - `isDark ? '#1c1c1e' : themeColors.background` (`mobile/src/presentation/components/profile/BioBottomSheet.tsx:23`)

### EditProfileSheet
- Component: `mobile/src/presentation/components/profile/EditProfileSheet.tsx`
- Usage:
  - `mobile/app/(tabs)/profile.tsx:1248`
- Background:
  - Sheet: `isDark ? '#1c1c1e' : themeColors.background` (`mobile/src/presentation/components/profile/EditProfileSheet.tsx:71`)
  - Zoom modal overlay: `rgba(0, 0, 0, 0.92)` (`mobile/src/presentation/components/profile/EditProfileSheet.tsx:557`)

### UserOptionsModal
- Component: `mobile/src/presentation/components/profile/UserOptionsModal.tsx`
- Usage:
  - `mobile/app/user/[id].tsx:711`
- Background:
  - Overlay: `rgba(0,0,0,0.5)` (`mobile/src/presentation/components/profile/UserOptionsModal.tsx:90`)
  - Container: `#1c1c1e` (`mobile/src/presentation/components/profile/UserOptionsModal.tsx:98`)

### StoryMoreOptionsSheet
- Component: `mobile/src/presentation/components/story/StoryMoreOptionsSheet.tsx`
- Usage:
  - `mobile/src/presentation/components/story/StoryViewer.tsx:847`
- Background:
  - `isDark ? '#1c1c1e' : themeColors.background` (`mobile/src/presentation/components/story/StoryMoreOptionsSheet.tsx:42`)

### StoryDeleteConfirmationModal
- Component: `mobile/src/presentation/components/story/StoryDeleteConfirmationModal.tsx`
- Usage:
  - `mobile/src/presentation/components/story/StoryViewer.tsx:855`
- Background:
  - Overlay: `rgba(0,0,0,0.45)` (`mobile/src/presentation/components/story/StoryDeleteConfirmationModal.tsx:53`)
  - Container: `#1c1c1e` (`mobile/src/presentation/components/story/StoryDeleteConfirmationModal.tsx:62`)

### InfiniteFeedMoreOptionsSheet
- Component: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedMoreOptionsSheet.tsx`
- Usage:
  - `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:1122`
- Background:
  - `isDark ? '#1c1c1e' : themeColors.background` (`mobile/src/presentation/components/infiniteFeed/InfiniteFeedMoreOptionsSheet.tsx:26`)

### InfiniteFeedDeleteConfirmationModal
- Component: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedDeleteConfirmationModal.tsx`
- Usage:
  - `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx:1128`
- Background:
  - Overlay: `rgba(0,0,0,0.5)` (`mobile/src/presentation/components/infiniteFeed/InfiniteFeedDeleteConfirmationModal.tsx:53`)
  - Container: `#1c1c1e` (`mobile/src/presentation/components/infiniteFeed/InfiniteFeedDeleteConfirmationModal.tsx:62`)

### MoreOptionsSheet
- Component: `mobile/src/presentation/components/sheets/MoreOptionsSheet.tsx`
- Usage:
  - `mobile/src/presentation/components/poolFeed/PoolFeedOverlays.tsx:291`
- Background:
  - `isDark ? '#1c1c1e' : themeColors.background` (`mobile/src/presentation/components/sheets/MoreOptionsSheet.tsx:34`)

### DescriptionSheet
- Component: `mobile/src/presentation/components/sheets/DescriptionSheet.tsx`
- Usage:
  - `mobile/src/presentation/components/poolFeed/PoolFeedOverlays.tsx:302`
- Background:
  - `isDark ? '#1c1c1e' : themeColors.background` (`mobile/src/presentation/components/sheets/DescriptionSheet.tsx:26`)

### PoolFeedDeleteConfirmationModal
- Component: `mobile/src/presentation/components/poolFeed/PoolFeedDeleteConfirmationModal.tsx`
- Usage:
  - `mobile/src/presentation/components/poolFeed/PoolFeedOverlays.tsx:312`
- Background:
  - Overlay: `rgba(0,0,0,0.5)` (`mobile/src/presentation/components/poolFeed/PoolFeedDeleteConfirmationModal.tsx:52`)
  - Container: `#1c1c1e` (`mobile/src/presentation/components/poolFeed/PoolFeedDeleteConfirmationModal.tsx:61`)

### ProfileSettingsOverlay (sheet-like panel)
- Component: `mobile/src/presentation/components/profile/ProfileSettingsOverlay.tsx`
- Usage:
  - `mobile/app/(tabs)/profile.tsx:1374`
- Background:
  - Panel: `bgContainer` (`mobile/src/presentation/components/profile/ProfileSettingsOverlay.tsx:270`)
  - Backdrop: `rgba(0,0,0,0.45)` (`mobile/app/(tabs)/profile.tsx:1607`)

### DeletedContentMenu (settings panel content)
- Component: `mobile/src/presentation/components/profile/DeletedContentSheet.tsx`
- Usage:
  - `mobile/src/presentation/components/profile/ProfileSettingsOverlay.tsx:1507`
- Background:
  - Tab inactive: `isDark ? '#1c1c1e' : '#f2f2f5'` (`mobile/src/presentation/components/profile/DeletedContentSheet.tsx:31`)
  - Tab active: `isDark ? '#3a3a3e' : '#e0e0e4'` (`mobile/src/presentation/components/profile/DeletedContentSheet.tsx:30`)

## App İçindeki Inline Modallar

### Explore PreviewModal
- Usage:
  - `mobile/app/(tabs)/explore.tsx:99`
- Background:
  - Overlay: `rgba(0,0,0,0.85)` (`mobile/app/(tabs)/explore.tsx:523`)
  - Card: `#1a1a1a` (`mobile/app/(tabs)/explore.tsx:532`)

### Profile PreviewModal
- Usage:
  - `mobile/app/(tabs)/profile.tsx:1246`
- Background:
  - Overlay: `rgba(0,0,0,0.85)` (`mobile/app/(tabs)/profile.tsx:1486`)
  - Card: `#000` (`mobile/app/(tabs)/profile.tsx:1487`)

### Profile Shop Modal
- Usage:
  - `mobile/app/(tabs)/profile.tsx:1255`
- Background:
  - Backdrop: `rgba(0,0,0,0.5)` (`mobile/app/(tabs)/profile.tsx:1494`)
  - Container: `isDark ? '#1A1A1A' : '#FFFFFF'` (`mobile/app/(tabs)/profile.tsx:1267`)

### User PreviewModal
- Usage:
  - `mobile/app/user/[id].tsx:709`
- Background:
  - Overlay: `rgba(0,0,0,0.85)` (`mobile/app/user/[id].tsx:739`)
  - Card: `#000` (`mobile/app/user/[id].tsx:740`)

### Paywall Badge Modal
- Usage:
  - `mobile/app/paywall/badge.tsx:215`
- Background:
  - Backdrop: `rgba(0,0,0,0.55)` (`mobile/app/paywall/badge.tsx:425`)
  - Card: `cardBg` (`mobile/app/paywall/badge.tsx:222`)

## Kodda Var, Kullanım Bulunamadı
- `mobile/src/presentation/components/sheets/ShoppingSheet.tsx`
- `mobile/src/presentation/components/profile/ClubsBottomSheet.tsx`
- `mobile/src/presentation/components/profile/SettingsBottomSheet.tsx`
