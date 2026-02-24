import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import {
    AlignCenter as TextAlignCenter,
    AlignLeft as TextAlignStart,
    AlignRight as TextAlignEnd,
    AArrowDown,
    AArrowUp,
    Menu,
    SquareMenu,
    Type as TypeIcon,
    X,
} from 'lucide-react-native';
import type { SubtitleFontFamily, SubtitleTextAlign, SubtitleTextCase } from '../../../domain/entities/Subtitle';
import { resolveSubtitleFontFamily } from '../../../core/utils/subtitleOverlay';
import { SubtitleBottomNav } from './SubtitleBottomNav';

interface SubtitleFontOption {
    value: SubtitleFontFamily;
    label: string;
}

interface SubtitleFontEditorProps {
    isVisible: boolean;
    activeFontFamily?: SubtitleFontFamily;
    activeTextAlign?: SubtitleTextAlign;
    activeTextCase?: SubtitleTextCase;
    showOverlay?: boolean;
    activeTextColor?: string;
    onSelectFontFamily: (fontFamily: SubtitleFontFamily) => void;
    onSelectTextCase: (textCase: 'upper' | 'lower' | 'title') => void;
    onDecreaseFontSize: () => void;
    onIncreaseFontSize: () => void;
    onSelectTextColor: (color: string) => void;
    onCycleTextAlign: () => void;
    onToggleOverlay: () => void;
    onOpenTextEditor: () => void;
    onOpenFontEditor: () => void;
    onCloseEditor: () => void;
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

const TEXT_CASE_OPTIONS: Array<{ value: 'upper' | 'lower' | 'title'; token: 'EE' | 'ee' | 'Ee' }> = [
    { value: 'upper', token: 'EE' },
    { value: 'lower', token: 'ee' },
    { value: 'title', token: 'Ee' },
];

const TEXT_COLOR_OPTIONS = [
    '#FFFFFF',
    '#000000',
    '#FF3B30',
    '#007AFF',
    '#34C759',
    '#FFD60A',
    '#FF9500',
    '#AF52DE',
    '#FF2D55',
    '#32ADE6',
    '#5AC8FA',
    '#00C7BE',
    '#A8E10C',
    '#F5C542',
    '#8E8E93',
    '#3A3A3C',
    '#8E1B1B',
    '#1C2A4A',
    '#F5E9D3',
    '#8B5E3C',
] as const;

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
    activeTextCase,
    showOverlay = true,
    activeTextColor,
    onSelectFontFamily,
    onSelectTextCase,
    onDecreaseFontSize,
    onIncreaseFontSize,
    onSelectTextColor,
    onCycleTextAlign,
    onToggleOverlay,
    onOpenTextEditor,
    onOpenFontEditor,
    onCloseEditor,
    onDeleteSubtitle,
    panelHeight,
    bottomInset = 0,
}: SubtitleFontEditorProps) => {
    const [isTextCaseMenuOpen, setIsTextCaseMenuOpen] = React.useState(false);
    const [isFontMenuOpen, setIsFontMenuOpen] = React.useState(true);
    const [isColorPaletteOpen, setIsColorPaletteOpen] = React.useState(false);

    React.useEffect(() => {
        if (!isVisible) {
            setIsTextCaseMenuOpen(false);
            setIsFontMenuOpen(true);
            setIsColorPaletteOpen(false);
        }
    }, [isVisible]);

    if (!isVisible) return null;

    const selectedFontFamily = getSafeFontFamily(activeFontFamily);
    const ActiveAlignIcon = getActiveAlignIcon(activeTextAlign);
    const selectedTextCase = activeTextCase === 'upper' || activeTextCase === 'lower' || activeTextCase === 'title'
        ? activeTextCase
        : 'title';

    return (
        <View
            style={[
                styles.subtitleEditorPanel,
                panelHeight ? { height: panelHeight } : null,
                isColorPaletteOpen && styles.subtitleEditorPanelPaletteOpen,
            ]}
        >
            <View style={styles.typographyControlsArea}>
                {isColorPaletteOpen && (
                    <View style={styles.textColorPaletteWrapper} pointerEvents="auto">
                        <GHScrollView
                            horizontal
                            nestedScrollEnabled
                            directionalLockEnabled
                            showsHorizontalScrollIndicator={false}
                            keyboardShouldPersistTaps="always"
                            contentContainerStyle={styles.textColorPalette}
                        >
                            {(TEXT_COLOR_OPTIONS as readonly string[]).map((item, index) => {
                                const isSelected = String(activeTextColor || '').toLowerCase() === item.toLowerCase();
                                return (
                                    <Pressable
                                        key={item}
                                        style={[
                                            styles.textColorSwatch,
                                            { backgroundColor: item },
                                            index !== TEXT_COLOR_OPTIONS.length - 1 && styles.textColorSwatchSpacing,
                                            isSelected && styles.textColorSwatchActive,
                                        ]}
                                        onPress={() => onSelectTextColor(item)}
                                    />
                                );
                            })}
                        </GHScrollView>
                    </View>
                )}
                <View style={styles.typographyControlsRow}>
                    <Pressable style={styles.typographyIconButton} onPress={onDecreaseFontSize}>
                        <AArrowDown color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    </Pressable>
                    <Pressable style={styles.typographyIconButton} onPress={onIncreaseFontSize}>
                        <AArrowUp color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    </Pressable>
                    <Pressable
                        style={styles.typographyIconButton}
                        onPress={() => setIsColorPaletteOpen((prev) => !prev)}
                    >
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
                    <Pressable
                        style={styles.typographyIconButton}
                        onPress={() => {
                            setIsTextCaseMenuOpen(true);
                            setIsFontMenuOpen(false);
                            setIsColorPaletteOpen(false);
                        }}
                    >
                        <Text style={styles.textCaseTriggerText}>Ee</Text>
                    </Pressable>
                    <Pressable
                        style={styles.typographyIconButton}
                        onPress={() => {
                            setIsFontMenuOpen(true);
                            setIsTextCaseMenuOpen(false);
                            setIsColorPaletteOpen(false);
                        }}
                    >
                        <TypeIcon color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    </Pressable>
                    <View style={styles.controlsSpacer} />
                    <Pressable style={[styles.typographyIconButton, styles.closeButton]} onPress={onCloseEditor}>
                        <X color="#FFFFFF" size={18} strokeWidth={1.5} />
                    </Pressable>
                </View>
            </View>
            {isTextCaseMenuOpen && (
                <View style={styles.textCaseRow}>
                    {TEXT_CASE_OPTIONS.map((option) => {
                        const isSelected = selectedTextCase === option.value;
                        return (
                            <Pressable
                                key={option.value}
                                style={[
                                    styles.textCaseCard,
                                    isSelected && styles.textCaseCardActive,
                                ]}
                                onPress={() => onSelectTextCase(option.value)}
                            >
                                <Text style={styles.textCaseCardText}>{option.token}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            )}
            {isFontMenuOpen ? (
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
            ) : (
                <View style={styles.subtitleEditorList} />
            )}
            <SubtitleBottomNav
                activeTab='font'
                onOpenTextEditor={onOpenTextEditor}
                onOpenFontEditor={onOpenFontEditor}
                onDeleteSubtitle={onDeleteSubtitle}
                bottomInset={bottomInset}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleEditorPanel: {
        height: 270,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
        borderTopWidth: 1,
        borderTopColor: 'transparent',
        backgroundColor: 'transparent',
        zIndex: 9999,
    },
    subtitleEditorPanelPaletteOpen: {
        overflow: 'visible',
    },
    subtitleEditorList: {
        flex: 1,
    },
    typographyControlsArea: {
        position: 'relative',
    },
    typographyControlsRow: {
        marginTop: 10,
        marginHorizontal: 12,
        marginBottom: 4,
        flexDirection: 'row',
        gap: 4,
        alignItems: 'center',
    },
    textColorPaletteWrapper: {
        position: 'absolute',
        left: 12,
        right: 12,
        top: 0,
        transform: [{ translateY: -42 }],
        height: 40,
        justifyContent: 'center',
        zIndex: 120,
    },
    textColorPalette: {
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    textColorSwatch: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    textColorSwatchActive: {
        borderWidth: 3,
    },
    textColorSwatchSpacing: {
        marginRight: 8,
    },
    typographyIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlsSpacer: {
        flex: 1,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.09)',
    },
    textCaseTriggerText: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '700',
        lineHeight: 26,
    },
    textCaseRow: {
        marginHorizontal: 12,
        marginBottom: 6,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    textCaseCard: {
        width: '31.5%',
        minHeight: 56,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.09)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    textCaseCardActive: {
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.95)',
    },
    textCaseCardText: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '700',
    },
    subtitleColorWheelIcon: {
        width: SUBTITLE_ACTION_ICON_SIZE,
        height: SUBTITLE_ACTION_ICON_SIZE,
    },
    subtitleEditorGrid: {
        paddingHorizontal: 12,
        paddingTop: 0,
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
});
