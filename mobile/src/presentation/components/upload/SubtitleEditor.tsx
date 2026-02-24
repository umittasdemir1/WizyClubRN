import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { TextSelect, CaseSensitive, ListX } from 'lucide-react-native';
import { SubtitleSegment } from '../../../domain/entities/Subtitle';

// A simple utility to format ms to mm:ss
const formatMs = (ms: number) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

interface SubtitleEditorProps {
    isVisible: boolean;
    segments: SubtitleSegment[];
    currentVideoTimeMs: number;
    activeAssetUri: string;
    onUpdateSubtitle: (uri: string, segmentIndex: number, newText: string) => void;
    onOpenTextEditor: () => void;
    onOpenFontEditor: () => void;
    onDeleteSubtitle: () => void;
    setIsEditingSubtitle: (isEditing: boolean) => void;
    panelHeight?: number;
    bottomInset?: number;
}

const SUBTITLE_ACTION_ICON_SIZE = 26;

export const SubtitleEditor = ({
    isVisible,
    segments,
    currentVideoTimeMs,
    activeAssetUri,
    onUpdateSubtitle,
    onOpenTextEditor,
    onOpenFontEditor,
    onDeleteSubtitle,
    setIsEditingSubtitle,
    panelHeight,
    bottomInset = 0,
}: SubtitleEditorProps) => {
    if (!isVisible) return null;

    return (
        <View style={[styles.subtitleEditorPanel, panelHeight ? { height: panelHeight } : null]}>
            <View style={styles.subtitleEditorHeaderRow}>
                <Text style={[styles.subtitleEditorHeaderText, { width: 96 }]}>Süre</Text>
                <Text style={[styles.subtitleEditorHeaderText, { flex: 1, paddingLeft: 4 }]}>Metin</Text>
            </View>
            <ScrollView
                style={styles.subtitleEditorList}
                contentContainerStyle={styles.subtitleEditorListContent}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
            >
                {segments.map((segment, idx) => {
                    const isActiveSegment = currentVideoTimeMs >= segment.startMs && currentVideoTimeMs <= segment.endMs;
                    return (
                        <View
                            key={`${segment.startMs}-${segment.endMs}-${idx}`}
                            style={[
                                styles.subtitleEditorRow,
                                isActiveSegment && styles.subtitleEditorRowActive,
                                idx === segments.length - 1 && { borderBottomWidth: 0 }
                            ]}
                        >
                            <View style={styles.subtitleEditorTimeBadge}>
                                <Text style={styles.subtitleEditorTime}>
                                    {formatMs(segment.startMs)} - {formatMs(segment.endMs)}
                                </Text>
                            </View>
                            <View style={styles.subtitleEditorInputWrapper}>
                                <TextInput
                                    value={segment.text}
                                    onFocus={() => setIsEditingSubtitle(true)}
                                    onChangeText={(text: string) => onUpdateSubtitle(activeAssetUri, idx, text)}
                                    multiline
                                    style={styles.subtitleEditorInput}
                                    placeholder="Subtitle metni"
                                    placeholderTextColor="rgba(255,255,255,0.35)"
                                />
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
            <View style={[styles.subtitleBottomNavRow, { paddingBottom: Math.max(bottomInset, 10) }]}>
                <Pressable
                    style={[styles.subtitleBottomNavButton, styles.subtitleBottomNavButtonActive]}
                    onPress={onOpenTextEditor}
                >
                    <TextSelect color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable style={styles.subtitleBottomNavButton} onPress={onOpenFontEditor}>
                    <CaseSensitive color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable style={styles.subtitleBottomNavButton} onPress={onDeleteSubtitle}>
                    <ListX color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleEditorPanel: {
        height: 380,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderTopColor: 'transparent',
        backgroundColor: '#1E1E1E',
        zIndex: 100,
    },
    subtitleEditorHeaderRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    subtitleEditorHeaderText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subtitleEditorList: {
        flex: 1,
    },
    subtitleEditorListContent: {
        paddingBottom: 8,
    },
    subtitleEditorRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
        alignItems: 'flex-start',
    },
    subtitleEditorRowActive: {
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    subtitleEditorTimeBadge: {
        width: 96,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        marginTop: 2,
    },
    subtitleEditorTime: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    subtitleEditorInputWrapper: {
        flex: 1,
        paddingLeft: 12,
    },
    subtitleEditorInput: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
        padding: 0,
        minHeight: 22,
    },
    subtitleBottomNavRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    subtitleBottomNavButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleBottomNavButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.14)',
    },
});
