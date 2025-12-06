import { View, Text, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { Heart, UserPlus, MessageCircle } from 'lucide-react-native';

const MOCK_NOTIFICATIONS = [
    { id: '1', type: 'like', user: 'travel_addict', text: 'liked your video', time: '2m' },
    { id: '2', type: 'follow', user: 'foodie_life', text: 'started following you', time: '15m' },
    { id: '3', type: 'comment', user: 'tech_guru', text: 'commented: "Awesome setup!"', time: '1h' },
    { id: '4', type: 'like', user: 'art_lover', text: 'liked your video', time: '3h' },
    { id: '5', type: 'follow', user: 'music_fan', text: 'started following you', time: '5h' },
];

export default function NotificationsScreen() {
    const insets = useSafeAreaInsets();

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.item}>
            <Avatar url={`https://ui-avatars.com/api/?name=${item.user}&background=random`} size={48} />
            <View style={styles.content}>
                <Text style={styles.text}>
                    <Text style={styles.username}>{item.user}</Text> {item.text}
                </Text>
                <Text style={styles.time}>{item.time}</Text>
            </View>
            <View style={styles.icon}>
                {item.type === 'like' && (
                    // @ts-ignore
                    <Heart size={20} color="#FF3B30" fill="#FF3B30" />
                )}
                {item.type === 'follow' && (
                    // @ts-ignore
                    <UserPlus size={20} color="#007AFF" />
                )}
                {item.type === 'comment' && (
                    // @ts-ignore
                    <MessageCircle size={20} color="#FFD700" />
                )}
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <Text style={styles.title}>Notifications</Text>
            <FlashList
                data={MOCK_NOTIFICATIONS}
                renderItem={renderItem}
                estimatedItemSize={80}
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    title: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        padding: 16,
    },
    listContent: {
        paddingHorizontal: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    content: {
        flex: 1,
        marginLeft: 12,
    },
    text: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
    },
    username: {
        fontWeight: 'bold',
    },
    time: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
    },
    icon: {
        marginLeft: 12,
    },
});
