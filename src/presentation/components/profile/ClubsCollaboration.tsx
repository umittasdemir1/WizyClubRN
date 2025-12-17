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
    const borderColor = isDark ? '#000' : '#fff';

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
        justifyContent: 'flex-start',
        gap: 12,
        marginVertical: 15,
        paddingHorizontal: 15,
        width: '100%',
    },
    avatarsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        borderWidth: 1.5,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    textWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
    },
});
