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
import { DayCategories } from '@/components/chip/DayCategories';
import { SaveErrorToast } from '@/components/home/SaveErrorToast';
import { WeekEmptyState } from '@/components/home/WeekEmptyState';
import { WeekNav } from '@/components/home/WeekNav';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { StreakBadge } from '@/components/progress/StreakBadge';
import { addDays, weekStartOf } from '@/domain/date';
import { todayKey } from '@/domain/clock';
import {
  isCurrentWeek,
  selectActiveRoutineName,
  selectDayViewModels,
  selectStreak,
  selectWeekLabel,
  selectWeekProgress,
} from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function HomeScreen() {
  const { color, space, font } = useTheme();
  const state = useAppStore((s) => s.state);
  const toggleCheck = useAppStore((s) => s.toggleCheck);
  const toggleCategory = useAppStore((s) => s.toggleCategory);
  const today = todayKey();
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
                <DayCategories
                  vm={vm}
                  onToggleCategory={(category, value) => toggleCategory(vm.date, category, value)}
                  onCheck={(category, slotId) => toggleCheck(vm.date, category, slotId)}
                />
              </DayCard>
            ))}
          </View>
        )}
      </ScrollView>
      <SaveErrorToast />
    </SafeAreaView>
  );
}
