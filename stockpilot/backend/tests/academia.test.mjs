import assert from "node:assert/strict";
import test from "node:test";
import {
    buildWebVttFromCues,
    formatVttTimestamp,
    normalizeTranscriptResult,
    resolveAcademiaMediaKind,
} from "../dist/backend/src/services/academiaTranscription.js";
import {
    buildTranslatedTranscriptResult,
    canTranslateAcademiaTranscript,
} from "../dist/backend/src/services/academiaTranslation.js";

test("formatVttTimestamp returns WebVTT-compatible timestamps", () => {
    assert.equal(formatVttTimestamp(0), "00:00:00.000");
    assert.equal(formatVttTimestamp(65.432), "00:01:05.432");
    assert.equal(formatVttTimestamp(3661.009), "01:01:01.009");
});

test("resolveAcademiaMediaKind falls back to file extensions", () => {
    assert.equal(resolveAcademiaMediaKind("application/octet-stream", "lesson.mov"), "video");
    assert.equal(resolveAcademiaMediaKind("application/octet-stream", "lesson.m4a"), "audio");
    assert.equal(resolveAcademiaMediaKind("application/octet-stream", "lesson.txt"), null);
});

test("normalizeTranscriptResult returns segment cues and a WebVTT payload", () => {
    const result = normalizeTranscriptResult({
        sourceName: "lesson.mp4",
        mediaKind: "video",
        payload: {
            text: "Welcome to stock planning. Let's review transfers.",
            language: "en",
            duration: 7.4,
            segments: [
                {
                    start: 0.25,
                    end: 3.4,
                    text: " Welcome to stock planning. ",
                    words: [
                        { start: 0.25, end: 0.9, text: " Welcome" },
                        { start: 0.9, end: 1.1, text: " to" },
                        { start: 1.1, end: 2.0, text: " stock" },
                        { start: 2.0, end: 3.4, text: " planning." },
                    ],
                },
                {
                    start: 3.5,
                    end: 7.4,
                    text: "Let's review transfers.",
                    words: [
                        { start: 3.5, end: 4.4, text: "Let's" },
                        { start: 4.4, end: 5.4, text: " review" },
                        { start: 5.4, end: 7.4, text: " transfers." },
                    ],
                },
            ],
        },
    });

    assert.equal(result.sourceName, "lesson.mp4");
    assert.equal(result.mediaKind, "video");
    assert.equal(result.language, "en");
    assert.equal(result.cues.length, 2);
    assert.equal(result.cues[0].words.length, 4);
    assert.equal(result.cues[1].words[1].text, " review");
    assert.match(result.vtt, /WEBVTT/);
    assert.match(result.vtt, /00:00:00\.250 --> 00:00:03\.400/);
    assert.match(result.vtt, /Let's review transfers\./);
});

test("buildWebVttFromCues keeps cue text on separate lines", () => {
    const vtt = buildWebVttFromCues([
        {
            startSeconds: 12.5,
            endSeconds: 16,
            text: "First line\nSecond line",
            words: [
                { startSeconds: 12.5, endSeconds: 13.8, text: "First line" },
                { startSeconds: 13.8, endSeconds: 16, text: "\nSecond line" },
            ],
        },
    ]);

    assert.equal(vtt, [
        "WEBVTT",
        "",
        "00:00:12.500 --> 00:00:16.000",
        "First line",
        "Second line",
        "",
    ].join("\n"));
});

test("normalizeTranscriptResult creates a fallback cue when only transcript text exists", () => {
    const result = normalizeTranscriptResult({
        sourceName: "lesson.mp3",
        mediaKind: "audio",
        payload: {
            text: "Single block transcript",
            language: "tr",
            duration: 2.2,
        },
    });

    assert.equal(result.cues.length, 1);
    assert.equal(result.cues[0].startSeconds, 0);
    assert.equal(result.cues[0].endSeconds, 4);
    assert.equal(result.cues[0].words.length, 1);
    assert.match(result.vtt, /Single block transcript/);
});

test("canTranslateAcademiaTranscript only enables supported en-to-tr flow", () => {
    const transcript = normalizeTranscriptResult({
        sourceName: "lesson.mp4",
        mediaKind: "video",
        payload: {
            text: "Welcome to stock planning.",
            language: "en",
            duration: 3,
            segments: [{ start: 0, end: 3, text: "Welcome to stock planning.", words: [] }],
        },
    });

    assert.equal(canTranslateAcademiaTranscript(transcript, "tr"), true);
    assert.equal(canTranslateAcademiaTranscript(transcript, "fr"), false);
});

test("buildTranslatedTranscriptResult preserves timings and disables translated word highlighting", () => {
    const transcript = normalizeTranscriptResult({
        sourceName: "lesson.mp4",
        mediaKind: "video",
        payload: {
            text: "Welcome to stock planning. Let's review transfers.",
            language: "en",
            duration: 7.4,
            segments: [
                {
                    start: 0.25,
                    end: 3.4,
                    text: "Welcome to stock planning.",
                    words: [],
                },
                {
                    start: 3.5,
                    end: 7.4,
                    text: "Let's review transfers.",
                    words: [],
                },
            ],
        },
    });

    const translated = buildTranslatedTranscriptResult({
        transcript,
        targetLanguage: "tr",
        translatedCueTexts: [
            "Stok planlamasına hoş geldiniz.",
            "Transferleri gözden geçirelim.",
        ],
        model: "Helsinki-NLP/opus-tatoeba-en-tr",
    });

    assert.equal(translated.language, "tr");
    assert.equal(translated.cues[0].startSeconds, 0.25);
    assert.equal(translated.cues[1].endSeconds, 7.4);
    assert.equal(translated.cues[0].words.length, 0);
    assert.match(translated.vtt, /Stok planlamasına hoş geldiniz\./);
});
