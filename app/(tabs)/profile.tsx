import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { MasonryList } from '../../src/presentation/components/explore/MasonryList';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { Settings, Share2 } from 'lucide-react-native';

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { videos } = useVideoFeed(); // Reuse feed data for demo

    // Mock User
    const user = {
        username: 'wizy_official',
        avatarUrl: 'https://ui-avatars.com/api/?name=Wizy+Club&background=random',
        following: 120,
        followers: 4500,
        likes: '12.5K',
        bio: 'Official WizyClub Account 🚀\nBuilding the future of social video.',
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{user.username}</Text>
                <View style={styles.headerIcons}>
                    {/* @ts-ignore */}
                    <Share2 size={24} color="white" style={{ marginRight: 16 }} />
                    {/* @ts-ignore */}
                    <Settings size={24} color="white" />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Info */}
                <View style={styles.profileInfo}>
                    <Avatar url={user.avatarUrl} size={96} hasBorder />
                    <Text style={styles.username}>@{user.username}</Text>

                    <View style={styles.statsContainer}>
                        <StatItem label="Following" value={user.following.toString()} />
                        <StatItem label="Followers" value={user.followers.toString()} />
                        <StatItem label="Likes" value={user.likes} />
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shareButton}>
                            {/* @ts-ignore */}
                            <Share2 size={20} color="white" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.bio}>{user.bio}</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    <View style={[styles.tab, styles.activeTab]}>
                        <Text style={styles.activeTabText}>Videos</Text>
                    </View>
                    <View style={styles.tab}>
                        <Text style={styles.tabText}>Liked</Text>
                    </View>
                </View>

                {/* Content */}
                <MasonryList videos={videos} />
                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

function StatItem({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.statItem}>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerIcons: {
        flexDirection: 'row',
    },
    profileInfo: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    username: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 12,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 24,
        marginTop: 20,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#888',
        fontSize: 12,
        marginTop: 4,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 20,
    },
    editButton: {
        backgroundColor: '#333',
        paddingHorizontal: 32,
        paddingVertical: 10,
        borderRadius: 4,
    },
    editButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    shareButton: {
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 4,
    },
    bio: {
        color: 'white',
        textAlign: 'center',
        marginTop: 20,
        paddingHorizontal: 32,
        lineHeight: 20,
    },
    tabs: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#333',
        marginTop: 20,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: 'white',
    },
    tabText: {
        color: '#888',
        fontWeight: '600',
    },
    activeTabText: {
        color: 'white',
        fontWeight: '600',
    },
});
