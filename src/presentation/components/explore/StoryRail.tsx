import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface StoryCreator {
    id: string;
    username: string;
    avatarUrl: string;
    hasUnseen?: boolean;
}

interface StoryRailProps {
    creators: StoryCreator[];
    onCreatorPress: (id: string) => void;
    isDark?: boolean;
}

export function StoryRail({ creators, onCreatorPress, isDark = true }: StoryRailProps) {
    const textColor = isDark ? '#FFFFFF' : '#000000';

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {creators.map((creator) => (
                    <TouchableOpacity
                        key={creator.id}
                        style={styles.creatorItem}
                        onPress={() => onCreatorPress(creator.id)}
                    >
                        <View style={styles.avatarWrapper}>
                            {creator.hasUnseen && (
                                <LinearGradient
                                    colors={['#FF3B30', '#FF8C00', '#FF3B30']}
                                    style={styles.borderGradient}
                                />
                            )}
                            <View style={[styles.avatarContainer, !creator.hasUnseen && styles.noStoryBorder]}>
                                <Image
                                    source={{ uri: creator.avatarUrl }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                            </View>
                        </View>
                        <Text
                            style={[styles.username, { color: textColor }]}
                            numberOfLines={1}
                        >
                            {creator.username}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 110,
        marginVertical: 10,
    },
    scrollContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 15,
    },
    creatorItem: {
        alignItems: 'center',
        width: 70,
    },
    avatarWrapper: {
        width: 68,
        height: 68,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    borderGradient: {
        position: 'absolute',
        width: 68,
        height: 68,
        borderRadius: 34,
    },
    avatarContainer: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: '#000',
        padding: 2,
        zIndex: 1,
    },
    noStoryBorder: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    avatar: {
        flex: 1,
        borderRadius: 30,
    },
    username: {
        marginTop: 6,
        fontSize: 10,
        fontWeight: '500',
        width: '100%',
        textAlign: 'center',
    },
});
