import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeState {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'dark', // Locked to dark mode
            isDark: true,

            toggleTheme: () => {
                // Temporarily disabled - always use dark mode
                console.log('Theme toggle disabled - using dark mode only');
                // Force dark mode in case it was changed
                set({
                    theme: 'dark',
                    isDark: true
                });
            },

            setTheme: (theme: Theme) => {
                // Temporarily disabled - always use dark mode
                console.log('Theme change disabled - using dark mode only');
                // Force dark mode
                set({
                    theme: 'dark',
                    isDark: true
                });
            },
        }),
        {
            name: 'wizyclub-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
