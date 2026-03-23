export const DEFAULT_YOUTUBE_URL = "";
export const TRANSCRIPT_CACHE_PREFIX = "stockpilot:academia:transcript:v2:";
export const TRANSCRIPT_TRANSLATION_CACHE_PREFIX = "stockpilot:academia:transcript-translation:v1:";
export const NOTES_CACHE_PREFIX = "stockpilot:academia:notes:v2:";
export const SUMMARY_CACHE_PREFIX = "stockpilot:academia:summary:v1:";
export const VIDEO_NOTE_CAPTURE_MAX_WIDTH = 960;
export const VIDEO_NOTE_CAPTURE_QUALITY = 0.82;
export const TRANSCRIPT_SCROLL_LEAD_LINES = 5;
export const FULLSCREEN_CONTROLLER_IDLE_MS = 3000;
export const TURKEY_TIME_ZONE = "Europe/Istanbul";
export const TURKEY_WEEKDAY_INDEX: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
};
export const MEDIA_ACCEPT = [
    ".mp4",
    ".mov",
    ".webm",
    ".mkv",
    ".mp3",
    ".m4a",
    ".wav",
    ".ogg",
    ".aac",
    "video/mp4",
    "video/quicktime",
    "video/webm",
    "video/x-matroska",
    "audio/mpeg",
    "audio/mp3",
    "audio/m4a",
    "audio/mp4",
    "audio/x-m4a",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/aac",
].join(",");
