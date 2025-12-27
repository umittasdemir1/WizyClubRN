import { ILikeRepository } from '../repositories/ILikeRepository';

export class ToggleLikeUseCase {
    constructor(private likeRepository: ILikeRepository) { }

    async execute(videoId: string, userId: string = '687c8079-e94c-42c2-9442-8a4a6b63dec6'): Promise<boolean> {
        return this.likeRepository.toggleLike(userId, videoId, 'video');
    }
}
