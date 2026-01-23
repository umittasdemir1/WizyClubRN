import { Video } from '../../domain/entities/Video';
import { VideoCacheService } from './VideoCacheService';
import { isVideoCacheDisabled } from '../../core/utils/videoCacheToggle';

interface PrefetchItem {
  url: string;
  priority: number; // Lower = higher priority (0 = highest)
}

class FeedPrefetchService {
  private static instance: FeedPrefetchService | null = null;
  private queue: PrefetchItem[] = [];
  private queued = new Set<string>();
  private isProcessing = false;
  private maxQueueSize = 20;
  private maxParallelDownloads = 3;

  static getInstance(): FeedPrefetchService {
    if (!FeedPrefetchService.instance) {
      FeedPrefetchService.instance = new FeedPrefetchService();
    }
    return FeedPrefetchService.instance;
  }

  /**
   * Queue videos for prefetching with priority support
   * @param videos - Full video list
   * @param indices - Indices to prefetch
   * @param currentIndex - Current active video index (for priority calculation)
   */
  queueVideos(videos: Video[], indices: number[], currentIndex?: number) {
    if (isVideoCacheDisabled()) return;

    indices.forEach((index) => {
      const video = videos[index];
      if (!video || typeof video.videoUrl !== 'string') return;
      if (this.queued.has(video.videoUrl)) return;
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

      this.queue.push({ url: video.videoUrl, priority });
      this.queued.add(video.videoUrl);
    });

    // Sort queue by priority (lowest number = highest priority)
    this.queue.sort((a, b) => a.priority - b.priority);

    this.processQueue();
  }

  /**
   * Queue a single video with specific priority
   */
  queueSingleVideo(url: string, priority: number = 5) {
    if (isVideoCacheDisabled()) return;
    if (typeof url !== 'string') return;
    if (this.queued.has(url)) return;
    if (this.queue.length >= this.maxQueueSize) return;

    this.queue.push({ url, priority });
    this.queued.add(url);

    // Re-sort to maintain priority order
    this.queue.sort((a, b) => a.priority - b.priority);

    this.processQueue();
  }

  /**
   * Bump priority of a URL if it's already in queue
   */
  bumpPriority(url: string, newPriority: number = 0) {
    const item = this.queue.find(i => i.url === url);
    if (item && newPriority < item.priority) {
      item.priority = newPriority;
      this.queue.sort((a, b) => a.priority - b.priority);
    }
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      // Take highest priority items first
      const batch: PrefetchItem[] = [];
      for (let i = 0; i < this.maxParallelDownloads && this.queue.length > 0; i++) {
        const item = this.queue.shift();
        if (item) batch.push(item);
      }

      // Download all in parallel
      await Promise.allSettled(
        batch.map(async ({ url, priority }) => {
          try {
            await VideoCacheService.cacheVideo(url);
            const priorityLabel = priority === 0 ? '🔥' : priority === 1 ? '⚡' : '✅';
            console.log(`[FeedPrefetch] ${priorityLabel} Cached (p${priority}):`, url.substring(0, 50) + '...');
          } catch (error) {
            console.warn('[FeedPrefetch] Failed to cache video:', error);
          } finally {
            this.queued.delete(url);
          }
        })
      );
    }

    this.isProcessing = false;
  }

  /**
   * Clear the prefetch queue
   */
  clearQueue() {
    this.queue = [];
    this.queued.clear();
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

export { FeedPrefetchService };
