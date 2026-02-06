# App Cache Settings Audit (February 6, 2026)

## Scope
- Infinite feed, pool feed, prefetch/download pipeline
- Video disk/memory cache service
- Image cache usage
- App-level persisted storage (session/settings/history/metrics)
- Crash hardening related to media player callbacks

## Cache Inventory

### 1) VideoCacheService (core video cache)
- File: `mobile/src/data/services/VideoCacheService.ts`
- Disk directory: `Paths.cache/video-cache` (`:13`)
- Disk size limit: `500 MB` (`:14`)
- In-memory map size: `100` entries (`:15`)
- In-memory TTL: `60 min` (`:16`)
- Stable cache key strips query/hash from HTTP(S): (`:22-43`)
- Disk prune runs in background after init: (`:114-134`, `:264-298`)
- Full cache clear API exists: (`:300-318`)

### 2) Prefetch queue service
- File: `mobile/src/data/services/FeedPrefetchService.ts`
- Queue size:
  - Fast network: `30`
  - Other: `15`
  - (`:35-42`)
- Parallel downloads:
  - Fast network: `3`
  - Other: `2`
  - (`:35-42`)
- Queue resets when active index changes (`generation`, queue clear): (`:53-58`)

### 3) Infinite feed playback/cache integration
- File: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedManager.tsx`
- Active video flow:
  - bump queue priority + queue active (`:286-287`)
  - warmup active (`:288`)
  - memory hit -> resolved source (`:296-303`)
  - miss -> force `cacheVideoNow` + disk fallback resolve (`:306-349`)
- Nearby prefetch + thumbnail prefetch: (`:354-376`)

### 4) Infinite card player-level buffering/cache props
- File: `mobile/src/presentation/components/infiniteFeed/InfiniteFeedCard.tsx`
- Uses network-aware buffer config (`:148-151`)
- Video source includes:
  - `bufferConfig.cacheSizeMB: 64` (`:156-159`)
  - `minLoadRetryCount: 5` (`:160`)
- Player props for black-screen mitigation:
  - `hideShutterView` (`:505`)
  - `shutterColor="transparent"` (`:506`)
  - `poster` (`:507`)
  - `useTextureView` (`:510`)

### 5) Shared buffer policy
- File: `mobile/src/core/utils/bufferConfig.ts`
- Local file (cached): near-instant start (`:16-23`)
- Wi-Fi/Ethernet profile: (`:27-34`)
- Cellular profile: (`:35-41`)
- Unknown/offline fallback profile: (`:42-50`)

### 6) Pool feed cache usage
- File: `mobile/src/presentation/components/feed/hooks/useFeedScroll.ts`
- On active change:
  - current/next warmup (`:213-217`)
  - next `cacheVideo` (`:217`)
  - thumbnail prefetch (`:222-226`)
  - deferred neighbor prefetch queue (`:235-247`)
- File: `mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts`
- On file-cache playback error: cached file deleted + network fallback (`:55-75`)

### 7) Global cache kill switch
- File: `mobile/src/core/utils/videoCacheToggle.ts`
- `globalThis.__WIZY_DISABLE_VIDEO_CACHE__` disables video cache pipeline (`:1-4`)

### 8) Other persisted storages (not media bytes)
- Supabase auth session persisted in AsyncStorage/localStorage:
  - `mobile/src/core/supabase.ts:26-35`
- Theme store persisted:
  - `mobile/src/presentation/store/useThemeStore.ts:24-54`
- In-app browser history persisted:
  - `mobile/src/presentation/store/useInAppBrowserStore.ts:25-57`
- Performance metrics persisted (`@performance_metrics`, last 100):
  - `mobile/src/core/services/PerformanceLogger.ts:13-15`
  - `mobile/src/core/services/PerformanceLogger.ts:208-241`

## Findings

### Critical (Fixed): Feed refresh was wiping all video cache
- Root cause:
  - `refreshFeed()` used `VideoCacheService.clearCache()` before re-fetch.
  - This clears disk + memory cache globally.
- Impact:
  - Previously watched videos re-open via network instead of local file.
  - Higher probability of black frame while source is reacquired.
- Fix applied:
  - Removed global clear from refresh flow.
  - File: `mobile/src/presentation/hooks/useVideoFeed.ts:190-229`

### High: `warmupCache` does not download on miss
- Root cause:
  - `warmupCache` only checks existing memory/disk (`getCachedVideoPath`) and logs warmup hit.
  - It does not promote misses to actual download.
- Impact:
  - Fast scroll can still hit network for many items unless `cacheVideo` path runs in time.
- Evidence:
  - `mobile/src/data/services/VideoCacheService.ts:173-194`

### Medium: Video cache stored in OS cache directory
- Root cause:
  - Uses `Paths.cache` (temporary cache area), not durable app documents area.
- Impact:
  - OS can evict files under storage pressure.
  - Revisit behavior can vary by device state.
- Evidence:
  - `mobile/src/data/services/VideoCacheService.ts:13`

### Medium: Prefetch queue reset on every active-index shift
- Root cause:
  - `queueVideos` clears queue when `currentIndex` changes.
- Impact:
  - During very fast scroll, queued neighbors can churn before download completes.
- Evidence:
  - `mobile/src/data/services/FeedPrefetchService.ts:53-58`

### Medium: Cache delete on any `file://` playback error
- Root cause:
  - Error handler deletes local cache file whenever local playback fails.
- Impact:
  - In transient decode/network edge cases, this can force re-download loops.
- Evidence:
  - `mobile/src/presentation/components/feed/utils/VideoErrorHandler.ts:55-66`

## Crash Hardening (Applied)
- Error seen:
  - `NullPointerException ... ReactExoplayerView.videoLoaded ... player.isPlayingAd()`
- Applied native guards:
  - Ignore stale callbacks after player release/swap in `onEvents`.
  - Null-check `player` at top of `videoLoaded`.
- Files:
  - Patch script: `mobile/scripts/patch-react-native-video.js:19-21`, `:73-104`
  - Patched native target: `mobile/node_modules/react-native-video/android/src/main/java/com/brentvatne/exoplayer/ReactExoplayerView.java:1420-1423`, `:1465-1470`
  - Postinstall persistence: `mobile/package.json:13`

## Why “revisit shows network/black” happened
1. Refresh path was clearing all video cache.
2. Warmup path mostly validates cache; it does not guarantee download.
3. Cache location can be evicted by OS.
4. Some local playback errors explicitly delete cached files.

## Recommended Next Actions (Prioritized)
1. Keep current fix (done): never clear global video cache on feed refresh.
2. Add “promote-on-nearby” rule: convert top-priority warmup misses to `cacheVideo`.
3. Tighten delete policy: delete cached file only for known corruption error classes.
4. If persistence is top priority, consider moving video cache root from `Paths.cache` to a controlled durable directory with explicit LRU cleanup.
