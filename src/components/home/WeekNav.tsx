/**
 * Week navigator (PRD 5.8). Moves the viewed week. The next-week button is disabled when
 * the current week is shown (this week is the upper bound, AC-5.8.1) — no future weeks.
 * Display-only: it reports taps; the parent owns viewedWeekStart.
 */
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type WeekNavProps = {
  isCurrentWeek: boolean;
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
};

export function WeekNav({ isCurrentWeek, weekLabel, onPrev, onNext }: WeekNavProps) {
  const { color, font, space } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: space.s2,
      }}>
      <Pressable testID="prev-week-btn" onPress={onPrev} hitSlop={8}>
        <Text style={{ color: color.primary, fontSize: font.body.size }}>‹ 지난 주</Text>
      </Pressable>
      <Text
        style={{
          color: color.fg,
          fontSize: font.body.size,
          fontWeight: font.subtitle.weight,
          fontVariant: font.numeric.fontVariant,
        }}>
        {weekLabel}
      </Text>
      <Pressable testID="next-week-btn" onPress={onNext} disabled={isCurrentWeek} hitSlop={8}>
        <Text style={{ color: isCurrentWeek ? color.fgSubtle : color.primary, fontSize: font.body.size }}>
          다음 주 ›
        </Text>
      </Pressable>
    </View>
  );
}
