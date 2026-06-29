/**
 * A3 milestone badges (dev doc §3). Covers the two metrics (totalCompletedDays via earnedBadges,
 * longestStreak via the streak-7 progress) and the threshold mapping to earned/progress.
 *
 * earnedBadges is the only exported surface, so the internal metrics are asserted through it:
 * - first-complete.progress.current  == totalCompletedDays
 * - streak-7.progress.current        == longestStreak
 *
 * The longest-streak cases include the two that DISCRIMINATE the correct calendar-walk from a
 * buggy log-key-only scan: an incomplete active day with no log must BREAK a run (so two completes
 * around it count as 1, not 2), and a rest-day gap must PASS THROUGH (the run continues).
 */
import { earnedBadges } from '@/domain/badges';
import { baseState, withLogs } from '../fixtures/baseState';
import type { DayLog } from '@/types/schema';

/** Mon (06-22) plan fully checked: aerobic a1 + anaerobic x1/x2/x3. */
function fullMonLog(date: string): DayLog {
  return {
    date,
    routineId: 'rt_aXk92',
    versionId: 'v_001',
    checks: { aerobic: { a1: true }, anaerobic: { x1: true, x2: true, x3: true } },
  };
}

/** Tue (06-23) plan fully checked: same slot ids, Tue exercises. */
function fullTueLog(date: string): DayLog {
  return {
    date,
    routineId: 'rt_aXk92',
    versionId: 'v_001',
    checks: { aerobic: { a1: true }, anaerobic: { x1: true, x2: true, x3: true } },
  };
}

/** Wed/Thu/Fri/Sat are single-aerobic days; one checked a1 completes the day. */
function fullAerobicLog(date: string): DayLog {
  return { date, routineId: 'rt_aXk92', versionId: 'v_001', checks: { aerobic: { a1: true }, anaerobic: {} } };
}

const withMonTueComplete = withLogs(baseState, {
  '2026-06-22': fullMonLog('2026-06-22'),
  '2026-06-23': fullTueLog('2026-06-23'),
});

/** Find a badge by id (earnedBadges returns all catalog entries). */
function badge(state: typeof baseState, today: string, id: string) {
  const found = earnedBadges(state, today).find((b) => b.id === id);
  if (found === undefined) throw new Error(`badge ${id} missing from catalog`);
  return found;
}

describe('totalCompletedDays (via first-complete.progress.current)', () => {
  it('baseState has 0 complete days (Mon x3 unchecked -> not complete)', () => {
    expect(badge(baseState, '2026-06-22', 'first-complete').progress.current).toBe(0);
  });

  it('withMonTueComplete has 2 complete days', () => {
    expect(badge(withMonTueComplete, '2026-06-23', 'first-complete').progress.current).toBe(2);
  });
});

describe('longestStreak (via streak-7.progress.current)', () => {
  it('withMonTueComplete -> 2 (Mon·Tue consecutive complete active days)', () => {
    expect(badge(withMonTueComplete, '2026-06-23', 'streak-7').progress.current).toBe(2);
  });

  it('an incomplete active day with NO log between two completes BREAKS the run -> 1', () => {
    // Mon complete, Tue 06-23 active/non-rest/slotted but NO log (incomplete), Wed complete.
    // A log-key-only scan would skip 06-23 and read 2; the calendar walk reads 1.
    const state = withLogs(baseState, {
      '2026-06-22': fullMonLog('2026-06-22'),
      '2026-06-24': fullAerobicLog('2026-06-24'), // Wed
    });
    expect(badge(state, '2026-06-24', 'streak-7').progress.current).toBe(1);
  });

  it('a rest-day gap PASSES THROUGH (run continues across Sunday) -> 2', () => {
    // Sat 06-27 complete, Sun 06-28 is a rest day (restDays ['sun']) with no log, Mon 06-29 complete.
    // Rest passes through, so the Sat·Mon completes form one run of length 2.
    const state = withLogs(baseState, {
      '2026-06-27': fullAerobicLog('2026-06-27'), // Sat
      '2026-06-29': fullMonLog('2026-06-29'), // Mon
    });
    expect(badge(state, '2026-06-29', 'streak-7').progress.current).toBe(2);
  });

  it('empty completionLogs -> 0', () => {
    const blank = { ...baseState, completionLogs: {} };
    expect(badge(blank, '2026-06-22', 'streak-7').progress.current).toBe(0);
  });
});

describe('earnedBadges threshold mapping', () => {
  it('input A: baseState @ 2026-06-22 -> every badge unearned, first-complete {0, target 1}', () => {
    const badges = earnedBadges(baseState, '2026-06-22');
    expect(badges.every((b) => b.earned === false)).toBe(true);
    const first = badges.find((b) => b.id === 'first-complete');
    expect(first?.earned).toBe(false);
    expect(first?.progress).toEqual({ current: 0, target: 1 });
  });

  it('input B: withMonTueComplete @ 2026-06-23 -> first-complete earned, totals/streaks below target', () => {
    const badges = earnedBadges(withMonTueComplete, '2026-06-23');
    const byId = (id: string) => badges.find((b) => b.id === id);

    // first-complete earned; current is the RAW metric value (not capped at target).
    expect(byId('first-complete')?.earned).toBe(true);
    expect(byId('first-complete')?.progress).toEqual({ current: 2, target: 1 });

    expect(byId('total-10')?.earned).toBe(false);
    expect(byId('total-10')?.progress).toEqual({ current: 2, target: 10 });

    expect(byId('streak-7')?.earned).toBe(false);
    expect(byId('streak-7')?.progress).toEqual({ current: 2, target: 7 });
  });

  it('returns every catalog entry once, with the catalog labels/descriptions', () => {
    const badges = earnedBadges(baseState, '2026-06-22');
    const ids = badges.map((b) => b.id);
    expect(ids).toEqual(['first-complete', 'total-10', 'total-50', 'total-100', 'streak-7', 'streak-30']);
    expect(badges.find((b) => b.id === 'first-complete')?.label).toBe('첫 완료');
    expect(badges.every((b) => typeof b.description === 'string' && b.description.length > 0)).toBe(true);
  });

  it('today is signature-only: the same state yields the same badges for different today values', () => {
    const a = earnedBadges(withMonTueComplete, '2026-06-23');
    const b = earnedBadges(withMonTueComplete, '2030-01-01');
    expect(a).toEqual(b);
  });
});
