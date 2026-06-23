/**
 * Day card (PRD 6.4). One weekday: label, an "오늘" tag (only when the viewed week is the
 * current week and this is today — PRD 5.9 / AC-5.9.1), and either a rest-day line or the
 * category chips (passed as children from Day 3). Display-only; today/rest are computed
 * upstream by the Stage 1 domain via selectors.
 */
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export type DayCardProps = {
  weekdayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isCurrentWeek: boolean;
  isRestDay: boolean;
  children?: ReactNode;
};

export function DayCard({
  weekdayLabel,
  dateLabel,
  isToday,
  isCurrentWeek,
  isRestDay,
  children,
}: DayCardProps) {
  const { color, font, space, radius } = useTheme();
  const highlight = isToday && isCurrentWeek;
  return (
    <View
      style={{
        backgroundColor: color.surface,
        borderRadius: radius.card,
        borderWidth: highlight ? 2 : 1,
        borderColor: highlight ? color.primary : color.border,
        padding: space.s4,
        gap: space.s3,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s2 }}>
        <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
          {weekdayLabel}
        </Text>
        <Text style={{ color: color.fgSubtle, fontSize: font.caption.size, fontVariant: font.numeric.fontVariant }}>
          {dateLabel}
        </Text>
        {highlight ? (
          <View
            style={{
              marginLeft: space.s1,
              paddingHorizontal: space.s2,
              paddingVertical: space.s1 / 2,
              backgroundColor: color.primaryWeak,
              borderRadius: radius.full,
            }}>
            <Text style={{ color: color.primary, fontSize: font.caption.size, fontWeight: '600' }}>오늘</Text>
          </View>
        ) : null}
      </View>

      {isRestDay ? (
        <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>휴식 — 회복하는 날</Text>
      ) : (
        children
      )}
    </View>
  );
}
