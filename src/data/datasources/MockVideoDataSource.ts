import { Video } from '../../domain/entities/Video';
import { Story } from '../../domain/entities/Story';
import { User } from '../../domain/entities/User';

// Mock Users
const USERS: User[] = [
    {
        id: 'u1',
        username: 'wizy_official',
        avatarUrl: 'https://ui-avatars.com/api/?name=Wizy+Club&background=random',
        isFollowing: true,
    },
    {
        id: 'u2',
        username: 'travel_addict',
        avatarUrl: 'https://ui-avatars.com/api/?name=Travel+Addict&background=random',
        isFollowing: false,
    },
    {
        id: 'u3',
        username: 'foodie_life',
        avatarUrl: 'https://ui-avatars.com/api/?name=Foodie+Life&background=random',
        isFollowing: true,
    },
];

// Mock Videos
export const MOCK_VIDEOS: Video[] = [
    {
        id: 'v1',
        videoUrl: require('../../../assets/videos/video1.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/v1/400/800',
        description: 'Welcome to WizyClub! 🚀 #reactnative #expo',
        likesCount: 1200,
        commentsCount: 45,
        sharesCount: 12,
        isLiked: false,
        isSaved: false,
        savesCount: 456,
        user: USERS[0],
        musicName: 'Original Audio',
        musicAuthor: 'WizyClub',
    },
    {
        id: 'v2',
        videoUrl: require('../../../assets/videos/video2.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/v2/400/800',
        description: 'Amazing view! 🏔️',
        likesCount: 850,
        commentsCount: 20,
        sharesCount: 5,
        isLiked: true,
        isSaved: true,
        savesCount: 123,
        user: USERS[1],
        musicName: 'Mountain Vibes',
        musicAuthor: 'Nature Sounds',
    },
    {
        id: 'v3',
        videoUrl: require('../../../assets/videos/video3.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/v3/400/800',
        description: 'Delicious pasta recipe 🍝',
        likesCount: 2300,
        commentsCount: 150,
        sharesCount: 89,
        isLiked: false,
        isSaved: false,
        savesCount: 789,
        user: USERS[2],
        musicName: 'Cooking Time',
        musicAuthor: 'Chef Mario',
    },
    {
        id: 'v4',
        videoUrl: require('../../../assets/videos/video4.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/v4/400/800',
        description: 'Coding late night 💻',
        likesCount: 500,
        commentsCount: 10,
        sharesCount: 2,
        isLiked: false,
        isSaved: false,
        savesCount: 89,
        user: USERS[0],
        musicName: 'Lofi Beats',
        musicAuthor: 'Coding Music',
    },
];

// Mock Stories
export const MOCK_STORIES: Story[] = [
    {
        id: 's1',
        videoUrl: require('../../../assets/videos/story1.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/s1/400/800',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isViewed: false,
        user: USERS[0],
    },
    {
        id: 's2',
        videoUrl: require('../../../assets/videos/story2.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/s2/400/800',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isViewed: false,
        user: USERS[1],
    },
    {
        id: 's3',
        videoUrl: require('../../../assets/videos/story3.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/s3/400/800',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isViewed: true,
        user: USERS[2],
    },
    {
        id: 's4',
        videoUrl: require('../../../assets/videos/story4.mp4'),
        thumbnailUrl: 'https://picsum.photos/seed/s4/400/800',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isViewed: false,
        user: USERS[0],
    },
];

export class MockVideoDataSource {
    async getVideos(page: number, limit: number): Promise<Video[]> {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        return MOCK_VIDEOS;
    }

    async getStories(): Promise<Story[]> {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return MOCK_STORIES;
    }
}
