export type RichTextTag = 'b' | 'i' | 'u';

export interface RichTextSegment {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
}

export interface RichTextTruncateResult {
    text: string;
    isTruncated: boolean;
}

export interface RichTextCharStyle {
    bold: boolean;
    italic: boolean;
    underline: boolean;
}

interface TextSelectionRange {
    start: number;
    end: number;
}

interface RichTextApplyResult {
    text: string;
    selection: TextSelectionRange;
}

const RICH_TAG_REGEX = /<\/?[biu]>/gi;

const OPEN_TAG_BY_TYPE: Record<RichTextTag, string> = {
    b: '<b>',
    i: '<i>',
    u: '<u>',
};

const CLOSE_TAG_BY_TYPE: Record<RichTextTag, string> = {
    b: '</b>',
    i: '</i>',
    u: '</u>',
};

const clampRange = (selection: TextSelectionRange, valueLength: number): TextSelectionRange => {
    const safeStart = Math.max(0, Math.min(selection.start, valueLength));
    const safeEnd = Math.max(0, Math.min(selection.end, valueLength));
    if (safeStart <= safeEnd) return { start: safeStart, end: safeEnd };
    return { start: safeEnd, end: safeStart };
};

export const applyRichTextTagToSelection = (
    inputText: string,
    rawSelection: TextSelectionRange,
    tag: RichTextTag
): RichTextApplyResult => {
    const value = inputText ?? '';
    const selection = clampRange(rawSelection, value.length);
    const openTag = OPEN_TAG_BY_TYPE[tag];
    const closeTag = CLOSE_TAG_BY_TYPE[tag];

    if (selection.start === selection.end) {
        const nextText = `${value.slice(0, selection.start)}${openTag}${closeTag}${value.slice(selection.end)}`;
        const cursor = selection.start + openTag.length;
        return {
            text: nextText,
            selection: { start: cursor, end: cursor },
        };
    }

    const wrappedBefore = value.slice(Math.max(0, selection.start - openTag.length), selection.start) === openTag;
    const wrappedAfter = value.slice(selection.end, selection.end + closeTag.length) === closeTag;
    const isAlreadyWrapped = wrappedBefore && wrappedAfter;

    if (isAlreadyWrapped) {
        const wrappedStart = selection.start - openTag.length;
        const wrappedEnd = selection.end + closeTag.length;
        const nextText = `${value.slice(0, wrappedStart)}${value.slice(selection.start, selection.end)}${value.slice(wrappedEnd)}`;
        return {
            text: nextText,
            selection: {
                start: wrappedStart,
                end: selection.end - openTag.length,
            },
        };
    }

    const nextText = `${value.slice(0, selection.start)}${openTag}${value.slice(selection.start, selection.end)}${closeTag}${value.slice(selection.end)}`;
    return {
        text: nextText,
        selection: {
            start: selection.start + openTag.length,
            end: selection.end + openTag.length,
        },
    };
};

const createCharStyle = (overrides?: Partial<RichTextCharStyle>): RichTextCharStyle => ({
    bold: overrides?.bold === true,
    italic: overrides?.italic === true,
    underline: overrides?.underline === true,
});

const STYLE_KEY_BY_TAG: Record<RichTextTag, keyof RichTextCharStyle> = {
    b: 'bold',
    i: 'italic',
    u: 'underline',
};

const STYLE_TAG_BY_KEY: Record<keyof RichTextCharStyle, RichTextTag> = {
    bold: 'b',
    italic: 'i',
    underline: 'u',
};

const hasActiveStyle = (style: RichTextCharStyle): boolean =>
    style.bold || style.italic || style.underline;

const styleEquals = (a: RichTextCharStyle, b: RichTextCharStyle): boolean =>
    a.bold === b.bold && a.italic === b.italic && a.underline === b.underline;

const clampIndex = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const buildStyleAwareTextChunk = (chunk: string, style: RichTextCharStyle): string => {
    if (!chunk) return '';

    let wrapped = chunk;
    (['bold', 'italic', 'underline'] as Array<keyof RichTextCharStyle>).forEach((key) => {
        if (!style[key]) return;
        const tag = STYLE_TAG_BY_KEY[key];
        wrapped = `<${tag}>${wrapped}</${tag}>`;
    });
    return wrapped;
};

const normalizeStylesLength = (textLength: number, styles: RichTextCharStyle[]): RichTextCharStyle[] => {
    if (styles.length === textLength) return styles.map((style) => createCharStyle(style));
    const next: RichTextCharStyle[] = Array.from({ length: textLength }, (_, index) => (
        createCharStyle(styles[index])
    ));
    return next;
};

const findSharedPrefixLength = (left: string, right: string): number => {
    const max = Math.min(left.length, right.length);
    let index = 0;
    while (index < max && left[index] === right[index]) {
        index += 1;
    }
    return index;
};

const findSharedSuffixLength = (left: string, right: string, prefixLength: number): number => {
    const leftLimit = left.length - prefixLength;
    const rightLimit = right.length - prefixLength;
    const max = Math.min(leftLimit, rightLimit);
    let count = 0;
    while (count < max) {
        const leftChar = left[left.length - 1 - count];
        const rightChar = right[right.length - 1 - count];
        if (leftChar !== rightChar) break;
        count += 1;
    }
    return count;
};

const getStyleFromNormalized = (styles: RichTextCharStyle[], index: number): RichTextCharStyle =>
    createCharStyle(styles[index]);

export const createRichTextCharStyle = (overrides?: Partial<RichTextCharStyle>): RichTextCharStyle =>
    createCharStyle(overrides);

export const getRichTextStyleAtCursor = (styles: RichTextCharStyle[], cursorIndex: number): RichTextCharStyle => {
    if (styles.length === 0) return createCharStyle();
    const clamped = clampIndex(cursorIndex, 0, styles.length);
    if (clamped > 0) return createCharStyle(styles[clamped - 1]);
    return createCharStyle(styles[0]);
};

export const toggleRichTextTagInRange = (
    styles: RichTextCharStyle[],
    selection: TextSelectionRange,
    tag: RichTextTag
): RichTextCharStyle[] => {
    const normalized = normalizeStylesLength(styles.length, styles);
    if (normalized.length === 0) return normalized;

    const safeStart = clampIndex(selection.start, 0, normalized.length);
    const safeEnd = clampIndex(selection.end, 0, normalized.length);
    const start = Math.min(safeStart, safeEnd);
    const end = Math.max(safeStart, safeEnd);
    if (start === end) return normalized;

    const key = STYLE_KEY_BY_TAG[tag];
    let allEnabled = true;
    for (let index = start; index < end; index += 1) {
        if (!normalized[index]?.[key]) {
            allEnabled = false;
            break;
        }
    }

    const nextValue = !allEnabled;
    const next = normalized.map((style) => createCharStyle(style));
    for (let index = start; index < end; index += 1) {
        next[index][key] = nextValue;
    }
    return next;
};

export const toggleRichTextTagInStyle = (style: RichTextCharStyle, tag: RichTextTag): RichTextCharStyle => {
    const key = STYLE_KEY_BY_TAG[tag];
    return {
        ...createCharStyle(style),
        [key]: !style[key],
    };
};

export const reconcileRichTextStylesAfterTextChange = (
    previousText: string,
    nextText: string,
    previousStyles: RichTextCharStyle[],
    pendingStyle: RichTextCharStyle
): RichTextCharStyle[] => {
    const previousNormalized = normalizeStylesLength(previousText.length, previousStyles);
    if (nextText.length === 0) return [];
    if (previousText === nextText) return normalizeStylesLength(nextText.length, previousNormalized);

    const prefixLength = findSharedPrefixLength(previousText, nextText);
    const suffixLength = findSharedSuffixLength(previousText, nextText, prefixLength);

    const removedCount = Math.max(0, previousText.length - prefixLength - suffixLength);
    const insertedCount = Math.max(0, nextText.length - prefixLength - suffixLength);
    const removalStart = prefixLength;
    const afterRemovalStyles = [
        ...previousNormalized.slice(0, removalStart),
        ...previousNormalized.slice(removalStart + removedCount),
    ];

    if (insertedCount === 0) {
        return normalizeStylesLength(nextText.length, afterRemovalStyles);
    }

    const insertionStyle = createCharStyle(pendingStyle);

    const insertedStyles = Array.from({ length: insertedCount }, () => createCharStyle(insertionStyle));
    const nextStyles = [
        ...afterRemovalStyles.slice(0, removalStart),
        ...insertedStyles,
        ...afterRemovalStyles.slice(removalStart),
    ];

    return normalizeStylesLength(nextText.length, nextStyles);
};

export const serializeRichTextFromCharStyles = (
    inputText: string,
    inputStyles: RichTextCharStyle[]
): string => {
    if (!inputText) return '';
    const safeStyles = normalizeStylesLength(inputText.length, inputStyles);

    let result = '';
    let activeStyle = createCharStyle();
    let chunk = '';
    let chunkStyle = createCharStyle();

    const flushChunk = () => {
        if (!chunk) return;
        result += buildStyleAwareTextChunk(chunk, chunkStyle);
        chunk = '';
    };

    for (let index = 0; index < inputText.length; index += 1) {
        const charStyle = getStyleFromNormalized(safeStyles, index);
        if (index === 0) {
            chunkStyle = charStyle;
            activeStyle = charStyle;
            chunk = inputText[index];
            continue;
        }

        if (!styleEquals(activeStyle, charStyle)) {
            flushChunk();
            chunkStyle = charStyle;
            activeStyle = charStyle;
            chunk = inputText[index];
            continue;
        }

        chunk += inputText[index];
    }

    flushChunk();
    return result;
};

export const stripRichTextTags = (inputText: string | null | undefined): string => {
    if (!inputText) return '';
    return inputText.replace(/<\/?[biu]>/gi, '');
};

export const parseRichTextSegments = (inputText: string | null | undefined): RichTextSegment[] => {
    if (!inputText) return [];

    RICH_TAG_REGEX.lastIndex = 0;
    const segments: RichTextSegment[] = [];
    let cursor = 0;
    let boldDepth = 0;
    let italicDepth = 0;
    let underlineDepth = 0;
    let match: RegExpExecArray | null;

    const pushSegment = (chunk: string) => {
        if (!chunk) return;

        const last = segments[segments.length - 1];
        const nextBold = boldDepth > 0;
        const nextItalic = italicDepth > 0;
        const nextUnderline = underlineDepth > 0;

        if (
            last &&
            last.bold === nextBold &&
            last.italic === nextItalic &&
            last.underline === nextUnderline
        ) {
            last.text += chunk;
            return;
        }

        segments.push({
            text: chunk,
            bold: nextBold,
            italic: nextItalic,
            underline: nextUnderline,
        });
    };

    while ((match = RICH_TAG_REGEX.exec(inputText)) !== null) {
        const tokenStart = match.index;
        const tokenEnd = RICH_TAG_REGEX.lastIndex;
        if (tokenStart > cursor) {
            pushSegment(inputText.slice(cursor, tokenStart));
        }

        const token = match[0].toLowerCase();
        if (token === '<b>') boldDepth += 1;
        else if (token === '</b>') boldDepth = Math.max(0, boldDepth - 1);
        else if (token === '<i>') italicDepth += 1;
        else if (token === '</i>') italicDepth = Math.max(0, italicDepth - 1);
        else if (token === '<u>') underlineDepth += 1;
        else if (token === '</u>') underlineDepth = Math.max(0, underlineDepth - 1);

        cursor = tokenEnd;
    }

    if (cursor < inputText.length) {
        pushSegment(inputText.slice(cursor));
    }

    return segments;
};

const buildStyledTextChunk = (segment: RichTextSegment): string => {
    let prefix = '';
    let suffix = '';

    if (segment.bold) {
        prefix += '<b>';
        suffix = `</b>${suffix}`;
    }
    if (segment.italic) {
        prefix += '<i>';
        suffix = `</i>${suffix}`;
    }
    if (segment.underline) {
        prefix += '<u>';
        suffix = `</u>${suffix}`;
    }

    return `${prefix}${segment.text}${suffix}`;
};

export const getRichTextVisibleLength = (inputText: string | null | undefined): number =>
    stripRichTextTags(inputText).length;

export const truncateRichTextByVisibleLength = (
    inputText: string | null | undefined,
    maxVisibleChars: number
): RichTextTruncateResult => {
    const value = inputText ?? '';
    const safeLimit = Number.isFinite(maxVisibleChars) ? Math.max(0, Math.floor(maxVisibleChars)) : 0;

    if (safeLimit === 0) {
        const hasVisibleText = getRichTextVisibleLength(value) > 0;
        return {
            text: '',
            isTruncated: hasVisibleText,
        };
    }

    const segments = parseRichTextSegments(value);
    let consumed = 0;
    let output = '';
    let isTruncated = false;

    for (const segment of segments) {
        if (consumed >= safeLimit) {
            if (segment.text.length > 0) isTruncated = true;
            continue;
        }

        const remaining = safeLimit - consumed;
        if (segment.text.length <= remaining) {
            output += buildStyledTextChunk(segment);
            consumed += segment.text.length;
            continue;
        }

        const slicedText = segment.text.slice(0, remaining);
        output += buildStyledTextChunk({
            ...segment,
            text: slicedText,
        });
        consumed += slicedText.length;
        isTruncated = true;
    }

    return {
        text: output,
        isTruncated,
    };
};
