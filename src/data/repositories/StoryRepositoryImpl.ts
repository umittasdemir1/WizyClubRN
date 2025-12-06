import { IStoryRepository } from '../../domain/repositories/IStoryRepository';
import { Story } from '../../domain/entities/Story';
import { MockVideoDataSource } from '../datasources/MockVideoDataSource';
import { StoryMapper } from '../mappers/StoryMapper';

export class StoryRepositoryImpl implements IStoryRepository {
    private dataSource: MockVideoDataSource;

    constructor() {
        this.dataSource = new MockVideoDataSource();
    }

    async getStories(): Promise<Story[]> {
        const storyDtos = await this.dataSource.getStories();
        return storyDtos.map(StoryMapper.toEntity);
    }

    async markAsViewed(storyId: string): Promise<void> {
        // Simulate API call
        return;
    }
}
