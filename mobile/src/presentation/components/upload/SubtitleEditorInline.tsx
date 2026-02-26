import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pause, Play, Redo2, Undo2 } from 'lucide-react-native';
import type {
    SubtitleFontFamily,
    SubtitleSegment,
    SubtitleTextAlign,
    SubtitleTextCase,
} from '../../../domain/entities/Subtitle';
import { SubtitleEditor } from './SubtitleEditor';
import { SubtitleFontEditor } from './SubtitleFontEditor';
import { SubtitleBottomNav } from './SubtitleBottomNav';

export type SubtitleEditorTab = 'text' | 'font';

interface SubtitleEditorInlineProps {
    activeTab: SubtitleEditorTab;
    panelHeight?: number;
    segments: SubtitleSegment[];
    currentVideoTimeMs: number;
    totalVideoDurationMs?: number;
    activeAssetUri: string;
    setIsEditingSubtitle: (isEditing: boolean) => void;
    onUpdateSubtitle: (uri: string, segmentIndex: number, newText: string) => void;
    onSelectSegmentStartMs: (startMs: number) => void;
    onOpenTextEditor: () => void;
    onOpenFontEditor: () => void;
    onDeleteSubtitle: () => void;
    onRequestClose: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    isPreviewPlaying: boolean;
    onTogglePreviewPlayback: () => void;
    onPausePreview: () => void;
    activeFontFamily?: SubtitleFontFamily;
    activeTextAlign?: SubtitleTextAlign;
    activeTextCase?: SubtitleTextCase;
    activeTextColor?: string;
    activeOverlayColor?: string;
    showOverlay?: boolean;
    onSelectFontFamily: (fontFamily: SubtitleFontFamily) => void;
    onSelectTextCase: (textCase: 'upper' | 'lower' | 'title') => void;
    onDecreaseFontSize: () => void;
    onIncreaseFontSize: () => void;
    onSelectTextColor: (color: string) => void;
    onSelectOverlayColor: (color: string) => void;
    onCycleTextAlign: () => void;
    onToggleOverlay: () => void;
}

export const SubtitleEditorInline = ({
    activeTab,
    panelHeight,
    segments,
    currentVideoTimeMs,
    totalVideoDurationMs = 0,
    activeAssetUri,
    setIsEditingSubtitle,
    onUpdateSubtitle,
    onSelectSegmentStartMs,
    onOpenTextEditor,
    onOpenFontEditor,
    onDeleteSubtitle,
    onRequestClose,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    isPreviewPlaying,
    onTogglePreviewPlayback,
    onPausePreview,
    activeFontFamily,
    activeTextAlign,
    activeTextCase,
    activeTextColor,
    activeOverlayColor,
    showOverlay = true,
    onSelectFontFamily,
    onSelectTextCase,
    onDecreaseFontSize,
    onIncreaseFontSize,
    onSelectTextColor,
    onSelectOverlayColor,
    onCycleTextAlign,
    onToggleOverlay,
}: SubtitleEditorInlineProps) => {
    const insets = useSafeAreaInsets();
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(40);

    React.useEffect(() => {
        opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) });
        translateY.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.ease) });
    }, [opacity, translateY]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));
    const formatMs = React.useCallback((value: number) => {
        const total = Math.max(0, Math.floor(value / 1000));
        const minutes = Math.floor(total / 60);
        const seconds = total % 60;
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, []);
    const safeCurrentMs = Math.max(0, Math.floor(currentVideoTimeMs || 0));
    const safeTotalMs = Math.max(safeCurrentMs, Math.floor(totalVideoDurationMs || 0));
    const timelineText = `${formatMs(safeCurrentMs)} | ${formatMs(safeTotalMs)}`;

    return (
        <Animated.View
            style={[
                styles.container,
                panelHeight ? { height: panelHeight } : undefined,
                animatedStyle,
            ]}
        >
            <View style={styles.headerContainer}>
                <View style={styles.headerTopRow}>
                    <View style={styles.headerSide}>
                        <Text style={styles.headerMetaText}>{timelineText}</Text>
                    </View>
                    <View style={styles.headerCenter}>
                        <Pressable
                            style={styles.headerPlayButton}
                            onPress={onTogglePreviewPlayback}
                            hitSlop={10}
                        >
                            {isPreviewPlaying ? (
                                <Pause color="#FFFFFF" size={16} strokeWidth={2.2} fill="#FFFFFF" />
                            ) : (
                                <Play color="#FFFFFF" size={16} strokeWidth={2.2} fill="#FFFFFF" />
                            )}
                        </Pressable>
                    </View>
                    <View style={[styles.headerSide, styles.headerSideRight]}>
                        <View style={styles.historyActionsRow}>
                            <Pressable
                                style={styles.historyActionButton}
                                onPress={onUndo}
                                disabled={!canUndo}
                                hitSlop={10}
                            >
                                <Undo2 color={canUndo ? '#FFFFFF' : 'rgba(255,255,255,0.34)'} size={16} strokeWidth={2.2} />
                            </Pressable>
                            <Pressable
                                style={styles.historyActionButton}
                                onPress={onRedo}
                                disabled={!canRedo}
                                hitSlop={10}
                            >
                                <Redo2 color={canRedo ? '#FFFFFF' : 'rgba(255,255,255,0.34)'} size={16} strokeWidth={2.2} />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
            <View style={[styles.content, activeTab === 'font' && styles.contentAboveHeader]}>
                {activeTab === 'text' ? (
                    <SubtitleEditor
                        isVisible
                        segments={segments}
                        currentVideoTimeMs={currentVideoTimeMs}
                        activeAssetUri={activeAssetUri}
                        onUpdateSubtitle={onUpdateSubtitle}
                        onSelectSegmentStartMs={onSelectSegmentStartMs}
                        setIsEditingSubtitle={setIsEditingSubtitle}
                        onRequestPausePreview={onPausePreview}
                        onRequestClose={onRequestClose}
                    />
                ) : (
                    <SubtitleFontEditor
                        isVisible
                        activeFontFamily={activeFontFamily}
                        activeTextAlign={activeTextAlign}
                        activeTextCase={activeTextCase}
                        activeTextColor={activeTextColor}
                        activeOverlayColor={activeOverlayColor}
                        showOverlay={showOverlay}
                        onSelectFontFamily={onSelectFontFamily}
                        onSelectTextCase={onSelectTextCase}
                        onDecreaseFontSize={onDecreaseFontSize}
                        onIncreaseFontSize={onIncreaseFontSize}
                        onSelectTextColor={onSelectTextColor}
                        onSelectOverlayColor={onSelectOverlayColor}
                        onCycleTextAlign={onCycleTextAlign}
                        onToggleOverlay={onToggleOverlay}
                        onRequestPausePreview={onPausePreview}
                    />
                )}
            </View>
            <SubtitleBottomNav
                activeTab={activeTab}
                onOpenTextEditor={onOpenTextEditor}
                onOpenFontEditor={onOpenFontEditor}
                onDeleteSubtitle={onDeleteSubtitle}
                bottomInset={insets.bottom}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    headerContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        top: -24,
        zIndex: 10002,
    },
    headerTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 0,
    },
    headerSide: {
        width: 92,
        justifyContent: 'center',
    },
    headerSideRight: {
        alignItems: 'flex-end',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerPlayButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerMetaText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.2,
        fontVariant: ['tabular-nums'],
    },
    historyActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    historyActionButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0F1117',
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        zIndex: 9999,
        overflow: 'visible',
    },
    content: {
        flex: 1,
        overflow: 'visible',
    },
    contentAboveHeader: {
        zIndex: 10003,
    },
});
