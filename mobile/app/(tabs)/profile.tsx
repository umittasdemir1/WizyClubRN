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
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { useDraftStore } from '../../src/presentation/store/useDraftStore';
import { ProfileStats } from '../../src/presentation/components/profile/ProfileStats';
import { SocialTags } from '../../src/presentation/components/profile/SocialTags';
import { ClubsCollaboration } from '../../src/presentation/components/profile/ClubsCollaboration';
import { HighlightPills } from '../../src/presentation/components/profile/HighlightPills';
import { VideoGrid } from '../../src/presentation/components/profile/VideoGrid';
import { PostsGrid } from '../../src/presentation/components/profile/PostsGrid';
import { BioBottomSheet } from '../../src/presentation/components/profile/BioBottomSheet';
import { ClubsBottomSheet } from '../../src/presentation/components/profile/ClubsBottomSheet';
import { SettingsBottomSheet } from '../../src/presentation/components/profile/SettingsBottomSheet';
import { EditProfileSheet } from '../../src/presentation/components/profile/EditProfileSheet';
import { ChevronLeft, Eye } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import MoreIcon from '../../assets/icons/more.svg';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useProfile } from '../../src/presentation/hooks/useProfile';
import { DeletedContentSheet } from '../../src/presentation/components/profile/DeletedContentSheet';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';
import { ProfileSkeleton } from '../../src/presentation/components/profile/ProfileSkeleton';

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

const SaveTabIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 -960 960 960" fill={color}>
    <Path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z" />
  </Svg>
);

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

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark, toggleTheme } = useThemeStore();
  const { user: authUser, initialize, isInitialized } = useAuthStore();
  const { drafts, fetchDrafts } = useDraftStore();
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Use authenticated user's ID, fallback to hardcoded for development
  const currentUserId = authUser?.id || '687c8079-e94c-42c2-9442-8a4a6b63dec6';

  // Initialize auth on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  // Fetch drafts on mount
  useEffect(() => {
    if (currentUserId) {
      fetchDrafts(currentUserId);
    }
  }, [currentUserId]);

  const { videos, refreshFeed } = useVideoFeed(currentUserId);


  const { user: profileUser, isLoading, reload, updateProfile, uploadAvatar } = useProfile(currentUserId);

  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
      // Don't reload on every focus - Instagram/TikTok behavior
      // Data loads on mount and via pull-to-refresh only
    }, [isDark])
  );

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

  const [refreshing, setRefreshing] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: string; thumbnail: string; videoUrl: string } | null>(null);

  const bioSheetRef = useRef<BottomSheet>(null);
  const clubsSheetRef = useRef<BottomSheet>(null);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const editProfileSheetRef = useRef<BottomSheet>(null);
  const deletedContentSheetRef = useRef<BottomSheet>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Silent refresh - don't show skeleton, just update data
    await Promise.all([refreshFeed(), reload(true)]);
    setRefreshing(false);
  }, [refreshFeed, reload]);

  // Dynamic Theme Colors
  const bgBody = themeColors.background;
  const bgContainer = themeColors.background;
  const textPrimary = themeColors.textPrimary;
  const textSecondary = themeColors.textSecondary;
  const cardBg = themeColors.card;
  const iconColor = themeColors.textPrimary;

  // Button Colors
  const btnEditBg = isDark ? '#333333' : '#E5E5E5';
  const btnEditText = textPrimary;

  // PagerView States
  const pagerRef = useRef<PagerView>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Current User as Domain Entity
  // Always provide a fallback to prevent null errors
  const currentUser: any = profileUser || {
    id: currentUserId,
    username: authUser?.email?.split('@')[0] || 'user',
    fullName: 'User',
    avatarUrl: 'https://i.pravatar.cc/300?img=12',
    bio: "Welcome to WizyClub",
    country: 'TR',
    age: 0,
    isFollowing: false,
    website: '',
    isVerified: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0
  };

  // View model for simple UI parts
  const user = {
    name: currentUser?.fullName || 'User',
    username: currentUser?.username || 'user',
    avatarUrl: currentUser?.avatarUrl || 'https://i.pravatar.cc/300?img=12',
    bio: currentUser?.bio || "Welcome to WizyClub",
    followingCount: currentUser?.followingCount?.toString() || '0',
    followersCount: currentUser?.followersCount?.toString() || '0',
    entity: currentUser,
  };

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
  const savedData = [...postsData]; // Mock saved data
  const tagsData: any[] = [];

  // Calculate grid height including the Drafts folder (always shown)
  const totalGridItems = postsData.length + 1;
  const gridItemSize = Math.floor((SCREEN_WIDTH - 8) / 3); // 8 = PADDING(2)*2 + GAP(2)*2
  const gridItemHeight = gridItemSize * 1.25; // Aspect Ratio 0.8 (4:5) -> Height = Width * 1.25
  const gridHeight = Math.ceil(totalGridItems / 3) * (gridItemHeight + 2) + 20; // +2 for gap
  
  const videosHeight = Math.ceil(videosData.length / 3) * (gridItemSize * (16 / 9) + 1) + 20;
  const savedHeight = Math.ceil(savedData.length / 3) * (gridItemHeight + 2) + 20;
  const tagsHeight = 300;

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.setPage(index);
  };

  const showPreview = (item: any) => setPreviewItem(item);
  const hidePreview = () => setPreviewItem(null);
  const handleDraftsFolderPress = () => {
    router.push('/drafts');
  };
  const bioLimit = 110;
  const truncatedBio = user.bio.length > bioLimit ? user.bio.substring(0, bioLimit) + '...' : user.bio;

  return (
    <View style={[styles.container, { backgroundColor: bgBody }]}>
      <Animated.View style={[
        styles.topNavContainer,
        { paddingTop: insets.top, backgroundColor: bgContainer },
        animatedHeaderStyle
      ]}>
        <View style={styles.topNav}>
          <View style={styles.navIcon} />
          <Text style={[styles.headerUsername, { color: textPrimary }]}>{!isLoading ? `@${user.username}` : ''}</Text>
          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.navIconButton}
              onPress={() => router.push(`/user/${currentUserId}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Eye size={24} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navIconButton}
              onPress={() => settingsSheetRef.current?.expand()}
            >
              <MoreIcon width={24} height={24} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <SwipeWrapper enableLeft={false} onSwipeRight={() => router.push('/notifications')} edgeOnly={true}>
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
              <ProfileStats
                userId={user.entity.id}
                followingCount={user.followingCount}
                followersCount={user.followersCount}
                mainAvatarUrl={user.avatarUrl}
                isDark={isDark}
                hasStories={user.entity.hasStories}
                hasUnseenStory={user.entity.hasUnseenStory}
                onAvatarPress={() => {
                  if (user.entity.hasStories) {
                    // Navigate to story viewer with user ID
                    router.push(`/story/${user.entity.id}`);
                  }
                }}
              />

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

              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.btnAction, { backgroundColor: btnEditBg }]}
                  onPress={() => editProfileSheetRef.current?.expand()}
                >
                  <Text style={[styles.btnActionText, { color: btnEditText }]}>Profili Düzenle</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAction, { backgroundColor: btnEditBg }]}
                  onPress={() => console.log('Share Profile')}
                >
                  <Text style={[styles.btnActionText, { color: btnEditText }]}>Profili Paylaş</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.socialClubsRow}>
                <SocialTags isDark={isDark} user={user.entity} />
                <View style={[styles.verticalSeparator, { backgroundColor: isDark ? '#444' : '#ccc' }]} />

                <ClubsCollaboration
                  clubsCount={clubs.length}
                  clubLogos={clubLogos}
                  isDark={isDark}
                  onPress={() => clubsSheetRef.current?.expand()}
                />
              </View>
            </View>
          )}

          <View style={[styles.navTabs, { borderBottomColor: cardBg }]}>
            <TouchableOpacity style={[styles.tab, activeTab === 0 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(0)}><GridIcon color={activeTab === 0 ? textPrimary : textSecondary} /></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 1 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(1)}><VideoIcon color={activeTab === 1 ? textPrimary : textSecondary} /></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 2 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(2)}><TagsIcon color={activeTab === 2 ? textPrimary : textSecondary} /></TouchableOpacity>
            <TouchableOpacity style={[styles.tab, activeTab === 3 && [styles.activeTab, { borderBottomColor: textPrimary }]]} onPress={() => handleTabPress(3)}><SaveTabIcon color={activeTab === 3 ? textPrimary : textSecondary} /></TouchableOpacity>
          </View>

          <HighlightPills highlights={highlights} isDark={isDark} />

          <PagerView
            ref={pagerRef}
            style={{ width: '100%', height: activeTab === 0 ? gridHeight : activeTab === 1 ? videosHeight : activeTab === 2 ? tagsHeight : savedHeight }}
            initialPage={0}
            onPageSelected={(e) => setActiveTab(e.nativeEvent.position)}
          >
            <View key="0">
              <PostsGrid
                posts={postsData}
                isDark={isDark}
                onPreview={showPreview}
                onPreviewEnd={hidePreview}
                showDraftsFolder={true}
                drafts={drafts}
                onDraftsFolderPress={handleDraftsFolderPress}
              />
            </View>
            <View key="1"><VideoGrid videos={videosData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} /></View>
            <View key="2">
              <PostsGrid posts={tagsData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} />
              {tagsData.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textSecondary }}>Etiketlenmiş gönderi yok</Text></View>}
            </View>
            <View key="3">
              <PostsGrid posts={savedData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} showDraftsFolder={false} />
              {savedData.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textSecondary }}>Henüz kaydedilen gönderi yok</Text></View>}
            </View>
          </PagerView>
          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SwipeWrapper>

      {previewItem && <PreviewModal item={previewItem} onClose={hidePreview} />}
      <BioBottomSheet ref={bioSheetRef} bio={currentUser.bio || ''} isDark={isDark} />
      <ClubsBottomSheet ref={clubsSheetRef} clubs={clubs} isDark={isDark} />
      <SettingsBottomSheet
        ref={settingsSheetRef}
        isDark={isDark}
        onThemeToggle={toggleTheme}
        onDeletedContentPress={() => deletedContentSheetRef.current?.expand()}
        onSignOut={async () => {
          await useAuthStore.getState().signOut();
          router.replace('/login');
        }}
      />
      <EditProfileSheet
        ref={editProfileSheetRef}
        user={currentUser}
        onUpdateProfile={updateProfile}
        onUploadAvatar={uploadAvatar}
        onUpdateCompleted={() => reload(true)}
      />
      <DeletedContentSheet ref={deletedContentSheetRef} isDark={isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNavContainer: { width: '100%', zIndex: 1000, position: 'absolute', top: 0, left: 0, right: 0 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, height: 60, position: 'relative' },
  navIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerUsername: { fontSize: 16, fontWeight: '600', position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },
  profileContainer: { alignItems: 'center', paddingHorizontal: 10, marginTop: 5 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userNameText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  bioText: { fontSize: 13, lineHeight: 19.5, marginBottom: 20, paddingHorizontal: 5, textAlign: 'center' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25, height: 36, paddingHorizontal: 5, width: '100%' },
  btnAction: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnActionText: { fontSize: 13, fontWeight: '600' },
  btnIconOnly: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e5e5' },
  navTabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2 },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  previewCard: { width: '80%', height: 480, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
  previewVideo: { width: '100%', height: '100%' },
  socialClubsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    marginVertical: 10,
    width: '100%',
  },
  verticalSeparator: {
    width: 1.5,
    height: 20,
  },
});