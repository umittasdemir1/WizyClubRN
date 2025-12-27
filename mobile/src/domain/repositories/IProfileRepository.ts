import { User, SocialLink } from '../entities';

export interface IProfileRepository {
    getProfile(userId: string): Promise<User | null>;
    updateProfile(userId: string, profile: Partial<User>): Promise<User>;
    getSocialLinks(userId: string): Promise<SocialLink[]>;
    addSocialLink(userId: string, link: Omit<SocialLink, 'id' | 'userId'>): Promise<SocialLink>;
    deleteSocialLink(linkId: string): Promise<void>;
    uploadAvatar(userId: string, fileUri: string): Promise<string>;
}
