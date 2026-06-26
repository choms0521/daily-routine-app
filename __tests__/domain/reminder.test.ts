/**
 * needsReminderToday (B1 §3.3): true only on an active, non-rest, non-empty, not-yet-complete
 * day. baseState's reference week has Mon 06-22 as an active day with one slot still unchecked
 * (x3 === false), Sun 06-21 as a rest day, and 05-31 before the first activation.
 */
import { needsReminderToday } from '@/domain/reminder';
import { baseState, clone, withLogs } from '../fixtures/baseState';

describe('needsReminderToday', () => {
  it('is true on an active, incomplete day (Mon 06-22, x3 unchecked)', () => {
    expect(needsReminderToday(baseState, '2026-06-22')).toBe(true);
  });

  it('is false when the day is already complete', () => {
    // Complete Monday: check the one remaining anaerobic slot (x3) so every category is done.
    const completeMon = withLogs(clone(baseState), {
      '2026-06-22': {
        date: '2026-06-22',
        routineId: 'rt_aXk92',
        versionId: 'v_001',
        checks: { aerobic: { a1: true }, anaerobic: { x1: true, x2: true, x3: true } },
      },
    });
    expect(needsReminderToday(completeMon, '2026-06-22')).toBe(false);
  });

  it('is false on a rest day (Sun 06-21)', () => {
    expect(needsReminderToday(baseState, '2026-06-21')).toBe(false);
  });

  it('is false before any active version (05-31, before effectiveFrom)', () => {
    expect(needsReminderToday(baseState, '2026-05-31')).toBe(false);
  });
});
