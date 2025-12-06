import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Video } from '../../../domain/entities/Video';
import { Avatar } from '../shared/Avatar';
import FollowIcon from '../../../../assets/icons/followbottom.svg';
import ReadMoreIcon from '../../../../assets/icons/read_more.svg';

interface MetadataLayerProps {
    video: Video;
    onAvatarPress: () => void;
    onFollowPress: () => void;
    onReadMorePress: () => void;
}

export function MetadataLayer({
    video,
    onAvatarPress,
    onFollowPress,
    onReadMorePress,
}: MetadataLayerProps) {
    return (
        <View style={styles.container}>
            {/* User Row */}
            <View style={styles.userRow}>
                <TouchableOpacity onPress={onAvatarPress}>
                    <Avatar url={video.user.avatarUrl} size={40} hasBorder={true} />
                </TouchableOpacity>

                <TouchableOpacity onPress={onAvatarPress} style={styles.nameContainer}>
                    <Text style={styles.nameText}>
                        {video.user.username}
                    </Text>
                </TouchableOpacity>

                {!video.user.isFollowing && (
                    <TouchableOpacity onPress={onFollowPress}>
                        <FollowIcon width={16} height={16} color="white" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Description */}
            <View style={styles.descriptionRow}>
                <Text style={styles.descriptionText}>
                    {video.description.length > 70
                        ? video.description.substring(0, 70) + '...'
                        : video.description}
                </Text>
                <TouchableOpacity onPress={onReadMorePress} style={styles.readMoreButton}>
                    <ReadMoreIcon width={16} height={16} color="white" />
                </TouchableOpacity>
            </View>

            {/* Commercial Tag */}
            <View style={styles.commercialTag}>
                <Text style={styles.commercialText}>
                    İş Birliği | Marka
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        bottom: 130, // Moved up to avoid overlap with Seek Bar (70-110)
        right: 80,
        alignItems: 'flex-start',
        zIndex: 20,
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
        marginLeft: 4,
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
