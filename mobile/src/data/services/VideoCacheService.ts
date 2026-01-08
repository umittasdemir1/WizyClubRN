import * as FileSystem from 'expo-file-system/legacy';

const CACHE_FOLDER = `${FileSystem.cacheDirectory}video-cache/`;
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit

export class VideoCacheService {
    private static memoryCache = new Map<string, string>();

    private static getFilename(url: string): string {
        // Simple hash to avoid collisions for same filenames in different folders (e.g. video.mp4)
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        const ext = url.split('.').pop()?.split('?')[0] || 'mp4';
        const safeExt = ext.length > 4 ? 'mp4' : ext;
        return `v_${Math.abs(hash)}.${safeExt}`;
    }

    static async initialize() {
        try {
            const folderInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
            if (!folderInfo.exists) {
                await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
            }
            // Defer cache pruning to avoid blocking app startup
            // await VideoCacheService.pruneCache();
            // Instead, run it in background after a delay without awaiting
            setTimeout(() => {
                VideoCacheService.pruneCache().catch(err => console.error('[VideoCache] Background prune failed:', err));
            }, 10000); // 10 seconds delay
        } catch (error) {
            console.error('[VideoCache] Failed to initialize cache folder:', error);
        }
    }

    static getMemoryCachedPath(url: string | number): string | null {
        if (typeof url !== 'string') return null;
        if (!VideoCacheService.memoryCache) return null;
        return VideoCacheService.memoryCache.get(url) || null;
    }

    static async getCachedVideoPath(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;

        if (VideoCacheService.memoryCache.has(url)) {
            return VideoCacheService.memoryCache.get(url) || null;
        }

        const filename = VideoCacheService.getFilename(url);
        const path = `${CACHE_FOLDER}${filename}`;

        try {
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists && !fileInfo.isDirectory && fileInfo.size > 0) {
                VideoCacheService.memoryCache.set(url, path);
                return path;
            }
        } catch (error) {
            console.error('[VideoCache] Error checking cache:', error);
        }
        return null;
    }

    static async cacheVideo(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;

        if (url.endsWith('.m3u8')) {
            VideoCacheService.memoryCache.set(url, url);
            return url;
        }

        const filename = VideoCacheService.getFilename(url);
        const path = `${CACHE_FOLDER}${filename}`;

        try {
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists && fileInfo.size > 0) {
                VideoCacheService.memoryCache.set(url, path);
                return path;
            }

            await FileSystem.downloadAsync(url, path);
            VideoCacheService.memoryCache.set(url, path);
            return path;
        } catch (error) {
            console.error(`[VideoCache] Failed to download video: ${url}`, error);
            return null;
        }
    }

    static async deleteCachedVideo(url: string | number): Promise<void> {
        if (typeof url !== 'string') return;

        const filename = VideoCacheService.getFilename(url);
        const path = `${CACHE_FOLDER}${filename}`;

        try {
            VideoCacheService.memoryCache.delete(url);
            const fileInfo = await FileSystem.getInfoAsync(path);
            if (fileInfo.exists) {
                await FileSystem.deleteAsync(path, { idempotent: true });
            }
        } catch (error) {
            console.error(`[VideoCache] Error deleting cached video:`, error);
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
                fileStats.sort((a, b) => (a.modificationTime || 0) - (b.modificationTime || 0));
                let freedSpace = 0;
                for (const file of fileStats) {
                    if (totalSize - freedSpace <= MAX_CACHE_SIZE_BYTES) break;
                    await FileSystem.deleteAsync(file.path, { idempotent: true });
                    freedSpace += file.size;
                }
            }
        } catch (error) {
            console.error('[VideoCache] Error pruning cache:', error);
        }
    }

    static async clearCache() {
        try {
            const folderInfo = await FileSystem.getInfoAsync(CACHE_FOLDER);
            if (folderInfo.exists) {
                await FileSystem.deleteAsync(CACHE_FOLDER, { idempotent: true });
                await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });
                VideoCacheService.memoryCache.clear();
            }
        } catch (error) {
            console.error('[VideoCache] Error clearing cache:', error);
        }
    }
}
