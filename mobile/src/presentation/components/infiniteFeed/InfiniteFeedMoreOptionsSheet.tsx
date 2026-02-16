import React, { forwardRef, useCallback, useMemo } from 'react';
import { Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, EyeOff, Trash2, Pencil } from 'lucide-react-native';
import { useSurfaceTheme } from '../../hooks/useSurfaceTheme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InfiniteFeedMoreOptionsSheetProps {
    onEditPress?: () => void;
    onDeletePress?: () => void;
    onSheetStateChange?: (isOpen: boolean) => void;
}

export const InfiniteFeedMoreOptionsSheet = forwardRef<BottomSheet, InfiniteFeedMoreOptionsSheetProps>(
    ({ onEditPress, onDeletePress, onSheetStateChange }, ref) => {
        const modalTheme = useSurfaceTheme();
        const insets = useSafeAreaInsets();

        const topOffset = insets.top + 60 + 25;
        const snapPoints = useMemo(() => [SCREEN_HEIGHT - topOffset], [topOffset]);

        const textColor = modalTheme.textPrimary;
        const borderColor = modalTheme.sheetBorder;

        const handleDeletePress = () => {
            onDeletePress?.();
            if (ref && typeof ref !== 'function' && ref.current) {
                ref.current.close();
            }
        };
        const handleEditPress = () => {
            onEditPress?.();
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
                backgroundStyle={modalTheme.styles.sheetBackground}
                handleIndicatorStyle={modalTheme.styles.sheetHandle}
            >
                <BottomSheetView style={styles.contentContainer}>
                    {onEditPress && (
                        <OptionItem
                            icon={<Pencil color={textColor} size={24} strokeWidth={1.2} />}
                            label="Düzenle"
                            textColor={textColor}
                            borderColor={borderColor}
                            onPress={handleEditPress}
                        />
                    )}
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
