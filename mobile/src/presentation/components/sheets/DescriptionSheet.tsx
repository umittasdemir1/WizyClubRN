import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

interface DescriptionSheetProps {
    description?: string;
}

export const DescriptionSheet = forwardRef<BottomSheet, DescriptionSheetProps>(({ description }, ref) => {
    const { isDark } = useThemeStore();
    const snapPoints = useMemo(() => ['40%'], []);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
            handleIndicatorStyle={{ backgroundColor: isDark ? 'white' : 'black' }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <Text style={styles.title}>Description</Text>
                <Text style={styles.text}>{description || 'No description available.'}</Text>
            </BottomSheetView>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        padding: 16,
    },
    title: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    text: {
        color: 'white',
        fontSize: 16,
        lineHeight: 24,
    },
});
