import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

interface DescriptionSheetProps {
    description?: string;
}

export const DescriptionSheet = forwardRef<BottomSheet, DescriptionSheetProps>(({ description }, ref) => {
    const snapPoints = useMemo(() => ['40%'], []);

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: '#1a1a1a' }}
            handleIndicatorStyle={{ backgroundColor: 'white' }}
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
