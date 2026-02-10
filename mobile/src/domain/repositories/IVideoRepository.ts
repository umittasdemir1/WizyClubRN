import { Video } from '../entities/Video';
import { VideoFeedCursor, VideoFeedResult } from '../entities/VideoFeed';

export interface IVideoRepository {
    getFeed(limit: number, userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): Promise<VideoFeedResult>;
    searchVideos(query: string, limit: number, userId?: string): Promise<Video[]>;
    toggleLike(videoId: string): Promise<boolean>;
    getVideoById(videoId: string): Promise<Video | null>;
    getVideosByIds(videoIds: string[], userId?: string): Promise<Video[]>;
}
