import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video } from '../../../domain/entities/Video';
import { Avatar } from '../shared/Avatar';
import { VerifiedBadge } from '../shared/VerifiedBadge';
import { textShadowStyle } from '@/core/utils/shadow';
import { isDisabled } from './hooks/useFeedConfig';

interface MetadataLayerData {
    video: Video;
    currentUserId?: string;
}

interface MetadataLayerHandlers {
    onAvatarPress: () => void;
    onFollowPress: () => void;
    onReadMorePress: () => void;
    onCommercialTagPress: () => void;
}

interface MetadataLayerProps {
    data: MetadataLayerData;
    handlers: MetadataLayerHandlers;
}

const BASE_BOTTOM_POSITION = 80; // Aligned exactly with seekbar center (80px touch area / 2)
const SAFE_AREA_OFFSET = 0; // No extra offset needed as seekbar is also at 0
const EMPTY_METADATA_OFFSET = 30;

export function MetadataLayer({
    data,
    handlers,
}: MetadataLayerProps) {
    const { video, currentUserId } = data;
    const { onAvatarPress, onFollowPress, onReadMorePress, onCommercialTagPress } = handlers;
    const insets = useSafeAreaInsets();
    const bottom = Math.max(BASE_BOTTOM_POSITION, insets.bottom + SAFE_AREA_OFFSET);

    // Hide follow button if:
    // 1. User is already following
    // 2. It's the user's own video
    const showFollowButton = !video.user.isFollowing && video.user.id !== currentUserId;

    // Check if description exists and is not empty
    const hasDescription = video.description && video.description.trim().length > 0;
    const shouldShiftUserRow = !hasDescription && !video.isCommercial;
    const effectiveBottom = shouldShiftUserRow ? Math.max(0, bottom - EMPTY_METADATA_OFFSET) : bottom;

    return (
        <View style={[styles.container, { bottom: effectiveBottom }]} pointerEvents="box-none">
            {/* User Row */}
            <View style={styles.userRow}>
                {!isDisabled('DISABLE_AVATAR') && (
                    <Pressable onPress={onAvatarPress} hitSlop={8}>
                        <Avatar url={video.user.avatarUrl} size={40} hasBorder={true} />
                    </Pressable>
                )}

                <Pressable
                    onPress={onAvatarPress}
                    style={styles.nameContainer}
                    hitSlop={8}
                >
                    {!isDisabled('DISABLE_FULL_NAME') && (
                        <View style={styles.nameRow}>
                            <Text style={styles.nameText}>
                                {video.user.fullName || video.user.username}
                            </Text>
                            {video.user.isVerified === true && (
                                <View style={styles.verifiedBadge}>
                                    <VerifiedBadge size={16} />
                                </View>
                            )}
                        </View>
                    )}
                    {!isDisabled('DISABLE_USERNAME') && (
                        <Text style={styles.handleText}>
                            @{video.user.username.replace(/\s+/g, '_').toLowerCase()}
                        </Text>
                    )}
                </Pressable>

                {showFollowButton && (
                    <Pressable
                        onPress={onFollowPress}
                        style={styles.followPill}
                        hitSlop={12}
                    >
                        <Text style={styles.followText}>Takip Et</Text>
                    </Pressable>
                )}
            </View>

            {/* Description Row - Only show if description exists - Positioned between user and commercial tag */}
            {hasDescription && !isDisabled('DISABLE_DESCRIPTION') && (
                <Pressable
                    style={styles.descriptionRow}
                    onPress={onReadMorePress}
                    hitSlop={{ top: 10, bottom: 10, left: 0, right: 0 }}
                >
                    <Text style={styles.descriptionText}>
                        {video.description.length > 70
                            ? video.description.substring(0, 70)
                            : video.description}
                        {video.description.length > 70 && (
                            <Text style={styles.readMoreInline}>
                                {'...Daha fazla'}
                            </Text>
                        )}
                    </Text>
                </Pressable>
            )}

            {/* Commercial Tag - Always at bottom: -40 */}
            {video.isCommercial && !isDisabled('DISABLE_COMMERCIAL_TAG') && (
                <Pressable
                    style={styles.commercialTag}
                    onPress={onCommercialTagPress}
                    hitSlop={8}
                >
                    <Text style={styles.commercialText}>
                        {video.commercialType ? video.commercialType : 'İş Birliği'}
                        {video.brandName ? ` | ${video.brandName}` : ''}
                    </Text>
                </Pressable>
            )}
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nameContainer: {
        marginLeft: 12,
        marginRight: 12,
        justifyContent: 'center',
    },
    nameText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
        ...textShadowStyle('rgba(0, 0, 0, 0.5)', { width: 1, height: 1 }, 2),
    },
    handleText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        ...textShadowStyle('rgba(0, 0, 0, 0.5)', { width: 1, height: 1 }, 2),
        marginTop: -2,
    },
    verifiedBadge: {
        marginLeft: 6,
        alignSelf: 'center',
    },
    followPill: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)', // Glass effect
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        alignSelf: 'center',
    },
    followText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    descriptionRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        marginBottom: 6,
    },
    descriptionText: {
        color: 'white',
        fontSize: 14,
        lineHeight: 20,
        ...textShadowStyle('rgba(0, 0, 0, 0.5)', { width: 1, height: 1 }, 2),
    },
    readMoreInline: {
        color: 'rgba(255,255,255,0.8)',
    },
    readMoreIconWrapper: {
        marginLeft: 2,
    },
    commercialTag: {
        position: 'absolute',
        bottom: -30,
        left: 0,
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
