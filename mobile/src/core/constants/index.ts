import { Dimensions } from 'react-native';
import themeColorConfig from './theme-colors.config.json';

// ===================================
// 📐 SCREEN DIMENSIONS
// ===================================
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// ===================================
// 🎨 COLORS (Theme-Aware Sets)
// ===================================

type ThemeColorConfig = {
    background: { light: string; dark: string };
    videoBackground: { light: string; dark: string };
    card: { light: string; dark: string };
    black: { light: string; dark: string };
    border: { light: string; dark: string };
    textPrimary: { light: string; dark: string };
    textSecondary: { light: string; dark: string };
};

const THEME_COLOR_CONFIG = themeColorConfig as ThemeColorConfig;

export const LIGHT_COLORS = {
    background: THEME_COLOR_CONFIG.background.light,
    videoBackground: THEME_COLOR_CONFIG.videoBackground.light,
    card: THEME_COLOR_CONFIG.card.light,
    black: THEME_COLOR_CONFIG.black.light,
    border: THEME_COLOR_CONFIG.border.light,
    textPrimary: THEME_COLOR_CONFIG.textPrimary.light,
    textSecondary: THEME_COLOR_CONFIG.textSecondary.light,
};

export const DARK_COLORS = {
    background: THEME_COLOR_CONFIG.background.dark,
    videoBackground: THEME_COLOR_CONFIG.videoBackground.dark,
    card: THEME_COLOR_CONFIG.card.dark,
    black: THEME_COLOR_CONFIG.black.dark,
    border: THEME_COLOR_CONFIG.border.dark,
    textPrimary: THEME_COLOR_CONFIG.textPrimary.dark,
    textSecondary: THEME_COLOR_CONFIG.textSecondary.dark,
};

// Legacy export for backward compatibility, defaults to DARK
export const COLORS = DARK_COLORS;

// ===================================
// 📏 LAYOUT
// ===================================
export const LAYOUT = {
    tabBarHeight: 60,
    horizontalPadding: 12,
    verticalPadding: 16,
    iconSmall: 24,
    iconMedium: 32,
    iconLarge: 40,
    minTouchTarget: 48,
    safeAreaTop: 44,
    safeAreaBottom: 34,
} as const;

// ===================================
// 🎬 VIDEO
// ===================================
export const VIDEO = {
    maxLoops: 2,
    preloadCount: 2,
    progressUpdateInterval: 33,
    bufferUpdateInterval: 1000,
} as const;

// ===================================
// ⚡ ANIMATION
// ===================================
export const ANIMATION = {
    fast: 100,
    medium: 150,
    slow: 300,
    springFriction: 8,
    springTension: 100,
} as const;
