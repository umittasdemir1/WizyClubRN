import { useMemo } from 'react';
import { DARK_COLORS, LIGHT_COLORS } from '../../core/constants';
import { SURFACE_THEME_TOKENS, ShadowToken } from '../../core/constants/surface-theme-tokens';
import { useThemeStore } from '../store/useThemeStore';

function toReactNativeShadow(shadow: ShadowToken) {
    return {
        shadowColor: shadow.color,
        shadowOpacity: shadow.opacity,
        shadowRadius: shadow.radius,
        shadowOffset: { width: shadow.offsetX, height: shadow.offsetY },
        elevation: shadow.elevation,
    };
}

export function useSurfaceTheme(isDarkOverride?: boolean) {
    const storeIsDark = useThemeStore((state) => state.isDark);
    const isDark = isDarkOverride ?? storeIsDark;

    return useMemo(() => {
        const base = isDark ? SURFACE_THEME_TOKENS.dark : SURFACE_THEME_TOKENS.light;
        const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

        const sheetShadow = toReactNativeShadow(base.sheetShadow);
        const modalShadow = toReactNativeShadow(base.modalShadow);

        return {
            isDark,
            ...base,
            textPrimary: themeColors.textPrimary,
            textSecondary: themeColors.textSecondary,
            pageBackground: themeColors.background,
            styles: {
                sheetBackground: {
                    backgroundColor: base.sheetBackground,
                    borderTopLeftRadius: base.sheetTopRadius,
                    borderTopRightRadius: base.sheetTopRadius,
                    borderWidth: base.borderThin,
                    borderColor: base.sheetBorder,
                    ...sheetShadow,
                },
                sheetHandle: {
                    backgroundColor: base.sheetHandle,
                    width: base.handleWidth,
                    height: base.handleHeight,
                    borderRadius: base.handleRadius,
                },
                sheetCard: {
                    backgroundColor: base.sheetCard,
                    borderRadius: base.sheetCardRadius,
                    borderWidth: base.borderThin,
                    borderColor: base.sheetBorder,
                },
                inputSurface: {
                    backgroundColor: base.inputBackground,
                    borderRadius: base.inputRadius,
                    borderWidth: base.borderThin,
                    borderColor: base.sheetBorder,
                },
                segmentedSurface: {
                    backgroundColor: base.segmentedFill,
                    borderRadius: base.pillRadius,
                    borderWidth: base.borderThin,
                    borderColor: base.sheetBorder,
                },
                modalOverlay: {
                    backgroundColor: base.modalOverlay,
                },
                modalOverlaySoft: {
                    backgroundColor: base.modalOverlaySoft,
                },
                modalCard: {
                    backgroundColor: base.modalBackground,
                    borderRadius: base.modalRadius,
                    borderWidth: base.borderThin,
                    borderColor: base.modalSeparator,
                    ...modalShadow,
                },
                separator: {
                    backgroundColor: base.modalSeparator,
                    height: base.separatorWidth,
                },
            },
        };
    }, [isDark]);
}
