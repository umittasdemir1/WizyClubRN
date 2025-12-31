export interface User {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isVerified?: boolean;
    isFollowing: boolean;
    country?: string;
    age?: number;
    bio?: string;
    website?: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    // Social Links
    instagramUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
    xUrl?: string;
}