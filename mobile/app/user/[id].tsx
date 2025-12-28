import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  StatusBar as RNStatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Video from 'react-native-video';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { ProfileStats } from '../../src/presentation/components/profile/ProfileStats';
import { SocialTags } from '../../src/presentation/components/profile/SocialTags';
import { ClubsCollaboration } from '../../src/presentation/components/profile/ClubsCollaboration';
import { HighlightPills } from '../../src/presentation/components/profile/HighlightPills';
import { VideoGrid } from '../../src/presentation/components/profile/VideoGrid';
import { PostsGrid } from '../../src/presentation/components/profile/PostsGrid';
import { BioBottomSheet } from '../../src/presentation/components/profile/BioBottomSheet';
import { ClubsBottomSheet } from '../../src/presentation/components/profile/ClubsBottomSheet';
import { ChevronLeft, MoreHorizontal, UserCog } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import LikeIcon from '../../assets/icons/like.svg';
import ShareIcon from '../../assets/icons/share.svg';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';
import { UserRepositoryImpl } from '../../src/data/repositories/UserRepositoryImpl';
import { GetUserProfileUseCase } from '../../src/domain/usecases/GetUserProfileUseCase';
import { ProfileSkeleton } from '../../src/presentation/components/profile/ProfileSkeleton';
import { UserOptionsModal } from '../../src/presentation/components/profile/UserOptionsModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SVG Icons
const VerifiedBadge = () => (
  <Svg width="20" height="20" viewBox="0 -960 960 960" fill="#3D91FF">
    <Path d="m344-60-76-128-144-32+14-148-98-112+98-112-14-148+144-32+76-128+136+58+136-58+76+128+144+32-14+148+98+112-98+112+14+148-144+32-76+128-136-58-136+58Zm34-102+102-44+104+44+56-96+110-26-10-112+74-84-74-86+10-112-110-24-58-96-102+44-104-44-56+96-110+24+10+112-74+86+74+84-10+114+110+24+58+96Zm102-318Zm-42+142+226-226-56-58-170+170-86-84-56+56+142+142Z" />
  </Svg>
);

const GridIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 -960 960 960" fill={color}>
    <Path d="M240-160q-33 0-56.5-23.5T160-240q0-33 23.5-56.5T240-320q33 0 56.5 23.5T320-240q0 33-23.5 56.5T240-160Zm240 0q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm240 0q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160ZM240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400ZM240-640q-33 0-56.5-23.5T160-720q0-33 23.5-56.5T240-800q33 0 56.5 23.5T320-720q0 33-23.5 56.5T240-640Zm240 0q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Zm240 0q-33 0-56.5-23.5T640-720q0-33 23.5-56.5T720-800q33 0 56.5 23.5T800-720q0 33-23.5 56.5T720-640Z" />
  </Svg>
);

const VideoIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 -960 960 960" fill={color}>
    <Path d="m480-420+240-160-240-160v320Zm28+220h224q-7+26-24+42t-44+20L228-85q-33+5-59.5-15.5T138-154L85-591q-4-33+16-59t53-30l46-6v80l-36+5+54+437+290-36Zm-148-80q-33+0-56.5-23.5T280-360v-440q0-33+23.5-56.5T360-880h440q33+0+56.5+23.5T880-800v440q0+33-23.5+56.5T800-280H360Zm0-80h440v-440H360v440Zm220-220ZM218-164Z" />
  </Svg>
);

const TagsIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
    <Path d="M0 0h24v24H0V0z" fill="none" />
    <Path d="M2.53 19.65l1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zm-9.2 3.8L7.87 7.79l7.35-3.04h.01l4.95 11.95-7.35 3.05z" />
    <Circle cx="11" cy="9" r="1" />
    <Path d="M5.88 19.75c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z" />
  </Svg>
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

  // Collapsible Header Logic
  const headerTranslateY = useSharedValue(0);
  const lastScrollY = useSharedValue(0);
  const headerHeight = 60 + insets.top;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      if (currentY <= 0) {
        headerTranslateY.value = withTiming(0, { duration: 200 });
      } else if (diff > 10 && currentY > 50) {
        headerTranslateY.value = withTiming(-headerHeight, { duration: 250 });
      } else if (diff < -10) {
        headerTranslateY.value = withTiming(0, { duration: 200 });
      }
      
      lastScrollY.value = currentY;
    },
  });

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: headerTranslateY.value }],
  }));

  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    }, [isDark])
  );

  const [isFollowing, setIsFollowing] = useState(false);
  const [isNotificationsOn, setIsNotificationsOn] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isUserOptionsVisible, setIsUserOptionsVisible] = useState(false);
  const { videos, refreshFeed } = useVideoFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<{ id: string; thumbnail: string; videoUrl: string } | null>(null);

  const bioSheetRef = useRef<BottomSheet>(null);
  const clubsSheetRef = useRef<BottomSheet>(null);
  
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

  // --- Real Data Fetching ---
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    avatarUrl: '',
    bio: '',
    followersCount: 0,
    followingCount: 0,
    socialLinks: [],
  });

  useEffect(() => {
    const fetchUser = async () => {
      if (!id || typeof id !== 'string') return;
      
      setIsLoading(true);
      try {
        const repo = new UserRepositoryImpl();
        const useCase = new GetUserProfileUseCase(repo);
        
        // We use the ID from the URL (which might be a username or UUID depending on your logic)
        // Ideally, GetUserProfileUseCase should handle both or we standardize on username/uuid
        const fetchedUser = await useCase.execute(id);

        if (fetchedUser) {
          setProfileData({
            name: fetchedUser.fullName || fetchedUser.username,
            username: fetchedUser.username,
            avatarUrl: fetchedUser.avatarUrl,
            bio: fetchedUser.bio || "No bio available.",
            followersCount: typeof fetchedUser.followersCount === 'number' ? fetchedUser.followersCount : 0,
            followingCount: typeof fetchedUser.followingCount === 'number' ? fetchedUser.followingCount : 0,
            socialLinks: fetchedUser.socialLinks || [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [id]);

  const user = {
    ...profileData,
    followingCount: profileData.followingCount,
    followersCount: profileData.followersCount,
  };
  // --------------------------

  const followingAvatars = ['https://i.pravatar.cc/100?img=3', 'https://i.pravatar.cc/100?img=4', 'https://i.pravatar.cc/100?img=5'];
  const followersAvatars = ['https://i.pravatar.cc/100?img=6', 'https://i.pravatar.cc/100?img=7', 'https://i.pravatar.cc/100?img=8'];
  const clubLogos = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/200px-Tesla_Motors.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png',
  ];

  const clubs = [
    { id: '1', name: 'Amazon', logo: clubLogos[0], collaborationCount: 12 },
    { id: '2', name: 'Tesla', logo: clubLogos[1], collaborationCount: 8 },
    { id: '3', name: 'Nike', logo: clubLogos[2], collaborationCount: 15 },
  ];

  const highlights = [
    { id: '1', title: 'Friends', thumbnail: 'https://picsum.photos/100/100?random=1' },
    { id: '2', title: 'Pet Dog', thumbnail: 'https://picsum.photos/100/100?random=2' },
    { id: '3', title: 'Travel', thumbnail: 'https://picsum.photos/100/100?random=3' },
  ];

  const safeVideos = videos || [];
  const postsData = safeVideos.map(v => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', type: 'video' as const, videoUrl: v.videoUrl }));
  const videosData = safeVideos.map(v => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', videoUrl: v.videoUrl }));
  const tagsData: any[] = [];

  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);
  const gridHeight = Math.ceil(postsData.length / 3) * (Math.floor((SCREEN_WIDTH - 3) / 3) + 1) + 20;
  const videosHeight = Math.ceil(videosData.length / 3) * (Math.floor((SCREEN_WIDTH - 3) / 3) * (16 / 9) + 1) + 20;
  const tagsHeight = 300;

  const handleTabPress = (index: number) => { setActiveTab(index); pagerRef.current?.setPage(index); };
  const showPreview = (item: any) => setPreviewItem(item);
  const hidePreview = () => setPreviewItem(null);
  const bioLimit = 110;
  const truncatedBio = user.bio.length > bioLimit ? user.bio.substring(0, bioLimit) + '...' : user.bio;

  return (
    <View style={[styles.container, { backgroundColor: bgBody }]}>
      {/* 
          TOP NAVIGATION - ANIMATED & INDEPENDENT
      */}
      <Animated.View style={[
        styles.topNavContainer, 
        { paddingTop: insets.top, backgroundColor: bgContainer },
        animatedHeaderStyle
      ]}>
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navIcon} onPress={() => router.back()}>
            <ChevronLeft size={24} color={iconColor} />
          </TouchableOpacity>
          <Text style={[styles.headerUsername, { color: textPrimary }]}>{!isLoading ? `@${user.username}` : ''}</Text>
          <TouchableOpacity 
            style={styles.navIcon} 
            onPress={() => setIsUserOptionsVisible(true)}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <MoreHorizontal size={24} color={iconColor} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} progressViewOffset={insets.top + 60} />}
      >
        {isLoading ? (
            <ProfileSkeleton />
        ) : (
            <View style={styles.profileContainer}>
            <ProfileStats followingCount={user.followingCount} followingAvatars={followingAvatars} followersCount={user.followersCount} followersAvatars={followersAvatars} mainAvatarUrl={user.avatarUrl} isDark={isDark} />
            
            <View style={styles.userNameRow}>
                <Text style={[styles.userNameText, { color: textPrimary }]}>{user.name}</Text>
                <VerifiedBadge />
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
                  style={[
                    styles.btnFollow,
                    isFollowing && styles.btnFollowingCompact,
                    {
                      backgroundColor: isFollowing ? btnSecondaryBg : btnFollowBg,
                      borderColor: isFollowing ? textSecondary : 'transparent'
                    }
                  ]}
                  onPress={() => setIsFollowing(!isFollowing)}
                >
                  <Text style={[styles.btnFollowText, { color: isFollowing ? textPrimary : btnFollowText }]}>
                    {isFollowing ? 'Takipte' : 'Takip Et'}
                  </Text>
                </TouchableOpacity>

                {isFollowing && (
                  <TouchableOpacity
                    style={styles.btnIconOnly}
                    onPress={() => setIsUserOptionsVisible(true)}
                  >
                    <UserCog size={24} color={iconColor} strokeWidth={2} />
                  </TouchableOpacity>
                )}

                {isFollowing && <View style={{ flex: 1 }} />}

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
                    onPress={() => console.log('Share')}
                    inactiveColor={iconColor}
                    size={28}
                    outlined={true}
                  />
                </View>
            </View>

            <ClubsCollaboration clubsCount={clubs.length} clubLogos={clubLogos} isDark={isDark} onPress={() => clubsSheetRef.current?.expand()} />
            {profileData.socialLinks && profileData.socialLinks.length > 0 && (
                <SocialTags isDark={isDark} links={profileData.socialLinks} />
            )}
            </View>
        )}

        <View style={[styles.navTabs, { borderBottomColor: cardBg }]}>
          <TouchableOpacity style={[styles.tab, activeTab === 0 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(0)}><GridIcon color={activeTab === 0 ? textPrimary : textSecondary} /></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 1 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(1)}><VideoIcon color={activeTab === 1 ? textPrimary : textSecondary} /></TouchableOpacity>
          <TouchableOpacity style={[styles.tab, activeTab === 2 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(2)}><TagsIcon color={activeTab === 2 ? textPrimary : textSecondary} /></TouchableOpacity>
        </View>

        <HighlightPills highlights={highlights} isDark={isDark} />

        <PagerView ref={pagerRef} style={{ width: '100%', height: activeTab === 0 ? gridHeight : activeTab === 1 ? videosHeight : tagsHeight }} initialPage={0} onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}>
          <View key="0"><PostsGrid posts={postsData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} /></View>
          <View key="1"><VideoGrid videos={videosData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} /></View>
          <View key="2">
            <PostsGrid posts={tagsData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} />
            {tagsData.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textSecondary }}>Etiketlenmiş gönderi yok</Text></View>}
          </View>
        </PagerView>
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Overlays & Modals */}
      {previewItem && <PreviewModal item={previewItem} onClose={hidePreview} />}
      <BioBottomSheet ref={bioSheetRef} bio={user.bio} isDark={isDark} />
      <ClubsBottomSheet ref={clubsSheetRef} clubs={clubs} isDark={isDark} />
      <UserOptionsModal visible={isUserOptionsVisible} username={user.username} onClose={() => setIsUserOptionsVisible(false)} onAction={(type) => console.log('User action:', type)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNavContainer: { width: '100%', zIndex: 1000, position: 'absolute', top: 0, left: 0, right: 0 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60 },
  navIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerUsername: { fontSize: 16, fontWeight: '600', flex: 1, textAlign: 'center' },
  profileContainer: { alignItems: 'center', paddingHorizontal: 10, marginTop: 5 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userNameText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  bioText: { fontSize: 13, lineHeight: 19.5, marginBottom: 20, paddingHorizontal: 5, textAlign: 'center' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25, height: 36, paddingHorizontal: 5, width: '100%' },
  btnFollow: { flex: 1, height: 36, borderRadius: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnFollowingCompact: { flex: 0, paddingHorizontal: 12, minWidth: 80 },
  btnFollowText: { fontSize: 13, fontWeight: '600' },
  btnIconOnly: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 0 },
  navTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2 },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  previewCard: { width: '80%', height: 480, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
  previewVideo: { width: '100%', height: '100%' },
});