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

    // Circular dimensions
    const size = 80;
    const THICKNESS = 2.5;
    const GAP = 2.5;

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
                            <AdvancedStoryRing
                                size={size}
                                thickness={THICKNESS}
                                gap={GAP}
                                viewed={isViewed}
                            >
                                <Image
                                    source={{ uri: creator.avatarUrl }}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    contentFit="cover"
                                />
                            </AdvancedStoryRing>
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
        height: 120, // Reduced height for circular avatars
        marginTop: 0,
        marginBottom: 10,
    },
    scrollContent: {
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    creatorItem: {
        alignItems: 'center',
        width: 90,
        marginRight: 0,
    },
    username: {
        marginTop: 6,
        fontSize: 10,
        fontWeight: '500',
        width: '100%',
        textAlign: 'center',
    },
});
