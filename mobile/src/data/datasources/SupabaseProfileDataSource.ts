import { supabase } from '../../core/supabase';
import { User, SocialLink } from '../../domain/entities';
import { CONFIG } from '../../core/config';

export class SupabaseProfileDataSource {
    async getProfile(userId: string): Promise<any> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data;
    }

    async updateProfile(userId: string, profile: Partial<User>): Promise<any> {
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
        const { data, error } = await supabase
            .from('social_links')
            .select('*')
            .eq('user_id', userId)
            .order('display_order', { ascending: true });

        if (error) throw error;
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
        if (user.username) dto.username = user.username;
        if (user.fullName) dto.full_name = user.fullName;
        if (user.avatarUrl) dto.avatar_url = user.avatarUrl;
        if (user.bio) dto.bio = user.bio;
        if (user.country) dto.country = user.country;
        if (user.age) dto.age = user.age;
        if (user.website) dto.website = user.website;
        return dto;
    }
}
