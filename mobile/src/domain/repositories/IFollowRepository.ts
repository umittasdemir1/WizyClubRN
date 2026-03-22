export interface IFollowRepository {
    follow(followerId: string, followingId: string): Promise<void>;
    unfollow(followerId: string, followingId: string): Promise<void>;
    isFollowing(followerId: string, followingId: string): Promise<boolean>;
    getFollowersCount(userId: string): Promise<number>;
    getFollowingCount(userId: string): Promise<number>;
}
