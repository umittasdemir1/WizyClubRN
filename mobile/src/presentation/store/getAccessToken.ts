import { AuthRepositoryImpl } from '../../data/repositories/AuthRepositoryImpl';
import { useAuthStore } from './useAuthStore';

const authRepository = new AuthRepositoryImpl();

export async function getAccessToken(): Promise<string | null> {
    const cachedToken = useAuthStore.getState().session?.access_token;
    if (cachedToken) {
        return cachedToken;
    }

    return authRepository.getAccessToken();
}
