import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Flag, EyeOff, AlertTriangle, Minimize2 } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MoreOptionsSheetProps {
    onCleanScreenPress?: () => void;
}

export const MoreOptionsSheet = forwardRef<BottomSheet, MoreOptionsSheetProps>(({ onCleanScreenPress }, ref) => {
    const { isDark } = useThemeStore();
    const insets = useSafeAreaInsets();

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
                    icon={<Minimize2 color={textColor} size={24} />}
                    label="Temiz Ekran"
                    textColor={textColor}
                    borderColor={borderColor}
                    onPress={handleCleanScreenPress}
                />
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
}: {
    icon: React.ReactNode;
    label: string;
    textColor: string;
    borderColor: string;
    onPress?: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.optionItem, { borderBottomColor: borderColor }]}
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
    optionLabel: {
        fontSize: 16,
        marginLeft: 16,
    },
});
