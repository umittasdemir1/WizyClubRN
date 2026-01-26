# Video Playback Fix - Installation Checklist

## PRE-INSTALLATION

- [ ] Read `CRITICAL_VIDEO_FIX_SUMMARY.md` (project root)
- [ ] Ensure you're on the correct branch
- [ ] No uncommitted changes in git (optional, but recommended)
- [ ] Metro bundler is stopped

## INSTALLATION

### Option 1: Automated (RECOMMENDED)

```bash
cd /home/user/WizyClubRN/mobile
./INSTALL_FIX.sh
```

- [ ] Script completed without errors
- [ ] Backup directory created (check console output)
- [ ] All files reported as installed

### Option 2: Manual

```bash
cd /home/user/WizyClubRN/mobile

# 1. Create backup
mkdir -p backups/manual_$(date +%Y%m%d_%H%M%S)
cp src/presentation/components/feed/VideoLayer.tsx \
   backups/manual_$(date +%Y%m%d_%H%M%S)/
cp src/data/services/VideoCacheService.ts \
   backups/manual_$(date +%Y%m%d_%H%M%S)/

# 2. Install fixes
cp src/presentation/components/feed/VideoLayer.FIXED.tsx \
   src/presentation/components/feed/VideoLayer.tsx

cp src/data/services/VideoCacheService.OPTIMIZED.ts \
   src/data/services/VideoCacheService.ts

# 3. Update FlashList config
# Edit app/(tabs)/index.tsx line 614:
# Change: initialNumToRender={3}
# To:     initialNumToRender={5}
```

- [ ] All files copied successfully
- [ ] FlashList config updated
- [ ] Backups created

## POST-INSTALLATION

### 1. Clear Metro Cache

```bash
npm start -- --reset-cache
```

- [ ] Metro cache cleared
- [ ] Metro bundler restarted

### 2. Verify Files

```bash
# Check VideoLayer.tsx
grep "CRITICAL: Only re-render if these specific props change" \
  src/presentation/components/feed/VideoLayer.tsx

# Check VideoCacheService.ts
grep "loadMetadata" \
  src/data/services/VideoCacheService.ts

# Check FlashList config
grep "initialNumToRender={5}" \
  app/(tabs)/index.tsx
```

- [ ] VideoLayer contains optimized code
- [ ] VideoCacheService contains metadata logic
- [ ] FlashList config updated to 5

### 3. Build & Test

```bash
# For iOS (if needed)
cd ios && pod install && cd ..

# Run on device
npm run ios
# or
npm run android
```

- [ ] App builds successfully
- [ ] No compilation errors

## TESTING

### Quick Tests (Must Pass)

1. **Initial Load Test**
   - [ ] First video shows thumbnail instantly (<100ms)
   - [ ] First video starts playing (<1s on WiFi)
   - [ ] No black screen visible

2. **Swipe Test (Cached)**
   - [ ] Open app, watch 5 videos
   - [ ] Swipe back to video 1
   - [ ] Should play instantly (<50ms)

3. **Swipe Test (Uncached)**
   - [ ] Clear app data/cache
   - [ ] Swipe to next video
   - [ ] Should start in <1s on WiFi

4. **Preload Test**
   - [ ] Watch video 1 until end
   - [ ] Swipe to video 2
   - [ ] Should start instantly (0ms delay)

5. **Error Test**
   - [ ] Find a broken video URL (or simulate)
   - [ ] Should show error after 15s
   - [ ] Retry button should work

### Detailed Tests (Should Pass)

6. **Black Screen Test**
   - [ ] Swipe through 20 videos
   - [ ] Zero black screens visible
   - [ ] All thumbnails show immediately

7. **Cache Persistence Test**
   - [ ] Watch 10 videos
   - [ ] Force quit app
   - [ ] Reopen app
   - [ ] Watch same videos
   - [ ] Should play instantly (cache persisted)

8. **Network Switch Test**
   - [ ] Start on WiFi
   - [ ] Watch videos
   - [ ] Switch to airplane mode
   - [ ] Cached videos still play

9. **Memory Test**
   - [ ] Scroll through 50+ videos
   - [ ] Check memory usage (should be stable)
   - [ ] No app crashes

10. **Rapid Scroll Test**
    - [ ] Swipe quickly through 10 videos
    - [ ] No crashes
    - [ ] Smooth performance

## PERFORMANCE VERIFICATION

### Expected Metrics

Run these tests and verify results:

```typescript
// Add to VideoLayer.tsx handleLoad()
const loadStartTime = useRef(Date.now());

const handleLoad = useCallback((data: OnLoadData) => {
    const loadTime = Date.now() - loadStartTime.current;
    console.log(`[PERF] Load time: ${loadTime}ms (cached: ${isLocal})`);
    // ... rest of code
}, []);
```

- [ ] Cached videos: <50ms (target)
- [ ] Network videos (WiFi): <1000ms (target)
- [ ] Network videos (4G): <2000ms (acceptable)
- [ ] Preloaded videos: <10ms (instant)

### Cache Statistics

```typescript
// Run in app console
const stats = await VideoCacheService.getCacheStats();
console.log('Cache stats:', stats);
```

- [ ] Cache hit rate: >90% (after first session)
- [ ] Memory cache size: Matches video count
- [ ] Disk cache size: <500MB (within limit)

## ROLLBACK (If Issues Occur)

### Quick Rollback

```bash
# Find latest backup
ls -lt mobile/backups/

# Restore from backup
cp mobile/backups/YYYYMMDD_HHMMSS/VideoLayer.tsx.backup \
   mobile/src/presentation/components/feed/VideoLayer.tsx

cp mobile/backups/YYYYMMDD_HHMMSS/VideoCacheService.ts.backup \
   mobile/src/data/services/VideoCacheService.ts

cp mobile/backups/YYYYMMDD_HHMMSS/index.tsx.backup \
   mobile/app/(tabs)/index.tsx

# Clear cache and restart
npm start -- --reset-cache
```

- [ ] Files restored
- [ ] Metro restarted
- [ ] App working (old behavior)

## TROUBLESHOOTING

### Issue: "Black screens still appearing"

**Checks:**
- [ ] Verify VideoLayer.tsx was actually replaced
- [ ] Check react-native-video version (should be 5.2.0+)
- [ ] Clear Metro cache again
- [ ] Restart app completely

**Fix:**
```bash
npm install react-native-video@latest
npm start -- --reset-cache
```

### Issue: "Videos not starting instantly"

**Checks:**
- [ ] Check console logs for cache hits
- [ ] Verify VideoCacheService was replaced
- [ ] Check if metadata file exists: `mobile/cache/video-cache/cache_metadata.json`

**Fix:**
```bash
# Clear app data, run app, then restart
# This generates metadata file
```

### Issue: "App crashes on scroll"

**Checks:**
- [ ] Check FlashList config (initialNumToRender should be 5)
- [ ] Verify no syntax errors in new files
- [ ] Check Metro bundler logs

**Fix:**
```bash
# Rollback and verify files
# Check for any missed edits
```

### Issue: "Preload not working"

**Checks:**
- [ ] Verify FlashList windowSize is 21
- [ ] Check if initialNumToRender is 5
- [ ] Look for console logs: "[VideoLayer] Video became active"

**Fix:**
```typescript
// In app/(tabs)/index.tsx, verify:
windowSize={21}
initialNumToRender={5}
removeClippedSubviews={false}
```

## SUCCESS CRITERIA

Before marking as complete:

### Functionality
- [ ] All quick tests pass
- [ ] All detailed tests pass
- [ ] No crashes in 100 swipes
- [ ] No black screens in 100 swipes

### Performance
- [ ] 95%+ cached videos <50ms
- [ ] 95%+ network videos <1s
- [ ] Cache hit rate >90%
- [ ] Memory usage stable

### User Experience
- [ ] Feels like TikTok/Instagram
- [ ] Instant scrolling
- [ ] Smooth transitions
- [ ] No visible loading states

## DEPLOYMENT

### Staging

- [ ] All tests passed locally
- [ ] Code reviewed (optional)
- [ ] Deploy to staging environment
- [ ] QA testing on staging
- [ ] Performance monitoring enabled

### Production

- [ ] Staging tests passed
- [ ] Performance metrics look good
- [ ] Rollback plan ready
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Monitor performance metrics
- [ ] User feedback positive

## DOCUMENTATION

- [ ] Update team on changes
- [ ] Share performance improvements
- [ ] Document any issues encountered
- [ ] Update internal wiki/docs (if applicable)

## NOTES

**Backup Location:**
```
mobile/backups/YYYYMMDD_HHMMSS/
```

**Documentation:**
- Full analysis: `mobile/PERFORMANCE_ANALYSIS.md`
- Implementation guide: `mobile/src/presentation/components/feed/IMPLEMENTATION_GUIDE.md`
- Quick reference: `mobile/QUICK_REFERENCE.md`
- Architecture diagrams: `mobile/ARCHITECTURE_DIAGRAM.md`

**Support:**
- Check console logs for performance metrics
- Use VideoCacheService.getCacheStats() for cache info
- Enable verbose logging if needed

---

**Checklist Completion Date:** __________
**Tester Name:** __________
**Environment:** Development / Staging / Production
**Status:** Pass / Fail
**Notes:** __________________________________________
