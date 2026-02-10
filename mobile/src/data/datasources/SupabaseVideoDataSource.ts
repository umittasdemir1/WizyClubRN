import { Video } from '../../domain/entities/Video';
import { VideoFeedCursor, VideoFeedResult } from '../../domain/entities/VideoFeed';
import { Story } from '../../domain/entities/Story';
import { User } from '../../domain/entities/User';
import { supabase } from '../../core/supabase';
import { LogCode, logData, logError } from '@/core/services/Logger';

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

const LEGACY_R2_HOST = 'pub-426c6d2d3e914041a80d464249339e3c.r2.dev';
const R2_PROXY_ORIGIN = 'https://wizy-r2-proxy.tasdemir-umit.workers.dev';

function normalizeAssetUrl(url?: string | null): string {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';

    try {
        const parsed = new URL(trimmed);
        if (parsed.hostname === LEGACY_R2_HOST) {
            return `${R2_PROXY_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        return trimmed;
    } catch {
        return trimmed;
    }
}

function normalizeMediaUrls(mediaUrls?: any[]): any[] | undefined {
    if (!Array.isArray(mediaUrls)) return mediaUrls;
    return mediaUrls.map((media) => ({
        ...media,
        url: typeof media?.url === 'string' ? normalizeAssetUrl(media.url) : media?.url,
        thumbnail: typeof media?.thumbnail === 'string' ? normalizeAssetUrl(media.thumbnail) : media?.thumbnail,
        sprite: typeof media?.sprite === 'string' ? normalizeAssetUrl(media.sprite) : media?.sprite,
    }));
}

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
        shop_enabled?: boolean;
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
    private static readonly DEFAULT_VIEW_COOLDOWN_MS = 30 * 60 * 1000;
    async getVideos(limit: number, userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): Promise<VideoFeedResult> {
        const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
        logData(LogCode.DB_QUERY_START, 'Fetching videos with cursor pagination', {
            limit: normalizedLimit,
            userId,
            authorId,
            cursor,
        });

        let query = supabase
            .from('videos')
            .select('*, profiles(*)')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .limit(normalizedLimit);

        if (authorId) {
            query = query.eq('user_id', authorId);
        }

        if (cursor?.createdAt && cursor?.id) {
            const createdAtFilter = `"${cursor.createdAt.replace(/"/g, '\\"')}"`;
            const idFilter = `"${cursor.id.replace(/"/g, '\\"')}"`;
            query = query.or(`created_at.lt.${createdAtFilter},and(created_at.eq.${createdAtFilter},id.lt.${idFilter})`);
        }

        let { data, error } = await query;

        if (error && cursor?.createdAt) {
            logError(LogCode.DB_QUERY_ERROR, 'Cursor OR query failed, retrying with created_at fallback', error);

            let fallbackQuery = supabase
                .from('videos')
                .select('*, profiles(*)')
                .is('deleted_at', null)
                .lt('created_at', cursor.createdAt)
                .order('created_at', { ascending: false })
                .order('id', { ascending: false })
                .limit(normalizedLimit);

            if (authorId) {
                fallbackQuery = fallbackQuery.eq('user_id', authorId);
            }

            const fallbackResult = await fallbackQuery;
            data = fallbackResult.data;
            error = fallbackResult.error;
        }

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Supabase videos fetch error', error);
            return {
                videos: [],
                nextCursor: null,
            };
        }

        const videos = (data as SupabaseVideo[] | null) || [];
        if (!videos.length) {
            return {
                videos: [],
                nextCursor: null,
            };
        }

        let mappedVideos: Video[];

        // If no user, just map without personalization
        if (!userId) {
            mappedVideos = videos.map(v => this.mapToVideo(v));
        } else {
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

            mappedVideos = videos.map(v => this.mapToVideo(v, {
                isLiked: likedVideoIds.has(v.id),
                isSaved: savedVideoIds.has(v.id),
                isFollowing: followedUserIds.has(v.user_id)
            }));
        }

        const lastItem = videos[videos.length - 1];
        const nextCursor = videos.length >= normalizedLimit
            ? {
                createdAt: lastItem.created_at,
                id: lastItem.id,
            }
            : null;

        return {
            videos: mappedVideos,
            nextCursor,
        };
    }

    async searchVideos(query: string, limit: number = 20, userId?: string): Promise<Video[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const normalized = trimmed.replace(/\s+/g, ' ').trim();
        const term = normalized.startsWith('#') ? normalized.slice(1) : normalized;
        const escaped = term.replace(/[%_]/g, '\\$&');
        const ilikeTerm = `%${escaped}%`;

        const [
            { data: descriptionData, error: descriptionError },
            { data: profileData, error: profileError },
        ] = await Promise.all([
            supabase
                .from('videos')
                .select('id')
                .is('deleted_at', null)
                .ilike('description', ilikeTerm)
                .order('created_at', { ascending: false })
                .limit(limit),
            supabase
                .from('profiles')
                .select('id')
                .or(`username.ilike.${ilikeTerm},full_name.ilike.${ilikeTerm}`)
                .limit(50),
        ]);

        if (descriptionError) {
            logError(LogCode.DB_QUERY_ERROR, 'Search videos by description error', { query, error: descriptionError });
        }

        if (profileError) {
            logError(LogCode.DB_QUERY_ERROR, 'Search profiles by name error', { query, error: profileError });
        }

        const descriptionIds = (descriptionData as Array<{ id: string }> | null)?.map((row) => row.id) || [];
        const profileIds = (profileData as Array<{ id: string }> | null)?.map((row) => row.id) || [];

        let authorIds: string[] = [];
        if (profileIds.length > 0) {
            const { data: authorData, error: authorError } = await supabase
                .from('videos')
                .select('id')
                .is('deleted_at', null)
                .in('user_id', profileIds)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (authorError) {
                logError(LogCode.DB_QUERY_ERROR, 'Search videos by author error', { query, error: authorError });
            }

            authorIds = (authorData as Array<{ id: string }> | null)?.map((row) => row.id) || [];
        }

        const ids = Array.from(new Set([...descriptionIds, ...authorIds])).slice(0, limit);
        if (!ids.length) return [];

        // Search grid doesn't need like/save/follow state; skip extra queries for speed.
        const includeInteractions = false;
        const videos = await this.getVideosByIds(ids, includeInteractions ? userId : undefined);
        const videoMap = new Map(videos.map((video) => [video.id, video]));
        return ids.map((id) => videoMap.get(id)).filter(Boolean) as Video[];
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
            logError(LogCode.DB_QUERY_ERROR, 'Supabase stories fetch error', error);
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

        logData(LogCode.DB_QUERY_SUCCESS, 'Stories fetched successfully', { count: data?.length || 0 });
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
                logError(LogCode.DB_INSERT, 'Error marking story as viewed', { storyId, userId, error });
            }
        }
    }

    async recordVideoView(
        videoId: string,
        userId: string,
        options?: { cooldownMs?: number }
    ): Promise<'inserted' | 'cooldown' | 'error'> {
        if (!userId || !videoId) return 'error';

        const rawCooldownMs = options?.cooldownMs;
        const cooldownMs = Number.isFinite(rawCooldownMs)
            ? Math.max(0, Math.floor(rawCooldownMs as number))
            : SupabaseVideoDataSource.DEFAULT_VIEW_COOLDOWN_MS;

        const { data: recentViews, error: recentError } = await supabase
            .from('video_views')
            .select('viewed_at')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .order('viewed_at', { ascending: false })
            .limit(1);

        if (recentError) {
            logError(LogCode.DB_QUERY_ERROR, 'Error checking latest video view', { videoId, userId, error: recentError });
        } else {
            const latestViewedAt = recentViews?.[0]?.viewed_at;
            if (typeof latestViewedAt === 'string') {
                const latestTimestamp = new Date(latestViewedAt).getTime();
                if (Number.isFinite(latestTimestamp) && Date.now() - latestTimestamp < cooldownMs) {
                    return 'cooldown';
                }
            }
        }

        const { error } = await supabase
            .from('video_views')
            .insert({
                user_id: userId,
                video_id: videoId
            });

        if (error) {
            if (error.code !== '23505') {
                logError(LogCode.DB_INSERT, 'Error recording video view', { videoId, userId, error });
            }
            return 'error';
        }

        const { error: incrementError } = await supabase.rpc('increment_video_counter', {
            video_id: videoId,
            counter_column: 'views_count',
        });

        if (incrementError) {
            logError(LogCode.DB_UPDATE, 'Error incrementing views_count after video view insert', {
                videoId,
                userId,
                error: incrementError,
            });
        }

        return 'inserted';
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
            logError(LogCode.DB_QUERY_ERROR, 'getVideosByIds error', { videoIds, error });
            return [];
        }

        const videos = data as SupabaseVideo[];
        const videosById = new Map(videos.map((video) => [video.id, video] as const));
        const orderedVideos = videoIds
            .map((videoId) => videosById.get(videoId))
            .filter((video): video is SupabaseVideo => Boolean(video));

        if (!orderedVideos.length) return [];

        // If no user, just map without personalization
        if (!userId) {
            return orderedVideos.map(v => this.mapToVideo(v));
        }

        const orderedUserIds = Array.from(new Set(orderedVideos.map((video) => video.user_id)));

        // Fetch interactions for these videos
        const [likes, saves, follows] = await Promise.all([
            supabase.from('likes').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('saves').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', orderedUserIds)
        ]);

        const likedVideoIds = new Set(likes.data?.map(l => l.video_id) || []);
        const savedVideoIds = new Set(saves.data?.map(s => s.video_id) || []);
        const followedUserIds = new Set(follows.data?.map(f => f.following_id) || []);

        return orderedVideos.map(v => this.mapToVideo(v, {
            isLiked: likedVideoIds.has(v.id),
            isSaved: savedVideoIds.has(v.id),
            isFollowing: followedUserIds.has(v.user_id)
        }));
    }

    private mapToVideo(dto: SupabaseVideo, interactions?: { isLiked: boolean; isSaved: boolean; isFollowing: boolean }): Video {
        return {
            id: dto.id,
            videoUrl: normalizeAssetUrl(dto.video_url),
            thumbnailUrl: normalizeAssetUrl(dto.thumbnail_url),
            description: dto.description || '',
            likesCount: dto.likes_count || 0,
            viewsCount: dto.views_count || 0,
            commentsCount: 0,
            sharesCount: dto.shares_count || 0,
            shopsCount: dto.shops_count || 0,
            spriteUrl: normalizeAssetUrl(dto.sprite_url),
            createdAt: dto.created_at,
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
                shopEnabled: dto.profiles.shop_enabled,
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
            mediaUrls: normalizeMediaUrls(dto.media_urls),
            postType: dto.post_type,
        };
    }

    private mapToStory(dto: any, isViewed = false): Story {
        return {
            id: dto.id,
            videoUrl: normalizeAssetUrl(dto.video_url),
            thumbnailUrl: normalizeAssetUrl(dto.thumbnail_url),
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
                shopEnabled: dto.profiles.shop_enabled,
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
            mediaUrls: normalizeMediaUrls(dto.media_urls),
            postType: dto.post_type,
        };
    }
}
