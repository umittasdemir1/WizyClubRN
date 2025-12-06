import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Video } from '../../../domain/entities/Video';
import LikeIcon from '../../../../assets/icons/like.svg';
import SaveIcon from '../../../../assets/icons/save.svg';
import ShareIcon from '../../../../assets/icons/share.svg';
import ShoppingIcon from '../../../../assets/icons/shopping.svg';
import MoreIcon from '../../../../assets/icons/more.svg';

interface ActionButtonsProps {
    video: Video;
    onLike: () => void;
    onSave: () => void;
    onShare: () => void;
    onShop: () => void;
    onProfilePress: () => void;
}

export function ActionButtons({
    video,
    onLike,
    onSave,
    onShare,
    onShop,
    onProfilePress
}: ActionButtonsProps) {
    return (
        <View style={styles.container}>
            {/* Like Button */}
            <TouchableOpacity style={styles.button} onPress={onLike}>
                <LikeIcon
                    width={32}
                    height={32}
                    color={video.isLiked ? '#FF3B30' : 'white'}
                />
                <Text style={styles.count}>{formatCount(video.likesCount)}</Text>
            </TouchableOpacity>

            {/* Save Button */}
            <TouchableOpacity style={styles.button} onPress={onSave}>
                <SaveIcon
                    width={32}
                    height={32}
                    color={video.isSaved ? '#FFA500' : 'white'}
                />
                <Text style={styles.count}>{video.savesCount || 0}</Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity style={styles.button} onPress={onShare}>
                <ShareIcon width={32} height={32} color="white" />
                <Text style={styles.count}>{formatCount(video.sharesCount)}</Text>
            </TouchableOpacity>

            {/* Shopping Button */}
            <TouchableOpacity style={styles.button} onPress={onShop}>
                <ShoppingIcon width={32} height={32} color="white" />
            </TouchableOpacity>

            {/* More Button */}
            <TouchableOpacity style={styles.button} onPress={onProfilePress}>
                <MoreIcon width={32} height={32} color="white" />
            </TouchableOpacity>
        </View>
    );
}

function formatCount(count: number): string {
    if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 12,
        bottom: 130, // Moved up to valid overlap with Seek Bar (70-110)
        flexDirection: 'column',
        gap: 20,
        alignItems: 'center',
        zIndex: 30,
    },
    button: {
        alignItems: 'center',
        gap: 4,
    },
    count: {
        color: 'white',
        fontSize: 12,
        fontWeight: '600',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
});
