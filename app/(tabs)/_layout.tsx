import { Tabs } from 'expo-router';
import { View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import SVGs
import HomeIcon from '../../assets/icons/home.svg';
import ForYouIcon from '../../assets/icons/for_you.svg';
import DealIcon from '../../assets/icons/deal.svg';
import NotificationIcon from '../../assets/icons/notification.svg';
import ProfileIcon from '../../assets/icons/profile.svg';

export default function TabLayout() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    backgroundColor: isDark ? '#000000' : '#FFFFFF',
                    borderTopWidth: 1,
                    borderTopColor: isDark ? '#333333' : '#E5E7EB',
                    paddingBottom: insets.bottom,
                    paddingTop: 5, // Vertically center the 28px icon in the 50px-ish space
                    paddingHorizontal: 24,
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
                    tabBarIcon: ({ color, size }) => (
                        <HomeIcon width={28} height={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="explore"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <ForYouIcon width={28} height={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="deals"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <DealIcon width={28} height={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <NotificationIcon width={28} height={28} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, size }) => (
                        <ProfileIcon width={28} height={28} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
