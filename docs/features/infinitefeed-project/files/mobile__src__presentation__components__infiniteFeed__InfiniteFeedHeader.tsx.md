# mobile/src/presentation/components/infiniteFeed/InfiniteFeedHeader.tsx

Header ve sekmelerin (Senin Icin / Takip Edilen) UI katmani. Feed Manager tarafindan kullanilir.

```tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ThemeColors } from './types';

export const FEED_TABS = ['Senin İçin', 'Takip Edilen'] as const;
export type FeedTab = (typeof FEED_TABS)[number];

interface InfiniteFeedHeaderProps {
    activeTab: FeedTab;
    onTabChange: (tab: FeedTab) => void;
    colors: ThemeColors;
    insetTop: number;
}

export function InfiniteFeedHeader({
    activeTab,
    onTabChange,
    colors,
    insetTop,
}: InfiniteFeedHeaderProps) {
    return (
        <View
            style={[
                styles.header,
                {
                    paddingTop: insetTop + 6,
                    borderBottomColor: colors.border,
                    backgroundColor: colors.background,
                },
            ]}
        >
            <Text style={[styles.logo, { color: colors.textPrimary }]}>WizyClub</Text>
            <View style={styles.tabRow}>
                {FEED_TABS.map((tab) => {
                    const isActive = tab === activeTab;
                    return (
                        <Pressable
                            key={tab}
                            onPress={() => onTabChange(tab)}
                            style={[styles.tabButton, isActive && { borderBottomColor: colors.textPrimary }]}
                        >
                            <Text style={[styles.tabText, { color: isActive ? colors.textPrimary : colors.textSecondary }]}>
                                {tab}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        borderBottomWidth: 1,
    },
    logo: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    tabRow: {
        flexDirection: 'row',
        gap: 18,
        marginTop: 10,
    },
    tabButton: {
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '700',
    },
});

```
