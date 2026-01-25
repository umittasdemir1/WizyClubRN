import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withSequence,
    withTiming,
    Easing,
    cancelAnimation,
} from 'react-native-reanimated';
import { Plus, Volume2, VolumeX, ChevronLeft } from 'lucide-react-native';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useUploadStore } from '../../store/useUploadStore';
import { textShadowStyle } from '@/core/utils/shadow';

// Import SVGs
import SunIcon from '../../../../assets/icons/sun.svg';

// Brightness Button sub-component
function BrightnessButton() {
    const { brightness, toggleController } = useBrightnessStore();
    const isActive = brightness < 1.0;

    return (
        <Pressable
            style={styles.iconButton}
            onPress={toggleController}
            hitSlop={12}
        >
            <SunIcon
                width={24}
                height={24}
                color={isActive ? '#FFD700' : 'white'}
            />
        </Pressable>
    );
}

// Upload Button sub-component
function UploadButton({ onPress }: { onPress: () => void }) {
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    // If uploading, hide the button completely (User wants ONLY thumbnail + %)
    if (isProcessing) return null;

    return (
        <Pressable
            style={[styles.iconButton]}
            onPress={onPress}
            hitSlop={12}
        >
            <Plus width={28} height={28} color="#FFFFFF" />
        </Pressable>
    );
}

// 🔥 Upload Thumbnail sub-component (9:16 with centered %)
import { Image as ExpoImage } from 'expo-image';

function UploadThumbnail() {
    const thumbnailUri = useUploadStore(state => state.thumbnailUri);
    const progress = useUploadStore(state => state.progress);
    const status = useUploadStore(state => state.status);
    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';

    if (!thumbnailUri || !isProcessing) return null;

    return (
        <View style={thumbnailStyles.container}>
            <ExpoImage
                source={{ uri: thumbnailUri }}
                style={thumbnailStyles.image}
                contentFit="cover"
            />
            <View style={thumbnailStyles.overlay}>
                <Text style={thumbnailStyles.percentText}>%{Math.round(progress)}</Text>
            </View>
        </View>
    );
}

const thumbnailStyles = StyleSheet.create({
    container: {
        width: 48, // Increased from 36
        height: 85, // 9:16 ratio (48 * 16/9 ≈ 85.33)
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.4)',
        marginTop: 4, // Spacing from top
    },
    image: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)', // Slightly Darker for readability
        justifyContent: 'center',
        alignItems: 'center',
    },
    percentText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        ...textShadowStyle('rgba(0, 0, 0, 0.75)', { width: 0, height: 1 }, 3),
    },
});

interface HeaderOverlayProps {
    isMuted: boolean;
    onToggleMute: () => void;
    onStoryPress: () => void;
    onUploadPress?: () => void;
    hasUnseenStories?: boolean;
    showBrightnessButton?: boolean;
    activeTab?: 'stories' | 'foryou';
    onTabChange?: (tab: 'stories' | 'foryou') => void;
    showBack?: boolean;
    onBack?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HeaderOverlay({
    isMuted,
    onToggleMute,
    onStoryPress,
    onUploadPress,
    hasUnseenStories = false,
    showBrightnessButton = true,
    activeTab = 'foryou',
    onTabChange,
    showBack = false,
    onBack,
}: HeaderOverlayProps) {
    const insets = useSafeAreaInsets();
    const pulseOpacity = useSharedValue(1);
    const headerTopPadding = insets.top + 12;

    // Pulse animation when unmuted
    useEffect(() => {
        if (!isMuted) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
                ),
                -1,
                true
            );
        } else {
            cancelAnimation(pulseOpacity);
            pulseOpacity.value = withTiming(0.5, { duration: 200 });
        }
    }, [isMuted]);

    const voiceAnimatedStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    return (
        <View
            style={[styles.container, { paddingTop: headerTopPadding }]}
            pointerEvents="box-none"
        >
            {/* Left Column: Upload & Thumbnail */}
            <View style={styles.leftColumn}>
                {showBack ? (
                    <Pressable
                        style={styles.iconButton}
                        onPress={onBack}
                        hitSlop={12}
                    >
                    <ChevronLeft width={28} height={28} color="#FFFFFF" />
                    </Pressable>
                ) : (
                    onUploadPress && <UploadButton onPress={onUploadPress} />
                )}
                <UploadThumbnail />
            </View>

            {/* Center: Tab Switcher (absolutely centered) */}
            <View
                style={[styles.centerOverlay, { top: headerTopPadding }]}
                pointerEvents="box-none"
            >
                <View style={styles.tabContainer}>
                    <Pressable
                        onPress={() => {
                            onTabChange?.('stories');
                            onStoryPress();
                        }}
                        style={styles.tabButton}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'stories' && styles.tabTextActive
                        ]}>
                            Hikayeler
                        </Text>
                        {hasUnseenStories && (
                            <View style={styles.badge} />
                        )}
                    </Pressable>

                    <View style={styles.tabDivider} />

                    <Pressable
                        onPress={() => onTabChange?.('foryou')}
                        style={styles.tabButton}
                        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'foryou' && styles.tabTextActive
                        ]}>
                            Sana Özel
                        </Text>
                    </Pressable>
                </View>
            </View>

            {/* Right: Voice + Brightness */}
            <View style={styles.rightButtons}>
                {showBrightnessButton && <BrightnessButton />}

                <TouchableOpacity
                    onPress={onToggleMute}
                    style={[styles.iconButton, { marginRight: -6 }]}
                    activeOpacity={0.7}
                >
                    {isMuted ? (
                        <VolumeX size={28} color="#FFFFFF" strokeWidth={1.2} />
                    ) : (
                        <Volume2 size={28} color="#FFFFFF" strokeWidth={1.2} />
                    )}
                </TouchableOpacity>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'flex-start', // Align to top because left column grows down
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    iconButton: {
        padding: 8,
        // NO background, NO shadow
    },
    leftColumn: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8, // Space between Upload and Delete
    },
    centerOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    tabContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginLeft: 4,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 4,
        position: 'relative',
    },
    tabText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    tabDivider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        position: 'absolute',
        top: 10,
        right: -2,
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0,
        minWidth: 120,
        justifyContent: 'flex-end',
    },
});
