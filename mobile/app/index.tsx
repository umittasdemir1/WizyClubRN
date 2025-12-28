import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect } from 'react';

export default function Index() {
    const { user, isInitialized, isLoading, initialize } = useAuthStore();

    useEffect(() => {
        if (!isInitialized) {
            initialize();
        }
    }, [isInitialized]);

    // Show loading while checking auth state
    if (!isInitialized || isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#8B5CF6" />
            </View>
        );
    }

    // Redirect based on auth state
    if (user) {
        return <Redirect href="/(tabs)" />;
    }

    return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000',
    },
});
