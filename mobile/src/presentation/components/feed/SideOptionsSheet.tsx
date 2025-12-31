import React, { forwardRef, useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, LayoutChangeEvent } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    withTiming,
    Easing
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import SunIcon from '../../../../assets/icons/sun.svg';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SideOptionsSheetProps {
    onDeletePress?: () => void;
}

// Separate component for real-time slider
const BrightnessSlider = ({
    initialValue,
    onValueChange,
    isDark,
}: {
    initialValue: number;
    onValueChange: (val: number) => void;
    isDark: boolean;
}) => {
    const sliderWidth = useSharedValue(0);
    // Use SharedValue for instant UI updates
    const progress = useSharedValue((initialValue - 0.3) / 0.7);

    // 🔥 FIX: Use React state for text display instead of reading .value during render
    const [displayPercent, setDisplayPercent] = useState(Math.round(initialValue * 100));

    const syncToStore = useCallback((val: number) => {
        onValueChange(val);
        setDisplayPercent(Math.round(val * 100)); // Also update display
    }, [onValueChange]);

    const triggerHaptic = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const pan = Gesture.Pan()
        .onStart((e) => {
            'worklet';
            const width = sliderWidth.value;
            if (width > 0) {
                const newProgress = Math.min(Math.max(e.x / width, 0), 1);
                progress.value = newProgress;
                const newValue = 0.3 + (newProgress * 0.7);
                runOnJS(syncToStore)(newValue);
                runOnJS(triggerHaptic)();
            }
        })
        .onUpdate((e) => {
            'worklet';
            const width = sliderWidth.value;
            if (width > 0) {
                const newProgress = Math.min(Math.max(e.x / width, 0), 1);
                progress.value = newProgress;
                const newValue = 0.3 + (newProgress * 0.7);
                runOnJS(syncToStore)(newValue);
            }
        });

    const tap = Gesture.Tap()
        .onStart((e) => {
            'worklet';
            const width = sliderWidth.value;
            if (width > 0) {
                const newProgress = Math.min(Math.max(e.x / width, 0), 1);
                progress.value = withTiming(newProgress, { duration: 100, easing: Easing.out(Easing.ease) });
                const newValue = 0.3 + (newProgress * 0.7);
                runOnJS(syncToStore)(newValue);
                runOnJS(triggerHaptic)();
            }
        });

    const composed = Gesture.Race(pan, tap);

    const handleLayout = useCallback((e: LayoutChangeEvent) => {
        sliderWidth.value = e.nativeEvent.layout.width;
    }, []);

    // Animated styles for instant visual feedback
    const animatedFillStyle = useAnimatedStyle(() => ({
        width: `${progress.value * 100}%`,
    }));

    const animatedThumbStyle = useAnimatedStyle(() => ({
        left: `${progress.value * 100}%`,
    }));

    const trackBg = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
    const fillColor = isDark ? '#FFF' : '#000';

    return (
        <View style={styles.sliderWrapper} onLayout={handleLayout}>
            <GestureDetector gesture={composed}>
                <View style={styles.touchArea}>
                    <View style={[styles.sliderTrack, { backgroundColor: trackBg }]}>
                        <Animated.View
                            style={[
                                styles.sliderFill,
                                { backgroundColor: fillColor },
                                animatedFillStyle
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.sliderThumb,
                                { backgroundColor: fillColor },
                                animatedThumbStyle
                            ]}
                        />
                    </View>
                </View>
            </GestureDetector>
            <Text style={[styles.brightnessValue, { color: isDark ? '#888' : '#555' }]}>
                {displayPercent}%
            </Text>
        </View>
    );
};

export const SideOptionsSheet = forwardRef<BottomSheet, SideOptionsSheetProps>(
    ({ onDeletePress }, ref) => {
        const insets = useSafeAreaInsets();
        const { isDark } = useThemeStore();
        const { brightness, setBrightness } = useBrightnessStore();

        const topOffset = insets.top + 60 + 25;
        const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

        const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
        const bgColor = isDark ? '#1c1c1e' : themeColors.background;
        const textColor = isDark ? '#fff' : '#000';
        const borderColor = isDark ? '#2c2c2e' : '#e5e5e5';
        const handleColor = isDark ? '#fff' : '#000';

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose={true}
                backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
                handleIndicatorStyle={{ backgroundColor: handleColor }}
            >
                <BottomSheetView style={styles.container}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: borderColor }]}>
                        <Text style={[styles.title, { color: textColor }]}>Seçenekler</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Brightness Section */}
                        <View style={[styles.section, { borderBottomColor: borderColor }]}>
                            <View style={styles.sectionHeader}>
                                <SunIcon
                                    width={24}
                                    height={24}
                                    color={brightness < 1.0 ? '#FFD700' : textColor}
                                />
                                <Text style={[styles.sectionTitle, { color: textColor }]}>Parlaklık</Text>
                            </View>

                            <BrightnessSlider
                                initialValue={brightness}
                                onValueChange={setBrightness}
                                isDark={isDark}
                            />
                        </View>

                        {/* Delete Button */}
                        {onDeletePress && (
                            <TouchableOpacity
                                style={[styles.deleteButton, { borderTopColor: borderColor }]}
                                onPress={() => {
                                    onDeletePress();
                                    if (ref && typeof ref !== 'function' && ref.current) {
                                        ref.current.close();
                                    }
                                }}
                            >
                                <Trash2 size={24} color="#FF6B6B" />
                                <Text style={styles.deleteText}>Sil</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    header: {
        paddingBottom: 15,
        marginBottom: 20,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    },
    section: {
        paddingBottom: 20,
        marginBottom: 20,
        borderBottomWidth: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    sliderWrapper: {
        width: '100%',
        paddingVertical: 10,
    },
    touchArea: {
        height: 44,
        justifyContent: 'center',
        width: '100%',
    },
    sliderTrack: {
        height: 4,
        width: '100%',
        borderRadius: 2,
        overflow: 'visible',
        position: 'relative',
    },
    sliderFill: {
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        borderRadius: 2,
    },
    sliderThumb: {
        position: 'absolute',
        top: -5,
        width: 14,
        height: 14,
        marginLeft: -7,
        borderRadius: 7,
    },
    brightnessValue: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '500',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingTop: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
    },
    deleteText: {
        color: '#FF6B6B',
        fontSize: 16,
        fontWeight: '600',
    },
});
