import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LogBox } from 'react-native';
import '../global.css';

// Ignore specific warnings that are not actionable or dev-only
LogBox.ignoreLogs([
    /SafeAreaView/,
    /Reduced motion/,
    /deprecated/,
]);

// Override console.warn to filter out specific warnings
const originalWarn = console.warn;
console.warn = (...args) => {
    const message = args[0]?.toString() || '';
    if (
        message.includes('SafeAreaView') ||
        message.includes('Reduced motion')
    ) {
        return;
    }
    originalWarn(...args);
};

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <BottomSheetModalProvider>
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
                    <StatusBar style="light" />
                </BottomSheetModalProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
