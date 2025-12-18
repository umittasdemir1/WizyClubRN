import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video } from '../../../domain/entities/Video';
import { Avatar } from '../shared/Avatar';

interface MetadataLayerProps {
    video: Video;
    onAvatarPress: () => void;
    onFollowPress: () => void;
    onReadMorePress: () => void;
    onCommercialTagPress: () => void;
}

const BASE_BOTTOM_POSITION = 80; // Aligned exactly with seekbar center (80px touch area / 2)
const SAFE_AREA_OFFSET = 0; // No extra offset needed as seekbar is also at 0

export function MetadataLayer({
    video,
    onAvatarPress,
    onFollowPress,
    onReadMorePress,
    onCommercialTagPress,
}: MetadataLayerProps) {
    const insets = useSafeAreaInsets();
    const bottom = Math.max(BASE_BOTTOM_POSITION, insets.bottom + SAFE_AREA_OFFSET);

    return (
        <View style={[styles.container, { bottom }]} pointerEvents="box-none">
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
                        {video.user.fullName || video.user.username}
                    </Text>
                    <Text style={styles.handleText}>
                        @{video.user.username.replace(/\s+/g, '_').toLowerCase()}
                    </Text>
                </Pressable>

                {!video.user.isFollowing && (
                    <Pressable
                        onPress={onFollowPress}
                        style={styles.followPill}
                        hitSlop={12}
                    >
                        <Text style={styles.followText}>Takip Et</Text>
                    </Pressable>
                )}
            </View>

            {/* Description Row - inline text with read more */}
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

            {/* Commercial Tag */}
            {video.isCommercial && (
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
    nameContainer: {
        marginLeft: 12,
        marginRight: 12,
        justifyContent: 'center',
    },
    nameText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    handleText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        marginTop: -2,
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
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    readMoreInline: {
        color: 'rgba(255,255,255,0.8)',
    },
    readMoreIconWrapper: {
        marginLeft: 2,
    },
    commercialTag: {
    position: 'absolute',  // 👈 Bunu ekle
    bottom: -30,           // 👈 Negatif = aşağı, Pozitif = yukarı
    left: 0,               // 👈 Bunu ekle
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
