import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { Flag, EyeOff, AlertTriangle } from 'lucide-react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

interface MoreOptionsSheetProps {
    // callbacks
}

export const MoreOptionsSheet = forwardRef<BottomSheet, MoreOptionsSheetProps>((props, ref) => {
    const { isDark } = useThemeStore();
    const snapPoints = useMemo(() => ['30%'], []);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enablePanDownToClose
            backgroundStyle={{ backgroundColor: bgColor, borderTopLeftRadius: 40, borderTopRightRadius: 40 }}
            handleIndicatorStyle={{ backgroundColor: isDark ? 'white' : 'black' }}
        >
            <BottomSheetView style={styles.contentContainer}>
                <OptionItem icon={<Flag color="white" size={24} />} label="Report" />
                <OptionItem icon={<EyeOff color="white" size={24} />} label="Not Interested" />
                <OptionItem icon={<AlertTriangle color="white" size={24} />} label="Something else" />
            </BottomSheetView>
        </BottomSheet>
    );
});

function OptionItem({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <TouchableOpacity style={styles.optionItem}>
            {icon}
            <Text style={styles.optionLabel}>{label}</Text>
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
        borderBottomColor: '#333',
    },
    optionLabel: {
        color: 'white',
        fontSize: 16,
        marginLeft: 16,
    },
});
