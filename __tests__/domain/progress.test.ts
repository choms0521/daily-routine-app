/**
 * Weekly progress (Day 3 end conditions): the 5/8 = 63% regression (PRD 4.6) and
 * denominator exclusion of rest days / empty categories / no-routine days.
 */
import { weekProgress } from '@/domain/progress';
import { baseState, withLogs } from '../fixtures/baseState';
import type { DayLog } from '@/types/schema';

function log(date: string, aerobic: Record<string, boolean>, anaerobic: Record<string, boolean>): DayLog {
  return { date, routineId: 'rt_aXk92', versionId: 'v_001', checks: { aerobic, anaerobic } };
}

describe('weekProgress', () => {
  it('computes 5/8 = 63% for the reference week (PRD 4.6)', () => {
    const state = withLogs(baseState, {
      '2026-06-22': log('2026-06-22', { a1: true }, { x1: true, x2: true, x3: true }), // Mon: 2 done
      '2026-06-23': log('2026-06-23', { a1: true }, { x1: true, x2: true, x3: true }), // Tue: 2 done
      '2026-06-24': log('2026-06-24', { a1: true }, {}), // Wed: 1 done
      // Thu/Fri/Sat unrecorded -> 0 done; Sun rest -> excluded
    });
    expect(weekProgress(state, '2026-06-22')).toEqual({ done: 5, total: 8, pct: 63 });
  });

  it('keeps the denominator at 8 (Mon..Sat categories, Sun excluded)', () => {
    // baseState has only the 06-22 log (aerobic done) -> done 1, total 8, round(12.5)=13.
    expect(weekProgress(baseState, '2026-06-22')).toEqual({ done: 1, total: 8, pct: 13 });
  });

  it('returns 0 pct when no routine is active that week (total 0)', () => {
    // The week of 2026-05-25 is entirely before the first activation (2026-06-01).
    expect(weekProgress(baseState, '2026-05-25')).toEqual({ done: 0, total: 0, pct: 0 });
  });
});
