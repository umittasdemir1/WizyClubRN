import '../src/utils/ignoreWarnings';
import { Stack, useSegments } from 'expo-router';
import { DefaultTheme, DarkTheme, ThemeProvider } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/core/query/queryClient';
import '../global.css';
import * as SplashScreen from 'expo-splash-screen';
import { SystemBars } from 'react-native-edge-to-edge';
import { useThemeAppearanceSync, useThemeStore } from '../src/presentation/store/useThemeStore';
import { useAuthStore } from '../src/presentation/store/useAuthStore';
import { SessionLogService } from '../src/core/services/SessionLogService';
import { COLORS, LIGHT_COLORS } from '../src/core/constants';
import { useEffect, useRef } from 'react';
import { Platform, StatusBar } from 'react-native';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import Toast from 'react-native-toast-message';
import { InAppBrowserOverlay } from '../src/presentation/components/shared/InAppBrowserOverlay';
import Purchases from 'react-native-purchases';
import { CONFIG } from '../src/core/config';
import * as Notifications from 'expo-notifications';
import { LogCode, logAuth, logError } from '@/core/services/Logger';
import { PerformanceLogger } from '../src/core/services/PerformanceLogger';
import { ProfileRepositoryImpl } from '../src/data/repositories/ProfileRepositoryImpl';
import { QUERY_KEYS } from '../src/core/query/queryClient';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
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
    const navigationTheme = isDark
        ? {
            ...DarkTheme,
            colors: {
                ...DarkTheme.colors,
                background: COLORS.background,
                card: COLORS.background,
                border: COLORS.background,
            },
        }
        : {
            ...DefaultTheme,
            colors: {
                ...DefaultTheme.colors,
                background: LIGHT_COLORS.background,
                card: LIGHT_COLORS.background,
                border: LIGHT_COLORS.background,
            },
        };

    // Keep the screen awake during video playback/app usage
    useEffect(() => {
        if (Platform.OS === 'web') return;
        activateKeepAwake().catch((err) => {
            logError(LogCode.ERROR_CAUGHT, 'KeepAwake activation failed', err);
        });
        return () => {
            deactivateKeepAwake().catch(() => {
                // no-op
            });
        };
    }, []);

    useEffect(() => {
        // Initialize auth state on app start
        initialize();
    }, []);

    useEffect(() => {
        if (isInitialized) {
            SplashScreen.hideAsync();
            PerformanceLogger.markAppReady();
        }
    }, [isInitialized]);

    useEffect(() => {
        // Log session when user is authenticated
        if (user) {
            const logSession = async () => {
                try {
                    await SessionLogService.logEvent({ userId: user.id, eventType: 'app_open' });
                    await SessionLogService.logEvent({ userId: user.id, eventType: 'login' });
                    logAuth(LogCode.AUTH_LOGIN_SUCCESS, 'Session logged successfully', { userId: user.id });
                } catch (err) {
                    logError(LogCode.ERROR_CAUGHT, 'Session logging failed', err);
                }
            };
            logSession();

            // Prefetch full profile for the current user so Profile tab opens instantly
            const profileRepo = new ProfileRepositoryImpl();
            queryClient.prefetchQuery({
                queryKey: QUERY_KEYS.PROFILE(user.id),
                queryFn: () => profileRepo.getProfile(user.id),
                staleTime: 1000 * 60, // 1 minute
            });
        }
    }, [user?.id]);

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
                logError(LogCode.ERROR_CAUGHT, 'Purchases logIn failed', err);
            });
        } else {
            Purchases.logOut().catch((err) => {
                logError(LogCode.ERROR_CAUGHT, 'Purchases logOut failed', err);
            });
        }
    }, [user?.id]);

    return (
        <ThemeProvider value={navigationTheme}>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: {
                        backgroundColor: isDark ? COLORS.background : LIGHT_COLORS.background,
                    },
                }}
            >
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
        </ThemeProvider>
    );
}

export default function RootLayout() {
    const isDark = useThemeStore((state) => state.isDark);
    const appBackground = isDark ? COLORS.background : LIGHT_COLORS.background;
    useThemeAppearanceSync();
    useEffect(() => {
        PerformanceLogger.markAppStart();
    }, []);
    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: appBackground }}>
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
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>
                    <BottomSheetModalProvider>
                        <RootNavigator />
                        <InAppBrowserOverlay />
                        <Toast />
                    </BottomSheetModalProvider>
                </QueryClientProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
