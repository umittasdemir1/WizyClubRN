import { Video } from '../../domain/entities/Video';
import { VideoCacheService } from './VideoCacheService';
import { isVideoCacheDisabled } from '../../core/utils/videoCacheToggle';
import { NetInfoStateType } from '@react-native-community/netinfo';
import { logCache, LogCode } from '@/core/services/Logger';
import { getVideoUrl } from '../../core/utils/videoUrl';

interface PrefetchItem {
  url: string;
  cacheKey: string;
  priority: number; // Lower = higher priority (0 = highest)
}

class FeedPrefetchService {
  private static instance: FeedPrefetchService | null = null;
  private queue: PrefetchItem[] = [];
  private queued = new Set<string>();
  private isProcessing = false;
  private maxQueueSize = 20;
  private maxParallelDownloads = 2;
  private networkType: NetInfoStateType | null = null;
  private activeIndex: number | null = null;
  private generation = 0;

  private getQueueKey(url: string): string {
    return VideoCacheService.getStableCacheKey(url) ?? url;
  }

  private normalizeUrl(url: string | null): string | null {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  static getInstance(): FeedPrefetchService {
    if (!FeedPrefetchService.instance) {
      FeedPrefetchService.instance = new FeedPrefetchService();
    }
    return FeedPrefetchService.instance;
  }

  setNetworkType(type: NetInfoStateType | null) {
    this.networkType = type;
    const isFast =
      type === NetInfoStateType.wifi || type === NetInfoStateType.ethernet;
    // 🚀 Aggressive prefetching for instant playback
    this.maxParallelDownloads = isFast ? 3 : 2; // Increased from 2/1
    this.maxQueueSize = isFast ? 30 : 15;       // Increased from 20/12
  }

  /**
   * Temporarily reduce prefetch concurrency while active video buffers.
   * This gives more bandwidth to the currently playing video.
   */
  pauseForActiveVideo() {
    this.maxParallelDownloads = 1;
  }

  /**
   * Restore normal prefetch concurrency after active video has buffered.
   */
  resumeAfterActiveVideo() {
    const isFast =
      this.networkType === NetInfoStateType.wifi || this.networkType === NetInfoStateType.ethernet;
    this.maxParallelDownloads = isFast ? 3 : 2;
  }

  /**
   * Queue videos for prefetching with priority support
   * @param videos - Full video list
   * @param indices - Indices to prefetch
   * @param currentIndex - Current active video index (for priority calculation)
   */
  queueVideos(videos: Video[], indices: number[], currentIndex?: number) {
    if (isVideoCacheDisabled()) return;

    if (typeof currentIndex === 'number' && currentIndex !== this.activeIndex) {
      this.activeIndex = currentIndex;
      this.generation += 1;
      this.queue = [];
      this.queued.clear();
    }

    indices.forEach((index) => {
      const video = videos[index];
      const videoUrl = this.normalizeUrl(getVideoUrl(video));
      if (!videoUrl) return;
      const queueKey = this.getQueueKey(videoUrl);
      if (this.queued.has(queueKey)) return;
      if (this.queue.length >= this.maxQueueSize) return;

      // Calculate priority based on distance from current video
      // Priority 0: next video (most important)
      // Priority 1: previous video
      // Priority 2+: other videos (increasing with distance)
      let priority = 10; // Default low priority
      if (currentIndex !== undefined) {
        const distance = Math.abs(index - currentIndex);
        if (index === currentIndex + 1) {
          priority = 0; // Highest priority: next video
        } else if (index === currentIndex - 1) {
          priority = 1; // High priority: previous video
        } else {
          priority = 2 + distance; // Lower priority for distant videos
        }
      }

      this.queue.push({ url: videoUrl, cacheKey: queueKey, priority });
      this.queued.add(queueKey);
    });

    // Sort queue by priority (lowest number = highest priority)
    this.queue.sort((a, b) => a.priority - b.priority);

    this.processQueue();
  }

  async getCachedPath(url: string): Promise<string | null> {
    if (isVideoCacheDisabled()) return null;
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) return null;
    const memoryCached = VideoCacheService.getMemoryCachedPath(normalizedUrl);
    if (memoryCached) return memoryCached;
    return VideoCacheService.getCachedVideoPath(normalizedUrl);
  }

  async cacheVideoNow(url: string): Promise<string | null> {
    if (isVideoCacheDisabled()) return null;
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) return null;
    return VideoCacheService.cacheVideo(normalizedUrl);
  }

  /**
   * Queue a single video with specific priority
   */
  queueSingleVideo(url: string, priority: number = 5) {
    if (isVideoCacheDisabled()) return;
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) return;
    const queueKey = this.getQueueKey(normalizedUrl);
    if (this.queued.has(queueKey)) return;
    if (this.queue.length >= this.maxQueueSize) return;

    this.queue.push({ url: normalizedUrl, cacheKey: queueKey, priority });
    this.queued.add(queueKey);

    // Re-sort to maintain priority order
    this.queue.sort((a, b) => a.priority - b.priority);

    this.processQueue();
  }

  /**
   * Bump priority of a URL if it's already in queue
   */
  bumpPriority(url: string, newPriority: number = 0) {
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) return;
    const queueKey = this.getQueueKey(normalizedUrl);
    const item = this.queue.find(i => i.cacheKey === queueKey);
    if (item && newPriority < item.priority) {
      item.priority = newPriority;
      this.queue.sort((a, b) => a.priority - b.priority);
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const startGeneration = this.generation;

    while (this.queue.length > 0) {
      if (startGeneration !== this.generation) break;
      // Take highest priority items first
      const batch: PrefetchItem[] = [];
      for (let i = 0; i < this.maxParallelDownloads && this.queue.length > 0; i++) {
        const item = this.queue.shift();
        if (item) batch.push(item);
      }

      // Download all in parallel
      await Promise.allSettled(
        batch.map(async ({ url, cacheKey, priority }) => {
          try {
            const memoryCached = VideoCacheService.getMemoryCachedPath(url);
            if (memoryCached) {
              return;
            }
            // Avoid extra disk checks here; cacheVideo already verifies disk.
            await VideoCacheService.cacheVideo(url);
            // ✅ Logging disabled for performance
          } catch (error) {
            logCache(LogCode.CACHE_ERROR, 'Feed prefetch failed to cache video', { error, url });
          } finally {
            this.queued.delete(cacheKey);
          }
        })
      );
    }

    this.isProcessing = false;
    if (this.queue.length > 0) {
      this.processQueue();
    }
  }

  /**
   * Clear the prefetch queue
   */
  clearQueue() {
    this.queue = [];
    this.queued.clear();
    this.generation += 1;
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

export { FeedPrefetchService };
