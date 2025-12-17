export interface User {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl: string;
    isFollowing: boolean;
    country?: string;
    age?: number;
    bio?: string;
}
