/**
 * Root layout. Wraps the app in the safe-area provider and the PRD-token ThemeProvider
 * (theme/ThemeProvider), then renders the (tabs) group as a stack screen. The scaffold's
 * native-tabs + expo-router ThemeProvider are replaced so the app stays Expo Go
 * compatible and on a single theme system (architecture §3/§8).
 */
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppStore } from '@/store/useAppStore';
import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  // Load persisted state on app start. Stage 3 ships the routine editor, so a fresh install
  // starts empty and the user creates their first routine in-app (the Stage 2 dev seed is
  // gone). A failed load records hydrateError (not swallowed) and proceeds with empty state.
  useEffect(() => {
    useAppStore
      .getState()
      .hydrate()
      .catch((e: unknown) => {
        useAppStore.setState({
          hydrated: true,
          hydrateError: e instanceof Error ? e.message : String(e),
        });
      });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="editor/[routineId]" options={{ presentation: 'card' }} />
            {/* Deep-link target: workouttracker://import?d=... routes here (expo-router linking). */}
            <Stack.Screen name="import" options={{ presentation: 'card' }} />
          </Stack>
          <StatusBar style="dark" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
