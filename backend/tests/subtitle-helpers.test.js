const test = require('node:test');
const assert = require('node:assert/strict');

const {
    normalizeSubtitlePresentationInput,
    normalizeSubtitleStyleInput,
    normalizeSubtitleMutationInput,
} = require('../services/SubtitleMutationService');
const { parseStoredSubtitlePayload } = require('../utils/subtitleParser');

test('normalizeSubtitlePresentationInput returns numeric ratios', () => {
    const result = normalizeSubtitlePresentationInput({
        leftRatio: '0.12',
        topRatio: 0.34,
        widthRatio: '0.56',
        heightRatio: null,
    });

    assert.deepEqual(result, {
        leftRatio: 0.12,
        topRatio: 0.34,
        widthRatio: 0.56,
        heightRatio: 0,
    });
});

test('normalizeSubtitleStyleInput applies defaults and clamps values', () => {
    const result = normalizeSubtitleStyleInput({
        fontSize: 999,
        textAlign: 'invalid',
        showOverlay: false,
        fontFamily: 'invalid',
        textColor: '  #ABCDEF  ',
        overlayVariant: 'darkbg',
        fontWeight: '999',
        textCase: 'invalid',
    });

    assert.equal(result.fontSize, 42);
    assert.equal(result.textAlign, 'center');
    assert.equal(result.showOverlay, false);
    assert.equal(result.fontFamily, 'system');
    assert.equal(result.textColor, '#ABCDEF');
    assert.equal(result.overlayVariant, 'dark');
    assert.equal(result.fontWeight, '700');
    assert.equal(result.textCase, 'original');
});

test('normalizeSubtitleMutationInput normalizes valid update payloads', () => {
    const result = normalizeSubtitleMutationInput({
        operation: 'update',
        subtitleId: ' sub-1 ',
        language: ' tr ',
        segments: [
            { startMs: '0', endMs: '1250', text: ' Merhaba ' },
            { startMs: 5, endMs: 5, text: 'ignored' },
            { startMs: 1500, endMs: 2800, text: 'Dunya' },
        ],
        presentation: {
            leftRatio: '0.1',
            topRatio: '0.2',
            widthRatio: '0.8',
            heightRatio: '0.3',
        },
        style: {
            fontSize: 28,
            textAlign: 'left',
            fontFamily: 'inter',
            fontWeight: '600',
            textCase: 'upper',
        },
    });

    assert.equal(result.operation, 'update');
    assert.equal(result.subtitleId, 'sub-1');
    assert.equal(result.language, 'tr');
    assert.equal(result.segments.length, 2);
    assert.deepEqual(result.segments[0], {
        startMs: 0,
        endMs: 1250,
        text: 'Merhaba',
    });
    assert.equal(result.presentation.leftRatio, 0.1);
    assert.equal(result.style.textAlign, 'left');
    assert.equal(result.style.fontFamily, 'inter');
});

test('normalizeSubtitleMutationInput throws on invalid update payloads', () => {
    assert.throws(
        () => normalizeSubtitleMutationInput({
            operation: 'update',
            segments: [{ startMs: 10, endMs: 10, text: '' }],
        }),
        (error) => error?.statusCode === 400 && error.message === 'No valid segments provided'
    );
});

test('parseStoredSubtitlePayload reads json envelope strings', () => {
    const result = parseStoredSubtitlePayload(JSON.stringify({
        segments: [{ startMs: 0, endMs: 1000, text: 'hello' }],
        presentation: { leftRatio: 0.1 },
        style: { fontSize: 24 },
        source: 'manual_upload',
    }));

    assert.equal(result.isEnvelope, true);
    assert.equal(result.segments.length, 1);
    assert.deepEqual(result.presentation, { leftRatio: 0.1 });
    assert.deepEqual(result.style, { fontSize: 24 });
    assert.equal(result.source, 'manual_upload');
});
