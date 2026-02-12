import React, { forwardRef, useCallback, useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, EyeOff, Trash2 } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InfiniteFeedMoreOptionsSheetProps {
    onDeletePress?: () => void;
    onSheetStateChange?: (isOpen: boolean) => void;
}

export const InfiniteFeedMoreOptionsSheet = forwardRef<BottomSheet, InfiniteFeedMoreOptionsSheetProps>(
    ({ onDeletePress, onSheetStateChange }, ref) => {
        const { isDark } = useThemeStore();
        const insets = useSafeAreaInsets();

        const topOffset = insets.top + 60 + 25;
        const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [topOffset]);

        const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
        const bgColor = isDark ? '#1c1c1e' : themeColors.background;
        const handleColor = isDark ? '#fff' : '#000';
        const textColor = isDark ? '#fff' : '#000';
        const borderColor = isDark ? '#333' : '#e5e5e5';

        const handleDeletePress = () => {
            onDeletePress?.();
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.close();
            }
        };
        const handleAnimate = useCallback((_fromIndex: number, toIndex: number) => {
            if (toIndex > 0 && ref && typeof ref !== 'function' && ref.current) {
                ref.current.snapToIndex(0);
            }
        }, [ref]);
        const handleChange = useCallback((index: number) => {
            onSheetStateChange?.(index >= 0);
        }, [onSheetStateChange]);

        return (
            <BottomSheet
                ref={ref}
                index={-1}
                snapPoints={snapPoints}
                onAnimate={handleAnimate}
                onChange={handleChange}
                enablePanDownToClose={true}
                enableContentPanningGesture={false}
                enableHandlePanningGesture={true}
                backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
                handleIndicatorStyle={{ backgroundColor: handleColor }}
            >
                <BottomSheetView style={styles.contentContainer}>
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
    optionLabel: {
        fontSize: 16,
        marginLeft: 16,
    },
});
