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
            theme: 'dark', // Default to dark
            isDark: true,

            toggleTheme: () => {
                const newTheme = get().theme === 'dark' ? 'light' : 'dark';
                set({
                    theme: newTheme,
                    isDark: newTheme === 'dark'
                });
            },

            setTheme: (theme: Theme) => {
                set({
                    theme,
                    isDark: theme === 'dark'
                });
            },
        }),
        {
            name: 'wizyclub-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);
