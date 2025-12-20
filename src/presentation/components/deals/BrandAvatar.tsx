import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

type IconSet = 'FontAwesome' | 'FontAwesome5' | 'MaterialCommunityIcons';

interface BrandAvatarProps {
    brandName: string;
    discount: string;
    backgroundColor: string;
    iconName: string;
    iconSet?: IconSet;
    iconColor?: string;
    onPress?: () => void;
}

export function BrandAvatar({
    brandName,
    discount,
    backgroundColor,
    iconName,
    iconSet = 'FontAwesome',
    iconColor = 'white',
    onPress,
}: BrandAvatarProps) {
    const renderIcon = () => {
        const iconProps = { name: iconName as any, size: 24, color: iconColor };

        switch (iconSet) {
            case 'FontAwesome5':
                return <FontAwesome5 {...iconProps} />;
            case 'MaterialCommunityIcons':
                return <MaterialCommunityIcons {...iconProps} />;
            case 'FontAwesome':
            default:
                return <FontAwesome {...iconProps} />;
        }
    };

    return (
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.avatarWrapper}>
                <View style={[styles.avatar, { backgroundColor }]}>
                    {renderIcon()}
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
