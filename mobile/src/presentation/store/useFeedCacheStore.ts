import { create } from 'zustand';
import { Video } from '../../domain/entities/Video';

interface FeedCacheEntry {
    videos: Video[];
    updatedAt: number;
}

interface FeedCacheState {
    feeds: Record<string, FeedCacheEntry>;
    setFeed: (key: string, videos: Video[]) => void;
}

export const useFeedCacheStore = create<FeedCacheState>((set) => ({
    feeds: {},

    setFeed: (key, videos) => {
        set((state) => ({
            feeds: {
                ...state.feeds,
                [key]: { videos, updatedAt: Date.now() }
            }
        }));
    }
}));
