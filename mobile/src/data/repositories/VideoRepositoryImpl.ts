import { IVideoRepository } from '../../domain/repositories/IVideoRepository';
import { Video } from '../../domain/entities/Video';
import { SupabaseVideoDataSource } from '../datasources/SupabaseVideoDataSource';
import { VideoMapper } from '../mappers/VideoMapper';

export class VideoRepositoryImpl implements IVideoRepository {
    private dataSource: SupabaseVideoDataSource;

    constructor() {
        this.dataSource = new SupabaseVideoDataSource();
    }

    async getFeed(page: number, limit: number, userId?: string, authorId?: string): Promise<Video[]> {
        // Supabase data source already returns Video entities
        return this.dataSource.getVideos(page, limit, userId, authorId);
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
