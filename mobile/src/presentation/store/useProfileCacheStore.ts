import { create } from 'zustand';
import { User } from '../../domain/entities';

interface ProfileCacheState {
    profilesById: Record<string, User>;
    lastUpdated: Record<string, number>;
    setProfile: (profile: User) => void;
    mergeProfile: (profile: Partial<User> & { id: string }) => void;
}

export const useProfileCacheStore = create<ProfileCacheState>((set, get) => ({
    profilesById: {},
    lastUpdated: {},

    setProfile: (profile) => {
        set((state) => ({
            profilesById: { ...state.profilesById, [profile.id]: profile },
            lastUpdated: { ...state.lastUpdated, [profile.id]: Date.now() }
        }));
    },

    mergeProfile: (profile) => {
        const existing = get().profilesById[profile.id];
        if (!existing) {
            if (profile.username && profile.avatarUrl && typeof profile.isFollowing === 'boolean') {
                set((state) => ({
                    profilesById: { ...state.profilesById, [profile.id]: profile as User },
                    lastUpdated: { ...state.lastUpdated, [profile.id]: Date.now() }
                }));
            }
            return;
        }

        set((state) => ({
            profilesById: {
                ...state.profilesById,
                [profile.id]: { ...existing, ...profile }
            },
            lastUpdated: { ...state.lastUpdated, [profile.id]: Date.now() }
        }));
    }
}));
