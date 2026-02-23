import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import type { SubtitleFontFamily } from '../../../domain/entities/Subtitle';
import { resolveSubtitleFontFamily } from '../../../core/utils/subtitleOverlay';

interface SubtitleFontOption {
    value: SubtitleFontFamily;
    label: string;
}

interface SubtitleFontEditorProps {
    isVisible: boolean;
    activeFontFamily?: SubtitleFontFamily;
    onSelectFontFamily: (fontFamily: SubtitleFontFamily) => void;
}

const FONT_OPTIONS: SubtitleFontOption[] = [
    { value: 'system', label: 'Sistem' },
    { value: 'serif', label: 'Serif' },
    { value: 'mono', label: 'Mono' },
    { value: 'roboto', label: 'Roboto' },
    { value: 'openSans', label: 'Open Sans' },
    { value: 'poppins', label: 'Poppins' },
    { value: 'montserrat', label: 'Montserrat' },
    { value: 'lato', label: 'Lato' },
    { value: 'sourceSansPro', label: 'Source Sans Pro' },
    { value: 'inter', label: 'Inter' },
    { value: 'raleway', label: 'Raleway' },
    { value: 'oswald', label: 'Oswald' },
    { value: 'rubik', label: 'Rubik' },
    { value: 'ubuntu', label: 'Ubuntu' },
    { value: 'bebasNeue', label: 'Bebas Neue' },
    { value: 'playfairDisplay', label: 'Playfair Display' },
    { value: 'pacifico', label: 'Pacifico' },
    { value: 'dancingScript', label: 'Dancing Script' },
    { value: 'lobster', label: 'Lobster' },
];

const SAMPLE_TEXT = 'Altyazi gorunumu';

function getSafeFontFamily(value?: SubtitleFontFamily): SubtitleFontFamily {
    if (value && FONT_OPTIONS.some((option) => option.value === value)) {
        return value;
    }
    return 'system';
}

export const SubtitleFontEditor = ({
    isVisible,
    activeFontFamily,
    onSelectFontFamily,
}: SubtitleFontEditorProps) => {
    if (!isVisible) return null;

    const selectedFontFamily = getSafeFontFamily(activeFontFamily);

    return (
        <View style={styles.subtitleEditorPanel}>
            <View style={styles.subtitleEditorHeaderRow}>
                <Text style={[styles.subtitleEditorHeaderText, { width: 96 }]}>Font</Text>
                <Text style={[styles.subtitleEditorHeaderText, { flex: 1, paddingLeft: 4 }]}>Onizleme</Text>
            </View>
            <ScrollView
                style={styles.subtitleEditorList}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
            >
                {FONT_OPTIONS.map((option, idx) => {
                    const isActiveOption = option.value === selectedFontFamily;
                    return (
                        <Pressable
                            key={option.value}
                            style={[
                                styles.subtitleEditorRow,
                                isActiveOption && styles.subtitleEditorRowActive,
                                idx === FONT_OPTIONS.length - 1 && { borderBottomWidth: 0 },
                            ]}
                            onPress={() => onSelectFontFamily(option.value)}
                        >
                            <View style={styles.subtitleEditorTimeBadge}>
                                <Text style={styles.subtitleEditorTime}>{option.label}</Text>
                            </View>
                            <View style={styles.subtitleEditorInputWrapper}>
                                <Text
                                    style={[
                                        styles.subtitleEditorInput,
                                        { fontFamily: resolveSubtitleFontFamily(option.value) },
                                    ]}
                                >
                                    {SAMPLE_TEXT}
                                </Text>
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
        height: 380,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.15)',
        backgroundColor: '#080A0F',
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
    },
    subtitleEditorInputWrapper: {
        flex: 1,
        paddingLeft: 12,
        justifyContent: 'center',
    },
    subtitleEditorInput: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 22,
        padding: 0,
        minHeight: 22,
    },
});
