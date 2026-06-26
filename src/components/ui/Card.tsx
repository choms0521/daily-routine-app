/**
 * Card primitive (PRD 6.1 surfaces). An elevated white surface on the screen's gray
 * background — the Toss "gray canvas, white cards" depth the screens were missing. Uses
 * only tokens (surfaceElevated + radius.card + shadow.card); no hardcoded values.
 */
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { color, radius, space, shadow } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: color.surfaceElevated,
          borderRadius: radius.card,
          padding: space.s5,
          ...shadow.card,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
