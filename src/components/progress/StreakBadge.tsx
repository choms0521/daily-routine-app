/**
 * Streak badge (PRD 5.7 / 6.3). Display-only: shows the streak count from
 * domain/streak.streak as the number-forward protagonist (font.display, tabular-nums).
 */
import { Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type StreakBadgeProps = { days: number };

export function StreakBadge({ days }: StreakBadgeProps) {
  const { color, font } = useTheme();
  return (
    <Text
      style={{
        color: color.fg,
        fontSize: font.display.size,
        fontWeight: font.display.weight,
        fontVariant: font.numeric.fontVariant,
      }}>
      {`🔥 ${days}일`}
    </Text>
  );
}
