import { Video } from '../entities/Video';
import { IVideoRepository } from '../repositories/IVideoRepository';

export class GetVideoFeedUseCase {
    constructor(private videoRepository: IVideoRepository) { }

    async execute(page: number = 1, limit: number = 10, userId?: string, authorId?: string): Promise<Video[]> {
        return this.videoRepository.getFeed(page, limit, userId, authorId);
    }
}
