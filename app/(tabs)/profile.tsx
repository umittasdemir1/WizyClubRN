import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/presentation/contexts/ThemeContext';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { ProfileStats } from '../../src/presentation/components/profile/ProfileStats';
import { SocialLinks } from '../../src/presentation/components/profile/SocialLinks';
import { HighlightPills } from '../../src/presentation/components/profile/HighlightPills';
import { VideoGrid } from '../../src/presentation/components/profile/VideoGrid';
import { BioBottomSheet } from '../../src/presentation/components/profile/BioBottomSheet';
import { ClubsBottomSheet } from '../../src/presentation/components/profile/ClubsBottomSheet';
import { ChevronLeft, Sun, Moon, MoreHorizontal, Settings } from 'lucide-react-native';
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

// SVG Icon for verified badge
const VerifiedBadge = () => (
  <Svg width="20" height="20" viewBox="0 -960 960 960" fill="#3D91FF">
    <Path d="m344-60-76-128-144-32+14-148-98-112+98-112-14-148+144-32+76-128+136+58+136-58+76+128+144+32-14+148+98+112-98+112+14+148-144+32-76+128-136-58-136+58Zm34-102+102-44+104+44+56-96+110-26-10-112+74-84-74-86+10-112-110-24-58-96-102+44-104-44-56+96-110+24+10+112-74+86+74+84-10+114+110+24+58+96Zm102-318Zm-42+142+226-226-56-58-170+170-86-84-56+56+142+142Z" />
  </Svg>
);

// Grid Icon for Posts tab
const GridIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 -960 960 960" fill={color}>
    <Path d="M240-160q-33 0-56.5-23.5T160-240q0-33 23.5-56.5T240-320q33 0 56.5 23.5T320-240q0 33-23.5 56.5T240-160Zm240 0q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm240 0q-33 0-56.5-23.5T640-240q0-33 23.5-56.5T720-320q33 0 56.5 23.5T800-240q0 33-23.5 56.5T720-160ZM240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400ZM240-640q-33 0-56.5-23.5T160-720q0-33 23.5-56.5T240-800q33 0 56.5 23.5T320-720q0 33-23.5 56.5T240-640Zm240 0q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Zm240 0q-33 0-56.5-23.5T640-720q0-33 23.5-56.5T720-800q33 0 56.5 23.5T800-720q0 33-23.5 56.5T720-640Z" />
  </Svg>
);

// Video Icon for Videos tab
const VideoIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 -960 960 960" fill={color}>
    <Path d="m480-420+240-160-240-160v320Zm28+220h224q-7+26-24+42t-44+20L228-85q-33+5-59.5-15.5T138-154L85-591q-4-33+16-59t53-30l46-6v80l-36+5+54+437+290-36Zm-148-80q-33+0-56.5-23.5T280-360v-440q0-33+23.5-56.5T360-880h440q33+0+56.5+23.5T880-800v440q0+33-23.5+56.5T800-280H360Zm0-80h440v-440H360v440Zm220-220ZM218-164Z" />
  </Svg>
);

// Tags Icon
const TagsIcon = ({ color }: { color: string }) => (
  <Svg width="22" height="22" viewBox="0 0 24 24" fill={color}>
    <Path d="M0 0h24v24H0V0z" fill="none" />
    <Path d="M2.53 19.65l1.34.56v-9.03l-2.43 5.86c-.41 1.02.08 2.19 1.09 2.61zm19.5-3.7L17.07 3.98c-.31-.75-1.04-1.21-1.81-1.23-.26 0-.53.04-.79.15L7.1 5.95c-.75.31-1.21 1.03-1.23 1.8-.01.27.04.54.15.8l4.96 11.97c.31.76 1.05 1.22 1.83 1.23.26 0 .52-.05.77-.15l7.36-3.05c1.02-.42 1.51-1.59 1.09-2.6zm-9.2 3.8L7.87 7.79l7.35-3.04h.01l4.95 11.95-7.35 3.05z" />
    <Circle cx="11" cy="9" r="1" />
    <Path d="M5.88 19.75c0 1.1.9 2 2 2h1.45l-3.45-8.34v6.34z" />
  </Svg>
);

// Animated Icon Button Component
const AnimatedIconButton = ({
  icon: Icon,
  onPress,
  isActive,
  activeColor,
  inactiveColor,
  size = 14,
}: {
  icon: any;
  onPress: () => void;
  isActive?: boolean;
  activeColor?: string;
  inactiveColor: string;
  size?: number;
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

  const color = isActive && activeColor ? activeColor : inactiveColor;

  return (
    <Pressable onPress={handlePress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={animatedStyle}>
        <Icon width={size} height={size} color={color} />
      </Animated.View>
    </Pressable>
  );
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { colorScheme, toggleTheme, isDark } = useTheme();
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'videos' | 'tags'>('posts');
  const [isNotificationsOn, setIsNotificationsOn] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const bioSheetRef = useRef<BottomSheet>(null);
  const clubsSheetRef = useRef<BottomSheet>(null);

  // Theme colors
  const bgBody = isDark ? '#121212' : '#e0e0e0';
  const bgContainer = isDark ? '#000000' : '#ffffff';
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? '#888888' : '#555555';
  const borderColor = isDark ? '#ffffff' : '#000000';
  const cardBg = isDark ? '#1c1c1e' : '#f0f0f0';
  const iconColor = isDark ? '#ffffff' : '#000000';
  const btnFollowBg = isDark ? '#ffffff' : '#000000';
  const btnFollowText = isDark ? '#000000' : '#ffffff';
  const btnSecondaryBg = isDark ? '#1c1c1e' : '#f0f0f0';

  // User data
  const user = {
    name: 'Ümit TAŞDEMİR',
    username: 'umittasdemir',
    avatarUrl: 'https://i.pravatar.cc/300?img=5',
    bio: "Ümit, dünyanın gizli kalmış güzelliklerini keşfetmeye adamış maceraperest bir gezgindir. Son on yılını Patagonya'nın buzlu zirvelerinden Marakeş'in hareketli pazarlarına kadar farklı kültürleri deneyimleyerek geçirdi. Fotoğrafçılığa olan tutkusu, ziyaret ettiği yerlerin ruhunu yakalamasını sağlıyor. Seyahat etmediği zamanlarda, mobil uygulamalar geliştirerek kodlama dünyasında iz bırakıyor ve toplulukla bilgi paylaşımında bulunuyor. 'Seyahat etmek, sizi daha zengin yapan tek harcamadır' felsefesine inanıyor.",
    followingCount: '204',
    followersCount: '2.5M',
  };

  // Avatar stacks for stats
  const followingAvatars = [
    'https://i.pravatar.cc/100?img=3',
    'https://i.pravatar.cc/100?img=4',
    'https://i.pravatar.cc/100?img=5',
  ];

  const followersAvatars = [
    'https://i.pravatar.cc/100?img=6',
    'https://i.pravatar.cc/100?img=7',
    'https://i.pravatar.cc/100?img=8',
  ];

  // Clubs data - Using reliable CDN hosted brand logos
  const clubLogos = [
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/200px-Tesla_Motors.svg.png',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png',
  ];

  // Full clubs list with collaboration counts
  const clubs = [
    {
      id: '1',
      name: 'Amazon',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Amazon_logo.svg/200px-Amazon_logo.svg.png',
      collaborationCount: 12,
    },
    {
      id: '2',
      name: 'Tesla',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Tesla_Motors.svg/200px-Tesla_Motors.svg.png',
      collaborationCount: 8,
    },
    {
      id: '3',
      name: 'Nike',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/200px-Logo_NIKE.svg.png',
      collaborationCount: 15,
    },
    {
      id: '4',
      name: 'Apple',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/200px-Apple_logo_black.svg.png',
      collaborationCount: 10,
    },
    {
      id: '5',
      name: 'Adidas',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/200px-Adidas_Logo.svg.png',
      collaborationCount: 7,
    },
    {
      id: '6',
      name: 'Coca-Cola',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/Coca-Cola_logo.svg/200px-Coca-Cola_logo.svg.png',
      collaborationCount: 5,
    },
  ];

  // Highlights data
  const highlights = [
    {
      id: '1',
      title: 'Friends',
      thumbnail: 'https://picsum.photos/100/100?random=1',
    },
    {
      id: '2',
      title: 'Pet Dog',
      thumbnail: 'https://picsum.photos/100/100?random=2',
    },
    {
      id: '3',
      title: 'Travel',
      thumbnail: 'https://picsum.photos/100/100?random=3',
    },
  ];

  // Videos data
  const videos = [
    { id: '1', thumbnail: 'https://picsum.photos/300/500?random=10', views: '12.5k' },
    { id: '2', thumbnail: 'https://picsum.photos/300/500?random=11', views: '8.1k' },
    { id: '3', thumbnail: 'https://picsum.photos/300/500?random=12', views: '2.1M' },
    { id: '4', thumbnail: 'https://picsum.photos/300/500?random=13', views: '340' },
    { id: '5', thumbnail: 'https://picsum.photos/300/500?random=14', views: '56k' },
    { id: '6', thumbnail: 'https://picsum.photos/300/500?random=15', views: '900' },
  ];

  const toggleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const openBioSheet = () => {
    bioSheetRef.current?.expand();
  };

  const openClubsSheet = () => {
    clubsSheetRef.current?.expand();
  };

  const bioLimit = 110;
  const truncatedBio =
    user.bio.length > bioLimit ? user.bio.substring(0, bioLimit) + '...' : user.bio;

  return (
    <View style={[styles.container, { backgroundColor: bgBody }]}>
      {/* Mobile Container */}
      <View
        style={[
          styles.mobileContainer,
          {
            backgroundColor: bgContainer,
            borderColor: borderColor,
            paddingTop: insets.top,
          },
        ]}
      >
        {/* Top Nav */}
        <View style={styles.topNav}>
          <TouchableOpacity style={styles.navIcon}>
            <ChevronLeft size={18} color={iconColor} />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.navIcon} onPress={toggleTheme}>
              {isDark ? <Sun size={18} color={iconColor} /> : <Moon size={18} color={iconColor} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIcon}>
              <MoreHorizontal size={18} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Profile Container */}
          <View style={styles.profileContainer}>
            {/* Avatar */}
            <View style={[styles.avatarBox, { borderColor: cardBg }]}>
              <Avatar url={user.avatarUrl} size={90} />
            </View>

            {/* Name with Verified Badge */}
            <View style={styles.userNameRow}>
              <Text style={[styles.userNameText, { color: textPrimary }]}>{user.name}</Text>
              <View style={styles.verifiedBadge}>
                <VerifiedBadge />
              </View>
            </View>

            {/* Username - Separate from name */}
            <Text style={[styles.userHandle, { color: textSecondary }]}>@{user.username}</Text>

            {/* Bio */}
            <TouchableOpacity onPress={openBioSheet} disabled={user.bio.length <= bioLimit}>
              <Text style={[styles.bioText, { color: textSecondary }]}>
                {truncatedBio}
                {user.bio.length > bioLimit && (
                  <Text style={[styles.readMoreLink, { color: textPrimary }]}> devamını gör</Text>
                )}
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[
                  styles.btnFollow,
                  {
                    backgroundColor: isFollowing ? btnSecondaryBg : btnFollowBg,
                    borderColor: isFollowing ? textSecondary : 'transparent',
                  },
                ]}
                onPress={toggleFollow}
              >
                <Text
                  style={[
                    styles.btnFollowText,
                    { color: isFollowing ? textPrimary : btnFollowText },
                  ]}
                >
                  {isFollowing ? 'Takipte' : 'Takip Et'}
                </Text>
              </TouchableOpacity>

              {isFollowing && (
                <TouchableOpacity
                  style={[
                    styles.btnIconOnly,
                    { backgroundColor: btnSecondaryBg, borderColor: 'rgba(255,255,255,0.1)' },
                  ]}
                >
                  <Settings size={18} color={iconColor} />
                </TouchableOpacity>
              )}

              {/* Bell Button with toggle */}
              <View
                style={[
                  styles.btnIconOnly,
                  {
                    backgroundColor: isNotificationsOn ? '#cc0000' : btnSecondaryBg,
                    borderColor: 'rgba(255,255,255,0.1)',
                  },
                ]}
              >
                <AnimatedIconButton
                  icon={({ color, width, height }: any) => (
                    <Svg width={width} height={height} viewBox="0 0 24 24" fill={color}>
                      <Path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </Svg>
                  )}
                  onPress={() => setIsNotificationsOn(!isNotificationsOn)}
                  isActive={isNotificationsOn}
                  activeColor="#fff"
                  inactiveColor={iconColor}
                />
              </View>

              {/* Like Button with animation */}
              <View
                style={[
                  styles.btnIconOnly,
                  { backgroundColor: btnSecondaryBg, borderColor: 'rgba(255,255,255,0.1)' },
                ]}
              >
                <AnimatedIconButton
                  icon={LikeIcon}
                  onPress={() => setIsLiked(!isLiked)}
                  isActive={isLiked}
                  activeColor="#FF2146"
                  inactiveColor={iconColor}
                />
              </View>

              {/* Share Button with animation */}
              <View
                style={[
                  styles.btnIconOnly,
                  { backgroundColor: btnSecondaryBg, borderColor: 'rgba(255,255,255,0.1)' },
                ]}
              >
                <AnimatedIconButton
                  icon={ShareIcon}
                  onPress={() => {
                    // Share functionality
                  }}
                  inactiveColor={iconColor}
                />
              </View>
            </View>

            {/* Stats */}
            <ProfileStats
              followingCount={user.followingCount}
              followingAvatars={followingAvatars}
              followersCount={user.followersCount}
              followersAvatars={followersAvatars}
              isDark={isDark}
            />

            {/* Social Links */}
            <SocialLinks
              clubsCount={clubs.length}
              clubLogos={clubLogos}
              isDark={isDark}
              onClubsPress={openClubsSheet}
            />
          </View>

          {/* Tabs */}
          <View style={[styles.navTabs, { borderBottomColor: cardBg }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'posts' && [styles.activeTab, { borderBottomColor: textPrimary }],
              ]}
              onPress={() => setActiveTab('posts')}
            >
              <GridIcon color={activeTab === 'posts' ? textPrimary : textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'videos' && [styles.activeTab, { borderBottomColor: textPrimary }],
              ]}
              onPress={() => setActiveTab('videos')}
            >
              <VideoIcon color={activeTab === 'videos' ? textPrimary : textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'tags' && [styles.activeTab, { borderBottomColor: textPrimary }],
              ]}
              onPress={() => setActiveTab('tags')}
            >
              <TagsIcon color={activeTab === 'tags' ? textPrimary : textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Highlights */}
          <HighlightPills highlights={highlights} isDark={isDark} />

          {/* Video Grid */}
          <VideoGrid videos={videos} isDark={isDark} />

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Bio Bottom Sheet */}
      <BioBottomSheet ref={bioSheetRef} bio={user.bio} isDark={isDark} />

      {/* Clubs Bottom Sheet */}
      <ClubsBottomSheet ref={clubsSheetRef} clubs={clubs} isDark={isDark} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mobileContainer: {
    flex: 1,
    borderRadius: 0, // Removed border radius for mobile
    borderWidth: 0, // Removed border for mobile
    overflow: 'hidden',
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    height: 60,
  },
  navIcon: {
    width: 35,
    height: 35,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17.5,
  },
  navRight: {
    flexDirection: 'row',
    gap: 5,
  },
  profileContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  avatarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    borderWidth: 2,
    marginBottom: 10,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  verifiedBadge: {
    alignItems: 'center',
  },
  userHandle: {
    fontSize: 14,
    marginBottom: 15,
    fontWeight: '400',
  },
  bioText: {
    fontSize: 13,
    lineHeight: 19.5,
    marginBottom: 20,
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  readMoreLink: {
    fontWeight: '600',
    marginLeft: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 25,
    height: 36,
    paddingHorizontal: 5,
    width: '100%',
  },
  btnFollow: {
    flex: 1,
    height: 36,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
  },
  btnFollowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnIconOnly: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnSub: {
    backgroundColor: '#cc0000',
  },
  navTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    gap: 8,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
