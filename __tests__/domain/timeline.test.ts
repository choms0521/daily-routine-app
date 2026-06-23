/**
 * Timeline resolution (Day 2 end conditions): versionOf boundaries, tie-break by last
 * append, plan resolution, and DayLog cache consistency.
 */
import { assertLogConsistency, plan, versionOf } from '@/domain/timeline';
import type { RoutineVersion } from '@/types/schema';
import { baseState, clone, withActivations } from '../fixtures/baseState';

describe('versionOf', () => {
  it('resolves to v_001 on and after effectiveFrom', () => {
    expect(versionOf(baseState, '2026-06-01')?.versionId).toBe('v_001');
    expect(versionOf(baseState, '2026-06-22')?.versionId).toBe('v_001');
  });

  it('returns null before the first effectiveFrom', () => {
    expect(versionOf(baseState, '2026-05-31')).toBeNull();
  });

  it('on a tie in effectiveFrom, the later array entry wins', () => {
    const state = clone(baseState);
    // Append a second version v_002 to the routine.
    const v2: RoutineVersion = {
      ...clone(state.routines[0].versions[0]),
      versionId: 'v_002',
    };
    state.routines[0].versions.push(v2);
    // Two activations on the same effectiveFrom; the last appended (v_002) must win.
    const withTie = withActivations(
      state,
      { effectiveFrom: '2026-06-10', routineId: 'rt_aXk92', versionId: 'v_001' },
      { effectiveFrom: '2026-06-10', routineId: 'rt_aXk92', versionId: 'v_002' },
    );
    expect(versionOf(withTie, '2026-06-10')?.versionId).toBe('v_002');
    expect(versionOf(withTie, '2026-06-15')?.versionId).toBe('v_002');
    // Before the tie date, the original v_001 still applies.
    expect(versionOf(withTie, '2026-06-09')?.versionId).toBe('v_001');
  });

  it('tie-break follows array (append) order, not versionId value', () => {
    const state = clone(baseState);
    const v2: RoutineVersion = { ...clone(state.routines[0].versions[0]), versionId: 'v_002' };
    state.routines[0].versions.push(v2);
    // Reversed append order: v_002 appended first, v_001 last -> the last array entry wins.
    const reversed = withActivations(
      state,
      { effectiveFrom: '2026-06-10', routineId: 'rt_aXk92', versionId: 'v_002' },
      { effectiveFrom: '2026-06-10', routineId: 'rt_aXk92', versionId: 'v_001' },
    );
    expect(versionOf(reversed, '2026-06-10')?.versionId).toBe('v_001');
  });
});

describe('plan', () => {
  it('returns the DayPlan for the weekday of the active version', () => {
    const monday = plan(baseState, '2026-06-22'); // Mon
    expect(monday?.aerobic[0].slotId).toBe('a1');
    expect(monday?.anaerobic).toHaveLength(3);
  });

  it('returns null when no version is active', () => {
    expect(plan(baseState, '2026-05-31')).toBeNull();
  });
});

describe('assertLogConsistency', () => {
  it('is true when the cached versionId matches the timeline', () => {
    expect(assertLogConsistency(baseState, '2026-06-22')).toBe(true);
  });

  it('is true for a day without a log', () => {
    expect(assertLogConsistency(baseState, '2026-06-20')).toBe(true);
  });

  it('is false when the cached versionId diverges from the timeline', () => {
    const corrupted = clone(baseState);
    corrupted.completionLogs['2026-06-22'].versionId = 'v_999';
    expect(assertLogConsistency(corrupted, '2026-06-22')).toBe(false);
  });
});
