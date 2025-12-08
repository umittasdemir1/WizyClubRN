import { View, Text, StyleSheet, Pressable } from 'react-native';
// Remove useSafeAreaInsets
import { Video } from '../../../domain/entities/Video';
import { Avatar } from '../shared/Avatar';
import FollowIcon from '../../../../assets/icons/followbottom.svg';
import ReadMoreIcon from '../../../../assets/icons/read_more.svg';

interface MetadataLayerProps {
    video: Video;
    onAvatarPress: () => void;
    onFollowPress: () => void;
    onReadMorePress: () => void;
    onCommercialTagPress: () => void;
}

const FIXED_BOTTOM_POSITION = 70; // Moved up for more space

export function MetadataLayer({
    video,
    onAvatarPress,
    onFollowPress,
    onReadMorePress,
    onCommercialTagPress,
}: MetadataLayerProps) {

    return (
        <View style={[styles.container, { bottom: FIXED_BOTTOM_POSITION }]} pointerEvents="box-none">
            {/* User Row */}
            <View style={styles.userRow}>
                <Pressable onPress={onAvatarPress} hitSlop={8}>
                    <Avatar url={video.user.avatarUrl} size={40} hasBorder={true} />
                </Pressable>

                <Pressable
                    onPress={onAvatarPress}
                    style={styles.nameContainer}
                    hitSlop={8}
                >
                    <Text style={styles.nameText}>
                        {video.user.username}
                    </Text>
                </Pressable>

                {!video.user.isFollowing && (
                    <Pressable
                        onPress={onFollowPress}
                        style={styles.followButton}
                        hitSlop={12}
                    >
                        <FollowIcon width={20} height={20} color="white" />
                    </Pressable>
                )}
            </View>

            {/* Description Row */}
            <View style={styles.descriptionRow}>
                <Text style={styles.descriptionText}>
                    {video.description.length > 70
                        ? video.description.substring(0, 70) + '...'
                        : video.description}
                </Text>
                <Pressable
                    onPress={onReadMorePress}
                    style={styles.readMoreButton}
                    hitSlop={12}
                >
                    <ReadMoreIcon width={16} height={16} color="white" />
                </Pressable>
            </View>

            {/* Commercial Tag */}
            <Pressable
                style={styles.commercialTag}
                onPress={onCommercialTagPress}
                hitSlop={8}
            >
                <Text style={styles.commercialText}>
                    İş Birliği | Marka
                </Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 80, // Leave room for actions
        alignItems: 'flex-start',
        zIndex: 50, // High Z-index
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    nameContainer: {
        marginLeft: 12,
        marginRight: 8,
    },
    nameText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    followButton: {
        padding: 4,
    },
    descriptionRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    descriptionText: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    readMoreButton: {
        marginLeft: 6,
        padding: 4,
    },
    commercialTag: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 2,
    },
    commercialText: {
        color: 'black',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
