import { useState, useEffect, useCallback } from 'react';
import { User } from '../../domain/entities';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';

const profileRepo = new ProfileRepositoryImpl();

export const useProfile = (userId: string, viewerId?: string) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadProfile = useCallback(async (silentRefresh = false) => {
        // Only show loading skeleton if no data exists (Instagram/TikTok behavior)
        if (!silentRefresh) {
            setIsLoading(true);
        }

        try {
            const profileData = await profileRepo.getProfile(userId, viewerId);
            setUser(profileData);
        } catch (err) {
            setError('Profil yüklenirken bir hata oluştu.');
            console.error('[useProfile] Load error:', err);
        } finally {
            if (!silentRefresh) {
                setIsLoading(false);
            }
        }
    }, [userId, viewerId]);

    useEffect(() => {
        // Only load if userId is valid (not a fallback or invalid ID)
        if (userId && userId.length > 0) {
            loadProfile();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]); // Only load on mount/userId change

    const updateProfile = useCallback(async (updates: Partial<User>) => {
        try {
            const updatedUser = await profileRepo.updateProfile(userId, updates);

            // Force reload from database to ensure state is in sync
            await loadProfile();

            return updatedUser;
        } catch (err) {
            console.error('[useProfile] Update error:', err);
            setError('Profil güncellenirken bir hata oluştu.');
            throw err;
        }
    }, [userId, loadProfile]);

    const uploadAvatar = useCallback(async (fileUri: string) => {
        try {
            const avatarUrl = await profileRepo.uploadAvatar(userId, fileUri);
            // Burada avatarUrl'i profile update ile de göndermek gerekebilir
            await updateProfile({ avatarUrl });
            return avatarUrl;
        } catch (err) {
            setError('Profil resmi yüklenirken bir hata oluştu.');
            throw err;
        }
    }, [userId, updateProfile]);

    return {
        user,
        isLoading,
        error,
        updateProfile,
        uploadAvatar,
        reload: loadProfile
    };
};
