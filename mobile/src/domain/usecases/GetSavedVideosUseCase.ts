import { ISaveRepository } from '../repositories/ISaveRepository';
import { IVideoRepository } from '../repositories/IVideoRepository';
import { Video } from '../entities/Video';

export class GetSavedVideosUseCase {
    constructor(
        private saveRepository: ISaveRepository,
        private videoRepository: IVideoRepository
    ) { }

    async execute(userId: string): Promise<Video[]> {
        const savedVideoIds = await this.saveRepository.getSavedVideos(userId);
        if (!savedVideoIds.length) return [];

        return this.videoRepository.getVideosByIds(savedVideoIds, userId);
    }
}
