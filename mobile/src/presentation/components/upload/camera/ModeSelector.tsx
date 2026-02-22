import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    NativeSyntheticEvent,
    NativeScrollEvent,
} from 'react-native';
import { textShadowStyle } from '@/core/utils/shadow';

export const MODES = ['HİKAYE', 'GÖNDERİ', 'TASLAK'];

interface ModeSelectorProps {
    selectedMode: string;
    setSelectedMode: (mode: string) => void;
    modeContainerWidth: number;
    setModeContainerWidth: (width: number) => void;
}

export const ModeSelector = ({
    selectedMode,
    setSelectedMode,
    modeContainerWidth,
    setModeContainerWidth,
}: ModeSelectorProps) => {
    const modeScrollRef = useRef<FlatList<string>>(null);
    const isProgrammaticScroll = useRef(false);
    const isDragging = useRef(false);

    useEffect(() => {
        if (!modeContainerWidth || isDragging.current) return;

        const selectedIndex = MODES.indexOf(selectedMode);
        if (selectedIndex >= 0) {
            isProgrammaticScroll.current = true;
            modeScrollRef.current?.scrollToIndex({ index: selectedIndex, animated: false });
            // Small delay to ensure onScroll events from scrollToIndex are ignored
            setTimeout(() => {
                isProgrammaticScroll.current = false;
            }, 100);
        }
    }, [modeContainerWidth, selectedMode]);

    const handleScrollUpdate = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isProgrammaticScroll.current) return;
        const index = Math.round(event.nativeEvent.contentOffset.x / 100);
        const clampedIndex = Math.max(0, Math.min(index, MODES.length - 1));
        if (MODES[clampedIndex] !== selectedMode) {
            setSelectedMode(MODES[clampedIndex]);
        }
    };

    return (
        <View
            style={[styles.modeSelector, styles.modeSelectorOverlay]}
            onLayout={(event) => setModeContainerWidth(event.nativeEvent.layout.width)}
        >
            <FlatList
                ref={modeScrollRef}
                data={MODES}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item: string) => item}
                getItemLayout={(_, index) => ({
                    length: 100,
                    offset: 100 * index,
                    index,
                })}
                contentContainerStyle={{
                    paddingHorizontal: modeContainerWidth > 0 ? (modeContainerWidth - 100) / 2 : 50,
                }}
                snapToInterval={100}
                snapToAlignment="start"
                decelerationRate="fast"
                onScrollBeginDrag={() => {
                    isDragging.current = true;
                }}
                onScrollEndDrag={() => {
                    isDragging.current = false;
                }}
                onMomentumScrollEnd={(event) => {
                    isDragging.current = false;
                    handleScrollUpdate(event);
                }}
                onScroll={(event) => {
                    // Update visuals real-time if needed, but state update is safer in onMomentumScrollEnd
                    // or carefully guarded here.
                    if (!isProgrammaticScroll.current && isDragging.current) {
                        handleScrollUpdate(event);
                    }
                }}
                scrollEventThrottle={16}
                renderItem={({ item, index }: { item: string; index: number }) => (
                    <Pressable
                        onPress={() => {
                            isProgrammaticScroll.current = true;
                            setSelectedMode(item);
                            modeScrollRef.current?.scrollToIndex({ index, animated: true });
                            setTimeout(() => {
                                isProgrammaticScroll.current = false;
                            }, 300);
                        }}
                        style={styles.modeButton}
                    >
                        <Text
                            style={[
                                styles.modeText,
                                selectedMode === item ? styles.modeTextActive : styles.modeTextInactive,
                            ]}
                        >
                            {item}
                        </Text>
                    </Pressable>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeSelectorOverlay: {
        position: 'absolute',
        left: 90,
        right: 90,
        bottom: 35,
        height: 34,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    modeSelectorShift: {
        // No shift needed when placed correctly inside camera container
    },
    modeButton: {
        width: 100,
        paddingVertical: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 17,
        fontWeight: '500',
    },
    modeTextInactive: {
        opacity: 0.72,
    },
    modeTextActive: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        ...textShadowStyle('rgba(0, 0, 0, 0.5)', { width: 0, height: 1 }, 2),
    },
});
