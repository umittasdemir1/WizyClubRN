import { User } from '../entities';

export interface IProfileRepository {
    getProfile(userId: string, viewerId?: string): Promise<User | null>;
    updateProfile(userId: string, profile: Partial<User>): Promise<User>;
    uploadAvatar(userId: string, fileUri: string): Promise<string>;
}
