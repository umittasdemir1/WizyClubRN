# Feed/Video Smoke Checklist

## Scope
Minimal validation for `FeedManager` and `VideoPlayerPool` flows after cleanup or refactor.

## Checklist
- [ ] App launch completes and feed screen renders.
- [ ] First video loads and starts playing.
- [ ] Fast scroll up/down does not show wrong audio/video.
- [ ] Pause/resume works (tap or UI action).
- [ ] Mute/unmute toggles audio correctly.
- [ ] Background then foreground resumes correctly.
- [ ] Carousel posts allow image swipe without crash.
- [ ] No repeated playback errors in logs.

## Evidence
- Record screen or capture logs for one full run.
