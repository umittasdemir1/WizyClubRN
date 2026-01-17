import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSequence,
    withTiming,
    Easing,
    interpolate,
    Extrapolate,
    SharedValue,
} from 'react-native-reanimated';
import { Heart, Send, PictureInPicture } from 'lucide-react-native';
import { COLORS } from '../../../core/constants';

interface StoryActionsProps {
    isLiked: boolean;
    onLike: () => void;
    onShare: () => void;
    onShop: () => void;
    showShop?: boolean;
    onEmojiSelect: (emoji: string) => void;
}

const EMOJIS = ['❤️', '🔥', '👏', '😂', '😍', '🎉', '👍', '💯', '😮', '🤩', '😎', '🥰', '😘', '🙌', '💪', '✨'];

const ICON_SIZE = 34;
const LIKE_COLOR = '#FF2146';
const WHITE = '#FFFFFF';
const HEARTBEAT_DURATION = 80;
const BURST_DURATION = 600;
const BURST_SIZE = 64;
const PARTICLE_COUNT = 12;
const PARTICLE_DISTANCE = 32;
const PARTICLE_SIZE = 4;
const LIKE_PARTICLE_COLORS = ['#FF2146', '#FF3B30', '#FF6B6B', '#FF8A80'];

function BurstParticle({ angle, color, burst }: { angle: number; color: string; burst: SharedValue<number> }) {
    const animatedStyle = useAnimatedStyle(() => {
        const progress = burst.value;
        const distance = interpolate(progress, [0, 1], [0, PARTICLE_DISTANCE], Extrapolate.CLAMP);
        const opacity = interpolate(progress, [0, 0.2, 1], [0, 1, 0], Extrapolate.CLAMP);
        const scale = interpolate(progress, [0, 0.2, 1], [0.5, 1, 0.8], Extrapolate.CLAMP);
        return {
            opacity,
            transform: [
                { translateX: Math.cos(angle) * distance },
                { translateY: Math.sin(angle) * distance },
                { scale },
            ],
        };
    });

    return <Animated.View style={[styles.particle, { backgroundColor: color }, animatedStyle]} />;
}

export function StoryActions({
    isLiked,
    onLike,
    onShare,
    onShop,
    showShop = false,
    onEmojiSelect,
}: StoryActionsProps) {
    const insets = useSafeAreaInsets();
    const [localLiked, setLocalLiked] = useState(isLiked);
    const likeScale = useSharedValue(1);
    const shareScale = useSharedValue(1);
    const likeBurst = useSharedValue(0);

    useEffect(() => {
        setLocalLiked(isLiked);
    }, [isLiked]);

    const likeAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: likeScale.value }],
    }));

    const shareAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: shareScale.value }],
    }));

    const triggerLikeBurst = () => {
        likeBurst.value = 0;
        likeBurst.value = withTiming(1, { duration: BURST_DURATION, easing: Easing.out(Easing.ease) });
    };

    const animatePress = (scale: SharedValue<number>) => {
        scale.value = withSequence(
            withTiming(1.3, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) }),
            withTiming(0.9, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.15, { duration: HEARTBEAT_DURATION, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: HEARTBEAT_DURATION, easing: Easing.out(Easing.ease) })
        );
    };

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom +10 }]} pointerEvents="box-none">
            <View style={styles.actionBar}>
                {/* Emoji Pill Area */}
                <View style={styles.emojiContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.emojiScrollContent}
                    >
                        {EMOJIS.map((emoji, index) => (
                            <Pressable
                                key={`${emoji}-${index}`}
                                onPress={() => onEmojiSelect(emoji)}
                                style={styles.emojiButton}
                            >
                                <Text style={styles.emoji}>{emoji}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttons}>
                    <Pressable
                        onPress={() => {
                            const nextLiked = !localLiked;
                            setLocalLiked(nextLiked);
                            animatePress(likeScale);
                            if (nextLiked) {
                                triggerLikeBurst();
                            }
                            onLike();
                        }}
                        style={styles.buttonContainer}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Animated.View style={[styles.iconWrapper, likeAnimatedStyle]}>
                            <View style={styles.particles}>
                                {Array.from({ length: PARTICLE_COUNT }).map((_, index) => {
                                    const angle = (Math.PI * 2 * Math.random());
                                    const color = LIKE_PARTICLE_COLORS[index % LIKE_PARTICLE_COLORS.length];
                                    return (
                                        <BurstParticle
                                            key={index}
                                            angle={angle}
                                            color={color}
                                            burst={likeBurst}
                                        />
                                    );
                                })}
                            </View>
                            <Heart
                                size={ICON_SIZE}
                                color={localLiked ? LIKE_COLOR : WHITE}
                                fill={localLiked ? LIKE_COLOR : 'none'}
                                strokeWidth={localLiked ? 2 : 1.2}
                            />
                        </Animated.View>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            animatePress(shareScale);
                            onShare();
                        }}
                        style={styles.buttonContainer}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Animated.View style={[styles.iconWrapper, shareAnimatedStyle]}>
                            <Send size={ICON_SIZE} color={WHITE} strokeWidth={1.2} />
                        </Animated.View>
                    </Pressable>

                    {showShop && (
                        <Pressable
                            onPress={() => {
                                animatePress(shareScale);
                                onShop();
                            }}
                            style={styles.buttonContainer}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Animated.View style={[styles.iconWrapper, shareAnimatedStyle]}>
                                <PictureInPicture size={ICON_SIZE} color={WHITE} strokeWidth={1.2} />
                            </Animated.View>
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: COLORS.videoBackground,
        paddingTop: 16,
    },
    actionBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 16,
        height: 64,
        marginTop: -18,
    },
    emojiContainer: {
        flex: 1,
        height: 36,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    emojiScrollContent: {
        alignItems: 'center',
        gap: 4,
    },
    emojiButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emoji: {
        fontSize: 22,
    },
    buttons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    buttonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        position: 'relative',
    },
    iconWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    particles: {
        position: 'absolute',
        width: BURST_SIZE,
        height: BURST_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        position: 'absolute',
        width: PARTICLE_SIZE,
        height: PARTICLE_SIZE,
        borderRadius: PARTICLE_SIZE / 2,
    },
});
