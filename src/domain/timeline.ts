/**
 * Plan resolution (PRD 4.3, 4.5). The activation timeline is the single source of
 * truth for "date -> version -> plan". `DayLog.versionId` is a denormalized cache,
 * never used as the resolution path (see assertLogConsistency).
 */
import { compareDateKey, weekdayOf } from '@/domain/date';
import type { Activation, AppState, DateKey, DayPlan, RoutineVersion } from '@/types/schema';

/**
 * versionOf(date) = the RoutineVersion of the timeline entry with the latest
 * effectiveFrom <= date. On a tie in effectiveFrom, the later array entry wins
 * (last append, PRD 4.8). Returns null when no entry applies.
 *
 * Precondition: activationTimeline is maintained in append order and never
 * reordered/sorted, so "last array index" == "last append" for the tie-break. If a
 * future stage (e.g. an import that merges/sorts the timeline) breaks that, add an
 * explicit sequence key instead of relying on array position.
 */
export function activationOf(state: AppState, date: DateKey): Activation | null {
  let best: Activation | null = null;
  for (const entry of state.activationTimeline) {
    if (compareDateKey(entry.effectiveFrom, date) > 0) continue; // effectiveFrom > date: not yet active
    // Keep the latest effectiveFrom; on a tie, a later entry (>= 0) replaces the earlier one.
    if (best === null || compareDateKey(entry.effectiveFrom, best.effectiveFrom) >= 0) {
      best = entry;
    }
  }
  return best;
}

export function versionOf(state: AppState, date: DateKey): RoutineVersion | null {
  const chosen = activationOf(state, date);
  if (chosen === null) return null;
  const routine = state.routines.find((r) => r.id === chosen.routineId);
  if (routine === undefined) return null;
  return routine.versions.find((v) => v.versionId === chosen.versionId) ?? null;
}

/** plan(date) = versionOf(date)?.days[weekdayOf(date)], or null. */
export function plan(state: AppState, date: DateKey): DayPlan | null {
  const version = versionOf(state, date);
  if (version === null) return null;
  return version.days[weekdayOf(date)];
}

/**
 * Integrity check (PRD 4.4): the denormalized DayLog.versionId matches the value
 * re-derived from the timeline. A verification/test helper, not a resolution path.
 * A day without a DayLog is not subject to the check (returns true). A mismatch
 * signals data corruption.
 */
export function assertLogConsistency(state: AppState, date: DateKey): boolean {
  const log = state.completionLogs[date];
  if (log === undefined) return true;
  return log.versionId === versionOf(state, date)?.versionId;
}
