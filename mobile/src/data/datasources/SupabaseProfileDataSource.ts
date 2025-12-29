import { supabase } from '../../core/supabase';
import { User, SocialLink } from '../../domain/entities';
import { CONFIG } from '../../core/config';

export class SupabaseProfileDataSource {
    async getProfile(userId: string, viewerId?: string): Promise<any> {
        console.log('[SupabaseDataSource] 🔍 Fetching profile for ID:', userId);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('[SupabaseDataSource] ❌ Profile fetch error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        if (viewerId) {
            const { count } = await supabase
                .from('follows')
                .select('*', { count: 'exact', head: true })
                .eq('follower_id', viewerId)
                .eq('following_id', userId);

            data.is_following = count ? count > 0 : false;
        }

        console.log('[SupabaseDataSource] ✅ Profile fetched successfully:', data?.username);
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

    async getSocialLinks(userId: string): Promise<any[]> {
        console.log('[SupabaseDataSource] 🔗 Fetching social links for ID:', userId);
        const { data, error } = await supabase
            .from('social_links')
            .select('*')
            .eq('user_id', userId)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('[SupabaseDataSource] ❌ Social links fetch error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        console.log('[SupabaseDataSource] ✅ Social links fetched:', data?.length || 0);
        return data || [];
    }

    async addSocialLink(userId: string, link: any): Promise<any> {
        const { data, error } = await supabase
            .from('social_links')
            .insert({
                user_id: userId,
                platform: link.platform,
                url: link.url,
                display_order: link.displayOrder || 0
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async deleteSocialLink(linkId: string): Promise<void> {
        const { error } = await supabase
            .from('social_links')
            .delete()
            .eq('id', linkId);

        if (error) throw error;
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
        dto.updated_at = new Date().toISOString();
        return dto;
    }
}
