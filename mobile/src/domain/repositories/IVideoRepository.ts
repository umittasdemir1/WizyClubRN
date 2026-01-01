import { Video } from '../entities/Video';

export interface IVideoRepository {
    getFeed(page: number, limit: number, userId?: string, authorId?: string): Promise<Video[]>;
    toggleLike(videoId: string): Promise<boolean>;
    getVideoById(videoId: string): Promise<Video | null>;
}
