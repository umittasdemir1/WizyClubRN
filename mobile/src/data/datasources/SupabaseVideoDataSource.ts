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
    };
}

export class SupabaseVideoDataSource {
    async getVideos(page: number, limit: number, userId?: string): Promise<Video[]> {
        const offset = (page - 1) * limit;
        console.log(`[DataSource] Fetching videos: page=${page}, offset=${offset}, limit=${limit}, userId=${userId}`);

        const { data, error } = await supabase
            .from('videos')
            .select('*, profiles(*)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

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

    // ... (getStories remains same for now) ...

    async getStories(): Promise<Story[]> {
        const { data, error } = await supabase
            .from('stories')
            .select('*, profiles(*)')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('Supabase stories error:', error);
            return [];
        }

        return (data as any[]).map(this.mapToStory);
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

        // Note: For simplicity in single video fetch, we are not fetching interaction status yet.
        // In a real app, we should pass userId here too if available.
        return this.mapToVideo(data as SupabaseVideo);
    }

    private mapToVideo(dto: SupabaseVideo, interactions?: { isLiked: boolean; isSaved: boolean; isFollowing: boolean }): Video {
        // Professional parsing might be needed if URLs in DB are relative, 
        // but currently they are absolute. I'll ensure helper fields 
        // match the IG/TikTok style.
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
                isVerified: dto.profiles.is_verified,
                followersCount: dto.profiles.followers_count,
                followingCount: dto.profiles.following_count,
                postsCount: dto.profiles.posts_count,
                isFollowing: interactions?.isFollowing || false,
            } : getUserFromId(dto.user_id),
            musicName: dto.music_name || 'Original Audio',
            musicAuthor: dto.music_author || 'WizyClub',
            width: dto.width,
            height: dto.height,
            isCommercial: dto.is_commercial,
            brandName: dto.brand_name,
            brandUrl: dto.brand_url,
            commercialType: dto.commercial_type,
        };
    }

    private mapToStory(dto: any): Story {
        return {
            id: dto.id,
            videoUrl: dto.video_url,
            thumbnailUrl: dto.thumbnail_url,
            createdAt: dto.created_at,
            expiresAt: dto.expires_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            isViewed: false,
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
        };
    }
}
