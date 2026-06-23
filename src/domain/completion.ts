/**
 * Completion derivations (PRD 4.5). `log(date)` is state.completionLogs[date],
 * accessed null-safely (a day without a log = all slots unchecked). An empty
 * category (0 slots) is excluded from completion judgments.
 */
import { weekdayOf } from '@/domain/date';
import { plan, versionOf } from '@/domain/timeline';
import type { AppState, Category, DateKey } from '@/types/schema';

/**
 * A category is done iff it has at least one slot and every slot is checked.
 * A missing log means all slots are unchecked -> not done.
 */
export function categoryDone(state: AppState, date: DateKey, category: Category): boolean {
  const p = plan(state, date);
  if (p === null) return false;
  const slots = p[category];
  if (slots.length === 0) return false;
  const log = state.completionLogs[date];
  return slots.every((slot) => log?.checks?.[category]?.[slot.slotId] === true);
}

/** Rest day iff that day's active version lists the weekday in restDays (not a calendar). */
export function isRestDay(state: AppState, date: DateKey): boolean {
  const version = versionOf(state, date);
  if (version === null) return false;
  return version.restDays.includes(weekdayOf(date));
}

/** Whether the day has at least one toggleable slot. */
export function hasAnySlot(state: AppState, date: DateKey): boolean {
  const p = plan(state, date);
  if (p === null) return false;
  return p.aerobic.length + p.anaerobic.length > 0;
}

/**
 * The whole day is complete iff it has a plan, is not a rest day, has at least one
 * slot, and every non-empty category is done. plan == null or an empty non-rest day
 * yields false; streak/progress each treat those as neutral (PRD 4.6/4.7 guards).
 */
export function dayComplete(state: AppState, date: DateKey): boolean {
  const p = plan(state, date);
  if (p === null) return false;
  if (isRestDay(state, date)) return false;
  if (!hasAnySlot(state, date)) return false;
  const categories: Category[] = ['aerobic', 'anaerobic'];
  return categories.filter((c) => p[c].length > 0).every((c) => categoryDone(state, date, c));
}
