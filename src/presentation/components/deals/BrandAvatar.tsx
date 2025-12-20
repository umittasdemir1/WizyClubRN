import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

interface BrandAvatarProps {
    brandName: string;
    discount: string;
    backgroundColor: string;
    icon?: React.ComponentType<any>;
    iconColor?: string;
    onPress?: () => void;
}

export function BrandAvatar({
    brandName,
    discount,
    backgroundColor,
    icon: Icon,
    iconColor = 'white',
    onPress,
}: BrandAvatarProps) {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
                <View style={[styles.avatar, { backgroundColor }]}>
                    {Icon && <Icon size={24} color={iconColor} />}
                </View>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{discount}</Text>
                </View>
            </View>
            <Text style={styles.brandName} numberOfLines={1}>
                {brandName}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: 60,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 6,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#10B981',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 8,
        minWidth: 20,
        alignItems: 'center',
    },
    badgeText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    brandName: {
        fontSize: 10,
        color: '#6b7280',
        textAlign: 'center',
    },
});
