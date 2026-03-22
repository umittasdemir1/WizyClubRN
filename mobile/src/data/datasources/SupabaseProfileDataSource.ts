import { supabase } from '../../core/supabase';
import { User } from '../../domain/entities';
import { CONFIG } from '../../core/config';
import { LogCode, logData, logError } from '@/core/services/Logger';

export class SupabaseProfileDataSource {
    async searchProfiles(query: string, limit: number = 20, viewerId?: string): Promise<any[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const normalized = trimmed.replace(/\s+/g, ' ').trim();
        const escaped = normalized.replace(/[%_]/g, '\\$&');
        const ilikeTerm = `%${escaped}%`;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`username.ilike.${ilikeTerm},full_name.ilike.${ilikeTerm},bio.ilike.${ilikeTerm}`)
            .order('followers_count', { ascending: false })
            .limit(limit);

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Profile search error', { query: normalized, error });
            return [];
        }

        const profiles = (data as any[]) || [];
        if (!profiles.length) return [];

        if (viewerId) {
            const ids = profiles.map((profile) => profile.id).filter(Boolean);
            if (ids.length > 0) {
                const { data: follows, error: followsError } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', viewerId)
                    .in('following_id', ids);

                if (followsError) {
                    logError(LogCode.DB_QUERY_ERROR, 'Profile search follows error', { query: normalized, error: followsError });
                } else {
                    const followingSet = new Set((follows as Array<{ following_id: string }> | null)?.map((row) => row.following_id) || []);
                    profiles.forEach((profile) => {
                        profile.is_following = followingSet.has(profile.id);
                    });
                }
            }
        }

        return profiles;
    }

    async searchProfilesByLocation(query: string, limit: number = 20, viewerId?: string): Promise<any[]> {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const normalized = trimmed.replace(/\s+/g, ' ').trim();
        const escaped = normalized.replace(/[%_]/g, '\\$&');
        const ilikeTerm = `%${escaped}%`;

        const fetchLimit = Math.max(limit * 4, limit);
        const { data, error } = await supabase
            .from('videos')
            .select('user_id, created_at, profiles(*)')
            .is('deleted_at', null)
            .or(`location_name.ilike.${ilikeTerm},location_address.ilike.${ilikeTerm}`)
            .order('created_at', { ascending: false })
            .limit(fetchLimit);

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Location profile search error', { query: normalized, error });
            return [];
        }

        const uniqueProfiles = new Map<string, any>();
        ((data as any[]) || []).forEach((row) => {
            const profile = row?.profiles;
            if (!profile?.id || uniqueProfiles.has(profile.id)) return;
            uniqueProfiles.set(profile.id, profile);
        });

        const profiles = Array.from(uniqueProfiles.values()).slice(0, limit);
        if (!profiles.length) return [];

        if (viewerId) {
            const ids = profiles.map((profile) => profile.id).filter(Boolean);
            if (ids.length > 0) {
                const { data: follows, error: followsError } = await supabase
                    .from('follows')
                    .select('following_id')
                    .eq('follower_id', viewerId)
                    .in('following_id', ids);

                if (followsError) {
                    logError(LogCode.DB_QUERY_ERROR, 'Location profile search follows error', { query: normalized, error: followsError });
                } else {
                    const followingSet = new Set((follows as Array<{ following_id: string }> | null)?.map((row) => row.following_id) || []);
                    profiles.forEach((profile) => {
                        profile.is_following = followingSet.has(profile.id);
                    });
                }
            }
        }

        return profiles;
    }

    async getProfile(userId: string, viewerId?: string): Promise<any> {
        // Single RPC call replaces 4 sequential queries:
        // 1. profiles.select(*) 2. follows.select(count) 3. stories.select(id) 4. story_views.select(count)
        const { data, error } = await supabase.rpc('get_profile_full', {
            p_user_id: userId,
            p_viewer_id: viewerId || null,
        });

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Profile RPC failed, falling back to legacy query', { userId, errorCode: error.code });
            return this.getProfileLegacy(userId, viewerId);
        }

        if (!data) {
            return null;
        }

        logData(LogCode.DB_QUERY_SUCCESS, 'Profile fetched successfully (RPC)', {
            username: data?.username,
            hasStories: data?.has_stories,
            hasUnseenStory: data?.has_unseen_story,
        });
        return data;
    }

    private async getProfileLegacy(userId: string, viewerId?: string): Promise<any> {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Profile legacy fetch also failed', { userId, error });
            throw error;
        }

        if (!profile) return null;

        let isFollowing = false;
        if (viewerId && viewerId !== userId) {
            const { data: followRow } = await supabase
                .from('follows')
                .select('id')
                .eq('follower_id', viewerId)
                .eq('following_id', userId)
                .maybeSingle();
            isFollowing = !!followRow;
        }

        return {
            ...profile,
            is_following: isFollowing,
            has_stories: false,
            has_unseen_story: false,
        };
    }

    async getProfileLite(userId: string): Promise<any> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, is_verified')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Lite profile fetch error', { userId, error });
            throw error;
        }

        return data;
    }

    async updateProfile(userId: string, profile: Partial<User>): Promise<any> {
        // 1. Update auth.users metadata for consistency
        const authMetadata: any = {};
        if ('fullName' in profile) authMetadata.full_name = profile.fullName;
        if ('avatarUrl' in profile) authMetadata.avatar_url = profile.avatarUrl;

        if (Object.keys(authMetadata).length > 0) {
            const { error: authError } = await supabase.auth.updateUser({
                data: authMetadata
            });

            if (authError) {
                logError(LogCode.DB_UPDATE, 'Auth metadata update warning', authError);
                // Don't throw - profiles table update is more critical
            } else {
                logData(LogCode.DB_UPDATE, 'Auth metadata updated successfully', authMetadata);
            }
        }

        // 2. Update profiles table
        const { data, error } = await supabase
            .from('profiles')
            .update(this.mapUserToDto(profile))
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async checkUsernameAvailability(username: string, currentUserId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (error) {
            logError(LogCode.DB_QUERY_ERROR, 'Username check error', { username, error });
            throw error;
        }

        // Username is available if no data found, or if the found user is the current user
        return !data || data.id === currentUserId;
    }

    async uploadAvatar(userId: string, fileUri: string): Promise<string> {
        logData(LogCode.API_REQUEST_START, 'Starting avatar upload', { userId });

        const formData = new FormData();
        formData.append('userId', userId);

        // React Native standard for file uploads: object with uri, name, type
        formData.append('image', {
            uri: fileUri,
            name: `avatar_${userId}.jpg`,
            type: 'image/jpeg',
        } as any);

        const uploadResponse = await fetch(`${CONFIG.API_URL}/upload-avatar`, {
            method: 'POST',
            body: formData,
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            logError(LogCode.API_REQUEST_ERROR, 'Avatar upload server error', { status: uploadResponse.status, errorText });
            throw new Error(`Avatar upload failed: ${errorText}`);
        }

        const result = await uploadResponse.json();
        if (!result.success) {
            logError(LogCode.API_REQUEST_ERROR, 'Avatar upload response failed', { error: result.error });
            throw new Error(result.error || 'Avatar upload failed');
        }

        logData(LogCode.API_REQUEST_SUCCESS, 'Avatar upload successful', { avatarUrl: result.avatarUrl });
        return result.avatarUrl;
    }

    async bootstrapProfileForSignUp(userId: string, email: string, fullName: string): Promise<string | null> {
        const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

        const { error } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                username,
                full_name: fullName,
                avatar_url: `https://api.dicebear.com/7.x/avataaars/png?seed=${username}`,
                shop_enabled: false,
            });

        if (error) {
            logError(LogCode.DB_INSERT, 'Profile bootstrap failed', { userId, email, error });
            return null;
        }

        return username;
    }

    private mapUserToDto(user: Partial<User>) {
        const dto: any = {};
        if ('username' in user) dto.username = user.username;
        if ('fullName' in user) dto.full_name = user.fullName;
        if ('avatarUrl' in user) dto.avatar_url = user.avatarUrl;
        if ('bio' in user) dto.bio = user.bio;
        if ('country' in user) dto.country = user.country;
        if ('age' in user) dto.age = user.age;
        if ('website' in user) dto.website = user.website;
        if ('shopEnabled' in user) dto.shop_enabled = user.shopEnabled;
        // Social Links
        if ('instagramUrl' in user) dto.instagram_url = user.instagramUrl;
        if ('tiktokUrl' in user) dto.tiktok_url = user.tiktokUrl;
        if ('youtubeUrl' in user) dto.youtube_url = user.youtubeUrl;
        if ('xUrl' in user) dto.x_url = user.xUrl;
        if ('facebookUrl' in user) dto.facebook_url = user.facebookUrl;

        dto.updated_at = new Date().toISOString();
        return dto;
    }
}
