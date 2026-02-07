import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Volume2, VolumeX, MoreVertical } from 'lucide-react-native';
import VideoPlayer, { type OnBufferData, type OnLoadStartData, type OnProgressData, type OnVideoErrorData } from 'react-native-video';
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
import { LogCode, logVideo } from '@/core/services/Logger';

const DESCRIPTION_LIMIT = 70;
const CARD_HORIZONTAL_PADDING = 16;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const CAROUSEL_ASPECT_RATIO = 3 / 4;
const FIRST_FRAME_FALLBACK_MS = 120;

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const isLocalFilePath = (value: string): boolean => value.startsWith('file://');

const getStableImageCacheKey = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.split('#')[0].split('?')[0];
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
    colors: ThemeColors;
    isActive: boolean;
    isPendingActive?: boolean;
    allowDecodePrewarm?: boolean;
    isMuted: boolean;
    isPaused: boolean;
    currentUserId?: string;
    onToggleMute: () => void;
    onOpen: (id: string, index: number) => void;
    onLike: (id: string) => void;
    onSave: (id: string) => void;
    onFollow: (id: string) => void;
    onShare: (id: string) => void;
    onShop: (id: string) => void;
    onMore?: (id: string) => void;
    onCarouselTouchStart?: () => void;
    onCarouselTouchEnd?: () => void;
    isMeasurement?: boolean;
    resolvedVideoSource?: string | null;
    networkType?: NetInfoStateType | null;
}

export const InfiniteFeedCard = React.memo(function InfiniteFeedCard({
    item,
    index,
    colors,
    isActive,
    isPendingActive = false,
    allowDecodePrewarm = false,
    isMuted,
    isPaused,
    currentUserId,
    onToggleMute,
    onOpen,
    onLike,
    onSave,
    onFollow,
    onShare,
    onShop,
    onMore,
    onCarouselTouchStart,
    onCarouselTouchEnd,
    isMeasurement = false,
    resolvedVideoSource = null,
    networkType = null,
}: InfiniteFeedCardProps) {
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [playbackSource, setPlaybackSource] = useState<string | null>(null);
    const [isVideoVisible, setIsVideoVisible] = useState(false);
    const [isDecodePrewarmDone, setIsDecodePrewarmDone] = useState(false);
    const firstFrameSeenRef = useRef(false);
    const bufferingStateRef = useRef(false);
    const readyFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ✅ FLAG CONTROLS
    const disableAllUI = FEED_FLAGS.INF_DISABLE_ALL_UI;
    const disableInlineVideo = FEED_FLAGS.INF_DISABLE_INLINE_VIDEO;
    const disableUserHeader = FEED_FLAGS.INF_DISABLE_USER_HEADER || disableAllUI;
    const disableActions = FEED_FLAGS.INF_DISABLE_ACTIONS || disableAllUI;
    const disableDescription = FEED_FLAGS.INF_DISABLE_DESCRIPTION || disableAllUI;
    const disableThumbnail = FEED_FLAGS.INF_DISABLE_THUMBNAIL;
    const disableCardStyle = FEED_FLAGS.INF_DISABLE_CARD_STYLE;

    useEffect(() => {
        setIsDescriptionExpanded(false);
    }, [item.id]);

    const clearReadyFallbackTimer = useCallback(() => {
        if (!readyFallbackTimerRef.current) return;
        clearTimeout(readyFallbackTimerRef.current);
        readyFallbackTimerRef.current = null;
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
    const shouldMountVideo = isVideo && (isActive || isPendingActive) && !disableInlineVideo && !isMeasurement;
    const shouldDecodePrewarm =
        allowDecodePrewarm &&
        isVideo &&
        isPendingActive &&
        !isActive &&
        !disableInlineVideo &&
        !isMeasurement &&
        !isDecodePrewarmDone;
    const shouldPlayVideo = isVideo && !disableInlineVideo && !isMeasurement && (
        (isActive && !isPaused) || shouldDecodePrewarm
    );
    const hasMedia = isCarousel || isVideo || Boolean(thumbnail);
    const hasThumbnail = Boolean(thumbnail);
    const shouldGateVideoVisibility = !disableThumbnail && hasThumbnail;
    const shouldShowBaseThumbnail = hasThumbnail && (!isVideo || !disableThumbnail);
    const aspectRatio = useMemo(() => {
        if (item.width && item.height && item.width > 0 && item.height > 0) {
            return item.width / item.height;
        }
        return 1;
    }, [item.width, item.height]);

    // ✅ [PERF] Stabilize callbacks to prevent InfiniteFeedActions re-renders
    const handleOpen = useCallback(() => {
        onOpen(item.id, index);
    }, [item.id, index, onOpen]);

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

    const handleShare = useCallback(() => {
        onShare(item.id);
    }, [item.id, onShare]);

    const handleShop = useCallback(() => {
        onShop(item.id);
    }, [item.id, onShop]);

    const handleMore = useCallback(() => {
        onMore?.(item.id);
    }, [item.id, onMore]);

    const revealVideoLayer = useCallback((reason: 'ready' | 'progress' | 'fallback') => {
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
        logVideo(LogCode.VIDEO_LOAD_SUCCESS, 'Infinite inline video first frame visible', {
            videoId: item.id,
            index,
            reason,
            sourceType: isLocalVideoSource ? 'file' : 'network',
        });
    }, [clearReadyFallbackTimer, index, isLocalVideoSource, item.id, shouldDecodePrewarm, shouldGateVideoVisibility]);

    const handleVideoLoadStart = useCallback((_event: OnLoadStartData) => {
        if (!shouldGateVideoVisibility) {
            firstFrameSeenRef.current = true;
            bufferingStateRef.current = false;
            clearReadyFallbackTimer();
            setIsVideoVisible(true);
            logVideo(LogCode.VIDEO_LOAD_START, 'Infinite inline video load start (visibility gate bypassed)', {
                videoId: item.id,
                index,
                sourceType: isLocalVideoSource ? 'file' : 'network',
            });
            return;
        }
        firstFrameSeenRef.current = false;
        bufferingStateRef.current = false;
        setIsVideoVisible(false);
        clearReadyFallbackTimer();
        readyFallbackTimerRef.current = setTimeout(() => {
            revealVideoLayer('fallback');
        }, FIRST_FRAME_FALLBACK_MS);
        logVideo(LogCode.VIDEO_LOAD_START, 'Infinite inline video load start', {
            videoId: item.id,
            index,
            sourceType: isLocalVideoSource ? 'file' : 'network',
        });
    }, [clearReadyFallbackTimer, index, isLocalVideoSource, item.id, revealVideoLayer, shouldGateVideoVisibility]);

    const handleVideoReadyForDisplay = useCallback(() => {
        revealVideoLayer('ready');
    }, [revealVideoLayer]);

    const handleVideoProgress = useCallback((event: OnProgressData) => {
        if (!firstFrameSeenRef.current && event.currentTime >= 0) {
            revealVideoLayer('progress');
        }
    }, [revealVideoLayer]);

    const handleVideoBuffer = useCallback((event: OnBufferData) => {
        if (event.isBuffering === bufferingStateRef.current) return;
        bufferingStateRef.current = event.isBuffering;
        logVideo(event.isBuffering ? LogCode.VIDEO_BUFFER_START : LogCode.VIDEO_BUFFER_END, 'Infinite inline video buffer state changed', {
            videoId: item.id,
            index,
            isBuffering: event.isBuffering,
        });
    }, [index, item.id]);

    const handleVideoError = useCallback((error: OnVideoErrorData) => {
        clearReadyFallbackTimer();
        firstFrameSeenRef.current = false;
        setIsVideoVisible(false);
        logVideo(LogCode.VIDEO_LOAD_ERROR, 'Infinite inline video load error', {
            videoId: item.id,
            index,
            sourceType: isLocalVideoSource ? 'file' : 'network',
            error,
        });
    }, [clearReadyFallbackTimer, index, isLocalVideoSource, item.id]);

    useEffect(() => {
        const initialShouldGate = !disableThumbnail && hasThumbnail;
        clearReadyFallbackTimer();
        firstFrameSeenRef.current = !initialShouldGate;
        bufferingStateRef.current = false;
        setIsVideoVisible(!initialShouldGate);
        setIsDecodePrewarmDone(false);
        setPlaybackSource(null);
    }, [clearReadyFallbackTimer, disableThumbnail, hasThumbnail, item.id]);

    useEffect(() => {
        // Reset only when the card is completely out of warm/active window.
        if (!isPendingActive && !isActive) {
            setIsDecodePrewarmDone(false);
        }
    }, [isActive, isPendingActive]);

    useEffect(() => () => {
        clearReadyFallbackTimer();
    }, [clearReadyFallbackTimer]);

    useEffect(() => {
        if (!shouldMountVideo) {
            clearReadyFallbackTimer();
            firstFrameSeenRef.current = !shouldGateVideoVisibility;
            bufferingStateRef.current = false;
            setIsVideoVisible(!shouldGateVideoVisibility);
            // Keep playbackSource so re-mount can reuse the cached path instantly
            // instead of re-resolving from network. Reset only happens on item.id change.
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
    }, [clearReadyFallbackTimer, shouldGateVideoVisibility, shouldMountVideo, videoUrl]);

    useEffect(() => {
        if (!shouldMountVideo) return;
        if (!shouldGateVideoVisibility) {
            firstFrameSeenRef.current = true;
            bufferingStateRef.current = false;
            clearReadyFallbackTimer();
            setIsVideoVisible(true);
            return;
        }
        firstFrameSeenRef.current = false;
        bufferingStateRef.current = false;
        setIsVideoVisible(false);
        clearReadyFallbackTimer();
        readyFallbackTimerRef.current = setTimeout(() => {
            revealVideoLayer('fallback');
        }, FIRST_FRAME_FALLBACK_MS);
    }, [clearReadyFallbackTimer, revealVideoLayer, shouldGateVideoVisibility, shouldMountVideo]);

    useEffect(() => {
        if (!isVideo || !isActive || !isDecodePrewarmDone) return;
        firstFrameSeenRef.current = true;
        bufferingStateRef.current = false;
        clearReadyFallbackTimer();
        setIsVideoVisible(true);
    }, [clearReadyFallbackTimer, isActive, isDecodePrewarmDone, isVideo]);

    // ✅ [PERF] Memoize dynamic styles to prevent object reference churn
    const effectiveAspectRatio = isCarousel ? CAROUSEL_ASPECT_RATIO : aspectRatio;
    const mediaWrapperStyle = useMemo(() => [
        styles.mediaWrapper,
        { aspectRatio: effectiveAspectRatio }
    ], [effectiveAspectRatio]);

    const fullNameStyle = useMemo(() => [
        styles.fullName,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);

    const handleStyle = useMemo(() => [
        styles.handle,
        { color: colors.textSecondary }
    ], [colors.textSecondary]);

    const descriptionTextStyle = useMemo(() => [
        styles.description,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);

    const readMoreTextStyle = useMemo(() => [
        styles.readMore,
        { color: colors.textSecondary }
    ], [colors.textSecondary]);

    const displayNameTextStyle = useMemo(() => [
        styles.displayName,
        { color: colors.textPrimary }
    ], [colors.textPrimary]);
    const isDarkTheme = colors.textPrimary.toLowerCase() === '#ffffff';
    const cardBackground = useMemo(() => mixWithWhite(colors.background, 0.03), [colors.background]);
    const cardBorderColor = useMemo(
        () => (isDarkTheme ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
        [isDarkTheme]
    );
    const cardShadowStyle = useMemo(() => shadowStyle({
        color: '#000000',
        offset: { width: 0, height: 6 },
        radius: 14,
        opacity: isDarkTheme ? 0.35 : 0.18,
        elevation: 6,
    }), [isDarkTheme]);
    const cardOuterStyle = useMemo(() => [
        styles.card,
        disableCardStyle ? styles.cardEdgeToEdge : null,
        disableCardStyle ? null : cardShadowStyle,
    ], [cardShadowStyle, disableCardStyle]);

    const cardInnerStyle = useMemo(() => [
        styles.cardInner,
        disableCardStyle ? styles.cardInnerEdgeToEdge : null,
        {
            backgroundColor: disableCardStyle ? 'transparent' : cardBackground,
            borderColor: disableCardStyle ? 'transparent' : cardBorderColor
        }
    ], [cardBackground, cardBorderColor, disableCardStyle]);
    const mediaPlaceholderStyle = useMemo(() => [
        styles.mediaPlaceholder,
        { backgroundColor: mixWithWhite(colors.background, isDarkTheme ? 0.08 : 0.16) },
    ], [colors.background, isDarkTheme]);

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
    const showTimeHint = relativeTime.length > 0;

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
                                    <View style={styles.headerText}>
                                        <View style={styles.nameRow}>
                                            <Text style={fullNameStyle} numberOfLines={1}>
                                                {item.user?.fullName || 'WizyClub User'}
                                            </Text>
                                            {item.user?.isVerified === true && (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={16} />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={handleStyle} numberOfLines={1}>
                                            @{item.user?.username || 'wizyclub'}
                                        </Text>
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
                        onPress={handleOpen}
                    >
                        <View style={styles.videoContainer}>
                            {shouldShowBaseThumbnail ? (
                                <Image
                                    source={{ uri: thumbnail, cacheKey: thumbnailCacheKey }}
                                    style={styles.media}
                                    contentFit="cover"
                                    transition={0}
                                    cachePolicy="memory-disk"
                                />
                            ) : (
                                <View style={mediaPlaceholderStyle} />
                            )}
                            {shouldMountVideo && videoSource ? (
                                <VideoPlayer
                                    source={videoSource as any}
                                    style={[
                                        styles.media,
                                        styles.videoOverlay,
                                        (!isActive || (shouldGateVideoVisibility && !isVideoVisible)) && styles.videoHidden,
                                    ]}
                                    resizeMode="contain"
                                    repeat={true}
                                    paused={!shouldPlayVideo}
                                    muted={isMuted || shouldDecodePrewarm}
                                    playInBackground={false}
                                    playWhenInactive={false}
                                    progressUpdateInterval={100}
                                    onLoadStart={handleVideoLoadStart}
                                    onReadyForDisplay={handleVideoReadyForDisplay}
                                    onProgress={handleVideoProgress}
                                    onBuffer={handleVideoBuffer}
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
                        </View>

                        {/* ✅ USER HEADER - Top-left overlay on media */}
                        {!disableUserHeader && (
                            <View style={styles.mediaHeaderOverlay}>
                                <View style={styles.userInfoRow}>
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
                                    <View style={styles.headerText}>
                                        <View style={styles.nameRow}>
                                            <Text style={fullNameStyle} numberOfLines={1}>
                                                {item.user?.fullName || 'WizyClub User'}
                                            </Text>
                                            {item.user?.isVerified === true && (
                                                <View style={styles.verifiedBadge}>
                                                    <VerifiedBadge size={16} />
                                                </View>
                                            )}
                                        </View>
                                        <Text style={handleStyle} numberOfLines={1}>
                                            @{item.user?.username || 'wizyclub'}
                                        </Text>
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

                        {isVideo && (
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
                        shopsCount={item.shopsCount || 0}
                        isLiked={item.isLiked}
                        isSaved={item.isSaved}
                        showShop={!!item.brandUrl}
                        onLike={handleLike}
                        onSave={handleSave}
                        onShare={handleShare}
                        onShop={handleShop}
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
                    <Text style={descriptionTextStyle} onPress={handleToggleDescription}>
                        <Text style={displayNameTextStyle}>{displayName}</Text>
                        {hasDescription ? (
                            <>
                                {' '}
                                {truncatedDescription}
                                {!isDescriptionExpanded && canToggleDescription && (
                                    <Text
                                        style={readMoreTextStyle}
                                    >
                                        {'...daha fazla'}
                                    </Text>
                                )}
                                {isDescriptionExpanded && canToggleDescription && (
                                    <Text
                                        style={readMoreTextStyle}
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
        <View style={cardOuterStyle}>
            <View style={cardInnerStyle}>
                {isCarousel ? (
                    cardBody
                ) : (
                    <Pressable onPress={handleOpen}>
                        {cardBody}
                    </Pressable>
                )}
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
        fontWeight: '300',
    },
    readMore: {
        fontSize: 14,
        fontWeight: '600',
    },
    displayName: {
        fontSize: 14,
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
    },
    mediaTopRightActions: {
        position: 'absolute',
        top: 12,
        right: 4,
        flexDirection: 'row',
        alignItems: 'center',
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
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
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
});
