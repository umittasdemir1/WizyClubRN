import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, type GestureResponderEvent } from 'react-native';
import { Image } from 'expo-image';
import { Volume2, VolumeX, MoreVertical } from 'lucide-react-native';
import VideoPlayer, { type OnLoadData, type OnLoadStartData, type OnProgressData, type OnVideoErrorData } from 'react-native-video';
import type { NetInfoStateType } from '@react-native-community/netinfo';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { InfiniteFeedActions } from './InfiniteFeedActions';
import { InfiniteCarouselLayer } from './InfiniteCarouselLayer';
import { VerifiedBadge } from '../shared/VerifiedBadge';
import { ThemeColors } from './InfiniteFeedTypes';
import { FEED_FLAGS } from './hooks/useInfiniteFeedConfig';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { shadowStyle } from '@/core/utils/shadow';
import { PerformanceLogger } from '../../../core/services/PerformanceLogger';
import VideosIcon from '../../../../assets/icons/videos.svg';

const DESCRIPTION_LIMIT = 70;
const CARD_HORIZONTAL_PADDING = 16;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const CAROUSEL_ASPECT_RATIO = 3 / 4;
const FIRST_FRAME_FALLBACK_MS = 32;
const SHORT_VIDEO_SECONDS_THRESHOLD = 15;
const SHORT_VIDEO_MAX_PLAYS = 2;
const LONG_VIDEO_MAX_PLAYS = 1;
const END_GUARD_TOLERANCE_SEC = 1;
const END_GUARD_MIN_DURATION_SEC = 3;
const END_GUARD_MIN_PROGRESS_SEC = 1;
const INACTIVE_RESUME_WINDOW_MS = 3000;
const DEFAULT_VIDEO_ASPECT_RATIO = 9 / 16;
const MIN_VALID_ASPECT_RATIO = 0.2;
const MAX_VALID_ASPECT_RATIO = 5;

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const isLocalFilePath = (value: string): boolean => value.startsWith('file://');

const getStableImageCacheKey = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.split('#')[0].split('?')[0];
};

const isValidAspectRatio = (value: number | null | undefined): value is number =>
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= MIN_VALID_ASPECT_RATIO &&
    value <= MAX_VALID_ASPECT_RATIO;

const getAspectRatioFromDimensions = (width: unknown, height: unknown): number | null => {
    const numericWidth = Number(width);
    const numericHeight = Number(height);
    if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight)) return null;
    if (numericWidth <= 0 || numericHeight <= 0) return null;
    const ratio = numericWidth / numericHeight;
    return isValidAspectRatio(ratio) ? ratio : null;
};

const formatPlaybackClock = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const mixWithWhite = (hex: string, amount: number) => {
    if (!hex.startsWith('#')) return hex;
    let normalized = hex.replace('#', '').trim();
    if (normalized.length === 3) {
        normalized = normalized.split('').map((c) => c + c).join('');
    }
    if (normalized.length !== 6) return hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
};

const formatRelativeTime = (value?: string) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const diffSeconds = Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
    if (diffSeconds < MINUTE) return 'Az önce';
    if (diffSeconds < HOUR) return `${Math.floor(diffSeconds / MINUTE)} dakika önce`;
    if (diffSeconds < DAY) return `${Math.floor(diffSeconds / HOUR)} saat önce`;
    if (diffSeconds < WEEK) return `${Math.floor(diffSeconds / DAY)} gün önce`;
    if (diffSeconds < MONTH) return `${Math.floor(diffSeconds / WEEK)} hafta önce`;
    if (diffSeconds < YEAR) return `${Math.floor(diffSeconds / MONTH)} ay önce`;
    return `${Math.floor(diffSeconds / YEAR)} yıl önce`;
};

interface InfiniteFeedCardProps {
    item: VideoEntity;
    index: number;
    activeIndex: number; // ✅ For calculating distance to reset video
    colors: ThemeColors;
    isActive: boolean;
    isPendingActive?: boolean;
    allowDecodePrewarm?: boolean;
    isMuted: boolean;
    isPaused: boolean;
    currentUserId?: string;
    onToggleMute: () => void;
    onOpen: (id: string, index: number) => void;
    onOpenProfile: (userId: string) => void;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onFollow: (id: string) => void;
    onShare: (id: string) => void;
    onShop: (id: string) => void;
    onMore?: (id: string) => void;
    onCarouselTouchStart?: () => void;
    onCarouselTouchEnd?: () => void;
    isMeasurement?: boolean;
    isCleanScreen?: boolean;
    resolvedVideoSource?: string | null;
    networkType?: NetInfoStateType | null;
}

export const InfiniteFeedCard = React.memo(function InfiniteFeedCard({
    item,
    index,
    activeIndex,
    colors,
    isActive,
    isPendingActive = false,
    allowDecodePrewarm = false,
    isMuted,
    isPaused,
    currentUserId,
    onToggleMute,
    onOpen,
    onOpenProfile,
    onLike,
    onSave,
    onFollow,
    onShare,
    onShop,
    onMore,
    onCarouselTouchStart,
    onCarouselTouchEnd,
    isMeasurement = false,
    isCleanScreen = false,
    resolvedVideoSource = null,
    networkType = null,
}: InfiniteFeedCardProps) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [playbackSource, setPlaybackSource] = useState<string | null>(null);
    const [isVideoVisible, setIsVideoVisible] = useState(false);
    const [isDecodePrewarmDone, setIsDecodePrewarmDone] = useState(false);
    const [isInactivePauseWindow, setIsInactivePauseWindow] = useState(false);
    const [hasReachedLoopLimit, setHasReachedLoopLimit] = useState(false);
    const [videoProgressSec, setVideoProgressSec] = useState(0);
    const [videoDurationDisplaySec, setVideoDurationDisplaySec] = useState<number | null>(null);
    const [thumbnailAspectRatio, setThumbnailAspectRatio] = useState<number | null>(null);
    const [loadedVideoAspectRatio, setLoadedVideoAspectRatio] = useState<number | null>(null);
    const videoRef = useRef<any>(null);
    const firstFrameSeenRef = useRef(false);
    const videoDurationSecRef = useRef<number | null>(null);
    const completedLoopCountRef = useRef(0);
    const lastReportedProgressSecRef = useRef(-1);
    const wasActiveRef = useRef(false);
    const readyFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inactiveSinceRef = useRef<number | null>(null);
    const inactivePauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ FLAG CONTROLS
    const disableAllUI = FEED_FLAGS.INF_DISABLE_ALL_UI;
    const disableInlineVideo = FEED_FLAGS.INF_DISABLE_INLINE_VIDEO;
    const disableTimeBadge = FEED_FLAGS.INF_DISABLE_TIME_BADGE || disableAllUI || isCleanScreen;
    const disableUserHeader = FEED_FLAGS.INF_DISABLE_USER_HEADER || disableAllUI || isCleanScreen;
    const disableActions = FEED_FLAGS.INF_DISABLE_ACTIONS || disableAllUI || isCleanScreen;
    const disableDescription = FEED_FLAGS.INF_DISABLE_DESCRIPTION || disableAllUI || isCleanScreen;
    const disableThumbnail = FEED_FLAGS.INF_DISABLE_THUMBNAIL;
    const disableCardStyle = FEED_FLAGS.INF_DISABLE_CARD_STYLE;

    useEffect(() => {
        setIsDescriptionExpanded(false);
        setThumbnailAspectRatio(null);
        setLoadedVideoAspectRatio(null);
    }, [item.id]);

    const clearReadyFallbackTimer = useCallback(() => {
        if (!readyFallbackTimerRef.current) return;
        clearTimeout(readyFallbackTimerRef.current);
        readyFallbackTimerRef.current = null;
    }, []);

    const clearInactivePauseTimer = useCallback(() => {
        if (!inactivePauseTimerRef.current) return;
        clearTimeout(inactivePauseTimerRef.current);
        inactivePauseTimerRef.current = null;
    }, []);

    const thumbnail = useMemo(() => {
        if (isNonEmptyString(item.thumbnailUrl)) return item.thumbnailUrl;
        const mediaItems = item.mediaUrls ?? [];
        const firstImage = mediaItems.find((mediaItem) => mediaItem.type === 'image' && isNonEmptyString(mediaItem.url));
        if (firstImage?.url) return firstImage.url;
        const firstThumbnail = mediaItems.find((mediaItem) => isNonEmptyString(mediaItem.thumbnail));
        if (firstThumbnail?.thumbnail) return firstThumbnail.thumbnail;
        return '';
    }, [item.mediaUrls, item.thumbnailUrl]);
    const thumbnailCacheKey = useMemo(
        () => (isNonEmptyString(thumbnail) ? getStableImageCacheKey(thumbnail) : undefined),
        [thumbnail]
    );
    const avatarUrl = useMemo(
        () => (isNonEmptyString(item.user?.avatarUrl) ? item.user.avatarUrl : ''),
        [item.user?.avatarUrl]
    );
    const avatarCacheKey = useMemo(
        () => (avatarUrl ? getStableImageCacheKey(avatarUrl) : undefined),
        [avatarUrl]
    );

    const sourceVideoUrl = getVideoUrl(item);
    const videoUrl = isNonEmptyString(resolvedVideoSource) ? resolvedVideoSource : sourceVideoUrl;
    const isCarousel = item.postType === 'carousel' && (item.mediaUrls?.length ?? 0) > 0;
    const isVideo = !isCarousel && !!sourceVideoUrl;
    const effectiveVideoSourceUrl = playbackSource ?? videoUrl;
    const isLocalVideoSource = Boolean(effectiveVideoSourceUrl && isLocalFilePath(effectiveVideoSourceUrl));
    const bufferConfig = useMemo(
        () => getBufferConfig(networkType, isLocalVideoSource),
        [networkType, isLocalVideoSource]
    );
    const videoSource = useMemo(() => {
        if (!effectiveVideoSourceUrl) return null;
        return {
            uri: effectiveVideoSourceUrl,
            bufferConfig: {
                ...bufferConfig,
                cacheSizeMB: 64,
            },
            minLoadRetryCount: 5,
        };
    }, [effectiveVideoSourceUrl, bufferConfig]);
    // ✅ Distance-based mount: unmount when 3+ cards away to save resources
    const distanceFromActive = Math.abs(index - activeIndex);
    const isInMountRange = distanceFromActive <= 2;
    const shouldMountVideo = isVideo && isInMountRange && !disableInlineVideo && !isMeasurement;
    const shouldDecodePrewarm =
        allowDecodePrewarm &&
        isVideo &&
        isPendingActive &&
        !isActive &&
        !disableInlineVideo &&
        !isMeasurement &&
        !isDecodePrewarmDone;
    const shouldPlayVideo = isVideo && !disableInlineVideo && !isMeasurement && isActive && !isPaused;
    const hasMedia = isCarousel || isVideo || Boolean(thumbnail);
    const hasThumbnail = Boolean(thumbnail);
    // ✅ Only gate video visibility BEFORE first frame is seen
    // Once video plays (firstFrameSeenRef=true), NEVER return to thumbnail
    const shouldGateVideoVisibility = !disableThumbnail && hasThumbnail && !firstFrameSeenRef.current;
    const shouldShowBaseThumbnail = hasThumbnail && (!isVideo || !disableThumbnail);
    const mediaVideoAspectRatio = useMemo(() => {
        const mediaItems = item.mediaUrls ?? [];
        const firstVideoMedia = mediaItems.find((mediaItem) => mediaItem?.type === 'video');
        if (!firstVideoMedia) return null;
        return getAspectRatioFromDimensions(firstVideoMedia.width, firstVideoMedia.height);
    }, [item.mediaUrls]);
    const storedAspectRatio = useMemo(
        () => getAspectRatioFromDimensions(item.width, item.height),
        [item.width, item.height]
    );
    const aspectRatio = useMemo(() => {
        if (isValidAspectRatio(thumbnailAspectRatio)) return thumbnailAspectRatio;
        if (isValidAspectRatio(loadedVideoAspectRatio)) return loadedVideoAspectRatio;
        if (isValidAspectRatio(mediaVideoAspectRatio)) return mediaVideoAspectRatio;
        if (isValidAspectRatio(storedAspectRatio)) return storedAspectRatio;
        return DEFAULT_VIDEO_ASPECT_RATIO;
    }, [loadedVideoAspectRatio, mediaVideoAspectRatio, storedAspectRatio, thumbnailAspectRatio]);

    // ✅ [PERF] Stabilize callbacks to prevent InfiniteFeedActions re-renders
    const handleOpen = useCallback(() => {
        onOpen(item.id, index);
    }, [item.id, index, onOpen]);

    const handleProfilePress = useCallback((event?: GestureResponderEvent) => {
        event?.stopPropagation?.();
        const userId = item.user?.id;
        if (!userId) return;
        onOpenProfile(userId);
    }, [item.user?.id, onOpenProfile]);

    const handleLike = useCallback(() => {
        onLike(item.id);
    }, [item.id, onLike]);

    const handleSave = useCallback(() => {
        onSave(item.id);
    }, [item.id, onSave]);

    const handleFollow = useCallback(() => {
        onFollow(item.id);
    }, [item.id, onFollow]);

    const handleToggleMute = useCallback(() => {
        onToggleMute();
    }, [onToggleMute]);

    const handleMediaLoad = useCallback((event: { source?: { width?: unknown; height?: unknown } }) => {
        const ratio = getAspectRatioFromDimensions(event?.source?.width, event?.source?.height);
        if (!isValidAspectRatio(ratio)) return;
        setThumbnailAspectRatio((prevRatio) => {
            if (isValidAspectRatio(prevRatio) && Math.abs(prevRatio - ratio) < 0.001) {
                return prevRatio;
            }
            return ratio;
        });
    }, []);

    const handleShare = useCallback(() => {
        onShare(item.id);
    }, [item.id, onShare]);

    const handleShop = useCallback(() => {
        onShop(item.id);
    }, [item.id, onShop]);

    const handleCommercialInfoPress = useCallback(() => {
        // Placeholder callback for future commercial info flow.
    }, []);

    const handleMore = useCallback(() => {
        onMore?.(item.id);
    }, [item.id, onMore]);

    const revealVideoLayer = useCallback(() => {
        if (!shouldGateVideoVisibility) {
            firstFrameSeenRef.current = true;
            clearReadyFallbackTimer();
            setIsVideoVisible(true);
            if (shouldDecodePrewarm) {
                setIsDecodePrewarmDone(true);
            }
            return;
        }
        if (firstFrameSeenRef.current) return;
        firstFrameSeenRef.current = true;
        clearReadyFallbackTimer();
        setIsVideoVisible(true);
        if (shouldDecodePrewarm) {
            setIsDecodePrewarmDone(true);
        }
    }, [clearReadyFallbackTimer, shouldDecodePrewarm, shouldGateVideoVisibility]);

    const handleVideoLoadStart = useCallback((_event: OnLoadStartData) => {
        if (!shouldGateVideoVisibility) {
            firstFrameSeenRef.current = true;
            clearReadyFallbackTimer();
            setIsVideoVisible(true);
            return;
        }
        firstFrameSeenRef.current = false;
        setIsVideoVisible(false);
        clearReadyFallbackTimer();
        readyFallbackTimerRef.current = setTimeout(() => {
            revealVideoLayer();
        }, FIRST_FRAME_FALLBACK_MS);
    }, [clearReadyFallbackTimer, revealVideoLayer, shouldGateVideoVisibility]);

    const handleVideoReadyForDisplay = useCallback(() => {
        revealVideoLayer();
        if (!isVideo || !isActive) return;

        const sourceType = effectiveVideoSourceUrl && isLocalFilePath(effectiveVideoSourceUrl)
            ? 'disk-cache'
            : 'network';

        PerformanceLogger.endTransition(item.id, sourceType);
        PerformanceLogger.markFirstVideoReady(item.id, {
            feed: 'infinite',
            feedIndex: index,
        });
    }, [effectiveVideoSourceUrl, index, isActive, isVideo, item.id, revealVideoLayer]);

    const handleVideoLoad = useCallback((data: OnLoadData) => {
        const duration = typeof data.duration === 'number' && data.duration > 0 ? data.duration : null;
        const naturalSize = (data as OnLoadData & {
            naturalSize?: { width?: unknown; height?: unknown; orientation?: unknown };
        }).naturalSize;
        const naturalRatio = getAspectRatioFromDimensions(naturalSize?.width, naturalSize?.height);
        const orientationHint = typeof naturalSize?.orientation === 'string'
            ? naturalSize.orientation.toLowerCase()
            : '';
        if (isValidAspectRatio(naturalRatio)) {
            const normalizedNaturalRatio =
                (orientationHint === 'portrait' && naturalRatio > 1) ||
                    (orientationHint === 'landscape' && naturalRatio < 1)
                    ? 1 / naturalRatio
                    : naturalRatio;
            if (isValidAspectRatio(normalizedNaturalRatio)) {
                setLoadedVideoAspectRatio((prevRatio) => {
                    if (isValidAspectRatio(prevRatio) && Math.abs(prevRatio - normalizedNaturalRatio) < 0.001) {
                        return prevRatio;
                    }
                    return normalizedNaturalRatio;
                });
            }
        }
        videoDurationSecRef.current = duration;
        setVideoDurationDisplaySec(duration);
        lastReportedProgressSecRef.current = 0;
        setVideoProgressSec(0);
    }, []);

    const handleVideoProgress = useCallback((event: OnProgressData) => {
        if (!firstFrameSeenRef.current && event.currentTime >= 0) {
            revealVideoLayer();
        }

        const progressData = event as OnProgressData & {
            seekableDuration?: number;
            playableDuration?: number;
        };
        const durationFromProgress = typeof progressData.seekableDuration === 'number' && progressData.seekableDuration > 0
            ? progressData.seekableDuration
            : typeof progressData.playableDuration === 'number' && progressData.playableDuration > 0
                ? progressData.playableDuration
                : null;
        if (durationFromProgress != null) {
            const normalizedDuration = Math.floor(durationFromProgress);
            if (
                videoDurationSecRef.current == null
                || Math.floor(videoDurationSecRef.current) !== normalizedDuration
            ) {
                videoDurationSecRef.current = durationFromProgress;
                setVideoDurationDisplaySec(durationFromProgress);
            }
        }

        if (!isActive) return;
        const durationSec = videoDurationSecRef.current;
        const nextProgressSec = Math.max(
            0,
            Math.min(
                Math.floor(event.currentTime),
                durationSec != null ? Math.floor(durationSec) : Number.MAX_SAFE_INTEGER
            )
        );
        if (nextProgressSec === lastReportedProgressSecRef.current) return;
        lastReportedProgressSecRef.current = nextProgressSec;
        setVideoProgressSec(nextProgressSec);
    }, [isActive, revealVideoLayer]);

    const handleVideoEnd = useCallback(() => {
        if (!isVideo) return;

        if (!isActive) {
            if (shouldDecodePrewarm) {
                videoRef.current?.seek?.(0);
            }
            return;
        }

        const endedAtSec = Math.max(0, lastReportedProgressSecRef.current);
        const knownDurationSec = videoDurationSecRef.current != null
            ? Math.max(0, Math.floor(videoDurationSecRef.current))
            : null;
        const hasReliableDuration = knownDurationSec != null && knownDurationSec >= END_GUARD_MIN_DURATION_SEC;
        const nearEndThresholdSec = knownDurationSec != null
            ? Math.max(0, knownDurationSec - END_GUARD_TOLERANCE_SEC)
            : 0;

        // Some Android decoder paths can emit premature onEnd while first frame is shown.
        // Ignore those to avoid freezing playback at start.
        if (
            (!hasReliableDuration && endedAtSec < END_GUARD_MIN_PROGRESS_SEC)
            || (hasReliableDuration && endedAtSec < nearEndThresholdSec)
        ) {
            return;
        }

        const maxPlays = videoDurationSecRef.current != null && videoDurationSecRef.current < SHORT_VIDEO_SECONDS_THRESHOLD
            ? SHORT_VIDEO_MAX_PLAYS
            : LONG_VIDEO_MAX_PLAYS;
        // Count the play that has just finished. This keeps the rule intuitive:
        // short (<15s) => total 2 plays, long (>=15s) => total 1 play.
        const completedPlays = completedLoopCountRef.current + 1;
        if (completedPlays < maxPlays) {
            completedLoopCountRef.current = completedPlays;
            lastReportedProgressSecRef.current = 0;
            setVideoProgressSec(0);
            videoRef.current?.seek?.(0);
            return;
        }

        completedLoopCountRef.current = completedPlays;
        const endedProgressSec = Math.max(0, Math.floor(videoDurationSecRef.current ?? 0));
        lastReportedProgressSecRef.current = endedProgressSec;
        setVideoProgressSec(endedProgressSec);
        setHasReachedLoopLimit(true);
    }, [isActive, isVideo, shouldDecodePrewarm]);

    const handleReplay = useCallback(() => {
        completedLoopCountRef.current = 0;
        setHasReachedLoopLimit(false);
        lastReportedProgressSecRef.current = 0;
        setVideoProgressSec(0);
        videoRef.current?.seek?.(0);
    }, []);

    const handleWatchMoreClipsPress = useCallback((event?: GestureResponderEvent) => {
        event?.stopPropagation?.();
    }, []);

    const handleVideoError = useCallback((_error: OnVideoErrorData) => {
        clearReadyFallbackTimer();

        const canFallbackToNetwork =
            Boolean(sourceVideoUrl) &&
            Boolean(effectiveVideoSourceUrl) &&
            sourceVideoUrl !== effectiveVideoSourceUrl;

        if (canFallbackToNetwork && sourceVideoUrl) {
            setPlaybackSource(sourceVideoUrl);
        }

        if (isActive) {
            PerformanceLogger.failTransition(item.id, 'video_error');
        }
    }, [clearReadyFallbackTimer, effectiveVideoSourceUrl, isActive, item.id, sourceVideoUrl]);

    useEffect(() => {
        const initialShouldGate = !disableThumbnail && hasThumbnail;
        clearReadyFallbackTimer();
        clearInactivePauseTimer();
        firstFrameSeenRef.current = !initialShouldGate;
        videoDurationSecRef.current = null;
        completedLoopCountRef.current = 0;
        lastReportedProgressSecRef.current = -1;
        inactiveSinceRef.current = null;
        setVideoProgressSec(0);
        setVideoDurationDisplaySec(null);
        setHasReachedLoopLimit(false);
        setIsInactivePauseWindow(false);
        wasActiveRef.current = isActive;
        setIsVideoVisible(!initialShouldGate);
        setIsDecodePrewarmDone(false);
        setPlaybackSource(null);
    }, [clearInactivePauseTimer, clearReadyFallbackTimer, disableThumbnail, hasThumbnail, item.id]);

    useEffect(() => {
        // Reset only when the card is completely out of warm/active window.
        if (!isPendingActive && !isActive) {
            setIsDecodePrewarmDone(false);
        }
    }, [isActive, isPendingActive]);

    useEffect(() => () => {
        clearReadyFallbackTimer();
        clearInactivePauseTimer();
    }, [clearInactivePauseTimer, clearReadyFallbackTimer]);

    useEffect(() => {
        if (!shouldMountVideo) {
            clearReadyFallbackTimer();
            // ✅ DON'T reset firstFrameSeenRef - once video plays, never show thumbnail
            if (!firstFrameSeenRef.current) {
                setIsVideoVisible(!shouldGateVideoVisibility);
            }
            // ✅ NO automatic state reset - video will restart from 0 on remount anyway
            return;
        }

        if (!shouldGateVideoVisibility) {
            firstFrameSeenRef.current = true;
            setIsVideoVisible(true);
        }
        setPlaybackSource((prev) => {
            if (!videoUrl) {
                return prev ?? null;
            }
            if (!prev) {
                return videoUrl;
            }
            if (prev === videoUrl) {
                return prev;
            }

            // Never swap source while active playback is running; source swap causes
            // a visible restart/jitter on some Android decoder paths.
            if (isActive) {
                return prev;
            }

            const previousIsLocal = isLocalFilePath(prev);
            const nextIsLocal = isLocalFilePath(videoUrl);

            // Keep local source sticky; upgrade network source to local once cache resolves.
            if (previousIsLocal && !nextIsLocal) {
                return prev;
            }
            if (!previousIsLocal && nextIsLocal) {
                return videoUrl;
            }

            return prev;
        });
    }, [clearReadyFallbackTimer, isActive, shouldGateVideoVisibility, shouldMountVideo, videoUrl]);

    useEffect(() => {
        if (!shouldMountVideo) return;
        if (!shouldGateVideoVisibility) {
            firstFrameSeenRef.current = true;
            clearReadyFallbackTimer();
            setIsVideoVisible(true);
            return;
        }
        // ✅ Only show thumbnail for INITIAL load (video never played)
        // Once firstFrameSeenRef=true, NEVER reset it
        if (!firstFrameSeenRef.current) {
            setIsVideoVisible(false);
            clearReadyFallbackTimer();
            readyFallbackTimerRef.current = setTimeout(() => {
                revealVideoLayer();
            }, FIRST_FRAME_FALLBACK_MS);
        }
    }, [clearReadyFallbackTimer, revealVideoLayer, shouldGateVideoVisibility, shouldMountVideo]);

    useEffect(() => {
        if (!isVideo || !isActive || !isDecodePrewarmDone) return;
        firstFrameSeenRef.current = true;
        clearReadyFallbackTimer();
        setIsVideoVisible(true);
    }, [clearReadyFallbackTimer, isActive, isDecodePrewarmDone, isVideo]);

    useEffect(() => {
        const wasActive = wasActiveRef.current;

        if (!isVideo) {
            wasActiveRef.current = isActive;
            return;
        }

        if (!isActive && wasActive) {
            inactiveSinceRef.current = Date.now();
            setIsInactivePauseWindow(true);
            clearInactivePauseTimer();
            // ✅ 3-second threshold: mark for reset later (when video goes out of view)
            // Don't seek here - it causes visible jitter
            // The reset will happen in shouldMountVideo=false effect

            // Set timeout to clean up pause window state after INACTIVE_RESUME_WINDOW_MS
            inactivePauseTimerRef.current = setTimeout(() => {
                inactivePauseTimerRef.current = null;
                if (wasActiveRef.current) return;
                setIsInactivePauseWindow(false);
            }, INACTIVE_RESUME_WINDOW_MS);
        }

        if (isActive && !wasActive) {
            // ✅ Immediately mark video as seen when it becomes active
            // This prevents thumbnail from showing on first scroll
            firstFrameSeenRef.current = true;
            setIsVideoVisible(true);

            const inactiveSince = inactiveSinceRef.current;
            const inactiveDurationMs = inactiveSince == null ? 0 : Date.now() - inactiveSince;
            clearInactivePauseTimer();
            // ✅ State reset only - NO seek(0) to avoid visible jitter
            // Video will start from 0 on next remount automatically
            if (inactiveSince != null && inactiveDurationMs >= INACTIVE_RESUME_WINDOW_MS) {
                completedLoopCountRef.current = 0;
                setHasReachedLoopLimit(false);
                // Don't reset progress or seek - let video continue from current position
                // or start fresh on next remount
            }
            inactiveSinceRef.current = null;
            setIsInactivePauseWindow(false);
        }

        wasActiveRef.current = isActive;
    }, [clearInactivePauseTimer, isActive, isVideo]);

    // ✅ [PERF] Memoize dynamic styles to prevent object reference churn
    const effectiveAspectRatio = isCarousel ? CAROUSEL_ASPECT_RATIO : aspectRatio;
    const mediaWrapperStyle = useMemo(() => [
        styles.mediaWrapper,
        { aspectRatio: effectiveAspectRatio }
    ], [effectiveAspectRatio]);

    // ✅ [PERF] Consolidated theme styles - 12 useMemos → 1
    const isDarkTheme = colors.textPrimary.toLowerCase() === '#ffffff';
    const themedStyles = useMemo(() => {
        const cardBg = mixWithWhite(colors.background, 0.03);
        const borderClr = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const shadow = shadowStyle({
            color: '#000000',
            offset: { width: 0, height: 6 },
            radius: 14,
            opacity: isDarkTheme ? 0.35 : 0.18,
            elevation: 6,
        });
        return {
            fullName: [styles.fullName, { color: colors.textPrimary }],
            handle: [styles.handle, { color: colors.textSecondary }],
            description: [styles.description, { color: colors.textPrimary }],
            readMore: [styles.readMore, { color: colors.textSecondary }],
            displayName: [styles.displayName, { color: colors.textPrimary }],
            replayBadge: [styles.replayBadge, { backgroundColor: 'transparent' }],
            replayBadgeText: [styles.replayBadgeText, { color: isDarkTheme ? '#FFFFFF' : '#111111' }],
            replayMoreButton: [styles.replayMoreButton, { backgroundColor: '#080A0F' }],
            replayMoreText: [styles.replayMoreText, { color: '#FFFFFF' }],
            cardOuter: [
                styles.card,
                disableCardStyle ? styles.cardEdgeToEdge : null,
                disableCardStyle ? null : shadow,
            ],
            cardInner: [
                styles.cardInner,
                disableCardStyle ? styles.cardInnerEdgeToEdge : null,
                { backgroundColor: disableCardStyle ? 'transparent' : cardBg, borderColor: disableCardStyle ? 'transparent' : borderClr },
            ],
            mediaPlaceholder: [styles.mediaPlaceholder, { backgroundColor: mixWithWhite(colors.background, isDarkTheme ? 0.08 : 0.16) }],
        };
    }, [colors.background, colors.textPrimary, colors.textSecondary, disableCardStyle, isDarkTheme]);

    // ✅ [PERF] Only truly dynamic values stay as separate useMemos
    const videoTimeText = useMemo(() => {
        if (videoDurationDisplaySec == null) return '';
        return `${formatPlaybackClock(videoProgressSec)} | ${formatPlaybackClock(videoDurationDisplaySec)}`;
    }, [videoDurationDisplaySec, videoProgressSec]);
    const commercialTagText = useMemo(() => {
        if (!item.isCommercial) return '';
        const commercialTypeLabel = item.commercialType ? item.commercialType : 'İş Birliği';
        return item.brandName ? `${commercialTypeLabel} | ${item.brandName}` : commercialTypeLabel;
    }, [item.brandName, item.commercialType, item.isCommercial]);

    const descriptionValue = item.description?.trim() ?? '';
    const hasDescription = descriptionValue.length > 0;
    const canToggleDescription = descriptionValue.length > DESCRIPTION_LIMIT;
    const handleToggleDescription = useCallback(() => {
        if (!canToggleDescription) return;
        setIsDescriptionExpanded(prev => !prev);
    }, [canToggleDescription]);
    const displayName = item.user?.username || item.user?.fullName || 'wizyclub';
    const truncatedDescription =
        isDescriptionExpanded || !canToggleDescription
            ? descriptionValue
            : descriptionValue.substring(0, DESCRIPTION_LIMIT);
    const relativeTime = useMemo(() => formatRelativeTime(item.createdAt), [item.createdAt]);
    const showDescriptionBlock = !disableDescription && hasDescription;
    const showTimeHint = !isCleanScreen && relativeTime.length > 0;

    const showFollowButton = !item.user?.isFollowing && item.user?.id !== currentUserId;

    const cardBody = (
        <>
            {/* MEDIA - Video or Image */}
            {hasMedia ? (
                isCarousel ? (
                    <View style={mediaWrapperStyle}>
                        <InfiniteCarouselLayer
                            mediaUrls={item.mediaUrls ?? []}
                            backgroundColor={colors.background}
                            onSingleTap={handleOpen}
                            onCarouselTouchStart={onCarouselTouchStart}
                            onCarouselTouchEnd={onCarouselTouchEnd}
                        />
                        {/* ✅ USER HEADER - Top-left overlay on media */}
                        {!disableUserHeader && (
                            <View style={styles.mediaHeaderOverlay}>
                                <View style={styles.userInfoRow}>
                                    <Pressable onPress={handleProfilePress} hitSlop={8}>
                                        {avatarUrl ? (
                                            <Image
                                                source={{ uri: avatarUrl, cacheKey: avatarCacheKey }}
                                                style={styles.avatar}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, { backgroundColor: colors.card }]} />
                                        )}
                                    </Pressable>
                                    <View style={styles.headerText}>
                                        <View style={styles.nameRow}>
                                            <Pressable onPress={handleProfilePress} hitSlop={8}>
                                                <Text style={themedStyles.fullName} numberOfLines={1}>
                                                    {item.user?.fullName || 'WizyClub User'}
                                                </Text>
                                            </Pressable>
                                            {item.user?.isVerified === true && (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={16} />
                                                </View>
                                            )}
                                        </View>
                                        <Pressable onPress={handleProfilePress} hitSlop={8}>
                                            <Text style={themedStyles.handle} numberOfLines={1}>
                                                @{item.user?.username || 'wizyclub'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.mediaTopRightActions} pointerEvents="box-none">
                            {!disableUserHeader && showFollowButton && (
                                <Pressable style={styles.followPill} onPress={handleFollow} hitSlop={8}>
                                    <Text style={styles.followText}>Takip Et</Text>
                                </Pressable>
                            )}
                            <Pressable
                                style={styles.moreButton}
                                onPress={(event) => {
                                    event.stopPropagation?.();
                                    handleMore();
                                }}
                                hitSlop={10}
                            >
                                <MoreVertical size={22} color="#FFFFFF" strokeWidth={2.4} />
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable
                        style={mediaWrapperStyle}
                    >
                        <View
                            style={styles.videoContainer}
                        >
                            {shouldShowBaseThumbnail ? (
                                <Image
                                    source={{ uri: thumbnail, cacheKey: thumbnailCacheKey }}
                                    style={styles.media}
                                    contentFit="cover"
                                    transition={0}
                                    cachePolicy="memory-disk"
                                    onLoad={handleMediaLoad}
                                />
                            ) : (
                                <View style={themedStyles.mediaPlaceholder} />
                            )}
                            {shouldMountVideo && videoSource ? (
                                <VideoPlayer
                                    ref={videoRef}
                                    source={videoSource as any}
                                    style={[
                                        styles.media,
                                        styles.videoOverlay,
                                        ((!isActive && shouldPlayVideo) || (shouldGateVideoVisibility && !isVideoVisible)) && styles.videoHidden,
                                    ]}
                                    resizeMode="contain"
                                    repeat={false}
                                    paused={!shouldPlayVideo}
                                    muted={isMuted}
                                    playInBackground={false}
                                    playWhenInactive={false}
                                    progressUpdateInterval={250}
                                    onLoadStart={handleVideoLoadStart}
                                    onLoad={handleVideoLoad}
                                    onReadyForDisplay={handleVideoReadyForDisplay}
                                    onProgress={handleVideoProgress}
                                    onEnd={handleVideoEnd}
                                    onError={handleVideoError}
                                    hideShutterView={true}
                                    shutterColor="transparent"
                                    poster={!disableThumbnail && hasThumbnail ? thumbnail : undefined}
                                    posterResizeMode="cover"
                                    // @ts-ignore - deprecated prop but required for stable Android overlay rendering
                                    useTextureView={true}
                                    automaticallyWaitsToMinimizeStalling={false}
                                    preferredForwardBufferDuration={4}
                                    preventsDisplaySleepDuringVideoPlayback={false}
                                />
                            ) : null}
                            <Pressable
                                style={styles.mediaTapLayer}
                                onPress={handleOpen}
                            />
                            {isVideo && isActive && hasReachedLoopLimit && (
                                <View style={styles.replayButtonsContainer}>
                                    <Pressable
                                        style={themedStyles.replayMoreButton}
                                        onPress={handleWatchMoreClipsPress}
                                        hitSlop={8}
                                    >
                                        <VideosIcon width={18} height={18} />
                                        <Text style={themedStyles.replayMoreText}>Daha fazla Clips izle</Text>
                                    </Pressable>
                                    <Pressable
                                        style={themedStyles.replayBadge}
                                        onPress={(event) => {
                                            event.stopPropagation?.();
                                            handleReplay();
                                        }}
                                        hitSlop={8}
                                    >
                                        <Text style={themedStyles.replayBadgeText}>Tekrar izle</Text>
                                    </Pressable>
                                </View>
                            )}
                        </View>

                        {/* ✅ USER HEADER - Top-left overlay on media */}
                        {!disableUserHeader && (
                            <View style={styles.mediaHeaderOverlay}>
                                <View style={styles.userInfoRow}>
                                    <Pressable onPress={handleProfilePress} hitSlop={8}>
                                        {avatarUrl ? (
                                            <Image
                                                source={{ uri: avatarUrl, cacheKey: avatarCacheKey }}
                                                style={styles.avatar}
                                                contentFit="cover"
                                                cachePolicy="memory-disk"
                                                transition={0}
                                            />
                                        ) : (
                                            <View style={[styles.avatar, { backgroundColor: colors.card }]} />
                                        )}
                                    </Pressable>
                                    <View style={styles.headerText}>
                                        <View style={styles.nameRow}>
                                            <Pressable onPress={handleProfilePress} hitSlop={8}>
                                                <Text style={themedStyles.fullName} numberOfLines={1}>
                                                    {item.user?.fullName || 'WizyClub User'}
                                                </Text>
                                            </Pressable>
                                            {item.user?.isVerified === true && (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={16} />
                                                </View>
                                            )}
                                        </View>
                                        <Pressable onPress={handleProfilePress} hitSlop={8}>
                                            <Text style={themedStyles.handle} numberOfLines={1}>
                                                @{item.user?.username || 'wizyclub'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.mediaTopRightActions} pointerEvents="box-none">
                            {!disableUserHeader && showFollowButton && (
                                <Pressable style={styles.followPill} onPress={handleFollow} hitSlop={8}>
                                    <Text style={styles.followText}>Takip Et</Text>
                                </Pressable>
                            )}
                            <Pressable
                                style={styles.moreButton}
                                onPress={(event) => {
                                    event.stopPropagation?.();
                                    handleMore();
                                }}
                                hitSlop={10}
                            >
                                <MoreVertical size={22} color="#FFFFFF" strokeWidth={2.4} />
                            </Pressable>
                        </View>

                        {isVideo && !isCleanScreen && (
                            <View style={styles.mediaRightBottomActions} pointerEvents="box-none">
                                <Pressable
                                    style={styles.volumeButton}
                                    onPress={(event) => {
                                        event.stopPropagation?.();
                                        handleToggleMute();
                                    }}
                                    hitSlop={10}
                                >
                                    {isMuted ? (
                                        <VolumeX size={18} color="#FFFFFF" strokeWidth={1.6} />
                                    ) : (
                                        <Volume2 size={18} color="#FFFFFF" strokeWidth={1.6} />
                                    )}
                                </Pressable>
                            </View>
                        )}
                        {isVideo && isActive && isVideoVisible && videoDurationDisplaySec != null && !disableTimeBadge && (
                            <View style={styles.mediaLeftBottomTime} pointerEvents="none">
                                <Text style={styles.videoTimeBadgeText}>{videoTimeText}</Text>
                            </View>
                        )}
                    </Pressable>
                )
            ) : null}

            {/* ✅ ACTIONS - Controlled by INF_DISABLE_ACTIONS */}
            {!disableActions && (
                <View style={styles.cardContent}>
                    <InfiniteFeedActions
                        colors={colors}
                        likesCount={item.likesCount || 0}
                        savesCount={item.savesCount || 0}
                        sharesCount={item.sharesCount || 0}
                        isLiked={item.isLiked}
                        isSaved={item.isSaved}
                        showCommercialTag={item.isCommercial === true}
                        showShopIcon={isNonEmptyString(item.brandUrl)}
                        shopTagText={commercialTagText}
                        onLike={handleLike}
                        onSave={handleSave}
                        onShare={handleShare}
                        onShop={handleShop}
                        onCommercialInfoPress={handleCommercialInfoPress}
                    />
                    {!showDescriptionBlock && showTimeHint && (
                        <Text style={styles.timeHint}>{relativeTime}</Text>
                    )}
                </View>
            )}
            {disableActions && !showDescriptionBlock && showTimeHint && (
                <View style={styles.cardContent}>
                    <Text style={styles.timeHint}>{relativeTime}</Text>
                </View>
            )}

            {/* ✅ DESCRIPTION - Controlled by INF_DISABLE_DESCRIPTION */}
            {showDescriptionBlock && (
                <View style={styles.cardContent}>
                    <Text style={themedStyles.description} onPress={handleToggleDescription}>
                        <Text style={themedStyles.displayName} onPress={handleProfilePress}>{displayName}</Text>
                        {hasDescription ? (
                            <>
                                {' '}
                                {truncatedDescription}
                                {!isDescriptionExpanded && canToggleDescription && (
                                    <Text
                                        style={themedStyles.readMore}
                                    >
                                        {'...daha fazla'}
                                    </Text>
                                )}
                                {isDescriptionExpanded && canToggleDescription && (
                                    <Text
                                        style={themedStyles.readMore}
                                    >
                                        {' daha az'}
                                    </Text>
                                )}
                            </>
                        ) : null}
                    </Text>
                    {showTimeHint && <Text style={styles.timeHint}>{relativeTime}</Text>}
                </View>
            )}
        </>
    );

    return (
        <View style={themedStyles.cardOuter}>
            <View style={themedStyles.cardInner}>
                {cardBody}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 8,
        marginVertical: 6,
        borderRadius: 12,
    },
    cardEdgeToEdge: {
        marginHorizontal: 0,
        marginVertical: 0,
        borderRadius: 0,
    },
    cardInner: {
        paddingTop: 0,
        paddingBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    cardInnerEdgeToEdge: {
        paddingBottom: 0,
        borderRadius: 0,
        borderWidth: 0,
    },
    cardContent: {
        paddingHorizontal: CARD_HORIZONTAL_PADDING,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#2a2a2a',
    },
    headerText: {
        flex: 1,
        minWidth: 0,
    },
    userInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'nowrap',
    },
    verifiedBadge: {
        marginLeft: 2,
        alignSelf: 'center',
    },
    fullName: {
        fontSize: 15,
        fontWeight: '700',
        flexShrink: 1,
    },
    handle: {
        fontSize: 13,
        marginTop: 0,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginTop: 10,
        fontWeight: '400',
    },
    readMore: {
        fontSize: 15,
        fontWeight: '500',
    },
    displayName: {
        fontSize: 15,
        fontWeight: '600',
    },
    timeHint: {
        marginTop: 6,
        marginBottom: 12, // Will be overridden dynamically if needed
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '400',
    },
    mediaWrapper: {
        marginTop: 0,
        width: '100%',
        borderRadius: 0,
        borderWidth: 0,
        position: 'relative',
    },
    media: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
    },
    mediaTapLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    videoContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    videoHidden: {
        opacity: 0,
    },
    mediaHeaderOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        maxWidth: '65%',
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 3,
    },
    mediaTopRightActions: {
        position: 'absolute',
        top: 12,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 3,
    },
    moreButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderColor: 'transparent',
    },
    mediaRightBottomActions: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        alignItems: 'flex-end',
        zIndex: 3,
    },
    mediaLeftBottomTime: {
        position: 'absolute',
        left: 12,
        bottom: 12,
        zIndex: 3,
    },
    volumeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.50)',
        borderWidth: 0,
        borderColor: 'transparent',
    },
    followPill: {
        backgroundColor: 'rgba(0,0,0,0.50)',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 0,
        borderColor: 'transparent',
        alignSelf: 'center',
        marginRight: 0,
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        shadowOffset: { width: 0, height: 0 },
        elevation: 0,
    },
    followText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '400',
    },
    mediaPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#111',
    },
    replayButtonsContainer: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        transform: [{ translateY: -28 }],
        zIndex: 2,
        elevation: 2,
    },
    replayMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    replayMoreText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: 0.2,
    },
    replayBadge: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 999,
    },
    replayBadgeText: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    videoTimeBadgeText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '400',
        marginLeft: 0,
        marginRight: 0,
    },
});
