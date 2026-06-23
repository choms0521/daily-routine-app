/**
 * Tab layout (PRD 6.2). Stage 2 exposes only the Home tab; Library/Settings arrive in
 * later stages (architecture §7 route table). Standard expo-router Tabs (JS, Expo Go
 * compatible) instead of the scaffold's native tabs. Tab colors come from the PRD theme.
 */
import { Tabs } from 'expo-router';

import { useTheme } from '@/theme/ThemeProvider';

export default function TabsLayout() {
  const { color } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.primary,
        tabBarInactiveTintColor: color.fgSubtle,
        tabBarStyle: { backgroundColor: color.bg, borderTopColor: color.border },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
    </Tabs>
  );
}
