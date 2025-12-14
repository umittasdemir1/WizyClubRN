import '../src/utils/ignoreWarnings';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider } from '../src/presentation/contexts/ThemeContext';
import '../global.css';

export default function RootLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider>
                <SafeAreaProvider>
                    <BottomSheetModalProvider>
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
                            <StatusBar style="light" />
                        </>
                    </BottomSheetModalProvider>
                </SafeAreaProvider>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
