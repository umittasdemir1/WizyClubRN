import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Search } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TrendingHeaderProps {
    title?: string;
    onSearchPress?: () => void;
    isDark?: boolean;
    rightElement?: React.ReactNode;
    showSearch?: boolean;
}

export function TrendingHeader({
    title = 'Şimdi Keşfet',
    onSearchPress,
    isDark = true,
    rightElement,
    showSearch = true,
}: TrendingHeaderProps) {
    const insets = useSafeAreaInsets();
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const iconColor = isDark ? '#FFFFFF' : '#000000';
    const btnBg = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
            <Text style={[styles.title, { color: textColor }]}>{title}</Text>

            {rightElement ? (
                rightElement
            ) : showSearch ? (
                <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: btnBg }]}
                    onPress={onSearchPress}
                >
                    <Search size={22} color={iconColor} />
                </TouchableOpacity>
            ) : (
                <View style={{ width: 44 }} /> 
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 8,
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
