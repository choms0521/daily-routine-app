/**
 * StatsSection (spec c2 §3, the C2 surface of the 기록 tab). Container for the weekday-rate
 * list, the exercise-rate list, and the weekly trend. It owns the only C2 read of the domain:
 * a recent-N-weeks range toggle (local useState) maps to a [from..to] window, and useMemo
 * recomputes the three aggregates only when state or the range changes. selectors.ts is owned
 * in parallel and intentionally not touched, so the thin derivation lives here behind useMemo.
 */
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/constants/labels';
import { BarRow } from '@/components/insights/BarRow';
import { TrendBars } from '@/components/insights/TrendBars';
import { Card } from '@/components/ui/Card';
import { addDays, weekStartOf } from '@/domain/date';
import { exerciseRate, weekdayRate, weeklyTrend } from '@/domain/insights';
import type { AppState, DateKey } from '@/types/schema';
import { useTheme } from '@/theme/ThemeProvider';

const RANGE_OPTIONS = [4, 12] as const;
type RangeWeeks = (typeof RANGE_OPTIONS)[number];

export interface StatsSectionProps {
  state: AppState;
  today: DateKey;
}

export function StatsSection({ state, today }: StatsSectionProps) {
  const { color, font, space } = useTheme();
  const [weeks, setWeeks] = useState<RangeWeeks>(4);

  // The anchor is this week's Monday; the window covers `weeks` whole weeks ending today.
  const anchorMonday = useMemo(() => weekStartOf(today), [today]);
  const fromDate = useMemo(() => addDays(anchorMonday, -7 * (weeks - 1)), [anchorMonday, weeks]);

  const weekdays = useMemo(() => weekdayRate(state, fromDate, today), [state, fromDate, today]);
  const exercises = useMemo(() => exerciseRate(state, fromDate, today), [state, fromDate, today]);
  const trend = useMemo(() => weeklyTrend(state, anchorMonday, weeks), [state, anchorMonday, weeks]);

  const hasData = weekdays.length > 0 || exercises.length > 0;

  return (
    <Card style={{ gap: space.s4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
          통계
        </Text>
        <View style={{ flexDirection: 'row', gap: space.s1 }}>
          {RANGE_OPTIONS.map((option) => (
            <RangeToggle
              key={option}
              label={`최근 ${option}주`}
              active={weeks === option}
              onPress={() => setWeeks(option)}
              testID={`stats-range-${option}`}
            />
          ))}
        </View>
      </View>

      {!hasData ? (
        <Text testID="stats-empty" style={{ color: color.fgMuted, fontSize: font.body.size }}>
          아직 집계할 기록이 없습니다. 운동을 체크하면 통계가 쌓입니다.
        </Text>
      ) : (
        <View style={{ gap: space.s5 }}>
          <View style={{ gap: space.s3 }}>
            <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>요일별 수행률</Text>
            {weekdays.map((row) => (
              <BarRow
                key={row.weekday}
                label={WEEKDAY_LABELS[row.weekday]}
                done={row.done}
                total={row.total}
                pct={row.pct}
                testID={`stats-weekday-${row.weekday}`}
              />
            ))}
          </View>

          <View style={{ gap: space.s3 }}>
            <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>운동별 준수율</Text>
            {exercises.map((row) => (
              <BarRow
                key={row.name}
                label={row.name}
                done={row.done}
                total={row.total}
                pct={row.pct}
                testID={`stats-exercise-${row.name}`}
              />
            ))}
          </View>

          <View style={{ gap: space.s3 }}>
            <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>주간 추세</Text>
            <TrendBars points={trend} />
          </View>
        </View>
      )}
    </Card>
  );
}

interface RangeToggleProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function RangeToggle({ label, active, onPress, testID }: RangeToggleProps) {
  const { color, font, space, radius } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        paddingVertical: space.s1,
        paddingHorizontal: space.s3,
        borderRadius: radius.chip,
        backgroundColor: active ? color.primaryWeak : color.chipIdleBg,
      }}>
      <Text style={{ color: active ? color.primary : color.chipIdleFg, fontSize: font.caption.size, fontWeight: '600' }}>
        {label}
      </Text>
    </Pressable>
  );
}
