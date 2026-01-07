import { create } from 'zustand';
import { ToggleFollowUseCase } from '../../domain/usecases/ToggleFollowUseCase';
import { InteractionRepositoryImpl } from '../../data/repositories/InteractionRepositoryImpl';

interface SocialState {
    followingMap: Record<string, boolean>;
    followerCounts: Record<string, number>;
    followingCounts: Record<string, number>;
    // Track when each record was last updated LOCALLY via toggleFollow
    lastUpdated: Record<string, number>;

    setFollowing: (userId: string, status: boolean) => void;
    syncSocialData: (userId: string, status: boolean, followers: number, following: number) => void;
    toggleFollow: (targetUserId: string, currentUserId: string) => Promise<void>;
}

const interactionRepo = new InteractionRepositoryImpl();
const toggleFollowUseCase = new ToggleFollowUseCase(interactionRepo);

// How long to wait before allowing server sync to overwrite local state (ms)
const SYNC_PROTECTION_MS = 5000;

export const useSocialStore = create<SocialState>((set, get) => ({
    followingMap: {},
    followerCounts: {},
    followingCounts: {},
    lastUpdated: {},

    setFollowing: (userId, status) => {
        set((state) => ({
            followingMap: { ...state.followingMap, [userId]: status },
        }));
    },

    syncSocialData: (userId, status, followers, following) => {
        const now = Date.now();
        const lastLocalUpdate = get().lastUpdated[userId] || 0;

        // PROTECTION: If we had a local optimistic update recently, ignore server sync
        // This prevents "jumpy" UI where server returns old data before backend fully propagates
        if (now - lastLocalUpdate < SYNC_PROTECTION_MS) {
            console.log(`[SocialStore] 🛡️ Ignoring sync for ${userId} (recent local update)`);
            return;
        }

        set((state) => ({
            followingMap: { ...state.followingMap, [userId]: status },
            followerCounts: { ...state.followerCounts, [userId]: followers },
            followingCounts: { ...state.followingCounts, [userId]: following },
        }));
    },

    toggleFollow: async (targetUserId, currentUserId) => {
        const now = Date.now();
        const isCurrentlyFollowing = get().followingMap[targetUserId] ?? false;
        const targetFollowerCount = get().followerCounts[targetUserId] ?? 0;
        const actorFollowingCount = get().followingCounts[currentUserId] ?? 0;

        // 1. Optimistic Update
        const nextFollowingStatus = !isCurrentlyFollowing;
        const nextTargetFollowerCount = nextFollowingStatus
            ? targetFollowerCount + 1
            : Math.max(0, targetFollowerCount - 1);
        const nextActorFollowingCount = nextFollowingStatus
            ? actorFollowingCount + 1
            : Math.max(0, actorFollowingCount - 1);

        set((state) => ({
            followingMap: { ...state.followingMap, [targetUserId]: nextFollowingStatus },
            followerCounts: { ...state.followerCounts, [targetUserId]: nextTargetFollowerCount },
            followingCounts: { ...state.followingCounts, [currentUserId]: nextActorFollowingCount },
            lastUpdated: {
                ...state.lastUpdated,
                [targetUserId]: now,
                [currentUserId]: now
            }
        }));

        try {
            await toggleFollowUseCase.execute(targetUserId, currentUserId);
        } catch (error) {
            console.error('[SocialStore] Toggle follow failed, rolling back:', error);
            set((state) => ({
                followingMap: { ...state.followingMap, [targetUserId]: isCurrentlyFollowing },
                followerCounts: { ...state.followerCounts, [targetUserId]: targetFollowerCount },
                followingCounts: { ...state.followingCounts, [currentUserId]: actorFollowingCount },
                // On failure, we immediately expire the protection so the next sync can fix it
                lastUpdated: { ...state.lastUpdated, [targetUserId]: 0, [currentUserId]: 0 }
            }));
            throw error;
        }
    },
}));
