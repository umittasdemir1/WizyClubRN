import { Dimensions } from 'react-native';

// ===================================
// 📐 SCREEN DIMENSIONS
// ===================================
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// ===================================
// 🎨 COLORS (Theme-Aware Sets)
// ===================================

export const LIGHT_COLORS = {
    primary: '#FF3B30',
    accent: '#7C3AED',
    background: '#FFFFFF',
    videoBackground: '#000000',
    card: '#F2F2F7',
    white: '#FFFFFF',
    black: '#000000',
    border: '#E5E5EA',
    textPrimary: '#000000',
    textSecondary: '#8E8E93',
    textMuted: '#AEAEB2',
    overlay: 'rgba(0, 0, 0, 0.3)',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
    trackBackground: 'rgba(0, 0, 0, 0.1)',
    trackBuffered: 'rgba(0, 0, 0, 0.2)',
    trackProgress: '#000000',
} as const;

export const DARK_COLORS = {
    primary: '#FF3B30',
    accent: '#7C3AED',
    background: '#181818',       // Lighter dark background
    videoBackground: '#000000',  // Videos stay true black
    card: '#222222',             // Cards slightly lighter
    white: '#FFFFFF',
    black: '#000000',
    border: '#333333',           // Visible borders
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: '#8E8E93',
    overlay: 'rgba(0, 0, 0, 0.5)',
    success: '#10B981',
    error: '#FF6B6B',
    warning: '#FFA500',
    trackBackground: 'rgba(255, 255, 255, 0.2)',
    trackBuffered: 'rgba(255, 255, 255, 0.4)',
    trackProgress: '#FFFFFF',
} as const;

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