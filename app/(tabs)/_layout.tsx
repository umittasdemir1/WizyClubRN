import { useEffect, useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { NativeModulesProxy } from 'expo-modules-core';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';

// Import SVGs
import HomeIcon from '../../assets/icons/home.svg';
import ForYouIcon from '../../assets/icons/for_you.svg';
import DealIcon from '../../assets/icons/deal.svg';
import NotificationIcon from '../../assets/icons/notification.svg';
import ProfileIcon from '../../assets/icons/profile.svg';

export default function TabLayout() {
    const isDark = useThemeStore((state) => state.isDark);

    const ICON_SIZE = 28;
    const DEAL_ICON_SIZE = 32;
    const BAR_CONTENT_HEIGHT = 55;
    const barBackgroundColor = useMemo(() => (isDark ? '#000000' : '#FFFFFF'), [isDark]);

    useEffect(() => {
        if (Platform.OS !== 'android') return;

        const navigationBarModule = (NativeModulesProxy as any)?.ExpoNavigationBar;
        navigationBarModule?.setBackgroundColorAsync?.(barBackgroundColor);
        navigationBarModule?.setButtonStyleAsync?.(isDark ? 'light' : 'dark');
    }, [barBackgroundColor, isDark]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: barBackgroundColor,
                    borderTopWidth: 0, // No border requested, just clean look
                    height: BAR_CONTENT_HEIGHT,
                    paddingTop: 5, // Center icons vertically (55 - 28) / 2 approx or adjusted
                },
                tabBarActiveTintColor: isDark ? '#FFFFFF' : '#000000',
                tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color }) => (
                        <HomeIcon width={ICON_SIZE} height={ICON_SIZE} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    tabBarIcon: ({ color }) => (
                        <ForYouIcon width={ICON_SIZE} height={ICON_SIZE} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="deals"
                options={{
                    tabBarIcon: ({ color }) => (
                        <DealIcon width={DEAL_ICON_SIZE} height={DEAL_ICON_SIZE} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    tabBarIcon: ({ color }) => (
                        <NotificationIcon width={ICON_SIZE} height={ICON_SIZE} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color }) => (
                        <ProfileIcon width={ICON_SIZE} height={ICON_SIZE} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
