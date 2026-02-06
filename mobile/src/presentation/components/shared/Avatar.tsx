import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { User } from 'lucide-react-native';

interface AvatarProps {
    url?: string;
    size?: number;
    hasBorder?: boolean;
    borderWidth?: number;
}

export function Avatar({ url, size = 40, hasBorder = false, borderWidth = 2 }: AvatarProps) {
    const borderStyle = hasBorder ? [styles.border, { borderWidth }] : null;
    const hasImage = url && url.trim() !== '';

    return (
        <View style={[
            styles.container,
            { width: size, height: size, borderRadius: size / 2 },
            borderStyle
        ]}>
            {hasImage && (
                <Image
                    source={{ uri: url }}
                    style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
                    contentFit="cover"
                    transition={200}
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
