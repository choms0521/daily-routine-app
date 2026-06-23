/**
 * Home screen (PRD 6.4). Subscribes to the store and delegates all computation to the
 * Stage 1 domain via selectors; this screen only displays. Header (routine name, streak,
 * week nav, progress) + the 7 weekday cards. Category chips + toggle actions arrive in
 * Day 3; here each card shows a lightweight category placeholder.
 */
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayCard } from '@/components/chip/DayCard';
import { WeekEmptyState } from '@/components/home/WeekEmptyState';
import { WeekNav } from '@/components/home/WeekNav';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { StreakBadge } from '@/components/progress/StreakBadge';
import { addDays, toDateKey, weekStartOf } from '@/domain/date';
import {
  isCurrentWeek,
  selectActiveRoutineName,
  selectDayViewModels,
  selectStreak,
  selectWeekLabel,
  selectWeekProgress,
  type DayViewModel,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

function CategoryPlaceholder({ vm }: { vm: DayViewModel }) {
  const { color, font } = useTheme();
  const cats: string[] = [];
  if (vm.plan && vm.plan.aerobic.length > 0) cats.push(vm.aerobicDone ? '유산소 ✓' : '유산소');
  if (vm.plan && vm.plan.anaerobic.length > 0) cats.push(vm.anaerobicDone ? '무산소 ✓' : '무산소');
  if (cats.length === 0) return null;
  return <Text style={{ color: color.fgMuted, fontSize: font.caption.size }}>{cats.join('  ·  ')}</Text>;
}

export default function HomeScreen() {
  const { color, space, font } = useTheme();
  const state = useAppStore((s) => s.state);
  const today = toDateKey(new Date());
  const [viewedWeekStart, setViewedWeekStart] = useState(() => weekStartOf(today));

  const routineName = selectActiveRoutineName(state);
  const progress = selectWeekProgress(state, viewedWeekStart);
  const streakDays = selectStreak(state, today);
  const dayVMs = selectDayViewModels(state, viewedWeekStart, today);
  const current = isCurrentWeek(viewedWeekStart, today);
  const weekLabel = selectWeekLabel(viewedWeekStart, today);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.s6, gap: space.s5 }}>
        <View style={{ gap: space.s3 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ gap: space.s1, flexShrink: 1 }}>
              <Text style={{ color: color.fgMuted, fontSize: font.body.size }}>오늘의 운동</Text>
              <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
                {routineName ?? '루틴 없음'}
              </Text>
            </View>
            <StreakBadge days={streakDays} />
          </View>

          <WeekNav
            isCurrentWeek={current}
            weekLabel={weekLabel}
            onPrev={() => setViewedWeekStart((w) => addDays(w, -7))}
            onNext={() => setViewedWeekStart((w) => addDays(w, 7))}
          />

          <ProgressBar done={progress.done} total={progress.total} pct={progress.pct} />
        </View>

        {progress.total === 0 ? (
          <WeekEmptyState />
        ) : (
          <View style={{ gap: space.s3 }}>
            {dayVMs.map((vm) => (
              <DayCard
                key={vm.date}
                weekdayLabel={vm.weekdayLabel}
                dateLabel={vm.dateLabel}
                isToday={vm.isToday}
                isCurrentWeek={current}
                isRestDay={vm.isRestDay}>
                <CategoryPlaceholder vm={vm} />
              </DayCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
