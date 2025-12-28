import { IProfileRepository } from '../../domain/repositories/IProfileRepository';
import { User, SocialLink } from '../../domain/entities';
import { SupabaseProfileDataSource } from '../datasources/SupabaseProfileDataSource';

export class ProfileRepositoryImpl implements IProfileRepository {
    private dataSource: SupabaseProfileDataSource;

    constructor() {
        this.dataSource = new SupabaseProfileDataSource();
    }

    async getProfile(userId: string): Promise<User | null> {
        try {
            const data = await this.dataSource.getProfile(userId);
            console.log('[ProfileRepository] ✅ Mapping profile data to domain entity');
            return this.mapDtoToUser(data);
        } catch (error: any) {
            console.error('[ProfileRepository] ❌ getProfile error:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
                fullError: error
            });
            return null;
        }
    }

    async updateProfile(userId: string, profile: Partial<User>): Promise<User> {
        const data = await this.dataSource.updateProfile(userId, profile);
        return this.mapDtoToUser(data);
    }

    async getSocialLinks(userId: string): Promise<SocialLink[]> {
        try {
            const data = await this.dataSource.getSocialLinks(userId);
            console.log('[ProfileRepository] ✅ Mapping social links to domain entities');
            return data.map(this.mapDtoToSocialLink);
        } catch (error: any) {
            console.error('[ProfileRepository] ❌ getSocialLinks error:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code
            });
            // Don't fail the whole profile load if social links fail
            return [];
        }
    }

    async addSocialLink(userId: string, link: Omit<SocialLink, 'id' | 'userId'>): Promise<SocialLink> {
        const data = await this.dataSource.addSocialLink(userId, link);
        return this.mapDtoToSocialLink(data);
    }

    async deleteSocialLink(linkId: string): Promise<void> {
        await this.dataSource.deleteSocialLink(linkId);
    }

    async uploadAvatar(userId: string, fileUri: string): Promise<string> {
        return await this.dataSource.uploadAvatar(userId, fileUri);
    }

    private mapDtoToUser(dto: any): User {
        return {
            id: dto.id,
            username: dto.username,
            fullName: dto.full_name,
            avatarUrl: dto.avatar_url,
            isFollowing: false, // Bu ayrı bir join veya check gerektirir
            bio: dto.bio,
            country: dto.country,
            age: dto.age,
            website: dto.website,
            isVerified: dto.is_verified,
            followersCount: dto.followers_count,
            followingCount: dto.following_count,
            postsCount: dto.posts_count
        };
    }

    private mapDtoToSocialLink(dto: any): SocialLink {
        return {
            id: dto.id,
            userId: dto.user_id,
            platform: dto.platform,
            url: dto.url,
            displayOrder: dto.display_order
        };
    }
}
