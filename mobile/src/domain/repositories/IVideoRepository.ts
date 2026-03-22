import { Video } from '../entities/Video';
import { VideoFeedCursor, VideoFeedResult } from '../entities/VideoFeed';

export interface IVideoRepository {
    getFeed(limit: number, userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): Promise<VideoFeedResult>;
    searchVideos(query: string, limit: number, userId?: string): Promise<Video[]>;
    toggleLike(videoId: string): Promise<boolean>;
    getVideoById(videoId: string): Promise<Video | null>;
    getVideosByIds(videoIds: string[], userId?: string): Promise<Video[]>;
    getUserInteractionVideos(activityType: 'likes' | 'saved' | 'history', userId: string): Promise<Video[] | null>;
    recordVideoView(videoId: string, userId: string, options?: { cooldownMs?: number }): Promise<'inserted' | 'cooldown' | 'error'>;
    incrementShareCount(videoId: string): Promise<void>;
}
