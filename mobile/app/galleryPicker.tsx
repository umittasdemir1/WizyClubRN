import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    FlatList,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import type * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Audio as CompressorAudio } from 'react-native-compressor';

import {
    ArrowLeft,
    Check,
    ChevronDown,
    Grid2x2Check,
    Image as ImageIcon,
    ImagePlay,
    ImageUp,
    LayoutGrid,
    SquarePlay,
    X,
} from 'lucide-react-native';
import { useGalleryPickerStore } from '../src/presentation/store/useGalleryPickerStore';
import { useUploadComposerStore } from '../src/presentation/store/useUploadComposerStore';

import { MediaFilterDropdown, MediaFilter, FILTER_OPTIONS } from '../src/presentation/components/upload/gallery/MediaFilterDropdown';
import { MediaGrid, CELL_WIDTH, CELL_HEIGHT } from '../src/presentation/components/upload/gallery/MediaGrid';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
const NUM_COLUMNS = 3;
const PAGE_SIZE = 30;
const MAX_SELECTION = 10;
const CACHE_TTL_MS = 5 * 60 * 1000;



export default function GalleryPickerScreen() {
    const insets = useSafeAreaInsets();
    const { createMode } = useLocalSearchParams<{ createMode?: string }>();
    const setPickedAssets = useGalleryPickerStore((state) => state.setPickedAssets);
    const setFilterCache = useGalleryPickerStore((state) => state.setFilterCache);
    const getFilterCache = useGalleryPickerStore((state) => state.getFilterCache);

    // Pre-extract audio from selected videos in the background.
    // Only local extraction happens here — NO Google STT API calls.
    // The extracted audio is stored so it's instantly available
    // when the user taps the captions button in upload-composer.
    const preExtractAudioForVideos = useCallback((mappedAssets: ImagePicker.ImagePickerAsset[]) => {
        const store = useUploadComposerStore.getState();
        mappedAssets.forEach((asset) => {
            if (asset.type !== 'video') return;
            const uri = asset.uri;
            if (!uri) return;
            if (store.preExtractedAudioCache[uri]) {
                console.log('[PRE-EXTRACT] Audio already cached for', uri.substring(uri.length - 30));
                return;
            }

            console.log('[PRE-EXTRACT] Starting audio extraction for', uri.substring(uri.length - 30));

            void (async () => {
                try {
                    const t0 = Date.now();
                    const audioUri = await CompressorAudio.compress(uri, {
                        quality: 'low',
                        bitrate: 64000,
                        channels: 1,
                        samplerate: 44100,
                    } as any);
                    const elapsed = Date.now() - t0;
                    if (audioUri) {
                        useUploadComposerStore.getState().setPreExtractedAudio(uri, audioUri);
                        console.log(`[PRE-EXTRACT] Audio ready in ${elapsed}ms →`, audioUri.substring(audioUri.length - 40));
                    }
                } catch (err) {
                    console.log('[PRE-EXTRACT] Extraction failed (will fallback):', err);
                    // Silently ignore — captions will fall back to video upload
                }
            })();
        });
    }, []);

    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
    const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [afterCursor, setAfterCursor] = useState<string | null>(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [mediaFilter, setMediaFilter] = useState<MediaFilter>('nearby');
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const filterLabel = FILTER_OPTIONS.find((option) => option.key === mediaFilter)?.label ?? 'Yakındakiler';
    const headerTitle = createMode === 'story'
        ? 'Hikaye Oluştur'
        : createMode === 'draft'
            ? 'Taslak Oluştur'
            : 'Gönderi Oluştur';

    const mediaTypes = useMemo(() => {
        if (mediaFilter === 'photos') return [MediaLibrary.MediaType.photo];
        if (mediaFilter === 'videos') return [MediaLibrary.MediaType.video];
        return [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];
    }, [mediaFilter]);

    const requestPermission = useCallback(async () => {
        const current = await MediaLibrary.getPermissionsAsync();
        if (current.status === 'granted') {
            setPermissionGranted(true);
            return true;
        }
        const permission = await MediaLibrary.requestPermissionsAsync();
        const granted = permission.status === 'granted';
        setPermissionGranted(granted);
        return granted;
    }, []);

    const loadAssets = useCallback(async (reset: boolean) => {
        if (isLoading) return;
        if (!hasNextPage && !reset) return;

        setIsLoading(true);
        try {
            const result = await MediaLibrary.getAssetsAsync({
                first: PAGE_SIZE,
                after: reset ? undefined : (afterCursor ?? undefined),
                mediaType: mediaTypes,
                sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
            });

            const nextAssets = reset ? result.assets : [...assets, ...result.assets];
            const nextCursor = result.endCursor ?? null;
            const nextHasNext = result.hasNextPage;

            setAssets(nextAssets);
            setAfterCursor(nextCursor);
            setHasNextPage(nextHasNext);
            setFilterCache(mediaFilter, {
                assets: nextAssets,
                endCursor: nextCursor,
                hasNextPage: nextHasNext,
            });
        } finally {
            setIsLoading(false);
        }
    }, [afterCursor, assets, hasNextPage, isLoading, mediaFilter, mediaTypes, setFilterCache]);

    useEffect(() => {
        void requestPermission();
    }, [requestPermission]);

    useEffect(() => {
        if (!permissionGranted) return;

        const cached = getFilterCache(mediaFilter);
        const isFresh = !!cached && (Date.now() - cached.updatedAt) < CACHE_TTL_MS;
        const hasCachedAssets = !!cached?.assets?.length;

        if (hasCachedAssets) {
            setAssets(cached.assets);
            setAfterCursor(cached.endCursor);
            setHasNextPage(cached.hasNextPage);
            setIsLoading(false);
            if (isFresh) return;
        } else {
            setAssets([]);
            setAfterCursor(null);
            setHasNextPage(true);
            setIsLoading(true);
        }

        void (async () => {
            try {
                const result = await MediaLibrary.getAssetsAsync({
                    first: PAGE_SIZE,
                    mediaType: mediaTypes,
                    sortBy: [[MediaLibrary.SortBy.modificationTime, false]],
                });
                const nextCursor = result.endCursor ?? null;
                const nextHasNext = result.hasNextPage;
                setAssets(result.assets);
                setAfterCursor(nextCursor);
                setHasNextPage(nextHasNext);
                setFilterCache(mediaFilter, {
                    assets: result.assets,
                    endCursor: nextCursor,
                    hasNextPage: nextHasNext,
                });
            } finally {
                setIsLoading(false);
            }
        })();
    }, [getFilterCache, mediaFilter, mediaTypes, permissionGranted, setFilterCache]);

    const toggleSelect = useCallback((assetId: string) => {
        setSelectedIds((prev) => {
            const exists = prev.includes(assetId);
            if (exists) {
                const next = prev.filter((id) => id !== assetId);
                if (next.length === 0) setIsSelectionMode(false);
                return next;
            }
            if (prev.length >= MAX_SELECTION) return prev;
            return [...prev, assetId];
        });
    }, []);

    const formatDuration = useCallback((durationValue?: number) => {
        const durationSeconds = Math.max(0, Math.round(durationValue ?? 0));
        const minutes = Math.floor(durationSeconds / 60);
        const seconds = durationSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    const mapAssetToPickerAsset = useCallback((asset: MediaLibrary.Asset): ImagePicker.ImagePickerAsset => {
        const isVideo = asset.mediaType === 'video';
        return {
            uri: asset.uri,
            width: asset.width,
            height: asset.height,
            assetId: asset.id,
            fileName: asset.filename || undefined,
            fileSize: undefined,
            type: isVideo ? 'video' : 'image',
            duration: isVideo ? Math.round((asset.duration ?? 0) * 1000) : undefined,
            base64: null,
            exif: null,
            mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        };
    }, []);

    const commitSingleSelection = useCallback((asset: MediaLibrary.Asset) => {
        const mapped = [mapAssetToPickerAsset(asset)];
        setPickedAssets(mapped);


        // Match resolveCreateMode logic from upload.tsx
        const uploadMode = (createMode === 'story') ? 'story' : 'video';

        useUploadComposerStore.getState().setDraft({
            selectedAssets: mapped,
            uploadMode,
            coverAssetIndex: 0,
            playbackRate: 1,
            videoVolume: 1,
            cropRatio: '9:16',
            filterPreset: 'none',
            qualityPreset: 'medium',
            subtitleLanguage: 'auto',
            trimStartSec: 0,
            trimEndSec: 0,
        });

        preExtractAudioForVideos(mapped);

        router.push('/upload-composer');
    }, [createMode, mapAssetToPickerAsset, setPickedAssets, preExtractAudioForVideos]);

    const commitMultiSelection = useCallback(() => {
        if (selectedIds.length === 0) {
            router.back();
            return;
        }

        const assetById = new Map(assets.map((asset) => [asset.id, asset]));
        const selectedAssets = selectedIds
            .map((id) => assetById.get(id))
            .filter((asset): asset is MediaLibrary.Asset => Boolean(asset));

        const mapped = selectedAssets.map(mapAssetToPickerAsset);
        setPickedAssets(mapped);


        // Match resolveCreateMode logic from upload.tsx
        const uploadMode = (createMode === 'story') ? 'story' : 'video';

        useUploadComposerStore.getState().setDraft({
            selectedAssets: mapped,
            uploadMode,
            coverAssetIndex: 0,
            playbackRate: 1,
            videoVolume: 1,
            cropRatio: '9:16',
            filterPreset: 'none',
            qualityPreset: 'medium',
            subtitleLanguage: 'auto',
            trimStartSec: 0,
            trimEndSec: 0,
        });

        preExtractAudioForVideos(mapped);

        router.push('/upload-composer');
    }, [assets, createMode, mapAssetToPickerAsset, selectedIds, setPickedAssets, preExtractAudioForVideos]);

    if (permissionGranted === false) {
        return (
            <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
                <Text style={styles.permissionTitle}>Galeri izni gerekli</Text>
                <Pressable style={styles.permissionButton} onPress={() => void requestPermission()}>
                    <Text style={styles.permissionButtonText}>İzin ver</Text>
                </Pressable>
                <Pressable onPress={() => router.back()}>
                    <Text style={styles.cancelText}>Vazgeç</Text>
                </Pressable>
            </View>
        );
    }

    const headerPaddingTop = insets.top + 10;
    const dropdownTop = headerPaddingTop + 112;

    return (
        <View style={styles.container}>
            <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
                <View style={styles.headerTopRow}>
                    <View style={styles.headerLeft}>
                        <Pressable
                            style={styles.iconButton}
                            onPress={() => {
                                router.back();
                            }}
                        >
                            <ArrowLeft color="#FFFFFF" size={32} strokeWidth={1.8} />
                        </Pressable>
                    </View>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>{headerTitle}</Text>
                    </View>
                    <View style={styles.headerRight}>
                        <View style={styles.headerRightPlaceholder} />
                    </View>
                </View>
            </View>

            <View style={styles.filterBar}>
                <View style={styles.filterColLeft}>
                    <Pressable style={styles.filterTrigger} onPress={() => setIsFilterOpen((prev) => !prev)}>
                        <Text style={styles.filterTriggerText}>{filterLabel}</Text>
                        <ChevronDown color="#FFFFFF" size={18} />
                    </Pressable>
                </View>
                <View style={styles.filterColRight}>
                    <Pressable
                        onPress={() => {
                            setIsSelectionMode((prev) => {
                                const next = !prev;
                                if (!next) setSelectedIds([]);
                                return next;
                            });
                        }}
                    >
                        <View style={styles.selectActionContent}>
                            <Grid2x2Check size={20} color="#FFFFFF" strokeWidth={2} />
                            <Text style={styles.filterTriggerText}>Seç</Text>
                        </View>
                    </Pressable>
                </View>
            </View>

            <MediaFilterDropdown
                isOpen={isFilterOpen}
                setIsOpen={setIsFilterOpen}
                currentFilter={mediaFilter}
                setMediaFilter={setMediaFilter}
                dropdownTop={dropdownTop}
            />

            <MediaGrid
                assets={assets}
                isLoading={isLoading}
                insets={insets}
                loadAssets={loadAssets}
                isSelectionMode={isSelectionMode}
                setIsSelectionMode={setIsSelectionMode}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
                commitSingleSelection={commitSingleSelection}
                commitMultiSelection={commitMultiSelection}
                toggleSelect={toggleSelect}
                formatDuration={formatDuration}
            />

            <View pointerEvents="none" style={[styles.navBarSpacer, { height: insets.bottom }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#080A0F',
    },
    header: {
        height: 82,
        paddingHorizontal: 20,
        backgroundColor: '#080A0F',
    },
    headerTopRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerLeft: {
        width: 60,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: 60,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 0.3,
        textAlign: 'center',
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRightPlaceholder: {
        width: 56,
        height: 36,
    },
    filterBar: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 8,
        backgroundColor: '#080A0F',
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterColLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    filterColRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    filterTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 4,
    },
    filterTriggerText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
    },
    selectActionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    permissionTitle: {
        color: '#FFF',
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    permissionButton: {
        alignSelf: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
        marginBottom: 12,
    },
    permissionButtonText: {
        color: '#080A0F',
        fontWeight: '700',
    },
    cancelText: {
        color: '#9CA3AF',
        textAlign: 'center',
    },
    navBarSpacer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#080A0F',
    },
});
