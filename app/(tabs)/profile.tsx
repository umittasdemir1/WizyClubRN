import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../src/presentation/components/shared/Avatar';
import { useVideoFeed } from '../../src/presentation/hooks/useVideoFeed';
import { Image } from 'expo-image';
import { Video } from '../../src/domain/entities/Video';

const SCREEN_WIDTH = Dimensions.get('window').width;
const ITEM_SIZE = (SCREEN_WIDTH - 48) / 3;

export default function ProfileScreen() {
    const insets = useSafeAreaInsets();
    const { videos } = useVideoFeed();

    const user = {
        username: 'wizy_official',
        avatarUrl: 'https://ui-avatars.com/api/?name=Wizy+Club&background=random',
        following: 120,
        followers: 4500,
        likes: '12.5K',
        bio: 'Official WizyClub Account 🚀\nBuilding the future of social video.',
    };

    const renderVideoItem = ({ item }: { item: Video }) => (
        <TouchableOpacity style={styles.videoItem}>
            <Image
                source={{ uri: item.thumbnailUrl }}
                style={styles.videoThumbnail}
                contentFit="cover"
            />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{user.username}</Text>
                <View style={styles.headerIcons}>
                    <View style={styles.headerIcon} />
                    <View style={styles.headerIcon} />
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.profileInfo}>
                    <Avatar url={user.avatarUrl} size={96} hasBorder />
                    <Text style={styles.username}>@{user.username}</Text>

                    <View style={styles.statsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.following}</Text>
                            <Text style={styles.statLabel}>Following</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.followers}</Text>
                            <Text style={styles.statLabel}>Followers</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{user.likes}</Text>
                            <Text style={styles.statLabel}>Likes</Text>
                        </View>
                    </View>

                    <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.bio}>{user.bio}</Text>
                </View>

                <View style={styles.tabs}>
                    <View style={[styles.tab, styles.activeTab]}>
                        <Text style={styles.activeTabText}>Videos</Text>
                    </View>
                    <View style={styles.tab}>
                        <Text style={styles.tabText}>Liked</Text>
                    </View>
                </View>

                {/* Simple Grid instead of MasonryFlashList */}
                <View style={styles.videoGrid}>
                    {videos.map((video) => (
                        <TouchableOpacity key={video.id} style={styles.videoItem}>
                            <Image
                                source={{ uri: video.thumbnailUrl }}
                                style={styles.videoThumbnail}
                                contentFit="cover"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
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
        gap: 16,
    },
    headerIcon: {
        width: 24,
        height: 24,
        backgroundColor: '#333',
        borderRadius: 12,
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
        gap: 32,
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
        paddingHorizontal: 48,
        paddingVertical: 12,
        borderRadius: 4,
    },
    editButtonText: {
        color: 'white',
        fontWeight: '600',
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
    videoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 16,
        paddingTop: 8,
    },
    videoItem: {
        width: ITEM_SIZE,
        height: ITEM_SIZE * 1.5,
        margin: 2,
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#222',
    },
    videoThumbnail: {
        width: '100%',
        height: '100%',
    },
});
