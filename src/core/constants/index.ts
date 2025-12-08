import { Dimensions } from 'react-native';

// ===================================
// 📐 SCREEN DIMENSIONS
// ===================================
export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// ===================================
// 🎨 COLORS
// ===================================
export const COLORS = {
    // Primary
    primary: '#FF3B30',
    accent: '#7C3AED',

    // Neutral
    white: '#FFFFFF',
    black: '#000000',

    // Background
    background: '#0B0B0F',
    card: '#111827',

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.6)',
    textMuted: '#94A3B8',

    // UI
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
    border: '#333333',

    // Status
    success: '#10B981',
    error: '#FF6B6B',
    warning: '#FFA500',

    // SeekBar
    trackBackground: 'rgba(255, 255, 255, 0.2)',
    trackBuffered: 'rgba(255, 255, 255, 0.4)',
    trackProgress: '#FFFFFF',
} as const;

// ===================================
// 📏 LAYOUT
// ===================================
export const LAYOUT = {
    // Tab Bar
    tabBarHeight: 60,

    // Padding
    horizontalPadding: 12,
    verticalPadding: 16,

    // Icons
    iconSmall: 24,
    iconMedium: 32,
    iconLarge: 40,

    // Touch targets
    minTouchTarget: 48,

    // Safe area fallback
    safeAreaTop: 44,
    safeAreaBottom: 34,
} as const;

// ===================================
// 🎬 VIDEO
// ===================================
export const VIDEO = {
    maxLoops: 2,
    preloadCount: 2,
    progressUpdateInterval: 33, // ~30fps
    bufferUpdateInterval: 1000,
} as const;

// ===================================
// ⚡ ANIMATION
// ===================================
export const ANIMATION = {
    // Durations
    fast: 100,
    medium: 150,
    slow: 300,

    // Spring config
    springFriction: 8,
    springTension: 100,
} as const;
