import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import {
    AlignCenter as TextAlignCenter,
    AlignLeft as TextAlignStart,
    AlignRight as TextAlignEnd,
    CaseSensitive,
    X,
} from 'lucide-react-native';
import type {
    SubtitleFontFamily,
    SubtitleTextAlign,
    SubtitleTextCase,
} from '../../../domain/entities/Subtitle';
import { resolveSubtitleFontFamily } from '../../../core/utils/subtitleOverlay';
import OverlayCloseIcon from '../../../../assets/icons/overlayclose.svg';
import OverlayOpenIcon from '../../../../assets/icons/overlayopen.svg';
import ADownIcon from '../../../../assets/icons/a_down.svg';
import AUpIcon from '../../../../assets/icons/a_up.svg';
import TypeIcon from '../../../../assets/icons/type.svg';

interface SubtitleFontOption {
    value: SubtitleFontFamily;
    label: string;
}

type TypographyControl = 'textColor' | 'overlayColor' | 'textCase' | 'font';

interface SubtitleFontEditorProps {
    isVisible: boolean;
    activeFontFamily?: SubtitleFontFamily;
    activeTextAlign?: SubtitleTextAlign;
    activeTextCase?: SubtitleTextCase;
    showOverlay?: boolean;
    activeTextColor?: string;
    activeOverlayColor?: string;
    onSelectFontFamily: (fontFamily: SubtitleFontFamily) => void;
    onSelectTextCase: (textCase: 'upper' | 'lower' | 'title') => void;
    onDecreaseFontSize: () => void;
    onIncreaseFontSize: () => void;
    onSelectTextColor: (color: string) => void;
    onSelectOverlayColor: (color: string) => void;
    onCycleTextAlign: () => void;
    onToggleOverlay: () => void;
    onRequestPausePreview: () => void;
}

const SUBTITLE_ACTION_ICON_SIZE = 26;
const SUBTITLE_PALETTE_BG_COLOR = '#080A0F';
const TEXT_COLOR_SWATCH_SIZE = 26;
const TEXT_COLOR_SWATCH_GAP = 8;
const TEXT_COLOR_INITIAL_VISIBLE_COUNT = 10; // selected + 9 colors
const TEXT_COLOR_DIVIDER_WIDTH = 20;
const TEXT_COLOR_INITIAL_VISIBLE_WIDTH =
    (TEXT_COLOR_SWATCH_SIZE * TEXT_COLOR_INITIAL_VISIBLE_COUNT)
    + (TEXT_COLOR_SWATCH_GAP * (TEXT_COLOR_INITIAL_VISIBLE_COUNT - 1))
    + TEXT_COLOR_DIVIDER_WIDTH;
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

const TEXT_CASE_OPTIONS: Array<{ value: 'upper' | 'lower' | 'title'; token: 'AA' | 'aa' | 'Aa' }> = [
    { value: 'upper', token: 'AA' },
    { value: 'lower', token: 'aa' },
    { value: 'title', token: 'Aa' },
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

function renderOverlayToggleIcon(showOverlay: boolean) {
    if (showOverlay) {
        return <OverlayOpenIcon width={SUBTITLE_ACTION_ICON_SIZE} height={SUBTITLE_ACTION_ICON_SIZE} />;
    }
    return <OverlayCloseIcon width={SUBTITLE_ACTION_ICON_SIZE} height={SUBTITLE_ACTION_ICON_SIZE} />;
}

export const SubtitleFontEditor = ({
    isVisible,
    activeFontFamily,
    activeTextAlign,
    activeTextCase,
    showOverlay = true,
    activeTextColor,
    activeOverlayColor,
    onSelectFontFamily,
    onSelectTextCase,
    onDecreaseFontSize,
    onIncreaseFontSize,
    onSelectTextColor,
    onSelectOverlayColor,
    onCycleTextAlign,
    onToggleOverlay,
    onRequestPausePreview,
}: SubtitleFontEditorProps) => {
    const { width: windowWidth } = useWindowDimensions();
    const [isTextCaseMenuOpen, setIsTextCaseMenuOpen] = React.useState(false);
    const [isFontMenuOpen, setIsFontMenuOpen] = React.useState(true);
    const [colorPaletteTarget, setColorPaletteTarget] = React.useState<'text' | 'overlay' | null>(null);
    const [activeControl, setActiveControl] = React.useState<TypographyControl>('font');

    const handleOverlayControlPress = React.useCallback(() => {
        onRequestPausePreview();
        setActiveControl('overlayColor');
        if (!showOverlay) {
            onToggleOverlay();
            setColorPaletteTarget('overlay');
            return;
        }
        if (colorPaletteTarget === 'overlay') {
            setColorPaletteTarget(null);
            onToggleOverlay();
            return;
        }
        setColorPaletteTarget('overlay');
    }, [colorPaletteTarget, onRequestPausePreview, onToggleOverlay, showOverlay]);

    React.useEffect(() => {
        if (!isVisible) {
            setIsTextCaseMenuOpen(false);
            setIsFontMenuOpen(true);
            setColorPaletteTarget(null);
            setActiveControl('font');
        }
    }, [isVisible]);
    React.useEffect(() => {
        if (!showOverlay && colorPaletteTarget === 'overlay') {
            setColorPaletteTarget(null);
        }
    }, [colorPaletteTarget, showOverlay]);

    if (!isVisible) return null;

    const selectedFontFamily = getSafeFontFamily(activeFontFamily);
    const ActiveAlignIcon = getActiveAlignIcon(activeTextAlign);
    const selectedTextCase = activeTextCase === 'upper' || activeTextCase === 'lower' || activeTextCase === 'title'
        ? activeTextCase
        : 'title';
    const activeTypographyControl = colorPaletteTarget === 'text'
        ? 'textColor'
        : colorPaletteTarget === 'overlay'
            ? 'overlayColor'
            : isTextCaseMenuOpen
                ? 'textCase'
                : activeControl;
    const activePaletteColor = colorPaletteTarget === 'overlay' ? activeOverlayColor : activeTextColor;
    const normalizedActiveColor = String(activePaletteColor || '').toLowerCase();
    const selectedColor = (TEXT_COLOR_OPTIONS as readonly string[]).find(
        (color) => color.toLowerCase() === normalizedActiveColor,
    );
    const orderedColorOptions = selectedColor
        ? [selectedColor, ...(TEXT_COLOR_OPTIONS as readonly string[])]
        : (TEXT_COLOR_OPTIONS as readonly string[]);
    const paletteVisibleWidth = Math.max(
        180,
        Math.min(
            TEXT_COLOR_INITIAL_VISIBLE_WIDTH,
            windowWidth - 12 - 12 - 8 - 28,
        ),
    );

    return (
        <View
            style={[
                styles.subtitleEditorPanel,
            ]}
        >
            <View style={styles.typographyControlsArea}>
                {colorPaletteTarget && (
                    <View style={styles.textColorPaletteWrapper} pointerEvents="auto">
                        <View style={styles.textColorPaletteBlur}>
                        <View style={styles.textColorPaletteRow}>
                            <GHScrollView
                                style={[styles.textColorPaletteScroll, { width: paletteVisibleWidth }]}
                                horizontal
                                nestedScrollEnabled
                                directionalLockEnabled
                                showsHorizontalScrollIndicator={false}
                                keyboardShouldPersistTaps="always"
                                contentContainerStyle={styles.textColorPalette}
                            >
                                {orderedColorOptions.map((item, index) => {
                                    const isSelectedColor = normalizedActiveColor === item.toLowerCase();
                                    const isFirstItem = index === 0;
                                    const shouldShowDivider = Boolean(selectedColor) && isFirstItem;
                                    const shouldScaleAsActive = isSelectedColor && (!selectedColor || !isFirstItem);
                                    return (
                                        <React.Fragment key={`${item}-${index}`}>
                                            <Pressable
                                                style={[
                                                    styles.textColorSwatch,
                                                    { backgroundColor: item },
                                                    index !== orderedColorOptions.length - 1
                                                    && !shouldShowDivider
                                                    && styles.textColorSwatchSpacing,
                                                    shouldScaleAsActive && styles.textColorSwatchActive,
                                                ]}
                                                onPress={() => {
                                                    if (colorPaletteTarget === 'overlay') {
                                                        onSelectOverlayColor(item);
                                                        return;
                                                    }
                                                    onSelectTextColor(item);
                                                }}
                                            />
                                            {shouldShowDivider && (
                                                <View style={styles.textColorDividerContainer}>
                                                    <Text style={styles.textColorDivider}>|</Text>
                                                </View>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </GHScrollView>
                            <Pressable
                                style={[styles.typographyIconButton, styles.closeButton, styles.textColorPaletteCloseButton]}
                                onPress={() => setColorPaletteTarget(null)}
                            >
                                <X color="#FFFFFF" size={18} strokeWidth={1.5} />
                            </Pressable>
                        </View>
                        </View>
                    </View>
                )}
                <View style={styles.typographyControlsRow}>
                    <Pressable style={styles.typographyIconButton} onPress={onDecreaseFontSize}>
                        <ADownIcon width={SUBTITLE_ACTION_ICON_SIZE} height={SUBTITLE_ACTION_ICON_SIZE} />
                    </Pressable>
                    <Pressable style={styles.typographyIconButton} onPress={onIncreaseFontSize}>
                        <AUpIcon width={SUBTITLE_ACTION_ICON_SIZE} height={SUBTITLE_ACTION_ICON_SIZE} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.typographyIconButton,
                            activeTypographyControl === 'textColor' && styles.typographyIconButtonActive,
                        ]}
                        onPress={() => {
                            onRequestPausePreview();
                            setActiveControl('textColor');
                            setColorPaletteTarget((prev) => (prev === 'text' ? null : 'text'));
                        }}
                    >
                        {renderSubtitleColorWheelIcon()}
                    </Pressable>
                    <Pressable style={styles.typographyIconButton} onPress={onCycleTextAlign}>
                        <ActiveAlignIcon color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.typographyIconButton,
                            activeTypographyControl === 'overlayColor' && styles.typographyIconButtonActive,
                        ]}
                        onPress={handleOverlayControlPress}
                    >
                        {renderOverlayToggleIcon(showOverlay)}
                    </Pressable>
                    <Pressable
                        style={[
                            styles.typographyIconButton,
                            activeTypographyControl === 'textCase' && styles.typographyIconButtonActive,
                        ]}
                        onPress={() => {
                            onRequestPausePreview();
                            setActiveControl('textCase');
                            setIsTextCaseMenuOpen(true);
                            setIsFontMenuOpen(false);
                            setColorPaletteTarget(null);
                        }}
                    >
                        <CaseSensitive color="#FFFFFF" size={SUBTITLE_ACTION_ICON_SIZE} strokeWidth={2.3} />
                    </Pressable>
                    <Pressable
                        style={[
                            styles.typographyIconButton,
                            activeTypographyControl === 'font' && styles.typographyIconButtonActive,
                        ]}
                        onPress={() => {
                            onRequestPausePreview();
                            setActiveControl('font');
                            setIsFontMenuOpen(true);
                            setIsTextCaseMenuOpen(false);
                            setColorPaletteTarget(null);
                        }}
                    >
                        <TypeIcon width={SUBTITLE_ACTION_ICON_SIZE} height={SUBTITLE_ACTION_ICON_SIZE} />
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
                                onPress={() => {
                                    onRequestPausePreview();
                                    onSelectTextCase(option.value);
                                }}
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
                                onPress={() => {
                                    onRequestPausePreview();
                                    onSelectFontFamily(option.value);
                                }}
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
        </View>
    );
};

const styles = StyleSheet.create({
    subtitleEditorPanel: {
        flex: 1,
        backgroundColor: 'transparent',
        overflow: 'visible',
    },
    subtitleEditorList: {
        flex: 1,
    },
    typographyControlsArea: {
        position: 'relative',
        overflow: 'visible',
        zIndex: 10001,
    },
    typographyControlsRow: {
        marginTop: 10,
        marginHorizontal: 12,
        marginBottom: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textColorPaletteWrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: '100%',
        marginBottom: 4,
        zIndex: 10001,
        borderRadius: 14,
        backgroundColor: SUBTITLE_PALETTE_BG_COLOR,
    },
    textColorPaletteBlur: {
        height: 48,
        width: '100%',
        paddingHorizontal: 12,
        justifyContent: 'center',
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: SUBTITLE_PALETTE_BG_COLOR,
    },
    textColorPaletteRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    textColorPaletteScroll: {
        flexGrow: 0,
    },
    textColorPalette: {
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    textColorSwatch: {
        width: TEXT_COLOR_SWATCH_SIZE,
        height: TEXT_COLOR_SWATCH_SIZE,
        borderRadius: TEXT_COLOR_SWATCH_SIZE / 2,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    textColorSwatchActive: {
        transform: [{ scale: 1.18 }],
    },
    textColorSwatchSpacing: {
        marginRight: TEXT_COLOR_SWATCH_GAP,
    },
    textColorDividerContainer: {
        width: TEXT_COLOR_DIVIDER_WIDTH,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textColorDivider: {
        color: '#FFFFFF',
        fontSize: 18,
        lineHeight: 30,
        opacity: 0.9,
        transform: [{ translateY: -3 }],
    },
    textColorPaletteCloseButton: {
        marginLeft: 8,
    },
    typographyIconButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typographyIconButtonActive: {
        backgroundColor: 'rgba(255,255,255,0.14)',
        borderRadius: 12,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.09)',
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
