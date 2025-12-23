import React, { memo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Avatar } from '../shared/Avatar';

const AVATAR_SIZE = 64;
const RING_SIZE = AVATAR_SIZE + 6;

interface StoryAvatarProps {
    username: string;
    avatarUrl: string;
    hasUnseenStory: boolean;
    onPress: () => void;
}

export const StoryAvatar = memo(function StoryAvatar({
    username,
    avatarUrl,
    hasUnseenStory,
    onPress,
}: StoryAvatarProps) {
    const rotation = useSharedValue(0);

    // Renkli halka dönme animasyonu (sadece izlenmemişler için)
    useEffect(() => {
        if (hasUnseenStory) {
            rotation.value = withRepeat(
                withTiming(360, {
                    duration: 3000,
                    easing: Easing.linear,
                }),
                -1, // Sonsuz döngü
                false
            );
        } else {
            rotation.value = 0;
        }
    }, [hasUnseenStory]);

    const animatedRingStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <View style={styles.avatarContainer}>
                {hasUnseenStory ? (
                    // Renkli gradient ring (Instagram benzeri)
                    <Animated.View style={[styles.ring, animatedRingStyle]}>
                        <LinearGradient
                            colors={['#F58529', '#DD2A7B', '#8134AF', '#515BD4']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradient}
                        >
                            <View style={styles.innerWhiteRing}>
                                <Avatar url={avatarUrl} size={AVATAR_SIZE} />
                            </View>
                        </LinearGradient>
                    </Animated.View>
                ) : (
                    // Gri ring (izlenmiş hikayeler)
                    <View style={styles.ring}>
                        <View style={[styles.gradient, styles.grayGradient]}>
                            <View style={styles.innerWhiteRing}>
                                <Avatar url={avatarUrl} size={AVATAR_SIZE} />
                            </View>
                        </View>
                    </View>
                )}
            </View>
            <Text style={styles.username} numberOfLines={1}>
                {username}
            </Text>
        </Pressable>
    );
});

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginHorizontal: 8,
    },
    avatarContainer: {
        marginBottom: 6,
    },
    ring: {
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradient: {
        width: RING_SIZE,
        height: RING_SIZE,
        borderRadius: RING_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    grayGradient: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    innerWhiteRing: {
        width: RING_SIZE - 3,
        height: RING_SIZE - 3,
        borderRadius: (RING_SIZE - 3) / 2,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    username: {
        color: 'white',
        fontSize: 11,
        fontWeight: '500',
        maxWidth: RING_SIZE + 8,
        textAlign: 'center',
    },
});
