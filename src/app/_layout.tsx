/**
 * Root layout. Wraps the app in the safe-area provider and the PRD-token ThemeProvider
 * (theme/ThemeProvider), then renders the (tabs) group as a stack screen. The scaffold's
 * native-tabs + expo-router ThemeProvider are replaced so the app stays Expo Go
 * compatible and on a single theme system (architecture §3/§8).
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { seedIfEmpty } from '@/store/devSeed';
import { useAppStore } from '@/store/useAppStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  // Load persisted state on app start; in dev, seed the sample routine when empty so the
  // home is exercisable before Stage 3's routine editor exists.
  useEffect(() => {
    useAppStore
      .getState()
      .hydrate()
      .catch(() => {})
      .finally(() => {
        if (__DEV__) seedIfEmpty(useAppStore);
      });
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="dark" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
