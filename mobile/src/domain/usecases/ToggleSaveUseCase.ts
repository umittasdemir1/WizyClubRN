import { ISaveRepository } from '../repositories/ISaveRepository';

export class ToggleSaveUseCase {
    constructor(private saveRepository: ISaveRepository) { }

    async execute(videoId: string, userId: string = '687c8079-e94c-42c2-9442-8a4a6b63dec6'): Promise<boolean> {
        return this.saveRepository.toggleSave(userId, videoId);
    }
}
