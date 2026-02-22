import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubtitlePreferenceMode = 'off' | 'video' | 'always';

interface SubtitlePreferencesState {
    alwaysEnabled: boolean;
    videoEnabledById: Record<string, true>;
    revision: number;
    setSelectionForVideo: (videoId: string, mode: SubtitlePreferenceMode) => void;
}

export const useSubtitlePreferencesStore = create<SubtitlePreferencesState>()(
    persist(
        (set) => ({
            alwaysEnabled: false,
            videoEnabledById: {},
            revision: 0,
            setSelectionForVideo: (videoId, mode) => {
                if (!videoId) return;

                set((state) => {
                    const nextMap = { ...state.videoEnabledById };
                    let nextAlways = state.alwaysEnabled;

                    if (mode === 'always') {
                        nextAlways = true;
                    } else if (mode === 'video') {
                        nextAlways = false;
                        nextMap[videoId] = true;
                    } else {
                        nextAlways = false;
                        delete nextMap[videoId];
                    }

                    return {
                        alwaysEnabled: nextAlways,
                        videoEnabledById: nextMap,
                        revision: state.revision + 1,
                    };
                });
            },
        }),
        {
            name: 'wizyclub-subtitle-preferences',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

