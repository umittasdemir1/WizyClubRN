import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { AdvancedStoryRing } from '../shared/AdvancedStoryRing';
import { useStoryStore } from '../../store/useStoryStore';

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
    const avatarSize = 62;
    const THICKNESS = 3;
    const GAP = 3;
    const RING_SIZE = avatarSize + (THICKNESS * 2) + (GAP * 2); // 74

    // Subscribe to the Set of viewed user IDs for reactivity
    const viewedUserIds = useStoryStore((state) => state.viewedUserIds);

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {creators.map((creator) => {
                    const isViewed = !creator.hasUnseen || viewedUserIds.has(creator.id);
                    return (
                        <TouchableOpacity
                            key={creator.id}
                            style={styles.creatorItem}
                            onPress={() => onCreatorPress(creator.id)}
                        >
                            <View style={styles.avatarWrapper}>
                                <AdvancedStoryRing
                                    size={RING_SIZE}
                                    thickness={THICKNESS}
                                    gap={GAP}
                                    viewed={isViewed}
                                >
                                    <Image
                                        source={{ uri: creator.avatarUrl }}
                                        style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
                                        contentFit="cover"
                                    />
                                </AdvancedStoryRing>
                            </View>
                            <Text
                                style={[styles.username, { color: textColor }]}
                                numberOfLines={1}
                            >
                                {creator.username}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: 120, // Increased height for larger ring
        marginVertical: 10,
    },
    scrollContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 15,
    },
    creatorItem: {
        alignItems: 'center',
        width: 76, // Adjusted width
    },
    avatarWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    username: {
        marginTop: 6,
        fontSize: 10,
        fontWeight: '500',
        width: '100%',
        textAlign: 'center',
    },
});
