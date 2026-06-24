/**
 * The app's "today" (PRD D9, device local timezone). Isolated here so screens depend on a
 * single seam for the current date — tests mock this module to pin "today" deterministically
 * instead of manipulating the system clock.
 */
import { toDateKey } from '@/domain/date';
import type { DateKey } from '@/types/schema';

export function todayKey(): DateKey {
  return toDateKey(new Date());
}
