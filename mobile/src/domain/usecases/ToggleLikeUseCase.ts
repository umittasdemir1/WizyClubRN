import { ILikeRepository } from '../repositories/ILikeRepository';

export class ToggleLikeUseCase {
    constructor(private likeRepository: ILikeRepository) { }

    async execute(videoId: string, userId: string): Promise<boolean> {
        return this.likeRepository.toggleLike(userId, videoId, 'video');
    }
}
