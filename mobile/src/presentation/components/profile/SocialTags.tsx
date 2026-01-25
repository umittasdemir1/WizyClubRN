import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

import { User } from '../../../domain/entities/User';
import { logError, LogCode } from '@/core/services/Logger';
import { shadowStyle } from '@/core/utils/shadow';

interface SocialTagsProps {
    isDark: boolean;
    user?: User | null;
}

export const SocialTags: React.FC<SocialTagsProps> = ({ isDark, user }) => {
    const iconColor = '#000'; // Dark icons look better on the 3D white glass background
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    const getIconConfig = (platform: string) => {
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

    if (!user) return null;

    const links = [
        { platform: 'Instagram', url: user.instagramUrl },
        { platform: 'TikTok', url: user.tiktokUrl },
        { platform: 'Youtube', url: user.youtubeUrl },
        { platform: 'X', url: user.xUrl },
        { platform: 'Website', url: user.website },
    ].filter(link => link.url && link.url.trim() !== '');

    const openLink = async (url: string | undefined) => {
        let targetUrl = url?.trim() || '';
        if (!targetUrl) return;

        try {
            // If no protocol is present, basic check for common patterns or just prepend https://
            if (!targetUrl.match(/^[a-zA-Z]+:\/\//)) {
                targetUrl = `https://${targetUrl}`;
            }

            const supported = await Linking.canOpenURL(targetUrl);
            if (supported) {
                await Linking.openURL(targetUrl);
            } else {
                logError(LogCode.ERROR_NAVIGATION, 'Cannot open URL - unsupported protocol', { url: targetUrl });
            }
        } catch (error) {
            logError(LogCode.ERROR_NAVIGATION, 'Error opening URL', { error, url: targetUrl });
        }
    };

    if (links.length === 0) return null;

    return (
        <View style={styles.container}>
            {links.map((link, index) => {
                const iconConfig = getIconConfig(link.platform);
                return (
                    <TouchableOpacity
                        key={index}
                        style={[styles.socialTag, { borderColor }]}
                        onPress={() => openLink(link.url)}
                        activeOpacity={0.7}
                    >
                        <FontAwesome6
                            name={iconConfig.name}
                            size={18}
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
        gap: 4,
    },
    socialTag: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff', // Solid white for the 3D effect
        borderWidth: 1,
        // 3D Glass Effect (Same as brand logos)
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 2 }, opacity: 0.2, radius: 3, elevation: 4 }),
    },
});
