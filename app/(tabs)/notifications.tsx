import { View, Text, StyleSheet, StatusBar as RNStatusBar, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, User, Heart, Bell } from 'lucide-react-native';
import { SwipeWrapper } from '../../src/presentation/components/shared/SwipeWrapper';
import { useThemeStore } from '../../src/presentation/store/useThemeStore';

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
    { id: '3', type: 'like', title: 'Videon 10k izlendi!', desc: 'Tebrikler, bu hafta çok popülersin.', time: '1sa', read: true },
    { id: '4', type: 'deal', title: 'Kupon Süresi Doluyor', desc: 'Starbucks kodunu kullanmak için son 2 saat.', time: '3sa', read: true },
    { id: '5', type: 'social', title: '@umit bir video paylaştı', desc: 'İlgini çekebilecek yeni bir içerik.', time: '5sa', read: true },
];

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const isDark = useThemeStore((state) => state.isDark);
    const [refreshing, setRefreshing] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const bgBody = isDark ? '#000000' : '#f9fafb';
    const textColor = isDark ? '#FFFFFF' : '#000000';

    useFocusEffect(
        useCallback(() => {
            RNStatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
        }, [isDark])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        setTimeout(() => {
            setRefreshing(false);
        }, 1000);
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
                return <Bell size={iconSize} color={isDark ? '#FFFFFF' : '#4b5563'} />;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    const renderItem = ({ item }: { item: Notification }) => {
        const cardBg = item.read ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF');
        const borderColor = item.read ? 'transparent' : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e7eb');
        const iconBg = item.read ? (isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e7eb') : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#f3f4f6');

        return (
            <View
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
                {/* Icon Container */}
                <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
                    {getIcon(item.type)}
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text
                            style={[
                                styles.title,
                                {
                                    color: isDark ? '#FFFFFF' : '#111827',
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

                {/* Unread Indicator */}
                {!item.read && (
                    <View style={styles.unreadDot} />
                )}
            </View>
        );
    };

    return (
        <SwipeWrapper
            onSwipeLeft={() => router.push('/profile')}
            onSwipeRight={() => router.push('/deals')}
        >
            <View style={[styles.container, { paddingTop: insets.top, backgroundColor: bgBody }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: textColor }]}>Bildirimler</Text>
                    {unreadCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadCount} Yeni</Text>
                        </View>
                    )}
                </View>

                {/* List */}
                <FlashList
                    data={notifications}
                    renderItem={renderItem}
                    estimatedItemSize={90}
                    contentContainerStyle={styles.listContent}
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
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        marginTop: 12,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    badge: {
        backgroundColor: '#dc2626',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 9999,
    },
    badgeText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
    },
    listContent: {
        paddingBottom: 24,
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
        whiteSpace: 'nowrap',
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
