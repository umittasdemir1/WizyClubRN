import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, EyeOff, Trash2, LampDesk } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';
import { useBrightnessStore } from '../../store/useBrightnessStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InfiniteFeedMoreOptionsSheetProps {
    onDeletePress?: () => void;
}

export const InfiniteFeedMoreOptionsSheet = forwardRef<BottomSheet, InfiniteFeedMoreOptionsSheetProps>(
    ({ onDeletePress }, ref) => {
        const { isDark } = useThemeStore();
        const insets = useSafeAreaInsets();
        const { brightness, setBrightness } = useBrightnessStore();

        const topOffset = insets.top + 60 + 25;
        const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [topOffset]);

        const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
        const bgColor = isDark ? '#1c1c1e' : themeColors.background;
        const handleColor = isDark ? '#fff' : '#000';
        const textColor = isDark ? '#fff' : '#000';
        const borderColor = isDark ? '#333' : '#e5e5e5';

        const eyeComfortLevels = [
            { label: 'Yumuşak', value: 0.33 },
            { label: 'Dinlendirici', value: 0.66 },
            { label: 'Doğal', value: 1.0 },
        ];

        const getClosestLevel = (value: number) => {
            return eyeComfortLevels.reduce((closest, level) => {
                return Math.abs(level.value - value) < Math.abs(closest.value - value) ? level : closest;
            }, eyeComfortLevels[0]);
        };

        const activeEyeComfort = getClosestLevel(brightness).label;

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
                    <SegmentedItem
                        icon={<LampDesk color={textColor} size={24} strokeWidth={1.2} />}
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
                    {onDeletePress && (
                        <OptionItem
                            icon={<Trash2 color={textColor} size={24} strokeWidth={1.2} />}
                            label="Sil"
                            textColor={textColor}
                            borderColor={borderColor}
                            onPress={handleDeletePress}
                        />
                    )}
                    <OptionItem icon={<Flag color={textColor} size={24} strokeWidth={1.2} />} label="Raporla" textColor={textColor} borderColor={borderColor} />
                    <OptionItem
                        icon={<EyeOff color={textColor} size={24} strokeWidth={1.2} />}
                        label="İlgilenmiyorum"
                        textColor={textColor}
                        borderColor={borderColor}
                        isLast
                    />
                </BottomSheetView>
            </BottomSheet>
        );
    }
);

function OptionItem({
    icon,
    label,
    textColor,
    borderColor,
    onPress,
    labelColor,
    isLast = false,
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    labelColor?: string;
    borderColor: string;
    onPress?: () => void;
    isLast?: boolean;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.optionItem,
                { borderBottomColor: borderColor },
                isLast && styles.optionItemLast,
            ]}
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
    isLast = false,
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    borderColor: string;
    activeLabel: string;
    onSelect: (label: string) => void;
    options: string[];
    isDark: boolean;
    isLast?: boolean;
}) {
    const activeFill = '#FF3B30';
    const activeText = '#FFFFFF';
    const groupFill = isDark ? '#2c2c2e' : '#ededf0';

    return (
        <View
            style={[
                styles.optionItem,
                { borderBottomColor: borderColor },
                isLast && styles.optionItemLast,
            ]}
        >
            <View style={styles.optionLeft}>
                {icon}
                <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
            </View>
            <View style={[styles.segmentedGroup, { backgroundColor: groupFill }]}>
                {options.map((option) => {
                    const isActive = option === activeLabel;
                    return (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.segmentedOption,
                                isActive && { backgroundColor: activeFill },
                            ]}
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
    optionItemLast: {
        borderBottomWidth: 0,
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
        borderRadius: 12,
        padding: 2,
        overflow: 'hidden',
        marginLeft: 'auto',
    },
    segmentedOption: {
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    segmentedText: {
        fontSize: 11,
        fontWeight: '400',
    },
});
