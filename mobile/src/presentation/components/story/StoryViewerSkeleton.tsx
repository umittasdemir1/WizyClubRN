import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { DARK_COLORS, LIGHT_COLORS } from '../../../core/constants';
import { ThinSpinner } from '../shared/ThinSpinner';

export function StoryViewerSkeleton() {
    const { isDark } = useThemeStore();
    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.videoBackground }]}>
            <ThinSpinner size={80} color="#FFFFFF" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
