import { supabase } from '../../core/supabase';

export class InteractionDataSource {
    async toggleLike(userId: string, targetId: string, targetType: 'video' | 'story'): Promise<boolean> {
        const column = targetType === 'video' ? 'video_id' : 'story_id';

        // Önce beğeni var mı kontrol et
        const { data: existing, error } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', userId)
            .eq(column, targetId)
            .maybeSingle();

        if (error) {
            console.error('[InteractionDataSource] toggleLike check error:', error);
            throw error;
        }

        if (existing) {
            // Varsa sil (unlike)
            await supabase
                .from('likes')
                .delete()
                .eq('user_id', userId)
                .eq(column, targetId);
            return false;
        } else {
            // Yoksa ekle (like)
            const { error: insertError } = await supabase
                .from('likes')
                .insert({
                    user_id: userId,
                    [column]: targetId
                });

            if (insertError) {
                if (insertError.code === '23505') return true;
                throw insertError;
            }
            return true;
        }
    }

    async toggleSave(userId: string, videoId: string): Promise<boolean> {
        // Kontrol et
        const { data: existing, error } = await supabase
            .from('saves')
            .select('id')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .maybeSingle();

        if (error) {
            console.error('[InteractionDataSource] toggleSave check error:', error);
            throw error;
        }

        if (existing) {
            // Varsa sil
            const { error: deleteError } = await supabase
                .from('saves')
                .delete()
                .eq('user_id', userId)
                .eq('video_id', videoId);

            if (deleteError) {
                console.error('[InteractionDataSource] toggleSave delete error:', deleteError);
                throw deleteError;
            }
            return false;
        } else {
            // Yoksa ekle
            const { error: insertError } = await supabase
                .from('saves')
                .insert({
                    user_id: userId,
                    video_id: videoId
                });

            if (insertError) {
                // If it already exists (race condition), just return false (as if it was already there)
                if (insertError.code === '23505') return true;

                console.error('[InteractionDataSource] toggleSave insert error:', insertError);
                throw insertError;
            }
            return true;
        }
    }

    async follow(followerId: string, followingId: string): Promise<void> {
        // 1. Add follow relationship
        await supabase.from('follows').insert({
            follower_id: followerId,
            following_id: followingId
        });

        // 2. & 3. Manual count updates REMOVED to prevent double counting.
        // DB triggers should handle 'following_count' and 'followers_count' updates.
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        // 1. Remove follow relationship
        await supabase.from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);

        // 2. & 3. Manual count updates REMOVED to prevent double counting.
        // DB triggers should handle 'following_count' and 'followers_count' updates.
    }
}
