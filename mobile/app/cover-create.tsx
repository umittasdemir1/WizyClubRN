import React, { useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SystemBars } from 'react-native-edge-to-edge';
import Video from 'react-native-video';
import { createVideoThumbnail } from 'react-native-compressor';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ASPECT_RATIO = 16 / 9;
const PREVIEW_WIDTH = SCREEN_WIDTH;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * PREVIEW_ASPECT_RATIO;
const PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN = 0.44;
const PREVIEW_MENU_GAP_WHEN_DESCRIPTION_EDITOR_OPEN = 0;
const PREVIEW_TOP_GAP_WHEN_DESCRIPTION_EDITOR_OPEN = 20;
const PREVIEW_COLLAPSED_TRANSLATE_Y = (
    PREVIEW_TOP_GAP_WHEN_DESCRIPTION_EDITOR_OPEN -
    (PREVIEW_HEIGHT * (1 - PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN)) / 2
) / PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN;
const PREVIEW_COLLAPSED_MARGIN_BOTTOM =
    PREVIEW_MENU_GAP_WHEN_DESCRIPTION_EDITOR_OPEN -
    (PREVIEW_HEIGHT * (1 - PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN)) / 2 +
    (PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN * PREVIEW_COLLAPSED_TRANSLATE_Y);
const THUMBNAIL_INTERVAL_SEC = 2;
const THUMBNAIL_STRIP_WIDTH = 56;
const THUMBNAIL_STRIP_HEIGHT = Math.round(THUMBNAIL_STRIP_WIDTH * PREVIEW_ASPECT_RATIO);
const SEEK_EPSILON_SEC = 0.05;

type CoverImageSource = React.ComponentProps<typeof Image>['source'];
type ThumbnailStatus = 'loading' | 'ready' | 'error';

type ThumbnailItem = {
    source: CoverImageSource | null;
    status: ThumbnailStatus;
    timeSec: number;
};

const getInitialDurationSec = (value: unknown): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parsed > 1000 ? parsed / 1000 : parsed;
};

const normalizeThumbnailPath = (path: string): string => {
    if (path.startsWith('file://') || path.startsWith('content://') || path.startsWith('http')) {
        return path;
    }
    return `file://${path}`;
};

const getImageSourceUri = (source: CoverImageSource | null): string | undefined => {
    if (!source) return undefined;
    if (typeof source === 'string') return source;

    if (Array.isArray(source)) {
        const first = source[0];
        if (typeof first === 'string') return first;
        if (first && typeof first === 'object' && 'uri' in first && typeof first.uri === 'string') {
            return first.uri;
        }
        return undefined;
    }

    if (typeof source === 'object' && 'uri' in source && typeof source.uri === 'string') {
        return source.uri;
    }

    return undefined;
};

export default function CoverCreateScreen() {
    const insets = useSafeAreaInsets();
    const { isDark } = useThemeStore();
    const modalTheme = useSurfaceTheme(true);
    const draft = useUploadComposerStore((state) => state.draft);
    const coverPreviewSource = useUploadComposerStore((state) => state.coverPreviewSource);
    const setDraft = useUploadComposerStore((state) => state.setDraft);
    const setCoverPreviewSource = useUploadComposerStore((state) => state.setCoverPreviewSource);

    const previewAsset = useMemo(() => {
        if (!draft?.selectedAssets?.length) return null;

        const rawIndex = typeof draft.coverAssetIndex === 'number' ? draft.coverAssetIndex : 0;
        const safeIndex = Math.min(Math.max(rawIndex, 0), draft.selectedAssets.length - 1);

        return draft.selectedAssets[safeIndex] ?? draft.selectedAssets[0] ?? null;
    }, [draft]);

    const initialDurationSec = useMemo(
        () => getInitialDurationSec((previewAsset as Record<string, unknown> | null)?.duration),
        [previewAsset]
    );

    const [resolvedDurationSec, setResolvedDurationSec] = useState(initialDurationSec);
    const [selectedThumbnailTimeSec, setSelectedThumbnailTimeSec] = useState(
        typeof draft?.coverTimeSec === 'number' && Number.isFinite(draft.coverTimeSec)
            ? Math.max(0, draft.coverTimeSec)
            : 0
    );
    const [thumbnailItems, setThumbnailItems] = useState<ThumbnailItem[]>([]);
    const [hasManualSelection, setHasManualSelection] = useState(false);
    const [isCustomThumbnailSelected, setIsCustomThumbnailSelected] = useState(
        typeof draft?.coverTimeSec !== 'number' && Boolean(draft?.selectedThumbnailUri)
    );
    const [isPickingCustomThumbnail, setIsPickingCustomThumbnail] = useState(false);
    const [selectedPreviewSource, setSelectedPreviewSource] = useState<CoverImageSource | null>(
        (coverPreviewSource as CoverImageSource) ?? null
    );

    useEffect(() => {
        if (initialDurationSec <= 0) return;
        setResolvedDurationSec((current) => (current > 0 ? current : initialDurationSec));
    }, [initialDurationSec]);

    const thumbnailTimes = useMemo(() => {
        if (!previewAsset || previewAsset.type !== 'video') return [];

        const trimStartSec =
            typeof draft?.trimStartSec === 'number' && Number.isFinite(draft.trimStartSec)
                ? Math.max(0, draft.trimStartSec)
                : 0;
        const trimEndSec =
            typeof draft?.trimEndSec === 'number' && Number.isFinite(draft.trimEndSec)
                ? Math.max(0, draft.trimEndSec)
                : 0;
        const effectiveDurationSec = resolvedDurationSec > 0 ? resolvedDurationSec : initialDurationSec;
        const hasTrimRange = trimEndSec > trimStartSec;
        const startSec = hasTrimRange ? trimStartSec : 0;
        const endSec = hasTrimRange
            ? (effectiveDurationSec > 0 ? Math.min(trimEndSec, effectiveDurationSec) : trimEndSec)
            : effectiveDurationSec;

        if (!Number.isFinite(endSec) || endSec <= startSec) return [];

        const frameCount = Math.max(1, Math.ceil((endSec - startSec) / THUMBNAIL_INTERVAL_SEC));

        return Array.from({ length: frameCount }, (_, index) =>
            Number((startSec + (index * THUMBNAIL_INTERVAL_SEC)).toFixed(3))
        );
    }, [draft?.trimEndSec, draft?.trimStartSec, initialDurationSec, previewAsset, resolvedDurationSec]);
    const thumbnailTimesKey = useMemo(
        () => thumbnailTimes.map((timeSec) => timeSec.toFixed(3)).join('|'),
        [thumbnailTimes]
    );
    const shouldResolveDurationFromVideo = resolvedDurationSec <= 0 && initialDurationSec <= 0;

    useEffect(() => {
        if (!previewAsset || previewAsset.type !== 'video' || thumbnailTimes.length === 0) {
            setThumbnailItems([]);
            return;
        }

        let isCancelled = false;
        const cacheSeed = String(previewAsset.assetId ?? previewAsset.uri)
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .slice(-48);

        setThumbnailItems(thumbnailTimes.map((timeSec) => ({
            source: null,
            status: 'loading',
            timeSec,
        })));

        void (async () => {
            for (let index = 0; index < thumbnailTimes.length; index += 1) {
                if (isCancelled) return;

                const timeSec = thumbnailTimes[index];
                const requestMs = Math.max(Math.round(Math.max(timeSec, SEEK_EPSILON_SEC) * 1000), 50);

                try {
                    const generated = await createVideoThumbnail(previewAsset.uri, {
                        cacheName: `cover_${cacheSeed}_${requestMs}`,
                        time: requestMs,
                    } as any);
                    const nextSource = { uri: normalizeThumbnailPath(generated.path) };

                    if (isCancelled) return;

                    setThumbnailItems((current) => {
                        const next = [...current];
                        if (!next[index]) return current;
                        next[index] = {
                            source: nextSource,
                            status: 'ready',
                            timeSec,
                        };
                        return next;
                    });
                } catch {
                    if (isCancelled) return;

                    setThumbnailItems((current) => {
                        const next = [...current];
                        if (!next[index]) return current;
                        next[index] = {
                            ...next[index],
                            status: 'error',
                        };
                        return next;
                    });
                }
            }
        })();

        return () => {
            isCancelled = true;
        };
    }, [previewAsset, thumbnailTimes, thumbnailTimesKey]);

    useEffect(() => {
        if (hasManualSelection) return;

        if (coverPreviewSource) {
            setSelectedPreviewSource(coverPreviewSource as CoverImageSource);
            return;
        }

        const matchedThumbnail = thumbnailItems.find((item) => (
            item.source && Math.abs(item.timeSec - selectedThumbnailTimeSec) < 0.001
        ));

        if (matchedThumbnail?.source) {
            setSelectedPreviewSource(matchedThumbnail.source);
            return;
        }

        const firstReadyThumbnail = thumbnailItems.find((item) => item.source);
        if (firstReadyThumbnail?.source) {
            setSelectedPreviewSource(firstReadyThumbnail.source);
        }
    }, [coverPreviewSource, hasManualSelection, selectedThumbnailTimeSec, thumbnailItems]);

    const handleDone = () => {
        if (!draft) {
            router.back();
            return;
        }

        setDraft({
            ...draft,
            selectedThumbnailUri: getImageSourceUri(selectedPreviewSource),
            coverTimeSec: isCustomThumbnailSelected ? undefined : selectedThumbnailTimeSec,
        });
        setCoverPreviewSource(selectedPreviewSource);
        router.back();
    };

    const handlePickCustomThumbnail = async () => {
        if (isPickingCustomThumbnail) return;

        setIsPickingCustomThumbnail(true);

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 1,
            });

            if (result.canceled || !result.assets?.length) return;

            const pickedAsset = result.assets[0];
            if (!pickedAsset?.uri) return;

            setHasManualSelection(true);
            setIsCustomThumbnailSelected(true);
            setSelectedPreviewSource({ uri: pickedAsset.uri });
        } finally {
            setIsPickingCustomThumbnail(false);
        }
    };

    if (!draft || !previewAsset || previewAsset.type !== 'video') {
        return (
            <View style={[styles.container, { backgroundColor: modalTheme.fullScreenBackground }]}>
                <SystemBars
                    style={{
                        statusBar: isDark ? 'light' : 'dark',
                        navigationBar: isDark ? 'light' : 'dark',
                    }}
                />
                <View style={[styles.header, { paddingTop: insets.top, backgroundColor: modalTheme.fullScreenBackground }]}>
                    <View style={styles.headerLeft}>
                        <Pressable onPress={() => router.back()} style={styles.backButton}>
                            <ArrowLeft color={modalTheme.textPrimary} size={32} strokeWidth={1.8} />
                        </Pressable>
                    </View>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: modalTheme.textPrimary }]}>Kapak Oluştur</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <Pressable onPress={() => router.back()} style={styles.doneButton}>
                            <Text style={[styles.doneButtonText, { color: '#0A84FF' }]}>Bitti</Text>
                        </Pressable>
                    </View>
                </View>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyStateText, { color: modalTheme.textSecondary }]}>
                        Kapak oluşturmak için kullanılabilir bir video bulunamadı.
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: modalTheme.fullScreenBackground }]}>
            <SystemBars
                style={{
                    statusBar: isDark ? 'light' : 'dark',
                    navigationBar: isDark ? 'light' : 'dark',
                }}
            />

            <View style={[styles.header, { paddingTop: insets.top, backgroundColor: modalTheme.fullScreenBackground }]}>
                <View style={styles.headerLeft}>
                    <Pressable onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft color={modalTheme.textPrimary} size={32} strokeWidth={1.8} />
                    </Pressable>
                </View>
                <View style={styles.headerCenter}>
                    <Text style={[styles.headerTitle, { color: modalTheme.textPrimary }]}>Kapak Oluştur</Text>
                </View>
                <View style={styles.headerRight}>
                    <Pressable onPress={handleDone} style={styles.doneButton}>
                        <Text style={[styles.doneButtonText, { color: '#0A84FF' }]}>Bitti</Text>
                    </Pressable>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.previewSection}>
                    <View style={styles.previewPage}>
                        <View
                            style={[
                                styles.previewContainer,
                                {
                                    width: PREVIEW_WIDTH,
                                    height: PREVIEW_HEIGHT,
                                    transform: [
                                        { scale: PREVIEW_SCALE_WHEN_DESCRIPTION_EDITOR_OPEN },
                                        { translateY: PREVIEW_COLLAPSED_TRANSLATE_Y },
                                    ],
                                    marginBottom: PREVIEW_COLLAPSED_MARGIN_BOTTOM,
                                },
                            ]}
                        >
                            {selectedPreviewSource ? (
                                <Image
                                    source={selectedPreviewSource}
                                    style={styles.previewImage}
                                    contentFit="cover"
                                />
                            ) : (
                                <View style={styles.previewPlaceholder} />
                            )}
                        </View>
                    </View>
                </View>

                <View style={styles.thumbnailSection}>
                            {thumbnailTimes.length > 0 ? (
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.thumbnailList}
                                >
                                    {thumbnailItems.map((item) => {
                                        const isSelected = !isCustomThumbnailSelected &&
                                            Math.abs(item.timeSec - selectedThumbnailTimeSec) < 0.001;

                                        return (
                                            <Pressable
                                                key={`thumb-${item.timeSec.toFixed(3)}`}
                                                onPress={() => {
                                                    setHasManualSelection(true);
                                                    setIsCustomThumbnailSelected(false);
                                                    setSelectedThumbnailTimeSec(item.timeSec);
                                                    if (item.source) {
                                                        setSelectedPreviewSource(item.source);
                                                    }
                                                }}
                                                style={[
                                                    styles.thumbnailButton,
                                                    isSelected && styles.thumbnailButtonActive,
                                                ]}
                                            >
                                                {item.source ? (
                                                    <Image
                                                        source={item.source}
                                                        style={styles.thumbnailImage}
                                                        contentFit="cover"
                                                    />
                                                ) : (
                                                    <View
                                                        style={[
                                                            styles.thumbnailPlaceholder,
                                                            item.status === 'error' && styles.thumbnailPlaceholderError,
                                                        ]}
                                                    />
                                                )}
                                                <View style={styles.thumbnailOverlay} />
                                            </Pressable>
                                        );
                                    })}
                                </ScrollView>
                    ) : (
                        <Text style={[styles.stateText, { color: modalTheme.textSecondary }]}>
                            Thumbnailler hazırlanıyor...
                        </Text>
                    )}
                </View>

                <View style={styles.galleryButtonSection}>
                    <Pressable
                        onPress={handlePickCustomThumbnail}
                        disabled={isPickingCustomThumbnail}
                        style={[
                            styles.galleryButton,
                            isPickingCustomThumbnail && styles.galleryButtonDisabled,
                        ]}
                    >
                        <Text style={styles.galleryButtonText}>Galeriden Seç</Text>
                    </Pressable>
                </View>
            </ScrollView>
            {shouldResolveDurationFromVideo ? (
                <Video
                    source={{ uri: previewAsset.uri }}
                    paused
                    muted
                    repeat={false}
                    resizeMode="cover"
                    style={styles.hiddenDurationVideo}
                    onLoad={(event) => {
                        const durationSec = Math.max(0, event.duration || 0);
                        if (durationSec <= 0) return;
                        setResolvedDurationSec((current) => (
                            current === durationSec ? current : durationSec
                        ));
                    }}
                />
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 82,
    },
    headerLeft: { width: 60, alignItems: 'flex-start' },
    headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    headerRight: { width: 60, alignItems: 'flex-end' },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' },
    doneButton: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    doneButtonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 0 },
    previewSection: {
        width: PREVIEW_WIDTH,
    },
    previewPage: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    previewContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        alignSelf: 'center',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    previewPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
    },
    thumbnailSection: {
        marginTop: 30,
        minHeight: THUMBNAIL_STRIP_HEIGHT,
    },
    thumbnailList: {
        paddingHorizontal: 20,
        gap: 4,
    },
    thumbnailButton: {
        width: THUMBNAIL_STRIP_WIDTH,
        height: THUMBNAIL_STRIP_HEIGHT,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: '#161A22',
    },
    thumbnailButtonActive: {
        borderColor: '#0A84FF',
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#202633',
    },
    thumbnailPlaceholderError: {
        backgroundColor: '#2A1A1A',
    },
    thumbnailOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8,10,15,0.34)',
    },
    hiddenDurationVideo: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
    stateText: {
        fontSize: 14,
        paddingHorizontal: 20,
    },
    galleryButtonSection: {
        marginTop: 30,
        alignItems: 'center',
    },
    galleryButton: {
        minWidth: 164,
        height: 48,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: '#0A84FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    galleryButtonDisabled: {
        opacity: 0.45,
    },
    galleryButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    emptyStateText: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
    },
});
