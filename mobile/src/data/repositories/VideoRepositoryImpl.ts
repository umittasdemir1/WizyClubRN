import { IVideoRepository } from '../../domain/repositories/IVideoRepository';
import { Video } from '../../domain/entities/Video';
import { VideoFeedCursor, VideoFeedResult } from '../../domain/entities/VideoFeed';
import { SupabaseVideoDataSource } from '../datasources/SupabaseVideoDataSource';

export class VideoRepositoryImpl implements IVideoRepository {
    private dataSource: SupabaseVideoDataSource;

    constructor() {
        this.dataSource = new SupabaseVideoDataSource();
    }

    async getFeed(limit: number, userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): Promise<VideoFeedResult> {
        // Supabase data source already returns Video entities
        return this.dataSource.getVideos(limit, userId, authorId, cursor);
    }

    async searchVideos(query: string, limit: number, userId?: string): Promise<Video[]> {
        return this.dataSource.searchVideos(query, limit, userId);
    }

    async toggleLike(videoId: string): Promise<boolean> {
        // In a real app, this would call the API.
        // For mock, we just return true to simulate success.
        return true;
    }

    async getVideoById(videoId: string): Promise<Video | null> {
        return this.dataSource.getVideoById(videoId);
    }

    async getVideosByIds(videoIds: string[], userId?: string): Promise<Video[]> {
        return this.dataSource.getVideosByIds(videoIds, userId);
    }
}
