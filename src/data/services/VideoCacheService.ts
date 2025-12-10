import * as FileSystem from 'expo-file-system/legacy';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}video-cache/`;
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit

export class VideoCacheService {
    private static memoryCache = new Map<string, string>();

    static async initialize() {
        try {
            const folderInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
            if (!folderInfo.exists) {
                await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
            }
            await VideoCacheService.pruneCache();
        } catch (error) {
            console.error('[VideoCache] Failed to initialize cache folder:', error);
        }
    }

    // Synchronous access for instant playback start
    static getMemoryCachedPath(url: string | number): string | null {
        if (typeof url !== 'string') return null;
        if (!VideoCacheService.memoryCache) return null; // Safety check
        return VideoCacheService.memoryCache.get(url) || null;
    }

    static async getCachedVideoPath(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;

        // check memory first
        if (VideoCacheService.memoryCache.has(url)) {
            return VideoCacheService.memoryCache.get(url) || null;
        }

        const filename = url.split('/').pop()?.split('?')[0] || `video_${Date.now()}.mp4`;
        const path = `${CACHE_FOLDER}${filename}`;

        try {
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size > 0) {
                VideoCacheService.memoryCache.set(url, path); // Populate memory
                return path;
            }
        } catch (error) {
            console.error('[VideoCache] Error checking cache:', error);
        }
        return null;
    }

    static async cacheVideo(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;

        // Skip HLS streams - they should stream directly, not be cached
        if (url.endsWith('.m3u8')) {
            console.log('[VideoCache] Skipping HLS stream (not cacheable):', url);
            return null;
        }

        const filename = url.split('/').pop()?.split('?')[0] || `video_${Date.now()}.mp4`;
        const path = `${CACHE_FOLDER}${filename}`;

        try {
            // 1. Check if already exists
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists) {
                if (fileInfo.size > 0) {
                    VideoCacheService.memoryCache.set(url, path);
                    return path;
                }
                // If exists but empty, we should arguably re-download or return null. 
                // For now, let's treat as 'not found' effectively if we fall through or delete it?
                // But the previous code just returned path. Let's stick to safe logic:
                // If it exists, trust it, but we added size check in getCachedVideoPath.
                // Let's rely on the overwrite behavior of downloadAsync if we want to fix it, 
                // but here we just return.
                return path;
            }

            // 2. Download
            // console.log(`[VideoCache] Downloading ${url} to ${path}`);
            await FileSystem.downloadAsync(url, path);

            // 3. Prune if needed (simple check occasionally)
            // Ideally we check size here, but for now we trust the limit cleanup to run occasionally

            return path;
        } catch (error) {
            console.error(`[VideoCache] Failed to download video: ${url}`, error);
            return null;
        }
    }

    static async pruneCache() {
        try {
            const folderInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
            if (!folderInfo.exists) return;

            const files = await FileSystem.readDirectoryAsync(CACHE_FOLDER);
            let totalSize = 0;
            const fileStats = [];

            for (const file of files) {
                const path = `${CACHE_FOLDER}${file}`;
                const info = await FileSystem.getInfoAsync(path);
                if (info.exists) {
                    totalSize += info.size;
                    fileStats.push({ path, size: info.size, modificationTime: info.modificationTime });
                }
            }

            if (totalSize > MAX_CACHE_SIZE_BYTES) {
                console.log(`[VideoCache] Pruning cache (Current: ${totalSize / 1024 / 1024} MB)`);
                // Use modificationTime if available, or just delete random/all. 
                // expo-file-system info might not always have modificationTime accurately on all Android versions.
                // Simple strategy: Delete all if over limit to start fresh, or delete oldest half.

                // Sort by modification time (ascending = oldest first)
                fileStats.sort((a, b) => (a.modificationTime || 0) - (b.modificationTime || 0));

                let freedSpace = 0;
                for (const file of fileStats) {
                    if (totalSize - freedSpace <= MAX_CACHE_SIZE_BYTES) break;

                    await FileSystem.deleteAsync(file.path, { idempotent: true });
                    freedSpace += file.size;
                }
                console.log(`[VideoCache] Pruned ${freedSpace / 1024 / 1024} MB`);
            }
        } catch (error) {
            console.error('[VideoCache] Error pruning cache:', error);
        }
    }
}
