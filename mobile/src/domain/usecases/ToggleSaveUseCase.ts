import { ISaveRepository } from '../repositories/ISaveRepository';

export class ToggleSaveUseCase {
    constructor(private saveRepository: ISaveRepository) { }

    async execute(videoId: string, userId: string): Promise<boolean> {
        return this.saveRepository.toggleSave(userId, videoId);
    }
}
