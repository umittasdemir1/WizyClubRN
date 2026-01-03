import { View, Text, StyleSheet, StatusBar as RNStatusBar, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, User, Heart, Bell } from 'lucide-react-native';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';
import { useNotificationStore } from '../../src/presentation/store/useNotificationStore';
import { COLORS } from '../../src/core/constants';
import { TrendingHeader } from '../../src/presentation/components/explore/TrendingHeader';

interface Notification {
    id: string;
    type: 'deal' | 'social' | 'like' | 'default';
    title: string;
    desc: string;
    time: string;
    read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: '1', type: 'deal', title: 'Zara İndirimi Başladı!', desc: 'Favori ürünlerinde %40 indirim seni bekliyor.', time: '2dk', read: false },
    { id: '2', type: 'social', title: '@karennne seni takip etti', desc: 'Senin videolarını beğeniyor olabilir.', time: '15dk', read: false },
    { id: '3', type: 'like', title: 'Videon 10k izlendi!', desc: 'Tebrikler, bu hafta çok popülersin.', time: '1sa', read: false },
    { id: '4', type: 'deal', title: 'Kupon Süresi Doluyor', desc: 'Starbucks kodunu kullanmak için son 2 saat.', time: '3sa', read: false },
    { id: '5', type: 'social', title: '@umit bir video paylaştı', desc: 'İlgini çekebilecek yeni bir içerik.', time: '5sa', read: false },
    { id: '6', type: 'like', title: '500 yeni takipçi!', desc: 'Bu hafta harika gidiyorsun.', time: '6sa', read: false },
    { id: '7', type: 'deal', title: 'Nike Flash Sale', desc: 'Sadece 24 saat, %60 indirim.', time: '7sa', read: false },
    { id: '8', type: 'social', title: '@moda seni takip etti', desc: 'Yeni bir hayranın var!', time: '8sa', read: false },
    { id: '9', type: 'like', title: 'Yorumuna 100 beğeni!', desc: 'İnsanlar seni seviyor.', time: '9sa', read: false },
    { id: '10', type: 'deal', title: 'H&M Özel Fırsat', desc: 'Üye olanlara %30 ekstra.', time: '10sa', read: false },
    { id: '11', type: 'social', title: '@style seni etiketledi', desc: 'Bir gönderide bahsedildin.', time: '11sa', read: true },
];

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
            RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }, [isDark])
    );

    const pullToRefresh = useCallback(async () => {
        setRefreshing(true);
        // Simulate refresh
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setRefreshing(false);
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
