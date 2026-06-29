/**
 * Month calendar grid (spec a1 §3). Display-only: a 7-column (Mon..Sun) View grid of
 * DayCells. Input is a DayStatusEntry[] already covering the visible weeks (the Monday of
 * the 1st's week through the Sunday of the last day's week) — this component does no
 * domain calls, it only lays the entries out in rows of seven and marks today.
 */
import { Text, View } from 'react-native';

import { WEEKDAY_LABELS } from '@/constants/labels';
import { DayCell } from '@/components/insights/DayCell';
import type { DayStatusEntry } from '@/domain/insights';
import { WEEKDAYS } from '@/types/schema';
import { useTheme } from '@/theme/ThemeProvider';

export interface MonthCalendarProps {
  entries: DayStatusEntry[]; // length is a multiple of 7 (full weeks, Mon..Sun)
  today: string;
  onSelectDay?: (date: string) => void;
}

/** Day-of-month number from a 'YYYY-MM-DD' key, no Date parsing needed. */
function dayOfMonth(date: string): string {
  return String(Number(date.slice(8, 10)));
}

function chunkWeeks(entries: DayStatusEntry[]): DayStatusEntry[][] {
  const weeks: DayStatusEntry[][] = [];
  for (let i = 0; i < entries.length; i += 7) {
    weeks.push(entries.slice(i, i + 7));
  }
  return weeks;
}

export function MonthCalendar({ entries, today, onSelectDay }: MonthCalendarProps) {
  const { color, font, space } = useTheme();
  const weeks = chunkWeeks(entries);
  return (
    <View style={{ gap: space.s2 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {WEEKDAYS.map((wd) => (
          <Text
            key={wd}
            style={{
              flex: 1,
              textAlign: 'center',
              color: color.fgMuted,
              fontSize: font.caption.size,
            }}>
            {WEEKDAY_LABELS[wd]}
          </Text>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].date} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {week.map((entry) => (
            <View key={entry.date} style={{ flex: 1, alignItems: 'center' }}>
              <DayCell
                status={entry.status}
                label={dayOfMonth(entry.date)}
                isToday={entry.date === today}
                onPress={onSelectDay ? () => onSelectDay(entry.date) : undefined}
                testID={`day-cell-${entry.date}`}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
