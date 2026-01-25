import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { shadowStyle } from '@/core/utils/shadow';

interface FilterBarProps {
    categories: string[];
    selectedCategory: string;
    onSelect: (category: string) => void;
    isDark?: boolean;
}

// Simple Glass Chip - No animations, no reflections
function GlassChip({
    category,
    isActive,
    onPress,
    isDark,
}: {
    category: string;
    isActive: boolean;
    onPress: () => void;
    isDark: boolean;
}) {
    if (isActive) {
        return (
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.8}
                style={styles.chip}
            >
                <LinearGradient
                    colors={['#FF4D4D', '#FF3B30', '#E63329']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activeGradient}
                >
                    <Text style={styles.activeText}>{category}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.chip}
        >
            <View style={[
                styles.glassContainer,
                isDark ? styles.darkGlass : styles.lightGlass
            ]}>
                <Text style={[
                    styles.glassText,
                    isDark ? styles.darkText : styles.lightText
                ]}>
                    {category}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function FilterBar({
    categories,
    selectedCategory,
    onSelect,
    isDark = true,
}: FilterBarProps) {
    const handleSelect = (category: string) => {
        if (category !== selectedCategory) {
            onSelect(category);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((category) => (
                    <GlassChip
                        key={category}
                        category={category}
                        isActive={selectedCategory === category}
                        onPress={() => handleSelect(category)}
                        isDark={isDark}
                    />
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 56,
        marginTop: 8,
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 10,
    },
    chip: {
        borderRadius: 22,
        overflow: 'hidden',
    },

    // Active State - Gradient with Glow
    activeGradient: {
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 22,
        // Glow effect
        ...shadowStyle({ color: '#FF3B30', offset: { width: 0, height: 6 }, opacity: 0.45, radius: 12, elevation: 8 }),
    },
    activeText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.4,
    },

    // Glass Effect Container
    glassContainer: {
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 22,
    },
    darkGlass: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    lightGlass: {
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 2 }, opacity: 0.08, radius: 8, elevation: 3 }),
    },

    // Text Styles
    glassText: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    darkText: {
        color: 'rgba(255, 255, 255, 0.85)',
    },
    lightText: {
        color: 'rgba(0, 0, 0, 0.7)',
    },
});
