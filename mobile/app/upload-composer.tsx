import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    Modal,
    TouchableOpacity,
    Keyboard,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    X,
    Trash2,
    ArrowRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { SystemBars } from 'react-native-edge-to-edge';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Audio as CompressorAudio } from 'react-native-compressor';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import {
    DEFAULT_SUBTITLE_STYLE,
    SUBTITLE_FONT_MAX,
    SUBTITLE_FONT_MIN,
    getNextSubtitleOverlayState,
    resolveSubtitleStyle,
} from '@/core/utils/subtitleOverlay';
import { useSurfaceTheme } from '../src/presentation/hooks/useSurfaceTheme';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useUploadComposerStore, UploadComposerDraft, UploadComposerQuality, UploadComposerSubtitleLanguage } from '../src/presentation/store/useUploadComposerStore';
import { CONFIG } from '../src/core/config';
import { SubtitleFontFamily, SubtitleSegment, SubtitleStyle, SubtitleTextAlign } from '../src/domain/entities/Subtitle';
import { DraggableSubtitleOverlay } from '../src/presentation/components/upload/DraggableSubtitleOverlay';
import { VideoPlayerPreview } from '../src/presentation/components/upload/VideoPlayerPreview';
import { SubtitleEditorInline, SubtitleEditorTab } from '../src/presentation/components/upload/SubtitleEditorInline';
import { UploadActionButtons } from '../src/presentation/components/upload/UploadActionButtons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PREVIEW_ITEM_WIDTH = SCREEN_WIDTH;
const PREVIEW_SIDE_PADDING = 0;
const PREVIEW_ASPECT_RATIO_DEFAULT = 16 / 9;
const PREVIEW_BASE_HEIGHT = PREVIEW_ITEM_WIDTH * PREVIEW_ASPECT_RATIO_DEFAULT;
const PREVIEW_SCALE_WHEN_SUBTITLE_EDITOR_OPEN = 0.5;
const PREVIEW_SCALE_WHEN_SUBTITLE_EDITOR_TEXT_KEYBOARD_OPEN = 0.44;
const PREVIEW_MENU_GAP_WHEN_SUBTITLE_EDITOR_OPEN = 48;
const PREVIEW_TOP_GAP_WHEN_SUBTITLE_EDITOR_OPEN = 20;
const SUBTITLE_PANEL_EXTRA_HEIGHT = 92;
const SUBTITLE_FONT_STEP = 2;
const SUBTITLE_ALIGN_CYCLE: SubtitleTextAlign[] = ['center', 'end', 'start'];
const PREVIEW_PROGRESS_COMMIT_INTERVAL_MS = 120;
const PREVIEW_PROGRESS_MIN_DELTA_MS = 120;
const PREVIEW_PROGRESS_COMMIT_INTERVAL_MS_EDITOR = 34;
const PREVIEW_PROGRESS_MIN_DELTA_MS_EDITOR = 34;
const PREVIEW_TRANSITION_DURATION_MS = 220;
const PREVIEW_TRANSITION_KEYBOARD_DURATION_MS = 260;
const PREVIEW_TRANSITION_EASING = Easing.bezier(0.22, 1, 0.36, 1);
const MAX_SUBTITLE_HISTORY_STEPS = 120;

interface SubtitleEditHistorySnapshot {
    uri: string;
    segments: SubtitleSegment[] | null;
    style: SubtitleStyle | null;
}

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
    const [isSubtitlePreviewPlaying, setIsSubtitlePreviewPlaying] = useState(false);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [previewSeekRequest, setPreviewSeekRequest] = useState<{ uri: string; positionMs: number; token: number } | null>(null);
    const [subtitleEditorTab, setSubtitleEditorTab] = useState<SubtitleEditorTab | null>(null);
    const [subtitleUndoStack, setSubtitleUndoStack] = useState<SubtitleEditHistorySnapshot[]>([]);
    const [subtitleRedoStack, setSubtitleRedoStack] = useState<SubtitleEditHistorySnapshot[]>([]);

    const [pendingDeleteSubtitleUri, setPendingDeleteSubtitleUri] = useState<string | null>(null);
    const [isExitConfirmationVisible, setExitConfirmationVisible] = useState(false);
    const sttStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressCommitTsRef = useRef(0);
    const committedVideoTimeRef = useRef(0);
    const isApplyingSubtitleHistoryRef = useRef(false);

    useEffect(() => {
        if (!draft) return;
        setSelectedAssets(draft.selectedAssets || []);
        setQualityPreset(draft.qualityPreset || 'medium');
        setSubtitleLanguage(draft.subtitleLanguage || 'auto');
    }, [draft]);
    useEffect(() => {
        const onShow = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
        const onHide = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));

        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);

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
    const scrollRef = useRef<ScrollView>(null);
    const previewScale = useSharedValue(1);
    const previewTranslateY = useSharedValue(0);
    const previewMarginBottom = useSharedValue(0);

    const activeAsset = selectedAssets[activePreviewIndex];
    const activeAssetUri = activeAsset?.uri || '';
    const activeAssetSubtitles = activeAssetUri ? (assetSubtitles[activeAssetUri] || []) : [];
    const activeAssetDurationMs = Math.max(0, Number(activeAsset?.duration) || 0);
    const subtitleDerivedDurationMs = activeAssetSubtitles.reduce((maxDuration, segment) => (
        Math.max(maxDuration, Number(segment?.endMs) || 0)
    ), 0);
    const activeVideoTotalDurationMs = Math.max(
        activeAssetDurationMs,
        subtitleDerivedDurationMs,
        currentVideoTimeMs,
    );
    const isCurrentSttLoading = !!activeAssetUri && subtitleSttState[activeAssetUri] === 'loading';
    const isCurrentCaptionRequested = !!activeAssetUri && !!captionRequestedByUri[activeAssetUri];
    const isSubtitleTextEditorVisible =
        activeAsset?.type === 'video' &&
        subtitleLanguage !== 'none' &&
        activeAssetSubtitles.length > 0 &&
        isEditingSubtitle &&
        subtitleEditorTab === 'text';
    const isSubtitleFontEditorVisible =
        activeAsset?.type === 'video' &&
        subtitleLanguage !== 'none' &&
        activeAssetSubtitles.length > 0 &&
        isEditingSubtitle &&
        subtitleEditorTab === 'font';
    const isSubtitleEditorVisible = isSubtitleTextEditorVisible || isSubtitleFontEditorVisible;
    const isKeyboardCompactedSubtitlePreview = isSubtitleTextEditorVisible && isKeyboardVisible;
    const previewTransitionConfig = useMemo(() => ({
        duration: isKeyboardCompactedSubtitlePreview
            ? PREVIEW_TRANSITION_KEYBOARD_DURATION_MS
            : PREVIEW_TRANSITION_DURATION_MS,
        easing: PREVIEW_TRANSITION_EASING,
    }), [isKeyboardCompactedSubtitlePreview]);
    const previewScaleWhenSubtitleEditorOpen = isKeyboardCompactedSubtitlePreview
        ? PREVIEW_SCALE_WHEN_SUBTITLE_EDITOR_TEXT_KEYBOARD_OPEN
        : PREVIEW_SCALE_WHEN_SUBTITLE_EDITOR_OPEN;
    const previewTopShiftWhenSubtitleEditorOpen =
        (PREVIEW_TOP_GAP_WHEN_SUBTITLE_EDITOR_OPEN -
            (PREVIEW_BASE_HEIGHT * (1 - previewScaleWhenSubtitleEditorOpen)) / 2) /
        previewScaleWhenSubtitleEditorOpen;
    const previewCompensationToKeepMenuGap =
        PREVIEW_MENU_GAP_WHEN_SUBTITLE_EDITOR_OPEN -
        (PREVIEW_BASE_HEIGHT * (1 - previewScaleWhenSubtitleEditorOpen)) / 2 +
        (previewScaleWhenSubtitleEditorOpen * previewTopShiftWhenSubtitleEditorOpen);
    const previewHeightWhenSubtitleEditorOpen = PREVIEW_BASE_HEIGHT * previewScaleWhenSubtitleEditorOpen;
    const subtitleEditorPanelBaseHeight =
        SCREEN_HEIGHT -
        insets.top -
        PREVIEW_TOP_GAP_WHEN_SUBTITLE_EDITOR_OPEN -
        previewHeightWhenSubtitleEditorOpen -
        PREVIEW_MENU_GAP_WHEN_SUBTITLE_EDITOR_OPEN;
    const subtitleEditorPanelHeight = Math.max(
        360,
        Math.min(
            SCREEN_HEIGHT - insets.top - 8,
            subtitleEditorPanelBaseHeight + SUBTITLE_PANEL_EXTRA_HEIGHT,
        ),
    );
    const shouldHideBottomActions = isSubtitleEditorVisible;
    const activeSubtitleStyle = activeAssetUri
        ? (subtitleStyleCache[activeAssetUri] || DEFAULT_SUBTITLE_STYLE)
        : DEFAULT_SUBTITLE_STYLE;
    const resolvedActiveSubtitleStyle = resolveSubtitleStyle(activeSubtitleStyle);

    useEffect(() => {
        previewScale.value = withTiming(
            isSubtitleEditorVisible ? previewScaleWhenSubtitleEditorOpen : 1,
            previewTransitionConfig
        );
        previewTranslateY.value = withTiming(
            isSubtitleEditorVisible ? previewTopShiftWhenSubtitleEditorOpen : 0,
            previewTransitionConfig
        );
        previewMarginBottom.value = withTiming(
            isSubtitleEditorVisible ? previewCompensationToKeepMenuGap : 0,
            previewTransitionConfig
        );
    }, [
        isSubtitleEditorVisible,
        previewCompensationToKeepMenuGap,
        previewMarginBottom,
        previewScale,
        previewScaleWhenSubtitleEditorOpen,
        previewTransitionConfig,
        previewTopShiftWhenSubtitleEditorOpen,
        previewTranslateY,
    ]);

    const previewContainerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: previewScale.value }, { translateY: previewTranslateY.value }],
        marginBottom: previewMarginBottom.value,
    }));

    useEffect(() => {
        if (!isEditingSubtitle) {
            setSubtitleEditorTab(null);
        }
    }, [isEditingSubtitle]);
    useEffect(() => {
        setSubtitleUndoStack([]);
        setSubtitleRedoStack([]);
    }, [activeAssetUri]);
    useEffect(() => {
        if (!isSubtitleEditorVisible) {
            setIsSubtitlePreviewPlaying(false);
        }
    }, [isSubtitleEditorVisible]);

    useEffect(() => {
        if (isSubtitleEditorVisible) {
            setIsQualityMenuOpen(false);
            setIsCaptionsMenuOpen(false);
        }
    }, [isSubtitleEditorVisible]);

    useEffect(() => {
        if (!isEditingSubtitle) return;
        if (isSubtitleEditorVisible) return;
        setIsEditingSubtitle(false);
        setSubtitleEditorTab(null);
    }, [isEditingSubtitle, isSubtitleEditorVisible]);

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
            setIsSubtitlePreviewPlaying(false);
            setSubtitleEditorTab(null);
        }
    }, [isFocused]);

    const handlePreviewProgress = useCallback((nextTimeMs: number) => {
        const commitIntervalMs = isSubtitleEditorVisible
            ? PREVIEW_PROGRESS_COMMIT_INTERVAL_MS_EDITOR
            : PREVIEW_PROGRESS_COMMIT_INTERVAL_MS;
        const minDeltaMs = isSubtitleEditorVisible
            ? PREVIEW_PROGRESS_MIN_DELTA_MS_EDITOR
            : PREVIEW_PROGRESS_MIN_DELTA_MS;
        const now = Date.now();
        const previous = committedVideoTimeRef.current;
        const movedBackwards = nextTimeMs + minDeltaMs < previous;
        const movedEnough = Math.abs(nextTimeMs - previous) >= minDeltaMs;
        const dueByTime = now - progressCommitTsRef.current >= commitIntervalMs;

        if (!movedBackwards && !movedEnough && !dueByTime) return;

        committedVideoTimeRef.current = nextTimeMs;
        progressCommitTsRef.current = now;
        setCurrentVideoTimeMs(nextTimeMs);
    }, [isSubtitleEditorVisible]);
    const handleSelectSubtitleSegmentStartMs = useCallback((startMs: number) => {
        if (!activeAssetUri) return;
        const nextMs = Math.max(0, Math.floor(startMs || 0));
        const now = Date.now();
        committedVideoTimeRef.current = nextMs;
        progressCommitTsRef.current = now;
        setCurrentVideoTimeMs(nextMs);
        setPreviewSeekRequest((previous) => ({
            uri: activeAssetUri,
            positionMs: nextMs,
            token: (previous?.token || 0) + 1,
        }));
    }, [activeAssetUri]);
    const captureSubtitleHistorySnapshot = useCallback((uri: string): SubtitleEditHistorySnapshot => {
        const segments = subtitleCache[uri]?.segments;
        const style = subtitleStyleCache[uri];
        return {
            uri,
            segments: segments ? segments.map((segment) => ({ ...segment })) : null,
            style: style ? { ...style } : null,
        };
    }, [subtitleCache, subtitleStyleCache]);
    const applySubtitleHistorySnapshot = useCallback((snapshot: SubtitleEditHistorySnapshot) => {
        if (!snapshot?.uri) return;
        isApplyingSubtitleHistoryRef.current = true;
        try {
            if (snapshot.segments) {
                updateSubtitleCache(snapshot.uri, snapshot.segments.map((segment) => ({ ...segment })));
            }
            updateSubtitleStyle(snapshot.uri, snapshot.style ? { ...snapshot.style } : { ...DEFAULT_SUBTITLE_STYLE });
        } finally {
            isApplyingSubtitleHistoryRef.current = false;
        }
    }, [updateSubtitleCache, updateSubtitleStyle]);
    const recordSubtitleHistory = useCallback((uri: string) => {
        if (!uri || isApplyingSubtitleHistoryRef.current) return;
        const snapshot = captureSubtitleHistorySnapshot(uri);
        setSubtitleUndoStack((previous) => {
            const next = [...previous, snapshot];
            if (next.length > MAX_SUBTITLE_HISTORY_STEPS) next.shift();
            return next;
        });
        setSubtitleRedoStack([]);
    }, [captureSubtitleHistorySnapshot]);
    const canUndoSubtitleChange = subtitleUndoStack.length > 0;
    const canRedoSubtitleChange = subtitleRedoStack.length > 0;
    const handleSubtitleUndo = useCallback(() => {
        if (!activeAssetUri || subtitleUndoStack.length === 0) return;

        const targetSnapshot = subtitleUndoStack[subtitleUndoStack.length - 1];
        const currentSnapshot = captureSubtitleHistorySnapshot(activeAssetUri);
        applySubtitleHistorySnapshot(targetSnapshot);
        setSubtitleUndoStack((previous) => previous.slice(0, -1));
        setSubtitleRedoStack((previous) => {
            const next = [...previous, currentSnapshot];
            if (next.length > MAX_SUBTITLE_HISTORY_STEPS) next.shift();
            return next;
        });
        setIsSubtitlePreviewPlaying(false);
        void Haptics.selectionAsync();
    }, [activeAssetUri, applySubtitleHistorySnapshot, captureSubtitleHistorySnapshot, subtitleUndoStack]);
    const handleSubtitleRedo = useCallback(() => {
        if (!activeAssetUri || subtitleRedoStack.length === 0) return;

        const targetSnapshot = subtitleRedoStack[subtitleRedoStack.length - 1];
        const currentSnapshot = captureSubtitleHistorySnapshot(activeAssetUri);
        applySubtitleHistorySnapshot(targetSnapshot);
        setSubtitleRedoStack((previous) => previous.slice(0, -1));
        setSubtitleUndoStack((previous) => {
            const next = [...previous, currentSnapshot];
            if (next.length > MAX_SUBTITLE_HISTORY_STEPS) next.shift();
            return next;
        });
        setIsSubtitlePreviewPlaying(false);
        void Haptics.selectionAsync();
    }, [activeAssetUri, applySubtitleHistorySnapshot, captureSubtitleHistorySnapshot, subtitleRedoStack]);

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
            setIsEditingSubtitle(true);
            setSubtitleEditorTab('text');
            setSubtitleLanguage((prev) => (prev === 'none' ? 'auto' : prev));
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
        const targetSegment = newSegments[segmentIndex];
        if (!targetSegment) return;
        if (targetSegment.text === newText) return;

        newSegments[segmentIndex] = { ...targetSegment, text: newText };

        recordSubtitleHistory(uri);
        updateSubtitleCache(uri, newSegments);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveSubtitlesForUri = useCallback((uri: string) => {
        removeSubtitleData(uri);
        setCaptionRequestedByUri((prev) => ({ ...prev, [uri]: false }));
        setIsDraggingSubtitle(false);
        setIsEditingSubtitle(false);
        setSubtitleEditorTab(null);
        setSttStatusMessage(null);
        if (uri === activeAssetUri) {
            setSubtitleUndoStack([]);
            setSubtitleRedoStack([]);
        }
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, [activeAssetUri, removeSubtitleData]);

    const handleSelectSubtitleFontFamily = useCallback((fontFamily: SubtitleFontFamily) => {
        if (!activeAssetUri) return;
        if (activeSubtitleStyle.fontFamily === fontFamily) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            fontFamily,
        });
        void Haptics.selectionAsync();
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, updateSubtitleStyle]);
    const handleDecreaseSubtitleFontSize = useCallback(() => {
        if (!activeAssetUri) return;
        const nextFontSize = Math.max(
            SUBTITLE_FONT_MIN,
            resolvedActiveSubtitleStyle.fontSize - SUBTITLE_FONT_STEP
        );
        if (nextFontSize === resolvedActiveSubtitleStyle.fontSize) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            fontSize: nextFontSize,
        });
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, resolvedActiveSubtitleStyle.fontSize, updateSubtitleStyle]);
    const handleIncreaseSubtitleFontSize = useCallback(() => {
        if (!activeAssetUri) return;
        const nextFontSize = Math.min(
            SUBTITLE_FONT_MAX,
            resolvedActiveSubtitleStyle.fontSize + SUBTITLE_FONT_STEP
        );
        if (nextFontSize === resolvedActiveSubtitleStyle.fontSize) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            fontSize: nextFontSize,
        });
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, resolvedActiveSubtitleStyle.fontSize, updateSubtitleStyle]);
    const handleSelectSubtitleTextColor = useCallback((color: string) => {
        if (!activeAssetUri) return;
        if ((activeSubtitleStyle.textColor || '').toLowerCase() === color.toLowerCase()) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            textColor: color,
        });
        void Haptics.selectionAsync();
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, updateSubtitleStyle]);
    const handleSelectSubtitleOverlayColor = useCallback((color: string) => {
        if (!activeAssetUri) return;
        if ((activeSubtitleStyle.overlayColor || '').toLowerCase() === color.toLowerCase()) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            overlayColor: color,
        });
        void Haptics.selectionAsync();
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, updateSubtitleStyle]);
    const handleCycleSubtitleTextAlign = useCallback(() => {
        if (!activeAssetUri) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            textAlign: getNextSubtitleAlign(activeSubtitleStyle.textAlign),
        });
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, updateSubtitleStyle]);
    const handleToggleSubtitleOverlay = useCallback(() => {
        if (!activeAssetUri) return;
        recordSubtitleHistory(activeAssetUri);
        const nextOverlayState = getNextSubtitleOverlayState(activeSubtitleStyle);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            ...nextOverlayState,
        });
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, updateSubtitleStyle]);
    const handleSelectSubtitleTextCase = useCallback((textCase: 'upper' | 'lower' | 'title') => {
        if (!activeAssetUri) return;
        if ((activeSubtitleStyle.textCase || 'original') === textCase) return;
        recordSubtitleHistory(activeAssetUri);
        updateSubtitleStyle(activeAssetUri, {
            ...activeSubtitleStyle,
            textCase,
        });
        void Haptics.selectionAsync();
    }, [activeAssetUri, activeSubtitleStyle, recordSubtitleHistory, updateSubtitleStyle]);

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
            setPreviewSeekRequest(null);
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

                <View style={styles.container}>
                    <View style={{ height: insets.top, backgroundColor: bgColor }} />

                    {!isSubtitleEditorVisible && (
                        <Pressable
                            onPress={handleClose}
                            style={[styles.floatingCloseButton, { top: insets.top + 15, left: 16 }]}
                        >
                            <BlurView intensity={30} tint="dark" style={styles.blurContainer}>
                                <X color="#FFFFFF" size={28} strokeWidth={2} />
                            </BlurView>
                        </Pressable>
                    )}

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
                        scrollEnabled={!isSubtitleEditorVisible}
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
                                    <View
                                        key={asset.uri || index}
                                        style={[styles.previewPage, { width: PREVIEW_ITEM_WIDTH }]}
                                    >
                                        <Animated.View
                                            style={[
                                                styles.previewContainer,
                                                {
                                                    width: PREVIEW_ITEM_WIDTH,
                                                    height: PREVIEW_BASE_HEIGHT,
                                                },
                                                previewContainerAnimatedStyle,
                                            ]}
                                        >
                                            {asset.type === 'video' ? (
                                                <View style={{ flex: 1 }}>
                                                    <VideoPlayerPreview
                                                        uri={asset.uri}
                                                        isActive={activePreviewIndex === index}
                                                        isMuted={isMuted}
                                                        isPaused={!isFocused || isDraggingSubtitle || (isEditingSubtitle && !isSubtitlePreviewPlaying)}
                                                        progressUpdateIntervalMs={isSubtitleEditorVisible ? 34 : 90}
                                                        seekRequest={previewSeekRequest?.uri === asset.uri ? previewSeekRequest : null}
                                                        onProgress={handlePreviewProgress}
                                                    />
                                                    {assetSubtitles[asset.uri] && subtitleLanguage !== 'none' && (
                                                        <DraggableSubtitleOverlay
                                                            segments={assetSubtitles[asset.uri]}
                                                            presentation={subtitlePresentationCache[asset.uri]}
                                                            textStyle={subtitleStyleCache[asset.uri] || DEFAULT_SUBTITLE_STYLE}
                                                            currentTimeMs={currentVideoTimeMs}
                                                            isEditingSessionActive={isEditingSubtitle}
                                                            onDragStart={() => setIsDraggingSubtitle(true)}
                                                            onDragEnd={() => setIsDraggingSubtitle(false)}
                                                            onEditingChange={(isEditing) => {
                                                                setIsEditingSubtitle(isEditing);
                                                                if (isEditing) {
                                                                    setSubtitleEditorTab('text');
                                                                } else {
                                                                    setSubtitleEditorTab(null);
                                                                }
                                                            }}
                                                            onTextEditingChange={(isTextEditing) => {
                                                                if (isTextEditing) {
                                                                    setIsEditingSubtitle(true);
                                                                    setSubtitleEditorTab('text');
                                                                }
                                                            }}
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

                                            {asset.type === 'video' && !isSubtitleEditorVisible && (
                                                <UploadActionButtons
                                                    insets={insets}
                                                    isDark={isDark}
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
                                                            setSubtitleLanguage((prev) => (prev === 'none' ? 'auto' : prev));
                                                            setCaptionRequestedByUri((prev) => ({ ...prev, [activeUri]: true }));
                                                            void generateSubtitles(activePreviewIndex, {
                                                                forceRetry: subtitleSttState[activeUri] === 'no_audio',
                                                            });
                                                        } else {
                                                            setIsEditingSubtitle(true);
                                                            setSubtitleEditorTab('text');
                                                            setSubtitleLanguage((prev) => (prev === 'none' ? 'auto' : prev));
                                                            setIsCaptionsMenuOpen(false);
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
                                    </View>
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
                        </View>

                        {!shouldHideBottomActions && (
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

                    {isSubtitleEditorVisible && (
                        <SubtitleEditorInline
                            activeTab={subtitleEditorTab || 'text'}
                            panelHeight={subtitleEditorPanelHeight}
                            segments={activeAssetSubtitles}
                            currentVideoTimeMs={currentVideoTimeMs}
                            totalVideoDurationMs={activeVideoTotalDurationMs}
                            activeAssetUri={activeAssetUri}
                            setIsEditingSubtitle={setIsEditingSubtitle}
                            onUpdateSubtitle={handleUpdateSubtitle}
                            onSelectSegmentStartMs={handleSelectSubtitleSegmentStartMs}
                            onOpenTextEditor={() => {
                                setIsEditingSubtitle(true);
                                setSubtitleEditorTab('text');
                                void Haptics.selectionAsync();
                            }}
                            onOpenFontEditor={() => {
                                setIsEditingSubtitle(true);
                                setSubtitleEditorTab('font');
                                void Haptics.selectionAsync();
                            }}
                            onDeleteSubtitle={() => {
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setPendingDeleteSubtitleUri(activeAssetUri);
                            }}
                            onRequestClose={() => {
                                setIsEditingSubtitle(false);
                                setSubtitleEditorTab(null);
                            }}
                            canUndo={canUndoSubtitleChange}
                            canRedo={canRedoSubtitleChange}
                            onUndo={handleSubtitleUndo}
                            onRedo={handleSubtitleRedo}
                            isPreviewPlaying={isSubtitlePreviewPlaying}
                            onTogglePreviewPlayback={() => {
                                setIsSubtitlePreviewPlaying((prev) => !prev);
                                void Haptics.selectionAsync();
                            }}
                            onPausePreview={() => {
                                setIsSubtitlePreviewPlaying(false);
                            }}
                            activeFontFamily={activeSubtitleStyle.fontFamily}
                            activeTextAlign={activeSubtitleStyle.textAlign}
                            activeTextCase={activeSubtitleStyle.textCase}
                            activeTextColor={resolvedActiveSubtitleStyle.textColor}
                            activeOverlayColor={resolvedActiveSubtitleStyle.overlayColor}
                            showOverlay={resolvedActiveSubtitleStyle.showOverlay}
                            onSelectFontFamily={handleSelectSubtitleFontFamily}
                            onSelectTextCase={handleSelectSubtitleTextCase}
                            onDecreaseFontSize={handleDecreaseSubtitleFontSize}
                            onIncreaseFontSize={handleIncreaseSubtitleFontSize}
                            onSelectTextColor={handleSelectSubtitleTextColor}
                            onSelectOverlayColor={handleSelectSubtitleOverlayColor}
                            onCycleTextAlign={handleCycleSubtitleTextAlign}
                            onToggleOverlay={handleToggleSubtitleOverlay}
                        />
                    )}

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
                </View>
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
