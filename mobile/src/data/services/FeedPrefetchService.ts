import { Video } from '../../domain/entities/Video';
import { VideoCacheService } from './VideoCacheService';

class FeedPrefetchService {
  private static instance: FeedPrefetchService | null = null;
  private queue: string[] = [];
  private queued = new Set<string>();
  private isProcessing = false;
  private maxQueueSize = 20;

  static getInstance(): FeedPrefetchService {
    if (!FeedPrefetchService.instance) {
      FeedPrefetchService.instance = new FeedPrefetchService();
    }
    return FeedPrefetchService.instance;
  }

  queueVideos(videos: Video[], indices: number[]) {
    indices.forEach((index) => {
      const video = videos[index];
      if (!video || typeof video.videoUrl !== 'string') return;
      if (video.videoUrl.endsWith('.m3u8')) return;
      if (this.queued.has(video.videoUrl)) return;
      if (this.queue.length >= this.maxQueueSize) return;
      this.queue.push(video.videoUrl);
      this.queued.add(video.videoUrl);
    });

    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const url = this.queue.shift();
      if (!url) continue;
      try {
        await VideoCacheService.cacheVideo(url);
      } catch (error) {
        console.warn('[FeedPrefetch] Failed to cache video:', error);
      } finally {
        this.queued.delete(url);
      }
    }

    this.isProcessing = false;
  }
}

export { FeedPrefetchService };
