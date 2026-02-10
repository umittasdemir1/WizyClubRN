import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User } from '../../domain/entities';
import { ProfileRepositoryImpl } from '../../data/repositories/ProfileRepositoryImpl';
import { useSocialStore } from '../store/useSocialStore';
import { logRepo, logError, LogCode } from '@/core/services/Logger';
import { QUERY_KEYS } from '../../core/query/queryClient';

const profileRepo = new ProfileRepositoryImpl();

export const useProfile = (userId: string, viewerId?: string) => {
    const queryClient = useQueryClient();
    const followingMap = useSocialStore((state) => state.followingMap);
    const followerCounts = useSocialStore((state) => state.followerCounts);
    const followingCounts = useSocialStore((state) => state.followingCounts);
    const syncSocialData = useSocialStore((state) => state.syncSocialData);

    const {
        data: user,
        isLoading,
        error: queryError,
        refetch
    } = useQuery({
        queryKey: QUERY_KEYS.PROFILE(userId),
        queryFn: async () => {
            if (!userId) return null;
            const profileData = await profileRepo.getProfile(userId, viewerId);
            if (profileData) {
                // Sync to global store side-effect
                syncSocialData(
                    profileData.id,
                    profileData.isFollowing,
                    profileData.followersCount || 0,
                    profileData.followingCount || 0
                );
            }
            return profileData;
        },
        enabled: Boolean(userId && userId.length > 0),
    });

    // Sync current user object with global store data
    const syncedUser = useMemo(() => user ? {
        ...user,
        isFollowing: followingMap[user.id] ?? user.isFollowing,
        followersCount: followerCounts[user.id] ?? user.followersCount,
        followingCount: followingCounts[user.id] ?? user.followingCount
    } : null, [user, followingMap, followerCounts, followingCounts]);

    const updateMutation = useMutation({
        mutationFn: (updates: Partial<User>) => profileRepo.updateProfile(userId, updates),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData(QUERY_KEYS.PROFILE(userId), updatedUser);
            syncSocialData(
                updatedUser.id,
                updatedUser.isFollowing,
                updatedUser.followersCount || 0,
                updatedUser.followingCount || 0
            );
            // Also invalidate to ensure any other dependent queries (like lite) refresh
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE(userId) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PROFILE_LITE(userId) });
        },
        onError: (err) => {
            logError(LogCode.REPO_ERROR, 'Profile update error', { error: err, userId });
        }
    });

    const uploadAvatarMutation = useMutation({
        mutationFn: async (fileUri: string) => {
            const avatarUrl = await profileRepo.uploadAvatar(userId, fileUri);
            return updateMutation.mutateAsync({ avatarUrl });
        },
        onError: (err) => {
            logError(LogCode.REPO_ERROR, 'Avatar upload error', { error: err, userId });
        }
    });

    return {
        user: syncedUser,
        isLoading,
        error: queryError ? 'Profil yüklenirken bir hata oluştu.' : null,
        updateProfile: updateMutation.mutateAsync,
        uploadAvatar: uploadAvatarMutation.mutateAsync,
        reload: (silentRefresh?: boolean) => refetch()
    };
};

export const useLightProfile = (userId: string) => {
    const { data: user, isLoading } = useQuery({
        queryKey: QUERY_KEYS.PROFILE_LITE(userId),
        queryFn: () => profileRepo.getProfileLite(userId),
        enabled: Boolean(userId),
        staleTime: 1000 * 60 * 5, // Light profile can be stale for longer (5 mins)
    });

    return { user: user ?? null, isLoading };
};
