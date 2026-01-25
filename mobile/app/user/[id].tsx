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
} from 'react-native';
import PagerView from '../../src/presentation/components/shared/PagerView';
import type { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
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
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import LikeIcon from '../../assets/icons/like.svg';
import ShareIcon from '../../assets/icons/share.svg';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useProfile } from '../../src/presentation/hooks/useProfile';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';
import { UserOptionsModal } from '../../src/presentation/components/profile/UserOptionsModal';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { InteractionRepositoryImpl } from '../../src/data/repositories/InteractionRepositoryImpl';
import { ToggleFollowUseCase } from '../../src/domain/usecases/ToggleFollowUseCase';
import { useSocialStore } from '../../src/presentation/store/useSocialStore';
import { VerifiedBadge } from '../../src/presentation/components/shared/VerifiedBadge';
import { logSocial, logError, logUI, LogCode } from '@/core/services/Logger';
import { shadowStyle } from '@/core/utils/shadow';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SVG Icons
const GridIcon = ({ color }: { color: string }) => (
  <Svg width="26" height="26" viewBox="0 -960 960 960" fill={color}>
    <Path d="M240-160q-33 0-56.5-23.5T160-240q0-33 23.5-56.5T240-320q33 0 56.5 23.5T320-240q0 33-23.5 56.5T240-160Zm240 0q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm240 0q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160ZM240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400ZM240-640q-33 0-56.5-23.5T160-720q0-33 23.5-56.5T240-800q33 0 56.5 23.5T320-720q0 33-23.5 56.5T240-640Zm240 0q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Zm240 0q-33 0-56.5-23.5T640-720q0-33 23.5-56.5T720-800q33 0 56.5 23.5T800-720q0 33-23.5 56.5T720-640Z" />
  </Svg>
);

const VideoIcon = ({ color }: { color: string }) => (
  <Svg width="26" height="26" viewBox="0 -960 960 960" fill={color}>
    <Path d="m480-420+240-160-240-160v320Zm28+220h224q-7+26-24+42t-44+20L228-85q-33+5-59.5-15.5T138-154L85-591q-4-33+16-59t53-30l46-6v80l-36+5+54+437+290-36Zm-148-80q-33+0-56.5-23.5T280-360v-440q0-33+23.5-56.5T360-880h440q33+0+56.5+23.5T880-800v440q0+33-23.5+56.5T800-280H360Zm0-80h440v-440H360v440Zm220-220ZM218-164Z" />
  </Svg>
);

const TagsIcon = ({ color }: { color: string }) => (
  <Svg width="26" height="26" viewBox="0 0 24 24" fill={color}>
    <Path d="M0 0h24v24H0V0z" fill="none" />
    <Path d="M2.53 19.65l1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zm-9.2 3.8L7.87 7.79l7.35-3.04h.01l4.95 11.95-7.35 3.05z" />
    <Circle cx="11" cy="9" r="1" />
    <Path d="M5.88 19.75c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z" />
  </Svg>
);

const StoreTabIcon = ({ color }: { color: string }) => (
  <Store size={26} color={color} strokeWidth={1.7} />
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
  const { videos, refreshFeed } = useVideoFeed(userId);
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
  const textSecondary = themeColors.textSecondary;
  const cardBg = themeColors.card;
  const iconColor = themeColors.textPrimary;
  const btnFollowBg = isDark ? '#ffffff' : '#000000';
  const btnFollowText = isDark ? '#000000' : '#ffffff';
  const btnSecondaryBg = themeColors.card;

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
  const postsData = safeVideos.map(v => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', type: 'video' as const, videoUrl: v.videoUrl }));
  const videosData = safeVideos.map(v => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', videoUrl: v.videoUrl }));
  const tagsData: any[] = [];

  const pagerRef = useRef<React.ElementRef<typeof PagerView>>(null);
  const [activeTab, setActiveTab] = useState(0);
  const gridItemSize = Math.floor((SCREEN_WIDTH - 8) / 3);
  const gridItemHeight = gridItemSize * 1.25; // 4:5 ratio
  const gridHeight = Math.ceil(postsData.length / 3) * (gridItemHeight + 2) + 20;

  const videosHeight = Math.ceil(videosData.length / 3) * (gridItemSize * (16 / 9) + 1) + 20;
  const tagsHeight = 300;
  const shopHeight = 260;
  const showShopTab = profileUser?.isVerified === true && profileUser?.shopEnabled === true;

  const handleTabPress = (index: number) => { setActiveTab(index); pagerRef.current?.setPage(index); };

  const showPreview = (item: any) => setPreviewItem(item);
  const hidePreview = () => setPreviewItem(null);

  const pagerPages = [
    <View key="0">
      <MediaGrid items={postsData} isDark={isDark} aspectRatio={0.8} onPreview={showPreview} onPreviewEnd={hidePreview} gap={2} padding={2} />
    </View>,
    <View key="1">
      <MediaGrid items={videosData.map((video) => ({ ...video, type: 'video' as const }))} isDark={isDark} aspectRatio={9 / 16} onPreview={showPreview} onPreviewEnd={hidePreview} gap={2} padding={2} />
    </View>,
    <View key="2">
      <MediaGrid items={tagsData} isDark={isDark} aspectRatio={0.8} onPreview={showPreview} onPreviewEnd={hidePreview} gap={2} padding={2} />
      {tagsData.length === 0 && (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: textSecondary }}>Etiketlenmiş gönderi yok</Text>
        </View>
      )}
    </View>,
  ];

  if (showShopTab) {
    pagerPages.push(
      <View key="3">
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: textSecondary }}>Mağaza henüz boş</Text>
        </View>
      </View>
    );
  }

  useEffect(() => {
    if (!showShopTab && activeTab > 2) {
      setActiveTab(2);
      pagerRef.current?.setPage(2);
    }
  }, [activeTab, showShopTab]);
  const bioLimit = 110;
  const truncatedBio = user.bio.length > bioLimit ? user.bio.substring(0, bioLimit) + '...' : user.bio;
  const [showHeaderAvatar, setShowHeaderAvatar] = useState(false);
  const headerAvatarVisibleRef = useRef(false);

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
        onScroll={(event) => {
          const shouldShow = event.nativeEvent.contentOffset.y > 40;
          if (headerAvatarVisibleRef.current !== shouldShow) {
            headerAvatarVisibleRef.current = shouldShow;
            setShowHeaderAvatar(shouldShow);
          }
        }}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 60, flexGrow: isLoading ? 1 : 0 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} progressViewOffset={insets.top + 60} />}
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

        <View style={[styles.navTabs, { borderBottomColor: cardBg }]}>
          <TouchableOpacity style={[styles.tab, activeTab === 0 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(0)}><GridIcon color={activeTab === 0 ? textPrimary : textSecondary} /></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 1 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(1)}><VideoIcon color={activeTab === 1 ? textPrimary : textSecondary} /></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 2 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(2)}><TagsIcon color={activeTab === 2 ? textPrimary : textSecondary} /></TouchableOpacity>
          {showShopTab && (
            <TouchableOpacity style={[styles.tab, activeTab === 3 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(3)}>
              <StoreTabIcon color={activeTab === 3 ? textPrimary : textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        <PagerView
          ref={pagerRef}
          style={{ width: '100%', height: activeTab === 0 ? gridHeight : activeTab === 1 ? videosHeight : activeTab === 2 ? tagsHeight : shopHeight }}
          initialPage={0}
          onPageSelected={(e: PagerViewOnPageSelectedEvent) => setActiveTab(e.nativeEvent.position)}
        >
          {pagerPages}
        </PagerView>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

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
  navTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2 },
  socialClubsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15, marginVertical: 10, width: '100%' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  previewCard: { width: '80%', height: 480, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', ...shadowStyle({ color: '#000', offset: { width: 0, height: 10 }, opacity: 0.5, radius: 15, elevation: 20 }) },
  previewVideo: { width: '100%', height: '100%' },
});
