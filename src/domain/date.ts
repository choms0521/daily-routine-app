/**
 * Date utilities (PRD D9). Week starts on Monday; "today"/date judgments use the
 * device local timezone. date-fns is wrapped here so other modules never depend on
 * date-fns directly.
 *
 * All keys are local 'YYYY-MM-DD' strings. `effectiveFrom <= date` comparisons are
 * plain string comparisons (lexicographic order == chronological order for ISO keys).
 */
import { addDays as addDaysFns, format, getDay, startOfWeek } from 'date-fns';
import type { DateKey, Weekday } from '@/types/schema';

// getDay returns 0..6 with 0 = Sunday.
const WEEKDAYS_FROM_SUNDAY: readonly Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Parse a local date key into a Date at local midnight (timezone-explicit). */
function fromDateKey(date: DateKey): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Local-timezone date key for a Date. */
export function toDateKey(d: Date): DateKey {
  return format(d, 'yyyy-MM-dd');
}

/** Weekday ('mon'..'sun') of a date key, Monday-start aware. */
export function weekdayOf(date: DateKey): Weekday {
  return WEEKDAYS_FROM_SUNDAY[getDay(fromDateKey(date))];
}

/** The Monday date key of the week containing `date`. */
export function weekStartOf(date: DateKey): DateKey {
  return toDateKey(startOfWeek(fromDateKey(date), { weekStartsOn: 1 }));
}

/** Add (or subtract, if negative) days to a date key. */
export function addDays(date: DateKey, days: number): DateKey {
  return toDateKey(addDaysFns(fromDateKey(date), days));
}

/** Compare two date keys: -1 if a < b, 1 if a > b, 0 if equal (chronological). */
export function compareDateKey(a: DateKey, b: DateKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The 7 date keys [Mon..Sun] of the week starting at `weekStartMonday`. */
export function weekDays(weekStartMonday: DateKey): DateKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStartMonday, i));
}
