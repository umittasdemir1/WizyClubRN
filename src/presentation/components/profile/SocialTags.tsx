import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Text } from 'react-native';
import { Youtube, Instagram, Music2, Link } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

// X (Twitter) icon
const XIcon: React.FC<{ size: number; color: string }> = ({ size, color }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </Svg>
);

interface SocialTagsProps {
    isDark: boolean;
}

export const SocialTags: React.FC<SocialTagsProps> = ({ isDark }) => {
    const iconColor = isDark ? '#fff' : '#000';
    const bgColor = isDark ? '#1c1c1e' : '#f0f0f0';
    const borderColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
                onPress={() => Linking.openURL('https://youtube.com')}
            >
                <Youtube size={14} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
                onPress={() => Linking.openURL('https://instagram.com')}
            >
                <Instagram size={14} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
                onPress={() => Linking.openURL('https://tiktok.com')}
            >
                <Music2 size={14} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
                onPress={() => Linking.openURL('https://twitter.com')}
            >
                <XIcon size={14} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.socialTag, { backgroundColor: bgColor, borderColor }]}
                onPress={() => Linking.openURL('https://example.com')}
            >
                <Link size={14} color={iconColor} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        paddingVertical: 10,
    },
    socialTag: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
});
