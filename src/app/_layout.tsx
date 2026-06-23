/**
 * Root layout. Wraps the app in the safe-area provider and the PRD-token ThemeProvider
 * (theme/ThemeProvider), then renders the (tabs) group as a stack screen. The scaffold's
 * native-tabs + expo-router ThemeProvider are replaced so the app stays Expo Go
 * compatible and on a single theme system (architecture §3/§8).
 */
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
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
