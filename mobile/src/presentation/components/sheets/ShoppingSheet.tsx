import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useModalSheetTheme } from '../../hooks/useModalSheetTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ShoppingSheetProps {
    // Add props if needed, e.g. products
}

export const ShoppingSheet = forwardRef<BottomSheet, ShoppingSheetProps>((props, ref) => {
    const modalTheme = useModalSheetTheme();
    const { isDark } = modalTheme;
    const insets = useSafeAreaInsets();

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const bgColor = modalTheme.sheetBackground;
    const handleColor = modalTheme.sheetHandle;
    const textColor = modalTheme.textPrimary;

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
            handleIndicatorStyle={{ backgroundColor: handleColor }}
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
