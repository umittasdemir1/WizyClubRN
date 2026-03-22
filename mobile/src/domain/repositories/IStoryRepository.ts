import { Story } from '../entities/Story';

export interface IStoryRepository {
    getStories(userId?: string): Promise<Story[]>;
    getStoryById(storyId: string, userId?: string): Promise<Story | null>;
    markAsViewed(storyId: string): Promise<void>;
}
