import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useRef } from 'react';

// Import SVGs
import VoiceOnIcon from '../../../../assets/icons/voice_on.svg';
import VoiceOffIcon from '../../../../assets/icons/voice_off.svg';
import SunIcon from '../../../../assets/icons/sun.svg';
import MoreIcon from '../../../../assets/icons/more.svg';

interface HeaderOverlayProps {
    isMuted: boolean;
    onToggleMute: () => void;
    onStoryPress: () => void;
    onMorePress: () => void;
    hasUnseenStories?: boolean;
}

export function HeaderOverlay({
    isMuted,
    onToggleMute,
    onStoryPress,
    onMorePress,
    hasUnseenStories = false,
}: HeaderOverlayProps) {
    const insets = useSafeAreaInsets();
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for unmuted state
    useEffect(() => {
        if (!isMuted) {
            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 0.5,
                        duration: 1000,
                        easing: Easing.bezier(0.4, 0, 0.6, 1),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        easing: Easing.bezier(0.4, 0, 0.6, 1),
                        useNativeDriver: true,
                    }),
                ])
            );
            pulseAnimation.start();
            return () => pulseAnimation.stop();
        } else {
            // Reset to full opacity when muted
            pulseAnim.setValue(1);
        }
    }, [isMuted, pulseAnim]);

    return (
        <View style={[styles.container, { paddingTop: insets.top + 24 }]}>
            {/* Left: Voice Button */}
            <TouchableOpacity onPress={onToggleMute} style={styles.voiceButton}>
                <Animated.View
                    style={{
                        opacity: isMuted ? 0.5 : pulseAnim,
                    }}
                >
                    <VoiceOnIcon
                        width={32}
                        height={32}
                        color={isMuted ? "#9CA3AF" : "#FFFFFF"}
                    />
                </Animated.View>
            </TouchableOpacity>

            {/* Center: Stories Pill */}
            <TouchableOpacity
                onPress={onStoryPress}
                style={styles.storiesPill}
            >
                <Text style={styles.storiesText}>Hikayeler</Text>
                <ChevronDown size={16} color="white" />
                {hasUnseenStories && (
                    <View style={styles.badge} />
                )}
            </TouchableOpacity>

            {/* Right: Brightness & More */}
            <View style={styles.rightButtons}>
                <TouchableOpacity style={styles.iconButton}>
                    <SunIcon width={24} height={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={onMorePress} style={styles.iconButton}>
                    <MoreIcon width={24} height={24} color="white" />
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
        zIndex: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
    },
    voiceButton: {
        padding: 8, // 48x48 touch area
    },
    storiesPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
    },
    storiesText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    badge: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FF3B30',
        marginLeft: 4,
    },
    rightButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    iconButton: {
        padding: 8,
    },
});
