import { User } from '../entities';
import { IProfileRepository } from '../repositories/IProfileRepository';

export class SearchProfilesUseCase {
    constructor(private profileRepository: IProfileRepository) { }

    async execute(query: string, limit: number = 20, viewerId?: string): Promise<User[]> {
        return this.profileRepository.searchProfiles(query, limit, viewerId);
    }
}
