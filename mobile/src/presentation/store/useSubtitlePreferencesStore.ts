import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SubtitlePreferenceMode = 'off' | 'on' | 'always';

interface SubtitlePreferencesState {
    mode: SubtitlePreferenceMode;
    setMode: (mode: SubtitlePreferenceMode) => void;
}

export const useSubtitlePreferencesStore = create<SubtitlePreferencesState>()(
    persist(
        (set) => ({
            mode: 'off',
            setMode: (mode) => set({ mode }),
        }),
        {
            name: 'wizyclub-subtitle-preferences',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                if (state && state.mode === 'on') {
                    state.setMode('off'); // 'on' (Açık) modu session-based olduğu için reload'da kapanır.
                }
            },
        }
    )
);
