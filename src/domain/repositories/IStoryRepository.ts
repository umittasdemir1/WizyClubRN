import { Story } from '../entities/Story';

export interface IStoryRepository {
    getStories(): Promise<Story[]>;
    markAsViewed(storyId: string): Promise<void>;
}
