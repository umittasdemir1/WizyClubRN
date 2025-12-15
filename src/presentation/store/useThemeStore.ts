import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, Appearance } from 'react-native';
import React from 'react';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    themeMode: ThemeMode;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
    updateSystemTheme: (systemIsDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            themeMode: 'dark', // 'light' | 'dark' | 'system'
            isDark: true,

            setThemeMode: (mode: ThemeMode) => {
                if (mode === 'system') {
                    // Immediately get system theme and set isDark
                    const systemTheme = Appearance.getColorScheme();
                    set({
                        themeMode: 'system',
                        isDark: systemTheme === 'dark'
                    });
                } else {
                    set({
                        themeMode: mode,
                        isDark: mode === 'dark'
                    });
                }
            },

            updateSystemTheme: (systemIsDark: boolean) => {
                const { themeMode } = get();
                if (themeMode === 'system') {
                    set({ isDark: systemIsDark });
                }
            },
        }),
        {
            name: 'wizyclub-theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
        }
    )
);

// Hook to sync system theme
export const useSystemTheme = () => {
    const colorScheme = useColorScheme();
    const { themeMode, updateSystemTheme } = useThemeStore();

    React.useEffect(() => {
        if (themeMode === 'system') {
            updateSystemTheme(colorScheme === 'dark');
        }
    }, [colorScheme, themeMode, updateSystemTheme]);
};
