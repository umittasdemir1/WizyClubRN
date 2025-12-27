import { IFollowRepository } from '../repositories/IFollowRepository';

export class ToggleFollowUseCase {
    constructor(private followRepository: IFollowRepository) { }

    async execute(followingId: string, followerId: string = '687c8079-e94c-42c2-9442-8a4a6b63dec6'): Promise<boolean> {
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
