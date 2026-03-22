const {
    SUBTITLE_MIN_FONT_SIZE,
    SUBTITLE_MAX_FONT_SIZE,
    SUBTITLE_DEFAULT_FONT_SIZE,
} = require('../config/constants');
const { createHttpError } = require('../utils/httpError');

const SUBTITLE_ALLOWED_ALIGNMENTS = new Set(['start', 'center', 'end', 'left', 'right']);
const SUBTITLE_ALLOWED_FONT_FAMILIES = new Set([
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
]);
const SUBTITLE_OVERLAY_VARIANT_BY_LOWER = new Map([
    ['noneborder', 'noneBorder'],
    ['nobgborder', 'noneBorder'],
    ['transparent', 'transparent'],
    ['transparentbg', 'transparent'],
    ['dark', 'dark'],
    ['darkbg', 'dark'],
    ['light', 'light'],
    ['whitebg', 'light'],
    ['lightborder', 'lightBorder'],
    ['whitebgborder', 'lightBorder'],
    ['darkborder', 'darkBorder'],
    ['darkbgborder', 'darkBorder'],
]);
const SUBTITLE_ALLOWED_FONT_WEIGHTS = new Set(['400', '500', '600', '700']);
const SUBTITLE_ALLOWED_TEXT_CASES = new Set(['original', 'upper', 'lower', 'title', 'sentence']);

function normalizeSubtitlePresentationInput(rawPresentation) {
    if (!rawPresentation || typeof rawPresentation !== 'object') {
        return null;
    }

    return {
        leftRatio: Number(rawPresentation.leftRatio) || 0,
        topRatio: Number(rawPresentation.topRatio) || 0,
        widthRatio: Number(rawPresentation.widthRatio) || 0,
        heightRatio: Number(rawPresentation.heightRatio) || 0,
    };
}

function normalizeSubtitleStyleInput(rawStyle) {
    if (!rawStyle || typeof rawStyle !== 'object') {
        return null;
    }

    return {
        fontSize: Math.max(
            SUBTITLE_MIN_FONT_SIZE,
            Math.min(SUBTITLE_MAX_FONT_SIZE, Number(rawStyle.fontSize) || SUBTITLE_DEFAULT_FONT_SIZE)
        ),
        textAlign: SUBTITLE_ALLOWED_ALIGNMENTS.has(String(rawStyle.textAlign))
            ? String(rawStyle.textAlign)
            : 'center',
        showOverlay: rawStyle.showOverlay !== false,
        fontFamily: SUBTITLE_ALLOWED_FONT_FAMILIES.has(String(rawStyle.fontFamily))
            ? String(rawStyle.fontFamily)
            : 'system',
        textColor: typeof rawStyle.textColor === 'string' && rawStyle.textColor.trim().length > 0
            ? rawStyle.textColor.trim()
            : '#FFFFFF',
        overlayColor: typeof rawStyle.overlayColor === 'string' && rawStyle.overlayColor.trim().length > 0
            ? rawStyle.overlayColor.trim()
            : '#FFFFFF',
        overlayVariant:
            SUBTITLE_OVERLAY_VARIANT_BY_LOWER.get(String(rawStyle.overlayVariant || '').trim().toLowerCase())
            || 'noneBorder',
        fontWeight: SUBTITLE_ALLOWED_FONT_WEIGHTS.has(String(rawStyle.fontWeight))
            ? String(rawStyle.fontWeight)
            : '700',
        textCase: SUBTITLE_ALLOWED_TEXT_CASES.has(String(rawStyle.textCase))
            ? String(rawStyle.textCase)
            : 'original',
    };
}

function normalizeSubtitleMutationInput(input = {}) {
    const operation = input.operation === 'delete'
        ? 'delete'
        : input.operation === 'update'
            ? 'update'
            : null;

    if (!operation) {
        if (input.operation !== undefined && input.operation !== null) {
            throw createHttpError(400, 'Unsupported subtitle operation');
        }
        return null;
    }

    const subtitleId = typeof input.subtitleId === 'string' && input.subtitleId.trim()
        ? input.subtitleId.trim()
        : null;
    const rawLanguage = typeof input.language === 'string' && input.language.trim()
        ? input.language.trim()
        : '';
    const language = rawLanguage && rawLanguage !== 'none'
        ? rawLanguage
        : 'auto';

    if (operation === 'delete') {
        return {
            operation,
            subtitleId,
            language: subtitleId ? null : (rawLanguage && rawLanguage !== 'none' ? rawLanguage : null),
        };
    }

    if (!Array.isArray(input.segments)) {
        throw createHttpError(400, 'segments must be an array');
    }

    const normalizedSegments = input.segments
        .map((segment) => ({
            startMs: Number(segment?.startMs) || 0,
            endMs: Number(segment?.endMs) || 0,
            text: String(segment?.text || '').trim(),
        }))
        .filter((segment) => segment.endMs > segment.startMs && segment.text.length > 0);

    if (normalizedSegments.length === 0) {
        throw createHttpError(400, 'No valid segments provided');
    }

    return {
        operation,
        subtitleId,
        language,
        segments: normalizedSegments,
        presentation: normalizeSubtitlePresentationInput(input.presentation),
        style: normalizeSubtitleStyleInput(input.style),
    };
}

module.exports = {
    normalizeSubtitlePresentationInput,
    normalizeSubtitleStyleInput,
    normalizeSubtitleMutationInput,
};
