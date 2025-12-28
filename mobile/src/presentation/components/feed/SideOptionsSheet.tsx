import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { Trash2 } from 'lucide-react-native';
import SunIcon from '../../../../assets/icons/sun.svg';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SideOptionsSheetProps {
    onDeletePress?: () => void;
}

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
        const secondaryColor = isDark ? '#888' : '#555';
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
                            <View style={styles.sliderContainer}>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0.3}
                                    maximumValue={1.0}
                                    value={brightness}
                                    onValueChange={setBrightness}
                                    minimumTrackTintColor="#FFD700"
                                    maximumTrackTintColor={isDark ? '#444' : '#ddd'}
                                    thumbTintColor="#FFD700"
                                />
                                <Text style={[styles.brightnessValue, { color: secondaryColor }]}>
                                    {Math.round(brightness * 100)}%
                                </Text>
                            </View>
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
    sliderContainer: {
        paddingHorizontal: 8,
    },
    slider: {
        width: '100%',
        height: 40,
    },
    brightnessValue: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 4,
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
