import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';

interface ClubsCollaborationProps {
    clubsCount: number;
    clubLogos: string[];
    isDark: boolean;
    onPress?: () => void;
}

export const ClubsCollaboration: React.FC<ClubsCollaborationProps> = ({
    clubsCount,
    clubLogos,
    isDark,
    onPress,
}) => {
    const textColor = isDark ? '#fff' : '#000';
    const subtitleColor = isDark ? '#888' : '#555';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.avatarsWrapper}>
                {clubLogos.slice(0, 4).map((logo, index) => (
                    <View
                        key={index}
                        style={[
                            styles.avatarContainer,
                            {
                                zIndex: 10 - index,
                                borderColor: borderColor,
                                marginLeft: index === 0 ? 0 : -10, // More overlap for a tighter look
                            },
                        ]}
                    >
                        <Image
                            source={{ uri: logo }}
                            style={styles.logo}
                            contentFit="contain"
                        />
                    </View>
                ))}
            </View>

            <View style={styles.textWrapper}>
                <Text style={[styles.title, { color: textColor }]}>
                    {clubsCount} CLUB's
                </Text>
                <Text style={[styles.subtitle, { color: subtitleColor }]}>
                    ile işbirliği
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatarsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        overflow: 'hidden',
        backgroundColor: '#fff',
        padding: 1, // Reduced from 5 to enlarge logos a bit more
        // 3D Glass Effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 4,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    textWrapper: {
        flexDirection: 'column',
        justifyContent: 'center',
        height: 32,
    },
    title: {
        fontSize: 12,
        fontWeight: '800',
        lineHeight: 14,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 13,
    },
});
