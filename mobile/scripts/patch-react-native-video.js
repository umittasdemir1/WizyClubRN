const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-video',
  'android',
  'src',
  'main',
  'java',
  'com',
  'brentvatne',
  'exoplayer',
  'ReactExoplayerView.java'
);

const disableFocusPatchMarker = 'WIZY_PATCH: release audio focus when disableFocus=true, reacquire on false while playing.';
const onEventsPatchMarker = 'WIZY_PATCH: ignore stale callbacks after player release/swap.';
const videoLoadedPatchMarker = 'WIZY_PATCH: guard against null player in videoLoaded.';

const replacement = `
    public void setDisableFocus(boolean disableFocus) {
        // WIZY_PATCH: release audio focus when disableFocus=true, reacquire on false while playing.
        if (this.disableFocus == disableFocus) {
            return;
        }

        this.disableFocus = disableFocus;

        if (audioManager == null) {
            return;
        }

        if (disableFocus) {
            if (this.hasAudioFocus) {
                audioManager.abandonAudioFocus(audioFocusChangeListener);
                this.hasAudioFocus = false;
            }
            return;
        }

        if (player != null && player.getPlayWhenReady()) {
            this.hasAudioFocus = requestAudioFocus();
            if (this.hasAudioFocus) {
                player.setPlayWhenReady(true);
            }
        }
    }
`;

function main() {
  if (!fs.existsSync(targetPath)) {
    console.log('[patch-react-native-video] target not found, skipping:', targetPath);
    return;
  }

  let source = fs.readFileSync(targetPath, 'utf8');
  let updated = source;
  let changed = false;

  const methodRegex = /public void setDisableFocus\\(boolean disableFocus\\) \\{[\\s\\S]*?\\n    \\}/m;
  if (!updated.includes(disableFocusPatchMarker)) {
    if (!methodRegex.test(updated)) {
      console.log('[patch-react-native-video] setDisableFocus method not found, skipping that patch');
    } else {
      updated = updated.replace(methodRegex, replacement.trim());
      changed = true;
    }
  }

  if (!updated.includes(onEventsPatchMarker)) {
    const onEventsNeedle = `                    startProgressHandler();
                    videoLoaded();`;
    const onEventsReplacement = `                    startProgressHandler();
                    // ${onEventsPatchMarker}
                    if (this.player != null && this.player == player) {
                        videoLoaded();
                    }`;
    if (updated.includes(onEventsNeedle)) {
      updated = updated.replace(onEventsNeedle, onEventsReplacement);
      changed = true;
    } else {
      console.log('[patch-react-native-video] onEvents snippet not found, skipping stale-callback patch');
    }
  }

  if (!updated.includes(videoLoadedPatchMarker)) {
    const videoLoadedNeedle = `    private void videoLoaded() {
        if (!player.isPlayingAd() && loadVideoStarted) {`;
    const videoLoadedReplacement = `    private void videoLoaded() {
        // ${videoLoadedPatchMarker}
        if (player == null) {
            return;
        }
        if (!player.isPlayingAd() && loadVideoStarted) {`;
    if (updated.includes(videoLoadedNeedle)) {
      updated = updated.replace(videoLoadedNeedle, videoLoadedReplacement);
      changed = true;
    } else {
      console.log('[patch-react-native-video] videoLoaded snippet not found, skipping null-guard patch');
    }
  }

  if (!changed) {
    console.log('[patch-react-native-video] already patched');
    return;
  }

  fs.writeFileSync(targetPath, updated, 'utf8');
  console.log('[patch-react-native-video] patch applied');
}

main();
