import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type {
    SubtitleFontFamily,
    SubtitleFontWeight,
    SubtitleOverlayVariant,
    SubtitlePresentation,
    SubtitleStyle,
    SubtitleTextCase,
    SubtitleTextAlign,
} from '../../domain/entities/Subtitle';
import { resolveSubtitleTextAlign } from './subtitleUtils';

export const SUBTITLE_SIDE_MARGIN = 20;
export const SUBTITLE_FONT_MIN = 12;
export const SUBTITLE_FONT_MAX = 42;
export const SUBTITLE_WIDTH_RATIO_MIN = 0.05;
export const SUBTITLE_DEFAULT_BOTTOM_OFFSET = 120;
export const SUBTITLE_PADDING_HORIZONTAL = 4;
export const SUBTITLE_PADDING_VERTICAL = 2;
export const SUBTITLE_BORDER_RADIUS = 8;
export const SUBTITLE_MIN_HEIGHT = 40;
export const SUBTITLE_OVERLAY_BACKGROUND_DARK = '#000000';
export const SUBTITLE_OVERLAY_BACKGROUND_LIGHT = '#FFFFFF';
export const SUBTITLE_OVERLAY_BACKGROUND_TRANSPARENT = 'rgba(255,255,255,0.35)';
export const SUBTITLE_TEXT_COLOR_PRESETS = [
    '#FFFFFF',
    '#FFE066',
    '#6EE7F9',
    '#FF9AA2',
    '#080A0F',
] as const;
export const SUBTITLE_FONT_FAMILY_ORDER = [
    'system',
    'serif',
    'mono',
    'roboto',
    'openSans',
    'poppins',
    'montserrat',
    'lato',
    'sourceSansPro',
    'inter',
    'raleway',
    'oswald',
    'rubik',
    'ubuntu',
    'bebasNeue',
    'playfairDisplay',
    'pacifico',
    'dancingScript',
    'lobster',
] as const;
export const SUBTITLE_FONT_WEIGHT_ORDER = ['400', '500', '600', '700'] as const;

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
    fontSize: 18,
    textAlign: 'center',
    showOverlay: true,
    fontFamily: 'system',
    textColor: '#080A0F',
    overlayColor: '#FFFFFF',
    overlayVariant: 'noneBorder',
    fontWeight: '700',
    textCase: 'original',
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const clamp01 = (value: number) => clamp(value, 0, 1);

const isValidSubtitleTextAlign = (value: string): value is SubtitleTextAlign =>
    value === 'start' ||
    value === 'center' ||
    value === 'end' ||
    value === 'left' ||
    value === 'right';

const isValidSubtitleFontFamily = (value: string): value is SubtitleFontFamily =>
    (SUBTITLE_FONT_FAMILY_ORDER as readonly string[]).includes(value);

const isValidSubtitleOverlayVariant = (value: string): value is SubtitleOverlayVariant =>
    value === 'noneBorder' ||
    value === 'transparent' ||
    value === 'dark' ||
    value === 'light' ||
    value === 'lightBorder' ||
    value === 'darkBorder';

const isValidSubtitleFontWeight = (value: string): value is SubtitleFontWeight =>
    value === '400' ||
    value === '500' ||
    value === '600' ||
    value === '700';

const isValidSubtitleTextCase = (value: string): value is SubtitleTextCase =>
    value === 'original' ||
    value === 'upper' ||
    value === 'lower' ||
    value === 'title' ||
    value === 'sentence';

const isScriptSubtitleFontFamily = (value: SubtitleFontFamily): boolean =>
    value === 'pacifico' ||
    value === 'dancingScript' ||
    value === 'lobster';

function resolveTextColorForOverlay(
    showOverlay: boolean,
    fallbackColor: string
): string {
    void showOverlay;
    return fallbackColor;
}

export interface ResolvedSubtitleStyle {
    fontSize: number;
    lineHeight: number;
    textAlign: 'left' | 'center' | 'right';
    showOverlay: boolean;
    fontFamily: string | undefined;
    textColor: string;
    overlayColor: string;
    overlayVariant: SubtitleOverlayVariant;
    fontWeight?: SubtitleFontWeight;
}

export function resolveSubtitleFontFamily(fontFamily?: SubtitleFontFamily): string | undefined {
    const safeFont = isValidSubtitleFontFamily(String(fontFamily || ''))
        ? (fontFamily as SubtitleFontFamily)
        : DEFAULT_SUBTITLE_STYLE.fontFamily!;
    switch (safeFont) {
        case 'serif':
            return 'serif';
        case 'mono':
            return Platform.OS === 'ios' ? 'Menlo' : 'monospace';
        case 'roboto':
            return 'SubtitleRoboto';
        case 'openSans':
            return 'SubtitleOpenSans';
        case 'poppins':
            return 'SubtitlePoppins';
        case 'montserrat':
            return 'SubtitleMontserrat';
        case 'lato':
            return 'SubtitleLato';
        case 'sourceSansPro':
            return 'SubtitleSourceSansPro';
        case 'inter':
            return 'SubtitleInter';
        case 'raleway':
            return 'SubtitleRaleway';
        case 'oswald':
            return 'SubtitleOswald';
        case 'rubik':
            return 'SubtitleRubik';
        case 'ubuntu':
            return 'SubtitleUbuntu';
        case 'bebasNeue':
            return 'SubtitleBebasNeue';
        case 'playfairDisplay':
            return 'SubtitlePlayfairDisplay';
        case 'pacifico':
            return 'SubtitlePacifico';
        case 'dancingScript':
            return 'SubtitleDancingScript';
        case 'lobster':
            return 'SubtitleLobster';
        case 'system':
        default:
            return Platform.OS === 'ios' ? 'System' : 'sans-serif';
    }
}

export function resolveSubtitleStyle(style?: SubtitleStyle | null): ResolvedSubtitleStyle {
    const fontSize = clamp(
        Number(style?.fontSize) || DEFAULT_SUBTITLE_STYLE.fontSize,
        SUBTITLE_FONT_MIN,
        SUBTITLE_FONT_MAX
    );
    const domainTextAlign = isValidSubtitleTextAlign(String(style?.textAlign || ''))
        ? (style?.textAlign as SubtitleTextAlign)
        : DEFAULT_SUBTITLE_STYLE.textAlign;
    const fontFamily = isValidSubtitleFontFamily(String(style?.fontFamily || ''))
        ? (style?.fontFamily as SubtitleFontFamily)
        : DEFAULT_SUBTITLE_STYLE.fontFamily!;
    const requestedFontWeight = isValidSubtitleFontWeight(String(style?.fontWeight || ''))
        ? (style?.fontWeight as SubtitleFontWeight)
        : DEFAULT_SUBTITLE_STYLE.fontWeight!;
    const overlayVariant = isValidSubtitleOverlayVariant(String(style?.overlayVariant || ''))
        ? (style?.overlayVariant as SubtitleOverlayVariant)
        : DEFAULT_SUBTITLE_STYLE.overlayVariant!;
    const showOverlay = style?.showOverlay !== false;
    const fallbackTextColor = typeof style?.textColor === 'string' && style.textColor.trim().length > 0
        ? style.textColor
        : DEFAULT_SUBTITLE_STYLE.textColor!;
    const fallbackOverlayColor = typeof style?.overlayColor === 'string' && style.overlayColor.trim().length > 0
        ? style.overlayColor
        : DEFAULT_SUBTITLE_STYLE.overlayColor!;
    const textColor = resolveTextColorForOverlay(showOverlay, fallbackTextColor);

    const usesScriptMetrics = isScriptSubtitleFontFamily(fontFamily);
    const lineHeight = usesScriptMetrics
        ? Math.max(fontSize + 10, Math.round(fontSize * 1.5))
        : Math.max(fontSize + 7, Math.round(fontSize * 1.35));

    const resolvedFontFamily = resolveSubtitleFontFamily(fontFamily);
    const shouldApplyFontWeight = !resolvedFontFamily?.startsWith('Subtitle');

    return {
        fontSize,
        lineHeight,
        textAlign: resolveSubtitleTextAlign(domainTextAlign),
        showOverlay,
        fontFamily: resolvedFontFamily,
        textColor,
        overlayColor: fallbackOverlayColor,
        overlayVariant,
        fontWeight: shouldApplyFontWeight ? requestedFontWeight : undefined,
    };
}

export function normalizeSubtitleStyle(value: unknown): SubtitleStyle | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    const rawAlign = String(raw.textAlign || DEFAULT_SUBTITLE_STYLE.textAlign);
    const textAlign = isValidSubtitleTextAlign(rawAlign)
        ? rawAlign
        : DEFAULT_SUBTITLE_STYLE.textAlign;
    const rawFontFamily = String(raw.fontFamily || DEFAULT_SUBTITLE_STYLE.fontFamily);
    const fontFamily = isValidSubtitleFontFamily(rawFontFamily)
        ? rawFontFamily
        : DEFAULT_SUBTITLE_STYLE.fontFamily!;
    const rawOverlayVariant = String(raw.overlayVariant || DEFAULT_SUBTITLE_STYLE.overlayVariant);
    const overlayVariant = isValidSubtitleOverlayVariant(rawOverlayVariant)
        ? rawOverlayVariant
        : DEFAULT_SUBTITLE_STYLE.overlayVariant!;
    const rawFontWeight = String(raw.fontWeight || DEFAULT_SUBTITLE_STYLE.fontWeight);
    const fontWeight = isValidSubtitleFontWeight(rawFontWeight)
        ? rawFontWeight
        : DEFAULT_SUBTITLE_STYLE.fontWeight!;
    const rawTextCase = String(raw.textCase || DEFAULT_SUBTITLE_STYLE.textCase);
    const textCase = isValidSubtitleTextCase(rawTextCase)
        ? rawTextCase
        : DEFAULT_SUBTITLE_STYLE.textCase!;
    const showOverlay = raw.showOverlay !== false;
    const fallbackTextColor = typeof raw.textColor === 'string' && raw.textColor.trim().length > 0
        ? raw.textColor
        : DEFAULT_SUBTITLE_STYLE.textColor!;
    const overlayColor = typeof raw.overlayColor === 'string' && raw.overlayColor.trim().length > 0
        ? raw.overlayColor
        : DEFAULT_SUBTITLE_STYLE.overlayColor!;
    const textColor = resolveTextColorForOverlay(showOverlay, fallbackTextColor);

    return {
        fontSize: clamp(
            Number(raw.fontSize) || DEFAULT_SUBTITLE_STYLE.fontSize,
            SUBTITLE_FONT_MIN,
            SUBTITLE_FONT_MAX
        ),
        textAlign,
        showOverlay,
        fontFamily,
        textColor,
        overlayColor,
        overlayVariant,
        fontWeight,
        textCase,
    };
}

const LETTER_PATTERN = /[A-Za-zÇĞİÖŞÜçğıöşü]/;

function isLetterChar(value: string): boolean {
    return LETTER_PATTERN.test(value);
}

export function applySubtitleTextCase(text: string, textCase?: SubtitleTextCase): string {
    if (!text) return text;
    const nextCase = textCase || DEFAULT_SUBTITLE_STYLE.textCase!;

    if (nextCase === 'upper') {
        return text.toLocaleUpperCase('tr-TR');
    }
    if (nextCase === 'lower') {
        return text.toLocaleLowerCase('tr-TR');
    }
    if (nextCase === 'title') {
        const chars = Array.from(text.toLocaleLowerCase('tr-TR'));
        let newWord = true;
        let result = '';

        for (const ch of chars) {
            if (/\s/.test(ch)) {
                newWord = true;
                result += ch;
                continue;
            }

            if (newWord && isLetterChar(ch)) {
                result += ch.toLocaleUpperCase('tr-TR');
                newWord = false;
                continue;
            }

            result += ch;
            if (isLetterChar(ch)) {
                newWord = false;
            }
        }

        return result;
    }
    if (nextCase === 'sentence') {
        const chars = Array.from(text.toLocaleLowerCase('tr-TR'));
        let shouldCapitalize = true;
        let result = '';

        for (const ch of chars) {
            if (shouldCapitalize && isLetterChar(ch)) {
                result += ch.toLocaleUpperCase('tr-TR');
                shouldCapitalize = false;
                continue;
            }

            result += ch;

            if (ch === '.' || ch === '!' || ch === '?') {
                shouldCapitalize = true;
            }
        }

        return result;
    }

    return text;
}

export function normalizeSubtitlePresentation(value: unknown): SubtitlePresentation | null {
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    return {
        leftRatio: clamp01(Number(raw.leftRatio) || 0),
        topRatio: clamp01(Number(raw.topRatio) || 0),
        widthRatio: clamp(
            Number(raw.widthRatio) || SUBTITLE_WIDTH_RATIO_MIN,
            SUBTITLE_WIDTH_RATIO_MIN,
            1
        ),
        heightRatio: clamp(
            Number(raw.heightRatio) || SUBTITLE_WIDTH_RATIO_MIN,
            SUBTITLE_WIDTH_RATIO_MIN,
            1
        ),
    };
}

export function getSubtitlePresentationPercentStyle(
    presentation?: SubtitlePresentation | null
): ViewStyle | null {
    const safePresentation = normalizeSubtitlePresentation(presentation);
    if (!safePresentation) return null;
    return {
        left: `${safePresentation.leftRatio * 100}%`,
        top: `${safePresentation.topRatio * 100}%`,
        width: `${safePresentation.widthRatio * 100}%`,
        maxWidth: undefined,
        bottom: undefined,
    };
}

export function getSubtitlePresentationPixelStyle(
    presentation: SubtitlePresentation | null | undefined,
    containerWidth: number,
    containerHeight: number,
    options?: {
        measuredSubtitleHeight?: number;
        bottomPadding?: number;
    }
): ViewStyle | null {
    const safePresentation = normalizeSubtitlePresentation(presentation);
    if (!safePresentation) return null;
    if (!(containerWidth > 0) || !(containerHeight > 0)) return null;

    const measuredSubtitleHeight = Math.max(0, Number(options?.measuredSubtitleHeight) || 0);
    const bottomPadding = Math.max(0, Number(options?.bottomPadding) || 0);
    const rawTop = clamp(containerHeight * safePresentation.topRatio, 0, containerHeight);
    const maxTopByMeasuredHeight = Math.max(0, containerHeight - measuredSubtitleHeight - bottomPadding);
    const top = measuredSubtitleHeight > 0
        ? Math.min(rawTop, maxTopByMeasuredHeight)
        : rawTop;

    return {
        left: clamp(containerWidth * safePresentation.leftRatio, 0, containerWidth),
        top,
        width: clamp(containerWidth * safePresentation.widthRatio, 1, containerWidth),
        maxWidth: undefined,
        bottom: undefined,
    };
}

export function getSubtitleWrapperStyle(showOverlay: boolean, overlayColor?: string): ViewStyle {
    const baseWrapperStyle: ViewStyle = {
        borderRadius: SUBTITLE_BORDER_RADIUS,
        overflow: 'hidden',
    };
    const resolvedOverlayColor = typeof overlayColor === 'string' && overlayColor.trim().length > 0
        ? overlayColor
        : DEFAULT_SUBTITLE_STYLE.overlayColor || SUBTITLE_OVERLAY_BACKGROUND_LIGHT;
    if (showOverlay) {
        return {
            ...baseWrapperStyle,
            backgroundColor: resolvedOverlayColor
        };
    }
    return { ...baseWrapperStyle, backgroundColor: 'transparent' };
}

export function getNextSubtitleFontFamily(current?: SubtitleFontFamily): SubtitleFontFamily {
    const currentIndex = SUBTITLE_FONT_FAMILY_ORDER.indexOf(
        isValidSubtitleFontFamily(String(current || ''))
            ? current!
            : DEFAULT_SUBTITLE_STYLE.fontFamily!
    );
    const safeIndex = currentIndex >= 0 ? currentIndex : 0;
    return SUBTITLE_FONT_FAMILY_ORDER[(safeIndex + 1) % SUBTITLE_FONT_FAMILY_ORDER.length];
}

export function getNextSubtitleTextColor(current?: string): string {
    const currentNormalized = String(current || '').trim().toLowerCase();
    const currentIndex = SUBTITLE_TEXT_COLOR_PRESETS.findIndex(
        (preset) => preset.toLowerCase() === currentNormalized
    );
    if (currentIndex === -1) return SUBTITLE_TEXT_COLOR_PRESETS[0];
    return SUBTITLE_TEXT_COLOR_PRESETS[(currentIndex + 1) % SUBTITLE_TEXT_COLOR_PRESETS.length];
}

export function getNextSubtitleOverlayState(
    style?: SubtitleStyle | null
): Pick<SubtitleStyle, 'showOverlay' | 'overlayVariant' | 'textColor' | 'overlayColor'> {
    const isOverlayOpen = style?.showOverlay !== false;
    if (isOverlayOpen) {
        return { showOverlay: false, overlayVariant: 'noneBorder' };
    }
    const currentOverlayColor = typeof style?.overlayColor === 'string' ? style.overlayColor.trim() : '';
    if (!currentOverlayColor) {
        return {
            showOverlay: true,
            overlayVariant: 'light',
            overlayColor: '#FFFFFF',
        };
    }
    return {
        showOverlay: true,
        overlayVariant: 'light',
    };
}

export const SUBTITLE_TEXT_BASE_STYLE: TextStyle = {
    paddingHorizontal: SUBTITLE_PADDING_HORIZONTAL,
    paddingVertical: SUBTITLE_PADDING_VERTICAL,
};
