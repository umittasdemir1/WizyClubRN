import { Story } from '../entities/Story';
import { IStoryRepository } from '../repositories/IStoryRepository';

export class GetStoriesUseCase {
    constructor(private storyRepository: IStoryRepository) { }

    async execute(): Promise<Story[]> {
        return this.storyRepository.getStories();
    }
}
