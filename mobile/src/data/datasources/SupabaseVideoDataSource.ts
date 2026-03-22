import { Video } from '../../domain/entities/Video';
import { VideoFeedCursor, VideoFeedResult } from '../../domain/entities/VideoFeed';
import { Story } from '../../domain/entities/Story';
import { User } from '../../domain/entities/User';
import { supabase } from '../../core/supabase';
import { LogCode, logData, logError } from '@/core/services/Logger';
import { RpcFallbackTelemetryService } from '../services/RpcFallbackTelemetryService';
import type { UploadedVideoPayload } from '../../presentation/store/useUploadStore';

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
    location_name?: string;
    location_address?: string;
    location_latitude?: number;
    location_longitude?: number;
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
    post_tags?: any[];
}

interface SupabaseEditableVideo {
    id: string;
    user_id: string;
    thumbnail_url: string | null;
    description: string | null;
}

interface SupabaseFeedRpcRow extends SupabaseVideo {
    is_liked: boolean;
    is_saved: boolean;
    is_following: boolean;
}

interface SupabaseUserInteractionRpcRow extends SupabaseFeedRpcRow {
    activity_at: string;
}

interface SupabaseHashtagSearchRpcRow {
    id: string;
    name: string;
    post_count: number | string;
    click_count: number;
    search_count: number;
    score: number | string;
}

export class SupabaseVideoDataSource {
    private static readonly DEFAULT_VIEW_COOLDOWN_MS = 30 * 60 * 1000;
    private static readonly UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    async getVideos(limit: number, userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): Promise<VideoFeedResult> {
        const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 10;
        logData(LogCode.DB_QUERY_START, 'Fetching videos with cursor pagination', {
            limit: normalizedLimit,
            userId,
            authorId,
            cursor,
        });

        const rpcResult = await this.getVideosViaReadModel(normalizedLimit, userId, authorId, cursor);
        if (rpcResult) {
            return rpcResult;
        }

        let query = supabase
            .from('videos')
            .select('*, profiles(*), post_tags(*, profiles(*))')
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
                .select('*, profiles(*), post_tags(*, profiles(*))')
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

    private async getVideosViaReadModel(
        limit: number,
        userId?: string,
        authorId?: string,
        cursor?: VideoFeedCursor | null
    ): Promise<VideoFeedResult | null> {
        if (!this.canUseFeedReadModel(userId, authorId, cursor)) {
            RpcFallbackTelemetryService.record({
                rpcName: 'get_feed_page_v1',
                fallbackPath: 'videos_select_plus_hydration',
                reason: 'unsupported_input',
                userIdPresent: !!userId,
                details: {
                    hasAuthorId: !!authorId,
                    hasCursor: !!cursor,
                },
            });
            return null;
        }

        const { data, error } = await supabase.rpc('get_feed_page_v1', {
            p_limit: limit,
            p_user_id: userId ?? null,
            p_author_id: authorId ?? null,
            p_cursor_created_at: cursor?.createdAt ?? null,
            p_cursor_id: cursor?.id ?? null,
        });

        if (error) {
            const reason = error.code === '42883' ? 'rpc_missing' : 'rpc_error';
            RpcFallbackTelemetryService.record({
                rpcName: 'get_feed_page_v1',
                fallbackPath: 'videos_select_plus_hydration',
                reason,
                errorCode: error.code,
                userIdPresent: !!userId,
                details: {
                    hasAuthorId: !!authorId,
                    hasCursor: !!cursor,
                },
            });

            if (error.code !== '42883') {
                logError(LogCode.DB_QUERY_ERROR, 'Feed read model RPC unavailable, falling back to legacy queries', {
                    error,
                    userId,
                    authorId,
                    cursor,
                });
            }
            return null;
        }

        const rows = (data as SupabaseFeedRpcRow[] | null) || [];
        if (!rows.length) {
            return {
                videos: [],
                nextCursor: null,
            };
        }

        const videos = rows.map((row) => this.mapToVideo(row, {
            isLiked: row.is_liked,
            isSaved: row.is_saved,
            isFollowing: row.is_following,
        }));

        const lastItem = rows[rows.length - 1];
        const nextCursor = rows.length >= limit
            ? {
                createdAt: lastItem.created_at,
                id: lastItem.id,
            }
            : null;

        return {
            videos,
            nextCursor,
        };
    }

    private canUseFeedReadModel(userId?: string, authorId?: string, cursor?: VideoFeedCursor | null): boolean {
        if (cursor?.id && !SupabaseVideoDataSource.UUID_PATTERN.test(cursor.id)) return false;
        return true;
    }

    async getUserInteractionVideos(activityType: 'likes' | 'saved' | 'history', userId: string): Promise<Video[] | null> {
        if (!userId) return [];

        const { data, error } = await supabase.rpc('get_user_interaction_v1', {
            p_user_id: userId,
            p_activity_type: activityType,
        });

        if (error) {
            const reason = error.code === '42883' ? 'rpc_missing' : 'rpc_error';
            RpcFallbackTelemetryService.record({
                rpcName: 'get_user_interaction_v1',
                fallbackPath: 'interaction_table_then_getVideosByIds',
                reason,
                errorCode: error.code,
                userIdPresent: !!userId,
                details: {
                    activityType,
                },
            });

            if (error.code !== '42883') {
                logError(LogCode.DB_QUERY_ERROR, 'User interaction RPC unavailable, falling back to legacy queries', {
                    activityType,
                    userId,
                    error,
                });
            }
            return null;
        }

        const rows = (data as SupabaseUserInteractionRpcRow[] | null) || [];
        return rows.map((row) => this.mapToVideo(row, {
            isLiked: row.is_liked,
            isSaved: row.is_saved,
            isFollowing: row.is_following,
        }));
    }

    async searchVideos(query: string, limit: number = 20, userId?: string): Promise<Video[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        // Single RPC replaces 3-phase waterfall:
        // 1. description ILIKE + profile ILIKE (parallel) 2. author videos lookup 3. getVideosByIds
        const { data: searchResults, error: searchError } = await supabase.rpc('search_content', {
            p_query: trimmed,
            p_limit: limit,
        });

        if (searchError) {
            logError(LogCode.DB_QUERY_ERROR, 'Search content RPC error', { query, error: searchError });
            return [];
        }

        const ids = (searchResults as Array<{ video_id: string }> | null)?.map(r => r.video_id) || [];
        if (!ids.length) return [];

        // Search grid doesn't need like/save/follow state; skip extra queries for speed.
        const includeInteractions = false;
        const videos = await this.getVideosByIds(ids, includeInteractions ? userId : undefined);
        const videoMap = new Map(videos.map((video) => [video.id, video]));
        return ids.map((id) => videoMap.get(id)).filter(Boolean) as Video[];
    }

    async searchVideosByLocation(query: string, limit: number = 20, userId?: string): Promise<Video[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const escaped = trimmed.replace(/[%_]/g, '\\$&');
        const ilikeTerm = `%${escaped}%`;

        const { data, error } = await supabase
            .from('videos')
            .select('*, profiles(*), post_tags(*, profiles(*))')
            .is('deleted_at', null)
            .or(`location_name.ilike.${ilikeTerm},location_address.ilike.${ilikeTerm}`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Location video search error', { query: trimmed, error });
            return [];
        }

        const videos = (data as SupabaseVideo[] | null) || [];
        if (!videos.length) return [];

        if (!userId) {
            return videos.map((video) => this.mapToVideo(video));
        }

        const videoIds = videos.map((video) => video.id);
        const authorIds = [...new Set(videos.map((video) => video.user_id))];

        const [likes, saves, follows] = await Promise.all([
            supabase.from('likes').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('saves').select('video_id').eq('user_id', userId).in('video_id', videoIds),
            supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', authorIds),
        ]);

        const likedVideoIds = new Set(likes.data?.map((row) => row.video_id) || []);
        const savedVideoIds = new Set(saves.data?.map((row) => row.video_id) || []);
        const followedUserIds = new Set(follows.data?.map((row) => row.following_id) || []);

        return videos.map((video) => this.mapToVideo(video, {
            isLiked: likedVideoIds.has(video.id),
            isSaved: savedVideoIds.has(video.id),
            isFollowing: followedUserIds.has(video.user_id),
        }));
    }

    async getStories(userId?: string): Promise<Story[]> {
        const now = new Date().toISOString();

        let storiesResult;
        try {
            storiesResult = await supabase
                .from('stories')
                .select('*, profiles(*), post_tags(*, profiles(*))')
                .is('deleted_at', null)
                .gt('expires_at', now)
                .order('created_at', { ascending: false })
                .limit(50);
        } catch (e) {
            logError(LogCode.DB_QUERY_ERROR, 'Stories fetch threw unexpectedly', { error: e });
            return [];
        }

        if (storiesResult.error) {
            logError(LogCode.DB_QUERY_ERROR, 'Supabase stories fetch error', {
                code: storiesResult.error.code,
                message: storiesResult.error.message,
                hint: (storiesResult.error as any).hint,
            });
            return [];
        }

        const stories = (storiesResult.data as any[] | null) || [];
        if (!stories.length) {
            return [];
        }

        let viewRows: Array<{ story_id: string }> = [];
        if (userId) {
            const storyIds = stories.map((story) => story.id).filter(Boolean);
            if (storyIds.length > 0) {
                const { data: storyViews } = await supabase
                    .from('story_views')
                    .select('story_id')
                    .eq('user_id', userId)
                    .in('story_id', storyIds);

                viewRows = (storyViews as Array<{ story_id: string }> | null) || [];
            }
        }

        const viewedStoryIds = new Set<string>();
        viewRows.forEach(v => viewedStoryIds.add(v.story_id));

        logData(LogCode.DB_QUERY_SUCCESS, 'Stories fetched successfully', { count: stories.length });
        return stories.map(dto => this.mapToStory(dto, viewedStoryIds.has(dto.id)));
    }

    async getStoryById(storyId: string, userId?: string): Promise<Story | null> {
        const now = new Date().toISOString();
        const { data, error } = await supabase
            .from('stories')
            .select('*, profiles(*), post_tags(*, profiles(*))')
            .eq('id', storyId)
            .is('deleted_at', null)
            .gt('expires_at', now)
            .maybeSingle<any>();

        if (error || !data) {
            if (error) {
                logError(LogCode.DB_QUERY_ERROR, 'Single story fetch failed', { storyId, error });
            }
            return null;
        }

        let isViewed = false;
        if (userId) {
            const { data: storyView } = await supabase
                .from('story_views')
                .select('story_id')
                .eq('user_id', userId)
                .eq('story_id', storyId)
                .maybeSingle<{ story_id: string }>();

            isViewed = !!storyView;
        }

        return this.mapToStory(data, isViewed);
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

        // Single RPC call replaces 3 sequential queries:
        // 1. video_views.select(cooldown) 2. video_views.insert 3. rpc(increment_video_counter)
        const { data, error } = await supabase.rpc('record_video_view_v2', {
            p_user_id: userId,
            p_video_id: videoId,
            p_cooldown_ms: cooldownMs,
        });

        if (error) {
            logError(LogCode.DB_INSERT, 'Error recording video view (RPC)', { videoId, userId, error });
            return 'error';
        }

        return (data as 'inserted' | 'cooldown' | 'error') || 'error';
    }

    async incrementShareCount(videoId: string): Promise<void> {
        const { error } = await supabase.rpc('increment_video_counter', {
            video_id: videoId,
            counter_column: 'shares_count',
        });

        if (error) {
            logError(LogCode.DB_UPDATE, 'Failed to sync share count', { videoId, error });
            throw error;
        }

        logData(LogCode.DB_UPDATE, 'Share count synced to DB via RPC', { videoId });
    }

    async getVideoById(videoId: string): Promise<Video | null> {
        const { data, error } = await supabase
            .from('videos')
            .select('*, profiles(*), post_tags(*, profiles(*))')
            .eq('id', videoId)
            .single();

        if (error || !data) {
            return null;
        }

        return this.mapToVideo(data as SupabaseVideo);
    }

    async getEditableVideo(videoId: string): Promise<SupabaseEditableVideo | null> {
        const { data, error } = await supabase
            .from('videos')
            .select('id,user_id,thumbnail_url,description')
            .eq('id', videoId)
            .is('deleted_at', null)
            .maybeSingle<SupabaseEditableVideo>();

        if (error || !data) {
            logError(LogCode.DB_QUERY_ERROR, 'Edit video fetch failed', { videoId, error });
            return null;
        }

        return data;
    }

    async updateVideoDescription(videoId: string, userId: string, description: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('videos')
            .update({ description })
            .eq('id', videoId)
            .eq('user_id', userId)
            .is('deleted_at', null)
            .select('id')
            .maybeSingle<{ id: string }>();

        if (error || !data) {
            logError(LogCode.DB_UPDATE, 'Edit video update failed', {
                videoId,
                userId,
                error,
            });
            return false;
        }

        return true;
    }

    async getVideosByIds(videoIds: string[], userId?: string): Promise<Video[]> {
        if (!videoIds.length) return [];

        const { data, error } = await supabase
            .from('videos')
            .select('*, profiles(*), post_tags(*, profiles(*))')
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

    async getDeletedVideos(
        userId?: string,
        limit: number = 50
    ): Promise<Array<{ id: string; thumbnail_url: string | null; deleted_at: string | null }>> {
        const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;

        let query = supabase
            .from('videos')
            .select('id,thumbnail_url,deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })
            .limit(normalizedLimit);

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error || !data) {
            logError(LogCode.DB_QUERY_ERROR, 'Deleted videos fetch failed', {
                userId,
                limit: normalizedLimit,
                error,
            });
            return [];
        }

        return data as Array<{ id: string; thumbnail_url: string | null; deleted_at: string | null }>;
    }

    mapUploadPayloadToVideo(payload: UploadedVideoPayload): Video | null {
        if (!payload?.id || !payload?.user_id || !payload?.video_url) {
            return null;
        }

        return this.mapToVideo({
            id: payload.id,
            user_id: payload.user_id,
            video_url: payload.video_url,
            thumbnail_url: payload.thumbnail_url || '',
            description: payload.description || '',
            likes_count: payload.likes_count || 0,
            views_count: payload.views_count || 0,
            shares_count: payload.shares_count || 0,
            saves_count: payload.saves_count || 0,
            shops_count: payload.shops_count || 0,
            created_at: payload.created_at || new Date().toISOString(),
            sprite_url: payload.sprite_url || undefined,
            width: payload.width || undefined,
            height: payload.height || undefined,
            is_commercial: payload.is_commercial || undefined,
            brand_name: payload.brand_name || undefined,
            brand_url: payload.brand_url || undefined,
            commercial_type: payload.commercial_type || undefined,
            location_name: payload.location_name || undefined,
            location_address: payload.location_address || undefined,
            location_latitude: payload.location_latitude || undefined,
            location_longitude: payload.location_longitude || undefined,
            media_urls: Array.isArray(payload.media_urls) ? payload.media_urls : undefined,
            post_type: payload.post_type,
            profiles: payload.profiles ? {
                username: payload.profiles.username || '',
                full_name: payload.profiles.full_name || '',
                avatar_url: payload.profiles.avatar_url || '',
                country: payload.profiles.country || '',
                age: payload.profiles.age || 0,
                bio: payload.profiles.bio || '',
                is_verified: !!payload.profiles.is_verified,
                shop_enabled: payload.profiles.shop_enabled,
                followers_count: payload.profiles.followers_count || 0,
                following_count: payload.profiles.following_count || 0,
                posts_count: payload.profiles.posts_count || 0,
                instagram_url: payload.profiles.instagram_url,
                tiktok_url: payload.profiles.tiktok_url,
                youtube_url: payload.profiles.youtube_url,
                x_url: payload.profiles.x_url,
                website: payload.profiles.website,
            } : undefined,
        });
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
                username: dto.profiles.username || '',
                fullName: dto.profiles.full_name || '',
                avatarUrl: dto.profiles.avatar_url || '',
                country: dto.profiles.country,
                age: dto.profiles.age,
                bio: dto.profiles.bio,
                website: dto.profiles.website,
                isVerified: dto.profiles.is_verified ?? false,
                shopEnabled: dto.profiles.shop_enabled ?? false,
                followersCount: dto.profiles.followers_count ?? 0,
                followingCount: dto.profiles.following_count ?? 0,
                postsCount: dto.profiles.posts_count ?? 0,
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
            locationName: dto.location_name,
            locationAddress: dto.location_address,
            locationLatitude: dto.location_latitude,
            locationLongitude: dto.location_longitude,
            mediaUrls: normalizeMediaUrls(dto.media_urls),
            postType: dto.post_type,
            taggedPeople: dto.post_tags?.map((pt: any) => ({
                id: pt.tagged_user_id,
                username: pt.profiles?.username || '',
                fullName: pt.profiles?.full_name || '',
                avatarUrl: pt.profiles?.avatar_url || '',
                isVerified: pt.profiles?.is_verified || false,
            })) || [],
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
                username: dto.profiles.username || '',
                fullName: dto.profiles.full_name || '',
                avatarUrl: dto.profiles.avatar_url || '',
                country: dto.profiles.country,
                age: dto.profiles.age,
                bio: dto.profiles.bio,
                isVerified: dto.profiles.is_verified ?? false,
                shopEnabled: dto.profiles.shop_enabled ?? false,
                followersCount: dto.profiles.followers_count ?? 0,
                followingCount: dto.profiles.following_count ?? 0,
                postsCount: dto.profiles.posts_count ?? 0,
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
            taggedPeople: dto.post_tags?.map((pt: any) => ({
                id: pt.tagged_user_id,
                username: pt.profiles?.username || '',
                fullName: pt.profiles?.full_name || '',
                avatarUrl: pt.profiles?.avatar_url || '',
                isVerified: pt.profiles?.is_verified || false,
            })) || [],
        };
    }

    async incrementHashtagClick(hashtagName: string): Promise<void> {
        const normalized = hashtagName.trim().toLowerCase();
        if (!normalized) return;
        await supabase.rpc('increment_hashtag_click', { p_hashtag_name: normalized });
    }

    async getHashtagsByVideoId(videoId: string): Promise<string[]> {
        const { data, error } = await supabase
            .from('video_hashtags')
            .select('hashtags(name)')
            .eq('video_id', videoId);

        if (error || !data) {
            logError(LogCode.DB_QUERY_ERROR, 'Video hashtags fetch error', { videoId, error });
            return [];
        }

        return (data as Array<{ hashtags?: { name?: string } | null }>)
            .map((row) => row.hashtags?.name)
            .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);
    }

    async searchHashtags(query: string, limit: number = 30): Promise<Array<{
        id: string;
        name: string;
        postCount: number;
        clickCount: number;
        searchCount: number;
        score: number;
    }>> {
        const trimmed = query.trim().replace(/^#/, '');
        if (!trimmed) return [];

        const { data: rpcData, error: rpcError } = await supabase.rpc('search_hashtags_v1', {
            p_query: trimmed,
            p_limit: limit,
        });

        if (!rpcError) {
            const rows = (rpcData as SupabaseHashtagSearchRpcRow[] | null) || [];
            return rows.map((row) => ({
                id: row.id,
                name: row.name,
                postCount: Number(row.post_count || 0),
                clickCount: row.click_count || 0,
                searchCount: row.search_count || 0,
                score: Number(row.score || 0),
            }));
        }

        if (rpcError.code !== '42883') {
            RpcFallbackTelemetryService.record({
                rpcName: 'search_hashtags_v1',
                fallbackPath: 'hashtags_then_video_hashtags_aggregate',
                reason: 'rpc_error',
                errorCode: rpcError.code,
                details: {
                    queryLength: trimmed.length,
                },
            });
            logError(LogCode.DB_QUERY_ERROR, 'Hashtag RPC search failed, falling back to legacy search', {
                query: trimmed,
                error: rpcError,
            });
        } else {
            RpcFallbackTelemetryService.record({
                rpcName: 'search_hashtags_v1',
                fallbackPath: 'hashtags_then_video_hashtags_aggregate',
                reason: 'rpc_missing',
                errorCode: rpcError.code,
                details: {
                    queryLength: trimmed.length,
                },
            });
        }

        return this.searchHashtagsLegacy(trimmed, limit);
    }

    private async searchHashtagsLegacy(query: string, limit: number): Promise<Array<{
        id: string;
        name: string;
        postCount: number;
        clickCount: number;
        searchCount: number;
        score: number;
    }>> {
        const { data, error: hashtagError } = await supabase
            .from('hashtags')
            .select('id, name, click_count, search_count')
            .ilike('name', `%${query}%`)
            .order('click_count', { ascending: false })
            .limit(limit);

        if (hashtagError || !data) {
            logError(LogCode.DB_QUERY_ERROR, 'Hashtag search failed', { query, error: hashtagError });
            return [];
        }

        const hashtagIds = data.map((item: any) => item.id).filter(Boolean);
        if (!hashtagIds.length) {
            return [];
        }

        const { data: countData, error: countError } = await supabase
            .from('video_hashtags')
            .select('hashtag_id')
            .in('hashtag_id', hashtagIds);

        if (countError) {
            logError(LogCode.DB_QUERY_ERROR, 'Hashtag post count fetch failed', { query, error: countError });
            return [];
        }

        const postCounts: Record<string, number> = {};
        (countData ?? []).forEach((row: any) => {
            postCounts[row.hashtag_id] = (postCounts[row.hashtag_id] || 0) + 1;
        });

        return data
            .map((item: any) => {
                const postCount = postCounts[item.id] || 0;
                return {
                    id: item.id,
                    name: item.name,
                    postCount,
                    clickCount: item.click_count || 0,
                    searchCount: item.search_count || 0,
                    score: postCount * 1.0 + (item.click_count || 0) * 0.5 + (item.search_count || 0) * 0.3,
                };
            })
            .sort((a, b) => b.score - a.score);
    }

    async incrementHashtagSearch(hashtagName: string): Promise<void> {
        const normalized = hashtagName.trim().toLowerCase();
        if (!normalized) return;
        await supabase.rpc('increment_hashtag_search', { p_hashtag_name: normalized });
    }
}
