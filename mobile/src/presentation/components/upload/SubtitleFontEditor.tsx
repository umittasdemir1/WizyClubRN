import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import {
    AlignCenter as TextAlignCenter,
    AlignLeft as TextAlignStart,
    AlignRight as TextAlignEnd,
    AArrowDown,
    AArrowUp,
    Menu,
    SquareMenu,
    TextSelect,
    CaseSensitive,
    ListX,
} from 'lucide-react-native';
import type { SubtitleFontFamily, SubtitleTextAlign } from '../../../domain/entities/Subtitle';
import { resolveSubtitleFontFamily } from '../../../core/utils/subtitleOverlay';

interface SubtitleFontOption {
    value: SubtitleFontFamily;
    label: string;
}

interface SubtitleFontEditorProps {
    isVisible: boolean;
    activeFontFamily?: SubtitleFontFamily;
    activeTextAlign?: SubtitleTextAlign;
    showOverlay?: boolean;
    onSelectFontFamily: (fontFamily: SubtitleFontFamily) => void;
    onDecreaseFontSize: () => void;
    onIncreaseFontSize: () => void;
    onCycleTextColor: () => void;
    onCycleTextAlign: () => void;
    onToggleOverlay: () => void;
    onOpenTextEditor: () => void;
    onOpenFontEditor: () => void;
    onDeleteSubtitle: () => void;
    panelHeight?: number;
    bottomInset?: number;
}

const SUBTITLE_ACTION_ICON_SIZE = 26;
const ColorWheelIconAsset = require('../../../../assets/icons/color-wheel');

const FONT_OPTIONS: SubtitleFontOption[] = [
    { value: 'system', label: 'Classic' },
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

function getSafeFontFamily(value?: SubtitleFontFamily): SubtitleFontFamily {
    if (value && FONT_OPTIONS.some((option) => option.value === value)) {
        return value;
    }
    return 'system';
}

function getActiveAlignIcon(activeTextAlign?: SubtitleTextAlign) {
    switch (activeTextAlign) {
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
}

function renderSubtitleColorWheelIcon() {
    const resolvedIcon = (ColorWheelIconAsset as { default?: unknown })?.default ?? ColorWheelIconAsset;

    if (typeof resolvedIcon === 'function') {
        const SvgIcon = resolvedIcon as React.ComponentType<{ width?: number; height?: number }>;
        return <SvgIcon width={SUBTITLE_ACTION_ICON_SIZE} height={SUBTITLE_ACTION_ICON_SIZE} />;
    }

    return (
        <Image
            source={resolvedIcon as any}
            style={styles.subtitleColorWheelIcon}
            contentFit="contain"
        />
    );
}

export const SubtitleFontEditor = ({
    isVisible,
    activeFontFamily,
    activeTextAlign,
    showOverlay = true,
    onSelectFontFamily,
    onDecreaseFontSize,
    onIncreaseFontSize,
    onCycleTextColor,
    onCycleTextAlign,
    onToggleOverlay,
    onOpenTextEditor,
    onOpenFontEditor,
    onDeleteSubtitle,
    panelHeight,
    bottomInset = 0,
}: SubtitleFontEditorProps) => {
    if (!isVisible) return null;

    const selectedFontFamily = getSafeFontFamily(activeFontFamily);
    const ActiveAlignIcon = getActiveAlignIcon(activeTextAlign);

    return (
        <View style={[styles.subtitleEditorPanel, panelHeight ? { height: panelHeight } : null]}>
            <View style={styles.typographyControlsRow}>
                <Pressable style={styles.typographyIconButton} onPress={onDecreaseFontSize}>
                    <AArrowDown color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable style={styles.typographyIconButton} onPress={onIncreaseFontSize}>
                    <AArrowUp color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable style={styles.typographyIconButton} onPress={onCycleTextColor}>
                    {renderSubtitleColorWheelIcon()}
                </Pressable>
                <Pressable style={styles.typographyIconButton} onPress={onCycleTextAlign}>
                    <ActiveAlignIcon color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable style={styles.typographyIconButton} onPress={onToggleOverlay}>
                    {showOverlay ? (
                        <SquareMenu color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    ) : (
                        <Menu color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    )}
                </Pressable>
            </View>
            <ScrollView
                style={styles.subtitleEditorList}
                contentContainerStyle={[
                    styles.subtitleEditorGrid,
                    styles.subtitleEditorGridContent,
                ]}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
            >
                {FONT_OPTIONS.map((option) => {
                    const isActiveOption = option.value === selectedFontFamily;
                    const resolvedFontFamily = resolveSubtitleFontFamily(option.value);
                    return (
                        <Pressable
                            key={option.value}
                            style={[
                                styles.subtitleFontCard,
                                isActiveOption && styles.subtitleFontCardActive,
                            ]}
                            onPress={() => onSelectFontFamily(option.value)}
                        >
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.subtitleFontLabel,
                                    { fontFamily: resolvedFontFamily },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
            <View style={[styles.subtitleBottomNavRow, { paddingBottom: Math.max(bottomInset, 10) }]}>
                <Pressable style={styles.subtitleBottomNavButton} onPress={onOpenTextEditor}>
                    <TextSelect color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                </Pressable>
                <Pressable
                    style={[styles.subtitleBottomNavButton, styles.subtitleBottomNavButtonActive]}
                    onPress={onOpenFontEditor}
                >
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
        height: 270,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderTopColor: 'transparent',
        backgroundColor: '#1E1E1E',
        zIndex: 100,
    },
    subtitleEditorList: {
        flex: 1,
    },
    typographyControlsRow: {
        marginTop: 10,
        marginHorizontal: 12,
        marginBottom: 4,
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    typographyIconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleColorWheelIcon: {
        width: SUBTITLE_ACTION_ICON_SIZE,
        height: SUBTITLE_ACTION_ICON_SIZE,
    },
    subtitleEditorGrid: {
        paddingHorizontal: 12,
        paddingTop: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    subtitleEditorGridContent: {
        paddingBottom: 8,
    },
    subtitleFontCard: {
        width: '31.5%',
        minHeight: 56,
        marginBottom: 8,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.09)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    subtitleFontCardActive: {
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.95)',
    },
    subtitleFontLabel: {
        color: '#FFFFFF',
        fontSize: 15,
        lineHeight: 20,
        textAlign: 'center',
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
