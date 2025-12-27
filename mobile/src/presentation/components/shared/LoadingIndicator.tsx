import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

interface LoadingIndicatorProps {
    message?: string;
}

export function LoadingIndicator({ message }: LoadingIndicatorProps) {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="white" />
            {message && <Text style={styles.text}>{message}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    text: {
        color: 'white',
        marginTop: 12,
        fontSize: 14,
    },
});
