import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

interface ShoppingSheetProps {
    // Add props if needed, e.g. products
}

export const ShoppingSheet = forwardRef<BottomSheet, ShoppingSheetProps>((props, ref) => {
    const snapPoints = useMemo(() => ['50%', '90%'], []);

    return (
        <BottomSheet
            ref={ref}
            index={-1} // Closed by default
            snapPoints={snapPoints}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: '#1a1a1a', borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
            handleIndicatorStyle={{ backgroundColor: 'white' }}
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
