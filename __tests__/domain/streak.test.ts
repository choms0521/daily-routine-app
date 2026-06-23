/**
 * Streak (Day 3 end conditions): consecutive completion, rest-day pass-through,
 * today protection, and break at an unrecorded past day. The today +1/+0 boundary
 * is asserted in detail by the Day 4 test (6.4b).
 */
import { streak } from '@/domain/streak';
import { baseState, withLogs } from '../fixtures/baseState';
import type { DayLog } from '@/types/schema';

function log(date: string, aerobic: Record<string, boolean>, anaerobic: Record<string, boolean>): DayLog {
  return { date, routineId: 'rt_aXk92', versionId: 'v_001', checks: { aerobic, anaerobic } };
}

describe('streak', () => {
  it('counts consecutive completed days and passes over rest days', () => {
    const state = withLogs(baseState, {
      '2026-06-22': log('2026-06-22', { a1: true }, { x1: true, x2: true, x3: true }), // Mon
      '2026-06-20': log('2026-06-20', { a1: true }, {}), // Sat (aerobic only)
      '2026-06-19': log('2026-06-19', { a1: true }, {}), // Fri (aerobic only)
    });
    // 22 +1, 21 Sun rest pass, 20 +1, 19 +1, 18 Thu unrecorded -> break.
    expect(streak(state, '2026-06-22')).toBe(3);
  });

  it('protects today: an incomplete today does not break the past streak', () => {
    const state = withLogs(baseState, {
      '2026-06-20': log('2026-06-20', { a1: true }, {}),
      '2026-06-19': log('2026-06-19', { a1: true }, {}),
    });
    // baseState 06-22 log is incomplete (x3 false) -> today continues; 20,19 complete.
    expect(streak(state, '2026-06-22')).toBe(2);
  });

  it('breaks at an unrecorded past slotted day', () => {
    const state = withLogs(baseState, {
      '2026-06-22': log('2026-06-22', { a1: true }, { x1: true, x2: true, x3: true }),
      '2026-06-20': log('2026-06-20', { a1: true }, {}),
      // 06-19 (Fri) unrecorded.
    });
    // 22 +1, 21 rest, 20 +1, 19 unrecorded -> break.
    expect(streak(state, '2026-06-22')).toBe(2);
  });

  it('is 0 when the only slotted day (today) is incomplete', () => {
    // baseState: 06-22 incomplete; 21 rest pass; 20 unrecorded -> break.
    expect(streak(baseState, '2026-06-22')).toBe(0);
  });
});
