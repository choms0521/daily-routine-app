/**
 * Home selectors (Day 2): they delegate to Stage 1 domain and shape per-day view models.
 * Verified against the canonical PRD 4.4 fixture (week of Mon 2026-06-22, total = 8).
 */
import {
  isCurrentWeek,
  selectActiveRoutineId,
  selectActiveRoutineName,
  selectDayViewModels,
  selectHiddenRoutines,
  selectLibraryRoutines,
  selectPendingActivation,
  selectStreak,
  selectWeekLabel,
  selectWeekProgress,
} from '@/store/selectors';
import type { AppState } from '@/types/schema';
import { baseState, clone } from '../fixtures/baseState';

const MON = '2026-06-22';

describe('home selectors', () => {
  it('returns the active routine name', () => {
    expect(selectActiveRoutineName(baseState)).toBe('여름 컨디셔닝');
  });

  it('returns null when no routine is active', () => {
    const none = clone(baseState);
    none.settings.activeRoutineId = null;
    expect(selectActiveRoutineName(none)).toBeNull();
  });

  it('delegates week progress to the domain (denominator 8)', () => {
    expect(selectWeekProgress(baseState, MON)).toEqual({ done: 1, total: 8, pct: 13 });
  });

  it('delegates streak to the domain (today in progress -> 0)', () => {
    expect(selectStreak(baseState, MON)).toBe(0);
  });

  it('detects the current week', () => {
    expect(isCurrentWeek(MON, MON)).toBe(true);
    expect(isCurrentWeek('2026-06-15', MON)).toBe(false);
  });

  it('builds this-week / last-week labels', () => {
    expect(selectWeekLabel(MON, MON)).toBe('6.22 – 6.28 · 이번 주');
    expect(selectWeekLabel('2026-06-15', MON)).toBe('6.15 – 6.21 · 지난 주');
  });

  it('builds 7 day view models with today and rest day flagged', () => {
    const vms = selectDayViewModels(baseState, MON, MON);
    expect(vms).toHaveLength(7);
    expect(vms[0]).toMatchObject({
      date: MON,
      weekdayLabel: '월',
      dateLabel: '6.22',
      isToday: true,
      isRestDay: false,
    });
    expect(vms[6]).toMatchObject({ date: '2026-06-28', weekdayLabel: '일', isRestDay: true });
    expect(vms[0].aerobicDone).toBe(true);
    expect(vms[0].anaerobicDone).toBe(false);
  });
});

describe('library selectors', () => {
  function withSecond(hidden: boolean): AppState {
    const s = clone(baseState);
    s.routines.push({
      id: 'rt_B',
      name: '가벼운 산책',
      createdAt: '2026-06-10T08:00:00Z',
      hidden,
      versions: [clone(baseState.routines[0].versions[0])],
    });
    return s;
  }

  it('lists non-hidden routines and flags the active one', () => {
    const vms = selectLibraryRoutines(withSecond(false));
    expect(vms).toHaveLength(2);
    expect(vms[0]).toMatchObject({ id: 'rt_aXk92', isActive: true, versionCount: 1 });
    expect(vms[1]).toMatchObject({ id: 'rt_B', isActive: false });
  });

  it('excludes hidden routines from the library list and lists them separately', () => {
    const s = withSecond(true);
    expect(selectLibraryRoutines(s).map((r) => r.id)).toEqual(['rt_aXk92']);
    expect(selectHiddenRoutines(s).map((r) => r.id)).toEqual(['rt_B']);
  });

  it('returns the selected active routine id', () => {
    expect(selectActiveRoutineId(baseState)).toBe('rt_aXk92');
  });
});

describe('selectPendingActivation', () => {
  it('is null when the latest activation is already in effect', () => {
    expect(selectPendingActivation(baseState, '2026-06-23')).toBeNull();
  });

  it('returns the routine name and date for a future-dated activation', () => {
    const s = clone(baseState);
    s.activationTimeline.push({ effectiveFrom: '2026-06-24', routineId: 'rt_aXk92', versionId: 'v_002' });
    expect(selectPendingActivation(s, '2026-06-23')).toEqual({
      routineName: '여름 컨디셔닝',
      effectiveFrom: '2026-06-24',
    });
  });
});
