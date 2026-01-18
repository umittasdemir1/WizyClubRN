import { useState, useEffect, useCallback } from 'react';
import { User } from '../../domain/entities';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';
import { useSocialStore } from '../store/useSocialStore';
import { useProfileCacheStore } from '../store/useProfileCacheStore';
import { useAuthStore } from '../store/useAuthStore';

const profileRepo = new ProfileRepositoryImpl();

export const useProfile = (userId: string, viewerId?: string) => {
    const cachedProfile = useProfileCacheStore((state) => (userId ? state.profilesById[userId] : null));
    const setProfileCache = useProfileCacheStore((state) => state.setProfile);
    const authUserId = useAuthStore((state) => state.user?.id);
    const effectiveViewerId = viewerId || authUserId;

    const [user, setUser] = useState<User | null>(cachedProfile ?? null);
    const [isLoading, setIsLoading] = useState(!cachedProfile);
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
            const profileData = await profileRepo.getProfile(userId, effectiveViewerId);
            if (profileData) {
                setUser(profileData);
                setProfileCache(profileData);
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
            console.error('[useProfile] Load error:', err);
        } finally {
            if (!silentRefresh) {
                setIsLoading(false);
            }
        }
    }, [userId, effectiveViewerId, syncSocialData, setProfileCache]);

    useEffect(() => {
        // Only load if userId is valid (not a fallback or invalid ID)
        if (userId && userId.length > 0) {
            loadProfile(!!cachedProfile);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]); // Only load on mount/userId change

    useEffect(() => {
        if (!userId) {
            setUser(null);
            setIsLoading(false);
            return;
        }

        if (cachedProfile) {
            setUser(cachedProfile);
            setIsLoading(false);
        } else {
            setUser(null);
            setIsLoading(true);
        }
    }, [userId, cachedProfile]);

    const updateProfile = useCallback(async (updates: Partial<User>) => {
        try {
            const updatedUser = await profileRepo.updateProfile(userId, updates);
            setUser(updatedUser);
            setProfileCache(updatedUser);
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
            console.error('[useProfile] Update error:', err);
            setError('Profil güncellenirken bir hata oluştu.');
            throw err;
        }
    }, [userId, loadProfile, syncSocialData, setProfileCache]);

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
