/**
 * Milestone badge derivation (spec a3 §1, dev doc §2). Pure read-model over completionLogs +
 * the activation timeline: no schema change, badges are derived every render and never stored.
 * "today" is accepted only for signature parity with the other read-models — neither metric
 * reads the clock (total counts all recorded logs, the longest streak is over recorded history),
 * so it is voided like weekReview does.
 *
 * Metric values come from the catalog's two behavior signals; each catalog entry maps a metric
 * value to earned/progress. The streak metric mirrors streak.ts exemptions exactly (rest,
 * no-active-version, and empty non-rest days pass through without breaking a run).
 */
import { BADGE_CATALOG, type BadgeCatalogEntry } from '@/constants/badgeCatalog';
import { dayComplete, hasAnySlot, isRestDay } from '@/domain/completion';
import { addDays, compareDateKey } from '@/domain/date';
import { versionOf } from '@/domain/timeline';
import type { AppState, DateKey } from '@/types/schema';

export interface BadgeStatus {
  id: string; // catalog key
  label: string; // display name
  description: string; // earn-condition copy
  earned: boolean;
  /** current = raw metric value (never capped at target); target = threshold. */
  progress: { current: number; target: number };
}

/**
 * Total completed days = the count of recorded logs whose day is complete. Iterating the log
 * keys is sufficient (and correct) for the total because a complete day necessarily has a log;
 * a day with no log has nothing checked, so dayComplete is false for it anyway.
 */
function totalCompletedDays(state: AppState): number {
  return Object.keys(state.completionLogs).filter((date) => dayComplete(state, date)).length;
}

/**
 * Longest streak = the maximum length of a run of consecutive complete active days across the
 * whole recorded history. The scan walks EVERY calendar day in the closed range [minLog..maxLog]
 * (not just the log keys), because an active, non-rest, slotted day with no log is incomplete and
 * must break a run — iterating keys only would skip it and silently merge two runs. The three
 * guards match streak.ts exactly: no active version / rest day / empty non-rest day pass through
 * without touching the current run. [minLog..maxLog] is a sufficient window: every complete day
 * has a log, so every run lives inside that range; "today" is not needed.
 */
function longestStreak(state: AppState): number {
  const dates = Object.keys(state.completionLogs);
  if (dates.length === 0) return 0;
  // Date keys are zero-padded ISO, so lexicographic min/max == chronological earliest/latest.
  let from = dates[0];
  let to = dates[0];
  for (const date of dates) {
    if (compareDateKey(date, from) < 0) from = date;
    if (compareDateKey(date, to) > 0) to = date;
  }

  let longest = 0;
  let current = 0;
  for (let date = from; compareDateKey(date, to) <= 0; date = addDays(date, 1)) {
    if (versionOf(state, date) === null) continue; // no active routine -> pass
    if (isRestDay(state, date)) continue; // rest day -> pass
    if (!hasAnySlot(state, date)) continue; // empty non-rest day -> pass
    if (dayComplete(state, date)) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 0; // a slotted non-rest day left incomplete ends the run
    }
  }
  return longest;
}

/** The live value of a catalog entry's metric for the given state. */
function metricValue(state: AppState, entry: BadgeCatalogEntry): number {
  return entry.metric === 'total' ? totalCompletedDays(state) : longestStreak(state);
}

/**
 * Apply each catalog entry's metric value to derive earned (value >= target) and the progress
 * gauge ({ current: value, target }). current is the raw metric value and is intentionally NOT
 * capped at target — an earned badge can read e.g. {current:2, target:1} (dev doc §3.2).
 */
export function earnedBadges(state: AppState, today: DateKey): BadgeStatus[] {
  void today; // signature parity only; neither metric reads the clock (see module doc).
  return BADGE_CATALOG.map((entry) => {
    const value = metricValue(state, entry);
    return {
      id: entry.id,
      label: entry.label,
      description: entry.description,
      earned: value >= entry.target,
      progress: { current: value, target: entry.target },
    };
  });
}
