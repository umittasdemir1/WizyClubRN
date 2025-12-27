export interface SocialLink {
    id: string;
    platform: string;
    url: string;
}

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
    followersCount?: number | string;
    followingCount?: number | string;
    postsCount?: number;
    socialLinks?: SocialLink[];
}