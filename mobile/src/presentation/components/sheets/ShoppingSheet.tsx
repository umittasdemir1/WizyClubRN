import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

interface ShoppingSheetProps {
    // Add props if needed, e.g. products
}

export const ShoppingSheet = forwardRef<BottomSheet, ShoppingSheetProps>((props, ref) => {
    const { isDark } = useThemeStore();
    const snapPoints = useMemo(() => ['50%', '90%'], []);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;

    return (
        <BottomSheet
            ref={ref}
            index={-1} // Closed by default
            snapPoints={snapPoints}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
            handleIndicatorStyle={{ backgroundColor: isDark ? 'white' : 'black' }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <Text style={styles.title}>Shop Products</Text>
                <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>Product List Here</Text>
                </View>
            </BottomSheetView>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
    },
    title: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    placeholder: {
        width: '100%',
        height: 200,
        backgroundColor: '#333',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.5)',
    },
});
