export interface User {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isVerified?: boolean;
    shopEnabled?: boolean;
    isFollowing: boolean;
    country?: string;
    age?: number;
    bio?: string;
    website?: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    hasStories?: boolean;
    hasUnseenStory?: boolean;
    // Social Links
    instagramUrl?: string;
    tiktokUrl?: string;
    youtubeUrl?: string;
    xUrl?: string;
}
