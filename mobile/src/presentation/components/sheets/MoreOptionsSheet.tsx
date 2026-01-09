import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, EyeOff, AlertTriangle, Minimize2, Maximize2, Trash2, LampDesk } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useActiveVideoStore } from '../../store/useActiveVideoStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MoreOptionsSheetProps {
    onCleanScreenPress?: () => void;
    onDeletePress?: () => void;
    isCleanScreen?: boolean;
}

export const MoreOptionsSheet = forwardRef<BottomSheet, MoreOptionsSheetProps>(
    ({ onCleanScreenPress, onDeletePress, isCleanScreen = false }, ref) => {
    const { isDark } = useThemeStore();
    const insets = useSafeAreaInsets();
    const { brightness, setBrightness } = useBrightnessStore();
    const playbackRate = useActiveVideoStore((state) => state.playbackRate);
    const setPlaybackRate = useActiveVideoStore((state) => state.setPlaybackRate);

    const topOffset = insets.top + 60 + 25;
    const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [insets.top]);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;
    const handleColor = isDark ? '#fff' : '#000';
    const textColor = isDark ? '#fff' : '#000';
    const borderColor = isDark ? '#333' : '#e5e5e5';

    const handleCleanScreenPress = () => {
        onCleanScreenPress?.();
        if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.close();
        }
    };

    const eyeComfortLevels = [
        { label: '25%', value: 0.4 },
        { label: '50%', value: 0.6 },
        { label: '75%', value: 0.8 },
        { label: '100%', value: 1.0 },
    ];

    const getClosestLevel = (value: number) => {
        return eyeComfortLevels.reduce((closest, level) => {
            return Math.abs(level.value - value) < Math.abs(closest.value - value) ? level : closest;
        }, eyeComfortLevels[0]);
    };

    const activeEyeComfort = getClosestLevel(brightness).label;
    const speedLevels = [
        { label: '0.5x', value: 0.5 },
        { label: '1x', value: 1.0 },
        { label: '1.5x', value: 1.5 },
        { label: '2x', value: 2.0 },
    ];
    const activeSpeed = speedLevels.reduce((closest, level) => {
        return Math.abs(level.value - playbackRate) < Math.abs(closest.value - playbackRate) ? level : closest;
    }, speedLevels[0]).label;

    const handleDeletePress = () => {
        onDeletePress?.();
        if (ref && typeof ref !== 'function' && ref.current) {
            ref.current.close();
        }
    };

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
                <OptionItem
                    icon={isCleanScreen ? <Minimize2 color={textColor} size={24} /> : <Maximize2 color={textColor} size={24} />}
                    label="Temiz Ekran"
                    textColor={textColor}
                    borderColor={borderColor}
                    onPress={handleCleanScreenPress}
                />
                <SegmentedItem
                    icon={<LampDesk color={textColor} size={24} />}
                    label="Göz Rahatlığı"
                    textColor={textColor}
                    borderColor={borderColor}
                    activeLabel={activeEyeComfort}
                    onSelect={(label) => {
                        const selected = eyeComfortLevels.find((level) => level.label === label);
                        if (selected) {
                            setBrightness(selected.value);
                        }
                    }}
                    options={eyeComfortLevels.map((level) => level.label)}
                    isDark={isDark}
                />
                <SegmentedItem
                    icon={<Text style={[styles.speedIcon, { color: textColor }]}>1x</Text>}
                    label="Hız"
                    textColor={textColor}
                    borderColor={borderColor}
                    activeLabel={activeSpeed}
                    onSelect={(label) => {
                        const selected = speedLevels.find((level) => level.label === label);
                        if (selected) {
                            setPlaybackRate(selected.value);
                        }
                    }}
                    options={speedLevels.map((level) => level.label)}
                    isDark={isDark}
                />
                {onDeletePress && (
                    <OptionItem
                        icon={<Trash2 color={textColor} size={24} />}
                        label="Sil"
                        textColor={textColor}
                        borderColor={borderColor}
                        onPress={handleDeletePress}
                    />
                )}
                <OptionItem icon={<Flag color={textColor} size={24} />} label="Raporla" textColor={textColor} borderColor={borderColor} />
                <OptionItem icon={<EyeOff color={textColor} size={24} />} label="İlgilenmiyorum" textColor={textColor} borderColor={borderColor} />
                <OptionItem icon={<AlertTriangle color={textColor} size={24} />} label="Başka bir şey" textColor={textColor} borderColor={borderColor} />
            </BottomSheetView>
        </BottomSheet>
    );
});

function OptionItem({
    icon,
    label,
    textColor,
    borderColor,
    onPress,
    labelColor,
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    labelColor?: string;
    borderColor: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: borderColor }]}
            onPress={onPress}
        >
            {icon}
            <Text style={[styles.optionLabel, { color: labelColor || textColor }]}>{label}</Text>
        </TouchableOpacity>
    );
}

function SegmentedItem({
    icon,
    label,
    textColor,
    borderColor,
    activeLabel,
    onSelect,
    options,
    isDark,
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    borderColor: string;
    activeLabel: string;
    onSelect: (label: string) => void;
    options: string[];
    isDark: boolean;
}) {
    const activeFill = isDark ? '#f4f4f5' : '#111';
    const activeText = isDark ? '#111' : '#fff';

    return (
        <View style={[styles.optionItem, { borderBottomColor: borderColor }]}>
            <View style={styles.optionLeft}>
                {icon}
                <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
            </View>
            <View style={styles.segmentedGroup}>
                {options.map((option) => {
                    const isActive = option === activeLabel;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[styles.segmentedOption, isActive && { backgroundColor: activeFill }]}
                            onPress={() => onSelect(option)}
                        >
                            <Text style={[styles.segmentedText, { color: isActive ? activeText : textColor }]}>
                                {option}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        padding: 16,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionLabel: {
        fontSize: 16,
        marginLeft: 16,
    },
    segmentedGroup: {
        flexDirection: 'row',
        overflow: 'hidden',
        marginLeft: 'auto',
    },
    segmentedOption: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentedText: {
        fontSize: 16,
    },
    speedIcon: {
        width: 24,
        textAlign: 'center',
        fontSize: 14,
        fontWeight: '600',
    },
});
