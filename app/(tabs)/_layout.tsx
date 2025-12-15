import { Tabs } from 'expo-router';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useEffect } from 'react';
import * as NavigationBar from 'expo-navigation-bar';

// Import SVGs
import HomeIcon from '../../assets/icons/home.svg';
import ForYouIcon from '../../assets/icons/for_you.svg';
import DealIcon from '../../assets/icons/deal.svg';
import NotificationIcon from '../../assets/icons/notification.svg';
import ProfileIcon from '../../assets/icons/profile.svg';

export default function TabLayout() {
    const isDark = useThemeStore((state) => state.isDark);
    const insets = useSafeAreaInsets();

    const ICON_SIZE = 28;
    const DEAL_ICON_SIZE = 32;
    const BAR_HEIGHT = 55;

    // Set navigation bar color based on theme (Android only)
    useEffect(() => {
        if (Platform.OS === 'android') {
            const backgroundColor = isDark ? '#000000' : '#FFFFFF';
            const buttonStyle = isDark ? 'light' : 'dark';

            NavigationBar.setBackgroundColorAsync(backgroundColor);
            NavigationBar.setButtonStyleAsync(buttonStyle);
        }
    }, [isDark]);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderTopWidth: 0, // No border requested, just clean look
                    height: BAR_HEIGHT + insets.bottom,
                    paddingTop: 5, // Center icons vertically (55 - 28) / 2 approx or adjusted
                    paddingBottom: insets.bottom,
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
