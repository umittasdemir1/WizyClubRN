import { ILikeRepository } from '../repositories/ILikeRepository';

export class ToggleLikeUseCase {
    constructor(private likeRepository: ILikeRepository) { }

    async execute(videoId: string, userId: string = 'wizyclub-official'): Promise<boolean> {
        return this.likeRepository.toggleLike(userId, videoId, 'video');
    }
}
