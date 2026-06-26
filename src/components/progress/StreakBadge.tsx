/**
 * Streak badge (PRD 5.7 / 6.3). Display-only: the streak count as the number-forward
 * protagonist (font.display, tabular-nums), led by a flame glyph drawn in SVG (emoji 🔥
 * renders as tofu in the iOS simulator; an SVG icon is crisp everywhere).
 */
import { Text, View } from 'react-native';

import { FlameIcon } from '@/components/ui/icons';
import { useTheme } from '@/theme/ThemeProvider';

export type StreakBadgeProps = { days: number };

export function StreakBadge({ days }: StreakBadgeProps) {
  const { color, font, space } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s1 }}>
      <FlameIcon color={color.warn} size={26} />
      <Text
        style={{
          color: color.fg,
          fontSize: font.display.size,
          fontWeight: font.display.weight,
          fontVariant: font.numeric.fontVariant,
        }}>
        {`${days}일`}
      </Text>
    </View>
  );
}
