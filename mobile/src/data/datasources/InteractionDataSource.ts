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
        // 1. Add follow relationship
        await supabase.from('follows').insert({
            follower_id: followerId,
            following_id: followingId
        });

        // 2. Update follower's following_count
        const { data: followerProfile } = await supabase
            .from('profiles')
            .select('following_count')
            .eq('id', followerId)
            .single();

        await supabase
            .from('profiles')
            .update({ following_count: (followerProfile?.following_count || 0) + 1 })
            .eq('id', followerId);

        // 3. Update following's followers_count
        const { data: followingProfile } = await supabase
            .from('profiles')
            .select('followers_count')
            .eq('id', followingId)
            .single();

        await supabase
            .from('profiles')
            .update({ followers_count: (followingProfile?.followers_count || 0) + 1 })
            .eq('id', followingId);
    }

    async unfollow(followerId: string, followingId: string): Promise<void> {
        // 1. Remove follow relationship
        await supabase.from('follows')
            .delete()
            .eq('follower_id', followerId)
            .eq('following_id', followingId);

        // 2. Update follower's following_count
        const { data: followerProfile } = await supabase
            .from('profiles')
            .select('following_count')
            .eq('id', followerId)
            .single();

        await supabase
            .from('profiles')
            .update({ following_count: Math.max(0, (followerProfile?.following_count || 0) - 1) })
            .eq('id', followerId);

        // 3. Update following's followers_count
        const { data: followingProfile } = await supabase
            .from('profiles')
            .select('followers_count')
            .eq('id', followingId)
            .single();

        await supabase
            .from('profiles')
            .update({ followers_count: Math.max(0, (followingProfile?.followers_count || 0) - 1) })
            .eq('id', followingId);
    }
}
