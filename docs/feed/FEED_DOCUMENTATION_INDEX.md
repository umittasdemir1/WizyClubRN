# Feed Documentation Index

> **Last Updated:** 2025-01-28  
> **Path:** `docs/feed/`

---

## Analysis & Reports

| Document | Language | Description |
|----------|----------|-------------|
| [FEED_CLEANUP_REFACTOR_REPORT_EN.md](./FEED_CLEANUP_REFACTOR_REPORT_EN.md) | 🇬🇧 English | Comprehensive cleanup and refactor readiness analysis of all feed components |
| [FEED_CLEANUP_REFACTOR_REPORT_TR.md](./FEED_CLEANUP_REFACTOR_REPORT_TR.md) | 🇹🇷 Turkish | Feed bileşeni temizlik ve refaktör hazırlık analizi |

## TODO Lists

| Document | Language | Description |
|----------|----------|-------------|
| [FEED_REFACTOR_TODO_EN.md](./FEED_REFACTOR_TODO_EN.md) | 🇬🇧 English | Exhaustive TODO list with 18 actionable refactor tasks |
| [FEED_REFACTOR_TODO_TR.md](./FEED_REFACTOR_TODO_TR.md) | 🇹🇷 Turkish | 18 adet aksiyon alınabilir refaktör görevi listesi |

## Historical Documents

| Document | Description |
|----------|-------------|
| [37 - Feed Ui Test Flags.md](./37%20-%20Feed%20Ui%20Test%20Flags.md) | UI layer disable flags documentation |
| [38 - Feed Manager Refactoring.md](./38%20-%20Feed%20Manager%20Refactoring.md) | Previous FeedManager refactor notes |
| [39 - Feed Refactor Todo.md](./39%20-%20Feed%20Refactor%20Todo.md) | Previous refactor TODO list |
| [40 - Feed Manager Refactor Verification.md](./40%20-%20Feed%20Manager%20Refactor%20Verification.md) | Refactor verification walkthrough |

---

## Quick Links

### Component File Locations

```
mobile/src/presentation/components/feed/
├── FeedManager.tsx          # Main orchestrator (1524 lines)
├── VideoPlayerPool.tsx      # 3-slot video recycling (870 lines)
├── ActiveVideoOverlay.tsx   # Decoupled UI overlay
├── ActionButtons.tsx        # Like, save, share, shop
├── MetadataLayer.tsx        # User info, description
├── VideoSeekBar.tsx         # Seek bar with SharedValue
├── HeaderOverlay.tsx        # Mute, stories, upload, tabs
├── StoryBar.tsx             # Horizontal story list
├── StoryAvatar.tsx          # Story ring component
├── DoubleTapLike.tsx        # Double-tap gesture handler
├── BrightnessOverlay.tsx    # Brightness control overlay
├── CarouselLayer.tsx        # Multi-image/video carousel
├── UploadModal.tsx          # Video upload wizard
├── DeleteConfirmationModal.tsx # Delete confirmation
├── FeedSkeleton.tsx         # Loading skeleton
└── SpritePreview.tsx        # Sprite sheet preview
```

### Key Metrics

| Metric | Value |
|--------|-------|
| Total Files | 16 |
| Total Lines | ~5,200 |
| Refactor Readiness | 7/10 |
| High-Risk Tasks | 3 |
| Medium-Risk Tasks | 4 |
| Low-Risk Tasks | 11 |
