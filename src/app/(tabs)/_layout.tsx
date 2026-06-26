/**
 * Tab layout (PRD 6.2). Home + Library (Stage 3). Settings arrives in a later stage
 * (architecture §7 route table). Standard expo-router Tabs (JS, Expo Go compatible) instead
 * of the scaffold's native tabs. Tab colors come from the PRD theme.
 */
import { Tabs } from 'expo-router';

import { DumbbellIcon, HomeIcon, SettingsIcon } from '@/components/ui/icons';
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
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color: c, size }) => <HomeIcon color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '루틴',
          tabBarIcon: ({ color: c, size }) => <DumbbellIcon color={c} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '설정',
          tabBarIcon: ({ color: c, size }) => <SettingsIcon color={c} size={size} />,
        }}
      />
    </Tabs>
  );
}
