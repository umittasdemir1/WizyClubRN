import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line } from 'react-native-svg';

interface PopularDealCardProps {
    icon?: React.ReactNode;
    brandName: string;
    value: string;
    description: string;
    expiryDay: string;
    expiryMonth: string;
    onPress?: () => void;
    isDark?: boolean;
}

export function PopularDealCard({
    icon,
    brandName,
    value,
    description,
    expiryDay,
    expiryMonth,
    onPress,
    isDark = false,
}: PopularDealCardProps) {
    const cardBg = isDark ? '#1a1a1a' : '#f9fafb';
    const textPrimary = isDark ? '#FFFFFF' : '#111827';
    const textSecondary = isDark ? '#9ca3af' : '#6b7280';
    const textMuted = isDark ? '#6b7280' : '#9ca3af';
    const dividerColor = isDark ? '#374151' : '#d1d5db';

    return (
        <TouchableOpacity
            style={[styles.container, { backgroundColor: cardBg }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Left: Icon */}
            <View style={styles.iconContainer}>
                {icon}
            </View>

            {/* Middle: Info */}
            <View style={styles.infoContainer}>
                <Text style={[styles.brandName, { color: textPrimary }]}>{brandName}</Text>
                <Text style={[styles.value, { color: textSecondary }]}>{value}</Text>
                <Text style={[styles.description, { color: textMuted }]}>{description}</Text>
            </View>

            {/* Dashed Divider */}
            <View style={styles.divider}>
                <Svg width="1" height="40" viewBox="0 0 1 40">
                    <Line
                        x1="0.5"
                        y1="0"
                        x2="0.5"
                        y2="40"
                        stroke={dividerColor}
                        strokeWidth="1"
                        strokeDasharray="3,3"
                    />
                </Svg>
            </View>

            {/* Right: Expiry Date */}
            <View style={styles.expiryContainer}>
                <Text style={[styles.expLabel, { color: textMuted }]}>EXP</Text>
                <Text style={[styles.expDay, { color: textPrimary }]}>{expiryDay}</Text>
                <Text style={[styles.expMonth, { color: textMuted }]}>{expiryMonth.toUpperCase()}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContainer: {
        flex: 1,
    },
    brandName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    value: {
        fontSize: 12,
        marginBottom: 2,
    },
    description: {
        fontSize: 9,
    },
    divider: {
        marginHorizontal: 12,
        height: 40,
        justifyContent: 'center',
    },
    expiryContainer: {
        width: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expLabel: {
        fontSize: 8,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    expDay: {
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 20,
    },
    expMonth: {
        fontSize: 8,
        textTransform: 'uppercase',
        marginTop: 2,
    },
});
