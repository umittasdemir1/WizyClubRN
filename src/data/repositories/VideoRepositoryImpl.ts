import { IVideoRepository } from '../../domain/repositories/IVideoRepository';
import { Video } from '../../domain/entities/Video';
import { MockVideoDataSource } from '../datasources/MockVideoDataSource';
import { VideoMapper } from '../mappers/VideoMapper';

export class VideoRepositoryImpl implements IVideoRepository {
    private dataSource: MockVideoDataSource;

    constructor() {
        this.dataSource = new MockVideoDataSource();
    }

    async getFeed(page: number, limit: number): Promise<Video[]> {
        const videoDtos = await this.dataSource.getVideos(page, limit);
        return videoDtos.map(VideoMapper.toEntity);
    }

    async toggleLike(videoId: string): Promise<boolean> {
        // In a real app, this would call the API.
        // For mock, we just return true to simulate success.
        return true;
    }

    async getVideoById(videoId: string): Promise<Video | null> {
        const videos = await this.dataSource.getVideos(1, 100);
        const videoDto = videos.find((v) => v.id === videoId);
        return videoDto ? VideoMapper.toEntity(videoDto) : null;
    }
}
