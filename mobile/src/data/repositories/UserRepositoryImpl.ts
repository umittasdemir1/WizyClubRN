import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { supabase } from '../../core/supabase';

export class UserRepositoryImpl implements IUserRepository {
    async getUserByUsername(username: string): Promise<User | null> {
        const { data, error } = await supabase
            .from('profiles')
            .select('*, social_links(*)')
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
            .select('*, social_links(*)')
            .eq('id', id)
            .single();

        if (error || !data) {
            console.error('[UserRepository] Error fetching user by id:', error);
            return null;
        }

        return this.mapToUser(data);
    }

    private mapToUser(data: any): User {
        const links = [];

        // Map social_links from the joined table
        if (data.social_links && Array.isArray(data.social_links)) {
            data.social_links.forEach((link: any) => {
                links.push({
                    id: link.id,
                    platform: link.platform.toLowerCase(),
                    url: link.url
                });
            });
        }

        // Fallback to website field if no social_links
        if (links.length === 0 && data.website) {
            links.push({
                id: 'website',
                platform: 'website',
                url: data.website
            });
        }

        return {
            id: data.id,
            username: data.username,
            fullName: data.full_name,
            avatarUrl: data.avatar_url,
            isFollowing: false,
            country: data.country,
            age: data.age,
            bio: data.bio,
            followersCount: data.followers_count || 0,
            followingCount: data.following_count || 0,
            socialLinks: links
        };
    }
}
