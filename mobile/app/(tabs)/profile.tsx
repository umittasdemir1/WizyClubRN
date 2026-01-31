import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Dimensions,
  BackHandler,
  InteractionManager,
  Modal,
  ActivityIndicator,
  Animated as RNAnimated,
  Easing,
} from 'react-native';
import PagerView from '../../src/presentation/components/shared/PagerView';
import type { PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import Video from 'react-native-video';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { useDraftStore } from '../../src/presentation/store/useDraftStore';
import { useInAppBrowserStore } from '../../src/presentation/store/useInAppBrowserStore';
import { ProfileStats } from '../../src/presentation/components/profile/ProfileStats';
import { SocialTags } from '../../src/presentation/components/profile/SocialTags';
import { MediaGrid } from '../../src/presentation/components/shared/MediaGrid';
import { DraftsFolderCard } from '../../src/presentation/components/profile/DraftsFolderCard';
import { BioBottomSheet } from '../../src/presentation/components/profile/BioBottomSheet';
import { EditProfileSheet } from '../../src/presentation/components/profile/EditProfileSheet';
import { Menu, Store } from 'lucide-react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import BottomSheet from '@gorhom/bottom-sheet';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { useProfile } from '../../src/presentation/hooks/useProfile';
import { useSavedVideos } from '../../src/presentation/hooks/useSavedVideos';
import { useActiveVideoStore } from '../../src/presentation/store/useActiveVideoStore';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { LIGHT_COLORS, DARK_COLORS } from '../../src/core/constants';
import { CONFIG } from '../../src/core/config';
import { VerifiedBadge } from '../../src/presentation/components/shared/VerifiedBadge';
import { ProfileSettingsOverlay } from '../../src/presentation/components/profile/ProfileSettingsOverlay';
import { UserActivityRepositoryImpl } from '../../src/data/repositories/UserActivityRepositoryImpl';
import { Video as VideoEntity } from '../../src/domain/entities/Video';
import { isFeedVideoItem } from '../../src/presentation/components/feed/utils/FeedUtils';
import { logApi, logError, logUI, LogCode } from '@/core/services/Logger';
import { shadowStyle } from '@/core/utils/shadow';

const activityRepository = new UserActivityRepositoryImpl();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const SaveTabIcon = ({ color }: { color: string }) => (
  <Svg width="26" height="26" viewBox="0 -960 960 960" fill={color}>
    <Path d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z" />
  </Svg>
);

const ShoppingBag = Store;

const ShopFireworks = ({ triggerKey }: { triggerKey: number }) => {
  const centers = React.useMemo(() => (
    Array.from({ length: 8 }, () => ({
      x: SCREEN_WIDTH * (0.15 + Math.random() * 0.7),
      y: SCREEN_HEIGHT / 2 - (70 + Math.random() * 140),
    }))
  ), [triggerKey]);
  const particles = React.useMemo(() => (
    centers.flatMap((center, centerIndex) => (
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * 360 + Math.random() * 16;
        return {
          id: `${triggerKey}-${centerIndex}-${index}`,
          angle,
          distance: 90 + Math.random() * 80,
          size: 6 + Math.random() * 6,
        delay: Math.floor(Math.random() * 2000),
          color: ['#F472B6', '#FB7185', '#F59E0B'][index % 3],
          centerX: center.x,
          centerY: center.y,
        };
      })
    ))
  ), [centers, triggerKey]);
  const anims = React.useRef(particles.map(() => new RNAnimated.Value(0))).current;

  React.useEffect(() => {
    const animations = anims.map((val, index) => (
      RNAnimated.timing(val, {
        toValue: 1,
        duration: 1800,
        delay: particles[index]?.delay ?? 0,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    ));
    RNAnimated.parallel(animations).start();
  }, [anims, particles, triggerKey]);

  return (
    <View style={styles.shopModalFx} pointerEvents="none">
      {particles.map((particle, index) => {
        const angleRad = (particle.angle * Math.PI) / 180;
        const translateX = Math.cos(angleRad) * particle.distance;
        const translateY = Math.sin(angleRad) * particle.distance;
        const anim = anims[index];
        const animatedStyle = {
          opacity: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 0] }),
          transform: [
            { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, translateX] }) },
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, translateY] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        };
        return (
          <RNAnimated.View
            key={particle.id}
            style={[
              styles.shopModalFxParticle,
              {
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                left: particle.centerX - particle.size / 2,
                top: particle.centerY - particle.size / 2,
              },
              animatedStyle,
            ]}
          />
        );
      })}
    </View>
  );
};

const StoreTabIcon = ({ color }: { color: string }) => (
  <Store size={26} color={color} strokeWidth={1.7} />
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
        accountSettingsHeroTitle: getString('profile.settings.accountSettingsHeroTitle') || prev.accountSettingsHeroTitle,
        accountSettingsHeroText: getString('profile.settings.accountSettingsHeroText') || prev.accountSettingsHeroText,
        accountSettingsNoticeText: getString('profile.settings.accountSettingsNoticeText') || prev.accountSettingsNoticeText,
        accountSettingsNoticeLinkLabel: getString('profile.settings.accountSettingsNoticeLinkLabel') || prev.accountSettingsNoticeLinkLabel,
        notificationsLabel: getString('profile.settings.notificationsLabel') || prev.notificationsLabel,
        notificationsHeroTitle: getString('profile.settings.notificationsHeroTitle') || prev.notificationsHeroTitle,
        notificationsHeroText: getString('profile.settings.notificationsHeroText') || prev.notificationsHeroText,
        notificationsNoticeText: getString('profile.settings.notificationsNoticeText') || prev.notificationsNoticeText,
        notificationsItemPush: getString('profile.settings.notificationsItem.push') || prev.notificationsItemPush,
        notificationsItemEmail: getString('profile.settings.notificationsItem.email') || prev.notificationsItemEmail,
        notificationsItemSms: getString('profile.settings.notificationsItem.sms') || prev.notificationsItemSms,
        notificationsItemPushHelper: getString('profile.settings.notificationsItem.pushHelper') || prev.notificationsItemPushHelper,
        notificationsItemEmailHelper: getString('profile.settings.notificationsItem.emailHelper') || prev.notificationsItemEmailHelper,
        notificationsItemSmsHelper: getString('profile.settings.notificationsItem.smsHelper') || prev.notificationsItemSmsHelper,
        inAppBrowserHeroTitle: getString('profile.settings.inAppBrowser.heroTitle') || prev.inAppBrowserHeroTitle,
        inAppBrowserHeroText: getString('profile.settings.inAppBrowser.heroText') || prev.inAppBrowserHeroText,
        inAppBrowserNoticeText: getString('profile.settings.inAppBrowser.noticeText') || prev.inAppBrowserNoticeText,
        inAppBrowserHistoryToggleHelper: getString('profile.settings.inAppBrowser.history.toggleHelper') || prev.inAppBrowserHistoryToggleHelper,
        inAppBrowserHistoryViewHelper: getString('profile.settings.inAppBrowser.history.viewHelper') || prev.inAppBrowserHistoryViewHelper,
        inAppBrowserHistoryClearHelper: getString('profile.settings.inAppBrowser.history.clearHelper') || prev.inAppBrowserHistoryClearHelper,
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
        accountSettingsItemTwoFactor: getString('profile.settings.accountSettingsItem.twoFactor') || prev.accountSettingsItemTwoFactor,
        accountSettingsItemStatus: getString('profile.settings.accountSettingsItem.status') || prev.accountSettingsItemStatus,
        accountSettingsItemBlocked: getString('profile.settings.accountSettingsItem.blocked') || prev.accountSettingsItemBlocked,
        accountSettingsItemMuted: getString('profile.settings.accountSettingsItem.muted') || prev.accountSettingsItemMuted,
        accountSettingsItemType: getString('profile.settings.accountSettingsItem.type') || prev.accountSettingsItemType,
        accountSettingsItemPasswordHelper: getString('profile.settings.accountSettingsItem.passwordHelper') || prev.accountSettingsItemPasswordHelper,
        accountSettingsItemEmailHelper: getString('profile.settings.accountSettingsItem.emailHelper') || prev.accountSettingsItemEmailHelper,
        accountSettingsItemPhoneHelper: getString('profile.settings.accountSettingsItem.phoneHelper') || prev.accountSettingsItemPhoneHelper,
        accountSettingsItemTwoFactorHelper: getString('profile.settings.accountSettingsItem.twoFactorHelper') || prev.accountSettingsItemTwoFactorHelper,
        accountSettingsItemStatusHelper: getString('profile.settings.accountSettingsItem.statusHelper') || prev.accountSettingsItemStatusHelper,
        accountSettingsItemBlockedHelper: getString('profile.settings.accountSettingsItem.blockedHelper') || prev.accountSettingsItemBlockedHelper,
        accountSettingsItemMutedHelper: getString('profile.settings.accountSettingsItem.mutedHelper') || prev.accountSettingsItemMutedHelper,
        accountSettingsItemTypeHelper: getString('profile.settings.accountSettingsItem.typeHelper') || prev.accountSettingsItemTypeHelper,
        accountTypeCreator: getString('profile.settings.accountType.creator') || prev.accountTypeCreator,
        accountTypeBranded: getString('profile.settings.accountType.branded') || prev.accountTypeBranded,
        accountTypeVerification: getString('profile.settings.accountType.verification') || prev.accountTypeVerification,
        accountTypeBadge: getString('profile.settings.accountType.badge') || prev.accountTypeBadge,
        accountTypeShop: getString('profile.settings.accountType.shop') || prev.accountTypeShop,
        accountTypeCreatorHelper: getString('profile.settings.accountType.creatorHelper') || prev.accountTypeCreatorHelper,
        accountTypeBrandedHelper: getString('profile.settings.accountType.brandedHelper') || prev.accountTypeBrandedHelper,
        accountTypeVerificationHelper: getString('profile.settings.accountType.verificationHelper') || prev.accountTypeVerificationHelper,
        accountTypeBadgeHelper: getString('profile.settings.accountType.badgeHelper') || prev.accountTypeBadgeHelper,
        accountTypeShopHelper: getString('profile.settings.accountType.shopHelper') || prev.accountTypeShopHelper,
        accountTypePause: getString('profile.settings.accountType.pause') || prev.accountTypePause,
        accountTypeTerminate: getString('profile.settings.accountType.terminate') || prev.accountTypeTerminate,
        accountTypePauseHelper: getString('profile.settings.accountType.pauseHelper') || prev.accountTypePauseHelper,
        accountTypeTerminateHelper: getString('profile.settings.accountType.terminateHelper') || prev.accountTypeTerminateHelper,
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
        actionsItemNotInterestedHelper: getString('profile.settings.actionsItem.notInterestedHelper') || prev.actionsItemNotInterestedHelper,
        actionsItemInterestedHelper: getString('profile.settings.actionsItem.interestedHelper') || prev.actionsItemInterestedHelper,
        actionsItemAccountHistoryHelper: getString('profile.settings.actionsItem.accountHistoryHelper') || prev.actionsItemAccountHistoryHelper,
        actionsItemWatchHistoryHelper: getString('profile.settings.actionsItem.watchHistoryHelper') || prev.actionsItemWatchHistoryHelper,
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
      logApi(LogCode.API_ERROR, 'Profile admin config load failed', { error });
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
      SystemBars.setStyle({
        statusBar: isDark ? 'light' : 'dark',
        navigationBar: isDark ? 'light' : 'dark',
      });
      const task = InteractionManager.runAfterInteractions(() => {
        // Reload data after transition settles
        refreshSavedVideos();
      });
      return () => {
        task.cancel();
      };
    }, [isDark, refreshSavedVideos])
  );

  const [refreshing, setRefreshing] = useState(false);
  const [previewItem, setPreviewItem] = useState<{ id: string; thumbnail: string; videoUrl: string } | null>(null);

  const bioSheetRef = useRef<BottomSheet>(null);
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
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const browserHistoryEnabled = useInAppBrowserStore((state) => state.historyEnabled);
  const setBrowserHistoryEnabled = useInAppBrowserStore((state) => state.setHistoryEnabled);
  const browserHistory = useInAppBrowserStore((state) => state.history);
  const clearBrowserHistory = useInAppBrowserStore((state) => state.clearHistory);
  const openInAppBrowserUrl = useInAppBrowserStore((state) => state.openUrl);
  const [shopEnabled, setShopEnabled] = useState(false);
  const [showShopFx, setShowShopFx] = useState(false);
  const [shopFxKey, setShopFxKey] = useState(0);
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
    accountSettingsHeroTitle: 'Hesap güvenliğin önemli',
    accountSettingsHeroText: 'Giriş ve güvenlik ayarlarını kontrol edip güncelleyebilirsin',
    accountSettingsNoticeText: 'Hesap güvenliğin, sağlığın ve uygulama erişiminde sorun yaşıyorsan, verilerinin izinsiz ele geçirildiğini ve paylaşıldığını düşünüyorsan, engellenen ve ya sessize alınan bir kullanıcıdan bildirimler almaya ve içerikler görmeye devam ediyorsan lütfen Güven Merkezi\'ni ziyaret et',
    accountSettingsNoticeLinkLabel: 'Güven Merkezi',
    notificationsLabel: 'Bildirimler',
    notificationsHeroTitle: 'Tercihlerini önemsiyoruz',
    notificationsHeroText: 'Bildirim tercihlerini istediğin zaman değiştirebilirsin',
    notificationsNoticeText: 'Tercihlerinize saygı duyar, istemediğiniz bildirimleri size göndermeyiz. Şeffaflık ilkemiz gereği sizi önemli güncellemeler hakkında bilgilendirmeye devam ederiz. Hesap güvenliğinizle ilgili bildirimler, bu tercihlerden bağımsız olarak her zaman size ulaşır.',
    notificationsItemPush: 'Anlık bildirimler',
    notificationsItemEmail: 'E-posta bildirimleri',
    notificationsItemSms: 'SMS bildirimleri',
    notificationsItemPushHelper: 'Uygulama bildirimlerini tercihlerinize göre yönetebilirsiniz.',
    notificationsItemEmailHelper: 'İstenmeyen e-postaları yönetebilir ve iletişim tercihlerinizi güncelleyebilirsiniz.',
    notificationsItemSmsHelper: 'SMS bildirimlerini kontrol edebilir ve almak istemediklerinizi kapatabilirsiniz.',
    inAppBrowserHeroTitle: 'Göz atma geçmişi sizin kontrolünüzde',
    inAppBrowserHeroText: 'Geçmişinizi inceleyebilir, yönetebilir ve isterseniz temizleyebilirsiniz',
    inAppBrowserNoticeText: 'Göz atma geçmişinizi 90 gün sonra siliyoruz.\nBu verileri size daha uygun içerikler ve reklamlar göstermek için kullanıyoruz.',
    inAppBrowserHistoryToggleHelper: 'Tarayıcı geçmişinin kaydedilmesini Açık veya Kapalı olarak yönetebilirsiniz.\nVarsayılan ayar Açık’tır.',
    inAppBrowserHistoryViewHelper: 'Göz atma geçmişinizi görüntüleyebilir ve daha sonra tekrar ziyaret edebilirsiniz.',
    inAppBrowserHistoryClearHelper: 'Göz atma geçmişinizi tercihlerinize göre temizleyebilirsiniz.\nBu veriler temizlendikten sonra görüntülenmez ve kullanılmaz.',
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
    accountSettingsItemTwoFactor: 'İki adımlı doğrulama',
    accountSettingsItemStatus: 'Hesap durumu',
    accountSettingsItemBlocked: 'Engellenenler',
    accountSettingsItemMuted: 'Sessize alınanlar',
    accountSettingsItemType: 'Hesap türü',
    accountSettingsItemPasswordHelper: 'Hesap şifreniz size özeldir. Güvenliğiniz için şifrenizi düzenli aralıklarla değiştirmenizi ve İki Adımlı Doğrulama’yı aktif etmenizi öneririz.',
    accountSettingsItemEmailHelper: 'Hesabınızla ilişkili e-posta adresi giriş, bildirim ve güvenlik doğrulamaları için kullanılır. Güncel ve erişiminizin olduğu bir adres kullandığınızdan emin olun.',
    accountSettingsItemPhoneHelper: 'Telefon numaranız hesap güvenliği, doğrulama ve önemli bilgilendirmeler için kullanılır. Güncel ve size ait bir numara kullandığınızdan emin olun.',
    accountSettingsItemTwoFactorHelper: 'E-posta adresinizi veya telefon numaranızı iki adımlı doğrulama için kullanın.',
    accountSettingsItemStatusHelper: 'Hesap durumunuzu buradan görüntüleyebilir ve hesabınızla ilgili önemli bilgilere erişebilirsiniz.',
    accountSettingsItemBlockedHelper: 'Engellediğiniz hesapları buradan görüntüleyebilir ve dilediğiniz zaman engellemeyi kaldırabilirsiniz.',
    accountSettingsItemMutedHelper: 'Sessize aldığınız hesapları buradan görüntüleyebilir ve dilediğiniz zaman sessize alma işlemini kaldırabilirsiniz.',
    accountSettingsItemTypeHelper: 'Hesap türünüzü ve ilgili seçenekleri buradan yönetebilirsiniz.',
    accountTypeCreator: 'İçerik üreticisi ol',
    accountTypeBranded: 'Markalı içerik',
    accountTypeVerification: 'Doğrulama talep et',
    accountTypeBadge: 'Rozet için kaydol',
    accountTypeShop: 'Senin Mağazan',
    accountTypeCreatorHelper: 'İçerik üreticisi araçlarına erişmek için başvur.',
    accountTypeBrandedHelper: 'Markalı içerik seçeneklerini ve işbirliklerini yönet.',
    accountTypeVerificationHelper: 'Hesabını doğrulatmak için talep oluştur.',
    accountTypeBadgeHelper: 'Rozet başvurunu tamamla ve süreci takip et.',
    accountTypeShopHelper: 'Onaylı hesaplar için kendi mağazanı oluştur.',
    accountTypePause: 'Hesabına ara ver',
    accountTypeTerminate: 'Hesabını sonlandır',
    accountTypePauseHelper: 'Hesabını geçici olarak devre dışı bırakır. Dilediğinde tekrar devam edebilirsin.',
    accountTypeTerminateHelper: 'Hesabını kalıcı olarak kapatır. Bu işlem geri alınamaz.',
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
    actionsItemNotInterestedHelper: 'İlgilenmediğini işaretlediğin içerikleri yönet.',
    actionsItemInterestedHelper: 'İlgilendiğini işaretlediğin içerikleri burada gör.',
    actionsItemAccountHistoryHelper: 'Hesap bilgilerini ve oluşturma tarihini görüntüle.',
    actionsItemWatchHistoryHelper: 'İzlediğin içerikleri ve tekrar ziyaret ettiklerini gör.',
    interestedTopics: 'Müzik, Teknoloji, Yaşam, Spor, Eğlence, Seyahat',
    accountHistoryTitle: 'Hesap Bilgileri',
    accountHistoryDateLabel: 'Hesabın oluşturulma tarihi',
    accountHistoryEmailLabel: 'E-posta',
    accountHistoryIdLabel: 'Kullanıcı Kimliği (ID)',
  });
  const accountSettingsNoticeText = settingsCopy.accountSettingsNoticeText || '';
  const accountSettingsNoticeLinkLabel = settingsCopy.accountSettingsNoticeLinkLabel || 'Güven Merkezi';
  const accountSettingsNoticeLinkIndex = accountSettingsNoticeText.indexOf(accountSettingsNoticeLinkLabel);
  const accountSettingsNoticePrefix = accountSettingsNoticeLinkIndex >= 0
    ? accountSettingsNoticeText.slice(0, accountSettingsNoticeLinkIndex)
    : accountSettingsNoticeText;
  const accountSettingsNoticeSuffix = accountSettingsNoticeLinkIndex >= 0
    ? accountSettingsNoticeText.slice(accountSettingsNoticeLinkIndex + accountSettingsNoticeLinkLabel.length)
    : '';
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
  const accentColor = settingsSegmentActive;
  const tabBarBackground = isDark ? DARK_COLORS.background : LIGHT_COLORS.background;

  // Button Colors
  const btnEditBg = isDark ? '#333333' : '#E5E5E5';
  const btnEditText = textPrimary;

  // PagerView States
  const pagerRef = useRef<React.ElementRef<typeof PagerView>>(null);
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
    shopEnabled: false,
    followersCount: 0,
    followingCount: 0,
    postsCount: 0
  };

  // View model for simple UI parts
  const user = {
    name: currentUser?.fullName || 'User',
    username: currentUser?.username || 'user',
    avatarUrl: currentUser?.avatarUrl || '',
    bio: currentUser?.bio || "Welcome to WizyClub",
    followingCount: currentUser?.followingCount?.toString() || '0',
    followersCount: currentUser?.followersCount?.toString() || '0',
    entity: currentUser,
  };

  const safeVideos = videos || [];
  const videoOnlyItems = safeVideos.filter(isFeedVideoItem);
  const postsData = safeVideos.map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', type: 'video' as const, videoUrl: v.videoUrl }));
  const videosData = videoOnlyItems.map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', videoUrl: v.videoUrl }));
  const savedData = (savedVideosData || []).map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.likesCount?.toString() || '0', type: 'video' as const, videoUrl: v.videoUrl }));
  const tagsData: any[] = [];
  const tabBarHeight = useBottomTabBarHeight();
  const modalBackdropBottom = tabBarHeight;

  // Calculate grid height including the Drafts folder (always shown)
  const GRID_COLUMNS = 3;
  const GRID_GAP = 2;
  const GRID_PADDING = 2;

  const totalGridItems = postsData.length + 1;
  const gridItemSize = Math.floor(
    (SCREEN_WIDTH - GRID_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  );
  const gridItemHeight = gridItemSize * 1.25; // Aspect Ratio 0.8 (4:5) -> Height = Width * 1.25
  const gridRows = Math.ceil(totalGridItems / GRID_COLUMNS);
  const gridHeight = gridRows * (gridItemHeight + GRID_GAP) + GRID_GAP;

  const videoRows = Math.ceil(videosData.length / GRID_COLUMNS);
  const videosHeight = videoRows * (gridItemSize * (16 / 9) + GRID_GAP) + GRID_GAP;
  const savedRows = Math.ceil(savedData.length / GRID_COLUMNS);
  const savedHeight = savedRows * (gridItemHeight + GRID_GAP) + GRID_GAP;
  const tagsHeight = 300;
  const shopHeight = 260;
  const showShopTab = currentUser?.isVerified === true && shopEnabled;

  const handleTabPress = (index: number) => {
    setActiveTab(index);
    pagerRef.current?.setPageWithoutAnimation(index);
  };

  const handleShopToggle = useCallback((value: boolean) => {
    if (!value) {
      setActiveTab((prev) => (prev > 3 ? 3 : prev));
      pagerRef.current?.setPageWithoutAnimation(3);
    }
    setShopEnabled(value);
    if (value) {
      setIsShopModalOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!showShopTab && activeTab > 3) {
      setActiveTab(3);
      pagerRef.current?.setPageWithoutAnimation(3);
    }
  }, [activeTab, showShopTab]);

  useEffect(() => {
    if (!isShopModalOpen) return;
    // setBackgroundColorAsync is not supported with edge-to-edge enabled on Android.
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
  }, [isShopModalOpen, isDark]);

  useEffect(() => {
    if (!isShopModalOpen) return;
    setShopFxKey((prev) => prev + 1);
    setShowShopFx(true);
    const timer = setTimeout(() => setShowShopFx(false), 5000);
    return () => clearTimeout(timer);
  }, [isShopModalOpen]);

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

  const draftsHeader = (
    <DraftsFolderCard
      drafts={drafts}
      isDark={isDark}
      itemWidth={gridItemSize}
      onPress={handleDraftsFolderPress}
    />
  );

  const pagerPages = [
    (
      <View key="0">
        <MediaGrid
          items={postsData}
          isDark={isDark}
          aspectRatio={0.8}
          onPreview={showPreview}
          onPress={handleVideoPress}
          onPreviewEnd={hidePreview}
          headerComponent={draftsHeader}
          gap={GRID_GAP}
          padding={GRID_PADDING}
        />
      </View>
    ),
    (
      <View key="1">
        <MediaGrid
          items={videosData.map((video) => ({ ...video, type: 'video' as const }))}
          isDark={isDark}
          aspectRatio={9 / 16}
          onPress={handleVideoPress}
          onPreview={showPreview}
          onPreviewEnd={hidePreview}
          gap={GRID_GAP}
          padding={GRID_PADDING}
        />
      </View>
    ),
    (
      <View key="2">
        <MediaGrid
          items={tagsData}
          isDark={isDark}
          aspectRatio={0.8}
          onPreview={showPreview}
          onPreviewEnd={hidePreview}
          gap={GRID_GAP}
          padding={GRID_PADDING}
        />
        {tagsData.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: textSecondary }}>Etiketlenmiş gönderi yok</Text>
          </View>
        )}
      </View>
    ),
    (
      <View key="3">
        <MediaGrid
          items={savedData}
          isDark={isDark}
          aspectRatio={0.8}
          onPress={handleSavedPress}
          onPreview={showPreview}
          onPreviewEnd={hidePreview}
          gap={GRID_GAP}
          padding={GRID_PADDING}
        />
        {savedData.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: textSecondary }}>Henüz kaydedilen gönderi yok</Text>
          </View>
        )}
      </View>
    ),
  ];

  if (showShopTab) {
    pagerPages.push(
      <View key="4">
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: textSecondary }}>Mağaza henüz boş</Text>
        </View>
      </View>
    );
  }

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
      logError(LogCode.REPO_ERROR, 'Profile activity fetch error', { error: err, type, userId: currentUserId });
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

  const handleLogout = useCallback(async () => {
    closeSettings();
    await useAuthStore.getState().signOut();
    router.replace('/login');
  }, [closeSettings, router]);

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
      <View style={[
        styles.topNavContainer,
        { paddingTop: insets.top, backgroundColor: bgContainer },
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
      </View>

      <SwipeWrapper enableLeft={false} onSwipeRight={() => router.push('/notifications')} edgeOnly={true}>
        <Animated.ScrollView
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
                  onPress={() => logUI(LogCode.UI_INTERACTION, 'Share profile button pressed')}
                >
                  <Text style={[styles.btnActionText, { color: btnEditText }]}>Profili Paylaş</Text>
                </Pressable>
              </View>

              <View style={styles.socialClubsRow}>
                <SocialTags isDark={isDark} user={user.entity} />
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
            {showShopTab && (
              <Pressable
                style={[styles.tab, activeTab === 4 && [styles.activeTab, { borderBottomColor: textPrimary }]]}
                onPress={() => handleTabPress(4)}
                hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
              >
                <StoreTabIcon color={activeTab === 4 ? textPrimary : textSecondary} />
              </Pressable>
            )}
          </View>

          <PagerView
            ref={pagerRef}
            style={{
              width: '100%',
              height: activeTab === 0
                ? gridHeight
                : activeTab === 1
                  ? videosHeight
                  : activeTab === 2
                    ? tagsHeight
                    : activeTab === 3
                      ? savedHeight
                      : shopHeight,
            }}
            initialPage={0}
            onPageSelected={(e: PagerViewOnPageSelectedEvent) => setActiveTab(e.nativeEvent.position)}
          >
            {pagerPages}
          </PagerView>
          <View style={{ height: 100 }} />
        </Animated.ScrollView>
      </SwipeWrapper>

      {previewItem && <PreviewModal item={previewItem} onClose={hidePreview} />}
      <BioBottomSheet ref={bioSheetRef} bio={currentUser.bio || ''} isDark={isDark} />
      <EditProfileSheet
        ref={editProfileSheetRef}
        user={currentUser}
        onUpdateProfile={updateProfile}
        onUploadAvatar={uploadAvatar}
        onUpdateCompleted={() => reload(true)}
      />
      <Modal
        transparent
        visible={isShopModalOpen}
        animationType="fade"
        onRequestClose={() => setIsShopModalOpen(false)}
      >
        <View style={styles.shopModalOverlay}>
          <View style={[styles.shopModalBackdrop, { bottom: modalBackdropBottom }]} />
          <View style={[styles.shopModalCenter, { paddingBottom: modalBackdropBottom }]}>
            <View
              style={[
                styles.shopModalContainer,
                { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF', borderColor: isDark ? '#2A2A2A' : '#E9E9E9' },
              ]}
            >
              <View style={styles.shopModalContent}>
                <View style={styles.shopModalIconWrap}>
                  <Store size={100} color={isDark ? '#FFFFFF' : textPrimary} strokeWidth={0.7} />
                  <Svg width={68} height={68} viewBox="0 0 60 60" style={styles.shopModalCircle}>
                    <Defs>
                      <SvgLinearGradient id="shopModalRing" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0%" stopColor="#F472B6" />
                        <Stop offset="55%" stopColor="#FB7185" />
                        <Stop offset="100%" stopColor="#F59E0B" />
                      </SvgLinearGradient>
                    </Defs>
                    <Circle cx="30" cy="30" r="24" stroke="url(#shopModalRing)" strokeWidth="2" fill="#FFFFFF" />
                    <Path
                      d="M20 6 9 17l-5-5"
                      transform="translate(18 18)"
                      stroke="url(#shopModalRing)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                </View>
                <Svg width={220} height={40} viewBox="0 0 220 40" style={styles.shopModalTitleOffset}>
                  <Defs>
                    <SvgLinearGradient id="shopModalTitleGradient" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0%" stopColor="#F472B6" />
                      <Stop offset="55%" stopColor="#FB7185" />
                      <Stop offset="100%" stopColor="#F59E0B" />
                    </SvgLinearGradient>
                  </Defs>
                  <SvgText
                    x="110"
                    y="30"
                    fontSize="32"
                    fontWeight="800"
                    letterSpacing="2"
                    textAnchor="middle"
                    fill="none"
                    stroke="url(#shopModalTitleGradient)"
                    strokeWidth="6"
                    opacity="0.35"
                  >
                    Tebrikler!
                  </SvgText>
                  <SvgText
                    x="110"
                    y="30"
                    fontSize="32"
                    fontWeight="800"
                    letterSpacing="2"
                    textAnchor="middle"
                    fill="url(#shopModalTitleGradient)"
                  >
                    Tebrikler!
                  </SvgText>
                </Svg>
                <Text style={[styles.shopModalSubtitle, styles.shopModalSubtitleOffset, { color: textPrimary }]}>
                  Mağazan Yayında
                </Text>
              </View>
              <View
                style={[
                  styles.shopModalSeparator,
                  styles.shopModalSeparatorOffset,
                  { backgroundColor: isDark ? '#2A2A2A' : '#E9E9E9' },
                ]}
              />
              <TouchableOpacity
                style={[styles.shopModalButton, styles.shopModalButtonOffset]}
                onPress={() => {
                  setIsShopModalOpen(false);
                  setActiveTab(4);
                  pagerRef.current?.setPageWithoutAnimation(4);
                }}
                accessibilityRole="button"
                accessibilityLabel="Mağazaya Git"
              >
                <Text style={[styles.shopModalLinkText, { color: accentColor }]}>Mağazaya Git</Text>
              </TouchableOpacity>
              <View
                style={[
                  styles.shopModalSeparator,
                  styles.shopModalSeparatorOffset,
                  { backgroundColor: isDark ? '#2A2A2A' : '#E9E9E9' },
                ]}
              />
              <TouchableOpacity
                style={[styles.shopModalButton, styles.shopModalButtonOffset, styles.shopModalLastButton]}
                onPress={() => setIsShopModalOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Şimdi Değil"
              >
                <Text style={[styles.shopModalSecondaryText, { color: isDark ? '#BFC3C9' : '#6B7280' }]}>Şimdi Değil</Text>
              </TouchableOpacity>
            </View>
          </View>
          {showShopFx && <ShopFireworks key={shopFxKey} triggerKey={shopFxKey} />}
        </View>
      </Modal>
      <ProfileSettingsOverlay
        styles={styles}
        insets={insets}
        isOpen={isSettingsOpen}
        closeSettings={closeSettings}
        settingsPanelStyle={settingsPanelStyle}
        settingsBackdropStyle={settingsBackdropStyle}
        bgContainer={bgContainer}
        settingsSection={settingsSection}
        setSettingsSection={setSettingsSection}
        settingsCopy={settingsCopy}
        settingsTitleOverrides={settingsTitleOverrides}
        settingsSectionTitleOverrides={settingsSectionTitleOverrides}
        settingsItemLabelOverrides={settingsItemLabelOverrides}
        settingsHelperOverrides={settingsHelperOverrides}
        textPrimary={textPrimary}
        textSecondary={textSecondary}
        settingsItemBorderColor={settingsItemBorderColor}
        settingsIconColor={settingsIconColor}
        settingsIconStroke={settingsIconStroke}
        settingsIconSize={settingsIconSize}
        settingsChevronColor={settingsChevronColor}
        settingsSegmentBg={settingsSegmentBg}
        settingsSegmentActive={settingsSegmentActive}
        settingsSegmentActiveText={settingsSegmentActiveText}
        settingsSegmentText={settingsSegmentText}
        closeIconColor={closeIconColor}
        closeIconSize={closeIconSize}
        closeIconStroke={closeIconStroke}
        backIconColor={backIconColor}
        backIconSize={backIconSize}
        backIconStroke={backIconStroke}
        themeOptions={themeOptions}
        theme={theme}
        setTheme={setTheme}
        router={router}
        currentUserId={currentUserId}
        onLogout={handleLogout}
        openActionsMenu={openActionsMenu}
        openDeletedMenu={openDeletedMenu}
        openAccountSettings={openAccountSettings}
        openNotifications={openNotifications}
        openAccountType={openAccountType}
        openInAppBrowser={openInAppBrowser}
        openContentPreferences={openContentPreferences}
        openActivityGrid={openActivityGrid}
        browserHistoryOptions={browserHistoryOptions}
        browserHistoryEnabled={browserHistoryEnabled}
        setBrowserHistoryEnabled={setBrowserHistoryEnabled}
        clearBrowserHistory={clearBrowserHistory}
        isVerified={currentUser?.isVerified === true}
        shopEnabled={shopEnabled}
        setShopEnabled={handleShopToggle}
        browserHistory={browserHistory}
        openHistoryEntry={openHistoryEntry}
        getHistoryRange={getHistoryRange}
        getHistoryDateLabel={getHistoryDateLabel}
        historyFilterOptions={historyFilterOptions}
        historyFilter={historyFilter}
        historyFilterLabel={historyFilterLabel}
        setHistoryFilter={setHistoryFilter}
        historyFilterOpen={historyFilterOpen}
        setHistoryFilterOpen={setHistoryFilterOpen}
        historySortOptions={historySortOptions}
        historySort={historySort}
        historySortLabel={historySortLabel}
        setHistorySort={setHistorySort}
        historySortOpen={historySortOpen}
        setHistorySortOpen={setHistorySortOpen}
        historySelectionMode={historySelectionMode}
        setHistorySelectionMode={setHistorySelectionMode}
        selectedHistoryKeys={selectedHistoryKeys}
        setSelectedHistoryKeys={setSelectedHistoryKeys}
        toggleHistorySelection={toggleHistorySelection}
        activityVideos={activityVideos}
        isActivityLoading={isActivityLoading}
        isDark={isDark}
        setCustomFeed={setCustomFeed}
        setActiveVideo={setActiveVideo}
        authUser={authUser}
        accountSettingsNoticePrefix={accountSettingsNoticePrefix}
        accountSettingsNoticeSuffix={accountSettingsNoticeSuffix}
        accountSettingsNoticeLinkIndex={accountSettingsNoticeLinkIndex}
        accountSettingsNoticeLinkLabel={accountSettingsNoticeLinkLabel}
      />

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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activeTab: { borderBottomWidth: 2 },
  previewOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  previewCard: { width: '80%', height: 480, borderRadius: 30, overflow: 'hidden', backgroundColor: '#000', ...shadowStyle({ color: '#000', offset: { width: 0, height: 10 }, opacity: 0.5, radius: 15, elevation: 20 }) },
  previewVideo: { width: '100%', height: '100%' },
  shopModalOverlay: {
    flex: 1,
  },
  shopModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  shopModalCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopModalFx: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  shopModalFxParticle: {
    position: 'absolute',
  },
  shopModalContainer: {
    width: 300,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    ...shadowStyle({ color: '#000000', offset: { width: 0, height: 6 }, opacity: 0.18, radius: 12, elevation: 8 }),
  },
  shopModalContent: {
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 4,
  },
  shopModalIconWrap: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -30 }],
  },
  shopModalCircle: {
    position: 'absolute',
    right: 22,
    bottom: 22,
  },
  shopModalCheck: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  shopModalTitle: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 34,
  },
  shopModalSubtitle: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  shopModalSubtitleOffset: {
    transform: [{ translateY: -43 }],
  },
  shopModalTitleOffset: {
    transform: [{ translateY: -45 }],
  },
  shopModalSeparator: {
    height: 1,
    width: '100%',
  },
  shopModalSeparatorOffset: {
    transform: [{ translateY: -40 }],
  },
  shopModalButton: {
    width: '100%',
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shopModalButtonOffset: {
    transform: [{ translateY: -40 }],
  },
  shopModalLastButton: {
    marginBottom: -34,
  },
  shopModalLinkText: {
    fontSize: 20,
    fontWeight: '500',
  },
  shopModalSecondaryText: {
    fontSize: 20,
    fontWeight: '400',
  },
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
  settingsHintText: {
    fontSize: 11,
    fontWeight: '300',
    lineHeight: 15,
    opacity: 0.68,
    marginTop: 2,
  },
  settingsLinkText: {
    color: '#1A73E8',
    fontWeight: '500',
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
