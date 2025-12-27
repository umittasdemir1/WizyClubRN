import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

interface CategoryCardProps {
    title: string;
    icon?: string;
    iconType?: 'image' | 'dots';
    backgroundColor: string;
    onPress?: () => void;
    isDark?: boolean;
}

export function CategoryCard({
    title,
    icon,
    iconType = 'image',
    backgroundColor,
    onPress,
    isDark = false,
}: CategoryCardProps) {
    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.iconContainer}>
                {iconType === 'dots' ? (
                    <View style={styles.dotsGrid}>
                        <View style={[styles.dot, { backgroundColor: '#ec4899' }]} />
                        <View style={[styles.dot, { backgroundColor: '#ec4899' }]} />
                        <View style={[styles.dot, { backgroundColor: '#ec4899' }]} />
                        <View style={[styles.dot, { backgroundColor: '#ec4899' }]} />
                    </View>
                ) : icon ? (
                    <Image
                        source={{ uri: icon }}
                        style={styles.icon}
                        contentFit="contain"
                    />
                ) : null}
            </View>
            <Text style={[styles.title, { color: isDark ? '#d1d5db' : '#1f2937' }]} numberOfLines={2}>
                {title}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        width: 72,
        height: 90,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    iconContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    dotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: 28,
        height: 28,
        gap: 2,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 5,
    },
    icon: {
        width: 48,
        height: 48,
    },
    title: {
        fontSize: 10,
        fontWeight: '500',
        color: '#1f2937',
        textAlign: 'center',
        lineHeight: 12,
    },
});
