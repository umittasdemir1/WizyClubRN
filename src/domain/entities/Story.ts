import { User } from './User';

export interface Story {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    createdAt: string;
    expiresAt: string;
    isViewed: boolean;
    user: User;
    brandName?: string | null;
    brandUrl?: string | null;
    isCommercial?: boolean;
    commercialType?: string | null;
    width?: number;
    height?: number;
    likesCount?: number;
    isLiked?: boolean;
    isSaved?: boolean;
}
