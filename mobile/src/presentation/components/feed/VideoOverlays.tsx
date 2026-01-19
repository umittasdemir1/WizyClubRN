import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Pause, Repeat1, RefreshCcw, AlertCircle } from 'lucide-react-native';
import { VideoSeekBar } from './VideoSeekBar';
import PlayIcon from '../../../../assets/icons/play.svg';

interface VideoOverlaysProps {
    // Video state
    videoId: string; // For debugging
    isActive: boolean;
    hasError: boolean;
    isFinished: boolean;
    retryCount: number;

    // UI state
    isCleanScreen: boolean;
    showPoster: boolean; // Not used in rendering, kept for future use
    tapIndicator?: 'play' | 'pause' | null;
    rateLabel: string | null;

    // Seekbar props
    currentTime: SharedValue<number>;
    duration: SharedValue<number>;
    isScrolling?: SharedValue<boolean>;
    spriteUrl?: string;

    // Callbacks
    onRetry: () => void;
    onSeek: (time: number) => void;
}

const MAX_RETRIES = 3;

export function VideoOverlays({
    videoId: _videoId, // Prefix with underscore to indicate intentionally unused
    isActive,
    hasError,
    isFinished,
    retryCount,
    isCleanScreen,
    showPoster: _showPoster, // Prefix with underscore to indicate intentionally unused
    tapIndicator,
    rateLabel,
    currentTime,
    duration,
    isScrolling,
    spriteUrl,
    onRetry,
    onSeek,
}: VideoOverlaysProps) {
    const showUiOverlays = !isCleanScreen;
    const showTapIndicator = isActive && !!tapIndicator && !hasError;
    const showReplayIcon = isFinished && isActive && !hasError && !showTapIndicator;

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Playback Rate Badge */}
            {rateLabel && (
                <View style={styles.rateBadge} pointerEvents="none">
                    <Text style={styles.rateText}>{rateLabel}</Text>
                </View>
            )}

            {/* Gradient Overlay for UI */}
            {showUiOverlays && (
                <LinearGradient
                    colors={['rgba(0,0,0,0.15)', 'transparent', 'transparent', 'rgba(0,0,0,0.5)']}
                    locations={[0, 0.2, 0.6, 1]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
            )}

            {/* Tap Play/Pause Icon Overlay */}
            {showUiOverlays && showTapIndicator && (
                <View style={styles.touchArea} pointerEvents="none">
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            {tapIndicator === 'pause' ? (
                                <Pause size={44} color="#FFFFFF" fill="#FFFFFF" strokeWidth={0} />
                            ) : (
                                <PlayIcon width={44} height={44} color="#FFFFFF" style={{ marginLeft: 5 }} />
                            )}
                        </View>
                    </View>
                </View>
            )}

            {/* Replay Icon Overlay */}
            {showUiOverlays && showReplayIcon && (
                <View style={styles.touchArea} pointerEvents="none">
                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            <Repeat1 size={44} color="#FFFFFF" strokeWidth={1.2} />
                        </View>
                    </View>
                </View>
            )}

            {/* Error Overlay */}
            {hasError && (
                <View style={[styles.touchArea, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={styles.errorContainer}>
                        <AlertCircle color="#EF4444" size={48} style={{ marginBottom: 12 }} />
                        <Text style={styles.errorText}>Video oynatılamadı</Text>
                        <Pressable style={styles.retryButton} onPress={onRetry}>
                            <RefreshCcw color="#FFF" size={20} />
                            <Text style={styles.retryText}>Tekrar Dene</Text>
                        </Pressable>
                        {retryCount > 0 && (
                            <Text style={styles.retryCountText}>Deneme {retryCount}/{MAX_RETRIES}</Text>
                        )}
                    </View>
                </View>
            )}

            {/* Video Seekbar */}
            {showUiOverlays && (
                <VideoSeekBar
                    currentTime={currentTime}
                    duration={duration}
                    isScrolling={isScrolling}
                    onSeek={onSeek}
                    isActive={isActive}
                    spriteUrl={spriteUrl}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 5,
    },
    touchArea: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    iconContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBackground: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rateBadge: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -24 }, { translateY: -16 }],
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 12,
    },
    rateText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    retryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    retryText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    retryCountText: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 12,
    },
});
