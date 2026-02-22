import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useUploadStore } from '../../store/useUploadStore';
import { useUploadComposerStore } from '../../store/useUploadComposerStore';
import { textShadowStyle } from '@/core/utils/shadow';

const STORY_PROGRESS_COLORS = ['#FF416C', '#FF9068', '#FFD93D', '#6BCF7F', '#4D96FF'] as const;

const getProgressGradient = (progressValue: number): { colors: string[]; locations?: number[] } => {
    const clamped = Math.max(0, Math.min(100, progressValue));
    const activeColorCount = Math.max(1, Math.min(5, Math.floor(clamped / 20) + 1));
    const colors = STORY_PROGRESS_COLORS.slice(0, activeColorCount);

    if (colors.length === 1) {
        return { colors: [colors[0], colors[0]], locations: [0, 1] };
    }

    const locations = colors.map((_, index) => index / (colors.length - 1));
    return { colors, locations };
};

export function InfiniteFeedUploadPreview({ borderColor }: { borderColor: string }) {
    const thumbnailUri = useUploadStore((state) => state.thumbnailUri);
    const progress = useUploadStore((state) => state.progress);
    const status = useUploadStore((state) => state.status);
    const uploadMode = useUploadComposerStore((state) => state.draft?.uploadMode);

    const isProcessing = status === 'compressing' || status === 'uploading' || status === 'processing';
    const isSuccess = status === 'success';
    const shouldShow = (isProcessing || isSuccess) && !!thumbnailUri;

    if (!shouldShow) return null;

    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));
    const displayProgress = isSuccess ? 100 : clampedProgress;
    const isStoryUpload = uploadMode === 'story';

    const hintText = displayProgress >= 95
        ? (isStoryUpload
            ? '\u00c7ok az kald\u0131, birazdan hikayeni burada g\u00f6receksin...'
            : '\u00c7ok az kald\u0131, birazdan g\u00f6nderini burada g\u00f6receksin...')
        : (isStoryUpload
            ? 'Hikayen haz\u0131rlan\u0131yor, uygulamada kalmaya devam et...'
            : 'G\u00f6nderin haz\u0131rlan\u0131yor, uygulamada kalmaya devam et...');

    const successTitle = isStoryUpload
        ? 'Yupp! Hikayen payla\u015f\u0131ld\u0131.'
        : 'Yupp! G\u00f6nderin payla\u015f\u0131ld\u0131.';

    const gradientConfig = getProgressGradient(displayProgress);

    return (
        <>
            <View style={styles.uploadPreviewRow}>
                <View style={styles.previewRow}>
                    <View style={styles.container}>
                        <ExpoImage
                            source={{ uri: thumbnailUri || undefined }}
                            style={styles.image}
                            contentFit="cover"
                            cachePolicy="disk"
                        />
                    </View>
                    <View style={styles.progressColumn}>
                        {isSuccess ? (
                            <>
                                <Text style={styles.successTitleText}>{successTitle}</Text>
                                <Text style={styles.hintText}>Payla\u015f ve ilk etkile\u015fimi al.</Text>
                            </>
                        ) : (
                            <Text style={styles.hintText}>{hintText}</Text>
                        )}
                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${displayProgress}%` }]}>
                                <LinearGradient
                                    colors={gradientConfig.colors}
                                    locations={gradientConfig.locations}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={styles.progressGradient}
                                />
                            </View>
                        </View>
                    </View>
                </View>
            </View>
            <View style={[styles.uploadPreviewDivider, { backgroundColor: borderColor }]} />
        </>
    );
}

const styles = StyleSheet.create({
    uploadPreviewRow: {
        width: '100%',
        alignItems: 'flex-start',
        justifyContent: 'center',
        marginTop: 6,
        marginBottom: 18,
    },
    uploadPreviewDivider: {
        width: '100%',
        height: 1,
        opacity: 0.35,
        marginBottom: 12,
    },
    previewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    container: {
        height: 70,
        aspectRatio: 2 / 3,
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.55)',
        backgroundColor: '#000',
        marginTop: 4,
    },
    image: {
        width: '100%',
        height: '100%',
    },
    progressColumn: {
        minWidth: 276,
        marginTop: 8,
        gap: 6,
    },
    hintText: {
        color: 'rgba(255,255,255,0.78)',
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 14,
    },
    successTitleText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        lineHeight: 20,
        ...textShadowStyle('rgba(0, 0, 0, 0.45)', { width: 0, height: 1 }, 2),
    },
    progressTrack: {
        height: 5,
        width: '100%',
        borderRadius: 2,
        backgroundColor: 'rgba(154,154,154,0.45)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressGradient: {
        width: '100%',
        height: '100%',
    },
});
