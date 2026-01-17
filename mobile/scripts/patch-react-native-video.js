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

const patchMarker = 'WIZY_PATCH: release audio focus when disableFocus=true, reacquire on false while playing.';

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

  const source = fs.readFileSync(targetPath, 'utf8');
  if (source.includes(patchMarker)) {
    console.log('[patch-react-native-video] already patched');
    return;
  }

  const methodRegex = /public void setDisableFocus\\(boolean disableFocus\\) \\{[\\s\\S]*?\\n    \\}/m;
  if (!methodRegex.test(source)) {
    console.log('[patch-react-native-video] method not found, skipping');
    return;
  }

  const updated = source.replace(methodRegex, replacement.trim());
  fs.writeFileSync(targetPath, updated, 'utf8');
  console.log('[patch-react-native-video] patch applied');
}

main();
