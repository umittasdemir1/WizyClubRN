import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { supabase } from '../../core/supabase';

export class UserRepositoryImpl implements IUserRepository {
    async getUserByUsername(username: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !data) {
            console.error('[UserRepository] Error fetching user by username:', error);
            return null;
        }

        return this.mapToUser(data);
    }

    async getUserById(id: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('[UserRepository] Error fetching user by id:', error);
            return null;
        }

        return this.mapToUser(data);
    }

    private mapToUser(data: any): User {
        return {
            id: data.id,
            username: data.username,
            fullName: data.full_name,
            avatarUrl: data.avatar_url,
            isFollowing: false,
            country: data.country,
            age: data.age,
            bio: data.bio,
            isVerified: data.is_verified,
            shopEnabled: data.shop_enabled,
            followersCount: data.followers_count || 0,
            followingCount: data.following_count || 0
        };
    }
}
