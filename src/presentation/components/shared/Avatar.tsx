import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

interface AvatarProps {
    url: string;
    size?: number;
    hasBorder?: boolean;
}

export function Avatar({ url, size = 40, hasBorder = false }: AvatarProps) {
    return (
        <View style={[
            styles.container,
            { width: size, height: size, borderRadius: size / 2 },
            hasBorder && styles.border
        ]}>
            <Image
                source={{ uri: url }}
                style={{ width: '100%', height: '100%', borderRadius: size / 2 }}
                contentFit="cover"
                transition={200}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
        backgroundColor: '#333',
    },
    border: {
        borderWidth: 2,
        borderColor: 'white',
    },
});
