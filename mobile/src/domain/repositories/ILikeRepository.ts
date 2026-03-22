export interface ILikeRepository {
    toggleLike(userId: string, targetId: string, targetType: 'video' | 'story'): Promise<boolean>;
    isLiked(userId: string, targetId: string, targetType: 'video' | 'story'): Promise<boolean>;
    getLikesCount(targetId: string, targetType: 'video' | 'story'): Promise<number>;
}
