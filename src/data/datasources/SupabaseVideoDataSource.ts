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
    'wizyclub-official': { displayName: 'WizyClub', avatar: 'Wizy+Club' },
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
            commentsCount: Math.floor(Math.random() * 100),
            sharesCount: Math.floor(Math.random() * 50),
            shopsCount: Math.floor(Math.random() * 30),
            isLiked: false,
            isSaved: false,
            savesCount: Math.floor(Math.random() * 200),
            user: getUserFromId(dto.user_id),
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
            user: getUserFromId(dto.user_id),
        };
    }
}
