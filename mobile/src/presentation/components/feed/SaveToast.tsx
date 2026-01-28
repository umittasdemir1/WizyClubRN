/**
 * SaveToast - Animated notification for save actions
 *
 * Displays a toast at the top of the screen when a user saves or unsaves a video.
 * Extracted from FeedOverlays for better modularity.
 *
 * @module presentation/components/feed/SaveToast
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated as RNAnimated,
} from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FEED_COLORS } from './hooks/useFeedConfig';

interface SaveToastProps {
    /** Toast message to display */
    message: string | null;
    /** Whether the action was a "save" (active) or "unsave" */
    active: boolean;
    /** Animation: Opacity value */
    opacity: RNAnimated.Value;
    /** Animation: Y-axis translation value */
    translateY: RNAnimated.Value;
}

export const SaveToast: React.FC<SaveToastProps> = ({
    message,
    active,
    opacity,
    translateY,
}) => {
    const insets = useSafeAreaInsets();

    if (!message) return null;

    return (
        <RNAnimated.View
            pointerEvents="none"
            style={[
                styles.saveToast,
                active ? styles.saveToastActive : styles.saveToastInactive,
                {
                    top: insets.top + 60,
                    opacity: opacity,
                    transform: [{ translateY: translateY }],
                },
            ]}
        >
            <View style={styles.saveToastContent}>
                <Bookmark
                    size={18}
                    color={FEED_COLORS.SAVE_ICON_ACTIVE}
                    fill={active ? FEED_COLORS.SAVE_ICON_ACTIVE : 'none'}
                    strokeWidth={1.6}
                />
                <Text style={[styles.saveToastText, styles.saveToastTextActive]}>
                    {message}
                </Text>
            </View>
        </RNAnimated.View>
    );
};

const styles = StyleSheet.create({
    saveToast: {
        position: 'absolute',
        alignSelf: 'center',
        zIndex: 300,
        minWidth: 280,
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 14,
        alignItems: 'center',
        overflow: 'hidden',
    },
    saveToastActive: {
        backgroundColor: '#2c2c2e',
    },
    saveToastInactive: {
        backgroundColor: '#2c2c2e',
    },
    saveToastText: {
        fontSize: 17,
        fontWeight: '400',
        zIndex: 1,
    },
    saveToastTextActive: {
        color: '#FFFFFF',
    },
    saveToastContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
