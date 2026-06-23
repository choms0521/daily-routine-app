/**
 * Weekly progress (PRD 4.6), version-aware. The denominator is the sum of
 * "non-rest day × categories that have at least one slot", not a day count.
 * plan == null days and empty non-rest days are excluded so this matches the
 * streak pass set (PRD 4.7).
 */
import { categoryDone, isRestDay } from '@/domain/completion';
import { weekDays } from '@/domain/date';
import { plan } from '@/domain/timeline';
import type { AppState, Category, DateKey } from '@/types/schema';

export interface WeekProgress {
  done: number; // categoryDone == true items (numerator)
  total: number; // non-rest day categories that have slots (denominator)
  pct: number; // total > 0 ? Math.round(done / total * 100) : 0
}

const CATEGORIES: readonly Category[] = ['aerobic', 'anaerobic'];

/** Progress for one week (Mon..Sun); each date resolves its own version. */
export function weekProgress(state: AppState, weekStartMonday: DateKey): WeekProgress {
  let done = 0;
  let total = 0;
  for (const date of weekDays(weekStartMonday)) {
    const p = plan(state, date);
    if (p === null) continue; // no active routine -> excluded (neutral)
    if (isRestDay(state, date)) continue; // rest day -> excluded
    for (const category of CATEGORIES) {
      if (p[category].length === 0) continue; // empty category -> excluded
      total += 1;
      if (categoryDone(state, date, category)) done += 1;
    }
  }
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}
