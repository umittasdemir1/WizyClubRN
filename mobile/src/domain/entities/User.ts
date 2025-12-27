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
    isFollowing: boolean;
    country?: string;
    age?: number;
    bio?: string;
    followersCount?: number | string;
    followingCount?: number | string;
    socialLinks?: SocialLink[];
}
