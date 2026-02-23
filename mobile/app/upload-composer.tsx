import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    ScrollView,
    Platform,
    KeyboardAvoidingView,
    ActivityIndicator,
    Modal,
    TouchableOpacity,
    TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import Video from 'react-native-video';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    X,
    Trash2,
    Plus,
    Play,
    Pause,
    Captions,
    Tv,
    Scissors,
    ArrowRight,
    TextSelect,
    AlignCenter as TextAlignCenter,
    AlignRight as TextAlignEnd,
    AlignLeft as TextAlignStart,
    Menu,
    SquareMenu,
    AArrowUp,
    AArrowDown,
    ListX,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio as CompressorAudio } from 'react-native-compressor';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS
} from 'react-native-reanimated';

import { LogCode, logUI } from '@/core/services/Logger';
import { textShadowStyle } from '@/core/utils/shadow';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useUploadComposerStore, UploadComposerDraft, UploadComposerQuality, UploadComposerSubtitleLanguage } from '../src/presentation/store/useUploadComposerStore';
import { CONFIG } from '../src/core/config';
import { SubtitlePresentation, SubtitleSegment, SubtitleStyle, SubtitleTextAlign } from '../src/domain/entities/Subtitle';
import { DraggableSubtitleOverlay } from '../src/presentation/components/upload/DraggableSubtitleOverlay';
import { VideoPlayerPreview } from '../src/presentation/components/upload/VideoPlayerPreview';
import { SubtitleEditor } from '../src/presentation/components/upload/SubtitleEditor';
import { UploadActionButtons } from '../src/presentation/components/upload/UploadActionButtons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_ITEM_WIDTH = SCREEN_WIDTH;
const PREVIEW_ITEM_SPACING = 0;
const PREVIEW_SIDE_PADDING = 0;
const PREVIEW_ASPECT_RATIO_DEFAULT = 16 / 9;
const PREVIEW_ASPECT_RATIO_EDIT = 1.2;
const SUBTITLE_SIDE_MARGIN = 20;
const SUBTITLE_DELETE_ZONE_HEIGHT = 84;
const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = { fontSize: 18, textAlign: 'center', showOverlay: true };
const SUBTITLE_FONT_MIN = 12;
const SUBTITLE_FONT_MAX = 42;
const SUBTITLE_FONT_STEP = 2;
const SUBTITLE_ALIGN_CYCLE: SubtitleTextAlign[] = ['center', 'end', 'start'];
const PREVIEW_PROGRESS_COMMIT_INTERVAL_MS = 120;
const PREVIEW_PROGRESS_MIN_DELTA_MS = 160;

import { resolveSubtitleTextAlign } from '../src/core/utils/subtitleUtils';

function getNextSubtitleAlign(current: SubtitleTextAlign | undefined): SubtitleTextAlign {
    const currentIndex = SUBTITLE_ALIGN_CYCLE.indexOf(current || 'center');
    if (currentIndex === -1) return 'center';
    const nextIndex = (currentIndex + 1) % SUBTITLE_ALIGN_CYCLE.length;
    return SUBTITLE_ALIGN_CYCLE[nextIndex];
}



const ExitConfirmationModal = ({
    visible,
    onCancel,
    onConfirm,
}: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) => {
    const modalTheme = useSurfaceTheme();
    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={[styles.modalOverlay, modalTheme.styles.modalOverlay]}>
                <View style={[styles.modalContainer, modalTheme.styles.modalCard]}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: modalTheme.textPrimary }]}>Değişiklikler silinsin mi?</Text>
                        <Text style={[styles.modalMessage, { color: modalTheme.textPrimary }]}>
                            Eğer şimdi çıkarsanız yaptığınız tüm değişiklikler kaybolacaktır.
                        </Text>
                    </View>

                    <View style={[styles.modalSeparator, modalTheme.styles.separator]} />

                    <TouchableOpacity style={styles.modalButton} onPress={onConfirm}>
                        <Text style={[styles.modalButtonText, styles.destructiveText]}>Değişiklikleri sil</Text>
                    </TouchableOpacity>

                    <View style={[styles.modalSeparator, modalTheme.styles.separator]} />

                    <TouchableOpacity style={styles.modalButton} onPress={onCancel}>
                        <Text style={[styles.modalButtonText, { color: '#3A8DFF' }]}>Devam et</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const DeleteSubtitleConfirmationModal = ({
    visible,
    onCancel,
    onConfirm,
}: {
    visible: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) => {
    const modalTheme = useSurfaceTheme();
    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={[styles.modalOverlay, modalTheme.styles.modalOverlay]}>
                <View style={[styles.modalContainer, modalTheme.styles.modalCard]}>
                    <View style={styles.modalContent}>
                        <Text style={[styles.modalTitle, { color: modalTheme.textPrimary }]}>Altyazı silinsin mi?</Text>
                        <Text style={[styles.modalMessage, { color: modalTheme.textPrimary }]}>
                            Bu videodaki altyazıyı silmek istediğinize emin misiniz?
                        </Text>
                    </View>

                    <View style={[styles.modalSeparator, modalTheme.styles.separator]} />

                    <TouchableOpacity style={styles.modalButton} onPress={onConfirm}>
                        <Text style={[styles.modalButtonText, styles.destructiveText]}>Altyazıyı sil</Text>
                    </TouchableOpacity>

                    <View style={[styles.modalSeparator, modalTheme.styles.separator]} />

                    <TouchableOpacity style={styles.modalButton} onPress={onCancel}>
                        <Text style={[styles.modalButtonText, { color: '#3A8DFF' }]}>İptal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function UploadComposerScreen() {
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const { isDark } = useThemeStore();
    const modalTheme = useSurfaceTheme(true);
    const {
        draft,
        subtitleCache,
        subtitlePresentationCache,
        subtitleStyleCache,
        subtitleSttState,
        updateSubtitleCache,
        updateSubtitlePresentation,
        updateSubtitleStyle,
        removeSubtitleData,
        setSubtitleSttState,
    } = useUploadComposerStore();
    const initialAssets = draft?.selectedAssets ?? [];
    const uploadMode = draft?.uploadMode ?? 'video';

    const [selectedAssets, setSelectedAssets] = useState(initialAssets);
    const [activePreviewIndex, setActivePreviewIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isQualityMenuOpen, setIsQualityMenuOpen] = useState(false);
    const [isCaptionsMenuOpen, setIsCaptionsMenuOpen] = useState(false);
    const [qualityPreset, setQualityPreset] = useState<UploadComposerQuality>('medium');
    const [subtitleLanguage, setSubtitleLanguage] = useState<UploadComposerSubtitleLanguage>('auto');

    // STT State
    const [captionRequestedByUri, setCaptionRequestedByUri] = useState<Record<string, boolean>>({});
    const [sttStatusMessage, setSttStatusMessage] = useState<string | null>(null);
    const [currentVideoTimeMs, setCurrentVideoTimeMs] = useState(0);
    const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
    const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
    const [isSubtitleTextEditing, setIsSubtitleTextEditing] = useState(false);

    const [pendingDeleteSubtitleUri, setPendingDeleteSubtitleUri] = useState<string | null>(null);
    const [isExitConfirmationVisible, setExitConfirmationVisible] = useState(false);
    const sttStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressCommitTsRef = useRef(0);
    const committedVideoTimeRef = useRef(0);

    useEffect(() => {
        if (!draft) return;
        setSelectedAssets(draft.selectedAssets || []);
        setQualityPreset(draft.qualityPreset || 'medium');
        setSubtitleLanguage(draft.subtitleLanguage || 'auto');
    }, [draft]);

    // Derived Subtitles from Cache (Single Source of Truth)
    const assetSubtitles = useMemo(() => {
        const results: Record<string, SubtitleSegment[]> = {};
        selectedAssets.forEach(asset => {
            if (subtitleCache[asset.uri]) {
                results[asset.uri] = subtitleCache[asset.uri].segments;
            }
        });
        return results;
    }, [selectedAssets, subtitleCache]);

    const hasChanges = useMemo(() => {
        const isAssetsChanged = selectedAssets.length !== initialAssets.length ||
            selectedAssets.some((asset, i) => asset.uri !== initialAssets[i]?.uri);
        const isQualityChanged = qualityPreset !== 'medium';
        const isSubtitleLangChanged = subtitleLanguage !== 'auto';
        const hasGeneratedSubtitles = Object.keys(assetSubtitles).length > 0;

        return isAssetsChanged || isQualityChanged || isSubtitleLangChanged || hasGeneratedSubtitles;
    }, [selectedAssets, initialAssets, qualityPreset, subtitleLanguage, assetSubtitles]);

    const bgColor = modalTheme.fullScreenBackground;
    const textColor = modalTheme.textPrimary;
    const scrollRef = useRef<ScrollView>(null);
    const previewHeight = useSharedValue(PREVIEW_ITEM_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT);

    const activeAsset = selectedAssets[activePreviewIndex];
    const activeAssetUri = activeAsset?.uri || '';
    const activeAssetSubtitles = activeAssetUri ? (assetSubtitles[activeAssetUri] || []) : [];
    const isCurrentSttLoading = !!activeAssetUri && subtitleSttState[activeAssetUri] === 'loading';
    const isCurrentCaptionRequested = !!activeAssetUri && !!captionRequestedByUri[activeAssetUri];
    const isSubtitleEditorVisible =
        activeAsset?.type === 'video' &&
        subtitleLanguage !== 'none' &&
        activeAssetSubtitles.length > 0 &&
        isEditingSubtitle &&
        isSubtitleTextEditing;
    const isSubtitleStylePanelVisible =
        activeAsset?.type === 'video' &&
        subtitleLanguage !== 'none' &&
        activeAssetSubtitles.length > 0 &&
        isEditingSubtitle &&
        !isSubtitleTextEditing;
    const activeSubtitleStyle = activeAssetUri
        ? (subtitleStyleCache[activeAssetUri] || DEFAULT_SUBTITLE_STYLE)
        : DEFAULT_SUBTITLE_STYLE;
    const ActiveAlignIcon = useMemo(() => {
        switch (activeSubtitleStyle.textAlign) {
            case 'center':
                return TextAlignCenter;
            case 'end':
            case 'right':
                return TextAlignEnd;
            case 'start':
            case 'left':
                return TextAlignStart;
            default:
                return TextAlignCenter;
        }
    }, [activeSubtitleStyle.textAlign]);

    useEffect(() => {
        previewHeight.value = withTiming(
            PREVIEW_ITEM_WIDTH * (isSubtitleEditorVisible ? PREVIEW_ASPECT_RATIO_EDIT : PREVIEW_ASPECT_RATIO_DEFAULT),
            { duration: 220 }
        );
    }, [isSubtitleEditorVisible, previewHeight]);

    const previewContainerAnimatedStyle = useAnimatedStyle(() => ({
        height: previewHeight.value,
    }));

    useEffect(() => {
        if (!isEditingSubtitle) {
            setIsSubtitleTextEditing(false);
        }
    }, [isEditingSubtitle]);

    useEffect(() => {
        return () => {
            if (sttStatusTimeoutRef.current) {
                clearTimeout(sttStatusTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (isFocused) {
            // Returning from stacked screens (e.g. video-editor) should always resume preview playback.
            setIsDraggingSubtitle(false);
            setIsEditingSubtitle(false);
            setIsSubtitleTextEditing(false);
        }
    }, [isFocused]);

    const handlePreviewProgress = useCallback((nextTimeMs: number) => {
        const now = Date.now();
        const previous = committedVideoTimeRef.current;
        const movedBackwards = nextTimeMs + PREVIEW_PROGRESS_MIN_DELTA_MS < previous;
        const movedEnough = Math.abs(nextTimeMs - previous) >= PREVIEW_PROGRESS_MIN_DELTA_MS;
        const dueByTime = now - progressCommitTsRef.current >= PREVIEW_PROGRESS_COMMIT_INTERVAL_MS;

        if (!movedBackwards && !movedEnough && !dueByTime) return;

        committedVideoTimeRef.current = nextTimeMs;
        progressCommitTsRef.current = now;
        setCurrentVideoTimeMs(nextTimeMs);
    }, []);

    useEffect(() => {
        if (!activeAssetUri) return;
        if (!captionRequestedByUri[activeAssetUri]) return;

        const currentState = subtitleSttState[activeAssetUri];
        if (currentState === 'loading') {
            setSttStatusMessage('Ses analiz ediliyor, altyazı hazırlanıyor...');
            return;
        }

        if (currentState === 'ready') {
            setSttStatusMessage(null);
            setCaptionRequestedByUri((prev) => ({ ...prev, [activeAssetUri]: false }));
            return;
        }

        if (currentState === 'no_audio' || currentState === 'error') {
            showNoAudioStatus();
            setCaptionRequestedByUri((prev) => ({ ...prev, [activeAssetUri]: false }));
        }
    }, [activeAssetUri, captionRequestedByUri, subtitleSttState]);

    const handleClose = () => {
        if (hasChanges) {
            setExitConfirmationVisible(true);
        } else {
            router.back();
        }
    };

    const showNoAudioStatus = () => {
        if (sttStatusTimeoutRef.current) {
            clearTimeout(sttStatusTimeoutRef.current);
            sttStatusTimeoutRef.current = null;
        }
        setSttStatusMessage('Ses bulunamadı.');
        sttStatusTimeoutRef.current = setTimeout(() => {
            setSttStatusMessage(null);
        }, 1800);
    };
    const generateSubtitles = async (index: number, options?: { forceRetry?: boolean }) => {
        const asset = selectedAssets[index];
        if (!asset || asset.type !== 'video' || assetSubtitles[asset.uri]) return;
        const uri = asset.uri;
        const currentState = subtitleSttState[uri];
        const forceRetry = options?.forceRetry === true;

        if (currentState === 'loading') {
            setSttStatusMessage('Ses analiz ediliyor, altyazı hazırlanıyor...');
            return;
        }
        if (currentState === 'no_audio' && !forceRetry) {
            showNoAudioStatus();
            return;
        }
        if (forceRetry && currentState === 'no_audio') {
            setSubtitleSttState(uri, 'error');
        }

        if (sttStatusTimeoutRef.current) {
            clearTimeout(sttStatusTimeoutRef.current);
            sttStatusTimeoutRef.current = null;
        }
        setSttStatusMessage('Ses analiz ediliyor, altyazı hazırlanıyor...');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSubtitleSttState(uri, 'loading');
        try {
            let audioUri: string | null = null;
            try {
                audioUri = await CompressorAudio.compress(uri, {
                    quality: 'low',
                    bitrate: 64000,
                    channels: 1,
                    samplerate: 44100,
                } as any);
            } catch {
                audioUri = null;
            }

            const requestPreview = async (payloadType: 'audio' | 'video') => {
                const formData = new FormData();
                if (payloadType === 'audio' && audioUri) {
                    formData.append('audio', {
                        uri: audioUri,
                        name: 'preview_audio.m4a',
                        type: 'audio/m4a',
                    } as any);
                } else {
                    formData.append('video', {
                        uri,
                        name: 'preview_video.mp4',
                        type: 'video/mp4',
                    } as any);
                }
                formData.append('language', 'auto');
                const response = await fetch(`${CONFIG.API_URL}/stt-preview`, {
                    method: 'POST',
                    body: formData,
                });
                if (!response.ok) throw new Error('STT failed');
                return response.json();
            };

            let result: any;
            if (audioUri) {
                result = await requestPreview('audio');
                if (!result?.success && result?.reason === 'AUDIO_TOO_SMALL') {
                    result = await requestPreview('video');
                }
            } else {
                result = await requestPreview('video');
            }

            if (result.success && Array.isArray(result.segments) && result.segments.length > 0) {
                updateSubtitleCache(uri, result.segments);
                setSttStatusMessage(null);
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } else {
                setSubtitleSttState(uri, 'no_audio');
                showNoAudioStatus();
            }
        } catch {
            setSubtitleSttState(uri, 'error');
            showNoAudioStatus();
        } finally {
            if (useUploadComposerStore.getState().subtitleSttState[uri] === 'loading') {
                setSubtitleSttState(uri, 'error');
            }
        }
    };

    const handleUpdateSubtitle = (uri: string, segmentIndex: number, newText: string) => {
        const segments = assetSubtitles[uri];
        if (!segments) return;

        const newSegments = [...segments];
        newSegments[segmentIndex] = { ...newSegments[segmentIndex], text: newText };

        updateSubtitleCache(uri, newSegments);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveSubtitlesForUri = useCallback((uri: string) => {
        removeSubtitleData(uri);
        setCaptionRequestedByUri((prev) => ({ ...prev, [uri]: false }));
        setIsDraggingSubtitle(false);
        setIsEditingSubtitle(false);
        setIsSubtitleTextEditing(false);
        setSttStatusMessage(null);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [removeSubtitleData]);

    const persistComposerDraft = (overrides: Partial<UploadComposerDraft> = {}) => {
        const previousDraft = useUploadComposerStore.getState().draft;
        const safeCoverIndex = Math.min(
            previousDraft?.coverAssetIndex ?? 0,
            Math.max(0, selectedAssets.length - 1)
        );
        useUploadComposerStore.getState().setDraft({
            selectedAssets,
            uploadMode,
            coverAssetIndex: safeCoverIndex,
            coverTimeSec: previousDraft?.coverTimeSec ?? 0,
            playbackRate: previousDraft?.playbackRate ?? 1,
            videoVolume: previousDraft?.videoVolume ?? 1,
            cropRatio: previousDraft?.cropRatio ?? '9:16',
            filterPreset: previousDraft?.filterPreset ?? 'none',
            qualityPreset,
            subtitleLanguage,
            trimStartSec: previousDraft?.trimStartSec ?? 0,
            trimEndSec: previousDraft?.trimEndSec ?? 0,
            ...overrides,
        });
    };

    const handleOpenVideoEditor = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        persistComposerDraft();
        router.push('/video-editor' as any);
    };

    const handleNext = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        persistComposerDraft();

        router.push('/UploadDetails' as any);
    };

    const removeAsset = (index: number) => {
        if (selectedAssets.length <= 1) return;

        const newAssets = selectedAssets.filter((_, i) => i !== index);
        setSelectedAssets(newAssets);

        if (activePreviewIndex >= newAssets.length) {
            setActivePreviewIndex(newAssets.length - 1);
        }
    };

    const onScroll = (event: any) => {
        const x = event.nativeEvent.contentOffset.x;
        const index = Math.round(x / PREVIEW_ITEM_WIDTH);
        if (index !== activePreviewIndex && index >= 0 && index < selectedAssets.length) {
            setActivePreviewIndex(index);
            committedVideoTimeRef.current = 0;
            progressCommitTsRef.current = 0;
            setCurrentVideoTimeMs(0);
        }
    };

    if (!draft) {
        return (
            <View style={[styles.container, { backgroundColor: '#080A0F', justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color="#FFFFFF" />
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: bgColor }}>
                <SystemBars
                    style={{
                        statusBar: isDark ? 'light' : 'dark',
                        navigationBar: isDark ? 'light' : 'dark',
                    }}
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.container}
                >
                    <View style={{ height: insets.top, backgroundColor: bgColor }} />

                    <Pressable
                        onPress={handleClose}
                        style={[styles.floatingCloseButton, { top: insets.top + 15, left: 16 }]}
                    >
                        <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
                            <X color="#FFFFFF" size={28} strokeWidth={2} />
                        </BlurView>
                    </Pressable>

                    {(isQualityMenuOpen || isCaptionsMenuOpen) && (
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => {
                                setIsQualityMenuOpen(false);
                                setIsCaptionsMenuOpen(false);
                            }}
                        />
                    )}

                    <ScrollView
                        style={styles.content}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.previewSection}>
                            <ScrollView
                                ref={scrollRef}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                onScroll={onScroll}
                                scrollEventThrottle={16}
                                contentContainerStyle={{ paddingHorizontal: PREVIEW_SIDE_PADDING }}
                            >
                                {selectedAssets.map((asset, index) => (
                                    <Animated.View
                                        key={asset.uri || index}
                                        style={[
                                            styles.previewContainer,
                                            { width: PREVIEW_ITEM_WIDTH },
                                            previewContainerAnimatedStyle
                                        ]}
                                    >
                                        {asset.type === 'video' ? (
                                            <View style={{ flex: 1 }}>
                                                <VideoPlayerPreview
                                                    uri={asset.uri}
                                                    isActive={activePreviewIndex === index}
                                                    isMuted={isMuted}
                                                    isPaused={!isFocused || isDraggingSubtitle || isEditingSubtitle}
                                                    onProgress={handlePreviewProgress}
                                                />
                                                {assetSubtitles[asset.uri] && subtitleLanguage !== 'none' && (
                                                    <DraggableSubtitleOverlay
                                                        segments={assetSubtitles[asset.uri]}
                                                        presentation={subtitlePresentationCache[asset.uri]}
                                                        textStyle={subtitleStyleCache[asset.uri] || DEFAULT_SUBTITLE_STYLE}
                                                        currentTimeMs={currentVideoTimeMs}
                                                        onDragStart={() => setIsDraggingSubtitle(true)}
                                                        onDragEnd={() => setIsDraggingSubtitle(false)}
                                                        onEditingChange={setIsEditingSubtitle}
                                                        onTextEditingChange={setIsSubtitleTextEditing}
                                                        onUpdateSubtitle={(idx, text) => handleUpdateSubtitle(asset.uri, idx, text)}
                                                        onPresentationChange={(value) => updateSubtitlePresentation(asset.uri, value)}
                                                    />
                                                )}
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: asset.uri }}
                                                style={styles.previewMedia}
                                                contentFit="cover"
                                            />
                                        )}

                                        {asset.type === 'video' && (
                                            <UploadActionButtons
                                                insets={insets}
                                                isQualityMenuOpen={isQualityMenuOpen}
                                                setIsQualityMenuOpen={setIsQualityMenuOpen}
                                                qualityPreset={qualityPreset}
                                                setQualityPreset={setQualityPreset}
                                                isCaptionsMenuOpen={isCaptionsMenuOpen}
                                                setIsCaptionsMenuOpen={setIsCaptionsMenuOpen}
                                                subtitleLanguage={subtitleLanguage}
                                                setSubtitleLanguage={setSubtitleLanguage}
                                                hasSubtitles={!!assetSubtitles[asset.uri]}
                                                isSttLoading={captionRequestedByUri[asset.uri] && subtitleSttState[asset.uri] === 'loading'}
                                                onToggleCaptionsTap={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    const activeUri = selectedAssets[activePreviewIndex].uri;
                                                    if (!assetSubtitles[activeUri]) {
                                                        setCaptionRequestedByUri((prev) => ({ ...prev, [activeUri]: true }));
                                                        void generateSubtitles(activePreviewIndex, {
                                                            forceRetry: subtitleSttState[activeUri] === 'no_audio',
                                                        });
                                                    } else {
                                                        setIsCaptionsMenuOpen(!isCaptionsMenuOpen);
                                                    }
                                                    setIsQualityMenuOpen(false);
                                                }}
                                            />
                                        )}

                                        {selectedAssets.length > 1 && (
                                            <Pressable
                                                style={styles.removeAssetBtn}
                                                onPress={() => removeAsset(index)}
                                            >
                                                <Trash2 color="#FFF" size={20} />
                                            </Pressable>
                                        )}
                                    </Animated.View>
                                ))}
                            </ScrollView>

                            {selectedAssets.length > 1 && (
                                <View style={styles.pagination}>
                                    {selectedAssets.map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.paginationDot,
                                                { backgroundColor: i === activePreviewIndex ? '#3A8DFF' : 'rgba(255,255,255,0.3)' }
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}

                            {isSubtitleStylePanelVisible && (
                                <View style={styles.subtitleQuickControlsRow}>
                                    <Pressable
                                        style={styles.subtitleAlignIconButton}
                                        onPress={() => {
                                            setIsSubtitleTextEditing(true);
                                            void Haptics.selectionAsync();
                                        }}
                                    >
                                        <TextSelect color="#FFFFFF" size={22} strokeWidth={2.3} />
                                    </Pressable>
                                    <Pressable
                                        style={styles.subtitleAlignIconButton}
                                        onPress={() => updateSubtitleStyle(activeAssetUri, {
                                            ...activeSubtitleStyle,
                                            fontSize: Math.max(
                                                SUBTITLE_FONT_MIN,
                                                activeSubtitleStyle.fontSize - SUBTITLE_FONT_STEP
                                            ),
                                        })}
                                    >
                                        <AArrowDown color="#FFFFFF" size={22} strokeWidth={2.3} />
                                    </Pressable>
                                    <Pressable
                                        style={styles.subtitleAlignIconButton}
                                        onPress={() => updateSubtitleStyle(activeAssetUri, {
                                            ...activeSubtitleStyle,
                                            fontSize: Math.min(
                                                SUBTITLE_FONT_MAX,
                                                activeSubtitleStyle.fontSize + SUBTITLE_FONT_STEP
                                            ),
                                        })}
                                    >
                                        <AArrowUp color="#FFFFFF" size={22} strokeWidth={2.3} />
                                    </Pressable>
                                    <Pressable
                                        style={styles.subtitleAlignIconButton}
                                        onPress={() => updateSubtitleStyle(activeAssetUri, {
                                            ...activeSubtitleStyle,
                                            textAlign: getNextSubtitleAlign(activeSubtitleStyle.textAlign),
                                        })}
                                    >
                                        <ActiveAlignIcon color="#FFFFFF" size={22} strokeWidth={2.3} />
                                    </Pressable>
                                    <Pressable
                                        style={styles.subtitleAlignIconButton}
                                        onPress={() => updateSubtitleStyle(activeAssetUri, {
                                            ...activeSubtitleStyle,
                                            showOverlay: !(activeSubtitleStyle.showOverlay ?? true),
                                        })}
                                    >
                                        {(activeSubtitleStyle.showOverlay ?? true) ? (
                                            <SquareMenu color="#FFFFFF" size={22} strokeWidth={2.3} />
                                        ) : (
                                            <Menu color="#FFFFFF" size={22} strokeWidth={2.3} />
                                        )}
                                    </Pressable>
                                    <Pressable
                                        style={styles.subtitleAlignIconButton}
                                        onPress={() => {
                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setPendingDeleteSubtitleUri(activeAssetUri);
                                        }}
                                    >
                                        <ListX color="#FFFFFF" size={22} strokeWidth={2.3} />
                                    </Pressable>
                                </View>
                            )}

                            <SubtitleEditor
                                isVisible={isSubtitleEditorVisible}
                                segments={activeAssetSubtitles}
                                currentVideoTimeMs={currentVideoTimeMs}
                                activeAssetUri={activeAssetUri}
                                onUpdateSubtitle={handleUpdateSubtitle}
                                setIsEditingSubtitle={setIsEditingSubtitle}
                            />
                        </View>

                        {!isSubtitleEditorVisible && (
                            <View style={styles.nextButtonContainer}>
                                {selectedAssets[activePreviewIndex]?.type === 'video' && (
                                    <Pressable
                                        onPress={handleOpenVideoEditor}
                                        style={styles.nextButton}
                                    >
                                        <Text style={styles.nextButtonText}>Videoyu Düzenle</Text>
                                    </Pressable>
                                )}
                                <Pressable
                                    onPress={handleNext}
                                    style={[styles.nextButton, styles.nextButtonRight]}
                                >
                                    <Text style={styles.nextButtonText}>İleri</Text>
                                    <ArrowRight color="#FFFFFF" size={18} strokeWidth={2.5} />
                                </Pressable>
                            </View>
                        )}
                    </ScrollView>

                    {(isCurrentCaptionRequested && isCurrentSttLoading) || !!sttStatusMessage ? (
                        <View style={[styles.sttStatusPill, { top: insets.top + 18 }]}>
                            <BlurView intensity={30} tint="dark" style={styles.sttStatusContainer}>
                                {(isCurrentCaptionRequested && isCurrentSttLoading) ? (
                                    <ActivityIndicator color="#3A8DFF" size="small" style={{ marginRight: 8 }} />
                                ) : null}
                                <Text style={[styles.nextButtonText, styles.sttStatusText]}>
                                    {sttStatusMessage || 'Ses analiz ediliyor, altyazı hazırlanıyor...'}
                                </Text>
                            </BlurView>
                        </View>
                    ) : null}

                    <ExitConfirmationModal
                        visible={isExitConfirmationVisible}
                        onCancel={() => setExitConfirmationVisible(false)}
                        onConfirm={() => {
                            setExitConfirmationVisible(false);
                            router.back();
                        }}
                    />

                    <DeleteSubtitleConfirmationModal
                        visible={!!pendingDeleteSubtitleUri}
                        onCancel={() => setPendingDeleteSubtitleUri(null)}
                        onConfirm={() => {
                            if (pendingDeleteSubtitleUri) {
                                handleRemoveSubtitlesForUri(pendingDeleteSubtitleUri);
                                setPendingDeleteSubtitleUri(null);
                            }
                        }}
                    />
                </KeyboardAvoidingView>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    content: {
        flex: 1,
    },
    previewSection: {
        width: SCREEN_WIDTH,
    },
    previewContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        alignSelf: 'center',
    },
    previewMedia: {
        flex: 1,
    },
    mediaSideActions: {
        position: 'absolute',
        gap: 8,
        zIndex: 1000,
    },
    sideActionItem: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hdBadge: {
        borderWidth: 2,
        borderColor: '#FFFFFF',
        borderRadius: 4,
        paddingHorizontal: 4,
        height: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hdText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '900',
        lineHeight: 13,
    },
    qualityDropdown: {
        position: 'absolute',
        top: 50,
        left: 0,
        width: 120,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 1100,
    },
    qualityOption: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    qualityOptionActive: {
        backgroundColor: 'rgba(58, 141, 255, 0.1)',
    },
    qualityOptionText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
    },
    qualityOptionTextActive: {
        color: '#3A8DFF',
    },
    removeAssetBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtitleEditorPanel: {
        marginTop: 14,
        marginHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
        maxHeight: 280,
    },
    subtitleEditorHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    subtitleEditorHeaderText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    subtitleEditorList: {
        maxHeight: 230,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    subtitleEditorRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        gap: 12,
    },
    subtitleEditorRowActive: {
        backgroundColor: 'rgba(58,141,255,0.1)',
    },
    subtitleEditorTimeBadge: {
        width: 86,
        paddingVertical: 4,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 6,
        alignItems: 'center',
        marginTop: 2,
    },
    subtitleEditorTime: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
        lineHeight: 14,
    },
    subtitleEditorInputWrapper: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        minHeight: 40,
    },
    subtitleEditorInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 14,
        lineHeight: 20,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
        gap: 6,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    subtitleQuickControlsRow: {
        marginTop: 12,
        marginHorizontal: 12,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    subtitleAlignIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        gap: 18,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    nextButtonRight: {
        marginLeft: 'auto',
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    sttStatusPill: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 2000,
    },
    sttStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.38)',
    },
    sttStatusText: {
        color: '#FFFFFF',
        fontSize: 12,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: 270,
        borderRadius: 32,
        overflow: 'hidden',
        alignItems: 'center',
    },
    modalContent: {
        padding: 16,
        paddingBottom: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 18,
    },
    modalSeparator: {
        height: 1,
        width: '100%',
    },
    modalButton: {
        width: '100%',
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 17,
        fontWeight: '400',
    },
    destructiveText: {
        color: '#FF453A',
        fontWeight: '600',
    },
});
