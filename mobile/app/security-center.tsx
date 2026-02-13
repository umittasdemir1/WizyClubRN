import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../src/presentation/store/useThemeStore';

export default function SecurityCenterScreen() {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#080A0F' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#080A0F';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Güven Merkezi',
          headerStyle: { backgroundColor: bgColor },
          headerTintColor: textColor,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
