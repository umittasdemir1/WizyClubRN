import React from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Animated, Image, Text, Easing, useWindowDimensions } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { User } from '../../../domain/entities/User';
import { logError, LogCode } from '@/core/services/Logger';
import { shadowStyle } from '@/core/utils/shadow';

const ensureAbsoluteUrl = (rawUrl: string): string => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (/^[a-zA-Z]+:\/\//.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
};

const extractSocialUsername = (
    platform: 'facebook' | 'instagram' | 'tiktok' | 'x' | 'youtube' | 'website',
    rawUrl?: string
): string | null => {
    if (!rawUrl) return null;

    try {
        const parsed = new URL(ensureAbsoluteUrl(rawUrl));
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
        const segments = parsed.pathname.split('/').filter(Boolean).map((segment) => decodeURIComponent(segment));
        const first = segments[0];

        if (platform === 'website') {
            return host || null;
        }

        if (!first) return null;

        if (platform === 'instagram' && host.includes('instagram.com')) {
            const blocked = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts']);
            return blocked.has(first.toLowerCase()) ? null : first.replace(/^@/, '');
        }

        if (platform === 'x' && (host === 'x.com' || host.endsWith('.x.com') || host === 'twitter.com' || host.endsWith('.twitter.com'))) {
            const blocked = new Set(['home', 'explore', 'i', 'search', 'messages', 'settings', 'intent', 'share', 'compose', 'login', 'signup']);
            return blocked.has(first.toLowerCase()) ? null : first.replace(/^@/, '');
        }

        if (platform === 'tiktok' && (host === 'tiktok.com' || host.endsWith('.tiktok.com'))) {
            const blocked = new Set(['foryou', 'discover', 'explore', 'tag', 'music', 'login']);
            if (blocked.has(first.toLowerCase())) return null;
            return first.startsWith('@') ? first.replace(/^@/, '') : null;
        }

        if (platform === 'youtube' && host.includes('youtube.com')) {
            return first.startsWith('@') ? first.replace(/^@/, '') : null;
        }

        if (platform === 'facebook' && (host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host.endsWith('.fb.com'))) {
            const blocked = new Set(['profile.php', 'groups', 'watch', 'reel', 'reels', 'share', 'sharer.php', 'story.php', 'photo.php', 'photos']);
            return blocked.has(first.toLowerCase()) ? null : first.replace(/^@/, '');
        }
    } catch {
        return null;
    }

    return null;
};

const isFacebookUrl = (rawUrl?: string): boolean => {
    if (!rawUrl) return false;
    try {
        const parsed = new URL(ensureAbsoluteUrl(rawUrl));
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
        return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host.endsWith('.fb.com');
    } catch {
        return false;
    }
};

const formatPanelUsername = (
    platform: 'facebook' | 'instagram' | 'tiktok' | 'x' | 'youtube' | 'website',
    username?: string | null
): string | null => {
    if (!username) return null;
    const label = platform === 'facebook' || platform === 'website' ? username : `@${username}`;
    return label;
};

const USERNAME_VISIBLE_CHARS = 4;
const USERNAME_VIEWPORT_WIDTH = USERNAME_VISIBLE_CHARS * 6 + 4;
const USERNAME_EDGE_FADE_WIDTH = 2;
const USERNAME_TEXT_SIDE_PADDING = 0;
const USERNAME_SCROLL_CYCLE_MS = 5200;
const USERNAME_SCROLL_LOOP_DELAY_MS = 350;
const LINK_PANEL_ENTRY_GAP = 6;
const LINK_PANEL_ICON_BUTTON_SIZE = 28;
const LINK_PANEL_USERNAME_SLOT_WIDTH = USERNAME_VIEWPORT_WIDTH;
const LINK_PANEL_ENTRY_WIDTH =
    LINK_PANEL_ICON_BUTTON_SIZE +
    LINK_PANEL_ENTRY_GAP +
    LINK_PANEL_USERNAME_SLOT_WIDTH;

interface ScrollingUsernameProps {
    label: string;
    syncProgress: Animated.Value;
}

const ScrollingUsername: React.FC<ScrollingUsernameProps> = ({ label, syncProgress }) => {
    const [measuredContentWidth, setMeasuredContentWidth] = React.useState(0);
    const estimatedContentWidth = React.useMemo(
        () => Math.max(0, Math.round(label.length * 7.4) + 6),
        [label]
    );
    const scrollContentWidth = Math.max(measuredContentWidth, estimatedContentWidth);
    const trackViewportWidth = USERNAME_VIEWPORT_WIDTH - USERNAME_TEXT_SIDE_PADDING * 2;
    const shouldScroll = Boolean(label) && scrollContentWidth > trackViewportWidth;
    const syncedTranslateX = React.useMemo(
        () =>
            syncProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [trackViewportWidth, -scrollContentWidth],
                extrapolate: 'clamp',
            }),
        [scrollContentWidth, syncProgress, trackViewportWidth]
    );

    return (
        <View style={styles.linkPanelUsernameViewport}>
            <Animated.View
                style={[
                    styles.linkPanelUsernameTrack,
                    scrollContentWidth > 0 ? { width: scrollContentWidth } : null,
                    shouldScroll ? { transform: [{ translateX: syncedTranslateX }] } : null,
                ]}
            >
                <Text style={styles.linkPanelUsername} numberOfLines={1} ellipsizeMode="clip">
                    {label}
                </Text>
            </Animated.View>
            <Text
                style={[styles.linkPanelUsername, styles.linkPanelUsernameMeasure]}
                numberOfLines={1}
                onLayout={(event) => {
                    const next = event.nativeEvent.layout.width;
                    setMeasuredContentWidth((prev) => (Math.abs(prev - next) < 0.5 ? prev : next));
                }}
            >
                {label}
            </Text>
            <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.72)', 'rgba(255,255,255,0)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.linkPanelUsernameFade, styles.linkPanelUsernameFadeLeft]}
            />
            <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.72)']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={[styles.linkPanelUsernameFade, styles.linkPanelUsernameFadeRight]}
            />
        </View>
    );
};

interface SocialTagsProps {
    isDark: boolean;
    user?: User | null;
    onlyLink?: boolean;
    panelExpandedWidth?: number;
    panelDirection?: 'left' | 'down';
    panelExpandedHeight?: number;
    leftPanelRightOffset?: number;
}

export const SocialTags: React.FC<SocialTagsProps> = ({
    isDark,
    user,
    onlyLink = false,
    panelExpandedWidth = 170,
    panelDirection = 'left',
    panelExpandedHeight,
    leftPanelRightOffset = 36,
}) => {
    const iconColor = '#000'; // Dark icons look better on the 3D white glass background
    const linkTriggerIconColor = isDark ? '#FFFFFF' : '#080A0F';
    const borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    const panelAnim = React.useRef(new Animated.Value(0)).current;
    const syncedUsernameProgress = React.useRef(new Animated.Value(0)).current;
    const syncedUsernameAnimationRef = React.useRef<Animated.CompositeAnimation | null>(null);
    const fixedLinkWrapperRef = React.useRef<View>(null);
    const { width: windowWidth } = useWindowDimensions();
    const [isLinkPanelOpen, setIsLinkPanelOpen] = React.useState(false);
    const [autoLeftPanelRightOffset, setAutoLeftPanelRightOffset] = React.useState(leftPanelRightOffset);
    const isDownPanel = panelDirection === 'down';
    const shouldAutoScreenAlign = !isDownPanel && onlyLink;

    const getIconConfig = (platform: string) => {
        switch (platform) {
            case 'Instagram':
                return { name: 'instagram' };
            case 'TikTok':
                return { name: 'tiktok' };
            case 'Youtube':
                return { name: 'youtube' };
            case 'X':
                return { name: 'x-twitter' };
            default:
                return { name: 'link' };
        }
    };

    const links = [
        { platform: 'Instagram', url: user?.instagramUrl },
        { platform: 'TikTok', url: user?.tiktokUrl },
        { platform: 'Youtube', url: user?.youtubeUrl },
        { platform: 'X', url: user?.xUrl },
        { platform: 'Website', url: user?.website },
    ].filter(link => link.url && link.url.trim() !== '');

    const openLink = async (url: string | undefined) => {
        let targetUrl = url?.trim() || '';
        if (!targetUrl) return;

        try {
            // If no protocol is present, basic check for common patterns or just prepend https://
            if (!targetUrl.match(/^[a-zA-Z]+:\/\//)) {
                targetUrl = `https://${targetUrl}`;
            }

            const supported = await Linking.canOpenURL(targetUrl);
            if (supported) {
                await Linking.openURL(targetUrl);
            } else {
                logError(LogCode.ERROR_NAVIGATION, 'Cannot open URL - unsupported protocol', { url: targetUrl });
            }
        } catch (error) {
            logError(LogCode.ERROR_NAVIGATION, 'Error opening URL', { error, url: targetUrl });
        }
    };

    const visibleLinks = onlyLink ? [] : links;
    const facebookUrl = user?.facebookUrl || (isFacebookUrl(user?.website) ? user?.website : undefined);
    const websiteUrl = isFacebookUrl(user?.website) ? undefined : user?.website;
    const panelLinks = [
        {
            key: 'facebook',
            platform: 'facebook' as const,
            url: facebookUrl,
            iconName: 'facebook-f',
            color: '#1877F2',
            size: 18,
            username: extractSocialUsername('facebook', facebookUrl),
        },
        {
            key: 'instagram',
            platform: 'instagram' as const,
            url: user?.instagramUrl,
            source: require('../../../../assets/social/platforms/instagram.png'),
            size: 25,
            username: extractSocialUsername('instagram', user?.instagramUrl),
        },
        {
            key: 'tiktok',
            platform: 'tiktok' as const,
            url: user?.tiktokUrl,
            source: require('../../../../assets/social/platforms/tiktok.png'),
            size: 25,
            username: extractSocialUsername('tiktok', user?.tiktokUrl),
        },
        {
            key: 'x',
            platform: 'x' as const,
            url: user?.xUrl,
            source: require('../../../../assets/social/platforms/x.png'),
            size: 23,
            username: extractSocialUsername('x', user?.xUrl),
        },
        {
            key: 'youtube',
            platform: 'youtube' as const,
            url: user?.youtubeUrl,
            source: require('../../../../assets/social/platforms/youtube.png'),
            size: 35,
            username: extractSocialUsername('youtube', user?.youtubeUrl),
        },
        {
            key: 'website',
            platform: 'website' as const,
            url: websiteUrl,
            iconName: 'link',
            color: '#080A0F',
            size: 21,
            username: extractSocialUsername('website', websiteUrl),
        },
    ].filter((link) => link.url && link.url.trim() !== '');

    const recalculateLeftPanelOffset = React.useCallback(() => {
        if (!shouldAutoScreenAlign) return;

        fixedLinkWrapperRef.current?.measureInWindow((x, _y, width) => {
            const rightInset = Math.max(0, windowWidth - (x + width));
            const nextOffset = -rightInset;
            setAutoLeftPanelRightOffset(prev => (Math.abs(prev - nextOffset) < 0.5 ? prev : nextOffset));
        });
    }, [shouldAutoScreenAlign, windowWidth]);

    React.useEffect(() => {
        if (!shouldAutoScreenAlign) return;

        const frame = requestAnimationFrame(() => {
            recalculateLeftPanelOffset();
        });

        return () => cancelAnimationFrame(frame);
    }, [shouldAutoScreenAlign, recalculateLeftPanelOffset]);

    const stopSyncedUsernameScroll = React.useCallback(() => {
        syncedUsernameAnimationRef.current?.stop();
        syncedUsernameAnimationRef.current = null;
        syncedUsernameProgress.stopAnimation();
        syncedUsernameProgress.setValue(0);
    }, [syncedUsernameProgress]);

    React.useEffect(() => {
        stopSyncedUsernameScroll();

        if (!isLinkPanelOpen) return;

        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(syncedUsernameProgress, {
                    toValue: 1,
                    duration: USERNAME_SCROLL_CYCLE_MS,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.delay(USERNAME_SCROLL_LOOP_DELAY_MS),
                Animated.timing(syncedUsernameProgress, {
                    toValue: 0,
                    duration: 0,
                    useNativeDriver: true,
                }),
            ])
        );

        syncedUsernameAnimationRef.current = animation;
        animation.start();

        return () => {
            animation.stop();
            syncedUsernameAnimationRef.current = null;
        };
    }, [isLinkPanelOpen, stopSyncedUsernameScroll, syncedUsernameProgress]);

    const effectivePanelExtent = isDownPanel
        ? (panelExpandedHeight ?? Math.max(0, panelLinks.length * 30 + 10))
        : (shouldAutoScreenAlign ? windowWidth : panelExpandedWidth);

    const panelContentOpacity = panelAnim.interpolate({
        inputRange: [0, 0.4, 1],
        outputRange: [0, 0.2, 1],
        extrapolate: 'clamp',
    });

    const panelTranslateY = panelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-12, 0],
        extrapolate: 'clamp',
    });

    const openLinkPanel = () => {
        if (isLinkPanelOpen) return;
        recalculateLeftPanelOffset();
        setIsLinkPanelOpen(true);
        panelAnim.setValue(0);
        Animated.timing(panelAnim, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
        }).start();
    };

    const closeLinkPanel = () => {
        if (!isLinkPanelOpen) return;
        stopSyncedUsernameScroll();
        Animated.timing(panelAnim, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) {
                setIsLinkPanelOpen(false);
            }
        });
    };

    const toggleLinkPanel = () => {
        if (isLinkPanelOpen) {
            closeLinkPanel();
            return;
        }
        openLinkPanel();
    };

    const panelLinkNodes = panelLinks.map((link) => {
        const usernameLabel = formatPanelUsername(link.platform, link.username);

        return (
            <View key={link.key} style={styles.linkPanelEntry}>
                <TouchableOpacity
                    onPress={() => openLink(link.url)}
                    activeOpacity={0.7}
                    style={styles.linkPanelIconButton}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                    {link.source ? (
                        <Image
                            source={link.source}
                            style={[
                                styles.linkPanelIcon,
                                { width: link.size, height: link.size },
                            ]}
                        />
                    ) : (
                        <FontAwesome6
                            name={link.iconName as any}
                            size={link.size}
                            color={link.color || '#111111'}
                        />
                    )}
                </TouchableOpacity>
                <View style={styles.linkPanelUsernameSlot}>
                    {usernameLabel ? (
                        <TouchableOpacity
                            onPress={() => openLink(link.url)}
                            activeOpacity={0.7}
                            style={styles.linkPanelUsernameButton}
                            hitSlop={{ top: 6, bottom: 6, left: 4, right: 8 }}
                        >
                            <ScrollingUsername
                                label={usernameLabel}
                                syncProgress={syncedUsernameProgress}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>
        );
    });

    return (
        <View style={styles.container}>
            {visibleLinks.map((link, index) => {
                const iconConfig = getIconConfig(link.platform);

                return (
                    <TouchableOpacity
                        key={index}
                        style={[styles.socialTag, { borderColor }]}
                        onPress={() => openLink(link.url)}
                        activeOpacity={0.7}
                    >
                        <FontAwesome6
                            name={iconConfig.name}
                            size={18}
                            color={iconColor}
                        />
                    </TouchableOpacity>
                );
            })}

            <View
                ref={fixedLinkWrapperRef}
                onLayout={recalculateLeftPanelOffset}
                style={[styles.fixedLinkWrapper, onlyLink && styles.fixedLinkWrapperPillAligned]}
            >
                {isLinkPanelOpen && (
                    <Animated.View
                        style={[
                            styles.linkPanelBase,
                            isDownPanel ? styles.linkPanelDown : styles.linkPanelLeft,
                            !isDownPanel && onlyLink && styles.linkPanelLeftPillAligned,
                            {
                                ...(!isDownPanel ? { right: shouldAutoScreenAlign ? autoLeftPanelRightOffset : leftPanelRightOffset } : null),
                                ...(isDownPanel ? { height: effectivePanelExtent } : { width: effectivePanelExtent }),
                                opacity: panelAnim,
                                transform: [{ translateY: panelTranslateY }],
                            },
                        ]}
                        pointerEvents="auto"
                    >
                    <Animated.View
                        style={[
                            styles.linkPanelContent,
                            isDownPanel ? styles.linkPanelContentDown : styles.linkPanelContentInline,
                            { opacity: panelContentOpacity },
                        ]}
                    >
                        {isDownPanel ? panelLinkNodes : <View style={styles.linkPanelInlineItems}>{panelLinkNodes}</View>}
                            <TouchableOpacity style={styles.linkPanelCloseButton} onPress={closeLinkPanel} activeOpacity={0.7}>
                                <X size={24} color="#111111" strokeWidth={2} />
                            </TouchableOpacity>
                        </Animated.View>
                    </Animated.View>
                )}

                <TouchableOpacity
                    style={[
                        styles.linkButton,
                        styles.linkButtonBare,
                    ]}
                    onPress={toggleLinkPanel}
                    activeOpacity={0.7}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
                >
                    <FontAwesome6
                        name="link"
                        size={18}
                        color={linkTriggerIconColor}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    socialTag: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff', // Solid white for the 3D effect
        borderWidth: 1,
        // 3D Glass Effect (Same as brand logos)
        ...shadowStyle({ color: '#000', offset: { width: 0, height: 2 }, opacity: 0.2, radius: 3, elevation: 4 }),
    },
    fixedLinkWrapper: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    fixedLinkWrapperPillAligned: {
        width: 36,
        height: 36,
    },
    linkButton: {
        zIndex: 10,
    },
    linkButtonBare: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderWidth: 0,
        shadowOpacity: 0,
        elevation: 0,
    },
    linkPanelBase: {
        borderRadius: 0,
        borderWidth: 1,
        borderColor: 'transparent',
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        justifyContent: 'center',
        zIndex: 20,
    },
    linkPanelLeft: {
        position: 'absolute',
        height: 32,
    },
    linkPanelLeftPillAligned: {
        height: 36,
    },
    linkPanelDown: {
        position: 'absolute',
        top: 40,
        right: 0,
        width: 36,
    },
    linkPanelContent: {
        ...StyleSheet.absoluteFillObject,
    },
    linkPanelContentInline: {
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 12,
        paddingRight: 56,
    },
    linkPanelInlineItems: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 6,
        alignSelf: 'flex-start',
    },
    linkPanelContentDown: {
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        paddingLeft: 6,
        paddingRight: 6,
        paddingVertical: 6,
        gap: 4,
    },
    linkPanelEntry: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: LINK_PANEL_ENTRY_GAP,
        width: LINK_PANEL_ENTRY_WIDTH,
    },
    linkPanelIcon: {
        width: 20,
        height: 20,
    },
    linkPanelIconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: LINK_PANEL_ICON_BUTTON_SIZE,
        height: LINK_PANEL_ICON_BUTTON_SIZE,
    },
    linkPanelUsernameSlot: {
        width: LINK_PANEL_USERNAME_SLOT_WIDTH,
    },
    linkPanelUsernameButton: {
        width: '100%',
        justifyContent: 'center',
    },
    linkPanelUsername: {
        fontSize: 11,
        fontWeight: '600',
        color: '#111111',
    },
    linkPanelUsernameMeasure: {
        position: 'absolute',
        left: -1000,
        top: -1000,
        opacity: 0,
    },
    linkPanelUsernameViewport: {
        width: USERNAME_VIEWPORT_WIDTH,
        overflow: 'hidden',
        justifyContent: 'center',
        position: 'relative',
        paddingHorizontal: USERNAME_TEXT_SIDE_PADDING,
    },
    linkPanelUsernameTrack: {
        alignSelf: 'flex-start',
    },
    linkPanelUsernameFade: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: USERNAME_EDGE_FADE_WIDTH,
        zIndex: 2,
    },
    linkPanelUsernameFadeLeft: {
        left: 0,
    },
    linkPanelUsernameFadeRight: {
        right: 0,
    },
    linkPanelCloseButton: {
        position: 'absolute',
        right: 10,
        top: 0,
        bottom: 0,
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    socialTagPillAligned: {
        height: 36,
        width: 36,
        borderRadius: 8,
    },
});
