import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, Dimensions, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    runOnJS,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { ChevronLeft, MoreVertical } from 'lucide-react-native';
import { Avatar } from '../shared/Avatar';
import { Video } from '../../../domain/entities/Video';
import { useThemeStore } from '../../store/useThemeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../../../core/constants';

interface DescriptionSheetProps {
    visible: boolean;
    onClose: () => void;
    video: Video | null;
    onFollowPress?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.75;

export function DescriptionSheet({
    visible,
    onClose,
    video,
    onFollowPress,
}: DescriptionSheetProps) {
    const insets = useSafeAreaInsets();
    const isDark = useThemeStore(state => state.isDark);
    const translateY = useSharedValue(SCREEN_HEIGHT);
    const overlayOpacity = useSharedValue(0);

    const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
    const bgColor = isDark ? '#1c1c1e' : themeColors.background;

    const openSheet = () => {
        translateY.value = withTiming(SCREEN_HEIGHT - SHEET_HEIGHT, {
            duration: 300,
            easing: Easing.out(Easing.quad)
        });
        overlayOpacity.value = withTiming(0.5, { duration: 250 });
    };

    const closeSheet = () => {
        translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
        overlayOpacity.value = withTiming(0, { duration: 200 }, () => {
            runOnJS(onClose)();
        });
    };

    useEffect(() => {
        if (visible) openSheet();
        else {
            translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
            overlayOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [visible]);

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            const newVal = (SCREEN_HEIGHT - SHEET_HEIGHT) + event.translationY;
            if (newVal >= SCREEN_HEIGHT - SHEET_HEIGHT) {
                translateY.value = newVal;
            }
        })
        .onEnd((event) => {
            const velocity = event.velocityY;
            const currentPosition = translateY.value;
            const midPoint = SCREEN_HEIGHT / 2;

            // Yukarı hızlı çekildi veya ekranın üst yarısında
            if (velocity < -500 || currentPosition < midPoint) {
                // Tam ekran yap
                translateY.value = withTiming(0, { duration: 250 });
                overlayOpacity.value = withTiming(0.7, { duration: 250 });
            }
            // Aşağı hızlı çekildi veya ekranın alt kısmında
            else if (velocity > 500 || currentPosition > SCREEN_HEIGHT - (SHEET_HEIGHT * 0.3)) {
                runOnJS(closeSheet)();
            }
            // Orta pozisyonda - normal açık pozisyona dön
            else {
                runOnJS(openSheet)();
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const overlayStyle = useAnimatedStyle(() => ({
        opacity: overlayOpacity.value,
        backgroundColor: '#000',
    }));

    const handleInternalMore = () => {
        console.log('Internal More Menu Pressed - Separate from feed');
    };

    if (!video && !visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Dark Overlay */}
            <Animated.View
                style={[styles.overlay, overlayStyle]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
            </Animated.View>

            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.sheet,
                    {
                        height: SHEET_HEIGHT,
                        paddingBottom: insets.bottom + 16,
                        backgroundColor: bgColor,
                    },
                    sheetStyle,
                ]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                {/* Drag Handle Indicator */}
                <GestureDetector gesture={panGesture}>
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)' }]} />
                    </View>
                </GestureDetector>

                {/* Header Section */}
                <View style={[styles.header, { paddingTop: 8 }]}>
                    <View style={styles.headerLeft}>
                        <Pressable
                            onPress={onClose}
                            style={styles.backButton}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <ChevronLeft size={28} color={isDark ? 'white' : 'black'} />
                        </Pressable>

                        {video && (
                            <>
                                <Avatar url={video.user.avatarUrl} size={44} hasBorder={true} />
                                <View style={styles.userInfo}>
                                    <Text style={[styles.fullName, { color: isDark ? 'white' : 'black' }]}>
                                        {video.user.username}
                                    </Text>
                                    <Text style={[styles.username, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                                        @{video.user.id.toLowerCase().replace(/\s+/g, '_')}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    <View style={styles.headerRight}>
                        {!video?.user.isFollowing && (
                            <Pressable
                                style={[
                                    styles.followPill,
                                    {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                                    }
                                ]}
                                onPress={onFollowPress}
                                hitSlop={8}
                            >
                                <Text style={[styles.followText, { color: isDark ? 'white' : 'black' }]}>Takip Et</Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={handleInternalMore}
                            style={styles.moreButton}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <MoreVertical size={24} color={isDark ? 'white' : 'black'} />
                        </Pressable>
                    </View>
                </View>

                {/* Content Section */}
                <ScrollView
                    style={styles.contentScroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.divider} />
                    <Text style={[styles.fullDescription, { color: isDark ? 'white' : 'black' }]}>
                        {video?.description}
                    </Text>
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 100,
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        zIndex: 101,
    },
    handleContainer: {
        width: '100%',
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 2,
    },
    backButton: {
        marginRight: 8,
    },
    userInfo: {
        marginLeft: 10,
        justifyContent: 'center',
    },
    fullName: {
        fontSize: 15,
        fontWeight: '700',
    },
    username: {
        fontSize: 12,
        marginTop: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        justifyContent: 'flex-end',
    },
    followPill: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    followText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    moreButton: {
        padding: 4,
    },
    contentScroll: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    divider: {
        height: 16,
    },
    fullDescription: {
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '400',
    },
});
