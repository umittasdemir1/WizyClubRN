import { Video } from '../../domain/entities/Video';
import { Story } from '../../domain/entities/Story';
import { User } from '../../domain/entities/User';
import { supabase } from '../../core/supabase';

// User mapping - converts user_id to display info
const USER_MAP: Record<string, { displayName: string; avatar: string }> = {
    'ece_yilmaz': { displayName: 'Ece Yılmaz', avatar: 'Ece+Yilmaz' },
    'ali_kaya': { displayName: 'Ali Kaya', avatar: 'Ali+Kaya' },
    'zeynep_demir': { displayName: 'Zeynep Demir', avatar: 'Zeynep+Demir' },
    'mert_aksoy': { displayName: 'Mert Aksoy', avatar: 'Mert+Aksoy' },
    'defne_ozturk': { displayName: 'Defne Öztürk', avatar: 'Defne+Ozturk' },
    'can_sahin': { displayName: 'Can Şahin', avatar: 'Can+Sahin' },
    'elif_celik': { displayName: 'Elif Çelik', avatar: 'Elif+Celik' },
    'burak_yildiz': { displayName: 'Burak Yıldız', avatar: 'Burak+Yildiz' },
    'selin_aydin': { displayName: 'Selin Aydın', avatar: 'Selin+Aydin' },
    'emre_koc': { displayName: 'Emre Koç', avatar: 'Emre+Koc' },
    'ayse_tas': { displayName: 'Ayşe Taş', avatar: 'Ayse+Tas' },
    'deniz_arslan': { displayName: 'Deniz Arslan', avatar: 'Deniz+Arslan' },
    'ceren_polat': { displayName: 'Ceren Polat', avatar: 'Ceren+Polat' },
    'kaan_erdogan': { displayName: 'Kaan Erdoğan', avatar: 'Kaan+Erdogan' },
    '687c8079-e94c-42c2-9442-8a4a6b63dec6': { displayName: 'WizyClub', avatar: 'Wizy+Club' },
};

// Generate user from user_id
function getUserFromId(userId: string): User {
    const userInfo = USER_MAP[userId] || {
        displayName: userId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        avatar: userId.replace(/_/g, '+')
    };

    return {
        id: userId,
        username: userInfo.displayName,
        avatarUrl: `https://ui-avatars.com/api/?name=${userInfo.avatar}&background=random&color=fff&size=200`,
        isFollowing: Math.random() > 0.5,
    };
}

// Supabase video response type
interface SupabaseVideo {
    id: string;
    user_id: string;
    video_url: string;
    thumbnail_url: string;
    description: string;
    likes_count: number;
    views_count: number;
    shares_count: number;
    saves_count: number;
    shops_count: number;
    created_at: string;
    sprite_url?: string;
    width?: number;
    height?: number;
    is_commercial?: boolean;
    brand_name?: string;
    brand_url?: string;
    commercial_type?: string;
    music_name?: string;
    music_author?: string;
    media_urls?: any[];
    post_type?: 'video' | 'carousel';
    profiles?: {
        username: string;
        full_name: string;
        avatar_url: string;
        country: string;
        age: number;
        bio: string;
        is_verified: boolean;
        followers_count: number;
        following_count: number;
        posts_count: number;
        instagram_url?: string;
        tiktok_url?: string;
        youtube_url?: string;
        x_url?: string;
        website?: string;
    };
}

export class SupabaseVideoDataSource {
    async getVideos(page: number, limit: number, userId?: string, authorId?: string): Promise<Video[]> {
        const offset = (page - 1) * limit;
        console.log(`[DataSource] Fetching videos: page=${page}, offset=${offset}, limit=${limit}, userId=${userId}, authorId=${authorId}`);

        let query = supabase
            .from('videos')
            .select('*, profiles(*)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (authorId) {
            query = query.eq('user_id', authorId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('[DataSource] Supabase error:', error);
            return [];
        }

        const videos = data as SupabaseVideo[];
        if (!videos.length) return [];

        // If no user, just map without personalization
        if (!userId) {
            return videos.map(v => this.mapToVideo(v));
        }

        // Fetch interactions for these videos
        const videoIds = videos.map(v => v.id);
        const authorIds = [...new Set(videos.map(v => v.user_id))];

        const [likes, saves, follows] = await Promise.all([
            supabase.from('likes').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('saves').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds)
        ]);

        const likedVideoIds = new Set(likes.data?.map(l => l.video_id) || []);
        const savedVideoIds = new Set(saves.data?.map(s => s.video_id) || []);
        const followedUserIds = new Set(follows.data?.map(f => f.following_id) || []);

        return videos.map(v => this.mapToVideo(v, {
            isLiked: likedVideoIds.has(v.id),
            isSaved: savedVideoIds.has(v.id),
            isFollowing: followedUserIds.has(v.user_id)
        }));
    }

    async getStories(): Promise<Story[]> {
        const now = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();

        let query = supabase
            .from('stories')
            .select('*, profiles(*)')
            .gt('expires_at', now) // Only show unexpired stories
            .order('created_at', { ascending: false })
            .limit(50);

        const { data, error } = await query;

        if (error) {
            console.error('Supabase stories error:', error);
            return [];
        }

        let viewedStoryIds = new Set<string>();
        if (user) {
            const { data: views } = await supabase
                .from('story_views')
                .select('story_id')
                .eq('user_id', user.id);

            if (views) {
                views.forEach(v => viewedStoryIds.add(v.story_id));
            }
        }

        console.log('[Stories] Fetched', data?.length || 0, 'active stories');
        return (data as any[]).map(dto => this.mapToStory(dto, viewedStoryIds.has(dto.id)));
    }

    async markStoryAsViewed(storyId: string, userId: string): Promise<void> {
        if (!userId) return;

        const { error } = await supabase
            .from('story_views')
            .insert({
                user_id: userId,
                story_id: storyId
            });

        if (error) {
            // Ignore unique violation (code 23505)
            if (error.code !== '23505') {
                console.error('Error marking story as viewed:', error);
            }
        }
    }

    async recordVideoView(videoId: string, userId: string): Promise<void> {
        if (!userId) return;

        const { error } = await supabase
            .from('video_views')
            .insert({
                user_id: userId,
                video_id: videoId
            });

        if (error) {
            // Ignore unique violation (code 23505) if we had a unique constraint
            // But for video_views, we might want multiple entries or just one.
            // Based on the migration, we didn't add a UNIQUE constraint, so multiple views will be recorded.
            if (error.code !== '23505') {
                console.error('Error recording video view:', error);
            }
        }
    }

    async getVideoById(videoId: string): Promise<Video | null> {
        const { data, error } = await supabase
            .from('videos')
            .select('*, profiles(*)')
            .eq('id', videoId)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToVideo(data as SupabaseVideo);
    }

    async getVideosByIds(videoIds: string[], userId?: string): Promise<Video[]> {
        if (!videoIds.length) return [];

        const { data, error } = await supabase
            .from('videos')
            .select('*, profiles(*)')
            .in('id', videoIds)
            .is('deleted_at', null);

        if (error || !data) {
            console.error('[DataSource] getVideosByIds error:', error);
            return [];
        }

        const videos = data as SupabaseVideo[];

        // If no user, just map without personalization
        if (!userId) {
            return videos.map(v => this.mapToVideo(v));
        }

        // Fetch interactions for these videos
        const [likes, saves, follows] = await Promise.all([
            supabase.from('likes').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('saves').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', videos.map(v => v.user_id))
        ]);

        const likedVideoIds = new Set(likes.data?.map(l => l.video_id) || []);
        const savedVideoIds = new Set(saves.data?.map(s => s.video_id) || []);
        const followedUserIds = new Set(follows.data?.map(f => f.following_id) || []);

        return videos.map(v => this.mapToVideo(v, {
            isLiked: likedVideoIds.has(v.id),
            isSaved: savedVideoIds.has(v.id),
            isFollowing: followedUserIds.has(v.user_id)
        }));
    }

    private mapToVideo(dto: SupabaseVideo, interactions?: { isLiked: boolean; isSaved: boolean; isFollowing: boolean }): Video {
        return {
            id: dto.id,
            videoUrl: dto.video_url,
            thumbnailUrl: dto.thumbnail_url,
            description: dto.description || '',
            likesCount: dto.likes_count || 0,
            commentsCount: 0,
            sharesCount: dto.shares_count || 0,
            shopsCount: dto.shops_count || 0,
            spriteUrl: dto.sprite_url,
            isLiked: interactions?.isLiked || false,
            isSaved: interactions?.isSaved || false,
            savesCount: dto.saves_count || 0,
            user: dto.profiles ? {
                id: dto.user_id,
                username: dto.profiles.username,
                fullName: dto.profiles.full_name,
                avatarUrl: dto.profiles.avatar_url,
                country: dto.profiles.country,
                age: dto.profiles.age,
                bio: dto.profiles.bio,
                website: dto.profiles.website,
                isVerified: dto.profiles.is_verified,
                followersCount: dto.profiles.followers_count,
                followingCount: dto.profiles.following_count,
                postsCount: dto.profiles.posts_count,
                isFollowing: interactions?.isFollowing || false,
                instagramUrl: dto.profiles.instagram_url,
                tiktokUrl: dto.profiles.tiktok_url,
                youtubeUrl: dto.profiles.youtube_url,
                xUrl: dto.profiles.x_url,
            } : getUserFromId(dto.user_id),
            musicName: dto.music_name || 'Original Audio',
            musicAuthor: dto.music_author || 'WizyClub',
            width: dto.width,
            height: dto.height,
            isCommercial: dto.is_commercial,
            brandName: dto.brand_name,
            brandUrl: dto.brand_url,
            commercialType: dto.commercial_type,
            mediaUrls: dto.media_urls,
            postType: dto.post_type,
        };
    }

    private mapToStory(dto: any, isViewed = false): Story {
        return {
            id: dto.id,
            videoUrl: dto.video_url,
            thumbnailUrl: dto.thumbnail_url,
            createdAt: dto.created_at,
            expiresAt: dto.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isViewed: isViewed,
            user: dto.profiles ? {
                id: dto.user_id,
                username: dto.profiles.username,
                fullName: dto.profiles.full_name,
                avatarUrl: dto.profiles.avatar_url,
                country: dto.profiles.country,
                age: dto.profiles.age,
                bio: dto.profiles.bio,
                isVerified: dto.profiles.is_verified,
                followersCount: dto.profiles.followers_count,
                followingCount: dto.profiles.following_count,
                postsCount: dto.profiles.posts_count,
                isFollowing: false,
            } : getUserFromId(dto.user_id),
            width: dto.width,
            height: dto.height,
            isCommercial: dto.is_commercial,
            brandName: dto.brand_name,
            brandUrl: dto.brand_url,
            commercialType: dto.commercial_type,
            likesCount: dto.likes_count || 0,
            mediaUrls: dto.media_urls,
            postType: dto.post_type,
        };
    }
}
