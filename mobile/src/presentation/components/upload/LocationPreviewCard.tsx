import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type LocationPreviewCardProps = {
    name: string;
    address: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    subtextColor: string;
    style?: React.ComponentProps<typeof View>['style'];
};

export function LocationPreviewCard({
    name,
    address,
    backgroundColor,
    borderColor,
    textColor,
    subtextColor,
    style,
}: LocationPreviewCardProps) {
    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor,
                    borderColor,
                },
                style,
            ]}
        >
            <View style={styles.meta}>
                <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={[styles.subtitle, { color: subtextColor }]} numberOfLines={2}>
                    {address}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 16,
        borderWidth: 1,
        overflow: 'hidden',
    },
    meta: {
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 10,
        gap: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 12,
        lineHeight: 17,
    },
});
