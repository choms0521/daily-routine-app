/**
 * Home selectors (architecture §6). Pure derivations over AppState + time that delegate
 * every computation to the Stage 1 domain (progress/streak/timeline/completion). The home
 * screen subscribes to these; it never recomputes denominators, streak look-back, or
 * version resolution itself (architecture appendix rule 3 — "Stage 2 displays, Stage 1
 * computes").
 */
import { WEEKDAY_LABELS } from '@/constants/labels';
import { addDays, compareDateKey, weekDays, weekStartOf, weekdayOf } from '@/domain/date';
import { earnedBadges, type BadgeStatus } from '@/domain/badges';
import { categoryDone, isRestDay } from '@/domain/completion';
import { weekReview, type WeekReview } from '@/domain/insights';
import { subjectParticle } from '@/domain/korean';
import { weekProgress, type WeekProgress } from '@/domain/progress';
import { streak } from '@/domain/streak';
import { plan } from '@/domain/timeline';
import type { AppState, DateKey, DayPlan, Routine, Weekday } from '@/types/schema';

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

// --- Library selectors (Stage 3) ---

export interface LibraryRoutineVM {
  id: string;
  name: string;
  versionCount: number;
  isActive: boolean;
}

function toLibraryVM(routine: Routine, activeRoutineId: string | null): LibraryRoutineVM {
  return {
    id: routine.id,
    name: routine.name,
    versionCount: routine.versions.length,
    isActive: routine.id === activeRoutineId,
  };
}

/** Visible (non-hidden) routines as library cards; the active one is flagged. */
export function selectLibraryRoutines(state: AppState): LibraryRoutineVM[] {
  const activeId = state.settings.activeRoutineId;
  return state.routines
    .filter((r) => r.hidden !== true)
    .map((r) => toLibraryVM(r, activeId));
}

/** Hidden routines (for an optional "show hidden" affordance). */
export function selectHiddenRoutines(state: AppState): LibraryRoutineVM[] {
  const activeId = state.settings.activeRoutineId;
  return state.routines.filter((r) => r.hidden === true).map((r) => toLibraryVM(r, activeId));
}

/** The selected active routine id (PRD 5.4 — the "next active", may differ from today's plan). */
export function selectActiveRoutineId(state: AppState): string | null {
  return state.settings.activeRoutineId;
}

export interface PendingActivation {
  routineName: string;
  effectiveFrom: DateKey;
}

/**
 * A future-dated activation that has not taken effect yet (switch / active-routine edit):
 * the last timeline entry with effectiveFrom > today. Drives the home "내일부터 적용" banner.
 * Returns null when today's plan is already the latest (no pending change).
 */
export function selectPendingActivation(state: AppState, today: DateKey): PendingActivation | null {
  const timeline = state.activationTimeline;
  if (timeline.length === 0) return null;
  const last = timeline[timeline.length - 1];
  if (compareDateKey(last.effectiveFrom, today) <= 0) return null; // already in effect
  const routine = state.routines.find((r) => r.id === last.routineId);
  if (routine === undefined) return null;
  return { routineName: routine.name, effectiveFrom: last.effectiveFrom };
}

// --- Insights selectors (Stage 3 B3) ---

export interface WeekReviewViewModel {
  review: WeekReview;
  /** One-line natural-language summary with Korean particles already applied (display-only). */
  summary: string;
}

/** "5일" style day-count phrase (no zero-padding, tabular-friendly digits live in the card). */
function dayCountLabel(days: number): string {
  return `${days}일`;
}

/** "12%p 높습니다 / 낮습니다 / 같습니다" — the prior-week comparison clause for a non-null delta. */
function deltaClause(deltaPct: number): string {
  if (deltaPct > 0) return `지난주보다 ${deltaPct}%p 높습니다`;
  if (deltaPct < 0) return `지난주보다 ${Math.abs(deltaPct)}%p 낮습니다`;
  return '지난주와 같습니다';
}

/**
 * Build the one-line summary from a WeekReview. The screen stays display-only by receiving this
 * finished string. Branches cover the three boundaries the domain exposes: an empty week (no
 * active day), a missing prior week (deltaPct === null, drop the 지난주 clause), and a flat delta
 * (deltaPct === 0). The weekday clause attaches 이/가 via subjectParticle on the real label noun
 * (never a hardcoded particle), so "월요일" → "월요일이" and a vowel-final label would take "가".
 * Exported so the copy branches (empty / negative / flat delta) can be unit-tested directly
 * without fixture gymnastics (spec b3 §5 names these as test directions).
 */
export function buildWeekReviewSummary(review: WeekReview): string {
  if (review.activeDays === 0) {
    return '이번 주 기록이 아직 없습니다. 운동을 체크하면 요약이 쌓입니다.';
  }
  const clauses = [`이번 주 ${dayCountLabel(review.completedDays)} 완료했습니다`];
  if (review.topWeekday !== null) {
    const dayNoun = `${WEEKDAY_LABELS[review.topWeekday]}요일`;
    clauses.push(`${dayNoun}${subjectParticle(dayNoun)} 가장 잘 지킨 요일입니다`);
  }
  if (review.deltaPct !== null) {
    clauses.push(deltaClause(review.deltaPct));
  }
  return `${clauses.join(', ')}.`;
}

/**
 * Thin B3 selector: runs weekReview (00-overview §2) and assembles the natural-language summary
 * in one place so WeekReviewCard only displays. weekStartMonday selects the reviewed week; today
 * is passed through to honor the domain signature.
 */
export function selectWeekReview(
  state: AppState,
  weekStartMonday: DateKey,
  today: DateKey,
): WeekReviewViewModel {
  const review = weekReview(state, weekStartMonday, today);
  return { review, summary: buildWeekReviewSummary(review) };
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

// --- Badge selector (Stage 4 A3) ---

/** Display order rank: earned first, then in-progress (current > 0), then untouched (current 0). */
function badgeRank(badge: BadgeStatus): number {
  if (badge.earned) return 0;
  return badge.progress.current > 0 ? 1 : 2;
}

/**
 * Thin A3 selector (spec a3 §2): derives the badge statuses via earnedBadges and sorts them for
 * display — earned → in-progress → unearned (dev doc §Day2). BadgeGrid only displays the result.
 * The sort is stable on rank, so catalog order is preserved within each rank group.
 */
export function selectBadges(state: AppState, today: DateKey): BadgeStatus[] {
  return earnedBadges(state, today).sort((a, b) => badgeRank(a) - badgeRank(b));
}
