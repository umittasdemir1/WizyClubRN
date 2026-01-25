import { useState, useEffect, useCallback } from 'react';
import { User } from '../../domain/entities';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';
import { useSocialStore } from '../store/useSocialStore';
import { logRepo, logError, LogCode } from '@/core/services/Logger';

const profileRepo = new ProfileRepositoryImpl();

export const useProfile = (userId: string, viewerId?: string) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const followingMap = useSocialStore((state) => state.followingMap);
    const followerCounts = useSocialStore((state) => state.followerCounts);
    const followingCounts = useSocialStore((state) => state.followingCounts);
    const syncSocialData = useSocialStore((state) => state.syncSocialData);

    // Sync current user object with global store data
    const syncedUser = user ? {
        ...user,
        isFollowing: followingMap[user.id] ?? user.isFollowing,
        followersCount: followerCounts[user.id] ?? user.followersCount,
        followingCount: followingCounts[user.id] ?? user.followingCount
    } : null;

    const loadProfile = useCallback(async (silentRefresh = false) => {
        // Only show loading skeleton if no data exists (Instagram/TikTok behavior)
        if (!silentRefresh) {
            setIsLoading(true);
        }

        try {
            const profileData = await profileRepo.getProfile(userId, viewerId);
            if (profileData) {
                setUser(profileData);
                // Sync to global store
                syncSocialData(
                    profileData.id,
                    profileData.isFollowing,
                    profileData.followersCount || 0,
                    profileData.followingCount || 0
                );
            }
        } catch (err) {
            setError('Profil yüklenirken bir hata oluştu.');
            logError(LogCode.REPO_ERROR, 'Profile load error', { error: err, userId });
        } finally {
            if (!silentRefresh) {
                setIsLoading(false);
            }
        }
    }, [userId, viewerId, syncSocialData]);

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
            setUser(updatedUser);
            syncSocialData(
                updatedUser.id,
                updatedUser.isFollowing,
                updatedUser.followersCount || 0,
                updatedUser.followingCount || 0
            );
            // Silent refresh to avoid full skeleton reload
            await loadProfile(true);

            return updatedUser;
        } catch (err) {
            logError(LogCode.REPO_ERROR, 'Profile update error', { error: err, userId });
            setError('Profil güncellenirken bir hata oluştu.');
            throw err;
        }
    }, [userId, loadProfile, syncSocialData]);

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
        user: syncedUser,
        isLoading,
        error,
        updateProfile,
        uploadAvatar,
        reload: loadProfile
    };
};
