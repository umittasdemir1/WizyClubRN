import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { Image } from 'expo-image';

// ===================================
// 📱 HAPTICS
// ===================================
export const hapticLight = () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
};

export const hapticMedium = () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
};

export const hapticHeavy = () => {
    if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
};

export const hapticSuccess = () => {
    if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
};

export const hapticWarning = () => {
    if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
};

export const hapticError = () => {
    if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
};

// ===================================
// ⏱️ TIME FORMATTING
// ===================================
export const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ===================================
// 🔢 NUMBER FORMATTING
// ===================================
export const formatCount = (count: number): string => {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
};

// ===================================
// 🎯 CLAMP
// ===================================
export const clamp = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
};

// ===================================
// 📐 PERCENTAGE
// ===================================
export const toPercentage = (value: number, total: number): number => {
    if (total <= 0) return 0;
    return clamp(value / total, 0, 1);
};

// ===================================
// 🎬 VIDEO CACHE & PRELOAD
// ===================================
/**
 * Preloads video thumbnails for smooth scrolling
 * Uses expo-image's built-in cache system
 */
export const preloadThumbnails = async (thumbnailUrls: string[]): Promise<void> => {
    try {
        const validUrls = thumbnailUrls.filter(url => url && typeof url === 'string');
        if (validUrls.length === 0) return;

        // Preload thumbnails in parallel
        await Promise.all(
            validUrls.map(url => Image.prefetch(url).catch(err => {
                // Silently fail - don't block UI
                if (__DEV__) {
                    console.warn('Thumbnail preload failed:', url, err);
                }
            }))
        );
    } catch (error) {
        // Silently fail - preload is optimization, not critical
        if (__DEV__) {
            console.warn('Preload batch failed:', error);
        }
    }
};
