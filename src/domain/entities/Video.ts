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
    isLiked: boolean;
    isSaved: boolean;
    savesCount: number;
    user: User;
    musicName?: string;
    musicAuthor?: string;
    hlsUrl?: string; // HLS Master Playlist URL
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}
