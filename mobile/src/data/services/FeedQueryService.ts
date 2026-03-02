import { Video } from '../../domain/entities/Video';
import { SupabaseVideoDataSource } from '../datasources/SupabaseVideoDataSource';
import { VideoRepositoryImpl } from '../repositories/VideoRepositoryImpl';

interface WaitForVideoOptions {
    attempts?: number;
    delayMs?: number;
}

export interface EditableVideoRecord {
    id: string;
    userId: string;
    thumbnailUrl: string | null;
    description: string;
}

export interface DeletedVideoRecord {
    id: string;
    thumbnailUrl: string | null;
    deletedAt: string | null;
}

export interface HashtagSearchResult {
    id: string;
    name: string;
    post_count: number;
    click_count: number;
    search_count: number;
    score: number;
}

export class FeedQueryService {
    private readonly videoDataSource: SupabaseVideoDataSource;
    private readonly videoRepository: VideoRepositoryImpl;

    constructor() {
        this.videoDataSource = new SupabaseVideoDataSource();
        this.videoRepository = new VideoRepositoryImpl();
    }

    async getVideoForFeed(videoId: string): Promise<Video | null> {
        const normalizedId = videoId.trim();
        if (!normalizedId) return null;
        return this.videoRepository.getVideoById(normalizedId);
    }

    async waitForVideoForFeed(videoId: string, options?: WaitForVideoOptions): Promise<Video | null> {
        const attempts = Number.isFinite(options?.attempts)
            ? Math.max(1, Math.floor(options!.attempts!))
            : 5;
        const delayMs = Number.isFinite(options?.delayMs)
            ? Math.max(0, Math.floor(options!.delayMs!))
            : 120;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const video = await this.getVideoForFeed(videoId);
            if (video) return video;

            if (attempt < attempts - 1 && delayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }

        return null;
    }

    async getVideoHashtags(videoId: string): Promise<string[]> {
        const normalizedId = videoId.trim();
        if (!normalizedId) return [];
        return this.videoDataSource.getHashtagsByVideoId(normalizedId);
    }

    async getEditableVideo(videoId: string): Promise<EditableVideoRecord | null> {
        const row = await this.videoDataSource.getEditableVideo(videoId);
        if (!row) return null;

        return {
            id: row.id,
            userId: row.user_id,
            thumbnailUrl: row.thumbnail_url,
            description: row.description || '',
        };
    }

    async updateVideoDescription(videoId: string, userId: string, description: string): Promise<boolean> {
        return this.videoDataSource.updateVideoDescription(videoId, userId, description);
    }

    async getDeletedVideos(userId?: string, limit: number = 50): Promise<DeletedVideoRecord[]> {
        const rows = await this.videoDataSource.getDeletedVideos(userId, limit);
        return rows.map((row) => ({
            id: row.id,
            thumbnailUrl: row.thumbnail_url,
            deletedAt: row.deleted_at,
        }));
    }

    async searchHashtags(query: string, limit: number = 30): Promise<HashtagSearchResult[]> {
        const rows = await this.videoDataSource.searchHashtags(query, limit);
        return rows.map((row) => ({
            id: row.id,
            name: row.name,
            post_count: row.postCount,
            click_count: row.clickCount,
            search_count: row.searchCount,
            score: row.score,
        }));
    }

    recordHashtagClick(hashtag: string): void {
        void this.videoDataSource.incrementHashtagClick(hashtag);
    }

    recordHashtagSearch(hashtag: string): void {
        void this.videoDataSource.incrementHashtagSearch(hashtag);
    }
}
