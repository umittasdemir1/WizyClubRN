import { supabase } from '../../core/supabase';

export class InteractionDataSource {
    async toggleLike(userId: string, targetId: string, targetType: 'video' | 'story'): Promise<boolean> {
        const column = targetType === 'video' ? 'video_id' : 'story_id';

        // Önce beğeni var mı kontrol et
        const { data: existing } = await supabase
            .from('likes')
            .select('id')
            .eq('user_id', userId)
            .eq(column, targetId)
            .single();

        if (existing) {
            // Varsa sil (unlike)
            await supabase.from('likes').delete().eq('id', existing.id);
            return false;
        } else {
            // Yoksa ekle (like)
            await supabase.from('likes').insert({
                user_id: userId,
                [column]: targetId
            });
            return true;
        }
    }

    async toggleSave(userId: string, videoId: string): Promise<boolean> {
        const { data: existing } = await supabase
            .from('saves')
            .select('id')
            .eq('user_id', userId)
            .eq('video_id', videoId)
            .single();

        if (existing) {
            await supabase.from('saves').delete().eq('id', existing.id);
            return false;
        } else {
            await supabase.from('saves').insert({
                user_id: userId,
                video_id: videoId
            });
            return true;
        }
    }

    async follow(followerId: string, followingId: string): Promise<void> {
        await supabase.from('follows').insert({
            follower_id: followerId,
            following_id: followingId
        });
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        await supabase.from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);
    }
}
