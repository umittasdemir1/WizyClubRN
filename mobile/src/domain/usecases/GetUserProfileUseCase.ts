import { User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';

export class GetUserProfileUseCase {
    constructor(private userRepository: IUserRepository) {}

    async execute(userId: string): Promise<User | null> {
        return await this.userRepository.getUserById(userId);
    }
}
