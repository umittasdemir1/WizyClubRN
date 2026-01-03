import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

interface FilterBarProps {
    categories: string[];
    selectedCategory: string;
    onSelect: (category: string) => void;
    isDark?: boolean;
}

export function FilterBar({
    categories,
    selectedCategory,
    onSelect,
    isDark = true,
}: FilterBarProps) {
    const handleSelect = (category: string) => {
        onSelect(category);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {categories.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                        <TouchableOpacity
                            key={category}
                            onPress={() => handleSelect(category)}
                            style={[
                                styles.pill,
                                isActive ? styles.activePill : styles.inactivePill,
                                isDark ? styles.darkPill : styles.lightPill,
                            ]}
                        >
                            {category === 'Live' && (
                                <View style={styles.liveDot} />
                            )}
                            <Text
                                style={[
                                    styles.pillText,
                                    isActive ? styles.activeText : styles.inactiveText,
                                    isDark ? styles.darkText : styles.lightText,
                                ]}
                            >
                                {category}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 60,
        marginVertical: 10,
    },
    scrollContent: {
        paddingHorizontal: 12,
        alignItems: 'center',
        gap: 10,
    },
    pill: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1.5,
    },
    activePill: {
        borderColor: '#FF3B30',
        backgroundColor: 'rgba(255, 59, 48, 0.15)',
    },
    inactivePill: {
        borderColor: 'rgba(255, 255, 255, 0.2)',
        backgroundColor: 'transparent',
    },
    darkPill: {
        // Additional dark styles
    },
    lightPill: {
        borderColor: 'rgba(0, 0, 0, 0.1)',
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600',
    },
    activeText: {
        color: '#FFFFFF',
    },
    inactiveText: {
        color: 'rgba(255, 255, 255, 0.6)',
    },
    darkText: {
        // Additional dark text styles
    },
    lightText: {
        color: 'rgba(0, 0, 0, 0.6)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF3B30',
    },
});
