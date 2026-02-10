import { Story } from '../entities/Story';

export interface IStoryRepository {
    getStories(userId?: string): Promise<Story[]>;
    markAsViewed(storyId: string): Promise<void>;
}
