import { Directory, File, Paths } from 'expo-file-system/next';

const CACHE_DIRECTORY = new Directory(Paths.cache, 'video-cache');
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit
const MAX_MEMORY_CACHE_SIZE = 50; // Store max 50 video paths in memory
const MEMORY_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export class VideoCacheService {
    private static memoryCache = new Map<string, { path: string; expiresAt: number }>();
    private static downloadInFlight = new Map<string, Promise<string | null>>();

    private static ensureCacheDirectory() {
        if (!CACHE_DIRECTORY.exists) {
            CACHE_DIRECTORY.create({ intermediates: true, idempotent: true });
        }
    }

    private static getFromMemoryCache(url: string): string | null {
        const entry = VideoCacheService.memoryCache.get(url);
        if (!entry) return null;
        if (entry.expiresAt <= Date.now()) {
            VideoCacheService.memoryCache.delete(url);
            return null;
        }
        return entry.path;
    }

    private static setMemoryCache(url: string, path: string) {
        if (VideoCacheService.memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
            const oldestKey = VideoCacheService.memoryCache.keys().next().value as string | undefined;
            if (oldestKey) {
                VideoCacheService.memoryCache.delete(oldestKey);
            }
        }
        VideoCacheService.memoryCache.set(url, {
            path,
            expiresAt: Date.now() + MEMORY_CACHE_TTL,
        });
    }

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
            VideoCacheService.ensureCacheDirectory();
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
        return VideoCacheService.getFromMemoryCache(url);
    }

    static async getCachedVideoPath(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;

        const cached = VideoCacheService.getFromMemoryCache(url);
        if (cached) return cached;

        VideoCacheService.ensureCacheDirectory();
        const filename = VideoCacheService.getFilename(url);
        const file = new File(CACHE_DIRECTORY, filename);

        try {
            const fileInfo = file.info();
            if (fileInfo.exists) {
                if ((fileInfo.size ?? 0) > 0) {
                    VideoCacheService.setMemoryCache(url, file.uri);
                    return file.uri;
                }
                file.delete();
            }
        } catch (error) {
            console.error('[VideoCache] Error checking cache:', error);
        }
        return null;
    }

    // ✅ NEW: Non-blocking cache warmup (doesn't block UI)
    static warmupCache(url: string | number): void {
        if (typeof url !== 'string') return;

        // Already in memory cache, no need to warmup
        if (VideoCacheService.getFromMemoryCache(url)) return;

        // Schedule disk check without blocking
        setTimeout(async () => {
            try {
                const path = await VideoCacheService.getCachedVideoPath(url);
                if (path) {
                    console.log(`[VideoCache] 🔥 Warmed up: ${url.substring(0, 50)}...`);
                }
            } catch (error) {
                // Silently ignore warmup errors
            }
        }, 0);
    }

    static async cacheVideo(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;

        const cached = VideoCacheService.getFromMemoryCache(url);
        if (cached) return cached;

        const existingPromise = VideoCacheService.downloadInFlight.get(url);
        if (existingPromise) return existingPromise;

        VideoCacheService.ensureCacheDirectory();
        const filename = VideoCacheService.getFilename(url);
        const file = new File(CACHE_DIRECTORY, filename);

        const downloadPromise = (async () => {
            try {
                const fileInfo = file.info();
                if (fileInfo.exists && (fileInfo.size ?? 0) > 0) {
                    VideoCacheService.setMemoryCache(url, file.uri);
                    return file.uri;
                }
                const downloaded = await File.downloadFileAsync(url, file, { idempotent: true });
                VideoCacheService.setMemoryCache(url, downloaded.uri);
                return downloaded.uri;
            } catch (error) {
                try {
                    if (file.exists) file.delete();
                } catch {
                    // Ignore cleanup errors
                }
                console.error(`[VideoCache] Failed to download video: ${url}`, error);
                return null;
            } finally {
                VideoCacheService.downloadInFlight.delete(url);
            }
        })();

        VideoCacheService.downloadInFlight.set(url, downloadPromise);
        return downloadPromise;
    }

    static async deleteCachedVideo(url: string | number): Promise<void> {
        if (typeof url !== 'string') return;

        VideoCacheService.ensureCacheDirectory();
        const filename = VideoCacheService.getFilename(url);
        const file = new File(CACHE_DIRECTORY, filename);

        try {
            VideoCacheService.memoryCache.delete(url);
            if (file.exists) {
                file.delete();
            }
        } catch (error) {
            console.error(`[VideoCache] Error deleting cached video:`, error);
        }
    }

    static async pruneCache() {
        try {
            VideoCacheService.ensureCacheDirectory();
            if (!CACHE_DIRECTORY.exists) return;

            const files = CACHE_DIRECTORY.list();
            let totalSize = 0;
            const fileStats: { file: File; size: number; modificationTime?: number }[] = [];

            for (const entry of files) {
                if (!(entry instanceof File)) continue;
                const info = entry.info();
                if (info.exists && typeof info.size === 'number') {
                    totalSize += info.size;
                    fileStats.push({ file: entry, size: info.size, modificationTime: info.modificationTime });
                }
            }

            if (totalSize > MAX_CACHE_SIZE_BYTES) {
                fileStats.sort((a, b) => (a.modificationTime || 0) - (b.modificationTime || 0));
                let freedSpace = 0;
                for (const fileEntry of fileStats) {
                    if (totalSize - freedSpace <= MAX_CACHE_SIZE_BYTES) break;
                    fileEntry.file.delete();
                    freedSpace += fileEntry.size;
                }
            }
        } catch (error) {
            console.error('[VideoCache] Error pruning cache:', error);
        }
    }

    static async clearCache() {
        try {
            VideoCacheService.ensureCacheDirectory();
            if (CACHE_DIRECTORY.exists) {
                CACHE_DIRECTORY.delete();
            }
            CACHE_DIRECTORY.create({ intermediates: true, idempotent: true });
            VideoCacheService.memoryCache.clear();
        } catch (error) {
            console.error('[VideoCache] Error clearing cache:', error);
        }
    }
}
