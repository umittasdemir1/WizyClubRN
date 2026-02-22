import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const OPTION_ROW_HEIGHT = 56;
const SHEET_HANDLE_SPACE = 24;
const SHEET_CONTENT_VERTICAL_PADDING = 32; // 16 top + 16 bottom
const SHEET_BOTTOM_BREATHING_ROOM = 12;

interface FeedMoreOptionsSheetBaseProps {
    optionCount: number;
    children: React.ReactNode;
    onSheetStateChange?: (isOpen: boolean) => void;
}

export const FeedMoreOptionsSheetBase = forwardRef<BottomSheetModal, FeedMoreOptionsSheetBaseProps>(
    ({ optionCount, children, onSheetStateChange }, ref) => {
        const modalTheme = useSurfaceTheme();
        const insets = useSafeAreaInsets();

        const snapPoints = useMemo(() => {
            const desiredHeight =
                (optionCount * OPTION_ROW_HEIGHT) +
                SHEET_CONTENT_VERTICAL_PADDING +
                SHEET_HANDLE_SPACE +
                insets.bottom +
                SHEET_BOTTOM_BREATHING_ROOM;
            const maxHeight = SCREEN_HEIGHT - (insets.top + 60 + 25);
            return [Math.min(desiredHeight, maxHeight)];
        }, [insets.bottom, insets.top, optionCount]);

        const handleChange = useCallback((index: number) => {
            onSheetStateChange?.(index >= 0);
        }, [onSheetStateChange]);

        return (
            <BottomSheetModal
                ref={ref}
                index={0}
                snapPoints={snapPoints}
                onChange={handleChange}
                onDismiss={() => onSheetStateChange?.(false)}
                enablePanDownToClose={true}
                enableContentPanningGesture={true}
                enableHandlePanningGesture={true}
                backgroundStyle={modalTheme.styles.sheetBackground}
                handleIndicatorStyle={modalTheme.styles.sheetHandle}
            >
                <BottomSheetView
                    style={[
                        styles.contentContainer,
                        { paddingBottom: 16 + insets.bottom + 12 },
                    ]}
                >
                    {children}
                </BottomSheetView>
            </BottomSheetModal>
        );
    }
);

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        padding: 16,
    },
});
