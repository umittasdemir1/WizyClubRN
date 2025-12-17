import { View, Text, StyleSheet, StatusBar as RNStatusBar, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { Heart, UserPlus, MessageCircle } from 'lucide-react-native';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';

const MOCK_NOTIFICATIONS = [
    { id: '1', type: 'like', user: 'travel_addict', text: 'liked your video', time: '2m' },
    { id: '2', type: 'follow', user: 'foodie_life', text: 'started following you', time: '15m' },
    { id: '3', type: 'comment', user: 'tech_guru', text: 'commented: "Awesome setup!"', time: '1h' },
    { id: '4', type: 'like', user: 'art_lover', text: 'liked your video', time: '3h' },
    { id: '5', type: 'follow', user: 'music_fan', text: 'started following you', time: '5h' },
];

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDark = useThemeStore((state) => state.isDark);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const bgBody = isDark ? '#000000' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const cardBg = isDark ? '#1a1a1a' : '#f0f0f0';

    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }, [isDark])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate fetch
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
    }, []);

    const renderItem = ({ item }: { item: any }) => (
        <View style={[styles.notificationItem, { backgroundColor: cardBg }]}>
            <View style={styles.iconPlaceholder} />
            <View style={styles.textContainer}>
                <Text style={[styles.notifText, { color: textColor }]}>{item.text}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
        </View>
    );

    return (
        <SwipeWrapper
            onSwipeLeft={() => router.push('/profile')}
            onSwipeRight={() => router.push('/deals')}
        >
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgBody }]}>
                <Text style={[styles.headerTitle, { color: textColor }]}>Bildirimler</Text>
                {/* @ts-ignore */}
                <FlashList
                    data={notifications}
                    renderItem={renderItem}
                    estimatedItemSize={70}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={isDark ? "#fff" : "#000"}
                        />
                    }
                />
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        marginTop: 10,
    },
    notificationItem: {
        flexDirection: 'row',
        padding: 12,
        marginBottom: 8,
        borderRadius: 12,
        alignItems: 'center',
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#ccc',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    notifText: {
        fontSize: 14,
        fontWeight: '500',
    },
    timeText: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
    },
});
