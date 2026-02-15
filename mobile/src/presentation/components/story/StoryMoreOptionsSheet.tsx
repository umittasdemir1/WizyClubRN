import React, { forwardRef, useCallback, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Archive, Ban, EyeOff, Flag, Pencil, Star, Trash2 } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface StoryMoreOptionsSheetProps {
    isOwnStory?: boolean;
    onEditPress?: () => void;
    onDeletePress?: () => void;
    onArchivePress?: () => void;
    onFeaturePress?: () => void;
    onReportPress?: () => void;
    onNotInterestedPress?: () => void;
    onBlockPress?: () => void;
    onSheetStateChange?: (isOpen: boolean) => void;
}

export const StoryMoreOptionsSheet = forwardRef<BottomSheet, StoryMoreOptionsSheetProps>(
    ({
        isOwnStory = false,
        onEditPress,
        onDeletePress,
        onArchivePress,
        onFeaturePress,
        onReportPress,
        onNotInterestedPress,
        onBlockPress,
        onSheetStateChange,
    }, ref) => {
        const { isDark } = useThemeStore();
        const insets = useSafeAreaInsets();

        const topOffset = insets.top + 60 + 25;
        const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [topOffset]);

        const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
        const bgColor = isDark ? '#1c1c1e' : themeColors.background;
        const handleColor = isDark ? '#fff' : '#000';
        const textColor = isDark ? '#fff' : '#000';
        const borderColor = isDark ? '#333' : '#e5e5e5';

        const handleAnimate = useCallback((_fromIndex: number, toIndex: number) => {
            if (toIndex > 0 && ref && typeof ref !== 'function' && ref.current) {
                ref.current.snapToIndex(0);
            }
        }, [ref]);

        const handleChange = useCallback((index: number) => {
            onSheetStateChange?.(index >= 0);
        }, [onSheetStateChange]);

        const closeSheet = useCallback(() => {
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.close();
            }
        }, [ref]);

        const handlePress = useCallback((callback?: () => void) => {
            callback?.();
            closeSheet();
        }, [closeSheet]);

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
                <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}>
                    {isOwnStory ? (
                        <>
                            <OptionItem
                                icon={<Pencil color={textColor} size={24} strokeWidth={1.2} />}
                                label="Düzenle"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onEditPress)}
                            />
                            <OptionItem
                                icon={<Trash2 color={textColor} size={24} strokeWidth={1.2} />}
                                label="Sil"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onDeletePress)}
                            />
                            <OptionItem
                                icon={<Archive color={textColor} size={24} strokeWidth={1.2} />}
                                label="Arşivle"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onArchivePress)}
                            />
                            <OptionItem
                                icon={<Star color={textColor} size={24} strokeWidth={1.2} />}
                                label="Öne Çıkar"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onFeaturePress)}
                                isLast
                            />
                        </>
                    ) : (
                        <>
                            <OptionItem
                                icon={<Flag color={textColor} size={24} strokeWidth={1.2} />}
                                label="Raporla"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onReportPress)}
                            />
                            <OptionItem
                                icon={<EyeOff color={textColor} size={24} strokeWidth={1.2} />}
                                label="İlgilenmiyorum"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onNotInterestedPress)}
                            />
                            <OptionItem
                                icon={<Ban color={textColor} size={24} strokeWidth={1.2} />}
                                label="Engelle"
                                textColor={textColor}
                                borderColor={borderColor}
                                onPress={() => handlePress(onBlockPress)}
                                isLast
                            />
                        </>
                    )}
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
    isLast = false,
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
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
            <Text style={[styles.optionLabel, { color: textColor }]}>{label}</Text>
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
