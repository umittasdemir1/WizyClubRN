import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Volume2, VolumeX, MoreVertical, Plus, MapPinCheckInside } from 'lucide-react-native';
import VideoPlayer, { ViewType, type OnLoadData, type OnLoadStartData, type OnProgressData, type OnVideoErrorData } from 'react-native-video';
import type { NetInfoStateType } from '@react-native-community/netinfo';
import { getVideoUrl } from '../../../core/utils/videoUrl';
import { Video as VideoEntity } from '../../../domain/entities/Video';
import { InfiniteFeedActions } from './InfiniteFeedActions';
import { InfiniteCarouselLayer } from './InfiniteCarouselLayer';
import { VerifiedBadge } from '../shared/VerifiedBadge';
import { StoryRingAvatar } from '../shared/StoryRingAvatar';
import { RichTextLabel } from '../shared/RichTextLabel';
import { ThemeColors } from './InfiniteFeedTypes';
import { FEED_FLAGS } from './hooks/useInfiniteFeedConfig';
import { getBufferConfig } from '../../../core/utils/bufferConfig';
import { shadowStyle } from '@/core/utils/shadow';
import { PerformanceLogger } from '../../../core/services/PerformanceLogger';
import { useSubtitles } from '../../hooks/useSubtitles';
import {
    SUBTITLE_BORDER_RADIUS,
    SUBTITLE_SIDE_MARGIN,
    SUBTITLE_TEXT_BASE_STYLE,
    applySubtitleTextCase,
    getSubtitlePresentationPixelStyle,
    getSubtitleWrapperStyle,
    resolveSubtitleStyle,
} from '../../../core/utils/subtitleOverlay';
import { getRichTextVisibleLength, stripRichTextTags, truncateRichTextByVisibleLength } from '../../../core/utils/richText';
import VideosIcon from '@assets/icons/navigation/darkvideos.svg';

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
const ACTIVE_WAKEUP_SEEK_DELAY_MS = 400;
const ACTIVE_WAKEUP_MIN_PROGRESS_SEC = 0.2;
const DEFAULT_VIDEO_ASPECT_RATIO = 9 / 16;
const MIN_VALID_ASPECT_RATIO = 0.2;
const MAX_VALID_ASPECT_RATIO = 5;
const SUBTITLE_MAX_WIDTH = Dimensions.get('window').width - (SUBTITLE_SIDE_MARGIN * 2);
const SUBTITLE_BOTTOM_SAFE_PADDING = 60;
const TAGGED_PEOPLE_PREVIEW_LIMIT = 3;

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
    activeIndex: number; // âœ… For calculating distance to reset video
    colors: ThemeColors;
    isActive: boolean;
    isPendingActive?: boolean;
    allowDecodePrewarm?: boolean;
    isMuted: boolean;
    isPaused: boolean;
    currentUserId?: string;
    hasActiveStory?: boolean;
    onToggleMute: () => void;
    onOpen: (id: string, index: number) => void;
    onOpenProfile: (userId: string) => void;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onFollow: (id: string) => void;
    onShare: (videoId: string) => void;
    onShop: (videoId: string) => void;
    onWatchMoreClips?: () => void;
    onMore?: (videoId: string) => void;
    onTagPress?: (videoId: string) => void;
    onHashtagPress?: (hashtag: string) => void;
    onLocationPress?: (query: string) => void;
    onCarouselTouchStart?: () => void;
    onCarouselTouchEnd?: () => void;
    isMeasurement?: boolean;
    isCleanScreen?: boolean;
    resolvedVideoSource?: string | null;
    networkType?: NetInfoStateType | null;
    shouldShowSubtitle?: boolean;
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
    hasActiveStory = false,
    onToggleMute,
    onOpen,
    onOpenProfile,
    onLike,
    onSave,
    onFollow,
    onShare,
    onShop,
    onWatchMoreClips,
    onMore,
    onTagPress,
    onHashtagPress,
    onLocationPress,
    onCarouselTouchStart,
    onCarouselTouchEnd,
    isMeasurement = false,
    isCleanScreen = false,
    resolvedVideoSource = null,
    networkType = null,
    shouldShowSubtitle = false,
}: InfiniteFeedCardProps) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [playbackSource, setPlaybackSource] = useState<string | null>(null);
    const [isVideoVisible, setIsVideoVisible] = useState(false);
    const [isDecodePrewarmDone, setIsDecodePrewarmDone] = useState(false);

    const [hasReachedLoopLimit, setHasReachedLoopLimit] = useState(false);
    const [videoProgressSec, setVideoProgressSec] = useState(0);
    const [videoDurationDisplaySec, setVideoDurationDisplaySec] = useState<number | null>(null);

    // ✅ [PERF] Detect FlashList recycling during render (before effects).
    // When item.id changes, state is stale for one render frame because
    // the reset effect hasn't fired yet. We must ignore stale state to
    // avoid flashing the previous video's content.
    const mountedItemIdRef = useRef(item.id);
    const isRecycledRender = mountedItemIdRef.current !== item.id;
    if (isRecycledRender) {
        mountedItemIdRef.current = item.id;
    }
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
    const activeWakeupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const hasAppliedActiveWakeupRef = useRef(false);
    const hasActiveProgressRef = useRef(false);
    const lastSubtitleTimeMsRef = useRef(0);

    const [activeSubtitleText, setActiveSubtitleText] = useState<string | null>(null);
    const activeSubtitleTextRef = useRef<string | null>(null);
    const [subtitleLayoutBounds, setSubtitleLayoutBounds] = useState({ width: 0, height: 0 });
    const { subtitles, getActiveSubtitle } = useSubtitles(isActive ? item.id : undefined);
    const subtitlePresentationStyle = useMemo(() => {
        return getSubtitlePresentationPixelStyle(
            subtitles?.presentation,
            subtitleLayoutBounds.width,
            subtitleLayoutBounds.height,
            {
                bottomPadding: SUBTITLE_BOTTOM_SAFE_PADDING,
                verticalAnchor: 'bottom',
            }
        );
    }, [
        subtitles?.presentation,
        subtitleLayoutBounds.width,
        subtitleLayoutBounds.height,
    ]);
    const subtitlePositionStyle = subtitlePresentationStyle ?? styles.subtitleContainerFallback;
    const resolvedSubtitleStyle = useMemo(() => resolveSubtitleStyle(subtitles?.style), [subtitles?.style]);
    const subtitleTextDynamicStyle = useMemo(() => {
        return {
            fontSize: resolvedSubtitleStyle.fontSize,
            lineHeight: resolvedSubtitleStyle.lineHeight,
            textAlign: resolvedSubtitleStyle.textAlign,
            color: resolvedSubtitleStyle.textColor,
            fontFamily: resolvedSubtitleStyle.fontFamily,
            fontWeight: resolvedSubtitleStyle.fontWeight,
        };
    }, [
        resolvedSubtitleStyle.textColor,
        resolvedSubtitleStyle.fontFamily,
        resolvedSubtitleStyle.fontWeight,
        resolvedSubtitleStyle.fontSize,
        resolvedSubtitleStyle.lineHeight,
        resolvedSubtitleStyle.textAlign,
    ]);
    const subtitleWrapperDynamicStyle = useMemo(
        () => getSubtitleWrapperStyle(resolvedSubtitleStyle.showOverlay, resolvedSubtitleStyle.overlayColor),
        [resolvedSubtitleStyle.showOverlay, resolvedSubtitleStyle.overlayColor]
    );
    const formattedSubtitleText = useMemo(
        () => applySubtitleTextCase(activeSubtitleText || '', subtitles?.style?.textCase),
        [activeSubtitleText, subtitles?.style?.textCase]
    );

    // âœ… FLAG CONTROLS
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
    const clearActiveWakeupTimer = useCallback(() => {
        if (!activeWakeupTimerRef.current) return;
        clearTimeout(activeWakeupTimerRef.current);
        activeWakeupTimerRef.current = null;
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
    const hasLocationIndicator = (
        isNonEmptyString(item.locationName)
        || isNonEmptyString(item.locationAddress)
        || (typeof item.locationLatitude === 'number' && Number.isFinite(item.locationLatitude))
        || (typeof item.locationLongitude === 'number' && Number.isFinite(item.locationLongitude))
    );
    const locationLabel = isNonEmptyString(item.locationName)
        ? item.locationName.trim()
        : '';
    const locationSearchQuery = isNonEmptyString(item.locationName)
        ? item.locationName.trim()
        : isNonEmptyString(item.locationAddress)
            ? item.locationAddress.trim()
            : '';
    const locationIndicator = !isCleanScreen && hasLocationIndicator ? (
        <View
            style={styles.mediaLeftBottomLocation}
            pointerEvents={locationSearchQuery && onLocationPress ? 'box-none' : 'none'}
        >
            {locationSearchQuery && onLocationPress ? (
                <Pressable
                    style={styles.locationPill}
                    hitSlop={8}
                    onPress={(event) => {
                        event.stopPropagation?.();
                        onLocationPress(locationSearchQuery);
                    }}
                >
                    <MapPinCheckInside size={16} color="#FFFFFF" strokeWidth={1.8} />
                    {locationLabel ? (
                        <Text style={styles.locationLabel} numberOfLines={1}>
                            {locationLabel}
                        </Text>
                    ) : null}
                </Pressable>
            ) : (
                <View style={styles.locationPill}>
                    <MapPinCheckInside size={16} color="#FFFFFF" strokeWidth={1.8} />
                    {locationLabel ? (
                        <Text style={styles.locationLabel} numberOfLines={1}>
                            {locationLabel}
                        </Text>
                    ) : null}
                </View>
            )}
        </View>
    ) : null;
    const hasTaggedPeopleOverflow = (item.taggedPeople?.length ?? 0) > TAGGED_PEOPLE_PREVIEW_LIMIT;
    const visibleTaggedPeople = useMemo(
        () => (item.taggedPeople ?? []).slice(0, TAGGED_PEOPLE_PREVIEW_LIMIT),
        [item.taggedPeople]
    );
    const taggedPeopleMeta = useMemo(() => {
        if (visibleTaggedPeople.length === 0) return null;

        return (
            <Pressable
                style={styles.taggedPeopleMetaRow}
                hitSlop={12}
                pressRetentionOffset={12}
                onPress={(event) => {
                    event.stopPropagation?.();
                    onTagPress?.(item.id);
                }}
            >
                <Text style={styles.taggedPeopleMetaLabel}>ile</Text>
                <View style={styles.taggedPeopleMetaAvatars}>
                    {visibleTaggedPeople.map((person, personIndex) => {
                        const fallbackCharacter = (person.fullName || person.username || '?').trim().charAt(0).toUpperCase() || '?';
                        const hasAvatar = isNonEmptyString(person.avatarUrl);

                        return (
                            <View
                                key={person.id || `${person.username}-${personIndex}`}
                                style={[
                                    styles.taggedPeopleMetaAvatarFrame,
                                    personIndex > 0 && styles.taggedPeopleMetaAvatarOverlap,
                                ]}
                            >
                                {hasAvatar ? (
                                    <Image
                                        source={{ uri: person.avatarUrl }}
                                        style={styles.taggedPeopleMetaAvatarImage}
                                        contentFit="cover"
                                        cachePolicy="disk"
                                    />
                                ) : (
                                    <View style={styles.taggedPeopleMetaAvatarFallback}>
                                        <Text style={styles.taggedPeopleMetaAvatarFallbackText}>{fallbackCharacter}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                    {hasTaggedPeopleOverflow ? (
                        <View
                            style={[
                                styles.taggedPeopleMetaAvatarFrame,
                                visibleTaggedPeople.length > 0 && styles.taggedPeopleMetaAvatarOverlap,
                                styles.taggedPeopleMetaPlusFrame,
                            ]}
                        >
                            <Plus size={14} color="#080A0F" strokeWidth={2.8} />
                        </View>
                    ) : null}
                </View>
            </Pressable>
        );
    }, [hasTaggedPeopleOverflow, visibleTaggedPeople, onTagPress, item.id]);

    const sourceVideoUrl = getVideoUrl(item);
    const videoUrl = isNonEmptyString(resolvedVideoSource) ? resolvedVideoSource : sourceVideoUrl;
    const isCarousel = item.postType === 'carousel' && (item.mediaUrls?.length ?? 0) > 0;
    const isVideo = !isCarousel && !!sourceVideoUrl;
    // On recycled renders playbackSource still holds the PREVIOUS item's URL.
    // Ignore it so we never flash the wrong video.
    const effectiveVideoSourceUrl = isRecycledRender ? videoUrl : (playbackSource ?? videoUrl);
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
    // âœ… Distance-based mount: unmount when 3+ cards away to save resources
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
    // âœ… Only gate video visibility BEFORE first frame is seen
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

    // âœ… [PERF] Stabilize callbacks to prevent InfiniteFeedActions re-renders
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
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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


    const handleMore = useCallback(() => {
        onMore?.(item.id);
    }, [item.id, onMore]);

    // Native tap gesture for more button - works reliably even when
    // the card is partially visible in the FlashList scroll view.
    const moreTapGesture = useMemo(() =>
        Gesture.Tap()
            .runOnJS(true)
            .onEnd(() => {
                handleMore();
            }),
        [handleMore]
    );

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
        lastSubtitleTimeMsRef.current = event.currentTime * 1000;
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
        hasActiveProgressRef.current = true;
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

        // Sync subtitles
        if (!shouldShowSubtitle) {
            if (activeSubtitleTextRef.current !== null) {
                activeSubtitleTextRef.current = null;
                setActiveSubtitleText(null);
            }
            return;
        }

        const subtitle = getActiveSubtitle(lastSubtitleTimeMsRef.current);
        if (subtitle !== activeSubtitleTextRef.current) {
            activeSubtitleTextRef.current = subtitle;
            setActiveSubtitleText(subtitle);
        }
    }, [getActiveSubtitle, isActive, revealVideoLayer, shouldShowSubtitle]);

    useEffect(() => {
        if (!shouldShowSubtitle) {
            if (activeSubtitleTextRef.current !== null) {
                activeSubtitleTextRef.current = null;
                setActiveSubtitleText(null);
            }
            return;
        }

        const subtitleNow = getActiveSubtitle(lastSubtitleTimeMsRef.current);
        if (subtitleNow !== activeSubtitleTextRef.current) {
            activeSubtitleTextRef.current = subtitleNow;
            setActiveSubtitleText(subtitleNow);
        }
    }, [getActiveSubtitle, shouldShowSubtitle]);

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
        onWatchMoreClips?.();
    }, [onWatchMoreClips]);

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
        wasActiveRef.current = isActive;
        setIsVideoVisible(!initialShouldGate);
        setIsDecodePrewarmDone(false);
        setPlaybackSource(null);
        activeSubtitleTextRef.current = null;
        setActiveSubtitleText(null);
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
        clearActiveWakeupTimer();
    }, [clearActiveWakeupTimer, clearInactivePauseTimer, clearReadyFallbackTimer]);

    useEffect(() => {
        if (!shouldMountVideo) {
            clearReadyFallbackTimer();
            // âœ… DON'T reset firstFrameSeenRef - once video plays, never show thumbnail
            if (!firstFrameSeenRef.current) {
                setIsVideoVisible(!shouldGateVideoVisibility);
            }
            // âœ… NO automatic state reset - video will restart from 0 on remount anyway
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
        // âœ… Only show thumbnail for INITIAL load (video never played)
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
        if (!isVideo || !isActive || !shouldPlayVideo) {
            clearActiveWakeupTimer();
            hasAppliedActiveWakeupRef.current = false;
            return;
        }
        if (hasAppliedActiveWakeupRef.current) return;

        clearActiveWakeupTimer();
        activeWakeupTimerRef.current = setTimeout(() => {
            activeWakeupTimerRef.current = null;
            if (!wasActiveRef.current) return;
            if (hasReachedLoopLimit) return;
            // If we already received a progress event while active, the decoder
            // is running fine — no need to nudge it.
            if (hasActiveProgressRef.current) return;
            try {
                // Android can occasionally miss the first resume edge after feed insertions.
                // A tiny seek nudges the decoder without visible jump.
                videoRef.current?.seek?.(0.01);
                hasAppliedActiveWakeupRef.current = true;
            } catch {
                // best effort
            }
        }, ACTIVE_WAKEUP_SEEK_DELAY_MS);

        return () => {
            clearActiveWakeupTimer();
        };
    }, [clearActiveWakeupTimer, hasReachedLoopLimit, isActive, isVideo, shouldPlayVideo]);

    useEffect(() => {
        const wasActive = wasActiveRef.current;

        if (!isVideo) {
            clearActiveWakeupTimer();
            wasActiveRef.current = isActive;
            return;
        }

        if (!isActive && wasActive) {
            clearActiveWakeupTimer();
            hasAppliedActiveWakeupRef.current = false;
            inactiveSinceRef.current = Date.now();
            clearInactivePauseTimer();
            // âœ… 3-second threshold: mark for reset later (when video goes out of view)
            // Don't seek here - it causes visible jitter
            // The reset will happen in shouldMountVideo=false effect

            // Set timeout to clean up pause window state after INACTIVE_RESUME_WINDOW_MS
            inactivePauseTimerRef.current = setTimeout(() => {
                inactivePauseTimerRef.current = null;
                if (wasActiveRef.current) return;
            }, INACTIVE_RESUME_WINDOW_MS);
        }

        if (isActive && !wasActive) {
            hasAppliedActiveWakeupRef.current = false;
            hasActiveProgressRef.current = false;
            // âœ… Immediately mark video as seen when it becomes active
            // This prevents thumbnail from showing on first scroll
            firstFrameSeenRef.current = true;
            setIsVideoVisible(true);

            const inactiveSince = inactiveSinceRef.current;
            const inactiveDurationMs = inactiveSince == null ? 0 : Date.now() - inactiveSince;
            clearInactivePauseTimer();
            // âœ… State reset only - NO seek(0) to avoid visible jitter
            // Video will start from 0 on next remount automatically
            if (inactiveSince != null && inactiveDurationMs >= INACTIVE_RESUME_WINDOW_MS) {
                completedLoopCountRef.current = 0;
                setHasReachedLoopLimit(false);
                // Don't reset progress or seek - let video continue from current position
                // or start fresh on next remount
            }
            inactiveSinceRef.current = null;
        }

        wasActiveRef.current = isActive;
    }, [clearActiveWakeupTimer, clearInactivePauseTimer, isActive, isVideo]);

    // âœ… [PERF] Memoize dynamic styles to prevent object reference churn
    const effectiveAspectRatio = isCarousel ? CAROUSEL_ASPECT_RATIO : aspectRatio;
    const mediaWrapperStyle = useMemo(() => [
        styles.mediaWrapper,
        { aspectRatio: effectiveAspectRatio }
    ], [effectiveAspectRatio]);

    // âœ… [PERF] Consolidated theme styles - 12 useMemos â†’ 1
    const isDarkTheme = colors.textPrimary.toLowerCase() === '#ffffff';
    const themedStyles = useMemo(() => {
        const cardBg = mixWithWhite(colors.background, 0.03);
        const borderClr = isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const shadow = shadowStyle({
            color: '#080A0F',
            offset: { width: 0, height: 6 },
            radius: 14,
            opacity: isDarkTheme ? 0.35 : 0.18,
            elevation: 6,
        });
        return {
            fullName: [styles.fullName, { color: '#FFFFFF' }],
            handle: [styles.handle, { color: 'rgba(255, 255, 255, 0.6)' }],
            description: [styles.description, { color: colors.textPrimary }],
            readMore: [styles.readMore, { color: colors.textSecondary }],
            displayName: [styles.displayName, { color: colors.textPrimary }],
            replayBadge: [styles.replayBadge, { backgroundColor: 'transparent' }],
            replayBadgeText: [styles.replayBadgeText, { color: isDarkTheme ? '#FFFFFF' : '#111111' }],
            replayMoreButton: [styles.replayMoreButton, { backgroundColor: '#FFFFFF' }],
            replayMoreText: [styles.replayMoreText, { color: '#080A0F' }],
            timeHint: [styles.timeHint, { color: colors.textSecondary }],
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

    // âœ… [PERF] Only truly dynamic values stay as separate useMemos
    const videoTimeText = useMemo(() => {
        if (videoDurationDisplaySec == null) return '';
        return `${formatPlaybackClock(videoProgressSec)} | ${formatPlaybackClock(videoDurationDisplaySec)}`;
    }, [videoDurationDisplaySec, videoProgressSec]);
    const commercialTagText = useMemo(() => {
        if (!item.isCommercial) return '';
        const commercialTypeLabel = item.commercialType ? item.commercialType : 'İş Birliği';
        return item.brandName ? `${commercialTypeLabel} | ${item.brandName}` : commercialTypeLabel;
    }, [item.brandName, item.commercialType, item.isCommercial]);

    const descriptionValue = item.description ?? '';
    const hasDescription = stripRichTextTags(descriptionValue).trim().length > 0;
    const descriptionVisibleLength = getRichTextVisibleLength(descriptionValue);
    const canToggleDescription = descriptionVisibleLength > DESCRIPTION_LIMIT;
    const handleToggleDescription = useCallback(() => {
        if (!canToggleDescription) return;
        setIsDescriptionExpanded((prev) => !prev);
    }, [canToggleDescription]);
    const displayDescription = useMemo(() => {
        if (isDescriptionExpanded || !canToggleDescription) return descriptionValue;
        return truncateRichTextByVisibleLength(descriptionValue, DESCRIPTION_LIMIT).text;
    }, [canToggleDescription, descriptionValue, isDescriptionExpanded]);
    const displayName = item.user?.username || item.user?.fullName || 'wizyclub';
    const relativeTime = useMemo(() => formatRelativeTime(item.createdAt), [item.createdAt]);
    const showDescriptionBlock = !disableDescription && hasDescription;
    const showTimeHint = !isCleanScreen && relativeTime.length > 0;

    const showFollowButton = !item.user?.isFollowing && item.user?.id !== currentUserId;
    const handleSubtitleContainerLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setSubtitleLayoutBounds((prev) => {
            if (Math.abs(prev.width - width) < 0.5 && Math.abs(prev.height - height) < 0.5) {
                return prev;
            }
            return { width, height };
        });
    }, []);
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
                        {/* âœ… USER HEADER - Top-left overlay on media */}
                        {!disableUserHeader && (
                            <View style={styles.mediaHeaderOverlay}>
                                <View style={styles.userInfoRow}>
                                    <Pressable onPress={handleProfilePress} hitSlop={8}>
                                        <StoryRingAvatar
                                            avatarUrl={avatarUrl}
                                            avatarSize={42}
                                            hasActiveStory={hasActiveStory}
                                            showViewedRingWhenNoStory={false}
                                            fallbackColor={colors.card}
                                        />
                                    </Pressable>
                                    <View style={styles.headerText}>
                                        <View style={styles.nameRow}>
                                            <Pressable onPress={handleProfilePress}>
                                                <Text style={themedStyles.fullName} numberOfLines={1}>
                                                    {item.user?.fullName || 'WizyClub User'}
                                                </Text>
                                            </Pressable>
                                            {item.user?.isVerified === true && (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={16} />
                                                </View>
                                            )}
                                            {taggedPeopleMeta}
                                        </View>
                                        <Pressable onPress={handleProfilePress} hitSlop={{ top: 0, bottom: 8, left: 8, right: 8 }}>
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
                            <GestureDetector gesture={moreTapGesture}>
                                <View style={styles.moreButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 24 }}>
                                    <MoreVertical pointerEvents="none" size={22} color="#FFFFFF" strokeWidth={2.4} />
                                </View>
                            </GestureDetector>
                        </View>
                        {locationIndicator}
                    </View>
                ) : (
                    <View
                        style={mediaWrapperStyle}
                        onLayout={handleSubtitleContainerLayout}
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
                            {shouldMountVideo && videoSource && !isRecycledRender ? (
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
                                    poster={!disableThumbnail && hasThumbnail ? { source: { uri: thumbnail }, resizeMode: 'cover' } : undefined}
                                    viewType={ViewType.TEXTURE}
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
                                <View style={styles.replayOverlay}>
                                    <View style={styles.replayButtonsContainer}>
                                        <Pressable
                                            style={themedStyles.replayMoreButton}
                                            onPress={handleWatchMoreClipsPress}
                                            hitSlop={8}
                                        >
                                            <VideosIcon width={18} height={18} />
                                            <View style={styles.replayMoreLabelRow}>
                                                <Text style={themedStyles.replayMoreText}>Daha fazla </Text>
                                                <Text style={styles.replayRainbowWord}>
                                                    <Text style={styles.rainbowC}>C</Text>
                                                    <Text style={styles.rainbowL}>l</Text>
                                                    <Text style={styles.rainbowI}>i</Text>
                                                    <Text style={styles.rainbowP}>p</Text>
                                                    <Text style={styles.rainbowS}>s</Text>
                                                </Text>
                                                <Text style={themedStyles.replayMoreText}> izle</Text>
                                            </View>
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
                                </View>
                            )}
                        </View>

                        {/* âœ… USER HEADER - Top-left overlay on media */}
                        {!disableUserHeader && (
                            <View style={styles.mediaHeaderOverlay}>
                                <View style={styles.userInfoRow}>
                                    <Pressable onPress={handleProfilePress} hitSlop={8}>
                                        <StoryRingAvatar
                                            avatarUrl={avatarUrl}
                                            avatarSize={42}
                                            hasActiveStory={hasActiveStory}
                                            showViewedRingWhenNoStory={false}
                                            fallbackColor={colors.card}
                                        />
                                    </Pressable>
                                    <View style={styles.headerText}>
                                        <View style={styles.nameRow}>
                                            <Pressable onPress={handleProfilePress}>
                                                <Text style={themedStyles.fullName} numberOfLines={1}>
                                                    {item.user?.fullName || 'WizyClub User'}
                                                </Text>
                                            </Pressable>
                                            {item.user?.isVerified === true && (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={16} />
                                                </View>
                                            )}
                                            {taggedPeopleMeta}
                                        </View>
                                        <Pressable onPress={handleProfilePress} hitSlop={{ top: 0, bottom: 8, left: 8, right: 8 }}>
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
                            <GestureDetector gesture={moreTapGesture}>
                                <View style={styles.moreButton} hitSlop={{ top: 16, bottom: 16, left: 16, right: 24 }}>
                                    <MoreVertical pointerEvents="none" size={22} color="#FFFFFF" strokeWidth={2.4} />
                                </View>
                            </GestureDetector>
                        </View>
                        {isVideo && !isCleanScreen && (
                            <View style={styles.mediaRightBottomActions} pointerEvents="box-none">
                                <Pressable
                                    style={styles.volumeButton}
                                    onPress={(event) => {
                                        event.stopPropagation?.();
                                        handleToggleMute();
                                    }}
                                    hitSlop={15}
                                >
                                    {isMuted ? (
                                        <VolumeX size={18} color="#FFFFFF" strokeWidth={1.6} />
                                    ) : (
                                        <Volume2 size={18} color="#FFFFFF" strokeWidth={1.6} />
                                    )}
                                </Pressable>
                            </View>
                        )}
                        {locationIndicator}
                        {isVideo && isActive && isVideoVisible && videoDurationDisplaySec != null && !disableTimeBadge && (
                            <View style={styles.mediaLeftBottomTime} pointerEvents="none">
                                <Text style={styles.videoTimeBadgeText}>{videoTimeText}</Text>
                            </View>
                        )}
                        {isVideo && isActive && !isCleanScreen && shouldShowSubtitle && activeSubtitleText && (
                            <View style={[styles.subtitleContainer, subtitlePositionStyle]} pointerEvents="none">
                                <View style={[styles.subtitleWrapper, subtitleWrapperDynamicStyle]}>
                                    <Text style={[styles.subtitleText, subtitleTextDynamicStyle]}>{formattedSubtitleText}</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )
            ) : null}

            {/* âœ… ACTIONS - Controlled by INF_DISABLE_ACTIONS */}
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
                    />
                    {!showDescriptionBlock && showTimeHint && (
                        <Text style={themedStyles.timeHint}>{relativeTime}</Text>
                    )}
                </View>
            )}
            {disableActions && !showDescriptionBlock && showTimeHint && (
                <View style={styles.cardContent}>
                    <Text style={themedStyles.timeHint}>{relativeTime}</Text>
                </View>
            )}

            {/* âœ… DESCRIPTION - Controlled by INF_DISABLE_DESCRIPTION */}
            {showDescriptionBlock && (
                <View style={styles.cardContent}>
                    <Text style={themedStyles.description} onPress={handleToggleDescription}>
                        <Text style={themedStyles.displayName} onPress={handleProfilePress}>{displayName}</Text>
                        {hasDescription ? ' ' : null}
                        {hasDescription ? <RichTextLabel text={displayDescription} onHashtagPress={onHashtagPress} /> : null}
                        {!isDescriptionExpanded && canToggleDescription && (
                            <Text style={themedStyles.readMore}>{'...daha fazla'}</Text>
                        )}
                        {isDescriptionExpanded && canToggleDescription && (
                            <Text style={themedStyles.readMore}>{' daha az'}</Text>
                        )}
                    </Text>
                    {showTimeHint && <Text style={themedStyles.timeHint}>{relativeTime}</Text>}
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
    taggedPeopleMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
        minHeight: 32,
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 6,
        marginVertical: -6,
        marginLeft: -6,
        marginRight: -6,
        zIndex: 1,
    },
    taggedPeopleMetaLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    taggedPeopleMetaAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taggedPeopleMetaAvatarFrame: {
        width: 24,
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.9)',
    },
    taggedPeopleMetaAvatarOverlap: {
        marginLeft: -8,
    },
    taggedPeopleMetaAvatarImage: {
        width: '100%',
        height: '100%',
    },
    taggedPeopleMetaAvatarFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.16)',
    },
    taggedPeopleMetaAvatarFallbackText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700',
    },
    taggedPeopleMetaPlusFrame: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#080A0F',
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
        fontSize: 14,
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
        top: 56,
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
        zIndex: 6,
    },
    mediaTopRightActions: {
        position: 'absolute',
        top: 12,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 6,
    },
    moreButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
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
        zIndex: 6,
    },
    mediaLeftBottomLocation: {
        position: 'absolute',
        left: 12,
        bottom: 12,
        alignItems: 'flex-start',
        zIndex: 6,
    },
    locationPill: {
        minHeight: 30,
        maxWidth: 180,
        paddingLeft: 8,
        paddingRight: 10,
        borderRadius: 15,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.50)',
        borderWidth: 0,
        borderColor: 'transparent',
        gap: 6,
    },
    locationLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1,
    },
    mediaLeftBottomTime: {
        position: 'absolute',
        right: 8,
        top: 50,
        zIndex: 6,
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
    replayOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 4,
    },
    replayButtonsContainer: {
        position: 'relative',
        alignItems: 'center',
        zIndex: 5,
        elevation: 5,
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
    replayMoreLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    replayRainbowWord: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    rainbowC: { color: '#FF3D00' },
    rainbowL: { color: '#FF9100' },
    rainbowI: { color: '#00C853' },
    rainbowP: { color: '#00B0FF' },
    rainbowS: { color: '#7C4DFF' },
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
    subtitleContainer: {
        position: 'absolute',
        left: SUBTITLE_SIDE_MARGIN,
        maxWidth: SUBTITLE_MAX_WIDTH,
        zIndex: 4,
    },
    subtitleContainerFallback: {
        bottom: 12,
    },
    subtitleWrapper: {
        borderRadius: SUBTITLE_BORDER_RADIUS,
    },
    subtitleText: {
        ...SUBTITLE_TEXT_BASE_STYLE,
    },
});
