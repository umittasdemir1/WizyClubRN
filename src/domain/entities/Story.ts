import { User } from './User';

export interface Story {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    createdAt: string;
    expiresAt: string;
    isViewed: boolean;
    user: User;
}
