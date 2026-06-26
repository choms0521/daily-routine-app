/**
 * Reminder domain logic (B1, spec b1 §1). Pure: "today" is an argument, no I/O.
 *
 * `needsReminderToday` answers "would a reminder be useful right now?" — true only when today
 * is an active, non-rest day that has slots and is not yet complete. It is prepared for an
 * in-app badge and a future background-conditional skip; v1.x still fires a plain daily
 * reminder (skipping at fire time would require a background task, spec b1 §6), so this is not
 * yet wired into the schedule path.
 */
import { dayComplete, hasAnySlot, isRestDay } from '@/domain/completion';
import { versionOf } from '@/domain/timeline';
import type { AppState, DateKey } from '@/types/schema';

/**
 * True when today is an active day (a version resolves, it is not a rest day, and it has at
 * least one slot) AND the day is not yet complete. A rest day, an empty day, a day with no
 * active version, or an already-complete day all yield false.
 */
export function needsReminderToday(state: AppState, today: DateKey): boolean {
  if (versionOf(state, today) === null) return false; // no active version that day
  if (isRestDay(state, today)) return false;
  if (!hasAnySlot(state, today)) return false; // active but empty -> nothing to remind about
  return !dayComplete(state, today);
}
