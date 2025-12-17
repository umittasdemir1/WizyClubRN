import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TrendingHeaderProps {
    title?: string;
    onSearchPress?: () => void;
    onAddPress?: () => void;
    isDark?: boolean;
}

export function TrendingHeader({
    title = 'Şimdi Keşfet',
    onSearchPress,
    onAddPress,
    isDark = true,
}: TrendingHeaderProps) {
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const iconColor = isDark ? '#FFFFFF' : '#000000';
    const btnBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: btnBg }]}
                onPress={onSearchPress}
            >
                <Search size={22} color={iconColor} />
            </TouchableOpacity>

            <Text style={[styles.title, { color: textColor }]}>{title}</Text>

            <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: btnBg }]}
                onPress={onAddPress}
            >
                <Plus size={24} color={iconColor} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
