/**
 * History section (spec a1 §3, the A1 surface of the 기록 tab). Container for the month
 * calendar and the year heatmap with a month/year toggle and month navigation. This is the
 * only place A1 reads the domain: it derives the visible DayStatusEntry[] from historyRange
 * and hands plain entries to the display-only children. selectors.ts is intentionally not
 * touched (owned in parallel), so the thin derivation lives here behind useMemo.
 */
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { MonthCalendar } from '@/components/insights/MonthCalendar';
import { YearHeatmap } from '@/components/insights/YearHeatmap';
import { Card } from '@/components/ui/Card';
import { addDays, weekStartOf, weekdayOf } from '@/domain/date';
import { historyRange, type DayStatusEntry } from '@/domain/insights';
import type { AppState, DateKey } from '@/types/schema';
import { useTheme } from '@/theme/ThemeProvider';

type ViewMode = 'month' | 'year';

export interface HistorySectionProps {
  state: AppState;
  today: DateKey;
}

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'] as const;

/** First day-of-month key ('YYYY-MM-01') for the month that contains `date`. */
function firstOfMonth(date: DateKey): DateKey {
  return `${date.slice(0, 7)}-01`;
}

/** Last day-of-month key for the month that contains `date`. */
function lastOfMonth(date: DateKey): DateKey {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)); // 1..12
  const lastDay = new Date(year, month, 0).getDate(); // day 0 of next month = last of this month
  return `${date.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
}

/** "YYYY년 M월" label for a month anchor. */
function monthTitle(anchor: DateKey): string {
  const year = anchor.slice(0, 4);
  const month = Number(anchor.slice(5, 7));
  return `${year}년 ${MONTH_LABELS[month - 1]}`;
}

/** The Sunday key of the week containing `date` (week is Monday-first). */
function sundayOf(date: DateKey): DateKey {
  return addDays(weekStartOf(date), 6);
}

export function HistorySection({ state, today }: HistorySectionProps) {
  const { color, font, space, radius } = useTheme();
  const [mode, setMode] = useState<ViewMode>('month');
  // Anchor any date within the viewed month; navigation shifts it by whole months.
  const [monthAnchor, setMonthAnchor] = useState<DateKey>(() => firstOfMonth(today));

  // Month grid: Monday of the 1st's week .. Sunday of the last day's week (full weeks).
  const monthEntries = useMemo<DayStatusEntry[]>(() => {
    const from = weekStartOf(firstOfMonth(monthAnchor));
    const to = sundayOf(lastOfMonth(monthAnchor));
    return historyRange(state, from, to);
  }, [state, monthAnchor]);

  // Year heatmap: ~1 year back, snapped to a Monday start so weekday rows align.
  const yearEntries = useMemo<DayStatusEntry[]>(() => {
    const to = sundayOf(today);
    const from = weekStartOf(addDays(today, -364));
    return historyRange(state, from, to);
  }, [state, today]);

  const goPrevMonth = () => setMonthAnchor((a) => firstOfMonth(addDays(a, -1)));
  const goNextMonth = () => setMonthAnchor((a) => firstOfMonth(addDays(lastOfMonth(a), 1)));

  // Empty-state: a brand-new user with no recorded activity sees guidance, not an empty grid.
  const hasAnyActivity = useMemo(
    () => yearEntries.some((e) => e.status === 'complete' || e.status === 'partial'),
    [yearEntries],
  );

  return (
    <Card style={{ gap: space.s4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: color.fg, fontSize: font.subtitle.size, fontWeight: font.subtitle.weight }}>
          기록 캘린더
        </Text>
        <View style={{ flexDirection: 'row', gap: space.s1 }}>
          <ModeToggle label="월" active={mode === 'month'} onPress={() => setMode('month')} testID="history-mode-month" />
          <ModeToggle label="연" active={mode === 'year'} onPress={() => setMode('year')} testID="history-mode-year" />
        </View>
      </View>

      {!hasAnyActivity ? (
        <Text testID="history-empty" style={{ color: color.fgMuted, fontSize: font.body.size }}>
          아직 기록이 없습니다. 오늘의 운동을 체크하면 여기에 쌓입니다.
        </Text>
      ) : mode === 'month' ? (
        <View style={{ gap: space.s3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              testID="history-prev-month"
              onPress={goPrevMonth}
              accessibilityRole="button"
              accessibilityLabel="이전 달"
              hitSlop={space.s2}>
              <Text style={{ color: color.primary, fontSize: font.body.size }}>‹</Text>
            </Pressable>
            <Text style={{ color: color.fg, fontSize: font.body.size, fontWeight: '600' }}>
              {monthTitle(monthAnchor)}
            </Text>
            <Pressable
              testID="history-next-month"
              onPress={goNextMonth}
              accessibilityRole="button"
              accessibilityLabel="다음 달"
              hitSlop={space.s2}>
              <Text style={{ color: color.primary, fontSize: font.body.size }}>›</Text>
            </Pressable>
          </View>
          <MonthCalendar entries={monthEntries} today={today} />
        </View>
      ) : (
        <View style={{ alignItems: 'flex-start', borderRadius: radius.chip }}>
          <YearHeatmap entries={yearEntries} />
        </View>
      )}
    </Card>
  );
}

interface ModeToggleProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}

function ModeToggle({ label, active, onPress, testID }: ModeToggleProps) {
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
