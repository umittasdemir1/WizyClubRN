import React, { forwardRef, useCallback, useMemo } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Archive, Ban, EyeOff, Flag, Pencil, Star, Trash2 } from 'lucide-react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

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
        const modalTheme = useSurfaceTheme();
        const insets = useSafeAreaInsets();

        const topOffset = insets.top + 60 + 25;
        const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [topOffset]);

        const textColor = modalTheme.textPrimary;
        const borderColor = modalTheme.sheetBorder;

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
                backgroundStyle={modalTheme.styles.sheetBackground}
                handleIndicatorStyle={modalTheme.styles.sheetHandle}
            >
                <BottomSheetView style={[styles.contentContainer, { paddingBottom: insets.bottom + 16 }]}>
                    {isOwnStory ? (
                        <>
                            <OptionItem
                                icon={<Pencil color={textColor} size={24} strokeWidth={1.2} />}
                                label="Düzenle"
                                textColor={textColor}
                                borderColor={borderColor}
                                borderWidth={modalTheme.separatorWidth}
                                onPress={() => handlePress(onEditPress)}
                            />
                            <OptionItem
                                icon={<Trash2 color={textColor} size={24} strokeWidth={1.2} />}
                                label="Sil"
                                textColor={textColor}
                                borderColor={borderColor}
                                borderWidth={modalTheme.separatorWidth}
                                onPress={() => handlePress(onDeletePress)}
                            />
                            <OptionItem
                                icon={<Archive color={textColor} size={24} strokeWidth={1.2} />}
                                label="Arşivle"
                                textColor={textColor}
                                borderColor={borderColor}
                                borderWidth={modalTheme.separatorWidth}
                                onPress={() => handlePress(onArchivePress)}
                            />
                            <OptionItem
                                icon={<Star color={textColor} size={24} strokeWidth={1.2} />}
                                label="Öne Çıkar"
                                textColor={textColor}
                                borderColor={borderColor}
                                borderWidth={modalTheme.separatorWidth}
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
                                borderWidth={modalTheme.separatorWidth}
                                onPress={() => handlePress(onReportPress)}
                            />
                            <OptionItem
                                icon={<EyeOff color={textColor} size={24} strokeWidth={1.2} />}
                                label="İlgilenmiyorum"
                                textColor={textColor}
                                borderColor={borderColor}
                                borderWidth={modalTheme.separatorWidth}
                                onPress={() => handlePress(onNotInterestedPress)}
                            />
                            <OptionItem
                                icon={<Ban color={textColor} size={24} strokeWidth={1.2} />}
                                label="Engelle"
                                textColor={textColor}
                                borderColor={borderColor}
                                borderWidth={modalTheme.separatorWidth}
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
    borderWidth,
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    borderColor: string;
    onPress?: () => void;
    isLast?: boolean;
    borderWidth?: number;
}) {
    return (
        <TouchableOpacity
            style={[
                styles.optionItem,
                { borderBottomColor: borderColor, borderBottomWidth: borderWidth ?? 1 },
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
    },
    optionItemLast: {
        borderBottomWidth: 0,
    },
    optionLabel: {
        fontSize: 16,
        marginLeft: 16,
    },
});
