import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useNotificationStore } from '../../src/presentation/store/useNotificationStore';
import { COLORS } from '../../src/core/constants';
import { useEffect } from 'react';

// Import SVGs
import HomeIcon from '../../assets/icons/home.svg';
import ForYouIcon from '../../assets/icons/for_you.svg';
import DealIcon from '../../assets/icons/deal.svg';
import NotificationIcon from '../../assets/icons/notification.svg';
import ProfileIcon from '../../assets/icons/profile.svg';

// Notification Icon with Badge
function NotificationTabIcon({ color }: { color: string }) {
    const unreadCount = useNotificationStore((state) => state.unreadCount);
    const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString();

    return (
        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
            <NotificationIcon width={28} height={28} color={color} />
            {unreadCount > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{displayCount}</Text>
                </View>
            )}
        </View>
    );
}

export default function TabLayout() {
    const isDark = useThemeStore((state) => state.isDark);
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            backBehavior="history"
            screenOptions={{
                headerShown: false,
                lazy: false,
                tabBarStyle: {
                    backgroundColor: isDark ? COLORS.background : '#fefefe',
                    borderTopWidth: 0.5,
                    borderTopColor: isDark ? COLORS.border : '#E5E5E5',
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
                        <View style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                            <DealIcon width={28} height={28} color={color} />
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
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '700',
    },
});
