import { IStoryRepository } from '../../domain/repositories/IStoryRepository';
import { Story } from '../../domain/entities/Story';
import { SupabaseVideoDataSource } from '../datasources/SupabaseVideoDataSource';
import { StoryMapper } from '../mappers/StoryMapper';

export class StoryRepositoryImpl implements IStoryRepository {
    private dataSource: SupabaseVideoDataSource;

    constructor() {
        this.dataSource = new SupabaseVideoDataSource();
    }

    async getStories(): Promise<Story[]> {
        // Supabase data source already returns Story entities
        return this.dataSource.getStories();
    }

    async markAsViewed(storyId: string): Promise<void> {
        // Simulate API call
        return;
    }
}
