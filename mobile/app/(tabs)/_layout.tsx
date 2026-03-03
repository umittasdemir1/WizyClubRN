import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useNotificationStore } from '../../src/presentation/store/useNotificationStore';
import { useAuthStore } from '../../src/presentation/store/useAuthStore';
import { COLORS, LIGHT_COLORS } from '../../src/core/constants';
import { useEffect } from 'react';
import { MOCK_NOTIFICATIONS } from '../../src/data/mock/notifications';
import { Image } from 'expo-image';
import { Search } from 'lucide-react-native';

// Import SVGs
import HomeIcon from '@assets/icons/navigation/home.svg';
import DealIcon from '@assets/icons/navigation/deal.svg';
import ProfileIcon from '@assets/icons/navigation/profile.svg';
import VideosTabSvgIcon from '@assets/icons/navigation/videos.svg';
import DarkVideosTabSvgIcon from '@assets/icons/navigation/darkvideos.svg';

const TAB_ICON_SIZE = 28;
const TAB_ICON_ACTIVE_SIZE = 30;
const DEAL_ICON_SIZE = 45;
const DEAL_ICON_ACTIVE_SIZE = 47;

// Profile Avatar Tab Icon
function ProfileAvatarTabIcon({ color, focused }: { color: string; focused: boolean }) {
    const user = useAuthStore((state) => state.user);
    const avatarUrl = user?.user_metadata?.avatar_url;

    // Fallback to SVG icon if no avatar
    if (!avatarUrl) {
        return (
            <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                <ProfileIcon
                    width={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                    height={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                    color={color}
                />
            </View>
        );
    }

    return (
        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
            <View style={[
                styles.avatarWrapper,
                focused && styles.avatarWrapperActive,
                focused && styles.avatarWrapperScaled,
                focused && { borderColor: color },
            ]}>
                <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                />
            </View>
        </View>
    );
}

export default function TabLayout() {
    const isDark = useThemeStore((state) => state.isDark);
    const insets = useSafeAreaInsets();
    const tabBarBackground = isDark ? COLORS.background : LIGHT_COLORS.background;
    const tabIconColor = isDark ? '#FFFFFF' : '#080A0F';
    const ThemedVideosTabSvgIcon = isDark ? VideosTabSvgIcon : DarkVideosTabSvgIcon;
    const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);

    useEffect(() => {
        const unread = MOCK_NOTIFICATIONS.filter((item) => !item.read).length;
        setUnreadCount(unread);
    }, [setUnreadCount]);

    // NavigationBar styling handled by native edge-to-edge config

    return (
        <Tabs
            backBehavior="history"
            screenOptions={{
                headerShown: false,
                lazy: true,
                sceneStyle: {
                    backgroundColor: tabBarBackground,
                },
                tabBarStyle: {
                    backgroundColor: tabBarBackground,
                    borderTopWidth: 0,
                    borderTopColor: tabBarBackground,
                    paddingTop: 4,
                    paddingBottom: insets.bottom + 4,
                    height: 60 + insets.bottom,
                },
                tabBarItemStyle: {
                    paddingTop: 2,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    lineHeight: 12,
                    fontWeight: '600',
                    marginTop: 3,
                },
                tabBarActiveTintColor: tabIconColor,
                tabBarInactiveTintColor: tabIconColor,
                tabBarShowLabel: true,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarLabel: 'Ana Sayfa',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                            <HomeIcon
                                width={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                                height={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    tabBarLabel: 'Keşfet',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                            <Search
                                size={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                                color={color}
                                strokeWidth={focused ? 2.8 : 2.2}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="deals"
                options={{
                    tabBarLabel: 'Fırsatlar',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={{ width: 52, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: -4 }}>
                            <DealIcon
                                width={focused ? DEAL_ICON_ACTIVE_SIZE : DEAL_ICON_SIZE}
                                height={focused ? DEAL_ICON_ACTIVE_SIZE : DEAL_ICON_SIZE}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="videos"
                options={{
                    tabBarLabel: 'Clips',
                    tabBarIcon: ({ color, focused }) => (
                        <View
                            style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}
                        >
                            <ThemedVideosTabSvgIcon
                                width={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                                height={focused ? TAB_ICON_ACTIVE_SIZE : TAB_ICON_SIZE}
                                color={color}
                            />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: 'Profil',
                    tabBarIcon: ({ color, focused }) => (
                        <ProfileAvatarTabIcon color={color} focused={focused} />
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    avatarWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarWrapperActive: {
        borderWidth: 1,
    },
    avatarWrapperScaled: {
        transform: [{ scale: 1.08 }],
    },
    avatarImage: {
        width: 30,
        height: 30,
        borderRadius: 15,
    },
});
