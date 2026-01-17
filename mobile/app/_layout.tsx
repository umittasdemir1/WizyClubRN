import '../src/utils/ignoreWarnings';
import { Stack, useSegments } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '../src/presentation/contexts/ThemeContext';
import '../global.css';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { useThemeStore } from '../src/presentation/store/useThemeStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { useDraftCleanup } from '../src/presentation/hooks/useDraftCleanup';
import { SessionLogService } from '../src/core/services/SessionLogService';
import { COLORS, LIGHT_COLORS } from '../src/core/constants';
import { useEffect, useRef } from 'react';
import { Platform, StatusBar } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import Toast from 'react-native-toast-message';
import { InAppBrowserOverlay } from '../src/presentation/components/shared/InAppBrowserOverlay';
import Purchases from 'react-native-purchases';
import { CONFIG } from '../src/core/config';
import * as Notifications from 'expo-notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        sound: 'default',
    }),
});

function RootNavigator() {
    const isDark = useThemeStore((state) => state.isDark);
    const { user, isInitialized, initialize } = useAuthStore();
    const segments = useSegments();
    const isTabsRoute = segments[0] === '(tabs)';
    const hasConfiguredPurchases = useRef(false);

    // Keep the screen awake during video playback/app usage
    useKeepAwake();

    // Cleanup expired drafts periodically
    useDraftCleanup();

    useEffect(() => {
        // Initialize auth state on app start
        initialize();
    }, []);

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

    useEffect(() => {
        const apiKey = Platform.OS === 'ios'
            ? CONFIG.REVENUECAT_IOS_API_KEY
            : CONFIG.REVENUECAT_ANDROID_API_KEY;
        if (!apiKey) {
            return;
        }
        if (!hasConfiguredPurchases.current) {
            Purchases.setLogLevel(Purchases.LOG_LEVEL.WARN);
            Purchases.configure({ apiKey, appUserID: user?.id || undefined });
            hasConfiguredPurchases.current = true;
            return;
        }
        if (user?.id) {
            Purchases.logIn(user.id).catch((err) => {
                console.warn('[Purchases] logIn failed:', err);
            });
        } else {
            Purchases.logOut().catch((err) => {
                console.warn('[Purchases] logOut failed:', err);
            });
        }
    }, [user?.id]);

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
    const isDark = useThemeStore((state) => state.isDark);
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SystemBars
                style={{
                    statusBar: isDark ? 'light' : 'dark',
                    navigationBar: isDark ? 'light' : 'dark',
                }}
            />
            <StatusBar
                barStyle={isDark ? 'light-content' : 'dark-content'}
                backgroundColor={isDark ? COLORS.background : LIGHT_COLORS.background}
            />
            <ThemeProvider>
                <SafeAreaProvider>
                    <BottomSheetModalProvider>
                        <RootNavigator />
                        <InAppBrowserOverlay />
                        <Toast />
                    </BottomSheetModalProvider>
                </SafeAreaProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
