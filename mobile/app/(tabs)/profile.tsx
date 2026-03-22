import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
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
import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { useVideoCounterStore } from '../../src/presentation/store/useVideoCounterStore';
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
import VideosTabSvgIcon from '@assets/icons/navigation/videos.svg';
import DarkVideosTabSvgIcon from '@assets/icons/navigation/darkvideos.svg';
import { VerifiedBadge } from '../../src/presentation/components/shared/VerifiedBadge';
import { ProfileSettingsOverlay } from '../../src/presentation/components/profile/ProfileSettingsOverlay';
import { UserActivityRepositoryImpl } from '../../src/data/repositories/UserActivityRepositoryImpl';
import { Video as VideoEntity } from '../../src/domain/entities/Video';
import { isFeedVideoItem } from '../../src/presentation/components/poolFeed/utils/PoolFeedUtils';
import { logError, logUI, LogCode } from '@/core/services/Logger';
import { shadowStyle } from '@/core/utils/shadow';

const activityRepository = new UserActivityRepositoryImpl();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
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

const SaveTabIcon = ({ color, size = INNER_TAB_ICON_SIZE }: { color: string; size?: number }) => (
  <Svg width={size} height={size} viewBox="0 -960 960 960" fill={color}>
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

const StoreTabIcon = ({ color, size = INNER_TAB_ICON_SIZE }: { color: string; size?: number }) => (
  <Store size={size} color={color} strokeWidth={1.7} />
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
  const ThemedVideosTabSvgIcon = isDark ? VideosTabSvgIcon : DarkVideosTabSvgIcon;
  const { user: authUser, initialize, isInitialized } = useAuthStore();
  const { drafts, fetchDrafts } = useDraftStore();
  const themeColors = isDark ? DARK_COLORS : LIGHT_COLORS;
  const syncVideoCountersFromServer = useVideoCounterStore((state) => state.syncFromServer);

  // Use authenticated user's ID, fallback to hardcoded for development
  const currentUserId = authUser?.id || '687c8079-e94c-42c2-9442-8a4a6b63dec6';



  // Fetch drafts on mount
  useEffect(() => {
    if (currentUserId) {
      fetchDrafts(currentUserId);
    }
  }, [currentUserId]);


  const { videos, isLoadingMore, hasMore, refreshFeed, loadMore } = useVideoFeed(currentUserId, 50);
  const { videos: savedVideosData, refresh: refreshSavedVideos } = useSavedVideos(currentUserId);

  const { user: profileUser, isLoading, reload, updateProfile, uploadAvatar } = useProfile(currentUserId);
  const setActiveVideo = useActiveVideoStore((state) => state.setActiveVideo);

  const hasInitialSavedFetch = useRef(false);

  useFocusEffect(
    useCallback(() => {
      SystemBars.setStyle({
        statusBar: isDark ? 'light' : 'dark',
        navigationBar: isDark ? 'light' : 'dark',
      });

      const task = InteractionManager.runAfterInteractions(() => {
        // Only refresh if it's not the first focus (hook already fetches on mount)
        if (hasInitialSavedFetch.current) {
          logUI(LogCode.UI_INTERACTION, 'Profile tab focused: Refreshing saved videos');
          refreshSavedVideos();
        } else {
          hasInitialSavedFetch.current = true;
        }
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
  const settingsTitleOverrides: Record<string, any> = {};
  const settingsSectionTitleOverrides: Record<string, any> = {};
  const settingsItemLabelOverrides: Record<string, any> = {};
  const settingsHelperOverrides: Record<string, any> = {};
  const settingsIconColorOverride: string | null = null;
  const settingsIconStrokeWidthOverride: number | null = null;
  const settingsIconSizeOverride: number | null = null;
  const settingsIconCloseOverrides: Record<string, any> = {};
  const settingsIconBackOverrides: Record<string, any> = {};
  const settingsChevronColorOverride: string | null = null;
  const settingsBorderColorOverride: string | null = null;
  const settingsSegmentBgColorOverride: string | null = null;
  const settingsSegmentActiveColorOverride: string | null = null;
  const settingsSegmentActiveTextColorOverride: string | null = null;
  const settingsSegmentTextColorOverride: string | null = null;
  const settingsTranslateX = useSharedValue(SCREEN_WIDTH);
  const settingsBackdropOpacity = useSharedValue(0);
  const editProfileSheetRef = useRef<BottomSheet>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Silent refresh - don't show skeleton, just update data
    await Promise.all([refreshFeed(), reload(true), refreshSavedVideos()]);
    setRefreshing(false);
  }, [refreshFeed, reload, refreshSavedVideos]);

  // Dynamic Theme Colors
  const bgBody = themeColors.background;
  const bgContainer = themeColors.background;
  const textPrimary = themeColors.textPrimary;
  const tabPrimary = isDark ? '#FFFFFF' : '#080A0F';
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
  const headerOffset = insets.top + 60;

  // Button Colors
  const btnEditBg = isDark ? '#333333' : '#E5E5E5';
  const btnEditText = textPrimary;

  // PagerView States
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

  const maybeLoadMore = useCallback((nativeEvent: NativeScrollEvent) => {
    if (isLoading || isLoadingMore || !hasMore) return;
    if (activeTab !== 0 && activeTab !== 1) return;

    const { contentOffset, contentSize, layoutMeasurement } = nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom <= 400) {
      void loadMore();
    }
  }, [activeTab, hasMore, isLoading, isLoadingMore, loadMore]);
  const handleProfileScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nativeEvent = event.nativeEvent;
    maybeLoadMore(nativeEvent);
  }, [maybeLoadMore]);

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

  const safeVideos = useMemo(() => videos || [], [videos]);
  const videoOnlyItems = useMemo(() => safeVideos.filter(isFeedVideoItem), [safeVideos]);
  const postsData = useMemo(() => safeVideos.map((v: any) => ({
    id: v.id,
    thumbnail: v.thumbnailUrl,
    views: v.viewsCount ?? 0,
    type: isFeedVideoItem(v) ? ('video' as const) : (v.postType === 'carousel' ? ('carousel' as const) : ('photo' as const)),
    videoUrl: v.videoUrl,
  })), [safeVideos]);
  const videosData = useMemo(
    () => videoOnlyItems.map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.viewsCount ?? 0, videoUrl: v.videoUrl })),
    [videoOnlyItems]
  );
  const savedData = useMemo(
    () => (savedVideosData || []).map((v: any) => ({ id: v.id, thumbnail: v.thumbnailUrl, views: v.viewsCount ?? 0, type: 'video' as const, videoUrl: v.videoUrl })),
    [savedVideosData]
  );
  const tabBarHeight = useBottomTabBarHeight();
  const modalBackdropBottom = tabBarHeight;

  // Calculate grid height including the Drafts folder (always shown)
  const GRID_COLUMNS = 3;
  const GRID_GAP = 2;
  const GRID_PADDING = 2;

  const totalGridItems = postsData.length + (drafts?.length ? 1 : 0);
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
  const shopHeight = 260;
  const showShopTab = currentUser?.isVerified === true && shopEnabled;
  const visibleTabCount = showShopTab ? 4 : 3;
  const [navTabsWidth, setNavTabsWidth] = useState(SCREEN_WIDTH);
  const [tabLayouts, setTabLayouts] = useState<Record<number, { x: number; width: number }>>({});
  const tabIndicatorFallbackWidth = navTabsWidth / visibleTabCount;
  const pagerProgress = useSharedValue(0);
  const getTabHeight = useCallback((index: number) => {
    if (index === 0) return gridHeight;
    if (index === 1) return videosHeight;
    if (index === 2) return savedHeight;
    return shopHeight;
  }, [gridHeight, savedHeight, shopHeight, videosHeight]);
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

  const handleShopToggle = useCallback((value: boolean) => {
    if (!value) {
      tabPressTargetRef.current = null;
      setActiveTab(2);
      updateFocusedTab(2);
      pagerProgress.value = 2;
      updatePagerHeight(getTabHeight(2));
      pagerRef.current?.setPageWithoutAnimation(2);
    }
    setShopEnabled(value);
    if (value) {
      setIsShopModalOpen(true);
    }
  }, [getTabHeight, pagerProgress, updateFocusedTab, updatePagerHeight]);

  useEffect(() => {
    if (!showShopTab && activeTab > 2) {
      tabPressTargetRef.current = null;
      setActiveTab(2);
      updateFocusedTab(2);
      pagerProgress.value = 2;
      updatePagerHeight(getTabHeight(2));
      pagerRef.current?.setPageWithoutAnimation(2);
    }
  }, [activeTab, getTabHeight, pagerProgress, showShopTab, updateFocusedTab, updatePagerHeight]);

  useEffect(() => {
    const safeTab = showShopTab ? activeTab : Math.min(activeTab, 2);
    updatePagerHeight(getTabHeight(safeTab));
  }, [activeTab, getTabHeight, showShopTab, updatePagerHeight]);

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

  const showPreview = useCallback((item: any) => {
    if (item?.videoUrl) {
      setPreviewItem(item);
    }
  }, []);
  const hidePreview = useCallback(() => setPreviewItem(null), []);
  const handleDraftsFolderPress = useCallback(() => {
    router.push('/drafts' as any);
  }, [router]);

  const handleVideoPress = useCallback((video: any, index: number) => {
    setActiveVideo(video.id, index);
    router.navigate('/videos' as any);
  }, [router, setActiveVideo]);

  const handleSavedPress = useCallback((video: any, index: number) => {
    setActiveVideo(video.id, index);
    router.navigate('/videos' as any);
  }, [router, setActiveVideo]);

  const draftsHeader = useMemo(() => {
    if (!drafts?.length) return null;
    return (
      <DraftsFolderCard
        drafts={drafts}
        isDark={isDark}
        itemWidth={gridItemSize}
        onPress={handleDraftsFolderPress}
      />
    );
  }, [drafts, isDark, gridItemSize, handleDraftsFolderPress]);

  const videosPageItems = useMemo(
    () => videosData.map((video) => ({ ...video, type: 'video' as const })),
    [videosData]
  );

  const pagerPages = useMemo(() => [
    (
      <View key="0" style={{ backgroundColor: bgBody }}>
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
          showViewCount={false}
          showMediaTypeIcon={true}
        />
      </View>
    ),
    (
      <View key="1" style={{ backgroundColor: bgBody }}>
        <MediaGrid
          items={videosPageItems}
          isDark={isDark}
          aspectRatio={9 / 16}
          onPress={handleVideoPress}
          onPreview={showPreview}
          onPreviewEnd={hidePreview}
          gap={GRID_GAP}
          padding={GRID_PADDING}
          useVideoSvgForViewCountIcon={true}
        />
      </View>
    ),
    (
      <View key="2" style={{ backgroundColor: bgBody }}>
        <MediaGrid
          items={savedData}
          isDark={isDark}
          aspectRatio={0.8}
          onPress={handleSavedPress}
          onPreview={showPreview}
          onPreviewEnd={hidePreview}
          gap={GRID_GAP}
          padding={GRID_PADDING}
          useVideoSvgForViewCountIcon={true}
        />
        {savedData.length === 0 && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: textSecondary }}>Henüz kaydedilen gönderi yok</Text>
          </View>
        )}
      </View>
    ),
    ...(showShopTab
      ? [(
        <View key="3" style={{ backgroundColor: bgBody }}>
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Text style={{ color: textSecondary }}>Mağaza henüz boş</Text>
          </View>
        </View>
      )]
      : []),
  ], [
    draftsHeader,
    GRID_GAP,
    GRID_PADDING,
    handleSavedPress,
    handleVideoPress,
    hidePreview,
    isDark,
    postsData,
    savedData,
    showPreview,
    showShopTab,
    bgBody,
    textSecondary,
    videosPageItems,
  ]);

  const handlePageScroll = useCallback((e: PagerViewOnPageScrollEvent) => {
    const { position, offset } = e.nativeEvent;

    // Snap indicator to destination tab immediately when swipe starts.
    let targetProgress = position + offset;
    if (offset > 0) {
      if (position < activeTab) {
        // Backward swipe (e.g. 1 -> 0): jump directly under the previous tab.
        targetProgress = position;
      } else if (position === activeTab) {
        // Forward swipe (e.g. 0 -> 1): jump directly under the next tab.
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
  const saveIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusedTabValue.value === 2 ? tabActiveScale : 1 }],
  }));
  const storeIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: focusedTabValue.value === 3 ? tabActiveScale : 1 }],
  }));

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
    setSettingsSection('main');
    setSettingsOpen(true);
  }, []);

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

  const openActivityGrid = useCallback(async (type: 'likes' | 'saved' | 'history' | 'archived') => {
    if (type !== 'archived' && !currentUserId) return;
    setSettingsSection(type);
    setIsActivityLoading(true);
    setActivityVideos([]);
    try {
      let data: VideoEntity[] = [];
      if (type === 'likes' && currentUserId) data = await activityRepository.getLikedVideos(currentUserId);
      else if (type === 'saved' && currentUserId) data = await activityRepository.getSavedVideos(currentUserId);
      else if (type === 'history' && currentUserId) data = await activityRepository.getWatchHistory(currentUserId);
      syncVideoCountersFromServer(data);
      setActivityVideos(data);
    } catch (err) {
      logError(LogCode.REPO_ERROR, 'Profile activity fetch error', { error: err, type, userId: currentUserId });
    } finally {
      setIsActivityLoading(false);
    }
  }, [currentUserId, syncVideoCountersFromServer]);

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

  const renderTabsBar = () => (
    <View
      style={[
        styles.navTabs,
        { borderBottomColor: cardBg, backgroundColor: bgContainer },
      ]}
      onLayout={handleNavTabsLayout}
    >
      <Pressable
        style={styles.tab}
        onPress={() => handleTabPress(0)}
        onLayout={(event) => handleTabLayout(0, event)}
        hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
      >
        <Animated.View style={gridIconAnimatedStyle}>
          <GridIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} />
        </Animated.View>
      </Pressable>
      <Pressable
        style={styles.tab}
        onPress={() => handleTabPress(1)}
        onLayout={(event) => handleTabLayout(1, event)}
        hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
      >
        <Animated.View style={videoIconAnimatedStyle}>
          <VideoIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} IconComponent={ThemedVideosTabSvgIcon} />
        </Animated.View>
      </Pressable>
      <Pressable
        style={styles.tab}
        onPress={() => handleTabPress(2)}
        onLayout={(event) => handleTabLayout(2, event)}
        hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
      >
        <Animated.View style={saveIconAnimatedStyle}>
          <SaveTabIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} />
        </Animated.View>
      </Pressable>
      {showShopTab && (
        <Pressable
          style={styles.tab}
          onPress={() => handleTabPress(3)}
          onLayout={(event) => handleTabLayout(3, event)}
          hitSlop={{ top: 15, bottom: 15, left: 10, right: 10 }}
        >
          <Animated.View style={storeIconAnimatedStyle}>
            <StoreTabIcon color={tabPrimary} size={INNER_TAB_ICON_SIZE} />
          </Animated.View>
        </Pressable>
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

  return (
    <View style={[styles.container, { backgroundColor: bgBody }]}>
      <View style={[
        styles.topNavContainer,
        { paddingTop: insets.top, backgroundColor: bgContainer },
      ]}>
        <View style={styles.topNav}>
          <View style={styles.navIcon} />
          <Text style={[styles.headerUsername, { color: textPrimary }]}>{`@${user.username}`}</Text>
          <View style={styles.navActions}>
            <View style={styles.navLinkLeftOfMenu}>
              <SocialTags
                isDark={isDark}
                user={user.entity}
                onlyLink
                panelDirection="left"
              />
            </View>
            <TouchableOpacity
              style={[styles.navIconButton, styles.menuButtonShiftLeft, { alignItems: 'flex-end' }]}
              onPress={openSettings}
            >
              <Menu size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <SwipeWrapper enableLeft={false} onSwipeRight={() => router.navigate('/videos')} edgeOnly={true}>
        <Animated.ScrollView
          style={{ marginTop: headerOffset }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleProfileScroll}
          stickyHeaderIndices={[isLoading ? 2 : 1]}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? "#fff" : "#000"} progressViewOffset={0} />}
        >
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
            </View>

          {isLoading && (
            <View style={styles.loadingContainerOverlay} pointerEvents="none">
              <ActivityIndicator size="small" color={isDark ? '#fff' : '#000'} />
            </View>
          )}

          <View>
            {renderTabsBar()}
          </View>

          <PagerView
            ref={pagerRef}
            offscreenPageLimit={1}
            style={{
              width: '100%',
              height: pagerHeight,
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
                  tabPressTargetRef.current = null;
                  setActiveTab(3);
                  updateFocusedTab(3);
                  pagerProgress.value = 3;
                  updatePagerHeight(getTabHeight(3));
                  pagerRef.current?.setPageWithoutAnimation(3);
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
  navLinkLeftOfMenu: { marginRight: -8 },
  navIconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuButtonShiftLeft: { transform: [{ translateX: -6 }] },
  headerUsername: { fontSize: 20, fontWeight: '600', position: 'absolute', left: 0, right: 0, textAlign: 'center', zIndex: -1 },
  profileContainer: { alignItems: 'center', paddingHorizontal: 10, marginTop: 5 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userNameText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3 },
  bioText: { fontSize: 13, lineHeight: 19.5, marginBottom: 20, paddingHorizontal: 5, textAlign: 'center' },
  actionsContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 25, height: 36, paddingHorizontal: 5, width: '100%' },
  btnAction: { flex: 1, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnActionText: { fontSize: 13, fontWeight: '600' },
  loadingContainerOverlay: { position: 'absolute', top: 0, right: 0, padding: 8 },
  btnIconOnly: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e5e5e5' },
  navTabs: { flexDirection: 'row', borderBottomWidth: 1, position: 'relative' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIndicator: { position: 'absolute', left: 0, bottom: 0, height: 2 },
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
    ...shadowStyle({ color: '#080A0F', offset: { width: 0, height: 6 }, opacity: 0.18, radius: 12, elevation: 8 }),
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
