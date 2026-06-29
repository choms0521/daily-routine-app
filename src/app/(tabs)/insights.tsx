/**
 * Insights tab (기록) — spec 00-overview §3. Reflection/motivation surface, kept separate
 * from the home (today's action) surface. The fixed section order is B3 -> A1 -> C2 -> A3;
 * this stage fills B3 (weekly summary, top), A1 (history calendar/heatmap), and C2 (stats),
 * reserving A3. The screen reads state + today and hands them to display-only sections; the
 * thin B3 derivation lives in selectWeekReview (selectors.ts), the rest behind each section.
 */
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { HistorySection } from '@/components/insights/HistorySection';
import { StatsSection } from '@/components/insights/StatsSection';
import { WeekReviewCard } from '@/components/insights/WeekReviewCard';
import { todayKey } from '@/domain/clock';
import { weekStartOf } from '@/domain/date';
import { selectBadges, selectWeekReview } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function InsightsScreen() {
  const { color, font, space } = useTheme();
  const state = useAppStore((s) => s.state);
  const today = todayKey();
  // B3 reviews the week that contains today; the home header owns the live, navigable week.
  const weekReview = selectWeekReview(state, weekStartOf(today), today);
  const badges = selectBadges(state, today);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.surface }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: space.s5, gap: space.s4 }}>
        <Text style={{ color: color.fg, fontSize: font.title.size, fontWeight: font.title.weight }}>
          기록
        </Text>

        {/* Section order (fixed): B3 주간 요약 -> A1 캘린더·히트맵 -> C2 통계 -> A3 배지. */}
        <WeekReviewCard review={weekReview.review} summary={weekReview.summary} />
        <HistorySection state={state} today={today} />
        <StatsSection state={state} today={today} />
        <BadgeGrid badges={badges} />
      </ScrollView>
    </SafeAreaView>
  );
}
