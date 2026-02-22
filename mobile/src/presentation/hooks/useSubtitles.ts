import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../../core/config';
import { SubtitleData, SubtitlePresentation, SubtitleSegment, SubtitleStyle } from '../../domain/entities/Subtitle';

const SUBTITLE_POLL_INTERVAL_MS = 2500;
const SUBTITLE_POLL_TIMEOUT_MS = 90_000;

export function useSubtitles(videoId: string | undefined) {
    const [subtitles, setSubtitles] = useState<SubtitleData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!videoId) {
            setSubtitles(null);
            setIsLoading(false);
            setError(null);
            return;
        }

        let isMounted = true;
        let pollTimer: ReturnType<typeof setTimeout> | null = null;
        let firstRequestDone = false;
        const startedAt = Date.now();

        const parseSubtitlePayload = (
            value: any
        ): { segments: SubtitleSegment[]; presentation: SubtitlePresentation | null; style: SubtitleStyle | null } => {
            if (Array.isArray(value)) return { segments: value, presentation: null, style: null };
            if (value && typeof value === 'object') {
                const rawSegments = Array.isArray(value.segments) ? value.segments : [];
                const rawPresentation = value.presentation && typeof value.presentation === 'object' ? value.presentation : null;
                const presentation = rawPresentation
                    ? {
                        leftRatio: Number(rawPresentation.leftRatio) || 0,
                        topRatio: Number(rawPresentation.topRatio) || 0,
                        widthRatio: Number(rawPresentation.widthRatio) || 0,
                        heightRatio: Number(rawPresentation.heightRatio) || 0,
                    }
                    : null;
                const rawStyle = value.style && typeof value.style === 'object' ? value.style : null;
                const style = rawStyle
                    ? {
                        fontSize: Math.max(12, Math.min(42, Number(rawStyle.fontSize) || 18)),
                        textAlign: ['start', 'center', 'end', 'left', 'right'].includes(String(rawStyle.textAlign))
                            ? String(rawStyle.textAlign) as any
                            : 'center',
                        showOverlay: rawStyle.showOverlay !== false,
                    }
                    : null;
                return { segments: rawSegments, presentation, style };
            }
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    return parseSubtitlePayload(parsed);
                } catch {
                    return { segments: [], presentation: null, style: null };
                }
            }
            return { segments: [], presentation: null, style: null };
        };

        const scheduleNextPoll = () => {
            if (!isMounted) return;
            pollTimer = setTimeout(() => {
                void fetchSubtitles();
            }, SUBTITLE_POLL_INTERVAL_MS);
        };

        const fetchSubtitles = async () => {
            if (!firstRequestDone) {
                setIsLoading(true);
            }
            setError(null);
            try {
                const response = await fetch(`${CONFIG.API_URL}/videos/${videoId}/subtitles`);
                if (!response.ok) {
                    throw new Error(`Subtitle request failed (${response.status})`);
                }

                const result = await response.json();
                const rows = Array.isArray(result?.data) ? result.data : [];

                if (isMounted) {
                    if (result.success && rows.length > 0) {
                        // Priority: 1) auto completed, 2) first completed, 3) auto any status, 4) first row
                        const completedSubs = rows.filter((s: any) => s?.status === 'completed');
                        const sub = completedSubs.find((s: any) => s.language === 'auto') ||
                            completedSubs[0] ||
                            rows.find((s: any) => s?.language === 'auto') ||
                            rows[0];

                        const normalized = sub
                            ? (() => {
                                const parsedPayload = parseSubtitlePayload(sub.segments);
                                return {
                                    ...sub,
                                    segments: parsedPayload.segments,
                                    presentation: parsedPayload.presentation,
                                    style: parsedPayload.style,
                                } as SubtitleData;
                            })()
                            : null;

                        const isCompletedWithSegments = Boolean(
                            normalized &&
                            normalized.status === 'completed' &&
                            Array.isArray(normalized.segments) &&
                            normalized.segments.length > 0
                        );

                        if (isCompletedWithSegments) {
                            setSubtitles(normalized);
                        } else {
                            setSubtitles(null);
                        }

                        const hasPendingWork = rows.some((row: any) => {
                            const status = String(row?.status || '').toLowerCase();
                            return status === 'processing' || status === 'queued' || status === 'pending';
                        });
                        const withinPollWindow = (Date.now() - startedAt) < SUBTITLE_POLL_TIMEOUT_MS;

                        if (!isCompletedWithSegments && hasPendingWork && withinPollWindow) {
                            scheduleNextPoll();
                        }
                    } else {
                        setSubtitles(null);
                    }
                }
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Subtitles could not be loaded');
                    console.warn('[SUBTITLE_HOOK] Fetch error:', err);
                }
            } finally {
                firstRequestDone = true;
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        void fetchSubtitles();
        return () => {
            isMounted = false;
            if (pollTimer) clearTimeout(pollTimer);
        };
    }, [videoId]);

    const getActiveSubtitle = useCallback((currentTimeMs: number): string | null => {
        if (!subtitles || !subtitles.segments) return null;

        const activeSegment = subtitles.segments.find(
            (s: SubtitleSegment) => currentTimeMs >= s.startMs && currentTimeMs <= s.endMs
        );

        return activeSegment ? activeSegment.text : null;
    }, [subtitles]);

    return {
        subtitles,
        isLoading,
        error,
        getActiveSubtitle
    };
}
