import { User } from '../entities';

export interface IProfileRepository {
    getProfile(userId: string, viewerId?: string): Promise<User | null>;
    getProfileLite(userId: string): Promise<User | null>;
    searchProfiles(query: string, limit: number, viewerId?: string): Promise<User[]>;
    updateProfile(userId: string, profile: Partial<User>): Promise<User>;
    uploadAvatar(userId: string, fileUri: string): Promise<string>;
    checkUsernameAvailability(username: string, currentUserId: string): Promise<boolean>;
}
