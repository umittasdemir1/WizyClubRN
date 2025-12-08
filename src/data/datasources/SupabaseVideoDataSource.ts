import { Video } from '../../domain/entities/Video';
import { Story } from '../../domain/entities/Story';
import { User } from '../../domain/entities/User';
import { supabase } from '../../core/supabase';

// Default user for videos from Supabase (until we add user table)
const DEFAULT_USER: User = {
    id: 'wizyclub-official',
    username: 'wizyclub_official',
    avatarUrl: 'https://ui-avatars.com/api/?name=Wizy+Club&background=7C3AED&color=fff',
    isFollowing: false,
};

// Supabase video response type
interface SupabaseVideo {
    id: string;
    user_id: string;
    video_url: string;
    thumbnail_url: string;
    description: string;
    likes_count: number;
    views_count: number;
    created_at: string;
}

export class SupabaseVideoDataSource {
    async getVideos(page: number, limit: number): Promise<Video[]> {
        const offset = (page - 1) * limit;

        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Supabase error:', error);
            return [];
        }

        return (data as SupabaseVideo[]).map(this.mapToVideo);
    }

    async getStories(): Promise<Story[]> {
        // For now, fetch latest 8 videos as stories
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(8);

        if (error) {
            console.error('Supabase error:', error);
            return [];
        }

        return (data as SupabaseVideo[]).map(this.mapToStory);
    }

    async getVideoById(videoId: string): Promise<Video | null> {
        const { data, error } = await supabase
            .from('videos')
            .select('*')
            .eq('id', videoId)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToVideo(data as SupabaseVideo);
    }

    private mapToVideo(dto: SupabaseVideo): Video {
        return {
            id: dto.id,
            videoUrl: dto.video_url,
            thumbnailUrl: dto.thumbnail_url,
            description: dto.description || '',
            likesCount: dto.likes_count || 0,
            commentsCount: 0, // Not in Supabase yet
            sharesCount: 0,   // Not in Supabase yet
            shopsCount: 0,    // Not in Supabase yet
            isLiked: false,   // Would need user context
            isSaved: false,   // Would need user context
            savesCount: 0,    // Not in Supabase yet
            user: DEFAULT_USER,
            musicName: 'Original Audio',
            musicAuthor: 'WizyClub',
        };
    }

    private mapToStory(dto: SupabaseVideo): Story {
        return {
            id: dto.id,
            videoUrl: dto.video_url,
            thumbnailUrl: dto.thumbnail_url,
            createdAt: dto.created_at,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isViewed: false,
            user: DEFAULT_USER,
        };
    }
}
