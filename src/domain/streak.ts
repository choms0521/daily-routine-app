/**
 * Streak (PRD 4.7), version-aware. Counts consecutive completed days going back up
 * to 60 days from today. The three loop guards (no active version / rest day / empty
 * non-rest day) pass through, treating exactly the same days the progress denominator
 * excludes. back == 0 incomplete does not break the streak (today protection, D8.8).
 */
import { dayComplete, hasAnySlot, isRestDay } from '@/domain/completion';
import { addDays } from '@/domain/date';
import { versionOf } from '@/domain/timeline';
import type { AppState, DateKey } from '@/types/schema';

// Inclusive of today: the loop scans today + 60 prior days (PRD 4.7 "최대 60일 소급").
const MAX_LOOKBACK_DAYS = 60;

export function streak(state: AppState, today: DateKey): number {
  let count = 0;
  for (let back = 0; back <= MAX_LOOKBACK_DAYS; back += 1) {
    const date = addDays(today, -back);
    if (versionOf(state, date) === null) continue; // no active routine -> pass
    if (isRestDay(state, date)) continue; // rest day -> pass
    if (!hasAnySlot(state, date)) continue; // empty non-rest day -> pass
    const complete = dayComplete(state, date);
    if (back === 0 && !complete) continue; // today incomplete is in-progress, not a break
    if (complete) {
      count += 1;
    } else {
      break; // a slotted non-rest day left incomplete (or unrecorded) ends the streak
    }
  }
  return count;
}
