import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { User } from '../../domain/entities';
import { SupabaseProfileDataSource } from '../datasources/SupabaseProfileDataSource';

export class ProfileRepositoryImpl implements IProfileRepository {
    private dataSource: SupabaseProfileDataSource;

    constructor() {
        this.dataSource = new SupabaseProfileDataSource();
    }

    async getProfile(userId: string, viewerId?: string): Promise<User | null> {
        try {
            const data = await this.dataSource.getProfile(userId, viewerId);

            if (!data) {
                // Profile doesn't exist - return null gracefully
                return null;
            }

            return this.mapDtoToUser(data);
        } catch (error: any) {
            console.error('[ProfileRepository] ❌ getProfile error:', error);
            return null;
        }
    }

    async updateProfile(userId: string, profile: Partial<User>): Promise<User> {
        // Convert camelCase to snake_case for DB is handled in DataSource usually 
        // or we need to map it here before sending if DataSource expects snake_case.
        // Let's assume DataSource handles basic updates or takes Partial<User> and maps it.
        // We will check DataSource next.
        const data = await this.dataSource.updateProfile(userId, profile);
        return this.mapDtoToUser(data);
    }

    async uploadAvatar(userId: string, fileUri: string): Promise<string> {
        return await this.dataSource.uploadAvatar(userId, fileUri);
    }

    async checkUsernameAvailability(username: string, currentUserId: string): Promise<boolean> {
        return await this.dataSource.checkUsernameAvailability(username, currentUserId);
    }

    private mapDtoToUser(dto: any): User {
        return {
            id: dto.id,
            username: dto.username,
            fullName: dto.full_name,
            avatarUrl: dto.avatar_url,
            isFollowing: !!dto.is_following, // Use the flag from DataSource
            bio: dto.bio,
            country: dto.country,
            age: dto.age,
            website: dto.website,
            isVerified: dto.is_verified,
            followersCount: dto.followers_count,
            followingCount: dto.following_count,
            postsCount: dto.posts_count,
            hasStories: !!dto.has_stories,
            hasUnseenStory: !!dto.has_unseen_story,
            // New Social Fields
            instagramUrl: dto.instagram_url,
            tiktokUrl: dto.tiktok_url,
            youtubeUrl: dto.youtube_url,
            xUrl: dto.x_url
        };
    }
}
