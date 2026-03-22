import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Keyboard } from 'react-native';
import { X } from 'lucide-react-native';
import { SubtitleSegment } from '../../../domain/entities/Subtitle';

// A simple utility to format ms to mm:ss
const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
const SUBTITLE_TIME_COLUMN_WIDTH = 72;
const isTimeInsideSegment = (timeMs: number, segment: SubtitleSegment, index: number, allSegments: SubtitleSegment[]) => {
    const isLastSegment = index === allSegments.length - 1;
    return timeMs >= segment.startMs
        && (isLastSegment ? timeMs <= segment.endMs : timeMs < segment.endMs);
};

interface SubtitleEditorProps {
    isVisible: boolean;
    segments: SubtitleSegment[];
    currentVideoTimeMs: number;
    activeAssetUri: string;
    onUpdateSubtitle: (uri: string, segmentIndex: number, newText: string) => void;
    onSelectSegmentStartMs: (startMs: number) => void;
    setIsEditingSubtitle: (isEditing: boolean) => void;
    onRequestPausePreview: () => void;
    onRequestClose: () => void;
}

export const SubtitleEditor = ({
    isVisible,
    segments,
    currentVideoTimeMs,
    activeAssetUri,
    onUpdateSubtitle,
    onSelectSegmentStartMs,
    setIsEditingSubtitle,
    onRequestPausePreview,
    onRequestClose,
}: SubtitleEditorProps) => {
    const scrollViewRef = React.useRef<ScrollView | null>(null);
    const inputRefs = React.useRef<Record<number, TextInput | null>>({});
    const rowOffsetsRef = React.useRef<Record<number, number>>({});
    const focusScrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasUserScrolledRef = React.useRef(false);
    const [selectedSegmentIndex, setSelectedSegmentIndex] = React.useState<number | null>(null);
    const [keyboardHeight, setKeyboardHeight] = React.useState(0);

    const activeSegmentIndex = React.useMemo(() => (
        segments.findIndex((segment, index) => isTimeInsideSegment(currentVideoTimeMs, segment, index, segments))
    ), [segments, currentVideoTimeMs]);

    const scrollSegmentToTop = React.useCallback((index: number, animated: boolean) => {
        if (index < 0) return;
        const targetY = rowOffsetsRef.current[index];
        if (typeof targetY !== 'number') return;

        scrollViewRef.current?.scrollTo({
            y: Math.max(0, targetY),
            animated,
        });
    }, []);

    const handleSubtitleFocus = React.useCallback((index: number) => {
        onRequestPausePreview();
        setSelectedSegmentIndex(index);
        setIsEditingSubtitle(true);
        onSelectSegmentStartMs(Math.max(0, Math.floor(segments[index]?.startMs || 0)));
        requestAnimationFrame(() => {
            scrollSegmentToTop(index, true);
        });
        if (focusScrollTimeoutRef.current) {
            clearTimeout(focusScrollTimeoutRef.current);
        }
        focusScrollTimeoutRef.current = setTimeout(() => {
            scrollSegmentToTop(index, true);
        }, 180);
    }, [onRequestPausePreview, onSelectSegmentStartMs, scrollSegmentToTop, segments, setIsEditingSubtitle]);
    const handleSubtitleRowPress = React.useCallback((index: number, startMs: number) => {
        onRequestPausePreview();
        setIsEditingSubtitle(true);
        onSelectSegmentStartMs(Math.max(0, Math.floor(startMs || 0)));
        scrollSegmentToTop(index, true);
        if (selectedSegmentIndex === index) {
            requestAnimationFrame(() => {
                inputRefs.current[index]?.focus();
            });
            return;
        }
        Keyboard.dismiss();
        setSelectedSegmentIndex(index);
    }, [onRequestPausePreview, onSelectSegmentStartMs, scrollSegmentToTop, selectedSegmentIndex, setIsEditingSubtitle]);

    React.useEffect(() => {
        if (hasUserScrolledRef.current) return;
        if (activeSegmentIndex < 0) return;

        requestAnimationFrame(() => {
            scrollSegmentToTop(activeSegmentIndex, true);
        });
    }, [activeSegmentIndex, scrollSegmentToTop]);
    React.useEffect(() => {
        hasUserScrolledRef.current = false;
        setSelectedSegmentIndex(null);
    }, [activeAssetUri]);
    React.useEffect(() => {
        const onShow = Keyboard.addListener('keyboardDidShow', (event) => {
            setKeyboardHeight(Math.max(0, Math.floor(event.endCoordinates?.height || 0)));
        });
        const onHide = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, []);
    React.useEffect(() => () => {
        if (focusScrollTimeoutRef.current) {
            clearTimeout(focusScrollTimeoutRef.current);
        }
    }, []);

    const shouldApplyKeyboardBottomPadding = keyboardHeight > 0
        && selectedSegmentIndex !== null
        && selectedSegmentIndex >= Math.max(0, segments.length - 8);
    const dynamicListBottomPadding = shouldApplyKeyboardBottomPadding
        ? Math.max(260, keyboardHeight + 140)
        : 8;

    React.useEffect(() => {
        if (!shouldApplyKeyboardBottomPadding || selectedSegmentIndex === null) return;
        requestAnimationFrame(() => {
            scrollSegmentToTop(selectedSegmentIndex, true);
        });
        const timeoutId = setTimeout(() => {
            scrollSegmentToTop(selectedSegmentIndex, true);
        }, 90);
        return () => clearTimeout(timeoutId);
    }, [keyboardHeight, scrollSegmentToTop, selectedSegmentIndex, shouldApplyKeyboardBottomPadding]);

    if (!isVisible) return null;

    return (
        <View style={styles.subtitleEditorPanel}>
            <View style={styles.subtitleEditorHeaderRow}>
                <View style={styles.subtitleEditorHeaderSide}>
                    <Text style={styles.subtitleEditorHeaderText}>Seç</Text>
                </View>
                <View style={styles.subtitleEditorHeaderCenter}>
                    <Text style={[styles.subtitleEditorHeaderText, styles.subtitleEditorHeaderTitle]}>
                        Alt yazıları düzenle
                    </Text>
                </View>
                <View style={[styles.subtitleEditorHeaderSide, styles.subtitleEditorHeaderSideRight]}>
                    <Pressable style={styles.subtitleEditorCloseButton} onPress={onRequestClose} hitSlop={10}>
                        <X color="#FFFFFF" size={16} strokeWidth={2.2} />
                    </Pressable>
                </View>
            </View>
            <ScrollView
                ref={scrollViewRef}
                style={styles.subtitleEditorList}
                contentContainerStyle={[
                    styles.subtitleEditorListContent,
                    { paddingBottom: dynamicListBottomPadding },
                ]}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                onScrollBeginDrag={() => {
                    hasUserScrolledRef.current = true;
                }}
            >
                {segments.map((segment, idx) => {
                    const isActiveSegment = isTimeInsideSegment(currentVideoTimeMs, segment, idx, segments);
                    const isSelectedSegment = selectedSegmentIndex === idx;
                    return (
                        <Pressable
                            key={`${segment.startMs}-${segment.endMs}-${idx}`}
                            onPress={() => handleSubtitleRowPress(idx, segment.startMs)}
                            onLayout={(event) => {
                                rowOffsetsRef.current[idx] = event.nativeEvent.layout.y;
                            }}
                            style={[
                                styles.subtitleEditorRow,
                                { zIndex: 100 },
                                isActiveSegment && styles.subtitleEditorRowActive,
                                isSelectedSegment && styles.subtitleEditorRowSelected,
                            ]}
                        >
                            <View style={styles.subtitleEditorTimeSlot}>
                                <Text style={[styles.subtitleEditorTime, isActiveSegment && styles.subtitleEditorTimeActive]}>
                                    {formatMs(segment.startMs)}
                                </Text>
                            </View>
                            <View style={styles.subtitleEditorInputWrapper}>
                                <TextInput
                                    ref={(ref) => {
                                        inputRefs.current[idx] = ref;
                                    }}
                                    value={segment.text}
                                    onFocus={() => handleSubtitleFocus(idx)}
                                    editable={isSelectedSegment}
                                    onChangeText={(text: string) => onUpdateSubtitle(activeAssetUri, idx, text)}
                                    multiline
                                    style={[styles.subtitleEditorInput, isActiveSegment && styles.subtitleEditorInputActive]}
                                    placeholder="Subtitle metni"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
                                />
                            </View>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleEditorPanel: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    subtitleEditorHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    subtitleEditorHeaderSide: {
        width: SUBTITLE_TIME_COLUMN_WIDTH,
        justifyContent: 'center',
    },
    subtitleEditorHeaderSideRight: {
        alignItems: 'flex-end',
    },
    subtitleEditorHeaderCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleEditorHeaderText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    subtitleEditorHeaderTitle: {
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitleEditorCloseButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.14)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleEditorList: {
        flex: 1,
        zIndex: 50,
    },
    subtitleEditorListContent: {
        paddingBottom: 8,
    },
    subtitleEditorRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'flex-start',
    },
    subtitleEditorRowActive: {
        backgroundColor: 'rgba(255,255,255,0.11)',
    },
    subtitleEditorRowSelected: {
        borderLeftWidth: 2,
        borderLeftColor: 'rgba(255,255,255,0.72)',
        paddingLeft: 18,
    },
    subtitleEditorTimeSlot: {
        width: SUBTITLE_TIME_COLUMN_WIDTH,
        justifyContent: 'center',
    },
    subtitleEditorTime: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'left',
        fontVariant: ['tabular-nums'],
    },
    subtitleEditorTimeActive: {
        fontWeight: '800',
    },
    subtitleEditorInputWrapper: {
        flex: 1,
        paddingLeft: 6,
    },
    subtitleEditorInput: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
        padding: 0,
        minHeight: 22,
    },
    subtitleEditorInputActive: {
        fontWeight: '700',
    },
});
