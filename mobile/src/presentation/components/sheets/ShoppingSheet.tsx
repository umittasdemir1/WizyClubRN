import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShoppingSheetProps {
    // Add props if needed, e.g. products
}

export const ShoppingSheet = forwardRef<BottomSheet, ShoppingSheetProps>((props, ref) => {
    const modalTheme = useSurfaceTheme();
    const { isDark } = modalTheme;
    const insets = useSafeAreaInsets();

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const textColor = modalTheme.textPrimary;

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            backgroundStyle={modalTheme.styles.sheetBackground}
            handleIndicatorStyle={modalTheme.styles.sheetHandle}
        >
            <BottomSheetView style={styles.contentContainer}>
                <Text style={[styles.title, { color: textColor }]}>Shop Products</Text>
                <View style={[styles.placeholder, { backgroundColor: modalTheme.sheetCard }]}>
                    <Text style={[styles.placeholderText, { color: modalTheme.textSecondary }]}>Product List Here</Text>
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
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    placeholder: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 14,
    },
});
