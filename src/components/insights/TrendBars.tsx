/**
 * TrendBars (spec c2 §3): the weekly completion-rate trend as a row of vertical bars, one per
 * week, oldest on the left. Display-only — it renders the WeekPoint[] that domain/insights
 * .weeklyTrend computed. Each bar's height encodes pct (0..100); the "M/D" tick under it marks
 * the week's Monday. Kept to plain Views (no svg dependency) since the bar count is small.
 */
import { Text, View } from 'react-native';

import type { WeekPoint } from '@/domain/insights';
import { useTheme } from '@/theme/ThemeProvider';

const BAR_AREA_HEIGHT = 64; // px the tallest (100%) bar fills

export interface TrendBarsProps {
  points: WeekPoint[];
}

/** "M/D" tick from a 'YYYY-MM-DD' week-start key (no leading zeros, locale-free). */
function weekTick(weekStart: string): string {
  const month = Number(weekStart.slice(5, 7));
  const day = Number(weekStart.slice(8, 10));
  return `${month}/${day}`;
}

export function TrendBars({ points }: TrendBarsProps) {
  const { color, space, font, radius } = useTheme();
  if (points.length === 0) {
    return (
      <Text testID="trend-empty" style={{ color: color.fgMuted, fontSize: font.body.size }}>
        추세를 표시할 주가 없습니다.
      </Text>
    );
  }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.s2 }}>
      {points.map((point) => (
        <View key={point.weekStart} style={{ flex: 1, alignItems: 'center', gap: space.s1 }}>
          <Text
            style={{
              color: color.fgMuted,
              fontSize: font.caption.size,
              fontVariant: font.numeric.fontVariant,
            }}>
            {`${point.pct}%`}
          </Text>
          <View
            style={{
              width: '100%',
              height: BAR_AREA_HEIGHT,
              justifyContent: 'flex-end',
              backgroundColor: color.chipIdleBg,
              borderRadius: radius.chip,
              overflow: 'hidden',
            }}>
            <View
              testID={`trend-bar-${point.weekStart}`}
              style={{
                width: '100%',
                height: `${point.pct}%`,
                backgroundColor: color.primary,
                borderTopLeftRadius: radius.chip,
                borderTopRightRadius: radius.chip,
              }}
            />
          </View>
          <Text
            style={{
              color: color.fgSubtle,
              fontSize: font.caption.size,
              fontVariant: font.numeric.fontVariant,
            }}>
            {weekTick(point.weekStart)}
          </Text>
        </View>
      ))}
    </View>
  );
}
