/**
 * M1 required invariants (development stage-1 §3, cases 6.1–6.5 + 6.4b). These are the
 * first line of defense for D8: editing/switching/changing-rest-days must never alter
 * past or today's computed values, and the progress-denominator-excluded set must equal
 * the streak pass-through set. (6.6, the 5/8=63% regression, lives in progress.test.ts.)
 */
import { hasAnySlot, isRestDay } from '@/domain/completion';
import { weekDays } from '@/domain/date';
import { weekProgress } from '@/domain/progress';
import { streak } from '@/domain/streak';
import { assertLogConsistency, plan, versionOf } from '@/domain/timeline';
import type { AppState, DayLog, Routine, RoutineVersion } from '@/types/schema';
import { baseState, clone, withActivations, withLogs } from '../fixtures/baseState';

function log(date: string, aerobic: Record<string, boolean>, anaerobic: Record<string, boolean>): DayLog {
  return { date, routineId: 'rt_aXk92', versionId: 'v_001', checks: { aerobic, anaerobic } };
}

const V1_DAYS = baseState.routines[0].versions[0].days;

/** Append a new version to rt_aXk92 and activate it from `effectiveFrom` (edit case). */
function appendVersion(state: AppState, version: RoutineVersion, effectiveFrom: string): AppState {
  const routine = state.routines[0];
  const updated: Routine = { ...routine, versions: [...routine.versions, version] };
  return withActivations(
    { ...state, routines: [updated, ...state.routines.slice(1)] },
    { effectiveFrom, routineId: routine.id, versionId: version.versionId },
  );
}

describe('6.1 (a) switching active routine leaves past untouched', () => {
  it('past-week progress and streak are identical before and after the switch', () => {
    const withPast = withLogs(baseState, {
      '2026-06-15': log('2026-06-15', { a1: true }, { x1: true, x2: true, x3: true }),
      '2026-06-16': log('2026-06-16', { a1: true }, { x1: true, x2: true, x3: true }),
    });
    const before = {
      progress: weekProgress(withPast, '2026-06-15'),
      streak: streak(withPast, '2026-06-22'),
    };

    const routineB: Routine = {
      id: 'rt_B',
      name: '가을 루틴',
      createdAt: '2026-06-22T00:00:00Z',
      versions: [
        { versionId: 'vb_1', createdAt: '2026-06-22T00:00:00Z', restDays: ['sat', 'sun'], days: clone(V1_DAYS) },
      ],
    };
    // Switch to B from tomorrow (D8.8). Today (06-22) and the past are unaffected.
    const switched = withActivations(
      { ...withPast, routines: [...withPast.routines, routineB] },
      { effectiveFrom: '2026-06-23', routineId: 'rt_B', versionId: 'vb_1' },
    );
    const after = {
      progress: weekProgress(switched, '2026-06-15'),
      streak: streak(switched, '2026-06-22'),
    };
    expect(after).toEqual(before);
  });
});

describe('6.2 (b) mid-week edit: past + edit day stay on the old version (forward-only)', () => {
  it('plan for 06-22..06-24 is unchanged; 06-25+ flips to v_002; week values stable', () => {
    // v_002 changes only the past weekdays (mon/tue/wed). thu/fri/sat/sun stay equal to
    // v_001, so this week's denominator does not change even though 06-25+ uses v_002.
    const v2days = clone(V1_DAYS);
    v2days.mon = {
      aerobic: [{ slotId: 'a1', name: '러닝 추가', sets: '40분' }],
      anaerobic: [{ slotId: 'x1', name: '벤치프레스', sets: '5 × 5' }],
    };
    const v2: RoutineVersion = {
      versionId: 'v_002',
      createdAt: '2026-06-24T00:00:00Z',
      restDays: ['sun'],
      days: v2days,
    };
    const edited = appendVersion(baseState, v2, '2026-06-25'); // edit on Wed 06-24 -> from Thu 06-25

    // Past + today (06-22..06-24) resolve to v_001, byte-identical plan.
    expect(plan(edited, '2026-06-22')).toEqual(plan(baseState, '2026-06-22'));
    expect(plan(edited, '2026-06-23')).toEqual(plan(baseState, '2026-06-23'));
    expect(plan(edited, '2026-06-24')).toEqual(plan(baseState, '2026-06-24'));
    expect(versionOf(edited, '2026-06-24')?.versionId).toBe('v_001');
    // From 06-25 the active version is v_002.
    expect(versionOf(edited, '2026-06-25')?.versionId).toBe('v_002');

    // Week progress (06-22 week) and streak at the edit day are unchanged.
    expect(weekProgress(edited, '2026-06-22')).toEqual(weekProgress(baseState, '2026-06-22'));
    expect(streak(edited, '2026-06-24')).toBe(streak(baseState, '2026-06-24'));
  });
});

describe('6.3 (c) changing rest days leaves past judgments unchanged', () => {
  it('a past Wednesday stays non-rest while a future Wednesday becomes rest', () => {
    const v2: RoutineVersion = {
      versionId: 'v_002',
      createdAt: '2026-06-22T00:00:00Z',
      restDays: ['sun', 'wed'],
      days: clone(V1_DAYS),
    };
    const changed = appendVersion(baseState, v2, '2026-06-23'); // from tomorrow

    // Past Wednesday 06-17 is resolved by v_001 (no 'wed' rest) before and after.
    expect(isRestDay(baseState, '2026-06-17')).toBe(false);
    expect(isRestDay(changed, '2026-06-17')).toBe(false);
    // Future Wednesday 06-24 resolves by v_002 -> rest.
    expect(isRestDay(changed, '2026-06-24')).toBe(true);
  });
});

describe('6.4 (d) editing/switching today does not change today values', () => {
  it('today plan/progress/streak stable and the DayLog cache stays consistent', () => {
    const today = withLogs(baseState, {
      '2026-06-22': log('2026-06-22', { a1: true }, { x1: true, x2: false, x3: false }),
    });
    const before = {
      plan: plan(today, '2026-06-22'),
      progress: weekProgress(today, '2026-06-22'),
      streak: streak(today, '2026-06-22'),
    };

    const v2: RoutineVersion = {
      versionId: 'v_002',
      createdAt: '2026-06-22T00:00:00Z',
      restDays: ['sun'],
      days: clone(V1_DAYS),
    };
    const editedToday = appendVersion(today, v2, '2026-06-23'); // edit today -> effective tomorrow

    expect(plan(editedToday, '2026-06-22')).toEqual(before.plan);
    expect(weekProgress(editedToday, '2026-06-22')).toEqual(before.progress);
    expect(streak(editedToday, '2026-06-22')).toBe(before.streak);
    // Cached DayLog.versionId still matches the timeline re-derivation (PRD 4.4).
    expect(assertLogConsistency(editedToday, '2026-06-22')).toBe(true);
  });
});

describe('6.4b streak today boundary: +1 when complete, +0 when not', () => {
  // Today 06-22 (Mon, slotted). Yesterday 06-21 (Sun) is a rest day (passes).
  // The day before, 06-20 (Sat), is complete.
  const withSat = withLogs(baseState, {
    '2026-06-20': log('2026-06-20', { a1: true }, {}),
  });

  it('e1: completing today adds +1 (Sat complete + today = 2)', () => {
    const e1 = withLogs(withSat, {
      '2026-06-22': log('2026-06-22', { a1: true }, { x1: true, x2: true, x3: true }),
    });
    expect(streak(e1, '2026-06-22')).toBe(2);
  });

  it('e2: an unrecorded/incomplete today adds +0 (Sat complete only = 1)', () => {
    const e2 = clone(withSat);
    delete e2.completionLogs['2026-06-22']; // today unrecorded
    expect(streak(e2, '2026-06-22')).toBe(1);
  });
});

describe('6.5 progress-denominator-excluded set == streak pass-through set', () => {
  // A week (06-22..06-28) with all three neutral kinds: no-active-routine days
  // (before effectiveFrom), an empty non-rest day, and a rest day.
  const v5days = clone(V1_DAYS);
  v5days.fri = { aerobic: [], anaerobic: [] }; // empty non-rest day (Fri)
  const state5: AppState = {
    schemaVersion: 1,
    routines: [
      {
        id: 'rt_5',
        name: '부분 주',
        createdAt: '2026-06-01T00:00:00Z',
        versions: [{ versionId: 'v5_1', createdAt: '2026-06-01T00:00:00Z', restDays: ['sun'], days: v5days }],
      },
    ],
    activationTimeline: [{ effectiveFrom: '2026-06-24', routineId: 'rt_5', versionId: 'v5_1' }],
    completionLogs: {},
    settings: { activeRoutineId: 'rt_5', reminder: { enabled: false, time: '20:00' } },
  };

  function isNeutral(state: AppState, date: string): boolean {
    return versionOf(state, date) === null || isRestDay(state, date) || !hasAnySlot(state, date);
  }

  it('the same neutral days are excluded from the denominator and passed by streak', () => {
    // 06-22/23 before activation (plan null), 06-26 empty Fri, 06-28 Sun rest.
    const neutral = weekDays('2026-06-22').filter((d) => isNeutral(state5, d));
    expect(neutral).toEqual(['2026-06-22', '2026-06-23', '2026-06-26', '2026-06-28']);

    // Progress side: denominator excludes the neutral days -> only Wed/Thu/Sat (1 cat each).
    expect(weekProgress(state5, '2026-06-22').total).toBe(3);

    // Streak side: those neutral days pass through, so completing Wed/Thu/Sat is a run of 3.
    const completed = withLogs(state5, {
      '2026-06-24': { date: '2026-06-24', routineId: 'rt_5', versionId: 'v5_1', checks: { aerobic: { a1: true }, anaerobic: {} } },
      '2026-06-25': { date: '2026-06-25', routineId: 'rt_5', versionId: 'v5_1', checks: { aerobic: { a1: true }, anaerobic: {} } },
      '2026-06-27': { date: '2026-06-27', routineId: 'rt_5', versionId: 'v5_1', checks: { aerobic: { a1: true }, anaerobic: {} } },
    });
    // today 06-27 (Sat) +1, 06-26 Fri empty passes, 06-25 Thu +1, 06-24 Wed +1,
    // 06-23/22 plan null pass -> 3.
    expect(streak(completed, '2026-06-27')).toBe(3);
  });
});
