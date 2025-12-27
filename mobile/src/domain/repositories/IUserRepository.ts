import { User } from '../entities/User';

export interface IUserRepository {
    getUserByUsername(username: string): Promise<User | null>;
    getUserById(id: string): Promise<User | null>;
}
