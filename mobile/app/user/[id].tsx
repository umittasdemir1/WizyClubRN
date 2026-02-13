import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
  LayoutChangeEvent,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import PagerView from '../../src/presentation/components/shared/PagerView';
import type {
  PageScrollStateChangedNativeEvent,
  PagerViewOnPageScrollEvent,
  PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import Video from 'react-native-video';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { SystemBars } from 'react-native-edge-to-edge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { ProfileStats } from '../../src/presentation/components/profile/ProfileStats';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { SocialTags } from '../../src/presentation/components/profile/SocialTags';
import { MediaGrid } from '../../src/presentation/components/shared/MediaGrid';
import { BioBottomSheet } from '../../src/presentation/components/profile/BioBottomSheet';
import { ChevronLeft, MoreVertical, Store } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LikeIcon from '../../assets/icons/like.svg';
import ShareIcon from '../../assets/icons/share.svg';
import VideosTabSvgIcon from '../../assets/icons/videos.svg';
import DarkVideosTabSvgIcon from '../../assets/icons/darkvideos.svg';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useProfile } from '../../src/presentation/hooks/useProfile';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';
import { UserOptionsModal } from '../../src/presentation/components/profile/UserOptionsModal';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { InteractionRepositoryImpl } from '../../src/data/repositories/InteractionRepositoryImpl';
import { ToggleFollowUseCase } from '../../src/domain/usecases/ToggleFollowUseCase';
import { useSocialStore } from '../../src/presentation/store/useSocialStore';
import { VerifiedBadge } from '../../src/presentation/components/shared/VerifiedBadge';
import { isFeedVideoItem } from '../../src/presentation/components/poolFeed/utils/PoolFeedUtils';
import { logSocial, logError, logUI, LogCode } from '@/core/services/Logger';
import { shadowStyle } from '@/core/utils/shadow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INNER_TAB_ICON_SIZE = 26;
const INNER_TAB_ICON_ACTIVE_SIZE = 28;

// SVG Icons
const GridIcon = ({ color, size = INNER_TAB_ICON_SIZE }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill={color}>
    <Path d="M240-160q-33 0-56.5-23.5T160-240q0-33 23.5-56.5T240-320q33 0 56.5 23.5T320-240q0 33-23.5 56.5T240-160Zm240 0q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm240 0q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160ZM240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400ZM240-640q-33 0-56.5-23.5T160-720q0-33 23.5-56.5T240-800q33 0 56.5 23.5T320-720q0 33-23.5 56.5T240-640Zm240 0q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Zm240 0q-33 0-56.5-23.5T640-720q0-33 23.5-56.5T720-800q33 0 56.5 23.5T800-720q0 33-23.5 56.5T720-640Z" />
  </Svg>
);

const VideoIcon = ({
  color,
  size = INNER_TAB_ICON_SIZE,
  IconComponent = VideosTabSvgIcon,
}: {
  color: string;
  size?: number;
  IconComponent?: any;
}) => (
  <IconComponent width={size} height={size} color={color} />
);

const StoreTabIcon = ({ color, size = INNER_TAB_ICON_SIZE }: { color: string; size?: number }) => (
  <Store size={size} color={color} strokeWidth={1.7} />
);

// Animated IconButton
const AnimatedIconButton = ({
  icon: Icon,
  onPress,
  isActive,
  activeColor,
  inactiveColor,
  size = 14,
  outlined,
  strokeWidth = 2,
}: {
  icon: any;
  onPress: () => void;
  isActive?: boolean;
  activeColor?: string;
  inactiveColor: string;
  size?: number;
  outlined?: boolean;
  strokeWidth?: number;
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withTiming(1.3, { duration: 100, easing: Easing.out(Easing.ease) }),
      withTiming(0.9, { duration: 100, easing: Easing.inOut(Easing.ease) }),
      withTiming(1.15, { duration: 100, easing: Easing.inOut(Easing.ease) }),
      withTiming(1, { duration: 100, easing: Easing.out(Easing.ease) })
    );
    onPress();
  };

  const visibleColor = isActive && activeColor ? activeColor : inactiveColor;

  const iconProps = outlined
    ? { color: "transparent", stroke: visibleColor, strokeWidth: strokeWidth }
    : { color: visibleColor, stroke: "none" };

  return (
    <Pressable onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={animatedStyle}>
        <Icon width={size} height={size} {...iconProps} />
      </Animated.View>
    </Pressable>
  );
};

// Preview Modal Component
const PreviewModal = ({ item, onClose }: { item: { id: string; thumbnail: string; videoUrl: string }; onClose: () => void }) => {
  return (
    <Pressable style={styles.previewOverlay} onPress={onClose}>
      <View style={styles.previewCard}>
        <Video
          source={{ uri: item.videoUrl }}
          style={styles.previewVideo}
          resizeMode="cover"
          repeat={true}
          paused={false}
          muted={true}
        />
      </View>
    </Pressable>
  );
};

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { isDark } = useThemeStore();
  const ThemedVideosTabSvgIcon = isDark ? VideosTabSvgIcon : DarkVideosTabSvgIcon;
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  useFocusEffect(
    useCallback(() => {
      SystemBars.setStyle({
        statusBar: isDark ? 'light' : 'dark',
        navigationBar: isDark ? 'light' : 'dark',
      });
    }, [isDark])
  );

  const { toggleFollow: globalToggleFollow } = useSocialStore();
  const [isNotificationsOn, setIsNotificationsOn] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isUserOptionsVisible, setIsUserOptionsVisible] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: string; thumbnail: string; videoUrl: string } | null>(null);

  const bioSheetRef = useRef<BottomSheet>(null);

  const { user: authUser } = useAuthStore();
  const currentUserId = authUser?.id;

  const userId = (typeof id === 'string' ? id : '') || '';
  const { videos, isLoadingMore, hasMore, refreshFeed, loadMore } = useVideoFeed(userId, 50);
  const [refreshing, setRefreshing] = useState(false);
  const { user: profileUser, isLoading, reload } = useProfile(userId, currentUserId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFeed();
    setRefreshing(false);
  }, [refreshFeed]);

  // Dynamic Theme Colors
  const bgBody = themeColors.background;
  const bgContainer = themeColors.background;
  const textPrimary = themeColors.textPrimary;
  const tabPrimary = isDark ? '#FFFFFF' : '#080A0F';
  const textSecondary = themeColors.textSecondary;
  const cardBg = themeColors.card;
  const iconColor = themeColors.textPrimary;
  const btnFollowBg = isDark ? '#ffffff' : '#080A0F';
  const btnFollowText = isDark ? '#080A0F' : '#ffffff';
  const btnSecondaryBg = themeColors.card;
  const headerOffset = insets.top + 60;

  // Derive follow state from profile user (which is already synced with global store)
  const isFollowing = profileUser?.isFollowing ?? false;

  const handleToggleFollow = async () => {
    if (!currentUserId) {
      return;
    }

    try {
      await globalToggleFollow(userId, currentUserId);
    } catch (err) {
      logError(LogCode.SOCIAL_FOLLOW_ERROR, 'Follow toggle failed', { error: err, targetUserId: userId, currentUserId });
    }
  };

  const user = {
    name: profileUser?.fullName || profileUser?.username || 'User',
    username: profileUser?.username || 'user',
    avatarUrl: profileUser?.avatarUrl || '',
    bio: profileUser?.bio || 'No bio available.',
    followersCount: profileUser?.followersCount || 0,
    followingCount: profileUser?.followingCount || 0,
  };
  // --------------------------

  const safeVideos = videos || [];
  const videoOnlyItems = safeVideos.filter(isFeedVideoItem);
  const postsData = safeVideos.map(v => ({
    id: v.id,
    thumbnail: v.thumbnailUrl,
    views: v.viewsCount ?? 0,
    type: isFeedVideoItem(v) ? ('video' as const) : (v.postType === 'carousel' ? ('carousel' as const) : ('photo' as const)),
    videoUrl: v.videoUrl,
  }));
  const videosData = videoOnlyItems.map(v => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.viewsCount ?? 0, videoUrl: v.videoUrl }));

  const pagerRef = useRef<React.ElementRef<typeof PagerView>>(null);
  const [activeTab, setActiveTab] = useState(0);
  const focusedTabValue = useSharedValue(0);
  const focusedTabRef = useRef(0);
  const tabPressTargetRef = useRef<number | null>(null);
  const swipeStartTabRef = useRef(0);
  const hasAppliedSwipeFocusRef = useRef(false);
  const isPagerDraggingRef = useRef(false);
  const updateFocusedTab = useCallback((nextTab: number) => {
    if (focusedTabRef.current === nextTab) return;
    focusedTabRef.current = nextTab;
    focusedTabValue.value = nextTab;
  }, [focusedTabValue]);
  const [showHeaderAvatar, setShowHeaderAvatar] = useState(false);
  const headerAvatarVisibleRef = useRef(false);

  const maybeLoadMore = useCallback((nativeEvent: NativeScrollEvent) => {
    if (isLoading || isLoadingMore || !hasMore) return;
    if (activeTab !== 0 && activeTab !== 1) return;

    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom <= 400) {
      void loadMore();
    }
  }, [activeTab, hasMore, isLoading, isLoadingMore, loadMore]);
  const [tabsInitialY, setTabsInitialY] = useState(0);
  const [isTabsPinned, setIsTabsPinned] = useState(false);
  const isTabsPinnedRef = useRef(false);
  const handleTabsAnchorLayout = useCallback((event: LayoutChangeEvent) => {
    const nextY = event.nativeEvent.layout.y;
    if (nextY > 0 && Math.abs(nextY - tabsInitialY) > 0.5) {
      setTabsInitialY(nextY);
    }
  }, [tabsInitialY]);
  const syncTabsPinned = useCallback((offsetY: number) => {
    if (tabsInitialY <= 0) return;
    const shouldPin = offsetY >= tabsInitialY;
    if (isTabsPinnedRef.current !== shouldPin) {
      isTabsPinnedRef.current = shouldPin;
      setIsTabsPinned(shouldPin);
    }
  }, [tabsInitialY]);
  const handleUserScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nativeEvent = event.nativeEvent;
    const shouldShow = nativeEvent.contentOffset.y > 40;
    if (headerAvatarVisibleRef.current !== shouldShow) {
      headerAvatarVisibleRef.current = shouldShow;
      setShowHeaderAvatar(shouldShow);
    }
    maybeLoadMore(nativeEvent);
    syncTabsPinned(nativeEvent.contentOffset.y);
  }, [maybeLoadMore, syncTabsPinned]);
  const GRID_COLUMNS = 3;
  const GRID_GAP = 2;
  const GRID_PADDING = 2;

  const gridItemSize = Math.floor(
    (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  );
  const gridItemHeight = gridItemSize * 1.25; // 4:5 ratio
  const gridRows = Math.ceil(postsData.length / GRID_COLUMNS);
  const gridHeight = gridRows * (gridItemHeight + GRID_GAP) + GRID_GAP;

  const videoRows = Math.ceil(videosData.length / GRID_COLUMNS);
  const videosHeight = videoRows * (gridItemSize * (16 / 9) + GRID_GAP) + GRID_GAP;
  const shopHeight = 260;
  const showShopTab = profileUser?.isVerified === true && profileUser?.shopEnabled === true;
  const visibleTabCount = showShopTab ? 3 : 2;
  const [navTabsWidth, setNavTabsWidth] = useState(SCREEN_WIDTH);
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const tabIndicatorFallbackWidth = navTabsWidth / visibleTabCount;
  const pagerProgress = useSharedValue(0);
  const getTabHeight = useCallback((index: number) => {
    if (index === 0) return gridHeight;
    if (index === 1) return videosHeight;
    return shopHeight;
  }, [gridHeight, shopHeight, videosHeight]);
  const [pagerHeight, setPagerHeight] = useState(() => getTabHeight(0));
  const pagerHeightRef = useRef(getTabHeight(0));
  const updatePagerHeight = useCallback((nextHeight: number) => {
    if (Math.abs(pagerHeightRef.current - nextHeight) < 0.5) {
      return;
    }
    pagerHeightRef.current = nextHeight;
    setPagerHeight(nextHeight);
  }, []);

  const handleTabPress = useCallback((index: number) => {
    tabPressTargetRef.current = index;
    isPagerDraggingRef.current = false;
    hasAppliedSwipeFocusRef.current = false;
    updatePagerHeight(Math.max(getTabHeight(activeTab), getTabHeight(index)));
    updateFocusedTab(index);
    pagerRef.current?.setPage(index);
  }, [activeTab, getTabHeight, updateFocusedTab, updatePagerHeight]);

  const handleNavTabsLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - navTabsWidth) > 0.5) {
      setNavTabsWidth(nextWidth);
    }
  }, [navTabsWidth]);
  const handleTabLayout = useCallback((index: number, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => {
      const current = prev[index];
      if (
        current &&
        Math.abs(current.x - x) < 0.5 &&
        Math.abs(current.width - width) < 0.5
      ) {
        return prev;
      }
      return { ...prev, [index]: { x, width } };
    });
  }, []);

  const showPreview = (item: any) => {
    if (item?.videoUrl) {
      setPreviewItem(item);
    }
  };
  const hidePreview = () => setPreviewItem(null);

  const pagerPages = [
    <View key="0" style={{ backgroundColor: bgBody }}>
      <MediaGrid
        items={postsData}
        isDark={isDark}
        aspectRatio={0.8}
        onPreview={showPreview}
        onPreviewEnd={hidePreview}
        gap={GRID_GAP}
        padding={GRID_PADDING}
        showViewCount={false}
        showMediaTypeIcon={true}
      />
    </View>,
    <View key="1" style={{ backgroundColor: bgBody }}>
      <MediaGrid items={videosData.map((video) => ({ ...video, type: 'video' as const }))} isDark={isDark} aspectRatio={9 / 16} onPreview={showPreview} onPreviewEnd={hidePreview} gap={GRID_GAP} padding={GRID_PADDING} useVideoSvgForViewCountIcon={true} />
    </View>,
  ];

  if (showShopTab) {
    pagerPages.push(
      <View key="2" style={{ backgroundColor: bgBody }}>
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: textSecondary }}>Mağaza henüz boş</Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    if (!showShopTab && activeTab > 1) {
      tabPressTargetRef.current = null;
      setActiveTab(1);
      updateFocusedTab(1);
      pagerProgress.value = 1;
      updatePagerHeight(getTabHeight(1));
      pagerRef.current?.setPage(1);
    }
  }, [activeTab, getTabHeight, pagerProgress, showShopTab, updateFocusedTab, updatePagerHeight]);

  useEffect(() => {
    const safeTab = showShopTab ? activeTab : Math.min(activeTab, 1);
    updatePagerHeight(getTabHeight(safeTab));
  }, [activeTab, getTabHeight, showShopTab, updatePagerHeight]);

  const handlePageScroll = useCallback((e: PagerViewOnPageScrollEvent) => {
    const { position, offset } = e.nativeEvent;

    // Snap indicator to destination tab immediately when swipe starts.
    let targetProgress = position + offset;
    if (offset > 0) {
      if (position < activeTab) {
        targetProgress = position;
      } else if (position === activeTab) {
        targetProgress = Math.min(position + 1, visibleTabCount - 1);
      }
    }

    const isProgrammaticTabPress = tabPressTargetRef.current !== null;
    const isDragScroll = isPagerDraggingRef.current;
    if (!isProgrammaticTabPress && !isDragScroll) {
      return;
    }

    pagerProgress.value = targetProgress;
    const nextPosition = Math.min(position + 1, visibleTabCount - 1);
    const swipeHeight = offset > 0
      ? Math.max(getTabHeight(position), getTabHeight(nextPosition))
      : getTabHeight(position);
    updatePagerHeight(swipeHeight);
    if (isProgrammaticTabPress) {
      return;
    }

    if (!isDragScroll) {
      return;
    }

    if (hasAppliedSwipeFocusRef.current) {
      return;
    }

    if (position !== swipeStartTabRef.current) {
      hasAppliedSwipeFocusRef.current = true;
      updateFocusedTab(position);
      return;
    }

    if (offset > 0) {
      const nextFocusedTab =
        position < swipeStartTabRef.current
          ? position
          : Math.min(position + 1, visibleTabCount - 1);
      hasAppliedSwipeFocusRef.current = true;
      updateFocusedTab(nextFocusedTab);
    }
  }, [activeTab, getTabHeight, pagerProgress, updateFocusedTab, updatePagerHeight, visibleTabCount]);

  const handlePageScrollStateChanged = useCallback((e: PageScrollStateChangedNativeEvent) => {
    const { pageScrollState } = e.nativeEvent;

    if (tabPressTargetRef.current !== null) {
      if (pageScrollState === 'idle') {
        tabPressTargetRef.current = null;
      }
      return;
    }

    if (pageScrollState === 'dragging') {
      isPagerDraggingRef.current = true;
      hasAppliedSwipeFocusRef.current = false;
      swipeStartTabRef.current = activeTab;
      return;
    }

    if (pageScrollState === 'idle') {
      const settledTab = Math.min(
        Math.max(Math.round(pagerProgress.value), 0),
        visibleTabCount - 1
      );
      // Revert only if swipe cancelled and pager settled back to where it started.
      if (settledTab === swipeStartTabRef.current) {
        updateFocusedTab(swipeStartTabRef.current);
      }
      isPagerDraggingRef.current = false;
      hasAppliedSwipeFocusRef.current = false;
      swipeStartTabRef.current = activeTab;
    }
  }, [activeTab, pagerProgress, updateFocusedTab, visibleTabCount]);

  const handlePageSelected = useCallback((e: PagerViewOnPageSelectedEvent) => {
    const nextTab = e.nativeEvent.position;
    tabPressTargetRef.current = null;
    isPagerDraggingRef.current = false;
    hasAppliedSwipeFocusRef.current = false;
    swipeStartTabRef.current = nextTab;
    pagerProgress.value = nextTab;
    setActiveTab((prev) => (prev === nextTab ? prev : nextTab));
    updatePagerHeight(getTabHeight(nextTab));
    updateFocusedTab(nextTab);
  }, [getTabHeight, pagerProgress, updateFocusedTab, updatePagerHeight]);

  const tabIndicatorAnimatedStyle = useAnimatedStyle(() => {
    const clampedProgress = Math.min(Math.max(pagerProgress.value, 0), visibleTabCount - 1);
    const lowerIndex = Math.floor(clampedProgress);
    const upperIndex = Math.min(Math.ceil(clampedProgress), visibleTabCount - 1);
    const t = clampedProgress - lowerIndex;
    const lowerLayout = tabLayouts[lowerIndex];
    const upperLayout = tabLayouts[upperIndex] || lowerLayout;
    const lowerX = lowerLayout ? lowerLayout.x : lowerIndex * tabIndicatorFallbackWidth;
    const upperX = upperLayout ? upperLayout.x : upperIndex * tabIndicatorFallbackWidth;
    const lowerWidth = lowerLayout ? lowerLayout.width : tabIndicatorFallbackWidth;
    const upperWidth = upperLayout ? upperLayout.width : lowerWidth;
    return {
      width: lowerWidth + (upperWidth - lowerWidth) * t,
      transform: [{ translateX: lowerX + (upperX - lowerX) * t }],
    };
  }, [tabIndicatorFallbackWidth, tabLayouts, visibleTabCount]);
  const tabActiveScale = INNER_TAB_ICON_ACTIVE_SIZE / INNER_TAB_ICON_SIZE;
  const gridIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusedTabValue.value === 0 ? tabActiveScale : 1 }],
  }));
  const videoIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusedTabValue.value === 1 ? tabActiveScale : 1 }],
  }));
  const storeIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusedTabValue.value === 2 ? tabActiveScale : 1 }],
  }));
  const renderTabsBar = (asOverlay = false) => (
    <View
      style={[
        styles.navTabs,
        { borderBottomColor: cardBg, backgroundColor: bgContainer },
        !asOverlay && isTabsPinned ? styles.navTabsGhost : null,
      ]}
      onLayout={asOverlay ? undefined : handleNavTabsLayout}
      pointerEvents={!asOverlay && isTabsPinned ? 'none' : 'auto'}
    >
      <TouchableOpacity style={styles.tab} onLayout={asOverlay ? undefined : (event) => handleTabLayout(0, event)} onPress={() => handleTabPress(0)}>
        <Animated.View style={gridIconAnimatedStyle}>
          <GridIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} />
        </Animated.View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tab} onLayout={asOverlay ? undefined : (event) => handleTabLayout(1, event)} onPress={() => handleTabPress(1)}>
        <Animated.View style={videoIconAnimatedStyle}>
          <VideoIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} IconComponent={ThemedVideosTabSvgIcon} />
        </Animated.View>
      </TouchableOpacity>
      {showShopTab && (
        <TouchableOpacity style={styles.tab} onLayout={asOverlay ? undefined : (event) => handleTabLayout(2, event)} onPress={() => handleTabPress(2)}>
          <Animated.View style={storeIconAnimatedStyle}>
            <StoreTabIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} />
          </Animated.View>
        </TouchableOpacity>
      )}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tabIndicator,
          { backgroundColor: tabPrimary },
          tabIndicatorAnimatedStyle,
        ]}
      />
    </View>
  );
  const bioLimit = 110;
  const truncatedBio = user.bio.length > bioLimit ? user.bio.substring(0, bioLimit) + '...' : user.bio;

  return (
    <View style={[styles.container, { backgroundColor: bgBody }]}>
      {/* 
          TOP NAVIGATION - ANIMATED & INDEPENDENT
      */}
      <View style={[
        styles.topNavContainer,
        { paddingTop: insets.top, backgroundColor: bgContainer },
      ]}>
        <View style={styles.topNav}>
          <View style={styles.leftNav}>
            <TouchableOpacity style={styles.navIcon} onPress={() => router.back()}>
              <ChevronLeft size={24} color={iconColor} />
            </TouchableOpacity>
            {showHeaderAvatar && user.avatarUrl ? <Avatar url={user.avatarUrl} size={32} /> : null}
          </View>
          <Text style={[styles.headerUsername, { color: textPrimary }]}>{!isLoading ? `@${user.username}` : ''}</Text>
          <TouchableOpacity
            style={[styles.navIcon, { alignItems: 'flex-end' }]}
            onPress={() => setIsUserOptionsVisible(true)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MoreVertical size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      <Animated.ScrollView
        style={{ backgroundColor: bgBody, marginTop: headerOffset }}
        onScroll={handleUserScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: isLoading ? 1 : 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} progressViewOffset={0} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={isDark ? '#fff' : '#000'} />
          </View>
        ) : (
          <View style={styles.profileContainer}>
            <ProfileStats
              userId={userId}
              followingCount={user.followingCount}
              followersCount={user.followersCount}
              mainAvatarUrl={user.avatarUrl}
              isDark={isDark}
              hasStories={profileUser?.hasStories}
              onAvatarPress={() => {
                if (profileUser?.hasStories) {
                  router.push(`/story/${userId}`);
                }
              }}
            />

            <View style={styles.userNameRow}>
              <Text style={[styles.userNameText, { color: textPrimary }]}>{user.name}</Text>
              {profileUser?.isVerified === true && <VerifiedBadge />}
            </View>

            <TouchableOpacity onPress={() => bioSheetRef.current?.expand()} disabled={user.bio.length <= bioLimit}>
              <Text style={[styles.bioText, { color: textSecondary }]}>
                {truncatedBio}
                {user.bio.length > bioLimit && <Text style={{ color: textPrimary, fontWeight: '600' }}> devamını gör</Text>}
              </Text>
            </TouchableOpacity>

            {/* Social Actions (Follow, Like, Notify) */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.btnFollow, { backgroundColor: isFollowing ? btnSecondaryBg : btnFollowBg, borderColor: isFollowing ? textSecondary : 'transparent' }]}
                onPress={handleToggleFollow}
              >
                <Text style={[styles.btnFollowText, { color: isFollowing ? textPrimary : btnFollowText }]}>{isFollowing ? 'Takipte' : 'Takip Et'}</Text>
              </TouchableOpacity>

              <View style={styles.btnIconOnly}>
                <AnimatedIconButton
                  icon={LikeIcon}
                  onPress={() => setIsLiked(!isLiked)}
                  isActive={isLiked}
                  activeColor="#FF3B30"
                  inactiveColor={iconColor}
                  size={28}
                  outlined={!isLiked}
                />
              </View>
              <View style={styles.btnIconOnly}>
                <AnimatedIconButton
                  icon={({ color, width, height, ...props }: any) => (
                    <Svg width={width} height={height} viewBox="0 0 24 24" fill={props.fill || color} stroke={props.stroke} strokeWidth={props.strokeWidth}>
                      <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </Svg>
                  )}
                  onPress={() => setIsNotificationsOn(!isNotificationsOn)}
                  isActive={isNotificationsOn}
                  activeColor="#FF3B30"
                  inactiveColor={iconColor}
                  size={28}
                  outlined={!isNotificationsOn}
                  strokeWidth={1.6}
                />
              </View>
              <View style={styles.btnIconOnly}>
                <AnimatedIconButton
                  icon={ShareIcon}
                  onPress={() => logUI(LogCode.UI_INTERACTION, 'Share profile button pressed', { userId })}
                  inactiveColor={iconColor}
                  size={28}
                  outlined={true}
                />
              </View>
            </View>

            <View style={styles.socialClubsRow}>
              {(profileUser?.instagramUrl || profileUser?.tiktokUrl || profileUser?.youtubeUrl || profileUser?.xUrl || profileUser?.website) && (
                <SocialTags isDark={isDark} user={profileUser} />
              )}
            </View>
          </View>
        )}

        <View onLayout={handleTabsAnchorLayout}>
          {renderTabsBar(false)}
        </View>

        <PagerView
          ref={pagerRef}
          style={{
            width: '100%',
            height: pagerHeight,
            backgroundColor: bgBody,
          }}
          initialPage={0}
          onPageScroll={handlePageScroll}
          onPageScrollStateChanged={handlePageScrollStateChanged}
          onPageSelected={handlePageSelected}
        >
          {pagerPages}
        </PagerView>
        {isLoadingMore && (
          <View style={{ paddingVertical: 14 }}>
            <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
          </View>
        )}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>
      {!isLoading && isTabsPinned && (
        <View style={[styles.navTabsPinnedContainer, { top: headerOffset }]}>
          {renderTabsBar(true)}
        </View>
      )}

      {/* Overlays & Modals */}
      {previewItem && <PreviewModal item={previewItem} onClose={hidePreview} />}
      <BioBottomSheet ref={bioSheetRef} bio={user.bio} isDark={isDark} />
      <UserOptionsModal visible={isUserOptionsVisible} username={user.username} onClose={() => setIsUserOptionsVisible(false)} onAction={(type) => logUI(LogCode.MODAL_ACTION, 'User options action triggered', { actionType: type, userId })} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNavContainer: { width: '100%', zIndex: 1000, position: 'absolute', top: 0, left: 0, right: 0 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 60, position: 'relative' },
  leftNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerUsername: { fontSize: 20, fontWeight: '600', position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },
  profileContainer: { alignItems: 'center', paddingHorizontal: 10, marginTop: 5 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userNameText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  bioText: { fontSize: 13, lineHeight: 19.5, marginBottom: 20, paddingHorizontal: 5, textAlign: 'center' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25, height: 36, paddingHorizontal: 5, width: '100%' },
  btnFollow: { flex: 1, height: 36, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnFollowText: { fontSize: 13, fontWeight: '600' },
  btnIconOnly: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  navTabs: { flexDirection: 'row', borderBottomWidth: 1, position: 'relative' },
  navTabsGhost: { opacity: 0 },
  navTabsPinnedContainer: { position: 'absolute', left: 0, right: 0, zIndex: 900 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  tabIndicator: { position: 'absolute', left: 0, bottom: 0, height: 2 },
  socialClubsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginVertical: 10, width: '100%' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  previewCard: { width: '80%', height: 480, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', ...shadowStyle({ color: '#000', offset: { width: 0, height: 10 }, opacity: 0.5, radius: 15, elevation: 20 }) },
  previewVideo: { width: '100%', height: '100%' },
});
