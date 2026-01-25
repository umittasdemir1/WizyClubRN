import { Platform } from 'react-native';
import { Logger, LogCode, logCache, logError } from '@/core/services/Logger';

// Only import expo-file-system on native platforms
let Directory: any, File: any, Paths: any;
if (Platform.OS !== 'web') {
    const fileSystem = require('expo-file-system/next');
    Directory = fileSystem.Directory;
    File = fileSystem.File;
    Paths = fileSystem.Paths;
}

const CACHE_DIRECTORY = Platform.OS !== 'web' ? new Directory(Paths.cache, 'video-cache') : null;
const MAX_CACHE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB limit
const MAX_MEMORY_CACHE_SIZE = 100; // ✅ Increased from 50 for better hit rate
const MEMORY_CACHE_TTL = 60 * 60 * 1000; // ✅ Increased to 60 minutes from 30

export class VideoCacheService {
    private static memoryCache = new Map<string, { path: string; expiresAt: number }>();
    private static downloadInFlight = new Map<string, Promise<string | null>>();

    private static ensureCacheDirectory() {
        // Skip on web
        if (Platform.OS === 'web' || !CACHE_DIRECTORY) return;

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
        // Skip on web platform
        if (Platform.OS === 'web') {
            logCache(LogCode.CACHE_INIT, 'Cache disabled on web platform');
            return;
        }

        try {
            VideoCacheService.ensureCacheDirectory();
            logCache(LogCode.CACHE_INIT, 'Video cache initialized successfully');
            // Defer cache pruning to avoid blocking app startup
            // await VideoCacheService.pruneCache();
            // Instead, run it in background after a delay without awaiting
            setTimeout(() => {
                VideoCacheService.pruneCache().catch(err =>
                    logError(LogCode.CACHE_ERROR, 'Background prune failed', err)
                );
            }, 10000); // 10 seconds delay
        } catch (error) {
            logError(LogCode.CACHE_ERROR, 'Failed to initialize cache folder', error);
        }
    }

    static getMemoryCachedPath(url: string | number): string | null {
        if (typeof url !== 'string') return null;
        return VideoCacheService.getFromMemoryCache(url);
    }

    static async getCachedVideoPath(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;
        // On web, return original URL (no caching)
        if (Platform.OS === 'web') return null;

        const cached = VideoCacheService.getFromMemoryCache(url);
        if (cached) return cached;

        VideoCacheService.ensureCacheDirectory();
        const filename = VideoCacheService.getFilename(url);
        const file = new File(CACHE_DIRECTORY!, filename);

        try {
            const fileInfo = file.info();
            if (fileInfo.exists) {
                if ((fileInfo.size ?? 0) > 0) {
                    VideoCacheService.setMemoryCache(url, file.uri);
                    logCache(LogCode.CACHE_HIT, 'Cache hit for video', { url: url.substring(0, 50) });
                    return file.uri;
                }
                (file as any).delete();
            }
        } catch (error) {
            logError(LogCode.CACHE_ERROR, 'Error checking cache', error);
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
                    logCache(LogCode.CACHE_WARMUP, 'Cache warmed up', { url: url.substring(0, 50) });
                }
            } catch (error) {
                // Silently ignore warmup errors
            }
        }, 0);
    }

    static async cacheVideo(url: string | number): Promise<string | null> {
        if (typeof url !== 'string') return null;
        // On web, return original URL (no caching)
        if (Platform.OS === 'web') return null;

        const cached = VideoCacheService.getFromMemoryCache(url);
        if (cached) return cached;

        const existingPromise = VideoCacheService.downloadInFlight.get(url);
        if (existingPromise) return existingPromise;

        VideoCacheService.ensureCacheDirectory();
        const filename = VideoCacheService.getFilename(url);
        const file = new File(CACHE_DIRECTORY!, filename);

        const downloadPromise = (async () => {
            try {
                const fileInfo = file.info();
                if (fileInfo.exists && (fileInfo.size ?? 0) > 0) {
                    VideoCacheService.setMemoryCache(url, file.uri);
                    return file.uri;
                }
                const downloaded = await (File as any).downloadFileAsync(url, file, { idempotent: true });
                VideoCacheService.setMemoryCache(url, downloaded.uri);
                return downloaded.uri;
            } catch (error) {
                try {
                    if (file.exists) (file as any).delete();
                } catch {
                    // Ignore cleanup errors
                }
                logError(LogCode.CACHE_ERROR, 'Failed to download video', { url: url.substring(0, 50), error });
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
        // Skip on web
        if (Platform.OS === 'web') return;

        VideoCacheService.ensureCacheDirectory();
        const filename = VideoCacheService.getFilename(url);
        const file = new File(CACHE_DIRECTORY!, filename);

        try {
            VideoCacheService.memoryCache.delete(url);
            if (file.exists) {
                (file as any).delete();
            }
            logCache(LogCode.CACHE_DELETE, 'Cached video deleted', { url: url.substring(0, 50) });
        } catch (error) {
            logError(LogCode.CACHE_ERROR, 'Error deleting cached video', error);
        }
    }

    static async pruneCache() {
        // Skip on web
        if (Platform.OS === 'web' || !CACHE_DIRECTORY) return;

        let freedSpace = 0;
        try {
            VideoCacheService.ensureCacheDirectory();
            if (!CACHE_DIRECTORY.exists) return;

            const files = CACHE_DIRECTORY.list();
            let totalSize = 0;
            const fileStats: { file: any; size: number; modificationTime?: number }[] = [];

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
                for (const fileEntry of fileStats) {
                    if (totalSize - freedSpace <= MAX_CACHE_SIZE_BYTES) break;
                    (fileEntry.file as any).delete();
                    freedSpace += fileEntry.size;
                }
            }
            logCache(LogCode.CACHE_PRUNE, 'Cache pruned successfully', { freedSpace });
        } catch (error) {
            logError(LogCode.CACHE_ERROR, 'Error pruning cache', error);
        }
    }

    static async clearCache() {
        // Skip on web
        if (Platform.OS === 'web' || !CACHE_DIRECTORY) {
            VideoCacheService.memoryCache.clear();
            return;
        }

        try {
            VideoCacheService.ensureCacheDirectory();
            if (CACHE_DIRECTORY.exists) {
                (CACHE_DIRECTORY as any).delete();
            }
            CACHE_DIRECTORY.create({ intermediates: true, idempotent: true });
            VideoCacheService.memoryCache.clear();
            logCache(LogCode.CACHE_CLEAR, 'Cache cleared successfully');
        } catch (error) {
            logError(LogCode.CACHE_ERROR, 'Error clearing cache', error);
        }
    }
}
