/**
 * Insights read-model (spec 00-overview §2, a1-history-heatmap §1). Pure derivations
 * over completionLogs + the activation timeline; no schema change and "today" is never
 * read here (callers pass dates). The denominator/exclusion rules match weekProgress and
 * streak: rest days and no-routine days are neutral, not failures.
 *
 * A1 uses dayStatus/historyRange. C2/B3 reuse this module, so the classification boundary
 * here is the shared contract — keep partial/empty slot-level (see dayStatus).
 */
import { categoryDone, dayComplete, hasAnySlot, isRestDay } from '@/domain/completion';
import { addDays, compareDateKey, weekDays, weekStartOf, weekdayOf } from '@/domain/date';
import { weekProgress, type WeekProgress } from '@/domain/progress';
import { plan } from '@/domain/timeline';
import { CATEGORIES, type AppState, type DateKey, type Weekday } from '@/types/schema';

/** Calendar/heatmap cell classification for one day (spec a1 §4). */
export type DayStatus =
  | 'complete' // dayComplete(state, date) === true
  | 'partial' // has slots, not complete, but at least one slot checked
  | 'empty' // active day with slots but zero slots checked
  | 'rest' // isRestDay(state, date)
  | 'none'; // no active version (plan == null) or a day with no slots

/**
 * Whether any plan slot for the day is checked. Iterates the plan's slots (not the log's
 * keys) so a stale checked slot that the current plan no longer contains is not counted —
 * the same plan-driven reading categoryDone/dayComplete use.
 */
function anySlotChecked(state: AppState, date: DateKey): boolean {
  const p = plan(state, date);
  if (p === null) return false;
  const log = state.completionLogs[date];
  return CATEGORIES.some((category) =>
    p[category].some((slot) => log?.checks?.[category]?.[slot.slotId] === true),
  );
}

/**
 * Classify a day into one of five buckets. Guard order matters:
 *   rest -> 'rest'; no slots -> 'none'; complete -> 'complete';
 *   any slot checked -> 'partial'; otherwise 'empty'.
 * isRestDay is checked first and is safe because it returns false when versionOf == null,
 * so rest and none cannot collide. partial vs empty is decided at the slot level, not the
 * category level: a single checked slot (no category fully done) is 'partial', so the
 * shared contract that C2/B3 read stays correct.
 */
export function dayStatus(state: AppState, date: DateKey): DayStatus {
  if (isRestDay(state, date)) return 'rest';
  if (!hasAnySlot(state, date)) return 'none'; // also covers plan == null (hasAnySlot false)
  if (dayComplete(state, date)) return 'complete';
  return anySlotChecked(state, date) ? 'partial' : 'empty';
}

export interface DayStatusEntry {
  date: DateKey;
  status: DayStatus;
}

/**
 * Status for the closed range [fromDate..toDate] in ascending order. Drives the month
 * grid and the year heatmap. Returns [] when fromDate > toDate.
 */
export function historyRange(state: AppState, fromDate: DateKey, toDate: DateKey): DayStatusEntry[] {
  const entries: DayStatusEntry[] = [];
  for (let date = fromDate; compareDateKey(date, toDate) <= 0; date = addDays(date, 1)) {
    entries.push({ date, status: dayStatus(state, date) });
  }
  return entries;
}

const WEEKDAY_ORDER: readonly Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/** Round a numerator/denominator pair to a whole-percent the same way weekProgress does. */
function pctOf(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

/**
 * C2: per-weekday completion rate over the closed range [fromDate..toDate]. The denominator
 * mirrors weekProgress exactly — for each active, non-rest day it counts every category that
 * has at least one slot (done += categoryDone), so rest/empty/no-routine days contribute 0.
 * Weekdays with a zero denominator (e.g. an all-rest weekday) are omitted: a 0/0 bar is noise
 * and matches the "rest excluded from the denominator" rule. Output is canonical mon..sun.
 */
export interface WeekdayRate {
  weekday: Weekday;
  done: number;
  total: number;
  pct: number;
}

export function weekdayRate(state: AppState, fromDate: DateKey, toDate: DateKey): WeekdayRate[] {
  const acc = new Map<Weekday, { done: number; total: number }>();
  for (let date = fromDate; compareDateKey(date, toDate) <= 0; date = addDays(date, 1)) {
    const p = plan(state, date);
    if (p === null) continue; // no active routine -> neutral
    if (isRestDay(state, date)) continue; // rest day -> excluded
    const weekday = weekdayOf(date);
    const bucket = acc.get(weekday) ?? { done: 0, total: 0 };
    for (const category of CATEGORIES) {
      if (p[category].length === 0) continue; // empty category -> excluded
      bucket.total += 1;
      if (categoryDone(state, date, category)) bucket.done += 1;
    }
    acc.set(weekday, bucket);
  }
  return WEEKDAY_ORDER.flatMap((weekday) => {
    const bucket = acc.get(weekday);
    if (bucket === undefined || bucket.total === 0) return []; // omit zero-denominator weekdays
    return [{ weekday, done: bucket.done, total: bucket.total, pct: pctOf(bucket.done, bucket.total) }];
  });
}

/**
 * C2: per-exercise adherence over [fromDate..toDate], aggregated by exercise NAME. Checks are
 * slot-level (DayLog.checks), so this iterates the plan's slots (not the log's keys) on each
 * active, non-rest day and joins them by name — the same name on different days/versions sums
 * into one entry, different names stay separate (spec §1 loose name join). The denominator is
 * the count of slot occurrences scheduled; the numerator is how many of those were checked.
 * Sorted by pct desc, then done desc, then name asc for a stable, deterministic order.
 */
export interface ExerciseRate {
  name: string;
  done: number;
  total: number;
  pct: number;
}

export function exerciseRate(state: AppState, fromDate: DateKey, toDate: DateKey): ExerciseRate[] {
  const acc = new Map<string, { done: number; total: number }>();
  for (let date = fromDate; compareDateKey(date, toDate) <= 0; date = addDays(date, 1)) {
    const p = plan(state, date);
    if (p === null) continue; // no active routine -> neutral
    if (isRestDay(state, date)) continue; // rest day -> excluded
    const log = state.completionLogs[date];
    for (const category of CATEGORIES) {
      for (const slot of p[category]) {
        const bucket = acc.get(slot.name) ?? { done: 0, total: 0 };
        bucket.total += 1;
        if (log?.checks?.[category]?.[slot.slotId] === true) bucket.done += 1;
        acc.set(slot.name, bucket);
      }
    }
  }
  return Array.from(acc, ([name, { done, total }]) => ({ name, done, total, pct: pctOf(done, total) })).sort(
    (a, b) => b.pct - a.pct || b.done - a.done || a.name.localeCompare(b.name),
  );
}

/**
 * C2: weekly completion trend ending at anchorWeekStart's week, going back `weeks` weeks total.
 * Reuses weekProgress per week (no re-derivation), returning ascending WeekPoint[] (oldest
 * first) so a chart reads left-to-right. anchorWeekStart is snapped to its Monday defensively.
 * weeks <= 0 yields []. Each point carries weekProgress's done/total/pct unchanged.
 */
export interface WeekPoint {
  weekStart: DateKey;
  done: number;
  total: number;
  pct: number;
}

export function weeklyTrend(state: AppState, anchorWeekStart: DateKey, weeks: number): WeekPoint[] {
  if (weeks <= 0) return [];
  const anchorMonday = weekStartOf(anchorWeekStart);
  const points: WeekPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = addDays(anchorMonday, -7 * i);
    const progress: WeekProgress = weekProgress(state, weekStart);
    points.push({ weekStart, done: progress.done, total: progress.total, pct: progress.pct });
  }
  return points;
}

/**
 * B3: one-week retrospective (spec 00-overview §2). Combines weekProgress with this module's
 * per-weekday rates to surface what the home header omits — completed-day count, the best/worst
 * weekday, and the change vs. the prior week. Pure: "today" is passed only to honor the frozen
 * signature; the review is fully determined by the week and the state (a future check inside the
 * week still counts, mirroring how weekdayRate/weekProgress read the whole [Mon..Sun] window).
 *
 * topWeekday/missedWeekday reuse weekdayRate (canonical mon..sun, zero-denominator weekdays
 * omitted); iterating in order and updating only on a strict >/< gives the Monday-first tiebreak
 * for free. An empty week (no active, non-rest, slotted day) yields both null and activeDays 0.
 * deltaPct compares this week's pct to the prior week's; when either this week or the prior week
 * has no denominator (no active routine, or all rest/empty), it is null rather than a misleading
 * delta against a non-real 0% (e.g. an empty current week would otherwise read as a drop to 0).
 */
export interface WeekReview {
  weekStart: DateKey;
  progress: WeekProgress; // domain/progress reused
  completedDays: number; // dayComplete === true days that week
  activeDays: number; // non-rest, slotted days that week
  topWeekday: Weekday | null; // highest-rate weekday (null when the week is empty)
  missedWeekday: Weekday | null; // lowest-rate weekday (null when the week is empty)
  deltaPct: number | null; // this week's pct minus the prior week's (null when no prior data)
}

export function weekReview(state: AppState, weekStartMonday: DateKey, today: DateKey): WeekReview {
  void today; // signature-only; the review does not read the clock (see doc comment)
  const weekStart = weekStartOf(weekStartMonday);
  const weekEnd = addDays(weekStart, 6);
  const progress = weekProgress(state, weekStart);

  const completedDays = weekDays(weekStart).filter((date) => dayComplete(state, date)).length;

  // weekdayRate already omits rest/no-routine/empty-category weekdays, so its length is the
  // count of active, slotted weekdays and a single pass finds the best/worst weekday.
  const rates = weekdayRate(state, weekStart, weekEnd);
  const activeDays = rates.length;
  let topWeekday: Weekday | null = null;
  let missedWeekday: Weekday | null = null;
  let topPct = -1;
  let missedPct = 101;
  for (const rate of rates) {
    if (rate.pct > topPct) {
      topPct = rate.pct;
      topWeekday = rate.weekday;
    }
    if (rate.pct < missedPct) {
      missedPct = rate.pct;
      missedWeekday = rate.weekday;
    }
  }

  const priorProgress = weekProgress(state, addDays(weekStart, -7));
  const deltaPct =
    progress.total === 0 || priorProgress.total === 0 ? null : progress.pct - priorProgress.pct;

  return { weekStart, progress, completedDays, activeDays, topWeekday, missedWeekday, deltaPct };
}
