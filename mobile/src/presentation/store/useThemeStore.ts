import { create } from 'zustand';
import { Appearance } from 'react-native';
import { useEffect } from 'react';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: Theme) => void;
}

const resolveIsDark = (theme: Theme) => {
    if (theme === 'system') {
        const scheme = Appearance.getColorScheme();
        return (scheme || 'dark') === 'dark';
    }
    return theme === 'dark';
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'dark', // Default to dark
            isDark: true,

            toggleTheme: () => {
                const newTheme: Theme = get().isDark ? 'light' : 'dark';
                set({
                    theme: newTheme,
                    isDark: resolveIsDark(newTheme),
                });
            },

            setTheme: (theme: Theme) => {
                set({
                    theme,
                    isDark: resolveIsDark(theme),
                });
            },
        }),
        {
            name: 'wizyclub-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    state.setTheme(state.theme);
                }
            },
        }
    )
);

export function useThemeAppearanceSync() {
    const theme = useThemeStore((state) => state.theme);

    useEffect(() => {
        if (theme !== 'system') {
            return;
        }

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            useThemeStore.setState({ isDark: colorScheme === 'dark' });
        });

        return () => {
            subscription.remove();
        };
    }, [theme]);
}
