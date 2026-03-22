import { IVideoRepository } from '../repositories/IVideoRepository';

export class RecordVideoViewUseCase {
    constructor(private readonly videoRepository: IVideoRepository) {}

    execute(
        videoId: string,
        userId: string,
        options?: { cooldownMs?: number }
    ): Promise<'inserted' | 'cooldown' | 'error'> {
        return this.videoRepository.recordVideoView(videoId, userId, options);
    }
}
