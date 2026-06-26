/**
 * Performance budget (Stage 5 Day 3, T12/T13). PRD 8.3: streak + weekProgress must
 * compute well within one 60fps frame (16ms) so the home screen never blocks on them.
 *
 * The state is a worst case: today sits far after the routine's effectiveFrom and every
 * non-rest day in the full 60-day lookback window is complete, so streak() runs all 61
 * iterations with no early break and weekProgress() resolves a fully-slotted week. We warm
 * the JIT, then take the median of several single-pair runs so one GC/timer spike on CI
 * can't fail an otherwise-microsecond computation.
 */
import { streak } from '@/domain/streak';
import { weekProgress } from '@/domain/progress';
import { addDays, weekdayOf, weekStartOf } from '@/domain/date';
import { baseState, withLogs } from '../fixtures/baseState';
import type { AppState, DayLog } from '@/types/schema';

// Far enough after effectiveFrom '2026-06-01' that the whole 60-day window has an active version.
const TODAY = '2026-09-30';
const FRAME_BUDGET_MS = 16;

const days = baseState.routines[0].versions[0].days;

/** A fully-checked log for `date`, derived from that weekday's plan in the base version. */
function completeLog(date: string): DayLog {
  const plan = days[weekdayOf(date)];
  const aerobic: Record<string, boolean> = {};
  const anaerobic: Record<string, boolean> = {};
  for (const slot of plan.aerobic) aerobic[slot.slotId] = true;
  for (const slot of plan.anaerobic) anaerobic[slot.slotId] = true;
  return { date, routineId: 'rt_aXk92', versionId: 'v_001', checks: { aerobic, anaerobic } };
}

/** Backfill complete logs across the full 60-day lookback so streak scans every day. */
function worstCaseState(): AppState {
  const logs: Record<string, DayLog> = {};
  for (let back = 0; back <= 60; back += 1) {
    const date = addDays(TODAY, -back);
    if (weekdayOf(date) === 'sun') continue; // rest day: no log needed
    logs[date] = completeLog(date);
  }
  return withLogs(baseState, logs);
}

function medianPairMs(state: AppState, weekStart: string): number {
  for (let i = 0; i < 50; i += 1) {
    streak(state, TODAY);
    weekProgress(state, weekStart);
  }
  const samples: number[] = [];
  for (let i = 0; i < 21; i += 1) {
    const t0 = performance.now();
    streak(state, TODAY);
    weekProgress(state, weekStart);
    samples.push(performance.now() - t0);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

describe('performance budget (T12/T13)', () => {
  const state = worstCaseState();
  const weekStart = weekStartOf(TODAY);

  it('builds a worst-case state that exercises the full 60-day streak scan', () => {
    // Sanity: the backfill makes the streak count the entire non-rest window (no early break),
    // so the perf measurement reflects real work rather than an instant exit.
    expect(streak(state, TODAY)).toBeGreaterThanOrEqual(50);
  });

  it('streak + weekProgress complete within one frame (<16ms)', () => {
    expect(medianPairMs(state, weekStart)).toBeLessThan(FRAME_BUDGET_MS);
  });
});
