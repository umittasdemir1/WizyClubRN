export function isVideoCacheDisabled(): boolean {
    return typeof globalThis !== 'undefined'
        && Boolean((globalThis as { __WIZY_DISABLE_VIDEO_CACHE__?: boolean }).__WIZY_DISABLE_VIDEO_CACHE__);
}
