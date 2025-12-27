import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Trash2 } from 'lucide-react-native';
import SunIcon from '../../../../assets/icons/sun.svg';
import { useBrightnessStore } from '../../store/useBrightnessStore';

interface SideOptionsSheetProps {
    visible: boolean;
    onClose: () => void;
    onDeletePress?: () => void;
}

const SHEET_WIDTH = 240;

export function SideOptionsSheet({ visible, onClose, onDeletePress }: SideOptionsSheetProps) {
    const insets = useSafeAreaInsets();
    const translateX = useSharedValue(SHEET_WIDTH);
    const overlayOpacity = useSharedValue(0);

    const { brightness, toggleController } = useBrightnessStore();
    const isBrightnessActive = brightness < 1.0;

    useEffect(() => {
        translateX.value = withTiming(visible ? 0 : SHEET_WIDTH, { duration: 220 });
        overlayOpacity.value = withTiming(visible ? 0.35 : 0, { duration: 200 });
    }, [visible]);

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
    }));

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View
                style={[styles.overlay, overlayStyle]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            <Animated.View
                style={[
                    styles.sheet,
                    { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
                    sheetStyle,
                ]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <Text style={styles.title}>Seçenekler</Text>

                <Pressable style={styles.option} onPress={toggleController}>
                    <SunIcon
                        width={24}
                        height={24}
                        color={isBrightnessActive ? '#FFD700' : '#FFFFFF'}
                    />
                    <Text style={styles.optionLabel}>Parlaklık</Text>
                </Pressable>

                {onDeletePress && (
                    <Pressable style={styles.option} onPress={onDeletePress}>
                        <Trash2 width={24} height={24} color="#FF6B6B" />
                        <Text style={[styles.optionLabel, styles.destructive]}>Sil</Text>
                    </Pressable>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 98,
    },
    sheet: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width: SHEET_WIDTH,
        backgroundColor: 'rgba(22,22,22,0.95)',
        paddingHorizontal: 18,
        paddingBottom: 24,
        gap: 12,
        zIndex: 99,
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(255,255,255,0.08)',
    },
    title: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    optionLabel: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
    destructive: {
        color: '#FF6B6B',
    },
});
