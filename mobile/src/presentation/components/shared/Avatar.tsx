import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

interface AvatarProps {
    url?: string;
    size?: number;
    hasBorder?: boolean;
    borderWidth?: number;
}

const getStableImageCacheKey = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return value;
    return trimmed.split('#')[0].split('?')[0];
};

export function Avatar({ url, size = 40, hasBorder = false, borderWidth = 2 }: AvatarProps) {
    const borderStyle = hasBorder ? [styles.border, { borderWidth }] : null;
    const hasImage = url && url.trim() !== '';
    const stableCacheKey = hasImage ? getStableImageCacheKey(url) : '';

    return (
        <View style={[
            styles.container,
            { width: size, height: size, borderRadius: size / 2 },
            borderStyle
        ]}>
            {hasImage && (
                <Image
                    source={{ uri: url, cacheKey: stableCacheKey }}
                    style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
    },
    placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    border: {
        borderColor: 'white',
    },
});
