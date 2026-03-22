import { Video } from '../entities/Video';
import { IVideoRepository } from '../repositories/IVideoRepository';

export class SearchVideosUseCase {
    constructor(private videoRepository: IVideoRepository) { }

    async execute(query: string, limit: number = 20, userId?: string): Promise<Video[]> {
        return this.videoRepository.searchVideos(query, limit, userId);
    }
}
