import { useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS } from '../../core/constants';
import { MODAL_SHEET_COLORS } from '../../core/constants/modal-sheet-colors';
import { useThemeStore } from '../store/useThemeStore';

export function useModalSheetTheme(isDarkOverride?: boolean) {
    const storeIsDark = useThemeStore((state) => state.isDark);
    const isDark = isDarkOverride ?? storeIsDark;

    return useMemo(() => {
        const base = isDark ? MODAL_SHEET_COLORS.dark : MODAL_SHEET_COLORS.light;
        const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

        return {
            isDark,
            ...base,
            textPrimary: themeColors.textPrimary,
            textSecondary: themeColors.textSecondary,
            pageBackground: themeColors.background,
        };
    }, [isDark]);
}
