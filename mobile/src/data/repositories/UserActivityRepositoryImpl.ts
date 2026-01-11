import { IUserActivityRepository } from '../../domain/repositories/IUserActivityRepository';
import { Video } from '../../domain/entities/Video';
import { SupabaseVideoDataSource } from '../datasources/SupabaseVideoDataSource';
import { supabase } from '../../core/supabase';

export class UserActivityRepositoryImpl implements IUserActivityRepository {
    private videoDataSource: SupabaseVideoDataSource;

    constructor() {
        this.videoDataSource = new SupabaseVideoDataSource();
    }

    async getLikedVideos(userId: string): Promise<Video[]> {
        const { data, error } = await supabase
            .from('likes')
            .select('video_id')
            .eq('user_id', userId)
            .not('video_id', 'is', null)
            .order('created_at', { ascending: false });

        if (error || !data) return [];
        const videoIds = data.map(l => l.video_id);
        return this.videoDataSource.getVideosByIds(videoIds, userId);
    }

    async getSavedVideos(userId: string): Promise<Video[]> {
        const { data, error } = await supabase
            .from('saves')
            .select('video_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error || !data) return [];
        const videoIds = data.map(s => s.video_id);
        return this.videoDataSource.getVideosByIds(videoIds, userId);
    }

    async getWatchHistory(userId: string): Promise<Video[]> {
        const { data, error } = await supabase
            .from('video_views')
            .select('video_id')
            .eq('user_id', userId)
            .order('viewed_at', { ascending: false });

        if (error || !data) return [];

        // Remove duplicates while keeping order (most recent first)
        const videoIds = [...new Set(data.map(v => v.video_id))];
        return this.videoDataSource.getVideosByIds(videoIds, userId);
    }
}
