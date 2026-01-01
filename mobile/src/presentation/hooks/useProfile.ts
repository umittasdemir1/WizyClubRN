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
        if (!silentRefresh && !user) {
            setIsLoading(true);
        }

        try {
            console.log('[useProfile] Loading profile for user ID:', userId, silentRefresh ? '(silent)' : '');
            const profileData = await profileRepo.getProfile(userId, viewerId);
            console.log('[useProfile] Profile data loaded:', profileData ? 'Found' : 'Null');
            setUser(profileData);
        } catch (err) {
            setError('Profil yüklenirken bir hata oluştu.');
            console.error('[useProfile] Load error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [userId, viewerId, user]);

    useEffect(() => {
        if (userId) {
            loadProfile();
        }
    }, [loadProfile, userId]);

    const updateProfile = useCallback(async (updates: Partial<User>) => {
        try {
            console.log('[useProfile] Updating profile with:', updates);
            const updatedUser = await profileRepo.updateProfile(userId, updates);
            console.log('[useProfile] Update response:', updatedUser);

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
