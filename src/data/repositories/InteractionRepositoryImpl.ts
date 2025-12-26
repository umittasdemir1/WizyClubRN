import { ILikeRepository } from '../../domain/repositories/ILikeRepository';
import { IFollowRepository } from '../../domain/repositories/IFollowRepository';
import { ISaveRepository } from '../../domain/repositories/ISaveRepository';
import { InteractionDataSource } from '../datasources/InteractionDataSource';
import { supabase } from '../../core/supabase';

export class InteractionRepositoryImpl implements ILikeRepository, IFollowRepository, ISaveRepository {
    private dataSource: InteractionDataSource;

    constructor() {
        this.dataSource = new InteractionDataSource();
    }

    // Like
    async toggleLike(userId: string, targetId: string, targetType: 'video' | 'story'): Promise<boolean> {
        return await this.dataSource.toggleLike(userId, targetId, targetType);
    }

    async isLiked(userId: string, targetId: string, targetType: 'video' | 'story'): Promise<boolean> {
        const column = targetType === 'video' ? 'video_id' : 'story_id';
        const { data } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', userId)
            .eq(column, targetId)
            .single();
        return !!data;
    }

    async getLikesCount(targetId: string, targetType: 'video' | 'story'): Promise<number> {
        const column = targetType === 'video' ? 'video_id' : 'story_id';
        const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq(column, targetId);
        return count || 0;
    }

    // Follow
    async follow(followerId: string, followingId: string): Promise<void> {
        await this.dataSource.follow(followerId, followingId);
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await this.dataSource.unfollow(followerId, followingId);
    }

    async isFollowing(followerId: string, followingId: string): Promise<boolean> {
        const { data } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', followerId)
            .eq('following_id', followingId)
            .single();
        return !!data;
    }

    async getFollowersCount(userId: string): Promise<number> {
        const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId);
        return count || 0;
    }

    async getFollowingCount(userId: string): Promise<number> {
        const { count } = await supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', userId);
        return count || 0;
    }

    // Save
    async toggleSave(userId: string, videoId: string): Promise<boolean> {
        return await this.dataSource.toggleSave(userId, videoId);
    }

    async isSaved(userId: string, videoId: string): Promise<boolean> {
        const { data } = await supabase
            .from('saves')
            .select('id')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .single();
        return !!data;
    }

    async getSavedVideos(userId: string): Promise<string[]> {
        const { data } = await supabase
            .from('saves')
            .select('video_id')
            .eq('user_id', userId);
        return data?.map(d => d.video_id) || [];
    }
}
