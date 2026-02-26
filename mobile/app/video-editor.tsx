import React, { useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { ArrowLeft, Check } from 'lucide-react-native';
import { Image } from 'expo-image';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import {
    UploadComposerCropRatio,
    UploadComposerFilterPreset,
    useUploadComposerStore
} from '../src/presentation/store/useUploadComposerStore';
import { textShadowStyle } from '../src/core/utils/shadow';
import {
    DEFAULT_SUBTITLE_STYLE,
    SUBTITLE_BORDER_RADIUS,
    SUBTITLE_DEFAULT_BOTTOM_OFFSET,
    SUBTITLE_MIN_HEIGHT,
    SUBTITLE_SIDE_MARGIN,
    SUBTITLE_TEXT_BASE_STYLE,
    getSubtitlePresentationPixelStyle,
    getSubtitleWrapperStyle,
    resolveSubtitleStyle,
} from '../src/core/utils/subtitleOverlay';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ITEM_WIDTH = SCREEN_WIDTH;
const PREVIEW_ASPECT_RATIO_DEFAULT = 16 / 9;
const PREVIEW_BORDER_RADIUS = 20;
const SPEED_OPTIONS = [0.5, 1, 1.5, 2];
const CROP_OPTIONS: Array<{ id: UploadComposerCropRatio; label: string; ratio: number }> = [
    { id: '9:16', label: '9:16', ratio: 16 / 9 },
    { id: '1:1', label: '1:1', ratio: 1 },
    { id: '16:9', label: '16:9', ratio: 9 / 16 },
];
const FILTER_OPTIONS: Array<{ id: UploadComposerFilterPreset; label: string }> = [
    { id: 'none', label: 'Orijinal' },
    { id: 'warm', label: 'Sicak' },
    { id: 'cool', label: 'Soguk' },
    { id: 'mono', label: 'Mono' },
];

const formatSeconds = (value: number) => {
    const safe = Math.max(0, value);
    const minutes = Math.floor(safe / 60);
    const seconds = Math.floor(safe % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function VideoEditorScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const modalTheme = useSurfaceTheme(true);
    const draft = useUploadComposerStore((state) => state.draft);
    const setDraft = useUploadComposerStore((state) => state.setDraft);
    const subtitleCache = useUploadComposerStore((state) => state.subtitleCache);
    const subtitlePresentationCache = useUploadComposerStore((state) => state.subtitlePresentationCache);
    const subtitleStyleCache = useUploadComposerStore((state) => state.subtitleStyleCache);

    const firstVideoIndex = useMemo(() => {
        if (!draft) return -1;
        return draft.selectedAssets.findIndex((asset) => asset.type === 'video');
    }, [draft]);

    const initialVideoIndex = useMemo(() => {
        if (!draft) return -1;
        if (draft.selectedAssets[draft.coverAssetIndex]?.type === 'video') return draft.coverAssetIndex;
        return firstVideoIndex;
    }, [draft, firstVideoIndex]);

    const [editVideoIndex, setEditVideoIndex] = useState(initialVideoIndex);
    const [durationSec, setDurationSec] = useState(0);
    const [trimStartSec, setTrimStartSec] = useState(draft?.trimStartSec ?? 0);
    const [trimEndSec, setTrimEndSec] = useState(draft?.trimEndSec ?? 0);
    const [coverTimeSec, setCoverTimeSec] = useState(draft?.coverTimeSec ?? 0);
    const [coverAssetIndex, setCoverAssetIndex] = useState(draft?.coverAssetIndex ?? 0);
    const [currentVideoTimeMs, setCurrentVideoTimeMs] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [previewPositionSec, setPreviewPositionSec] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(draft?.playbackRate ?? 1);
    const [videoVolume, setVideoVolume] = useState(draft?.videoVolume ?? 1);
    const [cropRatio, setCropRatio] = useState<UploadComposerCropRatio>(draft?.cropRatio ?? '9:16');
    const [filterPreset, setFilterPreset] = useState<UploadComposerFilterPreset>(draft?.filterPreset ?? 'none');
    const [previewLayout, setPreviewLayout] = useState({
        width: PREVIEW_ITEM_WIDTH,
        height: PREVIEW_ITEM_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT,
    });
    const previewVideoRef = useRef<any>(null);

    if (!draft) {
        return (
            <View style={[styles.emptyRoot, { backgroundColor: '#080A0F' }]}>
                <Text style={styles.emptyText}>Düzenlenecek taslak bulunamadı.</Text>
                <Pressable onPress={() => router.back()} style={styles.emptyButton}>
                    <Text style={styles.emptyButtonText}>Geri Dön</Text>
                </Pressable>
            </View>
        );
    }

    if (firstVideoIndex === -1) {
        return (
            <View style={[styles.emptyRoot, { backgroundColor: '#080A0F' }]}>
                <Text style={styles.emptyText}>Bu taslakta video bulunamadı.</Text>
                <Pressable onPress={() => router.back()} style={styles.emptyButton}>
                    <Text style={styles.emptyButtonText}>Geri Dön</Text>
                </Pressable>
            </View>
        );
    }

    const activeVideoIndex = editVideoIndex >= 0 ? editVideoIndex : firstVideoIndex;
    const activeVideo = draft.selectedAssets[activeVideoIndex];
    const resolvedTrimEnd = trimEndSec > trimStartSec ? trimEndSec : Math.max(trimStartSec + 1, durationSec || trimStartSec + 1);
    const maxEndValue = Math.max(trimStartSec + 1, durationSec || trimStartSec + 1);
    const subtitleLanguage = draft.subtitleLanguage ?? 'auto';
    const subtitleSegments = subtitleCache[activeVideo.uri]?.segments ?? [];
    const activeSubtitleIndex = subtitleSegments.findIndex((segment) => currentVideoTimeMs >= segment.startMs && currentVideoTimeMs <= segment.endMs);
    const activeSubtitle = activeSubtitleIndex >= 0 ? subtitleSegments[activeSubtitleIndex] : null;
    const subtitlePresentation = subtitlePresentationCache[activeVideo.uri];
    const subtitleStyle = subtitleStyleCache[activeVideo.uri] || DEFAULT_SUBTITLE_STYLE;
    const resolvedSubtitleStyle = resolveSubtitleStyle(subtitleStyle);
    const previewAspectRatio = CROP_OPTIONS.find((option) => option.id === cropRatio)?.ratio ?? PREVIEW_ASPECT_RATIO_DEFAULT;
    const previewHeight = PREVIEW_ITEM_WIDTH * previewAspectRatio;
    const filterOverlayStyle = (() => {
        if (filterPreset === 'warm') return { backgroundColor: 'rgba(255, 146, 72, 0.18)' };
        if (filterPreset === 'cool') return { backgroundColor: 'rgba(80, 146, 255, 0.18)' };
        if (filterPreset === 'mono') return { backgroundColor: 'rgba(0, 0, 0, 0.28)' };
        return null;
    })();

    const subtitlePositionStyle = getSubtitlePresentationPixelStyle(
        subtitlePresentation,
        previewLayout.width,
        previewLayout.height
    );

    const saveChanges = () => {
        const finalEnd = clamp(resolvedTrimEnd, trimStartSec + 1, maxEndValue);
        setDraft({
            ...draft,
            coverAssetIndex,
            coverTimeSec: clamp(coverTimeSec, 0, Math.max(0, durationSec)),
            playbackRate: clamp(playbackRate, 0.5, 2),
            videoVolume: clamp(videoVolume, 0, 1),
            cropRatio,
            filterPreset,
            trimStartSec: clamp(trimStartSec, 0, Math.max(0, finalEnd - 1)),
            trimEndSec: finalEnd,
        });
        Alert.alert('Kaydedildi', 'Video düzenleme ayarları güncellendi.');
        router.back();
    };

    const handleResetEditing = () => {
        setTrimStartSec(0);
        setTrimEndSec(Math.max(0, durationSec));
        setCoverTimeSec(0);
        setPreviewPositionSec(0);
        setCurrentVideoTimeMs(0);
        setPlaybackRate(1);
        setVideoVolume(1);
        setCropRatio('9:16');
        setFilterPreset('none');
        setIsPaused(false);
        previewVideoRef.current?.seek(0);
    };

    return (
        <View style={[styles.container, { backgroundColor: modalTheme.fullScreenBackground }]}>
            <SystemBars
                style={{
                    statusBar: isDark ? 'light' : 'dark',
                    navigationBar: isDark ? 'light' : 'dark',
                }}
            />

            <View style={{ height: insets.top, backgroundColor: modalTheme.fullScreenBackground }} />

            <Pressable
                onPress={() => router.back()}
                style={[styles.floatingCloseButton, { top: insets.top + 15, left: 16 }]}
            >
                <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
                    <ArrowLeft color="#FFFFFF" size={28} strokeWidth={2} />
                </BlurView>
            </Pressable>

            <Pressable
                onPress={saveChanges}
                style={[styles.floatingCheckButton, { top: insets.top + 15, right: 16 }]}
            >
                <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
                    <Check size={28} color="#FFFFFF" />
                </BlurView>
            </Pressable>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
                <View style={styles.previewSection}>
                    <View
                        style={[styles.previewWrap, { height: previewHeight }]}
                        onLayout={(event) => {
                            const { width, height } = event.nativeEvent.layout;
                            setPreviewLayout({ width, height });
                        }}
                    >
                        <Video
                            ref={previewVideoRef}
                            source={{ uri: activeVideo.uri }}
                            style={styles.previewVideo}
                            resizeMode="cover"
                            repeat
                            paused={isPaused}
                            rate={playbackRate}
                            volume={videoVolume}
                            muted={videoVolume <= 0.01}
                            onLoad={(evt) => {
                                const nextDuration = Math.max(1, Math.floor(evt.duration || 0));
                                setDurationSec(nextDuration);
                                if (trimEndSec <= trimStartSec) setTrimEndSec(nextDuration);
                                if (coverTimeSec > nextDuration) setCoverTimeSec(nextDuration);
                                if (previewPositionSec > nextDuration) {
                                    setPreviewPositionSec(nextDuration);
                                }
                            }}
                            onProgress={(data) => {
                                if (isScrubbing) return;
                                setPreviewPositionSec(data.currentTime);
                                setCurrentVideoTimeMs(data.currentTime * 1000);
                            }}
                        />

                        {filterOverlayStyle ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, filterOverlayStyle]} /> : null}

                        {activeSubtitle && subtitleLanguage !== 'none' && (
                            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                                <View
                                    style={[
                                        styles.readonlySubtitleOverlay,
                                        subtitlePositionStyle || styles.readonlySubtitleOverlayDefault,
                                    ]}
                                >
                                    <View
                                        style={[
                                            styles.readonlySubtitleWrapper,
                                            getSubtitleWrapperStyle(
                                                resolvedSubtitleStyle.showOverlay,
                                                resolvedSubtitleStyle.overlayColor
                                            )
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.readonlySubtitleText,
                                                {
                                                    fontSize: resolvedSubtitleStyle.fontSize,
                                                    lineHeight: resolvedSubtitleStyle.lineHeight,
                                                    textAlign: resolvedSubtitleStyle.textAlign,
                                                    color: resolvedSubtitleStyle.textColor,
                                                    fontFamily: resolvedSubtitleStyle.fontFamily,
                                                    fontWeight: resolvedSubtitleStyle.fontWeight,
                                                },
                                            ]}
                                        >
                                            {activeSubtitle.text}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: modalTheme.textPrimary }]}>Önizleme</Text>
                    <View style={styles.rowBetween}>
                        <Text style={[styles.metaLabel, { color: modalTheme.textSecondary }]}>Zaman</Text>
                        <Text style={[styles.metaValue, { color: modalTheme.textPrimary }]}>
                            {`${formatSeconds(previewPositionSec)} / ${formatSeconds(durationSec)}`}
                        </Text>
                    </View>
                    <Slider
                        value={clamp(previewPositionSec, 0, Math.max(1, durationSec))}
                        minimumValue={0}
                        maximumValue={Math.max(1, durationSec)}
                        step={0.1}
                        minimumTrackTintColor="#3A8DFF"
                        maximumTrackTintColor="rgba(255,255,255,0.25)"
                        thumbTintColor="#3A8DFF"
                        onSlidingStart={() => setIsScrubbing(true)}
                        onValueChange={(value) => {
                            setPreviewPositionSec(value);
                            setCurrentVideoTimeMs(value * 1000);
                        }}
                        onSlidingComplete={(value) => {
                            const next = clamp(value, 0, Math.max(0, durationSec));
                            setPreviewPositionSec(next);
                            setCurrentVideoTimeMs(next * 1000);
                            setIsScrubbing(false);
                            previewVideoRef.current?.seek(next);
                        }}
                    />

                    <View style={styles.previewActionRow}>
                        <Pressable style={styles.previewActionButton} onPress={() => setIsPaused((prev) => !prev)}>
                            <Text style={styles.previewActionText}>{isPaused ? 'Oynat' : 'Duraklat'}</Text>
                        </Pressable>
                        <Pressable style={styles.previewActionButton} onPress={handleResetEditing}>
                            <Text style={styles.previewActionText}>Sifirla</Text>
                        </Pressable>
                        <View style={styles.rateChipsRow}>
                            {SPEED_OPTIONS.map((speed) => (
                                <Pressable
                                    key={speed}
                                    onPress={() => setPlaybackRate(speed)}
                                    style={[styles.rateChip, playbackRate === speed && styles.rateChipActive]}
                                >
                                    <Text style={[styles.rateChipText, playbackRate === speed && styles.rateChipTextActive]}>
                                        {`${speed}x`}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.rowBetween}>
                        <Text style={[styles.metaLabel, { color: modalTheme.textSecondary }]}>Ses</Text>
                        <Text style={[styles.metaValue, { color: modalTheme.textPrimary }]}>{`${Math.round(videoVolume * 100)}%`}</Text>
                    </View>
                    <Slider
                        value={videoVolume}
                        minimumValue={0}
                        maximumValue={1}
                        step={0.05}
                        minimumTrackTintColor="#3A8DFF"
                        maximumTrackTintColor="rgba(255,255,255,0.25)"
                        thumbTintColor="#3A8DFF"
                        onValueChange={setVideoVolume}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: modalTheme.textPrimary }]}>Trim</Text>
                    <View style={styles.rowBetween}>
                        <Text style={[styles.metaLabel, { color: modalTheme.textSecondary }]}>Başlangıç</Text>
                        <Text style={[styles.metaValue, { color: modalTheme.textPrimary }]}>{formatSeconds(trimStartSec)}</Text>
                    </View>
                    <Slider
                        value={trimStartSec}
                        minimumValue={0}
                        maximumValue={Math.max(0, resolvedTrimEnd - 1)}
                        step={1}
                        minimumTrackTintColor="#3A8DFF"
                        maximumTrackTintColor="rgba(255,255,255,0.25)"
                        thumbTintColor="#3A8DFF"
                        onValueChange={(value) => {
                            const nextStart = Math.floor(value);
                            setTrimStartSec(nextStart);
                            if (trimEndSec <= nextStart) {
                                setTrimEndSec(Math.min(Math.max(nextStart + 1, 1), maxEndValue));
                            }
                        }}
                        onSlidingComplete={(value) => {
                            const next = Math.floor(value);
                            setPreviewPositionSec(next);
                            setCurrentVideoTimeMs(next * 1000);
                            previewVideoRef.current?.seek(next);
                        }}
                    />

                    <View style={styles.rowBetween}>
                        <Text style={[styles.metaLabel, { color: modalTheme.textSecondary }]}>Bitiş</Text>
                        <Text style={[styles.metaValue, { color: modalTheme.textPrimary }]}>{formatSeconds(resolvedTrimEnd)}</Text>
                    </View>
                    <Slider
                        value={resolvedTrimEnd}
                        minimumValue={Math.min(maxEndValue, trimStartSec + 1)}
                        maximumValue={maxEndValue}
                        step={1}
                        minimumTrackTintColor="#3A8DFF"
                        maximumTrackTintColor="rgba(255,255,255,0.25)"
                        thumbTintColor="#3A8DFF"
                        onValueChange={(value) => setTrimEndSec(Math.floor(value))}
                        onSlidingComplete={(value) => {
                            const next = Math.floor(value);
                            setPreviewPositionSec(next);
                            setCurrentVideoTimeMs(next * 1000);
                            previewVideoRef.current?.seek(next);
                        }}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: modalTheme.textPrimary }]}>Kirpma Orani</Text>
                    <View style={styles.chipsRow}>
                        {CROP_OPTIONS.map((option) => (
                            <Pressable
                                key={option.id}
                                onPress={() => setCropRatio(option.id)}
                                style={[styles.chip, cropRatio === option.id && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, cropRatio === option.id && styles.chipTextActive]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: modalTheme.textPrimary }]}>Filtre</Text>
                    <View style={styles.chipsRow}>
                        {FILTER_OPTIONS.map((option) => (
                            <Pressable
                                key={option.id}
                                onPress={() => setFilterPreset(option.id)}
                                style={[styles.chip, filterPreset === option.id && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, filterPreset === option.id && styles.chipTextActive]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: modalTheme.textPrimary }]}>Kapak Anı</Text>
                    <View style={styles.rowBetween}>
                        <Text style={[styles.metaLabel, { color: modalTheme.textSecondary }]}>Seçilen an</Text>
                        <Text style={[styles.metaValue, { color: modalTheme.textPrimary }]}>{formatSeconds(coverTimeSec)}</Text>
                    </View>
                    <Slider
                        value={clamp(coverTimeSec, 0, Math.max(0, durationSec))}
                        minimumValue={0}
                        maximumValue={Math.max(1, durationSec)}
                        step={1}
                        minimumTrackTintColor="#3A8DFF"
                        maximumTrackTintColor="rgba(255,255,255,0.25)"
                        thumbTintColor="#3A8DFF"
                        onValueChange={(value) => setCoverTimeSec(Math.floor(value))}
                        onSlidingComplete={(value) => {
                            const next = Math.floor(value);
                            setPreviewPositionSec(next);
                            setCurrentVideoTimeMs(next * 1000);
                            previewVideoRef.current?.seek(next);
                        }}
                    />
                    <Text style={[styles.helpText, { color: modalTheme.textSecondary }]}>
                        Kapak anı kaydedilir; yükleme sırasında kapak oluşturma akışında kullanılacaktır.
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: modalTheme.textPrimary }]}>Kapak Medyası</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coverList}>
                        {draft.selectedAssets.map((asset, idx) => (
                            <Pressable
                                key={`${asset.uri}-${idx}`}
                                onPress={() => {
                                    setCoverAssetIndex(idx);
                                    if (asset.type === 'video') setEditVideoIndex(idx);
                                }}
                                style={[
                                    styles.coverItem,
                                    coverAssetIndex === idx && styles.coverItemActive,
                                ]}
                            >
                                <Image source={{ uri: asset.uri }} style={styles.coverThumb} contentFit="cover" />
                                <Text style={styles.coverType}>{asset.type === 'video' ? 'Video' : 'Görsel'}</Text>
                            </Pressable>
                        ))}
                    </ScrollView>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    floatingCloseButton: {
        position: 'absolute',
        zIndex: 1000,
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    blurContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.38)',
    },
    floatingCheckButton: {
        position: 'absolute',
        zIndex: 1000,
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
    },
    content: {
        gap: 14,
    },
    previewSection: {
        width: SCREEN_WIDTH,
    },
    previewWrap: {
        width: PREVIEW_ITEM_WIDTH,
        height: PREVIEW_ITEM_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT,
        borderRadius: PREVIEW_BORDER_RADIUS,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        alignSelf: 'center',
    },
    previewVideo: {
        width: '100%',
        height: '100%',
    },
    readonlySubtitleOverlay: {
        position: 'absolute',
        minHeight: SUBTITLE_MIN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        ...textShadowStyle('#000000', { width: 0, height: 1 }, 2),
    },
    readonlySubtitleOverlayDefault: {
        alignSelf: 'center',
        bottom: SUBTITLE_DEFAULT_BOTTOM_OFFSET,
        maxWidth: PREVIEW_ITEM_WIDTH - (SUBTITLE_SIDE_MARGIN * 2),
    },
    readonlySubtitleWrapper: {
        borderRadius: SUBTITLE_BORDER_RADIUS,
        alignSelf: 'stretch',
    },
    readonlySubtitleText: {
        ...SUBTITLE_TEXT_BASE_STYLE,
    },
    section: {
        borderRadius: 12,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 8,
        marginHorizontal: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    metaValue: {
        fontSize: 13,
        fontWeight: '700',
    },
    helpText: {
        fontSize: 12,
        lineHeight: 17,
    },
    previewActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    previewActionButton: {
        paddingHorizontal: 14,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    previewActionText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
    rateChipsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    rateChip: {
        minWidth: 42,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    rateChipActive: {
        backgroundColor: 'rgba(58,141,255,0.2)',
        borderColor: 'rgba(58,141,255,0.9)',
    },
    rateChipText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '700',
    },
    rateChipTextActive: {
        color: '#3A8DFF',
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        height: 32,
        paddingHorizontal: 12,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    chipActive: {
        borderColor: 'rgba(58,141,255,0.95)',
        backgroundColor: 'rgba(58,141,255,0.18)',
    },
    chipText: {
        color: 'rgba(255,255,255,0.82)',
        fontSize: 12,
        fontWeight: '700',
    },
    chipTextActive: {
        color: '#3A8DFF',
    },
    coverList: {
        gap: 10,
        paddingVertical: 4,
    },
    coverItem: {
        width: 92,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        backgroundColor: 'rgba(0,0,0,0.25)',
    },
    coverItemActive: {
        borderColor: '#3A8DFF',
        borderWidth: 2,
    },
    coverThumb: {
        width: '100%',
        height: 92,
    },
    coverType: {
        color: '#FFFFFF',
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '700',
        paddingVertical: 6,
    },
    emptyRoot: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 12,
    },
    emptyText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyButton: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#3A8DFF',
    },
    emptyButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});
