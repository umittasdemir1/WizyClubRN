import { User } from './User';

export interface Video {
    id: string;
    videoUrl: string;
    thumbnailUrl: string;
    description: string;
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    shopsCount: number;
    spriteUrl?: string; // Sprite sheet URL for seekbar thumbnails
    isLiked: boolean;
    isSaved: boolean;
    savesCount: number;
    user: User;
    musicName?: string;
    musicAuthor?: string;
    hlsUrl?: string; // HLS Master Playlist URL
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    brandName?: string | null;
    brandUrl?: string | null;
    isCommercial?: boolean;
    commercialType?: string | null;
    width?: number;
    height?: number;
    createdAt?: string;
    mediaUrls?: {
        url: string;
        type: 'video' | 'image';
        thumbnail?: string;
    }[];
    postType?: 'video' | 'carousel';
}
