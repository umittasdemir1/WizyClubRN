import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

import { SocialLink } from '../../../domain/entities/SocialLink';

interface SocialTagsProps {
    isDark: boolean;
    links?: SocialLink[];
}

export const SocialTags: React.FC<SocialTagsProps> = ({ isDark, links = [] }) => {
    const iconColor = '#000'; // Dark icons look better on the 3D white glass background
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    const getIconConfig = (platform: SocialLink['platform']) => {
        switch (platform) {
            case 'Instagram':
                return { name: 'instagram' };
            case 'TikTok':
                return { name: 'tiktok' };
            case 'Youtube':
                return { name: 'youtube' };
            case 'X':
                return { name: 'x-twitter' };
            default:
                return { name: 'link' };
        }
    };

    if (!links || links.length === 0) return null;

    return (
        <View style={styles.container}>
            {links.map((link, index) => {
                const iconConfig = getIconConfig(link.platform);
                return (
                    <TouchableOpacity
                        key={index}
                        style={[styles.socialTag, { borderColor }]}
                        onPress={() => link.url && Linking.openURL(link.url)}
                        activeOpacity={0.7}
                    >
                        <FontAwesome6
                            name={iconConfig.name}
                            size={22}
                            color={iconColor}
                        />
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    socialTag: {
        width: 38,
        height: 38,
        borderRadius: 10, // Match brand logos
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff', // Solid white for the 3D effect
        borderWidth: 1,
        // 3D Glass Effect (Same as brand logos)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
});