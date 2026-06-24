/**
 * Tab layout (PRD 6.2). Home + Library (Stage 3). Settings arrives in a later stage
 * (architecture §7 route table). Standard expo-router Tabs (JS, Expo Go compatible) instead
 * of the scaffold's native tabs. Tab colors come from the PRD theme.
 */
import { Tabs } from 'expo-router';
import { View } from 'react-native';

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
          // A simple themed dot instead of an emoji glyph (emoji render as tofu in some runtimes).
          tabBarIcon: ({ color: c, size }) => (
            <View style={{ width: size * 0.5, height: size * 0.5, borderRadius: size, backgroundColor: c }} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: '루틴',
          tabBarIcon: ({ color: c, size }) => (
            <View
              style={{
                width: size * 0.55,
                height: size * 0.55,
                borderRadius: 3,
                borderWidth: 2,
                borderColor: c,
              }}
            />
          ),
        }}
      />
    </Tabs>
  );
}
