import '../src/utils/ignoreWarnings';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '../src/presentation/contexts/ThemeContext';
import '../global.css';
import * as SplashScreen from 'expo-splash-screen';

import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useDraftCleanup } from '../src/presentation/hooks/useDraftCleanup';
import { SessionLogService } from '../src/core/services/SessionLogService';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { useKeepAwake } from 'expo-keep-awake';
import Toast from 'react-native-toast-message';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function RootNavigator() {
    const isDark = useThemeStore((state) => state.isDark);
    const { user, isInitialized, initialize } = useAuthStore();

    // Keep the screen awake during video playback/app usage
    useKeepAwake();

    // Cleanup expired drafts periodically
    useDraftCleanup();

    useEffect(() => {
        // Initialize auth state on app start
        initialize();
    }, []);

    // Configure Navigation Bar for Android
    useEffect(() => {
        if (Platform.OS === 'android') {
            const setupNav = async () => {
                try {
                    // Just set the button style, let Android 15 handle the color
                    await NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
                } catch (e) {
                    console.warn('NavigationBar setup failed:', e);
                }
            };
            setupNav();
        }
    }, [isDark]);

    useEffect(() => {
        if (isInitialized) {
            SplashScreen.hideAsync();
        }
    }, [isInitialized]);

    useEffect(() => {
        // Log session when user is authenticated
        if (user) {
            const logSession = async () => {
                try {
                    await SessionLogService.logEvent({ userId: user.id, eventType: 'app_open' });
                    await SessionLogService.logEvent({ userId: user.id, eventType: 'login' });
                    console.log('[RootNavigator] Session logged successfully');
                } catch (err) {
                    console.error('[RootNavigator] Session logging failed:', err);
                }
            };
            logSession();
        }
    }, [user]);

    if (!isInitialized) {
        return null; // Or a custom loading view, but Splash Screen covers this
    }

    return (
        <Stack screenOptions={{ headerShown: false }}>
            {/* Auth screens */}
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="signup" options={{ headerShown: false }} />

            {/* Main app screens */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
                name="story/[id]"
                options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    headerShown: false,
                }}
            />
        </Stack>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <SafeAreaProvider>
                    <BottomSheetModalProvider>
                        <RootNavigator />
                        <Toast />
                    </BottomSheetModalProvider>
                </SafeAreaProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}