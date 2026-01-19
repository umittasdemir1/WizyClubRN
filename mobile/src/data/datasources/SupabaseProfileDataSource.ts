import { supabase } from '../../core/supabase';
import { User } from '../../domain/entities';
import { CONFIG } from '../../core/config';

export class SupabaseProfileDataSource {
    async getProfile(userId: string, viewerId?: string): Promise<any> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(); // Use maybeSingle instead of single to handle missing profiles gracefully

        if (error) {
            console.error('[SupabaseDataSource] ❌ Profile fetch error:', error);
            throw error;
        }

        if (!data) {
            // Profile doesn't exist - return null instead of throwing
            return null;
        }

        if (viewerId) {
            const { count } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', viewerId)
                .eq('following_id', userId);

            data.is_following = count ? count > 0 : false;
        }

        // Check for active stories
        const now = new Date().toISOString();
        // Check for active stories and if they are unseen
        const { data: stories } = await supabase
            .from('stories')
            .select('id')
            .eq('user_id', userId)
            .gt('expires_at', now);

        const storyIds = stories?.map(s => s.id) || [];
        const hasStories = storyIds.length > 0;

        let hasUnseenStory = false;

        if (hasStories) {
            // Check if ALL these stories are viewed by the viewer (or current user if viewerId not provided)
            // If viewerId is provided use it, otherwise use current auth user
            const checkerId = viewerId || (await supabase.auth.getUser()).data.user?.id;

            if (checkerId) {
                const { count: viewedCount } = await supabase
                    .from('story_views')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', checkerId)
                    .in('story_id', storyIds);

                // If viewed count is less than total story count, there are unseen stories
                hasUnseenStory = (viewedCount || 0) < storyIds.length;
            } else {
                // If no user logged in, assume all are unseen
                hasUnseenStory = true;
            }
        }

        data.has_stories = hasStories;
        data.has_unseen_story = hasUnseenStory;

        console.log('[SupabaseDataSource] ✅ Profile fetched:', { username: data?.username, hasStories, hasUnseenStory });
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
                console.warn('[SupabaseDataSource] ⚠️ Auth metadata update warning:', authError);
                // Don't throw - profiles table update is more critical
            } else {
                console.log('[SupabaseDataSource] ✅ Auth metadata updated:', authMetadata);
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
            console.error('[SupabaseDataSource] ❌ Username check error:', error);
            throw error;
        }

        // Username is available if no data found, or if the found user is the current user
        return !data || data.id === currentUserId;
    }

    async uploadAvatar(userId: string, fileUri: string): Promise<string> {
        console.log(`🚀 [UPLOAD] Starting avatar upload for: ${userId}`);

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
            console.error(`❌ [UPLOAD] Server error: ${errorText}`);
            throw new Error(`Avatar upload failed: ${errorText}`);
        }

        const result = await uploadResponse.json();
        if (!result.success) {
            console.error(`❌ [UPLOAD] Response failed: ${result.error}`);
            throw new Error(result.error || 'Avatar upload failed');
        }

        console.log(`✅ [UPLOAD] Success. URL: ${result.avatarUrl}`);
        return result.avatarUrl;
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

        dto.updated_at = new Date().toISOString();
        return dto;
    }
}
