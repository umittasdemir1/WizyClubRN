import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useNotificationStore } from '../../src/presentation/store/useNotificationStore';
import { COLORS, LIGHT_COLORS } from '../../src/core/constants';
import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';

// Import SVGs
import HomeIcon from '../../assets/icons/home.svg';
import ForYouIcon from '../../assets/icons/for_you.svg';
import DealIcon from '../../assets/icons/deal.svg';
import NotificationIcon from '../../assets/icons/notification.svg';
import ProfileIcon from '../../assets/icons/profile.svg';

// Notification Icon with Badge
function NotificationTabIcon({ color }: { color: string }) {
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const [showCount, setShowCount] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowCount(false);
        }, 20000);
        return () => clearTimeout(timer);
    }, []);

    const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

    return (
        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
            <NotificationIcon width={28} height={28} color={color} />
            {unreadCount > 0 && (
                <View style={[
                    styles.badge,
                    !showCount && styles.badgeDot
                ]}>
                    {showCount && <Text style={styles.badgeText}>{displayCount}</Text>}
                </View>
            )}
        </View>
    );
}

export default function TabLayout() {
    const isDark = useThemeStore((state) => state.isDark);
    const insets = useSafeAreaInsets();
    const isFocused = useIsFocused();
    const tabBarBackground = isDark ? COLORS.background : LIGHT_COLORS.background;
    const tabBarBorder = isDark ? COLORS.border : LIGHT_COLORS.border;

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const syncNavigationBar = async () => {
            try {
                if (isFocused) {
                    await NavigationBar.setPositionAsync('absolute');
                    await NavigationBar.setBackgroundColorAsync('#00000000');
                    await NavigationBar.setBorderColorAsync('#00000000');
                } else {
                    await NavigationBar.setPositionAsync('relative');
                    await NavigationBar.setBackgroundColorAsync(tabBarBackground);
                    await NavigationBar.setBorderColorAsync(tabBarBackground);
                }
                await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
            } catch (e) {
                console.warn('NavigationBar sync failed:', e);
            }
        };
        syncNavigationBar();
    }, [isDark, isFocused, tabBarBackground]);

    return (
        <Tabs
            backBehavior="history"
            screenOptions={{
                headerShown: false,
                lazy: false,
                tabBarStyle: {
                    backgroundColor: tabBarBackground,
                    borderTopWidth: 0.5,
                    borderTopColor: tabBarBorder,
                    paddingTop: 8,
                    paddingBottom: insets.bottom + 2,
                    height: 50 + insets.bottom,
                },
                tabBarActiveTintColor: isDark ? 'white' : 'black',
                tabBarInactiveTintColor: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                tabBarShowLabel: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    tabBarIcon: ({ color }) => (
                        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                            <HomeIcon width={28} height={28} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    tabBarIcon: ({ color }) => (
                        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                            <ForYouIcon width={28} height={28} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="deals"
                options={{
                    tabBarIcon: ({ color }) => (
                        <View style={{ width: 52, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: -4 }}>
                            <DealIcon width={45} height={45} color={color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    tabBarIcon: ({ color }) => <NotificationTabIcon color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color }) => (
                        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                            <ProfileIcon width={28} height={28} color={color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'absolute',
        top: 6,
        right: 6,
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    badgeDot: {
        minWidth: 8,
        height: 8,
        borderRadius: 4,
        top: 10,
        right: 12,
        paddingHorizontal: 0,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
});
