import { IFollowRepository } from '../repositories/IFollowRepository';

export class ToggleFollowUseCase {
    constructor(private followRepository: IFollowRepository) { }

    async execute(followingId: string, followerId: string = 'wizyclub-official'): Promise<boolean> {
        // Checking if already following
        const isFollowing = await this.followRepository.isFollowing(followerId, followingId);

        if (isFollowing) {
            await this.followRepository.unfollow(followerId, followingId);
            return false;
        } else {
            await this.followRepository.follow(followerId, followingId);
            return true;
        }
    }
}
