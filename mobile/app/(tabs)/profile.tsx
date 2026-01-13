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
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import Video from 'react-native-video';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { useDraftStore } from '../../src/presentation/store/useDraftStore';
import { useInAppBrowserStore } from '../../src/presentation/store/useInAppBrowserStore';
import { ProfileStats } from '../../src/presentation/components/profile/ProfileStats';
import { SocialTags } from '../../src/presentation/components/profile/SocialTags';
import { ClubsCollaboration } from '../../src/presentation/components/profile/ClubsCollaboration';
import { HighlightPills } from '../../src/presentation/components/profile/HighlightPills';
import { VideoGrid } from '../../src/presentation/components/profile/VideoGrid';
import { PostsGrid } from '../../src/presentation/components/profile/PostsGrid';
import { BioBottomSheet } from '../../src/presentation/components/profile/BioBottomSheet';
import { ClubsBottomSheet } from '../../src/presentation/components/profile/ClubsBottomSheet';
import { EditProfileSheet } from '../../src/presentation/components/profile/EditProfileSheet';
import { Eye, X, Menu, SunMoon, ClockFading, Activity, ArrowLeft, EyeOff, CalendarDays, ImagePlay, Bookmark, Trash2, Heart, UserCog, Lock, Mail, Phone, ShieldAlert, Bell, ShieldBan, ShieldCheck, MessageSquare, User, Sparkles, Briefcase, BadgeCheck, BadgePlus, Globe, SlidersHorizontal } from 'lucide-react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import Svg, { Path, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useProfile } from '../../src/presentation/hooks/useProfile';
import { useSavedVideos } from '../../src/presentation/hooks/useSavedVideos';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { DeletedContentMenu } from '../../src/presentation/components/profile/DeletedContentSheet';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';
import { CONFIG } from '../../src/core/config';
import { ProfileSkeleton } from '../../src/presentation/components/profile/ProfileSkeleton';
import { VerifiedBadge } from '../../src/presentation/components/shared/VerifiedBadge';
import { ActivityGrid } from '../../src/presentation/components/profile/ActivityGrid';
import { UserActivityRepositoryImpl } from '../../src/data/repositories/UserActivityRepositoryImpl';
import { Video as VideoEntity } from '../../src/domain/entities/Video';

const activityRepository = new UserActivityRepositoryImpl();

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// SVG Icons
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
  const { isDark, theme, setTheme } = useThemeStore();
  const { user: authUser, initialize, isInitialized } = useAuthStore();
  const { drafts, fetchDrafts } = useDraftStore();
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const isFocused = useIsFocused();

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

  const loadAdminConfig = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.API_URL}/admin/config?ts=${Date.now()}`);
      if (!response.ok) return;
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const getValue = (key: string) => items.find((item: any) => item.key === key)?.value;
      const getNumber = (key: string) => {
        const value = getValue(key);
        if (typeof value === 'number') return value;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      };
      const getString = (key: string) => {
        const value = getValue(key);
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        if (trimmed.toLowerCase() === 'auto') return undefined;
        return trimmed;
      };

      const titleText = getString('profile.settings.title.text') || getString('profile.settings.title');
      setSettingsCopy((prev) => ({
        ...prev,
        title: titleText || prev.title,
        actionsHeader: getString('profile.settings.actionsHeader') || prev.actionsHeader,
        deletedHeader: getString('profile.settings.deletedHeader') || prev.deletedHeader,
        themeLabel: getString('profile.settings.themeLabel') || prev.themeLabel,
        themeOptionLight: getString('profile.settings.themeOptionLight') || prev.themeOptionLight,
        themeOptionDark: getString('profile.settings.themeOptionDark') || prev.themeOptionDark,
        themeOptionSystem: getString('profile.settings.themeOptionSystem') || prev.themeOptionSystem,
        actionsLabel: getString('profile.settings.actionsLabel') || prev.actionsLabel,
        accountSettingsLabel: getString('profile.settings.accountSettingsLabel') || prev.accountSettingsLabel,
        notificationsLabel: getString('profile.settings.notificationsLabel') || prev.notificationsLabel,
        notificationsItemPush: getString('profile.settings.notificationsItem.push') || prev.notificationsItemPush,
        notificationsItemEmail: getString('profile.settings.notificationsItem.email') || prev.notificationsItemEmail,
        notificationsItemSms: getString('profile.settings.notificationsItem.sms') || prev.notificationsItemSms,
        inAppBrowserLabel: getString('profile.settings.inAppBrowser.label') || prev.inAppBrowserLabel,
        browserHistoryLabel: getString('profile.settings.inAppBrowser.history.label') || prev.browserHistoryLabel,
        browserHistoryOptionOn: getString('profile.settings.inAppBrowser.history.optionOn') || prev.browserHistoryOptionOn,
        browserHistoryOptionOff: getString('profile.settings.inAppBrowser.history.optionOff') || prev.browserHistoryOptionOff,
        browserHistoryViewLabel: getString('profile.settings.inAppBrowser.history.view') || prev.browserHistoryViewLabel,
        browserHistoryClearLabel: getString('profile.settings.inAppBrowser.history.clear') || prev.browserHistoryClearLabel,
        contentPreferencesLabel: getString('profile.settings.contentPreferences.label') || prev.contentPreferencesLabel,
        accountSettingsItemPassword: getString('profile.settings.accountSettingsItem.password') || prev.accountSettingsItemPassword,
        accountSettingsItemEmail: getString('profile.settings.accountSettingsItem.email') || prev.accountSettingsItemEmail,
        accountSettingsItemPhone: getString('profile.settings.accountSettingsItem.phone') || prev.accountSettingsItemPhone,
        accountSettingsItemStatus: getString('profile.settings.accountSettingsItem.status') || prev.accountSettingsItemStatus,
        accountSettingsItemBlocked: getString('profile.settings.accountSettingsItem.blocked') || prev.accountSettingsItemBlocked,
        accountSettingsItemMuted: getString('profile.settings.accountSettingsItem.muted') || prev.accountSettingsItemMuted,
        accountSettingsItemType: getString('profile.settings.accountSettingsItem.type') || prev.accountSettingsItemType,
        accountTypeCreator: getString('profile.settings.accountType.creator') || prev.accountTypeCreator,
        accountTypeBranded: getString('profile.settings.accountType.branded') || prev.accountTypeBranded,
        accountTypeVerification: getString('profile.settings.accountType.verification') || prev.accountTypeVerification,
        accountTypeBadge: getString('profile.settings.accountType.badge') || prev.accountTypeBadge,
        actionsHeroTitle: getString('profile.settings.actionsHeroTitle') || prev.actionsHeroTitle,
        actionsHeroText: getString('profile.settings.actionsHeroText') || prev.actionsHeroText,
        logoutLabel: getString('profile.settings.logoutLabel') || prev.logoutLabel,
        deletedLabel: getString('profile.settings.deletedLabel') || prev.deletedLabel,
        deletedHelper: getString('profile.settings.deletedHelper') || prev.deletedHelper,
        actionsItemLikes: getString('profile.settings.actionsItem.likes') || prev.actionsItemLikes,
        actionsItemSaved: getString('profile.settings.actionsItem.saved') || prev.actionsItemSaved,
        actionsItemArchived: getString('profile.settings.actionsItem.archived') || prev.actionsItemArchived,
        actionsItemNotInterested: getString('profile.settings.actionsItem.notInterested') || prev.actionsItemNotInterested,
        actionsItemInterested: getString('profile.settings.actionsItem.interested') || prev.actionsItemInterested,
        actionsItemAccountHistory: getString('profile.settings.actionsItem.accountHistory') || prev.actionsItemAccountHistory,
        actionsItemWatchHistory: getString('profile.settings.actionsItem.watchHistory') || prev.actionsItemWatchHistory,
        interestedTopics: getString('profile.settings.interested.topics') || prev.interestedTopics,
        accountHistoryTitle: getString('profile.settings.accountHistory.title') || prev.accountHistoryTitle,
        accountHistoryDateLabel: getString('profile.settings.accountHistory.dateLabel') || prev.accountHistoryDateLabel,
        accountHistoryEmailLabel: getString('profile.settings.accountHistory.emailLabel') || prev.accountHistoryEmailLabel,
        accountHistoryIdLabel: getString('profile.settings.accountHistory.idLabel') || prev.accountHistoryIdLabel,
      }));

      const buildTextOverrides = (prefix: string) => {
        const overrides: Record<string, any> = {};
        const color = getString(`${prefix}.color`);
        if (color) overrides.color = color;
        const fontSize = getNumber(`${prefix}.fontSize`);
        if (typeof fontSize === 'number') overrides.fontSize = fontSize;
        const fontWeight = getString(`${prefix}.fontWeight`);
        if (fontWeight) overrides.fontWeight = fontWeight;
        const fontStyle = getString(`${prefix}.fontStyle`);
        if (fontStyle) overrides.fontStyle = fontStyle;
        const fontFamily = getString(`${prefix}.fontFamily`);
        if (fontFamily && fontFamily !== 'system') overrides.fontFamily = fontFamily;
        const letterSpacing = getNumber(`${prefix}.letterSpacing`);
        if (typeof letterSpacing === 'number') overrides.letterSpacing = letterSpacing;
        const lineHeight = getNumber(`${prefix}.lineHeight`);
        if (typeof lineHeight === 'number') overrides.lineHeight = lineHeight;
        const textAlign = getString(`${prefix}.textAlign`);
        if (textAlign) overrides.textAlign = textAlign;
        const textTransform = getString(`${prefix}.textTransform`);
        if (textTransform) overrides.textTransform = textTransform;
        return overrides;
      };

      setSettingsTitleOverrides(buildTextOverrides('profile.settings.title'));
      setSettingsSectionTitleOverrides(buildTextOverrides('profile.settings.sectionTitle'));
      setSettingsItemLabelOverrides(buildTextOverrides('profile.settings.itemLabel'));
      setSettingsHelperOverrides(buildTextOverrides('profile.settings.helperText'));

      const iconColor = getString('profile.settings.icon.color');
      setSettingsIconColorOverride(iconColor || null);
      const iconStrokeWidth = getNumber('profile.settings.icon.strokeWidth');
      setSettingsIconStrokeWidthOverride(typeof iconStrokeWidth === 'number' ? iconStrokeWidth : null);
      const iconSize = getNumber('profile.settings.icon.size');
      setSettingsIconSizeOverride(typeof iconSize === 'number' ? iconSize : null);

      const closeIconColor = getString('profile.settings.icon.close.color');
      const closeIconSize = getNumber('profile.settings.icon.close.size');
      const closeIconStroke = getNumber('profile.settings.icon.close.strokeWidth');
      setSettingsIconCloseOverrides({
        color: closeIconColor,
        size: closeIconSize,
        strokeWidth: closeIconStroke,
      });

      const backIconColor = getString('profile.settings.icon.back.color');
      const backIconSize = getNumber('profile.settings.icon.back.size');
      const backIconStroke = getNumber('profile.settings.icon.back.strokeWidth');
      setSettingsIconBackOverrides({
        color: backIconColor,
        size: backIconSize,
        strokeWidth: backIconStroke,
      });
      const chevronColor = getString('profile.settings.chevron.color');
      setSettingsChevronColorOverride(chevronColor || null);
      const borderColor = getString('profile.settings.item.borderColor');
      setSettingsBorderColorOverride(borderColor || null);
      const segmentBg = getString('profile.settings.segment.backgroundColor');
      setSettingsSegmentBgColorOverride(segmentBg || null);
      const segmentActive = getString('profile.settings.segment.activeColor');
      setSettingsSegmentActiveColorOverride(segmentActive || null);
      const segmentActiveText = getString('profile.settings.segment.activeTextColor');
      setSettingsSegmentActiveTextColorOverride(segmentActiveText || null);
      const segmentText = getString('profile.settings.segment.textColor');
      setSettingsSegmentTextColorOverride(segmentText || null);
    } catch (error) {
      console.warn('[Profile] Admin config load failed:', error);
    }
  }, []);

  const connectAdminSocket = useCallback(() => {
    const existing = adminWsRef.current;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const scheduleReconnect = () => {
      if (adminWsReconnectRef.current) return;
      adminWsReconnectRef.current = setTimeout(() => {
        adminWsReconnectRef.current = null;
        connectAdminSocket();
      }, 2000);
    };
    const wsUrl = CONFIG.API_URL.replace(/^http/, 'ws') + '/admin/ws';
    const socket = new WebSocket(wsUrl);
    adminWsRef.current = socket;

    socket.onopen = () => {
      loadAdminConfig();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data || '{}'));
        if (data?.type === 'admin-config-updated') {
          loadAdminConfig();
        }
      } catch {
        // Ignore malformed messages
      }
    };

    socket.onclose = () => {
      adminWsRef.current = null;
      if (isProfileFocusedRef.current) {
        scheduleReconnect();
      }
    };
  }, [loadAdminConfig]);

  useEffect(() => {
    let isActive = true;
    if (isActive) {
      loadAdminConfig();
    }
    return () => {
      isActive = false;
    };
  }, [loadAdminConfig]);

  useEffect(() => {
    isProfileFocusedRef.current = isFocused;
    if (isFocused) {
      loadAdminConfig();
      connectAdminSocket();
      return () => {
        isProfileFocusedRef.current = false;
        if (adminWsReconnectRef.current) {
          clearTimeout(adminWsReconnectRef.current);
          adminWsReconnectRef.current = null;
        }
        if (adminWsRef.current) {
          adminWsRef.current.close();
          adminWsRef.current = null;
        }
      };
    }
    if (adminWsReconnectRef.current) {
      clearTimeout(adminWsReconnectRef.current);
      adminWsReconnectRef.current = null;
    }
    if (adminWsRef.current) {
      adminWsRef.current.close();
      adminWsRef.current = null;
    }
  }, [isFocused, loadAdminConfig, connectAdminSocket]);

  const { videos, refreshFeed } = useVideoFeed(currentUserId);
  const { videos: savedVideosData, refresh: refreshSavedVideos } = useSavedVideos(currentUserId);

  const { user: profileUser, isLoading, reload, updateProfile, uploadAvatar } = useProfile(currentUserId);
  const setCustomFeed = useActiveVideoStore((state) => state.setCustomFeed);
  const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);

  useFocusEffect(
    useCallback(() => {
      RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
      // Reload data when profile is focused
      refreshSavedVideos();
    }, [isDark, refreshSavedVideos])
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
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<'main' | 'actions' | 'deleted' | 'likes' | 'saved' | 'history' | 'archived' | 'notInterested' | 'interested' | 'accountHistory' | 'accountSettings' | 'notifications' | 'accountType' | 'inAppBrowser' | 'browserHistory' | 'contentPreferences'>('main');
  const [activityVideos, setActivityVideos] = useState<VideoEntity[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'today' | 'yesterday' | 'last3' | 'last7' | 'last30'>('last7');
  const [historyFilterOpen, setHistoryFilterOpen] = useState(false);
  const [historySort, setHistorySort] = useState<'newest' | 'oldest' | 'az'>('newest');
  const [historySortOpen, setHistorySortOpen] = useState(false);
  const [historySelectionMode, setHistorySelectionMode] = useState(false);
  const [selectedHistoryKeys, setSelectedHistoryKeys] = useState<string[]>([]);
  const browserHistoryEnabled = useInAppBrowserStore((state) => state.historyEnabled);
  const setBrowserHistoryEnabled = useInAppBrowserStore((state) => state.setHistoryEnabled);
  const browserHistory = useInAppBrowserStore((state) => state.history);
  const clearBrowserHistory = useInAppBrowserStore((state) => state.clearHistory);
  const openInAppBrowserUrl = useInAppBrowserStore((state) => state.openUrl);
  const [settingsCopy, setSettingsCopy] = useState({
    title: 'Ayarlar ve kişisel araçlar',
    actionsHeader: 'Hareketler',
    deletedHeader: 'Yakınlarda Silinenler',
    themeLabel: 'Tema',
    themeOptionLight: 'Açık',
    themeOptionDark: 'Koyu',
    themeOptionSystem: 'Cihaz',
    actionsLabel: 'Hareketler',
    accountSettingsLabel: 'Hesap ayarları',
    notificationsLabel: 'Bildirimler',
    notificationsItemPush: 'Anlık bildirimler',
    notificationsItemEmail: 'E-posta bildirimleri',
    notificationsItemSms: 'SMS bildirimleri',
    inAppBrowserLabel: 'Uygulama içi tarayıcı',
    browserHistoryLabel: 'Tarayıcı geçmişi',
    browserHistoryOptionOn: 'Açık',
    browserHistoryOptionOff: 'Kapalı',
    browserHistoryViewLabel: 'Tarayıcı geçmişini gör',
    browserHistoryClearLabel: 'Tarayıcı geçmişini temizle',
    contentPreferencesLabel: 'İçerik tercihleri',
    accountSettingsItemPassword: 'Şifre',
    accountSettingsItemEmail: 'E-posta',
    accountSettingsItemPhone: 'Telefon numarası',
    accountSettingsItemStatus: 'Hesap durumu',
    accountSettingsItemBlocked: 'Engellenenler',
    accountSettingsItemMuted: 'Sessize alınanlar',
    accountSettingsItemType: 'Hesap türü',
    accountTypeCreator: 'İçerik üreticisi ol',
    accountTypeBranded: 'Markalı içerik',
    accountTypeVerification: 'Doğrulama talep et',
    accountTypeBadge: 'Rozet için kaydol',
    actionsHeroTitle: 'Hesap yönetimini tek bir yerde yapabilirsin',
    actionsHeroText: 'Tüm hesap hareketlerini incele ve yönet',
    logoutLabel: 'Çıkış Yap',
    deletedLabel: 'Yakınlarda Silinenler',
    deletedHelper: 'Son 15 gün içinde silinenleri geri yükle',
    actionsItemLikes: 'Beğenilerin',
    actionsItemSaved: 'Kaydedilenlerin',
    actionsItemArchived: 'Arşivlenenler',
    actionsItemNotInterested: 'İlgilenmediklerin',
    actionsItemInterested: 'İlgilendiklerin',
    actionsItemAccountHistory: 'Hesap geçmişi',
    actionsItemWatchHistory: 'İzleme geçmişi',
    interestedTopics: 'Müzik, Teknoloji, Yaşam, Spor, Eğlence, Seyahat',
    accountHistoryTitle: 'Hesap Bilgileri',
    accountHistoryDateLabel: 'Hesabın oluşturulma tarihi',
    accountHistoryEmailLabel: 'E-posta',
    accountHistoryIdLabel: 'Kullanıcı Kimliği (ID)',
  });
  const [settingsTitleOverrides, setSettingsTitleOverrides] = useState<Record<string, any>>({});
  const [settingsSectionTitleOverrides, setSettingsSectionTitleOverrides] = useState<Record<string, any>>({});
  const [settingsItemLabelOverrides, setSettingsItemLabelOverrides] = useState<Record<string, any>>({});
  const [settingsHelperOverrides, setSettingsHelperOverrides] = useState<Record<string, any>>({});
  const [settingsIconColorOverride, setSettingsIconColorOverride] = useState<string | null>(null);
  const [settingsIconStrokeWidthOverride, setSettingsIconStrokeWidthOverride] = useState<number | null>(null);
  const [settingsIconSizeOverride, setSettingsIconSizeOverride] = useState<number | null>(null);
  const [settingsIconCloseOverrides, setSettingsIconCloseOverrides] = useState<Record<string, any>>({});
  const [settingsIconBackOverrides, setSettingsIconBackOverrides] = useState<Record<string, any>>({});
  const [settingsChevronColorOverride, setSettingsChevronColorOverride] = useState<string | null>(null);
  const [settingsBorderColorOverride, setSettingsBorderColorOverride] = useState<string | null>(null);
  const [settingsSegmentBgColorOverride, setSettingsSegmentBgColorOverride] = useState<string | null>(null);
  const [settingsSegmentActiveColorOverride, setSettingsSegmentActiveColorOverride] = useState<string | null>(null);
  const [settingsSegmentActiveTextColorOverride, setSettingsSegmentActiveTextColorOverride] = useState<string | null>(null);
  const [settingsSegmentTextColorOverride, setSettingsSegmentTextColorOverride] = useState<string | null>(null);
  const adminWsRef = useRef<WebSocket | null>(null);
  const adminWsReconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProfileFocusedRef = useRef(false);
  const settingsTranslateX = useSharedValue(SCREEN_WIDTH);
  const settingsBackdropOpacity = useSharedValue(0);
  const editProfileSheetRef = useRef<BottomSheet>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Silent refresh - don't show skeleton, just update data
    await Promise.all([refreshFeed(), reload(true), refreshSavedVideos()]);
    setRefreshing(false);
  }, [refreshFeed, reload]);

  // Dynamic Theme Colors
  const bgBody = themeColors.background;
  const bgContainer = themeColors.background;
  const textPrimary = themeColors.textPrimary;
  const textSecondary = themeColors.textSecondary;
  const cardBg = themeColors.card;
  const iconColor = themeColors.textPrimary;
  const settingsItemBorderColor = settingsBorderColorOverride || (isDark ? '#2c2c2e' : '#e5e5e5');
  const settingsIconColor = settingsIconColorOverride || textPrimary;
  const settingsIconStroke = settingsIconStrokeWidthOverride ?? 1.2;
  const settingsIconSize = settingsIconSizeOverride ?? 24;
  const closeIconColor = settingsIconCloseOverrides.color || settingsIconColor;
  const closeIconSize = settingsIconCloseOverrides.size ?? 22;
  const closeIconStroke = settingsIconCloseOverrides.strokeWidth ?? 1.6;
  const backIconColor = settingsIconBackOverrides.color || settingsIconColor;
  const backIconSize = settingsIconBackOverrides.size ?? 22;
  const backIconStroke = settingsIconBackOverrides.strokeWidth ?? 1.6;
  const settingsChevronColor = settingsChevronColorOverride || textSecondary;
  const settingsSegmentBg = settingsSegmentBgColorOverride || (isDark ? '#2c2c2e' : '#ededf0');
  const settingsSegmentActive = settingsSegmentActiveColorOverride || '#FF3B30';
  const settingsSegmentActiveText = settingsSegmentActiveTextColorOverride || '#FFFFFF';
  const settingsSegmentText = settingsSegmentTextColorOverride || textPrimary;

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
  const postsData = safeVideos.map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', type: 'video' as const, videoUrl: v.videoUrl }));
  const videosData = safeVideos.map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', videoUrl: v.videoUrl }));
  const savedData = (savedVideosData || []).map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', type: 'video' as const, videoUrl: v.videoUrl }));
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
    pagerRef.current?.setPageWithoutAnimation(index);
  };

  const showPreview = (item: any) => setPreviewItem(item);
  const hidePreview = () => setPreviewItem(null);
  const handleDraftsFolderPress = () => {
    router.push('/drafts' as any);
  };

  const handleVideoPress = (video: any, index: number) => {
    setCustomFeed(safeVideos);
    setActiveVideo(video.id, index);
    router.push('/custom-feed');
  };

  const handleSavedPress = (video: any, index: number) => {
    setCustomFeed(savedVideosData);
    setActiveVideo(video.id, index);
    router.push('/custom-feed');
  };
  const bioLimit = 110;
  const truncatedBio = user.bio.length > bioLimit ? user.bio.substring(0, bioLimit) + '...' : user.bio;
  const themeOptions = [
    { label: settingsCopy.themeOptionLight, value: 'light' as const },
    { label: settingsCopy.themeOptionDark, value: 'dark' as const },
    { label: settingsCopy.themeOptionSystem, value: 'system' as const },
  ];
  const browserHistoryOptions = [
    { label: settingsCopy.browserHistoryOptionOn, value: 'on' as const },
    { label: settingsCopy.browserHistoryOptionOff, value: 'off' as const },
  ];
  const historyFilterOptions = [
    { label: 'Bugün', value: 'today' as const },
    { label: 'Dün', value: 'yesterday' as const },
    { label: 'Son 3 gün', value: 'last3' as const },
    { label: 'Son 1 hafta', value: 'last7' as const },
    { label: 'Son 1 ay', value: 'last30' as const },
  ];
  const historySortOptions = [
    { label: 'Yeni - Eski', value: 'newest' as const },
    { label: 'Eski - Yeni', value: 'oldest' as const },
    { label: 'A - Z', value: 'az' as const },
  ];
  const historyFilterLabel = historyFilterOptions.find((o) => o.value === historyFilter)?.label || 'Son 1 hafta';
  const historySortLabel = historySortOptions.find((o) => o.value === historySort)?.label || 'Yeni - Eski';

  const historyDayMs = 24 * 60 * 60 * 1000;
  const startOfDay = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const isSameDay = (a: number, b: number) => startOfDay(a) === startOfDay(b);
  const getHistoryRange = (filter: typeof historyFilter) => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    if (filter === 'today') {
      return { start: todayStart, end: now };
    }
    if (filter === 'yesterday') {
      const yesterdayStart = startOfDay(now - historyDayMs);
      return { start: yesterdayStart, end: todayStart - 1 };
    }
    if (filter === 'last3') {
      return { start: startOfDay(now - historyDayMs * 2), end: now };
    }
    if (filter === 'last7') {
      return { start: startOfDay(now - historyDayMs * 6), end: now };
    }
    return { start: startOfDay(now - historyDayMs * 29), end: now };
  };
  const getHistoryDateLabel = (timestamp: number) => {
    const now = Date.now();
    if (isSameDay(timestamp, now)) return 'Bugün';
    if (isSameDay(timestamp, now - historyDayMs)) return 'Dün';
    return new Date(timestamp).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const openSettings = useCallback(() => {
    loadAdminConfig();
    setSettingsSection('main');
    setSettingsOpen(true);
  }, [loadAdminConfig]);

  const closeSettings = useCallback(() => {
    if (['likes', 'saved', 'history', 'archived', 'notInterested', 'interested', 'accountHistory'].includes(settingsSection)) {
      setSettingsSection('actions');
      return;
    }
    if (settingsSection === 'deleted') {
      setSettingsSection('actions');
      return;
    }
    if (settingsSection === 'actions') {
      setSettingsSection('main');
      return;
    }
    if (settingsSection === 'accountType') {
      setSettingsSection('accountSettings');
      return;
    }
    if (settingsSection === 'accountSettings') {
      setSettingsSection('main');
      return;
    }
    if (settingsSection === 'notifications') {
      setSettingsSection('main');
      return;
    }
    if (settingsSection === 'inAppBrowser') {
      setSettingsSection('main');
      return;
    }
    if (settingsSection === 'browserHistory') {
      setSettingsSection('inAppBrowser');
      return;
    }
    if (settingsSection === 'contentPreferences') {
      setSettingsSection('main');
      return;
    }
    setSettingsOpen(false);
  }, [settingsSection]);

  const openActivityGrid = useCallback(async (type: 'likes' | 'saved' | 'history') => {
    if (!currentUserId) return;
    setSettingsSection(type);
    setIsActivityLoading(true);
    setActivityVideos([]);
    try {
      let data: VideoEntity[] = [];
      if (type === 'likes') data = await activityRepository.getLikedVideos(currentUserId);
      else if (type === 'saved') data = await activityRepository.getSavedVideos(currentUserId);
      else if (type === 'history') data = await activityRepository.getWatchHistory(currentUserId);
      setActivityVideos(data);
    } catch (err) {
      console.error('[Profile] Activity fetch error:', err);
    } finally {
      setIsActivityLoading(false);
    }
  }, [currentUserId]);

  const openActionsMenu = useCallback(() => {
    setSettingsSection('actions');
  }, []);

  const openDeletedMenu = useCallback(() => {
    setSettingsSection('deleted');
  }, []);

  const openAccountSettings = useCallback(() => {
    setSettingsSection('accountSettings');
  }, []);

  const openNotifications = useCallback(() => {
    setSettingsSection('notifications');
  }, []);

  const openAccountType = useCallback(() => {
    setSettingsSection('accountType');
  }, []);

  const openInAppBrowser = useCallback(() => {
    setSettingsSection('inAppBrowser');
  }, []);

  const openContentPreferences = useCallback(() => {
    setSettingsSection('contentPreferences');
  }, []);

  const openHistoryEntry = useCallback((url: string) => {
    openInAppBrowserUrl(url);
  }, [openInAppBrowserUrl]);

  const toggleHistorySelection = useCallback((key: string) => {
    setSelectedHistoryKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      const nextList = Array.from(next);
      if (nextList.length === 0) {
        setHistorySelectionMode(false);
      }
      return nextList;
    });
  }, []);

  useEffect(() => {
    const isOpen = isSettingsOpen;
    settingsTranslateX.value = withTiming(isOpen ? 0 : SCREEN_WIDTH, { duration: isOpen ? 220 : 180 });
    settingsBackdropOpacity.value = withTiming(isOpen ? 1 : 0, { duration: isOpen ? 220 : 180 });
  }, [isSettingsOpen, settingsTranslateX, settingsBackdropOpacity]);

  useEffect(() => {
    const onBackPress = () => {
      if (!isSettingsOpen) return false;
      closeSettings();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [isSettingsOpen, closeSettings]);

  const settingsPanelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: settingsTranslateX.value }],
  }));

  const settingsBackdropStyle = useAnimatedStyle(() => ({
    opacity: settingsBackdropOpacity.value,
  }));

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
              style={[styles.navIconButton, { alignItems: 'flex-end' }]}
              onPress={openSettings}
            >
              <Menu size={24} color={iconColor} />
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
                {user.entity?.isVerified === true && <VerifiedBadge />}
              </View>

              <TouchableOpacity onPress={() => bioSheetRef.current?.expand()} disabled={user.bio.length <= bioLimit}>
                <Text style={[styles.bioText, { color: textSecondary }]}>
                  {truncatedBio}
                  {user.bio.length > bioLimit && <Text style={{ color: textPrimary, fontWeight: '600' }}> devamını gör</Text>}
                </Text>
              </TouchableOpacity>

              <View style={styles.actionsContainer}>
                <Pressable
                  style={[styles.btnAction, { backgroundColor: btnEditBg }]}
                  onPress={() => editProfileSheetRef.current?.expand()}
                >
                  <Text style={[styles.btnActionText, { color: btnEditText }]}>Profili Düzenle</Text>
                </Pressable>

                <Pressable
                  style={[styles.btnAction, { backgroundColor: btnEditBg }]}
                  onPress={() => console.log('Share Profile')}
                >
                  <Text style={[styles.btnActionText, { color: btnEditText }]}>Profili Paylaş</Text>
                </Pressable>
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
            <Pressable
              style={[styles.tab, activeTab === 0 && [styles.activeTab, { borderBottomColor: textPrimary }]]}
              onPress={() => handleTabPress(0)}
              hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
            >
              <GridIcon color={activeTab === 0 ? textPrimary : textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 1 && [styles.activeTab, { borderBottomColor: textPrimary }]]}
              onPress={() => handleTabPress(1)}
              hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
            >
              <VideoIcon color={activeTab === 1 ? textPrimary : textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 2 && [styles.activeTab, { borderBottomColor: textPrimary }]]}
              onPress={() => handleTabPress(2)}
              hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
            >
              <TagsIcon color={activeTab === 2 ? textPrimary : textSecondary} />
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 3 && [styles.activeTab, { borderBottomColor: textPrimary }]]}
              onPress={() => handleTabPress(3)}
              hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
            >
              <SaveTabIcon color={activeTab === 3 ? textPrimary : textSecondary} />
            </Pressable>
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
                onPress={handleVideoPress}
                onPreviewEnd={hidePreview}
                showDraftsFolder={true}
                drafts={drafts}
                onDraftsFolderPress={handleDraftsFolderPress}
              />
            </View>
            <View key="1">
              <VideoGrid
                videos={videosData}
                isDark={isDark}
                onPress={handleVideoPress}
                onPreview={showPreview}
                onPreviewEnd={hidePreview}
              />
            </View>
            <View key="2">
              <PostsGrid posts={tagsData} isDark={isDark} onPreview={showPreview} onPreviewEnd={hidePreview} />
              {tagsData.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textSecondary }}>Etiketlenmiş gönderi yok</Text></View>}
            </View>
            <View key="3">
              <PostsGrid
                posts={savedData}
                isDark={isDark}
                onPress={handleSavedPress}
                onPreview={showPreview}
                onPreviewEnd={hidePreview}
                showDraftsFolder={false}
              />
              {savedData.length === 0 && <View style={{ padding: 40, alignItems: 'center' }}><Text style={{ color: textSecondary }}>Henüz kaydedilen gönderi yok</Text></View>}
            </View>
          </PagerView>
          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SwipeWrapper>

      {previewItem && <PreviewModal item={previewItem} onClose={hidePreview} />}
      <BioBottomSheet ref={bioSheetRef} bio={currentUser.bio || ''} isDark={isDark} />
      <ClubsBottomSheet ref={clubsSheetRef} clubs={clubs} isDark={isDark} />
      <EditProfileSheet
        ref={editProfileSheetRef}
        user={currentUser}
        onUpdateProfile={updateProfile}
        onUploadAvatar={uploadAvatar}
        onUpdateCompleted={() => reload(true)}
      />
      <View style={[styles.settingsOverlay, { pointerEvents: isSettingsOpen ? 'auto' : 'none' }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSettings}>
          <Animated.View style={[styles.settingsBackdrop, settingsBackdropStyle]} />
        </Pressable>
        <Animated.View style={[styles.settingsPanel, { backgroundColor: bgContainer }, settingsPanelStyle]}>
          <View style={[
            styles.settingsHeader,
            { paddingTop: insets.top + 10 },
            settingsSection !== 'main' && styles.settingsHeaderSub,
          ]}>
            {settingsSection === 'main' ? (
              <>
                <View style={styles.settingsHeaderLeft}>
                  <Text style={[styles.settingsTitle, { color: textPrimary }, settingsTitleOverrides]}>{settingsCopy.title}</Text>
                </View>
                <TouchableOpacity onPress={closeSettings} style={styles.settingsCloseButton}>
                  <X size={closeIconSize} color={closeIconColor} strokeWidth={closeIconStroke} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.settingsHeaderLeft}>
                  <TouchableOpacity onPress={closeSettings} style={styles.settingsBackButton}>
                    <ArrowLeft size={backIconSize} color={backIconColor} strokeWidth={backIconStroke} />
                  </TouchableOpacity>
                  <Text style={[styles.settingsTitle, { color: textPrimary }, settingsSectionTitleOverrides]}>
                    {settingsSection === 'actions' ? settingsCopy.actionsHeader :
                      settingsSection === 'likes' ? settingsCopy.actionsItemLikes :
                        settingsSection === 'saved' ? settingsCopy.actionsItemSaved :
                          settingsSection === 'history' ? settingsCopy.actionsItemWatchHistory :
                            settingsSection === 'archived' ? settingsCopy.actionsItemArchived :
                              settingsSection === 'notInterested' ? settingsCopy.actionsItemNotInterested :
                                settingsSection === 'interested' ? settingsCopy.actionsItemInterested :
                                  settingsSection === 'accountHistory' ? settingsCopy.actionsItemAccountHistory :
                                    settingsSection === 'accountSettings' ? settingsCopy.accountSettingsLabel :
                                      settingsSection === 'notifications' ? settingsCopy.notificationsLabel :
                                        settingsSection === 'browserHistory' ? settingsCopy.browserHistoryViewLabel :
                                          settingsSection === 'accountType' ? settingsCopy.accountSettingsItemType :
                                            settingsSection === 'inAppBrowser' ? settingsCopy.inAppBrowserLabel :
                                              settingsSection === 'contentPreferences' ? settingsCopy.contentPreferencesLabel :
                                                settingsCopy.deletedHeader}
                  </Text>
                </View>
                <View style={styles.settingsHeaderRight} />
              </>
            )}
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.settingsContent,
              ['likes', 'saved', 'history', 'archived', 'notInterested'].includes(settingsSection) && { paddingHorizontal: 0 }
            ]}
            showsVerticalScrollIndicator={false}
          >
            {settingsSection === 'main' ? (
              <>
                <View style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}>
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <SunMoon size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.themeLabel}</Text>
                    </View>
                  </View>
                  <View style={[styles.settingsSegmentGroup, { backgroundColor: settingsSegmentBg }]}>
                    {themeOptions.map((option) => {
                      const isActive = theme === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.settingsSegmentOption,
                            isActive && { backgroundColor: settingsSegmentActive },
                          ]}
                          onPress={() => setTheme(option.value)}
                        >
                          <Text style={[styles.settingsSegmentText, { color: isActive ? settingsSegmentActiveText : settingsSegmentText }]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {
                    closeSettings();
                    router.push(`/user/${currentUserId}`);
                  }}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Eye size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>Kendini gör</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openActionsMenu}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Activity size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openNotifications}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Bell size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.notificationsLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openInAppBrowser}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Globe size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.inAppBrowserLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openContentPreferences}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <SlidersHorizontal size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.contentPreferencesLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openAccountSettings}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <UserCog size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: 'transparent' }]}
                  onPress={async () => {
                    closeSettings();
                    await useAuthStore.getState().signOut();
                    router.replace('/login');
                  }}
                >
                  <Text style={[styles.settingsLabel, settingsItemLabelOverrides, { color: '#FF3B30', marginTop: 10 }]}>{settingsCopy.logoutLabel}</Text>
                </TouchableOpacity>
              </>
            ) : settingsSection === 'actions' ? (
              <>
                <View style={styles.settingsActionsHero}>
                  <Text style={[styles.settingsActionsHeroTitle, { color: textPrimary }, settingsSectionTitleOverrides]}>
                    {settingsCopy.actionsHeroTitle}
                  </Text>
                  <Text style={[styles.settingsValue, styles.settingsActionsHeroText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.actionsHeroText}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => openActivityGrid('likes')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Heart size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemLikes}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => openActivityGrid('saved')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Bookmark size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemSaved}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => setSettingsSection('archived')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <ClockFading size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemArchived}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => setSettingsSection('notInterested')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <EyeOff size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemNotInterested}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => setSettingsSection('interested')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Eye size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemInterested}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => setSettingsSection('accountHistory')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <CalendarDays size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemAccountHistory}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => openActivityGrid('history')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <ImagePlay size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.actionsItemWatchHistory}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openDeletedMenu}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Trash2 size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.deletedLabel}</Text>
                    </View>
                    <Text style={[styles.settingsValue, { color: textSecondary }, settingsHelperOverrides]}>
                      {settingsCopy.deletedHelper}
                    </Text>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>
              </>
            ) : settingsSection === 'accountSettings' ? (
              <>
                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Lock size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemPassword}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Mail size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemEmail}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <MessageSquare size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemPhone}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <ShieldCheck size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemStatus}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <ShieldBan size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemBlocked}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <ShieldAlert size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemMuted}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={openAccountType}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <User size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountSettingsItemType}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>
              </>
            ) : settingsSection === 'notifications' ? (
              <>
                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Bell size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.notificationsItemPush}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Mail size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.notificationsItemEmail}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <MessageSquare size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.notificationsItemSms}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>
              </>
            ) : settingsSection === 'accountType' ? (
              <>
                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Sparkles size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountTypeCreator}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Briefcase size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountTypeBranded}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <BadgeCheck size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountTypeVerification}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => {}}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <BadgePlus size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.accountTypeBadge}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>
              </>
            ) : settingsSection === 'inAppBrowser' ? (
              <>
                <View style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}>
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Globe size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.browserHistoryLabel}</Text>
                    </View>
                  </View>
                  <View style={[styles.settingsSegmentGroup, { backgroundColor: settingsSegmentBg }]}>
                    {browserHistoryOptions.map((option) => {
                      const isActive = browserHistoryEnabled ? option.value === 'on' : option.value === 'off';
                      return (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.settingsSegmentOption,
                            isActive && { backgroundColor: settingsSegmentActive },
                          ]}
                          onPress={() => setBrowserHistoryEnabled(option.value === 'on')}
                        >
                          <Text style={[styles.settingsSegmentText, { color: isActive ? settingsSegmentActiveText : settingsSegmentText }]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={() => setSettingsSection('browserHistory')}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <ClockFading size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.browserHistoryViewLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                  onPress={clearBrowserHistory}
                >
                  <View style={styles.settingsInfo}>
                    <View style={styles.settingsLabelRow}>
                      <Trash2 size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                      <Text style={[styles.settingsLabel, styles.settingsLabelSub, { color: textPrimary, marginBottom: 0 }, settingsItemLabelOverrides]}>{settingsCopy.browserHistoryClearLabel}</Text>
                    </View>
                  </View>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </TouchableOpacity>
              </>
            ) : settingsSection === 'browserHistory' ? (
              <View style={{ paddingTop: 6 }}>
                <View style={styles.historyControlsRow}>
                  <View style={styles.historyControl}>
                    <TouchableOpacity
                      style={[styles.historyControlButton, { borderColor: settingsItemBorderColor }]}
                      onPress={() => {
                        setHistoryFilterOpen((prev) => !prev);
                        setHistorySortOpen(false);
                      }}
                    >
                      <Text style={[styles.historyControlText, { color: textPrimary }]}>{historyFilterLabel}</Text>
                      <Text style={[styles.historyControlChevron, { color: settingsChevronColor }]}>▾</Text>
                    </TouchableOpacity>
                    {historyFilterOpen && (
                      <View style={[styles.historyControlMenu, { borderColor: settingsItemBorderColor, backgroundColor: bgContainer }]}>
                        {historyFilterOptions.map((option) => {
                          const isActive = historyFilter === option.value;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={styles.historyControlOption}
                              onPress={() => {
                                setHistoryFilter(option.value);
                                setHistoryFilterOpen(false);
                              }}
                            >
                              <Text style={[styles.historyControlOptionText, { color: isActive ? '#FF3B30' : textPrimary }]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <View style={styles.historyControl}>
                    <TouchableOpacity
                      style={[styles.historyControlButton, { borderColor: settingsItemBorderColor }]}
                      onPress={() => {
                        setHistorySortOpen((prev) => !prev);
                        setHistoryFilterOpen(false);
                      }}
                    >
                      <Text style={[styles.historyControlText, { color: textPrimary }]}>{historySortLabel}</Text>
                      <Text style={[styles.historyControlChevron, { color: settingsChevronColor }]}>▾</Text>
                    </TouchableOpacity>
                    {historySortOpen && (
                      <View style={[styles.historyControlMenu, { borderColor: settingsItemBorderColor, backgroundColor: bgContainer }]}>
                        {historySortOptions.map((option) => {
                          const isActive = historySort === option.value;
                          return (
                            <TouchableOpacity
                              key={option.value}
                              style={styles.historyControlOption}
                              onPress={() => {
                                setHistorySort(option.value);
                                setHistorySortOpen(false);
                              }}
                            >
                              <Text style={[styles.historyControlOptionText, { color: isActive ? '#FF3B30' : textPrimary }]}>
                                {option.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                </View>

                {(() => {
                  const range = getHistoryRange(historyFilter);
                  const filtered = browserHistory.filter(
                    (entry) => entry.timestamp >= range.start && entry.timestamp <= range.end
                  );
                  if (filtered.length === 0) {
                    return (
                      <View style={{ padding: 20 }}>
                        <Text style={[styles.settingsLabel, { color: textSecondary }]}>Geçmiş boş</Text>
                      </View>
                    );
                  }

                  const sorted = [...filtered].sort((a, b) => {
                    if (historySort === 'newest') return b.timestamp - a.timestamp;
                    if (historySort === 'oldest') return a.timestamp - b.timestamp;
                    const aLabel = (a.title || a.url).toLowerCase();
                    const bLabel = (b.title || b.url).toLowerCase();
                    return aLabel.localeCompare(bLabel, 'tr');
                  });
                  const grouped: { label: string; entries: typeof sorted }[] = [];
                  sorted.forEach((entry) => {
                    const label = getHistoryDateLabel(entry.timestamp);
                    const last = grouped[grouped.length - 1];
                    if (!last || last.label !== label) {
                      grouped.push({ label, entries: [entry] });
                    } else {
                      last.entries.push(entry);
                    }
                  });

                  return grouped.map((group) => (
                    <View key={group.label}>
                      <Text style={[styles.historyDateLabel, { color: textSecondary }]}>
                        {group.label}
                      </Text>
                      {group.entries.map((entry, idx) => (
                        (() => {
                          const entryKey = `${entry.url}-${entry.timestamp}-${idx}`;
                          const isSelected = selectedHistoryKeys.includes(entryKey);
                          return (
                        <TouchableOpacity
                          key={entryKey}
                          style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor, paddingHorizontal: 20 }]}
                          onPress={() => {
                            if (historySelectionMode) {
                              toggleHistorySelection(entryKey);
                            } else {
                              openHistoryEntry(entry.url);
                            }
                          }}
                          onLongPress={() => {
                            if (!historySelectionMode) {
                              setHistorySelectionMode(true);
                              setSelectedHistoryKeys([entryKey]);
                              return;
                            }
                            toggleHistorySelection(entryKey);
                          }}
                        >
                          <View style={styles.historyRow}>
                            {historySelectionMode && (
                              <View style={[styles.historySelectBox, isSelected && styles.historySelectBoxActive]} />
                            )}
                            <View style={styles.settingsInfo}>
                            <Text style={[styles.settingsLabel, { color: textPrimary }]} numberOfLines={1}>
                              {entry.title || entry.url}
                            </Text>
                            <Text style={[styles.settingsLabel, { color: textSecondary, fontSize: 12, marginTop: 4 }]} numberOfLines={1}>
                              {entry.url}
                            </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                          );
                        })()
                      ))}
                    </View>
                  ));
                })()}
              </View>
            ) : settingsSection === 'contentPreferences' ? (
              <View style={{ paddingTop: 10 }} />
            ) : settingsSection === 'deleted' ? (
              <DeletedContentMenu isDark={isDark} isActive={settingsSection === 'deleted'} />
            ) : settingsSection === 'interested' ? (
              <View style={{ paddingTop: 10 }}>
                {settingsCopy.interestedTopics.split(',').map((topic, idx) => (
                  <View key={idx} style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor, paddingHorizontal: 20 }]}>
                    <Text style={[styles.settingsLabel, { color: textPrimary }]}>{topic.trim()}</Text>
                    <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                  </View>
                ))}
              </View>
            ) : settingsSection === 'accountHistory' ? (
              <View style={{ padding: 20 }}>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.settingsLabel, { color: textPrimary, fontSize: 16 }]}>{settingsCopy.accountHistoryTitle}</Text>
                  <Text style={{ color: textSecondary, marginTop: 4 }}>
                    {settingsCopy.accountHistoryDateLabel}: {authUser?.created_at ? new Date(authUser.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Bilinmiyor'}
                  </Text>
                </View>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.settingsLabel, { color: textPrimary, fontSize: 16 }]}>{settingsCopy.accountHistoryEmailLabel}</Text>
                  <Text style={{ color: textSecondary, marginTop: 4 }}>{authUser?.email || 'Bilinmiyor'}</Text>
                </View>
                <View style={{ marginBottom: 20 }}>
                  <Text style={[styles.settingsLabel, { color: textPrimary, fontSize: 16 }]}>{settingsCopy.accountHistoryIdLabel}</Text>
                  <Text style={{ color: textSecondary, marginTop: 4, fontSize: 12 }}>{authUser?.id || 'Bilinmiyor'}</Text>
                </View>
              </View>
            ) : (
              <View style={{ marginTop: 10 }}>
                {isActivityLoading ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator color={textPrimary} />
                  </View>
                ) : activityVideos.length === 0 && !['archived', 'notInterested'].includes(settingsSection) ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary }}>Gösterilecek içerik yok</Text>
                  </View>
                ) : (
                  <ActivityGrid
                    videos={['archived', 'notInterested'].includes(settingsSection) ? [] : activityVideos}
                    isDark={isDark}
                    onPress={(video, index) => {
                      setCustomFeed(activityVideos);
                      setActiveVideo(video.id, index);
                      router.push('/custom-feed' as any);
                    }}
                  />
                )}
                {['archived', 'notInterested'].includes(settingsSection) && activityVideos.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: textSecondary }}>Henüz içerik eklenmemiş</Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topNavContainer: { width: '100%', zIndex: 1000, position: 'absolute', top: 0, left: 0, right: 0 },
  topNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, height: 60, position: 'relative' },
  navIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerUsername: { fontSize: 20, fontWeight: '600', position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },
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
  settingsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
  },
  settingsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  settingsPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: SCREEN_WIDTH,
  },
  settingsHeader: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  settingsHeaderSub: {
    paddingLeft: 6,
  },
  settingsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  settingsCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  settingsBackButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsHeaderRight: {
    width: 44,
  },
  settingsContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0,
  },
  settingsInfo: {
    flex: 1,
    paddingRight: 20,
  },
  settingsLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingsLabelSub: {
    fontWeight: '400',
  },
  settingsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsValue: {
    fontSize: 14,
    fontWeight: '400',
  },
  settingsActionsHero: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  settingsActionsHeroTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingsActionsHeroText: {
    textAlign: 'center',
  },
  settingsSegmentGroup: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 2,
    overflow: 'hidden',
  },
  settingsSegmentOption: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  settingsSegmentText: {
    fontSize: 12,
    fontWeight: '400',
  },
  historyControlsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  historyControl: {
    flex: 1,
    position: 'relative',
  },
  historyControlButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  historyControlText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyControlChevron: {
    fontSize: 12,
  },
  historyControlMenu: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 10,
  },
  historyControlOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  historyControlOptionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historySelectBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginRight: 10,
  },
  historySelectBoxActive: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30',
  },
  historyDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  settingsChevron: {
    fontSize: 22,
  },
});
