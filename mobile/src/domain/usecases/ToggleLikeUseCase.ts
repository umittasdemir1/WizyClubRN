import { IVideoRepository } from '../repositories/IVideoRepository';

export class ToggleLikeUseCase {
    constructor(private videoRepository: IVideoRepository) { }

    async execute(videoId: string): Promise<boolean> {
        return this.videoRepository.toggleLike(videoId);
    }
}
