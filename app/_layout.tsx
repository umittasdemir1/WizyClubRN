import '../src/utils/ignoreWarnings';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider, useTheme } from '../src/presentation/contexts/ThemeContext';
import '../global.css';

import { useThemeStore } from '../src/presentation/store/useThemeStore';

function RootNavigator() {
    const isDark = useThemeStore((state) => state.isDark);

    return (
        <>
            <Stack screenOptions={{ headerShown: false }}>
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

            {/* Removed global StatusBar to allow per-screen control */}
        </>
    );
}

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <SafeAreaProvider>
                    <BottomSheetModalProvider>
                        <RootNavigator />
                    </BottomSheetModalProvider>
                </SafeAreaProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
