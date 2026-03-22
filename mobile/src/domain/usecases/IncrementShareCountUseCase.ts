import { IVideoRepository } from '../repositories/IVideoRepository';

export class IncrementShareCountUseCase {
    constructor(private readonly videoRepository: IVideoRepository) {}

    async execute(videoId: string): Promise<void> {
        await this.videoRepository.incrementShareCount(videoId);
    }
}
