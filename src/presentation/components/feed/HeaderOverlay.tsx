import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
import { Plus, Loader, Trash2 } from 'lucide-react-native';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useUploadStore } from '../../store/useUploadStore';

// Import SVGs
import VoiceOnIcon from '../../../../assets/icons/voice_on.svg';
import SunIcon from '../../../../assets/icons/sun.svg';
import MoreIcon from '../../../../assets/icons/more.svg';

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

    const spin = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${spin.value}deg` }],
    }));

    useEffect(() => {
        if (isProcessing) {
            spin.value = withRepeat(
                withTiming(360, { duration: 1000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            spin.value = 0;
            // Ensure visual reset
            cancelAnimation(spin);
        }
    }, [isProcessing]);

    return (
        <Pressable
            style={[styles.iconButton]}
            onPress={isProcessing ? undefined : onPress}
            hitSlop={12}
        >
            {isProcessing ? (
                <Animated.View style={animatedStyle}>
                    <Loader width={24} height={24} color="#FFD700" />
                </Animated.View>
            ) : (
                <Plus width={24} height={24} color="#FFFFFF" />
            )}
        </Pressable>
    );
}

interface HeaderOverlayProps {
    isMuted: boolean;
    onToggleMute: () => void;
    onStoryPress: () => void;
    onMorePress: () => void;
    onUploadPress?: () => void;
    hasUnseenStories?: boolean;
    showBrightnessButton?: boolean;
    activeTab?: 'stories' | 'foryou';
    onTabChange?: (tab: 'stories' | 'foryou') => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HeaderOverlay({
    isMuted,
    onToggleMute,
    onStoryPress,
    onMorePress,
    onUploadPress,
    hasUnseenStories = false,
    showBrightnessButton = true,
    activeTab = 'foryou',
    onTabChange,
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
            {/* Left Column: Upload & Delete */}
            <View style={styles.leftColumn}>
                {onUploadPress && <UploadButton onPress={onUploadPress} />}

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
                        {hasUnseenStories && activeTab === 'stories' && (
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

            {/* Right: Voice + More + Brightness */}
            <View style={styles.rightButtons}>
                {showBrightnessButton && <BrightnessButton />}

                <AnimatedPressable
                    onPress={onToggleMute}
                    style={[styles.iconButton, voiceAnimatedStyle]}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <VoiceOnIcon
                        width={24}
                        height={24}
                        color={isMuted ? "#6B7280" : "#FFFFFF"}
                    />
                </AnimatedPressable>

                <Pressable
                    style={styles.iconButton}
                    onPress={onMorePress}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                    <MoreIcon width={24} height={24} color="#FFFFFF" />
                </Pressable>
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
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 4,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 8,
    },
    tabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 6,
        gap: 4,
    },
    tabText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
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
    },
    rightButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minWidth: 120,
        justifyContent: 'flex-end',
    },
});
