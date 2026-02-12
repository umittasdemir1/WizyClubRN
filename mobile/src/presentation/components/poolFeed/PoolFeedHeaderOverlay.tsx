import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useBrightnessStore } from '../../store/useBrightnessStore';
import { useUploadStore } from '../../store/useUploadStore';
import { textShadowStyle } from '@/core/utils/shadow';

// Import SVGs
import SunIcon from '../../../../assets/icons/sun.svg';
import VideosUploadSvgIcon from '../../../../assets/icons/videosupload.svg';

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
            <VideosUploadSvgIcon width={32} height={32} color="#FFFFFF" />
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

interface PoolFeedHeaderOverlayProps {
    onUploadPress?: () => void;
    showBrightnessButton?: boolean;
    showBack?: boolean;
    onBack?: () => void;
}

export function PoolFeedHeaderOverlay({
    onUploadPress,
    showBrightnessButton = true,
    showBack = false,
    onBack,
}: PoolFeedHeaderOverlayProps) {
    const insets = useSafeAreaInsets();
    const headerTopPadding = insets.top + 12;
    const topRowPaddingTop = headerTopPadding - 10;

    return (
        <View
            style={styles.container}
            pointerEvents="box-none"
        >
            <View style={[styles.topRow, { paddingTop: topRowPaddingTop }]}>
                <View style={styles.leftTopSlot}>
                    <Pressable
                        style={styles.iconButton}
                        onPress={onBack}
                        hitSlop={12}
                        disabled={!onBack}
                    >
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </Pressable>
                </View>

                <View style={styles.centerTopSlot} pointerEvents="none">
                    <Text style={styles.centerTitle}>Clips</Text>
                </View>

                <View style={styles.rightTopSlot}>
                    {showBrightnessButton && <BrightnessButton />}
                    {!showBack && onUploadPress ? <UploadButton onPress={onUploadPress} /> : null}
                </View>
            </View>

            <View style={styles.leftBottomSlot}>
                <UploadThumbnail />
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
        paddingHorizontal: 16,
    },
    topRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    leftTopSlot: {
        width: 60,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerTopSlot: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rightTopSlot: {
        width: 60,
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 0,
        overflow: 'visible',
    },
    iconButton: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 0,
        overflow: 'visible',
    },
    leftBottomSlot: {
        width: 60,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});
