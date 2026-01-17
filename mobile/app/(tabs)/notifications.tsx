import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, User, Heart, Bell } from 'lucide-react-native';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useNotificationStore } from '../../src/presentation/store/useNotificationStore';
import { COLORS } from '../../src/core/constants';
import { TrendingHeader } from '../../src/presentation/components/explore/TrendingHeader';
import { SystemBars } from 'react-native-edge-to-edge';
import * as Notifications from 'expo-notifications';

import { MOCK_NOTIFICATIONS, Notification } from '../../src/data/mock/notifications';

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDark = useThemeStore((state) => state.isDark);
    const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
    const bgBody = isDark ? COLORS.background : '#f9fafb';

    useFocusEffect(
        useCallback(() => {
            SystemBars.setStyle({
                statusBar: isDark ? 'light' : 'dark',
                navigationBar: isDark ? 'light' : 'dark',
            });
        }, [isDark])
    );

    const pullToRefresh = useCallback(async () => {
        setRefreshing(true);
        // Simulate refresh
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setRefreshing(false);
    }, []);

    const sendTestNotification = useCallback(async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('İzin gerekli', 'Bildirim izni verilmedi.');
            return;
        }
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.DEFAULT,
            sound: 'default',
        });
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'WizyClub Test',
                body: 'Mavi rozet için özel teklif seni bekliyor ✨',
                sound: 'default',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
                seconds: 10,
                repeats: false,
                channelId: 'default',
            },
        });
    }, []);

    const getIcon = (type: Notification['type']) => {
        const iconSize = 24;
        switch (type) {
            case 'deal':
                return <ShoppingBag size={iconSize} color={isDark ? '#facc15' : '#ca8a04'} />;
            case 'social':
                return <User size={iconSize} color={isDark ? '#60a5fa' : '#2563eb'} />;
            case 'like':
                return <Heart size={iconSize} color={isDark ? '#ef4444' : '#dc2626'} />;
            default:
                return <Bell size={iconSize} color={isDark ? COLORS.textPrimary : '#4b5563'} />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // Sync unread count with global store
    useEffect(() => {
        setUnreadCount(unreadCount);
    }, [unreadCount, setUnreadCount]);

    const renderItem = (item: Notification) => {
        const cardBg = item.read ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF');
        const borderColor = item.read ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e7eb');
        const iconBg = item.read ? (isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e7eb') : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6');

        return (
            <View
                key={item.id}
                style={[
                    styles.notificationCard,
                    {
                        backgroundColor: cardBg,
                        borderColor: borderColor,
                        borderWidth: item.read ? 0 : 1,
                        opacity: item.read ? 0.6 : 1,
                    }
                ]}
            >
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    {getIcon(item.type)}
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: isDark ? COLORS.textPrimary : '#111827',
                                    fontWeight: item.read ? '500' : '700',
                                }
                            ]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>
                        <Text
                            style={[
                                styles.timeText,
                                { color: isDark ? 'rgba(255, 255, 255, 0.4)' : '#9ca3af' }
                            ]}
                        >
                            {item.time}
                        </Text>
                    </View>
                    <Text
                        style={[
                            styles.descText,
                            { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#4b5563' }
                        ]}
                        numberOfLines={2}
                    >
                        {item.desc}
                    </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
            </View>
        );
    };

    return (
        <SwipeWrapper
            onSwipeLeft={() => router.push('/profile')}
            onSwipeRight={() => router.push('/deals')}
        >
            <View style={[styles.container, { backgroundColor: bgBody }]}>
                <TrendingHeader
                    title="Bildirimler"
                    isDark={isDark}
                    showSearch={false}
                    rightElement={unreadCount > 0 ? (
                        <View style={[styles.headerBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#F3F4F6' }]}>
                            <Text style={[styles.headerBadgeText, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#6B7280' }]}>{unreadCount} Okunmamış</Text>
                        </View>
                    ) : undefined}
                />

                <ScrollView
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 80 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={pullToRefresh}
                            tintColor={isDark ? '#fff' : '#000'}
                        />
                    }
                >
                    <View style={[styles.testCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff' }]}>
                        <View>
                            <Text style={[styles.testTitle, { color: isDark ? COLORS.textPrimary : '#111827' }]}>
                                Test bildirimi
                            </Text>
                            <Text style={[styles.testDesc, { color: isDark ? 'rgba(255,255,255,0.7)' : '#6B7280' }]}>
                                Cihazına örnek bir bildirim gönder.
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.testButton} onPress={sendTestNotification}>
                            <Text style={styles.testButtonText}>Gönder</Text>
                        </TouchableOpacity>
                    </View>
                    {notifications.map(renderItem)}
                </ScrollView>
            </View>
        </SwipeWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    badge: {
        backgroundColor: '#dc2626',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    headerBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    headerBadgeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    testCard: {
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    testTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    testDesc: {
        fontSize: 12,
        marginTop: 4,
    },
    testButton: {
        backgroundColor: '#0B84FF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    testButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    notificationCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        padding: 16,
        borderRadius: 12,
        marginBottom: 4,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 2,
    },
    title: {
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontSize: 10,
    },
    descText: {
        fontSize: 12,
        lineHeight: 18,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ef4444',
        marginTop: 8,
    },
});
