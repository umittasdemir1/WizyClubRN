import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BadgePlus,
  Bell,
  Bookmark,
  Briefcase,
  CalendarDays,
  Clock,
  Eye,
  EyeOff,
  Globe,
  Heart,
  ImagePlay,
  Lock,
  Mail,
  MessageSquare,
  RectangleEllipsis,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SunMoon,
  Trash2,
  User,
  UserCog,
  UserX,
  X,
} from 'lucide-react-native';
import { ActivityGrid } from './ActivityGrid';
import { DeletedContentMenu } from './DeletedContentSheet';
import type { Theme } from '../../store/useThemeStore';

type SettingsSection =
  | 'main'
  | 'actions'
  | 'deleted'
  | 'likes'
  | 'saved'
  | 'history'
  | 'archived'
  | 'notInterested'
  | 'interested'
  | 'accountHistory'
  | 'accountSettings'
  | 'notifications'
  | 'accountType'
  | 'inAppBrowser'
  | 'browserHistory'
  | 'contentPreferences';

type ProfileSettingsOverlayProps = {
  styles: Record<string, any>;
  insets: { top: number };
  isOpen: boolean;
  closeSettings: () => void;
  settingsPanelStyle: any;
  settingsBackdropStyle: any;
  bgContainer: string;
  settingsSection: SettingsSection;
  setSettingsSection: (section: SettingsSection) => void;
  settingsCopy: any;
  settingsTitleOverrides: Record<string, any>;
  settingsSectionTitleOverrides: Record<string, any>;
  settingsItemLabelOverrides: Record<string, any>;
  settingsHelperOverrides: Record<string, any>;
  textPrimary: string;
  textSecondary: string;
  settingsItemBorderColor: string;
  settingsIconColor: string;
  settingsIconStroke: number;
  settingsIconSize: number;
  settingsChevronColor: string;
  settingsSegmentBg: string;
  settingsSegmentActive: string;
  settingsSegmentActiveText: string;
  settingsSegmentText: string;
  closeIconColor: string;
  closeIconSize: number;
  closeIconStroke: number;
  backIconColor: string;
  backIconSize: number;
  backIconStroke: number;
  themeOptions: Array<{ label: string; value: Theme }>;
  theme: Theme;
  setTheme: (value: Theme) => void;
  router: { push: (path: any) => void; replace: (path: any) => void };
  currentUserId: string;
  onLogout: () => void;
  openActionsMenu: () => void;
  openDeletedMenu: () => void;
  openAccountSettings: () => void;
  openNotifications: () => void;
  openAccountType: () => void;
  openInAppBrowser: () => void;
  openContentPreferences: () => void;
  openActivityGrid: (type: 'likes' | 'saved' | 'history') => void;
  browserHistoryOptions: Array<{ label: string; value: string }>;
  browserHistoryEnabled: boolean;
  setBrowserHistoryEnabled: (enabled: boolean) => void;
  clearBrowserHistory: () => void;
  browserHistory: Array<{ url: string; title?: string; timestamp: number }>;
  openHistoryEntry: (url: string) => void;
  getHistoryRange: (filter: 'today' | 'yesterday' | 'last3' | 'last7' | 'last30') => { start: number; end: number };
  getHistoryDateLabel: (timestamp: number) => string;
  historyFilterOptions: Array<{ label: string; value: string }>;
  historyFilter: 'today' | 'yesterday' | 'last3' | 'last7' | 'last30';
  historyFilterLabel: string;
  setHistoryFilter: (value: 'today' | 'yesterday' | 'last3' | 'last7' | 'last30') => void;
  historyFilterOpen: boolean;
  setHistoryFilterOpen: React.Dispatch<React.SetStateAction<boolean>>;
  historySortOptions: Array<{ label: string; value: string }>;
  historySort: 'newest' | 'oldest' | 'az';
  historySortLabel: string;
  setHistorySort: (value: 'newest' | 'oldest' | 'az') => void;
  historySortOpen: boolean;
  setHistorySortOpen: React.Dispatch<React.SetStateAction<boolean>>;
  historySelectionMode: boolean;
  setHistorySelectionMode: (value: boolean) => void;
  selectedHistoryKeys: string[];
  setSelectedHistoryKeys: (value: string[]) => void;
  toggleHistorySelection: (key: string) => void;
  activityVideos: any[];
  isActivityLoading: boolean;
  isDark: boolean;
  setCustomFeed: (videos: any[]) => void;
  setActiveVideo: (id: string, index: number) => void;
  authUser: { created_at?: string; email?: string; id?: string } | null;
  accountSettingsNoticePrefix: string;
  accountSettingsNoticeSuffix: string;
  accountSettingsNoticeLinkIndex: number;
  accountSettingsNoticeLinkLabel: string;
};

export function ProfileSettingsOverlay({
  styles,
  insets,
  isOpen,
  closeSettings,
  settingsPanelStyle,
  settingsBackdropStyle,
  bgContainer,
  settingsSection,
  setSettingsSection,
  settingsCopy,
  settingsTitleOverrides,
  settingsSectionTitleOverrides,
  settingsItemLabelOverrides,
  settingsHelperOverrides,
  textPrimary,
  textSecondary,
  settingsItemBorderColor,
  settingsIconColor,
  settingsIconStroke,
  settingsIconSize,
  settingsChevronColor,
  settingsSegmentBg,
  settingsSegmentActive,
  settingsSegmentActiveText,
  settingsSegmentText,
  closeIconColor,
  closeIconSize,
  closeIconStroke,
  backIconColor,
  backIconSize,
  backIconStroke,
  themeOptions,
  theme,
  setTheme,
  router,
  currentUserId,
  onLogout,
  openActionsMenu,
  openDeletedMenu,
  openAccountSettings,
  openNotifications,
  openAccountType,
  openInAppBrowser,
  openContentPreferences,
  openActivityGrid,
  browserHistoryOptions,
  browserHistoryEnabled,
  setBrowserHistoryEnabled,
  clearBrowserHistory,
  browserHistory,
  openHistoryEntry,
  getHistoryRange,
  getHistoryDateLabel,
  historyFilterOptions,
  historyFilter,
  historyFilterLabel,
  setHistoryFilter,
  historyFilterOpen,
  setHistoryFilterOpen,
  historySortOptions,
  historySort,
  historySortLabel,
  setHistorySort,
  historySortOpen,
  setHistorySortOpen,
  historySelectionMode,
  setHistorySelectionMode,
  selectedHistoryKeys,
  setSelectedHistoryKeys,
  toggleHistorySelection,
  activityVideos,
  isActivityLoading,
  isDark,
  setCustomFeed,
  setActiveVideo,
  authUser,
  accountSettingsNoticePrefix,
  accountSettingsNoticeSuffix,
  accountSettingsNoticeLinkIndex,
  accountSettingsNoticeLinkLabel,
}: ProfileSettingsOverlayProps) {
  return (
    <View style={[styles.settingsOverlay, { pointerEvents: isOpen ? 'auto' : 'none' }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={closeSettings}>
        <Animated.View style={[styles.settingsBackdrop, settingsBackdropStyle]} />
      </Pressable>
      <Animated.View style={[styles.settingsPanel, { backgroundColor: bgContainer }, settingsPanelStyle]}>
        <View
          style={[
            styles.settingsHeader,
            { paddingTop: insets.top + 10 },
            settingsSection !== 'main' && styles.settingsHeaderSub,
          ]}
        >
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
                  {settingsSection === 'actions'
                    ? settingsCopy.actionsHeader
                    : settingsSection === 'likes'
                      ? settingsCopy.actionsItemLikes
                      : settingsSection === 'saved'
                        ? settingsCopy.actionsItemSaved
                        : settingsSection === 'history'
                          ? settingsCopy.actionsItemWatchHistory
                          : settingsSection === 'archived'
                            ? settingsCopy.actionsItemArchived
                            : settingsSection === 'notInterested'
                              ? settingsCopy.actionsItemNotInterested
                              : settingsSection === 'interested'
                                ? settingsCopy.actionsItemInterested
                                : settingsSection === 'accountHistory'
                                  ? settingsCopy.actionsItemAccountHistory
                                  : settingsSection === 'accountSettings'
                                    ? settingsCopy.accountSettingsLabel
                                    : settingsSection === 'notifications'
                                      ? settingsCopy.notificationsLabel
                                      : settingsSection === 'browserHistory'
                                        ? settingsCopy.browserHistoryViewLabel
                                        : settingsSection === 'accountType'
                                          ? settingsCopy.accountSettingsItemType
                                          : settingsSection === 'inAppBrowser'
                                            ? settingsCopy.inAppBrowserLabel
                                            : settingsSection === 'contentPreferences'
                                              ? settingsCopy.contentPreferencesLabel
                                              : settingsCopy.deletedHeader}
                </Text>
              </View>
              <View style={styles.settingsHeaderRight} />
            </>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.settingsContent,
            ['likes', 'saved', 'history', 'archived', 'notInterested'].includes(settingsSection) && { paddingHorizontal: 0 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {settingsSection === 'main' ? (
            <>
              <View style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}>
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <SunMoon size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.themeLabel}
                    </Text>
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
                        <Text
                          style={[
                            styles.settingsSegmentText,
                            { color: isActive ? settingsSegmentActiveText : settingsSegmentText },
                          ]}
                        >
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      Kendini gör
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsLabel}
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.notificationsLabel}
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.inAppBrowserLabel}
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.contentPreferencesLabel}
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsLabel}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.settingsItem, { borderBottomColor: 'transparent' }]} onPress={onLogout}>
                <Text style={[styles.settingsLabel, settingsItemLabelOverrides, { color: '#FF3B30', marginTop: 10 }]}>
                  {settingsCopy.logoutLabel}
                </Text>
              </TouchableOpacity>
            </>
          ) : settingsSection === 'actions' ? (
            <>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsActionsHeroTitle, { color: textPrimary }, settingsSectionTitleOverrides]}>
                  {settingsCopy.actionsHeroTitle}
                </Text>
                <Text
                  style={[
                    styles.settingsValue,
                    styles.settingsActionsHeroText,
                    { color: textSecondary },
                    settingsHelperOverrides,
                  ]}
                >
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemLikes}
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemSaved}
                    </Text>
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
                    <Clock size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemArchived}
                    </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemNotInterested}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.actionsItemNotInterestedHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemInterested}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.actionsItemInterestedHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemAccountHistory}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.actionsItemAccountHistoryHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.actionsItemWatchHistory}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.actionsItemWatchHistoryHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.deletedLabel}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.deletedHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>
            </>
          ) : settingsSection === 'accountSettings' ? (
            <>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsActionsHeroTitle, { color: textPrimary }, settingsSectionTitleOverrides]}>
                  {settingsCopy.accountSettingsHeroTitle}
                </Text>
                <Text
                  style={[
                    styles.settingsValue,
                    styles.settingsActionsHeroText,
                    { color: textSecondary },
                    settingsHelperOverrides,
                  ]}
                >
                  {settingsCopy.accountSettingsHeroText}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                onPress={() => {}}
              >
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <Lock size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemPassword}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemPasswordHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemEmail}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemEmailHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemPhone}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemPhoneHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                onPress={() => {}}
              >
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <RectangleEllipsis size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemTwoFactor}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemTwoFactorHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemStatus}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemStatusHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemBlocked}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemBlockedHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemMuted}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemMutedHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountSettingsItemType}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountSettingsItemTypeHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                onPress={() => {}}
              >
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <Lock size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountTypePause}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountTypePauseHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                onPress={() => {}}
              >
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <UserX size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountTypeTerminate}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountTypeTerminateHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsValue, styles.settingsActionsHeroText, { color: textSecondary }, settingsHelperOverrides]}>
                  {accountSettingsNoticePrefix}
                  {accountSettingsNoticeLinkIndex >= 0 ? (
                    <Text
                      style={styles.settingsLinkText}
                      onPress={() => router.push('/security-center')}
                      accessibilityRole="link"
                      suppressHighlighting
                    >
                      {accountSettingsNoticeLinkLabel}
                    </Text>
                  ) : null}
                  {accountSettingsNoticeSuffix}
                </Text>
              </View>
            </>
          ) : settingsSection === 'notifications' ? (
            <>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsActionsHeroTitle, { color: textPrimary }, settingsSectionTitleOverrides]}>
                  {settingsCopy.notificationsHeroTitle}
                </Text>
                <Text
                  style={[
                    styles.settingsValue,
                    styles.settingsActionsHeroText,
                    { color: textSecondary },
                    settingsHelperOverrides,
                  ]}
                >
                  {settingsCopy.notificationsHeroText}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}
                onPress={() => {}}
              >
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <Bell size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.notificationsItemPush}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.notificationsItemPushHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.notificationsItemEmail}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.notificationsItemEmailHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.notificationsItemSms}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.notificationsItemSmsHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsValue, styles.settingsActionsHeroText, { color: textSecondary }, settingsHelperOverrides]}>
                  {settingsCopy.notificationsNoticeText}
                </Text>
              </View>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountTypeCreator}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountTypeCreatorHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountTypeBranded}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountTypeBrandedHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountTypeVerification}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountTypeVerificationHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.accountTypeBadge}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.accountTypeBadgeHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>
            </>
          ) : settingsSection === 'inAppBrowser' ? (
            <>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsActionsHeroTitle, { color: textPrimary }, settingsSectionTitleOverrides]}>
                  {settingsCopy.inAppBrowserHeroTitle}
                </Text>
                <Text
                  style={[
                    styles.settingsValue,
                    styles.settingsActionsHeroText,
                    { color: textSecondary },
                    settingsHelperOverrides,
                  ]}
                >
                  {settingsCopy.inAppBrowserHeroText}
                </Text>
              </View>
              <View style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor }]}>
                <View style={styles.settingsInfo}>
                  <View style={styles.settingsLabelRow}>
                    <Globe size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.browserHistoryLabel}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.inAppBrowserHistoryToggleHelper}
                  </Text>
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
                        <Text
                          style={[
                            styles.settingsSegmentText,
                            { color: isActive ? settingsSegmentActiveText : settingsSegmentText },
                          ]}
                        >
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
                    <Clock size={settingsIconSize} color={settingsIconColor} strokeWidth={settingsIconStroke} />
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.browserHistoryViewLabel}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.inAppBrowserHistoryViewHelper}
                  </Text>
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
                    <Text
                      style={[
                        styles.settingsLabel,
                        styles.settingsLabelSub,
                        { color: textPrimary, marginBottom: 0 },
                        settingsItemLabelOverrides,
                      ]}
                    >
                      {settingsCopy.browserHistoryClearLabel}
                    </Text>
                  </View>
                  <Text style={[styles.settingsHintText, { color: textSecondary }, settingsHelperOverrides]}>
                    {settingsCopy.inAppBrowserHistoryClearHelper}
                  </Text>
                </View>
                <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
              </TouchableOpacity>
              <View style={styles.settingsActionsHero}>
                <Text style={[styles.settingsValue, styles.settingsActionsHeroText, { color: textSecondary }, settingsHelperOverrides]}>
                  {settingsCopy.inAppBrowserNoticeText}
                </Text>
              </View>
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
                              setHistoryFilter(option.value as any);
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
                              setHistorySort(option.value as any);
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
              {settingsCopy.interestedTopics.split(',').map((topic: string, idx: number) => (
                <View
                  key={idx}
                  style={[styles.settingsItem, { borderBottomColor: settingsItemBorderColor, paddingHorizontal: 20 }]}
                >
                  <Text style={[styles.settingsLabel, { color: textPrimary }]}>{topic.trim()}</Text>
                  <Text style={[styles.settingsChevron, { color: settingsChevronColor }]}>›</Text>
                </View>
              ))}
            </View>
          ) : settingsSection === 'accountHistory' ? (
            <View style={{ padding: 20 }}>
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.settingsLabel, { color: textPrimary, fontSize: 16 }]}>
                  {settingsCopy.accountHistoryTitle}
                </Text>
                <Text style={{ color: textSecondary, marginTop: 4 }}>
                  {settingsCopy.accountHistoryDateLabel}:{' '}
                  {authUser?.created_at
                    ? new Date(authUser.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Bilinmiyor'}
                </Text>
              </View>
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.settingsLabel, { color: textPrimary, fontSize: 16 }]}>
                  {settingsCopy.accountHistoryEmailLabel}
                </Text>
                <Text style={{ color: textSecondary, marginTop: 4 }}>{authUser?.email || 'Bilinmiyor'}</Text>
              </View>
              <View style={{ marginBottom: 20 }}>
                <Text style={[styles.settingsLabel, { color: textPrimary, fontSize: 16 }]}>
                  {settingsCopy.accountHistoryIdLabel}
                </Text>
                <Text style={{ color: textSecondary, marginTop: 4, fontSize: 12 }}>
                  {authUser?.id || 'Bilinmiyor'}
                </Text>
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
  );
}
