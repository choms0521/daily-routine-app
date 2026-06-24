/**
 * Home selectors (architecture §6). Pure derivations over AppState + time that delegate
 * every computation to the Stage 1 domain (progress/streak/timeline/completion). The home
 * screen subscribes to these; it never recomputes denominators, streak look-back, or
 * version resolution itself (architecture appendix rule 3 — "Stage 2 displays, Stage 1
 * computes").
 */
import { addDays, weekDays, weekStartOf, weekdayOf } from '@/domain/date';
import { categoryDone, isRestDay } from '@/domain/completion';
import { weekProgress, type WeekProgress } from '@/domain/progress';
import { streak } from '@/domain/streak';
import { plan } from '@/domain/timeline';
import type { AppState, DateKey, DayPlan, Weekday } from '@/types/schema';

const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: '월',
  tue: '화',
  wed: '수',
  thu: '목',
  fri: '금',
  sat: '토',
  sun: '일',
};

/** "6.22" style short label for a date key (no zero-padding, matches the PRD concept). */
function dateLabel(date: DateKey): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}.${Number(day)}`;
}

export function selectActiveRoutineName(state: AppState): string | null {
  const id = state.settings.activeRoutineId;
  if (id === null) return null;
  return state.routines.find((r) => r.id === id)?.name ?? null;
}

export function selectWeekProgress(state: AppState, weekStartMonday: DateKey): WeekProgress {
  return weekProgress(state, weekStartMonday);
}

export function selectStreak(state: AppState, today: DateKey): number {
  return streak(state, today);
}

/** True when the viewed week is the week that contains today. */
export function isCurrentWeek(weekStartMonday: DateKey, today: DateKey): boolean {
  return weekStartMonday === weekStartOf(today);
}

/** "6.22 – 6.28 · 이번 주 / 지난 주" — range plus a this/last-week suffix when applicable. */
export function selectWeekLabel(weekStartMonday: DateKey, today: DateKey): string {
  const days = weekDays(weekStartMonday);
  const range = `${dateLabel(days[0])} – ${dateLabel(days[6])}`;
  if (isCurrentWeek(weekStartMonday, today)) return `${range} · 이번 주`;
  if (weekStartMonday === weekStartOf(addDays(today, -7))) return `${range} · 지난 주`;
  return range;
}

export interface DayViewModel {
  date: DateKey;
  weekday: Weekday;
  weekdayLabel: string;
  dateLabel: string;
  isToday: boolean;
  isRestDay: boolean;
  plan: DayPlan | null;
  aerobicDone: boolean;
  anaerobicDone: boolean;
  checks: { aerobic: Record<string, boolean>; anaerobic: Record<string, boolean> };
}

/** Per-day view models for the 7 days of the viewed week (Mon..Sun). */
export function selectDayViewModels(
  state: AppState,
  weekStartMonday: DateKey,
  today: DateKey,
): DayViewModel[] {
  return weekDays(weekStartMonday).map((date) => {
    const weekday = weekdayOf(date);
    const log = state.completionLogs[date];
    return {
      date,
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday],
      dateLabel: dateLabel(date),
      isToday: date === today,
      isRestDay: isRestDay(state, date),
      plan: plan(state, date),
      aerobicDone: categoryDone(state, date, 'aerobic'),
      anaerobicDone: categoryDone(state, date, 'anaerobic'),
      checks: log ? log.checks : { aerobic: {}, anaerobic: {} },
    };
  });
}
